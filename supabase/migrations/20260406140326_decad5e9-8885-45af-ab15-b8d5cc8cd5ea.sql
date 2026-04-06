
CREATE TABLE public.funcionarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_completo text NOT NULL,
  cpf text NOT NULL,
  email text,
  data_nascimento date,
  cargo text,
  horario_entrada text NOT NULL DEFAULT '08:00',
  horario_saida text NOT NULL DEFAULT '17:00',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own funcionarios" ON public.funcionarios FOR SELECT TO authenticated USING (user_owns_empresa(empresa_id));
CREATE POLICY "Users can insert own funcionarios" ON public.funcionarios FOR INSERT TO authenticated WITH CHECK (user_owns_empresa(empresa_id));
CREATE POLICY "Users can update own funcionarios" ON public.funcionarios FOR UPDATE TO authenticated USING (user_owns_empresa(empresa_id));
CREATE POLICY "Users can delete own funcionarios" ON public.funcionarios FOR DELETE TO authenticated USING (user_owns_empresa(empresa_id));

CREATE INDEX idx_funcionarios_empresa ON public.funcionarios(empresa_id);
CREATE UNIQUE INDEX idx_funcionarios_cpf_empresa ON public.funcionarios(empresa_id, cpf);
