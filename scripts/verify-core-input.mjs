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
/* Relogio CONTROLAVEL: a suavizacao do analogico usa exp(-dt/tau), e sem
   um relogio que ande o dt e' sempre zero e o vetor nunca sai do lugar.
   Com ele da' para medir os tempos de aceleracao de verdade. */
let relogio=0;
const sandbox={console,document,performance:{now:()=>relogio},
  GameEvents:{emit(...args){events.push(args);}},addEventListener(){}};
const avancar=ms=>{relogio+=ms;};
sandbox.window=sandbox;
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'src/core/input-system.js'});

const input=sandbox.InputManager;
assert(!!input,'InputManager deve ser exposto em window');
assert(!!sandbox.MobileTouchSensor,'MobileTouchSensor deve ser exposto em window');
/* A API antiga continua inteira e na mesma ordem; o InputManager GANHOU a
   parte analogica (o movimento touch deixou de ser W/A/S/D virtual). Por
   isso a checagem virou "prefixo intacto + API nova presente" em vez de
   igualdade exata, que proibiria qualquer evolucao. */
const apiAntiga=['registerScope','unregisterScope','pressVirtual','releaseVirtual','releaseSource','releaseAll','normalizeKey','onPointerAttack'];
const chaves=Object.keys(input);
assert(chaves.slice(0,apiAntiga.length).join(',')===apiAntiga.join(','),
  'API publica antiga de InputManager foi alterada ou reordenada');
for(const novo of ['setAnalogMovement','clearAnalogMovement','getMovementVector','getMovementMagnitude','getLastMovementDirection','hasAnalogMovement','resetAnalog','combinarMovimento','direcaoVisual'])
  assert(typeof input[novo]==='function'||novo==='AJUSTE_ANALOGICO',`API analogica ausente: ${novo}`);
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

/* ── O SENSOR VIROU ANALOGICO ──
   As checagens antigas exigiam que o joystick devolvesse ARRAYS DE TECLAS
   (['d'], ['d','s']) e que existisse um boost de 1.85x. Era exatamente o
   que deixava o mobile em 8 direcoes e velocidade unica; o pedido foi
   remover isso. As assercoes abaixo cobrem o MESMO contrato — direita,
   esquerda, cima, baixo, diagonal e zona morta — agora em vetor. */
const vetor=sandbox.MobileTouchSensor.vetorDoDelta;
const R=100;
const quase=(a,b,tol=1e-6)=>Math.abs(a-b)<=tol;
assert(vetor(R,0,R).x>0&&quase(vetor(R,0,R).y,0),'sensor nao mapeou direita');
assert(vetor(-R,0,R).x<0&&quase(vetor(-R,0,R).y,0),'sensor nao mapeou esquerda');
assert(vetor(0,-R,R).y<0&&quase(vetor(0,-R,R).x,0),'sensor nao mapeou cima');
assert(vetor(0,R,R).y>0&&quase(vetor(0,R,R).x,0),'sensor nao mapeou baixo');
const diag=vetor(R*Math.SQRT1_2,R*Math.SQRT1_2,R);
assert(diag.x>0&&diag.y>0,'sensor nao permite diagonal');
assert(quase(diag.x,diag.y,1e-12),'diagonal saiu torta');

// 360 graus de verdade: um angulo qualquer tem de sair no mesmo angulo
const ang=23*Math.PI/180, arb=vetor(Math.cos(ang)*R,Math.sin(ang)*R,R);
assert(Math.abs(Math.atan2(arb.y,arb.x)-ang)<1e-6,'o vetor nao preserva o angulo do dedo');

// magnitude: borda = 1, meio curso = fracao, e diagonal nao corre mais
assert(quase(vetor(R,0,R).magnitude,1,1e-9),'borda do joystick nao da velocidade cheia');
// diagonal no raio cheio tem de dar a MESMA magnitude do cardinal no raio cheio
assert(quase(Math.hypot(diag.x,diag.y),vetor(R,0,R).magnitude,1e-9),'diagonal ficou mais rapida que cardinal');
const meio=vetor(R*0.5,0,R).magnitude;
assert(meio>0.3&&meio<0.75,`meio curso deveria dar fracao de velocidade, deu ${meio}`);
assert(meio<1,'magnitude do meio curso nao pode ser cheia');

// zona morta RADIAL: mesmo limiar em qualquer direcao
const zm=sandbox.MobileTouchSensor.ajuste.ZONA_MORTA;
assert(vetor(R*zm*0.5,0,R).magnitude===0,'zona morta nao segura o toque parado');
assert(vetor(0,R*zm*0.5,R).magnitude===0,'zona morta nao e radial (eixo Y difere do X)');
assert(vetor(R*(zm+0.05),0,R).magnitude>0,'zona morta grande demais — o comeco ficou morto');
assert(zm<=0.15,`zona morta ${zm} alta demais para o feeling pedido`);

// o multiplicador artificial de 1.85x nao pode voltar
assert(sandbox.MobileTouchSensor.movementMultiplier===undefined,
  'o boost artificial de velocidade touch voltou — a responsividade tem de vir do input');
assert(sandbox.MobileTouchSensor.isMoving()===false,'sensor nao deve iniciar em estado de movimento');

/* ── API analogica do InputManager ── */
input.resetAnalog();
assert(input.getMovementVector().active===false,'analogico deveria comecar zerado');
input.setAnalogMovement('teste',0.6,0);
for(let i=0;i<40;i++){ avancar(16); input.getMovementVector(); }   // ~640ms de suavizacao
const v=input.getMovementVector();
assert(v.x>0.5&&v.magnitude>0.5,`vetor nao chegou ao alvo: ${JSON.stringify(v)}`);
assert(v.magnitude<=1.000001,'magnitude passou de 1');
input.setAnalogMovement('teste',1,1);                     // soma que passaria de 1
for(let i=0;i<40;i++){ avancar(16); input.getMovementVector(); }
assert(input.getMovementVector().magnitude<=1.000001,'vetor diagonal passou de 1');
const ultima=input.getLastMovementDirection();
assert(Math.abs(Math.hypot(ultima.x,ultima.y)-1)<1e-6,'ultima direcao nao esta normalizada');
input.clearAnalogMovement('teste');
for(let i=0;i<80;i++){ avancar(16); input.getMovementVector(); }
assert(input.getMovementVector().active===false,'soltar o joystick nao parou o movimento');

// teclado e toque somam sem estourar, e o teclado sozinho continua igual
input.resetAnalog();
assert(JSON.stringify(input.combinarMovimento(1,0))===JSON.stringify({dx:1,dy:0}),
  'teclado sozinho foi alterado pelo analogico');
const somaDiagonal=input.combinarMovimento(1,1);
assert(Math.hypot(somaDiagonal.dx,somaDiagonal.dy)<=1.000001,'diagonal do teclado passou de 1');

// direcao VISUAL pelo eixo dominante, com a fisica seguindo em 360
assert(input.direcaoVisual(0.9,0.2,'down')==='right','direcao visual errada no eixo X');
assert(input.direcaoVisual(0.2,-0.9,'down')==='up','direcao visual errada no eixo Y');
assert(input.direcaoVisual(0,0,'left')==='left','sem movimento a direcao visual deve ficar como estava');

// Instala o sensor em um DOM mínimo e confirma que o boost existe apenas
// enquanto o dedo está arrastando, sem acumular ou alterar a velocidade-base.
const touchListeners=new Map();
const makeTouchElement=id=>({
  id,style:{removeProperty(){},setProperty(){}},
  classList:{add(){},remove(){},contains:name=>name==='mobile-gameplay-active'},
  setAttribute(){},appendChild(){},remove(){},
  querySelector(){return null;},querySelectorAll(){return [];}
});
const legacyControls=makeTouchElement('mobile-controls');
const touchDocument={
  readyState:'complete',hidden:false,
  body:{...makeTouchElement('body'),classList:{add(){},remove(){},contains:name=>name==='mobile-gameplay-active'}},
  head:makeTouchElement('head'),documentElement:{style:{setProperty(){}}},
  createElement:makeTouchElement,
  getElementById:id=>id==='mobile-controls'?legacyControls:null,
  addEventListener(type,handler,options){
    if(!touchListeners.has(type))touchListeners.set(type,[]);
    touchListeners.get(type).push({handler,options});
  }
};
class TouchPlayer{
  constructor(){this.speed=100;this.seenSpeed=0;}
  update(){this.seenSpeed=this.speed;}
}
const touchDungeon={pSpeed:2,seenSpeed:0,_update(){this.seenSpeed=this.pSpeed;}};
let relogioTouch=0;
const touchSandbox={
  console,document:touchDocument,navigator:{maxTouchPoints:5},matchMedia:()=>({matches:true}),
  performance:{now:()=>relogioTouch},                    // a suavizacao precisa de tempo andando
  Player:TouchPlayer,DNG:touchDungeon,GameEvents:{emit(){}},addEventListener(){}
};
touchSandbox.window=touchSandbox;
vm.createContext(touchSandbox);
vm.runInContext(source,touchSandbox,{filename:'src/core/input-system.js'});
const dragTarget={closest:()=>null,setPointerCapture(){}};
const dragEvent=(x,y)=>({pointerId:9,pointerType:'touch',isPrimary:true,target:dragTarget,clientX:x,clientY:y,preventDefault(){}});
touchListeners.get('pointerdown').at(-1).handler(dragEvent(100,100));
assert(touchSandbox.MobileTouchSensor.isMoving(),'o toque na zona de movimento nao assumiu o joystick');
/* A zona morta agora e' PROPORCIONAL ao raio (radial), nao 3px fixos:
   um arrasto de 4px fica dentro dela e nao pode gerar movimento. */
touchListeners.get('pointermove')[0].handler(dragEvent(104,100));
assert(touchSandbox.InputManager.getMovementVector().magnitude===0,
  'arrasto dentro da zona morta gerou movimento');
// arrasto de verdade, acima da zona morta
touchListeners.get('pointermove')[0].handler(dragEvent(140,100));
for(let i=0;i<30;i++){ relogioTouch+=16; touchSandbox.InputManager.getMovementVector(); }
/* ── O BOOST DE 1.85x FOI EMBORA, E NAO PODE VOLTAR ──
   As tres assercoes antigas exigiam que o sensor MULTIPLICASSE a velocidade
   do Player e da Dungeon por 1.85 durante o arrasto — via monkey-patch em
   Player.prototype.update e DNG._update. Era o disfarce do problema real:
   com o movimento digital, so' existia "parado" ou "velocidade cheia", e o
   multiplicador tentava compensar. Agora a intensidade vem da MAGNITUDE do
   vetor, e o input nao encosta mais na velocidade de ninguem. */
const touchPlayer=new TouchPlayer();
touchPlayer.update();touchDungeon._update();
assert(touchPlayer.seenSpeed===100&&touchPlayer.speed===100,
  'o input voltou a mexer na velocidade da campanha — isso e regra de gameplay, nao de input');
assert(touchDungeon.seenSpeed===2&&touchDungeon.pSpeed===2,
  'o input voltou a mexer na velocidade da Dungeon');
assert(!('__mobileTouchSpeedBoost' in touchSandbox.Player.prototype.update),
  'Player.prototype.update voltou a ser monkey-patchado pelo input');
assert(!('__mobileTouchSpeedBoost' in touchDungeon._update),
  'DNG._update voltou a ser monkey-patchado pelo input');

// o arrasto publica VETOR, e ele para ao soltar
const vetorArrasto=touchSandbox.InputManager.getMovementVector();
assert(vetorArrasto.magnitude>0,'o arrasto nao publicou vetor analogico');
touchListeners.get('pointerup')[0].handler(dragEvent(104,100));
assert(touchSandbox.InputManager.hasAnalogMovement()===false,'soltar o dedo nao limpou a fonte analogica');
assert(touchSandbox.MobileTouchSensor.isMoving()===false,'soltar o dedo nao encerrou o movimento');

campaignState.d=true;
unregisterCampaign();
assert(campaignState.d===false,'unregisterScope nao limpou o estado do escopo');

const scriptTag='<script src="src/core/input-system.js"></script>';
const scriptIndex=html.indexOf(scriptTag);
assert(scriptIndex>=0,'index.html nao carrega o modulo de input');
assert(scriptIndex<html.indexOf("InputManager.registerScope('campaign'"),'modulo de input deve carregar antes da campanha');
const dungeonTag='<script src="src/dungeon/dungeon-system.js';
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
  'data-mobile-action="dash"',
  'data-mobile-action="pause"',
  "const FONTE='touch'",
  'ZONA_MORTA:0.10',
  'setAnalogMovement',
  "legacy.querySelector?.('.mobile-dpad')?.remove?.()",
  "legacy.querySelector?.('[data-mobile-action=\"context\"]')?.remove?.()",
  "legacy.querySelector?.('[data-mobile-action=\"menu\"]')?.remove?.()",
  '#mobile-controls.active{display:flex!important}',
  '#mobile-controls [data-mobile-action="dash"]',
  '#mobile-controls [data-mobile-action="pause"]',
  'combinarMovimento',
  /* Trocados junto com o sistema: o input nao patcha mais a Dungeon
     (dng._update=wrapped), nao reescreve a preferencia salva de auto-ataque
     (era toggleAutoAttack) e nao emite W/A/S/D para movimento
     (pressVirtual/releaseVirtual do SOURCE). O que ficou no lugar: */
  'setAnalogMovement(FONTE,v.x,v.y)',
  'clearAnalogMovement(FONTE)',
  'mobileAutoAttackOverride=true',
  'if(mobileSensor.shouldCapture(event))return;',
  'ZONA_MOVIMENTO',
  'SEGUE_CENTRO'
],'contrato de controles');

console.log(`OK: core input preservou teclado/escopos e adotou sensor mobile rapido com Dash/Pausa (${checks} verificacoes).`);
