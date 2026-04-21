

## Plano: Adicionar exclusão na página Relatórios

A página `/relatorios` lista folhas de ponto (Março, 2026-04) sem opção de excluir. Hoje só permite "Gerar PDF". A exclusão de relatórios gerados já existe, mas a lista está vazia no seu caso.

### O que será adicionado em `src/pages/Relatorios.tsx`

**1. Excluir folha individual**
Em cada nome de funcionário listado dentro do mês (ex: "Nicoly Cristina · rascunho"), adicionar um ícone de lixeira ao lado. Ao clicar:
- Confirma com o usuário
- Apaga `registros_ponto` daquela folha (sem cascade no banco)
- Apaga a `folhas_ponto` correspondente
- Recarrega a lista

**2. Excluir mês inteiro**
No cabeçalho de cada mês (ao lado do botão "Gerar PDF"), adicionar um botão lixeira que:
- Confirma "Excluir todas as folhas de [mês]?"
- Apaga registros + folhas de todos os funcionários daquele mês
- Recarrega

**3. Pequeno ajuste no link**
O `<Link>` envolvendo o nome do funcionário precisa se tornar uma `<div>` com link interno + botão de excluir lado a lado, com `stopPropagation` para o botão não disparar navegação.

### Resumo Técnico

| Item | Mudança |
|---|---|
| Arquivo | `src/pages/Relatorios.tsx` |
| Novas funções | `handleDeleteFolha(folha)`, `handleDeleteMes(mes)` |
| Banco | Sem mudanças — RLS já permite DELETE em `folhas_ponto` e `registros_ponto` |
| UX | Lixeiras vermelhas com `confirm()` antes de apagar; toast de sucesso/erro |

### Comportamento final

- Lista de meses: cada mês ganha um botão lixeira que apaga tudo daquele período.
- Cada funcionário dentro do mês: ganha lixeira individual.
- Relatórios gerados: continua como está (já tem exclusão funcional).

