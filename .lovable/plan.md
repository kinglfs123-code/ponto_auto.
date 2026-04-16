## Plano: Nova página "Cadastro de Colaboradores" (RH Control)

Vou criar uma nova página mantendo a integração com o backend existente de funcionários.

### O que será feito

1. **Nova página `src/pages/RHControl.tsx**`
  - Layout exato do mockup: header , seções "Colaborador", "Prazos", "Documentos", "Arquivos"
  - Campo de busca por nome/CPF/matrícula no topo
  - Botões "Novo cadastro", "Documentos", "Vencimentos"
  - Form completo integrado à tabela `funcionarios` existente
  - Status pills (Ativo / Férias / Desligado)
  - Upload de arquivos (PDF, DOCX, JPEG, PNG até 10MB) usando Supabase Storage
2. **Adicionar rota `/rh-control` em `src/App.tsx**` (protegida por AuthGuard)
3. **Adicionar link no `NavBar**` para acesso à nova página

### Pontos a esclarecer

Antes de implementar, preciso confirmar alguns pontos: