# Padronizar dock de navegação ao estilo iOS 26

## Objetivo

Alinhar `NavBar` (RH) e `NavBarFinanceiro` ao visual do dock iOS da referência: pill de vidro **sempre visível**, ícones medios, com tamanhos e espaçamentos uniformes entre os dois módulos.

## Mudanças visuais

**Comportamento**

- Remover o "hover-to-reveal" — o dock fica sempre visível (opacity 100, sem translate). O comportamento atual de aparecer só no hover é confuso em desktop e quebra no mobile.
- Manter posição fixa inferior, centralizado, com `safe-area-inset-bottom`.

**Aparência do dock (pill)**

- Continua usando `.liquid-glass` com cantos `rounded-[28px]`.
- Padding interno reduzido: `px-3 py-3`, gap `gap-2` entre itens.

**Ícones (padrão iOS squircle)**

- Cada item do dock vira um **squircle 52×52** (`w-[52px] h-[52px] rounded-[16px]`) com:
  - Fundo colorido por item (gradiente sutil baseado no token semântico — ver tabela abaixo).
  - Ícone Lucide branco, `h-7 w-7`, `strokeWidth={2}` — uniforme em todos os módulos.
  - Sombra interna sutil (highlight no topo) já provida por uma nova classe `.dock-tile`.
- Estado **ativo**: anel/glow ao redor do squircle (`ring-2 ring-primary/60` + `shadow-[0_0_20px_hsl(var(--primary)/0.5)]`) e leve `scale-105`.
- Estado **bloqueado** (apenas RH): opacidade 0.35, dessaturado, com cadeado pequeno sobreposto (mantém o `Lock` atual, mas reposicionado dentro do squircle).
- **Sem labels** abaixo dos ícones — usar apenas `aria-label` e `title` para tooltip nativo. Isso casa com a referência e remove a inconsistência de larguras.

**Cores por item** (tokens HSL já existentes no design system)


| Módulo     | Item          | Cor de fundo          |
| ---------- | ------------- | --------------------- |
| RH         | Empresas      | `--primary` (azul)    |
| RH         | Colaboradores | `--info` (azul claro) |
| RH         | Ponto         | `--warning` (laranja) |
| RH         | Holerites     | `--success` (verde)   |
| RH         | Relatórios    | `--accent` (azul)     |
| Financeiro | Lançar        | `--success` (verde)   |
| Financeiro | Contas        | `--primary` (azul)    |
| Financeiro | Códigos       | `--warning` (laranja) |
| Financeiro | Fornecedores  | `--info` (azul claro) |


Cada cor aplicada como `linear-gradient(180deg, hsl(var(--x)) 0%, hsl(var(--x) / 0.85) 100%)` para o efeito glossy do iOS.

## Arquivos afetados

- `src/index.css` — adicionar utilitário `.dock-tile` (squircle base + highlight) e `.dock-tile-active` (ring/glow). Remover dependência de `.liquid-pill-active` no contexto do dock.
- `src/components/NavBar.tsx` — reescrever markup do item: sem label, squircle colorido, dock sempre visível, manter lógica de `useWorkflowStatus` e prefetch.
- `src/components/financeiro/NavBarFinanceiro.tsx` — mesma estrutura visual, mantendo prefetch e rotas.

Nenhuma rota, estado global, contexto ou lógica de negócio é tocada. Mudança puramente de UI.

## Detalhes técnicos

- A classe `.dock-tile` aceitará uma CSS var `--tile-color` (HSL triplet) para evitar criar uma classe por cor:
  ```css
  .dock-tile {
    width: 52px; height: 52px; border-radius: 16px;
    background: linear-gradient(180deg, hsl(var(--tile-color)) 0%, hsl(var(--tile-color) / 0.82) 100%);
    box-shadow: 0 1px 0 rgba(255,255,255,0.35) inset, 0 6px 14px hsl(var(--tile-color) / 0.35);
    display: inline-flex; align-items: center; justify-content: center;
    transition: transform .2s cubic-bezier(.2,.8,.2,1);
  }
  .dock-tile:hover { transform: translateY(-3px) scale(1.06); }
  ```
- No componente: `style={{ ['--tile-color' as any]: 'var(--primary)' }}` por item.
- Acessibilidade: manter `aria-label`; adicionar `title` para tooltip; foco visível com `focus-visible:ring-2 ring-primary`.
- Mobile (≤640px): manter mesmo tamanho de tile (52px) — cabe confortavelmente nos 5 itens do RH em 360px (5×52 + 4×8 + padding ≈ 308px).

## Fora do escopo

- Não alterar `AppHeader`, `ModuleSwitcher` nem páginas.
- Não mexer em lógica de workflow/lock — apenas reestilizar o estado visual.