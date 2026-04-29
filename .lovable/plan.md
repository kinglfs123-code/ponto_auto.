Remover o botão "← Voltar para empresas" da página de seleção de módulo.

## Mudança
- `src/pages/SelecionarModulo.tsx`: remover o bloco final com o `Button` "Voltar para empresas" (e o `import` do `Button` se não houver outro uso). O atalho "trocar" ao lado do CNPJ no topo já cobre essa navegação.