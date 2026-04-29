## Objetivo

Padronizar a navegação da aplicação, mover "Configurações" para a tela de seleção de empresa (pós-login), adicionar botões "Voltar" consistentes e centralizar formatações (CNPJ, datas, validações, fontes).

---

## 1. Realocar "Configurações"

- Remover o item **Configurações** da dock inferior em:
  - `src/components/NavBar.tsx` (módulo RH)
  - `src/components/financeiro/NavBarFinanceiro.tsx` (módulo Financeiro)
- Adicionar um botão de engrenagem fixo no canto superior direito da tela `src/pages/SelecionarEmpresa.tsx` que abre um Popover com:
  - Tema (claro/escuro)
  - Trocar módulo (visível apenas se já existe módulo selecionado em sessão; caso contrário ocultar)
  - Sair
- Como a tela de empresas é o ponto de entrada após o login, todas as configurações ficam acessíveis ali. Dentro dos módulos, a navegação fica limpa (só funcionalidades).

## 2. Botão "Voltar" padronizado

Criar componente reutilizável `src/components/ui/back-button.tsx`:
- Usa `navigate(-1)` (voltar para a tela anterior — histórico).
- Fallback: se não houver histórico (ex.: abriu a URL direto), navega para uma rota padrão recebida via prop (`fallback="/"` ou `"/financeiro"`).
- Visual padrão: `Button variant="ghost" size="sm"` com ícone `ArrowLeft` e label "Voltar". Posição: canto superior esquerdo do conteúdo, antes do `<h1>`.

Aplicar em todas as páginas internas (exceto Home RH `/` e Home Financeiro `/financeiro`, que são raízes de módulo):
- `src/pages/Empresas.tsx` → fallback `/`
- `src/pages/Funcionarios.tsx` → fallback `/`
- `src/pages/FuncionarioDetalhe.tsx` → substituir os 2 botões existentes por `<BackButton fallback="/funcionarios" />`
- `src/pages/Ponto.tsx` → fallback `/`
- `src/pages/FolhaDetalhe.tsx` → substituir o botão atual (já usa `navigate(-1)`)
- `src/pages/Holerites.tsx` → fallback `/`
- `src/pages/Relatorios.tsx` → fallback `/`
- `src/pages/financeiro/LancamentoRapido.tsx` → fallback `/financeiro`
- `src/pages/financeiro/Contas.tsx` → fallback `/financeiro`
- `src/pages/financeiro/Codigos.tsx` → fallback `/financeiro`
- `src/pages/financeiro/Fornecedores.tsx` → fallback `/financeiro`
- `src/pages/SelecionarModulo.tsx` → fallback `/selecionar-empresa` (substitui o link "trocar")

Remover do `FinanceiroLayout.tsx` o botão "Voltar ao início" duplicado do header (já que cada página interna terá o BackButton padrão).

## 3. Padronização de fontes

Garantir uso consistente da família SF Pro / system stack já definida no tema Liquid Glass:
- Auditar `src/index.css` e `tailwind.config.ts` para confirmar `font-sans` aponta para a stack SF Pro / Inter de fallback.
- Padronizar tamanhos de título: `<h1>` sempre `text-2xl font-bold tracking-tight` (hoje varia entre `text-xl`, `text-2xl`, `text-primary`). Aplicar nas páginas listadas acima.
- Remover `text-primary` dos títulos para usar `text-foreground` (cor azul fica reservada para ações/links).

## 4. Centralizar formatadores e validações

Criar `src/lib/format.ts` reexportando e completando funções:
- `formatCNPJ(value)` — alias de `maskCNPJ` já existente.
- `formatCPF(value)` — alias de `maskCPF` já existente.
- `formatDateBR(input: string | Date)` — sempre `DD/MM/AAAA`, aceitando ISO ou `Date`. Sem hora.
- `formatDateTimeBR` — removido do uso geral; manter apenas onde explicitamente necessário (não está nos requisitos).
- `formatBRL`, `parseBRL`, `maskCurrencyInput` — reexportar de `currency.ts`.
- `validateCNPJ`, `validateCPF` — reexportar de `ponto-rules.ts`.

Substituir usos diretos por imports de `@/lib/format`:
- `src/pages/Relatorios.tsx` linha 284: trocar `new Date(r.created_at).toLocaleString("pt-BR")` por `formatDateBR(r.created_at)` (sem hora, conforme decisão).
- Padronizar exibição de CNPJ em todas as páginas para usar `formatCNPJ` com classe `font-mono`.

Manter `ponto-rules.ts` e `currency.ts` como fontes de verdade — `format.ts` é só a fachada única.

---

## Resumo de arquivos alterados

**Novos:**
- `src/components/ui/back-button.tsx`
- `src/lib/format.ts`

**Editados:**
- `src/components/NavBar.tsx` — remove Configurações
- `src/components/financeiro/NavBarFinanceiro.tsx` — remove Configurações
- `src/components/financeiro/FinanceiroLayout.tsx` — remove botão "Voltar ao início" duplicado
- `src/pages/SelecionarEmpresa.tsx` — adiciona botão Configurações no topo
- 11 páginas (RH + Financeiro + SelecionarModulo) — adiciona/substitui BackButton e padroniza títulos
- `src/pages/Relatorios.tsx` — usa `formatDateBR` sem hora

## Detalhes técnicos

- O BackButton checa `window.history.length > 1` antes de chamar `navigate(-1)`; senão usa `navigate(fallback, { replace: true })`.
- O Popover de Configurações na tela `SelecionarEmpresa` segue o mesmo padrão visual `liquid-glass` já usado nas dock bars.
- Nada de lógica de negócio é alterado — apenas UI, navegação e formatação.
