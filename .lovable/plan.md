

## Plano: Corrigir bug do `analyze-contract` e executar o teste completo

### Diagnóstico

O contrato de Ludimila (`Admissão - LUDIMILA DOS SANTOS ÂNGELO.pdf`, 179 KB) já foi anexado, mas a função `analyze-contract` falha com **"Maximum call stack size exceeded"** na linha 91:

```ts
const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
```

O spread `...` em arrays grandes estoura a pilha de chamadas. Bug clássico de conversão base64 em Deno.

### O que será feito

**1. Corrigir `supabase/functions/analyze-contract/index.ts`**

Substituir a conversão por uma versão segura em chunks:

```ts
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000; // 32 KB
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
}
```

Também trocar `image_url` por `file` quando o mime for `application/pdf` (Gemini aceita PDFs nativamente via `data:application/pdf;base64,...` no campo `image_url`, mas deixar explícito o tipo aumenta a confiabilidade).

**2. Redeploy** da função `analyze-contract`.

**3. Disparar a análise** chamando a edge function via `supabase--curl_edge_functions` para o documento `c3e058af-7c06-41e3-928b-50edd0e43775` da Ludimila.

**4. Validar resultado** lendo `contratos_analise` e `contrato_alertas` no banco — confirmar:
- `data_admissao`, `tipo_contrato`, `data_vencimento`, `data_prorrogacao` extraídos
- `data_proximas_ferias` calculada (admissão + 12 meses)
- 1 a 3 alertas criados (vencimento −2d, prorrogação −2d, férias −5m)

**5. Sincronizar com Google Agenda** chamando `sync-calendar-alerts`. Como a integração depende de OAuth feito no navegador pelo usuário, vou:
- Verificar se já existe token em `google_calendar_tokens` para o usuário
- Se sim: disparar a sincronização e validar `google_event_id` preenchido
- Se não: reportar que falta o passo manual de "Conectar Google Agenda" na UI (clicar no botão na aba Documentos), e deixar a análise pronta para ser sincronizada

### Resumo Técnico

| Item | Mudança |
|---|---|
| `analyze-contract/index.ts` | função `arrayBufferToBase64` em chunks de 32 KB |
| Deploy | redeploy de `analyze-contract` |
| Teste 1 | `curl_edge_functions` → `analyze-contract` com `documento_id` da Ludimila |
| Teste 2 | `read_query` em `contratos_analise` + `contrato_alertas` |
| Teste 3 | `curl_edge_functions` → `sync-calendar-alerts` (se token Google existir) |

### O que NÃO muda

- Schema do banco
- Lógica de cálculo de datas
- UI de `AnaliseContrato.tsx`
- Função `sync-calendar-alerts` (já está correta)

