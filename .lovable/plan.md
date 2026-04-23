

## Conserto: aparência do botão da seta no Login

**Problema**: o botão circular ao lado do campo de senha aparece **rosa/magenta** porque tem só um fundo branco translúcido (`rgba(255,255,255,0.25)`) sem `backdrop-filter`. O fundo rosa do wallpaper passa direto através do overlay branco e tinge o círculo. O mesmo acontece (em menor grau) com o círculo do avatar acima.

### Mudança

Em `src/pages/Login.tsx`, no botão de submit (linhas 138–153):

- Adicionar **backdrop blur** real (`backdrop-filter: blur(20px) saturate(180%)`) para criar o efeito frosted-glass de verdade — assim o círculo desfoca o que está atrás em vez de apenas sobrepor branco translúcido sobre rosa.
- Reduzir levemente a opacidade do branco (`0.25` → `0.22`) e ajustar a borda para combinar com o resto da UI glass.
- Adicionar um leve **inset highlight** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.4)`) que dá o brilho de cima típico do estilo iOS Liquid Glass.
- Aumentar levemente a seta (`h-4 w-4` → `h-[18px] w-[18px]`) e reforçar o peso (`stroke-width={2.5}`) para ficar nítida no círculo pequeno.
- Garantir contraste no estado hover (`hover:bg-white/30`).

Resultado: botão branco-acinzentado neutro com blur real, sem mais aparência rosa, alinhado com o estilo lock-screen do macOS/iOS já usado na tela.

### Extra (mesma origem do problema)

O **círculo do avatar** ("J") na linha 89–98 também está rosa pelo mesmo motivo. Aplicar o mesmo `backdrop-filter: blur(20px) saturate(180%)` para consistência visual — ele já tem a classe `liquid-glass`, mas o `style` inline está sobrescrevendo o background sem garantir o blur. Vou apenas adicionar `backdropFilter` ao style inline.

### Arquivo afetado

- `src/pages/Login.tsx` — apenas styles inline do botão de submit e do círculo do avatar. Sem mudança de comportamento, sem nova dependência.

