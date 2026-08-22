import fs from 'node:fs';
import vm from 'node:vm';

const dataSource=fs.readFileSync(new URL('../src/blessings/blessing-data.js',import.meta.url),'utf8');
const systemSource=fs.readFileSync(new URL('../src/blessings/blessing-system.js',import.meta.url),'utf8');
const source=`${dataSource}\n${systemSource}`;
if(!dataSource.includes('const NEW_DEITY_BOONS=')||!systemSource.includes('dynamicDamageBonusV3')){
  throw new Error('Módulos de dados e execução das bênçãos não foram encontrados.');
}

let now=10000;
const context={
  console,WeakMap,Set,Object,Array,Number,String,Math,
  performance:{now:()=>now},setTimeout:(fn)=>fn(),clearTimeout(){},
  window:{},document:{getElementById:()=>null,querySelectorAll:()=>[]},
  activeCardBlessings:[],player:null,player2:null,gameMode:1,wave:1,
  enemies:[],bossOrc:null,bossSkel:null,bossSpider:null,bossMajor:null,petBoss:null,
  rollCardRarity(){},rollCardOffer(){},openDeityIntro(){},revealCardOffers(){},openCardOffer(){},
  renderCardOffers(){},pickCard(){},resetCardBlessings(){},applyCardCrit(){},applyCardLifesteal(){},
  applyCardWaveRegen(){},getCampaignShopDamageBonus:()=>0,getCampaignShopCritBonus:()=>0,
  notifyCampaignShopTargetKilled(){},updateBlessingsHUD(){},healCampaignPlayer(){},
  spawnParts(){},spawnLevelUpNotice(){},hideAllScreens(){},allTargets:list=>list,
};
context.window=context;
vm.createContext(context);
vm.runInContext(dataSource,context,{filename:'blessing-data.js'});
vm.runInContext(systemSource,context,{filename:'blessing-system.js'});

const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const deities=context.DEITY_BLESSINGS_V2;
const rarities=context.DEITY_BLESSING_RARITIES;
assert(Array.isArray(deities)&&deities.length===15,`Esperadas 15 divindades; recebido ${deities?.length}.`);
assert(Array.isArray(rarities)&&rarities.length===5,'As cinco raridades das bênçãos não foram exportadas.');
assert(rarities.map(item=>item.id).join(',')==='comum,incomum,rara,epica,lendaria','Ordem de raridades incorreta.');

const all=deities.flatMap(deity=>{
  assert(deity.boons.length===5,`${deity.name} não possui exatamente cinco bênçãos.`);
  return deity.boons;
});
assert(all.length===75,`Esperadas 75 bênçãos; recebido ${all.length}.`);
assert(new Set(all.map(boon=>boon.id)).size===75,'Existem IDs de bênçãos duplicados.');
for(const boon of all){
  assert(Array.isArray(boon.values)&&boon.values.length===5,`${boon.id} não possui cinco valores de raridade.`);
  assert(source.split(`'${boon.id}'`).length-1>=2,`${boon.id} está no catálogo, mas não possui gancho explícito no motor.`);
}

const raw=id=>all.find(boon=>boon.id===id);
const card=(id,index=0)=>({...raw(id),rarity:rarities[index].id,rarityIndex:index,value:raw(id).values[index]});
const hero=()=>({idx:0,classId:'mage',x:10,y:10,hp:100,maxHp:100,speed:100,atkCd:1000,_dashCd:1000,_dashMaxCd:2000,cardEffects:{},inv:false,invT:0});

const zeus=hero();
context.applyDeityBoon(zeus,card('zeus_overload',0));
const dummy={x:30,y:10,hp:100,maxHp:100,dead:false};
for(let i=0;i<6;i++)context.notifyBlessingHit(zeus,dummy,10,null);
assert(zeus.cardEffects.zeusOverloadReady===.40,'Sobrecarga de Zeus não carregou após seis acertos comuns.');
context.notifyBlessingAttack(zeus,dummy,10,null);
assert(context.__DEITY_BLESSING_DEBUG__.dynamicDamageBonusV3(zeus,dummy,null)>=.40,'Sobrecarga de Zeus não fortaleceu o ataque seguinte.');

const moros=hero();moros.hp=-10;
context.applyDeityBoon(moros,card('moros_delayed_fate',4));
assert(context.shouldBlessingPreventDeath(moros)===true&&moros.hp===10&&moros.invT===1500,'Destino Adiado lendário não evitou dano fatal corretamente.');
assert(context.shouldBlessingPreventDeath(moros)===false,'Destino Adiado ativou mais de uma vez na mesma onda.');

const sauron=hero();
context.applyDeityBoon(sauron,card('sauron_corrupting_power',0));
assert(Math.abs(sauron.maxHp-95)<.001,'Poder Corruptor comum não aplicou a penalidade de 5% de vida.');
assert(context.__DEITY_BLESSING_DEBUG__.dynamicDamageBonusV3(sauron,dummy,null)>=.12,'Poder Corruptor não concedeu o dano prometido.');

context.activeCardBlessings.splice(0,context.activeCardBlessings.length,...deities.filter(d=>d.id!=='hefesto').flatMap(d=>d.boons.map(boon=>({id:boon.id}))));
for(let i=0;i<250;i++){
  const offer=context.rollCardOffer(3);
  const ids=offer.map(item=>item.id);
  assert(!(ids.includes('hefesto_specialist')&&ids.includes('hefesto_perfect_alloy')),'Hefesto ofereceu Especialista e Liga Perfeita juntos.');
}

context.activeCardBlessings.splice(0,context.activeCardBlessings.length,{id:'zeus_overload'});
for(let i=0;i<80;i++)assert(!context.rollCardOffer(3).some(item=>item.id==='zeus_overload'),'Bênção já adquirida reapareceu na oferta.');

console.log('OK: 15 divindades, 75 bênçãos, 5 raridades, efeitos-chave, exclusões e não repetição validados.');
