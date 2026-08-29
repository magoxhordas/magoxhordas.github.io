import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const html=read('index.html');
const files={
  bossData:'src/campaign/boss-data.js',
  bossRush:'src/campaign/boss-rush-system.js',
  bosses:'src/campaign/boss-system.js',
  chapterData:'src/campaign/chapter-data.js',
  campaign:'src/campaign/campaign-system.js'
};
const source=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,read(file)]));
let checks=0;

function ok(condition,message){ assert.ok(condition,message); checks++; }
function has(haystack,needle,message){ ok(haystack.includes(needle),message||`Contrato ausente: ${needle}`); }

for(const file of Object.values(files)){
  const tag=`<script src="${file}"></script>`;
  has(html,tag,`index.html não carrega ${file}`);
  new vm.Script(read(file),{filename:file});
}
ok(html.indexOf(`src="${files.bossData}"`)<html.indexOf(`src="${files.bossRush}"`),'dados do Boss Rush devem carregar antes da execução');
ok(html.indexOf(`src="${files.bosses}"`)<html.indexOf(`src="${files.campaign}"`),'classes dos chefes devem carregar antes da progressão');
ok(html.indexOf(`src="${files.chapterData}"`)<html.indexOf(`src="${files.campaign}"`),'dados de capítulos devem carregar antes da progressão');

const sandbox={console}; sandbox.window=sandbox; vm.createContext(sandbox);
vm.runInContext(source.bossData,sandbox,{filename:files.bossData});
vm.runInContext(source.chapterData,sandbox,{filename:files.chapterData});
const bossData=sandbox.MagoCampaignBossData;
const chapterData=sandbox.MagoCampaignChapterData;
ok(bossData.BOSS_RUSH_LIST.length===6,'catálogo do Boss Rush deve manter seis chefes regulares');
ok(bossData.PET_BOSS_RUSH_LIST.length===5,'catálogo do Boss Rush deve manter cinco criaturas');
for(const [id,wave,arena] of [
  ['skeleton_king',5,'crypt'],['aracne',10,'forest'],['frost',15,'snow'],
  ['sandworm',20,'desert'],['balrog',25,'volcano']
]){
  const boss=bossData.BOSS_RUSH_LIST.find(item=>item.id===id);
  ok(boss?.wave===wave&&boss?.arena===arena,`${id} perdeu onda ou arena canônica`);
}
ok(chapterData.CAMPAIGN_CHAPTER_DURATION===6000,'capítulos devem durar seis segundos');
ok(Object.keys(chapterData.CAMPAIGN_CHAPTERS).join(',')==='1,6,11,16,21','marcos dos cinco capítulos foram alterados');
for(const [wave,arena] of [[1,'crypt'],[6,'forest'],[11,'snow'],[16,'desert'],[21,'volcano']]){
  ok(chapterData.CAMPAIGN_CHAPTERS[wave]?.arena===arena,`capítulo da onda ${wave} perdeu a arena ${arena}`);
}

for(const bossClass of ['BossSkeletonKing','BossAracne','BossFrostBehemoth','BossSandworm','BossBalrog','BossBrute']){
  has(source.bosses,`class ${bossClass}`,`classe ausente: ${bossClass}`);
  ok(!html.includes(`class ${bossClass}`),`classe ${bossClass} ainda está duplicada no index.html`);
}
for(const contract of [
  "if(nextWave>=21) return 'volcano'","if(nextWave>=16) return 'desert'",
  "if(nextWave>=11) return 'snow'","if(nextWave>=6) return 'forest'","return 'crypt'",
  'function resetCampaignMapObjects()','function advWave()','function endWave()',
  'function maybeStartCampaignChapter(currentWave)','function updateCampaignBiomeAndBoss(wildPetFight)',
  'const bossWaveHp=1+bossTier*.08','const bossWaveDmg=1+bossTier*.04',
  'function removeCampaignRandomObjects()','function spawnWaveObstacles()'
]) has(source.campaign,contract);
has(html,'updateCampaignBiomeAndBoss(wildPetFight);','loop principal não delega transição e criação de chefe');
ok(!html.includes('const CAMPAIGN_CHAPTERS={'),'dados de capítulo ainda estão duplicados no index.html');
ok(!html.includes('const BOSS_RUSH_LIST=['),'dados do Boss Rush ainda estão duplicados no index.html');

for(const contract of [
  'function prepareBossRushArena(b)','resetCampaignMapObjects();','buildBG(arena);',
  'function spawnNextBossRush()','function endBossRush(victory)','function completeCampaign()',
  "SaveSystem.writeText('mvh_campaign_complete','1')","SaveSystem.writeText('mvh_max_wave',25)",
  'let campaignVictoryRevealTimer=null;','function cancelPendingVictoryReveal()',
  "scheduleVictoryScreen('bossrush',2600)","scheduleVictoryScreen('campaign',1900)"
]) has(source.bossRush,contract);
const endBossRushBlock=source.bossRush.slice(source.bossRush.indexOf('function endBossRush(victory){'),source.bossRush.indexOf('function showVictoryScreen'));
ok(endBossRushBlock.indexOf("if(victory) state='victory';")<endBossRushBlock.indexOf('bossRushMode=false;'),'Boss Rush deve entrar em estado terminal antes de liberar o modo campanha');
ok(!source.bossRush.includes('setTimeout(()=>showVictoryScreen('),'tela de vitória não pode ficar em timer órfão');
has(html,"if(typeof cancelPendingVictoryReveal==='function') cancelPendingVictoryReveal();",'reset do Boss Rush deve cancelar vitória pendente');

const victoryRuntime=source.bossRush.slice(
  source.bossRush.indexOf('let campaignCompletionPending=false;'),
  source.bossRush.indexOf('// ═══════════════════════════════════════════════════════',source.bossRush.indexOf('function completeCampaign()'))
);
const revealTimers=[];
const victorySandbox={
  console,state:'playing',bossRushMode:true,bossRushQueue:[],W:640,H:480,
  document:{body:{classList:{remove(){}}},getElementById:id=>id==='br-hud'?{className:'visible'}:null},
  GameSettings:{recordBossRushVictory(){}},cleanupCampaignRuntime(){},spawnLevelUpNotice(){},spawnParts(){},
  setTimeout(fn,delay){const timer={fn,delay,cleared:false};revealTimers.push(timer);return timer;},
  clearTimeout(timer){timer.cleared=true;},setInterval(){return null;},clearInterval(){},endGame(){}
};
victorySandbox.window=victorySandbox;
vm.createContext(victorySandbox);
vm.runInContext(victoryRuntime,victorySandbox,{filename:'boss-rush-victory-runtime.js'});
victorySandbox.endBossRush(true);
ok(victorySandbox.state==='victory'&&victorySandbox.bossRushMode===false,'vitória do Boss Rush não ficou terminal de forma síncrona');
ok(revealTimers.length===1&&revealTimers[0].delay===2600,'revelação do Boss Rush perdeu atraso controlado');
let orphanVictoryCalls=0;
victorySandbox.showVictoryScreen=()=>{orphanVictoryCalls++;};
victorySandbox.state='menu';
revealTimers[0].fn();
ok(orphanVictoryCalls===0,'timer atrasado reabriu vitória depois da troca de tela');
has(html,"const initialArena=bossRushMode?(bossRushQueue[0]?.arena||'crypt'):'crypt';",'entrada do Boss Rush perdeu a arena do primeiro chefe');
has(html,'if(!bossRushMode) maybeStartCampaignChapter(wave);','campanha não inicia o capítulo antes do primeiro frame');

console.log(`OK: campanha modular preserva 5 capítulos, 5 biomas, 6 chefes regulares, 5 criaturas e progressão (${checks} verificações).`);
