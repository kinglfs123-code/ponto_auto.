

## Plano: Implementar Lógica Dupla de Extras (Especialista v2)

### Diferenças entre o código atual e a referência do especialista

1. **Extras usa apenas comparação de batidas** — falta a LÓGICA 1 (total trabalhado vs jornada). O especialista usa `Math.max()` entre as duas lógicas.
2. **`horas_normais = 0` em ausências** — o especialista retorna `JORNADA_NORMAL` sempre (folga, feriado, atestado, falta), pois a jornada "devida" permanece.
3. **Atraso baseado em batidas** — o especialista calcula atraso como `JORNADA_NORMAL - totalTrabalhado` (LÓGICA 1), não pela diferença de horário de batida.
4. **`totalTrabalhado` não é calculado** — o código atual não soma a duração real dos turnos.

### Correções em `src/lib/ponto-rules.ts`

#### `applyToleranceAndDetect`

1. Calcular `totalTrabalhado` somando duração de cada turno (manhã + tarde + extra)
2. **LÓGICA 1**: Se `totalTrabalhado > jornadaMinutos` → `extraLogica1 = totalTrabalhado - jornadaMinutos`; senão → `atrasoLogica1 = jornadaMinutos - totalTrabalhado`
3. **LÓGICA 2**: Manter lógica de batidas (chegou antes/saiu depois = `extraHorario`)
4. **Extra final**: `Math.max(extraLogica1, extraLogica2)` — o maior prevalece
5. **Atraso final**: usar `atrasoLogica1` (baseado no total trabalhado)
6. Ausências (folga, atestado, falta): retornar `horas_normais = jornadaHours` (não 0)
7. Falta sem registros: `horas_normais = jornadaHours`, `atraso = jornadaMinutos`

### Arquivo alterado
- `src/lib/ponto-rules.ts` — ajustar `applyToleranceAndDetect`

Sem mudanças no banco de dados. Sem mudanças na UI.

