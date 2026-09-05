# Sistema de Combo

O combo não responde *"quantas vezes algo tomou dano?"*. Ele responde
*"por quanto tempo o jogador manteve uma sequência eficiente de combate?"*.

Por isso a unidade não é o acerto: é o **ciclo de ataque**.

## A unidade: um ciclo, um evento

Um evento nasce quando uma arma executa um ciclo normal de ataque e só vale
pontos se **pelo menos um dano daquele ciclo acertar** alguém. Ataque que erra
não dá nada.

Todos os danos derivados do mesmo ciclo carregam o mesmo `comboEventId`, e só
a **primeira** validação concede pontos. Consequência direta:

| situação | vale |
|---|---|
| Lâminas Gêmeas: 3 cortes | 1 evento |
| Cajado de Fogo: 3 bolas | 1 evento |
| Arco Ricochete: A→B→C→D | 1 evento |
| flecha perfurando 5 inimigos | 1 evento |
| explosão atingindo 8 inimigos | 1 evento |
| raio saltando por 4 alvos | 1 evento |
| veneno com 20 ticks | 0 eventos novos |
| Machado Colossal: 1 golpe | 1 evento |

## Normalização pela velocidade

```
ganho = clamp(cooldownEfetivo / REFERENCIA_COOLDOWN, GANHO_MIN, GANHO_MAX)
```

O cooldown usado é o **efetivo e real** — o mesmo número que reagenda a arma,
já com raridade, bônus da loja, cartas, berserk, Machado de Sangue, objetivos
e o próprio bônus de velocidade do combo.

Enquanto o valor fica dentro do clamp, `ganho/s = 1000/REFERENCIA` é
**constante**, independente da arma:

| arma | cooldown | por ciclo | ataques/s | combo/s |
|---|---|---|---|---|
| Arco Curto | 520 ms | 0,58 | 1,92 | 1,11 |
| Machados Gêmeos | 590 ms | 0,66 | 1,69 | 1,11 |
| Espadão | 1320 ms | 1,47 | 0,76 | 1,11 |
| Machado Colossal | 1650 ms | 1,83 | 0,61 | 1,11 |

Medido contra o catálogo real das 32 armas: **0,0% de dispersão** em comum,
0,4% em lendária.

### Por que o clamp não é [0,50 · 1,85]

A especificação sugeriu esses limites. Medindo, o piso de 0,50 corta abaixo de
450 ms e quebra justamente as armas rápidas — e a normalização **só é exata
dentro do clamp**:

| caso real | com piso 0,50 |
|---|---|
| adaga da Dungeon (180 ms) | +150% |
| adaga com equipamento (99 ms) | +355% |
| Lâminas Gêmeas lendárias + berserk + loja (269 ms) | +67% |

Com `[0,10 · 2,50]` nenhuma arma real dos dois modos encosta no limite. O clamp
continua existindo como rede contra uma arma futura patológica.

## Sem realimentação

O combo dá até +5% de velocidade de ataque no último marco. Esse bônus entra
**dentro** de `campaignWeaponCooldown()`, então o mesmo número que acelera a
arma também barateia o ciclo. Mais velocidade não gera mais combo por segundo.

Da mesma forma, o bônus de dano do combo **não** aumenta o combo: o valor de um
ciclo nunca depende de quanto dano ele causou.

## Marcos

| combo | marco | movimento | vel. ataque | dano |
|---|---|---|---|---|
| 0–19 | — | — | — | — |
| 20 | AQUECENDO | +2% | — | — |
| 40 | EM RITMO | +2% | +3% | — |
| 70 | IMPLACÁVEL | +3% | +4% | +3% |
| 100 | LENDÁRIO | +4% | +5% | +5% |

**100 é o último nível de poder.** O contador continua subindo (143, 217, 384)
para recorde e satisfação, mas os bônus param. Combo é recompensa por execução —
não substitui arma, raridade, bênção, classe ou build.

## Manutenção e perda

- **Graça:** 2500 ms, ou `cooldownMaisLento × 1,6` se a arma equipada for mais
  lenta que isso. Nenhuma arma normal perde combo entre dois ataques dela mesma.
- **Decaimento:** 10% por segundo *depois* da graça, proporcional ao valor
  atual. Nunca zera de uma vez.
- **Dano recebido:** −20%; −35% se o golpe tirar ≥22% da vida máxima. Há um
  cooldown de 500 ms de penalidade, então um ataque multi-hit do inimigo não
  destrói o combo várias vezes.
- **Morte:** zera.
- **Transições** (loja, bênção, diálogo, capítulo, menu/inventário da Dungeon):
  grace, decaimento e o relógio interno param **completamente**. A guarda está
  no próprio módulo, não só no chamador.
- **Fim de onda:** preserva 50% (`CARRY_ONDA`).

## Quem alimenta e quem não alimenta

| fonte | contribui? |
|---|---|
| armas do jogador | sim |
| ataque básico da classe | sim |
| eliminações | bônus pequeno, com teto |
| bênçãos (Zeus, Hécate, …) | **não** |
| summons do Necromante | **não** (`SUMMON_MULTIPLICADOR = 0`) |
| pets | **não** |
| dano contínuo (veneno, fogo) | **não** |

Bênçãos e summons ficam de fora **por arquitetura**, não por caso especial:
eles aplicam dano por `takeDmg()` direto, fora do funil `weaponDamage`, então
nunca abrem nem validam ciclo. O pet companheiro não tem caminho de dano contra
inimigos na campanha.

### Teto de eliminações

Máximo de 4 pontos/s por abates comuns (8 para elites/minichefes). Sem isso, uma
explosão que mata 20 inimigos saltaria o combo de 10 para 100.

| alvo | bônus |
|---|---|
| comum | +0,35 |
| forte (≥120 HP) | +0,75 |
| elite | +2,0 |
| minichefe | +4,0 |
| chefe | 0 — o chefe alimenta pelo combate contínuo |

## Recompensa

Por **faixa**, com teto — nunca proporcional, para não virar farm de manter um
inimigo fraco vivo:

| maior combo da onda | bônus |
|---|---|
| < 20 | — |
| 20–39 | +2% |
| 40–69 | +4% |
| 70–99 | +6% |
| 100+ | +8% |

Combo 5000 rende o mesmo que combo 100.

## Coop

Cada jogador tem estado próprio. Ataques de P1 não aumentam o combo de P2, os
buffs são individuais, e só quem é atingido perde combo.

## Modos

Campanha, Boss Rush (que é um modo dentro da campanha, com a mesma `Player`) e
Dungeon. A Dungeon é um sistema de combate **separado** — entidades, dano e
cadência próprios — e recebeu a mesma integração conceitual nos seus três
pontos: ciclo em `pAttackCd`, validação no acerto e `_applyKill`.

Não roda em Camp, menus, pesca, plantação, cozinha ou diálogos.

## Arquitetura

- `src/combat/combo-system.js` — estado, normalização, validação, decaimento,
  penalidades, marcos, recompensa, coop, reset, depuração. Não conhece o jogo:
  tudo entra por `configurar()`.
- `src/ui/combo-hud.js` — HUD compacta e painel de depuração.
- Integração mínima nos pontos que já existiam; nenhuma arma foi reescrita.

**Toda a configuração de balanceamento fica em `ComboSystem.CONFIG`.** Nenhum
número espalhado pelo código.

## Depuração

```js
ComboSystem.definirDepuracao(true);   // painel: arma, CD, ganho, id, validado
ComboSystem.definirCombo(player, 100);
ComboSystem.estadoDepuracao(player);
```

Fora da UI normal.

## Verificação

`node scripts/verify-combo-system.mjs` — 85 checagens cobrindo os 18 pontos
exigidos. A maior parte **simula comportamento** em vez de procurar texto:
carrega o módulo isolado e roda 30 s de ataques com seis cooldowns diferentes,
conferindo que a dispersão fica dentro de ±10%, inclusive contra o catálogo
real das 32 armas.

## Limitações conhecidas

- O combo **não é persistido em save**. A arquitetura atual não salva estado de
  combate momentâneo, e a spec pediu para não criar um sistema de save só para
  isso. Fechar o jogo no meio de uma run perde o combo.
- O ganho por ciclo usa o cooldown do momento do disparo. Se um buff de
  velocidade expirar entre o disparo e o acerto, o ciclo já valeu pelo valor
  antigo — diferença pequena e sem efeito prático medido.
