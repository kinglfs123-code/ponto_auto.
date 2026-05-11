-- Email queue helpers: only service role should call these
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- Ownership helpers used inside RLS policies: keep for authenticated, revoke from anon
REVOKE EXECUTE ON FUNCTION public.user_owns_empresa(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_folha(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_relatorio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_owns_empresa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_folha(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_relatorio(uuid) TO authenticated;