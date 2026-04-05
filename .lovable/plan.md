

## Plano: Corrigir "Ler Folha" que não funciona

### Diagnóstico

A edge function `read-timesheet` está ativa (teste OK retorna "OK"), mas ao enviar uma imagem real para o Gemini 2.5 Pro, o processamento provavelmente **excede o timeout** da edge function (~60s). O modelo Pro com imagens grandes pode levar mais tempo que o permitido.

Além disso, há problemas menores:
- Warnings de ref no `EmpresaSelector` e `FileImporter` (componentes sem `forwardRef`)
- O pré-processamento de imagem (binarização) pode gerar arquivos muito pesados
- Falta feedback claro de erro para o usuário quando algo falha silenciosamente

### Correções

#### 1. Reduzir tamanho da imagem e simplificar pré-processamento
- Baixar resolução de 1200px para 900px (bom equilíbrio qualidade/velocidade)
- Remover binarização agressiva (a IA consegue ler sem isso e o base64 fica menor)
- Manter apenas boost de contraste leve

#### 2. Trocar para modelo mais rápido na edge function
- Usar `google/gemini-2.5-flash` ao invés de `google/gemini-2.5-pro` — é 3-5x mais rápido e ainda tem boa capacidade de visão
- Manter o prompt engenheirado e tool calling (structured output)
- Reduzir `max_tokens` de 8000 para 4000

#### 3. Adicionar timeout no client
- Timeout de 55 segundos no `fetch` com `AbortController`
- Mensagem clara se der timeout: "A leitura demorou demais. Tente com uma foto menor ou mais nítida."

#### 4. Corrigir warnings de ref
- `EmpresaSelector`: não precisa de ref, o warning vem do Radix Select — inofensivo mas vamos limpar
- `FileImporter`: mesmo caso

### Arquivos modificados
- `supabase/functions/read-timesheet/index.ts` — modelo flash, max_tokens menor
- `src/pages/Ponto.tsx` — pré-processamento simplificado, timeout no fetch, melhor feedback
- `src/components/EmpresaSelector.tsx` — fix ref warning
- `src/components/FileImporter.tsx` — fix ref warning

