## Ajustes na Tabela CMV

Os 4 cards de totalizadores no topo (Vendas Almoço, Vendas Jantar, Convênios, Compras cód. 301) **já estão presentes** em `CmvSummaryCards.tsx` e aparecem em `/cmv/tabela` — então nada a restaurar ali.

A única mudança necessária é remover a linha de "Total" no rodapé da tabela mensal.

### Alteração

**`src/components/cmv/CmvMonthTable.tsx`**
- Remover o bloco `<tfoot>...</tfoot>` inteiro (linhas que renderizam Total, V. Almoço, C. Almoço, V. Jantar, C. Jantar, Compras 301, CMV %, Desvio no rodapé).
- Remover o `useMemo` `totals` que só é usado pelo tfoot.

### Resultado
- Topo continua com os 4 cards de totais + card grande de CMV % do mês.
- Tabela passa a mostrar apenas as linhas diárias, sem rodapé de soma.
