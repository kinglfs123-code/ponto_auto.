## Objetivo
Após salvar um lançamento com sucesso, redirecionar para a página inicial do Financeiro (`/financeiro`) em vez de apenas limpar o formulário.

## Mudança
Em `src/pages/financeiro/LancamentoRapido.tsx`, na função `submit`, depois do `toast({ title: "Lançamento criado" })` e da invalidação das queries, trocar a chamada `reset()` por `navigate("/financeiro")`.

```text
toast(...) → invalidateQueries → navigate("/financeiro")
```

A função `reset()` pode ser removida, já que não será mais usada (o componente desmonta ao navegar).

### Arquivo
- editar `src/pages/financeiro/LancamentoRapido.tsx`

Sem mudanças em banco de dados ou em outros componentes.