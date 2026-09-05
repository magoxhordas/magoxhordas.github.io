/* Nivel de Ameaca: catalogo e configuracao central dos modificadores de chefao. */
(function(global){
  'use strict';

  const CONFIG=Object.freeze({
    LIMITE_POR_DIFICULDADE:Object.freeze({medium:4,hard:6}),
    BONUS_RECOMPENSA:Object.freeze([0,.15,.30,.50,.70,.95,1.20]),
    TETO_POR_CATEGORIA:Object.freeze({arena:2,sobrevivencia:1,furia:1}),
    REVELACAO_MS:2800,
    MAX_AREAS_FOGO:3,
    MAX_AREAS_GELO:3,
    MAX_MINAS:4,
    MAX_RAIOS:3,
    MAX_INVOCADOS:4,
    MAX_RUNAS:4,
  });

  const CATEGORIAS=Object.freeze({
    ARENA:'arena',MOBILIDADE:'mobilidade',SOBREVIVENCIA:'sobrevivencia',
    EXERCITO:'exercito',ATAQUE:'ataque',FURIA:'furia',
  });

  const MODIFICADORES=Object.freeze([
    {id:'volcanic',nome:'VULCÂNICO',icone:'fogo',categoria:CATEGORIAS.ARENA,peso:1,
      descricao:'Golpes pesados deixam o chão em brasa.',params:{duracaoMs:2600,raio:30,dano:5,intervaloDanoMs:480}},
    {id:'glacial',nome:'GLACIAL',icone:'gelo',categoria:CATEGORIAS.ARENA,peso:1,
      descricao:'Golpes pesados deixam placas de gelo que prendem o passo.',params:{duracaoMs:3400,raio:32,lentidao:.45,dano:2,intervaloDanoMs:700}},
    {id:'stormbound',nome:'TROVEJANTE',icone:'raio',categoria:CATEGORIAS.ATAQUE,peso:1,
      descricao:'Os golpes do chefe atraem raios para a arena.',params:{cooldownMs:5200,quantidade:2,avisoMs:850,raio:26,dano:14}},
    {id:'bloodthirsty',nome:'SANGUINÁRIO',icone:'sangue',categoria:CATEGORIAS.FURIA,peso:1,
      descricao:'Quanto mais ferido, mais rápido ele ataca.',params:{marcos:[.75,.50,.25],reducaoCd:[.92,.84,.74]}},
    {id:'berserker',nome:'BERSERKER',icone:'furia',categoria:CATEGORIAS.FURIA,peso:.8,
      descricao:'Ao ficar em estado crítico, entra em fúria por alguns segundos.',params:{gatilhoHp:.30,duracaoMs:7000,reducaoCd:.62,bonusVel:1.28}},
    {id:'vampiric',nome:'VAMPÍRICO',icone:'morcego',categoria:CATEGORIAS.SOBREVIVENCIA,peso:1,
      descricao:'Parte do dano real que ele causa volta como vida.',params:{fracao:.55,tetoPorBatalha:.22}},
    {id:'regenerator',nome:'REGENERADOR',icone:'cura',categoria:CATEGORIAS.SOBREVIVENCIA,peso:.8,
      descricao:'Ele se recompõe se o jogador parar de atacar.',params:{cooldownMs:11000,canalizaMs:2200,curaFracao:.06,tetoPorBatalha:.25}},
    {id:'runic_shield',nome:'ESCUDO RÚNICO',icone:'runa',categoria:CATEGORIAS.SOBREVIVENCIA,peso:.7,
      descricao:'Runas o protegem até serem quebradas.',params:{quantidade:3,vidaRuna:60,reducaoDano:.45,raioOrbita:52,velOrbita:.0011}},
    {id:'summoner',nome:'INVOCADOR',icone:'cranio',categoria:CATEGORIAS.EXERCITO,peso:1,
      descricao:'Periodicamente chama reforços do próprio bioma.',params:{cooldownMs:9000,quantidade:2,avisoMs:700}},
    {id:'commander',nome:'COMANDANTE',icone:'estandarte',categoria:CATEGORIAS.EXERCITO,peso:.8,
      descricao:'Inimigos perto dele ficam mais fortes.',params:{raio:130,bonusDano:1.30,bonusVel:1.18}},
    {id:'teleporter',nome:'ERRANTE',icone:'vortice',categoria:CATEGORIAS.MOBILIDADE,peso:.8,
      descricao:'Some e reaparece em outro ponto da arena.',params:{cooldownMs:8000,sumicoMs:420,distanciaMin:110,distanciaMax:220}},
    {id:'charger',nome:'INVESTIDOR',icone:'seta',categoria:CATEGORIAS.MOBILIDADE,peso:.9,
      descricao:'De vez em quando avança em linha reta.',params:{cooldownMs:8500,avisoMs:800,velocidade:420,duracaoMs:620,dano:16}},
    {id:'hunter',nome:'CAÇADOR',icone:'olho',categoria:CATEGORIAS.MOBILIDADE,peso:1,
      descricao:'Por alguns segundos, persegue sem descanso.',params:{cooldownMs:10000,duracaoMs:3600,bonusVel:1.55}},
    {id:'mine_layer',nome:'MINADOR',icone:'mina',categoria:CATEGORIAS.ARENA,peso:.9,
      descricao:'Armadilhas surgem pela arena.',params:{cooldownMs:6000,quantidade:2,armarMs:900,raioGatilho:26,raioExplosao:44,dano:15,vidaMs:9000}},
    {id:'corruptor',nome:'CORRUPTOR',icone:'corrupcao',categoria:CATEGORIAS.ARENA,peso:.9,
      descricao:'Trechos da arena apodrecem por alguns segundos.',params:{cooldownMs:7500,raio:46,duracaoMs:4200,dano:4,intervaloDanoMs:560}},
    {id:'gravity_well',nome:'ABISMO',icone:'abismo',categoria:CATEGORIAS.ARENA,peso:.7,
      descricao:'Poços puxam quem chega perto.',params:{cooldownMs:9500,avisoMs:900,raio:96,forca:62,duracaoMs:3000}},
    {id:'repulsor',nome:'REPULSOR',icone:'onda',categoria:CATEGORIAS.MOBILIDADE,peso:.9,
      descricao:'Ondas de choque afastam tudo em volta.',params:{cooldownMs:7000,avisoMs:700,raio:120,empurrao:118,dano:4}},
    {id:'orbitals',nome:'ORBITAIS',icone:'orbita',categoria:CATEGORIAS.ATAQUE,peso:.9,
      descricao:'Esferas perigosas giram ao redor dele.',params:{quantidade:2,raio:62,velocidade:.0016,dano:5,ciclos:true,visivelMs:4200,ocultoMs:2200}},
    {id:'echoing',nome:'ECOANTE',icone:'eco',categoria:CATEGORIAS.ATAQUE,peso:1,
      descricao:'Golpes importantes se repetem como um eco.',params:{atrasoMs:820,fracaoDano:.5,raio:46}},
    {id:'ritualist',nome:'RITUALISTA',icone:'vela',categoria:CATEGORIAS.EXERCITO,peso:.8,
      descricao:'Runas surgem e o fortalecem se não forem destruídas.',params:{cooldownMs:12000,quantidade:2,canalizaMs:5000,vidaRuna:35,bonusDano:1.25,duracaoBonusMs:8000}},
  ]);

  const INCOMPATIVEIS=Object.freeze([
    Object.freeze(['gravity_well','repulsor']),
    Object.freeze(['teleporter','charger']),
  ]);

  const POR_CHEFE=Object.freeze({
    BossSkeletonKing:Object.freeze(['summoner','commander','ritualist','echoing','vampiric','teleporter','stormbound','corruptor','runic_shield','regenerator','bloodthirsty','berserker','orbitals','mine_layer','gravity_well','repulsor','hunter']),
    BossAracne:Object.freeze(['summoner','commander','hunter','mine_layer','corruptor','teleporter','charger','echoing','orbitals','bloodthirsty','berserker','vampiric','runic_shield','gravity_well','ritualist','stormbound','regenerator','repulsor']),
    BossFrostBehemoth:Object.freeze(['glacial','stormbound','echoing','repulsor','orbitals','bloodthirsty','berserker','regenerator','gravity_well','corruptor','mine_layer','summoner','commander','ritualist','vampiric']),
    BossSandworm:Object.freeze(['teleporter','corruptor','mine_layer','summoner','gravity_well','echoing','bloodthirsty','berserker','vampiric','regenerator','ritualist','stormbound','orbitals','charger','repulsor','commander','runic_shield']),
    BossBalrog:Object.freeze(['volcanic','berserker','bloodthirsty','charger','echoing','repulsor','orbitals','stormbound','hunter','vampiric','summoner','commander','ritualist','corruptor','mine_layer','gravity_well','regenerator','runic_shield']),
    BossBrute:Object.freeze(['charger','berserker','bloodthirsty','echoing','repulsor','volcanic','stormbound','orbitals','hunter','vampiric','regenerator','runic_shield','summoner','commander','ritualist','mine_layer','corruptor','gravity_well']),
  });

  const GLIFOS=Object.freeze({
    volcanic:['....a....','...aba...','..abbba..','..abbba..','.aabbbaa.','.aabbbaa.','..aaaaa..','...aaa...','.........'],
    glacial:['..a.a.a..','...aaa...','a..aba..a','.aaabaaa.','..abbba..','.aaabaaa.','a..aba..a','...aaa...','..a.a.a..'],
    stormbound:['...aab...','..aab....','.aab.....','aaabbb...','...aab...','..aab....','.aab.....','..ab.....','..a......'],
    bloodthirsty:['....a....','....a....','...aba...','..abba...','.abbba...','.abbba...','.aabbaa..','..aaaa...','.........'],
    berserker:['a.......a','.a..a..a.','..a.a.a..','...aba...','.aabbbaa.','...aba...','..a.a.a..','.a..a..a.','a.......a'],
    vampiric:['.........','aa.....aa','.aa...aa.','..aaaaa..','.aabbbaa.','..a.a.a..','...a.a...','..a...a..','.........'],
    regenerator:['...aaa...','...aba...','...aba...','aaabbbaaa','abbbbbbba','aaabbbaaa','...aba...','...aba...','...aaa...'],
    runic_shield:['.aaaaaaa.','.abbbbba.','.abaaaba.','.abaaaba.','.abbbbba.','..abbba..','...aba...','....a....','.........'],
    summoner:['..aaaaa..','.aaaaaaa.','.abaaaba.','.aaaaaaa.','..aa.aa..','.aaaaaaa.','..a.a.a..','..a.a.a..','.........'],
    commander:['aa.......','abaaaaa..','abbbbba..','abaaaaa..','ab.......','ab.......','ab.......','aa.......','.........'],
    teleporter:['..aaaaa..','.a.....a.','a..aaa..a','a.ab..a.a','a.ab.a..a','a.abba..a','a..aaa..a','.a.....a.','..aaaaa..'],
    charger:['.........','....a....','.....a...','aaaaaabaa','.......bb','aaaaaabaa','.....a...','....a....','.........'],
    hunter:['.........','..aaaaa..','.a.....a.','a..bbb..a','a.bbbbb.a','a..bbb..a','.a.....a.','..aaaaa..','.........'],
    mine_layer:['......ab.','.....ab..','..aaaa...','.aaaaaa..','aabbbbaa.','aabbbbaa.','.aaaaaa..','..aaaa...','.........'],
    corruptor:['.........','..aaaaa..','.abbbbba.','abbbbbbba','abbbbbbba','abbbbbbba','.abbbbba.','..aaaaa..','.........'],
    gravity_well:['a.......a','.a.aaa.a.','..a...a..','.a..a..a.','a..aba..a','.a..a..a.','..a...a..','.a.aaa.a.','a.......a'],
    repulsor:['....a....','..a.a.a..','.a..a..a.','a...b...a','aabbbbbaa','a...b...a','.a..a..a.','..a.a.a..','....a....'],
    orbitals:['..aaaaa..','.a.....a.','a...b...a','a..bbb..a','a...b...a','a.......a','.a.....a.','..aaaaa..','.........'],
    echoing:['.........','.aa...aa.','a..a.a..a','....a....','.bb...bb.','b..b.b..b','....b....','.........','.........'],
    ritualist:['....a....','....b....','...aba...','...aba...','...aba...','..abbba..','..abbba..','.aaaaaaa.','.aaaaaaa.'],
  });
  const CORES_GLIFO=Object.freeze({
    volcanic:['#c2380a','#ffb040'],glacial:['#4a9ec8','#dff4ff'],stormbound:['#c9a516','#fff59a'],
    bloodthirsty:['#8c1420','#ff4450'],berserker:['#a82818','#ff8a50'],vampiric:['#6a1030','#ff5570'],
    regenerator:['#1f7a34','#7ee08a'],runic_shield:['#2f7fb8','#9fd8ff'],summoner:['#6a6250','#e2dac4'],
    commander:['#7a2018','#ffbb55'],teleporter:['#5a2a9a','#c9a4ff'],charger:['#a05010','#ff9a50'],
    hunter:['#4a2a6a','#c08aff'],mine_layer:['#5a3a18','#ffaa44'],corruptor:['#3a1060','#8a3ad0'],
    gravity_well:['#241038','#7a4ab8'],repulsor:['#2a5a7a','#bfe6ff'],orbitals:['#8a6410','#ffd06a'],
    echoing:['#5a4a8a','#c8b0ff'],ritualist:['#7a5a10','#ffd76a'],
  });
  const POR_ID=Object.freeze(Object.fromEntries(MODIFICADORES.map(m=>[m.id,m])));
  global.BossModifierData=Object.freeze({CONFIG,CATEGORIAS,MODIFICADORES,INCOMPATIVEIS,POR_CHEFE,POR_ID,GLIFOS,CORES_GLIFO});
})(typeof window!=='undefined'?window:globalThis);
