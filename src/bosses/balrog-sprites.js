/* ═══════════════════════════════════════════════════════════════════
   BALROG — arte real do chefe, vinda de assets/bosses/balrog/.
   Script classico (o jogo tambem abre por file://).

   Mesmo desenho dos outros tres chefes: imagens por direcao, com cache e
   pre-carga, e uma funcao de desenho que devolve false se a arte ainda
   nao carregou — assim o jogo cai no sprite antigo em vez de piscar
   vazio. Canvas de 64x64 com o PE na linha 53; o perfil ('side') olha
   para a ESQUERDA e quem chama espelha para a direita.

   Buracos da pasta, resolvidos aqui para quem chama nao precisar saber:
     - nao ha caminhada de FRENTE nem de COSTAS. De frente entra a
       corrida, que e' o mesmo personagem vindo na direcao da camera; de
       costas so' ha a pose parada.
     - nao ha corrida de costas: idem.
     - nao ha chicote de costas. Ele e' um golpe horizontal, entao de
       costas usa a vista de frente.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const BASE = 'assets/bosses/balrog/';
  const QUADRO = 64;
  const PE = 53;
  const WALK_MS = 150;    // caminhada da fase 1
  const RUN_MS = 95;      // corrida da fase 2
  const AURA_MS = 90;     // furia
  const LAVA_MS = 110;    // chamado de lava
  const N_WALK = 6;
  const N_RUN = 9;
  const N_WHIP = 9;
  const N_AURA = 9;
  const N_LAVA = 9;

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

  /* estado: 'idle' | 'walk' | 'run' | 'whip' | 'aura' | 'lava' */
  function quadro(estado, dir, idx) {
    const d = normDir(dir);
    const i = idx | 0;
    if (estado === 'walk') {
      if (d === 'side') return img('walk_side_' + mod(i, N_WALK));
      if (d === 'south') return img('run_south_' + mod(i, N_RUN));   // nao ha walk de frente
      return img('idle_north');                                      // nem de costas
    }
    if (estado === 'run') {
      if (d === 'north') return img('idle_north');
      return img('run_' + d + '_' + mod(i, N_RUN));
    }
    if (estado === 'whip') {
      const dw = d === 'north' ? 'south' : d;                        // golpe horizontal
      return img('whip_' + dw + '_' + Math.min(N_WHIP - 1, Math.max(0, i)));
    }
    if (estado === 'aura') return img('aura_' + d + '_' + Math.min(N_AURA - 1, Math.max(0, i)));
    if (estado === 'lava') return img('lava_' + d + '_' + Math.min(N_LAVA - 1, Math.max(0, i)));
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
      for (let i = 0; i < N_AURA; i++) img('aura_' + d + '_' + i);
      for (let i = 0; i < N_LAVA; i++) img('lava_' + d + '_' + i);
      if (d !== 'north') {
        for (let i = 0; i < N_RUN; i++) img('run_' + d + '_' + i);
        for (let i = 0; i < N_WHIP; i++) img('whip_' + d + '_' + i);
      }
    }
    for (let i = 0; i < N_WALK; i++) img('walk_side_' + i);
  })();

  global.BalrogSprites = {
    desenhar, quadro,
    WALK_MS, RUN_MS, AURA_MS, LAVA_MS,
    N_WALK, N_RUN, N_WHIP, N_AURA, N_LAVA, QUADRO, PE,
    pronto() { return !!img('idle_south'); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
