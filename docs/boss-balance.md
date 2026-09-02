# Rebalanceamento dos chefes — 02/09/2026

Objetivo: prolongar os primeiros encontros, que estavam terminando cedo, sem aumentar o dano recebido pelo jogador. O reforço é concentrado nos capítulos 1 e 2; os capítulos finais mantêm seus valores e mecânicas.

| Encontro | Onda | Vida-base anterior | Vida-base nova | Variação |
| --- | ---: | ---: | ---: | ---: |
| Brutamontes da Guerra | 4 | 1.500 | 2.400 | +60% |
| Rei Cadáver | 5 | 1.800 | 3.000 | +66,7% |
| Aranha Caçadora | 9 | 520 | 2.400 | +361,5% |
| Aracne Ancestral | 10 | 2.400 | 3.600 | +50% |
| Gigante de Gelo | 15 | 4.075 | 4.075 | Mantida |
| Verme Devorador | 20 | 6.300 | 6.300 | Mantida |
| Balrog | 25 | 10.000 | 10.000 | Mantida |

## Como os valores chegam à partida

- Chefes principais: vida-base × raridade × dificuldade × progressão do capítulo, com os arredondamentos existentes. No Normal, raridade comum, sem bônus de missão, o Rei passa de 2.610 para 4.350 e Aracne de 3.758 para 5.638.
- Brutamontes da onda 4 e Caçadora: vida-base × dificuldade dos objetivos × 1,28 no cooperativo. O piso existente de 0,8 é preservado. Não foram alteradas vidas de altares, ninhos ou outros objetivos.
- O Rei ainda ressuscita uma única vez com 30% da vida máxima final: no exemplo Normal/comum, 1.305 na segunda fase, totalizando 5.655 de vida nas duas fases.
- Destruir os ninhos ainda reduz a vida de Aracne em 5%. Vencer a Caçadora ainda aumenta suas recargas em 6%.
- No Modo Chefão, Rei e Aracne recebem os novos valores-base, pois usam as mesmas classes. O Brutamontes desse modo mantém 4.080: é uma versão distinta da encontrada na onda 4.
- O ajuste de vida preserva dano, velocidade, recargas, escudos e recompensas dos golpes existentes. Pets e chefes de Dungeon não foram alterados. Nenhum save precisa ser migrado; a nova vida é calculada ao criar o próximo encontro.
- O Códex foi atualizado para os mesmos valores-base do combate.

## Novos golpes da Aranha Caçadora

- **Investida da Caçadora:** aviso de 800 ms com corredor e direção travados; avança a 430 unidades/s, por até 270 unidades, sem sair da arena. Dano máximo de 22, limitado a 18% da vida máxima de cada herói, uma vez por investida. A colisão cobre o trecho entre frames. Recupera-se parada por 1 segundo e continua vulnerável a ataques. Recarga de 6,5 segundos, sujeita à sequência das outras habilidades.
- **Armadilhas de Seda:** até três teias, sinalizadas por 650 ms antes de ativar, com duração ativa de 6 segundos. Reduzem a velocidade em 30% somente sobre a área, não acumulam lentidão e não causam dano. Não há uma nova leva enquanto a anterior estiver no chão. Recarga de 8,5 segundos, sujeita à sequência dos outros golpes.
- Mordida e Fase Parcial foram preservadas; a Emboscada do Teto não foi incluída. Investida, tecelagem e Fase Parcial usam estados exclusivos; teias já ativadas permanecem no chão durante os outros golpes. Teias e avisos usam o tempo da partida, respeitam pausa e são removidos ao morrer, trocar de onda, capítulo ou modo.

## Validação

`node scripts/verify-boss-balance.mjs` executa os construtores e os caminhos reais de criação: cinco chefes × três dificuldades × quatro raridades × solo/cooperativo; os dois mini-chefes nas dificuldades e modos; dano/morte; ressurreição; enfraquecimento por missões; Boss Rush.

`node scripts/verify-hunter-spider.mjs` verifica os novos golpes: aviso de 800 ms, destino fixo, esquiva, acerto único em P1/P2, colisão em frames lentos, recuperação, teias sem dano, limites, duração, limpeza e renderização. Inclui quatro minutos de combate simulado para detectar estados presos ou acúmulo de armadilhas.

Os testes do Códex comparam os números exibidos com os construtores e objetivos reais. `node scripts/verify-all.mjs` executa a suíte completa. `node scripts/stress-campaign-runtime.mjs` verifica a limpeza e o encerramento dos objetivos/eventos em 125 ondas simuladas; não mede dificuldade ou tempo real de combate.

Os percentuais acima são ajustes de resistência, não uma promessa de duração exata das lutas. Armas, bênçãos, pets e habilidade do jogador continuam influenciando o tempo de cada encontro.
