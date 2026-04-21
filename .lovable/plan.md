

## Plano: Página individual do colaborador (perfil 360°)

Criar uma nova página de **perfil completo** para cada colaborador, agregando todas as informações dele em um único lugar. Acessível clicando no nome do colaborador na lista de Funcionários.

### 1. Garantir ordenação alfabética
A query de funcionários já usa `.order("nome_completo")`, mas vou reforçar para ignorar maiúsculas/minúsculas e acentos (ordenação consistente em PT-BR).

### 2. Nova rota: `/funcionarios/:id`
Página `src/pages/FuncionarioDetalhe.tsx` com layout em **abas** (estilo iOS 26, glass), exibindo:

| Aba | Conteúdo | Origem dos dados |
|---|---|---|
| **Resumo** | Foto/iniciais, nome, CPF, cargo, e-mail, nascimento, horário, intervalo, botão Editar | tabela `funcionarios` |
| **Folhas de Ponto** | Lista de meses com folhas registradas, status, link para abrir a folha | `folhas_ponto` filtrado por `funcionario_id` |
| **Holerites** | Lista por mês, com Anexar / Excluir / Enviar PDF (mesmas ações da página Holerites, focado neste colaborador) | `holerites` + bucket `holerites` |
| **Documentos** | Upload e listagem de arquivos: Contrato de trabalho, Ficha de EPI, ASO, Outros. Cada categoria mostra arquivos anexados, data e ações (baixar/excluir) | nova tabela `funcionario_documentos` + bucket `colaborador-arquivos` |
| **Férias** | Histórico de períodos de férias (data início, data fim, dias, status, observação) com CRUD | nova tabela `funcionario_ferias` |

### 3. Mudanças no banco de dados

**Nova tabela `funcionario_documentos`**
```
id uuid pk
funcionario_id uuid (referencia funcionarios)
empresa_id uuid (para RLS)
categoria text  -- 'contrato' | 'epi' | 'aso' | 'outros'
nome_arquivo text
storage_path text  -- caminho no bucket colaborador-arquivos
mime_type text
tamanho_bytes int
created_at timestamptz default now()
```
RLS: `user_owns_empresa(empresa_id)` para SELECT/INSERT/DELETE.

**Nova tabela `funcionario_ferias`**
```
id uuid pk
funcionario_id uuid
empresa_id uuid
data_inicio date
data_fim date
dias int
status text  -- 'planejada' | 'em_andamento' | 'concluida'
observacao text
created_at timestamptz default now()
```
RLS idem.

**Bucket `colaborador-arquivos`** já existe — reaproveitar com policies por `auth.uid()`.

### 4. Mudanças na lista de Funcionários
- Tornar a linha/card do colaborador clicável → navega para `/funcionarios/:id`.
- Manter botões Editar e Excluir já existentes (com `stopPropagation`).

### 5. Reaproveitar componentes
- Upload/preview de PDF: lógica similar à de `Holerites.tsx`.
- Tabs: `src/components/ui/tabs.tsx` (já disponível).
- Estilo glass iOS 26: já no `index.css`.

### Resumo Técnico
- **Novos arquivos:** `src/pages/FuncionarioDetalhe.tsx`
- **Editar:** `src/pages/Funcionarios.tsx` (linha clicável), `src/App.tsx` (rota), `src/types/index.ts` (tipos novos)
- **Nova migration:** criação das duas tabelas + RLS

