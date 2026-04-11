

## Plano: Aba de Holerites com Envio por E-mail

### O que será feito

Nova página "Holerites" onde o usuário seleciona empresa e mês, faz upload de PDFs de holerite para cada funcionário, e dispara o envio por e-mail para os funcionários que possuem e-mail cadastrado.

### Pré-requisito: Domínio de E-mail

Para enviar e-mails pela plataforma, é necessário configurar um domínio de e-mail. Isso será feito como primeiro passo, através do painel de configuração de e-mails do Lovable Cloud.

### Banco de dados

Nova tabela `holerites`:

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid | PK |
| empresa_id | uuid | FK → empresas.id, NOT NULL |
| funcionario_id | uuid | FK → funcionarios.id, NOT NULL |
| mes_referencia | text | NOT NULL (ex: "2026-04") |
| pdf_path | text | NOT NULL (caminho no storage) |
| enviado | boolean | default false |
| enviado_em | timestamptz | nullable |
| created_at | timestamptz | default now() |

**RLS**: via `user_owns_empresa(empresa_id)`.

### Storage

Novo bucket `holerites` (privado) para armazenar os PDFs.

### Frontend — Nova página `src/pages/Holerites.tsx`

- Seletor de empresa + campo de mês de referência
- Lista de funcionários da empresa selecionada
- Para cada funcionário: botão de upload de PDF e indicador de status (enviado/pendente)
- Botão "Enviar todos" que dispara o e-mail para cada funcionário com e-mail cadastrado e PDF anexado
- Botão individual de envio por funcionário

### Edge Function — `send-holerite`

- Recebe `holerite_id`, busca o PDF no storage, gera signed URL
- Envia e-mail para o funcionário com link para download do PDF (não anexo direto, pois a infra de e-mail não suporta anexos)
- Atualiza `enviado = true` e `enviado_em = now()`

### Navegação

- Novo link "Holerites" no NavBar com ícone `Receipt`
- Nova rota `/holerites` em `App.tsx` (protegida por AuthGuard)

### Fluxo de e-mail

Como a infraestrutura de e-mail do Lovable não suporta anexos, o e-mail conterá um **link seguro (signed URL)** para download do PDF, com validade temporária. O funcionário clica no link e baixa o holerite.

### Etapas

1. Configurar domínio de e-mail (será solicitado ao usuário)
2. Criar infraestrutura de e-mail + template transacional
3. Migration SQL (tabela `holerites` + bucket storage)
4. Edge function `send-holerite`
5. Página `Holerites.tsx` com CRUD e upload
6. Atualizar NavBar e App.tsx

### Arquivos criados/alterados

- **Nova migration** — tabela `holerites`, bucket `holerites`, RLS
- **`supabase/functions/send-holerite/index.ts`** — envio de e-mail com link do PDF
- **`src/pages/Holerites.tsx`** — nova página
- **`src/App.tsx`** — nova rota
- **`src/components/NavBar.tsx`** — novo link
- Template de e-mail transacional para holerite

