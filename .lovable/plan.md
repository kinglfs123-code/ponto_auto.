
# Limpeza de código: ~100 linhas desnecessárias e correções

Varredura completa do projeto. Abaixo, as ações organizadas por tipo.

---

## 1. Linhas em branco duplicadas (~40 linhas)
Arquivos com múltiplas linhas em branco consecutivas ou excesso de espaçamento:
- `src/pages/FuncionarioDetalhe.tsx` — 73 linhas em branco (reduzir para ~35)
- `src/pages/Ponto.tsx` — 41 linhas em branco (reduzir para ~20)
- `src/hooks/use-toast.ts` — 30 linhas em branco (reduzir para ~15)
- `src/pages/Holerites.tsx` — 28 (reduzir para ~14)
- `src/components/AnaliseContrato.tsx` — 27 (reduzir para ~13)
- `src/pages/financeiro/Contas.tsx` — 25 (reduzir para ~12)
- `src/components/dre/dre-shared.tsx` — 24 (reduzir para ~12)
- `src/pages/empresas-modulo/Cobrancas.tsx` — 22 (reduzir para ~11)
- `src/pages/Funcionarios.tsx` — 21 (reduzir para ~10)
- `src/components/SensitiveText.tsx` — linhas em branco finais
- `src/components/ui/back-button.tsx` — linhas em branco finais

## 2. Comentários desnecessários / óbvios (~30 linhas)
Remover comentários que apenas descrevem o que o código já diz:
- `src/pages/FuncionarioDetalhe.tsx` — ~20 comentários tipo `// Holerite upload`, `// Folha`, `// Edit funcionario`, `// Férias form`, `// ==== Documentos ====`, etc.
- `src/lib/ponto-rules.ts` — ~10 comentários descritivos tipo `// Handle overnight`, `// Check overlap`, `// Detect exceptions from obs`
- `src/lib/format.ts` — comentários `// Pure date`, `// Datetime ISO`, `// Fallback`
- `src/lib/ocr-utils.ts` — `// Contrast boost`

## 3. Comentários eslint-disable (~5 linhas)
- `src/components/AnaliseContrato.tsx` — 4x `// eslint-disable-next-line react-hooks/exhaustive-deps`
- `src/components/FuncionarioSelector.tsx` — 1x `// eslint-disable-next-line react-hooks/exhaustive-deps`
Corrigir adicionando as dependências corretas aos arrays ou usar hooks adequadamente.

## 4. `as any` casts (~2 linhas)
- `src/pages/FolhaDetalhe.tsx:92` — `as any` no update
- `src/pages/Ponto.tsx:310` — `as any` no insert
Substituir por tipagem correta usando os tipos gerados do Supabase.

## 5. Trailing whitespace / EOF cleanup (~5 linhas)
- `src/components/SensitiveText.tsx` — linha 67-68 em branco no final
- `src/components/ui/back-button.tsx` — linhas 44-45 em branco no final
- `src/pages/cmv/Home.tsx` — linha 38 em branco extra
- `src/pages/financeiro/Fornecedores.tsx` — linha 25 em branco extra

## 6. Warnings de `forwardRef` no console (~2 correções)
O console mostra warnings porque `BackButton` e `SettingsMenu` são usados como children de componentes que tentam passar ref. Não é erro real pois não usam `asChild` diretamente, mas podemos limpar o warning envolvendo com `forwardRef`.

---

### Resumo de impacto
| Tipo | Linhas removidas/corrigidas |
|------|---------------------------|
| Linhas em branco | ~40 |
| Comentários desnecessários | ~30 |
| eslint-disable | ~5 |
| as any | ~2 |
| EOF/trailing | ~5 |
| forwardRef fixes | ~10 (adicionadas, mas corrigem warnings) |
| **Total** | **~82 linhas removidas + 2 warnings corrigidos** |

Nenhuma alteração funcional — apenas limpeza de código.
