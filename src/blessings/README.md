# Bênçãos divinas

Esta pasta separa o catálogo das 75 bênçãos da campanha de sua execução. A extração conserva as 15 divindades, as cinco raridades, os valores, probabilidades, requisitos, exclusões e sinergias que existiam no bloco monolítico.

## Módulos

- `blessing-data.js`: metadados das raridades, diálogos e catálogo canônico de cinco bênçãos para cada divindade.
- `blessing-system.js`: sorteio sem repetição, aplicação inicial e ganchos de ataque, acerto, crítico, morte, dash, dano recebido, transição de onda e atualização temporal.

O catálogo é publicado em `window.MagoBlessingData` antes da inicialização do sistema. Os contratos globais usados pelo jogo (`DEITY_BLESSINGS_V2`, `applyDeityBoon`, `notifyBlessingHit` e demais ganchos) foram preservados.

## Limites intencionais

O fluxo visual de diálogo, o HUD e a tela de escolha continuam no `index.html`; a fase de UI poderá extrair essas responsabilidades sem misturá-las às regras das bênçãos.

## Verificação

`scripts/verify-deity-blessings.mjs` executa os dois módulos no mesmo contexto e valida as 75 bênçãos, cinco raridades, IDs únicos, ganchos de runtime, exclusões de Hefesto, não repetição e efeitos críticos de Zeus, Moros e Sauron.
