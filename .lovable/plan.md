

## Plano: corrigir 403 "ACCESS_TOKEN_SCOPE_INSUFFICIENT" do Gmail

### O que está acontecendo

O envio falha com:

```
403 ACCESS_TOKEN_SCOPE_INSUFFICIENT
"Request had insufficient authentication scopes"
```

Mesmo o banco (`google_calendar_tokens.scope`) registrando `calendar.events gmail.send`, o **token de acesso real** emitido pelo Google **não contém `gmail.send`**. Ou seja: o Google ignorou o pedido do escopo na hora de emitir o token.

### Causa mais provável

Para o Google emitir um `access_token` com `https://www.googleapis.com/auth/gmail.send`, **três coisas** precisam estar verdadeiras no projeto do Google Cloud onde o OAuth Client foi criado:

1. **Gmail API habilitada** em "APIs & Services → Library" (sem isso, o escopo é silenciosamente recusado).
2. **Escopo `.../auth/gmail.send` adicionado** na "OAuth consent screen → Scopes" (sem isso, o Google entrega só os escopos que ele "conhece" pra esse client — Calendar — e descarta o resto).
3. App em modo **Testing** com seu e-mail listado em "Test users", OU app **publicado** (In production). Em Testing sem o e-mail listado, o consent retorna erro; em Production sem verificação, escopos sensíveis como `gmail.send` podem ser bloqueados.

A migração do `oauth-callback` salva o `scope` que o **request** pediu (`tok.scope` da resposta do Google), mas a resposta da troca de código mostra exatamente o que o Google concedeu — que neste caso provavelmente está vindo sem `gmail.send`. Os logs do `oauth-callback` (`[oauth-callback] token exchange ok ... scope: ...`) confirmam isso.

### Correções (em duas frentes)

#### Frente 1 — Configuração no Google Cloud (você precisa fazer 1 vez)

Vou listar os passos exatos no chat — não envolve código. Resumo:

1. Abrir https://console.cloud.google.com/ → projeto onde o OAuth Client foi criado.
2. **APIs & Services → Library** → buscar "Gmail API" → clicar **Enable**.
3. **APIs & Services → OAuth consent screen → Scopes → Add or remove scopes** → marcar `https://www.googleapis.com/auth/gmail.send` → Update → Save.
4. Se o app está em **Testing**, garantir que seu Gmail está em "Test users".
5. Em https://myaccount.google.com/permissions → revogar o acesso atual do app (assim o próximo login força consentimento dos novos escopos).
6. Voltar no app → "Conectar Google" de novo.

#### Frente 2 — Detectar e avisar no app quando o escopo está faltando (mudanças de código)

**Arquivo: `supabase/functions/send-via-gmail/index.ts`**

- Logar o `scope` retornado pelo refresh do token (já temos a variável, só falta logar).
- Antes de chamar Gmail, validar se `scope` contém `gmail.send`. Se não contiver → retornar `{ needs_reconnect: true, missing_scope: "gmail.send" }` com status 200, em vez de explodir com 500.
- Tratar o 403 do Gmail também como `needs_reconnect` (caso o `scope` esteja "mentindo" — Google às vezes responde scope completo no refresh mas o token não tem permissão real).

**Arquivo: `supabase/functions/google-oauth-callback/index.ts`**

- Após a troca do `code`, validar se `tok.scope` inclui `gmail.send` e `calendar.events`.
- Se algum estiver faltando → redirecionar para a UI com `?google=error&reason=missing_scopes&missing=gmail.send` em vez de salvar token incompleto silenciosamente.

**Arquivos: `src/pages/FuncionarioDetalhe.tsx` e `src/pages/Holerites.tsx`**

- Quando `send-via-gmail` retornar `{ needs_reconnect: true, missing_scope }`, mostrar toast com botão **"Reconectar Google (escopo faltando: Enviar e-mail)"** que dispara `google-oauth-start` de novo.
- Quando a URL voltar com `?google=error&reason=missing_scopes`, mostrar toast vermelho explicando que o escopo `gmail.send` não foi concedido e linkar para o passo a passo do Google Cloud.

### Resultado esperado

- Depois do passo 1 (Google Cloud), reconectar uma vez → o token novo já vem com `gmail.send` real → envio passa a funcionar.
- Se algo voltar a falhar no futuro, o app **não** vai dar "Edge Function returned a non-2xx status code"; vai mostrar mensagem clara pedindo reconexão.

### O que NÃO muda

- Tokens de Calendar continuam funcionando (já estão).
- Templates de e-mail, anexos, links assinados, log em `email_send_log`.
- UI das telas de Holerites e Documentos (só ganham mensagens de erro melhores).

### Arquivos editados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/send-via-gmail/index.ts` | Valida `scope` antes de chamar Gmail; trata 403 como `needs_reconnect`; loga scope efetivo |
| `supabase/functions/google-oauth-callback/index.ts` | Valida que `tok.scope` traz `gmail.send`; redireciona com erro claro se faltar |
| `src/pages/FuncionarioDetalhe.tsx` | Trata `needs_reconnect` do envio de documentos com botão "Reconectar Google" |
| `src/pages/Holerites.tsx` | Mesmo tratamento no envio de holerites |

