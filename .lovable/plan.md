

## Plano: melhorar e-mail do holerite + ajustes Documentos/Férias

### 1. Template profissional anti-SPAM no `send-via-gmail` (modo holerite)

**Assunto novo:** `Holerite [MM/AAAA] - [Nome da Empresa]` (ex.: `Holerite 04/2026 - Espaço Família`).

**Anexo renomeado:**
formato `Holerite_[NomeColaborador]_[Mes]_[Ano].pdf`, com helper que remove acentos, troca espaços por `_` e descarta caracteres especiais.
Ex.: `Holerite_JoaoVitor_Abril_2026.pdf`.

**Corpo HTML profissional** (CSS 100% inline, fonte Arial/Helvetica, cores neutras `#0066cc`/`#333`/`#666`, largura máx 600px, responsivo):

- Cabeçalho com nome da empresa em destaque + linha divisória.
- Saudação personalizada `Olá [Nome do Colaborador],` (puxado de `funcionarios.nome_completo`).
- Mensagem: "Segue em anexo seu holerite referente ao mês de [Mês/Ano]." + orientação para falar com RH.
- Bloco de assinatura com: nome da empresa, "Recursos Humanos", e-mail do remetente (conta Gmail conectada) e CNPJ formatado da empresa (campos disponíveis hoje em `empresas`).
- Rodapé: "Este é um e-mail automático. Por favor, não responda."

> Observação: a tabela `empresas` hoje só tem `nome`, `cnpj` e `jornada_padrao`. Telefone/endereço/e-mail de contato não existem como coluna. Para não inventar dados (o que aumentaria SPAM), a assinatura usará apenas o que já existe (nome, CNPJ, e-mail do remetente). Quando o usuário quiser exibir telefone/endereço, basta pedir e adicionamos esses campos depois.

**Versão alternativa em texto puro** (`multipart/alternative` + `multipart/mixed`):
mesmo conteúdo sem HTML — exigência clássica de anti-SPAM (Gmail/Outlook/Apple Mail dão score melhor quando há `text/plain` + `text/html`).

**Headers anti-SPAM adicionados ao MIME:**
- `Content-Type: multipart/mixed; boundary=...` (externo) com `multipart/alternative` interno
- `MIME-Version: 1.0`
- `X-Mailer: Ponto_auto. - [Nome da Empresa]`
- `Reply-To: [e-mail do remetente]` (a própria conta Gmail conectada — assim respostas chegam ao RH que enviou)
- `Importance: Normal`
- `X-Priority: 3`
- `Date:` no formato RFC 2822
- `Message-ID:` único (`<uuid@gmail.com>`)

### 2. Limpeza ao apagar contrato (aba Documentos)

Em `FuncionarioDetalhe.tsx → handleDeleteDoc`: quando o documento excluído for da categoria `contrato`, antes/depois do delete também:
1. Apagar registros de `contrato_alertas` desse `funcionario_id`.
2. Apagar registros de `contratos_analise` desse `funcionario_id`.
3. Resetar o ref `autoAnalyzedRef` em `AnaliseContrato` para que, se restarem outros contratos, a análise seja refeita; se não restar nenhum, o card de admissão/tipo/vencimento simplesmente some.

Resultado: ao excluir o contrato, "Admissão", "Tipo", "Vencimento", "Prorrogação", "Próximas férias" e os alertas no Google Agenda ficam limpos automaticamente.

### 3. Marcação de férias só nas datas-limite (início e fim)

Em `sync-ferias-calendar/index.ts`:
em vez de criar **um único evento all-day** cobrindo todos os dias entre `data_inicio` e `data_fim`, passar a criar/atualizar **dois eventos all-day distintos**:

- `Início das férias — [Nome]` no dia `data_inicio`
- `Fim das férias — [Nome]` no dia `data_fim`

Mudanças técnicas:
- Tabela `funcionario_ferias` ganha colunas `google_event_id_inicio` e `google_event_id_fim` (nova migração). A coluna antiga `google_event_id` é mantida; se já houver evento, ele é deletado na primeira sync para evitar duplicidade.
- A função sincroniza os dois eventos (cria/atualiza/deleta conforme mudança das datas) e grava os dois IDs.
- Ao excluir as férias (`handleDeleteFerias`), os dois eventos também são removidos do Calendar.

### 4. Remover envio de documentos por e-mail

**Frontend (`FuncionarioDetalhe.tsx`):**
- Remover botão "Enviar documentos por e-mail" da aba Documentos.
- Remover `handleSendDocumentosEmail`, `sendingDocsEmail` e o import `Mail` se não for mais usado.
- O envio por e-mail continua existindo apenas na aba Holerites (botão "Enviar" por holerite).

**Backend (`send-via-gmail/index.ts`):**
- Manter por enquanto o suporte ao `kind: "documentos"` no edge function (não causa dano e evita quebrar caches/links), mas marcado como deprecado nos logs. A UI nunca mais o aciona.
  - Alternativa: removê-lo por completo. Como o usuário pediu apenas remoção da opção na UI, manteremos a função mais enxuta e não chamável pela interface.

### Detalhes técnicos resumidos

| Arquivo | Mudança |
|--------|--------|
| `supabase/functions/send-via-gmail/index.ts` | Novo MIME `multipart/alternative` + headers anti-SPAM; novo HTML do holerite; nome de anexo dinâmico; assunto novo; busca `empresas.cnpj` |
| `supabase/functions/sync-ferias-calendar/index.ts` | Cria 2 eventos (início/fim), gerencia ambos os IDs, deleta evento antigo único |
| `supabase/migrations/...sql` | `ALTER TABLE funcionario_ferias ADD COLUMN google_event_id_inicio text, ADD COLUMN google_event_id_fim text` |
| `src/types/index.ts` | Acrescentar campos `google_event_id_inicio`, `google_event_id_fim` em `FuncionarioFerias` |
| `src/pages/FuncionarioDetalhe.tsx` | `handleDeleteDoc`: limpar `contrato_alertas` + `contratos_analise` quando categoria=`contrato`; remover botão e handler "Enviar documentos por e-mail"; deletar 2 eventos do Calendar em `handleDeleteFerias` |
| `src/components/AnaliseContrato.tsx` | Reset do `autoAnalyzedRef` quando lista de contratos fica vazia, para sumir o card |
| Deploy | Redeploy de `send-via-gmail` e `sync-ferias-calendar` |

### Resultado esperado

- E-mails de holerite com cara profissional, bem mais difíceis de cair em SPAM (HTML+texto, headers completos, anexo nomeado, assunto descritivo).
- Excluir contrato limpa de fato a análise e os alertas (inclusive no Google Agenda na próxima sync).
- Google Agenda passa a ter só 2 marcações por férias (início e fim), sem ocupar o mês inteiro.
- Aba Documentos sem botão de envio por e-mail; envio por e-mail só existe na aba Holerites.
