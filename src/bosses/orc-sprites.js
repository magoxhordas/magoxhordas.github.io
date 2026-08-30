/* ═══════════════════════════════════════════════════════════════════
   ORC — arte real do chefe, vinda de assets/bosses/orc/.
   Script classico (o jogo tambem abre por file://).

   Segue o mesmo desenho do HERO_IMG_SETS que ja existe para os herois:
   um conjunto de imagens por direcao, com cache e pre-carga, e uma
   funcao de desenho que devolve false se a arte ainda nao carregou —
   assim o jogo cai no sprite antigo em vez de piscar vazio.

   Todos os quadros foram exportados num canvas de 64x64 com o PE na
   MESMA linha (53), para o boneco nao pular ao trocar de animacao.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const BASE = 'assets/bosses/orc/';
  const QUADRO = 64;      // lado do canvas de cada quadro
  const PE = 53;          // linha do pe dentro do quadro
  const WALK_MS = 120;    // ritmo da caminhada
  const N_WALK = 6;
  const N_ATK = 9;
  const N_HIT = 9;        // soco (ataque basico)
  const N_PEDRA = 16;     // giros ja prontos da pedra arremessada
  const PEDRA_LADO = 24;  // lado de cada giro dentro da tira

  const cache = {};
  function img(nome) {
    let im = cache[nome];
    if (!im) { im = new Image(); im.src = BASE + nome + '.png'; cache[nome] = im; }
    return (im.complete && im.naturalWidth) ? im : null;
  }

  /* dir aceita 'down'|'south', 'up'|'north', 'left'|'right'|'side' */
  function normDir(dir) {
    if (dir === 'up' || dir === 'north') return 'north';
    if (dir === 'left' || dir === 'right' || dir === 'side') return 'side';
    return 'south';
  }

  /* estado: 'idle' | 'walk' | 'atk' | 'rock' | 'hit'
     idx: quadro escolhido por quem chama; ignorado no idle */
  function quadro(estado, dir, idx) {
    const d = normDir(dir);
    if (estado === 'hit') {
      // A pasta do ataque basico so' traz south e east. Nao existe golpe
      // de costas, e quem chama checa temGolpe() antes de comecar um.
      return img('hit_' + d + '_' + Math.min(N_HIT - 1, Math.max(0, idx | 0)));
    }
    if (estado === 'walk') return img('walk_' + d + '_' + (Math.max(0, idx | 0) % N_WALK));
    if (estado === 'atk')  return img('atk_'  + d + '_' + Math.min(N_ATK - 1, Math.max(0, idx | 0)));
    if (estado === 'rock') return img('rock_' + d + '_' + Math.min(N_ATK - 1, Math.max(0, idx | 0)));
    return img('idle_' + d);
  }

  /* A pedra arremessada, recortada do quadro em que o chefe a segura,
     para o projetil combinar com a arte em vez de ser um bloco cinza.
     E' uma tira com os N_PEDRA giros ja desenhados: girar pixel art no
     proprio canvas quebra o contorno nos angulos diagonais. */
  function pedra() { return img('pedra'); }

  /* Direcoes que tem quadros de golpe. De costas nao ha animacao na pasta,
     entao os chefes esperam o jogador sair de tras deles em vez de golpear
     com a animacao errada. Para liberar o golpe de costas depois, basta
     gravar hit_north_0..8 e acrescentar north aqui.
     E' uma lista declarada, e nao uma sondagem por Image: procurar um
     arquivo que nao existe rende um 404 no console a cada carga. */
  const DIRS_COM_GOLPE = { south: true, side: true };
  function temGolpe(dir) { return !!DIRS_COM_GOLPE[normDir(dir)]; }

  /* Desenha ancorado pelo PE em (x, pesY). Devolve false se a arte ainda
     nao carregou, para quem chama usar o sprite antigo. */
  function desenhar(ctx2, x, pesY, dir, estado, idx, escala, flip) {
    const im = quadro(estado, dir, idx);
    if (!im) return false;
    const lado = Math.round(QUADRO * (escala || 1));
    const dx = Math.round(x - lado / 2);
    const dy = Math.round(pesY - PE * (escala || 1));
    ctx2.save();
    ctx2.imageSmoothingEnabled = false;
    if (flip) { ctx2.translate(dx + lado, dy); ctx2.scale(-1, 1); ctx2.drawImage(im, 0, 0, lado, lado); }
    else ctx2.drawImage(im, dx, dy, lado, lado);
    ctx2.restore();
    return true;
  }

  /* Pre-carga: evita o primeiro quadro vazio no meio da luta. */
  (function precarregar() {
    for (const d of ['south', 'north', 'side']) {
      img('idle_' + d);
      for (let i = 0; i < N_WALK; i++) img('walk_' + d + '_' + i);
      for (let i = 0; i < N_ATK; i++) { img('atk_' + d + '_' + i); img('rock_' + d + '_' + i); }
      if (d !== 'north') for (let i = 0; i < N_HIT; i++) img('hit_' + d + '_' + i);
    }
    img('pedra');
  })();

  global.OrcSprites = {
    desenhar, quadro, pedra, temGolpe, WALK_MS, N_WALK, N_ATK, N_HIT, QUADRO, PE,
    N_PEDRA, PEDRA_LADO,
    pronto() { return !!img('idle_south'); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
