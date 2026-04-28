-- ============ SUPPLIERS ============
CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  name text NOT NULL,
  cnpj text NOT NULL,
  default_payment_method text,
  default_item_code text,
  default_due_days integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppliers_empresa_cnpj_unique UNIQUE (empresa_id, cnpj)
);

CREATE INDEX idx_suppliers_empresa_name ON public.suppliers (empresa_id, name);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suppliers"
  ON public.suppliers FOR SELECT TO authenticated
  USING (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can insert own suppliers"
  ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can update own suppliers"
  ON public.suppliers FOR UPDATE TO authenticated
  USING (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can delete own suppliers"
  ON public.suppliers FOR DELETE TO authenticated
  USING (public.user_owns_empresa(empresa_id));

CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PAYABLES ============
CREATE TABLE public.payables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  arrival_date date NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  payment_method text NOT NULL,
  item_code text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payables_empresa_due ON public.payables (empresa_id, due_date);
CREATE INDEX idx_payables_empresa_status ON public.payables (empresa_id, status);
CREATE INDEX idx_payables_supplier ON public.payables (supplier_id);

ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payables"
  ON public.payables FOR SELECT TO authenticated
  USING (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can insert own payables"
  ON public.payables FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can update own payables"
  ON public.payables FOR UPDATE TO authenticated
  USING (public.user_owns_empresa(empresa_id));

CREATE POLICY "Users can delete own payables"
  ON public.payables FOR DELETE TO authenticated
  USING (public.user_owns_empresa(empresa_id));

CREATE TRIGGER set_payables_updated_at
  BEFORE UPDATE ON public.payables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validação via trigger (em vez de CHECK, conforme guidelines)
CREATE OR REPLACE FUNCTION public.validate_payable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_method NOT IN ('boleto','pix','transferencia','dinheiro','cartao') THEN
    RAISE EXCEPTION 'Forma de pagamento inválida: %', NEW.payment_method;
  END IF;
  IF NEW.status NOT IN ('pendente','pago','cancelado') THEN
    RAISE EXCEPTION 'Status inválido: %', NEW.status;
  END IF;
  IF NEW.due_date < NEW.arrival_date THEN
    RAISE EXCEPTION 'Data de vencimento não pode ser anterior à data de chegada';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_payable_before_insert_update
  BEFORE INSERT OR UPDATE ON public.payables
  FOR EACH ROW EXECUTE FUNCTION public.validate_payable();