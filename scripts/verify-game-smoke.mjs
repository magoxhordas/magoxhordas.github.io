import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html');

function assert(condition,message){
  if(!condition) throw new Error(message);
}

function includesAll(source,values,context){
  for(const value of values){
    assert(source.includes(value),`${context}: contrato ausente: ${value}`);
  }
}

function between(source,start,end,context){
  const startAt=source.indexOf(start);
  const endAt=source.indexOf(end,startAt+start.length);
  assert(startAt>=0&&endAt>startAt,`${context}: bloco nao foi localizado`);
  return source.slice(startAt,endAt);
}

// Inicializacao: todo JavaScript carregado pelo documento deve existir e compilar.
const scriptTags=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
assert(scriptTags.length>0,'index.html nao possui scripts');
let inlineCount=0;
for(const [,attributes,source] of scriptTags){
  const srcMatch=attributes.match(/\bsrc=["']([^"']+)["']/i);
  if(srcMatch){
    const src=srcMatch[1];
    if(!/^(?:https?:)?\/\//i.test(src)){
      const cleanSrc=src.split(/[?#]/,1)[0];
      const absolute=path.join(root,cleanSrc);
      assert(fs.existsSync(absolute),`script externo nao existe: ${cleanSrc}`);
      new Function(fs.readFileSync(absolute,'utf8'));
    }
  }else{
    inlineCount++;
    new Function(source);
  }
}
assert(inlineCount>0,'nenhum script inline foi validado');
includesAll(html,["let state='menu', keys={}, raf=null;",'let player, player2, enemies, projs, coins, parts, meleeAnims, firePatches;'],'inicializacao');

// Menu e telas: protege os pontos de entrada, sem validar pixels ou layout.
const screens=between(html,'const DEFAULT_SCREENS=[','];','telas do menu');
includesAll(screens,[
  "'main-menu'","'play-menu'","'pause-menu'","'shop'","'gameover'","'char-select'",
  "'temple-screen'","'hub-screen'","'collection-screen'","'bossrush-screen'",
  "'dungeon-screen'","'settings-screen'"
],'telas do menu');
includesAll(html,[
  'function showScreen(id)',
  'function hideAllScreens()',
  'function openBossRushMenu()',
  'window.startDungeonMode = function()',
  'window.CampV2 = (function(){',
],'entradas do menu');

// Selecao: as quatro classes e seus contratos basicos permanecem registradas.
const classDefs=between(html,'const CLASS_DEFS = {','const classes=','classes');
for(const [id,name] of Object.entries({mage:'Mago',archer:'Arqueiro',warrior:'Guerreiro',viking:'Viking'})){
  assert(new RegExp(`\\b${id}:\\s*\\{`).test(classDefs),`classe ausente: ${id}`);
  assert(classDefs.includes(`name:'${name}'`),`nome da classe foi alterado: ${name}`);
}
assert(/const classes\s*=\s*\[['"]mage['"],['"]warrior['"],['"]archer['"],['"]viking['"]\]/.test(html),'ordem/lista de classes foi alterada');

// Campanha: biomas e marcos de capitulos devem continuar iguais.
const arenaBounds=between(html,'const CAMPAIGN_ARENA_BOUNDS=Object.freeze({','});','arenas da campanha');
for(const arena of ['crypt','forest','snow','desert','volcano']){
  assert(new RegExp(`\\b${arena}:\\s*\\{`).test(arenaBounds),`arena da campanha ausente: ${arena}`);
}
const chapters=between(html,'const CAMPAIGN_CHAPTERS={','};','capitulos da campanha');
for(const [wave,arena] of [[1,'crypt'],[6,'forest'],[11,'snow'],[16,'desert'],[21,'volcano']]){
  assert(new RegExp(`${wave}:\\s*\\{[^}]*arena:['"]${arena}['"]`).test(chapters),`capitulo da onda ${wave} nao aponta para ${arena}`);
}
includesAll(html,['function beginGame()','class Player','class Enemy','function spawnEnemy()','function endWave()'],'fluxo de campanha/combate');

// Acampamento: CampV2 deve carregar e consumir os oito modulos extraidos.
const campModules=[
  ['src/camp/collision-map.js','CampCollisionMap'],
  ['src/camp/layout-data.js','CampLayoutData'],
  ['src/camp/farming-data.js','CampFarmingData'],
  ['src/camp/farming-system.js','CampFarmingSystem'],
  ['src/camp/interaction-data.js','CampInteractionData'],
  ['src/camp/environment-renderer.js','CampEnvironmentRenderer'],
  ['src/camp/pet-system.js','CampPetSystem'],
  ['src/camp/archer-system.js','CampArcherSystem'],
];
const campEntryAt=html.indexOf('window.CampV2 = (function(){');
assert(campEntryAt>=0,'CampV2 nao foi registrado');
for(const [file,globalName] of campModules){
  const tag=`src="${file}"`;
  const tagAt=html.indexOf(tag);
  assert(tagAt>=0,`modulo do acampamento nao e carregado: ${file}`);
  assert(tagAt<campEntryAt,`modulo do acampamento carrega depois de CampV2: ${file}`);
  assert(html.slice(campEntryAt).includes(globalName),`CampV2 nao consome ${globalName}`);
}

// Farming: valida o modulo real e os 15 canteiros sem refatorar o sistema.
const campSandbox={console,performance:{now:()=>1200}};
campSandbox.window=campSandbox;
vm.createContext(campSandbox);
for(const [file] of campModules){
  vm.runInContext(read(file),campSandbox,{filename:file});
}
assert(campSandbox.CampFarmingData.SEMENTES.length===5,'catalogo de sementes foi alterado');
const {HORTA}=campSandbox.CampLayoutData;
const farmState={camX:0,camY:0,semente:'semente_trigo',aviso:'',avisoAte:0};
campSandbox.globalInventory={semente_trigo:1};
campSandbox.selectedSeed=null;
campSandbox.activeTool=null;
campSandbox.farmCells=Array.from({length:15},()=>({state:'empty',seed:null}));
campSandbox.farmAction=(idx)=>{
  const cell=campSandbox.farmCells[idx];
  if(campSandbox.activeTool==='plant'&&cell.state==='plowed'){
    cell.state='planted';
    cell.seed=campSandbox.selectedSeed;
  }else if(campSandbox.activeTool==='water'&&cell.state==='planted'){
    cell.state='watered';
  }else if(campSandbox.activeTool==='harvest'&&cell.state==='ready'){
    cell.state='empty';
    cell.seed=null;
  }
};
const px=(rect)=>({x:rect.fx*1447,y:rect.fy*1087,w:rect.fw*1447,h:rect.fh*1087});
const dentro=(x,y,rect)=>{const box=px(rect);return x>=box.x&&x<=box.x+box.w&&y>=box.y&&y<=box.y+box.h;};
const farming=campSandbox.CampFarmingSystem.create({
  HORTA,
  SEMENTES:campSandbox.CampFarmingData.SEMENTES,
  NOME_SEM:campSandbox.CampFarmingData.NOME_SEM,
  ACAO:campSandbox.CampFarmingData.ACAO,
  S:farmState,px,dentro,
});
assert(farming.CANTEIROS.length===15,'quantidade de canteiros foi alterada');
campSandbox.farmCells[0].state='plowed';
farming.usarCanteiro(farming.CANTEIROS[0]);
assert(campSandbox.farmCells[0].state==='planted'&&campSandbox.farmCells[0].seed==='semente_trigo','contrato de plantio foi alterado');
farming.usarCanteiro(farming.CANTEIROS[0]);
assert(campSandbox.farmCells[0].state==='watered','contrato de rega foi alterado');
campSandbox.farmCells[0].state='ready';
farming.usarCanteiro(farming.CANTEIROS[0]);
assert(campSandbox.farmCells[0].state==='empty'&&campSandbox.farmCells[0].seed===null,'contrato de colheita foi alterado');
includesAll(read('src/camp/farming-data.js'),["watered:'Crescendo...'","ready:'Colher'"],'rega e colheita');

// Chefes: protege os cinco chefes de capitulo e seus mapas.
for(const bossClass of ['BossSkeletonKing','BossAracne','BossFrostBehemoth','BossSandworm','BossBalrog']){
  assert(html.includes(`class ${bossClass}`),`classe de chefe ausente: ${bossClass}`);
}
const bossRush=between(html,'const BOSS_RUSH_LIST=[','];','registro de chefes');
for(const [id,wave,arena] of [
  ['skeleton_king',5,'crypt'],['aracne',10,'forest'],['frost',15,'snow'],
  ['sandworm',20,'desert'],['balrog',25,'volcano'],
]){
  assert(new RegExp(`id:['"]${id}['"][^\\n]*wave:${wave}[^\\n]*arena:['"]${arena}['"]`).test(bossRush),`registro do chefe ${id} foi alterado`);
}

// Dungeon: somente os contratos principais e o ponto de entrada.
includesAll(html,['const DNG={','window.DNG = DNG;','window.startDungeonMode = function()','DNG.start();'],'Dungeon');

// Save atual: documenta chaves, payload, fallbacks e tolerancia a JSON invalido.
const inlineScripts=scriptTags
  .filter(([,attributes])=>!attributes.match(/\bsrc=/i))
  .map(([, ,source])=>source);
const saveSource=inlineScripts.find(source=>source.includes("const MANIFEST_KEY='mago_x_hordas_save_manifest';")) ||
  read('src/core/save-system.js');
assert(saveSource,'SaveSystem atual nao foi localizado');
const storage=new Map();
const localStorage={
  getItem(key){return storage.has(String(key))?storage.get(String(key)):null;},
  setItem(key,value){storage.set(String(key),String(value));},
  removeItem(key){storage.delete(String(key));},
};
const saveSandbox={console,localStorage,Date,JSON};
saveSandbox.window=saveSandbox;
vm.createContext(saveSandbox);
vm.runInContext(saveSource,saveSandbox,{filename:'inline-save-system.js'});
assert(saveSandbox.SaveSystem&&saveSandbox.SaveSystem.version===2,'SaveSystem/version atual foi alterado');
includesAll(Object.keys(saveSandbox.SaveSystem).join(','),[
  'readText','writeText','readJSON','writeJSON','readNumber','remove','getManifest'
],'API do SaveSystem');
const legacyPayload={inventory:{trigo:4},totalWaves:9,metaUpgrades:{vida:2},farmCells:[{state:'watered'}],workshopUpgrades:{forja:1}};
storage.set('mago_hordas_v4',JSON.stringify(legacyPayload));
assert(JSON.stringify(saveSandbox.SaveSystem.readJSON('mago_hordas_v4',null))===JSON.stringify(legacyPayload),'save antigo nao e aceito sem alteracao');
assert(saveSandbox.SaveSystem.readJSON('chave_ausente',{fallback:true}).fallback===true,'fallback de chave ausente foi alterado');
assert(saveSandbox.SaveSystem.writeJSON('smoke_roundtrip',legacyPayload),'save de round-trip falhou');
assert(JSON.stringify(saveSandbox.SaveSystem.readJSON('smoke_roundtrip',null))===JSON.stringify(legacyPayload),'save -> load nao preserva dados');
storage.set('smoke_corrompido','{json-invalido');
assert(saveSandbox.SaveSystem.readJSON('smoke_corrompido','fallback')==='fallback','JSON invalido nao usa fallback');
assert(storage.has('mago_x_hordas_corrupt_backup'),'JSON invalido nao cria o backup de seguranca atual');
includesAll(html,[
  "SaveSystem.readJSON('mago_hordas_v4'",
  "SaveSystem.writeJSON('mago_hordas_v4',payload)",
  'inventory: globalInventory',
  'totalWaves: totalWavesSurvived',
  'metaUpgrades, farmCells: farmCells.map',
  'workshopUpgrades,',
  "SaveSystem.readNumber('mvh_farm_plots',15)",
],'persistencia atual');

const inputSource=inlineScripts.find(source=>source.includes('global.InputManager={'))||read('src/core/input-system.js');
includesAll(inputSource,['global.InputManager={','registerScope','pressVirtual','releaseAll','onPointerAttack'],'input central');

// A proxima fase depende destes contratos permanecerem intactos ate a extracao.
includesAll(html,['const Audio = (function(){','let musicVol = 0.48, sfxVol = 0.65, attackVol = 0.65;'],'audio ainda inline');

console.log(`OK: smoke do jogo validou ${inlineCount} scripts, menu, classes, campanha, combate, acampamento, farming, chefes, Dungeon e save.`);
