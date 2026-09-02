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

assert(html.includes('<title>Mago X Hordas</title>'),'titulo da aba deve exibir o nome sem espadas');
assert(html.includes('<link rel="icon" type="image/png" href="assets/heroes/mage/icon.png">'),'favicon do mago deve ser preservado');
const codexBackStyle=html.match(/#collection-screen \.coll-back-btn\s*\{([^}]+)\}/)?.[1]||'';
assert(codexBackStyle.includes('justify-content:center;')&&codexBackStyle.includes('text-align:center;'),'texto Voltar deve ser centralizado somente no botão do Códex');
assert(/<button class="menu-btn coll-back-btn" onclick="closeCollection\(\)"[^>]*>Voltar<\/button>/.test(html),'botão Voltar perdeu o estilo dedicado ou a ação de fechar o Códex');

// Executa o renderer real com progresso antigo, sem escrever em saves.
const bossRenderer=menu.slice(menu.indexOf('function renderCollBosses(grid){'),menu.indexOf('// ── PETS ──'));
const progressRenderer=menu.slice(menu.indexOf('function _updateCollProgress(){'),menu.indexOf('function renderCollGrid(){'));
let maxWave=0;
const detail={className:'',innerHTML:''},fill={style:{}},label={textContent:''};
const grid={cards:[],appendChild(card){this.cards.push(card);},querySelectorAll(selector){return selector==='.coll-card'?this.cards:this.cards.filter(card=>!card.locked);}};
const codexContext={
  SaveSystem:{readNumber(key,fallback){assert(key==='mvh_max_wave','Senhores deve reutilizar o progresso salvo');return maxWave??fallback;}},
  document:{getElementById:id=>({'coll-detail':detail,'coll-grid':grid,'coll-prog-fill':fill,'coll-prog-label':label}[id])},
  collCard:(icon,name,hint,locked,onClick)=>({icon,name,hint,locked,onClick}),
  collIconHtml:icon=>`<img src="${icon.artPath}">`,
  collStatBar:(name,value)=>`${name}: ${value}`,
};
vm.createContext(codexContext);
vm.runInContext(`${bossRenderer}\n${progressRenderer}`,codexContext);
const waves=[4,5,9,10,15,20,25];
for(const reached of [0,3,4,5,8,9,10,15,20,25,30]){
  maxWave=reached;grid.cards=[];codexContext.renderCollBosses(grid);codexContext._updateCollProgress();
  assert(grid.cards.length===7,'Senhores precisa conter cinco chefes e dois mini-chefes');
  assert(new Set(grid.cards.map(card=>card.name)).size===7,'Senhores contém entradas duplicadas');
  grid.cards.forEach((card,index)=>{
    assert(card.hint===`Onda ${waves[index]}`,'chefes fora da ordem ou onda incorreta');
    assert(card.locked===(reached<waves[index]),`desbloqueio incorreto: ${card.name} com progresso ${reached}`);
    assert(card.locked?card.onClick===null:typeof card.onClick==='function','carta revelada precisa abrir detalhes, bloqueada não');
    assert(fs.existsSync(path.join(root,card.icon.artPath)),`retrato ausente: ${card.name}`);
  });
  assert(label.textContent===`${waves.filter(wave=>reached>=wave).length} / 7`,'contador de Senhores não acompanha os mini-chefes');
}

// Os números mostrados para os mini-chefes precisam corresponder ao combate.
const objectivesContext={};vm.createContext(objectivesContext);
vm.runInContext(read('src/campaign/campaign-objectives.js'),objectivesContext);
const {CampaignObjectives}=objectivesContext;
let currentWave=4,brute=null,lastDamage=0;
const hero={x:320,y:285,radius:16,maxHp:1000,dead:false};
const objectives=CampaignObjectives.create({
  getWave:()=>currentWave,getPlayers:()=>[hero],getObjectiveHpScale:()=>1,
  spawnMiniboss:(hp,damage)=>(brute={hp,damage}),damagePlayer:(_hero,damage)=>{lastDamage=damage;},
});
objectives.startWave(4);
const bruteCard=grid.cards.find(card=>card.name==='Brutamontes da Guerra');bruteCard.onClick();
assert(detail.innerHTML.includes(`Vida: ${brute.hp}`)&&detail.innerHTML.includes(`Dano: ${brute.damage}`),'Códex do Brutamontes diverge da onda 4');
assert(detail.innerHTML.includes('assets/bosses/orc/icon.png'),'detalhes do Brutamontes perderam a arte');
assert(CampaignObjectives.OBJECTIVE_WAVES[4].id==='brute','onda do Brutamontes diverge do mapa da campanha');
currentWave=9;objectives.startWave(9);
const hunter=objectives.getCombatTargets()[0];objectives.update(1);
const hunterCard=grid.cards.find(card=>card.name==='Aranha Caçadora');hunterCard.onClick();
assert(detail.innerHTML.includes(`Vida: ${hunter.maxHp}`)&&detail.innerHTML.includes(`Dano: ${lastDamage}`),'Códex da Aranha Caçadora diverge da onda 9');
assert(lastDamage>0,'teste da mordida da Aranha Caçadora não atingiu o herói');
assert(detail.innerHTML.includes('assets/enemies/spider2/codex.png'),'Aranha Caçadora deve usar o retrato da arte de combate');
assert(CampaignObjectives.OBJECTIVE_WAVES[9].id==='hunter_spider','onda da Caçadora diverge do mapa da campanha');

console.log(`OK: UI modular preserva menu, selecao, HUD/overlays, loja, Códex, configuracoes e ordem de carga (${checks} verificacoes).`);
