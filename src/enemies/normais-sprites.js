/* ═══════════════════════════════════════════════════════════════════
   INIMIGOS NORMAIS — arte real, vinda de assets/enemies/.
   Script classico (o jogo tambem abre por file://).

   Cobre as duas primeiras fases. Cada inimigo declara o proprio quadro,
   linha do pe e numero de quadros, porque a arte nao veio uniforme:

     primeira fase   canvas 40x40, pe na linha 33, caminhada de 6 quadros
     segunda fase    canvas 48x48, pe na linha 40 (o Ent chega a 48px na
                     origem), e a caminhada do Ent tem 9 quadros

   O perfil ('side') olha para a ESQUERDA — a convencao que o jogo ja usa
   nos inimigos, que espelham quando dir==='right'. As lacunas da arte
   (vistas que nao existem na origem) foram resolvidas na exportacao, para
   este modulo receber sempre south/north/side.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const BASE = 'assets/enemies/';
  // O quadro da caminhada anda pela DISTANCIA percorrida, e nao pelo
  // relogio: assim o passo casa com a velocidade de cada um, que vao de
  // 20 a 109 px/s. Com ritmo fixo o pe deslizava nos lentos.
  const PX_POR_QUADRO = 7;
  const WALK_MS = 110;      // guardado para quem quiser ritmo por tempo

  /* tipo do jogo -> pasta, escala e formato da arte */
  const DEFS = {
    // ── primeira fase ──
    runner_goblin:   { pasta: 'goblin',     escala: 1.50, quadro: 40, pe: 33, nWalk: 6, nHit: 9, escBase: 0.90, contato: true },
    archer_skeleton: { pasta: 'skelarcher', escala: 1.50, quadro: 40, pe: 33, nWalk: 6, nHit: 9, escBase: 0.95 },
    shield_orc:      { pasta: 'shieldorc',  escala: 1.90, quadro: 40, pe: 33, nWalk: 6, nHit: 9, escBase: 1.20, contato: true },
    // ── segunda fase ──
    // Escalas calibradas contra o resto da lista: a largura desenhada fica em
    // torno de 2,8 vezes o raio de colisao (a mediana dos 16), e os altos e
    // estreitos seguem a ALTURA em vez da largura.
    // A aranha e o cogumelo tiveram a arte trocada por pacotes de recorte mais
    // largo; com a escala antiga desenhavam a 4,6 e 5,0 vezes o raio, quase o
    // dobro dos vizinhos de bioma. Os valores aqui refazem a conta.
    spitting_spider: { pasta: 'spider2',    escala: 1.32, quadro: 48, pe: 40, nWalk: 9, nHit: 9, escBase: 0.90 },
    shroom:          { pasta: 'shroom',     escala: 1.51, quadro: 48, pe: 40, nWalk: 9, nHit: 9, escBase: 1.05 },
    corrupt_ent:     { pasta: 'ent',        escala: 1.90, quadro: 48, pe: 40, nWalk: 9, nHit: 9, escBase: 1.40, contato: true },
    hungry_wolf:     { pasta: 'wolf',       escala: 1.60, quadro: 48, pe: 40, nWalk: 6, nHit: 9, escBase: 1.00 },
    // ── terceira fase ──
    // O espectro nao tem arte de ataque: ele so' encosta. nHit 0 faz o
    // modulo cair na caminhada quando alguem pedir 'hit'.
    // O zumbi e o espectro sao estreitos e altos na origem, entao aqui a
    // calibragem segue a ALTURA: na primeira fase ela fica entre 3,3 e 3,8
    // vezes o raio de colisao. Calibrar pela largura deixaria os dois
    // atarracados perto dos vizinhos.
    ice_zombie:      { pasta: 'icezombie',    escala: 2.10, quadro: 48, pe: 40, nWalk: 6, nHit: 6, escBase: 1.00, contato: true },
    crystal_golem:   { pasta: 'crystalgolem', escala: 1.90, quadro: 48, pe: 40, nWalk: 9, nHit: 9, escBase: 1.50, contato: true },
    wind_specter:    { pasta: 'windspecter',  escala: 1.44, quadro: 48, pe: 40, nWalk: 9, nHit: 0, escBase: 0.95 },
    // ── quarta fase ──
    // O Verme nao anda: a arte nao tem caminhada, e o 'walk' e' um quadro so'
    // (copia do idle). O golpe dele e' afundar/emergir. O Escorpiao veio so'
    // com vistas diagonais e sem ataque nenhum.
    // nSurge e' a animacao de EMERGIR, separada da de enterrar (nHit). O jogo
    // ja' tinha as duas transicoes na maquina de estados do verme; ate' agora
    // as duas usavam o mesmo desenho, o de afundar.
    sand_worm_small:   { pasta: 'sandworm2',   escala: 1.56, quadro: 48, pe: 40, nWalk: 1, nHit: 9, nSurge: 9, escBase: 1.10 },
    cultist:           { pasta: 'cultist',     escala: 1.90, quadro: 48, pe: 40, nWalk: 6, nHit: 6, escBase: 0.95 },
    obsidian_scorpion: { pasta: 'scorpion',    escala: 1.60, quadro: 48, pe: 40, nWalk: 9, nHit: 0, escBase: 1.10 },
    // ── quinta fase ──
    // Diabrete e Morcego voam de asa aberta: medindo pela largura eles davam
    // 4,5 e 4,8 vezes o raio de colisao, quase o dobro dos vizinhos. Com asa
    // a largura engana, entao aqui a referencia e' a ALTURA.
    fire_imp:          { pasta: 'fireimp',     escala: 1.15, quadro: 48, pe: 40, nWalk: 9, nHit: 9, escBase: 0.90 },
    demon_knight:      { pasta: 'demonknight', escala: 1.45, quadro: 48, pe: 40, nWalk: 9, nHit: 9, escBase: 1.30, contato: true },
    lava_bat:          { pasta: 'lavabat',     escala: 1.10, quadro: 48, pe: 40, nWalk: 9, nHit: 9, escBase: 0.90 },
    // ── tipos ANTIGOS, ainda usados pelos objetivos de onda ──
    // O Altar de Ossos gera 'skeleton' e o Ninho gera 'spider' — nomes da
    // tabela legada, que nao estavam aqui. Sem entrada, os dois caiam no
    // desenho procedural: era a arte velha aparecendo nessas duas ondas.
    // Reaproveitam a arte dos primos, com nHit 0 porque nenhum dos dois tem
    // gatilho de golpe (so' correm e encostam) — assim nunca pedem uma
    // animacao de ataque que nao combina com o que fazem.
    skeleton:          { pasta: 'skelarcher',  escala: 1.50, quadro: 40, pe: 33, nWalk: 6, nHit: 0, escBase: 0.95 },
    spider:            { pasta: 'spider2',     escala: 1.21, quadro: 48, pe: 40, nWalk: 9, nHit: 0, escBase: 0.85 },
  };

  /* Duracao da animacao de golpe, em ms. Quem chama usa isso para saber
     em que quadro esta; o dano em si continua com a logica de sempre. */
  const DUR_GOLPE = {
    runner_goblin: 460, archer_skeleton: 520, shield_orc: 560,
    spitting_spider: 620, shroom: 560, corrupt_ent: 700, hungry_wolf: 520,
    ice_zombie: 520, crystal_golem: 720, wind_specter: 0,
    sand_worm_small: 800, cultist: 560, obsidian_scorpion: 0,
    fire_imp: 350, demon_knight: 640, lava_bat: 520,
    skeleton: 0, spider: 0,
  };

  const cache = {};
  function img(caminho) {
    let im = cache[caminho];
    if (!im) { im = new Image(); im.src = BASE + caminho + '.png'; cache[caminho] = im; }
    return (im.complete && im.naturalWidth) ? im : null;
  }

  function mod(n, m) { return ((n % m) + m) % m; }

  function normDir(dir) {
    if (dir === 'up' || dir === 'north') return 'north';
    if (dir === 'left' || dir === 'right' || dir === 'side') return 'side';
    return 'south';
  }

  function suporta(tipo) { return !!DEFS[tipo]; }
  function duracaoGolpe(tipo) { return DUR_GOLPE[tipo] || 520; }

  /* estado: 'idle' | 'walk' | 'hit' */
  function quadro(tipo, estado, dir, idx) {
    const def = DEFS[tipo];
    if (!def) return null;
    const d = normDir(dir);
    const i = idx | 0;
    if (estado === 'hit' && !def.nHit) estado = 'walk';       // sem arte de golpe
    if (estado === 'surge' && !def.nSurge) estado = 'hit';    // sem arte de emergir
    if (estado === 'walk')  return img(def.pasta + '/walk_'  + d + '_' + mod(i, def.nWalk));
    if (estado === 'hit')   return img(def.pasta + '/hit_'   + d + '_' + Math.min(def.nHit - 1, Math.max(0, i)));
    if (estado === 'surge') return img(def.pasta + '/surge_' + d + '_' + Math.min(def.nSurge - 1, Math.max(0, i)));
    return img(def.pasta + '/idle_' + d);
  }

  /* Devolve o indice do quadro de golpe para um contador que corre de
     `dur` ate zero. Sem isso cada chamador refazia a mesma conta. */
  function quadroGolpe(tipo, restanteMs, estado) {
    const def = DEFS[tipo];
    if (!def) return 0;
    const n = (estado === 'surge' && def.nSurge) ? def.nSurge : def.nHit;
    if (!n) return 0;
    const dur = duracaoGolpe(tipo);
    return Math.min(n - 1, Math.max(0, Math.floor((1 - restanteMs / dur) * n)));
  }

  /* Desenha ancorado pelo PE em (x, pesY). Devolve false se a arte ainda
     nao carregou, para quem chama usar o sprite antigo. */
  /* escalaJogo e' o this.scale da instancia. O Golem de Cristal se parte em
     minis com scale 0.75, e sem isso eles sairiam do tamanho normal. */
  function desenhar(ctx2, tipo, x, pesY, dir, estado, idx, flip, escalaJogo) {
    const def = DEFS[tipo];
    if (!def) return false;
    const im = quadro(tipo, estado, dir, idx);
    if (!im) return false;
    const rel = (def.escBase && Number.isFinite(escalaJogo) && escalaJogo > 0)
      ? escalaJogo / def.escBase : 1;
    const lado = Math.round(def.quadro * def.escala * rel);
    const dx = Math.round(x - lado / 2);
    const dy = Math.round(pesY - def.pe * def.escala * rel);
    ctx2.save();
    ctx2.imageSmoothingEnabled = false;
    if (flip) { ctx2.translate(dx + lado, dy); ctx2.scale(-1, 1); ctx2.drawImage(im, 0, 0, lado, lado); }
    else ctx2.drawImage(im, dx, dy, lado, lado);
    ctx2.restore();
    return true;
  }

  /* Tinge o MESMO quadro que o inimigo acabou de desenhar.

     E' a diferenca entre "o bicho ficou verde" e "puseram uma bolha verde
     em cima dele": aqui a cor entra por source-atop num canvas auxiliar, ou
     seja, so' onde ha' pixel do sprite. O contorno do inimigo continua
     nitido e a arte continua legivel por baixo da cor.

     O canvas auxiliar e' um so', reaproveitado — criar um por inimigo por
     quadro seria caro. */
  let aux = null, auxCtx = null;
  function tingir(ctx2, p, cor, forca) {
    if (!p || typeof document === 'undefined') return false;
    const def = DEFS[p.tipo];
    if (!def) return false;
    const im = quadro(p.tipo, p.estado, p.dir, p.idx);
    if (!im) return false;
    const rel = (def.escBase && Number.isFinite(p.escala) && p.escala > 0) ? p.escala / def.escBase : 1;
    const lado = Math.round(def.quadro * def.escala * rel);
    if (!(lado > 0)) return false;
    if (!aux) { aux = document.createElement('canvas'); auxCtx = aux.getContext('2d'); }
    if (aux.width !== lado || aux.height !== lado) { aux.width = lado; aux.height = lado; }
    auxCtx.clearRect(0, 0, lado, lado);
    auxCtx.imageSmoothingEnabled = false;
    auxCtx.globalCompositeOperation = 'source-over';
    auxCtx.drawImage(im, 0, 0, lado, lado);
    auxCtx.globalCompositeOperation = 'source-atop';   // so' onde ha' sprite
    auxCtx.fillStyle = cor;
    auxCtx.fillRect(0, 0, lado, lado);
    auxCtx.globalCompositeOperation = 'source-over';
    const dx = Math.round(p.x - lado / 2);
    const dy = Math.round(p.pesY - def.pe * def.escala * rel);
    ctx2.save();
    ctx2.globalAlpha = forca;
    ctx2.imageSmoothingEnabled = false;
    if (p.flip) { ctx2.translate(dx + lado, dy); ctx2.scale(-1, 1); ctx2.drawImage(aux, 0, 0); }
    else ctx2.drawImage(aux, dx, dy);
    ctx2.restore();
    return true;
  }

  (function precarregar() {
    for (const tipo in DEFS) {
      const def = DEFS[tipo];
      for (const d of ['south', 'north', 'side']) {
        img(def.pasta + '/idle_' + d);
        for (let i = 0; i < def.nWalk; i++) img(def.pasta + '/walk_' + d + '_' + i);
        for (let i = 0; i < (def.nHit || 0); i++) img(def.pasta + '/hit_' + d + '_' + i);
        for (let i = 0; i < (def.nSurge || 0); i++) img(def.pasta + '/surge_' + d + '_' + i);
      }
    }
  })();

  /* Bate de perto e tem arte para isso? Quem chama usa para decidir se
     dispara a animacao ao encostar, em vez de manter uma lista de tipos. */
  function golpeDeContato(tipo) { const d = DEFS[tipo]; return !!(d && d.contato && d.nHit); }

  const API = {
    desenhar, tingir, quadro, quadroGolpe, suporta, duracaoGolpe, golpeDeContato, DEFS, DUR_GOLPE,
    WALK_MS, PX_POR_QUADRO,
    pronto() { return !!img('goblin/idle_south'); },
  };

  global.InimigosNormais = API;
  // Nome antigo, de quando o modulo cobria so' a primeira fase.
  global.InimigosFase1 = API;
})(typeof window !== 'undefined' ? window : globalThis);
