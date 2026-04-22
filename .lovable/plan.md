

## Plano: otimizações finais de performance

Foco em **lazy loading de rotas** (maior impacto no first paint), **queries enxutas + índices**, **paginação** em listas longas, **limpeza de dependências** e **memoização** onde compensa. Sem mudar comportamento.

---

### 1. Lazy loading de rotas (`src/App.tsx`)

Trocar `import Dashboard from "@/pages/Dashboard"` por `React.lazy(() => import(...))` para todas as páginas autenticadas. **Login fica eager** (precisa ser instantâneo). Envolver `<Routes>` em `<Suspense fallback={<RouteFallback />}>` mostrando uma tela neutra com o mesmo `bg-background` + spinner pequeno (zero CLS).

Resultado: cada rota vira um chunk separado (ex: `Funcionarios-[hash].js`, `Holerites-[hash].js`), e o bundle inicial cai de ~1 arquivo grande para ~10–11 chunks carregados sob demanda.

**Pré-fetch leve**: no hover/focus dos links da NavBar, chamar a função `import(...)` para já baixar o chunk antes do clique (`onMouseEnter` / `onFocus`).

---

### 2. Otimização de queries (campos específicos)

Substituir `select('*')` por seleção explícita nos arquivos abaixo — reduz payload e evita transferir colunas inúteis:

| Arquivo | Tabela | Campos a manter |
|---|---|---|
| `Empresas.tsx` | empresas | `id, nome, cnpj, jornada_padrao, owner_id, created_at` |
| `Dashboard.tsx` | empresas | `id, nome` |
| `Funcionarios.tsx` | funcionarios | `id, nome_completo, cpf, email, cargo, data_nascimento, horario_entrada, horario_saida, intervalo, empresa_id` |
| `Holerites.tsx` | holerites | `id, funcionario_id, mes_referencia, pdf_path, enviado, enviado_em, created_at` |
| `Relatorios.tsx` | folhas_ponto | `id, funcionario, mes_referencia, status, created_at` |
| `Relatorios.tsx` | relatorios | `id, mes_referencia, pdf_path, created_at` |
| `FolhaDetalhe.tsx` | registros_ponto | só os campos usados (já tem join enxuto pra empresas) |
| `FuncionarioDetalhe.tsx` | mesmas seleções enxutas pra 4 tabelas paralelas |
| `AnaliseContrato.tsx` | contratos_analise + contrato_alertas | campos exibidos |

---

### 3. Índices faltando no banco (migration)

Hoje só `funcionarios` e `contratos_analise/alertas/correcoes/func_docs/func_ferias` têm índices em FKs. Criar:

```sql
-- folhas_ponto: filtra muito por empresa_id e funcionario_id
create index if not exists idx_folhas_ponto_empresa on public.folhas_ponto(empresa_id);
create index if not exists idx_folhas_ponto_funcionario on public.folhas_ponto(funcionario_id);
create index if not exists idx_folhas_ponto_empresa_mes on public.folhas_ponto(empresa_id, mes_referencia desc);

-- holerites: queries sempre por empresa+mes ou funcionario
create index if not exists idx_holerites_empresa_mes on public.holerites(empresa_id, mes_referencia);
create index if not exists idx_holerites_funcionario on public.holerites(funcionario_id);

-- registros_ponto: já filtra por folha_id (FK não indexada)
create index if not exists idx_registros_folha on public.registros_ponto(folha_id);

-- relatorios: lista por empresa+data
create index if not exists idx_relatorios_empresa on public.relatorios(empresa_id, created_at desc);

-- empresas: owner_id é usado na função user_owns_empresa
create index if not exists idx_empresas_owner on public.empresas(owner_id);
```

Impacto direto em RLS (a `user_owns_empresa` faz lookup por `id+owner_id`) e nas listas de holerites/relatórios.

---

### 4. Paginação em listas grandes

Limite inicial **50 itens** com botão "Carregar mais" (mantém UX simples, sem reescrever pra cursor):

- `Funcionarios.tsx`: `.range(0, 49)` + estado `page`. "Carregar mais 50" abaixo da lista.
- `Holerites.tsx`: a tabela já é por mês (poucos registros) — paginar **só** `funcionarios` quando >50.
- `Relatorios.tsx`: paginar `folhas_ponto` (quando empresa tem muitos meses) e `relatorios`.
- `FuncionarioDetalhe.tsx`: paginar `folhas_ponto`, `holerites`, `documentos`, `férias` (cada lista 20 inicial + "Carregar mais").

Onde a contagem é importante mostrar, usar `{ count: 'exact', head: true }` em request paralelo barato.

---

### 5. Remoção de dependências não utilizadas

Após inspeção (`src/components/ui/` só tem 16 primitivos usados; o restante das libs está órfão), **remover do `package.json`**:

| Pacote | Por que |
|---|---|
| `@radix-ui/react-accordion` | sem `accordion.tsx` |
| `@radix-ui/react-alert-dialog` | substituído pelo `ConfirmDialog` |
| `@radix-ui/react-aspect-ratio` | não usado |
| `@radix-ui/react-avatar` | não usado |
| `@radix-ui/react-checkbox` | não usado |
| `@radix-ui/react-collapsible` | não usado |
| `@radix-ui/react-context-menu` | não usado |
| `@radix-ui/react-hover-card` | não usado |
| `@radix-ui/react-menubar` | não usado |
| `@radix-ui/react-navigation-menu` | não usado |
| `@radix-ui/react-progress` | não usado |
| `@radix-ui/react-radio-group` | não usado |
| `@radix-ui/react-scroll-area` | não usado |
| `@radix-ui/react-separator` | não usado |
| `@radix-ui/react-slider` | não usado |
| `@radix-ui/react-switch` | não usado |
| `@radix-ui/react-toggle` / `toggle-group` | não usado |
| `embla-carousel-react` | sem carousel |
| `vaul` | sem drawer |
| `cmdk` | sem command palette |
| `recharts` | sem gráficos (Dashboard usa cards) |
| `react-day-picker` | sem calendar (campos `<input type="date">`) |
| `react-hook-form` + `@hookform/resolvers` | forms são controlados manualmente |
| `input-otp` | sem OTP |
| `react-resizable-panels` | sem painéis redimensionáveis |
| `next-themes` | `ThemeContext` próprio já cuida disso |

Manter: `lucide-react`, `sonner` (usado no Toaster?), `tailwind-merge`, `clsx`, `class-variance-authority`, `date-fns`, `tailwindcss-animate`, todos os Radix em uso (dialog, dropdown-menu, label, popover, select, slot, tabs, toast, tooltip, ai). **Validar com `grep` cada um antes de remover** — se algum primitivo `ui/*.tsx` não-listado importar, mantém o pacote.

Ganho estimado: **~30–40% no bundle vendor** (recharts + embla + cmdk + react-hook-form somam centenas de KB).

---

### 6. Otimizações React (anti re-render)

- **`EmpresaContext`**: envolver `value` em `useMemo` e expor `setEmpresa` estável (já é `useState` setter, ok). Hoje cada render do provider cria objeto novo e refaz toda a árvore.
- **`ThemeContext`**: idem.
- **`NavBar.tsx`**: `React.memo` (renderiza em todas as páginas com mesmas props).
- **`EmpresaSelector` / `FuncionarioSelector`**: `React.memo` + `useCallback` no `onChange` dentro dos pais que renderizam frequentemente (`Holerites`, `Funcionarios`, `Ponto`).
- **`Holerites.tsx`**: extrair `HoleriteRow` em componente memoizado (lista de até 50+ funcionários re-renderiza todos quando um upload progride).
- **`Funcionarios.tsx`**: a função `validateFuncionario(form)` roda em todo render — embrulhar em `useMemo([form])`.
- **AuthGuard**: já está ok, sem mudança.

---

### 7. QueryClient configurado

Trocar `new QueryClient()` cru por:

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,           // 1 min
      gcTime: 5 * 60_000,          // 5 min
      refetchOnWindowFocus: false, // evita refetch agressivo
      retry: 1,
    },
  },
});
```

Hoje `Dashboard`, `EmpresaSelector`, `useWorkflowStatus` usam React Query — vão se beneficiar imediatamente do cache compartilhado.

---

### 8. Otimização do asset de fundo

`src/assets/login-bg.jpg` (77 KB) — converter para **WebP** (~25 KB) e referenciar com `<img loading="lazy" decoding="async">` quando aplicável (no Login fica eager, é LCP). Adicionar `fetchpriority="high"` no Login.

---

### 9. Build: drop console em produção

Adicionar no `vite.config.ts`:

```ts
esbuild: { drop: mode === 'production' ? ['console', 'debugger'] : [] }
```

Isso remove `console.log/info/debug` do bundle final mas **preserva `console.error/warn` em runtime** se você quiser via `pure: ['console.log']` em vez de drop completo. Combinando: `drop: ['debugger'], pure: ['console.log','console.info','console.debug']` — mantém error/warn.

---

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/App.tsx` | `React.lazy` + `<Suspense>`; QueryClient com defaults |
| `src/components/NavBar.tsx` | prefetch on-hover; `React.memo` |
| `src/components/EmpresaSelector.tsx` | `React.memo` + select de campos enxutos |
| `src/components/FuncionarioSelector.tsx` | `React.memo` |
| `src/contexts/EmpresaContext.tsx` | `useMemo` no value |
| `src/contexts/ThemeContext.tsx` | `useMemo` no value |
| `src/pages/Dashboard.tsx` | select enxuto |
| `src/pages/Empresas.tsx` | select enxuto |
| `src/pages/Funcionarios.tsx` | select enxuto, paginação 50, `useMemo` validação |
| `src/pages/Holerites.tsx` | select enxuto, `HoleriteRow` memoizado, paginação funcionarios |
| `src/pages/Relatorios.tsx` | select enxuto, paginação |
| `src/pages/FuncionarioDetalhe.tsx` | select enxuto, paginação dos 4 sub-tabs |
| `src/pages/FolhaDetalhe.tsx` | select enxuto |
| `src/components/AnaliseContrato.tsx` | select enxuto |
| `src/assets/login-bg.webp` | NOVO (substitui .jpg) |
| `src/pages/Login.tsx` | trocar import do bg para webp |
| `vite.config.ts` | `pure: ['console.log','console.info','console.debug']` |
| `package.json` | remover ~25 deps não usadas |
| `supabase/migrations/...` | NEW: 7 índices (folhas, holerites, registros, relatorios, empresas.owner_id) |

Sem mudanças em RLS, edge functions ou regras de negócio.

