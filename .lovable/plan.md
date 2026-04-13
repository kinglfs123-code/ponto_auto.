

## Plano: Limpar Dashboard e verificar Holerites

### Alterações no Dashboard (`src/pages/Dashboard.tsx`)

1. **Remover botão "Importar"** da lista de empresas (linhas 180-184) — essa ação já existe nos quick actions. Substituir por um link simples "Ver detalhes" apontando para `/empresas`, ou remover o botão completamente.

2. **Remover "Jornada: XX:XX"** da linha de cada empresa (linha 178). Manter apenas `CNPJ: XX.XXX.XXX/XXXX-XX`.

### Verificação da aba Holerites

A aba Holerites (`src/pages/Holerites.tsx`) foi revisada e a lógica está completa:
- Seleção de empresa e mês
- Upload de PDF por funcionário (com upsert no storage)
- Envio individual via edge function `send-holerite`
- Envio em massa ("Enviar todos")
- Status de enviado/pendente com badges
- Estados vazios e loading

A edge function `send-holerite` marca o holerite como enviado e gera URL assinada, mas **não envia e-mail de fato** (apenas retorna o HTML e URL). Isso é esperado para MVP — o envio real depende de configuração de domínio de e-mail.

### Resumo das mudanças

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Dashboard.tsx` | Remover botão "Importar" da lista de empresas |
| `src/pages/Dashboard.tsx` | Remover texto "Jornada: XX:XX" |

Duas edições simples no mesmo arquivo, sem impacto em outras páginas.

