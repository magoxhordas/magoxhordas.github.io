# Mago x Hordas Codex Oficial

Versão consolidada do jogo de ação em HTML, CSS e JavaScript.

## Conteúdo

- campanha completa e cinco capítulos;
- Códex de classes, armas, bênçãos, relíquias, pets e masmorras;
- sprites animados das quatro classes;
- cinco pets com animações e sistemas próprios;
- acampamento, fazenda, pesca, crafting e lojas;
- testes de integridade em `scripts/`.

## Bênçãos e Ascensões

O sistema possui 15 divindades, 75 bênçãos normais e 30 Ascensões. Ao reunir três bênçãos da mesma divindade, o jogador escolhe imediatamente uma de duas Ascensões definitivas; o deus então sai das ofertas normais. Afinidade moderada ajuda a perseguir uma build e uma proteção contra azar prioriza uma afinidade 2/3 depois de oito escolhas sem Ascensão.

Cada Ascensão possui um efeito-base funcional e sinergias com as bênçãos do deus. Os gatilhos compartilham os contratos reais de ataque, acerto, crítico, eliminação, dano, dash e onda, inclusive em chefes, co-op e invocações do Necromante.

O catálogo fica em `src/blessings/blessing-data.js`, o motor canônico em `src/blessings/blessing-system.js` e o verificador dedicado em `scripts/verify-deity-blessings.mjs`.

## Estrutura do codigo

O jogo foi modularizado de forma incremental, preservando o `index.html` como entrada oficial. Os limites dos sistemas extraídos estão documentados em [`src/README.md`](src/README.md). O [relatório final](docs/refactor-final-report.md) registra a arquitetura, compatibilidade, dívida técnica e riscos conhecidos.

## Verificação completa

Execute todos os verificadores locais com:

```powershell
node scripts/verify-all.mjs
```

## Executar localmente

Abra `index.html` diretamente ou inicie um servidor HTTP nesta pasta:

```powershell
python -m http.server 8765
```

Depois acesse `http://127.0.0.1:8765/`.

Site oficial: https://magoxhordas.github.io/
