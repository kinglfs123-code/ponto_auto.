## Objetivo

Refatorar `src/lib/ponto-rules.ts` para que `applyToleranceAndDetect` siga **exatamente** as regras do JSON enviado e passe nos 10 cenários (A–J), **sem mexer na UI, OCR, importação ou banco**.

## Premissas (confirmadas)

- Escopo: apenas regras de cálculo (lógica em `ponto-rules.ts`).
- Cadastro: usar os campos já existentes em `funcionarios` (`horario_entrada`, `horario_saida`, `intervalo` que já é "01:00" por padrão). A Carga Diária passa a ser derivada como `(horario_saida − horario_entrada) − intervalo`.
- Tolerância: **zero** (atualmente o código usa 5min — será removida).
- Almoço: 1h fixa global (já é o default `intervalo = 01:00`); a regra per-batida considera 60min.

## Mudanças em `src/lib/ponto-rules.ts`

1. **Remover `TOLERANCE_MINUTES`** e qualquer arredondamento aplicado a atraso/HE.
2. **Nova assinatura efetiva** de `applyToleranceAndDetect(registro, jornadaPadraoStr, horarioEntradaPadrao, horarioSaidaPadrao, intervaloStr)` — os 3 últimos parâmetros já existem mas hoje são ignorados; passarão a ser usados.
3. **Cálculo per-batida** (substitui o cálculo atual baseado em duração total vs jornada):
   - `entradaRef = parseTime(horarioEntradaPadrao)`
   - `saidaRef   = parseTime(horarioSaidaPadrao)`
   - `almocoRef  = parseTime(intervaloStr)` (default 60min)
   - **HE** = `max(0, entradaRef − entradaReal)` + `max(0, almocoRef − (retorno − saidaAlmoco))` + `max(0, saidaRealTarde − saidaRef)` + duração do período extra (ee/es), se houver.
   - **Atraso** = `max(0, entradaReal − entradaRef)` + `max(0, (retorno − saidaAlmoco) − almocoRef)` + `max(0, saidaRef − saidaRealTarde)`.
   - HE e atraso podem coexistir no mesmo dia (cenário J).
4. **Trabalhado (`horas_normais` + `horas_extras`)**:
   - `THM = saidaAlmoco − entrada`, `THT = saidaTarde − retorno`, somando período extra quando existir.
   - `horas_normais = min(trabalhado, carga)` onde `carga = (saidaRef − entradaRef) − almocoRef`.
   - `horas_extras = HE` calculado per-batida (não `trabalhado − carga`).
5. **Adicional noturno**: manter `calcNightMinutes` atual (já cobre 22:00–05:00 e travessia da meia-noite). Adicionar helper `calcAdicionalNoturnoCLT(min) = min * (60 / 52.5)` exportado para uso em relatórios.
6. **Falta automática**: quando nenhum dos 4 horários estiver preenchido e não houver exceção manual → `tipo_excecao = "falta"`, `atraso_minutos = jornadaMinutos`. Mantido como hoje.
7. **Fim de semana / feriado**: aceitar parâmetro opcional `ehDiaUtil: boolean` (default `true`). Quando `false`:
   - sem batidas → não conta falta, tudo zero.
   - com batidas → todo o tempo trabalhado vira `horas_extras`, `horas_normais = 0`, `atraso = 0`.
8. **Formatação**: `formatHours` precisa lidar com negativos no estilo `-HH:MM` (ex.: `-01:30`). Hoje retorna `-1h30min`; adicionar `formatHHMM(value)` para uso em relatórios sem alterar `formatHours` (que é usado em outras telas).

## Arquivos afetados

- `src/lib/ponto-rules.ts` — refatoração principal.
- Nenhum outro arquivo será editado. Os chamadores atuais (`Ponto.tsx`, `FolhaDetalhe.tsx`, `Relatorios.tsx`) já passam `jornadaPadraoStr` e os horários padrão; a assinatura permanece compatível.

## Validação dos 10 cenários (cadastro base 07:00–16:20, almoço 1h, carga 8h20)

| # | Trabalhado | HE | Atraso | AN |
|---|---|---|---|---|
| A 07:00 / 12:00 / 13:00 / 16:20 | 8h20 | 0 | 0 | 0 |
| B 06:50 / 12:00 / 13:00 / 17:20 | 9h30 | 1h10 (10+0+60) | 0 | 0 |
| C 07:50 / 12:00 / 13:00 / 16:00 | 7h10 | 0 | 1h10 (50+0+20) | 0 |
| D 04:30 / 12:00 / 13:00 / 16:20 | 10h50 | 2h30 | 0 | 30min (04:30→05:00) |
| E 07:00 / 12:00 / 13:00 / 23:00 | 15h | 6h40 | 0 | 60min (22:00→23:00) |
| F sem batidas dia útil | — | — | — | falta=1 |
| G sábado 09:00→13:00 | 4h | 4h | 0 | 0 |
| H 07:00 / 12:00 / 13:30 / 16:20 | 7h50 | 0 | 30min | 0 |
| I 07:00 / 12:00 / 12:30 / 16:20 | 8h50 | 30min | 0 | 0 |
| J 06:50 / 12:00 / 13:00 / 16:00 | 8h | 10min | 20min | 0 |

Após implementar, vou rodar um script de teste rápido com `bun` que executa essas 10 entradas pela função e compara com o esperado, antes de encerrar.

## O que NÃO muda

- UI (`Ponto.tsx`, `Relatorios.tsx`, etc.) permanece igual.
- OCR, importação por foto, exportação PDF, Supabase, RLS — intocados.
- Memória `mem://logic/ponto-rules` será atualizada para refletir as novas regras (sem tolerância, per-batida, AN CLT, fim-de-semana = HE).
