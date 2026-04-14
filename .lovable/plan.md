

## Plano: Corrigir erro de RLS no upload de holerites

### Problema
O upload de PDFs com `upsert: true` tenta atualizar um arquivo existente no bucket `holerites`, mas nao existe uma policy de UPDATE no `storage.objects` para esse bucket. Isso causa o erro "new row violates row-level security policy".

### Solucao

1. **Criar migration** adicionando uma policy de UPDATE no storage para o bucket `holerites`:
```sql
CREATE POLICY "Users can update holerite PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'holerites')
WITH CHECK (bucket_id = 'holerites');
```

Isso permite que usuarios autenticados substituam PDFs existentes no bucket.

### Resultado esperado
O upload e substituicao de PDFs de holerites funcionara sem erro de RLS.

