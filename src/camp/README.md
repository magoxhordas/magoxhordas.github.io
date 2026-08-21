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

Catalogo de sementes, nomes, icones e rotulos da horta. O modulo nao executa plantio, inventario, desenho ou persistencia; essas regras continuam no CampV2.

Os pontos de luz e a posicao do arqueiro tambem foram movidos para `layout-data.js`. As coordenadas e valores permanecem identicos.
