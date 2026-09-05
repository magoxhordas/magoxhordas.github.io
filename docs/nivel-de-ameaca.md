# Nível de Ameaça

Desafio opcional para as batalhas contra chefão da campanha. O jogador escolhe quantos modificadores quer enfrentar, o jogo sorteia quais serão usados e o bônus de moedas do chefe cresce junto.

| Dificuldade | Ameaça | Bônus máximo |
|---|---:|---:|
| Aprendiz (`easy`) | indisponível | 0% |
| Guerreiro (`medium`) | 0 a 4 | +70% |
| Lendário (`hard`) | 0 a 6 | +120% |

O Modo Chefão e os demais modos especiais sempre iniciam com ameaça zero. O nível escolhido fica congelado durante a campanha.

## Regras do sorteio

- Não repete modificadores no mesmo encontro.
- Respeita a lista compatível de cada um dos seis chefes.
- Limita efeitos de arena, sobrevivência e fúria para evitar combinações ilegíveis.
- Não combina Abismo com Repulsor nem Errante com Investidor.
- Sorteia uma única vez por encontro.

## Comportamentos

Os 20 modificadores estão definidos em `src/campaign/boss-modifier-data.js`. O runtime fica em `src/campaign/boss-modifiers.js`.

- Arena: Vulcânico, Glacial, Minador, Corruptor e Abismo.
- Ataque: Trovejante, Orbitais e Ecoante.
- Mobilidade: Errante, Investidor, Caçador e Repulsor.
- Sobrevivência: Vampírico, Regenerador e Escudo Rúnico.
- Exército: Invocador, Comandante e Ritualista.
- Fúria: Sanguinário e Berserker.

Runas e rituais são alvos reais: ataques corpo a corpo, armas, projéteis e invocações podem destruí-los. Reforços possuem aviso antes de surgir. O Errante fica invisível e sem colisão enquanto muda de posição. O Vampírico cura somente pelo dano realmente aplicado depois de bloqueios, esquivas e redução. O Ritualista aumenta em 25% o dano do chefe durante oito segundos quando a canalização termina.

## Tempo, coop e limpeza

O runtime usa um relógio próprio que avança apenas em `update(dt)`. Pausar o jogo também pausa cooldowns, avisos e duração dos modificadores.

Perigos de área avaliam P1 e P2 no mesmo pulso. Ao terminar a luta, sair para o menu ou encerrar a run, o sistema remove áreas, objetos, avisos e reforços pendentes, restaura a velocidade/cadência do chefe e desfaz os bônus de Comandante nos inimigos vivos.

## Recompensa

O bônus é creditado uma vez na derrota do chefe e usa a economia normal da campanha. O cálculo adicional é baseado no valor total do chefe, evitando perda por arredondar cada moeda separadamente.

## Verificação

`node scripts/verify-boss-modifiers.mjs` cobre catálogo, limites, sorteio, incompatibilidades, relógio de pausa, P1/P2, teleporte, telegraphs, runas, rituais, dano real, composição de velocidade/cooldown, limpeza e pagamento idempotente.
