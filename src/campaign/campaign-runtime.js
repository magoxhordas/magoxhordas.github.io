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

function campaignObjectiveTargets(){
  return campaignObjectives.getCombatTargets();
}
function campaignModifyOutgoingDamage(owner,target,amount){
  return campaignObjectives.modifyOutgoingDamage(owner,target,amount);
}
function cleanupCampaignRuntime(reason='cleanup'){
  campaignEvents.cleanup(reason);
  campaignObjectives.cleanup(reason);
  campaignObjectiveUI.reset();
}

window.campaignObjectives=campaignObjectives;
window.campaignEvents=campaignEvents;
window.campaignObjectiveUI=campaignObjectiveUI;
window.cleanupCampaignRuntime=cleanupCampaignRuntime;
