/* ═══════════════════════════════════════════════════════════════════
   NÍVEL DE AMEAÇA — o sistema

   Regra que orienta o arquivo inteiro: os modificadores são uma CAMADA
   por cima do chefe, nunca uma substituição. Nenhum deles pede animação
   nova — todos agem em volta do corpo (chão, órbitas, raios, reforços) ou
   mexem em números que o chefe já usa (cooldown, velocidade, vida).

   Os chefes não sabem o que é um modificador. Eles apenas avisam o que
   acabou de acontecer (`golpeForte`, `acertouJogador`, `levouDano`), e é
   aqui que se decide se algo reage. Foi assim para não espalhar `if` por
   seis classes enormes e para dar espaço a modificadores futuros sem
   reabrir aquelas classes.

   AMEAÇA 0 é bandeira desligada: `ativo()` devolve false e nada abaixo
   roda — nem sorteio, nem update, nem desenho, nem bônus.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  const D = global.BossModifierData;
  if (!D) return;
  const { CONFIG, POR_CHEFE, POR_ID, INCOMPATIVEIS, MODIFICADORES } = D;

  /* ── dependências injetadas pelo jogo ──────────────────────────── */
  let deps = {};
  function configurar(novasDeps) { deps = novasDeps || {}; }

  const agora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));
  const jogadores = () => (deps.getPlayers ? deps.getPlayers() : []).filter(p => p && !p.dead);
  const inimigos = () => (deps.getEnemies ? deps.getEnemies() : []) || [];
  const parts = (...a) => deps.spawnParts && deps.spawnParts(...a);
  const aviso = (x, y, texto) => deps.spawnNotice && deps.spawnNotice(x, y, texto, 0);

  /* ── estado da run e da batalha ────────────────────────────────── */
  let nivelDaRun = 0;          // escolhido no menu, congelado ao iniciar
  let dificuldadeDaRun = null; // para saber se a run pode ter ameaça

  function estadoLimpo() {
    return {
      chefe: null, ids: [], mods: [],
      fogo: [], gelo: [], raios: [], minas: [], corrupcao: [], abismos: [],
      runas: [], orbitais: [], ecos: [], ondas: [], rituais: [],
      cd: {},                    // cooldown por modificador
      curaGasta: 0,              // teto do Vampírico/Regenerador
      marcosVistos: {},          // Sanguinário
      furiaAte: 0,               // Berserker
      cacadaAte: 0,              // Caçador
      investida: null,           // Investidor
      sumico: 0,                 // Errante
      bonusRitual: 0,            // Ritualista
      revelacaoAte: 0,
      recompensaPaga: false,
    };
  }
  let est = estadoLimpo();

  /* ── nível de ameaça ───────────────────────────────────────────── */
  function limitePara(dificuldade) {
    return CONFIG.LIMITE_POR_DIFICULDADE[dificuldade] || 0;
  }
  function dificuldadePermite(dificuldade) { return limitePara(dificuldade) > 0; }

  /* Chamado pelo menu. Corta sozinho para o teto da dificuldade, para
     nunca existir estado inválido (escolher 6 no Difícil e voltar ao
     Normal deixa 4, e não 6). */
  function ajustarNivel(nivel, dificuldade) {
    const teto = limitePara(dificuldade);
    return clamp(Math.round(Number(nivel) || 0), 0, teto);
  }

  /* Congela a escolha no início da run. Depois disso o jogador não
     diminui mais — senão daria para ativar o bônus, chegar no chefe e
     baixar a ameaça mantendo a recompensa. */
  function iniciarRun(nivel, dificuldade) {
    dificuldadeDaRun = dificuldade;
    nivelDaRun = ajustarNivel(nivel, dificuldade);
    limpar('run-start');
  }
  function nivelAtual() { return dificuldadePermite(dificuldadeDaRun) ? nivelDaRun : 0; }
  function ativo() { return nivelAtual() > 0; }

  function multiplicadorRecompensa() {
    const n = nivelAtual();
    const t = CONFIG.BONUS_RECOMPENSA;
    return 1 + (t[Math.min(n, t.length - 1)] || 0);
  }

  /* ── sorteio ───────────────────────────────────────────────────── */
  function catalogoDoChefe(nomeClasse) {
    return (POR_CHEFE[nomeClasse] || []).map(id => POR_ID[id]).filter(Boolean);
  }

  function conflita(id, escolhidos) {
    for (const par of INCOMPATIVEIS) {
      if (par[0] === id && escolhidos.includes(par[1])) return true;
      if (par[1] === id && escolhidos.includes(par[0])) return true;
    }
    return false;
  }
  function estouraCategoria(mod, escolhidosMods) {
    const teto = CONFIG.TETO_POR_CATEGORIA[mod.categoria];
    if (!teto) return false;
    return escolhidosMods.filter(m => m.categoria === mod.categoria).length >= teto;
  }

  /* Sorteio por peso, sem repetir, respeitando incompatíveis e tetos de
     categoria. Se as restrições esgotarem as opções antes de completar a
     quantidade pedida, devolve o que conseguiu — nunca entra em laço
     infinito e nunca repete. */
  function sortear(nomeClasse, quantidade, aleatorio) {
    const rnd = aleatorio || Math.random;
    const disponiveis = catalogoDoChefe(nomeClasse).slice();
    const escolhidos = [];
    const ids = [];
    while (escolhidos.length < quantidade && disponiveis.length) {
      const validos = disponiveis.filter(m =>
        !ids.includes(m.id) && !conflita(m.id, ids) && !estouraCategoria(m, escolhidos));
      if (!validos.length) break;
      const total = validos.reduce((s, m) => s + (m.peso || 1), 0);
      let r = rnd() * total, pego = validos[validos.length - 1];
      for (const m of validos) { r -= (m.peso || 1); if (r <= 0) { pego = m; break; } }
      escolhidos.push(pego); ids.push(pego.id);
      const i = disponiveis.indexOf(pego); if (i >= 0) disponiveis.splice(i, 1);
    }
    return escolhidos;
  }

  function tem(id) { return est.ids.includes(id); }
  function par(id, chave) { return POR_ID[id]?.params?.[chave]; }

  /* Cooldown com relógio de jogo, não de quadro: um efeito nunca dispara
     duas vezes no mesmo frame. */
  function pronto(id, ms) {
    const t = agora();
    if ((est.cd[id] || 0) > t) return false;
    est.cd[id] = t + ms;
    return true;
  }

  /* ── ciclo de vida ─────────────────────────────────────────────── */
  function limpar(motivo) {
    est = estadoLimpo();
    if (motivo === 'run-start') { /* nível já foi definido em iniciarRun */ }
  }

  /* Chamado quando um chefe entra em cena. Sorteia UMA vez por encontro:
     se o mesmo chefe já está registrado, não re-sorteia (evita o conjunto
     mudar no meio da luta por qualquer re-entrada no spawn). */
  function aoNascerChefe(chefe) {
    if (!chefe || !ativo()) return;
    if (est.chefe === chefe && est.ids.length) return;
    const nome = chefe.constructor && chefe.constructor.name;
    const mods = sortear(nome, nivelAtual());
    est = estadoLimpo();
    est.chefe = chefe;
    est.mods = mods;
    est.ids = mods.map(m => m.id);
    est.revelacaoAte = agora() + CONFIG.REVELACAO_MS;
    chefe._ameacaIds = est.ids.slice();   // fica na instância, para consulta
    if (tem('runic_shield')) criarRunas(chefe);
    if (tem('orbitals')) criarOrbitais(chefe);
  }

  /* Só para desenvolvimento: força um conjunto sem depender do sorteio. */
  function forcarModificadores(ids, chefe) {
    const alvo = chefe || est.chefe;
    if (!alvo) return false;
    const mods = (ids || []).map(id => POR_ID[id]).filter(Boolean);
    est = estadoLimpo();
    est.chefe = alvo; est.mods = mods; est.ids = mods.map(m => m.id);
    est.revelacaoAte = agora() + CONFIG.REVELACAO_MS;
    alvo._ameacaIds = est.ids.slice();
    if (tem('runic_shield')) criarRunas(alvo);
    if (tem('orbitals')) criarOrbitais(alvo);
    return true;
  }

  /* ── criação de objetos ────────────────────────────────────────── */
  function dentroDaArena(x, y, margem) {
    const b = deps.getArenaBounds ? deps.getArenaBounds() : null;
    if (!b) return { x, y };
    const m = margem || 0;
    return {
      x: clamp(x, (b.left || 0) + m, (deps.getW ? deps.getW() : 640) - (b.right || 0) - m),
      y: clamp(y, (b.top || 0) + m, (deps.getH ? deps.getH() : 480) - (b.bottom || 0) - m),
    };
  }

  function criarRunas(chefe) {
    const n = par('runic_shield', 'quantidade');
    for (let i = 0; i < n; i++) {
      est.runas.push({ ang: (i / n) * Math.PI * 2, hp: par('runic_shield', 'vidaRuna'), viva: true });
    }
  }
  function criarOrbitais(chefe) {
    const n = par('orbitals', 'quantidade');
    for (let i = 0; i < n; i++) est.orbitais.push({ ang: (i / n) * Math.PI * 2 });
    est.orbVisivel = true; est.orbTroca = agora() + par('orbitals', 'visivelMs');
  }

  /* ── avisos vindos do chefe ────────────────────────────────────── */
  /* Um golpe FORTE terminou. É o gancho de que Vulcânico, Glacial,
     Ecoante e Trovejante dependem — todos reaproveitam a consequência de
     um ataque que já existe, em vez de inventar um novo. */
  function golpeForte(chefe, x, y, dano) {
    if (!ativo() || est.chefe !== chefe) return;
    const px = Number.isFinite(x) ? x : chefe.x;
    const py = Number.isFinite(y) ? y : chefe.y;
    if (tem('volcanic') && est.fogo.length < CONFIG.MAX_AREAS_FOGO) {
      const p = dentroDaArena(px, py, 20);
      est.fogo.push({ x: p.x, y: p.y, ate: agora() + par('volcanic', 'duracaoMs'), tick: 0 });
    }
    if (tem('glacial') && est.gelo.length < CONFIG.MAX_AREAS_GELO) {
      const p = dentroDaArena(px, py, 20);
      est.gelo.push({ x: p.x, y: p.y, ate: agora() + par('glacial', 'duracaoMs'), tick: 0 });
    }
    if (tem('echoing')) {
      est.ecos.push({ x: px, y: py, quando: agora() + par('echoing', 'atrasoMs'),
                      dano: Math.max(1, (dano || 10) * par('echoing', 'fracaoDano')) });
    }
    if (tem('stormbound') && pronto('stormbound', par('stormbound', 'cooldownMs'))) {
      const alvos = jogadores();
      const q = Math.min(par('stormbound', 'quantidade'), CONFIG.MAX_RAIOS - est.raios.length);
      for (let i = 0; i < q; i++) {
        const alvo = alvos[i % Math.max(1, alvos.length)] || chefe;
        const p = dentroDaArena(alvo.x + (Math.random() - 0.5) * 70, alvo.y + (Math.random() - 0.5) * 70, 18);
        est.raios.push({ x: p.x, y: p.y, cai: agora() + par('stormbound', 'avisoMs') });
      }
    }
  }

  function acertouJogador(chefe, jogador, dano) {
    if (!ativo() || est.chefe !== chefe || !tem('vampiric')) return;
    const teto = chefe.maxHp * par('vampiric', 'tetoPorBatalha');
    if (est.curaGasta >= teto) return;
    const cura = Math.min(Math.max(0, dano) * par('vampiric', 'fracao'), teto - est.curaGasta);
    if (cura <= 0) return;
    est.curaGasta += cura;
    chefe.hp = Math.min(chefe.maxHp, chefe.hp + cura);
    if (jogador) parts(jogador.x, jogador.y, '#cc2244', 4, 40);
  }

  function levouDano(chefe, dano) {
    if (!ativo() || est.chefe !== chefe) return dano;
    let d = dano;
    // Escudo Rúnico: as runas absorvem parte enquanto existirem
    const vivas = est.runas.filter(r => r.viva);
    if (vivas.length) d *= (1 - par('runic_shield', 'reducaoDano'));
    // Regenerador: apanhar interrompe a canalização
    if (est.regenAte && agora() < est.regenAte) { est.regenAte = 0; aviso(chefe.x, chefe.y - 40, 'RITUAL INTERROMPIDO'); }
    return d;
  }

  /* ── update ────────────────────────────────────────────────────── */
  function update(dt) {
    if (!ativo() || !est.chefe) return;
    const chefe = est.chefe;
    if (chefe.dead) { limpar('boss-death'); return; }
    const t = agora();
    const pls = jogadores();
    const alvo = pls[0] || null;

    aplicarFuria(chefe, t);
    aplicarMobilidade(chefe, dt, t, alvo);
    aplicarExercito(chefe, t);
    aplicarSobrevivencia(chefe, t);
    atualizarAreas(chefe, dt, t, pls);
    atualizarOrbitais(chefe, dt, t, pls);
    atualizarRunas(chefe, dt, t);
  }

  /* SANGUINÁRIO e BERSERKER mexem só na CADÊNCIA, nunca em dano bruto —
     a dificuldade vem de ter menos tempo para respirar, não de o chefe
     virar esponja. */
  function aplicarFuria(chefe, t) {
    if (tem('bloodthirsty')) {
      const frac = chefe.maxHp > 0 ? chefe.hp / chefe.maxHp : 1;
      const marcos = par('bloodthirsty', 'marcos'), red = par('bloodthirsty', 'reducaoCd');
      for (let i = 0; i < marcos.length; i++) {
        if (frac <= marcos[i] && !est.marcosVistos[i]) {
          est.marcosVistos[i] = true;
          escalarCooldowns(chefe, red[i] / (i > 0 ? red[i - 1] : 1));
          aviso(chefe.x, chefe.y - 46, 'MAIS AGRESSIVO');
        }
      }
    }
    if (tem('berserker') && !est.furiaUsada) {
      const frac = chefe.maxHp > 0 ? chefe.hp / chefe.maxHp : 1;
      if (frac <= par('berserker', 'gatilhoHp')) {
        est.furiaUsada = true;
        est.furiaAte = t + par('berserker', 'duracaoMs');
        escalarCooldowns(chefe, par('berserker', 'reducaoCd'));
        est.velAntes = chefe.speed;
        chefe.speed = (chefe.speed || 0) * par('berserker', 'bonusVel');
        aviso(chefe.x, chefe.y - 50, 'FÚRIA');
      }
    }
    if (est.furiaAte && t > est.furiaAte) {
      est.furiaAte = 0;
      escalarCooldowns(chefe, 1 / par('berserker', 'reducaoCd'));
      if (est.velAntes != null) { chefe.speed = est.velAntes; est.velAntes = null; }
    }
  }

  /* Mexe nos timers que o chefe JÁ tem, sem saber quais são: qualquer
     propriedade terminada em Cd é cadência de ataque nas seis classes. */
  function escalarCooldowns(chefe, fator) {
    if (!Number.isFinite(fator) || fator <= 0) return;
    for (const k of Object.keys(chefe)) {
      if (/Cd$/.test(k) && typeof chefe[k] === 'number' && chefe[k] > 0) chefe[k] *= fator;
    }
  }

  function aplicarMobilidade(chefe, dt, t, alvo) {
    if (tem('hunter')) {
      if (pronto('hunter', par('hunter', 'cooldownMs'))) {
        est.cacadaAte = t + par('hunter', 'duracaoMs');
        est.velCaca = chefe.speed;
        chefe.speed = (chefe.speed || 0) * par('hunter', 'bonusVel');
        aviso(chefe.x, chefe.y - 44, 'CAÇADA');
      }
      if (est.cacadaAte && t > est.cacadaAte) {
        est.cacadaAte = 0;
        if (est.velCaca != null) { chefe.speed = est.velCaca; est.velCaca = null; }
      }
    }
    if (tem('teleporter') && !est.sumico && pronto('teleporter', par('teleporter', 'cooldownMs'))) {
      est.sumico = t + par('teleporter', 'sumicoMs');
      parts(chefe.x, chefe.y, '#9b6bff', 14, 60);
    }
    if (est.sumico && t > est.sumico) {
      est.sumico = 0;
      const a = Math.random() * Math.PI * 2;
      const d = par('teleporter', 'distanciaMin') +
                Math.random() * (par('teleporter', 'distanciaMax') - par('teleporter', 'distanciaMin'));
      const base = alvo || chefe;
      const p = dentroDaArena(base.x + Math.cos(a) * d, base.y + Math.sin(a) * d, (chefe.radius || 30) + 8);
      chefe.x = p.x; chefe.y = p.y;
      parts(chefe.x, chefe.y, '#c9a4ff', 16, 70);
    }
    if (tem('charger')) {
      if (!est.investida && alvo && pronto('charger', par('charger', 'cooldownMs'))) {
        const a = Math.atan2(alvo.y - chefe.y, alvo.x - chefe.x);
        est.investida = { ang: a, avisoAte: t + par('charger', 'avisoMs'), fimAte: 0, acertou: new Set() };
      }
      const inv = est.investida;
      if (inv) {
        if (!inv.fimAte && t > inv.avisoAte) inv.fimAte = t + par('charger', 'duracaoMs');
        if (inv.fimAte) {
          if (t > inv.fimAte) { est.investida = null; }
          else {
            const v = par('charger', 'velocidade') * dt;
            chefe.x += Math.cos(inv.ang) * v; chefe.y += Math.sin(inv.ang) * v;
            if (deps.clampEntity) deps.clampEntity(chefe, chefe.radius || 30);
            for (const pl of jogadores()) {
              if (!inv.acertou.has(pl) && dist(pl, chefe) < (chefe.radius || 30) + (pl.radius || 16)) {
                inv.acertou.add(pl); pl.takeDmg && pl.takeDmg(par('charger', 'dano'));
              }
            }
          }
        }
      }
    }
    if (tem('repulsor') && pronto('repulsor', par('repulsor', 'cooldownMs'))) {
      est.ondas.push({ x: chefe.x, y: chefe.y, dispara: t + par('repulsor', 'avisoMs'), feito: false });
    }
    for (let i = est.ondas.length - 1; i >= 0; i--) {
      const o = est.ondas[i];
      if (t > o.dispara && !o.feito) {
        o.feito = true;
        for (const pl of jogadores()) {
          const d = dist(pl, o);
          if (d < par('repulsor', 'raio')) {
            const a = Math.atan2(pl.y - o.y, pl.x - o.x);
            pl.x += Math.cos(a) * par('repulsor', 'empurrao');
            pl.y += Math.sin(a) * par('repulsor', 'empurrao');
            if (deps.clampEntity) deps.clampEntity(pl);
            pl.takeDmg && pl.takeDmg(par('repulsor', 'dano'));
          }
        }
        parts(o.x, o.y, '#a8d8ff', 18, 90);
      }
      if (t > o.dispara + 260) est.ondas.splice(i, 1);
    }
  }

  function aplicarExercito(chefe, t) {
    if (tem('summoner') && pronto('summoner', par('summoner', 'cooldownMs'))) {
      const teto = deps.getSpawnCap ? deps.getSpawnCap() : 14;
      const vivos = inimigos().filter(e => !e.dead).length;
      const espaco = Math.max(0, Math.min(par('summoner', 'quantidade'), teto - vivos, CONFIG.MAX_INVOCADOS));
      for (let i = 0; i < espaco; i++) {
        const a = Math.random() * Math.PI * 2;
        const p = dentroDaArena(chefe.x + Math.cos(a) * 70, chefe.y + Math.sin(a) * 70, 24);
        deps.spawnEnemy && deps.spawnEnemy(null, p.x, p.y, 'ameaca');
        parts(p.x, p.y, '#8ad6a0', 8, 45);
      }
      if (espaco > 0) aviso(chefe.x, chefe.y - 48, 'REFORÇOS');
    }
    if (tem('commander')) {
      const r = par('commander', 'raio');
      for (const e of inimigos()) {
        if (e.dead) continue;
        const perto = dist(e, chefe) < r;
        if (perto && !e._ameacaBuff) {
          e._ameacaBuff = true;
          e._ameacaDanoAntes = e.damage; e._ameacaVelAntes = e.speed;
          e.damage = (e.damage || 0) * par('commander', 'bonusDano');
          e.speed = (e.speed || 0) * par('commander', 'bonusVel');
        } else if (!perto && e._ameacaBuff) {
          e._ameacaBuff = false;
          if (e._ameacaDanoAntes != null) e.damage = e._ameacaDanoAntes;
          if (e._ameacaVelAntes != null) e.speed = e._ameacaVelAntes;
        }
      }
    }
    if (tem('ritualist') && pronto('ritualist', par('ritualist', 'cooldownMs'))) {
      for (let i = 0; i < par('ritualist', 'quantidade'); i++) {
        const a = Math.random() * Math.PI * 2;
        const p = dentroDaArena(chefe.x + Math.cos(a) * 120, chefe.y + Math.sin(a) * 90, 22);
        est.rituais.push({ x: p.x, y: p.y, hp: par('ritualist', 'vidaRuna'), completa: t + par('ritualist', 'canalizaMs') });
      }
      aviso(chefe.x, chefe.y - 52, 'RITUAL');
    }
    for (let i = est.rituais.length - 1; i >= 0; i--) {
      const r = est.rituais[i];
      if (r.hp <= 0) { parts(r.x, r.y, '#ffd76a', 10, 50); est.rituais.splice(i, 1); continue; }
      if (t > r.completa) {
        est.rituais.splice(i, 1);
        est.bonusRitual = t + par('ritualist', 'duracaoBonusMs');
        aviso(chefe.x, chefe.y - 52, 'RITUAL COMPLETO');
      }
    }
  }

  function aplicarSobrevivencia(chefe, t) {
    if (!tem('regenerator')) return;
    const teto = chefe.maxHp * par('regenerator', 'tetoPorBatalha');
    if (est.curaGasta >= teto) return;
    if (!est.regenAte && pronto('regenerator', par('regenerator', 'cooldownMs'))) {
      est.regenAte = t + par('regenerator', 'canalizaMs');
      aviso(chefe.x, chefe.y - 44, 'REGENERANDO');
    }
    if (est.regenAte && t > est.regenAte) {
      est.regenAte = 0;
      const cura = Math.min(chefe.maxHp * par('regenerator', 'curaFracao'), teto - est.curaGasta);
      est.curaGasta += cura;
      chefe.hp = Math.min(chefe.maxHp, chefe.hp + cura);
      parts(chefe.x, chefe.y, '#7ee08a', 14, 55);
    }
  }

  function atualizarAreas(chefe, dt, t, pls) {
    // fogo
    for (let i = est.fogo.length - 1; i >= 0; i--) {
      const f = est.fogo[i];
      if (t > f.ate) { est.fogo.splice(i, 1); continue; }
      if (t > f.tick) {
        f.tick = t + par('volcanic', 'intervaloDanoMs');
        for (const pl of pls) if (dist(pl, f) < par('volcanic', 'raio')) pl.takeDmg && pl.takeDmg(par('volcanic', 'dano'), true);
      }
    }
    // gelo
    for (let i = est.gelo.length - 1; i >= 0; i--) {
      const g = est.gelo[i];
      if (t > g.ate) { est.gelo.splice(i, 1); continue; }
      for (const pl of pls) {
        if (dist(pl, g) < par('glacial', 'raio')) {
          pl._ameacaLentidao = par('glacial', 'lentidao');
          if (t > g.tick) { g.tick = t + par('glacial', 'intervaloDanoMs'); pl.takeDmg && pl.takeDmg(par('glacial', 'dano'), true); }
        }
      }
    }
    // raios
    for (let i = est.raios.length - 1; i >= 0; i--) {
      const r = est.raios[i];
      if (t > r.cai) {
        for (const pl of pls) if (dist(pl, r) < par('stormbound', 'raio')) pl.takeDmg && pl.takeDmg(par('stormbound', 'dano'));
        parts(r.x, r.y, '#fff59a', 16, 90);
        est.raios.splice(i, 1);
      }
    }
    // minas
    if (tem('mine_layer') && est.minas.length < CONFIG.MAX_MINAS && pronto('mine_layer', par('mine_layer', 'cooldownMs'))) {
      for (let i = 0; i < par('mine_layer', 'quantidade') && est.minas.length < CONFIG.MAX_MINAS; i++) {
        const a = Math.random() * Math.PI * 2;
        const p = dentroDaArena(chefe.x + Math.cos(a) * (90 + Math.random() * 90), chefe.y + Math.sin(a) * (70 + Math.random() * 70), 20);
        est.minas.push({ x: p.x, y: p.y, armada: t + par('mine_layer', 'armarMs'), morre: t + par('mine_layer', 'vidaMs') });
      }
    }
    for (let i = est.minas.length - 1; i >= 0; i--) {
      const m = est.minas[i];
      const armada = t > m.armada;
      let estoura = t > m.morre;
      if (armada && !estoura) for (const pl of pls) if (dist(pl, m) < par('mine_layer', 'raioGatilho')) estoura = true;
      if (estoura) {
        for (const pl of pls) if (dist(pl, m) < par('mine_layer', 'raioExplosao')) pl.takeDmg && pl.takeDmg(par('mine_layer', 'dano'));
        parts(m.x, m.y, '#ffaa44', 18, 95);
        est.minas.splice(i, 1);
      }
    }
    // corrupção
    if (tem('corruptor') && pronto('corruptor', par('corruptor', 'cooldownMs'))) {
      const alvo = pls[0] || chefe;
      const p = dentroDaArena(alvo.x + (Math.random() - 0.5) * 120, alvo.y + (Math.random() - 0.5) * 100, 30);
      est.corrupcao.push({ x: p.x, y: p.y, ate: t + par('corruptor', 'duracaoMs'), tick: 0 });
    }
    for (let i = est.corrupcao.length - 1; i >= 0; i--) {
      const c = est.corrupcao[i];
      if (t > c.ate) { est.corrupcao.splice(i, 1); continue; }
      if (t > c.tick) {
        c.tick = t + par('corruptor', 'intervaloDanoMs');
        for (const pl of pls) if (dist(pl, c) < par('corruptor', 'raio')) pl.takeDmg && pl.takeDmg(par('corruptor', 'dano'), true);
      }
    }
    // abismos
    if (tem('gravity_well') && pronto('gravity_well', par('gravity_well', 'cooldownMs'))) {
      const alvo = pls[0] || chefe;
      const p = dentroDaArena(alvo.x + (Math.random() - 0.5) * 90, alvo.y + (Math.random() - 0.5) * 80, 40);
      est.abismos.push({ x: p.x, y: p.y, puxaEm: t + par('gravity_well', 'avisoMs'), ate: t + par('gravity_well', 'avisoMs') + par('gravity_well', 'duracaoMs') });
    }
    for (let i = est.abismos.length - 1; i >= 0; i--) {
      const g = est.abismos[i];
      if (t > g.ate) { est.abismos.splice(i, 1); continue; }
      if (t > g.puxaEm) {
        for (const pl of pls) {
          const d = dist(pl, g);
          if (d > 4 && d < par('gravity_well', 'raio')) {
            const a = Math.atan2(g.y - pl.y, g.x - pl.x);
            const f = par('gravity_well', 'forca') * dt * (1 - d / par('gravity_well', 'raio'));
            pl.x += Math.cos(a) * f; pl.y += Math.sin(a) * f;
            if (deps.clampEntity) deps.clampEntity(pl);
          }
        }
      }
    }
    // ecos
    for (let i = est.ecos.length - 1; i >= 0; i--) {
      const e = est.ecos[i];
      if (t > e.quando) {
        for (const pl of pls) if (dist(pl, e) < par('echoing', 'raio')) pl.takeDmg && pl.takeDmg(e.dano);
        parts(e.x, e.y, '#c8b0ff', 14, 70);
        est.ecos.splice(i, 1);
      }
    }
  }

  function atualizarOrbitais(chefe, dt, t, pls) {
    if (!tem('orbitals') || !est.orbitais.length) return;
    if (par('orbitals', 'ciclos') && t > est.orbTroca) {
      est.orbVisivel = !est.orbVisivel;
      est.orbTroca = t + (est.orbVisivel ? par('orbitals', 'visivelMs') : par('orbitals', 'ocultoMs'));
    }
    for (const o of est.orbitais) {
      o.ang += par('orbitals', 'velocidade') * dt * 1000;
      o.x = chefe.x + Math.cos(o.ang) * par('orbitals', 'raio');
      o.y = chefe.y + Math.sin(o.ang) * par('orbitals', 'raio') * 0.72;
      if (!est.orbVisivel) continue;
      for (const pl of pls) if (dist(pl, o) < 14 + (pl.radius || 16) * 0.5) pl.takeDmg && pl.takeDmg(par('orbitals', 'dano'), true);
    }
  }

  function atualizarRunas(chefe, dt, t) {
    for (const r of est.runas) {
      if (!r.viva) continue;
      r.ang += par('runic_shield', 'velOrbita') * dt * 1000;
      r.x = chefe.x + Math.cos(r.ang) * par('runic_shield', 'raioOrbita');
      r.y = chefe.y + Math.sin(r.ang) * par('runic_shield', 'raioOrbita') * 0.7;
    }
  }

  /* Projétil do jogador pode quebrar runa e ritual. Devolve true se
     consumiu o projétil. */
  function acertarObjetos(x, y, raio, dano) {
    if (!ativo()) return false;
    for (const r of est.runas) {
      if (!r.viva) continue;
      if (Math.hypot(x - r.x, y - r.y) < raio + 12) {
        r.hp -= dano;
        if (r.hp <= 0) { r.viva = false; parts(r.x, r.y, '#9fd8ff', 14, 60); }
        return true;
      }
    }
    for (const rt of est.rituais) {
      if (Math.hypot(x - rt.x, y - rt.y) < raio + 14) { rt.hp -= dano; return true; }
    }
    return false;
  }

  /* ── desenho ───────────────────────────────────────────────────── */

  /* Glifo de 9x9 do modificador. Substituiu o emoji: emoji sai borrado no
     tamanho da HUD, muda de forma conforme o sistema e destoa da pixel art
     do jogo. Aqui é fillRect puro, como o resto do projeto desenha. */
  function glifo(ctx, id, x, y, px) {
    const g = D.GLIFOS[id], cores = D.CORES_GLIFO[id];
    if (!g || !cores) return false;
    const p = px || 1;
    for (let r = 0; r < 9; r++) {
      const linha = g[r];
      for (let c = 0; c < 9; c++) {
        const ch = linha[c];
        if (ch === '.') continue;
        ctx.fillStyle = ch === 'b' ? cores[1] : cores[0];
        ctx.fillRect(Math.round(x + c * p), Math.round(y + r * p), p, p);
      }
    }
    return true;
  }

  function draw(ctx, t) {
    if (!ativo() || !est.chefe || !ctx) return;
    const chefe = est.chefe;
    const ag = agora();
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    /* VULCÂNICO — brasa no chão com labaredas curtas subindo do próprio
       contorno da mancha, em vez de um disco chapado. */
    for (const f of est.fogo) {
      const vida = clamp((f.ate - ag) / par('volcanic', 'duracaoMs'), 0, 1);
      const R = par('volcanic', 'raio');
      ctx.globalAlpha = 0.30 * vida;
      ctx.fillStyle = '#7a1c05';
      ctx.beginPath(); ctx.ellipse(f.x, f.y, R, R * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.55 * vida;
      ctx.fillStyle = '#c2380a';
      ctx.beginPath(); ctx.ellipse(f.x, f.y, R * 0.72, R * 0.36, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + f.x * 0.01;
        const h = (5 + Math.sin(ag * 0.011 + i * 1.7) * 4) * vida;
        ctx.globalAlpha = (0.55 + 0.35 * Math.sin(ag * 0.014 + i)) * vida;
        ctx.fillStyle = i % 2 ? '#ffb040' : '#ff7a20';
        ctx.fillRect(Math.round(f.x + Math.cos(a) * R * 0.55) - 1,
                     Math.round(f.y + Math.sin(a) * R * 0.28 - h), 2, Math.max(2, h));
      }
    }

    /* GLACIAL — placa com lascas de cristal cravadas na borda. */
    for (const g of est.gelo) {
      const vida = clamp((g.ate - ag) / par('glacial', 'duracaoMs'), 0, 1);
      const R = par('glacial', 'raio');
      ctx.globalAlpha = 0.34 * vida; ctx.fillStyle = '#4a9ec8';
      ctx.beginPath(); ctx.ellipse(g.x, g.y, R, R * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.6 * vida; ctx.strokeStyle = '#dff4ff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(g.x, g.y, R, R * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + g.y * 0.02;
        const bx = g.x + Math.cos(a) * R * 0.5, by = g.y + Math.sin(a) * R * 0.26;
        ctx.globalAlpha = 0.85 * vida; ctx.fillStyle = '#eafaff';
        ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 5, 2, 6);
        ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 4, 2);
      }
    }

    /* CORRUPTOR — poça escura com tentáculos que se contorcem na borda. */
    for (const c of est.corrupcao) {
      const vida = clamp((c.ate - ag) / par('corruptor', 'duracaoMs'), 0, 1);
      const R = par('corruptor', 'raio');
      ctx.globalAlpha = 0.42 * vida; ctx.fillStyle = '#180530';
      ctx.beginPath(); ctx.ellipse(c.x, c.y, R, R * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5 * vida; ctx.strokeStyle = '#8a3ad0'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + ag * 0.0009;
        const l = R * (0.7 + 0.28 * Math.sin(ag * 0.005 + i * 2));
        ctx.beginPath();
        ctx.moveTo(c.x + Math.cos(a) * R * 0.4, c.y + Math.sin(a) * R * 0.2);
        ctx.lineTo(c.x + Math.cos(a) * l, c.y + Math.sin(a) * l * 0.5);
        ctx.stroke();
      }
    }

    /* ABISMO — espiral que gira para dentro, deixando claro que puxa. */
    for (const g of est.abismos) {
      const armando = ag < g.puxaEm;
      const prog = armando ? clamp(1 - (g.puxaEm - ag) / par('gravity_well', 'avisoMs'), 0, 1) : 1;
      const R = par('gravity_well', 'raio') * prog;
      ctx.globalAlpha = 0.30; ctx.fillStyle = '#150826';
      ctx.beginPath(); ctx.ellipse(g.x, g.y, R, R * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = armando ? 0.5 + 0.3 * Math.sin(ag * 0.02) : 0.7;
      ctx.strokeStyle = '#7a4ab8'; ctx.lineWidth = 1.6;
      for (let b = 0; b < 3; b++) {
        ctx.beginPath();
        for (let k = 0; k <= 22; k++) {
          const f = k / 22;
          const a = ag * 0.003 + b * 2.09 + f * 3.4;
          const rr = R * (1 - f * 0.92);
          const px2 = g.x + Math.cos(a) * rr, py2 = g.y + Math.sin(a) * rr * 0.5;
          k ? ctx.lineTo(px2, py2) : ctx.moveTo(px2, py2);
        }
        ctx.stroke();
      }
    }

    /* TROVEJANTE — anel que fecha, e o risco de verdade quando cai. */
    for (const r of est.raios) {
      const falta = clamp((r.cai - ag) / par('stormbound', 'avisoMs'), 0, 1);
      const R = par('stormbound', 'raio');
      ctx.globalAlpha = 0.30; ctx.fillStyle = '#4a4210';
      ctx.beginPath(); ctx.ellipse(r.x, r.y, R, R * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.95; ctx.strokeStyle = '#fff59a'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, R * (0.25 + falta * 0.75), R * (0.25 + falta * 0.75) * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (falta < 0.16) {
        ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(r.x, r.y - 150);
        ctx.lineTo(r.x - 7, r.y - 90); ctx.lineTo(r.x + 6, r.y - 44); ctx.lineTo(r.x, r.y);
        ctx.stroke();
      }
    }

    /* MINADOR — corpo com espinhos e luz de armar piscando. */
    for (const m of est.minas) {
      const armada = ag > m.armada;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#3a2a18';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.fillRect(Math.round(m.x + Math.cos(a) * 8) - 1, Math.round(m.y + Math.sin(a) * 8) - 1, 3, 3);
      }
      ctx.fillStyle = '#5a3a18';
      ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, Math.PI * 2); ctx.fill();
      const pisca = armada ? (0.35 + 0.65 * Math.abs(Math.sin(ag * 0.011))) : 0.25;
      ctx.globalAlpha = pisca; ctx.fillStyle = armada ? '#ff5522' : '#886644';
      ctx.beginPath(); ctx.arc(m.x, m.y, 3, 0, Math.PI * 2); ctx.fill();
    }

    /* REPULSOR — anel que cresce com estilhaços saindo junto. */
    for (const o of est.ondas) {
      const prog = clamp(1 - (o.dispara - ag) / par('repulsor', 'avisoMs'), 0, 1);
      const R = par('repulsor', 'raio') * prog;
      ctx.globalAlpha = 0.55 * (1 - Math.max(0, prog - 0.85) / 0.15);
      ctx.strokeStyle = '#bfe6ff'; ctx.lineWidth = 2 + prog * 2;
      ctx.beginPath(); ctx.ellipse(o.x, o.y, R, R * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#eaf8ff';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.globalAlpha = 0.7 * prog;
        ctx.fillRect(Math.round(o.x + Math.cos(a) * R) - 1, Math.round(o.y + Math.sin(a) * R * 0.5) - 1, 2, 2);
      }
    }

    /* ECOANTE — o círculo fantasma se fecha até o segundo impacto. */
    for (const e of est.ecos) {
      const falta = clamp((e.quando - ag) / par('echoing', 'atrasoMs'), 0, 1);
      const R = par('echoing', 'raio');
      ctx.globalAlpha = 0.22 + 0.25 * (1 - falta);
      ctx.strokeStyle = '#c8b0ff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, R * (0.5 + falta * 0.6), R * (0.5 + falta * 0.6) * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.ellipse(e.x, e.y, R * 0.5, R * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
    }

    /* INVESTIDA — faixa larga de aviso, não um risco fino. */
    if (est.investida && !est.investida.fimAte) {
      const inv = est.investida;
      const prog = clamp(1 - (inv.avisoAte - ag) / par('charger', 'avisoMs'), 0, 1);
      ctx.save();
      ctx.translate(chefe.x, chefe.y); ctx.rotate(inv.ang);
      ctx.globalAlpha = 0.16 + 0.16 * prog; ctx.fillStyle = '#ff9a50';
      ctx.fillRect(0, -16, 280, 32);
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(ag * 0.02);
      ctx.fillStyle = '#ffd0a0';
      ctx.fillRect(0, -1, 280 * prog, 2);
      ctx.restore();
    }

    /* RITUALISTA — vela com chama e a barra de progresso do ritual. */
    for (const r of est.rituais) {
      const prog = clamp(1 - (r.completa - ag) / par('ritualist', 'canalizaMs'), 0, 1);
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(ag * 0.008);
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.ellipse(r.x, r.y + 12, 16 * (0.5 + prog * 0.6), 6 * (0.5 + prog * 0.6), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#7a5a10'; ctx.fillRect(r.x - 3, r.y - 6, 6, 18);
      ctx.fillStyle = '#c8a84b'; ctx.fillRect(r.x - 3, r.y - 6, 2, 18);
      const h = 5 + Math.sin(ag * 0.014) * 2;
      ctx.fillStyle = '#ffd76a'; ctx.fillRect(r.x - 2, r.y - 6 - h, 4, h);
      ctx.fillStyle = '#fff3c0'; ctx.fillRect(r.x - 1, r.y - 5 - h, 2, h - 1);
      ctx.fillStyle = '#241a10'; ctx.fillRect(r.x - 12, r.y + 16, 24, 3);
      ctx.fillStyle = '#ffd76a'; ctx.fillRect(r.x - 12, r.y + 16, Math.round(24 * prog), 3);
    }

    /* ESCUDO RÚNICO — glifo girando, com halo enquanto está de pé. */
    for (const r of est.runas) {
      if (!r.viva) continue;
      const forca = clamp(r.hp / par('runic_shield', 'vidaRuna'), 0, 1);
      ctx.globalAlpha = 0.20 + 0.15 * Math.sin(ag * 0.006 + r.ang);
      ctx.fillStyle = '#9fd8ff';
      ctx.beginPath(); ctx.arc(r.x, r.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.45 + 0.55 * forca;
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(ag * 0.0018);
      ctx.fillStyle = '#dff2ff'; ctx.fillRect(-1, -6, 2, 12); ctx.fillRect(-6, -1, 12, 2);
      ctx.fillStyle = '#2f7fb8'; ctx.fillRect(-4, -4, 3, 3); ctx.fillRect(1, 1, 3, 3);
      ctx.restore();
    }

    /* ORBITAIS — esfera com rastro curto atrás. */
    if (est.orbVisivel) for (const o of est.orbitais) {
      for (let i = 3; i >= 1; i--) {
        const a = o.ang - i * 0.18;
        ctx.globalAlpha = 0.16 * (4 - i);
        ctx.fillStyle = '#8a6410';
        ctx.beginPath();
        ctx.arc(chefe.x + Math.cos(a) * par('orbitals', 'raio'),
                chefe.y + Math.sin(a) * par('orbitals', 'raio') * 0.72, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#8a6410';
      ctx.beginPath(); ctx.arc(o.x, o.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffd06a';
      ctx.beginPath(); ctx.arc(o.x, o.y, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3c0';
      ctx.beginPath(); ctx.arc(o.x - 1, o.y - 1, 2, 0, Math.PI * 2); ctx.fill();
    }

    /* BERSERKER — aura dupla pulsando, e fagulhas subindo. */
    if (est.furiaAte && ag < est.furiaAte) {
      const R = (chefe.radius || 30);
      for (let i = 0; i < 2; i++) {
        ctx.globalAlpha = (0.30 - i * 0.12) + 0.16 * Math.sin(ag * 0.012 + i);
        ctx.strokeStyle = '#ff5533'; ctx.lineWidth = 3 - i;
        ctx.beginPath();
        ctx.arc(chefe.x, chefe.y, R + 10 + i * 8 + Math.sin(ag * 0.01 + i) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffaa55';
      for (let i = 0; i < 4; i++) {
        const p = ((ag * 0.0011 + i * 0.25) % 1);
        ctx.globalAlpha = (1 - p) * 0.8;
        ctx.fillRect(Math.round(chefe.x + Math.sin(i * 2.1 + p * 4) * R),
                     Math.round(chefe.y + R * 0.4 - p * R * 2.2), 2, 3);
      }
    }

    /* ERRANTE — enquanto some, um vórtice fecha no lugar dele. */
    if (est.sumico) {
      const p = clamp((est.sumico - ag) / par('teleporter', 'sumicoMs'), 0, 1);
      ctx.globalAlpha = 0.7 * p; ctx.strokeStyle = '#c9a4ff'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(chefe.x, chefe.y, (chefe.radius || 30) * p * (0.5 + i * 0.35),
                ag * 0.01 + i * 2, ag * 0.01 + i * 2 + 2.2);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
    desenharRevelacao(ctx);
    desenharIcones(ctx, chefe);
  }

  /* Revelação: aparece uns segundos quando o chefe entra, some sozinha e
     não pede clique — o ritmo da luta não para. Depois disso a fileira de
     glifos ao lado do chefe fica de lembrete permanente. */
  function desenharRevelacao(ctx) {
    if (!revelando()) return;
    const restante = est.revelacaoAte - agora();
    const alfa = clamp(restante / 600, 0, 1) * clamp((CONFIG.REVELACAO_MS - restante) / 400, 0, 1);
    const L = 306, alt = 36 + est.mods.length * 28;
    const x = 320 - L / 2, y = 92;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.90 * alfa;
    ctx.fillStyle = '#0b0810'; ctx.fillRect(x, y, L, alt);
    ctx.globalAlpha = alfa;
    ctx.strokeStyle = '#c8702a'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, L - 2, alt - 2);
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#ff9a4a';
    ctx.fillText('NÍVEL DE AMEAÇA ' + nivelAtual(), 320, y + 18);
    ctx.textAlign = 'left';
    est.mods.forEach((m, i) => {
      const ly = y + 32 + i * 28;
      glifo(ctx, m.id, x + 10, ly, 2);
      ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#efe0c0';
      ctx.fillText(m.nome, x + 34, ly + 8);
      ctx.font = '9px monospace'; ctx.fillStyle = '#9a8a72';
      ctx.fillText(m.descricao, x + 34, ly + 19);
    });
    ctx.restore();
  }

  /* Consulta durante a luta: fileira curta de glifos logo acima do chefe,
     sem roubar espaço da HUD. */
  function desenharIcones(ctx, chefe) {
    if (!est.mods.length || revelando()) return;
    const y = (Number.isFinite(chefe._hudAncoraY) ? chefe._hudAncoraY : chefe.y - 50) - 38;
    const passo = 13, larg = est.mods.length * passo;
    let x = Math.round(chefe.x - larg / 2);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.62; ctx.fillStyle = '#0b0810';
    ctx.fillRect(x - 3, y - 3, larg + 6, 15);
    ctx.globalAlpha = 0.35; ctx.strokeStyle = '#6a5030'; ctx.lineWidth = 1;
    ctx.strokeRect(x - 3.5, y - 3.5, larg + 7, 16);
    ctx.globalAlpha = 1;
    for (const m of est.mods) { glifo(ctx, m.id, x + 2, y, 1); x += passo; }
    ctx.restore();
  }

  /* Ícones dos modificadores ativos, para consulta durante a luta. */
  function iconesAtivos() { return est.mods.map(m => m.icone).join(' '); }
  function modsAtivos() { return est.mods.slice(); }
  function revelando() { return ativo() && agora() < est.revelacaoAte; }

  /* ── recompensa ────────────────────────────────────────────────── */
  /* Idempotente: só paga uma vez, e só na vitória. */
  function cobrarRecompensa() {
    if (!ativo() || est.recompensaPaga) return 1;
    est.recompensaPaga = true;
    return multiplicadorRecompensa();
  }

  /* Credita o bônus UMA vez, sobre o valor TOTAL do chefe.

     A primeira versão multiplicava o valor de cada moeda, e o
     arredondamento por moeda comia a diferença: com ameaça 6 o jogador
     recebia 2,00x em vez de 2,20x, porque `round(19*0.23*0.86)` sobe para
     4 e `round(42*0.23*0.86)` desce para 8. Fazendo a conta uma vez, sobre
     um número maior, o erro de arredondamento deixa de importar.

     Só roda na morte do chefe (é chamado de _dropLoot), e a bandeira
     garante que um reload ou uma segunda chamada não pague de novo. */
  function pagarBonus(xpTotal, x, y) {
    if (!ativo() || est.recompensaPaga) return 0;
    est.recompensaPaga = true;
    const extra = multiplicadorRecompensa() - 1;
    if (extra <= 0) return 0;
    const moedas = deps.creditarBonus ? deps.creditarBonus((xpTotal || 0) * extra) : 0;
    if (moedas > 0 && deps.spawnNotice) {
      deps.spawnNotice(x, (y || 0) - 60, 'AMEAÇA ' + nivelAtual() + ' · +' + moedas + ' MOEDAS', 0);
    }
    return moedas;
  }

  global.BossModifierSystem = Object.freeze({
    configurar, iniciarRun, ajustarNivel, limitePara, dificuldadePermite,
    nivelAtual, ativo, multiplicadorRecompensa, cobrarRecompensa, pagarBonus,
    sortear, catalogoDoChefe, aoNascerChefe, forcarModificadores,
    golpeForte, acertouJogador, levouDano, acertarObjetos,
    update, draw, limpar, iconesAtivos, modsAtivos, revelando,
    _estado: () => est,
  });
})(typeof window !== 'undefined' ? window : globalThis);
