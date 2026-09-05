import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const source=read('src/core/run-stats-system.js');
const html=read('index.html');
let checks=0;
function assert(condition,message){if(!condition)throw new Error(`FALHA: ${message}`);checks++;}

new vm.Script(source,{filename:'src/core/run-stats-system.js'});
const statsAt=html.indexOf('<script src="src/core/run-stats-system.js');
const achievementsAt=html.indexOf('<script src="src/progression/achievement-system.js');
assert(statsAt>=0,'index.html nao carrega o sistema de telemetria');
assert(statsAt<achievementsAt,'telemetria deve carregar antes das conquistas');
assert(html.includes("PostRunScreen.finishAndOpen('defeat'"),'derrota principal nao abre o pos-run unificado');
assert(read('src/campaign/boss-rush-system.js').includes("PostRunScreen.finishAndOpen('victory'"),'vitoria nao abre o pos-run unificado');

const storage=new Map([
  ['mago_x_hordas_run_records_v1',[]],
  ['mago_x_hordas_run_history_v1',{corrupted:true}],
]);
const sandbox={
  console,Date,JSON,
  SaveSystem:{
    readJSON(key,fallback){return storage.has(key)?structuredClone(storage.get(key)):structuredClone(fallback);},
    writeJSON(key,value){storage.set(key,structuredClone(value));return true;},
  },
};
sandbox.window=sandbox;
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'src/core/run-stats-system.js'});
const stats=sandbox.RunStats;
assert(stats&&!stats.active,'sistema deve iniciar sem run fantasma');

const events=[];stats.on('*',event=>events.push(event.type));
stats.start({mode:'campaign',difficulty:'hard',threatLevel:4,players:[{classId:'mage',skinId:'imperial_time'},{classId:'viking'}]});
assert(stats.active&&stats.getSnapshot().coop,'run cooperativa nao foi iniciada');
assert(stats.getSnapshot().players[0].skinId==='imperial_time'&&stats.getSnapshot().players[1].skinId==='classic','skin escolhida nao foi preservada no resumo da run');
stats.tick(1000,{paused:true,players:[{hp:100,maxHp:100},{hp:100,maxHp:100}]});
stats.tick(1500,{players:[{hp:100,maxHp:100},{hp:100,maxHp:100}]});
assert(stats.getSnapshot().elapsedMs===1000,'delta deve ser limitado e pausa nao pode contar tempo');

const attackA=stats.createAttackEvent(0),attackB=stats.createAttackEvent(0);
assert(attackA!==attackB,'dois ataques sem abate receberam o mesmo attackEventId');
assert(stats.recordDamage({playerIndex:0,hpBefore:30,hpAfter:-20,sourceType:'weapon',sourceId:'staff',sourceName:'Cajado',rarity:'epic',attackEventId:attackA})===30,'dano efetivo nao foi limitado pela vida restante');
assert(stats.recordDamageTaken({playerIndex:1,hpBefore:50,hpAfter:35})===15,'dano recebido pos-mitigacao incorreto');
assert(stats.recordHeal({playerIndex:1,hpBefore:35,hpAfter:70,maxHp:60})===25,'cura efetiva nao foi limitada pela vida maxima');
stats.recordCritical({playerIndex:0,attackEventId:attackA});
stats.recordCritical({playerIndex:0,attackEventId:attackA});
assert(stats.getSnapshot().team.criticals===1,'callback critico duplicado do mesmo ataque foi contado duas vezes');
stats.recordKill({playerIndex:0,count:5,elite:true,sourceType:'weapon',sourceId:'staff',sourceName:'Cajado',attackEventId:attackA});
stats.recordKill({playerIndex:0,count:3,sourceType:'weapon',sourceId:'staff',sourceName:'Cajado',attackEventId:attackA});
assert(stats.getSnapshot().maxMultiKill===8,'multikill nao agrupa o mesmo ciclo de ataque');

stats.recordWeapon({playerIndex:0,id:'staff',name:'Cajado',rarity:'legendary'});
stats.recordBlessing({playerIndex:0,id:'ares-1',name:'Furia',deity:'Ares',rarity:'rare'});
stats.recordPet({id:'aegis',name:'Aegis'});
stats.recordDash({playerIndex:1});
stats.recordCoins({playerIndex:0,amount:25});stats.recordCoins({playerIndex:0,amount:7,spent:true});
stats.recordXP({playerIndex:1,amount:44,level:3});
stats.recordWaveCompleted({wave:1});
stats.tick(1000,{players:[{hp:10,maxHp:100},{hp:35,maxHp:100}]});
for(let i=0;i<29;i++)stats.tick(1000,{players:[{hp:60,maxHp:100},{hp:35,maxHp:100}]});
assert(events.includes('nearDeathSurvived'),'Por um Fio parou de contar depois que o jogador se curou');
assert(stats.getSnapshot().players[0].lowestHpPercent===10,'menor percentual de vida da run nao foi preservado');
stats.recordBossStart({id:'skeleton_king',name:'Rei Cadaver'});
stats.tick(1000,{players:[{hp:60,maxHp:100},{hp:35,maxHp:100}]});
const fight=stats.recordBossEnd({id:'skeleton_king',name:'Rei Cadaver',playerIndex:0});
assert(fight.durationMs===1000&&fight.damageTaken===0,'cronometro ou dano do chefe incorreto');
stats.recordBossEnd({id:'skeleton_king',name:'Rei Cadaver',playerIndex:0});
assert(stats.getSnapshot().team.bosses===1,'callback duplicado de derrota de chefe contou duas vitorias');

const result=stats.finish('victory',{wave:25,chapter:5,level:12});
assert(result.result==='victory'&&result.maxWave===25&&result.team.damageDealt===30,'resumo final perdeu resultado, onda ou dano');
assert(result.team.damageTaken===15&&result.team.healing===75,'resumo final perdeu defesa ou cura efetiva observada');
assert(result.team.coinsEarned===25&&result.team.coinsSpent===7&&result.team.xpEarned===44,'economia ou XP incorretos');
assert(result.damageBySource.Cajado===30&&!('attackEvents' in result)&&!('criticalEvents' in result),'atribuicao ou serializacao publica incorreta');
assert(result.campaignBosses.includes('skeleton_king'),'chefe principal nao foi associado a campanha');
assert(Array.isArray(storage.get(stats.HISTORY_KEY))&&storage.get(stats.HISTORY_KEY).length===1,'historico corrompido nao foi recuperado');
stats.finish('defeat');
assert(storage.get(stats.HISTORY_KEY).length===1,'finalizacao repetida duplicou recompensas/historico');

stats.start({mode:'bossrush',players:[{classId:'mage'}]});
stats.recordBossStart({id:'skeleton_king',name:'Rei Cadaver'});stats.recordBossEnd({id:'skeleton_king',name:'Rei Cadaver'});
const fresh=stats.getSnapshot();
assert(fresh.team.kills===0&&fresh.team.damageDealt===0&&fresh.campaignBosses.length===0,'nova run herdou dados ou Boss Rush contaminou Campanha');
stats.start({mode:'campaign',players:[{classId:'warrior'}]});
stats.recordBossStart({id:'balrog',name:'Balrog'});stats.tick(1000,{players:[{hp:20,maxHp:100}]});
const defeat=stats.finish('defeat',{wave:25});
assert(defeat.team.bosses===0&&defeat.bossFights.length===1&&!defeat.bossFights[0].victory&&defeat.defeatedBy==='Balrog','derrota durante chefe nao foi registrada sem conceder a kill');
assert(events.includes('runStarted')&&events.includes('runFinished')&&events.includes('enemyKilled'),'barramento de eventos nao publicou o ciclo esperado');

console.log(`OK: telemetria de run valida dano/cura efetivos, co-op, fontes, chefes, economia, reset, historico e idempotencia (${checks} verificacoes).`);
