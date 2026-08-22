# Estrutura de codigo (migracao segura)

O jogo nasceu como um unico `index.html` e esta sendo modularizado de forma incremental para nao alterar gameplay nem visual.

## Regra da refatoracao

Cada extracao deve preservar comportamento, ser protegida pelos verificadores existentes e evitar uma reescrita geral do jogo. O `index.html` continua sendo a entrada oficial.

## Primeiro dominio extraido

- `camp/collision-map.js`: dados dos colliders e footprint do personagem no acampamento.
- `camp/layout-data.js`: dados estaticos de layout do acampamento (horta, luzes e posicao do arqueiro).
- `camp/farming-data.js`: catalogo puro de sementes, nomes, icones e rotulos de acao.
- `camp/farming-system.js`: regras dos canteiros, troca/uso de sementes e renderizacao das culturas, com estado local do CampV2 injetado.
- `camp/interaction-data.js`: geometria, texto e cor dos pontos de interacao; callbacks continuam injetados pelo CampV2.
- `camp/environment-renderer.js`: agua, fogueira, luzes, vagalumes e portal, preservando desenho e timings.
- `camp/pet-system.js`: movimento e desenho do companheiro no acampamento, usando o mesmo `S.pet` e os estados globais existentes.
- `camp/archer-system.js`: renderer do arqueiro do acampamento; dialogos e interacao continuam no `ArqueiroNPC` original.

Os proximos sistemas podem ser extraidos gradualmente (camp, campanha, combate, UI, save), sempre em mudancas pequenas e testaveis.
