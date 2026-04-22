ALTER TABLE public.funcionario_ferias
  ADD COLUMN IF NOT EXISTS documento_storage_path text,
  ADD COLUMN IF NOT EXISTS documento_nome text,
  ADD COLUMN IF NOT EXISTS google_event_id text;