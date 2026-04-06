

## Plano: Cadastro de Funcionários vinculados a Empresas

### O que será feito

Criar um módulo completo de cadastro de funcionários, onde cada funcionário é vinculado a uma empresa (CNPJ). Campos: nome completo, CPF, e-mail, data de nascimento, cargo, horário de entrada e horário de saída.

### Banco de dados

Nova tabela `funcionarios`:

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| empresa_id | uuid | FK → empresas.id, NOT NULL |
| nome_completo | text | NOT NULL |
| cpf | text | NOT NULL |
| email | text | nullable |
| data_nascimento | date | nullable |
| cargo | text | nullable |
| horario_entrada | text | NOT NULL, default '08:00' |
| horario_saida | text | NOT NULL, default '17:00' |
| created_at | timestamptz | default now() |

**RLS**: SELECT, INSERT, UPDATE, DELETE via `user_owns_empresa(empresa_id)`.

### Frontend

**Nova página `src/pages/Funcionarios.tsx`**:
- Seletor de empresa no topo (reutiliza `EmpresaSelector`)
- Formulário de cadastro com máscara de CPF (XXX.XXX.XXX-XX), campos de horário com máscara HH:MM
- Lista de funcionários da empresa selecionada em cards/tabela
- Botões de editar e excluir por funcionário

**Nova rota**: `/funcionarios` em `App.tsx` (protegida por AuthGuard)

**NavBar**: Adicionar link "Funcionários" com ícone `Users`

### Arquivos alterados/criados

1. **Nova migration SQL** — tabela `funcionarios` com RLS
2. **`src/pages/Funcionarios.tsx`** — CRUD completo
3. **`src/App.tsx`** — nova rota `/funcionarios`
4. **`src/components/NavBar.tsx`** — novo link
5. **`src/lib/ponto-rules.ts`** — adicionar `maskCPF` e `validateCPF`

