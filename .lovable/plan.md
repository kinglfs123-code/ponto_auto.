

## Plano: limpar header "Empresas" e permitir multi-upload de contrato com análise consolidada

### Parte 1 — Remover título "+ Nova empresa"

**Arquivo:** `src/pages/Empresas.tsx`

- Remover o `<CardHeader>` inteiro (linhas 106–110) que contém o título azul `+ Nova empresa`.
- O `<Card>` passa a mostrar diretamente o formulário (Nome / CNPJ / Jornada / botão "Adicionar empresa") com um `pt-4` no `CardContent` para compensar o espaçamento.
- Nada mais muda nessa tela.

Resultado: o usuário vê o card de cadastro limpo, sem o título redundante, igual ao padrão minimalista do iOS já adotado no app.

### Parte 2 — Anexar múltiplos contratos e analisá-los juntos sem confusão

O problema atual: a IA recebe **um arquivo por vez** e cada nova análise sobrescreve a anterior. Quando o contrato tem páginas separadas em arquivos diferentes (frente/verso, anexos, aditivos), a IA acaba "esquecendo" o que estava no arquivo anterior.

A solução: permitir selecionar vários arquivos de uma vez e enviá-los **todos juntos na mesma chamada à IA**, que consolida tudo num único registro de análise.

**Arquivo:** `src/pages/FuncionarioDetalhe.tsx`

- No `<input type="file">` da seção Documentos (linha 603–613), adicionar `multiple` apenas para a categoria `contrato`. As outras categorias (EPI, ASO, Outros) continuam com upload único.
- Trocar o handler para iterar sobre `e.target.files` (FileList) quando for contrato.
- Criar nova função `handleUploadContratos(files: File[])`:
  1. Valida tamanho de cada arquivo (10MB cada).
  2. Faz upload sequencial de todos para o Storage e insere em `funcionario_documentos`.
  3. Coleta os `id`s dos documentos recém-criados.
  4. Chama `analyze-contract` **uma única vez** com `documento_ids: [id1, id2, ...]`.
  5. Toast: "Analisando N arquivo(s) do contrato com IA…".
- Manter o handler antigo `handleUploadDoc` para as outras categorias (sem mudança).

**Arquivo:** `src/components/AnaliseContrato.tsx`

- O auto-disparo via `useEffect` continua funcionando, mas precisa enviar **todos os contratos** anexados, não só o primeiro:
  - Usar `contratos.map(c => c.id)` em vez de `ultimoContrato.id` no `handleAnalisar`.
  - O `autoAnalyzedRef` passa a usar uma chave composta dos IDs ordenados (ex.: `"id1,id2,id3"`) para reanalisar quando houver novos arquivos.
- Renomear `handleAnalisar` para enviar `documento_ids` em vez de `documento_id`.

**Arquivo:** `supabase/functions/analyze-contract/index.ts`

- Aceitar tanto `documento_id` (string, retrocompatível) quanto `documento_ids` (array). Normalizar para sempre trabalhar com array internamente.
- Buscar todos os documentos da lista, validar que pertencem ao mesmo funcionário e à mesma empresa do usuário.
- Baixar todos os arquivos e converter cada um em base64.
- Montar **uma única mensagem** ao Gemini com várias entradas `image_url` (uma por arquivo) + instrução clara: *"Os arquivos a seguir são páginas/partes de UM MESMO contrato de trabalho. Consolide todas as informações em uma única extração. Se houver aditivos ou prorrogações, use a data mais recente."*
- A IA retorna 1 objeto consolidado.
- Em `contratos_analise`, deletar análises anteriores **do funcionário** (não só do documento), e inserir 1 novo registro associado ao **primeiro** `documento_id` da lista (referência principal). Salvar a lista completa em `dados_brutos.documento_ids` para rastreabilidade.
- Recriar alertas como hoje (vencimento, prorrogação, férias).
- Resposta: `{ contrato, alertas_count, documentos_analisados: N }`.

### Comportamento final

| Ação | Resultado |
|---|---|
| Clica "Anexar" em Contrato de Trabalho | Pode escolher 1 ou vários arquivos no seletor do sistema |
| Confirma seleção de 3 arquivos | Os 3 são enviados, 3 cards aparecem na lista, toast "Analisando 3 arquivo(s)…" |
| IA processa | Lê os 3 juntos, gera **uma única análise consolidada** (admissão, tipo, vencimento, prorrogação) sem misturar com análises antigas |
| Anexa mais 1 arquivo depois | Reanalisa o conjunto completo (4 arquivos) automaticamente |
| Google Agenda conectado | Alertas sincronizam sozinhos como já acontece |

### Arquivos editados

- `src/pages/Empresas.tsx` — remove `CardHeader` "+ Nova empresa"
- `src/pages/FuncionarioDetalhe.tsx` — `multiple` no input de contrato + novo handler `handleUploadContratos`
- `src/components/AnaliseContrato.tsx` — envia array de IDs e re-analisa quando muda o conjunto
- `supabase/functions/analyze-contract/index.ts` — aceita array de documentos, consolida numa só análise, redeploy

### O que NÃO muda

- Schema do banco (tabela `contratos_analise` continua com `documento_id` único — guardamos os demais em `dados_brutos`)
- Fluxo OAuth Google
- Demais categorias de documento (EPI, ASO, Outros) seguem upload único
- Limite de 10MB por arquivo

