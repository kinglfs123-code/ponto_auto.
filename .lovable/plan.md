## Mudanças

### 1. CMV — Home (`src/pages/cmv/Home.tsx`)
Remover a grade de botões "Abrir tabela mensal" e "Lançar boleto (cód. 301)". A navegação para a tabela continua disponível pela barra inferior (NavBarCmv).

### 2. CMV — Cards de resumo (`src/components/cmv/CmvSummaryCards.tsx`)
Remover o bloco lateral "Total vendas / Compras" que aparece ao lado do CMV %. O card grande passa a mostrar apenas o CMV % e a meta, ocupando a largura inteira.

### 3. Seleção de módulo (`src/pages/SelecionarModulo.tsx`)
Remover o título "Escolha o módulo". O chip com nome/CNPJ da empresa permanece, e os 4 cards de módulo aparecem logo abaixo.

### 4. Wallpaper personalizado (upload) — apenas telas de seleção/login
Adicionar suporte a um wallpaper escolhido pelo usuário, aplicado apenas em:
- `/login`
- `/selecionar-empresa`
- `/selecionar-modulo`

**Implementação:**
- Novo `WallpaperContext` (`src/contexts/WallpaperContext.tsx`) que guarda a imagem em `localStorage` (data URL) e expõe `wallpaper`, `setWallpaper(file)`, `clearWallpaper()`.
- Provider montado no `App.tsx` junto com `ThemeProvider`.
- Novo componente `WallpaperBackground` que renderiza um `div` `fixed inset-0 -z-10` com `background-image` quando há wallpaper, com leve overlay para legibilidade.
- Inserir `<WallpaperBackground />` nas três páginas acima.
- No `SettingsMenu`, adicionar duas ações abaixo de "Tema":
  - "Wallpaper" → abre seletor de arquivo (input `file` oculto, `accept="image/*"`); ao escolher, lê como data URL e salva no contexto.
  - Quando há wallpaper salvo, aparece também "Remover wallpaper".
- Limite de tamanho: redimensionar/comprimir client-side via `<canvas>` para no máx. 1920px de largura e qualidade 0.82 antes de salvar, evitando estourar o `localStorage`.

Sem mudanças no banco de dados (armazenamento local apenas, conforme escolhido).

## Arquivos afetados

- `src/pages/cmv/Home.tsx` — remover bloco de botões
- `src/components/cmv/CmvSummaryCards.tsx` — remover totais laterais
- `src/pages/SelecionarModulo.tsx` — remover título "Escolha o módulo"
- `src/contexts/WallpaperContext.tsx` *(novo)*
- `src/components/WallpaperBackground.tsx` *(novo)*
- `src/App.tsx` — montar `WallpaperProvider`
- `src/pages/Login.tsx`, `src/pages/SelecionarEmpresa.tsx`, `src/pages/SelecionarModulo.tsx` — incluir `<WallpaperBackground />`
- `src/components/SettingsMenu.tsx` — itens "Wallpaper" e "Remover wallpaper"