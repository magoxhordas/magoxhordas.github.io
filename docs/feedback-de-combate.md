# Feedback de combate ("juice")

A regra que orienta o sistema inteiro:

> **Cada ação importante deve parecer importante.**

O que exige o contraponto: **se tudo for grande, nada parece grande.** Um
ataque leve precisa continuar leve para que o pesado tenha para onde subir.

E a regra que ele nunca pode quebrar:

> **Juice é feedback, não poder.**

Nada no módulo toca dano, recarga, crítico, alcance, vida, velocidade, hitbox
ou IA. O verificador tem um guard que falha se alguém escrever em qualquer um
desses campos.

## O evento de impacto

Toda a entrada é uma função: `CombatJuiceSystem.impacto({...})`. Quem chama
descreve **o que aconteceu**; o módulo decide **qual feedback sai**. Isso evita
espalhar dezenas de chamadas diferentes pelas armas.

| campo | para quê |
|---|---|
| `x`, `y`, `alvo` | onde e em quem |
| `cooldown` | base da força (ver abaixo) |
| `arma` | família da assinatura visual |
| `dano`, `critico`, `matou` | classe do número e escalada |
| `elemento` | paleta das partículas |
| `attackEventId` | agregação do ciclo |
| `origem` | `player_weapon`, `summon`, `pet`, `dot` |

## Força: quatro perfis

A força **não** sai do dano bruto — dano muda com raridade, bênção, buff,
dificuldade e vida do alvo, então seria uma medida instável. A base é o
**ciclo**: quanto tempo a arma leva para bater de novo.

| perfil | cooldown | partículas | tremor | anel | pausa |
|---|---|---|---|---|---|
| LIGHT | ≤ 640 ms | 3 | — | — | — |
| MEDIUM | 640–1150 ms | 5 | 1,2 | — | — |
| HEAVY | ≥ 1150 ms | 9 | 3 | 26 | 35 ms |
| MASSIVE | override | 16 | 6 | 46 | 60 ms |

Há override declarativo (`perfilForcado`) para quando a identidade do ataque
pedir algo diferente do que o cooldown sugere.

**Crítico sobe um degrau**, partindo de onde a arma já estava — é isso que faz
o crítico do Machado Colossal (3 → 6) não parecer o do Arco Curto (0 → 1,2).

## Agregação: um ciclo, um impacto

Um golpe que acerta 10 inimigos, uma rajada de 4 flechas ou um raio que salta
por 4 alvos são **um** ciclo. O primeiro alvo recebe o feedback caro (tremor,
anel, pausa, som); os demais recebem só o local (flash e partículas).

A chave é o `attackEventId` — que **já existia**: `RunStats.createAttackEvent()`
cria um por ciclo e os projéteis o propagam em `_runAttackEventId`. Nenhum id
novo foi inventado.

Medido: 10 alvos no mesmo ciclo pedem **um** tremor, de valor idêntico ao de 1
alvo; cada alvo ainda recebe as próprias partículas.

## Hitstop: pseudo, não real

O jogo tem **56 `setTimeout` em relógio de parede**, e os críticos são
justamente os multi-hit — Espada Longa (3 golpes), Lâminas Gêmeas (3), Machados
Gêmeos (2), ticks do Cajado Solar. Um freeze do laço deixaria esses golpes
caindo durante a pausa e dessincronizaria a sequência.

Por isso o sistema **enfatiza o quadro** por 35–80 ms em vez de congelar a
lógica. A gameplay continua rodando.

## Identidade por família

Trinta e duas armas não viraram trinta e duas implementações. A família é
declarada por **padrão no id**, fora do desenho, então arma nova da mesma
família entra sozinha.

| família | marca | | família | marca |
|---|---|---|---|---|
| espada | corte fino | | lança | linha de perfuração |
| machado | corte largo + fragmentos | | arco | risco curto |
| martelo | poeira baixa | | besta | cravada |
| corrente | corte muito largo | | cajado | energia |
| escudo | poeira | | necro | espectro |

As 40 armas do catálogo (32 + necromante) caem numa família; nenhuma é
genérica.

> A ordem das regras importa: `chainblade` tem *chain* **e** *blade*. A regra
> da corrente vem antes da de lâmina.

## Morte

| | partículas | tremor |
|---|---|---|
| comum | 8 | — |
| crítica | 18 | — |
| elite | 20 + anel | 1,6 |
| minichefe | 26 + anel | 2,8 |
| **chefe** | rajadas ao longo de 900 ms + onda | 5,6 |

**Nenhum sprite de morte foi necessário.** O "fantasma" guarda uma cópia do
último quadro que a entidade desenhou e só encolhe, sobe e some — e nunca entra
em lista de entidade.

A sequência do chefe entra no `_dropLoot`, que roda com `this.dead=true` no
mesmo quadro: **para o gameplay o chefe já morreu**; a apresentação é apenas
visual.

**Overkill com teto:** 12 de dano em 10 de vida → 8 partículas; 100 → 12;
100 000 → 13. Sem o teto, qualquer bicho fraco viraria explosão.

## Chefes

Chefe apanha muito, então tem ritmo próprio: intervalo de flash de 110 ms
(contra 70 do inimigo comum) e flash 45% mais fraco — nunca fica branco.

**Impacto acumulado:** 25 tiros fracos = zero tremor; uma fatia de 6% da vida
numa janela de 500 ms = anel + tremor. É o que faz build forte ser percebida
sem tremer a cada projétil.

**Damage lag na barra:** o sistema reaproveita a faixa atrasada que a HUD dos
chefes já possuía. A vida real cai na hora e a faixa clara converge para o novo
valor; ela apenas lê a porcentagem e nunca escreve vida.

## Jogador

Apanhar é o feedback mais claro do jogo: dano leve treme 2, pesado treme 4 —
contra 2,4 de um golpe pesado do próprio jogador.

- A vinheta é de **borda** (gradiente radial), nunca tela cheia, e reforça o
  lado de onde veio o golpe.
- **Vida crítica** avisa uma vez ao cruzar 25% e só rearma depois de o jogador
  voltar acima de 32%.
- **Dash** é movimento, não impacto: tremor 0,96 e cor da classe.
- **Cura** só aparece quando é real; overheal não inventa número.

## Quem tem feedback reduzido

| fonte | tremor | anel | pausa |
|---|---|---|---|
| dano contínuo (veneno, fogo) | **não** | **não** | **não** |
| summons do Necromante | **não** | — | — |
| pets | **não** | — | — |

Dez esqueletos não podem balançar a tela.

## Acessibilidade

No painel **Vídeo**, persistindo pelo mesmo `GameSettings` (sem storage
paralelo):

| opção | padrão |
|---|---|
| Intensidade | NORMAL (baixa / normal / alta) |
| Tremor de tela | 80% (0–100%) |
| Reduzir movimento de câmera | desligado |
| Reduzir flashes | desligado |

**Nenhuma delas remove informação.** Com o tremor em zero as partículas
continuam, e nada esconde os avisos de ataque dos chefes.

## Orçamentos

O `spawnParts` do jogo já tinha object pool e teto de 600 — isso não foi
refeito. O módulo limita o que ele mesmo pede:

| | teto |
|---|---|
| partículas por quadro | 60 |
| números de dano | 34 |
| anéis | 12 |
| marcas de arma | 16 |
| fantasmas de morte | 14 |

Os números de dano usam contorno em vez de `shadowBlur` — a operação mais cara
do canvas, e eles desenham dezenas de vezes por quadro.

## Depuração

```js
CombatJuiceSystem.definirDepuracao(true);
CombatJuiceSystem.depurar('critical-heavy');   // 12 casos na galeria
CombatJuiceSystem.estadoDepuracao();
```

A galeria cobre `light`, `medium`, `heavy`, `critical-heavy`, `massive`,
`death`, `elite-death`, `boss-death`, `player-hit`, `player-heavy`, `dash` e
`heal` — para ajustar peso sem jogar uma run inteira. Não aparece na UI.

## Defeitos corrigidos de passagem

**No jogo:**

- `triggerScreenShake()` **sobrescrevia** o estado, então um hit fraco chegando
  durante um tremor forte cancelava o forte. Agora combina pelo maior, com
  teto — nunca a soma.
- O decaimento do tremor dividia por `180` fixo mesmo quando a duração passada
  era outra.
- O dash usava `triggerScreenShake(3,120)`, a mesma força de um golpe pesado.
- Todo acerto gerava 5 partículas fixas, do Arco Curto ao Machado Colossal.

**No próprio sistema, achados testando:**

- As preferências eram lidas de `global.GameSettings`, mas `GameSettings` é
  `const` de topo de script clássico — *binding léxico, não propriedade de
  window*. O sistema ignorava a configuração inteira em silêncio.
- O orçamento de partículas só zerava dentro do laço de combate; fora dele o
  contador estourava e as partículas paravam para sempre.
- `spawnParts` era chamado sem guarda, e `parts` só existe depois de
  `beginGame()` — qualquer efeito no menu quebrava.

## Verificação

`node scripts/verify-combat-juice.mjs` — verificação comportamental e de integração, quase toda simulando
comportamento em vez de procurar texto.

A bancada de teste usa um **relógio controlável**: com `Date.now()` real o tempo
não anda dentro de um laço síncrono, e as sequências temporais (morte de chefe,
throttles) nunca disparavam — os testes passavam por engano.

## Limitações conhecidas

- O feedback direcional do dano no jogador depende de o chamador informar o
  ângulo (`_ultimaDirecaoDano`). Onde ele não é informado, a vinheta sai
  uniforme em vez de reforçar um lado.
- A Dungeon tem o próprio `_freeze` (hitstop real) e não foi migrada para este
  sistema. Ela continua com o feedback que já tinha.
