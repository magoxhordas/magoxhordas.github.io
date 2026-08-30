/* ═══════════════════════════════════════════════════════════════════
   VERME DEVORADOR — arte real do chefe, vinda de assets/bosses/sandworm/.
   Script classico (o jogo tambem abre por file://).

   Mesmo desenho dos outros chefes: imagens por direcao, com cache e
   pre-carga, e uma funcao de desenho que devolve false se a arte ainda
   nao carregou. Canvas de 64x64 com o PE na linha 53.

   Diferente dos outros, o perfil ('side') sai do 'west' SEM espelho: o
   west deste pacote ja olha para a esquerda.

   Buraco da pasta: so' a caminhada tem 'north'. Correr, cuspir e morder
   caem na vista de frente quando ele vai para cima — de costas o verme e'
   um tubo, e a diferenca entre as duas vistas e' pequena.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const BASE = 'assets/bosses/sandworm/';
  const QUADRO = 64;
  const PE = 53;
  const WALK_MS = 130;
  const RUN_MS = 85;      // a investida enterrada
  const N_WALK = 9;
  const N_RUN = 9;
  const N_ACID = 9;
  const N_HIT = 9;

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

  /* estado: 'idle' | 'walk' | 'run' | 'acid' | 'hit' */
  function quadro(estado, dir, idx) {
    const d = normDir(dir);
    const i = idx | 0;
    if (estado === 'walk') return img('walk_' + d + '_' + mod(i, N_WALK));
    // sem quadro de costas nas acoes: entra a vista de frente
    const da = d === 'north' ? 'south' : d;
    if (estado === 'run')  return img('run_'  + da + '_' + mod(i, N_RUN));
    if (estado === 'acid') return img('acid_' + da + '_' + Math.min(N_ACID - 1, Math.max(0, i)));
    if (estado === 'hit')  return img('hit_'  + da + '_' + Math.min(N_HIT - 1, Math.max(0, i)));
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
      if (d !== 'north') {
        for (let i = 0; i < N_RUN; i++) img('run_' + d + '_' + i);
        for (let i = 0; i < N_ACID; i++) img('acid_' + d + '_' + i);
        for (let i = 0; i < N_HIT; i++) img('hit_' + d + '_' + i);
      }
    }
  })();

  global.SandwormSprites = {
    desenhar, quadro,
    WALK_MS, RUN_MS, N_WALK, N_RUN, N_ACID, N_HIT, QUADRO, PE,
    pronto() { return !!img('idle_south'); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
