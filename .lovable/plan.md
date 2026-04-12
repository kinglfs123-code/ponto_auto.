

## Plano: Corrigir Motor de Cálculo de Horas (Extras, Atrasos, Noturnas)

### Problemas identificados

1. **Adicional noturno somando onde não deveria**: A função `calcNightHours` tem um bug grave — se a entrada é antes das 22h mas a saída é depois das 22h (ex: 20:00–23:00), retorna 0 incorretamente. Ela só captura dois casos: entrada >= 22:00 OU entrada < 05:00, mas ignora o cenário de cruzamento.

2. **Turnos diurnos normais (08:00–17:00)**: Não deveriam ter noturnas, mas se o OCR retornar horários estranhos a função não protege.

3. **Hora extra**: Cálculo simples (total - jornada) está correto na lógica, mas o atraso não é descontado do saldo — se o funcionário chegou 30min atrasado e saiu no horário, o sistema calcula como se tivesse trabalhado menos mas não desconta corretamente.

### Alterações

#### 1. `src/lib/ponto-rules.ts` — Reescrever `calcNightHours`
- Nova lógica que calcula a **interseção** entre qualquer par entrada/saída e o período 22:00–05:00
- Trata corretamente turnos que cruzam a meia-noite
- Para turnos 100% diurnos (ex: 08:00–18:00), retorna 0 garantidamente
- Suporta overnight shifts (22:00–06:00)

#### 2. `src/lib/ponto-rules.ts` — Ajustar cálculo de extras e atraso
- Hora extra = `max(0, totalTrabalhado - jornadaPadrao)` (já está correto)
- Atraso: manter cálculo atual mas garantir que não interfere no cálculo de extras
- Saída antecipada: calcular déficit = `jornadaPadrao - totalTrabalhado` quando positivo

#### 3. `src/lib/ponto-rules.ts` — Proteção contra dados inválidos
- Se entrada > saída dentro do mesmo turno (sem overnight), ignorar o turno
- Validar que horários parsed são razoáveis antes de calcular

### Lógica corrigida do adicional noturno

```text
calcNightMinutes(entrada, saida):
  Se entrada ou saida é null → retorna 0
  
  nightStart = 22:00 (1320 min)
  nightEnd   = 05:00 (300 min)
  
  // Normalizar para lidar com overnight
  Se saida <= entrada → saida += 24h
  
  // Período noturno: 22:00-29:00 (05:00 do dia seguinte)
  nightA = nightStart
  nightB = nightEnd + 24h (= 1740 min)
  
  // Interseção do turno com período noturno
  overlap = max(0, min(saida, nightB) - max(entrada, nightA))
  
  // Também checar período noturno anterior (00:00-05:00)
  Se entrada < nightEnd:
    overlap += max(0, min(saida, nightEnd) - entrada)
  
  retorna overlap / 60  (em horas)
```

### Arquivos alterados
- **`src/lib/ponto-rules.ts`** — reescrever `calcNightHours`, ajustar validações em `applyToleranceAndDetect`

Sem mudanças no banco de dados. Sem mudanças na UI.

