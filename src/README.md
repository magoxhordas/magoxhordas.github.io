# Estrutura de codigo (migracao segura)

O jogo nasceu como um unico `index.html` e esta sendo modularizado de forma incremental para nao alterar gameplay nem visual.

## Regra da refatoracao

Cada extracao deve preservar comportamento, ser protegida pelos verificadores existentes e evitar uma reescrita geral do jogo. O `index.html` continua sendo a entrada oficial.

## Primeiro dominio extraido

- `camp/collision-map.js`: dados dos colliders e footprint do personagem no acampamento.
- `camp/layout-data.js`: dados estaticos de layout do acampamento (iniciando pela horta).

Os proximos sistemas podem ser extraidos gradualmente (camp, campanha, combate, UI, save), sempre em mudancas pequenas e testaveis.
