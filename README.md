# Mago x Hordas Codex Oficial

Versão consolidada do jogo de ação em HTML, CSS e JavaScript.

## Conteúdo

- campanha completa e cinco capítulos;
- Códex de classes, armas, bênçãos, relíquias, pets e masmorras;
- sprites animados das quatro classes;
- cinco pets com animações e sistemas próprios;
- acampamento, fazenda, pesca, crafting e lojas;
- testes de integridade em `scripts/`.

## Afinidade divina

O sistema de bênçãos possui 15 divindades, 75 bênçãos normais e progressão por afinidade. Duas bênçãos ativam Ressonância; a terceira abre uma escolha entre duas Ascensões; a quarta evolui a escolha; e a quinta desperta a Apoteose e encerra as ofertas daquele deus. Os efeitos usam ataques automáticos, acertos, eliminações, dash, dano e ondas reais, com estado independente para P1 e P2.

O catálogo fica em `src/blessings/blessing-data.js` e o motor de progressão e combate em `src/blessings/blessing-affinity-system.js`. O verificador dedicado é `scripts/verify-deity-blessings.mjs`.

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
