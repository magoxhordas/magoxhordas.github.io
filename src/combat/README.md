# Nucleo de combate

Esta pasta contem a primeira extracao incremental do combate da campanha. Os modulos usam dependencias injetadas e continuam operando sobre as mesmas entidades, arrays e estados globais do jogo. Nenhum estado de gameplay paralelo foi criado.

## Modulos

- `status-effects.js`: resolve o elemento visual, aplica fogo, veneno e lentidao e atualiza timers e ticks dos status dos inimigos.
- `damage-system.js`: calcula e aplica dano comum em jogadores e inimigos, incluindo armadura, escudos, invulnerabilidade, revive e transicao para morte.
- `combat-system.js`: concentra cura, recuo de bencao e efeitos comuns de acerto das quatro classes.
- `combat-juice-system.js`: representa impactos, criticos, mortes, dano e cura sem alterar valores de gameplay. Inclui limites de particulas, preferencias de acessibilidade e integracao com chefes.

O `index.html` carrega estes arquivos antes do codigo que os utiliza. Os nomes globais antigos de cura, recuo e status continuam como wrappers de compatibilidade para evitar mudancas nos chamadores atuais.

## Dependencias e estado

Os modulos recebem callbacks para acessar dificuldade, loja, bencaos, particulas, inimigos e efeitos visuais. Assim, os proprietarios originais continuam sendo a unica fonte de verdade:

- `Player` e `Enemy` continuam donos de vida e flags de estado;
- os arrays de inimigos, particulas e areas de fogo continuam no runtime atual;
- efeitos especificos de morte continuam em `Enemy._handleDeath()`;
- regras de chefes e Dungeon continuam em suas classes existentes.

## Limites intencionais desta fase

Ficaram no codigo legado para serem tratados em fases proprias:

- definicoes de armas, projeteis e cadencia;
- catalogo e regras das bencaos;
- ondas, chefes, mapas e progressao da campanha;
- combate e progressao da Dungeon;
- HUD, loja e demais interfaces.

## Verificacao

`scripts/verify-combat-system.mjs` executa contratos estaticos e testes comportamentais dos tres modulos. A fase tambem deve passar todos os arquivos `scripts/verify-*.mjs` antes de ser publicada.
