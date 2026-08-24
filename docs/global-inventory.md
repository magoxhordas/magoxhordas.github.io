# Inventário de contratos globais

Este inventário classifica os globais que permanecem necessários após a modularização incremental. Ele não transforma esses nomes em APIs novas: apenas registra por que removê-los ou renomeá-los sem uma fase funcional dedicada seria arriscado.

## A. Contratos públicos estáveis

São pontos de integração publicados intencionalmente pelos módulos ou consumidos por mais de um domínio:

- Core: `SaveSystem`, `InputManager`, `Audio` e `GameSettings`;
- combate: `CampaignStatusEffects`, `CampaignDamageSystem` e `CampaignCombatSystem`;
- armas: `CampaignWeaponData`, `CampaignWeaponSystem` e `CampaignProjectileSystem`;
- conteúdo: `MagoBlessingData`, `MagoShopData`, `MagoCampaignBossData` e `MagoCampaignChapterData`;
- bênçãos: `DEITY_BLESSINGS_V2`, `DEITY_BLESSING_RARITIES`, `applyDeityBoon` e os hooks `notifyBlessing*`;
- loja: `CAMPAIGN_CLASS_BUFFS`, `CAMPAIGN_UNIVERSAL_ITEMS` e `CAMPAIGN_POTIONS`;
- Masmorra: `DNG`, `DNG_RELICS`, `DNG_RING_TYPES` e `startDungeonMode`;
- acampamento: `CampCollisionMap`, `CampLayoutData`, `CampFarmingData`, `CampFarmingSystem`, `CampInteractionData`, `CampEnvironmentRenderer`, `CampPetSystem` e `CampArcherSystem`;
- arte e Códex: `CODEX_RELIC_ART`, `HERO_SKINS` e helpers públicos de desenho do herói.

Esses nomes devem continuar estáveis enquanto consumidores legados ainda usam scripts clássicos.

## B. Estado compartilhado legado

O runtime principal ainda compartilha, pelo escopo global clássico, `state`, `keys`, `player`, `player2`, `enemies`, `projs`, `coins`, `parts`, `meleeAnims`, `firePatches`, `kills`, `wave`, timers, dificuldade, modo de jogo, inventário, pets e referências de cenário.

Esses valores são a fonte de verdade atual. Encapsulá-los exigiria migrar simultaneamente loop, entidades, renderização, save e handlers; por isso permaneceram no `index.html`.

## C. Canvas e renderização

`canvas`, `ctx`, `W`, `H`, classes `Player` e `Enemy`, renderers de personagens, cenário, projéteis, pets e efeitos continuam acoplados à ordem do loop. Os módulos extraídos recebem referências ou callbacks em vez de criar um segundo estado gráfico.

Mover esses nomes deve ser feito somente com testes de frames, colisão, profundidade, escala e viewport em navegador.

## D. API declarativa do HTML

O documento ainda possui 104 referências de eventos declarativos (`onclick`, `onchange`, `oninput`, `onkeydown` e `onkeyup`). Funções como `showScreen`, `openShop`, `goToHub`, controles do Códex, configurações, farming, crafting, cozinha, pets e Dungeon precisam permanecer alcançáveis pelo escopo global.

Trocar esses atributos por listeners pode ser uma melhoria futura, mas deve ocorrer por tela e com verificação visual, de foco, teclado e toque.

## Regra de manutenção

Um global só deve ser removido quando todos os consumidores forem identificados, substituídos e cobertos por um verificador. Até lá, a compatibilidade vale mais do que uma redução apenas estética do escopo global.
