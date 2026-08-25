// Runtime da classe Necromante. O modulo e deliberadamente independente do
// save: todo recurso desta classe pertence somente a partida atual.
(function(global){
  'use strict';

  const DATA=global.NecromancerData;
  if(!DATA)throw new Error('NecromancerData deve ser carregado antes do NecromancerSystem.');
  const CFG=DATA.CONFIG;
  const states=new Map();
  let deps={};
  const sfxTimers=Object.create(null);

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const ownerKey=owner=>Number(owner?.idx||0);
  const isNecromancer=owner=>!!owner&&owner.classId==='necromancer';
  const effect=owner=>owner?.shopEffects||{};
  const now=()=>typeof performance!=='undefined'?performance.now():Date.now();
  function playSfx(name,cooldown=0){
    const current=now();
    if(current-(sfxTimers[name]??-Infinity)<cooldown)return;
    sfxTimers[name]=current;deps.playSfx?.(name);
  }

  function createState(owner){
    return {
      owner,ownerId:ownerKey(owner),souls:0,pityMisses:0,
      soulOrbs:[],corpses:[],summons:[],totems:[],
      bellConsumed:0,lastBreathAt:-Infinity,healWindowAt:now(),healWindow:0,
      bossThresholds:new WeakMap(),weaponCounters:Object.create(null),
      scytheRingAt:-Infinity,heartHealAt:-Infinity,bellActivations:0,
    };
  }
  function stateFor(owner,create=true){
    if(!isNecromancer(owner))return null;
    const key=ownerKey(owner);
    let state=states.get(key);
    if(!state&&create){state=createState(owner);states.set(key,state);}
    if(state)state.owner=owner;
    return state;
  }
  function soulCap(owner){return clamp(CFG.soulBaseCap+(effect(owner).necroSoulCap||0),CFG.soulBaseCap,CFG.soulHardCap);}
  function corpseCap(owner){return effect(owner).necroCorpseMaster?CFG.corpseBuffCap:CFG.corpseBaseCap;}
  function permanentCap(owner){return clamp(CFG.permanentBaseCap+(effect(owner).necroPermanentCap||0),CFG.permanentBaseCap,CFG.permanentHardCap);}
  function corpseTtl(owner){return CFG.corpseTtl+(effect(owner).necroCorpseMaster?2000:0);}
  function globalSummonCount(){let total=0;for(const state of states.values())total+=state.summons.length;return total;}
  function isBoss(target){return !!target&&(target.isBoss||target.type?.startsWith?.('boss')||target.constructor?.name?.includes?.('Boss'))}
  function isMiniboss(enemy){return !!enemy&&!isBoss(enemy)&&(enemy.isMiniboss||enemy.miniBoss||enemy.type?.includes?.('miniboss'));}
  function isElite(enemy){return !!enemy&&(enemy.isElite||enemy.elite||enemy.type?.includes?.('elite')||(!isBoss(enemy)&&Number(enemy.maxHp||0)>=260));}
  function globalDamageBonus(owner){return Math.max(0,(Number(owner?.dmg||DATA.CLASS_DEF.baseDmg)/DATA.CLASS_DEF.baseDmg)-1);}
  function globalAttackSpeedBonus(owner){return Math.max(0,Number(deps.getGlobalAttackSpeedBonus?.(owner)??((effect(owner).attackSpeed||0)+(owner?.cardEffects?.attackSpeed||0))));}
  function globalCritChance(owner){return clamp(Number(deps.getGlobalCritChance?.(owner)??((effect(owner).critChance||0)+(owner?.cardEffects?.critChance||0))),0,.90);}

  function configure(nextDeps){deps={...deps,...nextDeps};return api;}
  function initializePlayer(owner){
    if(!isNecromancer(owner))return null;
    owner.necromancerRun=true;
    owner.necromancerResource='souls';
    return stateFor(owner,true);
  }
  function resetRun(players=[]){
    states.clear();
    for(const owner of players)if(isNecromancer(owner))initializePlayer(owner);
  }
  function clearWorld(options={}){
    const preservePermanent=!!options.preservePermanent;
    for(const state of states.values()){
      state.soulOrbs.length=0;state.corpses.length=0;state.totems.length=0;
      if(preservePermanent){
        state.summons=state.summons.filter(s=>s.permanent&&!s.dead);
        state.summons.forEach((s,index)=>{s.x=state.owner.x+(index-0.5)*26;s.y=state.owner.y+30;s.target=null;});
      }else state.summons.length=0;
    }
  }

  function spawnSoulOrb(owner,x,y,count=1){
    const state=stateFor(owner);if(!state)return;
    if(state.souls>=soulCap(owner))return;
    for(let index=0;index<count&&state.soulOrbs.length<CFG.soulHardCap;index++){
      state.soulOrbs.push({
        x:x+(Math.random()-.5)*18,y:y+(Math.random()-.5)*18,ttl:CFG.soulTtl,
        phase:Math.random()*Math.PI*2,dead:false,
      });
    }
  }
  function addCorpse(owner,enemy){
    const state=stateFor(owner);if(!state||isBoss(enemy)||enemy?.isReanimated||enemy?.noNecroRewards)return;
    while(state.corpses.length>=corpseCap(owner))state.corpses.shift();
    state.corpses.push({x:enemy.x,y:enemy.y,ttl:corpseTtl(owner),phase:Math.random()*Math.PI*2,type:enemy.type||'enemy',elite:isElite(enemy)});
  }
  function eligibleSource(enemy,owner,source){
    if(!isNecromancer(owner)||!enemy||enemy.noNecroRewards||enemy.isSummoned||enemy.isReanimated)return false;
    return source==='summon'||source==='direct';
  }
  function onEnemyDeath(enemy,owner,source='direct',weaponType=''){
    if(!eligibleSource(enemy,owner,source)||isBoss(enemy))return;
    const state=stateFor(owner);const miniboss=isMiniboss(enemy),elite=miniboss||isElite(enemy);
    const mark=enemy.necroProfaneMarkData;
    if(mark?.owner===owner&&mark.spreadAllowed){
      const nearby=(deps.getTargets?.()||[]).filter(target=>target&&!target.dead&&target!==enemy&&Math.hypot(target.x-enemy.x,target.y-enemy.y)<125);
      if(nearby[0])applyMark(nearby[0],mark.tier,{owner,spreadAllowed:false});
    }
    const rot=enemy.necroRot;
    if(rot?.owner===owner&&rot.explodeOnDeath){
      for(const target of deps.getTargets?.()||[]){
        if(!target||target.dead||target===enemy||Math.hypot(target.x-enemy.x,target.y-enemy.y)>54)continue;
        damageTarget(target,rot.baseDamage*.35,owner,{weapon:rot.weapon,weaponType:'necromancer_cursed_skull'});
        if(rot.tier>=3&&!target.dead)applyRot(target,owner,rot.weapon,rot.baseDamage*.55,rot.tier,{secondary:true});
      }
      deps.spawnParts?.(enemy.x,enemy.y,'#8d55cf',7,48);
    }
    if(elite){
      spawnSoulOrb(owner,enemy.x,enemy.y,miniboss?3:2);state.pityMisses=0;
    }else{
      let chance=source==='summon'?CFG.soulSummonChance:(effect(owner).necroDirectSoulChance||CFG.soulDirectChance);
      if(source==='direct'&&weaponType==='necromancer_soul_scythe')chance+=.15;
      const success=Math.random()<chance||state.pityMisses>=CFG.soulPity-1;
      if(success){spawnSoulOrb(owner,enemy.x,enemy.y,1);state.pityMisses=0;}
      else state.pityMisses++;
    }
    const corpseChance=elite?1:(source==='summon'?CFG.corpseSummonChance:CFG.corpseDirectChance);
    if(Math.random()<corpseChance)addCorpse(owner,enemy);
  }
  function onBossDamaged(owner,boss,beforeHp,afterHp){
    if(!isNecromancer(owner)||!boss||beforeHp<=afterHp)return;
    const state=stateFor(owner);let mask=state.bossThresholds.get(boss)||0;
    const max=Math.max(1,boss.maxHp||beforeHp);let created=0;
    for(let index=1;index<=5;index++){
      const threshold=1-index*.2,bit=1<<(index-1);
      if(!(mask&bit)&&beforeHp/max>threshold&&afterHp/max<=threshold){mask|=bit;created++;}
    }
    state.bossThresholds.set(boss,mask);
    if(created)spawnSoulOrb(owner,boss.x,boss.y,created);
  }

  const SUMMON_TYPES={
    skeleton_warrior:{name:'Guerreiro Esqueleto',hp:.31,damage:.48,range:48,cd:860,speed:105,color:'#d8d1b5'},
    skeleton_archer:{name:'Arqueiro Esqueleto',hp:.21,damage:.40,range:235,cd:1120,speed:98,color:'#9ed6b0'},
    spirit:{name:'Espirito',hp:.15,damage:.44,range:190,cd:720,speed:145,color:'#74d9ff'},
    abomination:{name:'Abominacao',hp:.55,damage:.65,range:60,cd:1280,speed:76,color:'#8fc47b'},
    death_knight:{name:'Cavaleiro da Morte',hp:.48,damage:.82,range:72,cd:760,speed:116,color:'#b18cff'},
    reanimated:{name:'Reanimado',hp:.28,damage:.42,range:48,cd:930,speed:94,color:'#89a783'},
  };
  function spawnSummon(owner,type,options={}){
    const state=stateFor(owner);const spec=SUMMON_TYPES[type];if(!state||!spec)return null;
    const permanent=!!options.permanent;
    const sameKind=state.summons.filter(s=>!s.dead&&(permanent?s.permanent:!s.permanent)).length;
    const family=options.family||type;
    const familyCount=state.summons.filter(s=>!s.dead&&s.family===family).length;
    if(globalSummonCount()>=CFG.globalCoopCap)return null;
    if(permanent&&sameKind>=permanentCap(owner))return null;
    if(!permanent&&sameKind>=CFG.temporaryCap)return null;
    if(Number.isFinite(options.familyMax)&&familyCount>=options.familyMax)return null;
    if(type==='death_knight'&&state.summons.some(s=>!s.dead&&s.type==='death_knight'))return null;
    const hpBonus=1+(effect(owner).necroSummonHp||0);
    const playerHpBonus=Math.max(0,(owner.maxHp||100)-DATA.CLASS_DEF.baseHp)*.25;
    const maxHp=Math.max(10,Math.round((DATA.CLASS_DEF.baseHp*spec.hp+playerHpBonus)*hpBonus*(options.hpMult||1)));
    const summon={
      id:`nec_${ownerKey(owner)}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      owner,ownerId:ownerKey(owner),type,name:spec.name,x:owner.x+(Math.random()-.5)*36,y:owner.y+24,
      hp:maxHp,maxHp,damage:Math.max(3,DATA.CLASS_DEF.baseDmg*spec.damage*(options.damageMult||1)),range:spec.range,
      attackCd:spec.cd/(options.attackSpeedMult||1),attackTimer:180+Math.random()*240,speed:spec.speed,color:spec.color,
      permanent,duration:permanent?Infinity:(options.duration||10000),dead:false,target:null,
      isSummoned:true,isReanimated:!!options.isReanimated,noNecroRewards:true,hitTimer:0,phase:Math.random()*Math.PI*2,
      reviveOnce:!!options.reviveOnce,revived:false,weaponType:options.weaponType||'',family,
      pierce:options.pierce||0,traceEvery:options.traceEvery||0,attackCount:0,
      deathExplosion:options.deathExplosion||0,raiseChance:options.raiseChance||0,noRaise:!!options.noRaise,
      rarityMult:options.damageMult||1,visualTime:Math.random()*620,attackAnim:0,hurtAnim:0,
      spawnAnim:420,moving:false,facing:Math.random()<.5?'left':'right',
    };
    state.summons.push(summon);playSfx('summon',120);return summon;
  }
  function spendSouls(owner,amount){const state=stateFor(owner);if(!state||state.souls<amount)return false;state.souls-=amount;return true;}
  function collectHeal(owner,amount){if(!owner||owner.dead||amount<=0)return;owner.hp=Math.min(owner.maxHp,owner.hp+amount);}
  function summonHeal(state,amount){
    const owner=state.owner,current=now();if(current-state.healWindowAt>=1000){state.healWindowAt=current;state.healWindow=0;}
    const cap=(owner.maxHp||100)*.03;const allowed=Math.max(0,Math.min(amount,cap-state.healWindow));
    if(allowed>0){state.healWindow+=allowed;collectHeal(owner,allowed);}
  }
  function damageTarget(target,amount,owner,meta={}){
    if(!target||target.dead||amount<=0)return 0;
    let damage=amount;
    if(meta.summoned){
      damage*=1+(effect(owner).necroSummonDamage||0);
      damage*=1+Math.min(.05,target.necroProfaneMark||0);
      if(isBoss(target))damage*=CFG.summonBossDamage;
      if(meta.canCrit&&Math.random()<.05+globalCritChance(owner)*.50){
        damage*=2;meta.didCrit=true;deps.spawnParts?.(target.x,target.y,'#d8ffb7',4,32);
      }
    }
    const before=Number(target.hp||0);
    target._lastDamageOwner=owner;target._lastDamageSource=meta.summoned?'summon':'direct';
    target._lastNecroWeapon=meta.weaponType||'';
    if(typeof target.takeDmg==='function')target.takeDmg(damage);
    const dealt=Math.max(0,Math.min(before,damage));
    if(meta.summoned){
      const state=stateFor(owner);
      const inheritedLifeSteal=Math.max(0,Number(owner?.lifeSteal||0))*.20;
      if(state&&inheritedLifeSteal>0)summonHeal(state,dealt*inheritedLifeSteal);
    }
    if(isBoss(target))onBossDamaged(owner,target,before,Number(target.hp||0));
    if(deps.notifyHit&&Math.random()<(meta.summoned?CFG.summonProcCoefficient:1)){
      const procWeapon=meta.weapon||(owner._necromancerSummonWeapon||(owner._necromancerSummonWeapon={type:'necromancer_summon',rarity:'common',damageDone:0}));
      deps.notifyHit(owner,target,dealt,procWeapon);
    }
    return dealt;
  }
  function nearestTarget(summon,targets){
    let best=null,bestDistance=Infinity;
    for(const target of targets){if(!target||target.dead)continue;const distance=Math.hypot(target.x-summon.x,target.y-summon.y);if(distance<bestDistance){best=target;bestDistance=distance;}}
    return bestDistance<=310?best:null;
  }
  function explodeLastBreath(state,summon){
    if(!summon.permanent||!effect(state.owner).necroLastBreath||now()-state.lastBreathAt<650)return;
    state.lastBreathAt=now();
    const targets=deps.getTargets?deps.getTargets():[];
    for(const target of targets)if(target&&!target.dead&&Math.hypot(target.x-summon.x,target.y-summon.y)<68)damageTarget(target,summon.damage*.50,state.owner,{summoned:true,weaponType:summon.weaponType});
    deps.spawnParts?.(summon.x,summon.y,'#8d55cf',14,70);
  }
  function updateSummon(state,summon,dt,targets){
    const owner=state.owner;if(!owner||owner.dead){summon.dead=true;return;}
    const elapsed=dt*1000;
    summon.duration-=elapsed;summon.attackTimer-=elapsed;summon.hitTimer-=elapsed;
    summon.visualTime=(summon.visualTime||0)+elapsed;
    summon.attackAnim=Math.max(0,(summon.attackAnim||0)-elapsed);
    summon.hurtAnim=Math.max(0,(summon.hurtAnim||0)-elapsed);
    summon.spawnAnim=Math.max(0,(summon.spawnAnim||0)-elapsed);
    summon.moving=false;
    if(summon.duration<=0||summon.hp<=0){
      if(summon.reviveOnce&&!summon.revived){summon.revived=true;summon.hp=summon.maxHp*.55;summon.duration=summon.permanent?Infinity:5000;summon.spawnAnim=420;return;}
      summon.dead=true;
      if(summon.deathExplosion>0){
        for(const target of targets)if(target&&!target.dead&&Math.hypot(target.x-summon.x,target.y-summon.y)<58)damageTarget(target,summon.damage*summon.deathExplosion,owner,{summoned:true,weaponType:summon.weaponType});
        deps.spawnParts?.(summon.x,summon.y,'#ded3b0',7,50);
      }
      explodeLastBreath(state,summon);return;
    }
    const ownerDistance=Math.hypot(owner.x-summon.x,owner.y-summon.y);
    if(ownerDistance>440){summon.x=owner.x+(Math.random()-.5)*30;summon.y=owner.y+24;summon.target=null;summon.spawnAnim=300;return;}
    if(!summon.target||summon.target.dead||Math.hypot(summon.target.x-summon.x,summon.target.y-summon.y)>340)summon.target=nearestTarget(summon,targets);
    const target=summon.target;
    if(target){
      const dx=target.x-summon.x,dy=target.y-summon.y,distance=Math.max(1,Math.hypot(dx,dy));
      summon.facing=dx<0?'left':'right';
      if(distance>summon.range*.8){summon.x+=dx/distance*summon.speed*dt;summon.y+=dy/distance*summon.speed*dt;summon.moving=true;}
      if(distance<=summon.range&&summon.attackTimer<=0){
        const inheritedDamage=globalDamageBonus(owner)*.35;
        const attackSpeed=1+(effect(owner).necroSummonAttackSpeed||0)+globalAttackSpeedBonus(owner)*.30+(state.totems.some(t=>Math.hypot(t.x-summon.x,t.y-summon.y)<120&&t.buffTimer>0)?.10:0);
        summon.attackTimer=summon.attackCd/attackSpeed;
        summon.attackAnim=summon.type==='spirit'||summon.type==='skeleton_archer'?320:240;
        const wasAlive=!target.dead;
        damageTarget(target,summon.damage*(1+inheritedDamage),owner,{summoned:true,canCrit:true,weaponType:summon.weaponType});
        summon.attackCount++;
        if(summon.pierce>0){
          const secondary=targets.filter(other=>other&&!other.dead&&other!==target&&Math.hypot(other.x-target.x,other.y-target.y)<92)[0];
          if(secondary)damageTarget(secondary,summon.damage*.48*(1+inheritedDamage),owner,{summoned:true,canCrit:true,weaponType:summon.weaponType});
        }
        if(summon.traceEvery&&summon.attackCount%summon.traceEvery===0){
          for(const other of targets)if(other&&!other.dead&&Math.hypot(other.x-target.x,other.y-target.y)<42)damageTarget(other,summon.damage*.20,owner,{summoned:true,weaponType:summon.weaponType});
          deps.spawnParts?.(target.x,target.y,'#70cfff',4,34);
        }
        if(wasAlive&&target.dead&&summon.raiseChance&&!summon.noRaise&&Math.random()<summon.raiseChance){
          const soldier=spawnSummon(owner,'reanimated',{duration:5000,family:'dead_staff_soldier',familyMax:2,weaponType:summon.weaponType,noRaise:true,damageMult:summon.rarityMult});
          if(soldier){soldier.x=target.x;soldier.y=target.y;}
        }
        deps.spawnParts?.(target.x,target.y,summon.color,summon.type==='death_knight'?8:4,38);
      }
    }else if(ownerDistance>80){
      const dx=owner.x-summon.x,dy=owner.y-summon.y,distance=Math.max(1,ownerDistance);
      summon.facing=dx<0?'left':'right';summon.moving=true;
      summon.x+=dx/distance*summon.speed*.8*dt;summon.y+=dy/distance*summon.speed*.8*dt;
    }
    // Inimigos comuns podem atacar uma invocacao proxima. Chefes continuam
    // priorizando jogadores e apenas ferem invocacoes em contato.
    if(summon.hitTimer<=0){
      for(const target of targets){
        if(!target||target.dead||Math.hypot(target.x-summon.x,target.y-summon.y)>(target.radius||14)+12)continue;
        summon.hp-=Math.max(1,(target.damage||8)*(isBoss(target)?CFG.bossDamageToSummons:.55));summon.hitTimer=700;summon.hurtAnim=180;break;
      }
    }
  }
  function updateTotem(state,totem,dt,targets){
    totem.duration-=dt*1000;totem.attackTimer-=dt*1000;totem.buffTimer=Math.max(0,(totem.buffTimer||0)-dt*1000);if(totem.duration<=0){totem.dead=true;return;}
    if(totem.attackTimer<=0){
      totem.attackTimer=totem.cd;totem.shots++;
      const target=targets.filter(t=>t&&!t.dead&&Math.hypot(t.x-totem.x,t.y-totem.y)<totem.range).sort((a,b)=>Math.hypot(a.x-totem.x,a.y-totem.y)-Math.hypot(b.x-totem.x,b.y-totem.y))[0];
      if(target)damageTarget(target,totem.damage,state.owner,{summoned:true,weaponType:'necromancer_bone_totem'});
      if(totem.tier>=3&&totem.shots%4===0){
        for(const enemy of targets.filter(enemy=>enemy&&!enemy.dead&&enemy!==target).slice(0,2))damageTarget(enemy,totem.damage*.35,state.owner,{summoned:true,weaponType:'necromancer_bone_totem'});
      }
      if(totem.tier>=4&&totem.shots%5===0){
        for(const enemy of targets)if(enemy&&!enemy.dead&&Math.hypot(enemy.x-totem.x,enemy.y-totem.y)<78)damageTarget(enemy,totem.damage*.30,state.owner,{summoned:true,weaponType:'necromancer_bone_totem'});
        totem.buffTimer=2100;
      }
    }
  }
  function update(dt){
    const targets=deps.getTargets?deps.getTargets():[];
    for(const state of states.values()){
      const owner=state.owner;if(!owner||owner.dead)continue;
      const attract=130+(effect(owner).necroSoulCap?55:0);
      for(const orb of state.soulOrbs){
        orb.ttl-=dt*1000;orb.phase+=dt*4;if(orb.ttl<=0){orb.dead=true;continue;}
        const dx=owner.x-orb.x,dy=owner.y-orb.y,distance=Math.max(1,Math.hypot(dx,dy));
        if(distance<attract){const speed=100+(attract-distance)*2.5;orb.x+=dx/distance*speed*dt;orb.y+=dy/distance*speed*dt;}
        if(distance<23){
          const before=state.souls;state.souls=Math.min(soulCap(owner),state.souls+1);orb.dead=true;
          if(state.souls>before&&owner._necroScytheCollectHeal)collectHeal(owner,1);
          if(state.souls>before)playSfx('soul',70);
          deps.spawnParts?.(owner.x,owner.y,'#79e8d0',5,28);
        }
      }
      state.soulOrbs=state.soulOrbs.filter(orb=>!orb.dead);
      for(const corpse of state.corpses)corpse.ttl-=dt*1000;
      state.corpses=state.corpses.filter(corpse=>corpse.ttl>0);
      for(const summon of state.summons)updateSummon(state,summon,dt,targets);
      state.summons=state.summons.filter(summon=>!summon.dead);
      for(const totem of state.totems)updateTotem(state,totem,dt,targets);
      state.totems=state.totems.filter(totem=>!totem.dead);
    }
  }

  function getEnemyAggroTarget(enemy,players=[]){
    if(!enemy||isBoss(enemy))return null;
    let best=null,bestDistance=125;
    for(const state of states.values())for(const summon of state.summons){
      if(summon.dead)continue;const distance=Math.hypot(enemy.x-summon.x,enemy.y-summon.y);
      if(distance<bestDistance){best=summon;bestDistance=distance;}
    }
    return best;
  }
  function getHud(owner){
    const state=stateFor(owner,false);if(!state)return null;
    return {souls:state.souls,soulCap:soulCap(owner),corpses:state.corpses.length,corpseCap:corpseCap(owner),permanent:state.summons.filter(s=>s.permanent).length,permanentCap:permanentCap(owner),temporary:state.summons.filter(s=>!s.permanent).length};
  }

  function applyMark(target,tier,options={}){
    if(!target)return;
    target.necroProfaneMark=.05;
    target.necroProfaneMarkTimer=tier>=1?3500:3000;
    target.necroProfaneMarkData={owner:options.owner||null,tier,spreadAllowed:options.spreadAllowed??tier>=3};
  }
  function applyRot(target,owner,weapon,baseDamage,tier,options={}){
    if(!target)return;
    const secondary=!!options.secondary;
    const nextDps=baseDamage*(secondary ? .14 : .25);
    const previous=target.necroRot;
    target.necroRot={
      owner,weapon,tier,baseDamage,timer:secondary?2600:4000,tick:500,
      dps:Math.max(nextDps,Math.min(previous?.dps||0,nextDps*1.25)),
      explodeOnDeath:!secondary&&tier>=2,secondary,
    };
  }
  function onProjectileHit(projectile,target){
    if(!projectile?.owner||!isNecromancer(projectile.owner)||!target)return;
    const tier=Number(projectile.opts?.necroTier||0);
    if(projectile.opts?.necroMark)applyMark(target,tier,{owner:projectile.owner,spreadAllowed:tier>=3});
    if(projectile.opts?.necroRot)applyRot(target,projectile.owner,projectile.weapon,projectile.dmg,tier);
  }
  function updateTargetEffects(target,dt){
    if(target.necroProfaneMarkTimer>0){target.necroProfaneMarkTimer-=dt*1000;if(target.necroProfaneMarkTimer<=0){target.necroProfaneMark=0;target.necroProfaneMarkData=null;}}
    const rot=target.necroRot;if(!rot)return;
    rot.timer-=dt*1000;rot.tick-=dt*1000;
    if(rot.tick<=0&&rot.timer>0&&!target.dead){
      rot.tick+=500;
      const wounded=!isBoss(target)&&target.hp/Math.max(1,target.maxHp)<.35;
      const bossBonus=isBoss(target)&&rot.tier>=4?1.10:1;
      damageTarget(target,rot.dps*.5*(rot.tier>=4&&wounded?1.25:1)*bossBonus,rot.owner,{weapon:rot.weapon,weaponType:'necromancer_cursed_skull'});
    }
    if(rot.timer<=0)target.necroRot=null;
  }

  function attackWeapon(player,enemies,rarity,manualTarget,weapon,type,helpers={}){
    const def=helpers.getDefinition?.(type);if(!def)return false;
    const tier=helpers.getTier?.(rarity)??0,base=helpers.getDamage?.(def,rarity)??def.baseDmg;
    const targets=helpers.nearestTargets?.(player,enemies,def.range,8)||[];
    const target=manualTarget||targets[0];if(!target)return false;
    const angle=Math.atan2(target.y-player.y,target.x-player.x),state=stateFor(player);
    state.weaponCounters[type]=(state.weaponCounters[type]||0)+1;const count=state.weaponCounters[type];
    const shot=(a,damage,opts={})=>helpers.spawnProjectile?.(player.x,player.y,a,damage,player,weapon,{...opts,color:def.color,necroTier:tier});
    if(type==='necromancer_dead_staff'){
      const familyMax=tier>=2?2:1;
      if(state.summons.filter(s=>!s.dead&&s.family==='dead_staff').length>=familyMax)return true;
      if(state.souls<2)return false;
      const summon=spawnSummon(player,'skeleton_warrior',{
        permanent:true,family:'dead_staff',familyMax,weaponType:type,
        attackSpeedMult:tier>=2?1.10:tier>=1?1.05:1,hpMult:tier>=3?1.20:1,damageMult:base/def.baseDmg,
        deathExplosion:tier>=3 ? .60 : 0,raiseChance:tier>=4 ? .165 : 0,
      });
      if(!summon)return true;
      spendSouls(player,2);
    }else if(type==='necromancer_profane_grimoire'){
      playSfx('curse',220);
      shot(angle,base,{homing:true,target,necroMark:true});
      if(tier>=2){
        const second=targets.find(other=>other!==target)||target;
        shot(Math.atan2(second.y-player.y,second.x-player.x),base*.55,{homing:true,target:second,necroMark:true});
      }
      if(tier>=4&&count%5===0)helpers.weaponBurst?.(player,enemies,target.x,target.y,62,weapon,base*1.60,def.color);
    }else if(type==='necromancer_soul_scythe'){
      playSfx('scythe',160);
      player._necroScytheCollectHeal=tier>=2;
      const range=def.range*(tier>=2?1.15:tier>=1?1.08:1);
      const harvest=tier>=3&&count%4===0;
      helpers.addMeleeAnim?.('sword',player.x,player.y,angle,range,def.color,330);
      helpers.weaponCone?.(player,enemies,angle,range,Math.PI*.9,weapon,base,def.color,enemy=>{
        enemy._lastDamageSource='direct';enemy._lastNecroWeapon=type;
        if(harvest&&!isBoss(enemy)&&!isElite(enemy)&&enemy.hp>0&&enemy.hp/enemy.maxHp<.08){
          damageTarget(enemy,enemy.hp+1,player,{weapon,weaponType:type});
          if(enemy.dead)spawnSoulOrb(player,enemy.x,enemy.y,1);
        }
      });
      if(tier>=4&&now()-state.scytheRingAt>=6000){
        state.scytheRingAt=now();
        const candidates=targets.filter(enemy=>enemy&&!enemy.dead&&Math.hypot(enemy.x-player.x,enemy.y-player.y)<145);
        helpers.weaponBurst?.(player,enemies,player.x,player.y,145,weapon,base*1.40,def.color);
        for(const enemy of candidates)if(enemy.dead&&!isBoss(enemy)&&!isElite(enemy)&&Math.random()<.75)spawnSoulOrb(player,enemy.x,enemy.y,1);
      }
    }else if(type==='necromancer_cursed_skull'){
      playSfx('curse',220);
      shot(angle,base,{homing:true,target,necroRot:true});
    }else if(type==='necromancer_spectral_lantern'){
      const familyMax=tier>=2?2:1;
      if(state.summons.filter(s=>!s.dead&&s.family==='spectral_lantern').length>=familyMax)return true;
      spawnSummon(player,'spirit',{
        permanent:true,family:'spectral_lantern',familyMax,weaponType:type,
        hpMult:tier>=1?1.10:1,pierce:tier>=3?1:0,traceEvery:tier>=4?4:0,damageMult:base/def.baseDmg,
      });
    }else if(type==='necromancer_bone_totem'){
      if(state.totems.length>=1)state.totems.shift();
      state.totems.push({
        x:player.x+Math.cos(angle)*46,y:player.y+Math.sin(angle)*46,
        duration:tier>=2?9500:tier>=1?9000:8000,attackTimer:150,shots:0,
        range:def.range,damage:base*.70,cd:tier>=2?660:760,tier,buffTimer:0,dead:false,
      });
    }else if(type==='necromancer_corrupted_heart'){
      const low=player.hp/player.maxHp<.35,range=def.range*(tier>=2?1.15:1),mult=tier>=4&&low?1.20:1;
      const hitCount=targets.filter(enemy=>enemy&&!enemy.dead&&Math.hypot(enemy.x-player.x,enemy.y-player.y)<range).length;
      helpers.weaponBurst?.(player,enemies,player.x,player.y,range,weapon,base*mult,def.color);
      if(tier>=3&&hitCount>=3&&now()-state.heartHealAt>=1500){
        state.heartHealAt=now();collectHeal(player,Math.max(2,Math.round(player.maxHp*(tier>=4&&low ? .025 : .018))));
      }
    }else if(type==='necromancer_death_bell'){
      if(!state.corpses.length)return false;
      const limit=tier>=2?3:2,duration=tier>=2?7000:tier>=1?6500:6000;
      const corpses=[...state.corpses].sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y)).slice(0,limit);
      let effective=0,abominationUsed=false;
      for(const corpse of corpses){
        const summonType=tier>=3&&corpse.elite&&!abominationUsed?'abomination':'reanimated';
        const summon=spawnSummon(player,summonType,{duration,isReanimated:true,weaponType:type,family:'death_bell',damageMult:base/def.baseDmg});
        if(!summon)continue;
        summon.x=corpse.x;summon.y=corpse.y;effective++;abominationUsed||=summonType==='abomination';
        state.corpses.splice(state.corpses.indexOf(corpse),1);
      }
      if(!effective)return false;
      playSfx('bell',350);
      state.bellActivations++;
      if(tier>=4&&effective>=2&&state.bellActivations%4===0)spawnSummon(player,'death_knight',{duration:9000,isReanimated:true,weaponType:type,family:'death_knight',familyMax:1,damageMult:base/def.baseDmg});
    }
    return true;
  }

  function basicAttack(player,target,helpers={}){
    if(!isNecromancer(player)||!target)return false;
    const weapon=player._necromancerBasicWeapon||(player._necromancerBasicWeapon={type:'necromancer_basic',rarity:'common',damageDone:0});
    const angle=Math.atan2(target.y-player.y,target.x-player.x);
    helpers.spawnProjectile?.(player.x,player.y,angle,player.dmg,player,weapon,{color:'#70d98b',homing:true,target,necroMark:false});
    return true;
  }

  function draw(ctx,time=Date.now()){
    if(!ctx)return;
    ctx.save();
    for(const state of states.values()){
      for(const corpse of state.corpses){
        const alpha=clamp(corpse.ttl/1200,0,1);ctx.globalAlpha=.28+.38*alpha;ctx.strokeStyle='#9ac6a0';ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(corpse.x-7,corpse.y-4);ctx.lineTo(corpse.x+7,corpse.y+5);ctx.moveTo(corpse.x+7,corpse.y-4);ctx.lineTo(corpse.x-7,corpse.y+5);ctx.stroke();
        ctx.fillStyle='#d7d0b2';ctx.fillRect(corpse.x-3,corpse.y-3,6,5);
      }
      for(const orb of state.soulOrbs){
        const pulse=1+Math.sin(time*.008+orb.phase)*.16;ctx.globalAlpha=clamp(orb.ttl/800,0,1);ctx.shadowColor='#64ffc0';ctx.shadowBlur=10;
        ctx.fillStyle='#79e8d0';ctx.beginPath();ctx.arc(orb.x,orb.y,4.2*pulse,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e8fff4';ctx.fillRect(orb.x-1,orb.y-2,2,4);ctx.shadowBlur=0;
      }
      for(const totem of state.totems){
        ctx.globalAlpha=1;ctx.fillStyle='#6f6657';ctx.fillRect(totem.x-7,totem.y-8,14,16);ctx.fillStyle='#ded3b0';ctx.fillRect(totem.x-5,totem.y-12,3,7);ctx.fillRect(totem.x+2,totem.y-12,3,7);ctx.fillStyle='#70d98b';ctx.fillRect(totem.x-2,totem.y-3,4,4);
      }
      for(const summon of state.summons){
        const spawnProgress=1-clamp((summon.spawnAnim||0)/420,0,1);
        ctx.save();ctx.globalAlpha=.2+.8*spawnProgress;
        if(summon.spawnAnim>0){
          ctx.strokeStyle='#9b5cff';ctx.lineWidth=1.5;ctx.shadowColor='#7d35dc';ctx.shadowBlur=8;
          ctx.beginPath();ctx.ellipse(summon.x,summon.y+10,6+spawnProgress*9,2+spawnProgress*4,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
        }
        if(summon.hurtAnim>0)ctx.filter='brightness(1.8) saturate(1.4)';
        const rendered=deps.drawSummon?.(ctx,summon,time)===true;
        if(!rendered){
          const bob=Math.sin(time*.006+summon.phase)*1.5;ctx.globalAlpha*=summon.type==='spirit'?.72:1;ctx.shadowColor=summon.color;ctx.shadowBlur=summon.type==='spirit'?12:4;
          ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(summon.x,summon.y+11,10,4,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=summon.color;ctx.fillRect(summon.x-6,summon.y-7+bob,12,10);ctx.fillRect(summon.x-4,summon.y+3+bob,3,8);ctx.fillRect(summon.x+1,summon.y+3+bob,3,8);
          ctx.fillStyle='#18231d';ctx.fillRect(summon.x-3,summon.y-4+bob,2,2);ctx.fillRect(summon.x+2,summon.y-4+bob,2,2);ctx.shadowBlur=0;
        }
        ctx.filter='none';ctx.globalAlpha=1;ctx.shadowBlur=0;
        const barWidth=summon.type==='abomination'||summon.type==='death_knight'?24:20;
        ctx.fillStyle='rgba(4,2,9,.78)';ctx.fillRect(summon.x-barWidth/2,summon.y-18,barWidth,3);
        ctx.fillStyle='#9b5cff';ctx.fillRect(summon.x-barWidth/2,summon.y-18,barWidth*clamp(summon.hp/summon.maxHp,0,1),3);
        ctx.restore();
      }
    }
    ctx.globalAlpha=1;ctx.restore();
  }

  const api=Object.freeze({
    configure,initializePlayer,resetRun,clearWorld,update,draw,stateFor,getHud,
    onEnemyDeath,onBossDamaged,onProjectileHit,updateTargetEffects,getEnemyAggroTarget,
    spawnSummon,spendSouls,attackWeapon,basicAttack,damageTarget,
    get states(){return states;},
  });
  global.NecromancerSystem=api;
})(window);
