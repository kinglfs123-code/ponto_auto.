## Refatoração de `src/lib/ponto-rules.ts` — cálculo por horas reais trabalhadas

### Mudança de filosofia

**Hoje:** o sistema calcula extras/atrasos por **batidas individuais** (compara entrada com horário padrão, saída com horário padrão, aplicando tolerância de 5min em cada). `horas_normais` sempre reporta a jornada padrão fixa (ex: 7h20).

**Novo:** o sistema calcula pelo **tempo real trabalhado** (soma das durações dos períodos manhã + tarde + extra), compara com a jornada padrão, e classifica o restante como extra ou atraso. `horas_normais` passa a refletir as horas efetivamente cumpridas (limitadas à jornada).

### O que muda na função `applyToleranceAndDetect`

1. **Cálculo de duração por período**, com suporte a turnos noturnos que cruzam meia-noite (se `saida < entrada`, soma 24h):
   - Período 1: manhã (`hora_entrada` → `hora_saida`)
   - Período 2: tarde (`hora_entrada_tarde` → `hora_saida_tarde`)
   - Período 3: extra (`hora_entrada_extra` → `hora_saida_extra`)

2. **Total trabalhado vs jornada:**
   - Se `trabalhado >= jornada`: `horas_normais = jornada`, `horas_extras = trabalhado - jornada`
   - Se `trabalhado < jornada`: `horas_normais = trabalhado`, `atraso_minutos = jornada - trabalhado`

3. **Tolerância de 5min** aplicada nos dois lados:
   - Atraso ≤ 5min → zera atraso e considera jornada completa
   - Extras ≤ 5min → zera extras e considera jornada completa

4. **Detecção de exceção simplificada:**
   - `atraso > 5min` → `tipo_excecao = "atraso"`
   - Se há atraso E extras simultaneamente → `tipo_excecao = null` (compensou)
   - Removidas as classificações `saida_antecipada` e `atraso_saida_antecipada` (eram baseadas na comparação com horário padrão de entrada/saída, que deixa de ser usada para classificação).

5. **Default da jornada:** muda de `440min (7h20)` para `480min (8h)` quando não há jornada definida.

6. **Parâmetro `intervaloStr`** volta a ser nomeado (sem `_`), embora ainda não seja usado no cálculo (mantido para compatibilidade da assinatura).

7. **Horário de entrada/saída padrão** deixam de influenciar o cálculo de extras/atrasos (continuam recebidos como parâmetro para não quebrar callers, mas não são mais usados nessa função).

### O que NÃO muda

- Assinatura pública da função (5 parâmetros) — `Ponto.tsx` continua chamando igual.
- `calcNightMinutes`, `calcularResumo`, `formatHours`, máscaras de CPF/CNPJ/email, `matchFuncionario`, `validateCPF/CNPJ/Email`, `formatMinutes`, `maskHM` — **preservados intactos**.
- Constante `TOLERANCE_MINUTES = 5`.
- Tratamento de exceções manuais (folga/falta/atestado) e detecção por `obs`.
- Bloco de "nenhuma batida → falta automática".

### Impacto em outras partes

- `src/pages/Ponto.tsx` continua funcionando sem alterações (mesma assinatura).
- `mem://logic/ponto-rules` precisa ser atualizada para refletir a nova lógica:
  - Remover "Final result overridden by total worked time vs standard journey" como override e tratar como **regra principal**.
  - Remover "Normal hours always report standard journey" — agora reflete horas reais.
  - Atualizar default de 440m para 480m (ou confirmar com você qual deve ser).

### Pontos de atenção (precisam confirmação)

- ⚠️ **Default de jornada**: o código que você passou usa **480min (8h)**, mas o atual é **440min (7h20)** e está documentado assim na memória. Mantenho 480min como você enviou?
- ⚠️ **Perda das classificações** `saida_antecipada` e `atraso_saida_antecipada`: passam a ser apenas `atraso`. Confirma?
- ⚠️ **`horas_normais` agora variável**: relatórios e telas que assumiam jornada fixa vão mostrar valor real (ex: 6h em vez de 7h20 num dia incompleto). Isso é o desejado?
