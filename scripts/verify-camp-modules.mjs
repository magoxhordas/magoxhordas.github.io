import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const sandbox={console,performance:{now:()=>1200}};
sandbox.window=sandbox;
vm.createContext(sandbox);

for(const file of [
  'src/camp/collision-map.js',
  'src/camp/layout-data.js',
  'src/camp/farming-data.js',
  'src/camp/farming-system.js',
  'src/camp/environment-renderer.js',
  'src/camp/interaction-data.js',
]){
  vm.runInContext(read(file),sandbox,{filename:file});
}

function assert(condition,message){
  if(!condition) throw new Error(message);
}

assert(sandbox.CampCollisionMap,'CampCollisionMap nao foi exportado');
assert(sandbox.CampLayoutData,'CampLayoutData nao foi exportado');
assert(sandbox.CampFarmingData,'CampFarmingData nao foi exportado');
assert(sandbox.CampFarmingSystem,'CampFarmingSystem nao foi exportado');
assert(sandbox.CampEnvironmentRenderer,'CampEnvironmentRenderer nao foi exportado');
assert(sandbox.CampInteractionData,'CampInteractionData nao foi exportado');

const F=(fx,fy,fw,fh)=>({fx,fy,fw,fh});
const E=(fx,fy,frx,fry=frx)=>({fx,fy,frx,fry});
const collision=sandbox.CampCollisionMap.create(F,E);
assert(collision.BLOQUEIOS.length>0,'mapa retangular de colisao vazio');
assert(collision.BLOQUEIOS_CIRCULARES.length>0,'mapa circular de colisao vazio');
assert(collision.PASSAGENS.length>0,'mapa de passagens vazio');
assert(JSON.stringify(sandbox.CampCollisionMap.FOOTPRINT)===JSON.stringify([[-8,-3],[0,-3],[8,-3],[-8,4],[0,5],[8,4]]),
  'footprint do personagem foi alterado');

const {HORTA,LUZES_ACAMPAMENTO,ARQ}=sandbox.CampLayoutData;
assert(HORTA.fx===.3020&&HORTA.fy===.1080&&HORTA.fw===.2500&&HORTA.fh===.2520&&HORTA.cols===5&&HORTA.linhas===3,
  'layout da horta foi alterado');
assert(LUZES_ACAMPAMENTO.length===13,'quantidade de luzes do acampamento foi alterada');
assert(ARQ.fx===.452&&ARQ.fy===.560,'posicao do arqueiro foi alterada');

const envCalls=[];
const envGradient={addColorStop(){envCalls.push('colorStop');}};
const envCtx={
  save(){envCalls.push('save');},restore(){envCalls.push('restore');},translate(){envCalls.push('translate');},
  beginPath(){envCalls.push('beginPath');},moveTo(){envCalls.push('moveTo');},lineTo(){envCalls.push('lineTo');},
  quadraticCurveTo(){envCalls.push('quadraticCurveTo');},closePath(){envCalls.push('closePath');},clip(){envCalls.push('clip');},
  stroke(){envCalls.push('stroke');},ellipse(){envCalls.push('ellipse');},fillRect(){envCalls.push('fillRect');},
  createRadialGradient(){envCalls.push('gradient');return envGradient;}
};
const environment=sandbox.CampEnvironmentRenderer.create({S:{camX:0,camY:0},LUZES_ACAMPAMENTO});
assert(typeof environment.desenharAmbiente==='function','renderer ambiental nao exporta desenharAmbiente');
environment.desenharAmbiente(envCtx,280);
assert(envCalls.includes('quadraticCurveTo')&&envCalls.includes('gradient')&&envCalls.includes('ellipse')&&envCalls.includes('fillRect'),
  'renderer ambiental deixou de desenhar agua, brilhos, portal ou pixels da fogueira');

const farm=sandbox.CampFarmingData;
assert(JSON.stringify(farm.SEMENTES)===JSON.stringify([
  'semente_trigo','semente_tomate','semente_erva','semente_cogumelo_lua','semente_raiz_sangue'
]),'catalogo de sementes foi alterado');
assert(farm.NOME_SEM.semente_tomate==='Tomate'&&farm.ICONE_SEM.semente_tomate==='🍅','dados do tomate foram alterados');
assert(farm.NOME_SEM.semente_cogumelo_lua==='Cogumelo'&&farm.ICONE_SEM.semente_cogumelo_lua==='🍄','dados do cogumelo foram alterados');
assert(farm.ACAO.empty==='Arar'&&farm.ACAO.ready==='Colher','rotulos de acao da horta foram alterados');

sandbox.globalInventory={semente_tomate:2,semente_trigo:1};
sandbox.selectedSeed=null;
sandbox.activeTool=null;
sandbox.farmCells=Array.from({length:15},()=>({state:'empty',seed:null}));
sandbox.farmAction=(idx)=>{
  const cell=sandbox.farmCells[idx];
  if(sandbox.activeTool==='plant'&&cell.state==='plowed'){cell.state='planted';cell.seed=sandbox.selectedSeed;}
};
const farmState={camX:0,camY:0,semente:'semente_tomate',aviso:'',avisoAte:0};
const farmPx=r=>({x:r.fx*1447,y:r.fy*1087,w:r.fw*1447,h:r.fh*1087});
const farmDentro=(x,y,r)=>{const b=farmPx(r);return x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;};
const farmingSystem=sandbox.CampFarmingSystem.create({
  HORTA,SEMENTES:farm.SEMENTES,NOME_SEM:farm.NOME_SEM,ACAO:farm.ACAO,S:farmState,px:farmPx,dentro:farmDentro
});
assert(farmingSystem.CANTEIROS.length===15,'farming-system nao criou os 15 canteiros');
assert(farmingSystem.CANTEIROS.every((k,i)=>k.idx===i),'indices dos canteiros foram alterados');
const firstPlot=farmingSystem.CANTEIROS[0], firstBox=farmPx(firstPlot);
assert(farmingSystem.canteiroEm(firstBox.x+firstBox.w/2,firstBox.y+firstBox.h/2-6)===firstPlot,'deteccao do canteiro foi alterada');
sandbox.farmCells[0].state='plowed';
farmingSystem.usarCanteiro(firstPlot);
assert(sandbox.selectedSeed==='semente_tomate'&&sandbox.activeTool==='plant','semente/ferramenta nao foram preparadas como antes');
assert(sandbox.farmCells[0].state==='planted'&&sandbox.farmCells[0].seed==='semente_tomate','transicao plowed -> planted foi alterada');
assert(farmState.aviso==='Plantar ok'&&farmState.avisoAte===3000,'feedback de plantio foi alterado');
assert(typeof farmingSystem.desenharHorta==='function'&&typeof farmingSystem.desenharPlantas==='function','renderizacao da horta nao foi exportada');

const ids=['fazenda','cozinha','merlin','oficina','santuario','fogueira','portal','lago','arqueiro'];
const actions=Object.fromEntries(ids.map(id=>[id,()=>id]));
const pontos=sandbox.CampInteractionData.create(actions);
assert(pontos.length===9,'quantidade de pontos de interacao foi alterada');
for(const id of ids){
  const ponto=pontos.find(item=>item.id===id);
  assert(ponto,`ponto de interacao ausente: ${id}`);
  assert(ponto.abrir===actions[id],`callback foi trocado no ponto: ${id}`);
}
const merlin=pontos.find(item=>item.id==='merlin');
assert(merlin.fx===.835&&merlin.fy===.590&&merlin.raio===82&&merlin.rotulo==='Falar com Merlin'&&merlin.cor==='#c08cff',
  'dados de interacao do Merlin foram alterados');
const arqueiro=pontos.find(item=>item.id==='arqueiro');
assert(arqueiro.fx===.452&&arqueiro.fy===.560&&arqueiro.raio===58&&arqueiro.rotulo==='Falar com o Arqueiro',
  'dados de interacao do Arqueiro foram alterados');

console.log('OK: modulos do acampamento preservam colisao, layout, farming, ambiente visual e interacoes.');
