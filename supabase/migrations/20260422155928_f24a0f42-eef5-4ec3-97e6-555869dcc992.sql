ALTER TABLE public.funcionario_ferias
  ADD COLUMN IF NOT EXISTS google_event_id_inicio text,
  ADD COLUMN IF NOT EXISTS google_event_id_fim text;