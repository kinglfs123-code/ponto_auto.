

## Plano: Módulo de Ponto com Múltiplos CNPJs

### Visão geral

Sistema completo de fechamento de ponto: cadastro de empresas (CNPJ), importação de arquivos (CSV/JSON/Excel + leitura por IA), regras trabalhistas (tolerância, exceções), cálculos automáticos, geração de PDF por CNPJ, e histórico de relatórios. Tudo protegido por autenticação.

### Fluxo do usuário

```text
Login → Cadastra empresas (CNPJ/nome/jornada)
  ↓
Importar Ponto → Seleciona empresa → Upload arquivo OU foto
  ↓
Sistema aplica tolerância 10min → Detecta exceções
  ↓
Usuário revisa/corrige manualmente → Salva no banco
  ↓
Finaliza ciclo → Gera PDF de fechamento por CNPJ
  ↓
Histórico → Consulta relatórios anteriores por empresa
```

### Banco de dados (4 tabelas + storage)

1. **empresas** — id, owner_id (auth.uid), cnpj, nome, jornada_padrao (default "07:20"), created_at
2. **folhas_ponto** — id, empresa_id (FK), funcionario, mes_referencia (text "2026-04"), status (enum: rascunho/finalizada), created_at
3. **registros_ponto** — id, folha_id (FK), dia (int), hora_entrada, hora_saida, hora_entrada_tarde, hora_saida_tarde, hora_entrada_extra, hora_saida_extra, horas_normais (numeric), horas_extras (numeric), horas_noturnas (numeric), tipo_excecao (text: atraso/saida_antecipada/falta/null), corrigido_manualmente (bool), obs (text)
4. **relatorios** — id, empresa_id (FK), mes_referencia, pdf_path (text), created_at

**Storage bucket**: `relatorios` (privado) para os PDFs gerados.

**RLS**: Todas as tabelas com owner_id = auth.uid() via helper functions (security definer) para evitar recursão.

### Autenticação

- Página de login/cadastro com email e senha
- Verificação de email habilitada (padrão)
- Rotas protegidas via componente AuthGuard

### Rotas da aplicação

| Rota | Página |
|------|--------|
| `/login` | Login/Cadastro |
| `/` | Dashboard — lista empresas cadastradas |
| `/empresas` | CRUD de empresas (CNPJ com máscara, nome, jornada) |
| `/ponto` | Importação de ponto (seletor de empresa + upload) |
| `/ponto/:folhaId` | Visualização/edição de uma folha |
| `/relatorios` | Histórico de relatórios por empresa |

### Importação de dados (página /ponto)

1. **Seletor de empresa** no topo (dropdown com CNPJs cadastrados)
2. **Dois modos de importação**:
   - **Arquivo** (CSV/JSON/Excel): parse client-side com Papa Parse (CSV), xlsx (Excel), ou JSON nativo. Campos esperados: funcionario, data, hora_entrada, hora_saida
   - **Foto** (modo atual): IA lê a imagem via edge function existente
3. Após parse, dados são normalizados e exibidos na tabela para revisão

### Regras de negócio

- **Tolerância 10 min**: entrada até +10min do horário padrão é considerada "no horário" (sem atraso)
- **Detecção de exceções automática**:
  - Atraso: entrada > horário + 10min
  - Saída antecipada: saída antes do horário previsto
  - Falta: sem registros no dia útil
- **Horas noturnas**: horários entre 22:00 e 05:00
- **Correção manual**: campo editável com flag `corrigido_manualmente`
- **Cálculo diário e mensal**: horas normais, extras, noturnas, saldo

### Geração de PDF (edge function)

- Nova edge function `generate-report` que:
  - Recebe empresa_id + mes_referencia
  - Busca dados do banco (folhas + registros daquela empresa/mês)
  - Gera PDF com: cabeçalho (nome empresa, CNPJ, mês), tabela por funcionário (dias, entradas, saídas, horas, exceções), sumário (totais de horas normais/extras/noturnas)
  - Salva no storage bucket `relatorios`
  - Insere registro na tabela `relatorios`
- O PDF é baixável via URL assinada

### Histórico de relatórios

- Página `/relatorios` com filtro por empresa e período
- Lista de PDFs gerados com data, empresa, mês de referência
- Botão de download para cada relatório

### Detalhes técnicos de implementação

**Arquivos novos**:
- `src/pages/Login.tsx` — auth
- `src/pages/Empresas.tsx` — CRUD empresas
- `src/pages/Ponto.tsx` — importação com seletor de empresa
- `src/pages/FolhaDetalhe.tsx` — visualização/edição de folha
- `src/pages/Relatorios.tsx` — histórico
- `src/components/AuthGuard.tsx` — proteção de rotas
- `src/components/EmpresaSelector.tsx` — dropdown reutilizável
- `src/components/FileImporter.tsx` — parse CSV/JSON/XLSX
- `src/lib/ponto-rules.ts` — tolerância, exceções, cálculos
- `supabase/functions/generate-report/index.ts` — geração de PDF

**Bibliotecas adicionais**: papaparse (CSV), xlsx (Excel)

**Migration SQL**: criação das 4 tabelas, helper functions RLS, policies, storage bucket

