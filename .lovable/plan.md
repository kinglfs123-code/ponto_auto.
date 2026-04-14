

## Plano: Melhorias funcionais + redesign iOS 26

### 1. Relatórios — botão Excluir

Adicionar botão de exclusão (ícone lixeira) em cada relatório gerado. Ao clicar, exclui o registro da tabela `relatorios` e o arquivo do bucket Storage. Aparecerá ao lado do botão "Download".

### 2. Holerites — carregamento automático

Remover o botão "Carregar". Chamar `loadData()` automaticamente via `useEffect` sempre que `empresaId` ou `mesRef` mudarem.

### 3. Holerites — botão Excluir PDF

Adicionar botão "Excluir PDF" entre "Anexar PDF" e "Enviar". Ao clicar, remove o arquivo do bucket `holerites` e deleta o registro da tabela `holerites`.

### 4. Folha de Ponto — remover campo Jornada

Remover o input "Jornada" desabilitado do formulário de importação (linhas 417-420 de Ponto.tsx). O valor continuará sendo usado internamente nos cálculos.

### 5. Empresas — edição inline

Ao clicar em uma empresa, abrir um Dialog/modal com os campos Nome, CNPJ e Jornada preenchidos, permitindo edição e salvamento via `supabase.from("empresas").update(...)`.

### 6. Redesign visual inspirado no iOS 26

Atualizar toda a aparência para refletir o design language do iOS 26 (Liquid Glass):

- **Paleta de cores**: Ajustar variáveis CSS em `index.css` — dark mode com tons mais suaves e translúcidos, light mode com fundos off-white e cards com efeito glass
- **Cards**: `backdrop-blur-xl`, bordas translúcidas (`border-white/10` dark, `border-black/5` light), sombras difusas
- **Botões**: Cantos mais arredondados (`rounded-2xl`), estilo glass para botões secundários, primários com gradiente sutil
- **NavBar**: Efeito glass acentuado (`bg-white/60 dark:bg-black/40 backdrop-blur-2xl`), ícones com SF Symbols style
- **Bottom bar mobile**: Ícones maiores, labels mais leves, fundo glass com blur intenso
- **Inputs**: Bordas mais suaves, fundo translúcido, focus ring com glow sutil
- **Tipografia**: Pesos mais variados (semibold para títulos, regular para body), tracking mais apertado
- **Animações**: Transições spring-like mais suaves

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/index.css` | Paleta iOS 26, variáveis glass, animações |
| `src/components/NavBar.tsx` | Glass effect, layout iOS 26 |
| `src/components/ui/button.tsx` | Rounded-2xl, glass variants |
| `src/components/ui/card.tsx` | Glass backdrop, bordas translúcidas |
| `src/components/ui/input.tsx` | Estilo translúcido |
| `src/pages/Relatorios.tsx` | Botão excluir relatório |
| `src/pages/Holerites.tsx` | Auto-load, botão excluir PDF |
| `src/pages/Ponto.tsx` | Remover campo jornada |
| `src/pages/Empresas.tsx` | Modal de edição |
| `src/pages/Dashboard.tsx` | Ajustes visuais iOS 26 |
| `src/pages/Funcionarios.tsx` | Ajustes visuais iOS 26 |
| `src/pages/Login.tsx` | Ajustes visuais iOS 26 |

