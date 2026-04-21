import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function decodeState(state: string): { uid: string; rt: string; og?: string } | null {
  try {
    const padded = state.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "===".slice(0, (4 - padded.length % 4) % 4));
    const obj = JSON.parse(json);
    if (typeof obj.uid !== "string") return null;
    return {
      uid: obj.uid,
      rt: typeof obj.rt === "string" ? obj.rt : "/funcionarios",
      og: typeof obj.og === "string" ? obj.og : undefined,
    };
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return true;
    if (u.hostname.endsWith(".lovable.app")) return true;
    if (u.hostname.endsWith(".lovableproject.com")) return true;
    if (u.hostname.endsWith(".lovable.dev")) return true;
    return false;
  } catch {
    return false;
  }
}

function htmlRedirect(url: string, message: string) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${url}"><title>${message}</title></head><body><p>${message}</p><p><a href="${url}">Continuar</a></p></body></html>`,
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}

function errorResponse(msg: string, status = 400) {
  return new Response(msg, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  console.log("[oauth-callback] invoked", { method: req.method, url: req.url });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    console.log("[oauth-callback] query params", {
      has_code: !!code,
      has_state: !!state,
      error,
    });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
    const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "";

    const buildAppUrl = (path: string, params: Record<string, string>, originOverride?: string) => {
      const candidate = originOverride && isAllowedOrigin(originOverride) ? originOverride : APP_ORIGIN;
      const base = candidate || "/";
      const u = new URL(path, base.endsWith("/") ? base : base + "/");
      Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
      return u.toString();
    };

    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error("[oauth-callback] missing Google OAuth credentials");
      return errorResponse("OAuth não configurado", 500);
    }
    if (error) {
      console.warn("[oauth-callback] google returned error:", error);
      const dec = state ? decodeState(state) : null;
      const back = dec?.rt || "/funcionarios";
      return htmlRedirect(buildAppUrl(back, { google: "error", reason: error }, dec?.og), "Erro na autorização");
    }
    if (!code || !state) {
      console.warn("[oauth-callback] missing code or state");
      return errorResponse("Parâmetros inválidos", 400);
    }

    const decoded = decodeState(state);
    if (!decoded) {
      console.warn("[oauth-callback] invalid state");
      return errorResponse("State inválido", 400);
    }

    console.log("[oauth-callback] state decoded", {
      uid: decoded.uid,
      rt: decoded.rt,
      og: decoded.og,
    });

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;
    console.log("[oauth-callback] exchanging code", { redirect_uri: redirectUri });

    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResp.ok) {
      const txt = await tokenResp.text();
      console.error("[oauth-callback] token exchange failed:", tokenResp.status, txt);
      return htmlRedirect(buildAppUrl(decoded.rt, { google: "error", reason: "token_exchange_failed" }, decoded.og), "Falha ao obter token");
    }

    const tok = await tokenResp.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      token_type: string;
    };

    console.log("[oauth-callback] token exchange ok", {
      has_refresh: !!tok.refresh_token,
      expires_in: tok.expires_in,
      scope: tok.scope,
    });

    const expiresAt = new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString();

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let refreshToken = tok.refresh_token;
    if (!refreshToken) {
      const { data: existing } = await admin
        .from("google_calendar_tokens")
        .select("refresh_token")
        .eq("user_id", decoded.uid)
        .maybeSingle();
      refreshToken = existing?.refresh_token;
      console.log("[oauth-callback] reused existing refresh_token", { found: !!refreshToken });
    }

    if (!refreshToken) {
      console.warn("[oauth-callback] no refresh_token available");
      return htmlRedirect(
        buildAppUrl(decoded.rt, { google: "error", reason: "no_refresh_token" }, decoded.og),
        "Faltou refresh_token — revogue o acesso em myaccount.google.com e tente de novo",
      );
    }

    const { error: upErr, data: upData } = await admin
      .from("google_calendar_tokens")
      .upsert({
        user_id: decoded.uid,
        access_token: tok.access_token,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope: tok.scope,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("user_id")
      .maybeSingle();

    if (upErr) {
      console.error("[oauth-callback] upsert error:", upErr);
      return htmlRedirect(buildAppUrl(decoded.rt, { google: "error", reason: "db_upsert_failed" }, decoded.og), "Erro ao salvar token");
    }

    console.log("[oauth-callback] token saved", { user_id: upData?.user_id });

    const finalUrl = buildAppUrl(decoded.rt, { google: "ok" }, decoded.og);
    console.log("[oauth-callback] redirecting to app", { url_prefix: finalUrl.slice(0, 80) });
    return htmlRedirect(finalUrl, "Google Agenda conectado!");
  } catch (e) {
    console.error("[oauth-callback] error:", e);
    return errorResponse(`Erro: ${e instanceof Error ? e.message : "desconhecido"}`, 500);
  }
});
