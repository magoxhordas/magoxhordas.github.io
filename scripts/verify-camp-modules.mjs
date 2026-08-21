import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const sandbox={console};
sandbox.window=sandbox;
vm.createContext(sandbox);

for(const file of [
  'src/camp/collision-map.js',
  'src/camp/layout-data.js',
  'src/camp/farming-data.js',
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

const farm=sandbox.CampFarmingData;
assert(JSON.stringify(farm.SEMENTES)===JSON.stringify([
  'semente_trigo','semente_tomate','semente_erva','semente_cogumelo_lua','semente_raiz_sangue'
]),'catalogo de sementes foi alterado');
assert(farm.NOME_SEM.semente_tomate==='Tomate'&&farm.ICONE_SEM.semente_tomate==='🍅','dados do tomate foram alterados');
assert(farm.NOME_SEM.semente_cogumelo_lua==='Cogumelo'&&farm.ICONE_SEM.semente_cogumelo_lua==='🍄','dados do cogumelo foram alterados');
assert(farm.ACAO.empty==='Arar'&&farm.ACAO.ready==='Colher','rotulos de acao da horta foram alterados');

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

console.log('OK: modulos do acampamento preservam colisao, layout, farming e interacoes.');
