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
assert(html.includes('function desenharAmbiente(c,t)')&&html.includes('desenharAmbiente(c,t);\n    desenharPlantas(c,t);'),'animacoes do acampamento nao estao ligadas ao desenho');
for(const effect of ['function desenharAgua(c,t)','function desenharFogueira(c,t)','LUZES_ACAMPAMENTO','VAGALUMES'])
  assert(html.includes(effect),`efeito ambiental ausente: ${effect}`);

console.log('OK: arenas dos chefes, troca de modo, abertura de capitulo, limites e animacoes do acampamento validados.');
