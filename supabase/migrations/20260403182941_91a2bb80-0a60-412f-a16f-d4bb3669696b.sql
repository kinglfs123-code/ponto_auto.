
-- Create status enum
CREATE TYPE public.folha_status AS ENUM ('rascunho', 'finalizada');

-- Create empresas table
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  cnpj TEXT NOT NULL,
  nome TEXT NOT NULL,
  jornada_padrao TEXT NOT NULL DEFAULT '07:20',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create folhas_ponto table
CREATE TABLE public.folhas_ponto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  funcionario TEXT NOT NULL,
  mes_referencia TEXT NOT NULL,
  status public.folha_status NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create registros_ponto table
CREATE TABLE public.registros_ponto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folha_id UUID NOT NULL REFERENCES public.folhas_ponto(id) ON DELETE CASCADE,
  dia INTEGER NOT NULL,
  hora_entrada TEXT,
  hora_saida TEXT,
  hora_entrada_tarde TEXT,
  hora_saida_tarde TEXT,
  hora_entrada_extra TEXT,
  hora_saida_extra TEXT,
  horas_normais NUMERIC DEFAULT 0,
  horas_extras NUMERIC DEFAULT 0,
  horas_noturnas NUMERIC DEFAULT 0,
  tipo_excecao TEXT,
  corrigido_manualmente BOOLEAN NOT NULL DEFAULT false,
  obs TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create relatorios table
CREATE TABLE public.relatorios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  mes_referencia TEXT NOT NULL,
  pdf_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folhas_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user owns an empresa
CREATE OR REPLACE FUNCTION public.user_owns_empresa(_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.empresas
    WHERE id = _empresa_id AND owner_id = auth.uid()
  )
$$;

-- Helper function: check if user owns a folha (via empresa)
CREATE OR REPLACE FUNCTION public.user_owns_folha(_folha_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.folhas_ponto fp
    JOIN public.empresas e ON e.id = fp.empresa_id
    WHERE fp.id = _folha_id AND e.owner_id = auth.uid()
  )
$$;

-- Helper function: check if user owns a relatorio (via empresa)
CREATE OR REPLACE FUNCTION public.user_owns_relatorio(_relatorio_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.relatorios r
    JOIN public.empresas e ON e.id = r.empresa_id
    WHERE r.id = _relatorio_id AND e.owner_id = auth.uid()
  )
$$;

-- RLS policies for empresas
CREATE POLICY "Users can view own empresas" ON public.empresas
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own empresas" ON public.empresas
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own empresas" ON public.empresas
  FOR UPDATE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own empresas" ON public.empresas
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- RLS policies for folhas_ponto
CREATE POLICY "Users can view own folhas" ON public.folhas_ponto
  FOR SELECT TO authenticated USING (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can insert own folhas" ON public.folhas_ponto
  FOR INSERT TO authenticated WITH CHECK (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can update own folhas" ON public.folhas_ponto
  FOR UPDATE TO authenticated USING (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can delete own folhas" ON public.folhas_ponto
  FOR DELETE TO authenticated USING (public.user_owns_empresa(empresa_id));

-- RLS policies for registros_ponto
CREATE POLICY "Users can view own registros" ON public.registros_ponto
  FOR SELECT TO authenticated USING (public.user_owns_folha(folha_id));

CREATE POLICY "Users can insert own registros" ON public.registros_ponto
  FOR INSERT TO authenticated WITH CHECK (public.user_owns_folha(folha_id));

CREATE POLICY "Users can update own registros" ON public.registros_ponto
  FOR UPDATE TO authenticated USING (public.user_owns_folha(folha_id));

CREATE POLICY "Users can delete own registros" ON public.registros_ponto
  FOR DELETE TO authenticated USING (public.user_owns_folha(folha_id));

-- RLS policies for relatorios
CREATE POLICY "Users can view own relatorios" ON public.relatorios
  FOR SELECT TO authenticated USING (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can insert own relatorios" ON public.relatorios
  FOR INSERT TO authenticated WITH CHECK (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can delete own relatorios" ON public.relatorios
  FOR DELETE TO authenticated USING (public.user_owns_empresa(empresa_id));

-- Storage bucket for report PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('relatorios', 'relatorios', false);

-- Storage policies: users can read their own report PDFs
CREATE POLICY "Users can read own report PDFs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'relatorios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies: users can upload report PDFs to their folder
CREATE POLICY "Users can upload report PDFs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'relatorios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies: users can delete their own report PDFs
CREATE POLICY "Users can delete own report PDFs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'relatorios'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
