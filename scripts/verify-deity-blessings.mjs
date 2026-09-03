import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const dataSource=fs.readFileSync(new URL('../src/blessings/blessing-data.js',import.meta.url),'utf8');
const systemSource=fs.readFileSync(new URL('../src/blessings/blessing-system.js',import.meta.url),'utf8');
assert.match(dataSource,/const ASCENSIONS=/,'Catálogo de Ascensões V4 ausente.');
assert.match(systemSource,/ascensionReadyDeity/,'Motor de Ascensão V4 ausente.');

let clock=10000;
const math=Object.create(Math);
math.random=()=>0.01;
const context={
  console,WeakMap,Set,Map,Object,Array,Number,String,Math:math,Date,
  performance:{now:()=>clock},setTimeout:(fn)=>fn(),clearTimeout(){},
  window:{},document:{getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>null},
  activeCardBlessings:[],player:null,player2:null,gameMode:1,wave:1,
  enemies:[],bossOrc:null,bossSkel:null,bossSpider:null,bossMajor:null,petBoss:null,
  applyCardWaveRegen(){},getCampaignShopDamageBonus:()=>0,getCampaignShopCritBonus:()=>0,
  notifyCampaignShopTargetKilled(){},updateBlessingsHUD(){},hideAllScreens(){},
  spawnParts(){},spawnLevelUpNotice(){},healCampaignPlayer(pl,amount){pl.hp=Math.min(pl.maxHp,pl.hp+amount);},
  allTargets:list=>list,CampProgressionSystem:{damageBonus:()=>0},
};
context.window=context;
vm.createContext(context);
vm.runInContext(dataSource,context,{filename:'blessing-data.js'});
vm.runInContext(systemSource,context,{filename:'blessing-system.js'});

const deities=context.DEITY_BLESSINGS_V2;
const ascensions=context.DEITY_BLESSING_ASCENSIONS;
const rarities=context.DEITY_BLESSING_RARITIES;
assert.equal(deities.length,15,'Devem existir 15 divindades.');
assert.equal(rarities.length,5,'Devem existir cinco raridades.');
assert.equal(Object.keys(ascensions).length,15,'Toda divindade precisa de Ascensões.');

const all=deities.flatMap(deity=>{
  assert.equal(deity.boons.length,5,`${deity.name} precisa ter cinco bênçãos.`);
  assert.equal(ascensions[deity.id]?.length,2,`${deity.name} precisa ter duas Ascensões.`);
  return deity.boons;
});
const allAsc=Object.values(ascensions).flat();
assert.equal(all.length,75,'O catálogo precisa ter 75 bênçãos.');
assert.equal(allAsc.length,30,'O catálogo precisa ter 30 Ascensões.');
assert.equal(new Set(all.map(x=>x.id)).size,75,'IDs de bênçãos duplicados.');
assert.equal(new Set(allAsc.map(x=>x.id)).size,30,'IDs de Ascensão duplicados.');
for(const boon of all){
  assert.equal(boon.values.length,5,`${boon.id} não possui cinco valores de raridade.`);
  assert.ok(systemSource.includes(`'${boon.id}'`),`${boon.id} não possui implementação explícita no motor.`);
}
for(const asc of allAsc)assert.ok(systemSource.includes(`'${asc.id}'`),`${asc.id} não possui implementação explícita no motor.`);

const raw=id=>all.find(boon=>boon.id===id);
const deityOf=id=>deities.find(d=>d.boons.some(b=>b.id===id));
const card=(id,index=0)=>{const b=raw(id),d=deityOf(id);return {...b,deityId:d.id,god:d.name,rarity:rarities[index].id,rarityIndex:index,value:b.values[index]};};
const ascCard=id=>{for(const [deityId,list] of Object.entries(ascensions)){const a=list.find(x=>x.id===id);if(a)return {...a,deityId,rarity:'lendaria',rarityIndex:4,value:0,isAscension:true};}throw new Error(id);};
const hero=()=>({idx:0,classId:'mage',x:10,y:10,hp:100,maxHp:100,dmg:20,speed:100,atkCd:1000,_dashCd:1000,_dashMaxCd:2000,range:180,cardEffects:{},inv:false,invT:0,isMoving:false,dead:false});
const target=(x=30,y=10,hp=100)=>({x,y,hp,maxHp:hp,dead:false,takeDmg(amount){this.hp=Math.max(0,this.hp-amount);if(this.hp<=0)this.dead=true;}});

const zeus=hero(),primary=target(30,10),near=target(60,10),far=target(90,10);
context.enemies.splice(0,context.enemies.length,primary,near,far);
context.applyDeityBoon(zeus,card('zeus_chain_lightning',0));
for(let i=0;i<5;i++)context.notifyBlessingHit(zeus,primary,20,null);
assert.ok(near.hp<100,'Corrente Celeste não saltou para um inimigo próximo.');

const hecate=hero();
context.applyDeityBoon(hecate,card('hecate_forbidden',0));
assert.ok(hecate.maxHp<100,'Conhecimento Proibido não cobrou vida máxima.');

const moros=hero();moros.hp=-5;
context.applyDeityBoon(moros,card('moros_delayed_fate',4));
assert.equal(context.shouldBlessingPreventDeath(moros),true,'Destino Adiado não impediu a morte.');
assert.equal(context.shouldBlessingPreventDeath(moros),false,'Destino Adiado ativou duas vezes na mesma onda.');

const nazgul=hero(),nzTarget=target();
context.applyDeityBoon(nazgul,card('nazgul_phantom_blade',4));
nazgul.cardEffects.morosPity=1;
context.applyCardCrit(nazgul,20,nzTarget,null);
assert.ok(nazgul.cardEffects.nazgulPhantomUntil>clock,'Lâmina Fantasma não abriu a janela espectral.');
assert.ok(nazgul._dashCd<1000,'Lâmina Fantasma não reduziu o dash após crítico.');

context.activeCardBlessings.splice(0,context.activeCardBlessings.length,
  card('zeus_chain_lightning'),card('zeus_static_charge'),card('zeus_thunder_dash'));
assert.equal(context.__DEITY_BLESSING_DEBUG__.ascensionReadyDeity(),'zeus','Três bênçãos de Zeus não liberaram Ascensão.');
const ascOffer=context.rollAscensionOffer('zeus');
assert.equal(ascOffer.length,2,'Ascensão deve oferecer dois caminhos.');
assert.ok(ascOffer.every(x=>x.isAscension&&x.deityId==='zeus'),'Oferta de Ascensão trouxe carta incorreta.');

for(let i=0;i<30;i++){
  const offer=context.rollCardOffer(3);
  assert.ok(offer.every(x=>x.deityId!=='zeus'),'Zeus reapareceu em oferta normal após a terceira bênção.');
}

const ascZeus=hero();
context.applyDeityBoon(ascZeus,card('zeus_chain_lightning',0));
context.applyDeityBoon(ascZeus,ascCard('zeus_asc_storm_avatar'));
assert.ok(ascZeus.cardEffects.ascensions.zeus_asc_storm_avatar,'Avatar da Tempestade não foi registrado no jogador.');

console.log('OK: Bênçãos V4 validadas — 15 divindades, 75 bênçãos mecânicas, 30 Ascensões e gatilhos essenciais.');
