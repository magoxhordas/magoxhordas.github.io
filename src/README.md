# Estrutura de codigo (migracao segura)

O jogo nasceu como um unico `index.html` e esta sendo modularizado de forma incremental para nao alterar gameplay nem visual.

## Regra da refatoracao

Cada extracao deve preservar comportamento, ser protegida pelos verificadores existentes e evitar uma reescrita geral do jogo. O `index.html` continua sendo a entrada oficial.

## Dominios extraidos

### Core

- `core/save-system.js`: mecanismo compativel de leitura, escrita, fallback e protecao de dados persistidos.
- `core/input-system.js`: estado central de teclado, escopos prioritarios e fontes virtuais dos controles moveis.
- `core/audio-system.js`: geracao procedural, volumes, mute, troca de temas, fades, musica e efeitos sonoros.

Os contratos e os limites intencionais destes modulos estao descritos em [`core/README.md`](core/README.md).

### Combate

- `combat/status-effects.js`: elementos, duracoes, lentidao, congelamento e ticks de dano continuo.
- `combat/damage-system.js`: pipeline compartilhado de dano, defesa, revive e morte.
- `combat/combat-system.js`: cura, recuo e efeitos de acerto especificos das classes.

Esses modulos nao criam estado paralelo e mantem os wrappers globais usados pelo jogo atual. Os contratos e os limites desta fase estao descritos em [`combat/README.md`](combat/README.md).

### Armas

- `weapons/weapon-data.js`: catalogo canonico das 32 armas de classe e seus cinco estagios de raridade.
- `weapons/weapon-system.js`: despacho e comportamento dos ataques, com dependencias de combate injetadas.
- `weapons/projectile-system.js`: inicializacao e atualizacao dos projeteis de armas e flechas.

Os valores, cooldowns, elementos, efeitos e wrappers globais foram preservados. O desenho e a colisao final continuam no loop legado nesta etapa. Os contratos estao descritos em [`weapons/README.md`](weapons/README.md).

### Bênçãos

- `blessings/blessing-data.js`: catálogo canônico de 15 divindades, 75 bênçãos e cinco raridades.
- `blessings/blessing-system.js`: aplicação e ganchos de runtime das bênçãos, incluindo ofertas sem repetição.

Dados e execução agora possuem fronteira explícita, mantendo os contratos globais existentes. O fluxo visual continua no orquestrador. Consulte [`blessings/README.md`](blessings/README.md).

### Loja

- `shop/shop-data.js`: 32 buffs de classe, oito itens universais e três poções.
- `shop/shop-system.js`: efeitos, ofertas, preços, raridades, P1/P2, proteção contra repetição e compras.

A marcação e o CSS permanecem intactos. Os contratos e limites estão descritos em [`shop/README.md`](shop/README.md).

### Acampamento

- `camp/collision-map.js`: dados dos colliders e footprint do personagem no acampamento.
- `camp/layout-data.js`: dados estaticos de layout do acampamento (horta, luzes e posicao do arqueiro).
- `camp/farming-data.js`: catalogo puro de sementes, nomes, icones e rotulos de acao.
- `camp/farming-system.js`: regras dos canteiros, troca/uso de sementes e renderizacao das culturas, com estado local do CampV2 injetado.
- `camp/interaction-data.js`: geometria, texto e cor dos pontos de interacao; callbacks continuam injetados pelo CampV2.
- `camp/environment-renderer.js`: agua, fogueira, luzes, vagalumes e portal, preservando desenho e timings.
- `camp/pet-system.js`: movimento e desenho do companheiro no acampamento, usando o mesmo `S.pet` e os estados globais existentes.
- `camp/archer-system.js`: renderer do arqueiro do acampamento; dialogos e interacao continuam no `ArqueiroNPC` original.

Progressão da campanha, chefes, Dungeon, UI, mapas e o loop principal continuam no código legado. Esses sistemas só devem ser extraídos em fases futuras, sempre em mudanças pequenas e testáveis.
