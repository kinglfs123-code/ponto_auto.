

## Plano: Análise automática de contrato + alertas no Google Agenda

Vamos criar uma base que, ao anexar o contrato de trabalho de um colaborador, lê o PDF/imagem com IA (Lovable AI / Gemini), extrai datas-chave e gera lembretes automaticamente — incluindo no Google Agenda.

### 1. Nova tabela `contratos_analise` (banco)

Para cada contrato anexado, salvar o que a IA extraiu:

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `funcionario_id` | uuid | vínculo com colaborador |
| `empresa_id` | uuid | dono do dado (RLS) |
| `documento_id` | uuid | referência ao arquivo em `funcionario_documentos` |
| `data_admissao` | date | início do vínculo |
| `tipo_contrato` | text | "experiência 45+45", "experiência 90", "indeterminado", "prazo determinado" |
| `data_vencimento` | date | quando vence (se houver) |
| `data_prorrogacao` | date | data prevista de prorrogação (se houver) |
| `data_proximas_ferias` | date | calculada: admissão + 12 meses |
| `confianca` | int | 0–100, vinda da IA |
| `dados_brutos` | jsonb | resposta completa da IA para auditoria |
| `created_at` | timestamptz | |

Tabela auxiliar `contrato_alertas` para guardar os lembretes gerados:

| Coluna | Tipo |
|---|---|
| `id`, `funcionario_id`, `empresa_id`, `contrato_id` | identificação |
| `tipo` | "vencimento_contrato", "prorrogacao", "ferias_5_meses" |
| `data_evento` | data do evento real |
| `data_lembrete` | data em que o alerta dispara (evento − 2 dias / férias − 5 meses) |
| `google_event_id` | id retornado pelo Google Agenda (null se não sincronizado) |
| `status` | "pendente", "sincronizado", "erro" |

RLS em ambas: `user_owns_empresa(empresa_id)` (mesmo padrão das outras).

### 2. Nova edge function `analyze-contract`

Recebe `{ documento_id }`, baixa o arquivo do bucket `colaborador-arquivos`, envia para Lovable AI (`google/gemini-2.5-flash` — multimodal, gratuito) com tool calling estruturado:

```
{ data_admissao, tipo_contrato, data_vencimento,
  data_prorrogacao, observacoes, confianca }
```

Depois calcula:
- `data_proximas_ferias = data_admissao + 12 meses`
- Cria 3 entradas em `contrato_alertas`:
  - Vencimento: `data_lembrete = data_vencimento − 2 dias`
  - Prorrogação: `data_lembrete = data_prorrogacao − 2 dias`
  - Férias: `data_lembrete = data_proximas_ferias − 5 meses`

Retorna o registro de `contratos_analise` para a UI.

### 3. Integração com Google Agenda

Como **não há conector Google Calendar disponível** no workspace ainda, vou:

- Criar a edge function `sync-calendar-alerts` que aceita um `alerta_id` e cria o evento no Google Calendar via API REST.
- Na **primeira execução**, vou pedir para você conectar a conta Google (OAuth) por meio do conector padrão do Lovable. Isso aparece como um botão na UI ("Conectar Google Agenda").
- Cada alerta criado fica como `pendente` até a sincronização ser disparada (botão "Sincronizar com Google Agenda" no perfil + automático ao analisar).
- Eventos criados:
  - **2 dias antes do vencimento do contrato** — título: "⚠️ Vence contrato — {Nome}"
  - **2 dias antes da prorrogação** — título: "📝 Prorrogar contrato — {Nome}"
  - **5 meses antes das férias** — título: "🌴 Férias se aproximam — {Nome}"
  - Cada evento com lembrete pop-up 1 dia antes + descrição com link de volta para o perfil.

### 4. Mudanças na UI (`src/pages/FuncionarioDetalhe.tsx`)

**Aba Documentos — categoria "Contrato de Trabalho":**
- Após upload, aparece automaticamente um botão **"Analisar contrato com IA"** (ou roda automaticamente). Mostra spinner.
- Quando termina: card "Análise do contrato" mostra:
  - Admissão · Tipo · Vencimento · Prorrogação · Próximas férias
  - Badge de confiança (verde/amarelo/vermelho seguindo `ocr-utils`)
  - Botões: **"Editar dados"** (caso a IA tenha errado) e **"Reanalisar"**
- Card "Alertas programados" lista os 3 alertas com status (pendente/sincronizado) e botão **"Sincronizar no Google Agenda"**.

**Aba Férias:**
- Quando há `data_proximas_ferias` calculada, mostra card no topo: "Próximas férias previstas: DD/MM/AAAA · alerta em DD/MM/AAAA".

### 5. Fluxo do usuário

```text
1. Anexa contrato (PDF/imagem) na aba Documentos
2. IA lê → preenche admissão, vencimento, prorrogação
3. Sistema calcula próximas férias e cria 3 alertas
4. Usuário clica "Conectar Google Agenda" (1ª vez)
5. Sistema cria os 3 eventos no Google Agenda
6. Usuário pode editar/reanalisar a qualquer momento
```

### Resumo Técnico

| Item | Mudança |
|---|---|
| **Migration** | criar `contratos_analise` + `contrato_alertas` + RLS |
| **Edge function nova** | `analyze-contract` (Lovable AI, Gemini multimodal) |
| **Edge function nova** | `sync-calendar-alerts` (Google Calendar API) |
| **Conector** | solicitar conexão Google Calendar via `standard_connectors` na 1ª sincronização |
| **Frontend** | seção "Análise do contrato" + "Alertas" na aba Documentos de `FuncionarioDetalhe.tsx`; aviso na aba Férias |
| **Tipos** | adicionar `ContratoAnalise` e `ContratoAlerta` em `src/types/index.ts` |

### O que NÃO muda

- Estrutura de upload de documentos já existente.
- Tabela `funcionario_ferias` (continua para férias **executadas**; a previsão fica em `contratos_analise.data_proximas_ferias`).
- Lógica de OCR de folha de ponto.

### Pontos de atenção (assuma que vou seguir o padrão a menos que diga o contrário)

- IA: usaremos **Lovable AI Gateway** (sem chave extra) com Gemini 2.5 Flash — gratuito até set/2025 e suporta PDF/imagem direto.
- Google Agenda: na primeira sincronização vou abrir o fluxo de conexão; se preferir adiar a integração com Google e só guardar os alertas no banco por enquanto, é só me avisar.
- Editar manualmente: sempre que você corrigir um campo extraído, o alerta correspondente é recalculado.

