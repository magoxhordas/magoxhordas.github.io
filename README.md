# Mago x Hordas Codex Oficial

Versão consolidada do jogo de ação em HTML, CSS e JavaScript.

## Conteúdo

- campanha completa e cinco capítulos;
- Códex de classes, armas, bênçãos, relíquias, pets e masmorras;
- sprites animados das quatro classes;
- cinco pets com animações e sistemas próprios;
- acampamento, fazenda, pesca, crafting e lojas;
- testes de integridade em `scripts/`.

## Estrutura do codigo

O jogo está sendo modularizado de forma incremental, preservando o `index.html` como entrada oficial. Os limites dos sistemas já extraídos estão documentados em [`src/README.md`](src/README.md), incluindo Core, Acampamento, Combate, as 32 armas da campanha, as 75 bênçãos divinas e a loja entre ondas.

## Executar localmente

Abra `index.html` diretamente ou inicie um servidor HTTP nesta pasta:

```powershell
python -m http.server 8765
```

Depois acesse `http://127.0.0.1:8765/`.

Site oficial: https://magoxhordas.github.io/
