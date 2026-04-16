
INSERT INTO storage.buckets (id, name, public)
VALUES ('colaborador-arquivos', 'colaborador-arquivos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload colaborador files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'colaborador-arquivos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view colaborador files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'colaborador-arquivos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update colaborador files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'colaborador-arquivos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete colaborador files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'colaborador-arquivos' AND auth.uid()::text = (storage.foldername(name))[1]);
