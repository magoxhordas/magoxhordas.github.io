# Bênçãos V4 — mecânicas e Ascensões

O sistema de bênçãos deixa de tratar as divindades como uma coleção de multiplicadores e passa a tratá-las como **arquétipos de gameplay**. A meta é que uma escolha mude o que o jogador faz em combate: criar marcas, preparar explosões, alternar armas, abusar do dash, manter ritmo, executar alvos, ricochetear ataques, empurrar hordas ou sobreviver no limite.

## Estrutura

- `blessing-data.js`: 15 divindades, 75 bênçãos (5 por divindade), cinco raridades e 30 Ascensões (2 por divindade).
- `blessing-system.js`: ofertas, aplicação, HUD, gatilhos de combate, efeitos secundários e fluxo de Ascensão.

## Filosofia V4

As raridades continuam existindo, mas agora melhoram principalmente **frequência, alcance, número de alvos, duração, limiares e potência de procs**, em vez de apenas adicionar dano/vida/velocidade passivos.

Identidades principais:

- **Zeus:** descargas, corrente elétrica, marcas e tempestade.
- **Ares:** feridas, condenação, execução e fúria.
- **Hécate:** maldições, ecos e alternância entre fontes de ataque.
- **Selene:** fases lunares, raios lunares e eclipse.
- **Moros:** críticos predestinados, piedade crítica e negação da morte.
- **Atena:** contra-ataque, postura, brecha tática e égide.
- **Hermes:** momentum, dash ofensivo, pós-imagens e fluxo.
- **Dionísio:** ressaca, buffs caóticos, explosões e sobrevivência festiva.
- **Hefesto:** superaquecimento, bigorna, estilhaços e arma favorita.
- **Artemis:** presa marcada, ricochete, distância, ponto fraco e saraivada.
- **Poseidon:** ondas, empurrões, pressão e maré crescente.
- **Hércules:** trabalhos, golpes titânicos, troféus e sequências de abate.
- **Sauron:** corrupção, domínio, Olho e risco do Anel.
- **Nazgûl:** forma espectral, dash assassino, terror e caça.
- **Ents:** crescimento, raízes, casca, resiliência e bosque curativo.

## Ascensão de Build

Ao adquirir **três bênçãos normais da mesma divindade**, ela deixa de aparecer nas ofertas normais e abre imediatamente uma escolha especial com **duas Ascensões**. A escolha é definitiva para a run e transforma o arquétipo daquele deus em uma versão extrema.

Exemplos:

- Zeus: `Avatar da Tempestade` ou `Julgamento do Olimpo`.
- Ares: `Deus da Guerra` ou `Banquete de Sangue`.
- Hécate: `Deusa Tríplice` ou `Noite Sem Fim`.
- Artemis: `Caçada Selvagem` ou `Flecha da Lua`.
- Poseidon: `Tsunami` ou `Mares Revoltos`.

O sorteio de deuses também ganhou **afinidade de build**: possuir 1 ou 2 bênçãos de uma divindade aumenta a chance de encontrá-la novamente, permitindo perseguir uma Ascensão sem tornar a escolha garantida.

## Compatibilidade

Os contratos globais usados pelo jogo foram preservados: ofertas, aplicação, crítico, acerto, morte, dash, esquiva, prevenção de morte, dano recebido, atualização temporal, transição de onda, HUD e reset continuam disponíveis nos mesmos pontos de integração.

## Verificação

`scripts/verify-deity-blessings.mjs` valida:

- 15 divindades;
- 75 bênçãos únicas;
- cinco raridades;
- 30 Ascensões;
- implementação explícita dos efeitos;
- gatilhos essenciais de Zeus, Hécate, Moros e Nazgûl;
- desbloqueio da Ascensão na terceira bênção;
- oferta de dois caminhos e bloqueio do deus após o compromisso.
