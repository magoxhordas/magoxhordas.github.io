// Dados canonicos da quinta classe. Este arquivo nao guarda estado de partida:
// almas, cadaveres e invocacoes vivem apenas no NecromancerSystem.
(function(global){
  'use strict';

  const CLASS_DEF=Object.freeze({
    id:'necromancer',name:'Necromante',weapon:'Foco Profano',color:'#70d98b',
    badge:'NECROMANCIA',desc:'Invoca mortos, recolhe almas e controla o campo.',
    stats:Object.freeze({vida:43,dano:72,veloc:55,crit:42}),
    ability:'Senhor dos Mortos',
    abilityDesc:'Cajado usa Almas; Sino transforma Cadaveres temporarios em exercito.',
    baseHp:98,baseDmg:21,baseSpd:132,baseAtk:760,baseRange:300,baseMulti:0,
    abilityKey:'necromancy',previewPalKey:'PAL_NECROMANCER',
    shopItems:Object.freeze([]),
  });

  // Mantemos os cinco estagios oficiais do jogo. O Incomum funciona como
  // ponte real entre Comum e Raro, sem remover nenhum nivel existente.
  const WEAPON_SPECS=[
    ['necromancer_dead_staff','Cajado dos Mortos','necromancer_dead_staff','#7ae59a',18,285,1150,[
      'Ergue 1 Guerreiro Esqueleto permanente ao custo de 2 almas.',
      'O Guerreiro recebe +5% de velocidade de ataque e reposicao um pouco mais rapida.',
      'Pode manter 2 Guerreiros; ambos recebem +10% de velocidade de ataque.',
      'Guerreiros recebem +20% de vida e explodem por 60% de um ataque ao morrer.',
      'Abates dos Guerreiros tem 16% de chance de erguer um Soldado de Ossos por 5s.'
    ]],
    ['necromancer_profane_grimoire','Grimorio Profano','necromancer_profane_grimoire','#a66bff',22,330,900,[
      'Dispara um projetil profano que aplica Marca Profana por 3s.',
      'O projetil persegue melhor o alvo e a marca dura 3,5s.',
      'Dispara um segundo tomo de 55% contra outro alvo proximo.',
      'A morte de um marcado espalha a marca uma unica vez para 1 inimigo proximo.',
      'A cada 5 disparos, uma Pagina Maldita explode por 160% de dano em area.'
    ]],
    ['necromancer_soul_scythe','Foice das Almas','necromancer_soul_scythe','#79e8d0',27,118,880,[
      'Corte em arco; abates com a Foice recebem +15 pontos percentuais de chance de Alma.',
      'O arco cresce 8% e o golpe recebe a progressao normal de dano.',
      'O alcance cresce 15% e a coleta de Alma cura 1 de vida.',
      'A cada 4 ataques, colhe inimigos comuns abaixo de 8% de vida e garante Alma.',
      'A cada 6s, cria um anel de Colheita de 140%; chefes nunca sao executados.'
    ]],
    ['necromancer_cursed_skull','Cranio Amaldicoado','necromancer_cursed_skull','#8d55cf',20,315,980,[
      'Lanca um cranio que causa Putrefacao por 4s.',
      'Uma nova aplicacao renova a duracao sem acumular infinitamente.',
      'A morte do amaldicoado causa uma pequena explosao.',
      'A explosao aplica Putrefacao reduzida uma unica vez em inimigos proximos.',
      'Putrefacao ganha dano moderado contra alvos feridos, com bonus limitado em chefes.'
    ]],
    ['necromancer_spectral_lantern','Lanterna Espectral','necromancer_spectral_lantern','#70cfff',19,320,1040,[
      'Mantem 1 Espirito rapido de vida baixa e ataque espectral.',
      'O Espirito recebe +10% de vida.',
      'Pode manter 2 Espiritos.',
      'O ataque do Espirito perfura 1 alvo com dano secundario reduzido.',
      'A cada 4 ataques, deixa um rastro espectral curto de dano baixo.'
    ]],
    ['necromancer_bone_totem','Totem de Ossos','necromancer_bone_totem','#ded3b0',17,260,1320,[
      'Ergue 1 totem sem colisao por 8s que dispara lascas de osso.',
      'O totem dura 9s.',
      'O totem ataca 15% mais rapido e dura 9,5s.',
      'A cada 4 tiros, uma lasca se fragmenta em 2 projeteis menores.',
      'Emite Pulso dos Mortos: dano baixo e +10% de ataque para summons proximos.'
    ]],
    ['necromancer_corrupted_heart','Coracao Corrompido','necromancer_corrupted_heart','#e05273',23,150,1180,[
      'Pulsa dano profano ao redor e recupera vida com limite por segundo.',
      'O intervalo do pulso diminui levemente.',
      'A area do pulso cresce 15%.',
      'Ao acertar 3 inimigos, cura uma pequena quantidade com recarga interna.',
      'Abaixo de 35% de vida, o pulso causa +20% de dano e cura um pouco mais.'
    ]],
    ['necromancer_death_bell','Sino dos Mortos','necromancer_death_bell','#d9c071',16,240,1450,[
      'Consome ate 2 cadaveres e os reanima por 6s.',
      'Reanimados duram 6,5s.',
      'Consome ate 3 cadaveres e os reanima por 7s.',
      'Cadaver de elite pode criar 1 Abominacao forte por ativacao.',
      'A cada quarta ativacao efetiva, invoca 1 Cavaleiro da Morte por 9s.'
    ]],
  ];

  const SHOP_BUFFS=[
    {id:'necromancer_soul_reservoir',name:'Reservatorio de Almas',pixelIcon:'orb',effect:'necroSoulCap',values:[3,3,3,3,3]},
    {id:'necromancer_profane_army',name:'Exercito Profano',pixelIcon:'shadow',effect:'necroPermanentCap',values:[1,1,1,1,1]},
    {id:'necromancer_reinforced_bones',name:'Ossos Reforcados',pixelIcon:'armor',effect:'necroSummonHp',values:[.25,.25,.25,.25,.25]},
    {id:'necromancer_command_dead',name:'Comandar os Mortos',pixelIcon:'training',effect:'necroSummonAttackSpeed',values:[.15,.15,.15,.15,.15]},
    {id:'necromancer_soul_harvest',name:'Colheita de Almas',pixelIcon:'spark',effect:'necroDirectSoulChance',values:[.30,.30,.30,.30,.30]},
    {id:'necromancer_corpse_master',name:'Mestre dos Cadaveres',pixelIcon:'skull',effect:'necroCorpseMaster',values:[1,1,1,1,1]},
    {id:'necromancer_blood_pact',name:'Pacto de Sangue',pixelIcon:'heart',effect:'necroSummonDamage',values:[.20,.20,.20,.20,.20]},
    {id:'necromancer_last_breath',name:'Ultimo Suspiro',pixelIcon:'vortex',effect:'necroLastBreath',values:[1,1,1,1,1]},
  ];

  const CONFIG=Object.freeze({
    soulBaseCap:12,soulHardCap:20,soulTtl:8000,soulDirectChance:.22,
    soulSummonChance:.14,soulPity:6,corpseBaseCap:8,corpseBuffCap:10,
    corpseTtl:6000,corpseDirectChance:.35,corpseSummonChance:.22,
    permanentBaseCap:2,permanentHardCap:5,temporaryCap:3,globalCoopCap:12,
    summonProcCoefficient:.35,summonBossDamage:.85,bossDamageToSummons:1.35,
  });

  global.NecromancerData=Object.freeze({CLASS_DEF,WEAPON_SPECS,SHOP_BUFFS,CONFIG});
})(window);
