

## Plano: melhorias finais de UX antes de publicar

Foco em 5 áreas — **confirmação visual**, **validações fortes**, **estados de loading**, **mensagens de erro amigáveis** e **acessibilidade/touch**. Mantém todo comportamento atual.

---

### 1. Componentes utilitários (novos)

**`src/components/ui/confirm-dialog.tsx`** — modal reutilizável (baseado em `Dialog` que já existe), substitui todos os `confirm()` do navegador:
- Props: `open`, `title`, `description`, `confirmLabel`, `cancelLabel`, `variant ('danger' | 'default')`, `loading`, `onConfirm`, `onOpenChange`.
- Botão de confirmar fica vermelho (`variant="destructive"`) quando `variant="danger"`, com spinner + `disabled` durante `loading`.
- Mensagem padrão para deleção: *"Tem certeza que deseja excluir [item]? Esta ação não pode ser desfeita."*

**`src/hooks/use-confirm.tsx`** — hook que expõe `confirm({...})` retornando `Promise<boolean>`. Renderiza um único `<ConfirmDialog>` controlado por estado interno via Provider em `App.tsx`. Permite chamar `await confirm({...})` em vez do `window.confirm`.

**`src/components/ui/spinner-button.tsx`** (opcional) — wrapper fino sobre `Button` que aceita `loading: boolean` e renderiza `<Loader2 className="animate-spin" />` + texto, e força `disabled` enquanto carrega. Reaproveitado em todas as ações.

**`src/lib/error-messages.ts`** — função `friendlyError(err)` que traduz erros técnicos:
| Padrão detectado | Mensagem amigável |
|---|---|
| `Failed to fetch` / `Network` | "Não foi possível conectar. Verifique sua internet." |
| `JWT expired` / `not authenticated` | "Sua sessão expirou. Faça login novamente." |
| `permission denied` / `42501` / `Unauthorized` | "Você não tem permissão para esta ação." |
| `duplicate key` / `23505` | "Este registro já existe." |
| `violates foreign key` / `23503` | "Não é possível excluir: existem itens vinculados." |
| `value too long` / `22001` | "Algum campo ultrapassou o limite de caracteres." |
| validação Zod | concatena `issues[].message` |
| fallback | "Algo deu errado. Tente novamente em instantes." |

Todos os `toast({ description: error.message })` passam a usar `friendlyError(err)`.

---

### 2. Validações reforçadas em `src/lib/ponto-rules.ts`

- `validateCPF`: implementar **dígitos verificadores** completos (algoritmo módulo 11), além de rejeitar sequências como `111.111.111-11`.
- `validateCNPJ`: idem com módulo 11 (pesos 5,4,3,2,9,8,7,6,5,4,3,2 / 6,5,4,3,2,9,8,7,6,5,4,3,2).
- Novas funções:
  - `validateEmail(v)` — regex RFC simplificada + `.includes('@')` + domínio com TLD ≥ 2.
  - `maskTelefoneBR(v)` — `(11) 91234-5678` ou `(11) 1234-5678`.
  - `validateTelefoneBR(v)` — 10 ou 11 dígitos, DDD válido (11–99).

Todas retornam `{ valid: boolean, message?: string }` para alimentar erros inline.

---

### 3. Validação inline (em tempo real, ao perder foco)

**Padrão aplicado a todos os formulários** (`Funcionarios`, `Empresas`, `FuncionarioDetalhe → editar`, holerite, férias):

- Estado local `errors: Record<string, string>` e `touched: Record<string, boolean>`.
- `onBlur` marca `touched[campo] = true` e roda validação do campo.
- `onChange` limpa o erro se o valor virou válido (UX positiva).
- Render: abaixo do `<Input>`, mostrar `<p class="text-xs text-destructive mt-1">{errors.campo}</p>` quando `touched && errors[campo]`.
- Borda do `Input` ganha `aria-invalid` + classe `border-destructive` quando tem erro.
- Botão Salvar fica `disabled` se há **qualquer** erro ou campo obrigatório vazio.

Campos validados:
- **Empresa**: nome (obrigatório, ≥ 2 chars), CNPJ (14 dígitos + DV), jornada (HH:MM válido).
- **Colaborador**: nome (obrigatório), CPF (11 dígitos + DV), e-mail (formato), data nascimento (não futura), entrada/saída/intervalo (HH:MM).
- **Holerite/upload**: tipo MIME PDF + tamanho ≤ 10MB.

---

### 4. Substituir todos os `window.confirm(...)`

Trocar por `await confirm({...})` do novo hook nos arquivos:

| Arquivo | Ações |
|---|---|
| `Empresas.tsx` | excluir empresa |
| `Funcionarios.tsx` | excluir colaborador |
| `FuncionarioDetalhe.tsx` | excluir documento, holerite, folha, férias |
| `Holerites.tsx` | excluir PDF; **NOVO**: confirmação de "Enviar todos por e-mail" mostrando contagem (*"Enviar holerite para 12 colaboradores?"*) |
| `Relatorios.tsx` | excluir folha, excluir folhas do mês, excluir relatório |

Botão de confirmar sempre vermelho quando for deleção.

---

### 5. Loading states + botões anti-duplo-clique

Padronizar em **todos** os botões de ação (Salvar, Excluir confirmado, Enviar, Anexar, Gerar relatório, Conectar Google, Sincronizar férias, Analisar contrato):

- Estado `loading: boolean` local (já existe na maioria — completar onde falta).
- Botão usa o novo `SpinnerButton` ou padrão: `disabled={loading}` + `<Loader2 className="h-4 w-4 animate-spin" />` + texto "Salvando…", "Excluindo…", "Enviando…".
- Toast de sucesso após cada ação (já existe na maior parte — completar onde falta, ex: `Empresas.remove`, `Relatorios.deleteRelatorio`).
- Toast de erro sempre via `friendlyError()`.

---

### 6. Skeletons em listas

Onde hoje só aparece "carregando" implícito ou tela vazia, adicionar skeletons enquanto `loading === true`:

- `Funcionarios.tsx` — 5 skeleton cards/linhas.
- `Empresas.tsx` — 3 skeleton cards.
- `FuncionarioDetalhe.tsx` — header + 3 sections de skeleton.
- `Relatorios.tsx` — skeleton da tabela.
- `Holerites.tsx` já tem.

---

### 7. Acessibilidade básica + mobile touch

Aplicado de forma global:

- Todo `<Input>` recebe `<Label htmlFor>` correspondente + `id` (alguns hoje têm `<Label>` solto).
- Foco visível: `Input` já tem `focus-visible:ring-2`. Garantir o mesmo em `button[size="icon"]` aumentando `ring-offset-2`.
- Botões de ícone (`Pencil`/`Trash2`) hoje são `h-7 w-7` (28px) — em mobile (`useIsMobile`) usar `h-11 w-11` (44px) atendendo touch target mínimo. Em desktop manter compacto.
- Em `ConfirmDialog`, o `DialogContent` já é centralizado; adicionar `max-h-[90vh] overflow-y-auto` para garantir scroll em telas pequenas.
- Tabelas (`Funcionarios`, `Relatorios`) wrappadas em `<div className="overflow-x-auto">` para scroll horizontal em mobile (já há fallback de cards, mas reforço).
- `placeholder` descritivo onde falta (ex: e-mail "joao@empresa.com.br", telefone "(11) 91234-5678").

---

### Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/components/ui/confirm-dialog.tsx` | **NOVO** — modal de confirmação reutilizável |
| `src/hooks/use-confirm.tsx` | **NOVO** — provider + hook `useConfirm()` |
| `src/components/ui/spinner-button.tsx` | **NOVO** — botão com spinner integrado |
| `src/lib/error-messages.ts` | **NOVO** — `friendlyError()` |
| `src/lib/ponto-rules.ts` | DV de CPF/CNPJ + `validateEmail`, `maskTelefoneBR`, `validateTelefoneBR` |
| `src/App.tsx` | Envolver app no `ConfirmProvider` |
| `src/pages/Empresas.tsx` | Validação inline, ConfirmDialog, friendlyError, skeleton |
| `src/pages/Funcionarios.tsx` | Validação inline, ConfirmDialog, friendlyError, skeleton, touch targets mobile |
| `src/pages/FuncionarioDetalhe.tsx` | Substituir 4× `confirm()`, validação inline no editar, friendlyError nos uploads |
| `src/pages/Holerites.tsx` | Confirmação de envio em massa, ConfirmDialog para excluir |
| `src/pages/Relatorios.tsx` | 3× ConfirmDialog, toast de sucesso onde falta, skeleton |

Sem mudanças em backend, RLS ou edge functions. Sem novas dependências.

