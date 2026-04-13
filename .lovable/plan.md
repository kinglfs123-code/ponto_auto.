

## Plano: Reescrever Motor de Cálculo com Lógica de Especialista

### Problema fundamental
O cálculo atual de horas extras está **errado**. Ele usa `totalTrabalhado - jornada` para determinar extras, mas a lógica correta (conforme a referência do especialista) é:

- **Chegou ANTES** do horário padrão → extra (minutos antes da entrada)
- **Chegou DEPOIS** → atraso
- **Saiu DEPOIS** do horário padrão → extra (minutos depois da saída)
- **Saiu ANTES** → atraso
- **Falta total** (sem registros) → atraso = jornada inteira

### O que muda

#### `src/lib/ponto-rules.ts` — Reescrever `applyToleranceAndDetect`

**Lógica nova (baseada na referência):**
1. Se `tipo_dia` é folga/atestado/feriado → tudo zero
2. Se nenhum registro → falta, atraso = jornada completa
3. Calcular `primeiraEntrada` e `ultimaSaida` reais
4. **Extra**: `(entradaPadrao - primeiraEntrada)` se chegou antes + `(ultimaSaida - saidaPadrao)` se saiu depois
5. **Atraso**: `(primeiraEntrada - entradaPadrao)` se chegou depois + `(saidaPadrao - ultimaSaida)` se saiu antes
6. **Noturno**: interseção com 22h-05h (manter `calcNightMinutes` atual que já funciona)
7. **Horas normais**: sempre = jornada padrão (quando trabalhou)
8. **Tolerância de 5min**: aplicada tanto na entrada quanto na saída

**Saída do cálculo** (em minutos internamente, convertido para horas no retorno):
- `horas_normais` = jornada padrão (ex: 7.33h para 7h20)
- `horas_extras` = total de extras em horas
- `atraso_minutos` = total de atraso em minutos
- `horas_noturnas` = noturno em horas

#### `src/lib/ponto-rules.ts` — Ajustar `calcularResumo`
- Saldo = `totalExtras(min) - totalAtraso(min)` convertido para horas

#### `src/lib/ponto-rules.ts` — Manter funções utilitárias
- `parseTimeToMinutes`, `formatHours`, `formatMinutes`, masks, `matchFuncionario` — sem mudanças
- `calcNightMinutes`, `shiftDuration` — manter (já corrigidos)

### Exemplo concreto
Funcionário: entrada 05:00, saída 13:10

Registro dia 11: entrada 04:35, saída manhã 07:00, entrada tarde 08:00, saída tarde 13:10

- primeiraEntrada = 04:35, ultimaSaida = 13:10
- Extra entrada: 05:00 - 04:35 = **25min**
- Extra saída: 13:10 = 13:10 (igual ao padrão) = **0min**
- Atraso: **0min**
- Noturno: 04:35→05:00 = **25min**

### Arquivos alterados
- **`src/lib/ponto-rules.ts`** — reescrever `applyToleranceAndDetect` e `calcularResumo`

Sem mudanças no banco de dados. Sem mudanças na UI (mesma interface de retorno).

