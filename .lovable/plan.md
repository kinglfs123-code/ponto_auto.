

## Plano: Substituir Lovable Email pelo Resend

### O que será feito

1. **Adicionar secret `RESEND_API_KEY`** — solicitar que você insira sua chave de API do Resend

2. **Reescrever `supabase/functions/send-holerite/index.ts`** — usar o código Resend que você enviou (com pequenos ajustes):
   - Baixar o PDF do Storage e converter para base64
   - Enviar via API do Resend com o PDF anexado
   - Atualizar status do holerite no banco
   - Manter validação de autenticação e ownership

3. **Fazer deploy** da Edge Function atualizada

### Nota sobre remetente
O Resend gratuito (sem domínio verificado) usa `onboarding@resend.dev` — funciona apenas para o e-mail da sua conta Resend. Para enviar para qualquer destinatário, será necessário verificar um domínio no painel do Resend.

### Resultado esperado
O holerite será enviado por e-mail via Resend com o PDF anexado diretamente, sem depender da verificação DNS do domínio Lovable.

