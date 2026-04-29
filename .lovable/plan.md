## Resumo
Quatro mudanças: (1) reforçar Inter como fonte global em todos os elementos, (2) reduzir um pouco os ícones das navbars, (3) transformar o módulo "Empresas" numa tela de cobranças (cadastro de empresa-cliente, valor do mês, vencimento) — espelhando a UX de Funcionários/Fornecedores, e (4) adicionar o módulo CMV (placeholder vazio) ao seletor de módulos e à navbar/rotas, no mesmo padrão dos outros módulos.

## 1. Fonte Inter — herança global

**Arquivo:** `src/index.css`

Hoje a regra `font-family: "Inter", ...` está apenas no `body`. Vários componentes shadcn (button, input, dialog, select) e elementos como `h1..h6` herdam normalmente, mas inputs/buttons/textarea/select **não herdam font-family por padrão do user-agent** — precisam de `font-family: inherit` explícito.

Adicionar ao `@layer base`:

```css
html { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
button, input, optgroup, select, textarea { font-family: inherit; }
h1, h2, h3, h4, h5, h6 { font-family: inherit; letter-spacing: -0.02em; }
```

Mantém os fallbacks já existentes. Não mexer em `tailwind.config.ts` (já está correto).

## 2. Diminuir ícones da NavBar

**Arquivos:** `src/components/NavBar.tsx`, `src/components/financeiro/NavBarFinanceiro.tsx`

Hoje cada ícone é `h-7 w-7` (28px) num tile de 52px. Reduzir para um visual mais refinado:

- Ícone: `h-7 w-7` → `h-6 w-6` (24px)
- Tile (no `index.css` `.dock-tile`): 52×52 → 48×48; `border-radius` 16px → 14px

Isso afeta as duas navbars simultaneamente (compartilham `.dock-tile`). Resultado: dock mais compacto, ícones com peso visual proporcional.

## 3. Módulo "Empresas" — cobranças mensais

Substituir o placeholder atual por uma tela funcional inspirada na planilha enviada. Cada registro é uma **cobrança de uma empresa-cliente** num mês.

### 3.1 Banco de dados (nova migração)

Duas tabelas novas no schema `public`, vinculadas à `empresa_id` (a empresa "dona" do sistema, mantendo o multi-tenant atual):

**`client_companies`** — cadastro reutilizável das empresas-clientes (igual a fornecedores/funcionários):
- `name` (texto, obrigatório)
- `cnpj` (texto, opcional — alguns clientes da planilha não têm)
- `notes` (texto, opcional)

**`client_billings`** — cobrança mensal por cliente:
- `client_company_id` (FK → client_companies)
- `reference_month` (date, sempre dia 1 — usado como "mês de referência")
- `measurement_date` (date, opcional — "Data Medição")
- `send_date` (date, opcional — "Envio Medição")
- `description` (texto, opcional — observações tipo "Pavotec NF 1ª R$...")
- `amount` (numeric)
- `due_date` (date)
- `received_date` (date, opcional)
- `billing_status` (enum: `aguardando_oc`, `faturado`)
- `payment_status` (enum: `a_receber`, `recebido`, `recebido_com_atraso`, `atrasado`)

RLS: mesmas políticas usadas em `suppliers`/`payables` (acesso por usuários autenticados da empresa). Triggers `updated_at`.

Status de pagamento pode ser derivado automaticamente a partir de `received_date` vs `due_date` quando o usuário marcar como recebido — calculado no frontend para evitar trigger complexo.

### 3.2 Telas

Estrutura espelha o módulo Financeiro:

```text
/empresas-modulo                 → Home (lista de cobranças do mês selecionado)
/empresas-modulo/clientes        → CRUD de empresas-clientes (igual Fornecedores)
/empresas-modulo/cobranca/nova   → Form: cliente + valor + vencimento + datas
```

Componentes novos:
- `src/components/empresas-modulo/EmpresasModuloLayout.tsx` (espelha `FinanceiroLayout`)
- `src/components/empresas-modulo/NavBarEmpresasModulo.tsx` (dock com 2 tiles: Cobranças, Clientes)
- `src/pages/empresas-modulo/Cobrancas.tsx` (home — substitui o placeholder)
- `src/pages/empresas-modulo/Clientes.tsx` (CRUD)
- `src/pages/empresas-modulo/CobrancaForm.tsx` (criar/editar cobrança)

A home mostra:
- Seletor de mês (MM/AAAA, default: mês atual)
- Cards de resumo: Total faturado, Total recebido, A receber, Atrasado
- Lista (cards) de cobranças do mês com status colorido (verde=recebido, amarelo=a receber, vermelho=atrasado, cinza=aguardando OC)
- Botão "Nova cobrança" com `ClientCompanyCombobox` (busca/cria empresa-cliente, igual ao `SupplierCombobox`)

Reaproveita `formatBRL`, `formatDateBR`, `liquid-glass`, `Dialog`, `Input`, `Select`.

### 3.3 Roteamento (`src/App.tsx`)

Adicionar rotas `/empresas-modulo/clientes` e `/empresas-modulo/cobranca/nova`. A rota `/empresas-modulo` passa a renderizar `Cobrancas` (não mais o placeholder).

## 4. Novo módulo "CMV" (placeholder)

Espelha o cadastro do módulo Financeiro/Empresas, sem conteúdo funcional ainda.

**`src/components/ModuleSwitcher.tsx`**: adicionar entrada `cmv`:
```ts
cmv: { label: "CMV", to: "/cmv", icon: Calculator }
```

**`src/pages/SelecionarModulo.tsx`**: adicionar 4º card "CMV / Custo da mercadoria vendida" (grid passa para `sm:grid-cols-2 lg:grid-cols-4`).

**`src/pages/Cmv.tsx`** (novo): página vazia com header padrão (`AppHeader module="cmv"`) e card "Em breve" — mesma estrutura visual do `EmpresasModulo` original.

**`src/App.tsx`**: registrar rota `/cmv` (lazy).

**`src/components/AppHeader.tsx` / `ModuleSwitcher.tsx`**: estender o tipo `ModuleKey` para incluir `"cmv"`.

Nenhuma tabela, nenhuma navbar inferior, nenhum CRUD para CMV nesta etapa.

## Detalhes técnicos

- Migração roda antes de qualquer código (uma única chamada `supabase--migration` com tabelas + enums + RLS + triggers).
- Após aprovação da migração, `src/integrations/supabase/types.ts` é regenerado automaticamente — só então as queries das novas telas podem ser tipadas.
- Cores dos novos tiles do dock (Empresas-Cobranças e CMV) usarão tokens existentes (`--success`, `--accent`).
- Formulários seguem o padrão dos existentes: `react-query` para mutations, `toast` para feedback, `useConfirm` para deleção.
- `formatBRL` / `parseBRL` / `maskCurrencyInput` reutilizados para o campo de valor.
- `formatCNPJ` reutilizado para CNPJ opcional do cliente.

## Fora de escopo

- Importação OCR/planilha (apenas cadastro manual nesta etapa).
- Conteúdo real do módulo CMV.
- Relatórios/exportação das cobranças.
