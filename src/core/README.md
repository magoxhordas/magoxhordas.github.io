# Sistemas centrais

Esta pasta separa mecanismos compartilhados do `index.html` sem transferir a propriedade do estado do jogo nem alterar o comportamento percebido pelo jogador.

Os arquivos continuam sendo scripts classicos, carregados na mesma ordem dos blocos originais. As APIs permanecem disponiveis aos consumidores legados por `window` ou pelo escopo global de scripts classicos.

## SaveSystem

`save-system.js` e responsavel apenas pelo mecanismo de persistencia:

- ler e escrever texto, numeros e JSON no `localStorage`;
- aplicar os mesmos fallbacks;
- registrar o manifesto ja existente;
- preservar todas as chaves e formatos atuais;
- guardar uma copia de JSON corrompido antes de usar o fallback.

O modulo nao e dono de inventario, farming, progresso, configuracoes, pets, unlocks ou estado do acampamento. Esses dados continuam nos sistemas originais, que chamam o `SaveSystem` para serializar e restaurar seus valores. Nao foi criada uma nova versao de save nem uma migracao de formato.

## InputManager

`input-system.js` e responsavel por:

- manter o estado das teclas por escopo registrado;
- normalizar aliases de `key` e `code`;
- respeitar prioridade, atividade e exclusividade dos escopos;
- impedir listeners centrais duplicados;
- combinar fontes virtuais dos controles de toque;
- liberar estados presos em suspensao, blur ou troca de contexto;
- encaminhar ataques por ponteiro aos consumidores registrados.

Campanha e Dungeon continuam decidindo o significado das teclas em seus handlers originais. Movimento, interacao, ataque, pausa, inventario, P1, P2, WASD, setas e regras de combate nao foram movidos nem redefinidos.

Alguns inputs locais continuam propositalmente fora do gerenciador central, como captura de tecla nas Configuracoes, dialogos, minigame de pesca e interacoes especificas do CampV2. Centraliza-los exigiria uma fase funcional separada.

## Audio

`audio-system.js` preserva integralmente o sistema procedural existente e controla:

- uma unica instancia de `AudioContext`;
- canais master, musica, efeitos e ataques;
- volumes, mute e restauracao do volume de ataque;
- temas do menu, campanha, capitulos, chefes, acampamento e Dungeon;
- fades e encerramento de nos/timeouts antes da troca de faixa;
- efeitos de armas, dano, moedas, ondas, loja, pets e deuses.

Os gatilhos continuam no jogo principal. O desbloqueio de autoplay ainda acontece somente no primeiro `click` ou `keydown`, e `GameSettings` continua sendo dono das preferencias persistidas. Nenhum asset, nota, volume, timing, loop, fade ou evento sonoro foi alterado nesta extracao.

## Fora desta fase

Continuam no `index.html`:

- estado e loop principal;
- campanha e capitulos;
- combate, movimento e projeteis;
- classes, armas, bencaos e reliquias;
- chefes, Dungeon, loja e UI;
- regras e estado do acampamento que nao pertencem aos modulos ja extraidos.

Esta separacao e arquitetural. Centralizacao de estado, novas APIs, mudancas de controles, redesenho de audio e extracao dos sistemas acima ficam para fases futuras com cobertura propria.

## Verificacao

Os contratos centrais sao protegidos por:

- `scripts/verify-game-smoke.mjs`;
- `scripts/verify-core-save.mjs`;
- `scripts/verify-core-input.mjs`;
- `scripts/verify-core-audio.mjs`;
- todos os demais `scripts/verify-*.mjs` do pacote oficial.
