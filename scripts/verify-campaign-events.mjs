import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const source=read('src/campaign/campaign-events.js');
const runtime=read('src/campaign/campaign-runtime.js');
const campaign=read('src/campaign/campaign-system.js');
const html=read('index.html');
const bossRush=read('src/campaign/boss-rush-system.js');
const dungeon=read('src/dungeon/dungeon-system.js');
let checks=0;
const ok=(condition,message)=>{assert.ok(condition,message);checks++;};

const sandbox={console,Math,Date};sandbox.window=sandbox;sandbox.globalThis=sandbox;
vm.createContext(sandbox);vm.runInContext(source,sandbox,{filename:'campaign-events.js'});
const {CampaignEvents}=sandbox;
ok(CampaignEvents.EVENT_CHANCE===.25,'chance base deve permanecer em 25%');
ok(CampaignEvents.MAX_EVENTS_PER_RUN===3,'limite da run deve ser três eventos');
ok(CampaignEvents.EVENT_DEFS.length===6,'catálogo deve conter seis eventos');
ok(new Set(CampaignEvents.EVENT_DEFS.map(event=>event.id)).size===6,'eventos duplicados no catálogo');

function harness({random=()=>.1,mandatory=()=>false,bossRush=()=>false,dungeon=()=>false}={}){
  let currentWave=1,merlin=0,choice=null,hud=null,action=null,encounter=false,coins=50,xp=0,done=0,appliedBlessings=0;
  const modifiers=[],enemies=[],resources={};
  const players=[{idx:0,x:320,y:270,radius:16,hp:50,maxHp:100,dead:false,gainXP(value){xp+=value;}},{idx:1,x:360,y:270,radius:16,hp:70,maxHp:100,dead:false,gainXP(value){xp+=value;}}];
  const blessings=[
    {id:'test_a',icon:'⚡',name:'Raio Real',god:'ZEUS',valueText:'+10% dano'},
    {id:'test_b',icon:'🛡',name:'Égide Real',god:'ATENA',valueText:'+10% defesa'},
  ];
  const deps={
    random,getPlayers:()=>players,getEnemies:()=>enemies,getWave:()=>currentWave,getArena:()=>currentWave>=16?'desert':'crypt',getMerlinLevel:()=>merlin,
    isBossRush:bossRush,isDungeon:dungeon,hasMandatoryObjective:mandatory,setEncounterMode:value=>{encounter=value;},
    spawnEnemy(type,x,y,origin){const enemy={type,x,y,origin,hp:100,maxHp:100,speed:50,damage:10,radius:12,dead:false};enemies.push(enemy);return enemy;},
    spawnParts(){},spawnNotice(){},setHud:value=>{hud=value;},setAction:value=>{action=value;},showChoice:value=>{choice=value;},hideChoice:()=>{choice=null;},
    getCoins:()=>coins,spendCoins:cost=>{if(coins<cost)return false;coins-=cost;return true;},addCoins:value=>{coins+=value;},addXp:value=>players.forEach(player=>player.gainXP(value)),
    addCampResource:(id,value)=>{resources[id]=(resources[id]||0)+value;},getBlessingOffers:count=>blessings.slice(0,count),applyBlessing:()=>{appliedBlessings++;return true;},
    addTimedModifier:modifier=>{modifiers.push(modifier);return modifier;},now:()=>1000,
  };
  const system=CampaignEvents.create(deps);
  return {system,players,enemies,modifiers,resources,setWave:value=>{currentWave=value;},setMerlin:value=>{merlin=value;},finishCounter:()=>{done++;},
    get choice(){return choice;},get hud(){return hud;},get action(){return action;},get encounter(){return encounter;},get coins(){return coins;},get xp(){return xp;},get done(){return done;},get appliedBlessings(){return appliedBlessings;}};
}

const eligibility=harness({random:()=>0,mandatory:wave=>wave===2});
ok(!eligibility.system.tryStartAfterWave(2,eligibility.finishCounter),'evento apareceu após objetivo obrigatório');
ok(!eligibility.system.tryStartAfterWave(5,eligibility.finishCounter),'evento apareceu após chefe/cinemática');
ok(eligibility.system.tryStartAfterWave(1,eligibility.finishCounter),'roll 0 deveria iniciar evento elegível');
ok(eligibility.system.debugSnapshot().id==='lost_merchant','seleção ponderada determinística escolheu evento errado');
ok(eligibility.encounter,'evento não ativou modo de encontro');
eligibility.system.cleanup('test');
ok(!eligibility.encounter,'cleanup não encerrou modo de encontro');

const weights=harness();
weights.setMerlin(0);const baseWeights=weights.system.debugWeights();weights.setMerlin(5);const merlinWeights=weights.system.debugWeights();
for(const id of ['lost_merchant','god_altar','wandering_spirit'])ok(merlinWeights[id]>baseWeights[id],`Merlin não favoreceu ${id}`);
for(const id of ['mysterious_fountain','cursed_chest','profaned_treasure'])ok(merlinWeights[id]<=baseWeights[id],`Merlin aumentou risco ${id}`);
ok(CampaignEvents.EVENT_CHANCE===.25,'Merlin alterou quantidade/chance de eventos');

const merchant=harness();merchant.system.forceStart('lost_merchant',merchant.finishCounter,1);
ok(merchant.system.handleActionDown(0),'Mercador não aceitou interação');ok(merchant.choice.options.length===4,'Mercador deve mostrar três ofertas e saída');
merchant.choice.options.find(option=>option.id==='whetstone').onChoose();
ok(merchant.modifiers.some(modifier=>modifier.type==='damage'&&modifier.value===.08&&modifier.waves===2),'Pedra de Amolar não concedeu bônus temporário');
ok(merchant.coins===39,'Mercador não cobrou preço descontado');ok(merchant.done===1,'Mercador não retomou fluxo entre ondas');

const altar=harness();altar.system.forceStart('god_altar',altar.finishCounter,3);altar.system.handleActionDown(0);
ok(altar.choice.options.length===3,'Altar deve oferecer duas bênçãos reais e ignorar');
altar.choice.options[0].onChoose();ok(altar.appliedBlessings===1,'Altar não aplicou sistema real de bênçãos');ok(altar.done===1,'Altar não concluiu');

const fountain=harness({random:()=>.1});fountain.system.forceStart('mysterious_fountain',fountain.finishCounter,6);fountain.system.handleActionDown(0);
const fountainCoins=fountain.coins;fountain.choice.options.find(option=>option.id==='drink').onChoose();
ok(fountain.players.every(player=>player.hp===Math.min(player.maxHp,(player.idx?70:50)+30)),'resultado positivo da fonte não curou de forma controlada');
ok(fountain.coins===fountainCoins,'cura da fonte criou moeda indevida');

const cursed=harness();cursed.system.forceStart('cursed_chest',cursed.finishCounter,11);cursed.system.handleActionDown(0);
ok(cursed.enemies.length===4,'Baú Amaldiçoado deve gerar elite e grupo');ok(cursed.enemies.some(enemy=>enemy.isElite&&enemy.maxHp===155),'elite do baú não recebeu escala controlada');
cursed.enemies.forEach(enemy=>{enemy.dead=true;});const cursedCoins=cursed.coins;cursed.system.update(.016);
ok(cursed.coins===cursedCoins+22&&cursed.xp===56,'recompensa superior do Baú Amaldiçoado está incorreta no coop');ok(cursed.resources.pedra===2,'baú não concedeu recurso de acampamento');

const spirit=harness();spirit.system.forceStart('wandering_spirit',spirit.finishCounter,16);spirit.system.handleActionDown(0);
ok(spirit.choice.options.length===2,'Espírito deve oferecer duas escolhas compartilhadas');spirit.choice.options.find(option=>option.id==='health').onChoose();
ok(spirit.modifiers.some(modifier=>modifier.type==='maxHp'&&modifier.value===.12&&modifier.waves===2),'Espírito não concedeu vida por duas ondas');

const treasure=harness({random:()=>.5});treasure.players[0].x=320;treasure.players[0].y=330;treasure.system.forceStart('profaned_treasure',treasure.finishCounter,18);treasure.system.handleActionDown(0);
const treasureCoins=treasure.coins;treasure.system.update(.4);ok(treasure.coins>=treasureCoins+2,'recompensa coletável não exigiu/proporcionou coleta');
treasure.system.update(20);ok(treasure.done===1,'Tesouro Profanado não encerrou após 20s');ok(!treasure.system.isActive(),'Tesouro Profanado vazou estado');

const cap=harness({random:()=>0});
for(const id of ['lost_merchant','god_altar','wandering_spirit']){cap.system.forceStart(id,()=>{},1);cap.system.cleanup('test');}
ok(cap.system.debugSnapshot().completedCount===3,'contador não registrou três eventos');
ok(!cap.system.tryStartAfterWave(1,()=>{}),'quarto evento apareceu na mesma run');

const noRepeat=harness({random:()=>0});
ok(noRepeat.system.tryStartAfterWave(1,()=>{}),'primeiro evento não iniciou');noRepeat.system.cleanup('test');
ok(noRepeat.system.tryStartAfterWave(3,()=>{}),'segundo evento não iniciou');
ok(noRepeat.system.debugSnapshot().id==='god_altar','evento repetiu em vez de usar o próximo peso elegível');

const isolatedBossRush=harness({random:()=>0,bossRush:()=>true});ok(!isolatedBossRush.system.tryStartAfterWave(1,()=>{}),'evento vazou para Boss Rush');
const isolatedDungeon=harness({random:()=>0,dungeon:()=>true});ok(!isolatedDungeon.system.tryStartAfterWave(1,()=>{}),'evento vazou para Dungeon');

for(const contract of [
  'campaignEvents.tryStartAfterWave(wave,continueBetweenWaves)',
  'const campaignEventActive=campaignEvents.isActive()',
  '!campaignEventActive&&campaignObjectives.allowNormalSpawns()',
])ok((campaign+'\n'+html).includes(contract),`integração de evento ausente: ${contract}`);
for(const contract of [
  'getMerlinLevel:()=>Number(metaUpgrades.exp_eventos||0)',
  'getBlessingOffers:count=>typeof rollCardOffer',
  'addTimedModifier:modifier=>campaignObjectives.addTimedModifier(modifier)',
])ok(runtime.includes(contract),`adaptador de evento ausente: ${contract}`);
ok(!source.includes('localStorage')&&!source.includes('SaveSystem'),'evento temporário não deve persistir no save');
ok(html.includes('<script src="src/campaign/campaign-events.js"></script>'),'index não carrega campaign-events.js');
ok(bossRush.includes("cleanupCampaignRuntime('boss-rush-start')")&&bossRush.includes("cleanupCampaignRuntime('boss-rush-end')"),'Boss Rush não limpa eventos/objetivos');
ok(dungeon.includes("cleanupCampaignRuntime('dungeon')"),'Dungeon não limpa eventos/objetivos');

console.log(`OK: seis eventos, pesos Merlin, escolhas compartilhadas, recompensas, exclusões e cleanup validados (${checks} verificações).`);
