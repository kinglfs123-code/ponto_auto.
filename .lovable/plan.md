

## Plano: aplicar visual "Liquid Glass" (estilo dock do macOS) nas barras de navegação

### Onde
1. **`src/components/NavBar.tsx`** — barra superior (desktop) e barra inferior (mobile), além do header mobile.
2. **`src/components/ui/tabs.tsx`** — `TabsList` / `TabsTrigger` (usado nas abas de Colaborador: Resumo, Folhas, Documentos, Férias…).
3. **`src/index.css`** — novas utilidades `.liquid-glass` e `.liquid-pill` para reproduzir o efeito do dock.

Não mexo em outras telas: o app já usa `glass`/`glass-subtle` por toda parte; a mudança é centralizada nos botões de navegação.

### Visual de referência (macOS dock)
- Cápsula com bordas bem arredondadas (~24–28px), fundo translúcido com forte blur + saturação.
- Borda interna fina clara + sombra externa difusa pra "flutuar".
- Highlight sutil no topo (gradiente branco→transparente) que dá a sensação de vidro.
- Item ativo: pílula clara com leve ampliação e sombrinha; hover: leve "pop" (scale-105) com brilho.
- Ícones coloridos preservam contraste; rótulo só aparece em ativo (mobile) ou em todos (desktop, como hoje).

### Mudanças no CSS (`src/index.css`)
Adicionar ao bloco `@layer utilities`:

```css
.liquid-glass {
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--glass-bg) 70%, white 12%) 0%,
    var(--glass-bg) 100%);
  border: 1px solid var(--glass-border);
  box-shadow:
    0 10px 30px rgba(0,0,0,0.25),
    0 1px 0 rgba(255,255,255,0.18) inset,
    0 -1px 0 rgba(0,0,0,0.15) inset;
  backdrop-filter: blur(28px) saturate(1.9);
  -webkit-backdrop-filter: blur(28px) saturate(1.9);
  border-radius: 22px;
}

.liquid-pill-active {
  background: linear-gradient(180deg,
    rgba(255,255,255,0.18),
    rgba(255,255,255,0.06));
  box-shadow:
    0 4px 14px rgba(0,0,0,0.22),
    0 1px 0 rgba(255,255,255,0.35) inset;
  border-radius: 16px;
}

.liquid-hover { transition: transform .25s cubic-bezier(.2,.8,.2,1), background-color .2s; }
.liquid-hover:hover { transform: translateY(-2px) scale(1.05); }
```

(Usa as variáveis `--glass-bg` / `--glass-border` que já existem nos temas light e dark.)

### Mudanças no `NavBar.tsx`
- **Mobile bottom nav**: trocar `glass border-t` por **dock flutuante**: container `fixed bottom-3 left-1/2 -translate-x-1/2` com `liquid-glass` (cápsula que não ocupa toda a largura). Itens ganham `liquid-hover`; ativo recebe `liquid-pill-active` + ícone com `drop-shadow` colorido.
- **Mobile header**: mantém `sticky` mas usa `liquid-glass` com cantos inferiores arredondados.
- **Desktop top nav**: o `<div>` com os links vira uma **pílula** independente (`liquid-glass` + `px-2 py-1.5 rounded-full`), centralizada; cada link com `liquid-hover` e ativo usando `liquid-pill-active` no lugar do atual `bg-primary/12`.
- Botões de tema/sair também ficam dentro de uma pílula `liquid-glass` no canto direito (desktop) e no header (mobile).
- Mantém toda a lógica existente (`workflow`, `enabled`, `Lock`, `handleNavClick`).

### Mudanças no `tabs.tsx`
- `TabsList`: remover `bg-muted`, aplicar `liquid-glass rounded-2xl p-1.5`.
- `TabsTrigger`: ativo passa de `bg-background` para `liquid-pill-active text-foreground`; inativo `text-muted-foreground hover:text-foreground`. Adicionar `liquid-hover`.
- Reflete automaticamente nas abas de `FuncionarioDetalhe` (Resumo/Folhas/Documentos/Férias) sem alterar a página.

### Compatibilidade
- Funciona em dark e light (usa as variáveis CSS já tematizadas).
- `backdrop-filter` tem fallback automático: navegadores sem suporte caem para o `background` translúcido — visual aceitável.
- Sem mudança de comportamento, apenas estética. Sem novos pacotes.

### Arquivos
| Arquivo | Mudança |
|---|---|
| `src/index.css` | Adiciona utilidades `.liquid-glass`, `.liquid-pill-active`, `.liquid-hover` |
| `src/components/NavBar.tsx` | Top bar desktop e bottom bar mobile viram pílulas dock; header mobile com liquid glass |
| `src/components/ui/tabs.tsx` | `TabsList`/`TabsTrigger` com visual dock liquid glass |

### Resultado esperado
Navegação principal (topo no desktop, dock inferior no mobile) e abas internas com a mesma cara de cápsula de vidro do dock do macOS mostrado na referência: translúcido, com brilho no topo, item ativo destacado como pílula clara e leve animação de "pop" no hover.

