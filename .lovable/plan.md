

## Plano: Corrigir redirect do OAuth Google para preservar a origem do usuário

### Diagnóstico

O OAuth **está funcionando** — o token está salvo na tabela `google_calendar_tokens` (user `jv@outlook.com`, `expires_at` futuro, `scope` correto). O problema real:

1. O secret `APP_ORIGIN` está fixo em `https://a0d53f07-de8c-4fd7-b593-224b7e2b1463.lovable.app` (domínio **published**).
2. O usuário está navegando no domínio **preview**: `https://id-preview--a0d53f07-...lovable.app`.
3. Após a troca de tokens, o callback redireciona para `${APP_ORIGIN}/funcionarios/{id}?google=ok` — ou seja, para o domínio published, **não** para o preview onde o usuário estava.
4. No published, ele provavelmente não está logado, então a página `/funcionarios/{id}` não carrega o badge "conectado", e a impressão é que "nada foi salvo".

Por isso os logs do `google-oauth-callback` não mostram nada na sessão atual: o callback foi chamado **uma vez** (às 18:40), salvou o token, e desde então o usuário está reabrindo o fluxo mas sempre acabando no domínio errado.

### Correção

**1. `supabase/functions/google-oauth-start/index.ts`**
- Aceitar um campo `origin` no body (`window.location.origin` enviado pelo client).
- Incluir `origin` no payload do `state` (junto com `uid`, `rt`, `n`).

**2. `supabase/functions/google-oauth-callback/index.ts`**
- Decodificar `origin` do `state`.
- Trocar a lógica de `buildAppUrl` para usar o `origin` do state como base; cair no `APP_ORIGIN` apenas se `origin` ausente.
- Validar que o `origin` é uma URL `https://*.lovable.app` ou um domínio confiável (lista permitida) — para impedir open-redirect.

**3. `src/components/AnaliseContrato.tsx` (`handleConectarGoogle`)**
- Enviar `origin: window.location.origin` no body do `invoke("google-oauth-start", ...)`.

**4. Redeploy** das duas funções.

**5. Testar**: clicar em "Conectar Google Agenda" no preview → autorizar → confirmar que o redirect volta para `id-preview--...lovable.app/funcionarios/{id}?google=ok` e o badge fica verde.

### Validação extra

- `read_query` em `google_calendar_tokens` para confirmar que continua existindo um único registro ativo.
- `edge_function_logs` em `google-oauth-callback` para confirmar nova invocação.

### O que NÃO muda

- Schema do banco
- `analyze-contract`, `sync-calendar-alerts`
- Lista de redirect URIs no Google Cloud Console (continua sendo só `${SUPABASE_URL}/functions/v1/google-oauth-callback`)
- `APP_ORIGIN` (continua como fallback)

