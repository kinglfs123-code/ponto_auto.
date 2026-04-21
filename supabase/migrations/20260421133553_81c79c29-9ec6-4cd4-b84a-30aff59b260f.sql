-- Tabela de documentos do funcionário
CREATE TABLE public.funcionario_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL CHECK (categoria IN ('contrato', 'epi', 'aso', 'outros')),
  nome_arquivo TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_func_docs_funcionario ON public.funcionario_documentos(funcionario_id);
CREATE INDEX idx_func_docs_empresa ON public.funcionario_documentos(empresa_id);

ALTER TABLE public.funcionario_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own funcionario_documentos"
ON public.funcionario_documentos FOR SELECT TO authenticated
USING (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can insert own funcionario_documentos"
ON public.funcionario_documentos FOR INSERT TO authenticated
WITH CHECK (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can update own funcionario_documentos"
ON public.funcionario_documentos FOR UPDATE TO authenticated
USING (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can delete own funcionario_documentos"
ON public.funcionario_documentos FOR DELETE TO authenticated
USING (public.user_owns_empresa(empresa_id));

-- Tabela de férias do funcionário
CREATE TABLE public.funcionario_ferias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planejada' CHECK (status IN ('planejada', 'em_andamento', 'concluida')),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_func_ferias_funcionario ON public.funcionario_ferias(funcionario_id);
CREATE INDEX idx_func_ferias_empresa ON public.funcionario_ferias(empresa_id);

ALTER TABLE public.funcionario_ferias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own funcionario_ferias"
ON public.funcionario_ferias FOR SELECT TO authenticated
USING (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can insert own funcionario_ferias"
ON public.funcionario_ferias FOR INSERT TO authenticated
WITH CHECK (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can update own funcionario_ferias"
ON public.funcionario_ferias FOR UPDATE TO authenticated
USING (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can delete own funcionario_ferias"
ON public.funcionario_ferias FOR DELETE TO authenticated
USING (public.user_owns_empresa(empresa_id));

-- Storage policies para bucket colaborador-arquivos (estrutura: empresa_id/funcionario_id/arquivo)
DO $$ BEGIN
  CREATE POLICY "Users can view colaborador files of own empresas"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'colaborador-arquivos'
    AND public.user_owns_empresa(((storage.foldername(name))[1])::uuid)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can upload colaborador files to own empresas"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'colaborador-arquivos'
    AND public.user_owns_empresa(((storage.foldername(name))[1])::uuid)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update colaborador files of own empresas"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'colaborador-arquivos'
    AND public.user_owns_empresa(((storage.foldername(name))[1])::uuid)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete colaborador files of own empresas"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'colaborador-arquivos'
    AND public.user_owns_empresa(((storage.foldername(name))[1])::uuid)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;