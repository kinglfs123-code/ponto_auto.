

## Plano: Vincular Funcionários Cadastrados à Folha de Ponto

### O que será feito

Quando o usuário seleciona uma empresa na página de Ponto, o sistema carrega automaticamente os funcionários cadastrados dessa empresa. O campo "Funcionário" vira um dropdown com os nomes cadastrados. Ao selecionar um funcionário, o sistema aplica automaticamente seu horário individual de entrada/saída nas regras de tolerância e cálculos, ao invés de usar apenas a jornada padrão da empresa.

Na leitura por IA (OCR), o sistema tenta fazer match do nome retornado pela IA com os funcionários cadastrados (busca fuzzy por similaridade), vinculando automaticamente.

### Alterações

#### 1. `src/pages/Ponto.tsx`
- Substituir o campo de texto "Funcionário" por um combo: dropdown dos funcionários da empresa + opção de digitar nome manualmente (para casos não cadastrados)
- Ao selecionar empresa, buscar funcionários via `supabase.from("funcionarios").select(...).eq("empresa_id", id)`
- Ao selecionar um funcionário do dropdown, preencher automaticamente o nome e usar `horario_entrada`/`horario_saida` dele como parâmetros para `applyToleranceAndDetect`
- No OCR: após receber `result.nome` da IA, fazer match fuzzy com os funcionários carregados (normalizar nomes, comparar sem acentos/maiúsculas) e selecionar automaticamente se confiança alta
- Adicionar `funcionario_id` opcional ao estado, e salvá-lo na `folhas_ponto` se disponível

#### 2. `src/lib/ponto-rules.ts`
- Adicionar função `matchFuncionario(nome: string, lista: Funcionario[]): Funcionario | null` que faz busca por similaridade (normalização + includes/startsWith)

#### 3. Migration SQL
- Adicionar coluna `funcionario_id uuid REFERENCES funcionarios(id)` (nullable) à tabela `folhas_ponto`, para vincular a folha ao funcionário cadastrado

#### 4. `src/components/FuncionarioSelector.tsx` (novo)
- Componente dropdown reutilizável que recebe `empresa_id`, carrega funcionários e permite selecionar ou digitar nome manual
- Retorna `{ id, nome_completo, horario_entrada, horario_saida }` ou apenas o nome digitado

### Fluxo

```text
Seleciona empresa → Carrega funcionários da empresa
  ↓
Seleciona funcionário (dropdown) → Preenche nome + horários individuais
  ↓
Importa folha (arquivo ou IA) → Match automático do nome
  ↓
Cálculos usam horário do funcionário (não só jornada da empresa)
  ↓
Salva folha vinculada ao funcionario_id
```

### Arquivos
- **Nova migration** — coluna `funcionario_id` em `folhas_ponto`
- **`src/components/FuncionarioSelector.tsx`** — novo componente
- **`src/pages/Ponto.tsx`** — integração com funcionários
- **`src/lib/ponto-rules.ts`** — função de match fuzzy

