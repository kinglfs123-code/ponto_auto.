UPDATE public.contrato_alertas
SET status = 'pendente'
WHERE google_event_id_lembrete IS NULL
  AND google_event_id_vencimento IS NULL;