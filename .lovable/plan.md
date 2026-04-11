

## Plano: Corrigir "Ler Folha" e Bugs Relacionados

### Problemas Identificados

**1. Estado `funcionarios` nunca é preenchido no Ponto.tsx**
Na refatoração anterior, a query duplicada de funcionários foi removida de `handleEmpresaChange`, mas nenhum callback foi adicionado ao `FuncionarioSelector` para retornar a lista carregada. Resultado: `funcionarios` é sempre `[]`, e o `matchFuncionario()` na linha 214 nunca encontra ninguém.

**2. Sem feedback quando `empresa` não está selecionada**
O botão "Ler Folha" fica desabilitado (`disabled={loading || !empresa}`), mas se o usuário não percebeu que precisa selecionar empresa primeiro, não há mensagem explicativa.

**3. `callAI` usa anon key ao invés do token de sessão do usuário**
A função `callAI` usa `VITE_SUPABASE_PUBLISHABLE_KEY` no header Authorization. Deveria usar o token da sessão ativa via `supabase.auth.getSession()` para consistência e segurança.

**4. Timeout de 55s pode ser insuficiente**
Imagens de câmera mobile podem ser grandes. O processamento pela IA pode demorar. Aumentar para 90s com mensagem clara de progresso.

**5. Console warnings de forwardRef**
`Relatorios`, `NavBar`, e `EmpresaSelector` geram warnings de "Function components cannot be given refs" — não quebra funcionalidade mas polui o console.

### Correções

1. **`FuncionarioSelector.tsx`** — Adicionar prop `onLoadedFuncionarios` (callback) que dispara quando a lista é carregada, para que `Ponto.tsx` receba os funcionários.

2. **`Ponto.tsx`**:
   - Conectar o callback do `FuncionarioSelector` ao estado `funcionarios`
   - Usar `supabase.auth.getSession()` para obter token do usuário no `callAI`
   - Aumentar timeout para 90s
   - Adicionar feedback visual quando empresa não está selecionada

3. **Corrigir warnings de forwardRef** em `EmpresaSelector`, `NavBar` (menor prioridade, mas limpa o console)

### Arquivos alterados
- `src/components/FuncionarioSelector.tsx` — nova prop callback
- `src/pages/Ponto.tsx` — conectar callback, fix auth token, timeout
- `src/components/EmpresaSelector.tsx` — forwardRef fix (se necessário)

