ALTER TABLE public.folhas_ponto
ADD COLUMN funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL;