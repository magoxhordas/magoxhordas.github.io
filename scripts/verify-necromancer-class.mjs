import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
let checks=0;
const assert=(condition,message)=>{if(!condition)throw new Error(`FALHA: ${message}`);checks++;};
const includesAll=(source,fragments,message)=>assert(fragments.every(fragment=>source.includes(fragment)),message);

const dataSource=read('src/classes/necromancer/necromancer-data.js');
const systemSource=read('src/classes/necromancer/necromancer-system.js');
const html=read('index.html');
const campaign=read('src/campaign/campaign-system.js');
const dungeon=read('src/dungeon/dungeon-system.js');
const shop=read('src/shop/shop-system.js');
const codex=read('src/ui/menu-codex-system.js');
const audio=read('src/core/audio-system.js');
const save=read('src/core/save-system.js');
const artPrep=read('scripts/prepare-necromancer-hero-art.py');

let clock=1000;
const randomValues=[];
const testMath=Object.create(Math);
testMath.random=()=>randomValues.length?randomValues.shift():.99;
const sandbox={window:null,console,Math:testMath,Date,WeakMap,Map,Object,Number,String,Array,JSON,Infinity,performance:{now:()=>clock}};
sandbox.window=sandbox;
vm.createContext(sandbox);
vm.runInContext(dataSource,sandbox,{filename:'necromancer-data.js'});
vm.runInContext(systemSource,sandbox,{filename:'necromancer-system.js'});
const data=sandbox.NecromancerData;
const system=sandbox.NecromancerSystem;

assert(data.CLASS_DEF.id==='necromancer'&&data.CLASS_DEF.name==='Necromante','identidade canonica da classe foi alterada');
assert(data.CLASS_DEF.baseHp===98&&data.CLASS_DEF.baseDmg===21&&data.CLASS_DEF.baseSpd===132,'atributos-base do Necromante sairam do alvo de balanceamento');
assert(data.CLASS_DEF.baseHp>=90&&data.CLASS_DEF.baseHp<=105,'vida-base deve ficar proxima de 90% a 95% das classes resistentes');
assert(data.CLASS_DEF.baseDmg>=20&&data.CLASS_DEF.baseDmg<=22,'dano direto deve permanecer abaixo das classes de dano puro');
assert(data.WEAPON_SPECS.length===8&&new Set(data.WEAPON_SPECS.map(spec=>spec[0])).size===8,'classe deve possuir exatamente 8 armas exclusivas');
assert(data.WEAPON_SPECS.every(spec=>spec[7].length===5),'cada arma deve descrever Comum, Incomum, Raro, Epico e Lendario');
assert(data.SHOP_BUFFS.length===8&&new Set(data.SHOP_BUFFS.map(buff=>buff.id)).size===8,'classe deve possuir exatamente 8 buffs unicos');
assert(data.SHOP_BUFFS.every(buff=>buff.values.length===5),'buffs devem participar das cinco raridades da loja');
assert(data.CONFIG.soulDirectChance===.22&&data.CONFIG.soulSummonChance===.14&&data.CONFIG.soulPity===6,'probabilidades ou pity de almas foram alterados');
assert(data.CONFIG.corpseDirectChance===.35&&data.CONFIG.corpseSummonChance===.22,'probabilidades de cadaveres foram alteradas');
assert(data.CONFIG.soulBaseCap===12&&data.CONFIG.soulHardCap===20&&data.CONFIG.corpseBaseCap===8&&data.CONFIG.corpseBuffCap===10,'limites de recursos foram alterados');
assert(data.CONFIG.permanentBaseCap===2&&data.CONFIG.permanentHardCap===5&&data.CONFIG.temporaryCap===3&&data.CONFIG.globalCoopCap===12,'limites de invocacao foram alterados');
assert(data.CONFIG.summonProcCoefficient===.35&&data.CONFIG.summonBossDamage===.85&&data.CONFIG.bossDamageToSummons===1.35,'coeficientes de combate das invocacoes foram alterados');

for(const spec of data.WEAPON_SPECS){
  const icon=path.join(root,'assets','weapons',`${spec[2]}.png`);
  assert(fs.existsSync(icon),`icone ausente para ${spec[1]}`);
  const png=fs.readFileSync(icon);
  assert(png.subarray(1,4).toString()==='PNG',`icone raster invalido para ${spec[1]}`);
  assert(png.readUInt32BE(16)===320&&png.readUInt32BE(20)===320,`icone deve ser 320x320 e centralizado para ${spec[1]}`);
}

for(const buff of data.SHOP_BUFFS){
  const icon=path.join(root,'assets','codex','relics',`${buff.id}.png`);
  assert(fs.existsSync(icon),`arte de Codex ausente para ${buff.name}`);
  const png=fs.readFileSync(icon);
  assert(png.subarray(1,4).toString()==='PNG',`arte de Codex invalida para ${buff.name}`);
  assert(png.readUInt32BE(16)===192&&png.readUInt32BE(20)===192,`arte de Codex deve ser 192x192 para ${buff.name}`);
  assert(codex.includes(`${buff.id}:'assets/codex/relics/${buff.id}.png'`),`mapeamento visual ausente no Codex para ${buff.name}`);
}

for(const direction of ['north','side','south']){
  assert(fs.existsSync(path.join(root,'assets','heroes','necromancer',`idle_${direction}.png`)),`sprite parado ausente: ${direction}`);
  for(let frame=0;frame<6;frame++){
    assert(fs.existsSync(path.join(root,'assets','heroes','necromancer',`walk_${direction}_${frame}.png`)),`caminhada ausente: ${direction} ${frame}`);
  }
  for(let frame=0;frame<9;frame++){
    assert(fs.existsSync(path.join(root,'assets','heroes','necromancer',`atk_${direction}_${frame}.png`)),`ataque ausente: ${direction} ${frame}`);
  }
}

const makeOwner=(idx=0)=>({idx,classId:'necromancer',x:100+idx*40,y:120,hp:98,maxHp:98,dmg:21,dead:false,shopEffects:{}});
const owner=makeOwner(0);
const owner2=makeOwner(1);
system.resetRun([owner,owner2]);
assert(system.states.size===2&&system.stateFor(owner).souls===0&&system.stateFor(owner2).souls===0,'estado por jogador nao foi inicializado isoladamente');

// Cinco falhas deliberadas e a sexta morte validam o pity de almas.
for(let index=0;index<6;index++)system.onEnemyDeath({x:150+index,y:150,hp:0,maxHp:40,type:'skeleton'},owner,'direct','necromancer_basic');
assert(system.stateFor(owner).soulOrbs.length===1&&system.stateFor(owner).pityMisses===0,'sexta morte sem alma deve acionar o pity e reiniciar o contador');
assert(system.stateFor(owner2).soulOrbs.length===0,'recursos de P1 vazaram para P2');

system.onEnemyDeath({x:180,y:170,hp:0,maxHp:300,type:'elite_guard',isElite:true},owner,'direct','necromancer_basic');
assert(system.stateFor(owner).soulOrbs.length===3,'elite deve gerar exatamente duas almas adicionais');
system.onEnemyDeath({x:185,y:170,hp:0,maxHp:220,type:'miniboss_guard',isMiniboss:true},owner,'direct','necromancer_basic');
assert(system.stateFor(owner).soulOrbs.length===6,'miniboss deve gerar exatamente tres almas adicionais');
const boss={x:220,y:180,hp:1000,maxHp:1000,type:'boss_necro_test',isBoss:true};
system.onBossDamaged(owner,boss,1000,0);
assert(system.stateFor(owner).soulOrbs.length===11,'atravessar cinco faixas do chefe deve gerar no maximo cinco almas');
system.onBossDamaged(owner,boss,1000,0);
assert(system.stateFor(owner).soulOrbs.length===11,'faixas do chefe nao podem gerar almas repetidas');

for(let index=0;index<12;index++)system.onEnemyDeath({x:index,y:index,hp:0,maxHp:50,type:'enemy'},owner,'direct','necromancer_basic');
assert(system.stateFor(owner).corpses.length<=8,'cadaveres excederam o limite-base');
owner.shopEffects.necroCorpseMaster=1;
for(let index=0;index<14;index++)system.onEnemyDeath({x:index,y:index,hp:0,maxHp:50,type:'enemy'},owner,'direct','necromancer_basic');
assert(system.stateFor(owner).corpses.length<=10,'Mestre dos Cadaveres excedeu o limite de 10');

owner.shopEffects.necroPermanentCap=3;
for(let index=0;index<7;index++)system.spawnSummon(owner,'skeleton_warrior',{permanent:true,family:`p${index}`});
assert(system.stateFor(owner).summons.filter(summon=>summon.permanent).length===5,'limite permanente reforcado deve respeitar o hard cap de 5');
for(let index=0;index<5;index++)system.spawnSummon(owner,'reanimated',{duration:6000,family:`t${index}`});
assert(system.stateFor(owner).summons.filter(summon=>!summon.permanent).length===3,'invocacoes temporarias excederam o limite de 3');
owner2.shopEffects.necroPermanentCap=3;
for(let index=0;index<5;index++)system.spawnSummon(owner2,'skeleton_archer',{permanent:true,family:`q${index}`});
assert([...system.states.values()].reduce((total,state)=>total+state.summons.length,0)===12,'limite global cooperativo deve bloquear a decima terceira invocacao');
assert(system.spawnSummon(owner2,'spirit',{duration:5000,family:'overflow'})===null,'decima terceira invocacao cooperativa nao foi bloqueada');

includesAll(systemSource,[
  'soulOrbs:[],corpses:[],summons:[],totems:[]',
  "source==='summon'||source==='direct'",
  'enemy.isSummoned||enemy.isReanimated',
  'state.summons=state.summons.filter(s=>s.permanent&&!s.dead)',
  "type==='death_knight'",
  'Number(owner?.lifeSteal||0))*.20',
  'summonProcCoefficient',
  'bossDamageToSummons',
  'globalAttackSpeedBonus(owner)*.30',
  'globalCritChance(owner)*.50',
  'globalDamageBonus(owner)*.35',
  'DATA.CLASS_DEF.baseDmg*spec.damage*(options.damageMult||1)',
  'angle,player.dmg,player,weapon',
  'noNecroRewards:true',
  'visualTime:Math.random()*620',
  'deps.drawSummon?.(ctx,summon,time)===true',
],'runtime perdeu recursos, anti-recursao, persistencia entre mapas ou regras de combate');
includesAll(html,[
  'id="necromancer-resource-hud"',
  "['mage','warrior','archer','viking','necromancer']",
  'NecromancerSystem.resetRun([player,player2].filter(Boolean))',
  'NecromancerSystem.update(dt)',
  'NecromancerSystem.draw(ctx,t)',
  "const extension='png'",
  "necromancer: make('assets/heroes/necromancer/', 64, 52, 6, 9)",
  "SceneManager.getCurrent()===null",
  'function drawNecromancerSummon(renderCtx,summon,time)',
  'PAL_NECRO_SKELETON',
  'PAL_NECRO_SPIRIT',
  'PAL_NECRO_REANIMATED',
  'PAL_NECRO_ABOMINATION',
  'PAL_NECRO_DKNIGHT',
],'selecao, HUD, loop, desenho ou icones do Necromante nao estao conectados');
includesAll(artPrep,[
  'Idle_walk_north.gif',
  'Idle_walk_south.gif',
  'Idle_walk_west.gif',
  'Idle_custom-The_necromancer_performs_a_dar_north.gif',
], 'preparador nao usa as animacoes direcionais fornecidas na raiz');
assert(!artPrep.includes('walk_root ='),'preparador voltou a usar a pasta interna animations/Walk');
includesAll(campaign,['NecromancerSystem.clearWorld({preservePermanent:true})'],'troca de mapa da campanha nao limpa recursos transitorios');
includesAll(dungeon,[
  "this.pClassId==='necromancer'",
  '_necroSpawnSoul',
  '_necroBossDamage',
  '_necroSpawnSummon',
  '_necroAggroTarget',
  '_drawNecro',
  "classId==='necromancer'&&!equip?null",
  "visualTime:0,attackAnim:0,hurtAnim:0,spawnAnim:420,moving:false,facing:'right'",
  "type:summon.type==='skeleton'?'skeleton_warrior':summon.type",
  "drawNecromancerSummon(c,screenSummon,ts)===true",
],'Masmorra nao cobre recursos, invocacoes, aggro e desenho detalhado do Necromante');
includesAll(shop,data.SHOP_BUFFS.map(buff=>buff.id),'efeitos exclusivos do Necromante nao estao implementados na loja');
includesAll(codex,['necromancer:\'Necromante\'','Necromante · Invocações','necromancer:\'#70d98b\''],'Códex nao cataloga a quinta classe corretamente');
includesAll(audio,['sfxNecroSoul','sfxNecroSummon','sfxNecroCurse','sfxNecroScythe','sfxNecroBell'],'assinatura sonora da classe ficou incompleta');
assert(!/necro(?:mancer)?(?:Souls|Corpses|Summons|Resource)/i.test(save),'almas, cadaveres ou invocacoes nao podem entrar no save permanente');

console.log(`OK: Necromante validou identidade, 8 armas, 8 buffs, recursos, pity, chefes, invocacoes, coop, modos, Códex, áudio e save (${checks} verificacoes).`);
