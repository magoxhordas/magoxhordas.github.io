import fs from 'node:fs';
import vm from 'node:vm';

const dataSource=fs.readFileSync(new URL('../src/blessings/blessing-data.js',import.meta.url),'utf8');
const legacySource=fs.readFileSync(new URL('../src/blessings/blessing-system.js',import.meta.url),'utf8');
const affinitySource=fs.readFileSync(new URL('../src/blessings/blessing-affinity-system.js',import.meta.url),'utf8');
const codexSource=fs.readFileSync(new URL('../src/ui/menu-codex-system.js',import.meta.url),'utf8');
const indexSource=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
let currentTime=10000;
const emptyNode=()=>({classList:{add(){},remove(){},toggle(){}},setAttribute(){},appendChild(){},focus(){},style:{},dataset:{},querySelector:()=>null,firstElementChild:null});
const context={
  console,WeakMap,Set,Map,Object,Array,Number,String,Math,JSON,
  performance:{now:()=>currentTime},setTimeout:()=>0,clearTimeout(){},
  document:{readyState:'loading',addEventListener(){},getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>null,createElement:emptyNode,head:emptyNode(),body:emptyNode()},
  activeCardBlessings:[],player:null,player2:null,gameMode:1,wave:1,W:800,H:600,parts:[],enemies:[],
  bossOrc:null,bossSkel:null,bossSpider:null,bossMajor:null,petBoss:null,
  CampProgressionSystem:{damageBonus:()=>0},getCampaignShopDamageBonus:()=>0,getCampaignShopCritBonus:()=>0,campaignModifyOutgoingDamage:(_p,_t,d)=>d,
  rollCardRarity:()=> 'comum',rollCardOffer(){},openDeityIntro(_id,offers){context.revealCardOffers(offers);},revealCardOffers(){},renderCardOffers(){},pickCard(){},openCardOffer(){},closeCardOffer(){},
  applyCardWaveRegen(){},applyCardLifesteal(){},applyCardCrit(_pl,damage){return damage;},resetCardBlessings(){},
  hideAllScreens(){},updateBlessingsHUD(){},healCampaignPlayer(pl,amount){pl.hp=Math.min(pl.maxHp,pl.hp+amount);},spawnParts(){},spawnLevelUpNotice(){},notifyCampaignShopTargetKilled(){},
  allTargets:list=>list,cardOfferOpen:false,state:'playing'
};
context.window=context;vm.createContext(context);
vm.runInContext(dataSource,context,{filename:'blessing-data.js'});
vm.runInContext(legacySource,context,{filename:'blessing-system.js'});
vm.runInContext(affinitySource,context,{filename:'blessing-affinity-system.js'});

const deities=context.DEITY_BLESSINGS_V4;
const debug=context.__BLESSING_AFFINITY_DEBUG__;
const rarities=context.DEITY_BLESSING_RARITIES;
assert(Array.isArray(deities)&&deities.length===15,'1. Devem existir exatamente 15 divindades.');
assert(deities.every(deity=>deity.boons.length===5),'2. Cada divindade deve possuir exatamente 5 bênçãos normais.');
const all=deities.flatMap(deity=>deity.boons);
assert(all.length===75,'3. Devem existir exatamente 75 bênçãos normais.');
assert(deities.every(deity=>deity.progression.ascensions.length===2),'4. Cada divindade deve possuir exatamente 2 Ascensões.');
assert(deities.reduce((total,deity)=>total+deity.progression.ascensions.length,0)===30,'5. Devem existir exatamente 30 Ascensões.');
assert(new Set(all.map(boon=>boon.id)).size===75,'Há IDs de bênção repetidos.');
assert(rarities.length===5&&rarities.map(r=>r.id).join(',')==='comum,incomum,rara,epica,lendaria','As cinco raridades devem continuar disponíveis.');

const allowedHooks=new Set(['apply','offer','attack','hit','kill','dash','damage','dodge','lethal','wave','update']);
for(const deity of deities){
  assert(Array.isArray(deity.progression.resonance)&&deity.progression.resonance.length===2,`${deity.id}: Ressonância ausente.`);
  assert(Array.isArray(deity.progression.apotheosis)&&deity.progression.apotheosis.length===2,`${deity.id}: Apoteose ausente.`);
  for(const boon of deity.boons){
    assert(Array.isArray(boon.values)&&boon.values.length===5,`${boon.id}: faltam valores das cinco raridades.`);
    assert(Array.isArray(boon.hooks)&&boon.hooks.length>0,`${boon.id}: não informa evento real de gameplay.`);
    assert(boon.hooks.every(hook=>allowedHooks.has(hook)),`${boon.id}: depende de comando inexistente.`);
    assert(affinitySource.includes(`'${boon.id}'`),`15. ${boon.id} está apenas no catálogo e não possui implementação no motor.`);
  }
}

const materialize=(deity,index)=>debug.materialize(deity,deity.boons[index],'comum');
const hero=index=>({idx:index,classId:index?'warrior':'mage',x:20+index*30,y:20,hp:100,maxHp:100,dmg:10,speed:100,atkCd:1000,_dashCd:1000,_dashMaxCd:2000,cardEffects:{},inv:false,invT:0,dead:false});

// Smoke mecanico: cada uma das 75 cartas atravessa todos os eventos de uma
// partida normal. Isso detecta implementacoes que existem no texto, mas falham
// quando ataque, acerto, dash, dano, eliminacao, update e onda acontecem.
for(const deity of deities)for(let index=0;index<deity.boons.length;index++){
  const unit=hero(0),card=materialize(deity,index),target={x:55,y:20,hp:800,maxHp:800,dead:false,takeDmg(amount){this.hp-=amount;if(this.hp<=0)this.dead=true;}};
  context.player=unit;context.player2=null;context.gameMode=1;context.enemies=[target];debug.applyBoon(unit,card);
  const cooldown=context.notifyBlessingAttack(unit,target,10,{type:'auto',rarity:'common'});const dealt=context.applyCardCrit(unit,10,target,{type:'auto',rarity:'common'});
  assert(Number.isFinite(cooldown)&&Number.isFinite(dealt),`15. ${card.id} quebrou o ataque automático.`);
  context.notifyBlessingHit(unit,target,dealt,{type:'auto',rarity:'common'});context.notifyBlessingDash(unit);context.getBlessingIncomingDamageMultiplier(unit);context.notifyBlessingDamageTaken(unit,8);context.shouldBlessingDodge(unit);
  currentTime+=2200;context.updateBlessingEffects(unit,.016);target.hp=0;target.dead=true;context.notifyBlessingKill(unit,target,{type:'auto'});context.applyCardWaveRegen();
}
context.activeCardBlessings=[];context.enemies=[];

context.activeCardBlessings.push(materialize(deities[0],0));
for(let i=0;i<120;i++)assert(!context.rollCardOffer(3).some(card=>card.id===deities[0].boons[0].id),'6. Uma bênção adquirida reapareceu na mesma run.');
context.activeCardBlessings=[];

const p1=hero(0);context.player=p1;const zeus=deities.find(deity=>deity.id==='zeus');
debug.applyBoon(p1,materialize(zeus,0));context.activeCardBlessings.push(materialize(zeus,0));
debug.applyBoon(p1,materialize(zeus,1));context.activeCardBlessings.push(materialize(zeus,1));
assert(debug.godState(p1,'zeus').resonance,'7. Duas bênçãos não ativaram a Ressonância.');
debug.applyBoon(p1,materialize(zeus,2));context.activeCardBlessings.push(materialize(zeus,2));
assert(debug.ascensionQueueSize===1&&!debug.godState(p1,'zeus').ascension,'8. A terceira bênção não abriu a escolha de Ascensão.');
assert(debug.eligibleDeities().some(deity=>deity.id==='zeus'),'9. O deus desapareceu logo após a Ascensão.');
assert(debug.chooseAscension(p1,'zeus','avatar'),'A escolha de Ascensão não foi registrada.');debug.flushAscensions();
debug.applyBoon(p1,materialize(zeus,3));context.activeCardBlessings.push(materialize(zeus,3));
assert(debug.godState(p1,'zeus').evolved,'10. A quarta bênção não evoluiu a Ascensão.');
debug.applyBoon(p1,materialize(zeus,4));context.activeCardBlessings.push(materialize(zeus,4));
assert(debug.godState(p1,'zeus').apotheosis,'11. A quinta bênção não ativou a Apoteose.');
assert(!debug.eligibleDeities().some(deity=>deity.id==='zeus'),'12. Zeus continuou nas ofertas depois de cinco bênçãos.');

const p2=hero(1);context.player2=p2;context.gameMode=2;const ares=deities.find(deity=>deity.id==='ares');
debug.applyBoon(p2,materialize(ares,0));debug.applyBoon(p2,materialize(ares,1));
assert(debug.godState(p2,'ares').resonance,'14. A Ressonância do P2 não foi ativada.');
assert(debug.godState(p1,'ares').count===0,'14. O progresso do P2 vazou para o P1.');
assert(debug.godState(p2,'zeus').count===0,'14. O progresso do P1 vazou para o P2.');

const dummy={x:40,y:20,hp:500,maxHp:500,dead:false,takeDmg(amount){this.hp-=amount;if(this.hp<=0)this.dead=true;}};context.enemies=[dummy];
assert(Number.isFinite(context.notifyBlessingAttack(p1,dummy,10,{type:'auto'})),'O gancho de ataque automático não retornou multiplicador válido.');
assert(Number.isFinite(context.applyCardCrit(p1,10,dummy,{type:'auto'})),'O cálculo de dano das bênçãos falhou.');
context.notifyBlessingHit(p1,dummy,10,{type:'auto'});context.notifyBlessingDash(p1);context.notifyBlessingDamageTaken(p1,5);context.updateBlessingEffects(p1,.016);context.applyCardWaveRegen();

const catalogText=all.map(boon=>`${boon.name} ${boon.desc} ${boon.type}`).join(' ').toLowerCase();
assert(!/(troca manual|trocar manualmente|alternar arma|weapon switch)/.test(catalogText),'16. Há mecânica dependente de troca manual de arma.');
assert(!affinitySource.includes('crossDeityCombo')&&!dataSource.includes('duoBoon'),'18. Combinações entre deuses não pertencem a esta versão.');
assert(codexSource.includes('window.DEITY_BLESSINGS_V4')&&codexSource.includes('progression.resonance')&&codexSource.includes('progression.ascensions')&&codexSource.includes('progression.apotheosis'),'O Códex não apresenta toda a progressão V4 de Ressonância, Ascensão e Apoteose.');
assert((indexSource.match(/class="[^"]*paired-action-btn/g)||[]).length===4,'Os quatro botões finais devem compartilhar exatamente o mesmo componente de dimensões.');
assert(!indexSource.includes("'⚔ INICIAR BATALHA'")&&!indexSource.includes('data-pixel-icon="sword" data-pixel-size="22"></span> INICIAR BOSS RUSH'),'Os botões finais ainda possuem ícones.');

context.activeCardBlessings=[materialize(zeus,0)];debug.root(p1).aresRetaliation=4;debug.root(p2).nazgulTerror=3;context.resetCardBlessings();
assert(context.activeCardBlessings.length===0,'13. O reinício não limpou as bênçãos.');
for(const pl of [p1,p2]){const state=debug.root(pl);assert(Object.keys(state.boons).length===0&&Object.keys(state.gods).length===0&&state.delayed.length===0&&state.zones.length===0,'13. O reinício não limpou progressão ou cargas temporárias.');}

console.log('OK: 18 requisitos validados — 15 deuses, 75 bênçãos, 30 Ascensões, progressão 2/3/4/5, P1/P2 isolados e combate automático.');
