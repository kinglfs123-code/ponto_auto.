

## Plano: Workflow Guiado com Etapas Travadas

### Conceito

O fluxo principal da aplicação segue uma sequência lógica:
1. **Cadastrar Empresa** (precisa ter pelo menos 1 empresa)
2. **Cadastrar Funcionários** (precisa ter funcionários vinculados à empresa)
3. **Importar Ponto** (precisa de empresa + funcionários)
4. **Holerites / Relatórios** (precisa de folhas de ponto importadas)

A navegação pela barra inferior (mobile) e superior (desktop) deve **bloquear visualmente** etapas que ainda não podem ser acessadas, guiando o usuário pela ordem correta.

### Alterações

#### 1. Criar hook `useWorkflowStatus` (`src/hooks/use-workflow-status.ts`)
- Consulta o banco para verificar:
  - `temEmpresa`: existe pelo menos 1 empresa
  - `temFuncionario`: existe pelo menos 1 funcionário
  - `temFolha`: existe pelo menos 1 folha de ponto
- Retorna um mapa de rotas habilitadas/desabilitadas
- Cache com React Query para não repetir consultas a cada render

#### 2. Atualizar `NavBar.tsx`
- Importar `useWorkflowStatus`
- Links desabilitados ficam com **opacidade reduzida** e **cursor not-allowed**
- Ao clicar em link travado, exibe toast explicando o pré-requisito (ex: "Cadastre uma empresa primeiro")
- Ícone de cadeado pequeno no link travado

#### 3. Atualizar `Dashboard.tsx`
- Botões de ação rápida também respeitam o workflow
- Botões travados ficam desabilitados com tooltip explicativo
- Destaque visual no próximo passo recomendado (borda primary pulsante)

#### 4. Regras de bloqueio

```text
Rota              Requisito
─────────────────────────────────
/                 Sempre acessível
/empresas         Sempre acessível
/funcionarios     temEmpresa = true
/ponto            temFuncionario = true
/holerites        temFolha = true
/relatorios       temFolha = true
```

### Arquivos alterados
- **`src/hooks/use-workflow-status.ts`** — novo hook
- **`src/components/NavBar.tsx`** — links condicionais
- **`src/pages/Dashboard.tsx`** — ações rápidas condicionais com destaque no próximo passo

Sem mudanças no banco de dados.

