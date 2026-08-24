# Masmorra

`dungeon-system.js` contém o modo Masmorra como uma unidade coesa, preservando a ordem de execução e os contratos globais do código legado.

## Responsabilidades

- geração procedural de salas, corredores, escadas, baús, barris, mercador e portal;
- quatro biomas de exploração e o Bosque da Fenda;
- 22 inimigos, 18 chefes, Hiper Boss e escalonamento por piso;
- combate, equipamentos, sete tipos de anel e oito relíquias;
- recompensas, lojas, inventário, sombras, extração e transição de pisos;
- controles exclusivos da Masmorra, HUD, minimapa, pausa, derrota e retorno;
- integração com áudio, save, crafting, Códex e desbloqueios.

## Contratos preservados

O módulo continua expondo `window.DNG`, `window.startDungeonMode`, `window.DNG_RELICS` e `window.DNG_RING_TYPES`. A API de input mantém prioridade 20 e escopo exclusivo. A chave `magoVsHordas_MVP_Save`, as fórmulas de progressão, as probabilidades e os valores de balanceamento permanecem inalterados.

O catálogo de biomas e os sprites compartilhados ainda são carregados antes do módulo pelo código legado. Essa dependência é intencional nesta fase para evitar reorganizar sistemas fora do escopo da Masmorra.

## Verificação

`scripts/verify-dungeon-system.mjs` compila o módulo e protege os contratos de geração, conteúdo, progressão, dificuldade, recompensas, controles, áudio e integração com a página.
