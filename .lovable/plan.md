
# Trocar fonte global para Inter (self-hosted)

## Objetivo

Substituir a stack atual de fontes do sistema (SF Pro / Segoe UI / Roboto) por **Inter**, instalada localmente via `@fontsource/inter` para garantir consistência visual em todos os sistemas operacionais sem depender de CDN externo.

## Mudanças

**1. Dependência**
- Instalar `@fontsource/inter` via `bun add @fontsource/inter`.

**2. Imports da fonte (`src/main.tsx`)**
- Importar os pesos usados na aplicação: 400, 500, 600, 700.
  ```ts
  import "@fontsource/inter/400.css";
  import "@fontsource/inter/500.css";
  import "@fontsource/inter/600.css";
  import "@fontsource/inter/700.css";
  ```

**3. Aplicar a fonte (`src/index.css`)**
- No bloco `body`, trocar a `font-family` para Inter como primária, mantendo system fonts apenas como fallback de emergência:
  ```css
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  ```

**4. Tailwind (`tailwind.config.ts`)**
- Definir `fontFamily.sans` como `["Inter", ...defaultTheme.fontFamily.sans]` para que classes utilitárias (`font-sans`) e componentes shadcn herdem Inter automaticamente.

## Atualização de memória

Atualizar `mem://style/visual-theme` e a linha Core do `mem://index.md`: o tema visual continua iOS 26 Liquid Glass, mas a tipografia passa a ser **Inter** (não mais SF Pro).

## Fora do escopo

- Não mexer em tamanhos, pesos ou letter-spacing de componentes existentes.
- Não alterar emails transacionais (templates React Email têm sua própria stack tipográfica).
