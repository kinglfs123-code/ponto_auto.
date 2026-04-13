

## Plano: Corrigir erro "Invalid key" na geração de relatórios

### Causa raiz

O nome do arquivo gerado inclui o `mes_referencia` diretamente (ex: `Março`), e o acento no "ç" torna a key inválida para o Supabase Storage.

### Correção

**Arquivo:** `supabase/functions/generate-report/index.ts`

Sanitizar o `mes_referencia` antes de usá-lo no nome do arquivo, removendo acentos e caracteres especiais:

```typescript
// Antes
const fileName = `${user.id}/${empresa_id}_${mes_referencia}.json`;

// Depois
const safeMes = mes_referencia
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9_-]/g, "_");
const fileName = `${user.id}/${empresa_id}_${safeMes}.json`;
```

Isso converte "Março" em "Marco", eliminando o erro de storage.

### Arquivo alterado
- `supabase/functions/generate-report/index.ts` — 1 trecho (~3 linhas)

