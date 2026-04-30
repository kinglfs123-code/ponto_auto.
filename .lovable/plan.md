# Ajustar DRE — estrutura 100% da planilha + faixas neutras por bloco

## Objetivo

1. Renomear/adicionar/remover linhas em `src/lib/dre-categories.ts` para bater **exatamente** com a planilha `DRE_p_automação-2.xlsx` (incluindo o bloco final de Movimentação de Caixa).
2. Aplicar **faixas neutras por bloco** nas tabelas Mensal e Anual: cada bloco (Receita, Deduções, Impostos, CMV, Despesas, EBIT, Financeiras, Lucro, Movimentação de Caixa) ganha um tom de cinza/azul suave em sua linha de subtotal, mantendo o estilo Liquid Glass.

## Estrutura final de linhas (espelho da planilha)

```
1.00 (=) Receita Bruta
  1.01 (+) Vendas Varejo
  1.02 (+) Vendas Empresas
  1.03–1.06 (+) Linhas livres

2.00 (-) Deduções de Vendas (var)
  2.01 (-) Devoluções
  2.02 (-) Perdas de Inadimplência

3.00 (=) Receita (1 − 2)

4.00 (-) Impostos sobre Vendas (var)
  201 (-) Simples              [auto: 201]
  4.02 (-) Provisão para Impostos (=Receita*9% − Simples)
  4.03 (-) COFINS
  4.04–4.07 (-) Linhas livres

5.00 (-) CMV (var)
  5.01 (+) Estoque Inicial
  301 (-) Matéria-Prima, Bebidas e Produtos   [auto: 301]
  302 (-) ICMS                                 [auto: 302]
  303 (-) Gás                                  [auto: 303]
  304 (-) Energia                              [auto: 304]
  305 (-) Água                                 [auto: 305]
  5.07 (+) Custos (var) — Impostos sobre compras
    5.07.01..05 (+) ICMS, PIS, COFINS, livres
  5.08 (+) Custos c/ pessoal prod, execução (var)
    5.08.01 Mão de Obra Própria + provisões 13º/Férias/FGTS/INSS (% sobre 5.08.01)
  5.09 (-) Estoque Final
  5.10 (+) Custos c/ pessoal prod, execução (fix)
    5.10.01..20 (Salário Bruto + provisões + benefícios + pró-labore)
  5.11 (+) Custos c/ veículos (fix) — combustível, manutenção, seguro, IPVA/DPVAT/TRLAV
  5.12 (+) Demais custos produção, execução (fix) — água, energia, gás, aluguel, IPTU, condomínio, conservação, manutenção, seguro, depreciação, outros

6.00 (=) Lucro Bruto

7.00 (-) Despesas Variáveis c/ Vendas (var)
  401 Comissões, 402 Entregas, 403 Couvert, 498 Taxas Cartão (=1.80% Vendas Varejo), 499 Outras [auto]

8.00 (-) Despesas c/ pessoal comercial (var)  — comissões + provisões
9.00 (-) Despesas c/ pessoal comercial (fix)  — salários + provisões + benefícios
10.00 (-) Despesas Fixas c/ Colaboradores — 501..599 [auto]
11.00 (-) Despesas c/ Concessionárias (fix) — telefone, energia, água, livres
12.00 (-) Despesas c/ veículos (fix)
13.00 (-) Despesas c/ marketing (fix)
14.00 (-) Despesas c/ serviços de Terceiros (fix)
15.00 (-) Despesas Adm/Gerais (fix)  — 601..699 [auto] + Depreciações

16.00 (=) Lucro Operacional (EBIT)

17.00 (-) Despesas Financeiras Fixas — 702 Juros Fornecedores, 703 Juros Empréstimos, 704 IOF, 799 Outras
18.00 (-) Despesas Financeiras Variáveis — 18.01..18.04 livres
19.00 (+) Receitas Financeiras — 701 Receitas Financeiras, 19.02 Juros de clientes, 19.03 Descontos Recebidos
20.00 (+) Outras Receitas — Venda de imobilizado, Rec. juros/multas atraso, livre
21.00 (-) Outras Despesas — Outras despesas, Perda de Estoque, livre

22.00 (=) Lucro antes do IRPJ e CSLL
  22.01 (-) IRPJ
  22.02 (-) CSLL
  22.03 (-) Adicional de IR

23.00 (=) Lucro Líquido

— Bloco extra: fluxo de caixa do sócio —
24.00 (=) Destinação de Lucros / Movimentação de Caixa
  Movimentação dos Sócios
    801 (-) Distribuição de Lucros
    899 (-) Outras Movimentações de Sócios
  Entradas de Caixa
    901 Aporte de Capital, 902 Crédito Financiamento, 903 Empréstimos Obtidos,
    904 Resgate Aplicação, 905 Venda Imobilizado, 906 Receb. Empréstimos Concedidos,
    999 Outras Entradas
  Saídas de Caixa
    (linhas livres seguindo o que houver na planilha)
```

Linhas com `auto_from` continuam puxando do Financeiro pelo `item_code`. As demais ficam editáveis em `/dre/mensal`.

## Faixas neutras por bloco (cores)

Adicionar tokens HSL semânticos em `src/index.css`:

- `--dre-band-receita`        (verde suave, ~`145 25% 92%`)
- `--dre-band-deducoes`       (cinza azulado, ~`220 15% 90%`)
- `--dre-band-impostos`       (laranja suave, ~`30 30% 92%`)
- `--dre-band-cmv`            (vermelho suave, ~`0 25% 93%`)
- `--dre-band-despesas`       (cinza neutro, ~`220 10% 92%`)
- `--dre-band-ebit`           (azul, ~`210 40% 90%`)
- `--dre-band-financeiras`    (roxo suave, ~`260 20% 92%`)
- `--dre-band-lucro`          (dourado, ~`45 60% 88%`)
- `--dre-band-caixa`          (teal, ~`180 25% 90%`)

Versão dark com mesmas tonalidades em luminosidade baixa.

Em `src/lib/dre-categories.ts`: adicionar campo `band?: string` (chave do token) em cada subtotal, p.ex. `band: "ebit"`.

Em `Mensal.tsx` e `Anual.tsx`: aplicar a classe `bg-[hsl(var(--dre-band-${band}))]` (via mapa estático para evitar purge do Tailwind) na `<tr>` do subtotal e em todas as células. Texto sempre `text-foreground` para contraste.

Resultado visual: blocos visivelmente separados sem poluir, mantendo Liquid Glass no card externo.

## Arquivos a alterar

- `src/lib/dre-categories.ts` — reestruturar lista de categorias + adicionar `band` em subtotais.
- `src/index.css` — adicionar 9 tokens `--dre-band-*` (light + dark).
- `src/pages/dre/Mensal.tsx` — pintar linhas de subtotal pelo `band`.
- `src/pages/dre/Anual.tsx` — idem (incluindo trimestres/acumulado).
- `src/components/dre/DreSummaryCards.tsx` — pequeno ajuste se algum `DRE_HEADLINE_CODES` mudar de código (ex.: Lucro Líquido passa a ser `23.00`).
- `mem://features/dre` — atualizar memória com a nova estrutura.

## Detalhes técnicos

- Sem migração de banco — só dados de configuração no front. A tabela `dre_manual_entries` já aceita qualquer `category_code` string.
- Mapa de bands → classes definido como objeto literal estático para o Tailwind detectar:
  ```ts
  const BAND_CLASS: Record<string,string> = {
    receita:    "bg-[hsl(var(--dre-band-receita))]",
    deducoes:   "bg-[hsl(var(--dre-band-deducoes))]",
    // ...
  };
  ```
- `DRE_HEADLINE_CODES` ajustado para `["1.00","3.00","6.00","16.00","22.00","23.00"]`.
- Linhas com fórmula percentual (provisões, taxas de cartão) ficam computadas no front a partir das células-base, mantendo override manual quando o usuário editar.
