/* ═══════════════════════════════════════════════════════════════════
   REI ESQUELETO — arte real do chefe, vinda de assets/bosses/skelking/.
   Script classico (o jogo tambem abre por file://).

   Mesmo desenho do OrcSprites: um conjunto de imagens por direcao, com
   cache e pre-carga, e uma funcao de desenho que devolve false se a arte
   ainda nao carregou — assim o jogo cai no sprite antigo em vez de piscar
   vazio.

   Todos os quadros foram exportados num canvas de 64x64 com o PE na MESMA
   linha (53), a mesma convencao do Orc, para o boneco nao pular ao trocar
   de animacao.

   Duas particularidades deste chefe:
     - 'spin' nao tem direcao: as 8 rotacoes da arte SAO o ciclo do giro.
     - 'espada' e' o projetil bumerangue, recortado do proprio sprite, com
       os 16 giros ja desenhados (girar pixel art no canvas quebra o
       contorno nos angulos diagonais).
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const BASE = 'assets/bosses/skelking/';
  const QUADRO = 64;      // lado do canvas de cada quadro
  const PE = 53;          // linha do pe dentro do quadro
  const WALK_MS = 130;    // ritmo da caminhada
  const SPIN_MS = 70;     // ritmo do giro
  const N_WALK = 6;
  const N_ATK = 9;
  const N_SPIN = 8;
  const N_ESPADA = 16;
  const ESPADA_LADO = 28;

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

  /* estado: 'idle' | 'walk' | 'atk' | 'spin' | 'cast'
     idx: quadro escolhido por quem chama; ignorado no idle e no cast */
  function quadro(estado, dir, idx) {
    if (estado === 'spin') return img('spin_' + mod(idx | 0, N_SPIN));
    const d = normDir(dir);
    if (estado === 'walk') return img('walk_' + d + '_' + mod(idx | 0, N_WALK));
    if (estado === 'atk')  return img('atk_'  + d + '_' + Math.min(N_ATK - 1, Math.max(0, idx | 0)));
    if (estado === 'cast') return img('cast_' + d);
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

  /* A espada bumerangue, recortada do quadro de costas (onde ela fica
     solta do corpo). Tira com os N_ESPADA giros ja desenhados. */
  function espada() { return img('espada'); }

  /* Desenha a espada girada pelo angulo em radianos. Devolve false se a
     arte ainda nao carregou. */
  function desenharEspada(ctx2, x, y, angulo, comprimento) {
    const im = espada();
    if (!im) return false;
    const q = mod(Math.floor(angulo / (Math.PI * 2 / N_ESPADA)), N_ESPADA);
    const lado = Math.round(comprimento);
    ctx2.save();
    ctx2.imageSmoothingEnabled = false;
    ctx2.drawImage(im, q * ESPADA_LADO, 0, ESPADA_LADO, ESPADA_LADO,
                   Math.round(x - lado / 2), Math.round(y - lado / 2), lado, lado);
    ctx2.restore();
    return true;
  }

  /* Pre-carga: evita o primeiro quadro vazio no meio da luta. */
  (function precarregar() {
    for (const d of ['south', 'north', 'side']) {
      img('idle_' + d);
      img('cast_' + d);
      for (let i = 0; i < N_WALK; i++) img('walk_' + d + '_' + i);
      for (let i = 0; i < N_ATK; i++) img('atk_' + d + '_' + i);
    }
    for (let i = 0; i < N_SPIN; i++) img('spin_' + i);
    img('espada');
  })();

  global.SkelKingSprites = {
    desenhar, quadro, espada, desenharEspada,
    WALK_MS, SPIN_MS, N_WALK, N_ATK, N_SPIN, N_ESPADA, ESPADA_LADO, QUADRO, PE,
    pronto() { return !!img('idle_south'); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
