import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.env.TEST_ROOT||path.resolve(import.meta.dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const html=read('index.html').replace(/\r\n/g,'\n');
const source=read('src/core/input-system.js');
const dungeonSource=read('src/dungeon/dungeon-system.js').replace(/\r\n/g,'\n');
const settingsSource=read('src/ui/settings-system.js').replace(/\r\n/g,'\n');
const integrationSource=`${html}\n${dungeonSource}\n${settingsSource}\n${source}`;
let checks=0;

function assert(condition,message){
  if(!condition) throw new Error(`FALHA: ${message}`);
  checks++;
}

function includesAll(haystack,needles,context){
  needles.forEach(needle=>assert(haystack.includes(needle),`${context}: ausente ${needle}`));
}

new vm.Script(source,{filename:'src/core/input-system.js'});
assert((source.match(/document\.addEventListener\('keydown'/g)||[]).length===1,'o modulo deve registrar um unico listener keydown');
assert((source.match(/document\.addEventListener\('keyup'/g)||[]).length===1,'o modulo deve registrar um unico listener keyup');
assert((source.match(/document\.addEventListener\('pointerdown'/g)||[]).length===2,'input central e sensor devem registrar exatamente dois pointerdown');
assert((source.match(/document\.addEventListener\('pointermove'/g)||[]).length===1,'sensor deve registrar um unico pointermove');

const listeners=new Map();
const events=[];
const document={
  readyState:'loading',
  addEventListener(type,handler,options){
    if(!listeners.has(type)) listeners.set(type,[]);
    listeners.get(type).push({handler,options});
  }
};
const sandbox={console,document,GameEvents:{emit(...args){events.push(args);}},addEventListener(){}};
sandbox.window=sandbox;
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'src/core/input-system.js'});

const input=sandbox.InputManager;
assert(!!input,'InputManager deve ser exposto em window');
assert(!!sandbox.MobileTouchSensor,'MobileTouchSensor deve ser exposto em window');
assert(Object.keys(input).join(',')==='registerScope,unregisterScope,pressVirtual,releaseVirtual,releaseSource,releaseAll,normalizeKey,onPointerAttack','API publica de InputManager e ordem foram alteradas');
assert(input.normalizeKey('W')==='w'&&input.normalizeKey(' ')===' '&&input.normalizeKey(null)==='','normalizacao de teclas foi alterada');
assert(listeners.get('keydown')?.length===1&&listeners.get('keyup')?.length===1&&listeners.get('pointerdown')?.length===1,'listeners centrais devem ser registrados uma vez antes da instalacao touch');
assert(listeners.get('pointerdown')[0].options?.passive===false,'pointerdown central deve continuar nao passivo');

const campaignState={};
const campaignCalls=[];
let campaignActive=true;
const unregisterCampaign=input.registerScope('campaign-test',{
  state:campaignState,
  priority:10,
  isActive:()=>campaignActive,
  onKeyDown:(event,key)=>campaignCalls.push(['down',event.code,key]),
  onKeyUp:(event,key)=>campaignCalls.push(['up',event.code,key])
});
input.registerScope('extra-test',{state:{},priority:1});
assert(listeners.get('keydown').length===1&&listeners.get('keyup').length===1,'registrar escopos nao pode duplicar listeners');

listeners.get('keydown')[0].handler({key:'W',code:'KeyW'});
assert(campaignState.w===true&&campaignState.W===true&&campaignState.KeyW===true&&campaignState.keyw===true,'aliases de keydown foram alterados');
assert(JSON.stringify(campaignCalls[0])===JSON.stringify(['down','KeyW','w']),'callback de keydown recebeu contrato diferente');
listeners.get('keyup')[0].handler({key:'W',code:'KeyW'});
assert(campaignState.w===false&&campaignState.W===false&&campaignState.KeyW===false&&campaignState.keyw===false,'aliases de keyup foram alterados');
assert(JSON.stringify(campaignCalls[1])===JSON.stringify(['up','KeyW','w']),'callback de keyup recebeu contrato diferente');

const dungeonState={};
const dungeonCalls=[];
let dungeonActive=true;
input.registerScope('dungeon-test',{
  state:dungeonState,
  priority:20,
  exclusive:true,
  isActive:()=>dungeonActive,
  onKeyDown:(event,key)=>dungeonCalls.push([event.code,key])
});
campaignState.a=false;
listeners.get('keydown')[0].handler({key:'a',code:'KeyA'});
assert(dungeonState.a===true&&campaignState.a===false&&dungeonCalls.length===1,'escopo exclusivo prioritario nao bloqueou a campanha');
dungeonActive=false;
listeners.get('keydown')[0].handler({key:'d',code:'KeyD'});
assert(campaignState.d===true,'campanha ativa nao recebeu input quando Dungeon ficou inativa');
campaignActive=false;
listeners.get('keydown')[0].handler({key:'s',code:'KeyS'});
assert(campaignState.s!==true,'escopo inativo recebeu input');
campaignActive=true;

input.pressVirtual('touch-left','a');
input.pressVirtual('touch-right','a');
assert(campaignState.a===true&&campaignState.A===true,'input virtual nao espelhou tecla em minuscula e maiuscula');
input.releaseVirtual('touch-left','a');
assert(campaignState.a===true,'soltar uma fonte virtual limpou outra fonte ainda ativa');
input.releaseSource('touch-right');
assert(campaignState.a===false&&campaignState.A===false,'releaseSource nao limpou a ultima fonte virtual');

campaignState.w=true;
input.releaseAll('blur-test');
assert(campaignState.w===false,'releaseAll nao limpou o estado dos escopos');
assert(events.some(event=>event[0]==='input:released'&&event[1]?.reason==='blur-test'),'releaseAll nao emitiu input:released com motivo');

let pointerCount=0;
const stopPointer=input.onPointerAttack(()=>{ pointerCount++; });
const neutralTarget={closest:()=>null};
listeners.get('pointerdown')[0].handler({pointerId:1,pointerType:'mouse',target:neutralTarget});
assert(pointerCount===1,'ataque por mouse deixou de chegar ao handler de ponteiro');

sandbox.navigator={maxTouchPoints:5};
sandbox.matchMedia=()=>({matches:true});
document.body={classList:{contains:name=>name==='mobile-gameplay-active'}};
const touchEvent={pointerId:2,pointerType:'touch',isPrimary:true,target:neutralTarget};
assert(sandbox.MobileTouchSensor.shouldCapture(touchEvent),'sensor nao capturou toque durante gameplay mobile');
listeners.get('pointerdown')[0].handler(touchEvent);
assert(pointerCount===1,'toque de locomocao foi interpretado como ataque manual');
stopPointer();

const direction=sandbox.MobileTouchSensor.directionForDelta;
assert(JSON.stringify(direction(50,0))===JSON.stringify(['d']),'sensor nao mapeou direita');
assert(JSON.stringify(direction(-50,0))===JSON.stringify(['a']),'sensor nao mapeou esquerda');
assert(JSON.stringify(direction(0,-50))===JSON.stringify(['w']),'sensor nao mapeou cima');
assert(JSON.stringify(direction(0,50))===JSON.stringify(['s']),'sensor nao mapeou baixo');
assert(JSON.stringify(direction(40,40))===JSON.stringify(['d','s']),'sensor nao permite diagonal');
assert(direction(3,3).length===0,'zona morta do sensor foi removida');

campaignState.d=true;
unregisterCampaign();
assert(campaignState.d===false,'unregisterScope nao limpou o estado do escopo');

const scriptTag='<script src="src/core/input-system.js"></script>';
const scriptIndex=html.indexOf(scriptTag);
assert(scriptIndex>=0,'index.html nao carrega o modulo de input');
assert(scriptIndex<html.indexOf("InputManager.registerScope('campaign'"),'modulo de input deve carregar antes da campanha');
const dungeonTag='<script src="src/dungeon/dungeon-system.js"></script>';
assert(html.indexOf(dungeonTag)>scriptIndex,'modulo de input deve carregar antes da Dungeon');

includesAll(integrationSource,[
  "InputManager.registerScope('campaign'",
  'state:keys,\n  priority:10,',
  'onKeyDown:campaignKeyDown,\n  onKeyUp:campaignKeyUp',
  "InputManager.registerScope('dungeon'",
  'state:DNG.keys,\n  priority:20,\n  exclusive:true,',
  'onKeyDown:DNG._onKey,\n  onKeyUp:DNG._offKey',
  "moveUp:'KeyW', moveDown:'KeyS', moveLeft:'KeyA', moveRight:'KeyD'",
  "dash:'ShiftLeft', inventory:'KeyI', map:'KeyM', crafting:'KeyT', pause:'Escape'",
  "if(gameMode===1){\n      if(keys['ArrowLeft'])  dx-=1;",
  "if(keys['ArrowLeft'])  dx=-1;\n    if(keys['ArrowRight']) dx+=1;",
  '({dx,dy}=normalizeCampaignMovementVector(dx,dy));',
  "const SOURCE='mobile-sensor'",
  "legacy.replaceChildren?.()",
  '#mobile-controls{display:none!important;pointer-events:none!important}',
  ':root{--mobile-controls-height:0px!important}',
  "global.GameSettings?.autoAttack===false",
  'if(mobileSensor.shouldCapture(event))return;',
  'pressVirtual(SOURCE,key)',
  'releaseVirtual(SOURCE,key)'
],'contrato de controles');

console.log(`OK: core input preservou teclado/escopos e adotou sensor mobile sem botoes (${checks} verificacoes).`);
