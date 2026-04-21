-- Tabela de análise de contratos
CREATE TABLE public.contratos_analise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  documento_id UUID,
  data_admissao DATE,
  tipo_contrato TEXT,
  data_vencimento DATE,
  data_prorrogacao DATE,
  data_proximas_ferias DATE,
  observacoes TEXT,
  confianca INTEGER DEFAULT 0,
  dados_brutos JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_contratos_analise_funcionario ON public.contratos_analise(funcionario_id);
CREATE INDEX idx_contratos_analise_empresa ON public.contratos_analise(empresa_id);

ALTER TABLE public.contratos_analise ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contratos_analise"
  ON public.contratos_analise FOR SELECT TO authenticated
  USING (user_owns_empresa(empresa_id));

CREATE POLICY "Users can insert own contratos_analise"
  ON public.contratos_analise FOR INSERT TO authenticated
  WITH CHECK (user_owns_empresa(empresa_id));

CREATE POLICY "Users can update own contratos_analise"
  ON public.contratos_analise FOR UPDATE TO authenticated
  USING (user_owns_empresa(empresa_id));

CREATE POLICY "Users can delete own contratos_analise"
  ON public.contratos_analise FOR DELETE TO authenticated
  USING (user_owns_empresa(empresa_id));

-- Tabela de alertas
CREATE TABLE public.contrato_alertas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos_analise(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL,
  empresa_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  data_evento DATE NOT NULL,
  data_lembrete DATE NOT NULL,
  google_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_contrato_alertas_contrato ON public.contrato_alertas(contrato_id);
CREATE INDEX idx_contrato_alertas_empresa ON public.contrato_alertas(empresa_id);

ALTER TABLE public.contrato_alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contrato_alertas"
  ON public.contrato_alertas FOR SELECT TO authenticated
  USING (user_owns_empresa(empresa_id));

CREATE POLICY "Users can insert own contrato_alertas"
  ON public.contrato_alertas FOR INSERT TO authenticated
  WITH CHECK (user_owns_empresa(empresa_id));

CREATE POLICY "Users can update own contrato_alertas"
  ON public.contrato_alertas FOR UPDATE TO authenticated
  USING (user_owns_empresa(empresa_id));

CREATE POLICY "Users can delete own contrato_alertas"
  ON public.contrato_alertas FOR DELETE TO authenticated
  USING (user_owns_empresa(empresa_id));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_contratos_analise_updated_at
  BEFORE UPDATE ON public.contratos_analise
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contrato_alertas_updated_at
  BEFORE UPDATE ON public.contrato_alertas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();