

## Plano: Melhoria da Leitura por IA com Aprendizado Progressivo

### Problemas atuais

1. **Prompt genérico** — O prompt atual é fixo e não se adapta a formatos diferentes de folha de ponto
2. **Imagem comprimida demais** — Compressão para 600px com qualidade 0.5 perde detalhes importantes
3. **Modelo básico** — Usa `gemini-2.5-flash`; modelos mais potentes existem para visão
4. **Sem pré-processamento inteligente** — Apenas resize, sem melhoria de contraste/nitidez
5. **Sem aprendizado** — Correções manuais do usuário são descartadas, a IA nunca melhora
6. **Uma única tentativa** — Se falha, o usuário precisa reenviar manualmente

### O que vamos construir

#### 1. Pipeline de pré-processamento melhorado (client-side)
- Aumentar resolução máxima para 1200px (ao invés de 600px)
- Qualidade JPEG 0.75 (ao invés de 0.5)
- Aplicar automaticamente: contraste, nitidez e binarização adaptativa (preto/branco) para fotos de documentos
- Permitir enviar múltiplas fotos (frente e verso, ou partes da folha)

#### 2. Prompt engenheirado + modelo superior (edge function)
- Trocar para `google/gemini-2.5-pro` (melhor OCR e raciocínio visual)
- Prompt muito mais detalhado com:
  - Exemplos de formatos comuns de folha de ponto brasileira
  - Instruções para lidar com fotos tortas, borradas, parciais
  - Tratamento de abreviações comuns (F=Folga, FJ=Falta Justificada, AT=Atestado)
  - Validação interna (ex: horário de saída > entrada)
- Usar tool calling (structured output) ao invés de pedir JSON no texto — elimina erros de parsing

#### 3. Sistema de aprendizado progressivo (nova tabela + lógica)
- **Nova tabela `correcoes_ia`** — Armazena o que a IA leu vs o que o usuário corrigiu:
  - `empresa_id`, `campo_original`, `campo_corrigido`, `contexto` (dia, formato da folha)
- Quando o usuário corrige um registro e salva, as diferenças são gravadas automaticamente
- Na próxima leitura da mesma empresa, as correções anteriores são injetadas no prompt como exemplos: "Nesta empresa, quando você lê X normalmente é Y"
- Isso cria um **few-shot learning** personalizado por empresa

#### 4. Retry inteligente com fallback
- Se a primeira leitura falhar ou retornar poucos registros, tentar novamente com:
  - Imagem com pré-processamento diferente (mais contraste, ou sem binarização)
  - Prompt alternativo mais permissivo
- Indicador de confiança por registro (a IA marca campos que não tem certeza)

### Fluxo melhorado

```text
Upload foto → Pré-processamento (contraste + nitidez + binarização)
  ↓
Busca correções anteriores da empresa no banco
  ↓
Monta prompt dinâmico (base + exemplos da empresa + formato detectado)
  ↓
Envia para Gemini 2.5 Pro com tool calling (structured output)
  ↓
Se confiança baixa → retry com processamento alternativo
  ↓
Exibe resultados com indicador de confiança por campo
  ↓
Usuário corrige → diferenças salvas como aprendizado
```

### Detalhes técnicos

**Nova tabela:**
```
correcoes_ia — id, empresa_id, folha_id, dia, campo, valor_ia, valor_corrigido, created_at
```
Com RLS via `user_owns_empresa`.

**Alterações na edge function `read-timesheet`:**
- Recebe `empresa_id` + `correcoes` (últimas 20 correções da empresa)
- Prompt dinâmico montado no backend com few-shot examples
- Usa tool calling para structured output (schema JSON tipado)
- Modelo trocado para `google/gemini-2.5-pro`
- Retry automático com parâmetros diferentes

**Alterações no client (`Ponto.tsx`):**
- Pré-processamento melhorado (canvas com filtros)
- Resolução e qualidade maiores
- Busca correções anteriores antes de chamar a IA
- Ao salvar, compara resultado original da IA com edições e grava em `correcoes_ia`
- Indicador visual de confiança (campos com `?` ou cor diferente)

**Arquivos modificados:**
- `supabase/functions/read-timesheet/index.ts` — prompt dinâmico, tool calling, retry, modelo pro
- `src/pages/Ponto.tsx` — pré-processamento, busca correções, salva aprendizado
- `src/lib/ponto-rules.ts` — sem mudanças
- Nova migration SQL — tabela `correcoes_ia`

