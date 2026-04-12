
## Plano: Adaptar Design System Apple/Inter/Notion ao Projeto

### Resumo
Trocar a paleta roxa atual pela paleta azul Apple (#007AFF), atualizar tipografia para SF Pro Display, ajustar border-radius, sombras e adicionar cores semânticas de ponto.

### Alterações

#### 1. `src/index.css` — CSS Variables (dark + light)
- **Primary**: roxo → azul Apple `#007AFF` (HSL: `211 100% 50%`)
- **Dark mode** (`:root`): backgrounds `#000000`, `#1C1C1E`, `#2C2C2E`; text `#FFFFFF`, `#EBEBF5`
- **Light mode** (`.light`): backgrounds `#FFFFFF`, `#F5F5F7`, `#EFEFF4`; text `#000000`, `#3C3C43`
- **Status**: success `#34C759`, warning `#FF9500`, destructive `#FF3B30`
- **Semânticas**: adicionar variáveis `--falta`, `--folga`, `--atestado`, `--feriado`
- **Border**: dark `#2C2C2E`, light `#D1D1D6`
- **Radius**: `0.625rem` (10px base)
- **Font-family**: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif`
- **Sombras**: Apple-style sutis via variáveis `--shadow-sm`, `--shadow-base`, `--shadow-md`

#### 2. `tailwind.config.ts`
- Adicionar `fontFamily.sans` com SF Pro stack
- Adicionar `fontFamily.mono` com SF Mono stack
- Adicionar cores semânticas: `info`, `falta`, `folga`, `atestado`, `feriado`
- Adicionar `boxShadow` customizados (sm, base, md, lg)
- Adicionar `transitionTimingFunction` com `apple` cubic-bezier
- Border radius Apple: sm=6px, base=10px, md=12px, lg=16px, xl=20px

#### 3. `src/pages/Ponto.tsx` — Badges semânticos
- Atualizar `excecaoBadge` para usar as novas cores semânticas (falta=vermelho, folga=azul claro, atestado=laranja, feriado=verde)

#### 4. `src/components/NavBar.tsx` — Tipografia
- Header text usa `font-sans` (SF Pro) ao invés de `font-mono`

#### 5. `src/pages/Dashboard.tsx` — Sombras e radius
- Cards usam `shadow-base` e radius Apple

#### 6. Cleanup `src/App.css`
- Remover estilos legados não utilizados (logo spin, read-the-docs)

### Arquivos alterados
- **`src/index.css`** — paleta completa dark/light
- **`tailwind.config.ts`** — font, cores semânticas, sombras, radius
- **`src/pages/Ponto.tsx`** — badges com cores novas
- **`src/components/NavBar.tsx`** — font-family
- **`src/pages/Dashboard.tsx`** — sombras Apple
- **`src/App.css`** — limpeza

Sem mudanças no banco de dados.
