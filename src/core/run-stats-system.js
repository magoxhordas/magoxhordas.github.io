(function(global){
  'use strict';

  const RECORDS_KEY='mago_x_hordas_run_records_v1';
  const HISTORY_KEY='mago_x_hordas_run_history_v1';
  const HISTORY_LIMIT=20;
  const listeners=new Map();
  let run=null;
  let finishedSnapshot=null;
  let sequence=0;

  const now=()=>Date.now();
  const num=value=>Number.isFinite(Number(value))?Number(value):0;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const save=()=>global.SaveSystem;
  function emit(type,payload={}){
    const event=Object.freeze({type,at:now(),runId:run?.id||null,...payload});
    for(const fn of listeners.get(type)||[]) try{fn(event);}catch(error){console.error('[RunStats listener]',error);}
    for(const fn of listeners.get('*')||[]) try{fn(event);}catch(error){console.error('[RunStats listener]',error);}
    return event;
  }
  function on(type,handler){
    if(typeof handler!=='function')return()=>{};
    if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(handler);
    return()=>listeners.get(type)?.delete(handler);
  }
  function playerTemplate(meta,index){
    return {
      index,classId:String(meta?.classId||meta?.class||'unknown'),skinId:String(meta?.skinId||'classic'),level:Math.max(1,num(meta?.level)||1),
      kills:0,elites:0,minibosses:0,bosses:0,damageDealt:0,damageTaken:0,healing:0,
      criticals:0,dashes:0,xpEarned:0,coinsEarned:0,coinsSpent:0,longestKillStreak:0,currentKillStreak:0,
      weapons:[],blessings:[],damageBySource:{},killsBySource:{},nearDeathMs:0,nearDeathActive:false,
      combatPressureMs:0,lastDamageAt:null,lastValidAttackAt:null,nearDeathAwarded:false,combatPressureAwarded:false,
      lowestHpPercent:100,lastObservedHp:null
    };
  }
  function empty(meta={}){
    const players=(Array.isArray(meta.players)&&meta.players.length?meta.players:[{classId:meta.classId||'unknown'}]).map(playerTemplate);
    return {
      schemaVersion:1,id:`run-${now().toString(36)}-${(++sequence).toString(36)}`,startedAt:new Date().toISOString(),
      finishedAt:null,result:null,mode:String(meta.mode||'campaign'),difficulty:String(meta.difficulty||'medium'),
      threatLevel:Math.max(0,num(meta.threatLevel)),coop:players.length>1,elapsedMs:0,combatMs:0,
      wave:Math.max(1,num(meta.wave)||1),maxWave:Math.max(1,num(meta.wave)||1),chapter:Math.max(1,num(meta.chapter)||1),
      level:Math.max(1,num(meta.level)||1),players,team:{kills:0,elites:0,minibosses:0,bosses:0,damageDealt:0,
        damageTaken:0,healing:0,criticals:0,dashes:0,xpEarned:0,coinsEarned:0,coinsSpent:0,longestKillStreak:0},
      weapons:[],blessings:[],pet:meta.pet||null,bossFights:[],damageBySource:{},killsBySource:{},
      flawlessWaves:0,longestFlawlessStreak:0,currentFlawlessStreak:0,waveDamageStart:0,
      maxMultiKill:0,attackEvents:{},criticalEvents:{},campaignBosses:[],achievementsUnlocked:[],progress:{pets:0,codex:0},
      records:[],defeatedBy:null,lastCombatAt:null,_boss:null,_lastTickAt:now()
    };
  }
  function getPlayer(index=0){
    if(!run)return null;const safe=Math.max(0,Math.floor(num(index)));return run.players[safe]||run.players[0]||null;
  }
  function addMap(map,key,amount){key=String(key||'Outros');map[key]=num(map[key])+num(amount);}
  function publicSnapshot(source=run){
    if(!source)return null;
    const out=clone(source);
    delete out.attackEvents;delete out.criticalEvents;delete out._boss;delete out._lastTickAt;delete out._attackSequence;delete out.waveDamageStart;
    for(const player of out.players){delete player.currentKillStreak;delete player.nearDeathActive;delete player.nearDeathAwarded;delete player.combatPressureAwarded;delete player.lastDamageAt;delete player.lastValidAttackAt;delete player.lastObservedHp;}
    return out;
  }
  function start(meta={}){run=empty(meta);finishedSnapshot=null;emit('runStarted',{meta:publicSnapshot()});return publicSnapshot();}
  function ensure(meta){if(!run||run.result)start(meta);return run;}
  function sourceMeta(meta={}){
    const type=String(meta.sourceType||meta.type||'other').toLowerCase();
    const id=String(meta.sourceId||meta.id||meta.weaponId||meta.blessingId||type||'other');
    const label=String(meta.sourceName||meta.name||({weapon:'Armas',blessing:'Bênçãos',summon:'Invocações',pet:'Pet',direct:'Ataque básico'}[type]||'Outros'));
    return {type,id,label};
  }
  function createAttackEvent(playerIndex=0){ensure();run._attackSequence=num(run._attackSequence)+1;return`${run.id}-p${Math.max(0,Math.floor(num(playerIndex)))}-a${run._attackSequence}-${Math.round(run.combatMs)}`;}
  function addHealing(player,effective){if(!(effective>0))return 0;player.healing+=effective;run.team.healing+=effective;emit('heal',{playerIndex:player.index,effective});return effective;}
  function observeHp(player,hp,maxHp){
    const current=clamp(num(hp),0,Math.max(0,num(maxHp)||num(hp)));if(player.lastObservedHp===null){player.lastObservedHp=current;return 0;}
    const gained=Math.max(0,current-player.lastObservedHp);player.lastObservedHp=current;return addHealing(player,gained);
  }
  function recordDamage(meta={}){
    ensure();const before=Math.max(0,num(meta.hpBefore));
    const after=meta.hpAfter===undefined?Math.max(0,before-Math.max(0,num(meta.amount))):Math.max(0,num(meta.hpAfter));
    const effective=Math.max(0,Math.min(before,before-after));if(!effective)return 0;
    const player=getPlayer(meta.playerIndex);const source=sourceMeta(meta);
    player.damageDealt+=effective;run.team.damageDealt+=effective;addMap(player.damageBySource,source.label,effective);addMap(run.damageBySource,source.label,effective);
    if(source.type==='weapon'){
      let weapon=run.weapons.find(item=>item.id===source.id&&item.playerIndex===player.index);
      if(!weapon){weapon={id:source.id,name:source.label,rarity:String(meta.rarity||'unknown'),playerIndex:player.index,damage:0,kills:0};run.weapons.push(weapon);}
      weapon.damage+=effective;
    }
    player.lastValidAttackAt=run.combatMs;run.lastCombatAt=run.combatMs;
    emit('damage',{playerIndex:player.index,effective,source,targetType:meta.targetType||'enemy',attackEventId:meta.attackEventId||null});
    return effective;
  }
  function recordDamageTaken(meta={}){
    ensure();const before=Math.max(0,num(meta.hpBefore));
    const after=meta.hpAfter===undefined?Math.max(0,before-Math.max(0,num(meta.amount))):Math.max(0,num(meta.hpAfter));
    const effective=Math.max(0,Math.min(before,before-after));if(!effective)return 0;
    const player=getPlayer(meta.playerIndex);observeHp(player,before,meta.maxHp||Math.max(before,num(player.lastObservedHp)));player.lastObservedHp=after;player.damageTaken+=effective;run.team.damageTaken+=effective;
    player.currentKillStreak=0;player.lastDamageAt=run.combatMs;player.combatPressureMs=0;
    emit('damageTaken',{playerIndex:player.index,effective});return effective;
  }
  function recordHeal(meta={}){
    ensure();const before=Math.max(0,num(meta.hpBefore));
    const maxHp=Math.max(before,num(meta.maxHp)||Infinity);const after=meta.hpAfter===undefined?Math.min(maxHp,before+Math.max(0,num(meta.amount))):Math.max(0,num(meta.hpAfter));
    const effective=Math.max(0,Math.min(maxHp,after)-before);if(!effective)return 0;
    const player=getPlayer(meta.playerIndex);observeHp(player,before,maxHp);player.lastObservedHp=Math.min(maxHp,after);return addHealing(player,effective);
  }
  function recordCritical(meta={}){
    ensure();const attackEventId=meta.attackEventId?String(meta.attackEventId):null;
    if(attackEventId&&run.criticalEvents[attackEventId])return false;
    if(attackEventId)run.criticalEvents[attackEventId]=true;
    const player=getPlayer(meta.playerIndex);player.criticals++;run.team.criticals++;emit('critical',{playerIndex:player.index,attackEventId});return true;
  }
  function recordKill(meta={}){
    ensure();const player=getPlayer(meta.playerIndex);const source=sourceMeta(meta);const count=Math.max(1,Math.floor(num(meta.count)||1));
    player.kills+=count;run.team.kills+=count;player.currentKillStreak+=count;player.longestKillStreak=Math.max(player.longestKillStreak,player.currentKillStreak);run.team.longestKillStreak=Math.max(run.team.longestKillStreak,player.longestKillStreak);
    if(meta.elite){player.elites+=count;run.team.elites+=count;}if(meta.miniboss){player.minibosses+=count;run.team.minibosses+=count;}
    addMap(player.killsBySource,source.label,count);addMap(run.killsBySource,source.label,count);
    if(source.type==='weapon'){const weapon=run.weapons.find(item=>item.id===source.id&&item.playerIndex===player.index);if(weapon)weapon.kills+=count;}
    if(meta.attackEventId){const key=String(meta.attackEventId);run.attackEvents[key]=num(run.attackEvents[key])+count;run.maxMultiKill=Math.max(run.maxMultiKill,run.attackEvents[key]);}
    emit('enemyKilled',{playerIndex:player.index,count,elite:!!meta.elite,miniboss:!!meta.miniboss,source,attackEventId:meta.attackEventId||null,multiKill:meta.attackEventId?run.attackEvents[String(meta.attackEventId)]:0,classId:player.classId});
  }
  function recordBossStart(meta={}){
    ensure();if(run._boss&&!run._boss.endedAtMs)return;
    run._boss={id:String(meta.id||meta.bossId||'boss'),name:String(meta.name||meta.bossName||'Chefão'),startedAtMs:run.combatMs,playerDamageStart:run.team.damageTaken,mode:run.mode,cutsceneExcluded:true};
    emit('bossStarted',{bossId:run._boss.id,name:run._boss.name});
  }
  function recordBossEnd(meta={}){
    if(run&&!run._boss){const recent=run.bossFights[run.bossFights.length-1],id=String(meta.id||meta.bossId||'boss');if(recent&&recent.id===id&&recent.endedAtMs===run.combatMs)return clone(recent);}
    ensure();const active=run._boss||{id:String(meta.id||'boss'),name:String(meta.name||'Chefão'),startedAtMs:run.combatMs,playerDamageStart:run.team.damageTaken};
    const fight={id:String(meta.id||active.id),name:String(meta.name||active.name),durationMs:Math.max(0,run.combatMs-active.startedAtMs),victory:meta.victory!==false,damageTaken:Math.max(0,run.team.damageTaken-active.playerDamageStart),endedAtMs:run.combatMs};
    run.bossFights.push(fight);run._boss=null;
    if(fight.victory){run.team.bosses++;const player=getPlayer(meta.playerIndex);player.bosses++;const id=fight.id;if(run.mode==='campaign'&&!run.campaignBosses.includes(id)&&['skeleton_king','aracne','ice_giant','worm','balrog'].includes(id))run.campaignBosses.push(id);}
    emit(fight.victory?'bossKilled':'bossFightEnded',{...fight,playerIndex:getPlayer(meta.playerIndex).index,mode:run.mode});return clone(fight);
  }
  function recordWaveCompleted(meta={}){
    ensure();const value=Math.max(1,Math.floor(num(meta.wave)||run.wave));run.wave=value;run.maxWave=Math.max(run.maxWave,value);
    const flawless=run.team.damageTaken===run.waveDamageStart;if(flawless){run.flawlessWaves++;run.currentFlawlessStreak++;}else run.currentFlawlessStreak=0;
    run.longestFlawlessStreak=Math.max(run.longestFlawlessStreak,run.currentFlawlessStreak);run.waveDamageStart=run.team.damageTaken;
    emit('waveCompleted',{wave:value,flawless,flawlessStreak:run.currentFlawlessStreak});
  }
  function recordWeapon(meta={}){
    ensure();const player=getPlayer(meta.playerIndex);const id=String(meta.id||meta.weaponId||'unknown');
    let weapon=run.weapons.find(item=>item.id===id&&item.playerIndex===player.index);
    if(!weapon){weapon={id,name:String(meta.name||id),rarity:String(meta.rarity||'common'),playerIndex:player.index,damage:0,kills:0};run.weapons.push(weapon);player.weapons.push({id:weapon.id,name:weapon.name,rarity:weapon.rarity});}
    else if(meta.rarity)weapon.rarity=String(meta.rarity);
    emit('weaponObtained',{playerIndex:player.index,weapon:clone(weapon),weapons:run.weapons.map(item=>clone(item))});return clone(weapon);
  }
  function deityOf(meta={}){return String(meta.deity||meta.godId||meta.god||'desconhecido').replace(/^[^\p{L}\p{N}]+/u,'').trim()||'desconhecido';}
  function recordBlessing(meta={}){
    ensure();const player=getPlayer(meta.playerIndex);const blessing={id:String(meta.id||'unknown'),name:String(meta.name||meta.id||'Bênção'),description:String(meta.description||meta.desc||''),deity:deityOf(meta),rarity:String(meta.rarity||'common'),ascension:!!meta.ascension,playerIndex:player.index};
    if(!run.blessings.some(item=>item.id===blessing.id&&item.playerIndex===player.index)){run.blessings.push(blessing);player.blessings.push(clone(blessing));emit('blessingObtained',{playerIndex:player.index,blessing:clone(blessing),blessings:run.blessings.map(item=>clone(item))});}
  }
  function recordPet(meta={}){ensure();run.pet=meta?{id:String(meta.id||meta.petId||''),name:String(meta.name||meta.id||'Pet')}:null;emit('petEquipped',{pet:clone(run.pet)});}
  function recordDash(meta={}){ensure();const player=getPlayer(meta.playerIndex);player.dashes++;run.team.dashes++;emit('dash',{playerIndex:player.index});}
  function recordCoins(meta={}){ensure();const player=getPlayer(meta.playerIndex);const amount=Math.max(0,num(meta.amount));const spent=!!meta.spent;if(spent){player.coinsSpent+=amount;run.team.coinsSpent+=amount;}else{player.coinsEarned+=amount;run.team.coinsEarned+=amount;}emit(spent?'coinsSpent':'coinsEarned',{playerIndex:player.index,amount});}
  function recordXP(meta={}){ensure();const player=getPlayer(meta.playerIndex);const amount=Math.max(0,num(meta.amount));player.xpEarned+=amount;run.team.xpEarned+=amount;player.level=Math.max(player.level,Math.floor(num(meta.level)||player.level));run.level=Math.max(run.level,player.level);emit('xpEarned',{playerIndex:player.index,amount,level:player.level});}
  function tick(deltaMs,context={}){
    if(!run||run.result)return;const delta=clamp(num(deltaMs),0,1000);if(context.paused||context.transition||context.dialog)return;
    run.elapsedMs+=delta;if(context.inCombat!==false){run.combatMs+=delta;
      for(const player of run.players){
        const hp=num(context.players?.[player.index]?.hp),maxHp=num(context.players?.[player.index]?.maxHp);
        if(maxHp>0&&hp>0){
          observeHp(player,hp,maxHp);
          player.lowestHpPercent=Math.min(player.lowestHpPercent,clamp(hp/maxHp*100,0,100));
          if(!player.nearDeathActive&&hp/maxHp<=.10){player.nearDeathActive=true;player.nearDeathMs=0;}
          if(player.nearDeathActive){player.nearDeathMs+=delta;if(player.nearDeathMs>=30000&&!player.nearDeathAwarded){player.nearDeathAwarded=true;emit('nearDeathSurvived',{playerIndex:player.index,seconds:player.nearDeathMs/1000});}}
        }else if(player.nearDeathActive&&hp<=0){player.nearDeathActive=false;player.nearDeathMs=0;}
        if(player.lastValidAttackAt!==null&&run.combatMs-player.lastValidAttackAt<=3000){player.combatPressureMs+=delta;if(player.combatPressureMs>=60000&&!player.combatPressureAwarded){player.combatPressureAwarded=true;emit('combatPressure',{playerIndex:player.index,seconds:player.combatPressureMs/1000});}}
        else if(player.lastValidAttackAt===null||run.combatMs-player.lastValidAttackAt>3000)player.combatPressureMs=0;
      }
    }
  }
  function recordsFor(snapshot){
    const system=save();const loaded=system?.readJSON?.(RECORDS_KEY,{})||{};const previous=loaded&&typeof loaded==='object'&&!Array.isArray(loaded)?loaded:{};const records={...previous};const added=[];
    const candidates={mostKills:snapshot.team.kills,mostDamage:Math.round(snapshot.team.damageDealt),mostElites:snapshot.team.elites,longestKillStreak:snapshot.team.longestKillStreak,mostBlessings:snapshot.blessings.filter(item=>!item.ascension).length,highestThreatVictory:snapshot.result==='victory'?snapshot.threatLevel:0,maxWeaponDamage:Math.round(Math.max(0,...snapshot.weapons.map(item=>item.damage||0)))};
    if(snapshot.mode==='campaign'&&snapshot.result==='victory')candidates.fastestCampaignMs=snapshot.elapsedMs;
    for(const [key,value] of Object.entries(candidates)){
      const better=key.startsWith('fastest')?(value>0&&(!num(records[key])||value<num(records[key]))):value>num(records[key]);
      if(better){const previous=num(records[key])||null;records[key]=value;added.push({key,value,previous});}
    }
    for(const fight of snapshot.bossFights.filter(item=>item.victory)){
      records.bossTimes=records.bossTimes||{};const old=num(records.bossTimes[fight.id]);if(!old||fight.durationMs<old){records.bossTimes[fight.id]=fight.durationMs;added.push({key:`boss:${fight.id}`,value:fight.durationMs,previous:old||null,label:fight.name});}
    }
    system?.writeJSON?.(RECORDS_KEY,records);return added;
  }
  function finish(result,meta={}){
    if(finishedSnapshot)return clone(finishedSnapshot);ensure(meta);const allowed=['victory','defeat','abandoned'],normalized=allowed.includes(result)?result:'abandoned';
    const activeBossName=run._boss?.name||null;if(normalized==='defeat'&&run._boss)recordBossEnd({id:run._boss.id,name:run._boss.name,victory:false,playerIndex:meta.playerIndex});
    run.result=normalized;run.finishedAt=new Date().toISOString();
    run.maxWave=Math.max(run.maxWave,Math.floor(num(meta.wave)||run.wave));run.wave=run.maxWave;run.chapter=Math.max(run.chapter,Math.floor(num(meta.chapter)||run.chapter));run.level=Math.max(run.level,Math.floor(num(meta.level)||run.level));run.defeatedBy=activeBossName||meta.defeatedBy||null;
    let snapshot=publicSnapshot();snapshot.records=recordsFor(snapshot);
    const system=save();const loadedHistory=system?.readJSON?.(HISTORY_KEY,[])||[];const history=Array.isArray(loadedHistory)?loadedHistory:[];history.unshift({id:snapshot.id,date:snapshot.finishedAt,result:snapshot.result,mode:snapshot.mode,difficulty:snapshot.difficulty,classIds:snapshot.players.map(item=>item.classId),durationMs:snapshot.elapsedMs,wave:snapshot.maxWave,kills:snapshot.team.kills,damage:Math.round(snapshot.team.damageDealt)});system?.writeJSON?.(HISTORY_KEY,history.slice(0,HISTORY_LIMIT));
    run.records=snapshot.records;finishedSnapshot=publicSnapshot(run);emit('runFinished',{result:run.result,snapshot:clone(finishedSnapshot)});return clone(finishedSnapshot);
  }
  function attachAchievements(items){if(!run)return;run.achievementsUnlocked=Array.isArray(items)?clone(items):[];if(finishedSnapshot)finishedSnapshot.achievementsUnlocked=clone(run.achievementsUnlocked);}
  function setProgressDelta(meta={}){if(!run)return;run.progress={pets:Math.max(0,num(meta.pets)),codex:Math.max(0,num(meta.codex))};}
  function debugSnapshot(){return publicSnapshot()||finishedSnapshot&&clone(finishedSnapshot);}
  function reset(){run=null;finishedSnapshot=null;}

  global.RunStats=Object.freeze({
    RECORDS_KEY,HISTORY_KEY,start,tick,finish,reset,on,recordDamage,recordDamageTaken,recordHeal,recordCritical,
    recordKill,recordBossStart,recordBossEnd,recordWaveCompleted,recordWeapon,recordBlessing,recordPet,recordDash,
    recordCoins,recordXP,createAttackEvent,attachAchievements,setProgressDelta,getSnapshot:()=>publicSnapshot(),debugSnapshot,
    get active(){return !!run&&!run.result;}
  });
})(typeof window!=='undefined'?window:globalThis);
