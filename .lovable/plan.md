
# Refino da aplicação — bugs, padronização e limpeza

Análise focada nos pontos pedidos: bugs, código não utilizado e refinos. Não altera regras de negócio.

## 1. Bugs e inconsistências encontradas

### 1.1 `Dashboard.tsx` — div vazia
Linha 53: `<div className="animate-fade-in"></div>` é um nó vazio sobrando do refactor anterior. Remover.

### 1.2 `Dashboard.tsx` — Botão `asChild` com filhos múltiplos
No bloco "Quick actions" (linhas 60-96), quando `enabled === true`, o `<Button asChild>` recebe `<Link>` como filho único — ok. Mas o `Link` interno renderiza 3 nós irmãos (`Icon`, `span`, `span` opcional) sem fragmento/wrapper. Isso aciona o aviso do Radix `Slot` ("Children given to Button were... multiple children"). Envolver os filhos do `Link` em `<>...</>` ou `<span className="flex flex-col items-center gap-1.5">`.

### 1.3 `Dashboard.tsx` — `pb-20 md:pb-4` desnecessário
A `NavBar` agora aparece só em hover (já não ocupa espaço fixo). O `pb-20` cria espaço morto no fim. Trocar para `pb-8` (alinha com `FinanceiroLayout` que usa `pb-24` por causa do dock revealed). Decisão: padronizar todas as páginas RH para `pb-24` (igual financeiro) para evitar que o conteúdo fique escondido atrás da dock quando ela aparecer.

### 1.4 `SelecionarEmpresa.tsx` — texto vazio
Linha 36: `<p className="text-muted-foreground text-sm"></p>` — parágrafo vazio. Remover.

### 1.5 `EmpresasModulo.tsx` — `Building2` importado mas o ícone do `AppHeader` já basta
`Building2` é usado dentro do card placeholder, ok — manter. Mas o `useEffect` de redirect deveria também retornar `null` quando `!empresa` (igual ao `SelecionarModulo`), senão o JSX renderiza brevemente sem dados de empresa.

### 1.6 `FuncionarioDetalhe.tsx` — `AppHeader` duplicado
Linhas 740 e 754 — `AppHeader` aparece duas vezes (provavelmente em branches loading/loaded distintos). Confirmar e garantir que só renderiza uma vez por estado. Caso seja intencional (loading skeleton vs conteúdo), manter; caso contrário remover o duplicado.

### 1.7 `FuncionarioDetalhe.tsx` — `formatDate` local duplica `formatDateBR`
Linhas 42-46 reimplementam a mesma lógica de `src/lib/format.ts → formatDateBR`. Remover a função local e importar `formatDateBR`.

### 1.8 `Dashboard.tsx` — `maskCNPJ` em vez de `formatCNPJ`
Linha 8 importa `maskCNPJ` de `@/lib/ponto-rules` quando o padrão definido é `formatCNPJ` de `@/lib/format`. Trocar para o helper canônico (`format.ts` já reexporta `maskCNPJ` como `formatCNPJ`). Mesma situação no `Empresas.tsx` para exibição (a edição/máscara de input continua usando `maskCNPJ`, que é o nome semanticamente correto para input).

### 1.9 `FuncionarioDetalhe.tsx` — `formatMes` local
Linhas 48-51 fazem "YYYY-MM" → "MM/AAAA". Já existe `toBrMonth` em `src/lib/utils.ts`. Trocar pelo util.

## 2. Código não utilizado

### 2.1 `src/components/NavLink.tsx`
Grep confirma **zero imports** no projeto. Arquivo morto desde a refatoração da nav. Deletar.

### 2.2 `SettingsMenu` — prop `showTrocarModulo`
Após o `AppHeader` unificado, `showTrocarModulo` é sempre passado como `false`. O único uso "true" (default) seria standalone. Verificar — se nenhum lugar usa `true`, simplificar removendo a prop e o bloco que a usa (linhas 59-71 do SettingsMenu). Resultado: -15 linhas, menos branches.

### 2.3 `SettingsMenu` — className default com `absolute`
Linha 24: `className = "absolute top-4 right-4 z-40"` é um default legado. Hoje todos os usos passam `className=""` (via `AppHeader`) ou ficam dentro do `SelecionarEmpresa` (que precisa de absoluto, mas pode passar explícito). Trocar default para string vazia e ajustar `SelecionarEmpresa` para passar `className="absolute top-4 right-4 z-40"` explícito — torna o componente menos "mágico".

### 2.4 Imports não usados (rodada de limpeza)
Rodar checagem rápida em `Dashboard.tsx`, `Empresas.tsx`, `Funcionarios.tsx`, `Holerites.tsx`, `Ponto.tsx`, `Relatorios.tsx`, `FolhaDetalhe.tsx`, `FuncionarioDetalhe.tsx` e remover qualquer ícone/util importado mas não referenciado (ex.: ícones que sobraram do header antigo).

## 3. Padronização de formatação

### 3.1 Ponto único de verdade
Manter `src/lib/format.ts` como única fonte para display. Regra:
- **Display de CNPJ** → `formatCNPJ`
- **Máscara em input** → `maskCNPJ` (mesmo símbolo, nome diferente — semântica de input)
- **Display de data DD/MM/AAAA** → `formatDateBR`
- **Mês "MM/AAAA"** → `toBrMonth`

### 3.2 Lugares a ajustar
- `Dashboard.tsx:134` → trocar `maskCNPJ` por `formatCNPJ`
- `Empresas.tsx:241` (display em lista) → trocar `maskCNPJ` por `formatCNPJ` (manter `maskCNPJ` nas linhas 182, 293 que são `onChange` de input)
- `FuncionarioDetalhe.tsx` → usar `formatDateBR` e `toBrMonth` em vez das funções locais

### 3.3 `Login.tsx`
Linha 17 usa `toLocaleDateString("pt-BR", ...)` — verificar se é só para mostrar data atual. Se sim, deixar como está (é um caso isolado de saudação) ou usar `formatDateBR(new Date())` para padronizar.

## 4. AppHeader / Layout

### 4.1 AppHeader — width inconsistente
`AppHeader` usa `max-w-4xl` interno, mas as páginas que o envolvem em `<div className="max-w-4xl mx-auto px-4">` (SelecionarModulo, EmpresasModulo) acabam com double-centering. Como o header já tem `-mx-4` e seu próprio `max-w-4xl mx-auto`, o wrapper externo `max-w-4xl mx-auto px-4` é redundante. Padronizar: o componente que renderiza o header deve passar o header como filho direto do container `max-w-4xl mx-auto p-4`, sem wrapper extra.

### 4.2 SelecionarModulo / EmpresasModulo — chip de empresa fora do header
A "chip" com nome da empresa+CNPJ dentro do conteúdo (linha 50-53 do SelecionarModulo) repete info que o ModuleSwitcher não mostra. Ok manter — mas garantir alinhamento com o resto.

## 5. Lista de mudanças por arquivo

```text
src/components/NavLink.tsx              DELETE  (não usado)
src/components/SettingsMenu.tsx         simplificar: remover showTrocarModulo, default className=""
src/pages/Dashboard.tsx                 fix: div vazia, asChild children, formatCNPJ, pb-24
src/pages/SelecionarEmpresa.tsx         fix: <p> vazio, passar className explícito ao SettingsMenu
src/pages/SelecionarModulo.tsx          fix: remover wrapper redundante max-w-4xl
src/pages/EmpresasModulo.tsx            fix: remover wrapper redundante, retornar null quando !empresa
src/pages/Empresas.tsx                  formatCNPJ no display (linha 241)
src/pages/FuncionarioDetalhe.tsx        remover formatDate/formatMes locais, usar format.ts; conferir AppHeader duplicado
src/pages/Login.tsx                     opcional: usar formatDateBR
```

## 6. Validação após mudanças

1. Build limpo (sem warnings de Slot/asChild)
2. Navegar `/` → `/empresas` → voltar; `/financeiro` → switcher → `/empresas-modulo` → voltar
3. Confirmar dock aparece no hover sem cobrir conteúdo
4. CNPJ e datas exibidos no padrão único em todas as telas
5. Nenhum import órfão (lint)

Sem mudanças em backend, regras de negócio, OCR ou edge functions.
