/* ═══════════════════════════════════════════════════════════════════
   NÍVEL DE AMEAÇA — catálogo e configuração

   Este arquivo é SÓ DADO: números, textos e tabelas. Quem executa é o
   boss-modifiers.js. A separação existe para o balanceamento ficar num
   lugar só — nenhum número solto espalhado pelas classes de chefe.

   A compatibilidade por chefe NÃO foi inventada: saiu da leitura do que
   cada um de fato faz em boss-system.js. O Verme Devorador recebe
   Teleportador porque ele JÁ mergulha e reaparece; o Brutamontes recebe
   Investidor porque ele JÁ salta; o Rei Cadáver recebe Invocador porque
   ele JÁ chama esqueletos. Nenhum modificador pede animação que o chefe
   não tenha — todos agem em volta dele.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ── Configuração central ──────────────────────────────────────── */
  const CONFIG = Object.freeze({
    /* Só Normal (medium) e Difícil (hard). Uma dificuldade fora desta
       tabela não tem Nível de Ameaça — nem menu, nem sorteio, nem bônus. */
    LIMITE_POR_DIFICULDADE: Object.freeze({ medium: 4, hard: 6 }),

    /* Bônus de recompensa por nível. O índice é o próprio nível. */
    BONUS_RECOMPENSA: Object.freeze([0, 0.15, 0.30, 0.50, 0.70, 0.95, 1.20]),

    /* Tetos por categoria no mesmo sorteio. Sem isto, uma ameaça alta
       podia empilhar cinco perigos de chão e virar poluição visual. */
    TETO_POR_CATEGORIA: Object.freeze({ arena: 2, sobrevivencia: 1, furia: 1 }),

    /* Quanto tempo a tela de revelação fica no ar, em ms. */
    REVELACAO_MS: 2800,

    /* Tetos de segurança dos efeitos, para nada crescer sem limite. */
    MAX_AREAS_FOGO: 3,
    MAX_AREAS_GELO: 3,
    MAX_MINAS: 4,
    MAX_RAIOS: 3,
    MAX_INVOCADOS: 4,      // além do que a onda já gera
    MAX_RUNAS: 4,
  });

  /* ── Categorias ────────────────────────────────────────────────── */
  const CATEGORIAS = Object.freeze({
    ARENA: 'arena',              // perigos no chão
    MOBILIDADE: 'mobilidade',    // como o chefe se desloca
    SOBREVIVENCIA: 'sobrevivencia', // cura e defesa
    EXERCITO: 'exercito',        // reforços
    ATAQUE: 'ataque',            // consequências dos golpes
    FURIA: 'furia',              // escala com a vida perdida
  });

  /* ── Catálogo ──────────────────────────────────────────────────── */
  /* weight: peso no sorteio. Os mais disruptivos pesam menos, para
     aparecerem com menos frequência sem precisar de raridade. */
  const MODIFICADORES = Object.freeze([
    {
      id: 'volcanic', nome: 'VULCÂNICO', icone: '🔥', categoria: CATEGORIAS.ARENA, peso: 1,
      descricao: 'Golpes pesados deixam o chão em brasa.',
      params: { duracaoMs: 2600, raio: 30, dano: 6, intervaloDanoMs: 420 },
    },
    {
      id: 'glacial', nome: 'GLACIAL', icone: '❄️', categoria: CATEGORIAS.ARENA, peso: 1,
      descricao: 'Golpes pesados deixam placas de gelo que prendem o passo.',
      params: { duracaoMs: 3400, raio: 32, lentidao: 0.45, dano: 2, intervaloDanoMs: 700 },
    },
    {
      id: 'stormbound', nome: 'TROVEJANTE', icone: '⚡', categoria: CATEGORIAS.ATAQUE, peso: 1,
      descricao: 'Os golpes do chefe atraem raios para a arena.',
      params: { cooldownMs: 5200, quantidade: 2, avisoMs: 850, raio: 26, dano: 14 },
    },
    {
      id: 'bloodthirsty', nome: 'SANGUINÁRIO', icone: '🩸', categoria: CATEGORIAS.FURIA, peso: 1,
      descricao: 'Quanto mais ferido, mais rápido ele ataca.',
      params: { marcos: [0.75, 0.50, 0.25], reducaoCd: [0.92, 0.84, 0.74] },
    },
    {
      id: 'berserker', nome: 'BERSERKER', icone: '💢', categoria: CATEGORIAS.FURIA, peso: 0.8,
      descricao: 'Ao ficar em estado crítico, entra em fúria por alguns segundos.',
      params: { gatilhoHp: 0.30, duracaoMs: 7000, reducaoCd: 0.62, bonusVel: 1.28 },
    },
    {
      id: 'vampiric', nome: 'VAMPÍRICO', icone: '🦇', categoria: CATEGORIAS.SOBREVIVENCIA, peso: 1,
      descricao: 'Parte do dano que ele causa volta como vida.',
      params: { fracao: 0.55, tetoPorBatalha: 0.22 },
    },
    {
      id: 'regenerator', nome: 'REGENERADOR', icone: '💚', categoria: CATEGORIAS.SOBREVIVENCIA, peso: 0.8,
      descricao: 'De tempos em tempos ele se recompõe. Continuar batendo interrompe.',
      params: { cooldownMs: 11000, canalizaMs: 2200, curaFracao: 0.06, tetoPorBatalha: 0.25 },
    },
    {
      id: 'runic_shield', nome: 'ESCUDO RÚNICO', icone: '🔷', categoria: CATEGORIAS.SOBREVIVENCIA, peso: 0.7,
      descricao: 'Runas o protegem até serem quebradas.',
      params: { quantidade: 3, vidaRuna: 60, reducaoDano: 0.45, raioOrbita: 52, velOrbita: 0.0011 },
    },
    {
      id: 'summoner', nome: 'INVOCADOR', icone: '💀', categoria: CATEGORIAS.EXERCITO, peso: 1,
      descricao: 'Periodicamente chama reforços do próprio bioma.',
      params: { cooldownMs: 9000, quantidade: 2, avisoMs: 700 },
    },
    {
      id: 'commander', nome: 'COMANDANTE', icone: '🏴', categoria: CATEGORIAS.EXERCITO, peso: 0.8,
      descricao: 'Inimigos perto dele ficam mais fortes.',
      params: { raio: 130, bonusDano: 1.30, bonusVel: 1.18 },
    },
    {
      id: 'teleporter', nome: 'ERRANTE', icone: '🌀', categoria: CATEGORIAS.MOBILIDADE, peso: 0.8,
      descricao: 'Some e reaparece em outro ponto da arena.',
      params: { cooldownMs: 8000, sumicoMs: 420, distanciaMin: 110, distanciaMax: 220 },
    },
    {
      id: 'charger', nome: 'INVESTIDOR', icone: '➤', categoria: CATEGORIAS.MOBILIDADE, peso: 0.9,
      descricao: 'De vez em quando avança em linha reta.',
      params: { cooldownMs: 8500, avisoMs: 800, velocidade: 420, duracaoMs: 620, dano: 16 },
    },
    {
      id: 'hunter', nome: 'CAÇADOR', icone: '👁️', categoria: CATEGORIAS.MOBILIDADE, peso: 1,
      descricao: 'Por alguns segundos, persegue sem descanso.',
      params: { cooldownMs: 10000, duracaoMs: 3600, bonusVel: 1.55 },
    },
    {
      id: 'mine_layer', nome: 'MINADOR', icone: '💣', categoria: CATEGORIAS.ARENA, peso: 0.9,
      descricao: 'Armadilhas surgem pela arena.',
      params: { cooldownMs: 6000, quantidade: 2, armarMs: 900, raioGatilho: 26, raioExplosao: 44, dano: 15, vidaMs: 9000 },
    },
    {
      id: 'corruptor', nome: 'CORRUPTOR', icone: '🕳️', categoria: CATEGORIAS.ARENA, peso: 0.9,
      descricao: 'Trechos da arena apodrecem por alguns segundos.',
      params: { cooldownMs: 7500, raio: 46, duracaoMs: 4200, dano: 5, intervaloDanoMs: 520 },
    },
    {
      id: 'gravity_well', nome: 'ABISMO', icone: '🌑', categoria: CATEGORIAS.ARENA, peso: 0.7,
      descricao: 'Poços puxam quem chega perto.',
      params: { cooldownMs: 9500, avisoMs: 900, raio: 96, forca: 62, duracaoMs: 3000 },
    },
    {
      id: 'repulsor', nome: 'REPULSOR', icone: '💠', categoria: CATEGORIAS.MOBILIDADE, peso: 0.9,
      descricao: 'Ondas de choque afastam tudo em volta.',
      params: { cooldownMs: 7000, avisoMs: 700, raio: 120, empurrao: 118, dano: 4 },
    },
    {
      id: 'orbitals', nome: 'ORBITAIS', icone: '🔆', categoria: CATEGORIAS.ATAQUE, peso: 0.9,
      descricao: 'Esferas perigosas giram ao redor dele.',
      params: { quantidade: 2, raio: 62, velocidade: 0.0016, dano: 9, ciclos: true, visivelMs: 4200, ocultoMs: 2200 },
    },
    {
      id: 'echoing', nome: 'ECOANTE', icone: '〰️', categoria: CATEGORIAS.ATAQUE, peso: 1,
      descricao: 'Golpes importantes se repetem como um eco.',
      params: { atrasoMs: 820, fracaoDano: 0.5, raio: 46 },
    },
    {
      id: 'ritualist', nome: 'RITUALISTA', icone: '🕯️', categoria: CATEGORIAS.EXERCITO, peso: 0.8,
      descricao: 'Runas surgem no chão e o fortalecem se ninguém as apagar.',
      params: { cooldownMs: 12000, quantidade: 2, canalizaMs: 5000, vidaRuna: 35, bonusDano: 1.25, duracaoBonusMs: 8000 },
    },
  ]);

  /* ── Combinações proibidas ─────────────────────────────────────── */
  /* Abismo puxa, Repulsor empurra: juntos a movimentação vira loteria. */
  const INCOMPATIVEIS = Object.freeze([
    Object.freeze(['gravity_well', 'repulsor']),
    /* Dois efeitos de deslocamento forçado do chefe ao mesmo tempo deixam
       a leitura impossível: ele some, e antes de reaparecer já investiu. */
    Object.freeze(['teleporter', 'charger']),
  ]);

  /* ── Compatibilidade por chefe ─────────────────────────────────── */
  /* Cada lista saiu do que o chefe REALMENTE faz. Os comentários dizem
     por que os ausentes ficaram de fora. */
  const POR_CHEFE = Object.freeze({
    // melee, invoca esqueletos, ressuscita uma vez
    BossSkeletonKing: Object.freeze([
      'summoner', 'commander', 'ritualist', 'echoing', 'vampiric', 'teleporter',
      'stormbound', 'corruptor', 'runic_shield', 'regenerator', 'bloodthirsty',
      'berserker', 'orbitals', 'mine_layer', 'gravity_well', 'repulsor', 'hunter',
      // fora: volcanic e glacial (castelo, sem tema), charger (não corre)
    ]),
    // cone, ovos, pulo em três fases
    BossAracne: Object.freeze([
      'summoner', 'commander', 'hunter', 'mine_layer', 'corruptor', 'teleporter',
      'charger', 'echoing', 'orbitals', 'bloodthirsty', 'berserker', 'vampiric',
      'runic_shield', 'gravity_well', 'ritualist', 'stormbound', 'regenerator', 'repulsor',
      // fora: volcanic e glacial (floresta, sem tema)
    ]),
    // nevasca, linha de gelo, erupção, escudo próprio
    BossFrostBehemoth: Object.freeze([
      'glacial', 'stormbound', 'echoing', 'repulsor', 'orbitals', 'bloodthirsty',
      'berserker', 'regenerator', 'gravity_well', 'corruptor', 'mine_layer',
      'summoner', 'commander', 'ritualist', 'vampiric',
      // fora: charger e hunter (é lento e pesado), teleporter (não some),
      //       volcanic (contradiz o tema), runic_shield (já tem escudo)
    ]),
    // ácido, cuspe, mergulho que reaparece, buraco
    BossSandworm: Object.freeze([
      'teleporter', 'corruptor', 'mine_layer', 'summoner', 'gravity_well', 'echoing',
      'bloodthirsty', 'berserker', 'vampiric', 'regenerator', 'ritualist', 'stormbound',
      'orbitals', 'charger', 'repulsor', 'commander', 'runic_shield',
      // fora: hunter (passa tempo enterrado), volcanic e glacial (deserto)
    ]),
    // chicote, meteoro, lava, fúria em 30%
    BossBalrog: Object.freeze([
      'volcanic', 'berserker', 'bloodthirsty', 'charger', 'echoing', 'repulsor',
      'orbitals', 'stormbound', 'hunter', 'vampiric', 'summoner', 'commander',
      'ritualist', 'corruptor', 'mine_layer', 'gravity_well', 'regenerator', 'runic_shield',
      // fora: teleporter (não some), glacial (contradiz o tema)
    ]),
    // pedra com preparo, salto em três fases, fúria em 40%
    BossBrute: Object.freeze([
      'charger', 'berserker', 'bloodthirsty', 'echoing', 'repulsor', 'volcanic',
      'stormbound', 'orbitals', 'hunter', 'vampiric', 'regenerator', 'runic_shield',
      'summoner', 'commander', 'ritualist', 'mine_layer', 'corruptor', 'gravity_well',
      // fora: teleporter (não some), glacial (vulcão)
    ]),
  });

  /* ── Glifos ──────────────────────────────────────────────────────
     Os ícones eram emoji. Emoji sai borrado no tamanho da HUD, muda de
     desenho conforme o sistema e destoa da pixel art do resto do jogo.
     Aqui cada modificador tem um glifo de 9x9 desenhado à mão, no mesmo
     idioma dos outros ícones do projeto: 'a' é o traço, 'b' o brilho.
     O emoji continua no campo `icone` para texto puro (log, títulos). */
  const GLIFOS = Object.freeze({
    volcanic: ['....a....','...aba...','..abbba..','..abbba..','.aabbbaa.','.aabbbaa.','..aaaaa..','...aaa...','.........'],
    glacial:  ['..a.a.a..','...aaa...','a..aba..a','.aaabaaa.','..abbba..','.aaabaaa.','a..aba..a','...aaa...','..a.a.a..'],
    stormbound:['...aab...','..aab....','.aab.....','aaabbb...','...aab...','..aab....','.aab.....','..ab.....','..a......'],
    bloodthirsty:['....a....','....a....','...aba...','..abba...','.abbba...','.abbba...','.aabbaa..','..aaaa...','.........'],
    berserker:['a.......a','.a..a..a.','..a.a.a..','...aba...','.aabbbaa.','...aba...','..a.a.a..','.a..a..a.','a.......a'],
    vampiric: ['.........','aa.....aa','.aa...aa.','..aaaaa..','.aabbbaa.','..a.a.a..','...a.a...','..a...a..','.........'],
    regenerator:['...aaa...','...aba...','...aba...','aaabbbaaa','abbbbbbba','aaabbbaaa','...aba...','...aba...','...aaa...'],
    runic_shield:['.aaaaaaa.','.abbbbba.','.abaaaba.','.abaaaba.','.abbbbba.','..abbba..','...aba...','....a....','.........'],
    summoner: ['..aaaaa..','.aaaaaaa.','.abaaaba.','.aaaaaaa.','..aa.aa..','.aaaaaaa.','..a.a.a..','..a.a.a..','.........'],
    commander:['aa.......','abaaaaa..','abbbbba..','abaaaaa..','ab.......','ab.......','ab.......','aa.......','.........'],
    teleporter:['..aaaaa..','.a.....a.','a..aaa..a','a.ab..a.a','a.ab.a..a','a.abba..a','a..aaa..a','.a.....a.','..aaaaa..'],
    charger:  ['.........','....a....','.....a...','aaaaaabaa','.......bb','aaaaaabaa','.....a...','....a....','.........'],
    hunter:   ['.........','..aaaaa..','.a.....a.','a..bbb..a','a.bbbbb.a','a..bbb..a','.a.....a.','..aaaaa..','.........'],
    mine_layer:['......ab.','.....ab..','..aaaa...','.aaaaaa..','aabbbbaa.','aabbbbaa.','.aaaaaa..','..aaaa...','.........'],
    corruptor:['.........','..aaaaa..','.abbbbba.','abbbbbbba','abbbbbbba','abbbbbbba','.abbbbba.','..aaaaa..','.........'],
    gravity_well:['a.......a','.a.aaa.a.','..a...a..','.a..a..a.','a..aba..a','.a..a..a.','..a...a..','.a.aaa.a.','a.......a'],
    repulsor: ['....a....','..a.a.a..','.a..a..a.','a...b...a','aabbbbbaa','a...b...a','.a..a..a.','..a.a.a..','....a....'],
    orbitals: ['..aaaaa..','.a.....a.','a...b...a','a..bbb..a','a...b...a','a.......a','.a.....a.','..aaaaa..','.........'],
    echoing:  ['.........','.aa...aa.','a..a.a..a','....a....','.bb...bb.','b..b.b..b','....b....','.........','.........'],
    ritualist:['....a....','....b....','...aba...','...aba...','...aba...','..abbba..','..abbba..','.aaaaaaa.','.aaaaaaa.'],
  });
  /* cor do traço e do brilho, por modificador */
  const CORES_GLIFO = Object.freeze({
    volcanic:['#c2380a','#ffb040'], glacial:['#4a9ec8','#dff4ff'], stormbound:['#c9a516','#fff59a'],
    bloodthirsty:['#8c1420','#ff4450'], berserker:['#a82818','#ff8a50'], vampiric:['#6a1030','#ff5570'],
    regenerator:['#1f7a34','#7ee08a'], runic_shield:['#2f7fb8','#9fd8ff'], summoner:['#6a6250','#e2dac4'],
    commander:['#7a2018','#ffbb55'], teleporter:['#5a2a9a','#c9a4ff'], charger:['#a05010','#ff9a50'],
    hunter:['#4a2a6a','#c08aff'], mine_layer:['#5a3a18','#ffaa44'], corruptor:['#3a1060','#8a3ad0'],
    gravity_well:['#241038','#7a4ab8'], repulsor:['#2a5a7a','#bfe6ff'], orbitals:['#8a6410','#ffd06a'],
    echoing:['#5a4a8a','#c8b0ff'], ritualist:['#7a5a10','#ffd76a'],
  });

  const POR_ID = Object.freeze(Object.fromEntries(MODIFICADORES.map(m => [m.id, m])));

  global.BossModifierData = Object.freeze({
    CONFIG, CATEGORIAS, MODIFICADORES, INCOMPATIVEIS, POR_CHEFE, POR_ID, GLIFOS, CORES_GLIFO,
  });
})(typeof window !== 'undefined' ? window : globalThis);
