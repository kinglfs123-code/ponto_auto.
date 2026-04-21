

## Plano: Refinar análise de contrato (auto-análise + auto-sync)

### Mudanças

**1. `src/pages/FuncionarioDetalhe.tsx`**
- Remover linha `<p>PDF, DOCX, JPEG, PNG (máx 10MB)</p>` (linha 630).
- Após `handleUploadDoc` concluir com sucesso para categoria `contrato`, disparar automaticamente a análise via `supabase.functions.invoke("analyze-contract", { body: { documento_id } })` em background. Toast leve no início ("Analisando contrato com IA…") e sucesso/erro ao final. Refresh dos docs já existe.

**2. `src/components/AnaliseContrato.tsx`**

*Disparo automático da análise*
- Remover o card "Análise inteligente do contrato" com o botão "Analisar com IA" (bloco `if (!analise)`, linhas 196-218). No lugar, mostrar apenas um estado discreto de loading se `analyzing === true` ("Analisando contrato…"), ou nada se sem análise e sem contrato.
- Adicionar `useEffect` que, quando `ultimoContrato` existir, `!analise`, e `!analyzing`, dispara `handleAnalisar()` automaticamente uma única vez por documento (guarda em ref para não repetir).
- Remover o botão "Reanalisar" do header (linhas 234-237). Reanálise passa a ser automática se um novo contrato for anexado (já coberto pela lógica acima, pois `ultimoContrato.id` muda).

*Sincronização automática*
- Remover o botão "Sincronizar no Google Agenda" (linhas 265-268).
- Após `load()` carregar alertas, se `googleConectado === true` e existirem alertas com `status !== "sincronizado"`, chamar `handleSincronizar()` automaticamente (guarda em ref para não repetir no mesmo render).
- Manter o botão "Conectar Google Agenda" visível apenas quando `googleConectado === false` E existirem alertas pendentes (já é o caso). Após conectar (retorno OAuth `?google=ok`), o effect dispara o sync automático.

*Remover badge de baixa confiança*
- Em `confiancaBadge`, remover totalmente o uso do badge no header da Card de análise (linhas 231-233). Não exibir o nível de confiança na UI. A função `confiancaBadge` pode ser removida.
- Ajustar título: trocar `"Análise do contrato"` (linha 228) por simplesmente o ícone Sparkles + nada de texto, OU manter um título mais discreto. **Decisão:** remover o `CardTitle` inteiro e deixar apenas os campos extraídos no `CardContent`. O `CardHeader` é eliminado quando não há nada a mostrar nele.

### Comportamento final

| Ação do usuário | Resultado automático |
|---|---|
| Anexa contrato | Toast "Analisando…" → análise IA roda em background → campos aparecem |
| Análise gera alertas + Google conectado | Sincronização ao Google Agenda automática, sem clique |
| Análise gera alertas + Google NÃO conectado | Botão "Conectar Google Agenda" aparece; após conectar, sync automático |

### Arquivos editados

- `src/pages/FuncionarioDetalhe.tsx` — remove rodapé de formatos + auto-trigger da análise no upload
- `src/components/AnaliseContrato.tsx` — remove botão Analisar, botão Reanalisar, botão Sincronizar, badge de confiança e título "Análise do contrato"; adiciona effects para auto-analisar e auto-sincronizar

