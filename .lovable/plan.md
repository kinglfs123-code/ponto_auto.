

## Plano: Integrar EmailJS para envio real de holerites

### O que é EmailJS
EmailJS permite enviar e-mails diretamente do frontend usando templates pré-configurados, sem backend próprio. Você precisa criar uma conta gratuita em [emailjs.com](https://www.emailjs.com) e configurar:
1. Um **Service** (conectar seu Gmail/Outlook)
2. Um **Template** com variáveis: `to_email`, `subject`, `message`
3. Copiar: **Public Key**, **Service ID**, **Template ID**

### Alterações

**1. Instalar o pacote `@emailjs/browser`**

**2. Arquivo: `src/pages/Holerites.tsx`**

- Importar `emailjs` e inicializar com a Public Key
- Na função `handleSend`: após a edge function retornar a `download_url`, chamar `emailjs.send()` com os dados do funcionário e o link de download
- Atualizar o toast para refletir o envio real

```typescript
import emailjs from "@emailjs/browser";

// Inicializar (no topo do componente ou fora)
emailjs.init("SUA_PUBLIC_KEY");

// Dentro de handleSend, após receber data da edge function:
await emailjs.send("service_id", "template_id", {
  to_email: func.email,
  subject: `Holerite - ${mesRef}`,
  message: `Olá ${func.nome_completo}, seu holerite está disponível: ${data.download_url}`,
});
```

**3. Armazenar as credenciais**

Como a Public Key, Service ID e Template ID do EmailJS são **públicos** (rodam no browser), serão armazenados como constantes no código — não precisam de secrets.

### Preciso de você

Antes de implementar, preciso que você me informe:
- **Public Key** do EmailJS
- **Service ID** (ex: `service_gmail`)
- **Template ID** (ex: `template_holerite`)

Ou posso deixar placeholders para você preencher depois.

### Resumo
| Arquivo | Alteração |
|---------|-----------|
| `package.json` | Adicionar `@emailjs/browser` |
| `src/pages/Holerites.tsx` | Integrar `emailjs.send()` no fluxo de envio |

