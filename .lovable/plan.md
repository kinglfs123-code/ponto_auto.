## Objetivo

Fechar as lacunas do cálculo de folha de ponto contra a spec atualizada (11 cenários, A–K) e corrigir os bugs apontados nos agregados/relatório. O cálculo per-batida principal (`src/lib/ponto-rules.ts`) já passa em A–J — falta jornada alternativa (K), corrigir o agregado de atraso, expor AN CLT e Faltas no relatório.

## Mudanças

### 1. Schema — jornada alternativa por dia (cenário K)

Migration adicionando à tabela `registros_ponto`:

- `jornada_alt_entrada TEXT NULL`
- `jornada_alt_saida TEXT NULL`

Ambos opcionais. Quando preenchidos, sobrescrevem `horarioEntrada/Saida` do funcionário **só naquele dia**. `types.ts` é regenerado automaticamente.

### 2. `src/lib/ponto-rules.ts`

- `RegistroPonto` ganha `jornada_alt_entrada?: string | null` e `jornada_alt_saida?: string | null`.
- Em `applyToleranceAndDetect`, antes de derivar `entradaRef`/`saidaRef`/`carga`, checar se o registro traz jornada alternativa. Se sim, usar ela no lugar dos defaults do funcionário (mantendo almoço de 1h).
- Bug do agregado de atraso: hoje `calcularResumo` só soma `atraso_minutos` quando o dia tem total > 0; mas o atraso já é somado fora desse `if`. Vou re-validar e blindar — se `tipo_excecao === "falta"` o atraso é a jornada inteira (já é) e não deve ser somado de novo se também houver faltas separadas. Confirmar leitura: o problema reportado ("atrasos vinham zerados") é mais provável do agregado mensal no relatório (item 4) e da seleção SQL no `Resumo` da `FolhaDetalhe.tsx` que **não busca `atraso_minutos` para o card**. Acrescentar `atraso_minutos` nos cards de FolhaDetalhe.
- Adicionar helper `calcResumoCompleto(registros)` que devolve também `total_an_clt` (via `calcAdicionalNoturnoCLT`) e `total_faltas` (contagem de `tipo_excecao === "falta"`).

### 3. UI — Cadastro de funcionário

- Em `FuncionarioDetalhe.tsx`, mostrar **Carga calculada ao vivo** (`saida − entrada − 1h`) ao lado dos inputs de horário. Sem mudar inputs.

### 4. UI — Lançamento (`Ponto.tsx`)

- Na tabela de registros, adicionar coluna "Jornada do dia" como botão popover por linha. Permite definir/limpar `jornada_alt_entrada`/`jornada_alt_saida`. Quando setado, badge discreta mostra "Alt: 15:00–23:20".
- Recalcular a linha ao salvar a alteração.

### 5. UI — Detalhe da folha (`FolhaDetalhe.tsx`)

- Adicionar 3 cards: **Atrasos** (`formatMinutes(total_atraso)`), **AN CLT** (`formatHours(total_an_clt)`), **Faltas** (contagem). Total de Atrasos é o bug visível principal.
- Coluna "HE" por dia (já preparado em discussão anterior do usuário) com `formatHours(r.horas_extras)`.

### 6. Edge function `generate-report`

- Somar `atraso_minutos`, `tipo_excecao === "falta"` (count) e calcular `AN_CLT = AN_real * (60/52.5)`.
- Estender o JSON do relatório com `total_atraso`, `total_an_real`, `total_an_clt`, `total_faltas`.

### 7. Validação (script `bun run /tmp/validate-ponto.ts`)

Roda os 11 cenários (A–K) contra `applyToleranceAndDetect` com cadastro 07:00–16:20 e imprime PASS/FAIL com diff de minutos para `trab/HE/atraso/AN`. Cenário K usa `jornada_alt_*`. Encerro só após todos PASS.

Validação de aceitação dos totais reais (Ludimila 30 dias 08:00–16:20: 195h34/24h20/4h46/0h19/0h22/0 faltas) será feita manualmente após import — fora do escopo automatizado por requerer dados reais.

## Detalhes técnicos

- Coluna `jornada_alt_*` em `registros_ponto` é nullable; rows existentes não são afetadas.
- `applyToleranceAndDetect`: a única mudança de lógica é sobrescrever refs quando `jornada_alt_*` presente; cálculo per-batida atual já cobre todos os outros cenários.
- `calcAdicionalNoturnoCLT` já existe — reutilizar.
- Sem alterações em OCR, autenticação, RLS ou outros módulos.

## O que NÃO muda

- OCR, importação por foto, rotas, navegação.
- Cadastro do funcionário continua usando `horario_entrada`/`horario_saida`/`intervalo` existentes.
- `formatHours` permanece com sufixo `h`/`min` para não quebrar telas atuais; HH:MM puro fica em `formatHHMM` quando precisar.
