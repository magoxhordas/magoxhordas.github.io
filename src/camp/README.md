# Camp

## collision-map.js

Camada de dados de colisao do acampamento, separada do desenho. Ela preserva as mesmas formas e coordenadas usadas anteriormente dentro de `CampV2`.

Principios mantidos:

- colisao invisivel e independente da arte;
- personagem validado pela area dos pes;
- estruturas, pedras, troncos, agua e obstaculos solidos permanecem bloqueados;
- caminhos, zonas de circulacao e pontos de interacao permanecem acessiveis;
- passagens explicitas continuam tendo prioridade sobre bloqueios;
- NPCs e detalhes baixos nao ganham collider automaticamente;
- o sistema de resgate de save continua reposicionando o jogador se ele carregar dentro de um bloqueio.

Este arquivo nao desenha nada e nao controla estado do jogo. Ele apenas fornece o mapa de colliders ao `CampV2`.

## layout-data.js

Dados estaticos de posicionamento do acampamento ficam separados da logica de desenho e gameplay. A primeira extracao e a grade 5x3 da horta, preservando exatamente as coordenadas existentes.

O footprint de colisao do jogador tambem passa a ser propriedade de `collision-map.js`, mantendo os mesmos seis pontos usados anteriormente dentro de `livre()`.

## farming-data.js

Catalogo de sementes, nomes, icones e rotulos da horta. O modulo continua sendo apenas dados puros; o comportamento foi separado em `farming-system.js`.

Os pontos de luz e a posicao do arqueiro tambem foram movidos para `layout-data.js`. As coordenadas e valores permanecem identicos.

## farming-system.js

Contem a implementacao dos 15 canteiros, selecao e troca de sementes, acionamento de `farmAction` e desenho da terra/culturas. O modulo recebe `HORTA`, dados das sementes, estado `S` e os helpers `px`/`dentro` do CampV2, preservando os mesmos bindings globais de inventario e ferramentas usados antes da extracao.

Save, `farmCells`, `globalInventory`, `selectedSeed`, `activeTool` e `farmAction` nao foram reescritos nem duplicados.

## interaction-data.js

Centraliza somente os dados dos nove pontos de interacao (id, coordenadas, raio, rotulo e cor). As acoes reais continuam criadas dentro do CampV2 e sao injetadas no modulo, preservando exatamente os mesmos callbacks.
