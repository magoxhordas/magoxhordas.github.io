(function(global){
  'use strict';

  const SAVE_KEY='mago_x_hordas_achievements_v1';
  const VERSION=1;
  const catalog=()=>global.AchievementData?.ACHIEVEMENTS||[];
  const byId=()=>new Map(catalog().map(item=>[item.id,item]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const iso=()=>new Date().toISOString();
  function timestamp(value){if(value===null||value===undefined)return null;const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString():null;}
  let state=load();
  let session={unlocked:[],run:null};
  let toastQueue=[];
  let toastBusy=false;
  let toastGeneration=0;
  let persistTimer=null;
  let filters={status:'all',category:'all',search:'',sort:'default'};

  function blank(){return{version:VERSION,achievements:{},counters:{victories:0,classKills:{mage:0,archer:0,viking:0,warrior:0,necromancer:0},bossKills:0,dungeonBossKills:0,fish:0,crops:0}};}
  function normalize(raw){
    const base=blank();if(!raw||typeof raw!=='object')return base;
    base.counters={...base.counters,...(raw.counters||{}),classKills:{...base.counters.classKills,...(raw.counters?.classKills||{})}};
    for(const def of catalog()){
      const saved=raw.achievements?.[def.id]||{};
      base.achievements[def.id]={unlocked:!!saved.unlocked,unlockedAt:timestamp(saved.unlockedAt),currentProgress:Math.max(0,number(saved.currentProgress)),totalProgress:Math.max(1,number(saved.totalProgress)||def.target||1)};
    }
    return base;
  }
  function load(){
    try{return normalize(global.SaveSystem?.readJSON?.(SAVE_KEY,blank(),{validate:value=>value&&typeof value==='object'})||blank());}
    catch(_){return normalize(blank());}
  }
  function writeState(){persistTimer=null;try{global.SaveSystem?.writeJSON?.(SAVE_KEY,state);}catch(error){console.warn('[AchievementSystem] Falha ao salvar',error);}}
  function persist(immediate=false){
    if(immediate||typeof global.setTimeout!=='function'){if(persistTimer&&typeof global.clearTimeout==='function')global.clearTimeout(persistTimer);writeState();return;}
    if(!persistTimer)persistTimer=global.setTimeout(writeState,250);
  }
  function entry(id){const def=byId().get(id);if(!def)return null;if(!state.achievements[id])state.achievements[id]={unlocked:false,unlockedAt:null,currentProgress:0,totalProgress:def.target||1};return state.achievements[id];}
  function setProgress(id,value,options={}){
    const def=byId().get(id),saved=entry(id);if(!def||!saved||saved.unlocked)return false;
    const previousProgress=saved.currentProgress,previousTotal=saved.totalProgress;
    if(options.total!==undefined)saved.totalProgress=Math.max(1,number(options.total));
    saved.currentProgress=Math.max(saved.currentProgress,Math.min(saved.totalProgress,Math.max(0,number(value))));
    if(saved.currentProgress>=saved.totalProgress)return unlock(id,{silent:!!options.silent,postRun:!!options.postRun,source:options.source});
    if(saved.currentProgress===previousProgress&&saved.totalProgress===previousTotal)return false;
    persist();renderSettings();return false;
  }
  function increment(id,amount=1,options={}){const saved=entry(id);return saved?setProgress(id,saved.currentProgress+Math.max(0,number(amount)),options):false;}
  function unlock(id,options={}){
    const def=byId().get(id),saved=entry(id);if(!def||!saved||saved.unlocked)return false;
    saved.unlocked=true;saved.unlockedAt=options.at||iso();saved.currentProgress=saved.totalProgress;persist(true);
    const unlocked={...def,unlockedAt:saved.unlockedAt,currentProgress:saved.currentProgress,totalProgress:saved.totalProgress};session.unlocked.push(unlocked);
    if(!options.silent&&!options.postRun)queueToast(unlocked);renderSettings();return true;
  }
  function counter(name,delta=0){state.counters[name]=Math.max(0,number(state.counters[name])+number(delta));persist();return state.counters[name];}
  function classKill(classId,count){if(!Object.hasOwn(state.counters.classKills,classId))return;state.counters.classKills[classId]+=Math.max(0,number(count));setProgress(`${classId}_1000_kills`,state.counters.classKills[classId]);}

  function onRunStarted(event){
    session={unlocked:[],run:event.meta||null};
    for(const def of catalog())if(def.progressType==='run'){const saved=entry(def.id);if(saved&&!saved.unlocked)saved.currentProgress=0;}
    persist();renderSettings();
  }
  function onWaveCompleted(event){
    if(event.wave===1)unlock('first_steps');
    for(const [id,target] of [['warming_up',5],['no_turning_back',10],['halfway_there',15],['gates_of_inferno',20]])if(event.wave>=target)setProgress(id,event.wave);
    if(event.flawless)unlock('flawless_wave');if(event.flawlessStreak>=3)unlock('three_flawless_waves');
  }
  function onEnemyKilled(event){
    const snapshot=global.RunStats?.getSnapshot?.();const kills=number(snapshot?.team?.kills);classKill(event.classId,event.count||1);
    setProgress('100_kills_run',kills);setProgress('250_kills_run',kills);setProgress('500_kills_run',kills);
    if(event.elite)setProgress('elite_hunter',number(snapshot?.team?.elites));if(event.multiKill>=8)setProgress('multi_kill_attack',event.multiKill);
  }
  function onDamage(){setProgress('damage_100k',number(global.RunStats?.getSnapshot?.()?.team?.damageDealt));}
  function onCritical(){const total=number(global.RunStats?.getSnapshot?.()?.team?.criticals);setProgress('25_crits_run',total);setProgress('100_crits_run',total);}
  const bossAchievement={skeleton_king:'defeat_skeleton_king',skeletonking:'defeat_skeleton_king',rei_cadaver:'defeat_skeleton_king',aracne:'defeat_arachne',arachne:'defeat_arachne',ice_giant:'defeat_ice_giant',frost:'defeat_ice_giant',frost_giant:'defeat_ice_giant',worm:'defeat_worm',sandworm:'defeat_worm',balrog:'defeat_balrog',brute:'defeat_brutamontes',brutamontes:'defeat_brutamontes'};
  function onBossKilled(event){
    const id=String(event.id||event.bossId||'').toLowerCase();if(bossAchievement[id])unlock(bossAchievement[id]);
    const total=counter('bossKills',1);setProgress('50_boss_kills',total);
    if(event.durationMs>0&&event.durationMs<60000)unlock('boss_under_60');if(number(event.damageTaken)===0)unlock('flawless_boss');
    if(event.mode==='bossrush')unlock('boss_rush_first');
    const bosses=global.RunStats?.getSnapshot?.()?.campaignBosses||[];setProgress('all_campaign_bosses_run',new Set(bosses).size);
  }
  function onWeaponObtained(event){
    const weapons=event.weapons||[];const rarity=String(event.weapon?.rarity||'').toLowerCase();if(rarity==='legendary')unlock('first_legendary_weapon');
    setProgress('three_legendary_weapons',new Set(weapons.filter(item=>item.rarity==='legendary').map(item=>item.id)).size);
    setProgress('six_weapons_run',new Set(weapons.map(item=>item.id)).size);
    const rarities=new Set(weapons.map(item=>item.rarity));setProgress('all_weapon_rarities_run',['common','uncommon','rare','epic','legendary'].filter(item=>rarities.has(item)).length);
  }
  function onBlessingObtained(event){
    const normal=(event.blessings||[]).filter(item=>!item.ascension);unlock('first_blessing');setProgress('ten_blessings_run',normal.length);
    const gods=new Map();for(const item of normal)gods.set(item.deity,(gods.get(item.deity)||0)+1);
    setProgress('three_same_deity',Math.max(0,...gods.values()));setProgress('five_deities_run',gods.size);
  }
  function onRunFinished(event){
    const snapshot=event.snapshot||{};if(snapshot.result==='victory'){
      setProgress('veteran',counter('victories',1),{postRun:true});if(snapshot.coop)unlock('coop_victory',{postRun:true});
      if(snapshot.mode==='campaign'){
        unlock('end_of_the_horde',{postRun:true});if(snapshot.difficulty==='hard')unlock('nothing_normal',{postRun:true});
        for(const player of snapshot.players||[])if(['mage','archer','viking','warrior','necromancer'].includes(player.classId))unlock(`${player.classId}_master`,{postRun:true});
      }
    }
    global.RunStats?.attachAchievements?.(session.unlocked);if(session.unlocked.length)clearToasts();persist(true);
  }

  function notify(type,data={}){
    if(type==='petCaptured'){
      const total=Math.max(1,number(data.total));const captured=Math.max(0,number(data.captured));if(captured>0)unlock('first_pet');setProgress('all_pets',captured,{total});
    }else if(type==='fishCaught'){const total=counter('fish',Math.max(1,number(data.quantity)||1));setProgress('25_fish',total);}
    else if(type==='cropHarvested'){const total=counter('crops',Math.max(1,number(data.quantity)||1));setProgress('farm_15',total);}
    else if(type==='cookingResult'&&String(data.quality||'').toUpperCase()==='EXCELENTE')unlock('excellent_meal');
    else if(type==='dungeonEntered')unlock('enter_dungeon');
    else if(type==='dungeonBossKilled'){
      const total=Number.isFinite(Number(data.total))?Math.max(number(state.counters.dungeonBossKills),number(data.total)):counter('dungeonBossKills',1);state.counters.dungeonBossKills=total;persist();unlock('first_dungeon_boss');setProgress('20_dungeon_bosses',total);if(data.hyper)unlock('hyper_boss');
    }else if(type==='bossRushComplete')unlock('boss_rush_complete');
    else if(type==='nearDeathSurvived')unlock('near_death_survivor');
    else if(type==='combatPressure')unlock('combat_pressure');
  }
  function retroactive(){
    let pets={};try{pets=global.SaveSystem?.readJSON?.('mvh_pets',{})?.capturedPets||{};}catch(_){}
    const totalPets=Math.max(1,Object.keys(global.PET_DEFS||pets).length);const captured=Object.keys(global.PET_DEFS||pets).filter(id=>pets[id]).length;if(captured){unlock('first_pet',{silent:true});setProgress('all_pets',captured,{total:totalPets,silent:true});}
    let progress=global.GameSettings?.getProgressSnapshot?.()||{};try{if(!Object.keys(progress).length)progress=global.SaveSystem?.readJSON?.('mago_x_hordas_skin_progress_v1',{})||{};}catch(_){}
    if(progress.bossRushComplete)unlock('boss_rush_complete',{silent:true});
    if(number(progress.dungeonBossKills)>0){state.counters.dungeonBossKills=Math.max(number(state.counters.dungeonBossKills),number(progress.dungeonBossKills));unlock('first_dungeon_boss',{silent:true});setProgress('20_dungeon_bosses',state.counters.dungeonBossKills,{silent:true});}
    if(progress.hyperBossDefeated)unlock('hyper_boss',{silent:true});persist(true);
  }
  function queueToast(item){toastQueue.push(item);pumpToast();}
  function clearToasts(){toastGeneration++;toastQueue=[];toastBusy=false;if(typeof document!=='undefined')document.getElementById('achievement-toast-host')?.replaceChildren();}
  function pumpToast(){
    if(toastBusy||!toastQueue.length||typeof document==='undefined')return;toastBusy=true;const item=toastQueue.shift(),generation=toastGeneration;
    let host=document.getElementById('achievement-toast-host');if(!host){host=document.createElement('div');host.id='achievement-toast-host';host.setAttribute('aria-live','polite');document.body.appendChild(host);}
    const toast=document.createElement('div');toast.className='achievement-toast';toast.innerHTML=`<span class="achievement-toast-icon">${item.icon}</span><span><small>CONQUISTA DESBLOQUEADA</small><strong>${item.name}</strong></span>`;host.appendChild(toast);
    requestAnimationFrame(()=>{if(generation===toastGeneration)toast.classList.add('show');});setTimeout(()=>{if(generation!==toastGeneration)return;toast.classList.remove('show');setTimeout(()=>{if(generation!==toastGeneration)return;toast.remove();toastBusy=false;pumpToast();},350);},4000);
  }
  function viewEntries(){return catalog().map(def=>({...def,...entry(def.id)}));}
  function summary(){const entries=viewEntries(),unlocked=entries.filter(item=>item.unlocked).length;return{unlocked,total:entries.length,percent:entries.length?Math.round(unlocked/entries.length*100):0};}
  function formatDate(value){if(!value)return'';try{return new Intl.DateTimeFormat('pt-BR').format(new Date(value));}catch(_){return'';}}
  function visibleEntries(){
    const search=filters.search.trim().toLocaleLowerCase('pt-BR');let items=viewEntries().filter(item=>{
      if(filters.status==='unlocked'&&!item.unlocked)return false;if(filters.status==='locked'&&item.unlocked)return false;if(filters.status==='secret'&&!item.hidden)return false;if(filters.category!=='all'&&item.category!==filters.category)return false;
      const secret=item.hidden&&!item.unlocked;const searchable=secret?'conquista secreta continue explorando':`${item.name} ${item.description}`;
      if(search&&!searchable.toLocaleLowerCase('pt-BR').includes(search))return false;return true;
    });
    const progress=item=>item.totalProgress?item.currentProgress/item.totalProgress:0;
    items.sort((a,b)=>{
      if(filters.sort==='az')return a.name.localeCompare(b.name,'pt-BR');if(filters.sort==='recent')return String(b.unlockedAt||'').localeCompare(String(a.unlockedAt||''));if(filters.sort==='progress')return progress(b)-progress(a)||a.order-b.order;
      const rank=item=>item.unlocked?0:item.hidden?3:progress(item)>0?1:2;return rank(a)-rank(b)||(b.unlockedAt||'').localeCompare(a.unlockedAt||'')||progress(b)-progress(a)||a.order-b.order;
    });return items;
  }
  function renderSettings(){
    if(typeof document==='undefined')return;const root=document.getElementById('settings-achievements-root');if(!root)return;const info=summary();
    const categoryOptions=Object.entries(global.AchievementData?.CATEGORIES||{}).map(([id,name])=>`<option value="${id}" ${filters.category===id?'selected':''}>${name}</option>`).join('');
    root.innerHTML=`<header class="ach-head"><div><h2>CONQUISTAS</h2><p>Desafios de jornada, domínio e descoberta.</p></div><strong>${info.unlocked} / ${info.total}</strong><span>${info.percent}% CONCLUÍDO</span><div class="ach-completion"><i style="width:${info.percent}%"></i></div></header>
      <div class="ach-tools"><div class="ach-statuses">${[['all','Todas'],['unlocked','Desbloqueadas'],['locked','Bloqueadas'],['secret','Secretas']].map(([id,label])=>`<button class="${filters.status===id?'active':''}" data-ach-status="${id}">${label}</button>`).join('')}</div><label class="ach-search"><span>⌕</span><input id="ach-search-input" type="search" placeholder="Buscar conquista..." value="${filters.search.replace(/"/g,'&quot;')}"></label><select id="ach-category"><option value="all">Todas as categorias</option>${categoryOptions}</select><select id="ach-sort"><option value="default">Padrão</option><option value="recent" ${filters.sort==='recent'?'selected':''}>Recentes</option><option value="progress" ${filters.sort==='progress'?'selected':''}>Progresso</option><option value="az" ${filters.sort==='az'?'selected':''}>A–Z</option></select></div>
      <div class="ach-list">${visibleEntries().map(item=>{const secret=item.hidden&&!item.unlocked,name=secret?'Conquista Secreta':item.name,desc=secret?'Continue explorando para descobrir.':item.description,pct=Math.round(item.currentProgress/item.totalProgress*100);return`<article class="ach-row ${item.unlocked?'unlocked':'locked'} ${secret?'secret':''}"><span class="ach-icon" aria-hidden="true">${secret?'▣':item.icon}</span><div class="ach-copy"><h3>${name}</h3><p>${desc}</p>${!item.unlocked&&item.totalProgress>1&&!secret?`<div class="ach-progress"><i style="width:${pct}%"></i></div><small>${Math.floor(item.currentProgress)} / ${Math.floor(item.totalProgress)}</small>`:''}</div><div class="ach-state">${item.unlocked?`<b>✓ DESBLOQUEADA</b><time>${formatDate(item.unlockedAt)}</time>`:'<b>▣ BLOQUEADA</b>'}</div></article>`;}).join('')||'<p class="ach-empty">Nenhuma conquista corresponde aos filtros.</p>'}</div>`;
    root.querySelectorAll('[data-ach-status]').forEach(button=>button.onclick=()=>{filters.status=button.dataset.achStatus;renderSettings();});
    root.querySelector('#ach-search-input').oninput=event=>{filters.search=event.target.value;renderSettings();document.getElementById('ach-search-input')?.focus();};
    root.querySelector('#ach-category').onchange=event=>{filters.category=event.target.value;renderSettings();};root.querySelector('#ach-sort').onchange=event=>{filters.sort=event.target.value;renderSettings();};
  }
  function debugUnlock(id){return unlock(id);}
  function debugSetProgress(id,value){return setProgress(id,value);}
  function debugResetSession(){session={unlocked:[],run:null};clearToasts();return true;}
  function init(){
    state=normalize(state);retroactive();
    global.RunStats?.on?.('runStarted',onRunStarted);global.RunStats?.on?.('waveCompleted',onWaveCompleted);global.RunStats?.on?.('enemyKilled',onEnemyKilled);global.RunStats?.on?.('damage',onDamage);global.RunStats?.on?.('critical',onCritical);global.RunStats?.on?.('bossKilled',onBossKilled);global.RunStats?.on?.('weaponObtained',onWeaponObtained);global.RunStats?.on?.('blessingObtained',onBlessingObtained);global.RunStats?.on?.('nearDeathSurvived',event=>notify('nearDeathSurvived',event));global.RunStats?.on?.('combatPressure',event=>notify('combatPressure',event));global.RunStats?.on?.('runFinished',onRunFinished);renderSettings();
  }
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();}else init();

  global.AchievementSystem=Object.freeze({SAVE_KEY,VERSION,notify,unlock,setProgress,increment,getEntries:()=>clone(viewEntries()),getSummary:()=>clone(summary()),getSessionUnlocks:()=>clone(session.unlocked),renderSettings,debugUnlock,debugSetProgress,debugResetSession,_resetForTests(raw){state=normalize(raw||blank());session={unlocked:[],run:null};toastQueue=[];return clone(state);}});
})(typeof window!=='undefined'?window:globalThis);
