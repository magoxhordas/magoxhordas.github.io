# Loja da campanha

Esta pasta contém a extração incremental da loja entre ondas. Preços, raridades, composição de ofertas, proteção contra repetição, bloqueios, rerolls, compras, P1/P2 e efeitos permanecem iguais aos da implementação monolítica.

## Módulos

- `shop-data.js`: catálogo canônico dos 32 buffs de classe, oito itens universais e três poções consumíveis.
- `shop-system.js`: descrições por raridade, aplicação dos efeitos, integração com combate, criação e sorteio das ofertas, compra, bloqueio, reroll e abertura/fechamento da loja.

O catálogo é publicado em `window.MagoShopData` antes da inicialização do sistema. As funções globais esperadas pelo restante do jogo continuam disponíveis.

## Limites intencionais

A marcação HTML e o estilo visual da loja permanecem no `index.html`. A renderização da grade também continua junto ao sistema nesta fase para evitar uma alteração simultânea do DOM; ela poderá ser movida na fase de UI.

## Verificação

`scripts/verify-campaign-shop.mjs` executa os módulos de dados e sistema no mesmo contexto e valida quantidades, cinco raridades, composição da loja, não repetição, aplicação de valores, cálculos de combate e ofertas cooperativas.
