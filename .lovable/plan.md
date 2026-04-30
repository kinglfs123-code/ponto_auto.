
# Cadastro de empresa, módulo DRE e módulo Marketing

Três entregas em um único bloco, alinhadas ao padrão do CMV (mesma navegação dock, mesmo layout glass, mesmo seletor mensal).

---

## 1. Mover cadastro de "Nova empresa" para Configurações

### Em `src/components/SettingsMenu.tsx`
- Adicionar novo item **"Empresas"** (ícone `Building2`) acima do bloco de tema, abrindo a rota `/empresas` (página de cadastro/listagem que já existe).
- Texto secundário: "Gerenciar".

### Em `src/pages/SelecionarEmpresa.tsx`
- **Remover** o botão `+ Nova empresa` que aparece sob a lista de empresas.
- **Manter** apenas o card "Nenhuma empresa cadastrada ainda" (com botão "Cadastrar primeira empresa") como fallback de estado vazio — quando já existe pelo menos uma empresa, o cadastro só é acessível pela engrenagem.

Não muda nada em `src/pages/Empresas.tsx`.

---

## 2. Novo módulo "DRE" (réplica completa da planilha)

Espelha o CMV: rota `/dre`, dock próprio, layout glass, seletor mensal e tabela densa estilo planilha.

### Card no menu de módulos
`src/pages/SelecionarModulo.tsx` — adicionar quinto card **DRE** (ícone `LineChart`) apontando para `/dre`.

### Rotas (`src/App.tsx`)
- `/dre` → visão geral (mês corrente, totais e indicadores principais).
- `/dre/mensal` → tabela mês a mês completa (12 meses + trimestres + acumulados + % Receita) — formato da planilha.
- `/dre/anual` → mesma visão consolidada por ano (filtro de ano), igual ao layout original.

### Estrutura de pastas (espelha `src/components/cmv` e `src/pages/cmv`)
```text
src/components/dre/
  DreLayout.tsx              # idêntico ao CmvLayout, com NavBarDre
  NavBarDre.tsx              # dock com 3 ícones: Visão, Mensal, Anual
  DreSummaryCards.tsx        # Receita Bruta, Lucro Bruto, EBIT, Lucro Líquido, % margem
  DreTable.tsx               # tabela larga mês×categoria (sticky col esquerda)
  dre-shared.ts              # categorias, hooks, cálculos
src/pages/dre/
  Home.tsx
  Mensal.tsx
  Anual.tsx
src/types/dre.ts
src/lib/dre-categories.ts    # estrutura fiel da planilha (códigos, sinais, descrições)
```

### Categorias (idênticas à planilha enviada)
Definidas em `dre-categories.ts` como uma árvore — cada nó tem `code`, `sign` (+/−/=), `label`, `parent_code` opcional, `auto_from` (mapa para códigos do plano de contas/Financeiro) e `is_subtotal`.

Seções e subtotais que serão criados (exatamente como a planilha):
- **1.00 Receita Bruta (=)** → 1.01 Vendas Varejo (+), 1.02 Vendas Empresas (+), 1.03–1.06 (linhas vazias para expansão).
- **2.00 Deduções de Vendas (−)** → Devoluções, Perdas de Inadimplência.
- **3.00 Receita Líquida (=) = 1 − 2**.
- **4.00 Impostos sobre Vendas (−)** → Simples (201), Provisão para Impostos, COFINS (4.03), e linhas livres 4.04–4.07.
- **5.00 CMV (−)** → Estoque Inicial (5.01), Matéria-Prima/Bebidas/Produtos (301), ICMS (302), Gás (303), Energia (304), Água (305), e os blocos 5.07 Impostos sobre compras, 5.08 Custos com pessoal produção (var), 5.09 Estoque Final, 5.10 Custos com pessoal produção (fix) com todos os subitens (salário, 13º, férias, FGTS, vale-transporte, refeição, cesta, seguro, plano de saúde, pró-labore, INSS empresa, retirada complementar/produtos…), 5.11 Custos com veículos (fix) e 5.12 Demais custos produção (fix).
- **6.00 Lucro Bruto (=) = 3 − 4 − 5**.
- **7.00 Despesas Variáveis com Vendas (−)** → Comissões (401), Entregas (402), Couvert (403), Taxas de Cartão 1,80% (498), Outras (499).
- **8.00 Despesas com pessoal comercial (var)** e **9.00 Despesas com pessoal comercial (fix)** com todos os subitens.
- **10.00 Despesas Fixas com Colaboradores** → Folha (501), Encargos (502), Pró-labore (503), Provisão 13º (599).
- **11.00 Concessionárias** (Telefone/TV/Internet, Energia, Água + livres).
- **12.00 Veículos** (Combustível, Manutenção, Seguros e Taxas, Outros).
- **13.00 Marketing** (Propaganda + livres).
- **14.00 Serviços de Terceiros** (Terceiros, Segurança/alarme, Sistema + livres).
- **15.00 Despesas Adm/Gerais** (601 Aluguel/condomínio/IPTU/Alvará, 602 Telefone/Internet/TV, 603 Material escritório/limpeza, 604 Sistemas, 605 Honorários contábeis/advocatícios, 606 Consultorias/treinamentos, 607 Manutenção máquinas/mobiliário, 608 Manutenção instalações, 609 Despesas Comerciais/Mkt, 610 Veículos, 611 Segurança, 612 Tarifas bancárias, 699 Outras + Depreciações).
- **16.00 Lucro Operacional EBIT (=)**.
- **17.00 Despesas Financeiras Fixas** (702, 703, 704 IOF, 799).
- **18.00 Despesas Financeiras Variáveis** (mesmos códigos).
- **19.00 Receitas Financeiras**.
- **20.00 Lucro Antes do IR (=)**.
- **21.00 IRPJ/CSLL (−)**.
- **22.00 Lucro Líquido (=)**.

### Origem dos números (auto + manual)
Cada categoria com `auto_from = ["301","302","305"…]` puxa do `payables` (mesmo padrão do CMV: soma de `amount` por mês onde `item_code` ∈ lista). Categorias sem `auto_from` (Receitas, ajustes, provisões) são manuais.

Categorias **com auto_from podem ser sobrescritas manualmente** — se houver valor em `dre_manual_entries`, ele substitui o automático no mês (caso útil quando o usuário quer ajustar). Na UI a célula manual ganha indicador discreto.

### Tabela `dre_manual_entries` (nova)
- `empresa_id` (FK lógica)
- `category_code` (text, ex.: `1.01`, `599`, `5.10.15`)
- `entry_month` (date, sempre dia 1)
- `amount` (numeric, default 0)
- timestamps + RLS (`user_owns_empresa`) seguindo o mesmo padrão de `cmv_daily_sales`
- UNIQUE `(empresa_id, category_code, entry_month)` para suportar `upsert`.

### Cálculos (front, em `dre-shared.ts`)
- Hook `useDreYear(year)` busca:
  - `dre_manual_entries` do ano inteiro (12 meses).
  - `payables` do ano inteiro (`arrival_date` entre `YYYY-01-01` e `YYYY-12-31`), agrupados por mês × `item_code`.
- Monta matriz `[categoryCode][month] = number` aplicando: manual override → senão soma de `auto_from` no mês → senão 0.
- Subtotais (`is_subtotal`) calculados sob demanda a partir das fórmulas declaradas (ex.: `3.00 = 1.00 + 2.00`, `6.00 = 3.00 - 4.00 - 5.00`, `16.00 = 6.00 - 7..15`, `22.00 = 20.00 - 21.00`). Sinais respeitam a coluna B (=, +, −).
- Trimestres e acumulados são derivados (1ºT = J+F+M, Acum = soma do início do ano até o trimestre, Resultado = soma anual).
- `% Receita` por célula = `valor / Receita Bruta do mesmo período` (ou 0 quando denominador = 0), idêntico à fórmula `=IF(D$5=0,0,(D6/D$5))` da planilha.

### UI

**`Home.tsx`** — visão executiva
- Seletor de mês.
- Cards: Receita Bruta, Receita Líquida, Lucro Bruto, EBIT, Lucro Líquido (cada um com % da receita).
- Mini "tabela vertical" com as principais linhas do mês.

**`Mensal.tsx`** — réplica visual da planilha
- Seletor de ano.
- Tabela densa com primeira coluna *sticky* (código + descrição) e cabeçalho *sticky* (Janeiro, %, Fevereiro, %, Março, %, **1º Trim.**, %, Abril…, **2º Trim.**, %, **Acumulado**, %, …, **Resultado**, %).
- Linhas de subtotal em destaque (negrito + fundo `bg-muted/40`).
- Células manuais editáveis (Input mascarado em moeda, igual ao CMV); células automáticas exibem o valor com tooltip "Vem do Financeiro · cód. 301".
- Override: ao digitar em célula automática, abre confirmação "Substituir valor do Financeiro?"; após salvar, mostra um pontinho indicando override.

**`Anual.tsx`** — visão simplificada
- Mesma tabela mas só com colunas **Trimestres + Acumulado + Resultado** (sem meses individuais), útil para impressão/exportação futura.

### Dock NavBar
3 ícones com cores liquid-glass: `LayoutDashboard` (`/dre`), `Table2` (`/dre/mensal`), `BarChart3` (`/dre/anual`).

---

## 3. Novo módulo "Marketing" (placeholder)

### Card no menu (`SelecionarModulo.tsx`)
Sexto card **Marketing** (ícone `Megaphone`) apontando para `/marketing`.

### Rota e arquivos
- `src/App.tsx`: `/marketing` → `MarketingHome`.
- `src/components/marketing/MarketingLayout.tsx` e `NavBarMarketing.tsx` (dock com 1 ícone só por enquanto).
- `src/pages/marketing/Home.tsx`: layout glass com card centralizado: ícone, título "Marketing" e mensagem "Em breve — defina aqui as métricas de campanhas e investimento."

Sem tabelas no banco. Sem cálculos. Apenas estrutura pronta para ganhar conteúdo no próximo passo.

---

## 4. Memória do projeto
Adicionar duas referências em `mem://index.md`:
- `[DRE Module](mem://features/dre)` — réplica fiel da planilha, mistura auto (códigos do Financeiro) com manual override em `dre_manual_entries`.
- `[Marketing Module](mem://features/marketing)` — placeholder; conteúdo a definir.

---

## Detalhes técnicos

- **Migração**: criação de `dre_manual_entries` com RLS espelhando `cmv_daily_sales` (4 políticas usando `user_owns_empresa(empresa_id)`), índice em `(empresa_id, entry_month)`.
- **Sem alteração** em `payables`, `item_codes`, `cmv_daily_sales`, `empresas`.
- Componentes pesados (`Mensal.tsx`) serão `lazy()` no `App.tsx`, igual aos demais.
- Formato monetário e máscaras reutilizam `formatBRL`/`maskCurrencyInput` de `src/lib/format.ts`.
- Seletor de ano usa o mesmo padrão do `MonthSelector` (chevrons + label central).
- Tudo respeita o tema glass existente (`liquid-glass`, `liquid-hover`, tokens semânticos — sem cores hardcoded).
- Cobertura responsiva: a tabela do Mensal terá scroll horizontal em telas pequenas (a primeira coluna fica fixa).

