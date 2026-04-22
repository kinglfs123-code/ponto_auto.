import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIA_LABEL: Record<string, string> = {
  contrato: "Contrato de Trabalho",
  aso: "ASO",
  epi: "Ficha de EPI",
  outros: "Outros",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64UrlEncode(input: string | Uint8Array): string {
  let b64: string;
  if (typeof input === "string") {
    b64 = btoa(unescape(encodeURIComponent(input)));
  } else {
    let str = "";
    const chunk = 0x8000;
    for (let i = 0; i < input.length; i += chunk) {
      str += String.fromCharCode(...input.subarray(i, i + chunk));
    }
    b64 = btoa(str);
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    str += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(str);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMes(m: string): string {
  const [y, mm] = m.split("-");
  return `${mm}/${y}`;
}

async function getValidAccessToken(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ token: string | null; scope: string | null }> {
  const { data, error } = await admin
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Erro ao ler tokens: ${error.message}`);
  if (!data) return { token: null, scope: null };

  const expiresAt = new Date(data.expires_at as string).getTime();
  const scope = (data.scope as string | null) ?? null;
  if (expiresAt > Date.now() + 30_000) {
    return { token: data.access_token as string, scope };
  }

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
    console.error("[send-via-gmail] refresh failed:", txt);
    await admin.from("google_calendar_tokens").delete().eq("user_id", userId);
    return { token: null, scope: null };
  }

  const tok = await resp.json() as {
    access_token: string;
    expires_in: number;
    scope?: string;
  };
  const newExpiresAt = new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString();
  const newScope = tok.scope ?? scope;
  console.log("[send-via-gmail] refreshed token", {
    user_id: userId,
    scope_from_refresh: tok.scope ?? "(none)",
    has_gmail_send: !!(newScope ?? "").includes("https://www.googleapis.com/auth/gmail.send"),
    has_calendar_events: !!(newScope ?? "").includes("https://www.googleapis.com/auth/calendar.events"),
  });

  await admin.from("google_calendar_tokens").update({
    access_token: tok.access_token,
    expires_at: newExpiresAt,
    scope: newScope,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return { token: tok.access_token, scope: newScope };
}

async function getGoogleProfile(accessToken: string): Promise<{ email: string; name: string }> {
  // Use Gmail's own profile endpoint — already authorized by the gmail.send scope.
  // Avoids dependency on userinfo.email / userinfo.profile scopes.
  const resp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    console.error("[send-via-gmail] gmail profile failed:", resp.status, txt);
    throw new Error(`Falha ao ler perfil Google: ${resp.status}`);
  }
  const json = await resp.json() as { emailAddress?: string };
  const email = json.emailAddress ?? "";
  // Fallback display name from local part (e.g. "joao.vitor" -> "Joao Vitor").
  // Gmail still overrides the From header with the account's real display name on send.
  const localPart = email.split("@")[0] ?? "";
  const name = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ") || email;
  return { email, name };
}

function buildHolerieMime(opts: {
  fromName: string;
  fromEmail: string;
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
  pdfBase64: string;
  pdfFilename: string;
}): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const { fromName, fromEmail, toEmail, toName, subject, html, pdfBase64, pdfFilename } = opts;

  const subjectEnc = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const fromHeader = `${fromName} <${fromEmail}>`;
  const toHeader = toName ? `${toName} <${toEmail}>` : toEmail;

  // Quebra o base64 em linhas de 76 chars (RFC 2045)
  const pdfWrapped = pdfBase64.match(/.{1,76}/g)?.join("\r\n") ?? pdfBase64;

  const lines = [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${subjectEnc}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(html))).match(/.{1,76}/g)?.join("\r\n") ?? "",
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf; name="${pdfFilename}"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${pdfFilename}"`,
    ``,
    pdfWrapped,
    ``,
    `--${boundary}--`,
    ``,
  ];

  return lines.join("\r\n");
}

function buildDocumentosMime(opts: {
  fromName: string;
  fromEmail: string;
  toEmail: string;
  toName: string;
  subject: string;
  html: string;
}): string {
  const { fromName, fromEmail, toEmail, toName, subject, html } = opts;
  const subjectEnc = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const fromHeader = `${fromName} <${fromEmail}>`;
  const toHeader = toName ? `${toName} <${toEmail}>` : toEmail;

  const lines = [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${subjectEnc}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(html))).match(/.{1,76}/g)?.join("\r\n") ?? "",
    ``,
  ];
  return lines.join("\r\n");
}

async function sendGmail(accessToken: string, rawMime: string): Promise<{ ok: boolean; status: number; body: any }> {
  const raw = base64UrlEncode(rawMime);
  const resp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  let body: any = null;
  try { body = await resp.json(); } catch { body = await resp.text(); }
  return { ok: resp.ok, status: resp.status, body };
}

async function logSend(
  admin: ReturnType<typeof createClient>,
  recipient: string,
  template: string,
  status: string,
  metadata: Record<string, unknown>,
  errorMessage?: string,
  messageId?: string,
) {
  try {
    await admin.from("email_send_log").insert({
      recipient_email: recipient,
      template_name: template,
      status,
      metadata,
      error_message: errorMessage ?? null,
      message_id: messageId ?? null,
    });
  } catch (e) {
    console.error("[send-via-gmail] log insert failed:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Não autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "Token inválido" }, 401);

    const userId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const kind = body?.kind as "holerite" | "documentos" | undefined;
    if (kind !== "holerite" && kind !== "documentos") {
      return jsonResponse({ error: "kind inválido (holerite|documentos)" }, 400);
    }

    // Carrega token
    const { token: accessToken, scope } = await getValidAccessToken(admin, userId);
    if (!accessToken) {
      return jsonResponse({ needs_connection: true, error: "Google não conectado" });
    }
    if (!scope || !scope.includes("https://www.googleapis.com/auth/gmail.send")) {
      return jsonResponse({
        needs_reconnect: true,
        reason: "missing_gmail_scope",
        error: "É necessário reconectar o Google para autorizar o envio de e-mail.",
      });
    }

    const profile = await getGoogleProfile(accessToken);
    if (!profile.email) {
      return jsonResponse({ error: "Não foi possível obter e-mail do Google" }, 500);
    }

    if (kind === "holerite") {
      const holerite_id = body?.holerite_id as string | undefined;
      if (!holerite_id) return jsonResponse({ error: "holerite_id obrigatório" }, 400);

      const { data: hol, error: hErr } = await admin
        .from("holerites")
        .select("id, mes_referencia, pdf_path, empresa_id, funcionario_id, funcionarios(nome_completo, email), empresas(nome, owner_id)")
        .eq("id", holerite_id)
        .maybeSingle();

      if (hErr || !hol) return jsonResponse({ error: `Holerite não encontrado: ${hErr?.message ?? ""}` }, 404);
      const empresa = (hol as any).empresas;
      if (!empresa || empresa.owner_id !== userId) {
        return jsonResponse({ error: "Sem permissão" }, 403);
      }
      const func = (hol as any).funcionarios;
      if (!func?.email) {
        return jsonResponse({ error: `Colaborador não tem e-mail cadastrado` }, 400);
      }

      // baixa PDF
      const { data: pdfData, error: stErr } = await admin.storage
        .from("holerites")
        .download((hol as any).pdf_path);
      if (stErr || !pdfData) return jsonResponse({ error: `Erro ao baixar PDF: ${stErr?.message}` }, 500);
      const pdfBase64 = arrayBufferToBase64(await pdfData.arrayBuffer());

      const mes = (hol as any).mes_referencia as string;
      const subject = `Holerite — ${formatMes(mes)}`;
      const html = `
<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif;color:#1d1d1f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:14px;padding:32px;">
        <tr><td>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;letter-spacing:-0.01em;">Olá, ${escapeHtml(func.nome_completo)}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#1d1d1f;">Segue em anexo o seu holerite referente a <strong>${escapeHtml(formatMes(mes))}</strong>.</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#1d1d1f;">Em caso de dúvidas, basta responder este e-mail.</p>
          <hr style="border:none;border-top:1px solid #e5e5ea;margin:24px 0;" />
          <p style="margin:0;font-size:13px;color:#6e6e73;">${escapeHtml(empresa.nome)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

      const rawMime = buildHolerieMime({
        fromName: profile.name,
        fromEmail: profile.email,
        toEmail: func.email,
        toName: func.nome_completo,
        subject,
        html,
        pdfBase64,
        pdfFilename: `holerite-${mes}.pdf`,
      });

      const result = await sendGmail(accessToken, rawMime);
      if (!result.ok) {
        const errBody = typeof result.body === "string" ? result.body : JSON.stringify(result.body);
        const lower = errBody.toLowerCase();
        await logSend(admin, func.email, "gmail_holerite", "failed",
          { mode: "holerite", holerite_id, status: result.status }, errBody);

        if (result.status === 403 && lower.includes("insufficient")) {
          return jsonResponse({ needs_reconnect: true, reason: "missing_gmail_scope", error: "Reconecte o Google para autorizar envio de e-mail." });
        }
        if (result.status === 403 && lower.includes("has not been used") && lower.includes("gmail")) {
          return jsonResponse({ error: "Habilite a Gmail API no Google Cloud Console e tente novamente." }, 400);
        }
        if (result.status === 429) {
          return jsonResponse({ rate_limited: true, error: "Limite de envio atingido. Tente novamente em alguns minutos." });
        }
        return jsonResponse({ error: `Falha Gmail (${result.status}): ${errBody.slice(0, 300)}` }, 500);
      }

      const messageId = (result.body as any)?.id ?? null;
      await admin.from("holerites").update({ enviado: true, enviado_em: new Date().toISOString() }).eq("id", holerite_id);
      await logSend(admin, func.email, "gmail_holerite", "sent",
        { mode: "holerite", holerite_id, gmail_message_id: messageId, from: profile.email }, undefined, messageId);

      return jsonResponse({ ok: true, message: `Holerite enviado para ${func.email}`, gmail_message_id: messageId });
    }

    // === Modo documentos ===
    const funcionario_id = body?.funcionario_id as string | undefined;
    if (!funcionario_id) return jsonResponse({ error: "funcionario_id obrigatório" }, 400);
    const categorias = (body?.categorias as string[] | undefined) ?? null;

    const { data: func, error: fErr } = await admin
      .from("funcionarios")
      .select("id, nome_completo, email, empresa_id, empresas(nome, owner_id)")
      .eq("id", funcionario_id)
      .maybeSingle();
    if (fErr || !func) return jsonResponse({ error: `Colaborador não encontrado: ${fErr?.message ?? ""}` }, 404);
    const empresa = (func as any).empresas;
    if (!empresa || empresa.owner_id !== userId) return jsonResponse({ error: "Sem permissão" }, 403);
    if (!(func as any).email) return jsonResponse({ error: "Colaborador não tem e-mail cadastrado" }, 400);

    let docsQuery = admin.from("funcionario_documentos")
      .select("id, categoria, nome_arquivo, storage_path, tamanho_bytes")
      .eq("funcionario_id", funcionario_id)
      .order("categoria")
      .order("created_at", { ascending: false });
    if (categorias && categorias.length > 0) docsQuery = docsQuery.in("categoria", categorias);

    const { data: docs, error: dErr } = await docsQuery;
    if (dErr) return jsonResponse({ error: `Erro ao listar documentos: ${dErr.message}` }, 500);
    if (!docs || docs.length === 0) return jsonResponse({ error: "Nenhum documento para enviar" }, 400);

    // Gera links assinados (1h)
    type DocRow = { id: string; categoria: string; nome_arquivo: string; storage_path: string; tamanho_bytes: number | null; signed_url?: string };
    const docsWithUrls: DocRow[] = [];
    for (const d of docs as DocRow[]) {
      const { data: sig, error: sErr } = await admin.storage
        .from("colaborador-arquivos")
        .createSignedUrl(d.storage_path, 3600);
      if (sErr) {
        console.error("[send-via-gmail] signed url failed:", sErr.message);
        continue;
      }
      docsWithUrls.push({ ...d, signed_url: sig?.signedUrl });
    }
    if (docsWithUrls.length === 0) return jsonResponse({ error: "Falha ao gerar links de download" }, 500);

    const grouped = new Map<string, DocRow[]>();
    for (const d of docsWithUrls) {
      const arr = grouped.get(d.categoria) ?? [];
      arr.push(d);
      grouped.set(d.categoria, arr);
    }

    const orderCat = ["contrato", "aso", "epi", "outros"];
    const sections = orderCat
      .filter((c) => grouped.has(c))
      .map((c) => {
        const items = grouped.get(c)!.map((d) => `
          <li style="margin:0 0 8px;line-height:1.5;">
            <a href="${escapeHtml(d.signed_url!)}" style="color:#0071e3;text-decoration:none;font-size:14px;">${escapeHtml(d.nome_arquivo)}</a>
            ${d.tamanho_bytes ? `<span style="color:#6e6e73;font-size:12px;"> · ${(d.tamanho_bytes / 1024).toFixed(0)} KB</span>` : ""}
          </li>`).join("");
        return `
          <h2 style="margin:24px 0 8px;font-size:15px;font-weight:600;color:#1d1d1f;">${escapeHtml(CATEGORIA_LABEL[c] ?? c)}</h2>
          <ul style="margin:0;padding:0 0 0 18px;">${items}</ul>`;
      })
      .join("");

    const subject = `Seus documentos — ${empresa.nome}`;
    const html = `
<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif;color:#1d1d1f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:14px;padding:32px;">
        <tr><td>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;letter-spacing:-0.01em;">Olá, ${escapeHtml((func as any).nome_completo)}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">Segue abaixo a lista dos seus documentos. Os links são válidos por <strong>1 hora</strong>.</p>
          ${sections}
          <hr style="border:none;border-top:1px solid #e5e5ea;margin:28px 0 16px;" />
          <p style="margin:0;font-size:13px;color:#6e6e73;">${escapeHtml(empresa.nome)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

    const rawMime = buildDocumentosMime({
      fromName: profile.name,
      fromEmail: profile.email,
      toEmail: (func as any).email,
      toName: (func as any).nome_completo,
      subject,
      html,
    });

    const result = await sendGmail(accessToken, rawMime);
    if (!result.ok) {
      const errBody = typeof result.body === "string" ? result.body : JSON.stringify(result.body);
      const lower = errBody.toLowerCase();
      await logSend(admin, (func as any).email, "gmail_documentos", "failed",
        { mode: "documentos", funcionario_id, status: result.status }, errBody);

      if (result.status === 403 && lower.includes("insufficient")) {
        return jsonResponse({ needs_reconnect: true, reason: "missing_gmail_scope", error: "Reconecte o Google para autorizar envio de e-mail." });
      }
      if (result.status === 403 && lower.includes("has not been used") && lower.includes("gmail")) {
        return jsonResponse({ error: "Habilite a Gmail API no Google Cloud Console e tente novamente." }, 400);
      }
      if (result.status === 429) {
        return jsonResponse({ rate_limited: true, error: "Limite de envio atingido. Tente novamente em alguns minutos." });
      }
      return jsonResponse({ error: `Falha Gmail (${result.status}): ${errBody.slice(0, 300)}` }, 500);
    }

    const messageId = (result.body as any)?.id ?? null;
    await logSend(admin, (func as any).email, "gmail_documentos", "sent",
      { mode: "documentos", funcionario_id, gmail_message_id: messageId, count: docsWithUrls.length, from: profile.email }, undefined, messageId);

    return jsonResponse({
      ok: true,
      message: `Documentos enviados para ${(func as any).email}`,
      gmail_message_id: messageId,
      documentos_enviados: docsWithUrls.length,
    });
  } catch (e) {
    console.error("[send-via-gmail] error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
