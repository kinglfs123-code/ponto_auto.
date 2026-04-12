

## Plano: Intervalo no Cadastro de Funcionário e Melhoria nas Observações

### Problema atual
- O cadastro de funcionário não tem campo de intervalo (almoço). O cálculo de horas trabalhadas soma os turnos separadamente (manhã e tarde), mas quando o funcionário registra apenas entrada e saída (sem separar turnos), o intervalo não é descontado.
- As observações do OCR já detectam "FALTA", "FOLGA", "ATESTADO", mas podem ser expandidas para cobrir mais casos.

### Alterações

#### 1. Migração: adicionar coluna `intervalo` à tabela `funcionarios`
- Nova coluna `intervalo text NOT NULL DEFAULT '01:00'` (1 hora padrão)
- Todos os funcionários existentes receberão `01:00`

#### 2. `src/types/index.ts` — adicionar `intervalo` ao tipo `Funcionario`
- Adicionar `intervalo: string` ao interface

#### 3. `src/pages/Funcionarios.tsx` — campo de intervalo no formulário
- Adicionar input com máscara HH:MM para o intervalo entre Entrada e Saída
- Default `01:00`, label "Intervalo"
- Exibir na tabela/cards junto com o horário

#### 4. `src/components/FuncionarioSelector.tsx` — incluir `intervalo` no select
- Adicionar `intervalo` ao `FuncionarioOption` para que o Ponto.tsx tenha acesso

#### 5. `src/lib/ponto-rules.ts` — descontar intervalo no cálculo
- `applyToleranceAndDetect` recebe novo parâmetro `intervaloStr` (default `"01:00"`)
- Quando o funcionário registra apenas entrada manhã + saída final (sem turnos separados), descontar o intervalo do total trabalhado
- Quando há turnos separados (manhã + tarde), o intervalo já está implícito entre os turnos — não descontar duas vezes

#### 6. `src/pages/Ponto.tsx` — passar intervalo para o cálculo
- Usar `funcionarioSel?.intervalo || "01:00"` ao chamar `applyToleranceAndDetect`

#### 7. Expandir detecção de observações em `ponto-rules.ts`
- Adicionar detecção de: "FERIADO", "LICENÇA", "SUSPENSÃO", "COMPENSAÇÃO", "ABONO"
- "FERIADO" → tipo_excecao = "folga"
- "LICENÇA" / "SUSPENSÃO" → tipo_excecao = "atestado"
- "COMPENSAÇÃO" / "ABONO" → tipo_excecao = "folga" (sem descontar)

### Arquivos alterados
- **Migração SQL** — adicionar coluna `intervalo`
- **`src/types/index.ts`** — tipo atualizado
- **`src/pages/Funcionarios.tsx`** — campo de intervalo no form e listagem
- **`src/components/FuncionarioSelector.tsx`** — incluir `intervalo`
- **`src/lib/ponto-rules.ts`** — descontar intervalo + expandir observações
- **`src/pages/Ponto.tsx`** — passar intervalo ao cálculo

