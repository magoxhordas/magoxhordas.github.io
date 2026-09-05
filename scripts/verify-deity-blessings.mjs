import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const dataSource=fs.readFileSync(new URL('../src/blessings/blessing-data.js',import.meta.url),'utf8');
const systemSource=fs.readFileSync(new URL('../src/blessings/blessing-system.js',import.meta.url),'utf8');
const indexSource=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const codexSource=fs.readFileSync(new URL('../src/ui/menu-codex-system.js',import.meta.url),'utf8');

let clock=10000;
let randomValue=.99;
let legacySkips=0;
const math=Object.create(Math);
math.random=()=>randomValue;
const context={
  console,WeakMap,Set,Map,Object,Array,Number,String,Math:math,Date,
  performance:{now:()=>clock},setTimeout:(fn)=>{fn();return 1;},clearTimeout(){},
  window:{},document:{getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>null},
  activeCardBlessings:[],player:null,player2:null,gameMode:1,wave:1,
  enemies:[],bossOrc:null,bossSkel:null,bossSpider:null,bossMajor:null,petBoss:null,
  applyCardWaveRegen(){},getCampaignShopDamageBonus:()=>0,getCampaignShopCritBonus:()=>0,
  campaignModifyOutgoingDamage:(_pl,_target,damage)=>damage,
  notifyCampaignShopTargetKilled(){},updateBlessingsHUD(){},hideAllScreens(){},closeCardOffer(){},skipCardOffer(){legacySkips++;},
  spawnParts(){},spawnLevelUpNotice(){},healCampaignPlayer(pl,amount){const before=pl.hp;pl.hp=Math.min(pl.maxHp,pl.hp+amount);return pl.hp-before;},
  allTargets:list=>list,CampProgressionSystem:{damageBonus:()=>0},
};
context.window=context;
vm.createContext(context);
vm.runInContext(dataSource,context,{filename:'blessing-data.js'});
vm.runInContext(systemSource,context,{filename:'blessing-system.js'});

const deities=context.DEITY_BLESSINGS_V4;
const ascensions=context.DEITY_BLESSING_ASCENSIONS;
const rarities=context.DEITY_BLESSING_RARITIES;
const allBoons=deities.flatMap(deity=>deity.boons);
const allAscensions=Object.values(ascensions).flat();
const rawBoon=id=>allBoons.find(boon=>boon.id===id);
const deityOf=id=>deities.find(deity=>deity.boons.some(boon=>boon.id===id));
const card=(id,index=0)=>{
  const boon=rawBoon(id),deity=deityOf(id);
  assert.ok(boon&&deity,`Bênção desconhecida no teste: ${id}`);
  return {...boon,deityId:deity.id,god:deity.name,rarity:rarities[index].id,rarityIndex:index,value:boon.values[index]};
};
const ascCard=id=>{
  for(const [deityId,list] of Object.entries(ascensions)){
    const ascension=list.find(item=>item.id===id);
    if(ascension)return {...ascension,deityId,rarity:'lendaria',rarityIndex:4,value:0,isAscension:true};
  }
  throw new Error(`Ascensão desconhecida no teste: ${id}`);
};
const hero=(overrides={})=>({
  idx:0,classId:'mage',x:10,y:10,hp:100,maxHp:100,dmg:20,speed:100,atkCd:1000,
  _dashCd:1000,_dashMaxCd:2000,range:180,cardEffects:{},inv:false,invT:0,
  isMoving:false,dead:false,...overrides,
});
const enemy=(overrides={})=>({
  x:30,y:10,hp:1000,maxHp:1000,dead:false,
  takeDmg(amount){this.hp=Math.max(0,this.hp-amount);if(this.hp<=0)this.dead=true;},
  ...overrides,
});
function resetWorld(players=[],targets=[]){
  clock+=10000;randomValue=.99;context.activeCardBlessings=[];context.player=players[0]||null;
  context.player2=players[1]||null;context.gameMode=players.length>1?2:1;context.wave=1;
  context.enemies=targets;context.bossOrc=null;context.bossSkel=null;context.bossSpider=null;
  context.bossMajor=null;context.petBoss=null;
}
function add(pl,...cards){for(const selected of cards)context.applyDeityBoon(pl,selected);}
function hit(pl,target,damage=20,weapon=null){context.notifyBlessingHit(pl,target,damage,weapon);}
function attack(pl,target,damage=20,weapon=null){
  context.notifyBlessingAttack(pl,target,damage,weapon);
  const dealt=context.applyCardCrit(pl,damage,target,weapon);
  target.takeDmg(dealt);context.notifyBlessingHit(pl,target,dealt,weapon);return dealt;
}
function kill(pl,overrides={},weapon=null){
  const victim=enemy({hp:0,dead:true,maxHp:100,...overrides});context.notifyBlessingKill(pl,victim,weapon);return victim;
}
const approximately=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance,`Esperado ${expected}, recebido ${actual}`);

// Catálogo, contratos e escalonamento.
assert.equal(deities.length,15,'Devem existir 15 divindades.');
assert.equal(rarities.length,5,'Devem existir cinco raridades.');
assert.equal(Object.keys(ascensions).length,15,'Toda divindade precisa de Ascensões.');
assert.equal(allBoons.length,75,'O catálogo precisa ter 75 bênçãos.');
assert.equal(allAscensions.length,30,'O catálogo precisa ter 30 Ascensões.');
assert.equal(new Set(allBoons.map(item=>item.id)).size,75,'IDs de bênçãos duplicados.');
assert.equal(new Set(allAscensions.map(item=>item.id)).size,30,'IDs de Ascensão duplicados.');
for(const deity of deities){
  assert.equal(deity.boons.length,5,`${deity.name} precisa ter cinco bênçãos.`);
  assert.equal(ascensions[deity.id]?.length,2,`${deity.name} precisa ter duas Ascensões.`);
}
for(const boon of allBoons){
  assert.equal(boon.values.length,5,`${boon.id} não possui cinco valores de raridade.`);
  assert.ok(boon.values.every(Number.isFinite),`${boon.id} possui valor de raridade inválido.`);
  assert.ok(boon.values.every((value,index)=>index===0||value>=boon.values[index-1]),`${boon.id} piora ao subir de raridade.`);
  for(const [key,value] of Object.entries(boon)){
    if(!Array.isArray(value)||!value.length||!value.every(Number.isFinite))continue;
    assert.equal(value.length,5,`${boon.id}.${key} precisa mapear as cinco raridades.`);
    const nondecreasing=value.every((entry,index)=>index===0||entry>=value[index-1]);
    const nonincreasing=value.every((entry,index)=>index===0||entry<=value[index-1]);
    assert.ok(nondecreasing||nonincreasing,`${boon.id}.${key} escala de forma irregular.`);
  }
}
for(const ascension of allAscensions){
  assert.equal(ascension.standalone,true,`${ascension.id} ainda depende de uma bênção específica para funcionar.`);
  assert.ok(ascension.desc.length>=55,`${ascension.id} não explica efeito-base e sinergias com clareza.`);
}
assert.doesNotMatch(indexSource,/blessing-affinity-system\.js/,'Dois motores de bênção seriam carregados ao mesmo tempo.');
assert.match(indexSource,/applyBlessingSummonDamage\(owner,target,result,meta\)/,'Metadados de invocação não chegam ao motor de bênçãos.');
assert.match(indexSource,/notifyBlessingSummonDamageResolved\(owner,target,damage,meta\)/,'Dano resolvido de invocações não chega ao motor de bênçãos.');
assert.doesNotMatch(codexSource,/2\/5 · RESSONÂNCIA|5\/5 · APOTEOSE/,'O Códex ainda documenta o fluxo antigo de cinco estágios.');
assert.match(codexSource,/DEITY_BLESSING_ASCENSIONS/,'O Códex não lê as 30 Ascensões canônicas.');
assert.ok(!fs.existsSync(new URL('../src/blessings/blessing-affinity-system.js',import.meta.url)),'O motor concorrente de afinidade ainda existe.');

const commonText=context.formatDeityBlessingValue(rawBoon('zeus_chain_lightning'),0,0);
const legendaryText=context.formatDeityBlessingValue(rawBoon('zeus_chain_lightning'),0,4);
assert.notEqual(commonText,legendaryText,'O Códex mostra o mesmo valor para todas as raridades.');
assert.match(commonText,/35%/);assert.match(legendaryText,/80%/);

// Fluxo 3/3, bloqueio do deus e proteção contra azar numa campanha curta.
context.activeCardBlessings=[card('zeus_chain_lightning'),card('zeus_static_charge')];
assert.equal(context.__DEITY_BLESSING_DEBUG__.ascensionReadyDeity(),null,'Ascensão abriu antes da terceira bênção.');
context.activeCardBlessings.push(card('zeus_thunder_dash'));
assert.equal(context.__DEITY_BLESSING_DEBUG__.ascensionReadyDeity(),'zeus','A terceira bênção não liberou a Ascensão.');
const ascOffer=context.rollAscensionOffer('zeus');
assert.equal(ascOffer.length,2,'Ascensão deve oferecer exatamente dois caminhos.');
assert.ok(ascOffer.every(item=>item.isAscension&&item.deityId==='zeus'),'Oferta de Ascensão trouxe carta incorreta.');
context.revealCardOffers(ascOffer);assert.equal(context.skipCardOffer(),false,'A Ascensão obrigatória ainda pode ser ignorada pelo botão de voltar.');assert.equal(legacySkips,0);
context.activeCardBlessings.push(ascOffer[0]);
for(let attempt=0;attempt<30;attempt++)assert.ok(context.rollCardOffer(3).every(item=>item.deityId!=='zeus'),'Zeus reapareceu após o compromisso 3/3.');

context.activeCardBlessings=[
  card('zeus_chain_lightning'),card('zeus_static_charge'),
  card('ares_blood_mark'),card('hecate_hex'),card('selene_moonbeam'),
  card('moros_thread'),card('atena_aegis'),card('hermes_momentum'),
];
const focused=context.rollCardOffer(3);
assert.equal(focused.deityId,'zeus','A proteção contra azar não priorizou a única afinidade em 2/3.');
assert.equal(focused.affinityFocus,true,'A oferta protegida não foi identificada para a interface.');

// Co-op: a escolha é compartilhada mesmo com P2 caído e nunca o ressuscita por acidente.
{
  const p1=hero(),p2=hero({idx:1,hp:0,dead:true});resetWorld([p1,p2]);
  const selected=card('zeus_chain_lightning');
  context.pickCard(selected,{classList:{add(){},toggle(){}}});context.confirmCardOffer();
  assert.ok(p1.cardEffects.boons.zeus_chain_lightning,'P1 não recebeu a escolha compartilhada.');
  assert.ok(p2.cardEffects.boons.zeus_chain_lightning,'P2 caído perdeu a escolha compartilhada.');
  assert.equal(p2.hp,0);assert.equal(p2.dead,true,'Aplicar uma bênção ressuscitou P2 indevidamente.');
}
{
  const p1=hero(),p2=hero({idx:1});resetWorld([p1,p2]);add(p1,card('moros_omen',4));add(p2,card('moros_omen',4));
  randomValue=.01;const offer=context.rollCardOffer(3);
  assert.ok(offer.some(item=>item.rarityIndex>=2),'Presságio Lendário não garantiu uma oferta Rara.');
  assert.equal(p1.cardEffects.omenGuarantee,0);assert.equal(p2.cardEffects.omenGuarantee,0,'A cópia compartilhada de P2 duplicou a garantia de Presságio.');
}

// Correções de balanceamento e edge cases das bênçãos normais.
{
  const pl=hero(),normal=enemy({hp:10,maxHp:100}),scaledNormal=enemy({hp:40,maxHp:400,type:'goblin'}),elite=enemy({hp:10,maxHp:100,elite:true}),boss=enemy({hp:10,maxHp:100,isBoss:true});
  resetWorld([pl],[normal,scaledNormal,elite,boss]);add(pl,card('ares_execution'));
  attack(pl,normal,1);assert.equal(normal.dead,true,'Sem Misericórdia não executou um inimigo comum abaixo do limiar.');
  attack(pl,scaledNormal,1);assert.equal(scaledNormal.dead,true,'Escalonamento de HP transformou um inimigo comum em elite por engano.');
  attack(pl,elite,1);assert.equal(elite.dead,false,'Sem Misericórdia executou uma elite instantaneamente.');
  attack(pl,boss,1);assert.equal(boss.dead,false,'Sem Misericórdia executou um chefe instantaneamente.');
}
{
  const pl=hero(),target=enemy();resetWorld([pl],[target]);add(pl,card('poseidon_tide',4));
  for(let index=0;index<14;index++)hit(pl,target);
  assert.ok(pl.cardEffects.poseidonTide<.30,'Maré Crescente encheu cedo demais.');
  hit(pl,target);approximately(pl.cardEffects.poseidonTide,.30);
  clock+=4000;context.updateBlessingEffects(pl,1);assert.ok(pl.cardEffects.poseidonTide<.30,'Maré Crescente não decaiu após quebrar o ritmo.');
}
{
  const pl=hero(),target=enemy();resetWorld([pl],[target]);add(pl,card('poseidon_tide',4),ascCard('poseidon_asc_raging_seas'));
  for(let index=0;index<5;index++)hit(pl,target);approximately(pl.cardEffects.poseidonTide,.10);
  clock+=4000;context.updateBlessingEffects(pl,1);approximately(pl.cardEffects.poseidonTide,.05);
  for(let index=0;index<13;index++)hit(pl,target);approximately(pl.cardEffects.poseidonTide,.30);
  clock+=4000;context.updateBlessingEffects(pl,1);approximately(pl.cardEffects.poseidonTide,.30);
}
{
  const pl=hero({hp:50});resetWorld([pl]);add(pl,card('selene_moon_harvest'));
  for(let index=0;index<5;index++)kill(pl);approximately(pl.hp,50);
  kill(pl);approximately(pl.hp,51.2);
  const lunar=hero({hp:50});resetWorld([lunar]);add(lunar,card('selene_moon_harvest'),card('selene_lunar_cycle'));
  lunar.cardEffects.selenePhase=1;for(let index=0;index<2;index++)kill(lunar);approximately(lunar.hp,50);
  kill(lunar);approximately(lunar.hp,51.2);
}
{
  const first=hero(),second=hero();resetWorld([first,second]);
  add(first,card('sauron_ring',3),card('sauron_corruption',3));
  add(second,card('sauron_corruption',3),card('sauron_ring',3));
  approximately(first.maxHp,second.maxHp);approximately(first.maxHp,83.25);
}
{
  const pl=hero({hp:25});resetWorld([pl]);
  add(pl,card('selene_eclipse',4),card('ents_bark',4));pl.cardEffects.seleneEclipse=true;pl.cardEffects.entBark=.20;
  approximately(context.getBlessingIncomingDamageMultiplier(pl),.60);
  add(pl,card('ents_roots',4),card('ents_resilience',4),card('hercules_berserk',4));
  pl.cardEffects.entResilienceUntil=clock+1000;
  approximately(context.getBlessingIncomingDamageMultiplier(pl),.25);
}
{
  const pl=hero(),target=enemy();resetWorld([pl],[target]);add(pl,card('hecate_triple_path'));
  context.notifyBlessingAttack(pl,target,20,null);context.notifyBlessingDash(pl);
  context.notifyBlessingAttack(pl,target,20,{type:'mage_arcane_staff'});
  assert.ok(pl.cardEffects.hecateTripleUntil>clock,'Hécate não reconheceu o golpe após dash como ação controlável.');
  const firstUntil=pl.cardEffects.hecateTripleUntil;
  context.notifyBlessingAttack(pl,target,20,{type:'mage_arcane_staff'});
  assert.equal(pl.cardEffects.hecateTripleUntil,firstUntil+1200,'A terceira fonte não prolongou Caminhos Cruzados uma única vez.');
  context.notifyBlessingAttack(pl,target,20,{type:'mage_fire_staff'});
  assert.equal(pl.cardEffects.hecateTripleUntil,firstUntil+1200,'Fontes automáticas renovaram Caminhos Cruzados indefinidamente.');
}
{
  const pl=hero(),target=enemy();resetWorld([pl],[target]);add(pl,card('atena_tactical_mark'));
  for(let index=0;index<6;index++)hit(pl,target);
  context.notifyBlessingAttack(pl,target,20,{type:'mage_arcane_staff'});
  approximately(context.applyCardCrit(pl,20,target,{type:'mage_arcane_staff'}),20);
  context.notifyBlessingDash(pl);context.notifyBlessingAttack(pl,target,20,{type:'mage_arcane_staff'});
  assert.ok(context.applyCardCrit(pl,20,target,{type:'mage_arcane_staff'})>20,'Brecha Tática não foi consumida pelo ataque após dash.');
}
{
  const pl=hero(),main=enemy(),other=enemy({x:50});resetWorld([pl],[main,other]);add(pl,card('dionisio_blackout'));
  for(let index=0;index<8;index++)kill(pl);approximately(other.hp,other.maxHp);
  kill(pl);assert.ok(other.hp<other.maxHp,'Apagão ficou morto sem Euforia.');
}
{
  const pl=hero();resetWorld([pl]);add(pl,card('dionisio_double_toast'));
  context.applyCardWaveRegen();context.updateBlessingEffects(pl,.016);
  assert.equal(pl.cardEffects.tempBuffs.length,1,'Brinde Duplo ficou sem efeito próprio fora de uma build de Euforia.');
}
{
  const pl=hero(),target=enemy();resetWorld([pl],[target]);add(pl,card('poseidon_crush'));
  for(let index=0;index<3;index++)hit(pl,target);approximately(target.hp,target.maxHp);
  hit(pl,target);assert.ok(target.hp<target.maxHp,'Pressão Abissal ficou morta sem outra bênção de onda.');
}
{
  const pl=hero(),target=enemy(),first={type:'mage_fire_staff'},second={type:'mage_ice_staff'};resetWorld([pl],[target]);add(pl,card('hefesto_overheat'));
  for(let index=0;index<9;index++)hit(pl,target,20,index%2?first:second);
  approximately(target.hp,target.maxHp);
  for(let index=0;index<9;index++)hit(pl,target,20,first);
  assert.ok(target.hp<target.maxHp,'Superaquecimento confundiu armas automáticas diferentes ou deixou de aquecer a mesma arma.');
}
{
  const pl=hero(),target=enemy();resetWorld([pl],[target]);add(pl,card('hermes_quicksilver'));
  hit(pl,target);approximately(pl._dashCd,965);
}
{
  const pl=hero(),target=enemy();resetWorld([pl],[target]);add(pl,card('hercules_kill_chain'));
  pl.cardEffects.herculesKillChain=3;pl.cardEffects.herculesLastKill=clock;
  assert.ok(context.__DEITY_BLESSING_DEBUG__.dynamicDamageBonusV4(pl,target,null)>0);
  clock+=3000;approximately(context.__DEITY_BLESSING_DEBUG__.dynamicDamageBonusV4(pl,target,null),0);
}
{
  const pl=hero();resetWorld([pl]);add(pl,card('zeus_storm_mark'));
  assert.ok(pl.cardEffects.critChance>0,'Uma bênção centrada em crítico não concedeu chance própria de ativação.');
}
{
  const pl=hero(),target=enemy();resetWorld([pl],[target]);add(pl,card('artemis_mark_prey'));
  hit(pl,target);for(let index=0;index<4;index++)attack(pl,target);
  assert.equal(pl._lastAttackWasCrit,false,'Marca da Caçada garantiu crítico um acerto cedo demais.');
  attack(pl,target);assert.equal(pl._lastAttackWasCrit,true,'Marca da Caçada falhou no sexto acerto.');
  assert.equal(pl.cardEffects.artemisPreyHits,0,'Marca da Caçada começou a próxima sequência deslocada em um acerto.');
}
{
  const pl=hero(),slowProjectileTarget=enemy(),laterTarget=enemy({x:60});resetWorld([pl],[slowProjectileTarget,laterTarget]);add(pl,card('moros_fated_crit',4));
  for(let index=0;index<4;index++){context.notifyBlessingAttack(pl,laterTarget,20);context.applyCardCrit(pl,20,laterTarget);}
  context.notifyBlessingAttack(pl,slowProjectileTarget,20);
  context.notifyBlessingAttack(pl,laterTarget,20);context.applyCardCrit(pl,20,laterTarget);
  context.applyCardCrit(pl,20,slowProjectileTarget);
  assert.equal(pl._lastAttackWasCrit,true,'Um projétil lento perdeu o crítico garantido quando outro ataque foi disparado antes do impacto.');
}
{
  const pl=hero(),manualAim={x:80,y:10,_manualAim:true,dead:true},realTarget=enemy({x:80});resetWorld([pl],[realTarget]);add(pl,ascCard('nazgul_asc_witch_king'));
  context.notifyBlessingDash(pl);context.notifyBlessingAttack(pl,manualAim,20);context.applyCardCrit(pl,20,realTarget);
  assert.equal(pl._lastAttackWasCrit,true,'O modo de mira manual perdeu o crítico preparado no dash.');
}
{
  const pl=hero(),boss=enemy({isBoss:true,hp:1000,maxHp:1000});resetWorld([pl],[boss]);add(pl,ascCard('ares_asc_god_of_war'));
  context.notifyBlessingAttack(pl,boss,500,null);hit(pl,boss,500);
  assert.ok(pl.cardEffects.aresAscUntil>clock,'Dano contra chefe não alimentou um gatilho baseado em eliminações.');
}

// Toda Ascensão precisa produzir um efeito observável sem qualquer outra bênção.
const ascensionCases={
  zeus_asc_storm_avatar(){const pl=hero(),main=enemy(),other=enemy({x:55});resetWorld([pl],[main,other]);add(pl,ascCard(this.id));for(let i=0;i<6;i++)hit(pl,main);assert.ok(other.hp<other.maxHp);},
  zeus_asc_olympian_judgment(){const pl=hero(),other=enemy();resetWorld([pl],[other]);add(pl,ascCard(this.id));for(let i=0;i<20;i++)kill(pl);assert.ok(other.hp<other.maxHp);},
  ares_asc_god_of_war(){const pl=hero();resetWorld([pl]);add(pl,ascCard(this.id));for(let i=0;i<4;i++)kill(pl);assert.ok(pl.cardEffects.aresAscUntil>clock);},
  ares_asc_blood_banquet(){const pl=hero({hp:50}),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));for(let i=0;i<5;i++)hit(pl,main);assert.ok(pl.hp>50&&main.hp<main.maxHp);},
  hecate_asc_triple_goddess(){const pl=hero(),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));context.notifyBlessingAttack(pl,main,20,null);context.notifyBlessingDash(pl);context.notifyBlessingAttack(pl,main,20,{type:'mage_arcane_staff'});assert.ok(pl.cardEffects.hecateAscTripleUntil>clock);},
  hecate_asc_endless_night(){const pl=hero(),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));for(let i=0;i<7;i++)hit(pl,main);assert.ok(main.hp<main.maxHp);},
  selene_asc_blood_moon(){const pl=hero(),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));context.updateBlessingEffects(pl,.016);assert.ok(main.hp<main.maxHp);},
  selene_asc_eternal_eclipse(){const pl=hero({hp:40}),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));assert.ok(context.applyCardCrit(pl,20,main)>20);assert.ok(context.getBlessingIncomingDamageMultiplier(pl)<1);},
  moros_asc_sealed_fate(){const pl=hero(),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));for(let i=0;i<6;i++){context.notifyBlessingAttack(pl,main,20);context.applyCardCrit(pl,20,main);}context.notifyBlessingAttack(pl,main,20);const dealt=context.applyCardCrit(pl,20,main);hit(pl,main,dealt);assert.equal(pl._lastAttackWasCrit,true);assert.ok(main.hp<main.maxHp);},
  moros_asc_rewrite_fate(){const pl=hero({hp:0});resetWorld([pl]);add(pl,ascCard(this.id));assert.equal(context.shouldBlessingPreventDeath(pl),true);assert.ok(pl.hp>0&&pl.cardEffects.morosFatebreakHits===3);},
  atena_asc_absolute_aegis(){const pl=hero(),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));context.notifyBlessingDash(pl);context.notifyBlessingAttack(pl,main,20);assert.ok(context.applyCardCrit(pl,20,main)>20);},
  atena_asc_strategos(){const pl=hero();resetWorld([pl]);add(pl,ascCard(this.id));for(let i=0;i<10;i++)kill(pl);assert.equal(pl.cardEffects.athenaMedals,1);},
  hermes_asc_divine_speed(){const pl=hero(),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));context.notifyBlessingDash(pl);for(let i=0;i<2;i++){context.notifyBlessingAttack(pl,main,20);context.notifyBlessingDash(pl);}assert.ok(pl.cardEffects.hermesAscFlowUntil>clock);assert.ok(context.getBlessingAttackSpeedBonus(pl)>0);},
  hermes_asc_afterimage_army(){const pl=hero(),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));context.notifyBlessingDash(pl);hit(pl,main);assert.equal(pl.cardEffects.hermesAfterimages,1);assert.ok(main.hp<main.maxHp);},
  dionisio_asc_endless_party(){const pl=hero();resetWorld([pl]);add(pl,ascCard(this.id));for(let i=0;i<5;i++)kill(pl);assert.equal(pl.cardEffects.tempBuffs.length,1);},
  dionisio_asc_delirium(){const pl=hero(),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));for(let i=0;i<5;i++)hit(pl,main);assert.ok(main.hp<main.maxHp);},
  hefesto_asc_living_forge(){const pl=hero(),main=enemy(),weapon={type:'mage_arcane_staff'};resetWorld([pl],[main]);add(pl,ascCard(this.id));for(let i=0;i<7;i++)hit(pl,main,20,weapon);assert.ok(main.hp<main.maxHp);},
  hefesto_asc_vulcan_hammer(){const pl=hero(),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));for(let i=0;i<7;i++)hit(pl,main);assert.ok(main.hp<main.maxHp);},
  artemis_asc_wild_hunt(){const pl=hero(),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));hit(pl,main);for(let i=0;i<5;i++)attack(pl,main);assert.equal(pl._lastAttackWasCrit,true);},
  artemis_asc_moon_arrow(){const pl=hero(),main=enemy(),other=enemy({x:55});resetWorld([pl],[main,other]);add(pl,ascCard(this.id));for(let i=0;i<4;i++)hit(pl,main);assert.ok(other.hp<other.maxHp);},
  poseidon_asc_tsunami(){const pl=hero(),main=enemy(),other=enemy({x:50});resetWorld([pl],[main,other]);add(pl,ascCard(this.id));for(let i=0;i<7;i++)hit(pl,main);assert.ok(other.hp<other.maxHp);},
  poseidon_asc_raging_seas(){const pl=hero(),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));for(let i=0;i<10;i++)hit(pl,main);context.notifyBlessingDash(pl);assert.ok(main.hp<main.maxHp);},
  hercules_asc_demigod(){const pl=hero(),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));for(let i=0;i<7;i++)attack(pl,main);assert.ok(main.hp<main.maxHp-140);},
  hercules_asc_thirteenth_labor(){const pl=hero();resetWorld([pl]);add(pl,ascCard(this.id));kill(pl,{elite:true,maxHp:350});assert.equal(pl.cardEffects.heroicMarks,1);assert.ok(pl.maxHp>100);},
  sauron_asc_one_ring(){const pl=hero();resetWorld([pl]);add(pl,ascCard(this.id));approximately(pl.maxHp,85);},
  sauron_asc_dark_lord(){const pl=hero(),other=enemy();resetWorld([pl],[other]);add(pl,ascCard(this.id));for(let i=0;i<5;i++)kill(pl);assert.ok(pl.cardEffects.sauronDarkGrowth>0&&other.hp<other.maxHp);},
  nazgul_asc_nine(){const pl=hero(),other=enemy();resetWorld([pl],[other]);add(pl,ascCard(this.id));for(let i=0;i<9;i++)kill(pl);assert.ok(other.hp<other.maxHp);},
  nazgul_asc_witch_king(){const pl=hero(),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));context.notifyBlessingDash(pl);context.notifyBlessingAttack(pl,main,20);context.applyCardCrit(pl,20,main);assert.equal(pl._lastAttackWasCrit,true);assert.ok(pl._dashCd<1000);},
  ents_asc_awakened_forest(){const pl=hero({hp:50}),main=enemy();resetWorld([pl],[main]);add(pl,ascCard(this.id));context.updateBlessingEffects(pl,.016);assert.ok(pl.hp>50&&main.hp<main.maxHp);},
  ents_asc_last_shepherd(){const pl=hero();resetWorld([pl]);add(pl,ascCard(this.id));context.applyCardWaveRegen();assert.ok(pl.maxHp>100&&pl.cardEffects.entShepherdDefense>0);},
};
assert.deepEqual(new Set(Object.keys(ascensionCases)),new Set(allAscensions.map(item=>item.id)),'A suíte não cobre exatamente as 30 Ascensões.');
for(const [id,exercise] of Object.entries(ascensionCases)){
  try{exercise.call({id});}catch(error){error.message=`${id}: ${error.message}`;throw error;}
}

// Contratos usados pelo Necromante e sincronização idempotente após reviver.
{
  const pl=hero({classId:'necromancer'}),main=enemy();resetWorld([pl],[main]);
  add(pl,card('sauron_corruption'),card('moros_inevitable'),ascCard('ares_asc_god_of_war'));
  pl.cardEffects.morosPity=.10;pl.cardEffects.aresAscUntil=clock+1000;
  assert.ok(context.getBlessingAttackSpeedBonus(pl)>0,'Invocações não herdaram velocidade de ataque.');
  assert.ok(context.getBlessingCritChance(pl)>=.10,'Invocações não herdaram crítico/piedade.');
  assert.ok(context.applyBlessingSummonDamage(pl,main,20,{summoned:true,didCrit:true,weaponType:'skeleton'})>20,'Invocações não herdaram dano dinâmico.');
  assert.equal(pl.cardEffects.currentSource,'summon','A origem da invocação não foi exposta aos gatilhos de Hécate/Atena.');
  const maxHp=pl.maxHp;context.syncDeityBlessings(pl);context.syncDeityBlessings(pl);approximately(pl.maxHp,maxHp);
}
{
  const pl=hero({classId:'necromancer'}),boss=enemy({isBoss:true,hp:1000,maxHp:1000});resetWorld([pl],[boss]);add(pl,ascCard('ares_asc_god_of_war'));
  context.notifyBlessingSummonDamageResolved(pl,boss,500,{summoned:true,weaponType:'skeleton'});
  assert.ok(pl.cardEffects.aresAscUntil>clock,'Dano de invocação contra chefe perdeu créditos de combate por causa do coeficiente de proc.');
}

console.log('OK: 15 divindades, 75 bênçãos, 30 Ascensões standalone e fluxos de combate/co-op/chefes/invocações validados por comportamento.');
