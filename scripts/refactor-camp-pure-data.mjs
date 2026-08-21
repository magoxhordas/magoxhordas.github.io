import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const indexPath=path.join(root,'index.html');
const verifyPath=path.join(root,'scripts','verify-campaign-boss-camp.mjs');
const srcReadmePath=path.join(root,'src','README.md');
const campReadmePath=path.join(root,'src','camp','README.md');

const LAYOUT_TAG='<script src="src/camp/layout-data.js"></script>';
const FARMING_TAG='<script src="src/camp/farming-data.js"></script>';

function assert(condition,message){if(!condition) throw new Error(message);}
function occurrences(source,text){let n=0,p=0;while((p=source.indexOf(text,p))>=0){n++;p+=text.length;}return n;}
function replaceOnce(source,oldText,newText,label){
  const n=occurrences(source,oldText);assert(n===1,`${label}: esperado 1 trecho, encontrado ${n}`);
  return source.replace(oldText,newText);
}

function findConstDeclaration(source,name,from=0){
  const token=`const ${name}`;
  const start=source.indexOf(token,from);
  assert(start>=0,`${name} nao encontrado`);
  const eq=source.indexOf('=',start+token.length);
  assert(eq>=0,`${name} sem inicializador`);
  let quote=null,escaped=false,lineComment=false,blockComment=false;
  let round=0,square=0,curly=0,finish=-1;
  for(let i=eq+1;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(lineComment){if(ch==='\n') lineComment=false;continue;}
    if(blockComment){if(ch==='*'&&next==='/'){blockComment=false;i++;}continue;}
    if(quote){
      if(escaped){escaped=false;continue;}
      if(ch==='\\'){escaped=true;continue;}
      if(ch===quote) quote=null;
      continue;
    }
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
const farming=fs.readFileSync(path.join(root,'src','camp','farming-data.js'),'utf8');
const layout=fs.readFileSync(path.join(root,'src','camp','layout-data.js'),'utf8');

assert(html.includes(LAYOUT_TAG),'layout-data.js nao esta carregado');
assert(!html.includes(FARMING_TAG),'farming-data.js ja esta carregado; abortando para evitar duplicacao');
assert(farming.includes("'semente_trigo','semente_tomate','semente_erva'")&&farming.includes("ready:'Colher'"),'modulo de farming nao contem os dados esperados');
assert(layout.includes("[141,468,'#ffc04a',22,0]")&&layout.includes('const ARQ = {fx:.452, fy:.560};'),'modulo de layout nao contem os dados esperados');

const campStart=html.indexOf('window.CampV2 = (function(){');
assert(campStart>=0,'CampV2 nao encontrado');
html=replaceOnce(html,LAYOUT_TAG,`${LAYOUT_TAG}\n  ${FARMING_TAG}`,'carga do farming-data');

for(const [name,alias] of [
  ['SEMENTES','window.CampFarmingData.SEMENTES'],
  ['NOME_SEM','window.CampFarmingData.NOME_SEM'],
  ['ICONE_SEM','window.CampFarmingData.ICONE_SEM'],
  ['ACAO','window.CampFarmingData.ACAO'],
  ['LUZES_ACAMPAMENTO','window.CampLayoutData.LUZES_ACAMPAMENTO'],
  ['ARQ','window.CampLayoutData.ARQ'],
]){
  const declaration=findConstDeclaration(html,name,campStart);
  html=replaceOnce(html,declaration,`const ${name}=${alias};`,`extracao de ${name}`);
}

verify=replaceOnce(
  verify,
  "const layoutSource=fs.readFileSync(path.join(root,'src','camp','layout-data.js'),'utf8');",
  "const layoutSource=fs.readFileSync(path.join(root,'src','camp','layout-data.js'),'utf8');\nconst farmingSource=fs.readFileSync(path.join(root,'src','camp','farming-data.js'),'utf8');",
  'leitura do farming-data no verificador'
);
verify=replaceOnce(
  verify,
  "assert(html.indexOf('<script src=\\\"src/camp/layout-data.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'layout do acampamento precisa carregar antes do CampV2');",
  "assert(html.indexOf('<script src=\\\"src/camp/layout-data.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'layout do acampamento precisa carregar antes do CampV2');\nassert(html.includes('<script src=\\\"src/camp/farming-data.js\\\"></script>'),'index nao carrega os dados puros da horta');\nassert(html.indexOf('<script src=\\\"src/camp/farming-data.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'dados da horta precisam carregar antes do CampV2');",
  'ordem do farming-data'
);
verify=replaceOnce(
  verify,
  "assert(html.includes(\"semente_tomate:'🍅'\")&&html.includes(\"semente_erva:'🥬'\")&&\n  html.includes(\"semente_cogumelo_lua:'🍄'\")&&html.includes(\"semente_raiz_sangue:'🫜'\"),\n  'HUD da horta ainda usa um unico icone de trigo para todos os vegetais');",
  "assert(farmingSource.includes(\"semente_tomate:'🍅'\")&&farmingSource.includes(\"semente_erva:'🥬'\")&&\n  farmingSource.includes(\"semente_cogumelo_lua:'🍄'\")&&farmingSource.includes(\"semente_raiz_sangue:'🫜'\")&&\n  html.includes('const ICONE_SEM=window.CampFarmingData.ICONE_SEM;'),\n  'HUD da horta ainda usa um unico icone de trigo para todos os vegetais');",
  'validacao dos icones externos'
);
const anchor="assert(!camp.includes('const HORTA_OCULTOS'),'a horta ainda esconde parcelas atras da cabana');";
verify=replaceOnce(
  verify,
  anchor,
  `${anchor}\nassert(html.includes('const SEMENTES=window.CampFarmingData.SEMENTES;')&&\n  html.includes('const NOME_SEM=window.CampFarmingData.NOME_SEM;')&&\n  html.includes('const ACAO=window.CampFarmingData.ACAO;'),'CampV2 nao esta consumindo o modulo de farming');\nassert(html.includes('const LUZES_ACAMPAMENTO=window.CampLayoutData.LUZES_ACAMPAMENTO;')&&\n  html.includes('const ARQ=window.CampLayoutData.ARQ;'),'CampV2 nao esta consumindo os dados de layout extraidos');`,
  'aliases dos dados puros'
);

srcReadme=replaceOnce(
  srcReadme,
  '- `camp/layout-data.js`: dados estaticos de layout do acampamento (iniciando pela horta).',
  '- `camp/layout-data.js`: dados estaticos de layout do acampamento (horta, luzes e posicao do arqueiro).\n- `camp/farming-data.js`: catalogo puro de sementes, nomes, icones e rotulos de acao.',
  'documentacao raiz de src'
);
campReadme += `\n## farming-data.js\n\nCatalogo de sementes, nomes, icones e rotulos da horta. O modulo nao executa plantio, inventario, desenho ou persistencia; essas regras continuam no CampV2.\n\nOs pontos de luz e a posicao do arqueiro tambem foram movidos para \`layout-data.js\`. As coordenadas e valores permanecem identicos.\n`;

fs.writeFileSync(indexPath,html,'utf8');
fs.writeFileSync(verifyPath,verify,'utf8');
fs.writeFileSync(srcReadmePath,srcReadme,'utf8');
fs.writeFileSync(campReadmePath,campReadme,'utf8');
console.log('OK: dados puros de farming/layout extraidos; funcoes de gameplay permaneceram no CampV2.');
