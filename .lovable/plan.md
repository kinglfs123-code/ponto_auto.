## Módulo CMV — Custo da Mercadoria Vendida

Substitui a página placeholder de CMV por um módulo funcional integrado ao Financeiro. As "Compras do Dia" são calculadas automaticamente somando todos os lançamentos do Financeiro com código **301**, agrupados por **data de chegada**. Vendas e convênios são lançados manualmente. CMV % e desvio em relação à meta de 40% são calculados em tempo real.

### Estrutura da tabela CMV (mês selecionado)

| Coluna | Origem |
|---|---|
| Data | Dia do mês |
| Vendas Almoço | Manual |
| Convênio Almoço | Manual |
| Vendas Jantar | Manual |
| Convênio Jantar | Manual |
| Total Vendas | `=Almoço + Jantar + Convênios` |
| Compras do Dia | Auto: `SUM(payables.amount)` onde `item_code='301'` e `arrival_date=dia` |
| CMV % | `Compras ÷ Total Vendas × 100` |
| Desvio | `CMV % − 40%` (verde se ≤ 40, vermelho se > 40) |

### Detalhes técnicos

**Banco — nova tabela `cmv_daily_sales`**
- `empresa_id` (uuid), `entry_date` (date), `vendas_almoco`, `convenio_almoco`, `vendas_jantar`, `convenio_jantar` (numeric, default 0)
- Índice único `(empresa_id, entry_date)` para upsert por dia
- RLS por `user_owns_empresa(empresa_id)` (mesmo padrão das demais tabelas)
- Trigger `update_updated_at_column`

**Compras do Dia** — sem IA / sem edge function. Query única no Supabase:
```sql
SELECT arrival_date, SUM(amount) 
FROM payables 
WHERE empresa_id=? AND item_code='301' 
  AND arrival_date BETWEEN <inicio_mes> AND <fim_mes>
GROUP BY arrival_date
```
Resultado é mapeado por dia no front. Quando um lançamento código 301 é criado/editado/excluído no Financeiro, invalidamos `["cmv-purchases"]` no React Query — atualização instantânea sem job de "sincronizar".

**Constante** — `CMV_PURCHASE_CODE = "301"` e `CMV_TARGET = 0.40` em `src/lib/cmv-constants.ts`.

### Estrutura de arquivos

```text
src/types/cmv.ts                          ← tipos CmvDailySales, CmvRow
src/lib/cmv-constants.ts                  ← CMV_PURCHASE_CODE, CMV_TARGET
src/components/cmv/CmvLayout.tsx          ← layout idêntico ao FinanceiroLayout
src/components/cmv/NavBarCmv.tsx          ← dock-nav (Visão geral, Tabela mensal)
src/components/cmv/CmvSummaryCards.tsx    ← totais + CMV% do mês
src/components/cmv/CmvMonthTable.tsx      ← tabela editável dia-a-dia
src/pages/cmv/Home.tsx                    ← dashboard + seletor de mês
src/pages/cmv/Tabela.tsx                  ← tabela completa do mês
```
- Remove o placeholder `src/pages/Cmv.tsx`.
- Atualiza `src/App.tsx` com rotas `/cmv`, `/cmv/tabela`.

### UI

- **Header**: seletor de mês (MM/AAAA, mesmo padrão de `Cobrancas.tsx`).
- **Cards de totais (mês)**: Vendas Almoço, Vendas Jantar, Convênios, Compras (cód. 301), **CMV % do mês** (verde ≤40%, vermelho >40%).
- **Tabela mensal** (mobile = cards, desktop = tabela densa):
  - Inputs `BRL` mascarados nas 4 colunas manuais, autosave on blur (upsert por dia).
  - Coluna "Compras do Dia" read-only com badge `301` linkando para `/financeiro/contas?filter=...`.
  - Linha de **totais** no rodapé.
  - Coluna "Desvio" com pill colorido.
- **Estado vazio**: mensagem orientando a lançar vendas e cadastrar boletos com código 301.

### Integração com o Financeiro

- Em `LancamentoRapido.tsx` e edição em `Contas.tsx`, após `mutate` adicionar `qc.invalidateQueries({ queryKey: ["cmv-purchases"] })`.
- Sem edge function, sem job, sem IA — agregação roda no Postgres a cada visualização do mês (rápido, gratuito, sempre exato).

### Decisões aplicadas (das suas respostas)

- Código **301** fixo em constante.
- Data usada: **`arrival_date`** (data de chegada da mercadoria).
- **Sem IA** — soma direta via SQL com `GROUP BY`.
- **Seletor de mês único** (igual ao módulo Empresas).

### Fora do escopo desta entrega

- Gráficos de evolução temporal (linha de CMV% mês a mês) — fica para um próximo passo se quiser.
- Edição em massa, exportação Excel, fechamento mensal bloqueado.