

## Plano: Anexar holerite/folha + ações de exclusão e edição no perfil do colaborador

A página `FuncionarioDetalhe` atualmente só lista holerites/folhas existentes, sem permitir anexar novos nem excluir/editar. Vou adicionar essas ações dentro do próprio perfil.

### 1. Aba **Holerites** — adicionar "Anexar PDF" e "Excluir PDF"

Reaproveitar a lógica de `Holerites.tsx` (upload com `upsert`, mesma estrutura de path `${empresa_id}/${mes}/${func_id}.pdf`).

- **Cabeçalho da aba**: campo `<Input type="month">` para selecionar o mês de referência + botão **"Anexar PDF"** (input file oculto, accept `application/pdf`).
- Ao anexar: faz upload no bucket `holerites`, faz upsert na tabela `holerites` (insere se novo, atualiza `pdf_path` e zera `enviado` se já existir naquele mês), recarrega lista.
- **Em cada item da lista**: além de "Ver" e "Enviar", adicionar botão **"Excluir"** (ícone lixeira, vermelho) — remove arquivo do Storage + linha da tabela após confirmação.

### 2. Aba **Folhas** — adicionar "Nova folha" e "Excluir folha"

- **Cabeçalho da aba**: botão **"Nova folha de ponto"** que navega para `/ponto?empresa=<empresa_id>&funcionario=<id>` (a página Ponto já aceita esse pré-preenchimento via query). Alternativa: campo de mês + botão que cria diretamente uma folha em branco vinculada ao funcionário e abre `/ponto/<id_da_folha>`.
- **Em cada folha listada**: ao lado do link de abrir, adicionar botão **"Excluir"** (ícone lixeira) — remove de `folhas_ponto` (cascata via FK não existe; vou também apagar `registros_ponto` da folha antes) após confirmação.

### 3. Aba **Resumo** — adicionar "Editar informações"

Botão **"Editar"** no card de cabeçalho (ao lado do nome) abre um modal (`Dialog`) com campos:
- Nome completo, CPF, e-mail, cargo, data de nascimento, horário entrada/saída, intervalo.

Ao salvar: `update` na tabela `funcionarios` e recarregar perfil. Reusar máscaras já existentes (`maskCPF`).

### 4. Aba **Férias** — já tem CRUD; apenas adicionar **editar**

Hoje só permite criar e excluir. Adicionar botão **lápis** em cada card de férias que abre o mesmo formulário pré-preenchido para `update`.

### 5. Aba **Documentos** — sem mudanças

Já tem anexar e excluir.

### Resumo Técnico

| Arquivo | Mudança |
|---|---|
| `src/pages/FuncionarioDetalhe.tsx` | Adicionar: state de mês para holerite, `handleUploadHolerite`, `handleDeleteHolerite`, `handleDeleteFolha`, `handleNovaFolha`, modal de edição do funcionário, modal de edição de férias |
| Nenhuma mudança de schema | Todas as tabelas (`holerites`, `folhas_ponto`, `registros_ponto`, `funcionarios`, `funcionario_ferias`) já existem com RLS adequada |
| Nenhum novo bucket | Reuso de `holerites` |

### Comportamento esperado após as mudanças

- Aba **Holerites**: input de mês + botão "Anexar PDF" no topo; cada holerite tem Ver / Enviar / Excluir.
- Aba **Folhas**: botão "Nova folha" no topo; cada folha tem link para abrir + botão Excluir.
- Aba **Resumo**: botão "Editar" abre modal e atualiza os dados do colaborador.
- Aba **Férias**: cada item ganha botão de editar além do excluir já existente.

