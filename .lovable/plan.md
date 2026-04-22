

## Plano: 2 eventos por alerta (lembrete azul + vencimento vermelho) e férias 2 meses antes

### Comportamento atual
- Cada alerta de contrato cria **um único evento** no Google Agenda, no dia do `data_lembrete`, sem cor definida (cor padrão da agenda).
- Alerta de férias é gerado com lembrete **5 meses antes** (`addMonths(data_proximas_ferias, -5)`).

### Novo comportamento
Para cada alerta (vencimento, prorrogação, férias), criar **2 eventos** no Google Agenda:
1. **Lembrete antecipado** (azul, `colorId: "9"` Blueberry) na data `data_lembrete`. Título prefixado com `🔔 Lembrete:`.
2. **Evento no dia do vencimento/evento real** (vermelho, `colorId: "11"` Tomato) na data `data_evento`, caso o lembrete passe despercebido. Título prefixado com `⚠️` (vencimento) / `📝` (prorrogação) / `🌴` (férias).

Antecedência do lembrete de **férias** muda de 5 meses para **2 meses** (`addMonths(data_proximas_ferias, -2)`). Vencimento e prorrogação continuam com 2 dias de antecedência.

### Mudanças

**1. Migração de banco — `contrato_alertas`**
Adicionar duas colunas para guardar os dois `event_id`s do Google. Manter `google_event_id` como legado/migração (deixa de ser usado para escrita nova):
```sql
ALTER TABLE public.contrato_alertas
  ADD COLUMN IF NOT EXISTS google_event_id_lembrete text,
  ADD COLUMN IF NOT EXISTS google_event_id_vencimento text;
```

**2. `supabase/functions/analyze-contract/index.ts`**
- Trocar antecedência de férias: `addMonths(data_proximas_ferias, -2)` em vez de `-5`.
- Atualizar label do tipo `ferias_5_meses` segue valendo (string interna) — ajuste só visual no front.

**3. `supabase/functions/sync-calendar-alerts/index.ts`**
- Para cada alerta, montar e enviar **dois eventos**:
  - Lembrete: `summary: "🔔 Lembrete: <titulo> — <nome>"`, `start/end.date = data_lembrete`, `colorId: "9"`.
  - Vencimento: `summary: "<emoji> <titulo> — <nome>"`, `start/end.date = data_evento`, `colorId: "11"`, popup no próprio dia (override 0–60 min).
- Fazer POST se o respectivo `google_event_id_*` ainda não existir, PUT se existir (idempotente).
- Salvar `google_event_id_lembrete` e `google_event_id_vencimento` na tabela.
- Marcar `status = "sincronizado"` apenas quando ambos os eventos forem criados/atualizados com sucesso.

**4. `supabase/functions/delete-calendar-alerts/index.ts`**
- Hoje recebe `event_ids: string[]`. Continuar aceitando esse formato (já é genérico). No `FuncionarioDetalhe.tsx` e `AnaliseContrato.tsx`, ao montar a lista para deletar, juntar `google_event_id`, `google_event_id_lembrete` e `google_event_id_vencimento` de cada alerta antes de chamar a função.

**5. `src/pages/FuncionarioDetalhe.tsx → handleDeleteDoc`**
- Ao excluir o último contrato, buscar os 3 campos (`google_event_id`, `google_event_id_lembrete`, `google_event_id_vencimento`) de `contrato_alertas` e enviar todos para `delete-calendar-alerts`.

**6. `src/components/AnaliseContrato.tsx`**
- Auto-limpeza: mesma alteração — coletar os 3 campos.
- Label visual `TIPO_ALERTA_LABEL.ferias_5_meses` passa a "Férias (2 meses antes)".
- Texto exibido por alerta passa a indicar os dois eventos: `Lembrete em DD/MM/YYYY (azul) · Vencimento em DD/MM/YYYY (vermelho)`.

**7. `src/types/index.ts`**
- Adicionar `google_event_id_lembrete?: string | null` e `google_event_id_vencimento?: string | null` em `ContratoAlerta`.

**8. Re-sincronização dos alertas existentes**
- O auto-sync do `AnaliseContrato` já roda quando há pendentes. Para forçar a recriação dos eventos na nova estrutura sem duplicar, na primeira execução com os novos campos vazios:
  - se `google_event_id` (legado) existir e `google_event_id_lembrete`/`vencimento` estiverem vazios → criar os dois eventos novos via POST e, em seguida, deletar o evento legado (`google_event_id`) do Google Agenda; limpar a coluna legada.
  - Senão, comportamento normal (POST quando vazio, PUT quando preenchido).

### Resultado esperado
- Cada alerta passa a ter **2 marcações no Google Agenda**: uma azul de lembrete e uma vermelha no dia do vencimento.
- Lembrete de férias passa a sair **2 meses antes** (em vez de 5).
- Excluir contrato continua limpando tudo: ambos os eventos por alerta são removidos do Google Agenda junto com os registros locais.

### Arquivos
| Arquivo | Mudança |
|---|---|
| `supabase/migrations/<novo>.sql` | Adiciona `google_event_id_lembrete` e `google_event_id_vencimento` em `contrato_alertas` |
| `supabase/functions/analyze-contract/index.ts` | Férias: 2 meses antes em vez de 5 |
| `supabase/functions/sync-calendar-alerts/index.ts` | Cria/atualiza 2 eventos por alerta com `colorId` 9 (azul) e 11 (vermelho); migra eventos legados |
| `supabase/functions/delete-calendar-alerts/index.ts` | Sem mudança de contrato; segue deletando lista de IDs |
| `src/pages/FuncionarioDetalhe.tsx` | Coletar os 3 campos de event_id ao limpar |
| `src/components/AnaliseContrato.tsx` | Coletar os 3 campos na auto-limpeza; ajustar labels e descrição |
| `src/types/index.ts` | Novos campos em `ContratoAlerta` |

