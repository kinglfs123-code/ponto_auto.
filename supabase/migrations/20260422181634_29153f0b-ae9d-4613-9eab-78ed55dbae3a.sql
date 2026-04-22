ALTER TABLE public.contrato_alertas
  ADD COLUMN IF NOT EXISTS google_event_id_lembrete text,
  ADD COLUMN IF NOT EXISTS google_event_id_vencimento text;