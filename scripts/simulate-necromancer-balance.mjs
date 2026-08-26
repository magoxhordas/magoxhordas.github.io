import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const sandbox={window:null,Object,Math,Date,performance:{now:()=>0}};
sandbox.window=sandbox;
vm.createContext(sandbox);
vm.runInContext(read('src/classes/necromancer/necromancer-data.js'),sandbox);
vm.runInContext(read('src/classes/necromancer/necromancer-system.js'),sandbox);
vm.runInContext(read('src/weapons/weapon-data.js'),sandbox);

const {CLASS_DEF,CONFIG}=sandbox.NecromancerData;
const {SPECS,POWER,SPEED}=sandbox.CampaignWeaponData;
const system=sandbox.NecromancerSystem;
const oldClasses={
  mage:{hp:95,dmg:24,speed:132,atk:640,multi:0},
  warrior:{hp:135,dmg:28,speed:118,atk:800,multi:0},
  archer:{hp:80,dmg:15,speed:156,atk:780,multi:1},
  viking:{hp:125,dmg:29,speed:135,atk:780,multi:0},
};
const average=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const ratio=(value,base)=>value/base;
const weaponDps=spec=>spec[4]/(spec[6]/1000);
const oldWeaponDps=Object.fromEntries(Object.keys(oldClasses).map(classId=>[
  classId,average(SPECS[classId].map(weaponDps)),
]));
const oldBasicDps=Object.fromEntries(Object.entries(oldClasses).map(([classId,stats])=>[
  classId,stats.dmg*(1+stats.multi)/(stats.atk/1000),
]));
const oldMeanWeapon=average(Object.values(oldWeaponDps));
const oldMeanBasic=average(Object.values(oldBasicDps));
const necroBasic=CLASS_DEF.baseDmg/(CLASS_DEF.baseAtk/1000);
const scythe=specById('necromancer_soul_scythe');
const grimoire=specById('necromancer_profane_grimoire');

function specById(id){
  const spec=SPECS.necromancer.find(item=>item[0]===id);
  if(!spec)throw new Error(`Arma ausente na simulacao: ${id}`);
  return spec;
}
function summonBaseDps(type){
  const owner={idx:0,classId:'necromancer',x:0,y:0,maxHp:CLASS_DEF.baseHp,dmg:CLASS_DEF.baseDmg,lifeSteal:.15,shopEffects:{}};
  system.resetRun([owner]);
  const summon=system.spawnSummon(owner,type,{duration:10000});
  if(!summon)throw new Error(`Invocacao ausente na simulacao: ${type}`);
  return summon.damage/(summon.attackCd/1000);
}

const summons={
  warrior:summonBaseDps('skeleton_warrior'),
  spirit:summonBaseDps('spirit'),
  reanimated:summonBaseDps('reanimated'),
  deathKnight:summonBaseDps('death_knight'),
};
const rarityDps=rarity=>(POWER[rarity]||1)*(SPEED[rarity]||1);

// Cada cenario usa o mesmo numero de familias de arma da comparacao. A
// utilidade de controle so entra no fim e recebe credito fixo/conservador de
// 12%; o DPS bruto continua exposto separadamente para nao mascarar excesso.
const earlyOld=oldMeanBasic+oldMeanWeapon;
const earlyNecro=necroBasic+weaponDps(scythe);

const midOld=oldMeanBasic+oldMeanWeapon*rarityDps('rare');
const midSummons=2*summons.warrior*POWER.rare*1.10*1.20*1.15*1.05*1.05;
const midNecro=necroBasic+midSummons;

const globalDamage=.20,globalAttackSpeed=.20,globalCrit=.20;
const playerBuildFactor=(1+globalDamage)*(1+globalAttackSpeed)*(1+globalCrit);
const summonBuildFactor=POWER.legendary*1.20*(1+.15+globalAttackSpeed*.30)*(1+globalDamage*.35)*(1+.05+globalCrit*.50);
const fullOld=(oldMeanBasic+3*oldMeanWeapon*rarityDps('legendary'))*playerBuildFactor;
const fullArmyBase=2*summons.warrior*1.10+2*summons.spirit+2*summons.reanimated+summons.deathKnight;
const fullRaw=necroBasic*playerBuildFactor+fullArmyBase*summonBuildFactor;
const fullEffective=fullRaw*1.12;

const grimoireLegendaryFactor=1+.55+1.60/5;
const bossSummons=(2*summons.warrior*1.10+2*summons.spirit)*summonBuildFactor*CONFIG.summonBossDamage;
const bossDirect=(necroBasic+weaponDps(grimoire)*rarityDps('legendary')*grimoireLegendaryFactor)*playerBuildFactor;
const bossNecro=bossDirect+bossSummons;

const results=[
  {test:'A — inicio (30s)',necro:earlyNecro,reference:earlyOld,ratio:ratio(earlyNecro,earlyOld),target:[.90,1.00]},
  {test:'B — meio',necro:midNecro,reference:midOld,ratio:ratio(midNecro,midOld),target:[1.00,1.05]},
  {test:'C — build completa (efetivo)',necro:fullEffective,reference:fullOld,ratio:ratio(fullEffective,fullOld),target:[1.05,1.10]},
  {test:'D — boss sustentado',necro:bossNecro,reference:fullOld,ratio:ratio(bossNecro,fullOld),target:[.85,1.15]},
];

const errors=[];
const requireRange=(label,value,min,max)=>{if(value<min||value>max)errors.push(`${label}: ${(value*100).toFixed(1)}% fora de ${(min*100).toFixed(0)}–${(max*100).toFixed(0)}%`);};
requireRange('vida base',ratio(CLASS_DEF.baseHp,average(Object.values(oldClasses).map(item=>item.hp))),.88,.95);
requireRange('dano direto base',ratio(CLASS_DEF.baseDmg,average(Object.values(oldClasses).map(item=>item.dmg))),.85,.90);
requireRange('velocidade base',ratio(CLASS_DEF.baseSpd,average(Object.values(oldClasses).map(item=>item.speed))),.95,1.00);
for(const result of results)requireRange(result.test,result.ratio,...result.target);
if(CONFIG.globalCoopCap!==12||CONFIG.permanentHardCap!==5||CONFIG.temporaryCap!==3)errors.push('limites de invocacao divergiram do contrato');

console.log('SIMULACAO ANALITICA COM DADOS REAIS — NECROMANTE');
console.table(Object.keys(oldClasses).map(classId=>({
  classe:classId,
  dps_ataque_base:oldBasicDps[classId].toFixed(2),
  media_armas_comuns:oldWeaponDps[classId].toFixed(2),
})));
console.table([
  {metrica:'Vida / media antiga',valor:`${(ratio(CLASS_DEF.baseHp,average(Object.values(oldClasses).map(item=>item.hp)))*100).toFixed(1)}%`,alvo:'88–95%'},
  {metrica:'Dano / media antiga',valor:`${(ratio(CLASS_DEF.baseDmg,average(Object.values(oldClasses).map(item=>item.dmg)))*100).toFixed(1)}%`,alvo:'85–90%'},
  {metrica:'Velocidade / media antiga',valor:`${(ratio(CLASS_DEF.baseSpd,average(Object.values(oldClasses).map(item=>item.speed)))*100).toFixed(1)}%`,alvo:'95–100%'},
  {metrica:'DPS bruto full build',valor:`${(ratio(fullRaw,fullOld)*100).toFixed(1)}%`,alvo:'exposto antes da utilidade'},
]);
console.table(results.map(item=>({
  teste:item.test,
  necromante:item.necro.toFixed(1),
  referencia:item.reference.toFixed(1),
  proporcao:`${(item.ratio*100).toFixed(1)}%`,
  alvo:`${(item.target[0]*100).toFixed(0)}–${(item.target[1]*100).toFixed(0)}%`,
})));
console.log(`Economia: ${Math.round(CONFIG.soulDirectChance*100)}% alma direta, ${Math.round(CONFIG.soulSummonChance*100)}% por summon e pity no ${CONFIG.soulPity}o abate. Horda cheia usa 4 permanentes + ${CONFIG.corpseBaseCap} Reanimados limitados por vida; invocacoes aplicam ${Math.round(CONFIG.summonBossDamage*100)}% de dano em chefes.`);
console.log('Observacao: simulacao deterministica de DPS sustentado; posicionamento, coleta de almas e perda de vida dos summons ainda exigem playtest humano.');
if(errors.length){console.error(`FALHA DE BALANCEAMENTO:\n- ${errors.join('\n- ')}`);process.exit(1);}
console.log('OK: testes A–D e limites cooperativos ficaram dentro das metas normalizadas.');
