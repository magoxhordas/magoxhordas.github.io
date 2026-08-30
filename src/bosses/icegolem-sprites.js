/* ═══════════════════════════════════════════════════════════════════
   GOLEM DE GELO — arte real do chefe, vinda de assets/bosses/icegolem/.
   Script classico (o jogo tambem abre por file://).

   Mesmo desenho do OrcSprites e do SkelKingSprites: um conjunto de imagens
   por direcao, com cache e pre-carga, e uma funcao de desenho que devolve
   false se a arte ainda nao carregou — assim o jogo cai no sprite antigo
   em vez de piscar vazio.

   Todos os quadros saem num canvas de 64x64 com o PE na MESMA linha (53),
   a convencao dos outros dois chefes, para o boneco nao pular ao trocar
   de animacao. O perfil ('side') olha para a ESQUERDA; quem chama espelha
   quando ele vai para a direita.

   Diferente do Orc, aqui existe golpe nas QUATRO direcoes — a pasta traz
   north, entao ele pode golpear de costas.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const BASE = 'assets/bosses/icegolem/';
  const QUADRO = 64;      // lado do canvas de cada quadro
  const PE = 53;          // linha do pe dentro do quadro
  const WALK_MS = 150;    // ritmo da caminhada
  const AURA_MS = 130;    // ritmo da erupcao glacial
  const N_WALK = 6;
  const N_HIT = 9;
  const N_SHIELD = 9;
  const N_AURA = 9;

  const cache = {};
  function img(nome) {
    let im = cache[nome];
    if (!im) { im = new Image(); im.src = BASE + nome + '.png'; cache[nome] = im; }
    return (im.complete && im.naturalWidth) ? im : null;
  }

  function mod(n, m) { return ((n % m) + m) % m; }

  /* dir aceita 'down'|'south', 'up'|'north', 'left'|'right'|'side' */
  function normDir(dir) {
    if (dir === 'up' || dir === 'north') return 'north';
    if (dir === 'left' || dir === 'right' || dir === 'side') return 'side';
    return 'south';
  }

  /* estado: 'idle' | 'walk' | 'hit' | 'shield' | 'aura'
     idx: quadro escolhido por quem chama; ignorado no idle */
  function quadro(estado, dir, idx) {
    const d = normDir(dir);
    const i = idx | 0;
    if (estado === 'walk')   return img('walk_'   + d + '_' + mod(i, N_WALK));
    if (estado === 'hit')    return img('hit_'    + d + '_' + Math.min(N_HIT - 1, Math.max(0, i)));
    if (estado === 'shield') return img('shield_' + d + '_' + Math.min(N_SHIELD - 1, Math.max(0, i)));
    if (estado === 'aura')   return img('aura_'   + d + '_' + mod(i, N_AURA));
    return img('idle_' + d);
  }

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
      for (let i = 0; i < N_HIT; i++) img('hit_' + d + '_' + i);
      for (let i = 0; i < N_SHIELD; i++) img('shield_' + d + '_' + i);
      for (let i = 0; i < N_AURA; i++) img('aura_' + d + '_' + i);
    }
  })();

  global.IceGolemSprites = {
    desenhar, quadro,
    WALK_MS, AURA_MS, N_WALK, N_HIT, N_SHIELD, N_AURA, QUADRO, PE,
    pronto() { return !!img('idle_south'); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
