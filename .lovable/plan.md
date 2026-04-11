

## Plano: Eliminar Redundâncias e Reestruturar Workflow

### Problemas Encontrados

**1. Interface `Empresa` duplicada em 5 arquivos**
- `Dashboard.tsx`, `Empresas.tsx`, `Funcionarios.tsx`, `Ponto.tsx`, `Relatorios.tsx` — cada um define sua própria versão de `interface Empresa { id, cnpj, nome, jornada_padrao }`.
- `EmpresaSelector.tsx` também define internamente.

**2. Interface `Funcionario` duplicada em 3 arquivos**
- `Funcionarios.tsx`, `Holerites.tsx`, `FuncionarioSelector.tsx` — cada um com sua versão (campos diferentes).

**3. Seletor de empresa inconsistente**
- `Ponto.tsx`, `Funcionarios.tsx`, `Holerites.tsx` usam `EmpresaSelector` (componente reutilizável).
- `Relatorios.tsx` faz sua própria query de empresas e monta um `Select` manualmente — duplicação desnecessária.

**4. Carregamento de funcionários duplicado**
- `Ponto.tsx` (linhas 156-166) carrega funcionários ao selecionar empresa.
- `FuncionarioSelector.tsx` (linhas 27-40) faz a mesma query independentemente.
- `Holerites.tsx` (linha 49) faz a mesma query novamente.
- Resultado: ao abrir Ponto, a mesma query roda 2x (Ponto + FuncionarioSelector).

**5. Cálculo de mês padrão duplicado**
- `Ponto.tsx` (linhas 134-137) e `Holerites.tsx` (linhas 33-36) têm o mesmo código para gerar `YYYY-MM`.

**6. Workflow confuso — navegação sem contexto**
- O fluxo natural é: Empresa → Funcionários → Ponto → Relatórios → Holerites.
- Mas cada aba começa do zero: o usuário precisa re-selecionar a empresa em cada página.
- Não há persistência da empresa selecionada entre abas.

**7. `Relatorios.tsx` não usa `EmpresaSelector`**
- Monta seu próprio dropdown, quebrando consistência visual.

### O que será feito

#### 1. Criar tipos compartilhados (`src/types/index.ts`)
- Mover `Empresa`, `Funcionario`, `Folha`, `Registro`, `Holerite` para um arquivo central.
- Todos os arquivos importam daqui.

#### 2. Criar contexto de empresa selecionada (`src/contexts/EmpresaContext.tsx`)
- Context React que armazena a empresa ativa.
- Quando o usuário seleciona empresa em qualquer aba, a seleção persiste nas outras.
- `EmpresaSelector` consome e atualiza esse contexto.
- Elimina re-seleção repetida entre abas.

#### 3. Criar helper `currentMonth()` (`src/lib/utils.ts`)
- Função reutilizável para gerar `YYYY-MM` do mês atual.
- Substituir duplicação em `Ponto.tsx` e `Holerites.tsx`.

#### 4. Refatorar `Relatorios.tsx`
- Usar `EmpresaSelector` ao invés do select manual.
- Consumir contexto de empresa.

#### 5. Eliminar query duplicada de funcionários em `Ponto.tsx`
- Remover o carregamento manual em `handleEmpresaChange`.
- Deixar o `FuncionarioSelector` ser a única fonte (já faz a query).
- Expor os funcionários carregados via callback do `FuncionarioSelector`.

#### 6. Adicionar `EmpresaContext.Provider` no `App.tsx`
- Envolver as rotas com o provider.

### Fluxo melhorado

```text
Usuário seleciona empresa em qualquer aba
  ↓
Contexto global armazena seleção
  ↓
Navega para outra aba → empresa já está selecionada
  ↓
Menos cliques, menos confusão
```

### Arquivos criados/alterados

- **`src/types/index.ts`** — tipos compartilhados (novo)
- **`src/contexts/EmpresaContext.tsx`** — contexto global (novo)
- **`src/lib/utils.ts`** — adicionar `currentMonth()`
- **`src/components/EmpresaSelector.tsx`** — integrar com contexto
- **`src/pages/Relatorios.tsx`** — usar `EmpresaSelector` + contexto
- **`src/pages/Ponto.tsx`** — remover query duplicada de funcionários, usar tipos + contexto
- **`src/pages/Funcionarios.tsx`** — usar tipos + contexto
- **`src/pages/Holerites.tsx`** — usar tipos + contexto + `currentMonth()`
- **`src/pages/Dashboard.tsx`** — usar tipos compartilhados
- **`src/App.tsx`** — adicionar `EmpresaProvider`

Sem mudanças no banco de dados.

