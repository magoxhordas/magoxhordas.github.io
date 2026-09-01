/* ═══════════════════════════════════════════════════════════════════
   HUD DOS CHEFES — um painel so', no alto da tela.

   Antes cada chefe desenhava o proprio nome e uma barrinha flutuando
   sobre a cabeca, com a mesma drawHPBar dos inimigos comuns: verde ate'
   50%, amarela ate' 25%, vermelha depois. Duas consequencias ruins — a
   cor da barra era a unica informacao, e ela mudava justamente quando o
   chefe ficava perigoso, entao "verde" e "vermelho" nao queriam dizer
   nada sobre a luta; e o escudo do Gigante de Gelo aparecia como uma
   segunda barra identica, sem dizer que era escudo.

   Aqui a vida e' SEMPRE vermelha e o escudo SEMPRE azul, entao a cor
   passa a identificar o que a barra mede. O resto do painel conta o que
   esta acontecendo: marcas amarelas avisam onde a luta muda, um rastro
   claro mostra o dano que acabou de entrar, e a moldura reage.

   Script classico, como o resto do projeto.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* Ficha de cada chefe. Os marcos NAO sao decorativos: saem do proprio
     comportamento da classe — o Balrog vira em 30% (this.phase2) e o
     Brutamontes em 40% (this.enraged). A marca amarela anuncia esses
     dois pontos antes de o jogador chegar neles. */
  const FICHAS = {
    BossSkeletonKing:  { nome: 'REI CADÁVER',           icone: 'skelking', marcos: [] },
    BossAracne:        { nome: 'ARACNE ANCESTRAL',      icone: 'aracne',   marcos: [] },
    BossFrostBehemoth: { nome: 'GIGANTE DE GELO',       icone: 'icegolem', marcos: [], escudo: 'ESCUDO DE GELO' },
    BossSandworm:      { nome: 'VERME DEVORADOR',       icone: 'sandworm', marcos: [] },
    BossBalrog:        { nome: 'BALROG',                icone: 'balrog',   marcos: [{ pct: 0.30, texto: 'FÚRIA' }] },
    BossBrute:         { nome: 'BRUTAMONTES DA GUERRA', icone: 'orc',      marcos: [{ pct: 0.40, texto: 'FÚRIA' }] },
  };

  /* Painel PEQUENO, logo acima do chefe. A primeira versao era uma faixa
     fixa de 560px no alto da tela; ficou grande demais e longe da briga,
     entao ela desceu para a cabeca do boneco e encolheu para caber la'.
     A ancora nao e' calculada aqui: cada chefe registra o ponto onde ja'
     desenhava o proprio nome (BossHUD.ancorar), que e' onde o autor dele
     julgou ser "logo acima". Assim o painel acompanha bicho por bicho, em
     vez de brigar com raios e escalas que variam de 32 a 50. */
  const CX = { w: 150, ic: 20, pad: 3 };
  const BX = CX.pad + CX.ic + 5;              // onde comecam nome e barras
  const BW = CX.w - BX - CX.pad;

  const cache = {};
  function icone(nome) {
    if (typeof Image !== 'function') return null;
    let im = cache[nome];
    if (!im) { im = new Image(); im.src = 'assets/bosses/' + nome + '/icon.png'; cache[nome] = im; }
    return (im.complete && im.naturalWidth) ? im : null;
  }

  /* Registrada pelo proprio chefe, no lugar onde ele desenhava o nome. */
  function ancorar(chefe, x, y) {
    if (!chefe) return;
    chefe._hudAncoraX = x; chefe._hudAncoraY = y;
  }

  function ficha(chefe) {
    if (!chefe || chefe.dead) return null;
    const nome = chefe.constructor && chefe.constructor.name;
    return FICHAS[nome] || null;
  }

  /* Este chefe e' coberto pelo painel? Quem desenha o chefe usa isso para
     nao repetir nome e barra em cima da cabeca dele. */
  function cobre(chefe) { return !!ficha(chefe); }

  function estado(chefe) {
    if (!chefe._hud) {
      const v = chefe.maxHp > 0 ? chefe.hp / chefe.maxHp : 0;
      chefe._hud = {
        atraso: v, vidaAntes: v, brilho: 0, furia: 0, escudoAntes: 1,
        cacos: [], t: (typeof performance !== 'undefined' ? performance.now() : Date.now()),
      };
    }
    return chefe._hud;
  }

  function furiaLigada(chefe) { return !!(chefe.enraged || chefe.phase2); }

  /* O Rei Cadaver morre uma vez e volta. Enquanto phase2Triggered e' falso
     ele ainda tem essa carta na manga, e o cranio ao lado avisa. */
  function temRessurreicao(chefe) {
    return chefe.constructor && chefe.constructor.name === 'BossSkeletonKing' && !chefe.phase2Triggered;
  }

  function barra(ctx, x, y, w, h, pct, corFundo, corCheia, corTopo) {
    ctx.fillStyle = '#08070a'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = corFundo; ctx.fillRect(x, y, w, h);
    const cheio = Math.max(0, Math.min(w, Math.round(w * pct)));
    if (cheio > 0) {
      ctx.fillStyle = corCheia; ctx.fillRect(x, y, cheio, h);
      ctx.fillStyle = corTopo; ctx.fillRect(x, y, cheio, Math.max(1, Math.floor(h * 0.28)));
    }
  }

  function desenhar(ctx, chefe) {
    const f = ficha(chefe);
    if (!ctx || !f) return false;
    const e = estado(chefe);

    const agora = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const dt = Math.min(0.1, Math.max(0, (agora - e.t) / 1000));
    e.t = agora;

    const vida = chefe.maxHp > 0 ? Math.max(0, Math.min(1, chefe.hp / chefe.maxHp)) : 0;
    const temEscudo = Number(chefe.shieldMax) > 0;
    const escudo = temEscudo ? Math.max(0, Math.min(1, chefe.shieldHp / chefe.shieldMax)) : 0;

    // ── reacoes ──
    if (vida < e.vidaAntes - 0.0001) e.brilho = 1;          // levou dano
    if (temEscudo && e.escudoAntes > 0 && escudo <= 0) {     // escudo acabou
      for (let i = 0; i < 26; i++) {
        // x relativo ao inicio da barra: o painel anda junto com o chefe,
        // entao guardar posicao absoluta deixaria os cacos para tras.
        e.cacos.push({
          x: BW * e.escudoAntes * Math.random(),
          y: 0, vx: (Math.random() - 0.5) * 55, vy: -20 - Math.random() * 45,
          vida: 1, giro: Math.random() * Math.PI,
        });
      }
    }
    if (furiaLigada(chefe) && !e.furiaVista) { e.furiaVista = true; e.furia = 1; }
    e.vidaAntes = vida; e.escudoAntes = escudo;
    e.brilho = Math.max(0, e.brilho - dt * 3.2);
    e.furia = Math.max(0, e.furia - dt * 0.7);
    // O rastro claro persegue a vida real, mas devagar: e' ele que mostra
    // QUANTO acabou de entrar, e nao so' que entrou alguma coisa.
    if (e.atraso > vida) e.atraso = Math.max(vida, e.atraso - dt * (0.22 + (e.atraso - vida) * 1.6));
    else e.atraso = vida;

    // Ancora: o ponto que o chefe registrou. Sem ela (chefe que ainda nao
    // registrou no quadro atual), cai numa estimativa pelo raio.
    const ancX = Number.isFinite(chefe._hudAncoraX) ? chefe._hudAncoraX : chefe.x;
    const ancY = Number.isFinite(chefe._hudAncoraY)
      ? chefe._hudAncoraY
      : chefe.y - (Number(chefe.radius) || 30) * (Number(chefe.scale) || 1) - 24;

    const temMarco = f.marcos.length > 0;
    const alt = 22 + (temEscudo ? 7 : 0) + (temMarco ? 9 : 0);
    // presa a tela: um chefe encostado na borda nao empurra o painel para fora
    const px = Math.round(Math.max(4, Math.min(640 - CX.w - 4, ancX - CX.w / 2)));
    const py = Math.round(Math.max(64, ancY - alt - 4));

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // ── caixa ──
    ctx.globalAlpha = 0.80;
    ctx.fillStyle = '#0b0910';
    ctx.fillRect(px, py, CX.w, alt);
    ctx.globalAlpha = 1;
    const fu = e.furia;
    ctx.strokeStyle = fu > 0
      ? `rgba(255,${Math.round(70 + 90 * (1 - fu))},60,${0.55 + 0.45 * fu})`
      : 'rgba(120,104,150,0.40)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, CX.w - 1, alt - 1);

    // ── medalhao ──
    const ix = px + CX.pad, iy = py + CX.pad;
    const im = icone(f.icone);
    ctx.fillStyle = '#151020'; ctx.fillRect(ix, iy, CX.ic, CX.ic);
    if (im) ctx.drawImage(im, ix, iy, CX.ic, CX.ic);
    if (fu > 0) {
      ctx.globalAlpha = fu * 0.5;
      ctx.fillStyle = '#ff5522'; ctx.fillRect(ix, iy, CX.ic, CX.ic);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = fu > 0 ? '#ff7744' : '#6b5a86';
    ctx.strokeRect(ix - 0.5, iy - 0.5, CX.ic + 1, CX.ic + 1);

    // ── nome ──
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#0a0810'; ctx.fillText(f.nome, px + BX + 1, py + 9);
    ctx.fillStyle = fu > 0 ? '#ffd0b0' : '#e8dcff';
    ctx.fillText(f.nome, px + BX, py + 8);

    if (temRessurreicao(chefe)) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(agora * 0.005);
      ctx.font = '9px monospace'; ctx.textAlign = 'right';
      ctx.fillStyle = '#c99cff'; ctx.fillText('☠', px + CX.w - 3, py + 9);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    }

    // ── vida: sempre vermelha ──
    const bx = px + BX, by = py + 11, bh = 7;
    barra(ctx, bx, by, BW, bh, vida, '#2b0d12', '#c8202a', 'rgba(255,120,110,0.34)');
    // O rastro vem DEPOIS da barra: desenhado antes, o fundo dela (que cobre
    // a largura toda) o apagava e o dano recente nunca aparecia.
    if (e.atraso > vida) {
      const rx = bx + Math.round(BW * vida);
      const rw = Math.max(1, Math.round(BW * (e.atraso - vida)));
      ctx.fillStyle = 'rgba(255,228,214,0.82)'; ctx.fillRect(rx, by, rw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(rx, by, rw, 2);
    }
    if (e.brilho > 0) {
      ctx.globalAlpha = e.brilho * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, by, Math.round(BW * vida), bh);
      ctx.globalAlpha = 1;
    }

    // ── escudo: sempre azul ──
    const sy = by + bh + 2;
    if (temEscudo) {
      barra(ctx, bx, sy, BW, 4, escudo, '#0a1a2a', '#2f8fd8', 'rgba(190,235,255,0.40)');
    }

    // ── marcos de fase ──
    if (temMarco) {
      ctx.font = '7px monospace';
      for (const m of f.marcos) {
        const mx = bx + Math.round(BW * m.pct);
        const passou = vida <= m.pct;
        ctx.fillStyle = passou ? '#6a5a2a' : '#f2c53d';
        ctx.fillRect(mx - 1, by - 2, 2, bh + 4);
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(m.pct * 100) + '% ' + m.texto, mx, py + alt - 2);
        ctx.textAlign = 'left';
      }
    }

    // ── cacos do escudo partido ──
    if (e.cacos.length) {
      for (const c of e.cacos) {
        c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 190 * dt;
        c.vida -= dt * 1.15; c.giro += dt * 5;
      }
      e.cacos = e.cacos.filter(c => c.vida > 0);
      for (const c of e.cacos) {
        ctx.globalAlpha = Math.max(0, c.vida) * 0.9;
        ctx.fillStyle = c.vida > 0.55 ? '#d6f2ff' : '#59a8d6';
        const t = 1 + Math.round(c.vida * 2);
        ctx.save(); ctx.translate(bx + c.x, sy + 2 + c.y); ctx.rotate(c.giro);
        ctx.fillRect(-t / 2, -t / 2, t, t);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
    return true;
  }

  global.BossHUD = { desenhar, cobre, ancorar, FICHAS, CX };
})(typeof window !== 'undefined' ? window : globalThis);
