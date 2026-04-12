

## Plano: Ajustes de UI no Dashboard, EmpresaSelector e Mês de Referência

### Alterações

#### 1. Dashboard (`src/pages/Dashboard.tsx`)
O layout já está conforme a screenshot — métricas em 3 cards (Empresas, Folhas de Ponto, Relatórios), ações rápidas em grid, lista de empresas. Está correto e não precisa de mudanças estruturais.

#### 2. EmpresaSelector — remover CNPJ do dropdown (`src/components/EmpresaSelector.tsx`)
- Linha 38: trocar `{e.nome} — {e.cnpj}` por apenas `{e.nome}`

#### 3. Mês de referência em formato brasileiro (`src/pages/Ponto.tsx` e `src/lib/utils.ts`)
- Trocar o input de `mesRef` (atualmente `YYYY-MM` / `2026-04`) por um formato visual brasileiro (`04/2026`)
- Adicionar helpers `toBrMonth("2026-04")` → `"04/2026"` e `fromBrMonth("04/2026")` → `"2026-04"` em `utils.ts`
- O estado interno continua em `YYYY-MM` para compatibilidade com o banco, mas o input exibe e aceita `MM/YYYY`
- Atualizar o placeholder para `"04/2026"`

### Arquivos alterados
- **`src/components/EmpresaSelector.tsx`** — remover CNPJ do label
- **`src/lib/utils.ts`** — helpers de formatação de mês BR
- **`src/pages/Ponto.tsx`** — input de mês em formato brasileiro

