## Diagnóstico

A navegação real do app é feita via `ResponsiveNav` (`DesktopSidebar` + `MobileDock`), que cada `*Layout.tsx` consome passando o `nav-items.ts` do módulo.

Existem 5 arquivos `NavBar*.tsx` por módulo que **não são importados em lugar nenhum** — código morto, provavelmente sobra de uma versão anterior:

- `src/components/cmv/NavBarCmv.tsx`
- `src/components/dre/NavBarDre.tsx`
- `src/components/financeiro/NavBarFinanceiro.tsx`
- `src/components/empresas-modulo/NavBarEmpresasModulo.tsx`
- `src/components/marketing/NavBarMarketing.tsx`

Verificado com `rg`: nenhum import desses símbolos fora dos próprios arquivos.

## Plano

1. Deletar os 5 arquivos acima.
2. **Não tocar** em `nav-items.ts` de cada módulo (usados pelos Layouts).
3. **Não tocar** em `ResponsiveNav`, `DesktopSidebar`, `MobileDock`.
4. Rodar build e confirmar que passa.

## Risco

Baixo — arquivos isolados e sem importadores. Se o build quebrar, restaurar.

## Entregável

- 5 arquivos deletados
- Build OK
- Lista final de arquivos removidos
