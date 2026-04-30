
# DRE — Limpeza, navegação por mês e revisão de vínculos

## 1. Remover TODAS as "Linha livre"

Linhas a remover de `src/lib/dre-categories.ts` (e suas referências nas fórmulas dos subtotais):

| Código | Seção |
|--------|-------|
| 1.03, 1.04, 1.05, 1.06 | Receita Bruta |
| 4.04, 4.05, 4.06, 4.07 | Impostos sobre Vendas |
| 5.07.04, 5.07.05 | Impostos sobre compras |
| 5.10.20 | Pessoal prod. fixo |
| 8.10 | Pessoal comercial var. (seção inteira será removida) |
| 9.15, 9.16, 9.17, 9.18 | Pessoal comercial fix. (seção inteira será removida) |
| 11.04, 11.05, 11.06 | Concessionárias |
| 13.02, 13.03 | Marketing |
| 14.04–14.09 | Serviços de Terceiros |
| 18.01–18.04 | Desp. Financeiras Variáveis |
| 20.03 | Outras Receitas |
| 21.03 | Outras Despesas |

## 2. Remover seções 8.00 e 9.00 inteiras

- Remover o subtotal `8.00` e todos os itens `8.01`–`8.09`
- Remover o subtotal `9.00` e todos os itens `9.01`–`9.14`
- Atualizar a fórmula do `16.00 (EBIT)`: remover `"-8.00"` e `"-9.00"`

## 3. Remover seção 18.00 (Desp. Financeiras Variáveis)

Todos os itens são "Linha livre". Remover subtotal e itens. Nenhuma fórmula referencia 18.00 (o 22.00 já referencia `-18.00`, será removido de lá).

## 4. Navegação por mês (scroll)

Na tabela mensal (`Mensal.tsx`), adicionar uma barra de atalhos de scroll com os 12 meses na parte superior. Ao clicar em "Jan", "Fev", etc., a tabela faz scroll horizontal até a coluna correspondente. Mantém a tabela completa com todos os meses visíveis.

## 5. Revisão completa dos vínculos `auto_from` vs item_codes existentes

Códigos `auto_from` cadastrados na DRE vs item_codes reais no banco:

| DRE code | auto_from | Existe em item_codes? | Tem payables? |
|----------|-----------|----------------------|---------------|
| 201 (Simples) | `["201"]` | **Não** | Não |
| 301 (Matéria-Prima) | `["301"]` | **Sim** | **Sim** |
| 302 (ICMS) | `["302"]` | **Não** | Não |
| 303 (Gás) | `["303"]` | **Não** | Não |
| 304 (Energia) | `["304"]` | **Não** | Não |
| 305 (Água) | `["305"]` | **Não** | Não |
| 401 (Comissões) | `["401"]` | **Não** | Não |
| 402 (Entregas) | `["402"]` | **Não** | Não |
| 403 (Couvert) | `["403"]` | **Não** | Não |
| 498 (Taxas Cartão) | `["498"]` | **Não** | Não |
| 499 (Outras Desp. Var.) | `["499"]` | **Não** | Não |
| 501 (Folha Pgto) | `["501"]` | **Sim** | Não |
| 502 (Encargos) | `["502"]` | **Não** | Não |
| 503 (Pró-labore) | `["503"]` | **Não** | Não |
| 599 (Provisão 13º) | `["599"]` | **Não** | Não |
| 601–612 | `["601"]`–`["612"]` | **611, 612 sim** | Não |
| 699 (Outras Adm) | `["699"]` | **Não** | Não |
| 701 (Rec. Financeiras) | `["701"]` | **Não** | Não |
| 702–704 | `["702"]`–`["704"]` | **Não** | Não |
| 799 (Outras Fin.) | `["799"]` | **Não** | Não |

**Ação**: Manter todos os `auto_from` como estão. Eles funcionam como mapeamento. Quando o usuário cadastrar o item_code correspondente no Financeiro e lançar payables, os valores serão puxados automaticamente. Não há erro — é por design.

## Arquivos alterados

| Arquivo | O que muda |
|---------|-----------|
| `src/lib/dre-categories.ts` | Remove linhas livres, seções 8, 9, 18 e atualiza fórmulas |
| `src/pages/dre/Mensal.tsx` | Adiciona barra de atalhos de scroll por mês |
| `src/pages/dre/Anual.tsx` | Nenhuma mudança estrutural (já consome DRE_CATEGORIES) |

Nenhuma migração de banco necessária — são apenas mudanças de apresentação.
