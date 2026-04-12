

## Varredura: Bugs, Código Duplicado e Redundâncias

Encontrei **10 problemas** no código. Aqui está o relatório completo:

---

### BUGS

**Bug 1: `parseTimeToHours` importado mas nunca usado em Ponto.tsx**
- Linha 15 de `src/pages/Ponto.tsx`: `parseTimeToHours` é importado de `ponto-rules` mas não é usado em nenhum lugar do arquivo. Importação morta que adiciona peso ao bundle.

**Bug 2: `currentMonth` chamado como valor, não como função**
- Linha 111 de `src/pages/Ponto.tsx`: `useState(currentMonth)` — `currentMonth` é uma função que retorna string, mas está sendo passada como referência (sem `()`). Funciona por acaso porque `useState` aceita uma função inicializadora, mas é confuso e um bug semântico potencial se a assinatura mudar.

**Bug 3: Condição redundante `!isFolga` na detecção de falta**
- Linha 252 de `src/lib/ponto-rules.ts`: `else if (!isFolga && me === null && ms === null...)` — a checagem `!isFolga` é redundante porque o `else if` já significa que `isFolga` era `false` (o bloco de folga vem antes).

**Bug 4: `saldo` no resumo é idêntico a `total_extras`**
- Linha 309 de `src/lib/ponto-rules.ts`: `saldo: Math.round(extras * 100) / 100` — é exatamente o mesmo valor que `total_extras`. O saldo deveria ser `extras - (atraso em horas)` para refletir o saldo real do banco de horas.

**Bug 5: Confiança convertida duas vezes desnecessariamente**
- Linhas 186-189 e 214-217 de `src/pages/Ponto.tsx`: `getConfidenceLevel()` é chamado duas vezes para cada registro — uma vez ao construir o `confMap` e outra vez ao filtrar `lowConf`. Processamento duplicado.

---

### CÓDIGO DUPLICADO

**Duplicação 6: `autoCorrectTime` + `autoCorrectRegistros` existem em DOIS lugares**
- `src/lib/ocr-utils.ts` (linhas 17-31 e 126-140)
- `supabase/functions/read-timesheet/index.ts` (linhas 82-103)
- São a mesma lógica duplicada. A versão do edge function é necessária (Deno runtime), mas a versão client-side em `ocr-utils.ts` nunca é chamada de nenhum lugar — é código morto.

**Duplicação 7: `fetchCorrections` em Ponto.tsx duplica lógica do `learning-system.ts`**
- `Ponto.tsx` linhas 134-142: busca correções do `correcoes_ia`
- `learning-system.ts` linha 99-103: `extrairPadroes` faz a mesma query
- São duas implementações separadas para buscar dados do mesmo lugar.

---

### CÓDIGO MORTO / REDUNDANTE

**Redundância 8: `learning-system.ts` inteiro não é importado por ninguém**
- `calcularMetricas`, `extrairPadroes` e `buildLearningContext` não são importados em nenhum arquivo da aplicação. O módulo inteiro é código morto — adiciona peso ao projeto sem ser usado.

**Redundância 9: `autoCorrectRegistros` e `autoCorrectTime` em `ocr-utils.ts` não são importados**
- Nenhum componente importa `autoCorrectTime`, `autoCorrectRegistros`, `isValidTime` ou `HORARIO_REGEX` de `ocr-utils.ts`. Apenas `preprocessImage` e `getConfidenceLevel` são usados.

**Redundância 10: Comentário fantasma na linha 89 de Ponto.tsx**
- `// preprocessImage imported from @/lib/ocr-utils` — comentário solto sem propósito, provavelmente resto de uma refatoração anterior.

---

### Plano de Correção

#### 1. `src/pages/Ponto.tsx`
- Remover import de `parseTimeToHours` (não usado)
- Remover comentário fantasma linha 89
- Unificar chamadas de `getConfidenceLevel` (calcular uma vez, reutilizar)
- Remover `fetchCorrections` inline e usar `extrairPadroes` do learning-system (ou manter inline e eliminar o learning-system)

#### 2. `src/lib/ponto-rules.ts`
- Remover condição redundante `!isFolga` na linha 252
- Corrigir cálculo de `saldo` para `extras - (atraso / 60)` no `calcularResumo`

#### 3. `src/lib/ocr-utils.ts`
- Remover funções mortas: `autoCorrectTime`, `autoCorrectRegistros`, `isValidTime`, `HORARIO_REGEX`
- Manter apenas `preprocessImage`, `getConfidenceLevel`, `CONFIDENCE_CONFIG`, `PREPROCESS_CONFIG`

#### 4. `src/lib/learning-system.ts`
- Integrar `buildLearningContext` no fluxo de OCR em Ponto.tsx (usar ao invés de `fetchCorrections` inline)
- OU remover o arquivo se decidirmos manter a lógica inline

#### Arquivos alterados
- `src/pages/Ponto.tsx` — limpar imports, remover duplicações
- `src/lib/ponto-rules.ts` — corrigir saldo e condição redundante
- `src/lib/ocr-utils.ts` — remover código morto
- `src/lib/learning-system.ts` — integrar ou remover

Sem mudanças no banco de dados.

