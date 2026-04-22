

## Plano: redeploy de `send-via-gmail` + tratar token revogado/escopo insuficiente como `needs_reconnect`

### Diagnóstico real

A função **`send-via-gmail` está deployada** — os logs do Supabase mostram execuções nos últimos minutos:

- `[send-via-gmail] refresh failed: { "error": "invalid_grant", "error_description": "Token has been expired or revoked." }`
- `[send-via-gmail] gmail profile failed: 403 ... ACCESS_TOKEN_SCOPE_INSUFFICIENT`
- `[send-via-gmail] error: Falha ao ler perfil Google: 403`

O motivo do "Edge Function returned a non-2xx status code" no front **não é função inexistente** — é a função respondendo 500 em dois casos que ela ainda não trata bem:

1. **Refresh token revogado** (depois que você revogou em myaccount.google.com): `getValidAccessToken` deleta o registro e devolve `{ token: null }`, mas o handler depois trata como erro genérico → 500.
2. **403 do Gmail** ao chamar `users/me/profile` (escopo `gmail.send` não foi concedido de verdade): hoje vira `throw new Error(...)` → 500.

### Correção

#### 1. Forçar redeploy de `send-via-gmail`

Garante que a versão atual do código (com endpoint `gmail/v1/users/me/profile` e logs de scope) está em produção, eliminando a hipótese de cache antigo.

#### 2. `supabase/functions/send-via-gmail/index.ts` — tratar 3 casos como `needs_reconnect` (HTTP 200)

Em vez de deixar a função explodir com 500, devolver respostas estruturadas que o front entende:

| Situação | Resposta hoje | Resposta nova |
|---|---|---|
| Sem token salvo (`getValidAccessToken` retorna `null`) | 500 genérico | `200 { needs_reconnect: true, reason: "no_token" }` |
| Refresh falhou (`invalid_grant`) | Apaga token e retorna 500 | Apaga token e retorna `200 { needs_reconnect: true, reason: "refresh_revoked" }` |
| Scope sem `gmail.send` antes de chamar Gmail | (já validado no callback, mas não aqui) | `200 { needs_reconnect: true, reason: "missing_scope", missing_scope: "gmail.send" }` |
| 403 do Gmail no `getGoogleProfile` ou no `messages/send` | 500 | `200 { needs_reconnect: true, reason: "scope_insufficient" }` |

Outras falhas (rede, PDF não encontrado, etc.) continuam 500 com mensagem.

#### 3. `src/pages/Holerites.tsx` e `src/pages/FuncionarioDetalhe.tsx` — reagir a `needs_reconnect`

Hoje as duas telas só verificam `error` e `data?.success`. Adicionar:

- Se `data?.needs_reconnect === true` → toast amarelo com texto explicando o motivo (`reason`) + botão **"Reconectar Google"** que chama `supabase.functions.invoke("google-oauth-start", { body: { return_to } })` e abre a URL.
- Mensagens por motivo:
  - `no_token` → "Conecte sua conta Google para enviar e-mails."
  - `refresh_revoked` → "Sua autorização Google expirou. Reconecte para continuar."
  - `missing_scope` / `scope_insufficient` → "Permissão de envio de e-mail não concedida. Reconecte e autorize 'Enviar e-mails'."

### Resultado esperado

1. Após o redeploy + você reconectar o Google (já com `gmail.send` habilitado no Google Cloud), o envio funciona.
2. Se algo der errado de novo, **nunca mais** "Edge Function returned a non-2xx" — sempre toast claro com botão de reconectar.

### O que NÃO muda

- Escopos OAuth (`calendar.events` + `gmail.send`)
- Lógica de envio, anexos, links assinados, log em `email_send_log`
- `google-oauth-callback` (já valida scopes e redireciona com erro claro)
- UI das telas (só ganham 1 toast novo)

### Arquivos editados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/send-via-gmail/index.ts` | 4 caminhos de erro viram resposta 200 com `needs_reconnect` + reason; redeploy forçado |
| `src/pages/Holerites.tsx` | Trata `needs_reconnect` com toast + botão "Reconectar Google" |
| `src/pages/FuncionarioDetalhe.tsx` | Mesmo tratamento no envio de documentos e holerite individual |

### Passos manuais que continuam sendo seus

1. Confirmar no Google Cloud Console que **Gmail API está Enabled** e que `gmail.send` está na **OAuth consent screen → Scopes** (sem isso, mesmo reconectando, vai voltar `scope_insufficient`).
2. Após o deploy, clicar em "Reconectar Google" pelo botão novo (ou pela tela de Funcionários) para gerar token com `gmail.send` real.
3. Testar envio de holerite.

