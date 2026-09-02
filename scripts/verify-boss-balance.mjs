import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
let checks=0;
function ok(condition,message){assert.ok(condition,message);checks++;}
function equal(actual,expected,message){assert.equal(actual,expected,message);checks++;}
function close(actual,expected,message){ok(Math.abs(actual-expected)<1e-8,`${message}: ${actual} != ${expected}`);}
function between(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  ok(a>=0&&b>a,`Bloco ausente: ${start}`);
  return source.slice(a,b);
}
const noop=()=>{};
const player={x:80,y:430,radius:16,hp:100,maxHp:100,dead:false,takeDmg:noop};
const ctx={
  console,W:640,H:480,player,player2:null,gameMode:1,wave:1,difficulty:'medium',
  enemies:[],bossMajor:null,petBoss:null,bossRushMode:false,currentArena:'crypt',bossSpawnedThisWave:false,
  performance:{now:()=>1000},
  spawnParts:noop,spawnLevelUpNotice:noop,triggerScreenShake:noop,
  campaignSpawnEnemy:noop,drawCampaignHero:()=>false,openCampaignSharedChoice:noop,
  campaignObjectiveUI:{setHud:noop,setAction:noop,hideChoice:noop},
  CampProgressionSystem:{onBossStarted:noop},
  document:{getElementById:()=>({classList:{remove:noop}})},
  prepareBossRushArena:noop,BossOrc:class {},
  testRarity:'common',
};
ctx.window=ctx;ctx.rollBossRarity=()=>({id:ctx.testRarity});
vm.createContext(ctx);
const run=source=>vm.runInContext(source,ctx);
const html=read('index.html'),menu=read('src/ui/menu-codex-system.js');
run(between(menu,'const DIFF = {','// ── Screen manager'));
run(read('src/campaign/boss-system.js'));
run(read('src/campaign/boss-data.js'));
run(read('src/campaign/campaign-objectives.js'));
run(between(read('src/campaign/campaign-runtime.js'),'const campaignObjectives=','const campaignEvents='));
run(between(html,'const BOSS_RARITY_SCALE = {','const BOSS_RARITY_TABLE = ['));
run(between(read('src/campaign/campaign-system.js'),'function updateCampaignBiomeAndBoss(','// Obstáculos do bioma'));
run(between(read('src/campaign/boss-rush-system.js'),'function spawnNextBossRush(){','let campaignCompletionPending='));
const objectives=run('campaignObjectives'),difficulties=run('DIFF');
const regular=[
  {type:'BossSkeletonKing',wave:5,hp:3000,damage:43,speed:35.5},
  {type:'BossAracne',wave:10,hp:3600,damage:60,speed:38},
  {type:'BossFrostBehemoth',wave:15,hp:4075,damage:98,speed:30},
  {type:'BossSandworm',wave:20,hp:6300,damage:122,speed:50},
  {type:'BossBalrog',wave:25,hp:10000,damage:175,speed:42},
];
for(const spec of regular){
  const boss=run(`new ${spec.type}(${spec.wave})`);
  equal(boss.hp,spec.hp,`${spec.type}: vida base`);
  equal(boss.maxHp,spec.hp,`${spec.type}: vida máxima`);
  equal(boss.damage,spec.damage,`${spec.type}: dano deve ser preservado`);
  equal(boss.speed,spec.speed,`${spec.type}: velocidade deve ser preservada`);
}

// Usa o spawn real, incluindo raridade, dificuldade e progressão do capítulo.
let spawnCases=0;
for(const gameMode of [1,2])for(const [difficulty,diff] of Object.entries(difficulties)){
  for(const [rarity,multiplier] of Object.entries({common:1,rare:1.6,epic:2.2,legendary:3})){
    for(const spec of regular){
      objectives.resetRun();
      Object.assign(ctx,{gameMode,difficulty,testRarity:rarity,wave:spec.wave,bossMajor:null,bossSpawnedThisWave:false});
      ctx.updateCampaignBiomeAndBoss(false);
      const boss=ctx.bossMajor,tier=(spec.wave-5)/5;
      const expected=Math.round(Math.round(spec.hp*multiplier)*diff.bossHp*(1+tier*.08));
      equal(boss.hp,expected,`${spec.type}/${difficulty}/${rarity}/P${gameMode}: HP`);
      equal(boss.maxHp,expected,'Barra de vida deve começar cheia');
      close(boss.damage,spec.damage*diff.bossDmg*(1+tier*.04),'Dano da campanha preservado');
      equal(boss.speed,spec.speed,'Raridade e dificuldade não devem acelerar o chefe');
      if(spec.type==='BossFrostBehemoth'){
        equal(boss.shieldHp,Math.round(2000*diff.bossHp*(1+tier*.08)),'Escudo inicial preservado');
        equal(boss.shieldHp,boss.shieldMax,'Escudo deve começar cheio');
      }
      ctx.updateCampaignBiomeAndBoss(false);
      equal(ctx.bossMajor,boss,'Segundo frame não deve recriar o chefe');
      equal(boss.hp,expected,'Segundo frame não deve reaplicar multiplicadores');
      spawnCases++;
    }
  }
}

// Os dois mini-chefes passam pelo adaptador real (não por cópias dos valores).
for(const gameMode of [1,2])for(const [difficulty,diff] of Object.entries(difficulties)){
  for(const spec of [{wave:4,hp:2400},{wave:9,hp:2400}]){
    objectives.resetRun();Object.assign(ctx,{gameMode,difficulty,wave:spec.wave,bossMajor:null});
    ok(objectives.startWave(spec.wave),'Mini-chefe deve iniciar');
    const boss=spec.wave===4?ctx.bossMajor:objectives.getCombatTargets()[0];
    const expected=Math.round(spec.hp*Math.max(.8,diff.enemyHp*(gameMode===2?1.28:1)));
    equal(boss.hp,expected,'HP do mini-chefe deve respeitar dificuldade e cooperativo');
    equal(boss.maxHp,expected,'Vida máxima do mini-chefe');
    ok(!objectives.canEndWave(spec.wave),'Onda deve aguardar o mini-chefe');
    boss.takeDmg(37);equal(boss.hp,expected-37,'Novo HP deve receber dano normalmente');
    ok(boss.flashTimer>0,'Reação visual ao dano preservada');
    if(spec.wave===4){
      close(boss.damage,20.4,'Dano do Brutamontes da campanha preservado');
      boss._dropLoot=noop;
    }
    boss.takeDmg(boss.hp);
    if(spec.wave===4)boss.update(0,player.x,player.y);
    objectives.update(.01);
    ok(boss.dead&&objectives.canEndWave(spec.wave),'Morte deve liberar a onda');
  }
}

// Ressurreição proporcional ao HP final, e apenas uma vez, em todas as raridades/dificuldades.
for(const difficulty of Object.keys(difficulties))for(const rarity of ['common','rare','epic','legendary']){
  objectives.resetRun();Object.assign(ctx,{difficulty,testRarity:rarity,wave:5,bossMajor:null,bossSpawnedThisWave:false});
  ctx.updateCampaignBiomeAndBoss(false);const boss=ctx.bossMajor;
  let drops=0;boss._dropLoot=()=>{drops++;};
  boss.takeDmg(boss.hp+100);boss.update(0,player.x,player.y);
  equal(boss.hp,Math.round(boss.maxHp*.3),'Rei deve retornar com 30% da nova vida');
  equal(boss.speed,35.5*1.5,'Velocidade da segunda fase preservada');
  ok(boss.resurrected&&!boss.dead&&drops===0,'Primeira queda não deve encerrar o encontro');
  boss.takeDmg(boss.hp);boss.update(0,player.x,player.y);
  ok(boss.dead&&drops===1,'Segunda queda deve encerrar o encontro uma única vez');
}

// As missões anteriores continuam enfraquecendo Aracne com o HP novo.
objectives.resetRun();Object.assign(ctx,{difficulty:'medium',gameMode:1,testRarity:'common',wave:7});
objectives.startWave(7);objectives.getCombatTargets().forEach(target=>target.takeDmg(target.hp));objectives.onWaveEnd(7);
ctx.wave=9;objectives.startWave(9);objectives.getCombatTargets()[0].takeDmg(2400);objectives.onWaveEnd(9);
Object.assign(ctx,{wave:10,bossMajor:null,bossSpawnedThisWave:false});ctx.updateCampaignBiomeAndBoss(false);
close(ctx.bossMajor.hp,Math.round(3600*1.45*1.08)*.95,'Ninhos ainda removem 5% do HP de Aracne');
close(ctx.bossMajor.maxHp,ctx.bossMajor.hp,'Enfraquecimento deve manter a barra cheia');
for(const [key,base] of Object.entries({eggCd:9000,jumpCd:10000,coneCd:7000})){
  close(ctx.bossMajor[key],base*1.06,`Caçadora ainda aumenta a recarga ${key} em 6%`);
}

// Boss Rush usa as mesmas classes, sem aplicar novamente a escala da campanha.
ctx.bossRushMode=true;ctx.bossRushQueue=ctx.MagoCampaignBossData.BOSS_RUSH_LIST;ctx.bossRushCurrent=0;
for(const spec of [...regular,{type:'BossBrute',wave:12,hp:4080,damage:62}]){
  ctx.spawnNextBossRush();
  equal(ctx.bossMajor.constructor.name,spec.type,'Boss Rush deve preservar a ordem');
  equal(ctx.bossMajor.hp,spec.hp,'Boss Rush deve usar o HP base sem dupla escala');
  equal(ctx.bossMajor.maxHp,spec.hp,'Boss Rush deve começar com vida cheia');
  equal(ctx.bossMajor.damage,spec.damage,'Boss Rush deve preservar o dano');
}
console.log(`OK: balanceamento validou ${spawnCases} spawns de campanha, 12 mini-chefes, ressurreição, missões e 6 chefes do Boss Rush (${checks} verificações).`);
