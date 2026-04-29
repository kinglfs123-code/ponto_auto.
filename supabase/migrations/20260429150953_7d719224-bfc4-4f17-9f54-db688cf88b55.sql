
-- Enums
CREATE TYPE public.billing_status AS ENUM ('aguardando_oc', 'faturado');
CREATE TYPE public.payment_status AS ENUM ('a_receber', 'recebido', 'recebido_com_atraso', 'atrasado');

-- client_companies
CREATE TABLE public.client_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client_companies" ON public.client_companies
  FOR SELECT TO authenticated USING (public.user_owns_empresa(empresa_id));
CREATE POLICY "Users can insert own client_companies" ON public.client_companies
  FOR INSERT TO authenticated WITH CHECK (public.user_owns_empresa(empresa_id));
CREATE POLICY "Users can update own client_companies" ON public.client_companies
  FOR UPDATE TO authenticated USING (public.user_owns_empresa(empresa_id));
CREATE POLICY "Users can delete own client_companies" ON public.client_companies
  FOR DELETE TO authenticated USING (public.user_owns_empresa(empresa_id));

CREATE TRIGGER update_client_companies_updated_at
  BEFORE UPDATE ON public.client_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_client_companies_empresa ON public.client_companies(empresa_id);

-- client_billings
CREATE TABLE public.client_billings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  client_company_id UUID NOT NULL REFERENCES public.client_companies(id) ON DELETE RESTRICT,
  reference_month DATE NOT NULL,
  measurement_date DATE,
  send_date DATE,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE,
  received_date DATE,
  billing_status public.billing_status NOT NULL DEFAULT 'aguardando_oc',
  payment_status public.payment_status NOT NULL DEFAULT 'a_receber',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_billings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client_billings" ON public.client_billings
  FOR SELECT TO authenticated USING (public.user_owns_empresa(empresa_id));
CREATE POLICY "Users can insert own client_billings" ON public.client_billings
  FOR INSERT TO authenticated WITH CHECK (public.user_owns_empresa(empresa_id));
CREATE POLICY "Users can update own client_billings" ON public.client_billings
  FOR UPDATE TO authenticated USING (public.user_owns_empresa(empresa_id));
CREATE POLICY "Users can delete own client_billings" ON public.client_billings
  FOR DELETE TO authenticated USING (public.user_owns_empresa(empresa_id));

CREATE TRIGGER update_client_billings_updated_at
  BEFORE UPDATE ON public.client_billings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_client_billings_empresa_month ON public.client_billings(empresa_id, reference_month);
CREATE INDEX idx_client_billings_client ON public.client_billings(client_company_id);
