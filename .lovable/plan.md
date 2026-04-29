## Objetivo

Resolver os três problemas apontados:
1. Não há como navegar entre módulos sem voltar à tela de seleção.
2. Barra inferior + título + Voltar geram redundância de função.
3. Botões "Voltar" desalinhados em `/selecionar-modulo` e `/empresas-modulo`.

## Solução: Header Fixo Padronizado (`AppHeader`)

Criar **um único cabeçalho fixo** no topo de toda tela autenticada, com a mesma estrutura:

```text
┌──────────────────────────────────────────────────────────┐
│ ← Voltar    [Financeiro ▾]  Empresa · CNPJ        ⚙     │
└──────────────────────────────────────────────────────────┘
```

- **Esquerda**: `BackButton` (some no Home de cada módulo e em `/selecionar-empresa`).
- **Centro**: Switcher de módulo — chip com nome do módulo atual + chevron, abre Popover com os 3 módulos (RH / Financeiro / Empresas) e atalho "Trocar empresa". Resolve a navegação cruzada sem precisar passar por `/selecionar-modulo`.
- **Direita**: `SettingsMenu` (engrenagem) — hoje só existe em `/selecionar-empresa`; passa a ficar em todas as telas internas (Tema, Sair).

Resultado: alinhamento consistente, navegação direta entre módulos, e o botão Voltar sempre no mesmo lugar visual.

## Redundância da barra inferior

- **Remover o item "Início" da dock** em `NavBarFinanceiro.tsx` e `NavBar.tsx`. O título do header (clicável → leva ao Home do módulo) já cumpre essa função, e o switcher central também.
- A dock passa a conter **apenas ações operacionais** do módulo (Lançar, Contas, Códigos, Fornecedores no Financeiro; equivalente no RH).
- Manter `showBack={false}` no Home de cada módulo (já é o caso no Financeiro) e replicar no RH.

## Alinhamento dos botões "Voltar"

- Remover os blocos `absolute top-4 left-4` de `SelecionarModulo.tsx` e `EmpresasModulo.tsx`.
- O `BackButton` passa a viver dentro do `AppHeader` fixo, alinhado com o restante do conteúdo (mesma `max-w` e padding).

## Arquivos afetados

**Novos**
- `src/components/AppHeader.tsx` — header fixo (Voltar + ModuleSwitcher + SettingsMenu).
- `src/components/ModuleSwitcher.tsx` — chip + Popover com os 3 módulos + "Trocar empresa".

**Editados**
- `src/components/financeiro/FinanceiroLayout.tsx` — usar `AppHeader`, remover bloco header inline e `BackButton` solto.
- `src/components/NavBar.tsx` e `src/components/financeiro/NavBarFinanceiro.tsx` — remover item "Início".
- `src/pages/SelecionarModulo.tsx` e `src/pages/EmpresasModulo.tsx` — remover `absolute` e usar `AppHeader`.
- `src/pages/SelecionarEmpresa.tsx` — usar `AppHeader` (sem switcher, só Settings).
- Páginas RH (`Empresas`, `Funcionarios`, `Ponto`, `Holerites`, `Relatorios`, `FuncionarioDetalhe`, `FolhaDetalhe`) — substituir `BackButton` solto pelo `AppHeader`.
- `src/pages/Dashboard.tsx` (Home RH) — incluir `AppHeader` com `showBack={false}`.

## Detalhes técnicos

- `AppHeader` props: `module?: "rh" | "financeiro" | "empresas" | null`, `showBack?: boolean`, `backFallback?: string`, `title?: string`, `subtitle?: ReactNode`.
- Posicionamento: `sticky top-0 z-40` com `liquid-glass` e `backdrop-blur` para manter a estética iOS 26.
- `ModuleSwitcher`: usa `Popover` (já no projeto) + ícones existentes (`Users`, `Wallet`, `Building2`); destaca o módulo ativo; navega via `react-router`.
- Não toca em lógica de negócio, formatação, OCR, ponto, etc.

## Premissas (ajuste se quiser diferente)

- **Trocar de módulo**: switcher no header de cada módulo (opção 1 da pergunta não respondida).
- **Redundância**: combinar — remover "Início" da dock **e** manter `showBack={false}` no Home (combinação das opções 1 e 2).