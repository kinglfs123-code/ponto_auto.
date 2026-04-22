

## Plano: enviar holerites e documentos via Gmail do próprio usuário (OAuth)

### Visão geral

Hoje os holerites saem via Resend usando `onboarding@resend.dev` (domínio compartilhado, baixa entregabilidade, remetente genérico). A proposta é trocar o envio para a **conta Gmail do próprio usuário logado**, reaproveitando o OAuth Google que já existe (hoje só com escopo de Calendar). Assim:

- O e-mail chega como se viesse do RH/dono da conta;
- Não precisa configurar domínio nem chave Resend;
- O mesmo botão "Enviar" passa a funcionar para Holerites **e** para um envio consolidado de Documentos.

### Parte 1 — Adicionar escopo Gmail ao OAuth existente

**`supabase/functions/google-oauth-start/index.ts`**
- Trocar o `scope` para os dois escopos:
  ```
  https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send
  ```
- Manter `prompt=consent` e `access_type=offline` para garantir refresh_token novo.

**`supabase/functions/google-oauth-callback/index.ts`**
- Nenhuma mudança lógica — o callback já salva `scope` retornado. O Google devolverá os dois escopos juntos.

**`src/components/AnaliseContrato.tsx`**
- Renomear o botão "Conectar Google Agenda" para **"Conectar Google (Agenda + Gmail)"**.
- Continuar disparando `google-oauth-start` da mesma forma.

**Migração de tokens existentes**
- Tokens antigos (só Calendar) **não** poderão enviar e-mail. Quando o envio falhar com `403 insufficient scope`, a função retorna `{ needs_reconnect: true }` e a UI mostra um botão para reconectar.

### Parte 2 — Nova edge function `send-via-gmail`

Substitui o `send-holerite` (que ficará como fallback Resend opcional, mas não usado por padrão). Aceita dois modos:

```ts
// Modo 1 — holerite individual (mantém compatibilidade do botão atual)
{ kind: "holerite", holerite_id: string }

// Modo 2 — documentos consolidados de um funcionário
{ kind: "documentos", funcionario_id: string, categorias?: string[] }
```

**Fluxo interno (igual para os dois modos):**
1. Validar JWT do usuário (`getUser`).
2. Carregar token Google do `google_calendar_tokens` e fazer refresh se expirado (reaproveita exatamente a mesma `getValidAccessToken` do `sync-calendar-alerts` — extrair para um helper inline copiado).
3. Se token ausente → resposta `{ needs_connection: true }`.
4. Se scope salvo no banco **não contém** `gmail.send` → resposta `{ needs_reconnect: true, reason: "missing_gmail_scope" }`.
5. Buscar perfil do usuário no Google (`https://www.googleapis.com/oauth2/v2/userinfo`) para obter `email` e `name` → usados como remetente "From".
6. Montar o e-mail (ver Parte 3).
7. Enviar via `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send` com body `{ raw: <base64url RFC2822> }`.
8. Em caso de sucesso: para `holerite`, atualizar `holerites.enviado=true`. Logar em `email_send_log` (já existe) com `template_name="gmail_holerite"` ou `"gmail_documentos"`.
9. Tratar erros:
   - `401` → tentar refresh 1x e retentar.
   - `403 insufficient scope` → `{ needs_reconnect: true }`.
   - `429` → `{ rate_limited: true }` para a UI sugerir tentar mais tarde.
   - outros → log + erro 500 com `error.message`.

### Parte 3 — Conteúdo do e-mail por modo

**Modo `holerite`** (mantém comportamento atual, melhor remetente):
- **De:** `Nome do usuário <email_do_usuário@gmail.com>`
- **Para:** e-mail do funcionário
- **Assunto:** `Holerite — {mes_referencia}`
- **HTML profissional:** saudação com nome, mês de referência, breve mensagem do RH, anexo PDF baixado do Storage `holerites/{path}`.
- **Anexo:** PDF em multipart MIME (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename="holerite-{mes}.pdf"`, body base64).

**Modo `documentos`**:
- **Para:** e-mail do funcionário
- **Assunto:** `Seus documentos — {nome_empresa}`
- **HTML:** lista organizada por categoria (Contrato, ASO, EPI, Outros) com nome do arquivo e **link assinado de download** (1 hora) gerado via `supabase.storage.from("colaborador-arquivos").createSignedUrl(path, 3600)`.
- **Sem anexos**: links assinados expiram em 1h, evita anexos pesados e mantém auditabilidade.

### Parte 4 — UI

**`src/pages/Holerites.tsx` e `src/pages/FuncionarioDetalhe.tsx`** (botão "Enviar" do holerite):
- Trocar a chamada de `send-holerite` para `send-via-gmail` com `{ kind: "holerite", holerite_id }`.
- Tratar respostas `needs_connection` e `needs_reconnect` mostrando toast + botão de reconexão (chama `google-oauth-start`).

**`src/pages/FuncionarioDetalhe.tsx` — aba Documentos**:
- Adicionar um botão **"Enviar documentos por e-mail"** no topo da seção de documentos do funcionário (só habilitado quando o funcionário tem `email`).
- Chama `send-via-gmail` com `{ kind: "documentos", funcionario_id }`.
- Mesma tratativa de erros / reconexão.

### Parte 5 — Log e segurança

- **`email_send_log`** já existe e tem RLS service-role; a função grava lá com `recipient_email`, `template_name`, `status`, `metadata: { gmail_message_id, mode, funcionario_id }`.
- Token Gmail **nunca** sai do servidor — a função usa o token via service role; o frontend só recebe `{ ok }` ou códigos de erro semânticos.
- Validação de propriedade: a função confirma que o funcionário/holerite pertence a uma empresa do `auth.uid()` antes de enviar (via `user_owns_empresa`).

### Parte 6 — Configuração e deploy

- `supabase/config.toml`: adicionar bloco para `send-via-gmail` com `verify_jwt = false` (validação feita em código, padrão do projeto).
- Deploy de: `google-oauth-start`, `send-via-gmail`.
- **Google Cloud Console** (passo manual do usuário, único requisito externo): habilitar **Gmail API** no mesmo projeto OAuth onde Calendar já está. Sem isso, a primeira chamada retorna `403 Gmail API has not been used`. O plano inclui uma mensagem clara no toast indicando a habilitação se esse erro vier.
- Após deploy, **reconectar** Google uma vez (qualquer usuário existente) para receber o novo scope.

### Arquivos editados / criados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/google-oauth-start/index.ts` | Adiciona scope `gmail.send` |
| `supabase/functions/send-via-gmail/index.ts` | **NOVO** — envio via Gmail API (holerite + documentos) |
| `supabase/config.toml` | Bloco `[functions.send-via-gmail]` com `verify_jwt = false` |
| `src/pages/Holerites.tsx` | Trocar invoke para `send-via-gmail`; tratar reconexão |
| `src/pages/FuncionarioDetalhe.tsx` | Trocar invoke do holerite + novo botão "Enviar documentos por e-mail" |
| `src/components/AnaliseContrato.tsx` | Renomear botão para "Conectar Google (Agenda + Gmail)" |

### O que NÃO muda

- Schema do banco (usa `email_send_log` e `google_calendar_tokens` existentes)
- Resend / `send-holerite` (mantidos como fallback, não removidos nesta iteração)
- Fluxo de Calendar / `sync-calendar-alerts`
- RLS, autenticação, contexto de empresa

### Observação importante para o usuário

- Os e-mails sairão **da sua própria conta Gmail** (a do dono da empresa logado no app), com o seu nome e endereço. Os funcionários verão o e-mail do RH como remetente real, podendo responder direto.
- O Gmail tem limite de **~500 envios/dia** por conta gratuita e ~2.000/dia em Workspace — adequado para folha de uma PME.
- Após o deploy, será necessário **clicar uma vez em "Conectar Google"** para autorizar o novo escopo de envio de e-mail.

