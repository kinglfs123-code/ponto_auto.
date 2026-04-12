

## Varredura Completa: 15 Bugs e Problemas no Motor de Cálculo

### BUGS CRÍTICOS DE CÁLCULO

**Bug 1: Turnos noturnos válidos rejeitados como inválidos**
- `calcNightMinutes` linha 144: `if (entrada >= saida && saida > 300) return 0`
- `shiftDuration` linha 201: `if (exit < entry && exit > 300) return 0`
- Um turno 22:00→06:00 (entrada=1320, saida=360) é rejeitado porque `360 > 300`. Qualquer turno overnight terminando após 05:00 retorna 0 horas. Afeta noturnas E duração total.
- **Fix**: A condição deve ser removida — o check de overnight (`exit <= entry`) já trata corretamente esses casos.

**Bug 2: `saidaPadraoMin` calculado mas NUNCA usado**
- Linha 185: `const saidaPadraoMin = ...` — variável morta.
- O horário de saída do funcionário deveria ser usado para detectar saída antecipada, mas é completamente ignorado. A detecção de saída antecipada usa apenas `totalWorkedHours < jornadaHours` sem comparar com o horário real de saída.

**Bug 3: `horario_saida` do funcionário nunca passado ao cálculo**
- Ponto.tsx linhas 203 e 233: o 4o parâmetro `horarioSaidaPadrao` é sempre `undefined`, caindo no default `"17:20"`.
- Deveria passar `funcionarioSel?.horario_saida`.

**Bug 4: Noturnas calculadas para dias de falta/atestado**
- Linhas 218-221: `nightHours` é calculado ANTES do check `isAbsence` (linha 260).
- `isAbsence` zera `totalWorkedHours` mas `nightHours` permanece, gerando `horas_noturnas > 0` em dias sem trabalho.

**Bug 5: `atraso_minutos` NÃO salvo no banco de dados**
- Linhas 316-331 de Ponto.tsx: o objeto de insert para `registros_ponto` não inclui `atraso_minutos`. Os dados de atraso são perdidos ao salvar.

**Bug 6: `formatHours` pode exibir "Xh60min"**
- Linha 32: `Math.round((a % 1) * 60)` — para valores como 2.9999 (arredondamento floating point), produz 60. Resultado: "2h60min" ao invés de "3h00min".

---

### BUGS DE LÓGICA

**Bug 7: Atraso e saída antecipada mutuamente exclusivos**
- Linha 254: se `atrasoMinutos > 0`, seta `tipo_excecao = "atraso"`.
- Linha 267: `if (!tipo_excecao && ...)` — se já é "atraso", nunca detecta saída antecipada.
- Funcionário que chega atrasado E sai mais cedo perde a informação de saída antecipada.

**Bug 8: Tolerância aplicada ao atraso mas NÃO à saída antecipada**
- Linha 227: atraso só conta se `diff > 5min` (tolerância).
- Linha 267: saída antecipada usa `jornadaHours - TOLERANCE_MINUTES / 60` — mas `5/60 = 0.083h` (5min). Porém compara com `totalWorkedHours` que já tem o intervalo descontado, criando detecção inconsistente.

**Bug 9: Intervalo descontado mesmo quando `totalWorked` vem de turnos extras**
- Linha 213: `if (me !== null && ms !== null && !hasSplitShift && totalWorked > intervaloMinutos)` — se há turno extra (`ee/es`), `totalWorked` inclui o extra, e o intervalo é descontado do total. O intervalo só deveria ser descontado do turno principal.

**Bug 10: `parseTimeToMinutes` regex sem flag global**
- Linha 5: `.replace(/[hH.]/, ":")` — sem `g`, só substitui a primeira ocorrência. "12.30.00" não parseia corretamente.

---

### CÓDIGO REDUNDANTE / MORTO

**Bug 11: Variável `saidaPadraoMin` declarada sem uso**
- Já mencionado no Bug 2 — código morto que confunde.

**Bug 12: `fetchCorrections` ainda existe em Ponto.tsx**
- Linhas 130-138: deveria ter sido removido na limpeza anterior, mas permanece.
- A query é usada (linha 158) então não é código totalmente morto, mas a lógica de learning-system foi deletada sem integrar.

**Bug 13: Confidence map usa `r.dia as number` mas `dia` pode ser string**
- Linha 502: `confidenceMap[r.dia as number]` — se o OCR retorna `dia` como string, o lookup falha silenciosamente.

**Bug 14: `formatMinutes` retorna "—" para 0**
- Linha 36: `if (mins === 0) return "—"` — esconde o valor real quando atraso é 0. No resumo, "Atraso: —" é confuso vs "Atraso: 0".

**Bug 15: Tipo do `dia` inconsistente na interface**
- `RegistroPonto.dia` é `number | string` (linha 107), mas o código assume `number` em vários lugares (comparações, DB insert com `parseInt`).

---

### Plano de Correção

#### 1. `src/lib/ponto-rules.ts` — Corrigir motor de cálculo
- Remover condição `saida > 300` de `calcNightMinutes` e `shiftDuration` (Bugs 1)
- Usar `saidaPadraoMin` para detecção de saída antecipada (Bug 2)
- Zerar `nightHours` quando `isAbsence` (Bug 4)
- Corrigir `formatHours` para tratar minutos=60 (Bug 6)
- Permitir atraso + saída antecipada simultâneos (Bug 7)
- Descontar intervalo apenas do turno principal, não do extra (Bug 9)
- Adicionar flag `g` ao regex de parse (Bug 10)
- Remover variável morta `saidaPadraoMin` redundante (Bug 11)
- Normalizar `dia` para `number` no início da função (Bug 15)

#### 2. `src/pages/Ponto.tsx` — Passar dados corretos ao cálculo
- Passar `funcionarioSel?.horario_saida` como 4o parâmetro (Bug 3)
- Adicionar `atraso_minutos` ao insert de `registros_ponto` (Bug 5)
- Normalizar `dia` no confidence map lookup (Bug 13)

#### 3. Ajustes menores
- `formatMinutes`: retornar "0" em vez de "—" para zero (Bug 14)

### Arquivos alterados
- `src/lib/ponto-rules.ts` — 12 correções
- `src/pages/Ponto.tsx` — 3 correções

Sem mudanças no banco de dados (assumindo que `atraso_minutos` já existe na tabela `registros_ponto`; caso contrário, migração necessária).

