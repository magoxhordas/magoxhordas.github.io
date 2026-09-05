import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const dataSource=read('src/progression/achievement-data.js');
const statsSource=read('src/core/run-stats-system.js');
const systemSource=read('src/progression/achievement-system.js');
const html=read('index.html');
let checks=0;
function assert(condition,message){if(!condition)throw new Error(`FALHA: ${message}`);checks++;}

for(const [name,source] of [['achievement-data',dataSource],['run-stats',statsSource],['achievement-system',systemSource]])new vm.Script(source,{filename:name});
for(const file of ['src/progression/achievement-data.js','src/progression/achievement-system.js','src/progression/achievements.css'])assert(html.includes(file),`index.html nao carrega ${file}`);
assert(html.includes('data-settings-tab="achievements"')&&html.includes('id="settings-achievements-root"'),'quinta aba de Conquistas nao esta nas Configuracoes');

const storage=new Map();
const sandbox={console,Date,JSON,structuredClone,GameSettings:{getProgressSnapshot:()=>({})},PET_DEFS:{wolf:{},cat:{}}};
sandbox.SaveSystem={readJSON:(key,fallback)=>storage.has(key)?structuredClone(storage.get(key)):structuredClone(fallback),writeJSON:(key,value)=>{storage.set(key,structuredClone(value));return true;}};
sandbox.window=sandbox;
vm.createContext(sandbox);
vm.runInContext(dataSource,sandbox,{filename:'src/progression/achievement-data.js'});
vm.runInContext(statsSource,sandbox,{filename:'src/core/run-stats-system.js'});
vm.runInContext(systemSource,sandbox,{filename:'src/progression/achievement-system.js'});
const data=sandbox.AchievementData,ach=sandbox.AchievementSystem,stats=sandbox.RunStats;
assert(data.ACHIEVEMENTS.length===60&&new Set(data.ACHIEVEMENTS.map(item=>item.id)).size===60,'catalogo deve ter exatamente 60 IDs unicos');
const secretIds=data.ACHIEVEMENTS.filter(item=>item.hidden).map(item=>item.id).sort();
assert(JSON.stringify(secretIds)===JSON.stringify(['combat_pressure','excellent_meal','farm_15','flawless_boss','hyper_boss','near_death_survivor'].sort()),'lista de seis conquistas secretas divergiu do contrato');
assert(ach.getSummary().total===60&&ach.getSummary().unlocked===0,'save vazio criou conquistas retroativas sem evidencia');

stats.start({mode:'campaign',difficulty:'hard',players:[{classId:'mage'}]});
stats.recordWaveCompleted({wave:1});
for(let i=0;i<99;i++)stats.recordKill({playerIndex:0,sourceType:'direct',sourceId:'mage'});
assert(!ach.getEntries().find(item=>item.id==='100_kills_run').unlocked,'conquista de 100 abates liberou com 99');
stats.recordKill({playerIndex:0,sourceType:'direct',sourceId:'mage'});
assert(ach.getEntries().find(item=>item.id==='100_kills_run').unlocked,'conquista de 100 abates nao liberou no limiar');
assert(ach.getEntries().find(item=>item.id==='first_steps').unlocked,'primeira onda nao liberou Primeiros Passos');

stats.recordDamage({playerIndex:0,hpBefore:20,hpAfter:0,sourceType:'direct',sourceId:'mage'});
assert(stats.getSnapshot().team.damageDealt===20,'conquistas receberam dano bruto em vez de efetivo');
stats.recordBossStart({id:'skeleton_king',name:'Rei Cadaver'});stats.tick(1000,{players:[{hp:100,maxHp:100}]});stats.recordBossEnd({id:'skeleton_king',name:'Rei Cadaver'});
assert(ach.getEntries().find(item=>item.id==='defeat_skeleton_king').unlocked,'chefe derrotado nao liberou sua conquista');
assert(ach.getEntries().find(item=>item.id==='flawless_boss').unlocked,'chefe sem dano nao liberou conquista secreta');

const finished=stats.finish('victory',{wave:25});
assert(finished.achievementsUnlocked.some(item=>item.id==='end_of_the_horde'),'pos-run nao recebeu conquistas desbloqueadas na sessao');
assert(ach.getEntries().find(item=>item.id==='mage_master').unlocked,'vitoria de Campanha nao liberou dominio da classe');

stats.start({mode:'campaign',players:[{classId:'viking'}]});
stats.recordKill({playerIndex:0,sourceType:'direct'});
const perRun=ach.getEntries().find(item=>item.id==='250_kills_run');
assert(perRun.currentProgress===1,'progresso por run acumulou abates da run anterior');

ach.notify('petCaptured',{captured:1,total:2});ach.notify('petCaptured',{captured:2,total:2});
ach.notify('fishCaught',{quantity:25});ach.notify('cropHarvested',{quantity:15});ach.notify('cookingResult',{quality:'EXCELENTE'});
ach.notify('dungeonEntered');ach.notify('dungeonBossKilled',{total:20,hyper:true});
for(const id of ['first_pet','all_pets','25_fish','farm_15','excellent_meal','enter_dungeon','first_dungeon_boss','20_dungeon_bosses','hyper_boss'])assert(ach.getEntries().find(item=>item.id===id).unlocked,`gatilho confiavel nao liberou ${id}`);

assert(!ach.getEntries().find(item=>item.id==='boss_rush_complete').unlocked,'Boss Rush parcial foi tratado como completo');
ach.notify('bossRushComplete');
assert(ach.getEntries().find(item=>item.id==='boss_rush_complete').unlocked,'conclusao explicita do Boss Rush nao liberou conquista');
assert(storage.has(ach.SAVE_KEY)&&storage.get(ach.SAVE_KEY).version===1,'save versionado das conquistas nao foi persistido');

ach._resetForTests({});
stats.start({mode:'campaign',difficulty:'hard',players:[{classId:'warrior'}]});
stats.recordBossStart({id:'balrog',name:'Balrog'});stats.tick(1000,{players:[{hp:10,maxHp:100}]});stats.finish('defeat',{wave:25});
assert(!ach.getEntries().find(item=>item.id==='defeat_balrog').unlocked&&!ach.getEntries().find(item=>item.id==='end_of_the_horde').unlocked,'derrota em chefe concedeu conquista de kill ou vitoria');
stats.start({mode:'campaign',difficulty:'hard',players:[{classId:'warrior'}]});stats.finish('abandoned',{wave:12});
assert(ach.getEntries().find(item=>item.id==='veteran').currentProgress===0,'run abandonada contou como vitoria');

ach._resetForTests({achievements:{first_steps:{unlocked:true,unlockedAt:'data-invalida'}},counters:{classKills:null}});
const normalizedFirst=ach.getEntries().find(item=>item.id==='first_steps');
assert(normalizedFirst.unlocked&&normalizedFirst.unlockedAt===null,'timestamp corrompido nao foi isolado com seguranca');
assert(ach.getSummary().total===60,'payload logicamente corrompido quebrou a normalizacao');
console.log(`OK: 60 conquistas, 6 secretas, reset por run, gatilhos confiaveis, retroatividade limitada e save seguro validados (${checks} verificacoes).`);
