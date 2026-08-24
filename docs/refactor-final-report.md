# Relatório final da modularização incremental

Data de conclusão local: 22 de agosto de 2026.

## 1. Arquitetura inicial

O ponto inicial rastreado (`360d71d`) concentrava praticamente todo o jogo em um `index.html` de 1.709.536 bytes e 31.198 linhas. Estado, loop, áudio, persistência, controles, combate, armas, campanha, chefes, Dungeon, loja, bênçãos, Códex e telas dividiam o mesmo documento e dependiam da ordem dos scripts clássicos.

## 2. Arquitetura final

O `index.html` continua sendo a entrada oficial e preserva marcação, CSS e o orquestrador legado. Ele agora possui 1.010.861 bytes e 19.312 linhas. Trinta módulos JavaScript em `src/` concentram 768.983 bytes e 12.801 linhas, organizados por domínio e carregados nos mesmos pontos de execução dos blocos originais.

A redução do documento principal foi de 698.675 bytes e 11.886 linhas, sem introduzir bundler, framework, TypeScript, módulos ESM ou um segundo estado de jogo.

## 3. Sistemas extraídos

Foram separados Core, Acampamento, Combate, Armas, Bênçãos, Loja, Campanha, Chefes, Modo Chefão, Masmorra e Interface. Dados declarativos foram isolados da execução quando isso podia ser feito sem mudar contratos.

## 4. Sistemas que permanecem no `index.html`

Continuam no documento o estado central, loop e orquestração, classes `Player` e `Enemy`, inventário/meta progressão, pets e suas telas, renderização geral, cenário compartilhado, farming/crafting fora das fronteiras já extraídas, pesca, cozinha, `CampV2`, NPCs, controles móveis e handlers declarativos do HTML.

## 5. Por que esses sistemas permanecem

Esses blocos compartilham estado lexical, canvas, ordem de frames, callbacks declarativos e save. Extraí-los agora exigiria uma migração funcional ampla, contrariando a regra de preservar gameplay. O inventário e a justificativa estão em [`global-inventory.md`](global-inventory.md).

## 6. Testes e verificadores

Existem 19 verificadores especializados em `scripts/`. `scripts/verify-all.mjs` descobre e executa todos eles em ordem determinística, interrompendo na primeira falha. A suíte protege integridade do pacote, sintaxe, ordem de scripts, arte, controles, save, áudio, combate, armas, campanha, chefes, Dungeon, acampamento, loja, bênçãos e UI.

## 7. Compatibilidade do save

As chaves, payloads, fallbacks e formatos existentes foram mantidos. `SaveSystem` apenas centraliza leitura e escrita; inventário, farming, pets, configurações, progresso, desbloqueios e Bosque da Fenda continuam pertencendo aos sistemas originais. Não houve migração de versão nem limpeza de dados do jogador.

## 8. Controles

`InputManager` centraliza teclado, aliases, prioridades, exclusividade e fontes virtuais sem redefinir comandos. WASD, setas, P1/P2, toque, ataque manual/automático, interação, pausa e escopos da Dungeon permanecem compatíveis. O movimento combinado de WASD e setas continua limitado à velocidade normal.

## 9. Áudio

O sistema procedural mantém uma instância de `AudioContext`, canais, volumes, mute, autoplay, fades, temas e efeitos. Menu, cinco capítulos, campanha, chefes, acampamento, Dungeon, armas, dano, loja, pets e aparições divinas conservam seus gatilhos e timings.

## 10. Campanha

A campanha preserva os cinco biomas e capítulos, iniciados nas ondas 1, 6, 11, 16 e 21. Transições, limpeza de objetos, HUD, música, efeitos ambientais, progressão, conclusão e retorno ao menu continuam com a mesma ordem de execução.

## 11. Modo Chefão

O Modo Chefão mantém fila e estado próprios, usa as classes reais dos chefes e seleciona a arena declarada para cada luta. A saída limpa o modo antes de retornar à campanha ou ao menu, sem contaminar o estado da história.

## 12. Masmorra

`dungeon-system.js` preserva geração, salas, corredores, escadas, baús, barris, mercador, portal, quatro biomas, Bosque da Fenda, 22 inimigos, 18 chefes, Hiper Boss, sete anéis, oito relíquias, recompensas, progressão, HUD, minimapa, controles e save.

## 13. Acampamento

Colisão, layout, horta, interações, ambiente, pet e arqueiro possuem fronteiras próprias. A colisão continua baseada nos pés do personagem, passagens têm prioridade e saves presos são resgatados. Água, fogueira, luzes, vagalumes e portal mantêm suas animações.

## 14. Armas

O catálogo preserva 32 armas, oito por classe, cinco raridades, dano, cooldown, elementos, efeitos e projéteis. A execução continua integrada às entidades reais; ícones no HUD, loja e Códex e o feedback de fogo, gelo, raio e demais elementos permanecem protegidos pelos verificadores.

## 15. Bênçãos

As 15 divindades, 75 bênçãos, cinco raridades, valores, requisitos, exclusões, sinergias e proteção contra repetição foram mantidos. Hooks de ataque, acerto, morte, dash, dano recebido, transição e atualização temporal continuam públicos para os consumidores legados.

## 16. Loja

A loja conserva 32 buffs de classe, oito itens universais, três poções, cinco raridades, preços, ofertas, P1/P2, reroll, bloqueio, compra e regra de não repetição. Dados e execução estão separados, mas o DOM e a aparência não foram redesenhados.

## 17. Interface

Seleção, roteamento de telas, inventário visual, Códex, relíquias, bênçãos, Dungeon, anúncios de onda, avisos de chefe, nevasca e configurações foram extraídos em três módulos. IDs, classes, textos, handlers, ordem de carregamento e marcação permanecem compatíveis.

## 18. Dívida técnica restante

O documento ainda contém 57 scripts inline, estado global compartilhado, 104 referências de eventos declarativos e grandes blocos de entidades/renderização. Há wrappers de compatibilidade e alguns nomes globais duplicados intencionalmente por patches históricos. Essa dívida está registrada, não ocultada.

## 19. Riscos conhecidos

- a ordem dos 30 scripts externos e 57 blocos inline continua sendo parte do contrato;
- alterações no estado central podem afetar vários modos ao mesmo tempo;
- renderização, colisão e foco precisam de validação real em navegador, além dos testes estáticos;
- a validação visual das fases finais e a publicação das branches posteriores à Fase 3 ficaram pendentes por restrições externas do ambiente, não por falha da suíte local;
- nenhum PR deve ser mesclado fora da ordem da cadeia de dependências.

## 20. Sugestões para a arquitetura futura

1. Extrair pets e meta progressão em pequenas fases com baselines próprios.
2. Migrar handlers declarativos por tela, sem troca geral do DOM.
3. Criar uma fachada explícita para o estado do runtime antes de mover `Player`, `Enemy` ou o loop.
4. Adicionar testes de navegador para cada capítulo, chefe, Dungeon e acampamento.
5. Só considerar ESM, bundler ou framework depois que a API global e a ordem de scripts deixarem de ser contratos de gameplay.

## Checklist de encerramento

- [x] módulos carregados na posição original;
- [x] nenhum valor de balanceamento alterado;
- [x] formatos de save preservados;
- [x] controles e fontes virtuais preservados;
- [x] todos os verificadores locais verdes;
- [x] inventário de globais documentado;
- [x] dívida e riscos conhecidos documentados;
- [ ] validação visual final em navegador quando a política do ambiente permitir;
- [ ] publicação das branches locais restantes quando o acesso externo for liberado;
- [ ] revisão e merge manual dos PRs na ordem correta.
