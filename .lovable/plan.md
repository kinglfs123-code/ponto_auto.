

## Plano: 3 ajustes (botões piscando, remover "Digitar manualmente", anexo + agenda em férias)

### Parte 1 — Parar de piscar os botões do Painel

**Arquivo:** `src/pages/Dashboard.tsx`

- O efeito de "pulso piscante" no card de "Próximo passo" vem do `animate-pulse` na linha 73.
- **Remover** apenas o `animate-pulse`, mantendo o `ring-1 ring-primary/20 border-primary/50 bg-primary/5` para destacar visualmente o próximo passo de forma estática (sem piscar).
- Resultado: o botão do próximo passo continua destacado em azul, mas não pisca mais.

### Parte 2 — Remover "Digitar nome manualmente" do seletor

**Arquivo:** `src/components/FuncionarioSelector.tsx`

- Remover a opção `<SelectItem value="__manual__">✏️ Digitar nome manualmente</SelectItem>` (linha 88) e o `if (v === "__manual__")` no `onValueChange` (linhas 69–73).
- Remover o estado `manual` e o ramo de fallback que renderiza o `<Input>` manual (linhas 27 e 46–62).
- Manter o fallback de input manual **somente** quando `funcionarios.length === 0` (caso a empresa não tenha colaboradores cadastrados — necessário para a UI de Ponto não quebrar).
- Remover o ícone `UserPlus` que fica sem uso.

### Parte 3 — Anexar documento e gerar evento no Google Agenda nas Férias

#### 3.1 — Banco de dados (migração)

Adicionar à tabela `funcionario_ferias` três colunas opcionais:

- `documento_storage_path TEXT` — caminho do arquivo no bucket `colaborador-arquivos`
- `documento_nome TEXT` — nome original do arquivo
- `google_event_id TEXT` — ID do evento criado no Google Agenda (para permitir update/delete)

Sem mudança de RLS (continua via `user_owns_empresa`).

#### 3.2 — Nova edge function `sync-ferias-calendar`

**Arquivo:** `supabase/functions/sync-ferias-calendar/index.ts` (novo)

Reaproveita o mesmo padrão do `sync-calendar-alerts`:

- Recebe `{ ferias_id: string }`.
- Valida JWT do usuário, busca token em `google_calendar_tokens` (com refresh se necessário).
- Se token ausente → `{ needs_connection: true }`.
- Carrega `funcionario_ferias` + nome do funcionário (validando que pertence a uma empresa do `auth.uid()`).
- Monta evento "Férias — {nome}" como **all-day event** com `start.date = data_inicio` e `end.date = data_fim + 1 dia` (Google exige end exclusivo em all-day).
- Description: status, dias e observação se houver.
- Se `google_event_id` já existir → `PATCH`; senão → `POST` em `https://www.googleapis.com/calendar/v3/calendars/primary/events`.
- Salva o `google_event_id` retornado em `funcionario_ferias.google_event_id` via service role.
- Resposta: `{ ok: true, event_id }` ou `{ needs_connection: true }`.

`supabase/config.toml`: adicionar bloco `[functions.sync-ferias-calendar]` com `verify_jwt = false`.

#### 3.3 — UI do formulário de Férias

**Arquivo:** `src/pages/FuncionarioDetalhe.tsx`

Dentro do `<Card>` do formulário de férias (linhas 776–812):

- Adicionar campo **"Anexar documento (opcional)"** com input `type="file"` aceitando PDF/DOCX/JPEG/PNG (≤ 10MB), abaixo do campo Observação.
- Se já houver documento anexado em modo edição, mostrar nome do arquivo + botão "Trocar / Remover".

No `handleSaveFerias`:

1. Se há arquivo selecionado, fazer upload para `colaborador-arquivos/{empresa_id}/{funcionario_id}/ferias/{ferias_id}-{filename}` antes de salvar (após gerar `ferias_id` no insert, ou usando `crypto.randomUUID()` previamente).
2. Salvar `documento_storage_path` e `documento_nome` no payload.
3. Após salvar com sucesso, **se o usuário tem Google Agenda conectado**, chamar `supabase.functions.invoke("sync-ferias-calendar", { body: { ferias_id } })` automaticamente.
4. Tratar respostas: `needs_connection` → toast com botão "Conectar Google" (reaproveita `google-oauth-start`).

Na lista de períodos (linhas 816–840):

- Se `documento_storage_path` existir, mostrar pequeno botão "📎 Baixar documento" que gera signed URL e abre.
- Se `google_event_id` existir, mostrar badge sutil "📅 Na Agenda".
- Se NÃO estiver na agenda e Google estiver conectado, mostrar botão "Sincronizar com Agenda" que chama a edge function manualmente.

No `handleDeleteFerias`:

- Antes de deletar do banco, se houver `documento_storage_path`, remover do storage.
- Se houver `google_event_id`, fazer `DELETE` no evento via uma rota da mesma edge function (ou ignorar — evento órfão não causa problema crítico). **Decisão:** ignorar para manter o escopo enxuto; usuário pode apagar manualmente do Google Agenda.

#### 3.4 — Verificar conexão Google na aba Férias

- Reaproveitar a mesma lógica de `checkGoogle()` que existe em `AnaliseContrato.tsx` para detectar se o usuário tem token salvo em `google_calendar_tokens` (e se contém escopo `calendar.events`).
- Extrair essa checagem para um hook simples (`useGoogleConnection`) **OU** simplesmente duplicar a query no `FuncionarioDetalhe` (mais rápido e sem refator). **Decisão:** duplicar inline — uma query simples.

### Comportamento final

| Ação | Resultado |
|---|---|
| Abrir Painel | Botões não piscam mais; próximo passo continua destacado em azul fixo |
| Selecionar funcionário no Ponto | Apenas a lista de cadastrados aparece, sem opção de digitar manualmente (input manual só aparece se a empresa não tiver colaborador algum) |
| Criar período de férias com PDF anexado | Arquivo é salvo no Storage; se Google conectado, evento "Férias — Nome" é criado automaticamente em todos os dias do período |
| Editar período de férias | Pode trocar/remover o documento; ao salvar, evento da Agenda é atualizado |
| Sem Google conectado | Toast oferece "Conectar Google (Agenda + Gmail)" — reaproveita o OAuth existente |

### Arquivos editados / criados

| Arquivo | Mudança |
|---|---|
| `src/pages/Dashboard.tsx` | Remove `animate-pulse` do botão de próximo passo |
| `src/components/FuncionarioSelector.tsx` | Remove opção "Digitar nome manualmente" e estado `manual` |
| `src/pages/FuncionarioDetalhe.tsx` | Form de férias com anexo + sync Agenda; lista mostra anexo e badge da Agenda |
| `src/types/index.ts` | Adiciona campos opcionais em `FuncionarioFerias` |
| `supabase/functions/sync-ferias-calendar/index.ts` | **NOVO** — cria/atualiza evento de férias no Google Calendar |
| `supabase/config.toml` | Bloco `[functions.sync-ferias-calendar]` com `verify_jwt = false` |
| Migração SQL | Adiciona `documento_storage_path`, `documento_nome`, `google_event_id` em `funcionario_ferias` |

### O que NÃO muda

- Schema de empresas, funcionários, holerites
- Fluxo OAuth Google (mesmos escopos `calendar.events` + `gmail.send`)
- Bucket de storage (usa `colaborador-arquivos` existente, com nova subpasta `ferias/`)
- RLS das tabelas existentes

