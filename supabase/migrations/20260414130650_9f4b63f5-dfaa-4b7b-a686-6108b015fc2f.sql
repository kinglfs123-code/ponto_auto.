CREATE POLICY "Users can update holerite PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'holerites')
WITH CHECK (bucket_id = 'holerites');