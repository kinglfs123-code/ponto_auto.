
## Plano: botão "Configurações" no dock + popover com tema/sair + refinar tema light

### 1. Dock: substituir as 2 pílulas separadas por 1 botão "Configurações"

Em `src/components/NavBar.tsx`:
- Remover as duas pílulas separadas (tema e sair) que estão logo abaixo do dock principal.
- Acrescentar um **7º item** ao dock principal: **Configurações** (ícone `Settings` do lucide), no mesmo padrão visual dos outros (24px, label de 11px, `liquid-hover`).
- Esse item abre um **Popover** (`@/components/ui/popover`) ancorado nele, posicionado **acima** do dock (`side="top"`, `sideOffset=12`, `align="end"`).
- Conteúdo do popover (também em estilo liquid glass, largura ~240px):
  - Cabeçalho discreto "Configurações".
  - Linha **Tema**: rótulo à esquerda + toggle à direita (Sol/Lua) que chama `toggleTheme()`. Mostra "Claro / Escuro".
  - Separador fino.
  - Botão **Sair** (ícone `LogOut`, texto vermelho/destructive) que chama `supabase.auth.signOut()` e navega para `/login`.
- O popover usa as classes `liquid-glass` + `rounded-2xl`, com `p-2` e itens em `rounded-xl px-3 py-2 gap-3` (grid 8pt).

### 2. Refinar a aparência do tema Light

Em `src/index.css`, ajustes apenas no bloco `.light` e nas regras `liquid-*` para o modo claro:

- **Fundo geral mais suave** (off‑white com leve azul, em vez de cinza chapado):
  - `--background: 220 25% 98%;`
  - `--card: 0 0% 100%;`
  - `--muted: 220 14% 96%;`
  - `--secondary: 220 14% 95%;`
  - `--border: 220 13% 90%;`
  - `--input: 220 13% 90%;`
  - `--muted-foreground: 220 9% 46%;`
- **Glass do tema light** (mais "vidro fosco" estilo iOS, hoje fica meio leitoso demais):
  - `--glass-bg: rgba(255, 255, 255, 0.55);`
  - `--glass-border: rgba(15, 23, 42, 0.08);`
  - `--glass-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);`
- **Liquid glass no light** (override dentro de `.light .liquid-glass`):
  - Gradiente top→bottom de `rgba(255,255,255,0.85)` para `rgba(255,255,255,0.55)`.
  - `box-shadow`: sombra externa suave + brilho interno branco no topo + linha fina escura embaixo.
  - `backdrop-filter: blur(32px) saturate(1.6)`.
- **Pílula ativa no light**: já existe override; ajustar para usar `hsl(var(--primary)/0.10)` no fundo para destacar mais o item ativo (azul tênue) em vez do branco puro atual, melhorando contraste com a pílula clara.
- **Hover no light**: leve fundo `rgba(15,23,42,0.04)` ao passar (acrescentar `.light .liquid-hover:hover` com background sutil), além do `translateY` já existente.

### 3. Detalhes de UX

- O ícone "Configurações" usa o mesmo tratamento de "ativo" quando o popover está aberto (estado controlado: `const [openSettings, setOpenSettings] = useState(false)` aplicando `liquid-pill-active` quando aberto).
- Acessibilidade: `aria-label="Configurações"` no trigger; itens do menu como `<button>` com `aria-label`.
- Mantém safe-area atual do dock; agora há **uma única linha** flutuante embaixo (mais limpo).

### Diagrama do dock final

```text
┌──────────────────────────────────────────────────────────┐
│  Início  Empresas  Colab.  Ponto  Holerites  Relat.  ⚙  │
└──────────────────────────────────────────────────────────┘
                                                        │
                                                ┌───────▼────────┐
                                                │ Configurações  │
                                                │ Tema     ☀/🌙 │
                                                │ ──────────────│
                                                │ ⎋ Sair         │
                                                └────────────────┘
```

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/components/NavBar.tsx` | Remove as 2 pílulas; adiciona item "Configurações" com Popover (tema + sair) |
| `src/index.css` | Refina variáveis e `liquid-*` do tema light (fundo, glass, pílula ativa, hover) |
