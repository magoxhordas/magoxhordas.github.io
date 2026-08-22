import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html').replace(/\r\n/g,'\n');
const saveSource=read('src/core/save-system.js');
const persistenceSource=[html,read('src/campaign/boss-rush-system.js'),read('src/dungeon/dungeon-system.js')].join('\n');

function assert(condition,message){
  if(!condition) throw new Error(message);
}

function between(source,start,end,context){
  const startAt=source.indexOf(start);
  const endAt=source.indexOf(end,startAt+start.length);
  assert(startAt>=0&&endAt>startAt,`${context}: bloco nao foi localizado`);
  return source.slice(startAt,endAt);
}

function createStorage(initial={}){
  const values=new Map(Object.entries(initial).map(([key,value])=>[String(key),String(value)]));
  return {
    values,
    api:{
      getItem(key){return values.has(String(key))?values.get(String(key)):null;},
      setItem(key,value){values.set(String(key),String(value));},
      removeItem(key){values.delete(String(key));},
    }
  };
}

function boot(initial={}){
  const storage=createStorage(initial);
  const sandbox={console,localStorage:storage.api,Date,JSON};
  sandbox.window=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(saveSource,sandbox,{filename:'src/core/save-system.js'});
  return {sandbox,storage};
}

// O modulo externo ocupa exatamente o ponto do antigo IIFE e antecede consumidores.
const saveTag='<script src="src/core/save-system.js"></script>';
const tagAt=html.indexOf(saveTag);
const firstConsumerAt=html.indexOf("SaveSystem.readJSON('mago_hordas_v4'");
assert(tagAt>=0,'index.html nao carrega src/core/save-system.js');
assert(firstConsumerAt>tagAt,'SaveSystem carrega depois do primeiro consumidor');
assert(!html.includes("const MANIFEST_KEY='mago_x_hordas_save_manifest';"),'implementacao do SaveSystem ainda esta inline');
new Function(saveSource);

// API, versao, texto, numeros, manifest e remocao preservam o comportamento atual.
const {sandbox,storage}=boot();
const SaveSystem=sandbox.SaveSystem;
assert(SaveSystem&&SaveSystem.version===2,'versao publica do SaveSystem foi alterada');
assert(JSON.stringify(Object.keys(SaveSystem))===JSON.stringify([
  'version','readText','writeText','readJSON','writeJSON','readNumber','remove','getManifest'
]),'API publica ou ordem das propriedades do SaveSystem foi alterada');
assert(SaveSystem.readText('ausente','padrao')==='padrao','fallback de texto foi alterado');
assert(SaveSystem.writeText('texto',17)===true&&storage.values.get('texto')==='17','writeText nao preserva conversao para string');
assert(SaveSystem.readNumber('texto',0)===17,'readNumber nao restaura numero valido');
storage.values.set('texto','nao-numero');
assert(SaveSystem.readNumber('texto',9)===9,'readNumber nao preserva fallback invalido');
const manifestBefore=SaveSystem.getManifest();
manifestBefore.keys.mutacao_externa=1;
assert(!SaveSystem.getManifest().keys.mutacao_externa,'getManifest deixou de retornar copia isolada');
assert(SaveSystem.remove('texto')===true&&!storage.values.has('texto'),'remove deixou de remover a chave');
assert(storage.values.has('mago_x_hordas_save_manifest'),'manifesto nao e atualizado pelas escritas');

// Save antigo, migracao opcional, validacao, round-trip e JSON corrompido.
const legacyManifest={version:1,updatedAt:10,keys:{mago_hordas_v4:10}};
const legacyPayload={
  inventory:{trigo:4,madeira:7},
  totalWaves:12,
  metaUpgrades:{vida:2},
  farmCells:[{state:'watered',seed:'semente_trigo',wavesWatered:1,wavesToGrow:3}],
  workshopUpgrades:{forja:1},
};
const legacy=boot({
  mago_x_hordas_save_manifest:JSON.stringify(legacyManifest),
  mago_hordas_v4:JSON.stringify(legacyPayload),
});
let migrateVersion=null;
const loadedLegacy=legacy.sandbox.SaveSystem.readJSON('mago_hordas_v4',null,{
  migrate(value,version){migrateVersion=version;return value;},
  validate:value=>!!value&&typeof value==='object'&&!Array.isArray(value),
});
assert(migrateVersion===1,'versao antiga do manifesto nao chega ao callback de migracao');
assert(JSON.stringify(loadedLegacy)===JSON.stringify(legacyPayload),'save antigo foi alterado durante a leitura');
assert(legacy.sandbox.SaveSystem.readJSON('mago_hordas_v4','invalido',{validate:()=>false})==='invalido','validate nao preserva o fallback');
assert(legacy.sandbox.SaveSystem.writeJSON('roundtrip',legacyPayload),'writeJSON falhou');
assert(JSON.stringify(legacy.sandbox.SaveSystem.readJSON('roundtrip',null))===JSON.stringify(legacyPayload),'save -> load alterou o payload');
legacy.storage.values.set('corrompido','{json-invalido');
assert(legacy.sandbox.SaveSystem.readJSON('corrompido','seguro')==='seguro','JSON invalido nao usa fallback');
const corrupt=JSON.parse(legacy.storage.values.get('mago_x_hordas_corrupt_backup'));
assert(corrupt.key==='corrompido'&&corrupt.raw==='{json-invalido'&&typeof corrupt.at==='number','backup de JSON corrompido foi alterado');

// O carregador principal continua restaurando inventario, farming, progresso e upgrades.
const loadPersistentSource=between(html,'function loadPersistentData(){','let _saveDebounceTimer=null;','loadPersistentData');
const loadStorage=createStorage({mago_hordas_v4:JSON.stringify(legacyPayload)});
const loadSandbox={
  console,localStorage:loadStorage.api,Date,JSON,
  globalInventory:{trigo:1,pedra:2},totalWavesSurvived:0,metaUpgrades:{sorte:1},
  farmCells:[],workshopUpgrades:{bancada:1},
};
loadSandbox.window=loadSandbox;
vm.createContext(loadSandbox);
vm.runInContext(saveSource,loadSandbox,{filename:'src/core/save-system.js'});
vm.runInContext(loadPersistentSource,loadSandbox,{filename:'load-persistent-data.js'});
vm.runInContext('loadPersistentData()',loadSandbox);
assert(loadSandbox.globalInventory.trigo===4&&loadSandbox.globalInventory.madeira===7&&loadSandbox.globalInventory.pedra===2,'inventario nao foi restaurado/mesclado como antes');
assert(loadSandbox.totalWavesSurvived===12,'total de ondas nao foi restaurado');
assert(loadSandbox.metaUpgrades.vida===2&&loadSandbox.metaUpgrades.sorte===1,'meta upgrades nao foram restaurados/mesclados');
assert(loadSandbox.farmCells.length===1&&loadSandbox.farmCells[0].state==='watered','farming nao foi restaurado');
assert(loadSandbox.workshopUpgrades.forja===1&&loadSandbox.workshopUpgrades.bancada===1,'upgrades da oficina nao foram restaurados/mesclados');

// O gravador principal continua emitindo as mesmas cinco propriedades e a mesma chave.
const savePersistentSource=between(html,'let _saveDebounceTimer=null;','// ── Loot drop durante o jogo','savePersistentData');
Object.assign(loadSandbox,{
  clearTimeout(){},setTimeout(){throw new Error('save imediato nao deve agendar timeout');},
});
vm.runInContext(savePersistentSource,loadSandbox,{filename:'save-persistent-data.js'});
vm.runInContext('savePersistentData(true)',loadSandbox);
const savedMain=JSON.parse(loadStorage.values.get('mago_hordas_v4'));
assert(JSON.stringify(Object.keys(savedMain))===JSON.stringify([
  'inventory','totalWaves','metaUpgrades','farmCells','workshopUpgrades'
]),'formato do payload mago_hordas_v4 foi alterado');
assert(savedMain.inventory.trigo===4&&savedMain.farmCells[0].state==='watered','payload principal perdeu inventario ou farming');

// Inventario completo de chaves publicas: nenhuma chave foi renomeada ou removida.
for(const contract of [
  "'mago_hordas_v4'","'mvh_pets'","'mvh_pet_levels'","'mvh_pet_missions'",
  "'mvh_pet_met_'","'mvh_farm_plots'","'mvh_max_wave'","'mvh_enemies'",
  "'mvh_campaign_complete'","'mago_x_hordas_settings_v1'",
  "'mago_x_hordas_skin_progress_v1'","'magoVsHordas_MVP_Save'","'mvh_fish'",
  "'mvh_arq_falou'",
]) assert(persistenceSource.includes(contract),`chave de persistencia ausente ou renomeada: ${contract}`);
assert(saveSource.includes("'mago_x_hordas_save_manifest'")&&saveSource.includes("'mago_x_hordas_corrupt_backup'"),'chaves internas de seguranca foram alteradas');

// A unica persistencia direta legada continua restrita ao dialogo do arqueiro.
const directStorage=[...html.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(([^\n]*)/g)].map(match=>match[0]);
assert(directStorage.length===2&&directStorage.every(call=>call.includes('mvh_arq_falou')),'index.html voltou a acessar localStorage fora do dialogo legado do arqueiro');

// O resgate de posicao do acampamento permanece responsabilidade do CampV2.
assert(html.includes('function reposicionarSeBloqueado()')&&
  html.includes('dimensionar();\n    reposicionarSeBloqueado();\n    retomar();')&&
  html.includes('S.x=.497*MW; S.y=.760*MH;'),'reposicionamento seguro do acampamento foi alterado');

console.log('OK: SaveSystem externo preserva API, 16 chaves, saves antigos, payload principal, farming, inventario, unlocks e resgate do acampamento.');
