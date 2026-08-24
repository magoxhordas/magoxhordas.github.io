# Campanha, ondas e chefes

Esta pasta contém a extração incremental da progressão da campanha e do Modo Chefão. A ordem dos cinco biomas, as ondas, as classes únicas dos chefes, o balanceamento progressivo, a conclusão da onda 25 e os contratos globais foram preservados.

## Módulos

- `chapter-data.js`: duração, imagens, partículas e arena dos capítulos nas ondas 1, 6, 11, 16 e 21.
- `campaign-system.js`: avanço e encerramento de ondas, troca de bioma, abertura dos capítulos, limpeza de objetos, bônus e criação escalonada dos chefes.
- `boss-data.js`: registros declarativos dos chefes e criaturas disponíveis no Modo Chefão.
- `boss-rush-system.js`: seleção, fila, troca de arena, vitória, derrota e conclusão da campanha.
- `boss-system.js`: sprites, renderers e comportamento individual de Rei Cadáver, Aracne, Gigante de Gelo, Verme Devorador, Balrog e Brutamontes.

## Limites intencionais

O loop principal, o renderer geral da arena, as classes de jogador/inimigo e a HUD continuam no `index.html`. O loop apenas delega a transição de bioma e a criação escalonada de chefes para `campaign-system.js`; sua ordem de atualização não mudou.

O Modo Chefão compartilha as classes reais dos chefes, mas mantém fila e estado próprios. A preparação de cada luta limpa objetos residuais e seleciona a arena declarada no catálogo.

## Verificação

`scripts/verify-campaign-system.mjs` compila os cinco módulos e protege a ordem dos scripts, capítulos, biomas, arenas, chefes, progressão, conclusão e persistência. Os verificadores de capítulos, áudio, save, combate e smoke também consomem os novos módulos.
