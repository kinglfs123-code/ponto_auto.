import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatMesShort(m: string): string {
  // YYYY-MM -> MM/YYYY
  const [y, mm] = m.split("-");
  return `${mm}/${y}`;
}

function mesNomeAno(m: string): { mesNome: string; ano: string } {
  const [y, mm] = m.split("-");
  const idx = Math.max(0, Math.min(11, Number(mm) - 1));
  return { mesNome: MESES_PT[idx], ano: y };
}

function removeAcentos(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function sanitizeForFilename(s: string): string {
  return removeAcentos(s)
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "Colaborador";
}

function rfc2822Date(d: Date = new Date()): string {
  // Wed, 23 Apr 2026 14:25:01 +0000
  return d.toUTCString().replace("GMT", "+0000");
}

function buildMessageId(domain: string): string {
  const rand = Math.random().toString(36).slice(2);
  const ts = Date.now().toString(36);
  return `<${ts}.${rand}@${domain}>`;
}

async function getValidAccessToken(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ token: string | null; scope: string | null; reason?: "no_token" | "refresh_revoked" }> {
  const { data, error } = await admin
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Erro ao ler tokens: ${error.message}`);
  if (!data) return { token: null, scope: null, reason: "no_token" };

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
    return { token: null, scope: null, reason: "refresh_revoked" };
  }

  const tok = await resp.json() as {
    access_token: string;
    expires_in: number;
    scope?: string;
  };
  const newExpiresAt = new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString();
  const newScope = tok.scope ?? scope;

  await admin.from("google_calendar_tokens").update({
    access_token: tok.access_token,
    expires_at: newExpiresAt,
    scope: newScope,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);

  return { token: tok.access_token, scope: newScope };
}

function deriveDisplayName(email: string): string {
  const localPart = (email.split("@")[0] ?? "").trim();
  if (!localPart) return email;
  return (
    localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ") || email
  );
}

function encodeHeader(value: string): string {
  // Encode non-ASCII em RFC 2047
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(value)))}?=`;
}

function formatCNPJ(cnpj?: string | null): string {
  if (!cnpj) return "";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

interface HoleriteEmailData {
  fromName: string;
  fromEmail: string;
  toEmail: string;
  toName: string;
  subject: string;
  empresaNome: string;
  empresaCnpj: string | null;
  mesNome: string;
  ano: string;
  pdfBase64: string;
  pdfFilename: string;
}

function buildHoleriteHtml(d: HoleriteEmailData): string {
  const cnpjLine = d.empresaCnpj
    ? `<p style="margin:4px 0;font-size:13px;color:#555555;font-family:Arial,Helvetica,sans-serif;">CNPJ: ${escapeHtml(formatCNPJ(d.empresaCnpj))}</p>`
    : "";
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(d.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#333333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:28px 32px 16px;border-bottom:3px solid #0066cc;">
              <h1 style="margin:0;font-size:22px;font-weight:bold;color:#0066cc;font-family:Arial,Helvetica,sans-serif;">
                ${escapeHtml(d.empresaNome)}
              </h1>
              <p style="margin:6px 0 0;font-size:13px;color:#666666;font-family:Arial,Helvetica,sans-serif;">Recursos Humanos</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;font-family:Arial,Helvetica,sans-serif;">
                Olá <strong>${escapeHtml(d.toName)}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;font-family:Arial,Helvetica,sans-serif;">
                Segue em anexo seu holerite referente ao mês de <strong>${escapeHtml(d.mesNome)}/${escapeHtml(d.ano)}</strong>.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;font-family:Arial,Helvetica,sans-serif;">
                Recomendamos guardar este documento em local seguro. Em caso de dúvidas, entre em contato com o setor de Recursos Humanos respondendo este e-mail.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e5e7eb;padding-top:18px;">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;">
                    <p style="margin:0 0 4px;font-size:14px;color:#1f2937;font-weight:bold;">${escapeHtml(d.empresaNome)}</p>
                    <p style="margin:4px 0;font-size:13px;color:#555555;">Setor de Recursos Humanos</p>
                    <p style="margin:4px 0;font-size:13px;color:#555555;">
                      E-mail: <a href="mailto:${escapeHtml(d.fromEmail)}" style="color:#0066cc;text-decoration:none;">${escapeHtml(d.fromEmail)}</a>
                    </p>
                    ${cnpjLine}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 24px;background-color:#fafafa;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;line-height:1.5;color:#888888;font-family:Arial,Helvetica,sans-serif;text-align:center;">
                Esta mensagem é destinada exclusivamente ao colaborador identificado acima e contém informações confidenciais.<br />
                Se você recebeu este e-mail por engano, favor descartá-lo.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0;font-size:11px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;">
          ${escapeHtml(d.empresaNome)} • Departamento Pessoal
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildHolerieTextPlain(d: HoleriteEmailData): string {
  const lines = [
    `${d.empresaNome} - Recursos Humanos`,
    `------------------------------------------------------------`,
    ``,
    `Olá ${d.toName},`,
    ``,
    `Segue em anexo seu holerite referente ao mês de ${d.mesNome}/${d.ano}.`,
    ``,
    `Recomendamos guardar este documento em local seguro. Em caso de dúvidas, entre em contato com o setor de Recursos Humanos respondendo este e-mail.`,
    ``,
    `--`,
    `${d.empresaNome}`,
    `Setor de Recursos Humanos`,
    `E-mail: ${d.fromEmail}`,
  ];
  if (d.empresaCnpj) lines.push(`CNPJ: ${formatCNPJ(d.empresaCnpj)}`);
  lines.push("");
  lines.push("Esta mensagem é destinada exclusivamente ao colaborador identificado acima.");
  lines.push("Se você recebeu este e-mail por engano, favor descartá-lo.");
  return lines.join("\r\n");
}

function buildHoleriteMime(d: HoleriteEmailData): string {
  const mixedBoundary = `mixed_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const altBoundary = `alt_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const fromHeader = `${encodeHeader(d.fromName)} <${d.fromEmail}>`;
  const toHeader = d.toName
    ? `${encodeHeader(d.toName)} <${d.toEmail}>`
    : d.toEmail;
  const subjectEnc = encodeHeader(d.subject);

  const html = buildHoleriteHtml(d);
  const text = buildHolerieTextPlain(d);

  const htmlB64 = btoa(unescape(encodeURIComponent(html))).match(/.{1,76}/g)?.join("\r\n") ?? "";
  const textB64 = btoa(unescape(encodeURIComponent(text))).match(/.{1,76}/g)?.join("\r\n") ?? "";
  const pdfB64 = d.pdfBase64.match(/.{1,76}/g)?.join("\r\n") ?? d.pdfBase64;

  const fromDomain = (d.fromEmail.split("@")[1] || "gmail.com").toLowerCase();
  const messageId = buildMessageId(fromDomain);

  // Filename RFC 2231 (UTF-8 safe) — também enviamos um filename ASCII como fallback
  const asciiFilename = removeAcentos(d.pdfFilename).replace(/[^A-Za-z0-9._-]/g, "_");

  const lines = [
    `MIME-Version: 1.0`,
    `Date: ${rfc2822Date()}`,
    `Message-ID: ${messageId}`,
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Reply-To: ${fromHeader}`,
    `Subject: ${subjectEnc}`,
    `X-Mailer: Ponto_auto. - ${d.empresaNome}`,
    `X-Priority: 3`,
    `Importance: Normal`,
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    ``,
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    ``,
    `--${altBoundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    textB64,
    ``,
    `--${altBoundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    htmlB64,
    ``,
    `--${altBoundary}--`,
    ``,
    `--${mixedBoundary}`,
    `Content-Type: application/pdf; name="${asciiFilename}"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="${asciiFilename}"`,
    ``,
    pdfB64,
    ``,
    `--${mixedBoundary}--`,
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
  if (!resp.ok) {
    console.error("[send-via-gmail] gmail send failed", { status: resp.status, body });
  } else {
    console.log("[send-via-gmail] gmail send ok", { status: resp.status, message_id: (body as any)?.id });
  }
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
    const kind = body?.kind as "holerite" | undefined;
    if (kind !== "holerite") {
      return jsonResponse({ error: "kind inválido. Apenas 'holerite' é suportado." }, 400);
    }

    // Carrega token
    const { token: accessToken, scope, reason: tokenReason } = await getValidAccessToken(admin, userId);
    if (!accessToken) {
      return jsonResponse({
        needs_reconnect: true,
        reason: tokenReason ?? "no_token",
        error: tokenReason === "refresh_revoked"
          ? "Sua autorização Google expirou. Reconecte para continuar."
          : "Conecte sua conta Google para enviar e-mails.",
      });
    }
    if (!scope || !scope.includes("https://www.googleapis.com/auth/gmail.send")) {
      return jsonResponse({
        needs_reconnect: true,
        reason: "missing_scope",
        missing_scope: "gmail.send",
        error: "Permissão de envio de e-mail não concedida. Reconecte e autorize 'Enviar e-mails'.",
      });
    }

    const authEmail = userData.user.email ?? "me@gmail.com";
    const profile = { email: authEmail, name: deriveDisplayName(authEmail) };

    const holerite_id = body?.holerite_id as string | undefined;
    if (!holerite_id) return jsonResponse({ error: "holerite_id obrigatório" }, 400);

    const { data: hol, error: hErr } = await admin
      .from("holerites")
      .select("id, mes_referencia, pdf_path, empresa_id, funcionario_id, funcionarios(nome_completo, email), empresas(nome, cnpj, owner_id)")
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
    const { mesNome, ano } = mesNomeAno(mes);

    const empresaNome: string = empresa.nome ?? "Empresa";
    const subject = `Holerite ${formatMesShort(mes)} - ${empresaNome}`;

    const pdfFilename = `Holerite_${sanitizeForFilename(func.nome_completo as string)}_${mesNome}_${ano}.pdf`;

    const emailData: HoleriteEmailData = {
      fromName: empresaNome ? `${empresaNome} - RH` : profile.name,
      fromEmail: profile.email,
      toEmail: func.email as string,
      toName: func.nome_completo as string,
      subject,
      empresaNome,
      empresaCnpj: empresa.cnpj ?? null,
      mesNome,
      ano,
      pdfBase64,
      pdfFilename,
    };

    const rawMime = buildHoleriteMime(emailData);

    console.log("[send-via-gmail] sending holerite", {
      user_id: userId,
      to: emailData.toEmail,
      subject,
      pdf_filename: pdfFilename,
    });

    const result = await sendGmail(accessToken, rawMime);
    if (!result.ok) {
      const errBody = typeof result.body === "string" ? result.body : JSON.stringify(result.body);
      const lower = errBody.toLowerCase();
      await logSend(admin, func.email as string, "gmail_holerite", "failed",
        { mode: "holerite", holerite_id, status: result.status }, errBody);

      if (result.status === 403 && lower.includes("insufficient")) {
        return jsonResponse({ needs_reconnect: true, reason: "scope_insufficient", error: "Reconecte o Google para autorizar envio de e-mail." });
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
    await logSend(admin, func.email as string, "gmail_holerite", "sent",
      { mode: "holerite", holerite_id, gmail_message_id: messageId, from: profile.email, subject, pdf_filename: pdfFilename },
      undefined, messageId);

    return jsonResponse({ ok: true, message: `Holerite enviado para ${func.email}`, gmail_message_id: messageId });
  } catch (e) {
    console.error("[send-via-gmail] error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
