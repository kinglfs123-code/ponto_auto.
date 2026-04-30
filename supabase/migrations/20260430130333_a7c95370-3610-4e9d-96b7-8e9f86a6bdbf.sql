CREATE TABLE public.dre_manual_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  category_code TEXT NOT NULL,
  entry_month DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, category_code, entry_month)
);

CREATE INDEX idx_dre_manual_entries_empresa_month ON public.dre_manual_entries(empresa_id, entry_month);

ALTER TABLE public.dre_manual_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dre_manual_entries"
  ON public.dre_manual_entries FOR SELECT TO authenticated
  USING (user_owns_empresa(empresa_id));

CREATE POLICY "Users can insert own dre_manual_entries"
  ON public.dre_manual_entries FOR INSERT TO authenticated
  WITH CHECK (user_owns_empresa(empresa_id));

CREATE POLICY "Users can update own dre_manual_entries"
  ON public.dre_manual_entries FOR UPDATE TO authenticated
  USING (user_owns_empresa(empresa_id));

CREATE POLICY "Users can delete own dre_manual_entries"
  ON public.dre_manual_entries FOR DELETE TO authenticated
  USING (user_owns_empresa(empresa_id));

CREATE TRIGGER update_dre_manual_entries_updated_at
  BEFORE UPDATE ON public.dre_manual_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();