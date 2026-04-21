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

  // refresh
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
    // token revogado: apaga o registro para forçar reconexão
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
      .select("*, funcionarios:funcionario_id(nome_completo), empresas:empresa_id(owner_id)")
      .in("id", alerta_ids);

    if (aErr || !alertas) throw new Error("Erro ao carregar alertas");

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const al of alertas) {
      // @ts-ignore embedded relation
      const ownerId = al.empresas?.owner_id;
      if (ownerId !== userData.user.id) {
        results.push({ id: al.id, status: "erro", error: "sem permissão" });
        continue;
      }
      // @ts-ignore
      const nome = al.funcionarios?.nome_completo || "colaborador";
      const titulo = `${TITULOS[al.tipo] || "Alerta"} — ${nome}`;

      try {
        const event = {
          summary: titulo,
          description: `Lembrete automático gerado pela aplicação.\nEvento real: ${al.data_evento}`,
          start: { date: al.data_lembrete },
          end: { date: al.data_lembrete },
          reminders: {
            useDefault: false,
            overrides: [{ method: "popup", minutes: 60 * 24 }],
          },
        };

        let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
        let method = "POST";
        if (al.google_event_id) {
          url = `${url}/${al.google_event_id}`;
          method = "PUT";
        }

        const resp = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        });

        if (!resp.ok) {
          const txt = await resp.text();
          await admin.from("contrato_alertas").update({
            status: "erro", erro_mensagem: txt.slice(0, 500),
          }).eq("id", al.id);
          results.push({ id: al.id, status: "erro", error: txt });
          continue;
        }

        const json = await resp.json();
        await admin.from("contrato_alertas").update({
          status: "sincronizado",
          google_event_id: json.id,
          erro_mensagem: null,
        }).eq("id", al.id);
        results.push({ id: al.id, status: "sincronizado" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "erro";
        await admin.from("contrato_alertas").update({
          status: "erro", erro_mensagem: msg,
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
