import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const indexPath=path.join(root,'index.html');
const collisionPath=path.join(root,'src','camp','collision-map.js');
const layoutPath=path.join(root,'src','camp','layout-data.js');
const verifyPath=path.join(root,'scripts','verify-campaign-boss-camp.mjs');
const srcReadmePath=path.join(root,'src','README.md');
const campReadmePath=path.join(root,'src','camp','README.md');

const COLLISION_TAG='<script src="src/camp/collision-map.js"></script>';
const LAYOUT_TAG='<script src="src/camp/layout-data.js"></script>';
const HORTA_INLINE='const HORTA = {fx:.3020, fy:.1080, fw:.2500, fh:.2520, cols:5, linhas:3};';
const SOLA_INLINE='const sola=[[-8,-3],[0,-3],[8,-3],[-8,4],[0,5],[8,4]];';

function assert(condition,message){
  if(!condition) throw new Error(message);
}

function occurrences(source,text){
  let count=0, at=0;
  while((at=source.indexOf(text,at))>=0){count++;at+=text.length;}
  return count;
}

function replaceOnce(source,oldText,newText,label){
  const count=occurrences(source,oldText);
  assert(count===1,`${label}: esperado 1 trecho, encontrado ${count}.`);
  return source.replace(oldText,newText);
}

let html=fs.readFileSync(indexPath,'utf8').replace(/\r\n/g,'\n');
let collision=fs.readFileSync(collisionPath,'utf8').replace(/\r\n/g,'\n');
let verify=fs.readFileSync(verifyPath,'utf8').replace(/\r\n/g,'\n');
let srcReadme=fs.readFileSync(srcReadmePath,'utf8').replace(/\r\n/g,'\n');
let campReadme=fs.readFileSync(campReadmePath,'utf8').replace(/\r\n/g,'\n');

assert(html.includes(COLLISION_TAG),'Modulo de colisao anterior nao esta carregado.');
assert(!html.includes(LAYOUT_TAG),'layout-data.js ja esta carregado; abortando para evitar duplicacao.');
assert(!fs.existsSync(layoutPath),'layout-data.js ja existe; abortando para evitar sobrescrita.');

const campStart=html.indexOf('window.CampV2 = (function(){');
const campEnd=html.indexOf('// [/CAMP-V2]',campStart);
assert(campStart>=0&&campEnd>campStart,'CampV2 nao encontrado.');
const camp=html.slice(campStart,campEnd);
assert(occurrences(camp,HORTA_INLINE)===1,'Configuracao inline da horta mudou ou nao foi encontrada.');
assert(occurrences(camp,SOLA_INLINE)===1,'Footprint inline da colisao mudou ou nao foi encontrado.');

// 1) Layout puro: apenas dados. Nenhum desenho, save ou gameplay e movido.
const layoutSource=`// Static CampV2 layout data. No rendering or gameplay state lives here.\n(function(global){\n  'use strict';\n\n  const HORTA=Object.freeze({\n    fx:.3020, fy:.1080, fw:.2500, fh:.2520, cols:5, linhas:3\n  });\n\n  global.CampLayoutData=Object.freeze({HORTA});\n})(window);\n`;
fs.writeFileSync(layoutPath,layoutSource,'utf8');

// Carrega os dados antes do script inline que possui CampV2.
html=replaceOnce(html,COLLISION_TAG,`${COLLISION_TAG}\n  ${LAYOUT_TAG}`,'insercao do modulo de layout');
html=replaceOnce(html,HORTA_INLINE,'const HORTA=window.CampLayoutData.HORTA;','extracao da horta');

// 2) O footprint pertence ao dominio de colisao. Os seis pontos permanecem identicos.
const oldExport='  global.CampCollisionMap=Object.freeze({create});';
const newExport=`  const FOOTPRINT=Object.freeze([\n    Object.freeze([-8,-3]), Object.freeze([0,-3]), Object.freeze([8,-3]),\n    Object.freeze([-8,4]), Object.freeze([0,5]), Object.freeze([8,4])\n  ]);\n\n  global.CampCollisionMap=Object.freeze({create,FOOTPRINT});`;
collision=replaceOnce(collision,oldExport,newExport,'export do footprint');
html=replaceOnce(html,SOLA_INLINE,'const sola=window.CampCollisionMap.FOOTPRINT;','uso do footprint externo');

// Reforca no verificador que os dados sairam do index sem mudar seus valores.
verify=replaceOnce(
  verify,
  "const collisionSource=fs.readFileSync(path.join(root,'src','camp','collision-map.js'),'utf8');",
  "const collisionSource=fs.readFileSync(path.join(root,'src','camp','collision-map.js'),'utf8');\nconst layoutSource=fs.readFileSync(path.join(root,'src','camp','layout-data.js'),'utf8');",
  'leitura do modulo de layout no verificador'
);
verify=replaceOnce(
  verify,
  "assert(html.indexOf('<script src=\\\"src/camp/collision-map.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'modulo de colisao precisa carregar antes do CampV2');",
  "assert(html.indexOf('<script src=\\\"src/camp/collision-map.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'modulo de colisao precisa carregar antes do CampV2');\nassert(html.includes('<script src=\\\"src/camp/layout-data.js\\\"></script>'),'index nao carrega os dados de layout do acampamento');\nassert(html.indexOf('<script src=\\\"src/camp/layout-data.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'layout do acampamento precisa carregar antes do CampV2');",
  'ordem de carga do layout'
);
verify=replaceOnce(
  verify,
  "assert(html.includes('const sola=[[-8,-3],[0,-3],[8,-3],[-8,4],[0,5],[8,4]];'),'colisao do heroi nao usa a area dos pes');",
  "assert(collisionSource.includes('Object.freeze([-8,-3])')&&collisionSource.includes('Object.freeze([0,5])')&&\n  html.includes('const sola=window.CampCollisionMap.FOOTPRINT;'),'colisao do heroi nao usa a mesma area dos pes');",
  'validacao do footprint'
);
verify=replaceOnce(
  verify,
  "assert(html.includes('const HORTA = {fx:.3020, fy:.1080, fw:.2500, fh:.2520, cols:5, linhas:3};'),\n  'horta 5x3 acessivel nao esta configurada');",
  "assert(layoutSource.includes('fx:.3020, fy:.1080, fw:.2500, fh:.2520, cols:5, linhas:3')&&\n  html.includes('const HORTA=window.CampLayoutData.HORTA;'),\n  'horta 5x3 acessivel nao esta configurada');\nassert(!camp.includes('const HORTA = {fx:.3020'),'configuracao da horta voltou para o index');",
  'validacao da horta externa'
);

srcReadme=replaceOnce(
  srcReadme,
  '- `camp/collision-map.js`: dados dos colliders do acampamento.',
  '- `camp/collision-map.js`: dados dos colliders e footprint do personagem no acampamento.\n- `camp/layout-data.js`: dados estaticos de layout do acampamento (iniciando pela horta).',
  'documentacao de src'
);
campReadme += `\n## layout-data.js\n\nDados estaticos de posicionamento do acampamento ficam separados da logica de desenho e gameplay. A primeira extracao e a grade 5x3 da horta, preservando exatamente as coordenadas existentes.\n\nO footprint de colisao do jogador tambem passa a ser propriedade de \`collision-map.js\`, mantendo os mesmos seis pontos usados anteriormente dentro de \`livre()\`.\n`;

fs.writeFileSync(indexPath,html,'utf8');
fs.writeFileSync(collisionPath,collision,'utf8');
fs.writeFileSync(verifyPath,verify,'utf8');
fs.writeFileSync(srcReadmePath,srcReadme,'utf8');
fs.writeFileSync(campReadmePath,campReadme,'utf8');

console.log('OK: horta e footprint extraidos sem alterar valores ou gameplay.');
