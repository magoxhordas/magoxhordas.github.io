# Armas e projeteis da campanha

Esta pasta contem a extracao incremental das armas de classe da campanha. Os modulos preservam os mesmos IDs, valores, raridades, efeitos, tempos e objetos de runtime usados pelo jogo legado.

## Modulos

- `weapon-data.js`: catalogo canonico das 32 armas de campanha, com oito armas para cada classe, cinco estagios de raridade e os multiplicadores originais de poder e velocidade.
- `weapon-system.js`: despacho e regras de ataque das 32 armas, recebendo por injecao os alvos, dano, recuo, status, animacoes corpo a corpo e criacao de projeteis.
- `projectile-system.js`: inicializacao e ciclo de vida de `WeaponProj`, `CampaignWeaponProj` e `ArrowProj`, incluindo velocidade, alcance temporal, retorno, eco, homing, trilha de fogo e limites do mapa.

O `index.html` continua sendo a entrada oficial e conserva wrappers globais para os chamadores existentes. As entidades, arrays e estados originais continuam sendo a unica fonte de verdade.

## Limites intencionais desta fase

Permanecem no codigo legado para evitar ampliar o risco desta etapa:

- desenho dos projeteis no canvas e resolucao de colisao no loop principal;
- inventario, slots, loja, HUD e imagens dos icones;
- bencaos, chefes, ondas, mapas e progressao;
- armas e projeteis exclusivos de inimigos e da Dungeon.

## Verificacao

`scripts/verify-weapon-system.mjs` protege o catalogo completo, raridades, dano, cooldowns, elementos, todos os ramos de ataque e a fisica dos projeteis. A fase reduziu o `index.html` em 22.694 bytes e 137 linhas em relacao ao inicio da etapa (`066532c`), distribuindo 29.192 bytes entre os tres modulos sem alterar o balanceamento.

