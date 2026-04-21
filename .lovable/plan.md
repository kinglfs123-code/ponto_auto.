

## Plano: Limpeza de código duplicado e sem uso

Vou varrer o projeto para identificar e remover código morto, imports não utilizados, duplicações e arquivos órfãos. Antes de executar, preciso fazer essa varredura para listar exatamente o que será removido.

### Etapas

1. **Varredura de arquivos órfãos**
   - Procurar páginas/componentes que não são importados em lugar nenhum
   - Verificar se `src/components/FileImporter.tsx`, `src/components/FuncionarioSelector.tsx`, `src/lib/ocr-utils.ts` ainda têm consumidores
   - Checar arquivos de teste obsoletos (`src/test/example.test.ts`)

2. **Hooks duplicados**
   - `src/hooks/use-toast.ts` e `src/components/ui/use-toast.ts` — verificar duplicação e consolidar em um só
   - Confirmar se `use-workflow-status.ts` ainda é usado

3. **Imports e variáveis não usados**
   - Rodar análise em todas as páginas (`Dashboard`, `Empresas`, `Holerites`, `Ponto`, `FolhaDetalhe`, `Relatorios`, `Funcionarios`, `Login`, `Unsubscribe`, `NotFound`)
   - Remover imports de ícones, componentes e funções que sobraram após edições anteriores

4. **CSS e estilos mortos**
   - `src/App.css` (provavelmente do scaffold inicial Vite e não utilizado)
   - Classes/animações em `src/index.css` que não são referenciadas

5. **Migrations e edge functions órfãos**
   - Verificar se há edge functions sem rota ativa (ex: `preview-transactional-email` se não estiver em uso real)
   - **Não vou tocar em migrations** já aplicadas (somente as `.sql` de bucket de RH Control criadas e depois descartadas — verificar se podem ser anuladas com nova migration)

6. **Tipos duplicados**
   - Conferir `src/types/index.ts` vs definições inline espalhadas pelas páginas

### Regras que vou seguir

- **Não vou alterar comportamento** — só remover o que comprovadamente não tem uso
- **Não vou mexer** em `src/integrations/supabase/client.ts`, `types.ts` nem `.env`
- **Não vou apagar** componentes UI da pasta `src/components/ui/` mesmo que não usados (são biblioteca shadcn, podem ser usados depois)
- **Migrations já aplicadas não são deletadas** — se houver bucket órfão do RH Control, crio nova migration de cleanup

### Entregável

Ao final, vou listar no chat:
- Arquivos deletados
- Linhas removidas por arquivo
- Qualquer dúvida sobre algo ambíguo (peço confirmação antes de remover)

