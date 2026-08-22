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

### Acampamento

- `camp/collision-map.js`: dados dos colliders e footprint do personagem no acampamento.
- `camp/layout-data.js`: dados estaticos de layout do acampamento (horta, luzes e posicao do arqueiro).
- `camp/farming-data.js`: catalogo puro de sementes, nomes, icones e rotulos de acao.
- `camp/farming-system.js`: regras dos canteiros, troca/uso de sementes e renderizacao das culturas, com estado local do CampV2 injetado.
- `camp/interaction-data.js`: geometria, texto e cor dos pontos de interacao; callbacks continuam injetados pelo CampV2.
- `camp/environment-renderer.js`: agua, fogueira, luzes, vagalumes e portal, preservando desenho e timings.
- `camp/pet-system.js`: movimento e desenho do companheiro no acampamento, usando o mesmo `S.pet` e os estados globais existentes.
- `camp/archer-system.js`: renderer do arqueiro do acampamento; dialogos e interacao continuam no `ArqueiroNPC` original.

Campanha, combate, armas, bencaos, chefes, loja, UI, mapas e o loop principal continuam no codigo legado. Esses sistemas so devem ser extraidos em fases futuras, sempre em mudancas pequenas e testaveis.
