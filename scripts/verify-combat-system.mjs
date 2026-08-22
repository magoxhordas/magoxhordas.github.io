import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const html=read('index.html');
const combatFiles=['src/combat/status-effects.js','src/combat/damage-system.js','src/combat/combat-system.js'];
const moduleSources=combatFiles.filter(file=>fs.existsSync(path.join(root,file))).map(read);
const integrationFiles=[
  'src/blessings/blessing-system.js','src/shop/shop-system.js',
  'src/campaign/boss-system.js','src/campaign/campaign-system.js',
  'src/dungeon/dungeon-system.js'
];
const integrationSources=integrationFiles.filter(file=>fs.existsSync(path.join(root,file))).map(read);
const combatSource=[html,...moduleSources,...integrationSources].join('\n');
let checks=0;

function assert(condition,message){
  if(!condition) throw new Error(`FALHA: ${message}`);
  checks++;
}

function includesAll(source,needles,context){
  for(const needle of needles) assert(source.includes(needle),`${context}: ausente ${needle}`);
}

// Contratos centrais da campanha antes de qualquer extracao.
includesAll(combatSource,[
  'class Player',
  'class Enemy',
  'takeDmg(a)',
  'campaignDamageSystem.damagePlayer(this,a)',
  'campaignDamageSystem.damageEnemy(this,a',
  "gameMode===1||(player.dead&&(!player2||player2.dead))",
],'dano, vida e morte');
includesAll(combatSource,[
  'player.hp-=reduced',
  'player.invT=600',
  'Math.round(player.maxHp*0.35)',
  'target.isSpecter&&target.phased',
  'target.hasShield)amount*=0.5',
  'target.weaponVulnerable)amount*=1+target.weaponVulnerable',
  'target.dead=true',
  'incrementKills()',
],'pipeline de dano extraido');

// Critico atual: a implementacao V3 sobrescreve o helper inicial e deve manter
// chance, multiplicador base, estado do ultimo golpe e retorno do dano calculado.
includesAll(combatSource,[
  'const didCrit=force||Math.random()<Math.max(0,chance)',
  'let critMult=2.5',
  'pl._lastAttackWasCrit=didCrit',
  'return damage',
],'critico');

// Status e seus numeros atuais. Estes valores sao contratos de gameplay, nao
// oportunidades de balanceamento durante a modularizacao.
includesAll(combatSource,[
  'fire:1500,ice:1600,electric:900,poison:1700,shadow:1250',
  'arcane:1050,solar:950,wind:850,blood:1300,physical:280',
],'status existentes');
assert(/(?:this|target)\._weaponBurnTick>=500/.test(combatSource),'status existentes: tick de fogo foi alterado');
assert(/(?:this|target)\._weaponPoisonTick>=500/.test(combatSource),'status existentes: tick de veneno foi alterado');
assert(/Math\.max\(\.3,1-(?:this|target)\.weaponSlow\):0\.35/.test(combatSource),'status existentes: lentidao foi alterada');
assert(/(?:this|target)\.frozenTimer-=dt\*1000/.test(combatSource),'status existentes: congelamento foi alterado');

// P1/P2, chefes e Dungeon continuam com seus pontos de entrada reais.
includesAll(combatSource,[
  'gameMode===2&&player2',
  'class BossSkeletonKing',
  'class BossAracne',
  'class BossFrostBehemoth',
  'class BossSandworm',
  'class BossBalrog',
  '_takeDmg(dmg)',
],'P1, P2, chefes e Dungeon');

// O roubo de vida do Viking e os dois caminhos atuais (berserk e Machado de
// Sangue) ficam protegidos porque dependem diretamente do dano aplicado.
includesAll(combatSource,[
  "}else if(cid==='viking')",
  'if(owner.berserkActive)',
  'proj.dmg*owner.lifeSteal',
  "proj.weapon?.type==='viking_bloodaxe'",
  'healPlayer(owner,proj.dmg*steal',
],'roubo de vida do Viking');

for(const source of moduleSources) new vm.Script(source);

if(moduleSources[0]){
  const sandbox={console,performance:{now:()=>1000}};
  sandbox.window=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(moduleSources[0],sandbox,{filename:combatFiles[0]});
  const statuses=sandbox.CampaignStatusEffects.create({
    now:()=>1000,
    resolveWeaponElement:source=>source==='mage_fire_staff'?'fire':'physical',
    getCampaignShopEffect:()=>({elementDuration:.5,elementDamage:.25}),
  });
  const marked={};
  statuses.markEnemy(marked,'mage_fire_staff');
  assert(marked.elementFx.fire===2500,'status de fogo nao preservou duracao visual');

  const mage={classId:'mage'};
  const slowed={slowTimer:0,weaponSlow:0,weaponSlowTimer:0};
  statuses.applySlow(slowed,.2,1000,mage);
  assert(slowed.slowed&&slowed.slowTimer===1500&&slowed.weaponSlow===.2,'slow do Mago nao preservou duracao/forca');

  const poisonWeapon={type:'mage_poison_staff',damageDone:0};
  const poisoned={};
  statuses.applyPoison(poisoned,mage,poisonWeapon,8,4000,1);
  statuses.applyPoison(poisoned,mage,poisonWeapon,8,4000,1);
  assert(poisoned.weaponPoisons.length===1&&poisoned.weaponPoisons[0].dps===10&&poisoned.weaponPoisons[0].timer===6000,'veneno nao preservou bonus/limite de pilha');

  const burnWeapon={damageDone:0};
  const target={
    weaponBurn:{owner:mage,dps:8,timer:1000,weapon:burnWeapon},
    weaponPoisons:[{owner:mage,type:'mage_poison_staff',dps:10,timer:1000,weapon:poisonWeapon}],
    slowed:true,slowTimer:1000,weaponSlow:.2,weaponSlowTimer:1000,
    taken:0,takeDmg(amount){this.taken+=amount;},
  };
  const speed=statuses.updateEnemy(target,.5);
  assert(target.taken===9&&burnWeapon.damageDone===4&&poisonWeapon.damageDone===5,'ticks de fogo/veneno mudaram dano ou credito');
  assert(speed===.8&&target.slowTimer===500,'status de lentidao mudou velocidade ou timer');

  const frozen={frozen:true,frozenTimer:100};
  assert(statuses.updateFrozen(frozen,.1)===true&&!frozen.frozen&&frozen.slowed===false,'fim do congelamento mudou comportamento');
}

const damagePath=path.join(root,'src/combat/damage-system.js');
if(fs.existsSync(damagePath)){
  const damageSource=read('src/combat/damage-system.js');
  const sandbox={console};
  sandbox.window=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(damageSource,sandbox,{filename:'src/combat/damage-system.js'});
  let ended=0,kills=0,deathHooks=0,dashAvoids=0;
  const damage=sandbox.CampaignDamageSystem.create({
    getDifficulty:()=>({playerArmorCap:.75}),
    getBlessingIncomingDamageMultiplier:()=>1.1,
    getCampaignShopIncomingDamageMultiplier:()=>.8,
    getWeaponShieldReduction:()=>.1,
    shouldEndGame:()=>true,
    notifyBlessingDashAvoid:()=>{dashAvoids++;},
    endGame:()=>{ended++;},
    incrementKills:()=>{kills++;},
  });
  const player={hp:100,maxHp:100,dmgReduce:.2,inv:false,dead:false,_revivesLeft:0,x:0,y:0,idx:0};
  damage.damagePlayer(player,100);
  assert(Math.abs(player.hp-38.4)<1e-9&&player.inv&&player.invT===600,'dano normal/armadura/multiplicadores do player mudaram');

  const dashing={...player,hp:100,inv:true,_dashActive:true};
  damage.damagePlayer(dashing,50);
  assert(dashing.hp===100&&dashAvoids===1,'invulnerabilidade do dash deixou de bloquear dano/notificar esquiva');

  const revived={hp:10,maxHp:100,dmgReduce:0,inv:false,dead:false,_revivesLeft:1,x:0,y:0,idx:0};
  damage.damagePlayer(revived,100);
  assert(revived.hp===35&&!revived.dead&&revived._revivesLeft===0&&revived.invT===2500,'revive de 35% foi alterado');

  const defeated={hp:10,maxHp:100,dmgReduce:0,inv:false,dead:false,_revivesLeft:0,x:0,y:0,idx:0};
  damage.damagePlayer(defeated,100);
  assert(defeated.hp===0&&defeated.dead&&ended===1,'morte/fim de jogo do player foi alterado');

  const shielded={hp:50,x:0,y:0,hasShield:true,weaponVulnerable:.2};
  damage.damageEnemy(shielded,40,()=>{deathHooks++;});
  assert(shielded.hp===26&&!shielded.dead&&kills===0&&deathHooks===0,'escudo/vulnerabilidade do inimigo mudaram formula');

  const enemy={hp:10,x:0,y:0};
  damage.damageEnemy(enemy,20,()=>{deathHooks++;});
  assert(enemy.hp===-10&&enemy.dead&&kills===1&&deathHooks===1,'vida/morte/callback do inimigo foram alterados');

  const specter={hp:40,x:0,y:0,isSpecter:true,phased:true};
  damage.damageEnemy(specter,20,()=>{deathHooks++;});
  assert(specter.hp===40&&!specter.dead&&kills===1,'imunidade do espectro em fase foi alterada');
}

const sharedCombatPath=path.join(root,'src/combat/combat-system.js');
if(fs.existsSync(sharedCombatPath)){
  const sharedCombatSource=read('src/combat/combat-system.js');
  const sandbox={console};
  sandbox.window=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(sharedCombatSource,sandbox,{filename:'src/combat/combat-system.js'});
  const particles=[],statuses=[],patches=[],links=[];
  let nearbyEnemies=[],clamps=0,shopHits=0,blessingHits=0,specials=0;
  const shared=sandbox.CampaignCombatSystem.create({
    getShopEffect:()=>({elementDuration:.5}),
    getEnemies:()=>nearbyEnemies,
    hasWeaponType:type=>type==='mage_fire_staff',
    spawnParts:(...args)=>particles.push(args),
    markEnemyStatus:(enemy,type)=>statuses.push({enemy,type}),
    applyShopHitEffects:()=>{shopHits++;},
    notifyBlessingSpecial:()=>{specials++;},
    notifyBlessingHit:()=>{blessingHits++;},
    clampEntity:()=>{clamps++;},
    addFirePatch:patch=>patches.push(patch),
    addLinkPart:(...args)=>links.push(args),
  });

  const healingOwner={hp:80,maxHp:100,cardEffects:{healingMult:.5}};
  assert(shared.healPlayer(healingOwner,10,4,5)===15&&healingOwner.hp===95&&particles.length===1,'cura/bonus/particulas mudaram comportamento');

  const knockbackOwner={x:0,y:0,cardEffects:{extraKnockback:200}};
  const knocked={x:100,y:0,radius:14};
  shared.applyBlessingKnockback(knockbackOwner,knocked);
  assert(knocked.x===185&&knocked.y===0&&clamps===1,'recuo de bencao mudou limite, direcao ou clamp');

  const mage={classId:'mage',slowDur:1000};
  const mageTarget={x:20,y:20};
  shared.applyClassHitEffect({owner:mage,dmg:12},mageTarget);
  assert(mageTarget.slowed&&mageTarget.slowTimer===1500&&statuses.at(-1).type==='ice','acerto do Mago mudou lentidao, duracao ou elemento');
  shared.applyClassHitEffect({owner:mage,dmg:12},mageTarget);
  assert(mageTarget.frozen&&mageTarget.frozenTimer===2000&&!mageTarget.slowed,'segundo acerto do Mago deixou de congelar');

  const warrior={classId:'warrior',fireDur:3000,dmg:100};
  shared.applyClassHitEffect({owner:warrior,dmg:30},{x:30,y:40});
  assert(patches.at(-1).timer===3000&&patches.at(-1).r===28&&patches.at(-1).dmgPerSec===18,'rastro incendiario do Guerreiro mudou');

  let chainedDamage=0;
  const archerTarget={x:0,y:0};
  const linkedEnemy={x:20,y:0,dead:false,takeDmg:amount=>{chainedDamage+=amount;}};
  nearbyEnemies=[archerTarget,linkedEnemy];
  const archer={classId:'archer',plasmaChain:1,igniteSelf:true,dmg:80};
  shared.applyClassHitEffect({owner:archer,dmg:100},archerTarget);
  assert(chainedDamage===60&&links.length===5&&statuses.some(entry=>entry.enemy===linkedEnemy&&entry.type==='electric'),'elo de plasma do Arqueiro mudou dano, alvo, elemento ou desenho');
  assert(patches.at(-1).timer===900&&patches.at(-1).r===24&&patches.at(-1).dmgPerSec===12,'flecha incendiaria do Arqueiro mudou');

  const viking={classId:'viking',hp:50,maxHp:100,berserkActive:true,lifeSteal:.2,x:5,y:6};
  shared.applyClassHitEffect({owner:viking,dmg:100,weapon:{type:'viking_bloodaxe',rarity:'uncommon'}},{x:0,y:0});
  assert(viking.hp===72.5,'roubo de vida do Viking ou Machado de Sangue mudou');
  assert(shopHits===5&&blessingHits===5&&specials===5,'ganchos comuns de loja ou bencao deixaram de executar por acerto');
}

console.log(`OK: baseline de combate protege dano, critico, vida, morte, cooldown/status, P1/P2, chefes, Dungeon e Viking (${checks} verificacoes).`);
