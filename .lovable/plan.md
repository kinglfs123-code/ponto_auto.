
## Plano: corrigir o loop infinito do OAuth do Google

### Diagnóstico confirmado

O problema **não** está no salvamento do token.

O que verifiquei:

- A tabela `google_calendar_tokens` **não está vazia**: existe **1 token salvo**.
- O `google-oauth-callback` já está:
  - trocando o `code` com sucesso
  - recebendo os escopos `gmail.send` + `calendar.events`
  - salvando o token no banco
- A função callback **já usa service role** (`createClient(SUPABASE_URL, SERVICE_KEY)`), então o insert/upsert **não depende de RLS**.
- As policies de `google_calendar_tokens` também estão corretas para uso pelo cliente autenticado.

### Causa raiz real do loop

O loop acontece porque `send-via-gmail` faz esta chamada antes de enviar:

- `GET https://gmail.googleapis.com/gmail/v1/users/me/profile`

Essa chamada exige escopos mais amplos do Gmail e **não funciona só com `gmail.send`**.

Então o fluxo atual vira:

```text
OAuth salva token corretamente
-> send-via-gmail tenta ler users/me/profile
-> Google responde 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT
-> backend retorna needs_reconnect
-> frontend chama startGoogleConnect() automaticamente
-> usuário reconecta
-> volta com ?google=ok
-> ao enviar de novo, repete tudo
```

Ou seja: o token existe, mas a função de envio usa um endpoint incompatível com o escopo solicitado.

### O que vou ajustar

#### 1. Corrigir `send-via-gmail`
Arquivo:
- `supabase/functions/send-via-gmail/index.ts`

Mudanças:
- Remover a dependência de `gmail/v1/users/me/profile`.
- Parar de bloquear o envio por causa dessa leitura de perfil.
- Refatorar a montagem do MIME para **não depender do e-mail/nome obtidos via profile endpoint**.
- Deixar o envio acontecer usando apenas o escopo `gmail.send`, que é o escopo já concedido.
- Manter logs claros de:
  - escopos do token
  - tentativa de envio
  - resposta da Gmail API
  - motivo de falha real

#### 2. Parar o redirecionamento automático que cria o loop
Arquivos:
- `src/pages/Holerites.tsx`
- `src/pages/FuncionarioDetalhe.tsx`

Mudanças:
- Quando `send-via-gmail` retornar `needs_reconnect`, **não** iniciar `startGoogleConnect()` automaticamente.
- Mostrar toast com mensagem clara + ação manual “Reconectar Google”.
- Isso evita loop mesmo se houver nova falha de permissão/token.

#### 3. Ajustar a lógica visual de “Google conectado”
Arquivos:
- `src/pages/FuncionarioDetalhe.tsx`
- `src/components/AnaliseContrato.tsx` (se necessário)

Mudanças:
- Separar melhor o conceito de:
  - conectado para calendário (`calendar.events`)
  - conectado para envio de e-mail (`gmail.send`)
- Garantir que “conectado” não signifique falsamente que todas as ações vão funcionar se o backend ainda estiver usando um endpoint errado.

### O que NÃO precisa mudar

- `google-oauth-callback` já está salvando token
- `google-oauth-start` está funcionando
- RLS da tabela `google_calendar_tokens`
- Estrutura do banco
- Escopos OAuth solicitados (`gmail.send` + `calendar.events`)

### Validação após a correção

Depois da implementação, vou validar este fluxo:

```text
Reconectar Google
-> retorno com ?google=ok
-> token continua salvo em google_calendar_tokens
-> clicar em Enviar
-> send-via-gmail não chama mais users/me/profile
-> envio funciona OU retorna erro real sem redirecionar de novo
```

### Arquivos que serão alterados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/send-via-gmail/index.ts` | Remover uso de `users/me/profile`, enviar usando apenas `gmail.send`, melhorar logs |
| `src/pages/Holerites.tsx` | Remover auto-reconnect e trocar por ação manual no toast |
| `src/pages/FuncionarioDetalhe.tsx` | Mesmo ajuste de reconexão manual |
| `src/components/AnaliseContrato.tsx` | Ajuste opcional do indicador de conexão para não confundir status de agenda x e-mail |

### Resultado esperado

- Fim do loop infinito
- Token permanece salvo e reutilizado
- “Reconectar Google” só aparece quando realmente necessário
- Envio de holerite/e-mail passa a funcionar com o escopo já concedido
