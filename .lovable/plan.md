

## Plano: Migrar envio de holerites do EmailJS para e-mail nativo do Lovable

### Problema
O EmailJS com Yahoo está bloqueando o envio por falhas de autenticação repetidas. A solução é eliminar essa dependência e usar o sistema de e-mail integrado do Lovable.

### O que será feito

1. **Configurar infraestrutura de e-mail** — preparar filas, tabelas e funções necessárias no backend

2. **Criar template de e-mail "holerite-enviado"** — template React Email com o visual do app para notificar o funcionário com link de download do PDF

3. **Atualizar a Edge Function `send-holerite`** — em vez de apenas gerar URL, ela agora também dispara o envio via `send-transactional-email` com o template criado

4. **Limpar `src/pages/Holerites.tsx`** — remover toda dependência do EmailJS (import, credenciais, `emailjs.send()`). O envio agora será feito inteiramente pela Edge Function no backend

5. **Criar página de cancelamento de inscrição** — página obrigatória para links de descadastro nos e-mails

6. **Remover pacote `@emailjs/browser`** do projeto

### Domínio de e-mail
O domínio `notify.pontoauto.rf.gd` já está configurado mas aguarda verificação DNS. Toda a infraestrutura será montada agora — os e-mails começarão a ser enviados automaticamente assim que o DNS for verificado. Você pode acompanhar o progresso em **Cloud → Emails**.

### Resultado esperado
- Envio de holerites funcionará sem depender do EmailJS/Yahoo
- E-mails profissionais enviados do seu próprio domínio
- Sistema com fila, retentativas automáticas e log de envios

