

## Plano: Padronização do português, novo layout da folha de ponto e melhor visualização

Três frentes claras:

### 1. Padronização de escrita e ortografia (PT-BR)

Vou varrer todos os textos visíveis ao usuário (`.tsx` em `src/pages` e `src/components`) e padronizar:

- Adicionar acentos onde faltam: "Funcionário", "Salário", "Férias", "Horário", "Mês ref.", "Exceção", "Atestado", "Próximo", "Última".
- Padronizar termos: usar **"Colaborador"** em todos os lugares onde hoje aparece "Funcionário" na UI (mantendo `funcionario_id` no banco, sem mexer em schema).
- Padronizar abreviações de cabeçalhos da tabela de ponto: `Ent M / Saí M / Ent T / Saí T` → `Manhã / Almoço / Volta / Saída` (mais claro, em linha com a planilha enviada).
- Capitalização consistente em títulos e botões (Title Case em títulos, Sentence case em botões).
- Mensagens de toast em tom uniforme e impessoal ("Folha salva com sucesso", "Não foi possível excluir").

Lista exata de termos corrigidos será aplicada em: `Ponto.tsx`, `FolhaDetalhe.tsx`, `Funcionarios.tsx`, `FuncionarioDetalhe.tsx`, `Holerites.tsx`, `Relatorios.tsx`, `Empresas.tsx`, `Dashboard.tsx`, `NavBar.tsx`.

### 2. Novo layout da folha de ponto (estilo planilha enviada)

A imagem mostra um modelo limpo de **Folha de Ponto Mensal** com cabeçalho fixo e tabela de 5 colunas. Vou aplicar isso em **dois lugares**:

**a) `FolhaDetalhe.tsx` (visualização da folha já salva):**
- Cabeçalho no topo (fora da tabela): Empresa, Nome do colaborador, Cargo/Função, Horário de entrada, Horário de saída, Mês, Ano.
- Tabela com 5 colunas apenas: **Dia | Entrada | Saída para intervalo | Volta do intervalo | Saída**
- **Remover** as colunas: Ent E / Saí E (extra), Normal, Extra, Not., Exceção, **Obs**.
- Os totais (Normais, Extras, Noturnas) ficam em cards **acima** da tabela (não dentro).
- Bordas pretas finas, fundo branco, texto preto no tema claro.
- No tema escuro: fundo do card preto, bordas brancas, texto branco — sem inversões de cor por status (mantém apenas preto/branco como pediu).

**b) `Ponto.tsx` (importação/edição via OCR):**
- Mantém a coluna Exceção (necessária para marcar Folga/Falta/Atestado) e os campos editáveis, **mas remove a coluna Obs**.
- Renomeia cabeçalhos para `Manhã / Almoço / Volta / Saída` (e mantém Extra E/S num grupo recolhível ou remove se não for usado — vou remover por padrão; se precisar reativar é trivial).
- Esquema preto/branco no tema claro/escuro nas células e bordas (cores semânticas só em totais e badges de exceção).

### 3. Enquadramento e visualização

- **Largura útil**: aumentar `max-w-5xl` → `max-w-6xl` em `FolhaDetalhe` e `Ponto` para a folha caber melhor.
- **Tabela responsiva**: a tabela atual tem `min-w-[600px]` com scroll horizontal forçado em mobile. Vou:
  - Manter scroll horizontal em telas estreitas.
  - Em desktop (≥768px) usar `w-full table-fixed` com larguras proporcionais por coluna (Dia 8%, demais 23%) para ocupar toda a largura sem espaços vazios.
  - Aumentar o tamanho da fonte da tabela de `text-xs` para `text-sm` e padding `py-2` para leitura confortável.
- **Cabeçalho fixo (sticky)** no topo da tabela quando rolar dentro dela.
- **Zebra striping** sutil (`even:bg-muted/30`) só no tema claro, removido no escuro para manter o preto puro.
- Imprimir/exportar continua usando o gerador de relatório existente (sem mudança).

### Resumo Técnico

| Arquivo | Mudança |
|---|---|
| `src/pages/FolhaDetalhe.tsx` | Novo layout em 5 colunas, cabeçalho com dados do colaborador, cores neutras, tabela larga |
| `src/pages/Ponto.tsx` | Remover coluna Obs, renomear cabeçalhos, neutralizar cores das células, ampliar largura |
| `src/pages/Funcionarios.tsx`, `FuncionarioDetalhe.tsx`, `Holerites.tsx`, `Relatorios.tsx`, `Empresas.tsx`, `Dashboard.tsx`, `NavBar.tsx` | Padronização ortográfica e de termos (Colaborador/Funcionário, acentos, Title Case) |
| `src/index.css` | Se necessário, classe utilitária `.folha-ponto-table` para garantir bordas pretas no claro / brancas no escuro |
| Banco de dados | **Sem mudanças** — campo `obs` continua existindo no schema, só não é exibido |

### O que NÃO muda

- Lógica de cálculo de horas (`ponto-rules.ts`).
- Schema do banco (mantém `obs` como campo opcional).
- Pipeline de OCR (continua salvando `obs` para uso interno, só não mostra na UI).
- Funcionalidades de excluir / anexar / editar já implementadas.

