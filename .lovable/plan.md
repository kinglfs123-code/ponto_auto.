# Remover ícone acima de "Lançar cobrança"

Na página `Empresas → Cobranças`, no estado vazio (quando não há cobranças no mês), há um ícone `Receipt` (recibo/cifrão) acima da mensagem "Nenhuma cobrança neste mês." e do botão "Lançar cobrança". Vamos remover esse ícone.

## Alteração

### `src/pages/empresas-modulo/Cobrancas.tsx`
- Remover a linha `<Receipt className="h-10 w-10 mx-auto text-muted-foreground" />` (linha 261) dentro do bloco de estado vazio.
- Manter a mensagem e o botão "Lançar cobrança" intactos.
- Remover `Receipt` do import `lucide-react` se não for mais usado em outro lugar do arquivo.

## Não muda
- Cards de resumo (Faturado, Recebido, etc.) no topo permanecem.
- Botão "Nova cobrança" e a lista de cobranças permanecem.
