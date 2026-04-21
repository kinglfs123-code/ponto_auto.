

## Plano: Vincular Google Agenda via OAuth próprio (por usuário)

Hoje a edge `sync-calendar-alerts` depende de um secret estático `GOOGLE_CALENDAR_ACCESS_TOKEN` — isso não funciona em produção (token expira em 1h e não é por usuário). Vou substituir por OAuth real com Google, usando credenciais que você vai criar no Google Cloud Console.

### 1. O que você precisa fazer no Google Cloud (passo a passo na hora da implementação)

1. Acessar https://console.cloud.google.com/ → criar projeto (ou usar existente).
2. APIs & Services → **Library** → ativar **Google Calendar API**.
3. APIs & Services → **OAuth consent screen** → tipo "External" → preencher nome do app, email de suporte, e adicionar o escopo `https://www.googleapis.com/auth/calendar.events`.
4. APIs & Services → **Credentials** → Create Credentials → **OAuth client ID** → tipo "Web application".
5. **Authorized redirect URI**: vou te dar a URL exata da edge function de callback (algo como `https://tqzxjuszojskbpackqyr.supabase.co/functions/v1/google-oauth-callback`).
6. Copiar **Client ID** e **Client Secret**.

Depois você cola esses 2 valores em secrets que eu vou pedir: `GOOGLE_OAUTH_CLIENT_ID` e `GOOGLE_OAUTH_CLIENT_SECRET`.

### 2. Banco — nova tabela `google_calendar_tokens`

| Coluna | Tipo |
|---|---|
| `user_id` | uuid PK (`auth.users.id`) |
| `access_token` | text |
| `refresh_token` | text |
| `expires_at` | timestamptz |
| `scope` | text |
| `created_at`, `updated_at` | timestamptz |

RLS: cada usuário só lê/escreve a própria linha (`user_id = auth.uid()`).

### 3. Duas novas edge functions

**a) `google-oauth-start`** (chamada pelo frontend)
- Gera URL de autorização do Google com `client_id`, `redirect_uri`, `scope=calendar.events`, `access_type=offline`, `prompt=consent` (garante refresh_token).
- Inclui `state` = id do usuário assinado para evitar CSRF.
- Retorna `{ url }` para o frontend redirecionar.

**b) `google-oauth-callback`** (chamada pelo Google após login)
- Recebe `code` + `state`.
- Troca `code` por `access_token` + `refresh_token` em `https://oauth2.googleapis.com/token`.
- Salva (upsert) em `google_calendar_tokens` para o `user_id` do `state`.
- Redireciona o usuário de volta para `/funcionarios/<id>` com `?google=ok`.

### 4. Refatorar `sync-calendar-alerts`

- Remover uso de `GOOGLE_CALENDAR_ACCESS_TOKEN`.
- Buscar token do usuário em `google_calendar_tokens`.
- Se `expires_at < now()`, usar o `refresh_token` para pegar novo `access_token` e atualizar a tabela.
- Se não houver registro, retornar `{ needs_connection: true }` (já tratado pelo frontend).
- Continuar criando os eventos (vencimento, prorrogação, férias) com a mesma lógica atual.

### 5. UI — `AnaliseContrato.tsx`

- Adicionar botão "**Conectar Google Agenda**" que aparece quando o backend retorna `needs_connection: true` ou nunca foi conectado.
- Esse botão chama `google-oauth-start` e faz `window.location.href = url`.
- Após retorno (`?google=ok`), mostra toast "Google Agenda conectado" e dispara sincronização automaticamente.
- Pequeno indicador no topo do card: "✅ Google Agenda conectado" / "⚠️ Não conectado".

### 6. Resumo Técnico

| Item | Mudança |
|---|---|
| **Migration** | criar `google_calendar_tokens` + RLS |
| **Edge nova** | `google-oauth-start` (verify_jwt = true) |
| **Edge nova** | `google-oauth-callback` (verify_jwt = false — Google não envia JWT) |
| **Edge editada** | `sync-calendar-alerts` — usa token do usuário + refresh automático |
| **Secrets novos** | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` |
| **Frontend** | botão Conectar + tratamento do retorno em `AnaliseContrato.tsx` |
| **config.toml** | bloco `[functions.google-oauth-callback]` com `verify_jwt = false` |

### Ordem de execução quando você aprovar

1. Criar tabela + edge functions + UI (sem secrets ainda — vou marcar TODO).
2. Te mostrar a **redirect URI exata** da edge `google-oauth-callback`.
3. Você configura no Google Cloud Console e me envia Client ID + Secret pelo prompt de secret.
4. Testamos: você clica "Conectar Google Agenda" → autoriza → sincroniza → eventos aparecem na sua agenda.

### O que NÃO muda

- Lógica de análise do contrato (`analyze-contract`).
- Tabelas `contratos_analise` e `contrato_alertas`.
- Cálculo de datas dos lembretes.

