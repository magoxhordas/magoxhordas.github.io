# Nível de Ameaça

Desafio **opcional** para as batalhas contra chefão. O jogador escolhe *quantos*
modificadores quer enfrentar; o jogo sorteia *quais*, e a recompensa do chefe
sobe junto.

A ideia não é o chefe virar esponja de dano. É o mesmo chefe se comportar de um
jeito diferente naquela run.

---

## Onde funciona

| Dificuldade | Rótulo no menu | Ameaça |
|---|---|---|
| `easy` | Aprendiz | **não existe** — o bloco some do menu |
| `medium` | Guerreiro | 0 a 4 |
| `hard` | Lendário | 0 a 6 |

Fora daí — Boss Rush, Dungeon, qualquer modo especial — o sistema não é
inicializado e `ativo()` devolve `false`.

**Ameaça 0 é bandeira desligada.** `ativo()` retorna falso e nada abaixo roda:
sem sorteio, sem update, sem desenho, sem bônus. O jogo é bit a bit o de hoje.

---

## Configuração

Tudo em `src/campaign/boss-modifier-data.js`, em `CONFIG`. Não há número solto
espalhado pelas classes de chefe.

- `LIMITE_POR_DIFICULDADE` — os tetos da tabela acima.
- `BONUS_RECOMPENSA` — `[0, .15, .30, .50, .70, .95, 1.20]`, indexado pelo nível.
- `TETO_POR_CATEGORIA` — no máximo 2 de arena, 1 de sobrevivência, 1 de fúria
  no mesmo sorteio.
- `MAX_*` — tetos de segurança de cada efeito (áreas de fogo, minas, invocados…).

---

## Sorteio

Ao chefe entrar em cena (`aoNascerChefe`):

1. lê o nível da run;
2. pega a lista de compatíveis daquele chefe;
3. sorteia por peso, sem repetir;
4. respeita incompatibilidades e tetos de categoria;
5. guarda o conjunto no estado e em `chefe._ameacaIds`.

O sorteio acontece **uma vez por encontro**. Se `aoNascerChefe` for chamado de
novo para o mesmo chefe, ele volta cedo — o conjunto não muda no meio da luta.

Pedir mais modificadores do que as restrições permitem **não trava**: o sorteio
devolve o que conseguiu montar, sem repetir e sem inventar.

### Combinações proibidas

- `gravity_well` + `repulsor` — um puxa, o outro empurra; juntos a movimentação
  vira loteria.
- `teleporter` + `charger` — dois deslocamentos forçados do chefe tornam a luta
  ilegível: ele some e, antes de reaparecer, já investiu.

---

## Recompensa

O bônus é creditado **uma vez**, na morte do chefe, por `pagarBonus()` dentro de
`_dropLoot()`. Ele usa a economia real do jogo (`coinFactor`, `coinMult` da
dificuldade, cartas do Hermes, loja) — não há moeda nova.

O bônus é **adicional** ao multiplicador da dificuldade, não o substitui:

```
recompensa = base × multiplicador da dificuldade × multiplicador de ameaça
```

**Por que o bônus é creditado uma vez, e não por moeda:** a primeira versão
multiplicava o valor de cada moeda do saque. O arredondamento por moeda comia a
diferença — com ameaça 6 o jogador recebia 2,00× em vez de 2,20×, porque
`round(19 × 0,23 × 0,86)` sobe para 4 e `round(42 × 0,23 × 0,86)` desce para 8.
Fazendo a conta uma vez, sobre um número maior, o erro deixa de importar:
medido, ×1,47 e ×2,16 contra os ×1,50 e ×2,20 teóricos.

A bandeira `recompensaPaga` garante que uma segunda chamada não pague de novo.

---

## Limitação visual (regra do catálogo)

**Nenhum modificador pede animação nova de chefe.** Todos agem em volta do corpo
— chão, órbitas, raios, reforços, telegraphs — ou mexem em números que o chefe já
usa (cooldown, velocidade, vida).

Quando havia escolha entre inventar um golpe novo e dar uma consequência nova a
um golpe que já existe, a segunda opção ganhou sempre. É por isso que Vulcânico,
Glacial, Ecoante e Trovejante disparam em `golpeForte` — o ataque é o de sempre,
o que muda é o que ele deixa para trás.

---

## Ganchos

Os chefes não sabem o que é um modificador. Eles avisam o que aconteceu:

| Gancho | Onde | Quem reage |
|---|---|---|
| `golpeForte(chefe,x,y,dano)` | 5 pontos, um por chefe, no instante em que o golpe resolve | Vulcânico, Glacial, Ecoante, Trovejante |
| `acertouJogador(chefe,pl,dano)` | dano de contato do chefe | Vampírico |
| `levouDano(chefe,dano)` → dano | `takeDmg` dos 6 chefes | Escudo Rúnico, Regenerador |
| `acertarObjetos(x,y,r,dano)` | colisão de projétil do jogador | runas e rituais |
| `update(dt)` / `draw(ctx,t)` | laço principal | todos os demais |

São **10 linhas** somadas dentro de `boss-system.js`. Nenhuma classe de chefe
foi reescrita, e nenhum `if` de modificador vive lá dentro — um modificador novo
não obriga a reabrir aquelas seis classes.

### Onde cada `golpeForte` foi ancorado

| Chefe | Momento |
|---|---|
| Rei Cadáver | fim do giro |
| Aracne | aterrissagem do pulo |
| Gigante de Gelo | *(usa timer e limiar de vida; não tem golpe discreto)* |
| Verme Devorador | abertura do sumidouro |
| Balrog | chicotada conectando |
| Brutamontes | impacto do salto |

---

## Compatibilidade por chefe

Cada lista saiu da leitura do que o chefe **de fato faz**, não de suposição:

- **Verme Devorador** recebe Errante porque ele já mergulha e reaparece.
- **Brutamontes** e **Aracne** recebem Investidor porque já saltam.
- **Rei Cadáver** e **Aracne** recebem Invocador porque já chamam criaturas.
- **Gigante de Gelo** não recebe Investidor nem Caçador (é lento e pesado), nem
  Escudo Rúnico (já tem escudo próprio).
- **Balrog** não recebe Glacial; **Rei Cadáver** não recebe Vulcânico nem
  Glacial (castelo não tem esse tema).

Todos têm entre 15 e 18 compatíveis — folga confortável para a ameaça 6.

---

## Limpeza

Nada sobrevive de uma luta para a seguinte. `limpar()` é chamado ao iniciar a
run, ao chefe morrer e ao fim da run, e zera **todos** os arrays de efeito
(fogo, gelo, raios, minas, corrupção, abismos, runas, orbitais, ecos, ondas,
rituais), os cooldowns e a referência ao chefe.

---

## Desenvolvimento

`BossModifierSystem.forcarModificadores(['volcanic','echoing'], chefe)` aplica um
conjunto específico sem depender do sorteio. É só para teste — não há caminho no
jogo que exponha isso ao jogador.

---

## O que ficou de fora, e por quê

**Não há save de run em andamento neste jogo.** `savePersistentData` guarda meta
progressão (inventário, fazenda, oficina, ondas totais), não a run. Por isso o
nível de ameaça vive no estado da run em memória, e não foi criado nenhum save
novo — fechar o jogo encerra a run de qualquer maneira.

**Morrer encerra a run.** `endGame()` vai direto para a tela de derrota; não
existe "tentar o mesmo chefe de novo". A regra de não re-sortear ao morrer, como
originalmente descrita, não tem onde se aplicar aqui. O risco que ela protege —
re-sortear até cair uma combinação fácil — é coberto pelo sorteio acontecer uma
única vez por encontro.
