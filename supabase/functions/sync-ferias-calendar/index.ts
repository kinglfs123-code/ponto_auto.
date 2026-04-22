import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getValidAccessToken(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Erro ao ler tokens: ${error.message}`);
  if (!data) return null;

  const expiresAt = new Date(data.expires_at as string).getTime();
  if (expiresAt > Date.now() + 30_000) return data.access_token as string;

  const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID/SECRET não configurados");
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: data.refresh_token as string,
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Refresh failed:", txt);
    await admin.from("google_calendar_tokens").delete().eq("user_id", userId);
    return null;
  }

  const tok = await resp.json() as { access_token: string; expires_in: number };
  const newExpiresAt = new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString();

  await admin.from("google_calendar_tokens").update({
    access_token: tok.access_token,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return tok.access_token;
}

function addOneDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().split("T")[0];
}

const STATUS_LABEL: Record<string, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

const CAL_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

async function deleteEvent(accessToken: string, eventId: string): Promise<void> {
  try {
    await fetch(`${CAL_BASE}/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (e) {
    console.error("[sync-ferias] delete event failed (ignored):", e);
  }
}

async function upsertEvent(
  accessToken: string,
  eventId: string | null,
  payload: Record<string, unknown>,
): Promise<string | null> {
  const url = eventId ? `${CAL_BASE}/${eventId}` : CAL_BASE;
  const method = eventId ? "PATCH" : "POST";
  const resp = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (resp.ok) {
    const json = await resp.json();
    return json.id as string;
  }

  // Se evento foi removido manualmente, recria
  if (resp.status === 404 && eventId) {
    const retry = await fetch(CAL_BASE, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (retry.ok) {
      const json = await retry.json();
      return json.id as string;
    }
    const txt = await retry.text();
    throw new Error(`Falha ao recriar evento (${retry.status}): ${txt.slice(0, 300)}`);
  }

  const txt = await resp.text();
  throw new Error(`Falha Calendar (${resp.status}): ${txt.slice(0, 300)}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const ferias_id = body?.ferias_id as string | undefined;
    if (!ferias_id) {
      return new Response(JSON.stringify({ error: "ferias_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const accessToken = await getValidAccessToken(admin, userData.user.id);
    if (!accessToken) {
      return new Response(JSON.stringify({ needs_connection: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: fer, error: fErr } = await admin
      .from("funcionario_ferias")
      .select("*")
      .eq("id", ferias_id)
      .maybeSingle();
    if (fErr || !fer) {
      return new Response(JSON.stringify({ error: "Férias não encontradas" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar propriedade
    const { data: emp } = await admin
      .from("empresas")
      .select("owner_id")
      .eq("id", fer.empresa_id)
      .maybeSingle();
    if (!emp || emp.owner_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: func } = await admin
      .from("funcionarios")
      .select("nome_completo")
      .eq("id", fer.funcionario_id)
      .maybeSingle();
    const nome = func?.nome_completo || "Colaborador";

    const statusLabel = STATUS_LABEL[fer.status as string] || fer.status;
    const obsLine = fer.observacao ? `Obs: ${fer.observacao}` : null;

    const eventoInicio = {
      summary: `Início das férias — ${nome}`,
      description: [
        `Status: ${statusLabel}`,
        `Período: ${fer.data_inicio} → ${fer.data_fim} (${fer.dias} dias)`,
        obsLine,
      ].filter(Boolean).join("\n"),
      start: { date: fer.data_inicio },
      end: { date: addOneDay(fer.data_inicio as string) }, // all-day exclusivo
    };

    const eventoFim = {
      summary: `Fim das férias — ${nome}`,
      description: [
        `Status: ${statusLabel}`,
        `Período: ${fer.data_inicio} → ${fer.data_fim} (${fer.dias} dias)`,
        obsLine,
      ].filter(Boolean).join("\n"),
      start: { date: fer.data_fim },
      end: { date: addOneDay(fer.data_fim as string) }, // all-day exclusivo
    };

    // Migração: se existia o evento único antigo, apagar para evitar duplicidade
    const legacyId = (fer as any).google_event_id as string | null | undefined;
    if (legacyId) {
      await deleteEvent(accessToken, legacyId);
    }

    const idInicioAtual = (fer as any).google_event_id_inicio as string | null | undefined;
    const idFimAtual = (fer as any).google_event_id_fim as string | null | undefined;

    const novoIdInicio = await upsertEvent(accessToken, idInicioAtual ?? null, eventoInicio);
    const novoIdFim = await upsertEvent(accessToken, idFimAtual ?? null, eventoFim);

    await admin.from("funcionario_ferias").update({
      google_event_id: null,
      google_event_id_inicio: novoIdInicio,
      google_event_id_fim: novoIdFim,
    }).eq("id", ferias_id);

    return new Response(JSON.stringify({
      ok: true,
      event_id_inicio: novoIdInicio,
      event_id_fim: novoIdFim,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-ferias-calendar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
