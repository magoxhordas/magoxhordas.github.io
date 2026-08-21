import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const indexPath=path.join(root,'index.html');
const modulePath=path.join(root,'src','camp','environment-renderer.js');
const verifyModulesPath=path.join(root,'scripts','verify-camp-modules.mjs');
const verifyCampPath=path.join(root,'scripts','verify-campaign-boss-camp.mjs');
const SCRIPT_TAG='<script src="src/camp/environment-renderer.js"></script>';

function assert(condition,message){if(!condition) throw new Error(message);}
function occurrences(source,text){let n=0,p=0;while((p=source.indexOf(text,p))>=0){n++;p+=text.length;}return n;}
function replaceOnce(source,oldText,newText,label){const n=occurrences(source,oldText);assert(n===1,`${label}: esperado 1 trecho, encontrado ${n}`);return source.replace(oldText,newText);}

function findConstRange(source,name,from=0){
  const token=`const ${name}`; const start=source.indexOf(token,from); assert(start>=0,`${name} nao encontrado`);
  const eq=source.indexOf('=',start+token.length); assert(eq>=0,`${name} sem inicializador`);
  let quote=null,escaped=false,line=false,block=false,round=0,square=0,curly=0;
  for(let i=eq+1;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(line){if(ch==='\n')line=false;continue;} if(block){if(ch==='*'&&next==='/'){block=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote=null;continue;}
    if(ch==='/'&&next==='/'){line=true;i++;continue;} if(ch==='/'&&next==='*'){block=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='(')round++; else if(ch===')')round--; else if(ch==='[')square++; else if(ch===']')square--; else if(ch==='{')curly++; else if(ch==='}')curly--;
    else if(ch===';'&&round===0&&square===0&&curly===0) return {start,end:i+1,text:source.slice(start,i+1)};
  }
  throw new Error(`${name} sem fim`);
}

function findFunctionRange(source,name,from=0){
  const token=`function ${name}(`; const start=source.indexOf(token,from); assert(start>=0,`${name} nao encontrada`);
  const open=source.indexOf('{',start); let quote=null,escaped=false,line=false,block=false,depth=0;
  for(let i=open;i<source.length;i++){
    const ch=source[i],next=source[i+1];
    if(line){if(ch==='\n')line=false;continue;} if(block){if(ch==='*'&&next==='/'){block=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote=null;continue;}
    if(ch==='/'&&next==='/'){line=true;i++;continue;} if(ch==='/'&&next==='*'){block=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++; else if(ch==='}'&&--depth===0) return {start,end:i+1,text:source.slice(start,i+1)};
  }
  throw new Error(`${name} sem fim`);
}

function indent(text,spaces){const pad=' '.repeat(spaces);return text.split('\n').map(line=>line?pad+line:'').join('\n');}

let html=fs.readFileSync(indexPath,'utf8').replace(/\r\n/g,'\n');
let verifyModules=fs.readFileSync(verifyModulesPath,'utf8').replace(/\r\n/g,'\n');
let verifyCamp=fs.readFileSync(verifyCampPath,'utf8').replace(/\r\n/g,'\n');
assert(!html.includes(SCRIPT_TAG),'environment-renderer.js ja esta carregado');
assert(!fs.existsSync(modulePath),'environment-renderer.js ja existe');

const campStart=html.indexOf('window.CampV2 = (function(){');
const campEnd=html.indexOf('// [/CAMP-V2]',campStart);
assert(campStart>=0&&campEnd>campStart,'CampV2 nao encontrado');
const lights=findConstRange(html,'LUZES_ACAMPAMENTO',campStart);
const fireflies=findConstRange(html,'VAGALUMES',lights.end);
const brilho=findFunctionRange(html,'brilho',fireflies.end);
const agua=findFunctionRange(html,'desenharAgua',brilho.end);
const fogo=findFunctionRange(html,'desenharFogueira',agua.end);
const ambiente=findFunctionRange(html,'desenharAmbiente',fogo.end);
assert(lights.start<fireflies.start&&fireflies.start<brilho.start&&brilho.start<agua.start&&agua.start<fogo.start&&fogo.start<ambiente.start,'ordem inesperada do renderer ambiental');
const implementation=html.slice(fireflies.start,ambiente.end);
assert(implementation.includes('Math.floor(t/140)%4'),'animacao discreta da fogueira mudou antes da extracao');
assert(agua.text.includes('quadraticCurveTo'),'forma da agua esperada nao foi encontrada');

const moduleSource=`// CampV2 environmental rendering extracted without changing pixels or timing.\n(function(global){\n  'use strict';\n\n  function create(deps){\n    const {S,LUZES_ACAMPAMENTO}=deps||{};\n    if(!S||!Array.isArray(LUZES_ACAMPAMENTO))\n      throw new TypeError('CampEnvironmentRenderer.create recebeu dependencias invalidas.');\n\n${indent(implementation,4)}\n\n    return {desenharAmbiente};\n  }\n\n  global.CampEnvironmentRenderer=Object.freeze({create});\n})(window);\n`;
fs.writeFileSync(modulePath,moduleSource,'utf8');

// Substitui o bloco usando os offsets do HTML original. A tag externa so e
// inserida depois para nao deslocar as posicoes calculadas acima.
const bridge=`const {desenharAmbiente}=window.CampEnvironmentRenderer.create({\n    S,LUZES_ACAMPAMENTO:window.CampLayoutData.LUZES_ACAMPAMENTO\n  });`;
html=html.slice(0,lights.start)+bridge+html.slice(ambiente.end);
const newCampStart=html.indexOf('window.CampV2 = (function(){');
const ownerScriptStart=html.lastIndexOf('<script',newCampStart);
assert(ownerScriptStart>=0,'script proprietario do CampV2 nao encontrado');
html=html.slice(0,ownerScriptStart)+`  ${SCRIPT_TAG}\n`+html.slice(ownerScriptStart);
const camp=html.slice(html.indexOf('window.CampV2 = (function(){'),html.indexOf('// [/CAMP-V2]'));
for(const name of ['brilho','desenharAgua','desenharFogueira','desenharAmbiente']) assert(!camp.includes(`function ${name}(`),`${name} permaneceu no index`);
assert(!camp.includes('const VAGALUMES'),'VAGALUMES permaneceu no index');
assert(camp.includes('window.CampEnvironmentRenderer.create({'),'ponte do renderer ambiental ausente');
assert(camp.includes('desenharAmbiente(c,t);\n    desenharHorta(c,t);\n    desenharPlantas(c,t);'),'ordem das camadas ambiente/horta/plantas foi alterada');
fs.writeFileSync(indexPath,html,'utf8');

verifyModules=replaceOnce(verifyModules,
  "  'src/camp/farming-system.js',\n  'src/camp/interaction-data.js',",
  "  'src/camp/farming-system.js',\n  'src/camp/environment-renderer.js',\n  'src/camp/interaction-data.js',",
  'carga do renderer ambiental');
verifyModules=replaceOnce(verifyModules,
  "assert(sandbox.CampFarmingSystem,'CampFarmingSystem nao foi exportado');\nassert(sandbox.CampInteractionData,'CampInteractionData nao foi exportado');",
  "assert(sandbox.CampFarmingSystem,'CampFarmingSystem nao foi exportado');\nassert(sandbox.CampEnvironmentRenderer,'CampEnvironmentRenderer nao foi exportado');\nassert(sandbox.CampInteractionData,'CampInteractionData nao foi exportado');",
  'export do renderer ambiental');
const layoutAnchor="assert(ARQ.fx===.452&&ARQ.fy===.560,'posicao do arqueiro foi alterada');";
verifyModules=replaceOnce(verifyModules,layoutAnchor,`${layoutAnchor}\n\nconst envCalls=[];\nconst envGradient={addColorStop(){envCalls.push('colorStop');}};\nconst envCtx={\n  save(){envCalls.push('save');},restore(){envCalls.push('restore');},translate(){envCalls.push('translate');},\n  beginPath(){envCalls.push('beginPath');},moveTo(){envCalls.push('moveTo');},lineTo(){envCalls.push('lineTo');},\n  quadraticCurveTo(){envCalls.push('quadraticCurveTo');},closePath(){envCalls.push('closePath');},clip(){envCalls.push('clip');},\n  stroke(){envCalls.push('stroke');},ellipse(){envCalls.push('ellipse');},fillRect(){envCalls.push('fillRect');},\n  createRadialGradient(){envCalls.push('gradient');return envGradient;}\n};\nconst environment=sandbox.CampEnvironmentRenderer.create({S:{camX:0,camY:0},LUZES_ACAMPAMENTO});\nassert(typeof environment.desenharAmbiente==='function','renderer ambiental nao exporta desenharAmbiente');\nenvironment.desenharAmbiente(envCtx,280);\nassert(envCalls.includes('quadraticCurveTo')&&envCalls.includes('gradient')&&envCalls.includes('ellipse')&&envCalls.includes('fillRect'),\n  'renderer ambiental deixou de desenhar agua, brilhos, portal ou pixels da fogueira');`,'teste executavel do renderer ambiental');
verifyModules=replaceOnce(verifyModules,
  "console.log('OK: modulos do acampamento preservam colisao, layout, farming funcional e interacoes.');",
  "console.log('OK: modulos do acampamento preservam colisao, layout, farming, ambiente visual e interacoes.');",
  'mensagem do verificador modular');
fs.writeFileSync(verifyModulesPath,verifyModules,'utf8');

verifyCamp=replaceOnce(verifyCamp,
  "const interactionSource=fs.readFileSync(path.join(root,'src','camp','interaction-data.js'),'utf8');",
  "const interactionSource=fs.readFileSync(path.join(root,'src','camp','interaction-data.js'),'utf8');\nconst environmentSource=fs.readFileSync(path.join(root,'src','camp','environment-renderer.js'),'utf8');",
  'leitura do renderer ambiental');
const interactionLoad="assert(html.indexOf('<script src=\\\"src/camp/interaction-data.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'pontos de interacao precisam carregar antes do CampV2');";
verifyCamp=replaceOnce(verifyCamp,interactionLoad,`${interactionLoad}\nassert(html.includes('<script src=\\\"src/camp/environment-renderer.js\\\"></script>'),'index nao carrega o renderer ambiental externo');\nassert(html.indexOf('<script src=\\\"src/camp/environment-renderer.js\\\"></script>')<html.indexOf('window.CampV2 = (function(){'),'renderer ambiental precisa carregar antes do CampV2');`,'ordem de carga do renderer ambiental');
const farmBridge="assert(html.includes('window.CampFarmingSystem.create({HORTA,SEMENTES,NOME_SEM,ACAO,S,px,dentro})'),\n  'CampV2 nao injeta as dependencias no farming-system');";
verifyCamp=replaceOnce(verifyCamp,farmBridge,`${farmBridge}\nassert(!camp.includes('function desenharAmbiente(c,t)')&&!camp.includes('function desenharAgua(c,t)')&&\n  !camp.includes('function desenharFogueira(c,t)')&&!camp.includes('const VAGALUMES'),\n  'implementacao ambiental voltou para o index');\nassert(environmentSource.includes('function desenharAgua(c,t)')&&environmentSource.includes('function desenharFogueira(c,t)')&&\n  environmentSource.includes('function desenharAmbiente(c,t)')&&environmentSource.includes('const VAGALUMES'),\n  'environment-renderer nao contem os efeitos extraidos');\nassert(html.includes('window.CampEnvironmentRenderer.create({')&&\n  html.includes('LUZES_ACAMPAMENTO:window.CampLayoutData.LUZES_ACAMPAMENTO'),\n  'CampV2 nao injeta estado/luzes no renderer ambiental');`,'fronteira estrutural do renderer ambiental');
verifyCamp=replaceOnce(verifyCamp,
  "assert(html.includes('const LUZES_ACAMPAMENTO=window.CampLayoutData.LUZES_ACAMPAMENTO;')&&\n  html.includes('const ARQ=window.CampLayoutData.ARQ;'),'CampV2 nao esta consumindo os dados de layout extraidos');",
  "assert(layoutSource.includes('const LUZES_ACAMPAMENTO=Object.freeze([')&&\n  html.includes('LUZES_ACAMPAMENTO:window.CampLayoutData.LUZES_ACAMPAMENTO')&&\n  html.includes('const ARQ=window.CampLayoutData.ARQ;'),'CampV2 nao esta consumindo os dados de layout extraidos');",
  'consumo dos dados de layout');
verifyCamp=replaceOnce(verifyCamp,
  "assert(html.includes('function desenharAmbiente(c,t)')&&\n  html.includes('desenharAmbiente(c,t);\\n    desenharHorta(c,t);\\n    desenharPlantas(c,t);'),\n  'animacoes e nova horta nao estao ligadas ao desenho');",
  "assert(environmentSource.includes('function desenharAmbiente(c,t)')&&\n  html.includes('desenharAmbiente(c,t);\\n    desenharHorta(c,t);\\n    desenharPlantas(c,t);'),\n  'renderer ambiental e horta nao preservaram a ordem das camadas');",
  'ordem das camadas de desenho');
verifyCamp=replaceOnce(verifyCamp,
  "for(const effect of ['function desenharAgua(c,t)','function desenharFogueira(c,t)','LUZES_ACAMPAMENTO','VAGALUMES'])\n  assert(html.includes(effect),`efeito ambiental ausente: ${effect}`);\nconst fogo=html.slice(html.indexOf('function desenharFogueira(c,t)'),html.indexOf('function desenharAmbiente(c,t)'));",
  "for(const effect of ['function desenharAgua(c,t)','function desenharFogueira(c,t)','LUZES_ACAMPAMENTO','VAGALUMES'])\n  assert(environmentSource.includes(effect),`efeito ambiental ausente: ${effect}`);\nconst fogo=environmentSource.slice(environmentSource.indexOf('function desenharFogueira(c,t)'),environmentSource.indexOf('function desenharAmbiente(c,t)'));",
  'validacao dos efeitos ambientais externos');
fs.writeFileSync(verifyCampPath,verifyCamp,'utf8');

console.log('OK: renderer ambiental extraido sem alterar efeitos, timing ou ordem das camadas.');
