import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TITULOS: Record<string, string> = {
  vencimento_contrato: "⚠️ Vence contrato",
  prorrogacao: "📝 Prorrogar contrato",
  ferias_5_meses: "🌴 Férias se aproximam",
};

// Google Calendar colorIds: https://developers.google.com/calendar/api/v3/reference/colors
const COLOR_LEMBRETE = "9";   // Blueberry (azul)
const COLOR_VENCIMENTO = "11"; // Tomato (vermelho)

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

  const tok = await resp.json() as { access_token: string; expires_in: number; scope?: string };
  const newExpiresAt = new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString();

  await admin.from("google_calendar_tokens").update({
    access_token: tok.access_token,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return tok.access_token;
}

async function upsertEvent(
  accessToken: string,
  existingId: string | null,
  payload: Record<string, unknown>,
): Promise<string> {
  let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  let method: "POST" | "PUT" = "POST";
  if (existingId) {
    // tenta PUT; se 404/410, faz POST novo
    const putResp = await fetch(`${url}/${existingId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (putResp.ok) {
      const json = await putResp.json();
      return json.id as string;
    }
    if (putResp.status !== 404 && putResp.status !== 410) {
      const txt = await putResp.text();
      throw new Error(`PUT falhou [${putResp.status}]: ${txt}`);
    }
    // cai para POST
  }

  const postResp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!postResp.ok) {
    const txt = await postResp.text();
    throw new Error(`POST falhou [${postResp.status}]: ${txt}`);
  }
  const json = await postResp.json();
  return json.id as string;
}

async function deleteEventSafely(accessToken: string, eventId: string) {
  try {
    const resp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!resp.ok && resp.status !== 404 && resp.status !== 410) {
      const txt = await resp.text();
      console.warn(`Falha ao deletar evento legado ${eventId}: ${txt}`);
    }
  } catch (e) {
    console.warn(`Erro ao deletar evento legado ${eventId}:`, e);
  }
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

    const { alerta_ids } = await req.json();
    if (!Array.isArray(alerta_ids) || alerta_ids.length === 0) {
      return new Response(JSON.stringify({ error: "alerta_ids obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const accessToken = await getValidAccessToken(admin, userData.user.id);
    if (!accessToken) {
      return new Response(JSON.stringify({
        needs_connection: true,
        error: "Google Agenda não conectado",
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: alertas, error: aErr } = await admin
      .from("contrato_alertas")
      .select("*")
      .in("id", alerta_ids);

    if (aErr || !alertas) {
      throw new Error(`Erro ao carregar alertas: ${aErr?.message ?? "sem dados"}`);
    }

    const funcionarioIds = [...new Set(alertas.map((a: any) => a.funcionario_id).filter(Boolean))];
    const empresaIds = [...new Set(alertas.map((a: any) => a.empresa_id).filter(Boolean))];

    const [funcRes, empRes] = await Promise.all([
      admin.from("funcionarios").select("id, nome_completo").in("id", funcionarioIds),
      admin.from("empresas").select("id, owner_id").in("id", empresaIds),
    ]);

    if (funcRes.error) throw new Error(`Erro ao carregar funcionarios: ${funcRes.error.message}`);
    if (empRes.error) throw new Error(`Erro ao carregar empresas: ${empRes.error.message}`);

    const funcMap = new Map((funcRes.data ?? []).map((f: any) => [f.id, f.nome_completo]));
    const empMap = new Map((empRes.data ?? []).map((e: any) => [e.id, e.owner_id]));

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const al of alertas as any[]) {
      const ownerId = empMap.get(al.empresa_id);
      if (ownerId !== userData.user.id) {
        results.push({ id: al.id, status: "erro", error: "sem permissão" });
        continue;
      }
      const nome = funcMap.get(al.funcionario_id) || "colaborador";
      const tituloBase = TITULOS[al.tipo] || "Alerta";
      const tituloLembrete = `🔔 Lembrete: ${tituloBase} — ${nome}`;
      const tituloVencimento = `${tituloBase} — ${nome}`;

      try {
        // Evento 1: Lembrete antecipado (azul)
        const eventLembrete = {
          summary: tituloLembrete,
          description:
            `Lembrete antecipado gerado pela aplicação.\n` +
            `Data do evento real: ${al.data_evento}`,
          start: { date: al.data_lembrete },
          end: { date: al.data_lembrete },
          colorId: COLOR_LEMBRETE,
          reminders: {
            useDefault: false,
            overrides: [{ method: "popup", minutes: 60 * 9 }], // 9h antes (manhã do dia)
          },
        };

        // Evento 2: Vencimento/dia do evento (vermelho) - caso passe despercebido
        const eventVencimento = {
          summary: tituloVencimento,
          description:
            `Data do evento. Caso o lembrete antecipado tenha passado despercebido.`,
          start: { date: al.data_evento },
          end: { date: al.data_evento },
          colorId: COLOR_VENCIMENTO,
          reminders: {
            useDefault: false,
            overrides: [{ method: "popup", minutes: 60 * 9 }],
          },
        };

        const newLembreteId = await upsertEvent(
          accessToken,
          al.google_event_id_lembrete ?? null,
          eventLembrete,
        );
        const newVencimentoId = await upsertEvent(
          accessToken,
          al.google_event_id_vencimento ?? null,
          eventVencimento,
        );

        // Migração: se existia um google_event_id legado e os novos campos estavam vazios,
        // remove o evento legado para evitar duplicidade.
        if (
          al.google_event_id &&
          !al.google_event_id_lembrete &&
          !al.google_event_id_vencimento &&
          al.google_event_id !== newLembreteId &&
          al.google_event_id !== newVencimentoId
        ) {
          await deleteEventSafely(accessToken, al.google_event_id as string);
        }

        await admin.from("contrato_alertas").update({
          status: "sincronizado",
          google_event_id_lembrete: newLembreteId,
          google_event_id_vencimento: newVencimentoId,
          google_event_id: null, // limpa legado
          erro_mensagem: null,
        }).eq("id", al.id);
        results.push({ id: al.id, status: "sincronizado" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erro";
        await admin.from("contrato_alertas").update({
          status: "erro", erro_mensagem: msg.slice(0, 500),
        }).eq("id", al.id);
        results.push({ id: al.id, status: "erro", error: msg });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-calendar-alerts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
