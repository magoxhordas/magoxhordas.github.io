import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
const collisionSource=fs.readFileSync(path.join(root,'src','camp','collision-map.js'),'utf8');
const layoutSource=fs.readFileSync(path.join(root,'src','camp','layout-data.js'),'utf8');
const farmingSource=fs.readFileSync(path.join(root,'src','camp','farming-data.js'),'utf8');
const farmingSystemSource=fs.readFileSync(path.join(root,'src','camp','farming-system.js'),'utf8');
const interactionSource=fs.readFileSync(path.join(root,'src','camp','interaction-data.js'),'utf8');
const environmentSource=fs.readFileSync(path.join(root,'src','camp','environment-renderer.js'),'utf8');
const petSource=fs.readFileSync(path.join(root,'src','camp','pet-system.js'),'utf8');
const archerSource=fs.readFileSync(path.join(root,'src','camp','archer-system.js'),'utf8');
assert(html.includes('<script src=\"src/camp/collision-map.js\"></script>'),'index nao carrega o modulo externo de colisao');
assert(html.indexOf('<script src=\"src/camp/collision-map.js\"></script>')<html.indexOf('window.CampV2 = (function(){'),'modulo de colisao precisa carregar antes do CampV2');
assert(html.includes('<script src=\"src/camp/layout-data.js\"></script>'),'index nao carrega os dados de layout do acampamento');
assert(html.indexOf('<script src=\"src/camp/layout-data.js\"></script>')<html.indexOf('window.CampV2 = (function(){'),'layout do acampamento precisa carregar antes do CampV2');
assert(html.includes('<script src=\"src/camp/farming-data.js\"></script>'),'index nao carrega os dados puros da horta');
assert(html.indexOf('<script src=\"src/camp/farming-data.js\"></script>')<html.indexOf('window.CampV2 = (function(){'),'dados da horta precisam carregar antes do CampV2');
assert(html.includes('<script src=\"src/camp/farming-system.js\"></script>'),'index nao carrega o comportamento externo da horta');
assert(html.indexOf('<script src=\"src/camp/farming-system.js\"></script>')<html.indexOf('window.CampV2 = (function(){'),'farming-system precisa carregar antes do CampV2');
assert(html.includes('<script src=\"src/camp/interaction-data.js\"></script>'),'index nao carrega os pontos de interacao externos');
assert(html.indexOf('<script src=\"src/camp/interaction-data.js\"></script>')<html.indexOf('window.CampV2 = (function(){'),'pontos de interacao precisam carregar antes do CampV2');
assert(html.includes('<script src=\"src/camp/environment-renderer.js\"></script>'),'index nao carrega o renderer ambiental externo');
assert(html.indexOf('<script src=\"src/camp/environment-renderer.js\"></script>')<html.indexOf('window.CampV2 = (function(){'),'renderer ambiental precisa carregar antes do CampV2');
assert(html.includes('<script src=\"src/camp/pet-system.js\"></script>'),'index nao carrega o sistema externo do pet');
assert(html.indexOf('<script src=\"src/camp/pet-system.js\"></script>')<html.indexOf('window.CampV2 = (function(){'),'pet-system precisa carregar antes do CampV2');
assert(html.includes('<script src=\"src/camp/archer-system.js\"></script>'),'index nao carrega o renderer externo do arqueiro');
assert(html.indexOf('<script src=\"src/camp/archer-system.js\"></script>')<html.indexOf('window.CampV2 = (function(){'),'archer-system precisa carregar antes do CampV2');

function assert(condition,message){
  if(!condition) throw new Error(message);
}

for(const expected of [
  "id:'skeleton_king',wave:5, icon:'💀',name:'Rei Cadáver',      cls:'BossSkeletonKing', unlockWave:5, arena:'crypt'",
  "id:'aracne',        wave:10,icon:'🕷️',name:'Aracne Ancestral', cls:'BossAracne',       unlockWave:10,arena:'forest'",
  "id:'frost',         wave:15,icon:'❄️',name:'Gigante de Gelo',  cls:'BossFrostBehemoth',unlockWave:15,arena:'snow'",
  "id:'sandworm',      wave:20,icon:'🪱',name:'Verme Devorador',  cls:'BossSandworm',     unlockWave:20,arena:'desert'",
  "id:'balrog',        wave:25,icon:'🔥',name:'Balrog',           cls:'BossBalrog',       unlockWave:25,arena:'volcano'",
]) assert(html.includes(expected),`arena incorreta para chefe: ${expected.slice(4,28)}`);

const rushList=html.slice(html.indexOf('const BOSS_RUSH_LIST=['),html.indexOf('let bossRushMode=false'));
assert(!rushList.includes("arena:'castle'"),'o mapa antigo ainda aparece nas listas do Boss Rush');
assert(html.includes("const initialArena=bossRushMode?(bossRushQueue[0]?.arena||'crypt'):'crypt';"),'Boss Rush ainda inicia no mapa generico');
assert(html.includes("function resetBossRushState(clearSelection=false)"),'reset central do modo chefao ausente');
assert(html.includes("function openCampaignSetup()")&&html.includes("resetBossRushState(false);\n  state='menu';\n  showScreen('play-menu');"),'campanha nao zera o modo chefao');
assert(html.includes('function clampCampaignEntity(entity,padding=0){\n  if(!entity) return entity;'),'limites ainda ignoram entidades do Boss Rush');
assert(html.includes('body.campaign-hud-active.boss-rush-no-coins #ui-top {'),
  'HUD moderna do modo Chefao nao removeu a coluna vazia do ouro');

const begin=html.slice(html.indexOf('function beginGame(){'),html.indexOf('\nfunction endGame(){'));
assert(begin.includes("document.body.classList.add('campaign-hud-active');"),
  'modo Chefao ainda reativa a HUD antiga');
const chapterAt=begin.indexOf('if(!bossRushMode) maybeStartCampaignChapter(wave);');
const frameAt=begin.indexOf('raf=requestAnimationFrame(loop);');
assert(chapterAt>=0&&frameAt>chapterAt,'capitulo nao abre antes do primeiro frame do combate');
assert(html.includes('#campaign-chapter-screen.active {\n  display:block;\n  opacity:1;\n}'),'a abertura ainda deixa o canvas do combate aparecer por transparencia');
assert(html.includes('0%{opacity:0;transform:scale(1.05)'),'o fade nao esta restrito a arte do capitulo');

assert(collisionSource.includes('const BLOQUEIOS_CIRCULARES = ['),'objetos redondos do acampamento sem colisao propria');
assert(collisionSource.includes('Object.freeze([-8,-3])')&&collisionSource.includes('Object.freeze([0,5])')&&
  html.includes('const sola=window.CampCollisionMap.FOOTPRINT;'),'colisao do heroi nao usa a mesma area dos pes');
for(const obstacle of [
  'F(.040, .200, .252, .322)',
  'F(.765, .248, .230, .326)',
  'F(.058, .595, .255, .286)',
  'F(.705, .620, .285, .285)',
  'F(.375, .775, .275, .202)',
]) assert(collisionSource.includes(obstacle),`silhueta completa sem colisao: ${obstacle}`);
assert(html.includes('function reposicionarSeBloqueado()')&&html.includes('dimensionar();\n    reposicionarSeBloqueado();\n    retomar();'),'jogador salvo dentro de objeto nao e resgatado');

// Reconstroi as formas diretamente do codigo e testa os pontos vistos nas
// capturas: tetos, tendas, tocos, santuario e portal precisam estar bloqueados.
const camp=html.slice(html.indexOf('window.CampV2 = (function(){'),html.indexOf('// [/CAMP-V2]'));
assert(!camp.includes('const BLOQUEIOS = ['),'dados de colisao voltaram a ficar presos no index');
assert(!camp.includes('function usarCanteiro(k)')&&!camp.includes('function desenharHorta(c,t)')&&!camp.includes('function desenharPlantas(c,t)'),
  'implementacao da horta voltou para o index');
assert(farmingSystemSource.includes('function usarCanteiro(k)')&&farmingSystemSource.includes('function desenharHorta(c,t)')&&
  farmingSystemSource.includes('function desenharPlantas(c,t)'),'farming-system nao contem o comportamento extraido');
assert(html.includes('window.CampFarmingSystem.create({HORTA,SEMENTES,NOME_SEM,ACAO,S,px,dentro})'),
  'CampV2 nao injeta as dependencias no farming-system');
assert(!camp.includes('function desenharAmbiente(c,t)')&&!camp.includes('function desenharAgua(c,t)')&&
  !camp.includes('function desenharFogueira(c,t)')&&!camp.includes('const VAGALUMES'),
  'implementacao ambiental voltou para o index');
assert(environmentSource.includes('function desenharAgua(c,t)')&&environmentSource.includes('function desenharFogueira(c,t)')&&
  environmentSource.includes('function desenharAmbiente(c,t)')&&environmentSource.includes('const VAGALUMES'),
  'environment-renderer nao contem os efeitos extraidos');
assert(html.includes('window.CampEnvironmentRenderer.create({')&&
  html.includes('LUZES_ACAMPAMENTO:window.CampLayoutData.LUZES_ACAMPAMENTO'),
  'CampV2 nao injeta estado/luzes no renderer ambiental');
const rectSource=collisionSource.slice(collisionSource.indexOf('const BLOQUEIOS = ['),collisionSource.indexOf('const BLOQUEIOS_CIRCULARES'));
const ellipseSource=collisionSource.slice(collisionSource.indexOf('const BLOQUEIOS_CIRCULARES = ['),collisionSource.indexOf('const PASSAGENS'));
const passageSource=collisionSource.slice(collisionSource.indexOf('const PASSAGENS = ['),collisionSource.indexOf('return {BLOQUEIOS,BLOQUEIOS_CIRCULARES,PASSAGENS}'));
const parseShapes=(source,kind)=>[...source.matchAll(new RegExp(`${kind}\\(([^)]*)\\)`,'g'))]
  .map(m=>m[1].split(',').map(Number));
const rects=parseShapes(rectSource,'F'), ellipses=parseShapes(ellipseSource,'E'), passages=parseShapes(passageSource,'F');
const bloqueado=(x,y)=>rects.some(([rx,ry,rw,rh])=>x>=rx&&x<=rx+rw&&y>=ry&&y<=ry+rh) ||
  ellipses.some(([cx,cy,ex,ey=ex])=>((x-cx)/ex)**2+((y-cy)/ey)**2<=1);
for(const [nome,x,y] of [
  ['telhado da cabana',.17,.27], ['tenda do Merlin',.85,.32],
  ['tenda da oficina',.18,.64], ['santuario',.83,.70],
  ['portal sul',.50,.80], ['toco da cabana',.321,.470],
  ['toco do lago',.605,.386],
]) assert(bloqueado(x,y),`captura ainda atravessavel: ${nome}`);
for(const [nome,x,y] of [
  ['frente do Merlin',.835,.590], ['frente da oficina',.218,.900],
  ['aproximacao norte do portal',.497,.760],
]) assert(!bloqueado(x,y),`ponto de interacao ficou inacessivel: ${nome}`);

// Busca de caminho com a mesma sola 16x10 do jogo. Evita corrigir os telhados
// criando, sem perceber, uma parede que isola uma loja ou um NPC.
const MW=1447, MH=1087, dentroR=(x,y,[rx,ry,rw,rh])=>x>=rx&&x<=rx+rw&&y>=ry&&y<=ry+rh;
const pontoBloqueado=(x,y)=>passages.some(r=>dentroR(x,y,r))?false:bloqueado(x,y);
const livre=(x,y)=>[[-8,-3],[0,-3],[8,-3],[-8,4],[0,5],[8,4]].every(([ox,oy])=>
  !pontoBloqueado((x+ox)/MW,(y+8+oy)/MH));
assert(interactionSource.includes("id:'fazenda', fx:.328, fy:.418, raio:74")&&
  interactionSource.includes("id:'arqueiro',fx:.452, fy:.560, raio:58"),'dados dos pontos de interacao foram alterados');
assert(html.includes('const PONTOS=window.CampInteractionData.create({')&&
  html.includes('fazenda:()=>openFarm()')&&html.includes('lago:()=>openFishing()')&&
  html.includes('arqueiro:()=>window.ArqueiroNPC.abrir()'),'callbacks de interacao nao permaneceram ligados no CampV2');

const targets=[
  ['fazenda',.328,.418,74], ['cozinha',.186,.522,76], ['merlin',.835,.590,82],
  ['oficina',.218,.900,82], ['santuario',.690,.760,86], ['fogueira',.525,.548,70],
  ['portal',.497,.825,90], ['lago',.678,.248,62], ['arqueiro',.452,.560,58],
];
const horta={fx:.3020,fy:.1080,fw:.2500,fh:.2520,cols:5,linhas:3};
assert(layoutSource.includes('fx:.3020, fy:.1080, fw:.2500, fh:.2520, cols:5, linhas:3')&&
  html.includes('const HORTA=window.CampLayoutData.HORTA;'),
  'horta 5x3 acessivel nao esta configurada');
assert(!camp.includes('const HORTA = {fx:.3020'),'configuracao da horta voltou para o index');
assert(!camp.includes('const HORTA_OCULTOS'),'a horta ainda esconde parcelas atras da cabana');
assert(html.includes('const SEMENTES=window.CampFarmingData.SEMENTES;')&&
  html.includes('const NOME_SEM=window.CampFarmingData.NOME_SEM;')&&
  html.includes('const ACAO=window.CampFarmingData.ACAO;'),'CampV2 nao esta consumindo o modulo de farming');
assert(layoutSource.includes('const LUZES_ACAMPAMENTO = [')&&
  html.includes('LUZES_ACAMPAMENTO:window.CampLayoutData.LUZES_ACAMPAMENTO')&&
  html.includes('const ARQ=window.CampLayoutData.ARQ;'),'CampV2 nao esta consumindo os dados de layout extraidos');
for(let r=0;r<horta.linhas;r++)for(let c=0;c<horta.cols;c++){
  targets.push([`canteiro ${r*horta.cols+c+1}`,
    horta.fx+(c+.5)*horta.fw/horta.cols,
    horta.fy+(r+.5)*horta.fh/horta.linhas,26]);
}
const reached=new Set(), queue=[[.497*MW,.760*MH]], seen=new Set(['0,0']), step=12;
for(let head=0;head<queue.length&&head<24000;head++){
  const [x,y]=queue[head];
  for(const [name,fx,fy,radius] of targets)
    if(Math.hypot(x-fx*MW,y-fy*MH)<radius) reached.add(name);
  for(const [dx,dy] of [[step,0],[-step,0],[0,step],[0,-step]]){
    const nx=x+dx, ny=y+dy, key=`${Math.round((nx-.497*MW)/step)},${Math.round((ny-.760*MH)/step)}`;
    if(seen.has(key)||nx<0||ny<0||nx>MW||ny>MH||!livre(nx,ny)) continue;
    seen.add(key); queue.push([nx,ny]);
  }
}
for(const [name] of targets) assert(reached.has(name),`colisao isolou o ponto de interacao: ${name}`);
assert(environmentSource.includes('function desenharAmbiente(c,t)')&&
  html.includes('desenharAmbiente(c,t);\n    desenharHorta(c,t);\n    desenharPlantas(c,t);'),
  'renderer ambiental e horta nao preservaram a ordem das camadas');
assert(!camp.includes('function petAtivo()')&&!camp.includes('function atualizarPet(dt)')&&!camp.includes('function desenharPet(c,t)'),
  'implementacao do pet voltou para o index');
assert(petSource.includes('function petAtivo()')&&petSource.includes('function atualizarPet(dt)')&&
  petSource.includes('function desenharPet(c,t)'),'pet-system nao contem o comportamento extraido');
assert(html.includes('window.CampPetSystem.create({')&&html.includes('getActivePetId:()=>')&&
  html.includes('getDrawPetImage:()=>'),'CampV2 nao injeta as dependencias no pet-system');
assert(html.includes('const petAtras = S.pet && S.pet.y <= S.y;')&&
  html.indexOf('if(petAtras) desenharPet(c,t);')<html.indexOf('desenharHeroi(c,cls,dir,S.dir===\'right\'')&&
  html.indexOf('if(!petAtras) desenharPet(c,t);')>html.indexOf('desenharHeroi(c,cls,dir,S.dir===\'right\''),
  'profundidade entre pet e heroi foi alterada');
assert(!camp.includes('function desenharArqueiro(c,t)'),'implementacao do arqueiro voltou para o index');
assert(archerSource.includes('function desenharArqueiro(c,t)'),'archer-system nao contem o renderer extraido');
assert(html.includes('window.CampArcherSystem.create({')&&html.includes('getWorldSize:()=>({width:MW,height:MH})')&&
  html.includes('getHeroImage:()=>'),'CampV2 nao injeta as dependencias no archer-system');
const heroDrawAt=html.indexOf('desenharHeroi(c,cls,dir,S.dir===\'right\'');
assert(html.indexOf('if(ARQ.fy*MH <= S.y) desenharArqueiro(c,t);')<heroDrawAt&&
  html.indexOf('if(ARQ.fy*MH > S.y) desenharArqueiro(c,t);')>heroDrawAt,
  'profundidade entre arqueiro e heroi foi alterada');
assert(html.includes('arqueiro:()=>window.ArqueiroNPC.abrir()'),'callback do ArqueiroNPC foi alterado');
assert(farmingSource.includes("semente_tomate:'🍅'")&&farmingSource.includes("semente_erva:'🥬'")&&
  farmingSource.includes("semente_cogumelo_lua:'🍄'")&&farmingSource.includes("semente_raiz_sangue:'🫜'")&&
  html.includes('const ICONE_SEM=window.CampFarmingData.ICONE_SEM;'),
  'HUD da horta ainda usa um unico icone de trigo para todos os vegetais');
for(const effect of ['function desenharAgua(c,t)','function desenharFogueira(c,t)','LUZES_ACAMPAMENTO','VAGALUMES'])
  assert(environmentSource.includes(effect),`efeito ambiental ausente: ${effect}`);
const fogo=environmentSource.slice(environmentSource.indexOf('function desenharFogueira(c,t)'),environmentSource.indexOf('function desenharAmbiente(c,t)'));
assert(fogo.includes('Math.floor(t/140)%4')&&!fogo.includes('quadraticCurveTo'),'fogueira ainda usa chama vetorial grande em vez de pixels discretos');

console.log('OK: arenas, capitulos, silhuetas, resgate de colisao e animacoes discretas do acampamento validados.');
