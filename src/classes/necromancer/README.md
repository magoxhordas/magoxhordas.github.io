# Necromante

Quinta classe jogável do Mago x Hordas. O Necromante troca dano direto por controle de campo, coleta de almas, reanimação imediata e uma armada limitada de invocações.

## Contrato de runtime

- `necromancer-data.js` é a fonte declarativa da classe, das oito armas, dos oito buffs e dos limites de balanceamento.
- `necromancer-system.js` possui todo o estado transitório por jogador. Almas, invocações, pity e limiares de chefes nunca são persistidos no save.
- Mudanças de mapa limpam recursos transitórios e reposicionam invocações permanentes e Reanimados vivos.
- Invocações não colidem com jogadores ou inimigos. Inimigos comuns podem atacá-las localmente; chefes priorizam jogadores.
- Abates de invocações não podem gerar cadeias recursivas de recompensas.

## Balanceamento protegido

- Vida 98, dano direto 21 e velocidade 132.
- Alma: 22% em abate direto, 14% por invocação, pity na sexta falha, duas por elite, três por miniboss e até cinco por chefe.
- Reanimação: 35% em abate direto, 22% por invocação, 100% em elite e nunca em chefes. O cadáver levanta imediatamente, não possui cronômetro e só morre ao chegar a 0 de vida.
- Limites: 12 almas, 3 Reanimados, 2 permanentes, 3 temporários e 12 invocações globais no cooperativo; buffs respeitam hard caps.
- Invocações herdam 100% da raridade da arma, 35% de bônus global de dano, 30% de velocidade global, 50% do crítico adicional e 25% do bônus de vida do jogador.
- O roubo de vida das invocações usa 20% do vampirismo real do jogador, dentro do teto de 3% da vida máxima por segundo. Elas ativam bênçãos com coeficiente de 35%, causam 85% contra chefes e recebem 135% deles.

## Modos e conteúdo

A classe participa da Campanha, Boss Rush, Cooperativo e Masmorra. A loja oferece oito armas exclusivas com cinco raridades e oito buffs de compra única. O Códex exibe a classe e as armas, e o HUD de almas/Reanimados/armada só aparece para um Necromante ativo.

O herói usa o conjunto PNG dedicado em `assets/heroes/necromancer`, com parado,
caminhada e ataque nas três direções consumidas pelo renderer. Os quadros são
normalizados para 64x64 e ancorados na linha dos pés pelo script
`scripts/prepare-necromancer-hero-art.py`, preservando os arquivos de origem.

Validação dedicada: `node scripts/verify-necromancer-class.mjs`.

Simulação analítica: `node scripts/simulate-necromancer-balance.mjs`.
