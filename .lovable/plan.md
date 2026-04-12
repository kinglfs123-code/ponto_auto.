- Plano: Remover Importação de Arquivo e Renomear Botão de Foto

### Alterações

#### 1. `src/pages/Ponto.tsx`

- Remover o import e uso do `FileImporter`
- Remover a função `handleFileImport` (se existir)
- Renomear o botão de foto de `Foto (IA)` para `Anexar Foto`
- O botão "Ler Folha de Ponto" continua aparecendo após selecionar a foto

#### 2. Limpeza

- O arquivo `src/components/FileImporter.tsx` pode ser mantido (não causa problema) ou removido — prefiro manter caso queira reutilizar futuramente

### Resultado

Apenas um botão visível: **"Anexar foto"** com ícone de câmera, seguido do botão "Ler folha de ponto" quando uma imagem é selecionada.