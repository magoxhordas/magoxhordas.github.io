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

Para a mecânica central não desaparecer por puro azar numa campanha completa, depois de oito bênçãos normais sem nenhuma Ascensão uma divindade já em 2/3 recebe prioridade. Todas as Ascensões também possuem efeito-base próprio: as sinergias melhoram o caminho escolhido, mas não são pré-requisitos escondidos.

## Compatibilidade

Os contratos globais usados pelo jogo foram preservados: ofertas, aplicação, crítico, acerto, morte, dash, esquiva, prevenção de morte, dano recebido, atualização temporal, transição de onda, HUD e reset continuam disponíveis nos mesmos pontos de integração. Progresso baseado em abates recebe créditos proporcionais ao dano causado em chefes, jogadores mortos no co-op recebem escolhas compartilhadas sem serem ressuscitados, e invocações do Necromante herdam dano, velocidade de ataque, crítico e gatilhos de acerto compatíveis.

Defesas de fontes diferentes são combinadas multiplicativamente e respeitam um piso de 25% do dano original. Custos de vida máxima são cobrados no momento da escolha, sem depender da ordem das bênçãos.

## Verificação

`scripts/verify-deity-blessings.mjs` valida:

- 15 divindades;
- 75 bênçãos únicas;
- cinco raridades;
- 30 Ascensões;
- escalonamento monotônico e limites seguros de raridade;
- implementação comportamental dos efeitos e das 30 Ascensões sem pré-requisito oculto;
- gatilhos essenciais de dano, cura, crítico, dash, onda, chefe e invocação;
- desbloqueio da Ascensão na terceira bênção;
- proteção contra azar, oferta de dois caminhos e bloqueio do deus após o compromisso;
- sincronização de P1/P2, inclusive quando um jogador está morto.
