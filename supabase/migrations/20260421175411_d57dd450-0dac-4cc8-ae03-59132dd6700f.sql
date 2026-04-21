CREATE TABLE public.google_calendar_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own google tokens"
  ON public.google_calendar_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own google tokens"
  ON public.google_calendar_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own google tokens"
  ON public.google_calendar_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own google tokens"
  ON public.google_calendar_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_google_calendar_tokens_updated_at
  BEFORE UPDATE ON public.google_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();