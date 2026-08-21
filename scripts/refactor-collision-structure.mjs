import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const indexPath=path.join(root,'index.html');
const verifyPath=path.join(root,'scripts','verify-campaign-boss-camp.mjs');
const moduleDir=path.join(root,'src','camp');
const modulePath=path.join(moduleDir,'collision-map.js');
const srcReadmePath=path.join(root,'src','README.md');
const campReadmePath=path.join(moduleDir,'README.md');

const SCRIPT_TAG='<script src="src/camp/collision-map.js"></script>';

function assert(condition,message){
  if(!condition) throw new Error(message);
}

function findArrayDeclaration(source,name,from){
  const token=`const ${name} = [`;
  const start=source.indexOf(token,from);
  assert(start>=0,`Nao foi possivel localizar ${token}`);
  const open=source.indexOf('[',start);
  let depth=0;
  let quote=null;
  let escaped=false;
  let lineComment=false;
  let blockComment=false;
  let close=-1;

  for(let i=open;i<source.length;i++){
    const ch=source[i], next=source[i+1];
    if(lineComment){
      if(ch==='\n') lineComment=false;
      continue;
    }
    if(blockComment){
      if(ch==='*'&&next==='/'){blockComment=false;i++;}
      continue;
    }
    if(quote){
      if(escaped){escaped=false;continue;}
      if(ch==='\\'){escaped=true;continue;}
      if(ch===quote) quote=null;
      continue;
    }
    if(ch==='/'&&next==='/'){lineComment=true;i++;continue;}
    if(ch==='/'&&next==='*'){blockComment=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='[') depth++;
    else if(ch===']'){
      depth--;
      if(depth===0){close=i;break;}
    }
  }
  assert(close>open,`Array de ${name} nao foi fechado.`);
  let end=close+1;
  while(/\s/.test(source[end]||'')) end++;
  if(source[end]===';') end++;
  return {name,start,open,close,end,expression:source.slice(open,close+1)};
}

function replaceOnce(source,oldText,newText,label){
  const at=source.indexOf(oldText);
  assert(at>=0,`Trecho esperado nao encontrado ao atualizar ${label}.`);
  assert(source.indexOf(oldText,at+oldText.length)<0,`Trecho ambiguo ao atualizar ${label}.`);
  return source.slice(0,at)+newText+source.slice(at+oldText.length);
}

let html=fs.readFileSync(indexPath,'utf8').replace(/\r\n/g,'\n');
assert(!html.includes(SCRIPT_TAG),'A estrutura de colisao ja foi extraida; migracao abortada para evitar duplicacao.');

const campStart=html.indexOf('window.CampV2 = (function(){');
assert(campStart>=0,'Modulo CampV2 nao encontrado.');

const rects=findArrayDeclaration(html,'BLOQUEIOS',campStart);
const circles=findArrayDeclaration(html,'BLOQUEIOS_CIRCULARES',rects.end);
const passages=findArrayDeclaration(html,'PASSAGENS',circles.end);
assert(rects.start<circles.start&&circles.start<passages.start,'Ordem inesperada das definicoes de colisao.');

const between=html.slice(rects.start,passages.end);
const extraConsts=[...between.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=/g)]
  .map(match=>match[1])
  .filter(name=>!['BLOQUEIOS','BLOQUEIOS_CIRCULARES','PASSAGENS'].includes(name));
assert(extraConsts.length===0,`Ha constantes inesperadas entre os mapas de colisao: ${extraConsts.join(', ')}`);

const moduleSource=`// Collision map data extracted from CampV2.\n// This file intentionally contains no rendering or gameplay state.\n// F/E are injected by CampV2 so collider objects keep exactly the same shape\n// and semantics they had before this refactor.\n(function(global){\n  'use strict';\n\n  function create(F,E){\n    if(typeof F!=='function'||typeof E!=='function')\n      throw new TypeError('CampCollisionMap.create exige as fabricas F e E do CampV2.');\n\n    const BLOQUEIOS = ${rects.expression};\n\n    const BLOQUEIOS_CIRCULARES = ${circles.expression};\n\n    const PASSAGENS = ${passages.expression};\n\n    return {BLOQUEIOS,BLOQUEIOS_CIRCULARES,PASSAGENS};\n  }\n\n  global.CampCollisionMap=Object.freeze({create});\n})(window);\n`;

// Replace only collision data. Movement, drawing, interactions, saves, farming,
// fishing, NPCs and every other CampV2 behavior remain inline and untouched.
const replacement=`// Dados de colisao vivem em src/camp/collision-map.js.\n  // As mesmas fabricas F/E continuam criando as formas, preservando o comportamento.\n  const {BLOQUEIOS,BLOQUEIOS_CIRCULARES,PASSAGENS}=window.CampCollisionMap.create(F,E);`;
html=html.slice(0,rects.start)+replacement+html.slice(passages.end);

// Load the data module immediately before the inline script that owns CampV2.
const newCampStart=html.indexOf('window.CampV2 = (function(){');
const ownerScriptStart=html.lastIndexOf('<script',newCampStart);
assert(ownerScriptStart>=0,'Tag <script> proprietaria do CampV2 nao encontrada.');
html=html.slice(0,ownerScriptStart)+`${SCRIPT_TAG}\n`+html.slice(ownerScriptStart);

fs.mkdirSync(moduleDir,{recursive:true});
fs.writeFileSync(modulePath,moduleSource,'utf8');
fs.writeFileSync(indexPath,html,'utf8');

const srcReadme=`# Estrutura de codigo (migracao segura)\n\nO jogo nasceu como um unico \`index.html\` e esta sendo modularizado de forma incremental para nao alterar gameplay nem visual.\n\n## Regra da refatoracao\n\nCada extracao deve preservar comportamento, ser protegida pelos verificadores existentes e evitar uma reescrita geral do jogo. O \`index.html\` continua sendo a entrada oficial.\n\n## Primeiro dominio extraido\n\n- \`camp/collision-map.js\`: dados dos colliders do acampamento.\n\nOs proximos sistemas podem ser extraidos gradualmente (camp, campanha, combate, UI, save), sempre em mudancas pequenas e testaveis.\n`;
const campReadme=`# Camp\n\n## collision-map.js\n\nCamada de dados de colisao do acampamento, separada do desenho. Ela preserva as mesmas formas e coordenadas usadas anteriormente dentro de \`CampV2\`.\n\nPrincipios mantidos:\n\n- colisao invisivel e independente da arte;\n- personagem validado pela area dos pes;\n- estruturas, pedras, troncos, agua e obstaculos solidos permanecem bloqueados;\n- caminhos, zonas de circulacao e pontos de interacao permanecem acessiveis;\n- passagens explicitas continuam tendo prioridade sobre bloqueios;\n- NPCs e detalhes baixos nao ganham collider automaticamente;\n- o sistema de resgate de save continua reposicionando o jogador se ele carregar dentro de um bloqueio.\n\nEste arquivo nao desenha nada e nao controla estado do jogo. Ele apenas fornece o mapa de colliders ao \`CampV2\`.\n`;
fs.writeFileSync(srcReadmePath,srcReadme,'utf8');
fs.writeFileSync(campReadmePath,campReadme,'utf8');

// Keep the existing collision regression test useful after the extraction.
let verify=fs.readFileSync(verifyPath,'utf8').replace(/\r\n/g,'\n');
verify=replaceOnce(
  verify,
  "const html=fs.readFileSync(path.join(root,'index.html'),'utf8');",
  "const html=fs.readFileSync(path.join(root,'index.html'),'utf8');\nconst collisionSource=fs.readFileSync(path.join(root,'src','camp','collision-map.js'),'utf8');\nassert(html.includes('<script src=\\\"src/camp/collision-map.js\\\"></script>'),'index nao carrega o modulo externo de colisao');\nassert(html.indexOf('<script src=\\\"src/camp/collision-map.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'modulo de colisao precisa carregar antes do CampV2');",
  'bootstrap do teste'
);
verify=replaceOnce(
  verify,
  "assert(html.includes('const BLOQUEIOS_CIRCULARES = ['),'objetos redondos do acampamento sem colisao propria');",
  "assert(collisionSource.includes('const BLOQUEIOS_CIRCULARES = ['),'objetos redondos do acampamento sem colisao propria');",
  'assert de colisoes circulares'
);
verify=verify.replace(/assert\(html\.includes\(obstacle\),`silhueta completa sem colisao: \$\{obstacle\}`\);/g,
  "assert(collisionSource.includes(obstacle),`silhueta completa sem colisao: ${obstacle}`);");

const oldParse=`const camp=html.slice(html.indexOf('window.CampV2 = (function(){'),html.indexOf('// [/CAMP-V2]'));\nconst rectSource=camp.slice(camp.indexOf('const BLOQUEIOS = ['),camp.indexOf('const BLOQUEIOS_CIRCULARES'));\nconst ellipseSource=camp.slice(camp.indexOf('const BLOQUEIOS_CIRCULARES = ['),camp.indexOf('const PASSAGENS'));\nconst passageSource=camp.slice(camp.indexOf('const PASSAGENS = ['),camp.indexOf('const HORTA ='));`;
const newParse=`const camp=html.slice(html.indexOf('window.CampV2 = (function(){'),html.indexOf('// [/CAMP-V2]'));\nassert(!camp.includes('const BLOQUEIOS = ['),'dados de colisao voltaram a ficar presos no index');\nconst rectSource=collisionSource.slice(collisionSource.indexOf('const BLOQUEIOS = ['),collisionSource.indexOf('const BLOQUEIOS_CIRCULARES'));\nconst ellipseSource=collisionSource.slice(collisionSource.indexOf('const BLOQUEIOS_CIRCULARES = ['),collisionSource.indexOf('const PASSAGENS'));\nconst passageSource=collisionSource.slice(collisionSource.indexOf('const PASSAGENS = ['),collisionSource.indexOf('return {BLOQUEIOS,BLOQUEIOS_CIRCULARES,PASSAGENS}'));`;
verify=replaceOnce(verify,oldParse,newParse,'fontes de formas do teste');
fs.writeFileSync(verifyPath,verify,'utf8');

console.log('OK: mapa de colisao extraido sem alterar coordenadas, movimento, desenho ou gameplay.');
