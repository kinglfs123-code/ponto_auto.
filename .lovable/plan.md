# Remover "Adicionar empresa" do módulo RH

A criação/listagem de empresas deve ficar **apenas no fluxo inicial pós-login** (`/selecionar-empresa`, que já tem os botões "Nova empresa" e "Cadastrar primeira empresa"). No módulo de Recursos Humanos, todos os pontos de entrada para gerenciar empresas serão removidos.

## Alterações

### 1. `src/components/NavBar.tsx` (dock inferior do RH)
- Remover o item `{ to: "/empresas", label: "Empresas", icon: Building2, ... }` do array `links`.
- Remover o prefetcher `"/empresas"` do objeto `prefetchers`.
- Remover o import `Building2` se não for mais usado.

### 2. `src/pages/Dashboard.tsx` (home do RH)
- Remover o quick action `{ to: "/empresas", label: "Nova empresa", icon: Building2 }` do array `quickActions` (a grade passa de 4 para 3 colunas em `sm:`).
- No estado vazio do card "Suas Empresas", remover o botão "Cadastrar empresa" (manter apenas a mensagem "Nenhuma empresa cadastrada", orientando o usuário a voltar à seleção de empresa).
- Remover do `getNextStep` o redirect `if (!workflow.temEmpresa) return "/empresas";` (substituir por `return null` quando não houver empresa, já que esse fluxo agora vive fora do RH).
- Limpar imports não usados (`Building2`, `Plus` se aplicável).

### 3. Rota `/empresas`
- **Manter** a rota `/empresas` ativa em `src/App.tsx` — ela continua sendo usada pelos botões em `SelecionarEmpresa.tsx` ("Nova empresa" / "Cadastrar primeira empresa"). Apenas removemos os pontos de entrada dentro do RH.

## Não muda
- `src/pages/SelecionarEmpresa.tsx` — continua com os botões para cadastrar empresa.
- `src/pages/Empresas.tsx` — página de cadastro permanece acessível via seleção de empresa.
- Outros módulos (Financeiro, CMV, Empresas-módulo) — sem alteração.
