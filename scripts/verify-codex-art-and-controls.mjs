import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

const deityIds=[
  'zeus','ares','hecate','selene','moros','atena','hermes','dionisio',
  'hefesto','artemis','poseidon','hercules','sauron','nazgul','ents'
];
const dungeonIds=[
  'dungeon_exploration','dungeon_enemies','dungeon_bosses',
  'dungeon_equipment','dungeon_shadows','dungeon_crafting',
  'dungeon_chests','dungeon_stairs','dungeon_shops',
  'dungeon_relics','dungeon_minimap'
];

function assert(condition,message){
  if(!condition)throw new Error(message);
}

function verifyPng(relativePath){
  const fullPath=path.join(root,relativePath);
  assert(fs.existsSync(fullPath),`Asset ausente: ${relativePath}`);
  const data=fs.readFileSync(fullPath);
  assert(data.length>10_000,`Asset parece vazio: ${relativePath}`);
  assert(data.toString('ascii',1,4)==='PNG',`Asset não é PNG: ${relativePath}`);
  assert(data.readUInt32BE(16)===320&&data.readUInt32BE(20)===320,
    `Asset precisa medir 320x320: ${relativePath}`);
}

for(const id of deityIds){
  const relativePath=`assets/codex/blessings/${id}.png`;
  verifyPng(relativePath);
  assert(html.includes(`path:'${relativePath}'`),`Divindade não ligada ao Códex: ${id}`);
}
for(const id of dungeonIds){
  const relativePath=`assets/codex/dungeons/${id}.png`;
  verifyPng(relativePath);
  assert(html.includes(`dungeonIcon('${id}'`),`Masmorra não ligada ao Códex: ${id}`);
}

assert(html.includes('function codexArtIconHtml('),'Helper dos ícones do Códex ausente');
assert(html.includes('.codex-art-medallion {'),'Círculo manual do Códex ausente');
assert(html.includes('border-radius:50%;'),'Círculo manual não está perfeitamente redondo');
assert(html.includes('const godIcon=collDeityArtIcon(deity.id);'),
  'As divindades ainda não usam os novos ícones');
assert(html.includes("return art?{artPath:art.path,color:art.color}"),
  'Os assets das divindades não são convertidos para o formato visual do Códex');
assert(html.includes("d.classList.add('codex-art-card')"),
  'Cartões do Códex não reconhecem os novos ícones');

const movementFn=html.match(/function normalizeCampaignMovementVector\(dx,dy\)\{[\s\S]*?\n\}/)?.[0];
assert(movementFn,'Normalizador do movimento da campanha ausente');
const sandbox={};
vm.runInNewContext(`${movementFn}; this.normalizeCampaignMovementVector=normalizeCampaignMovementVector;`,sandbox);

const horizontal=sandbox.normalizeCampaignMovementVector(2,0);
const vertical=sandbox.normalizeCampaignMovementVector(0,-2);
const diagonal=sandbox.normalizeCampaignMovementVector(2,2);
const normal=sandbox.normalizeCampaignMovementVector(1,0);
assert(Math.abs(horizontal.dx-1)<1e-9&&horizontal.dy===0,
  'WASD + setas ainda duplica a velocidade horizontal');
assert(vertical.dx===0&&Math.abs(vertical.dy+1)<1e-9,
  'WASD + setas ainda duplica a velocidade vertical');
assert(Math.abs(Math.hypot(diagonal.dx,diagonal.dy)-1)<1e-9,
  'Movimento diagonal não foi normalizado');
assert(normal.dx===1&&normal.dy===0,'Movimento simples foi alterado');

const normalizationCalls=html.match(/\(\{dx,dy\}=normalizeCampaignMovementVector\(dx,dy\)\);/g)||[];
assert(normalizationCalls.length===2,
  `Esperadas 2 normalizações (movimento e dash), encontradas ${normalizationCalls.length}`);

console.log(`OK: ${deityIds.length} divindades, ${dungeonIds.length} masmorras e movimento combinado limitado à velocidade normal.`);
