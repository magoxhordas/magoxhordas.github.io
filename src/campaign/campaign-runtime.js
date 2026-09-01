// Adaptador entre os módulos testáveis de campanha e o runtime global do jogo.
const campaignObjectiveUI=CampaignObjectiveUI.create({document});

function campaignSpawnEnemy(type,x,y,source='campaign'){
  const enemy=new Enemy(x,y,wave,type);
  enemy.campaignSpawnSource=source;
  enemies.push(enemy);
  return enemy;
}

function campaignSharedPlayers(){
  return [player,...(gameMode===2&&player2?[player2]:[])].filter(pl=>pl&&!pl.dead);
}

function openCampaignSharedChoice(config){
  const resumeState='playing';
  state='campaign-choice';lastTs=null;campaignClock.reset();
  const wrapped={...config,options:(config.options||[]).map(option=>({...option,onChoose:id=>{
    state=resumeState;lastTs=null;campaignClock.reset();
    option.onChoose?.(id);
  }}))};
  campaignObjectiveUI.showChoice(wrapped);
}

function applyCampaignEventBlessing(card){
  if(!card||activeCardBlessings.some(owned=>owned.id===card.id))return false;
  campaignSharedPlayers().forEach(pl=>applyDeityBoon(pl,card));
  activeCardBlessings.push(card);
  updateBlessingsHUD();
  spawnLevelUpNotice(W/2,H/2-50,`${card.icon||'✦'} ${card.name}!`,0);
  spawnParts(W/2,H/2,'#79e89a',22,95);
  return true;
}

const campaignObjectives=CampaignObjectives.create({
  getPlayers:()=>[player,player2].filter(Boolean),
  getEnemies:()=>enemies,
  getWave:()=>wave,
  getArena:()=>currentArena,
  isBossRush:()=>Boolean(bossRushMode),
  isDungeon:()=>Boolean(typeof DNG!=='undefined'&&(DNG.running||DNG.paused)),
  isCampaignActive:()=>!bossRushMode,
  getObjectiveHpScale:()=>{
    const diff=DIFF[difficulty]||DIFF.medium;
    return diff.enemyHp*(gameMode===2?1.28:1);
  },
  spawnEnemy:campaignSpawnEnemy,
  spawnParts:(...args)=>spawnParts(...args),
  spawnNotice:(...args)=>spawnLevelUpNotice(...args),
  damagePlayer:(pl,amount)=>pl?.takeDmg?.(amount),
  addCoins:amount=>{totalCoins+=Math.max(0,Math.round(amount||0));},
  addXp:amount=>campaignSharedPlayers().forEach(pl=>pl.gainXP(Math.max(0,amount||0))),
  addCampResource:(id,amount)=>{globalInventory[id]=(globalInventory[id]||0)+Math.max(0,Math.round(amount||0));},
  setWaveTimer:value=>{waveTimer=Math.max(0,Number(value)||0);},
  requestWaveEnd:()=>setTimeout(()=>{if(state==='playing'&&!bossRushMode)endWave();},0),
  showChoice:openCampaignSharedChoice,
  hideChoice:()=>campaignObjectiveUI.hideChoice(),
  setHud:view=>campaignObjectiveUI.setHud(view),
  // Lista de herois jogaveis e o desenho de um deles, para o sobrevivente da
  // onda 8 e o aliado da tempestade usarem a arte de verdade.
  heroisDisponiveis:()=>{
    try{ return Object.values(CLASS_DEFS).map(def=>({id:def.id,nome:def.name})); }
    catch(_){ return []; }
  },
  desenharHeroi:(ctx2,classId,x,pesY,dir,estado,progresso)=>{
    try{
      const im=(typeof heroImg==='function')?heroImg(classId,dir||'down',progresso||0,estado||'idle'):null;
      if(!im)return false;
      const conf=(typeof HERO_IMG_SETS!=='undefined')?HERO_IMG_SETS[classId]:null;
      const quadro=(conf&&conf.frame)||48, pe=(conf&&conf.feet)||quadro-6, k=1.15;
      const lado=Math.round(quadro*k);
      ctx2.save(); ctx2.imageSmoothingEnabled=false;
      ctx2.drawImage(im,Math.round(x-lado/2),Math.round(pesY-pe*k),lado,lado);
      ctx2.restore();
      return true;
    }catch(_){ return false; }
  },
  // O Brutamontes da onda 4 e' o chefe de verdade com a vida reduzida.
  // Estes dois ficam aqui, e nao no modulo de objetivos, porque bossMajor e
  // todo o maquinario de chefe (colisao, dano, desenho, musica) vivem no
  // index.html.
  spawnMiniboss:(vida,dano)=>{
    if(typeof BossBrute!=='function')return null;
    bossMajor=new BossBrute(wave);
    bossMajor.hp=bossMajor.maxHp=Math.max(1,Math.round(vida));
    bossMajor.damage=dano;
    bossWarning=1800;
    if(typeof Audio!=='undefined'){Audio.playBossMusic('brute');Audio.playBossSpawn();}
    return bossMajor;
  },
  getMiniboss:()=>bossMajor,
  setAction:view=>campaignObjectiveUI.setAction(view),
  now:()=>performance.now(),
});

const campaignEvents=CampaignEvents.create({
  getPlayers:()=>[player,player2].filter(Boolean),
  getEnemies:()=>enemies,
  getWave:()=>wave,
  getArena:()=>currentArena,
  getMerlinLevel:()=>Number(metaUpgrades.exp_eventos||0),
  isBossRush:()=>Boolean(bossRushMode),
  isDungeon:()=>Boolean(typeof DNG!=='undefined'&&(DNG.running||DNG.paused)),
  hasMandatoryObjective:completedWave=>Boolean(CampaignObjectives.OBJECTIVE_WAVES[completedWave]?.required),
  setEncounterMode:active=>{state=active?'playing':'endwave';lastTs=null;campaignClock.reset();},
  spawnEnemy:campaignSpawnEnemy,
  spawnParts:(...args)=>spawnParts(...args),
  spawnNotice:(...args)=>spawnLevelUpNotice(...args),
  setHud:view=>campaignObjectiveUI.setHud(view),
  setAction:view=>campaignObjectiveUI.setAction(view),
  showChoice:openCampaignSharedChoice,
  hideChoice:()=>campaignObjectiveUI.hideChoice(),
  getCoins:()=>totalCoins,
  spendCoins:amount=>{const cost=Math.max(0,Math.round(amount||0));if(totalCoins<cost)return false;totalCoins-=cost;return true;},
  addCoins:amount=>{totalCoins+=Math.max(0,Math.round(amount||0));},
  addXp:amount=>campaignSharedPlayers().forEach(pl=>pl.gainXP(Math.max(0,amount||0))),
  addCampResource:(id,amount)=>{globalInventory[id]=(globalInventory[id]||0)+Math.max(0,Math.round(amount||0));},
  getBlessingOffers:count=>typeof rollCardOffer==='function'?rollCardOffer(count):[],
  applyBlessing:applyCampaignEventBlessing,
  addTimedModifier:modifier=>campaignObjectives.addTimedModifier(modifier),
  now:()=>performance.now(),
});

function campaignHandleActionDown(playerIndex=0){
  if(campaignObjectives.handleActionDown(playerIndex))return true;
  return campaignEvents.handleActionDown(playerIndex);
}
function campaignHandleActionUp(playerIndex=0){
  const objectiveHandled=campaignObjectives.handleActionUp(playerIndex);
  const eventHandled=campaignEvents.handleActionUp(playerIndex);
  return objectiveHandled||eventHandled;
}
campaignObjectiveUI.setActionHandlers(campaignHandleActionDown,campaignHandleActionUp);

let campaignSuppressObjectiveTargets=false;
function campaignObjectiveTargets(){
  return campaignSuppressObjectiveTargets?[]:campaignObjectives.getCombatTargets();
}
function campaignModifyOutgoingDamage(owner,target,amount){
  return campaignObjectives.modifyOutgoingDamage(owner,target,amount);
}
function cleanupCampaignRuntime(reason='cleanup'){
  campaignEvents.cleanup(reason);
  campaignObjectives.cleanup(reason);
  campaignObjectiveUI.reset();
}

// O ataque base corpo a corpo do Guerreiro/Viking ainda usa a lista `enemies`
// diretamente no legado de index.html. Durante o update dessas duas classes,
// inclui temporariamente as estruturas de objetivo nessa mesma lista. Ao mesmo
// tempo, suprime a segunda inclusao feita por allTargets(), evitando hit duplo
// em armas que ja usam a lista canonica. Tudo e restaurado no mesmo frame.
function installCampaignMeleeObjectiveBridge(){
  if(typeof Player==='undefined'||!Player?.prototype?.update)return false;
  if(Player.prototype.update.__campaignMeleeObjectiveBridge)return true;
  const original=Player.prototype.update;
  const wrapped=function(dt,enemyList){
    const melee=this?.classId==='warrior'||this?.classId==='viking';
    if(!melee)return original.call(this,dt,enemyList);
    const objectives=campaignObjectives.getCombatTargets().filter(target=>target&&!target.dead);
    if(!objectives.length)return original.call(this,dt,enemyList);
    const lists=[];
    if(typeof enemies!=='undefined'&&Array.isArray(enemies))lists.push(enemies);
    if(Array.isArray(enemyList)&&!lists.includes(enemyList))lists.push(enemyList);
    const added=[];
    for(const list of lists){
      const own=[];
      for(const target of objectives)if(!list.includes(target)){list.push(target);own.push(target);}
      added.push([list,own]);
    }
    campaignSuppressObjectiveTargets=true;
    try{return original.call(this,dt,enemyList);}
    finally{
      campaignSuppressObjectiveTargets=false;
      for(const [list,own] of added)for(let i=own.length-1;i>=0;i--){
        const index=list.lastIndexOf(own[i]);if(index>=0)list.splice(index,1);
      }
    }
  };
  wrapped.__campaignMeleeObjectiveBridge=true;
  wrapped.__originalCampaignPlayerUpdate=original;
  Player.prototype.update=wrapped;
  return true;
}
if(!installCampaignMeleeObjectiveBridge()&&typeof window?.addEventListener==='function')
  window.addEventListener('load',installCampaignMeleeObjectiveBridge,{once:true});

window.campaignObjectives=campaignObjectives;
window.campaignEvents=campaignEvents;
window.campaignObjectiveUI=campaignObjectiveUI;
window.cleanupCampaignRuntime=cleanupCampaignRuntime;
window.installCampaignMeleeObjectiveBridge=installCampaignMeleeObjectiveBridge;
