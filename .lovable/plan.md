

## Plano: Melhorar a Experiencia UI

### Problemas identificados

1. **Página Index.tsx (883 linhas)** usa inline styles com cores hardcoded, fora do design system — parece uma app diferente do resto
2. **NavBar** é funcional mas muito simples no mobile (393px) — ícones apertados, sem branding
3. **Falta de hierarquia visual** — todas as páginas são listas planas sem transições ou estados vazios bem desenhados
4. **Login** é funcional mas sem personalidade — card genérico sem logo ou identidade
5. **Tabelas de ponto** são difíceis de ler no mobile (min-width 700px forçando scroll)

### O que será feito

#### 1. Remover a página Index.tsx legada
A página `Index.tsx` (a versão antiga com inline styles) não é mais usada — o `Dashboard` é a rota `/`. Remover o import e o arquivo morto para evitar confusão.

#### 2. Redesenhar o NavBar com sidebar mobile
- No desktop: manter barra horizontal com logo "Folha de Ponto" à esquerda
- No mobile (< 768px): substituir por um **bottom navigation bar** fixo com 5 ícones (Início, Empresas, Funcionários, Ponto, Relatórios) — padrão de apps mobile
- Botão "Sair" fica no header do mobile como ícone pequeno
- Ícone ativo com cor primária e label visível

#### 3. Melhorar o Login
- Adicionar gradiente sutil no fundo (usando as cores do design system)
- Logo/ícone estilizado no topo
- Animação de fade-in no card
- Botão de login com Google (já integrado com auth)

#### 4. Melhorar o Dashboard
- Cards de métricas com ícones maiores e gradientes sutis
- Ações rápidas mais proeminentes
- Estado vazio com ilustração simples e CTA claro
- Animação de entrada nos cards (staggered fade-in)

#### 5. Melhorar tabelas no mobile
- Na página Ponto: no mobile, trocar tabela por **cards empilhados** (cada dia = 1 card com os horários em grid 2x3)
- Manter tabela no desktop
- Usar `useIsMobile()` hook existente para alternar

#### 6. Micro-interações e polish
- Transições suaves entre páginas (fade-in nos containers)
- Hover effects nos cards e botões
- Loading states com skeleton ao invés de "..."
- Toast notifications com ícones
- Scroll suave

### Detalhes técnicos

**Arquivos modificados:**
- `src/components/NavBar.tsx` — bottom nav mobile + header desktop refinado
- `src/pages/Login.tsx` — redesign visual com gradiente e animação
- `src/pages/Dashboard.tsx` — cards melhorados, animações
- `src/pages/Ponto.tsx` — cards mobile para tabela, loading skeleton
- `src/pages/Empresas.tsx` — polish visual
- `src/pages/Funcionarios.tsx` — polish visual
- `src/index.css` — utilitários de animação adicionais
- Deletar `src/pages/Index.tsx` (página legada não utilizada)

**Sem mudanças no banco de dados ou edge functions.**

