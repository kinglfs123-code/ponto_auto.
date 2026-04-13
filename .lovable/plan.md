

## Plano: Corrigir 3 erros de build em ponto-rules.ts

### Problemas

1. **Linha 195**: `funcionarioSel` não existe — deve usar o parâmetro `horarioSaidaPadrao` que já é recebido pela função
2. **Linhas 294 e 318**: `saidaPadraoMin` não existe — a variável nunca foi declarada a partir de `horarioSaidaPadrao`

### Correções

**Linha 195** — substituir:
```typescript
const horarioSaida = funcionarioSel?.horario_saida || "13:10";
```
por:
```typescript
const saidaPadraoMin = parseTimeToMinutes(horarioSaidaPadrao) || 780;
```

Isso declara `saidaPadraoMin` (que já é usado nas linhas 294 e 318), eliminando os 3 erros de uma vez. O valor `780` corresponde a 13:00 como fallback.

### Arquivo alterado
- `src/lib/ponto-rules.ts` — 1 linha (linha 195)

