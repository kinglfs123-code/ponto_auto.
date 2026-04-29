CREATE TABLE public.cmv_daily_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  entry_date DATE NOT NULL,
  vendas_almoco NUMERIC NOT NULL DEFAULT 0,
  convenio_almoco NUMERIC NOT NULL DEFAULT 0,
  vendas_jantar NUMERIC NOT NULL DEFAULT 0,
  convenio_jantar NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, entry_date)
);

CREATE INDEX idx_cmv_daily_sales_empresa_date ON public.cmv_daily_sales(empresa_id, entry_date);

ALTER TABLE public.cmv_daily_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cmv_daily_sales"
ON public.cmv_daily_sales FOR SELECT TO authenticated
USING (user_owns_empresa(empresa_id));

CREATE POLICY "Users can insert own cmv_daily_sales"
ON public.cmv_daily_sales FOR INSERT TO authenticated
WITH CHECK (user_owns_empresa(empresa_id));

CREATE POLICY "Users can update own cmv_daily_sales"
ON public.cmv_daily_sales FOR UPDATE TO authenticated
USING (user_owns_empresa(empresa_id));

CREATE POLICY "Users can delete own cmv_daily_sales"
ON public.cmv_daily_sales FOR DELETE TO authenticated
USING (user_owns_empresa(empresa_id));

CREATE TRIGGER update_cmv_daily_sales_updated_at
BEFORE UPDATE ON public.cmv_daily_sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();