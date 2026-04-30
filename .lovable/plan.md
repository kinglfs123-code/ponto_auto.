
# Atualizar navegação de módulos

## Problema
O `ModuleSwitcher` (dropdown no topo de cada módulo) só lista 4 módulos: RH, Financeiro, Empresas e CMV. Faltam **DRE** e **Marketing**, que já existem no `SelecionarModulo` e nas rotas do app.

## Alterações

### 1. `src/components/ModuleSwitcher.tsx`
- Adicionar `dre` e `marketing` ao tipo `ModuleKey` e ao objeto `MODULES`:
  - **DRE** — ícone `LineChart`, rota `/dre`
  - **Marketing** — ícone `Megaphone`, rota `/marketing`

### 2. Layouts que usam ModuleSwitcher
Verificar se os layouts de DRE, CMV e Marketing passam o `current` correto ao `ModuleSwitcher`:
- `src/components/dre/DreLayout.tsx` — deve passar `current="dre"`
- `src/components/cmv/CmvLayout.tsx` — deve passar `current="cmv"`
- `src/components/marketing/MarketingLayout.tsx` — deve passar `current="marketing"`

### 3. Conferência de vinculação
- Cada layout de módulo já usa seu próprio `NavBar` (bottom dock) + `ModuleSwitcher` (top). Confirmar que todos os 6 módulos estão consistentes entre o switcher e as rotas.

Nenhuma migração de banco necessária.
