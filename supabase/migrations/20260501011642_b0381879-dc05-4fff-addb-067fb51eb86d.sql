
ALTER TYPE billing_status ADD VALUE IF NOT EXISTS 'pendente_pagamento';
ALTER TYPE billing_status ADD VALUE IF NOT EXISTS 'pago';

ALTER TABLE public.client_billings ADD COLUMN IF NOT EXISTS oc_number text;
