
CREATE TABLE public.correcoes_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  folha_id uuid REFERENCES public.folhas_ponto(id) ON DELETE SET NULL,
  dia integer,
  campo text NOT NULL,
  valor_ia text,
  valor_corrigido text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.correcoes_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own correcoes"
  ON public.correcoes_ia FOR SELECT TO authenticated
  USING (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can insert own correcoes"
  ON public.correcoes_ia FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can delete own correcoes"
  ON public.correcoes_ia FOR DELETE TO authenticated
  USING (public.user_owns_empresa(empresa_id));

CREATE INDEX idx_correcoes_ia_empresa ON public.correcoes_ia(empresa_id);
