import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const progressionCode=fs.readFileSync(path.join(root,'src/camp/meta-progression-system.js'),'utf8');
const damageCode=fs.readFileSync(path.join(root,'src/combat/damage-system.js'),'utf8');
const bossCode=fs.readFileSync(path.join(root,'src/campaign/boss-system.js'),'utf8');
const blessingCode=fs.readFileSync(path.join(root,'src/blessings/blessing-system.js'),'utf8');
const bossRushCode=fs.readFileSync(path.join(root,'src/campaign/boss-rush-system.js'),'utf8');

function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
function harness({saved={},globalInventory={},fishInventory={},meta={},wave=5,bossRush=false}={}){
  const writes=[];let now=10000,currentWave=wave,isBossRush=bossRush;
  const store=new Map(Object.entries(clone(saved)));
  const saveSystem={
    readJSON(key,fallback){return store.has(key)?clone(store.get(key)):clone(fallback);},
    writeJSON(key,value){store.set(key,clone(value));writes.push({key,value:clone(value)});},
  };
  const context={console,performance:{now:()=>now}};context.window=context;
  vm.createContext(context);vm.runInContext(progressionCode,context,{filename:'meta-progression-system.js'});
  vm.runInContext(damageCode,context,{filename:'damage-system.js'});
  let globalSaves=0,fishSaves=0;const notices=[],announcements=[];
  const system=context.CampProgressionCore.create({
    saveSystem,getGlobalInventory:()=>globalInventory,getFishInventory:()=>fishInventory,getMetaUpgrades:()=>meta,
    saveGlobal:()=>globalSaves++,saveFish:()=>fishSaves++,itemName:id=>id,itemPixelKind:()=> 'item',
    notify:message=>notices.push(message),announce:(x,y,message)=>announcements.push(message),
    getIsBossRush:()=>isBossRush,getWave:()=>currentWave,
    isBoss:target=>Boolean(target?.isBoss),
  });
  return {context,system,store,writes,notices,announcements,globalInventory,fishInventory,meta,
    setNow:value=>{now=value;},advance:amount=>{now+=amount;},setWave:value=>{currentWave=value;},
    setBossRush:value=>{isBossRush=value;},counts:()=>({globalSaves,fishSaves})};
}

function parseLiteral(name){
  const match=index.match(new RegExp(`const ${name}\\s*=\\s*(\\[[\\s\\S]*?\\n\\]);`));
  assert.ok(match,`literal ${name} não encontrado`);
  return clone(vm.runInNewContext(`(${match[1]})`));
}

const first=harness();
const core=first.context.CampProgressionCore;
assert.equal(core.FISH_RECIPES.length,10,'todos os 10 peixes precisam de receita');
assert.equal(core.GASTRONOMY_UPGRADES.length,6,'Gastronomia deve ter 6 melhorias');
assert.equal(core.ECHO_DEFS.length,15,'devem existir 15 Ecos');
assert.equal(Object.keys(core.ARTIFACT_DEFS).length,5,'devem existir 5 artefatos');
assert.equal(Object.keys(core.EXCELLENT_BONUSES).length,16,'cada receita deve ter bônus Excelente próprio');

const oldRecipes=parseLiteral('COOKING_RECIPES');
const fishDefs=parseLiteral('FISH_DEFS');
assert.equal(oldRecipes.length,6,'as 6 receitas anteriores foram preservadas');
assert.deepEqual(oldRecipes.map(r=>r.id),['ensopado_trigo','sopa_tomate','pocao_erva','cha_cogumelo','extrato_raiz','banquete_mago']);
assert.equal(fishDefs.length,10,'os 10 peixes anteriores foram preservados');
assert.equal(new Set(fishDefs.map(f=>f.id)).size,10,'peixes não podem duplicar');
assert.ok(fishDefs.every(f=>f.loc&&f.rarity&&f.use&&!('buff' in f)),'peixes precisam de local, raridade e uso culinário, sem buff residual');
assert.doesNotMatch(index,/function\s+applyFishBuff\s*\(/,'applyFishBuff residual deve ser removido');

// Captura, captura dupla, save e reload dos dez peixes.
{
  const h=harness({fishInventory:{}});
  for(const fish of fishDefs)assert.equal(h.system.recordFishCatch(fish.id,1),1,`${fish.id}: captura simples`);
  assert.equal(h.system.recordFishCatch('truta',2),3,'captura dupla soma exatamente 2');
  assert.equal(h.system.recordFishCatch('inexistente',1),false,'peixe inválido não entra no inventário');
  assert.equal(h.counts().fishSaves,11,'cada captura válida salva imediatamente');
  const reload=harness({fishInventory:clone(h.fishInventory)});
  assert.equal(reload.system.quantity('truta'),3,'peixes sobrevivem ao reload');
  for(const fish of fishDefs)assert.ok(reload.system.quantity(fish.id)>=1,`${fish.id}: persistência`);
}

// Resolver único: global, peixe e artefato, com atomicidade e sem negativos.
{
  const saved={mvh_camp_progression_v1:{version:1,artifacts:{coroa_quebrada:2},echoesUnlocked:{},equippedEchoes:[],preparedMeals:[],seenArtifacts:{}}};
  const h=harness({saved,globalInventory:{trigo:4},fishInventory:{truta:2}});
  assert.equal(h.system.ingredientSource('trigo'),'global');
  assert.equal(h.system.ingredientSource('truta'),'fish');
  assert.equal(h.system.ingredientSource('coroa_quebrada'),'artifact');
  assert.equal(h.system.consume({trigo:2,truta:1,coroa_quebrada:1}),true);
  assert.deepEqual([h.system.quantity('trigo'),h.system.quantity('truta'),h.system.quantity('coroa_quebrada')],[2,1,1]);
  const before=[h.system.quantity('trigo'),h.system.quantity('truta'),h.system.quantity('coroa_quebrada')];
  assert.equal(h.system.consume({trigo:99,truta:99}),false);
  assert.deepEqual([h.system.quantity('trigo'),h.system.quantity('truta'),h.system.quantity('coroa_quebrada')],before,'falha não consome parcialmente');
}

const allRecipes=[...oldRecipes,...core.FISH_RECIPES];
assert.equal(allRecipes.length,16);
for(const recipe of allRecipes){
  const globalInventory={trigo:100,tomate:100,erva:100,madeira:100,pedra:100,cogumelo_lua:100,raiz_sangue:100};
  const fishInventory=Object.fromEntries(fishDefs.map(f=>[f.id,100]));
  const meta={gastro_profundezas:true};
  const h=harness({globalInventory,fishInventory,meta});
  const cost=h.system.recipeCost(recipe),before=Object.fromEntries(Object.keys(cost).map(id=>[id,h.system.quantity(id)]));
  assert.equal(h.system.canAfford(cost),true,`${recipe.id}: ingredientes suficientes`);
  assert.equal(h.system.consume(cost),true,`${recipe.id}: consumo`);
  for(const [id,amount] of Object.entries(cost))assert.equal(h.system.quantity(id),before[id]-amount,`${recipe.id}: custo exato de ${id}`);
  assert.ok(Object.values(cost).every(v=>v>=1),`${recipe.id}: nenhum custo zero`);
  for(const quality of ['COMUM','BOM','EXCELENTE'])assert.ok(Object.keys(h.system.buildMealEffect(recipe,quality)).length,`${recipe.id}: ${quality}`);
  const excellent=h.system.buildMealEffect(recipe,'EXCELENTE');
  assert.ok(Object.keys(excellent).some(key=>!(key in recipe.effect)||excellent[key]!==h.system.buildMealEffect(recipe,'BOM')[key]),`${recipe.id}: bônus Excelente próprio`);
}

// Qualidade escala somente o bônus; Maestria, Precisão, Mesa, Marés, Profundezas e Conservação.
{
  const h=harness({meta:{gastro_maestria:0,gastro_precisao:0,gastro_mesa:false,gastro_mares:0,gastro_profundezas:false,gastro_conservacao:0}});
  const potion=oldRecipes.find(r=>r.id==='pocao_erva');
  assert.equal(h.system.buildMealEffect(potion,'EXCELENTE').dmg_mult,1.32,'1.20 Excelente deve virar 1.32, não 1.92');
  assert.equal(h.system.excellentThreshold(),.08);
  h.meta.gastro_precisao=3;assert.equal(h.system.excellentThreshold(),.125);
  assert.equal(h.system.mealLimit(),3);h.meta.gastro_mesa=true;assert.equal(h.system.mealLimit(),4);
  const deep=core.FISH_RECIPES.find(r=>r.id==='banquete_dragao');
  assert.equal(h.system.recipeUnlocked(deep),false);h.meta.gastro_profundezas=true;assert.equal(h.system.recipeUnlocked(deep),true);
  h.meta.gastro_maestria=3;assert.equal(h.system.buildMealEffect(potion,'COMUM').dmg_mult,1.23,'Maestria 3 aumenta +20% para +23%');
  const conservationRecipe={cost:{trigo:3,tomate:2,erva:1,truta:1,cogumelo_lua:1,raiz_sangue:1}};
  h.meta.gastro_conservacao=2;const reduced=clone(h.system.recipeCost(conservationRecipe));
  assert.deepEqual(reduced,{trigo:2,tomate:1,erva:1,truta:1,cogumelo_lua:1,raiz_sangue:1});
  const base={comum:50,incomum:25,raro:12,épico:4,lendário:1};h.meta.gastro_mares=3;
  assert.ok(h.system.fishWeight('raro',base.raro)>base.raro);assert.ok(h.system.fishWeight('comum',base.comum)<base.comum);
  assert.equal(h.system.fishWeight('lendário',base.lendário),1,'Celestial não é banalizado');
  for(const upgrade of core.GASTRONOMY_UPGRADES){
    for(let level=0;level<upgrade.maxLevel;level++){
      const cost=upgrade.cost(level);assert.ok(cost&&Object.values(cost).every(v=>Number.isInteger(v)&&v>0),`${upgrade.id} nível ${level+1}: custo válido`);
    }
    assert.ok(upgrade.maxLevel===1||upgrade.maxLevel===2||upgrade.maxLevel===3,`${upgrade.id}: máximo controlado`);
  }
}

// Aplicação real dos efeitos de comida e caps conjuntos.
{
  const h=harness();
  const player={hp:50,maxHp:100,dmg:10,speed:100};
  const meals=[
    {id:'a',effect:{hp_restore:20,dmg_mult:1.5,speed_mult:1.4,xp_mult:1.1,damage_reduction:.08,dodge_bonus:.1,max_hp_flat:30}},
    {id:'b',effect:{dmg_mult:1.5,speed_mult:1.4,max_hp_mult:1.1}},
  ];
  h.system.applyMealsToPlayer(player,meals);
  assert.equal(player.dmg,17.5,'dano de comidas respeita cap de +75%');
  assert.equal(player.speed,150,'velocidade de comidas respeita cap de +50%');
  assert.equal(player.xpGainMult,1.1);assert.equal(player._campFoodDamageReduction,.08);assert.equal(player._campFoodDodge,.1);
  assert.equal(player.maxHp,143);assert.equal(player.hp,113,'cura e maxHP atingem a instância real');
  let xp=0;xp+=10*player.xpGainMult;assert.equal(xp,11,'multiplicador de XP altera o ganho real');
  const ratio=h.system.applyMealWaveRegen(player,[{effect:{regen_per_wave:.18}},{effect:{regen_per_wave:.20}}]);
  assert.equal(ratio,.25,'regeneração combinada por onda tem cap de 25%');
  player.hp=50;const lamp={id:'lamp',effect:{kill_heal_flat:2,kill_heal_cd:1500}};
  assert.equal(h.system.applyMealKillEffects(player,{type:'runner_goblin'},[lamp],null,10000),2);
  assert.equal(h.system.applyMealKillEffects(player,{type:'runner_goblin'},[lamp],null,11000),0,'cura por abate respeita cooldown');
  assert.equal(h.system.applyMealKillEffects(player,{type:'runner_goblin'},[lamp],null,11500),2);
}

// Preparação persistente, limite 3/4 e migração segura de save antigo.
{
  const h=harness({meta:{gastro_mesa:false}});
  const meals=[1,2,3,4].map(n=>({id:'meal'+n,effect:{dmg_mult:1.1}}));
  h.system.setPreparedMeals(meals);assert.equal(h.system.preparedMeals().length,3);
  const reload=harness({saved:Object.fromEntries(h.store),meta:{gastro_mesa:false}});
  assert.equal(reload.system.preparedMeals().length,3,'comidas preparadas sobrevivem ao reload');
  const table=harness({meta:{gastro_mesa:true}});table.system.setPreparedMeals(meals);assert.equal(table.system.preparedMeals().length,4);
  const migrated=core.migrateState({artifacts:{coroa_quebrada:-8},equippedEchoes:['invalido'],preparedMeals:null});
  assert.equal(migrated.artifacts.coroa_quebrada,0);assert.deepEqual(clone(migrated.equippedEchoes),[]);assert.deepEqual(clone(migrated.preparedMeals),[]);
  const abrir=index.indexOf('function abrir(id,replaceId=null)');
  const bater=index.indexOf('function bater()',abrir);const consume=index.indexOf('CampProgressionSystem.consume(T.cost)',bater);
  assert.ok(abrir>=0&&bater>abrir&&consume>bater,'ingredientes só são consumidos em bater(), nunca ao abrir');
  assert.match(index,/SUBSTITUIR COMIDA/);assert.match(index,/CANCELAR/);
}

// Drops garantidos e exclusivos dos cinco bosses de Campanha.
{
  const ids=Object.keys(core.ARTIFACT_DEFS);const h=harness();
  ids.forEach((id,index)=>{
    h.setWave(5+index*5);const boss={x:10,y:20};
    assert.equal(h.system.awardCampaignArtifact(id,boss),true,`${id}: primeira vitória`);
    assert.equal(h.system.quantity(id),1);assert.equal(h.system.awardCampaignArtifact(id,boss),false,`${id}: mesmo evento não duplica`);
    assert.match(h.notices.at(-1),/ARTEFATO OBTIDO/);
    const secondBoss={x:20,y:30};assert.equal(h.system.awardCampaignArtifact(id,secondBoss),true);assert.equal(h.system.quantity(id),2);
  });
  const reload=harness({saved:Object.fromEntries(h.store)});for(const id of ids)assert.equal(reload.system.quantity(id),2,`${id}: reload`);
  h.setBossRush(true);h.setWave(5);assert.equal(h.system.awardCampaignArtifact('coroa_quebrada',{}),false,'Boss Rush não concede');
  h.setBossRush(false);h.setWave(6);assert.equal(h.system.awardCampaignArtifact('coroa_quebrada',{}),false,'onda incorreta não concede');
  assert.equal((bossCode.match(/CampProgressionSystem\.awardCampaignArtifact\('/g)||[]).length,5,'somente os cinco bosses principais chamam o drop');
}

function echoHarness(equipped){
  const artifacts=Object.fromEntries(Object.keys(core.ARTIFACT_DEFS).map(id=>[id,20]));
  const unlocked=Object.fromEntries(core.ECHO_DEFS.map(def=>[def.id,true]));
  const state={version:1,artifacts,echoesUnlocked:unlocked,equippedEchoes:equipped,preparedMeals:[],seenArtifacts:{}};
  return harness({saved:{mvh_camp_progression_v1:state},wave:1});
}
function player(){return {hp:100,maxHp:100,dmg:10,speed:100,x:0,y:0,inv:false,invT:0,_revivesLeft:1,dead:false};}

// Desbloqueio, custos, persistência e loadout 3/3.
{
  const artifacts=Object.fromEntries(Object.keys(core.ARTIFACT_DEFS).map(id=>[id,20]));
  const globals={trigo:100,tomate:100,erva:100,madeira:100,pedra:100,cogumelo_lua:100,raiz_sangue:100};
  const fish=Object.fromEntries(fishDefs.map(f=>[f.id,100]));
  const h=harness({saved:{mvh_camp_progression_v1:{version:1,artifacts,echoesUnlocked:{},equippedEchoes:[],preparedMeals:[],seenArtifacts:{}}},globalInventory:globals,fishInventory:fish});
  for(const def of core.ECHO_DEFS)assert.equal(h.system.unlockEcho(def.id),true,`${def.id}: desbloqueio`);
  assert.equal(Object.keys(h.system.exportState().echoesUnlocked).length,15);
  for(const id of core.ECHO_DEFS.slice(0,3).map(e=>e.id))assert.equal(h.system.toggleEcho(id).ok,true);
  assert.deepEqual(clone(h.system.toggleEcho(core.ECHO_DEFS[3].id)),{ok:false,reason:'limit'},'quarto Eco é impedido');
  const reload=harness({saved:Object.fromEntries(h.store)});assert.equal(reload.system.exportState().equippedEchoes.length,3,'loadout persiste');
}

// Os 15 Ecos: condição falsa, verdadeira, cooldown, início/fim de run e coop.
{
  let h=echoHarness(['rei_carrasco']);let p=player();h.system.beginRun([p]);
  assert.equal(h.system.damageBonus(p,{hp:24,maxHp:100,type:'runner_goblin'}),.10);assert.equal(h.system.damageBonus(p,{hp:25,maxHp:100,type:'runner_goblin'}),0);
  h=echoHarness(['rei_devorador']);p=player();p.hp=50;h.system.beginRun([p]);h.system.onEnemyKilled(p,{type:'shield_orc'});assert.equal(p.hp,54);h.system.onEnemyKilled(p,{type:'shield_orc'});assert.equal(p.hp,54);h.advance(8000);h.system.onEnemyKilled(p,{type:'shield_orc'});assert.equal(p.hp,58);
  h=echoHarness(['rei_ossos']);p=player();h.system.beginRun([p]);assert.equal(p.maxHp,108);h.system.endRun([p]);assert.equal(p._campEchoes,undefined);
  h=echoHarness(['aracne_instinto']);p=player();h.system.beginRun([p]);h.advance(4999);assert.equal(h.system.damageBonus(p,{}),0);h.advance(1);assert.equal(h.system.damageBonus(p,{}),.10);p.hp=90;h.system.onPlayerDamaged(p);assert.equal(h.system.damageBonus(p,{}),0);
  h=echoHarness(['aracne_passos']);p=player();h.system.beginRun([p]);assert.equal(h.system.movementMultiplier(p),1.08);
  h=echoHarness(['aracne_carapaca']);p=player();h.system.beginRun([p]);assert.equal(h.system.damageReduction(p),.06);
  h=echoHarness(['gelo_ultimo']);p=player();h.system.beginRun([p]);p.hp=29;assert.equal(h.system.damageReduction(p),.15);p.hp=31;assert.equal(h.system.damageReduction(p),0);
  h=echoHarness(['gelo_coracao']);p=player();p.hp=50;h.system.beginRun([p]);const boss={isBoss:true};h.system.onBossStarted([p],boss);assert.equal(p.hp,58);h.system.onBossStarted([p],boss);assert.equal(p.hp,58);
  h=echoHarness(['gelo_constituicao']);p=player();h.system.beginRun([p]);assert.equal(p.maxHp,110);
  h=echoHarness(['verme_predador']);p=player();h.system.beginRun([p]);assert.equal(h.system.damageBonus(p,{type:'shield_orc'}),.12);assert.equal(h.system.damageBonus(p,{type:'runner_goblin'}),0);
  h=echoHarness(['verme_titas']);p=player();h.system.beginRun([p]);assert.equal(h.system.damageBonus(p,{isBoss:true}),.08);assert.equal(h.system.damageBonus(p,{type:'shield_orc'}),0);
  h=echoHarness(['verme_fome']);p=player();h.system.beginRun([p]);h.system.onEnemyKilled(p,{type:'shield_orc'});assert.equal(h.system.movementMultiplier(p),1.10);h.advance(8001);assert.equal(h.system.movementMultiplier(p),1);
  h=echoHarness(['balrog_furia']);p=player();h.system.beginRun([p]);p.hp=24;h.system.onPlayerDamaged(p);assert.equal(h.system.damageBonus(p,{}),.15);assert.equal(h.system.movementMultiplier(p),1.10);h.advance(6001);assert.equal(h.system.damageBonus(p,{}),0);p.hp=20;h.system.onPlayerDamaged(p);assert.equal(h.system.damageBonus(p,{}),0);h.advance(29000);h.system.onPlayerDamaged(p);assert.equal(h.system.damageBonus(p,{}),.15);
  h=echoHarness(['balrog_sangue']);p=player();p.hp=30;h.system.beginRun([p]);h.system.onPlayerDamaged(p);assert.equal(p.hp,36);p.hp=30;h.system.onPlayerDamaged(p);assert.equal(p.hp,30);h.setWave(2);h.system.onWaveStarted([p],2);h.system.onPlayerDamaged(p);assert.equal(p.hp,36);
  h=echoHarness(['balrog_chama']);const p1=player(),p2=player();h.system.beginRun([p1,p2]);assert.equal(h.system.shouldPreventFatalDamage(p1),true);assert.equal(p1.hp,1);assert.equal(p1.invT,2000);assert.equal(h.system.shouldPreventFatalDamage(p1),false);assert.equal(h.system.shouldPreventFatalDamage(p2),true,'coop mantém cargas individuais');
}

// Chama Eterna precede revive e não consome Fio do Destino; segunda fatal segue fluxo normal.
{
  const h=echoHarness(['balrog_chama']);const p=player();p.hp=10;h.system.beginRun([p]);let ended=0;
  const damage=h.context.CampaignDamageSystem.create({
    getDifficulty:()=>({playerArmorCap:.75}),getCampProgressionDamageReduction:pl=>h.system.damageReduction(pl),
    shouldCampProgressionPreventDeath:pl=>h.system.shouldPreventFatalDamage(pl),notifyCampProgressionDamageTaken:pl=>h.system.onPlayerDamaged(pl),
    shouldEndGame:()=>true,endGame:()=>ended++,spawnParts:()=>{},spawnLevelUpNotice:()=>{},triggerScreenShake:()=>{},
  });
  damage.damagePlayer(p,50);assert.equal(p.hp,1);assert.equal(p._revivesLeft,1);assert.equal(p.dead,false);
  p.inv=false;p.invT=0;damage.damagePlayer(p,50);assert.equal(p.hp,35);assert.equal(p._revivesLeft,0);assert.equal(p.dead,false);
  p.inv=false;p.invT=0;p.hp=1;damage.damagePlayer(p,50);assert.equal(p.dead,true);assert.equal(ended,1);
}

// Integrações que garantem ausência de propriedades fantasma e limpeza de run.
assert.match(index,/const actual=a\*\(this\.xpGainMult\|\|1\);[\s\S]{0,220}this\.xp\+=actual/,'XP real lê xpGainMult e preserva o valor efetivo para a telemetria');
assert.match(index+blessingCode,/CampProgressionSystem\.damageBonus\((?:pl|player),target\)/,'dano real lê Ecos');
assert.match(index,/CampProgressionSystem\.movementMultiplier\(this\)/,'movimento real lê Ecos');
assert.match(index,/CampProgressionSystem\.setPreparedMeals\(\[\]\)/,'início da run limpa a preparação persistida');
assert.match(index+bossRushCode,/CampProgressionSystem\.endRun\(\[player,player2\]\)/,'fim da run limpa timers e cargas');
assert.match(index,/CampProgressionSystem\.drawArtifacts\([^\n]+\.835\*MW/,'artefatos são desenhados por Canvas ao redor do Merlin');

console.log(`OK: progressão integrada validou 10 peixes, ${allRecipes.length} receitas, 6 upgrades, 5 artefatos, 15 Ecos, save, coop, caps e Chama Eterna.`);
