import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

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

const begin=html.slice(html.indexOf('function beginGame(){'),html.indexOf('\nfunction endGame(){'));
const chapterAt=begin.indexOf('if(!bossRushMode) maybeStartCampaignChapter(wave);');
const frameAt=begin.indexOf('raf=requestAnimationFrame(loop);');
assert(chapterAt>=0&&frameAt>chapterAt,'capitulo nao abre antes do primeiro frame do combate');
assert(html.includes('#campaign-chapter-screen.active {\n  display:block;\n  opacity:1;\n}'),'a abertura ainda deixa o canvas do combate aparecer por transparencia');
assert(html.includes('0%{opacity:0;transform:scale(1.05)'),'o fade nao esta restrito a arte do capitulo');

assert(html.includes('const BLOQUEIOS_CIRCULARES = ['),'objetos redondos do acampamento sem colisao propria');
assert(html.includes('const sola=[[-8,-3],[0,-3],[8,-3],[-8,4],[0,5],[8,4]];'),'colisao do heroi nao usa a area dos pes');
for(const obstacle of [
  'F(.040, .200, .252, .322)',
  'F(.765, .248, .230, .326)',
  'F(.058, .595, .255, .286)',
  'F(.705, .620, .285, .285)',
  'F(.375, .775, .275, .202)',
]) assert(html.includes(obstacle),`silhueta completa sem colisao: ${obstacle}`);
assert(html.includes('function reposicionarSeBloqueado()')&&html.includes('dimensionar();\n    reposicionarSeBloqueado();\n    retomar();'),'jogador salvo dentro de objeto nao e resgatado');

// Reconstroi as formas diretamente do codigo e testa os pontos vistos nas
// capturas: tetos, tendas, tocos, santuario e portal precisam estar bloqueados.
const camp=html.slice(html.indexOf('window.CampV2 = (function(){'),html.indexOf('// [/CAMP-V2]'));
const rectSource=camp.slice(camp.indexOf('const BLOQUEIOS = ['),camp.indexOf('const BLOQUEIOS_CIRCULARES'));
const ellipseSource=camp.slice(camp.indexOf('const BLOQUEIOS_CIRCULARES = ['),camp.indexOf('const PASSAGENS'));
const passageSource=camp.slice(camp.indexOf('const PASSAGENS = ['),camp.indexOf('const HORTA ='));
const parseShapes=(source,kind)=>[...source.matchAll(new RegExp(`${kind}\\(([^)]*)\\)`,'g'))]
  .map(m=>m[1].split(',').map(Number));
const rects=parseShapes(rectSource,'F'), ellipses=parseShapes(ellipseSource,'E'), passages=parseShapes(passageSource,'F');
const bloqueado=(x,y)=>rects.some(([rx,ry,rw,rh])=>x>=rx&&x<=rx+rw&&y>=ry&&y<=ry+rh) ||
  ellipses.some(([cx,cy,ex,ey=ex])=>((x-cx)/ex)**2+((y-cy)/ey)**2<=1);
for(const [nome,x,y] of [
  ['telhado da cabana',.17,.27], ['tenda do Merlin',.85,.32],
  ['tenda da oficina',.18,.64], ['santuario',.83,.70],
  ['portal sul',.50,.80], ['toco da cabana',.321,.470],
  ['toco da horta',.472,.190], ['toco do lago',.605,.386],
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
const targets=[
  ['fazenda',.328,.418,74], ['cozinha',.186,.522,76], ['merlin',.835,.590,82],
  ['oficina',.218,.900,82], ['santuario',.690,.760,86], ['fogueira',.525,.548,70],
  ['portal',.497,.825,90], ['lago',.678,.248,62], ['arqueiro',.452,.560,58],
];
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
assert(html.includes('function desenharAmbiente(c,t)')&&html.includes('desenharAmbiente(c,t);\n    desenharPlantas(c,t);'),'animacoes do acampamento nao estao ligadas ao desenho');
for(const effect of ['function desenharAgua(c,t)','function desenharFogueira(c,t)','LUZES_ACAMPAMENTO','VAGALUMES'])
  assert(html.includes(effect),`efeito ambiental ausente: ${effect}`);
const fogo=html.slice(html.indexOf('function desenharFogueira(c,t)'),html.indexOf('function desenharAmbiente(c,t)'));
assert(fogo.includes('Math.floor(t/140)%4')&&!fogo.includes('quadraticCurveTo'),'fogueira ainda usa chama vetorial grande em vez de pixels discretos');

console.log('OK: arenas, capitulos, silhuetas, resgate de colisao e animacoes discretas do acampamento validados.');
