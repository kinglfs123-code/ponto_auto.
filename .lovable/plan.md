## Objetivo

1. Adicionar 3ª opção "Empresas" no seletor pós-login (placeholder "Em breve").
2. Criar cadastro de **Códigos** (catálogo simples: código + descrição) no módulo Financeiro.
3. No formulário de Lançamento Rápido, trocar o campo "Código" (texto livre) por um seletor que lê do catálogo.

---

## 1. Banco de dados (migração)

Nova tabela `item_codes`:
- `code` (texto, único por empresa)
- `description` (texto)
- `empresa_id` + RLS via `user_owns_empresa` (mesmo padrão das outras tabelas)
- Trigger de `updated_at`
- Índice único `(empresa_id, code)`

A tabela `payables` continua armazenando `item_code` como texto (snapshot do código no momento do lançamento) — sem migração destrutiva.

Atualizar `suppliers.default_item_code`: continua como texto, passando a referenciar valores do catálogo (validação só na UI).

## 2. Módulo Empresas (placeholder)

- Nova rota `/empresas-modulo` com página `EmpresasModulo.tsx` exibindo card "Em breve".
- Em `SelecionarModulo.tsx`, adicionar 3º card **Empresas** (ícone Building2) → `/empresas-modulo`.
- Layout do grid passa de `sm:grid-cols-2` para `sm:grid-cols-3`.

> Observação: a página existente `/empresas` (gestão de CNPJs do RH) **não** é alterada. O novo card é placeholder, conforme escolhido.

## 3. Cadastro de Códigos no Financeiro

- Nova rota `/financeiro/codigos` com página `Codigos.tsx` (CRUD completo, mesmo padrão de `Fornecedores.tsx`):
  - Lista em cards (código em destaque + descrição).
  - Dialog de criar/editar (campos: código, descrição).
  - Botão excluir com confirm.
- Adicionar item "Códigos" na `NavBarFinanceiro.tsx` (ícone `Tags` ou `Hash`) entre "Contas" e "Fornecedores".

## 4. Lançamento Rápido — usar catálogo

- Criar componente `ItemCodeCombobox.tsx` (espelho de `SupplierCombobox`):
  - Busca por código ou descrição.
  - Mostra "código — descrição".
  - Se não houver nenhum cadastrado, exibe link "Cadastrar código" → `/financeiro/codigos`.
- Em `LancamentoRapido.tsx`:
  - Substituir o `<Input id="code">` pelo novo combobox.
  - Estado passa de `itemCode: string` para `itemCode: ItemCode | null`.
  - Ao salvar, gravar `item_code: itemCode.code` (texto) em `payables`.
  - Auto-fill via fornecedor: se `supplier.default_item_code` existir e bater com algum código do catálogo, pré-seleciona; caso contrário, ignora.
- Em `Fornecedores.tsx` (form de fornecedor): trocar o input `default_item_code` pelo mesmo combobox (opcional/limpável).

## 5. Tipos e roteamento

- `src/types/financeiro.ts`: adicionar `interface ItemCode { id; empresa_id; code; description; created_at; updated_at }`.
- `src/App.tsx`: registrar rotas `/empresas-modulo` e `/financeiro/codigos`.
- `NavBarFinanceiro.tsx`: adicionar entrada + prefetcher.

---

## Detalhes técnicos

**SQL principal:**
```sql
CREATE TABLE public.item_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, code)
);
ALTER TABLE public.item_codes ENABLE ROW LEVEL SECURITY;
-- 4 policies (select/insert/update/delete) com user_owns_empresa(empresa_id)
-- trigger update_updated_at_column BEFORE UPDATE
```

**Arquivos a criar:**
- `src/pages/EmpresasModulo.tsx`
- `src/pages/financeiro/Codigos.tsx`
- `src/components/financeiro/ItemCodeCombobox.tsx`
- migração SQL

**Arquivos a editar:**
- `src/App.tsx` (2 novas rotas)
- `src/pages/SelecionarModulo.tsx` (3º card)
- `src/components/financeiro/NavBarFinanceiro.tsx` (nova aba)
- `src/pages/financeiro/LancamentoRapido.tsx` (combobox de código)
- `src/pages/financeiro/Fornecedores.tsx` (combobox no default)
- `src/types/financeiro.ts` (tipo ItemCode)

Sem mudanças em `payables`, RH ou autenticação.
