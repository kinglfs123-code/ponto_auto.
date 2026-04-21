

## Plano: Corrigir erro "Erro ao carregar alertas" no `sync-calendar-alerts`

### Diagnóstico

A edge function `sync-calendar-alerts` falha com 500 / "Erro ao carregar alertas" porque a query usa embeds do PostgREST:

```ts
.select("*, funcionarios:funcionario_id(nome_completo), empresas:empresa_id(owner_id)")
```

Mas a tabela `contrato_alertas` **não tem foreign keys declaradas** para `funcionarios` nem `empresas` (confirmado via `information_schema`). Sem FK, PostgREST não consegue fazer o join e retorna erro — que a função engole com uma mensagem genérica.

Os alertas em si existem corretamente (3 alertas para Ludimila, status `pendente`).

### Correções

**1. Reescrever a query em `supabase/functions/sync-calendar-alerts/index.ts`** sem depender de embed:

- Buscar `contrato_alertas` puros via `.in("id", alerta_ids)`
- Coletar `funcionario_id` e `empresa_id` únicos
- Fazer 2 queries paralelas: `funcionarios` (nome) e `empresas` (owner_id)
- Montar mapas em memória e usar nos eventos

**2. Melhorar log de erro**: trocar `throw new Error("Erro ao carregar alertas")` por `throw new Error(\`Erro ao carregar alertas: ${aErr?.message}\`)` para diagnósticos futuros.

**3. Redeploy** da função `sync-calendar-alerts`.

**4. Testar fluxo** chamando `supabase--curl_edge_functions` com os 3 `alerta_ids` da Ludimila e validar:
- Resposta `{ results: [...] }` com `status: "sincronizado"`
- `google_event_id` preenchido em `contrato_alertas`
- Status atualizado para `sincronizado`

### Resumo Técnico

| Item | Mudança |
|---|---|
| `sync-calendar-alerts/index.ts` | Substituir embed por 3 queries separadas + mapas |
| Log de erro | Incluir `aErr.message` real |
| Deploy | Redeploy de `sync-calendar-alerts` |
| Teste | `curl_edge_functions` com os 3 alerta_ids da Ludimila |
| Validação | `read_query` em `contrato_alertas` confirmando `google_event_id` e `status=sincronizado` |

### O que NÃO muda

- Schema do banco (não vamos adicionar FKs agora — fora de escopo)
- Lógica OAuth (já funciona — o badge "Google Agenda conectado" está verde)
- Função `analyze-contract`
- UI de `AnaliseContrato.tsx`

