# Remover texto do email/nome no Login

Remover o `<p>` que mostra o email digitado (ou "Entrar") logo abaixo do avatar na tela de login.

## Alterações

### `src/pages/Login.tsx`
- Remover o bloco `<p>` (linhas ~95-100) que renderiza `{displayName}`.
- Remover a variável `displayName` (não terá mais uso).
- Manter o avatar com a inicial e o restante do formulário inalterados.

## Não muda
- Avatar com inicial (`initial`) continua funcionando normalmente.
- Inputs de email/senha, botão de entrar e toggle signup/login permanecem iguais.
