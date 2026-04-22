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
  if (!CLIENT_ID || !CLIENT_SECRET) return null;

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
  if (!resp.ok) return null;
  const tok = await resp.json() as { access_token: string; expires_in: number };
  const newExpiresAt = new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString();
  await admin.from("google_calendar_tokens").update({
    access_token: tok.access_token,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return tok.access_token;
}

const CAL_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

async function tryDelete(accessToken: string, eventId: string) {
  try {
    const r = await fetch(`${CAL_BASE}/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok && r.status !== 404 && r.status !== 410) {
      const txt = await r.text();
      console.error("[delete-ferias-calendar] delete failed", r.status, txt.slice(0, 200));
    }
  } catch (e) {
    console.error("[delete-ferias-calendar] delete exception", e);
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

    const body = await req.json().catch(() => ({}));
    const ferias_id = body?.ferias_id as string | undefined;
    if (!ferias_id) {
      return new Response(JSON.stringify({ error: "ferias_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: fer } = await admin
      .from("funcionario_ferias")
      .select("id, empresa_id, google_event_id, google_event_id_inicio, google_event_id_fim")
      .eq("id", ferias_id)
      .maybeSingle();
    if (!fer) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const accessToken = await getValidAccessToken(admin, userData.user.id);
    if (!accessToken) {
      // Sem token: nada a fazer no Calendar — devolve ok para a UI não bloquear
      return new Response(JSON.stringify({ ok: true, no_token: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = [
      (fer as any).google_event_id,
      (fer as any).google_event_id_inicio,
      (fer as any).google_event_id_fim,
    ].filter((x): x is string => typeof x === "string" && x.length > 0);

    for (const id of ids) {
      await tryDelete(accessToken, id);
    }

    return new Response(JSON.stringify({ ok: true, removed: ids.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-ferias-calendar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
