

## Plano: Corrigir botão Download de relatórios

### Diagnóstico

O código ignora erros do `createSignedUrl`. Se a chamada falhar (ex: erro de permissão ou rede), nada acontece — sem feedback ao usuário.

A storage policy e o arquivo existem corretamente, então o problema provavelmente é:
1. O erro do `createSignedUrl` está sendo silenciado
2. Possível bloqueio de popup no `window.open`

### Correção

**Arquivo:** `src/pages/Relatorios.tsx` — função `download` (linhas 53-56)

Adicionar tratamento de erro e usar `window.location.href` em vez de `window.open` para evitar bloqueio de popup:

```typescript
const download = async (path: string) => {
  const { data, error } = await supabase.storage.from("relatorios").createSignedUrl(path, 300);
  if (error) {
    toast({ title: "Erro ao baixar", description: error.message, variant: "destructive" });
    return;
  }
  if (data?.signedUrl) {
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
```

### Arquivo alterado
- `src/pages/Relatorios.tsx` — função `download` (~4 linhas → ~13 linhas)

