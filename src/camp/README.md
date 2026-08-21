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
