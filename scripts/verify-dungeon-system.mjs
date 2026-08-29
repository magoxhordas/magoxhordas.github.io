import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const html=read('index.html');
const source=read('src/dungeon/dungeon-system.js');
let checks=0;

function assert(condition,message){
  if(!condition) throw new Error(`FALHA: ${message}`);
  checks++;
}

function includesAll(haystack,needles,context){
  for(const needle of needles) assert(haystack.includes(needle),`${context}: ausente ${needle}`);
}

function between(start,end,context){
  const startAt=source.indexOf(start);
  const endAt=source.indexOf(end,startAt+start.length);
  assert(startAt>=0&&endAt>startAt,`${context}: bloco nao localizado`);
  return source.slice(startAt,endAt);
}

new vm.Script(source,{filename:'src/dungeon/dungeon-system.js'});
const tag='<script src="src/dungeon/dungeon-system.js"></script>';
const tagAt=html.indexOf(tag);
assert(tagAt>=0,'index.html nao carrega o modulo da Dungeon');
assert(!html.includes('// DUNGEON MODE — v3: responsivo + visual por arma'),'implementacao da Dungeon ainda esta inline');
assert(tagAt>html.indexOf('<script src="src/core/input-system.js"></script>'),'Dungeon carrega antes do input central');
assert(tagAt>html.indexOf('<script src="src/core/audio-system.js"></script>'),'Dungeon carrega antes do audio central');

includesAll(source,[
  'const T_VOID=0,T_FLOOR=1,T_WALL=2,T_STAIRS=3,T_CHEST=4,T_TORCH=5,T_BARREL=6,T_MERCHANT=7;',
  "const MVP_KEY='magoVsHordas_MVP_Save';",
  'const DTS=40,MW=50,MH=50;',
  'generateMap(fl){',
  'this.map=new Uint8Array(MW*MH);this.rooms=[];this.entities=[];',
  'this._spawnBoss(Math.floor(rm.x+rm.w/2)*DTS+DTS/2',
  'this.map[(rL.y+Math.floor(rL.h/2))*MW+(rL.x+Math.floor(rL.w/2))]=T_STAIRS;',
  'if(Math.random()<0.65){const p=this._rf(rm);if(p)this.map[p.y*MW+p.x]=T_CHEST;}',
  'if(mp) this.map[mp.y*MW+mp.x]=T_MERCHANT;',
], 'geracao e salas');

const rings=between('const DNG_RING_TYPES=[','];','aneis');
const relics=between('const DNG_RELICS=[','];','reliquias');
const enemies=between('const ENEMY_DEFS=[','];','inimigos');
const bosses=between('const BOSS_DEFS=[','];','chefes');
assert((rings.match(/\{id:/g)||[]).length===7,'catalogo de aneis mudou');
assert((relics.match(/\{id:/g)||[]).length===8,'catalogo de reliquias mudou');
assert((enemies.match(/\{name:/g)||[]).length===22,'catalogo de inimigos mudou');
assert((bosses.match(/\{name:/g)||[]).length===18,'catalogo de chefes mudou');

includesAll(source,[
  'hp:Math.round((18+fl*8.5)*hpMult)',
  'dmg:Math.round((3+fl*1.3)*1.0)',
  'const baseHp = 200+fl*62;',
  'if(fl>=3 && Math.random()<0.15){ this._spawnHyperBoss(px,py,fl); return; }',
  'const hp = Math.round((200+fl*62)*3.4);',
  'this.floor++;this.pHp=Math.min(this.pMaxHp,this.pHp+Math.floor(this.pMaxHp*0.30));',
  'this.pMaxHp+=8; this.pDmg=Math.floor(this.pDmg*1.08);',
  'if(this.floor%2===0)setTimeout(()=>this._openShop(),500);',
], 'dificuldade e progressao');

includesAll(source,[
  'if(tile===T_CHEST&&!this._chestCd)',
  'if(Math.random()<0.45){ this._giveGear(rollDngGear(this.floor)); }',
  'if(tile===T_MERCHANT&&!this._merchantCd)',
  'this._openMerchant();',
  'window.DNG_RELICS=DNG_RELICS;',
  'window.DNG_RING_TYPES=DNG_RING_TYPES;',
  'InputManager.registerScope(\'dungeon\'',
  'window.DNG = DNG;',
  'window.startDungeonMode = function(){',
  "Audio.playCombatMusic('dungeon')",
], 'recompensas, contratos e audio');

const stopBlock=between('  stop(){','  _updateHUD(){','limpeza ao sair');
includesAll(stopBlock,[
  'this.menuOpen=false;this.equipOpen=false;this.mapOpen=false;',
  'if(this._mapInt){clearInterval(this._mapInt);this._mapInt=null;}',
  'this._restoreCraftPanel();',
  "document.getElementById('dng-map-overlay')?.remove();",
  "document.getElementById('dng-menu-overlay')?.remove();",
  "document.getElementById('dng-merchant-overlay')?.remove();",
  'extractionState=null;'
], 'limpeza defensiva da Dungeon');

console.log(`OK: Dungeon modular preserva geracao, 22 inimigos, 18 chefes, recompensas, progressao, controles e audio (${checks} verificacoes).`);
