
## Plano: dock inferior centralizado + controles separados, sem título, com grid Apple 8pt

### O que muda na navegação (desktop e mobile unificados)

1. **Remover** o texto "FOLHA DE PONTO" de todos os lugares (header mobile e barra desktop).
2. **Mover** a navegação principal (Início, Empresas, Colaboradores, Ponto, Holerites, Relatórios) para o **rodapé**, centralizada, em formato de **dock liquid glass** — em desktop e mobile.
3. **Separar** os botões de ação (tema dark/light e sair) em **duas pílulas independentes** no rodapé:
   - Pílula 1: tema (sol/lua)
   - Pílula 2: sair
   - As duas pílulas ficam **separadas** do dock principal (com gap entre elas), também na parte de baixo.
4. **Remover** o header superior por completo (já não há título nem nav lá).

### Layout do rodapé (mesmo em desktop e mobile)

```text
                  ┌───────────────────────────────────────┐
                  │  🏠  🏢  👥  🕐  🧾  📄              │   ← dock principal (centralizado)
                  └───────────────────────────────────────┘
                                                              gap 16px
                              ┌────┐    ┌──────────┐
                              │ 🌙 │    │ ⎋  Sair  │   ← duas pílulas separadas
                              └────┘    └──────────┘
```

- Tudo `fixed bottom-*`, centralizado com `left-1/2 -translate-x-1/2`.
- Linha 1 (dock de navegação) acima da linha 2 (controles), separadas por `gap-3` (12px) ou `gap-4` (16px).
- Em telas muito estreitas, dock e controles podem aparecer na **mesma linha** centralizados; quando não couber, quebram naturalmente em duas linhas centradas (`flex-wrap justify-center`).

### Padrão Apple 8pt aplicado a TODAS as abas/ícones

Aplico múltiplos de 8 (com 4 permitido como meio-passo) em todos os pontos de navegação:

**Dock principal (NavBar)**
- Padding interno do container dock: `px-2 py-2` (8px).
- Cada item: `px-3 py-2` (12/8) — toque mínimo confortável.
- Ícone: `h-6 w-6` (24px, múltiplo de 8).
- Gap entre item e label: `gap-1` (4px).
- Label: `text-[11px]` com `leading-4` (16px).
- Gap entre itens do dock: `gap-1` (4px) — ritmo visual igual ao dock do iOS.
- Raio do dock: `rounded-[28px]` (múltiplo de 4, look iOS).
- Raio da pílula ativa: `rounded-2xl` (16px).
- Distância do fundo da tela: `bottom-4` (16px) + `env(safe-area-inset-bottom)`.

**Pílulas de controle (tema / sair)**
- Padding: `px-3 py-2` (12/8).
- Ícone: `h-5 w-5` (20px) — secundário, menor que os do dock.
- Gap interno (sair, com label): `gap-2` (8px).
- Gap entre as duas pílulas: `gap-3` (12px).

**Tabs internas (`src/components/ui/tabs.tsx`) — Resumo / Folhas / Holerites / Documentos / Férias**
- `TabsList`: `p-2` (8px), `gap-1` (4px) entre triggers, `rounded-[22px]`.
- `TabsTrigger`: `px-4 py-2` (16/8), `text-sm`, `rounded-2xl`, ícone (quando houver) `h-5 w-5` com `gap-2`.
- Ativo: `liquid-pill-active` (já existe).

**Safe area / bordas**
- Dock e controles respeitam `env(safe-area-inset-bottom)` no mobile.
- Margem horizontal mínima de **16px** das bordas da tela (regra Apple).
- Conteúdo principal (`<main>`) ganha `pb-32` (128px) para nunca ficar coberto pelo dock + linha de controles.

### Comportamento responsivo

- **Mobile (< 768px)**: dock e controles no rodapé como descrito; sem header.
- **Desktop (≥ 768px)**: mesmo layout — também no rodapé, centralizado. Some a top bar atual.
- O dock encolhe naturalmente: em telas muito largas mantém o tamanho compacto centralizado (não estica).

### Arquivos

| Arquivo | Mudança |
|---|---|
| `src/components/NavBar.tsx` | Remove header/top bar e título "FOLHA DE PONTO". Cria dock inferior único + duas pílulas separadas (tema, sair). Mesmo render para mobile e desktop. Aplica espaçamentos múltiplos de 8. |
| `src/components/ui/tabs.tsx` | Ajusta `TabsList`/`TabsTrigger` para padding/gap múltiplos de 8 e ícone 20px. |
| `src/App.tsx` (ou layout que envolve `<main>`) | Adiciona `pb-32` no container de conteúdo para liberar espaço do dock+controles. |
| `src/index.css` | Sem novas utilidades (reusa `.liquid-glass`, `.liquid-pill-active`, `.liquid-hover`). Pequeno ajuste de raio se necessário. |

### Resultado esperado

- Sem título no topo, sem barra superior.
- Um dock translúcido único embaixo, centralizado, com os 6 ícones de navegação no padrão iOS.
- Logo abaixo (ou ao lado em telas largas), duas pílulas separadas: tema e sair.
- Espaçamentos consistentes em múltiplos de 8 em todos os ícones e abas internas.
- Respeita safe area e mantém o look "liquid glass" do dock do macOS/iOS.
