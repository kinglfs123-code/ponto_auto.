import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  console.log("[oauth-start] invoked", { method: req.method });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");

    if (!CLIENT_ID) {
      console.error("[oauth-start] missing GOOGLE_OAUTH_CLIENT_ID");
      return new Response(JSON.stringify({
        error: "GOOGLE_OAUTH_CLIENT_ID não configurado",
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validação de usuário feita no código (verify_jwt=false no gateway porque
    // o gateway não aceita JWT ES256 — fazemos a validação aqui via getUser).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.warn("[oauth-start] missing Authorization header");
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      console.warn("[oauth-start] invalid token", { err: userErr?.message });
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const returnTo: string = body.return_to || "/funcionarios";
    const origin: string | undefined = typeof body.origin === "string" ? body.origin : undefined;

    console.log("[oauth-start] params", {
      uid: userData.user.id,
      return_to: returnTo,
      origin,
    });

    const stateObj = {
      uid: userData.user.id,
      rt: returnTo,
      og: origin,
      n: crypto.randomUUID(),
    };
    const state = btoa(JSON.stringify(stateObj))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    console.log("[oauth-start] generated google url", {
      redirect_uri: redirectUri,
      url_prefix: url.slice(0, 60),
    });

    return new Response(JSON.stringify({ url, redirect_uri: redirectUri }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[oauth-start] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
