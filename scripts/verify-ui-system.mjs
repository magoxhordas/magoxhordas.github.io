import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const html=read('index.html');
const files=['src/ui/menu-codex-system.js','src/ui/campaign-overlays.js','src/ui/settings-system.js'];
const sources=Object.fromEntries(files.map(file=>[file,read(file)]));
const menu=sources[files[0]], overlays=sources[files[1]], settings=sources[files[2]];
let checks=0;

function assert(condition,message){
  if(!condition) throw new Error(`FALHA: ${message}`);
  checks++;
}
function includesAll(source,needles,context){
  for(const needle of needles) assert(source.includes(needle),`${context}: ausente ${needle}`);
}

for(const file of files) new vm.Script(sources[file],{filename:file});
for(const file of files){
  const tag=`<script src="${file}"></script>`;
  assert(html.includes(tag),`index.html nao carrega ${file}`);
}
assert(!html.includes('// ── Class selection ──'),'selecao/Codex ainda estao inline');
assert(!html.includes('// WAVE ANNOUNCE overlay'),'overlays da campanha ainda estao inline');
assert(!html.includes('// CONFIGURAÇÕES — áudio, ataque, comandos e resolução'),'configuracoes ainda estao inline');

includesAll(menu,[
  "let selectedClass  = { p1:'mage',  p2:'archer' };",
  'function showScreen(id)',
  'function hideAllScreens()',
  'function openCollection()',
  'function collSetTab(tab)',
  'function renderCollBlessings(grid)',
  'function renderCollDungeon(grid)',
  'function renderShopInventory()',
  'const CODEX_RELIC_ART=Object.freeze({',
  'const CODEX_DEITY_ART=Object.freeze({',
], 'menu, selecao, Códex e paineis');

includesAll(html,[
  'function setCampaignOverlaySuspended(suspended)',
  'function pauseGame()',
  'setCampaignOverlaySuspended(true);',
  'setCampaignOverlaySuspended(false);',
], 'pausa e HUD de missão');
assert((html.match(/pauseGame\(\);/g)||[]).length>=3,'teclado, suspensão e controle móvel não compartilham a pausa protegida');

for(const screen of [
  'main-menu','play-menu','pause-menu','shop','gameover','char-select','temple-screen',
  'hub-screen','collection-screen','bossrush-screen','dungeon-screen','settings-screen'
]) assert(html.includes(`id="${screen}"`)||menu.includes(`'${screen}'`),`tela ausente: ${screen}`);

includesAll(overlays,[
  'function drawWaveAnnounce(t)',
  'function drawBossWarning(t)',
  'function drawBlizzard(t)',
  "5:'💀 ONDA 5 — REI CADÁVER!'",
  "25:'🔥 ONDA 25 — BALROG!'",
  'const snowParticles = Array.from({length:42}',
], 'overlays da campanha');

includesAll(settings,[
  "const STORAGE_KEY='mago_x_hordas_settings_v1';",
  'musicEnabled:true',
  'musicVolume:0.48',
  'attackSoundEnabled:true',
  'attackSoundVolume:0.65',
  'autoAttack:true',
  "moveUp:'KeyW', moveDown:'KeyS', moveLeft:'KeyA', moveRight:'KeyD'",
  "dash:'ShiftLeft', inventory:'KeyI', map:'KeyM', crafting:'KeyT', pause:'Escape'",
  'InputManager.onPointerAttack(handlePointer);',
  'function openSettings(){ GameSettings.open(); }',
  'function closeSettings(){ GameSettings.close(); }',
], 'configuracoes e controles');

const menuAt=html.indexOf('<script src="src/ui/menu-codex-system.js"></script>');
const bossDataAt=html.indexOf('<script src="src/campaign/boss-data.js"></script>');
const audioAt=html.indexOf('<script src="src/core/audio-system.js"></script>');
const settingsAt=html.indexOf('<script src="src/ui/settings-system.js"></script>');
const dungeonAt=html.indexOf('<script src="src/dungeon/dungeon-system.js"></script>');
assert(menuAt>=0&&menuAt<bossDataAt,'menu/Códex mudou de ordem em relacao aos chefes');
assert(audioAt>=0&&settingsAt>audioAt&&settingsAt<dungeonAt,'configuracoes devem carregar entre audio e Dungeon');

console.log(`OK: UI modular preserva menu, selecao, HUD/overlays, loja, Códex, configuracoes e ordem de carga (${checks} verificacoes).`);
