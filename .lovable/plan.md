

## Plano: corrigir erro 401 ao enviar e-mail (perfil Google)

### Causa raiz

A função `send-via-gmail` chama `https://www.googleapis.com/oauth2/v2/userinfo` para descobrir o e-mail/nome do remetente. Esse endpoint exige o escopo `userinfo.email` / `userinfo.profile`, que **não foram pedidos** no OAuth — pedimos apenas `calendar.events` e `gmail.send`. Resultado: `401 Unauthorized` em todo envio.

O token salvo no banco já tem os escopos corretos para enviar e-mail; o que falta é só descobrir o endereço do remetente sem usar `userinfo`.

### Correção

**Arquivo:** `supabase/functions/send-via-gmail/index.ts`

Trocar a função `getGoogleProfile` para usar o endpoint próprio do Gmail, que já é autorizado pelo escopo `gmail.send`:

- Endpoint novo: `GET https://gmail.googleapis.com/gmail/v1/users/me/profile`
- Retorna `{ emailAddress: "...", messagesTotal, threadsTotal, historyId }`
- Sem `name`, então usar a parte antes do `@` como fallback de nome amigável (ex.: `joao.vitor` → `Joao Vitor`), e quando o Gmail montar o cabeçalho `From`, ele já preenche o display name real da conta automaticamente.

Mudanças concretas:

1. Substituir o `fetch` em `getGoogleProfile` para o endpoint do Gmail.
2. Se ainda assim retornar 401 → tratar como `needs_reconnect` (caso de token corrompido) com mensagem clara.
3. Como fallback de nome do remetente, usar `emailAddress.split("@")[0]` capitalizado.
4. Redeploy automático da edge function.

### Resultado esperado

Ao clicar em "Enviar documentos por e-mail" / "Enviar holerite":

- A função obtém o e-mail do remetente direto do Gmail (sem precisar de `userinfo`).
- O e-mail sai normalmente, com `From` montado a partir da conta Google conectada.
- Toast verde "Holerite enviado para …" / "Documentos enviados para …".

### O que NÃO muda

- Escopos OAuth (continuam `calendar.events` + `gmail.send`).
- Tokens já salvos no banco (não precisa reconectar).
- UI das telas de Holerites e Documentos.
- Lógica de envio, anexos, links assinados, log em `email_send_log`.

### Arquivos editados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/send-via-gmail/index.ts` | `getGoogleProfile` passa a usar `gmail/v1/users/me/profile` (sem dependência de `userinfo`) + fallback de nome |

