

## Plano: não sincronizar contrato sem arquivo + limpar resíduos

### Comportamento atual (bug visível no print)
Mesmo com "Nenhum arquivo" no Contrato de Trabalho, a tela mostra:
- Card de análise (Admissão, Tipo, Vencimento, Prorrogação, Próximas férias)
- Alertas "Sincronizado" no Google Agenda

Isso acontece porque:
1. O componente `AnaliseContrato` é montado mesmo sem contrato e exibe a última análise salva.
2. A limpeza ao excluir contrato só foi adicionada depois — registros antigos (e os eventos correspondentes no Google Agenda) continuam lá.
3. Ao excluir o último contrato, hoje só removemos do banco; os eventos no Google Agenda ficam órfãos.

### Regra nova
**Se não houver arquivo de contrato anexado, não há análise e não há sincronização.** Tudo o que existir é considerado resíduo e deve ser apagado (banco + Google Agenda).

### Mudanças

**1. `src/pages/FuncionarioDetalhe.tsx` — não montar análise sem contrato**
Na aba Documentos, só renderizar `<AnaliseContrato />` quando `documentos.filter(d => d.categoria === "contrato").length > 0`. Sem contrato → nenhum card de análise, nenhum card de alertas.

**2. `src/pages/FuncionarioDetalhe.tsx → handleDeleteDoc` — limpar Google Agenda também**
Quando o último contrato for excluído:
- Buscar `contrato_alertas` do funcionário com `google_event_id` preenchido **antes** do delete.
- Chamar a edge function nova `delete-calendar-alerts` com a lista de `google_event_id`s para apagar do Google Agenda.
- Em seguida apagar `contrato_alertas` e `contratos_analise` (já feito hoje).

**3. Nova edge function `supabase/functions/delete-calendar-alerts/index.ts`**
Espelha o padrão de `delete-ferias-calendar`:
- Recebe `{ event_ids: string[] }`.
- Autentica usuário, pega `access_token` válido (mesma lógica `getValidAccessToken` reaproveitada).
- Para cada `eventId`: `DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/{eventId}` (ignora 404/410 — evento já não existe).
- Retorna `{ deleted: n }`.
- Registrar em `supabase/config.toml` se necessário.

**4. `src/components/AnaliseContrato.tsx` — auto-limpeza defensiva**
No `useEffect` de carga, se `contratos.length === 0`:
- Pular a análise.
- Se existir `analise` no banco, disparar limpeza (apagar `contrato_alertas` + `contratos_analise` + chamar `delete-calendar-alerts` com os event ids encontrados).
- Setar `analise` e `alertas` para vazio.
Isso garante que, ao abrir a tela do funcionário do print **sem precisar excluir nada manualmente**, os resíduos antigos somem do banco e do Google Agenda automaticamente.

**5. Bloquear auto-sync sem contrato**
No `useEffect` de auto-sync de `AnaliseContrato`, sair cedo se `contratos.length === 0` (cinto e suspensório, em paralelo ao item 4).

### Resultado esperado
- Funcionário sem contrato anexado: aba Documentos mostra só o card "Contrato de Trabalho — Nenhum arquivo" e o botão "Anexar". Sem análise, sem alertas, sem chamadas ao Google.
- Ao abrir o funcionário do print, o card de análise e os 3 alertas sumirão da tela; os 3 eventos correspondentes serão removidos do Google Agenda automaticamente.
- Ao excluir o último contrato no futuro: análise, alertas e eventos no Google Agenda são apagados juntos.
- Quando um novo contrato for anexado, a análise é refeita do zero e novos eventos são criados.

### Arquivos
| Arquivo | Mudança |
|---|---|
| `src/pages/FuncionarioDetalhe.tsx` | Render condicional de `AnaliseContrato`; chamar `delete-calendar-alerts` antes de limpar tabelas no `handleDeleteDoc` |
| `src/components/AnaliseContrato.tsx` | Auto-limpeza quando `contratos.length === 0`; bloquear auto-sync sem contrato |
| `supabase/functions/delete-calendar-alerts/index.ts` (novo) | Apaga eventos do Google Agenda por ID |
| `supabase/config.toml` | Registro da nova função (se necessário) |

