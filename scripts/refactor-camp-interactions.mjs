import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const indexPath=path.join(root,'index.html');
const verifyPath=path.join(root,'scripts','verify-campaign-boss-camp.mjs');
const srcReadmePath=path.join(root,'src','README.md');
const campReadmePath=path.join(root,'src','camp','README.md');
const FARMING_TAG='<script src="src/camp/farming-data.js"></script>';
const INTERACTION_TAG='<script src="src/camp/interaction-data.js"></script>';

function assert(condition,message){if(!condition) throw new Error(message);}
function occurrences(source,text){let n=0,p=0;while((p=source.indexOf(text,p))>=0){n++;p+=text.length;}return n;}
function replaceOnce(source,oldText,newText,label){
  const n=occurrences(source,oldText);assert(n===1,`${label}: esperado 1 trecho, encontrado ${n}`);
  return source.replace(oldText,newText);
}
function findConstDeclaration(source,name,from=0){
  const token=`const ${name}`;
  const start=source.indexOf(token,from);assert(start>=0,`${name} nao encontrado`);
  const eq=source.indexOf('=',start+token.length);assert(eq>=0,`${name} sem inicializador`);
  let quote=null,escaped=false,lineComment=false,blockComment=false;
  let round=0,square=0,curly=0,finish=-1;
  for(let i=eq+1;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(lineComment){if(ch==='\n') lineComment=false;continue;}
    if(blockComment){if(ch==='*'&&next==='/'){blockComment=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote) quote=null;continue;}
    if(ch==='/'&&next==='/'){lineComment=true;i++;continue;}
    if(ch==='/'&&next==='*'){blockComment=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='(') round++; else if(ch===')') round--;
    else if(ch==='[') square++; else if(ch===']') square--;
    else if(ch==='{') curly++; else if(ch==='}') curly--;
    else if(ch===';'&&round===0&&square===0&&curly===0){finish=i+1;break;}
  }
  assert(finish>start,`${name} sem fim de declaracao`);
  return source.slice(start,finish);
}

let html=fs.readFileSync(indexPath,'utf8').replace(/\r\n/g,'\n');
let verify=fs.readFileSync(verifyPath,'utf8').replace(/\r\n/g,'\n');
let srcReadme=fs.readFileSync(srcReadmePath,'utf8').replace(/\r\n/g,'\n');
let campReadme=fs.readFileSync(campReadmePath,'utf8').replace(/\r\n/g,'\n');
const interaction=fs.readFileSync(path.join(root,'src','camp','interaction-data.js'),'utf8');
assert(html.includes(FARMING_TAG),'farming-data.js nao esta carregado');
assert(!html.includes(INTERACTION_TAG),'interaction-data.js ja esta carregado');
assert(interaction.includes("id:'fazenda', fx:.328, fy:.418, raio:74")&&interaction.includes("id:'arqueiro',fx:.452, fy:.560, raio:58"),
  'modulo de interacao nao contem as coordenadas esperadas');

const campStart=html.indexOf('window.CampV2 = (function(){');
assert(campStart>=0,'CampV2 nao encontrado');
const oldPontos=findConstDeclaration(html,'PONTOS',campStart);
for(const callback of [
  'abrir:()=>openFarm()', 'abrir:()=>openCookingPanel()', 'abrir:()=>openMetaShop()',
  'abrir:()=>openWorkshopPanel()', 'abrir:()=>openPetSanctuary()', 'abrir:()=>showCollection()',
  'abrir:()=>openExpeditionMap()', 'abrir:()=>openFishing()', 'abrir:()=>window.ArqueiroNPC.abrir()',
]) assert(oldPontos.includes(callback),`callback original ausente antes da extracao: ${callback}`);

html=replaceOnce(html,FARMING_TAG,`${FARMING_TAG}\n  ${INTERACTION_TAG}`,'carga do interaction-data');
const newPontos=`const PONTOS=window.CampInteractionData.create({\n    fazenda:()=>openFarm(),\n    cozinha:()=>openCookingPanel(),\n    merlin:()=>openMetaShop(),\n    oficina:()=>openWorkshopPanel(),\n    santuario:()=>openPetSanctuary(),\n    fogueira:()=>showCollection(),\n    portal:()=>openExpeditionMap(),\n    lago:()=>openFishing(),\n    arqueiro:()=>window.ArqueiroNPC.abrir(),\n  });`;
html=replaceOnce(html,oldPontos,newPontos,'extracao dos pontos de interacao');

verify=replaceOnce(
  verify,
  "const farmingSource=fs.readFileSync(path.join(root,'src','camp','farming-data.js'),'utf8');",
  "const farmingSource=fs.readFileSync(path.join(root,'src','camp','farming-data.js'),'utf8');\nconst interactionSource=fs.readFileSync(path.join(root,'src','camp','interaction-data.js'),'utf8');",
  'leitura do interaction-data'
);
verify=replaceOnce(
  verify,
  "assert(html.indexOf('<script src=\\\"src/camp/farming-data.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'dados da horta precisam carregar antes do CampV2');",
  "assert(html.indexOf('<script src=\\\"src/camp/farming-data.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'dados da horta precisam carregar antes do CampV2');\nassert(html.includes('<script src=\\\"src/camp/interaction-data.js\\\"></script>'),'index nao carrega os pontos de interacao externos');\nassert(html.indexOf('<script src=\\\"src/camp/interaction-data.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'pontos de interacao precisam carregar antes do CampV2');",
  'ordem do interaction-data'
);
const targetAnchor="const targets=[\n  ['fazenda',.328,.418,74], ['cozinha',.186,.522,76], ['merlin',.835,.590,82],";
verify=replaceOnce(
  verify,
  targetAnchor,
  `assert(interactionSource.includes("id:'fazenda', fx:.328, fy:.418, raio:74")&&\n  interactionSource.includes("id:'arqueiro',fx:.452, fy:.560, raio:58"),'dados dos pontos de interacao foram alterados');\nassert(html.includes('const PONTOS=window.CampInteractionData.create({')&&\n  html.includes('fazenda:()=>openFarm()')&&html.includes('lago:()=>openFishing()')&&\n  html.includes('arqueiro:()=>window.ArqueiroNPC.abrir()'),'callbacks de interacao nao permaneceram ligados no CampV2');\n\n${targetAnchor}`,
  'validacao dos pontos externos'
);

srcReadme=replaceOnce(
  srcReadme,
  '- `camp/farming-data.js`: catalogo puro de sementes, nomes, icones e rotulos de acao.',
  '- `camp/farming-data.js`: catalogo puro de sementes, nomes, icones e rotulos de acao.\n- `camp/interaction-data.js`: geometria, texto e cor dos pontos de interacao; callbacks continuam injetados pelo CampV2.',
  'documentacao de interacoes'
);
campReadme += `\n## interaction-data.js\n\nCentraliza somente os dados dos nove pontos de interacao (id, coordenadas, raio, rotulo e cor). As acoes reais continuam criadas dentro do CampV2 e sao injetadas no modulo, preservando exatamente os mesmos callbacks.\n`;
fs.writeFileSync(indexPath,html,'utf8');
fs.writeFileSync(verifyPath,verify,'utf8');
fs.writeFileSync(srcReadmePath,srcReadme,'utf8');
fs.writeFileSync(campReadmePath,campReadme,'utf8');
console.log('OK: dados de interacao extraidos e callbacks mantidos no CampV2.');
