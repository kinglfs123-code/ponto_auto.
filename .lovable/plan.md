## Novo fluxo de faturamento

### Fluxo proposto (sequencial)

1. **Aguardando OC** (badge azul) — estado inicial, esperando ordem de compra do cliente
2. **Faturado** (badge amarelo) — OC recebida e número preenchido, nota emitida
3. **Pendente de Pagamento** (badge laranja) — aguardando pagamento do cliente
4. **Pago** (badge verde) — pagamento recebido

O usuário pode avançar/retroceder manualmente entre os status.

### Mudanças

**Banco de dados (migration)**
- Adicionar coluna `oc_number` (text, nullable) na tabela `client_billings` para guardar o número da OC
- Atualizar o enum `billing_status` para ter 4 valores: `aguardando_oc`, `faturado`, `pendente_pagamento`, `pago`
- Remover dependência de `payment_status` (campo computado antigo) — o novo `billing_status` cobre todo o fluxo

**Frontend — tipos (`src/types/empresas-modulo.ts`)**
- Atualizar `BillingStatus` para os 4 valores
- Atualizar labels e remover `PaymentStatusBilling` / `computePaymentStatus` (substituídos pelo status único)
- Definir cores: azul (aguardando_oc), amarelo (faturado), laranja (pendente_pagamento), verde (pago)

**Frontend — Cobranças (`src/pages/empresas-modulo/Cobrancas.tsx`)**
- Mostrar apenas 1 badge de status (com a cor correta) em vez de 2 badges separados
- Adicionar campo "Nº OC" no formulário — ao preencher, o status muda automaticamente para "Faturado"
- Select de status com as 4 opções para ajuste manual
- Atualizar cards de resumo: Aguardando OC, Faturado, Pendente, Pago
- Remover campos `received_date` e lógica de `payment_status`

### Detalhes técnicos

- Migration SQL: `ALTER TYPE billing_status ADD VALUE 'pendente_pagamento'; ALTER TYPE billing_status ADD VALUE 'pago';` + `ALTER TABLE client_billings ADD COLUMN oc_number text;`
- Coluna `payment_status` será mantida no banco por segurança mas ignorada no frontend
- O campo OC number aparece no card da cobrança quando preenchido
