
-- 1) HOLERITES BUCKET: replace permissive policies with ownership checks
DROP POLICY IF EXISTS "Users can view holerite PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload holerite PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update holerite PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete holerite PDFs" ON storage.objects;

CREATE POLICY "Users can view holerite PDFs of own empresas"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'holerites'
  AND public.user_owns_empresa(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Users can upload holerite PDFs to own empresas"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'holerites'
  AND public.user_owns_empresa(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Users can update holerite PDFs of own empresas"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'holerites'
  AND public.user_owns_empresa(((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'holerites'
  AND public.user_owns_empresa(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Users can delete holerite PDFs of own empresas"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'holerites'
  AND public.user_owns_empresa(((storage.foldername(name))[1])::uuid)
);

-- 2) COLABORADOR-ARQUIVOS: remove broken/legacy auth.uid()-based policies
-- (path is {empresa_id}/..., not {user_id}/..., so these never granted access anyway)
DROP POLICY IF EXISTS "Users can view colaborador files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update colaborador files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete colaborador files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload colaborador files" ON storage.objects;

-- 3) Fix mutable search_path on pgmq helper functions
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;
