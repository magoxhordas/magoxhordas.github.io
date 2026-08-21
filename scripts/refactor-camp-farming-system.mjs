import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const indexPath=path.join(root,'index.html');
const systemPath=path.join(root,'src','camp','farming-system.js');
const verifyModulesPath=path.join(root,'scripts','verify-camp-modules.mjs');
const verifyCampPath=path.join(root,'scripts','verify-campaign-boss-camp.mjs');
const srcReadmePath=path.join(root,'src','README.md');
const campReadmePath=path.join(root,'src','camp','README.md');

const DATA_TAG='<script src="src/camp/farming-data.js"></script>';
const SYSTEM_TAG='<script src="src/camp/farming-system.js"></script>';

function assert(condition,message){if(!condition) throw new Error(message);}
function occurrences(source,text){let n=0,p=0;while((p=source.indexOf(text,p))>=0){n++;p+=text.length;}return n;}
function replaceOnce(source,oldText,newText,label){
  const n=occurrences(source,oldText);
  assert(n===1,`${label}: esperado 1 trecho, encontrado ${n}`);
  return source.replace(oldText,newText);
}

function findConstRange(source,name,from=0){
  const token=`const ${name}`;
  const start=source.indexOf(token,from);
  assert(start>=0,`${name} nao encontrado`);
  const eq=source.indexOf('=',start+token.length);
  assert(eq>=0,`${name} sem inicializador`);
  let quote=null,escaped=false,line=false,block=false,round=0,square=0,curly=0;
  for(let i=eq+1;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(line){if(ch==='\n')line=false;continue;}
    if(block){if(ch==='*'&&next==='/'){block=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote=null;continue;}
    if(ch==='/'&&next==='/'){line=true;i++;continue;}
    if(ch==='/'&&next==='*'){block=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='(')round++; else if(ch===')')round--;
    else if(ch==='[')square++; else if(ch===']')square--;
    else if(ch==='{')curly++; else if(ch==='}')curly--;
    else if(ch===';'&&round===0&&square===0&&curly===0) return {start,end:i+1,text:source.slice(start,i+1)};
  }
  throw new Error(`${name} sem fim`);
}

function findFunctionRange(source,name,from=0){
  const token=`function ${name}(`;
  const start=source.indexOf(token,from);
  assert(start>=0,`${name} nao encontrada`);
  const open=source.indexOf('{',start);
  let quote=null,escaped=false,line=false,block=false,depth=0;
  for(let i=open;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(line){if(ch==='\n')line=false;continue;}
    if(block){if(ch==='*'&&next==='/'){block=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote=null;continue;}
    if(ch==='/'&&next==='/'){line=true;i++;continue;}
    if(ch==='/'&&next==='*'){block=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'&&--depth===0) return {start,end:i+1,text:source.slice(start,i+1)};
  }
  throw new Error(`${name} sem fim`);
}

function indent(text,spaces){
  const pad=' '.repeat(spaces);
  return text.split('\n').map(line=>line?pad+line:'').join('\n');
}

let html=fs.readFileSync(indexPath,'utf8').replace(/\r\n/g,'\n');
let verifyModules=fs.readFileSync(verifyModulesPath,'utf8').replace(/\r\n/g,'\n');
let verifyCamp=fs.readFileSync(verifyCampPath,'utf8').replace(/\r\n/g,'\n');
let srcReadme=fs.readFileSync(srcReadmePath,'utf8').replace(/\r\n/g,'\n');
let campReadme=fs.readFileSync(campReadmePath,'utf8').replace(/\r\n/g,'\n');

assert(html.includes(DATA_TAG),'farming-data.js nao esta carregado');
assert(!html.includes(SYSTEM_TAG),'farming-system.js ja esta carregado');
assert(!fs.existsSync(systemPath),'farming-system.js ja existe');

const campStart=html.indexOf('window.CampV2 = (function(){');
const campEnd=html.indexOf('// [/CAMP-V2]',campStart);
assert(campStart>=0&&campEnd>campStart,'CampV2 nao encontrado');

const canteiros=findConstRange(html,'CANTEIROS',campStart);
const firstFarm=findFunctionRange(html,'canteiroEm',canteiros.end);
const lastFarm=findFunctionRange(html,'desenharPlantas',firstFarm.end);
const acao=findConstRange(html,'ACAO',firstFarm.start);
assert(acao.start>firstFarm.start&&acao.end<lastFarm.end,'ACAO nao esta dentro do bloco de farming esperado');

let farmingBlock=html.slice(firstFarm.start,lastFarm.end);
const acaoLocalStart=acao.start-firstFarm.start;
const acaoLocalEnd=acao.end-firstFarm.start;
farmingBlock=farmingBlock.slice(0,acaoLocalStart)+farmingBlock.slice(acaoLocalEnd);

for(const name of ['canteiroEm','celula','usarCanteiro','sementeAtual','trocarSemente','aviso','plantaTrigo','plantaTomate','plantaErva','plantaCogumelo','plantaRaiz','desenharHorta','desenharPlantas'])
  assert(farmingBlock.includes(`function ${name}(`),`funcao ausente no bloco: ${name}`);
assert(farmingBlock.includes('const DESENHO_CULTIVO = {'),'mapa de desenho das culturas ausente');

// CANTEIROS nao pode ser usado antes da criacao do sistema; isso garantiria uma
// dependencia escondida na parte de colisao/estado do CampV2.
const between=html.slice(canteiros.end,firstFarm.start);
assert(!between.includes('CANTEIROS'),'CANTEIROS e usado antes da fronteira segura de farming');

const moduleSource=`// CampV2 farming behavior extracted without changing gameplay.\n// The CampV2 closure injects only its local state/geometry helpers. Existing\n// global farm bindings (farmCells, globalInventory, selectedSeed, activeTool\n// and farmAction) keep the same runtime semantics used by the original code.\n(function(global){\n  'use strict';\n\n  function create(deps){\n    const {HORTA,SEMENTES,NOME_SEM,ACAO,S,px,dentro}=deps||{};\n    if(!HORTA||!Array.isArray(SEMENTES)||!S||typeof px!=='function'||typeof dentro!=='function')\n      throw new TypeError('CampFarmingSystem.create recebeu dependencias invalidas.');\n\n${indent(canteiros.text,4)}\n\n${indent(farmingBlock.trim(),4)}\n\n    return {\n      CANTEIROS, canteiroEm, celula, usarCanteiro, sementeAtual, trocarSemente, aviso,\n      desenharHorta, desenharPlantas\n    };\n  }\n\n  global.CampFarmingSystem=Object.freeze({create});\n})(window);\n`;
fs.writeFileSync(systemPath,moduleSource,'utf8');

// Carrega o comportamento depois dos dados puros e antes do CampV2.
html=replaceOnce(html,DATA_TAG,`${DATA_TAG}\n  ${SYSTEM_TAG}`,'carga do farming-system');

// Substitui primeiro o bloco mais abaixo; depois remove a criacao antiga dos canteiros.
const bridge=`const ACAO=window.CampFarmingData.ACAO;\n  const {\n    CANTEIROS,canteiroEm,celula,usarCanteiro,sementeAtual,trocarSemente,aviso,\n    desenharHorta,desenharPlantas\n  }=window.CampFarmingSystem.create({HORTA,SEMENTES,NOME_SEM,ACAO,S,px,dentro});`;
html=html.slice(0,firstFarm.start)+bridge+html.slice(lastFarm.end);
html=html.slice(0,canteiros.start)+html.slice(canteiros.end);

// O index deve manter somente a ponte; a implementacao real agora mora no modulo.
const newCamp=html.slice(html.indexOf('window.CampV2 = (function(){'),html.indexOf('// [/CAMP-V2]'));
for(const name of ['usarCanteiro','plantaTrigo','plantaTomate','plantaErva','plantaCogumelo','plantaRaiz','desenharHorta','desenharPlantas'])
  assert(!newCamp.includes(`function ${name}(`),`${name} permaneceu implementada no index`);
assert(newCamp.includes('window.CampFarmingSystem.create({HORTA,SEMENTES,NOME_SEM,ACAO,S,px,dentro})'),'ponte do farming-system ausente');
fs.writeFileSync(indexPath,html,'utf8');

// Verificador estrutural do acampamento passa a conhecer o novo modulo.
verifyCamp=replaceOnce(
  verifyCamp,
  "const farmingSource=fs.readFileSync(path.join(root,'src','camp','farming-data.js'),'utf8');",
  "const farmingSource=fs.readFileSync(path.join(root,'src','camp','farming-data.js'),'utf8');\nconst farmingSystemSource=fs.readFileSync(path.join(root,'src','camp','farming-system.js'),'utf8');",
  'leitura do farming-system no verificador'
);
verifyCamp=replaceOnce(
  verifyCamp,
  "assert(html.indexOf('<script src=\\\"src/camp/farming-data.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'dados da horta precisam carregar antes do CampV2');",
  "assert(html.indexOf('<script src=\\\"src/camp/farming-data.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'dados da horta precisam carregar antes do CampV2');\nassert(html.includes('<script src=\\\"src/camp/farming-system.js\\\"></script>'),'index nao carrega o comportamento externo da horta');\nassert(html.indexOf('<script src=\\\"src/camp/farming-system.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'farming-system precisa carregar antes do CampV2');",
  'ordem do farming-system'
);
const campAnchor="assert(!camp.includes('const BLOQUEIOS = ['),'dados de colisao voltaram a ficar presos no index');";
verifyCamp=replaceOnce(
  verifyCamp,
  campAnchor,
  `${campAnchor}\nassert(!camp.includes('function usarCanteiro(k)')&&!camp.includes('function desenharHorta(c,t)')&&!camp.includes('function desenharPlantas(c,t)'),\n  'implementacao da horta voltou para o index');\nassert(farmingSystemSource.includes('function usarCanteiro(k)')&&farmingSystemSource.includes('function desenharHorta(c,t)')&&\n  farmingSystemSource.includes('function desenharPlantas(c,t)'),'farming-system nao contem o comportamento extraido');\nassert(html.includes('window.CampFarmingSystem.create({HORTA,SEMENTES,NOME_SEM,ACAO,S,px,dentro})'),\n  'CampV2 nao injeta as dependencias no farming-system');`,
  'fronteira estrutural do farming-system'
);
fs.writeFileSync(verifyCampPath,verifyCamp,'utf8');

// Verificador executavel: cria 15 canteiros e testa uma transicao real de plantio.
verifyModules=replaceOnce(
  verifyModules,
  'const sandbox={console};',
  'const sandbox={console,performance:{now:()=>1200}};',
  'performance controlada no sandbox'
);
verifyModules=replaceOnce(
  verifyModules,
  "  'src/camp/farming-data.js',\n  'src/camp/interaction-data.js',",
  "  'src/camp/farming-data.js',\n  'src/camp/farming-system.js',\n  'src/camp/interaction-data.js',",
  'carga do farming-system no sandbox'
);
verifyModules=replaceOnce(
  verifyModules,
  "assert(sandbox.CampFarmingData,'CampFarmingData nao foi exportado');",
  "assert(sandbox.CampFarmingData,'CampFarmingData nao foi exportado');\nassert(sandbox.CampFarmingSystem,'CampFarmingSystem nao foi exportado');",
  'export do farming-system'
);
const farmAnchor="assert(farm.ACAO.empty==='Arar'&&farm.ACAO.ready==='Colher','rotulos de acao da horta foram alterados');";
const farmTests=`${farmAnchor}\n\nsandbox.globalInventory={semente_tomate:2,semente_trigo:1};\nsandbox.selectedSeed=null;\nsandbox.activeTool=null;\nsandbox.farmCells=Array.from({length:15},()=>({state:'empty',seed:null}));\nsandbox.farmAction=(idx)=>{\n  const cell=sandbox.farmCells[idx];\n  if(sandbox.activeTool==='plant'&&cell.state==='plowed'){cell.state='planted';cell.seed=sandbox.selectedSeed;}\n};\nconst farmState={camX:0,camY:0,semente:'semente_tomate',aviso:'',avisoAte:0};\nconst farmPx=r=>({x:r.fx*1447,y:r.fy*1087,w:r.fw*1447,h:r.fh*1087});\nconst farmDentro=(x,y,r)=>{const b=farmPx(r);return x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;};\nconst farmingSystem=sandbox.CampFarmingSystem.create({\n  HORTA,SEMENTES:farm.SEMENTES,NOME_SEM:farm.NOME_SEM,ACAO:farm.ACAO,S:farmState,px:farmPx,dentro:farmDentro\n});\nassert(farmingSystem.CANTEIROS.length===15,'farming-system nao criou os 15 canteiros');\nassert(farmingSystem.CANTEIROS.every((k,i)=>k.idx===i),'indices dos canteiros foram alterados');\nconst firstPlot=farmingSystem.CANTEIROS[0], firstBox=farmPx(firstPlot);\nassert(farmingSystem.canteiroEm(firstBox.x+firstBox.w/2,firstBox.y+firstBox.h/2-6)===firstPlot,'deteccao do canteiro foi alterada');\nsandbox.farmCells[0].state='plowed';\nfarmingSystem.usarCanteiro(firstPlot);\nassert(sandbox.selectedSeed==='semente_tomate'&&sandbox.activeTool==='plant','semente/ferramenta nao foram preparadas como antes');\nassert(sandbox.farmCells[0].state==='planted'&&sandbox.farmCells[0].seed==='semente_tomate','transicao plowed -> planted foi alterada');\nassert(farmState.aviso==='Plantar ok'&&farmState.avisoAte===3000,'feedback de plantio foi alterado');\nassert(typeof farmingSystem.desenharHorta==='function'&&typeof farmingSystem.desenharPlantas==='function','renderizacao da horta nao foi exportada');`;
verifyModules=replaceOnce(verifyModules,farmAnchor,farmTests,'testes executaveis do farming-system');
verifyModules=replaceOnce(
  verifyModules,
  "console.log('OK: modulos do acampamento preservam colisao, layout, farming e interacoes.');",
  "console.log('OK: modulos do acampamento preservam colisao, layout, farming funcional e interacoes.');",
  'mensagem do verificador'
);
fs.writeFileSync(verifyModulesPath,verifyModules,'utf8');

srcReadme=replaceOnce(
  srcReadme,
  '- `camp/farming-data.js`: catalogo puro de sementes, nomes, icones e rotulos de acao.',
  '- `camp/farming-data.js`: catalogo puro de sementes, nomes, icones e rotulos de acao.\n- `camp/farming-system.js`: regras dos canteiros, troca/uso de sementes e renderizacao das culturas, com estado local do CampV2 injetado.',
  'documentacao do farming-system em src'
);
fs.writeFileSync(srcReadmePath,srcReadme,'utf8');

campReadme=replaceOnce(
  campReadme,
  'Catalogo de sementes, nomes, icones e rotulos da horta. O modulo nao executa plantio, inventario, desenho ou persistencia; essas regras continuam no CampV2.',
  'Catalogo de sementes, nomes, icones e rotulos da horta. O modulo continua sendo apenas dados puros; o comportamento foi separado em `farming-system.js`.',
  'descricao atualizada do farming-data'
);
campReadme=replaceOnce(
  campReadme,
  '\n## interaction-data.js\n',
  '\n## farming-system.js\n\nContem a implementacao dos 15 canteiros, selecao e troca de sementes, acionamento de `farmAction` e desenho da terra/culturas. O modulo recebe `HORTA`, dados das sementes, estado `S` e os helpers `px`/`dentro` do CampV2, preservando os mesmos bindings globais de inventario e ferramentas usados antes da extracao.\n\nSave, `farmCells`, `globalInventory`, `selectedSeed`, `activeTool` e `farmAction` nao foram reescritos nem duplicados.\n\n## interaction-data.js\n',
  'secao do farming-system'
);
fs.writeFileSync(campReadmePath,campReadme,'utf8');

console.log('OK: subsistema funcional de farming extraido preservando estado, inventario e desenho.');
