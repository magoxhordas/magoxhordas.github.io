/* ═══════════════════════════════════════════════════════════════════
   ARACNE ANCESTRAL — arte real do chefe, vinda de assets/bosses/aracne/.
   Script classico (o jogo tambem abre por file://).

   Mesmo desenho dos outros chefes: imagens por direcao, com cache e
   pre-carga, e uma funcao de desenho que devolve false se a arte ainda
   nao carregou. Canvas de 64x64 com o PE na linha 53; o perfil ('side')
   olha para a ESQUERDA e quem chama espelha para a direita.

   Um buraco da pasta, resolvido aqui: a TEIA nao tem quadro de frente.
   Ela e' um jato que sai na direcao da mira; de lado e para baixo o
   perfil le bem, e so' o alvo bem acima usa o quadro de costas.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const BASE = 'assets/bosses/aracne/';
  const QUADRO = 64;
  const PE = 53;
  const WALK_MS = 120;    // a aranha e' rapida
  const WEB_MS = 90;
  const N_WALK = 6;
  const N_HIT = 9;
  const N_FALL = 9;
  const N_EGG = 9;
  const N_WEB = 9;

  const cache = {};
  function img(nome) {
    let im = cache[nome];
    if (!im) { im = new Image(); im.src = BASE + nome + '.png'; cache[nome] = im; }
    return (im.complete && im.naturalWidth) ? im : null;
  }

  function mod(n, m) { return ((n % m) + m) % m; }

  function normDir(dir) {
    if (dir === 'up' || dir === 'north') return 'north';
    if (dir === 'left' || dir === 'right' || dir === 'side') return 'side';
    return 'south';
  }

  /* estado: 'idle' | 'walk' | 'hit' | 'fall' | 'egg' | 'web' */
  function quadro(estado, dir, idx) {
    const d = normDir(dir);
    const i = idx | 0;
    if (estado === 'walk') return img('walk_' + d + '_' + mod(i, N_WALK));
    if (estado === 'hit')  return img('hit_'  + d + '_' + Math.min(N_HIT - 1, Math.max(0, i)));
    if (estado === 'fall') return img('fall_' + d + '_' + Math.min(N_FALL - 1, Math.max(0, i)));
    if (estado === 'egg')  return img('egg_'  + d + '_' + Math.min(N_EGG - 1, Math.max(0, i)));
    if (estado === 'web') {
      const dw = d === 'south' ? 'side' : d;      // nao ha teia de frente
      return img('web_' + dw + '_' + mod(i, N_WEB));
    }
    return img('idle_' + d);
  }

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

  (function precarregar() {
    for (const d of ['south', 'north', 'side']) {
      img('idle_' + d);
      for (let i = 0; i < N_WALK; i++) img('walk_' + d + '_' + i);
      for (let i = 0; i < N_HIT; i++) img('hit_' + d + '_' + i);
      for (let i = 0; i < N_FALL; i++) img('fall_' + d + '_' + i);
      for (let i = 0; i < N_EGG; i++) img('egg_' + d + '_' + i);
      if (d !== 'south') for (let i = 0; i < N_WEB; i++) img('web_' + d + '_' + i);
    }
  })();

  global.AracneSprites = {
    desenhar, quadro,
    WALK_MS, WEB_MS, N_WALK, N_HIT, N_FALL, N_EGG, N_WEB, QUADRO, PE,
    pronto() { return !!img('idle_south'); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
