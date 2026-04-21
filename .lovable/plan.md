
## Plano: Auditar e corrigir o fluxo OAuth Google Calendar ponta a ponta

### O que foi verificado no código

O fluxo atual no código está desenhado para passar pelas funções:

```text
Frontend
  -> google-oauth-start
  -> Google OAuth
  -> google-oauth-callback
  -> google_calendar_tokens
  -> redirect de volta para o app com ?google=ok
```

Pontos encontrados:

- `src/components/AnaliseContrato.tsx` chama `supabase.functions.invoke("google-oauth-start")` e depois faz `window.location.href = data.url`.
- `google-oauth-start` monta a URL do Google com:
  - `redirect_uri = {SUPABASE_URL}/functions/v1/google-oauth-callback`
  - `scope = https://www.googleapis.com/auth/calendar.events`
  - `access_type = offline`
  - `prompt = consent`
  - `state` com usuário, rota de retorno e origem.
- `google-oauth-callback` troca o `code` por tokens e faz `upsert` em `google_calendar_tokens`.
- Não encontrei outro código no frontend usando `signInWithOAuth`, OAuth client-side alternativo, ou fluxo paralelo para Google Calendar.
- A tabela `google_calendar_tokens` tem ao menos um registro existente no banco, mas isso pode não estar aparecendo para o usuário por diferença de usuário, ambiente, RLS, visualização ou projeto consultado.

### Problema provável

Há uma inconsistência entre o comportamento reportado e o código atual:

- Se os eventos estão sendo criados no Google Calendar, a função `sync-calendar-alerts` precisa de um `access_token`.
- No código atual, esse token só vem de `google_calendar_tokens`.
- Portanto, ou:
  1. existe token salvo, mas ele não está visível para o usuário/tabela consultada;
  2. o callback funcionou em algum momento e depois os logs não mostram mais a chamada;
  3. a URL retornada por `google-oauth-start` não é a URL que o navegador está usando de fato;
  4. a configuração/deploy da função pública no gateway não corresponde ao código local;
  5. o usuário está autorizando pelo Google, mas chegando em outro redirect URI antes do callback esperado.

### Correções propostas

#### 1. Instrumentar `google-oauth-start`

Adicionar logs seguros, sem expor tokens ou secrets:

- quando a função inicia;
- usuário autenticado identificado;
- `return_to` recebido;
- `origin` recebido;
- `redirect_uri` enviado ao Google;
- início da URL gerada para o Google.

Também retornar temporariamente no JSON de resposta:

```json
{
  "url": "...",
  "redirect_uri": "https://tqzxjuszojskbpackqyr.supabase.co/functions/v1/google-oauth-callback"
}
```

Isso permite confirmar no Network do navegador que o Google está recebendo exatamente o callback correto.

#### 2. Instrumentar `google-oauth-callback`

Adicionar logs seguros:

- callback recebido;
- query params presentes: `code`, `state`, `error`;
- `state` decodificado;
- `redirect_uri` usado na troca do token;
- sucesso/falha da troca com Google;
- sucesso/falha do `upsert` em `google_calendar_tokens`;
- URL final de redirect para o app.

Não logar `access_token`, `refresh_token`, client secret ou código completo.

#### 3. Corrigir CORS e respostas do callback

Atualizar `google-oauth-callback` para incluir headers consistentes também em respostas de erro:

- `Access-Control-Allow-Origin`
- `Content-Type`

Embora o callback seja navegação GET do Google, isso ajuda nos testes e evita diagnóstico falso em chamadas manuais.

#### 4. Confirmar `verify_jwt = false` e redeploy

Manter no `supabase/config.toml`:

```toml
[functions.google-oauth-start]
verify_jwt = false

[functions.google-oauth-callback]
verify_jwt = false
```

Depois do ajuste, redeployar explicitamente:

- `google-oauth-start`
- `google-oauth-callback`
- `sync-calendar-alerts`, se necessário para validar o fluxo completo

#### 5. Manter validação de usuário dentro de `google-oauth-start`

A função deve ser pública no gateway (`verify_jwt = false`), mas ainda precisa identificar o usuário no código quando chamada pelo app.

Motivo: o callback precisa saber em qual `user_id` salvar o token. Se removermos totalmente a validação e aceitarmos `user_id` vindo do frontend, qualquer usuário poderia tentar gravar tokens na conta de outro usuário.

Então o ajuste correto é:

```text
gateway público
  + validação de usuário no código em google-oauth-start
  + callback público
  + gravação segura via service role no callback
```

#### 6. Validar o fluxo com testes reais

Após implementar e redeployar:

1. Chamar `google-oauth-start` e verificar se a URL retornada contém:
   - `accounts.google.com`
   - `redirect_uri=https://tqzxjuszojskbpackqyr.supabase.co/functions/v1/google-oauth-callback`
   - `response_type=code`
   - `access_type=offline`
   - `prompt=consent`
2. Clicar em “Conectar Google Agenda”.
3. Autorizar no Google.
4. Confirmar nos logs que `google-oauth-callback` recebeu a requisição.
5. Confirmar no banco que `google_calendar_tokens` foi criado/atualizado para o usuário logado.
6. Confirmar que o app volta para a página do colaborador com `?google=ok`.
7. Confirmar que os alertas pendentes sincronizam automaticamente.

### Arquivos a alterar

- `supabase/functions/google-oauth-start/index.ts`
  - logs seguros;
  - resposta com `redirect_uri` para diagnóstico;
  - validação robusta de `return_to` e `origin`.

- `supabase/functions/google-oauth-callback/index.ts`
  - logs seguros;
  - headers consistentes em todas as respostas;
  - mensagens de erro mais detalhadas;
  - confirmação explícita do `upsert`.

- `supabase/config.toml`
  - garantir `verify_jwt = false` para as duas funções.

### Resultado esperado

Depois da correção, teremos evidência clara em logs e Network de que o fluxo está passando por:

```text
Frontend
  -> google-oauth-start
  -> Google
  -> google-oauth-callback
  -> google_calendar_tokens
  -> App com ?google=ok
```

E, caso o Google esteja redirecionando para outro lugar, os logs/Network vão mostrar exatamente onde o desvio acontece.
