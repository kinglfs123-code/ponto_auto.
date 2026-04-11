

## Plano: Cálculo de Atraso/Extra, Tema Claro e Popup de Exceções

### 1. Ajustar regras de cálculo (`src/lib/ponto-rules.ts`)

**Tolerância de 5 minutos** (atualmente 10):
- Alterar `TOLERANCE_MINUTES` de 10 para 5
- Calcular **minutos de atraso** efetivos: `max(0, entrada_real - entrada_esperada - 5)` e acumular no resumo
- Calcular **horas extras** corretamente: tempo trabalhado além da jornada padrão, considerando saída após horário esperado
- Adicionar campos `atraso_minutos` ao `RegistroPonto` para exibir o atraso exato por dia
- Corrigir `calcularResumo` que atualmente nunca acumula `total_atraso` (linha 222-224 está vazia)

### 2. Tema claro (`src/index.css`)

Adicionar variante `.light` (ou `@media (prefers-color-scheme: light)`) com cores claras:
- Background branco/cinza claro, foreground escuro
- Cards em branco com bordas suaves
- Primary mantém o roxo (#a78bfa) mas mais saturado para contraste em fundo claro
- Adicionar toggle de tema no NavBar (ícone Sol/Lua)
- Criar `src/contexts/ThemeContext.tsx` para persistir preferência em `localStorage`

### 3. Popup de exceções na tabela de registros (`src/pages/Ponto.tsx`)

Na coluna "Exceção" de cada linha da tabela, ao invés de texto simples:
- Adicionar um botão/ícone clicável que abre um **Popover** com 3 opções: "Folga", "Falta", "Atestado"
- Ao selecionar, atualiza `tipo_excecao` do registro e marca `corrigido_manualmente = true`
- Zerar horas normais/extras quando é falta ou atestado
- Exibir badge colorido na célula com o tipo selecionado
- Adicionar "atestado" como novo tipo de exceção reconhecido (cor azul)

### 4. Resumo com atraso

Atualizar os cards de resumo para incluir "Atraso" com o total acumulado em minutos/horas.

### Arquivos alterados

- **`src/lib/ponto-rules.ts`** — tolerância 5min, cálculo de atraso real, campo `atraso_minutos`
- **`src/index.css`** — variáveis do tema claro
- **`src/contexts/ThemeContext.tsx`** — novo contexto de tema (dark/light)
- **`src/components/NavBar.tsx`** — toggle de tema
- **`src/App.tsx`** — ThemeProvider
- **`src/pages/Ponto.tsx`** — popup de exceções, exibição de atraso por linha, badge colorido

Sem mudanças no banco de dados.

