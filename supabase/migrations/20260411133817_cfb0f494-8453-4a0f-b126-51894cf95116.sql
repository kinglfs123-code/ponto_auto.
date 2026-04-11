
-- Create holerites table
CREATE TABLE public.holerites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  mes_referencia text NOT NULL,
  pdf_path text NOT NULL,
  enviado boolean NOT NULL DEFAULT false,
  enviado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.holerites ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own holerites"
  ON public.holerites FOR SELECT TO authenticated
  USING (user_owns_empresa(empresa_id));

CREATE POLICY "Users can insert own holerites"
  ON public.holerites FOR INSERT TO authenticated
  WITH CHECK (user_owns_empresa(empresa_id));

CREATE POLICY "Users can update own holerites"
  ON public.holerites FOR UPDATE TO authenticated
  USING (user_owns_empresa(empresa_id));

CREATE POLICY "Users can delete own holerites"
  ON public.holerites FOR DELETE TO authenticated
  USING (user_owns_empresa(empresa_id));

-- Create private storage bucket for holerite PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('holerites', 'holerites', false);

-- Storage policies
CREATE POLICY "Users can upload holerite PDFs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'holerites');

CREATE POLICY "Users can view holerite PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'holerites');

CREATE POLICY "Users can delete holerite PDFs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'holerites');
