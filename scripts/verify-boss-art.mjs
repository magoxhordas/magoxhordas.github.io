import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const html=read('index.html');
const bossSource=read('src/campaign/boss-system.js');
const rushSource=read('src/campaign/boss-rush-system.js');
const codexSource=read('src/ui/menu-codex-system.js');
const scripts=[
  ['OrcSprites','src/bosses/orc-sprites.js','assets/bosses/orc/icon.png'],
  ['SkelKingSprites','src/bosses/skelking-sprites.js','assets/bosses/skelking/icon.png'],
  ['IceGolemSprites','src/bosses/icegolem-sprites.js','assets/bosses/icegolem/icon.png'],
  ['BalrogSprites','src/bosses/balrog-sprites.js','assets/bosses/balrog/icon.png'],
  ['AracneSprites','src/bosses/aracne-sprites.js','assets/bosses/aracne/icon.png'],
  ['SandwormSprites','src/bosses/sandworm-sprites.js','assets/bosses/sandworm/icon.png'],
];
let checks=0;
function assert(condition,message){if(!condition)throw new Error(`FALHA: ${message}`);checks++;}

const bossSystemIndex=html.indexOf('<script src="src/campaign/boss-system.js');
assert(bossSystemIndex>0,'boss-system nao foi carregado');
for(const [,script,icon] of scripts){
  const tag=`<script src="${script}"></script>`;
  assert(html.includes(tag),`${script} nao foi ligado ao index`);
  assert(html.indexOf(tag)<bossSystemIndex,`${script} carrega depois das classes de chefe`);
  assert(fs.existsSync(path.join(root,script)),`${script} ausente`);
  assert(fs.existsSync(path.join(root,icon)),`${icon} ausente`);
  assert(rushSource.includes(icon),`${icon} ausente do modo Chefao`);
  assert(codexSource.includes(icon),`${icon} ausente do Codex`);
}

const requested=[];
class MockImage{
  constructor(){this.complete=true;this.naturalWidth=64;this.naturalHeight=64;}
  set src(value){this._src=value;requested.push(value);}
  get src(){return this._src;}
}
const sandbox={console,Image:MockImage};sandbox.window=sandbox;
vm.createContext(sandbox);
for(const [globalName,script] of scripts){
  new vm.Script(read(script),{filename:script}).runInContext(sandbox);
  const api=sandbox[globalName];
  assert(api&&typeof api.desenhar==='function'&&typeof api.quadro==='function',`${globalName} nao exportou a API de desenho`);
  assert(api.pronto(),`${globalName} nao ficou pronto com imagens carregadas`);
}
for(const asset of new Set(requested)){
  assert(asset.startsWith('assets/bosses/'),`controlador tentou carregar caminho externo: ${asset}`);
  assert(fs.existsSync(path.join(root,asset)),`quadro referenciado nao existe: ${asset}`);
}

for(const marker of [
  'window.OrcSprites','window.SkelKingSprites','window.IceGolemSprites',
  'window.BalrogSprites','window.AracneSprites','window.SandwormSprites',
  "estado='rock'","estado='spin'","estado='shield'","arteEstado='whip'",
  "estado='web'","estado='acid'",
])assert(bossSource.includes(marker),`integracao de chefe ausente: ${marker}`);

const assetCount=fs.readdirSync(path.join(root,'assets/bosses'),{recursive:true,withFileTypes:true})
  .filter(entry=>entry.isFile()).length;
assert(assetCount===565,`esperados 565 assets de chefes, encontrados ${assetCount}`);

console.log(`OK: 6 chefes usam 565 assets, controladores reais, ataques animados e retratos no modo Chefao/Codex (${checks} verificacoes).`);
