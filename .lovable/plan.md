# Limpeza da aplicação — sem perder funcionalidade

Regra de ouro respeitada: **nenhuma feature, rota, página, edge function, tabela ou componente em uso será removido**. A varredura (knip) confirmou o que é seguro tirar. As edge functions aparecem como "não usadas" porque rodam server-side — elas **ficam todas**.

## O que será removido

### 1. Exports duplicados (mesmo símbolo exportado 2x)
- `src/components/SensitiveText.tsx` — manter `export function SensitiveText`, remover `export default`.
- `src/components/ui/back-button.tsx` — manter named export `BackButton`, remover `export default`.
- `src/lib/dre-categories.ts` — remover alias `DRE_BAND_BG_STICKY` (cópia idêntica de `DRE_BAND_BG`, sem uso).

### 2. Funções/constantes exportadas e nunca importadas
Verificadas uma a uma com `rg` antes de excluir.

- `src/components/cmv/cmv-month.tsx` — `firstOfMonthISO`, `lastOfMonthISO`, `monthLabel`, type `MonthCursor`.
- `src/components/dre/dre-shared.tsx` — `MONTH_LABELS` (mantém `MONTH_LABELS_SHORT` que é usado), re-export `DreCategory`.
- `src/lib/format.ts` — `formatCPF`, `validateCPF`, `validateCNPJ`, `maskCNPJ`, `maskCPF`, `maskHM`, `addDaysISO`.
- `src/lib/ocr-utils.ts` — `CONFIDENCE_CONFIG`, `PREPROCESS_CONFIG`, type `ConfidenceLevel`.
- `src/lib/ponto-rules.ts` — `parseTimeToMinutes`, `parseTimeToHours`, `maskTelefoneBR`, `validateTelefoneBR`, `normalizeName`.
- `src/hooks/use-toast.ts` — função interna `reducer` exportada por engano.

### 3. Dependências órfãs (não importadas em lugar nenhum)
Confirmar com `rg` antes de remover do `package.json`:
- `@tanstack/query-core` (já vem como dep transitiva do `@tanstack/react-query`)
- `date-fns`
- `zod`
- devDeps: `@playwright/test`, `@tailwindcss/typography`, `@testing-library/react`

Se algum import aparecer na busca final, mantemos.

## O que NÃO será removido (apesar do knip sinalizar)

- **Edge functions inteiras** (`supabase/functions/*`) — são chamadas do client/cron e o knip não enxerga.
- **Componentes shadcn ui não-usados agora** (`badgeVariants`, `buttonVariants`, `DialogPortal`, `DialogOverlay`, `DialogClose`, `DialogTrigger`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`, `CardFooter`, `CardDescription`) — fazem parte da API pública dos componentes shadcn e podem ser usados a qualquer momento; remover quebraria a interoperabilidade esperada.
- **Tipos do Supabase gerados** (`Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `CompositeTypes`, `Constants`) — gerados automaticamente, não tocar.
- **`SpinnerButtonProps`, `TextareaProps`, `ConfirmDialogProps`, `BadgeProps`, `ConfirmOptions`, `WorkflowStatus`, `RouteKey`** — types públicos de componentes/hook que ajudam consumidores; manter.
- **`SensitiveText` default export** será removido somente após confirmar com `rg` que ninguém usa `import SensitiveText from`.

## Verificação antes de cada remoção

Para cada símbolo da lista acima:
1. `rg "<símbolo>" src` — se aparecer fora do arquivo de origem, **não remove**.
2. Se o símbolo só aparece na própria definição, é seguro retirar.

## Arquivos afetados

```
src/components/SensitiveText.tsx
src/components/ui/back-button.tsx
src/components/cmv/cmv-month.tsx
src/components/dre/dre-shared.tsx
src/lib/dre-categories.ts
src/lib/format.ts
src/lib/ocr-utils.ts
src/lib/ponto-rules.ts
src/hooks/use-toast.ts
package.json   (apenas remoção de deps órfãs)
```

## Verificação final

Após a limpeza:
- Build TypeScript precisa passar (harness roda automaticamente).
- Nenhum import quebrado em `src/`.
- Lista de rotas em `App.tsx` permanece idêntica.

## O que muda visualmente para o usuário

Nada. Sem alteração de UI, rotas ou comportamento. Bundle fica um pouco menor (algumas centenas de KB) ao remover `date-fns`/`zod`/`@playwright/test`.
