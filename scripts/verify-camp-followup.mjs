import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const sandbox={console,performance:{now:()=>1200}};
sandbox.window=sandbox;
vm.createContext(sandbox);
vm.runInContext(read('src/camp/pet-system.js'),sandbox,{filename:'pet-system.js'});
vm.runInContext(read('src/camp/farming-system.js'),sandbox,{filename:'farming-system.js'});

let checks=0;
const ok=(condition,message)=>{assert.ok(condition,message);checks++;};

const petState={x:500,y:500,camX:100,camY:150,correndo:false,pet:null};
let activePetId='zefiro';
const capturedPets={zefiro:true,ignis:true};
const petDrawCalls=[];
let bloquearPontoPrimario=false;
const petSystem=sandbox.CampPetSystem.create({
  S:petState,
  livre:(x,y)=>!bloquearPontoPrimario||Math.abs(x-(petState.x-38))>=.01||Math.abs(y-(petState.y+8))>=.01,
  getImageSets:()=>({zefiro:{},ignis:{}}),
  getCapturedPets:()=>capturedPets,
  getActivePetId:()=>activePetId,
  getFlyingPets:()=>({zefiro:true}),
  getFlyLift:()=>11,
  getDrawPetImage:()=> (...args)=>petDrawCalls.push(args),
});
petSystem.atualizarPet(.016);
ok(petState.pet?.id==='zefiro','pet ativo nao foi criado');
ok(petState.pet.x===462&&petState.pet.y===508&&petState.pet.dir==='south'&&!petState.pet.flip,
  'pet nao nasceu no ponto lateral do jogador');

petState.pet.x=350;petState.pet.y=500;
petSystem.atualizarPet(.1);
ok(petState.pet.x>350&&petState.pet.andando&&petState.pet.dir==='side'&&!petState.pet.flip,
  'pet nao acompanhou o jogador em direcao ao ponto lateral');

petState.x=900;petState.y=700;petState.correndo=true;
petSystem.atualizarPet(.016);
ok(Math.hypot(petState.pet.x-petState.x,petState.pet.y-petState.y)<55&&!petState.pet.andando,
  'pet distante nao foi recuperado imediatamente ao lado do jogador');

petState.x=500;petState.y=500;petState.correndo=false;petState.pet.x=100;petState.pet.y=100;
bloquearPontoPrimario=true;
petSystem.atualizarPet(.016);
ok(petState.pet.x===538&&petState.pet.y===508&&!petState.pet.andando,
  'pet nao tentou o lado alternativo quando o ponto lateral primario estava bloqueado');
bloquearPontoPrimario=false;

const petCtx={beginPath(){},ellipse(){petDrawCalls.push('shadow');},fill(){}};
petSystem.desenharPet(petCtx,500);
ok(petDrawCalls.includes('shadow'),'sombra do pet deixou de ser desenhada');
const imageCall=petDrawCalls.find(call=>Array.isArray(call));
ok(imageCall&&imageCall[1]==='zefiro'&&imageCall[4]===false&&imageCall[5]===false&&imageCall[7]==='side',
  'renderer do pet alterou sprite, direcao ou estado parado');
activePetId=null;
petSystem.atualizarPet(.016);
ok(petState.pet.id==='zefiro','fallback para o primeiro pet capturado foi alterado');

const HORTA={fx:.2025,fy:.1352,fw:.2336,fh:.2410,cols:4,linhas:4};
sandbox.globalInventory={semente_tomate:2,semente_trigo:1};
sandbox.selectedSeed=null;
sandbox.activeTool=null;
sandbox.farmCells=Array.from({length:15},()=>({tilled:false,state:'empty',seed:null}));
sandbox.farmAction=()=>{};
const farmState={camX:0,camY:0,semente:'semente_tomate',aviso:'',avisoAte:0};
const farmPx=r=>({x:r.fx*1447,y:r.fy*1087,w:r.fw*1447,h:r.fh*1087});
const farmDentro=(x,y,r)=>{const b=farmPx(r);return x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;};
const farmingSystem=sandbox.CampFarmingSystem.create({
  HORTA,SEMENTES:['semente_trigo','semente_tomate'],
  NOME_SEM:{semente_trigo:'Trigo',semente_tomate:'Tomate'},
  ACAO:{empty:'Arar',plowed:'Plantar',planted:'Regar',watered:'Regado',ready:'Colher'},
  S:farmState,px:farmPx,dentro:farmDentro,
});
const farmDrawCalls=[];
const farmCtx={
  canvas:{width:1447,height:1087},save(){},restore(){},
  fillRect(...args){farmDrawCalls.push(['fillRect',...args]);},
  strokeRect(...args){farmDrawCalls.push(['strokeRect',...args]);},
  beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},bezierCurveTo(){},
  arc(){},ellipse(){},stroke(){},fill(){},
};
farmingSystem.desenharHorta(farmCtx,1200);
ok(!farmDrawCalls.some(call=>call[0]==='fillRect'||call[0]==='strokeRect'),
  'canteiros nao arados desenham camada fixa sobre a arte original');
sandbox.farmCells[0].state='plowed';sandbox.farmCells[0].tilled=true;
farmingSystem.desenharHorta(farmCtx,1200);
const farmFills=farmDrawCalls.filter(call=>call[0]==='fillRect');
ok(farmFills.length>0&&!farmDrawCalls.some(call=>call[0]==='strokeRect'),
  'canteiro arado nao recebeu sulcos discretos ou voltou a desenhar borda artificial');
ok(farmFills.every(([,x,y,w,h])=>w*h<=8),
  'canteiro arado voltou a cobrir a arte original com retangulo opaco');
sandbox.farmCells[0].state='watered';sandbox.farmCells[0].seed='semente_tomate';
farmDrawCalls.length=0;
farmingSystem.desenharHorta(farmCtx,1200);
farmingSystem.desenharPlantas(farmCtx,1200);
ok(!farmDrawCalls.some(([,x,y,w,h])=>Number(w)*Number(h)>16),
  'parcela regada voltou a receber uma caixa grande durante o desenho das plantas');

const runtime=read('src/campaign/campaign-runtime.js');
new vm.Script(runtime,{filename:'campaign-runtime.js'});
for(const contract of [
  'installCampaignMeleeObjectiveBridge',
  "this?.classId==='warrior'||this?.classId==='viking'",
  'campaignObjectives.getCombatTargets()',
  'campaignSuppressObjectiveTargets=true',
  'Player.prototype.update=wrapped',
])ok(runtime.includes(contract),`ponte melee/objetivo perdeu contrato: ${contract}`);
ok(runtime.includes('finally{')&&runtime.includes('campaignSuppressObjectiveTargets=false'),
  'ponte melee nao restaura o runtime depois do update');

console.log(`OK: follow-up do acampamento/campanha validado (${checks} verificacoes).`);
