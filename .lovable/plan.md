

## Plano: Ajustar Saldo no Resumo Mensal

### Diferença encontrada

| Aspecto | Código atual | Referência do especialista |
|---------|-------------|---------------------------|
| Saldo | `extras(min) - atraso(min)` | `totalTrabalhadas - totalAtraso` |
| Noturno | ✅ Correto (variável separada) | ✅ Igual |

O saldo atual mede apenas a diferença líquida de extras vs atrasos. A referência do especialista define saldo como **total trabalhado menos total de atraso**, que reflete melhor o balanço real de horas.

### Correção em `src/lib/ponto-rules.ts`

Na função `calcularResumo`:
1. Adicionar acumulador `totalTrabalhadas` somando `r.horas_normais + r.horas_extras` (ou a duração total de cada dia)
2. Alterar saldo para: `saldo = totalTrabalhadas(min) - totalAtraso(min)`

```typescript
// Antes
const extrasMin = Math.round(extras * 60);
const saldo = (extrasMin - atraso) / 60;

// Depois
const trabalhadasMin = Math.round(totalH * 60);
const saldo = (trabalhadasMin - atraso) / 60;
```

### Arquivo alterado
- `src/lib/ponto-rules.ts` — 2 linhas na função `calcularResumo`

