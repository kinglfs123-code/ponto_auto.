## Objetivo
Melhorar a navegação do Financeiro, permitir editar lançamentos e ajustar o filtro "Próximas 7 dias".

## Mudanças

### 1. Navegação — botão "Voltar" sempre visível
Hoje a barra inferior só aparece ao passar o mouse, e o `FinanceiroLayout` só tem o botão "Módulo". Vou adicionar no header (ao lado do título), em **todas as páginas internas** (Lançamento, Contas, Fornecedores, Códigos), um botão **"← Início"** que leva para `/financeiro`. Na página inicial (`/financeiro`) o botão não aparece.

- Arquivo: `src/components/financeiro/FinanceiroLayout.tsx`
- Nova prop opcional `showBackToHome` (default `true`); a Home passa `false`.
- Botão à esquerda do título com ícone `ArrowLeft`, estilo `liquid-glass` discreto, igual ao botão "Módulo".

### 2. Editar lançamento em "Contas a pagar"
Hoje só dá para marcar como pago e excluir. Vou adicionar:

- Botão **lápis** em cada linha da lista (`src/pages/financeiro/Contas.tsx`).
- Abre um **Dialog de edição** com os mesmos campos do Lançamento Rápido:
  - Data chegada, Data vencimento, Fornecedor, Valor, Forma de pagamento, Código.
- Salva via `update` em `payables` e invalida as queries `payables` e `financeiro-summary`.
- Reaproveita `SupplierCombobox`, `ItemCodeCombobox`, máscara de moeda e validações já existentes.

### 3. Filtro "Próximas 7 dias" — começar amanhã
Hoje o filtro inclui contas que vencem **hoje**. Ajuste no `Contas.tsx`:

```text
proximas: due_date >= amanhã  AND  due_date <= hoje + 7
```

Trocar `gte("due_date", today)` por `gte("due_date", addDaysISO(today, 1))` no branch `filter === "proximas"`.

### Resumo de arquivos
- editar `src/components/financeiro/FinanceiroLayout.tsx` — botão "Início" no header
- editar `src/pages/financeiro/Home.tsx` — passar `showBackToHome={false}`
- editar `src/pages/financeiro/Contas.tsx` — Dialog de edição + ajuste do filtro "Próximas 7d"

Sem mudanças no banco de dados.
