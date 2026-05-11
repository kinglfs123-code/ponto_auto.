## Objetivo

Aplicar o mesmo padrão "sidebar em desktop + dock em mobile" que já existe no módulo RH a TODOS os outros módulos do app: Financeiro, CMV, DRE, Empresas-Módulo (cobranças/clientes) e Marketing.

## Estado atual

- Módulo RH já usa `<ResponsiveNav />` (de `src/components/nav/ResponsiveNav.tsx`) com a lista `NAV_ITEMS` de `nav-items.ts`.
- Cada outro módulo tem seu próprio dock no rodapé:
  - `src/components/financeiro/NavBarFinanceiro.tsx` → Lançar / Contas / Códigos / Fornecedores
  - `src/components/cmv/NavBarCmv.tsx` → Visão geral / Tabela mensal
  - `src/components/dre/NavBarDre.tsx` → Visão geral / Tabela mensal / Anual
  - `src/components/empresas-modulo/NavBarEmpresasModulo.tsx` → Cobranças / Clientes
  - `src/components/marketing/NavBarMarketing.tsx` → Marketing
- Cada um é renderizado dentro do `*Layout.tsx` correspondente, dentro de um wrapper `min-h-screen bg-background pb-24`.

## Mudanças propostas

### 1. Tornar a navegação genérica (1 alteração só, beneficia todos os módulos)

Refatorar os 3 componentes em `src/components/nav/` para aceitar a lista de itens via prop, em vez de importarem `NAV_ITEMS` direto:

- `DesktopSidebar.tsx`: aceitar `items: NavItem[]` e `title?: string` (para o cabeçalho — "RH · Painel" / "Financeiro · Painel" etc.).
- `MobileDock.tsx`: aceitar `items: NavItem[]`.
- `ResponsiveNav.tsx`: aceitar `items: NavItem[]` e `title?: string` e repassar.
- O uso atual no RH continua igual mudando para `<ResponsiveNav items={NAV_ITEMS} title="RH · Painel" />`.

### 2. Criar uma lista `nav-items` por módulo

Novos arquivos com a mesma estrutura de `nav-items.ts`:

- `src/components/financeiro/nav-items.ts` — Lançar / Contas / Códigos / Fornecedores (mantendo as cores/ícones atuais).
- `src/components/cmv/nav-items.ts` — Visão geral / Tabela mensal.
- `src/components/dre/nav-items.ts` — Visão geral / Tabela mensal / Anual.
- `src/components/empresas-modulo/nav-items.ts` — Cobranças / Clientes.
- `src/components/marketing/nav-items.ts` — Marketing (1 item só por enquanto).

As rotas vão exatamente bater com as já existentes no `App.tsx` — nenhuma rota nova é criada.

### 3. Substituir cada NavBar antiga pelo `ResponsiveNav`

Em cada `*Layout.tsx`:

- Remover o import e o `<NavBar* />`.
- Importar `ResponsiveNav` e a lista de items do módulo, e renderizar `<ResponsiveNav items={ITEMS} title="<Módulo> · Painel" />`.
- Adicionar `md:pl-60` no wrapper `min-h-screen bg-background pb-24`.

Layouts afetados:
- `src/components/financeiro/FinanceiroLayout.tsx`
- `src/components/cmv/CmvLayout.tsx`
- `src/components/dre/DreLayout.tsx`
- `src/components/empresas-modulo/EmpresasModuloLayout.tsx`
- `src/components/marketing/MarketingLayout.tsx`

Os arquivos antigos `NavBar<Modulo>.tsx` ficam no projeto sem uso (mesmo tratamento que demos ao `NavBar.tsx` do RH) — você deleta depois de validar.

### 4. Validação

- O harness compila automaticamente — confirma sem erros TS.
- Conferir visualmente em cada módulo (Financeiro, CMV, DRE, Empresas-Módulo, Marketing) que:
  - A sidebar aparece em desktop (md+).
  - O dock no rodapé aparece em mobile.
  - O conteúdo não fica atrás da sidebar (graças ao `md:pl-60`).
  - As rotas ativas ficam destacadas.

## O que NÃO muda

- `App.tsx`, `index.css`, `tailwind.config.ts`, `index.html`.
- Nenhuma rota nova; nenhum pacote novo.
- Páginas individuais dos módulos — só os Layouts mudam.
- Lógica do módulo RH (já está pronta).
