# Interface

Esta pasta reúne três fronteiras de interface extraídas mecanicamente do HTML, sem alterar marcação, CSS, IDs, classes, textos ou handlers.

## Módulos

- `menu-codex-system.js`: seleção de classe/dificuldade, roteamento de telas, inventário visual da loja, Códex, relíquias, bênçãos e documentação visual da Masmorra.
- `campaign-overlays.js`: anúncio de ondas, aviso de chefes e neve sobreposta da campanha.
- `settings-system.js`: configurações de áudio, ataque automático/manual, skins, resolução, controles e progresso cosmético.

## Limites intencionais

A marcação e os estilos continuam no `index.html`, que permanece como entrada oficial e documento visual. Renderers acoplados diretamente ao canvas, o loop principal, pesca, crafting e a implementação do acampamento não foram movidos nesta fase.

Os módulos são carregados nos mesmos pontos dos blocos inline originais. Funções globais chamadas por atributos HTML (`onclick`) e por outros sistemas permanecem disponíveis com os mesmos nomes.

## Verificação

`scripts/verify-ui-system.mjs` compila os módulos, protege as telas, contratos públicos, ordem de carga, capítulos, configurações, controles, Códex e integração da loja.
