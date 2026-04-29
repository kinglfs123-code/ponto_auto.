CREATE TABLE public.item_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, code)
);

ALTER TABLE public.item_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own item_codes"
  ON public.item_codes FOR SELECT TO authenticated
  USING (user_owns_empresa(empresa_id));

CREATE POLICY "Users can insert own item_codes"
  ON public.item_codes FOR INSERT TO authenticated
  WITH CHECK (user_owns_empresa(empresa_id));

CREATE POLICY "Users can update own item_codes"
  ON public.item_codes FOR UPDATE TO authenticated
  USING (user_owns_empresa(empresa_id));

CREATE POLICY "Users can delete own item_codes"
  ON public.item_codes FOR DELETE TO authenticated
  USING (user_owns_empresa(empresa_id));

CREATE TRIGGER update_item_codes_updated_at
  BEFORE UPDATE ON public.item_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_item_codes_empresa ON public.item_codes(empresa_id);