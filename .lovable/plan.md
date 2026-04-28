## Plano: separação RH × Financeiro + MVP Contas a Pagar

Dois entregáveis combinados:
1. **Novo fluxo de entrada** após login: escolher CNPJ → escolher módulo (RH ou Financeiro).
2. **Módulo Financeiro MVP** com Contas a Pagar (3 cards + lançamento rápido + lista + filtros + marcar como paga) e CRUD de Fornecedores.

Tudo continua isolado por `empresa_id` (CNPJ) usando o `EmpresaContext` atual e RLS via `user_owns_empresa()`.

---

### 1. Fluxo pós-login

```text
Login → /selecionar-empresa → /selecionar-modulo → /rh  ou  /financeiro
                  (lista CNPJs)     (2 cards grandes)    (dashboards)
```

**Nova rota `/selecionar-empresa`** (substitui o `/` atual como destino pós-login):
- Lista visual dos CNPJs do usuário (cards Liquid Glass com nome + CNPJ formatado).
- Botão "Nova empresa" no rodapé se a lista estiver vazia.
- Ao clicar num card: salva no `EmpresaContext` + `localStorage` e vai para `/selecionar-modulo`.

**Nova rota `/selecionar-modulo`**:
- Dois cards grandes lado a lado: **RH** (ícone Users) e **Financeiro** (ícone Wallet).
- Mostra no topo "Empresa: {nome}" com botão "trocar" que volta a `/selecionar-empresa`.
- RH → `/rh` (= dashboard RH atual). Financeiro → `/financeiro`.

**Persistência leve**: `EmpresaContext` ganha persistência em `localStorage` (`empresa_atual_id`) para que F5 não perca o CNPJ. Ao abrir `/rh` ou `/financeiro` sem empresa selecionada, redireciona para `/selecionar-empresa`.

---

### 2. Reorganização de rotas

Rotas atuais (todas RH) ficam sob prefixo `/rh`:

| Antes | Depois |
|---|---|
| `/` | `/selecionar-empresa` (novo home pós-login) |
| `/` (dashboard) | `/rh` |
| `/empresas` | `/rh/empresas` |
| `/funcionarios`, `/funcionarios/:id` | `/rh/funcionarios`, `/rh/funcionarios/:id` |
| `/ponto`, `/ponto/:folhaId` | `/rh/ponto`, `/rh/ponto/:folhaId` |
| `/holerites` | `/rh/holerites` |
| `/relatorios` | `/rh/relatorios` |

Novas rotas Financeiro:

| Rota | Tela |
|---|---|
| `/financeiro` | Home operacional (3 cards + atalhos) |
| `/financeiro/lancamento` | Lançamento rápido (formulário do JSON) |
| `/financeiro/contas` | Lista de contas a pagar (filtros: hoje, atrasadas, futuras, pagas) |
| `/financeiro/fornecedores` | Lista de fornecedores |
| `/financeiro/fornecedores/novo` e `/:id` | CRUD de fornecedor |

**NavBar**: passa a ter 2 variantes — uma para RH (a atual) e uma para Financeiro (Início / Lançar / Contas / Fornecedores / Configurações). O componente detecta o módulo pela URL. Botão "trocar módulo" dentro de Configurações em ambas.

Compatibilidade: rotas antigas (`/empresas`, `/ponto`, etc.) redirecionam para `/rh/...` para não quebrar links salvos.

---

### 3. Banco de dados

Duas novas tabelas, ambas com `empresa_id` + RLS por `user_owns_empresa(empresa_id)` (mesmo padrão do RH).

**`suppliers`** (fornecedores, escopo por empresa):
- `id` uuid PK
- `empresa_id` uuid NOT NULL
- `name` text NOT NULL
- `cnpj` text NOT NULL
- `default_payment_method` text (nullable)
- `default_item_code` text (nullable)
- `default_due_days` integer (nullable)
- `created_at` timestamptz default now()
- UNIQUE (`empresa_id`, `cnpj`) — mesmo CNPJ pode existir em empresas diferentes do usuário, mas único por empresa.

**`payables`** (contas a pagar):
- `id` uuid PK
- `empresa_id` uuid NOT NULL
- `supplier_id` uuid NOT NULL (sem FK formal, validação por RLS — segue padrão atual do projeto)
- `arrival_date` date NOT NULL
- `amount` numeric(12,2) NOT NULL CHECK > 0
- `due_date` date NOT NULL
- `payment_method` text NOT NULL — validação via trigger (não CHECK, evita problemas de imutabilidade).
- `item_code` text NOT NULL
- `status` text NOT NULL default `'pendente'` — `pendente | pago | cancelado` validado por trigger.
- `paid_at` timestamptz (nullable) — preenchido ao marcar como paga.
- `created_at` timestamptz default now()

**Índices**: `payables(empresa_id, due_date)`, `payables(empresa_id, status)`, `suppliers(empresa_id, name)`.

**RLS** (4 policies cada — SELECT/INSERT/UPDATE/DELETE) usando `user_owns_empresa(empresa_id)`. Garante que cada CNPJ tenha financeiro 100% isolado.

**Trigger de validação** em `payables`:
- `payment_method IN ('boleto','pix','transferencia','dinheiro','cartao')`
- `status IN ('pendente','pago','cancelado')`

---

### 4. Telas Financeiro

**`/financeiro` — Home operacional**
- 3 cards de resumo (queries leves, `count` + `sum` filtrados por empresa):
  - "Hoje vencem" — count de payables com `due_date = today` e `status='pendente'`.
  - "Total hoje" — sum de amount nas mesmas condições, formatado BRL.
  - "Atrasadas" — count de `due_date < today` e `status='pendente'`.
- Atalhos abaixo: "Novo lançamento", "Ver contas", "Fornecedores".
- Os 3 cards são clicáveis e levam para `/financeiro/contas` com filtro pré-aplicado.

**`/financeiro/lancamento` — Lançamento rápido**
- Formulário com campos do JSON, na ordem: Data chegada → Fornecedor → Valor → Vencimento → Forma de pagamento → Código.
- **Fornecedor**: combobox (shadcn Command + Popover) buscável por nome, com botão "+ Novo fornecedor" no final que abre modal rápido (nome + CNPJ apenas) e seleciona automaticamente.
- **Auto-preenchimento ao escolher fornecedor**:
  - `payment_method` ← `supplier.default_payment_method` (se vazio).
  - `item_code` ← `supplier.default_item_code` (se vazio).
  - `due_date` ← `arrival_date + supplier.default_due_days` (sugestão; usuário pode editar).
- Valor: máscara BRL (input controlado, armazena number).
- Datas: input nativo `<input type="date">` (consistente com o resto do app).
- Validação client-side: todos os campos obrigatórios marcados; valor > 0; due_date ≥ arrival_date.
- Ao salvar: insert + toast "Lançamento criado" + reset do formulário (mantém `arrival_date` para lançamentos em sequência).

**`/financeiro/contas` — Lista**
- Tabs no topo: **Hoje · Atrasadas · Próximas (7 dias) · Todas pendentes · Pagas**.
- Tabela (desktop) / cards empilhados (mobile, conforme padrão do projeto): Vencimento · Fornecedor · Valor · Forma · Status · ações (Marcar como paga / Editar / Excluir).
- "Marcar como paga" → update `status='pago'`, `paid_at=now()`. Confirm dialog.
- Ordenação: vencimento ascendente (atrasadas primeiro).
- Total no rodapé do filtro ativo.

**`/financeiro/fornecedores` — CRUD**
- Lista (nome, CNPJ, defaults) + busca.
- Form de criação/edição com todos os campos da tabela, incluindo defaults.
- Excluir bloqueado se houver `payables` vinculadas (validação na UI antes da query).

---

### 5. Estilo & padrões

- 100% Liquid Glass / SF Pro (mesma estética do RH).
- React Query para todas as leituras (staleTime 60s, igual ao resto).
- Lazy load das páginas Financeiro (`React.lazy`) — cada uma vira um chunk próprio, mesmo padrão de `App.tsx`.
- Prefetch no NavBar do Financeiro (mesmo `prefetchers` do RH).
- Console hygiene: só `console.error`/`console.warn`.
- Sem mudanças no fluxo OCR, holerites, RH ou Edge Functions existentes.

---

### Detalhes técnicos

**Arquivos novos**:
- `src/pages/SelecionarEmpresa.tsx`, `src/pages/SelecionarModulo.tsx`
- `src/pages/financeiro/Home.tsx`, `LancamentoRapido.tsx`, `Contas.tsx`, `Fornecedores.tsx`, `FornecedorDetalhe.tsx`
- `src/components/financeiro/NavBarFinanceiro.tsx`
- `src/components/financeiro/SupplierCombobox.tsx`
- `src/hooks/use-financeiro-summary.ts`
- `src/lib/currency.ts` (formatBRL, parseBRL)
- `supabase/migrations/<timestamp>_financeiro_mvp.sql` — tabelas, índices, triggers, RLS

**Arquivos editados**:
- `src/App.tsx` — novas rotas, redirects das antigas, lazy imports.
- `src/contexts/EmpresaContext.tsx` — persistência em `localStorage` + carrega empresa salva.
- `src/components/NavBar.tsx` — pequena refatoração para aceitar variante (rh | financeiro) ou divisão em 2 componentes irmãos.
- `src/pages/Login.tsx` — após login, redireciona para `/selecionar-empresa` (não mais `/`).
- `src/integrations/supabase/types.ts` — atualizado automaticamente após migração (não editar à mão).

**Sem alterações** em: edge functions, RH, ponto, holerites, relatórios, OCR, AuthGuard (continua envolvendo todas as rotas privadas).

**Aberto para depois (fora do MVP)**: papéis (RH/Financeiro/Admin) com `user_roles`, contas a receber, fluxo de caixa, anexo de boleto/comprovante, exportação CSV. Hoje qualquer usuário logado vê os dois módulos da empresa que ele possui.