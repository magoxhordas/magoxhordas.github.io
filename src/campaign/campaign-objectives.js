// Objetivos narrativos das ondas 2–24. Todo estado pertence somente a run.
(function(global){
  'use strict';

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const distance=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));
  const alive=list=>(list||[]).filter(item=>item&&!item.dead);
  const OBJECTIVE_WAVES=Object.freeze({
    2:Object.freeze({id:'bone_altars',title:'Altares de Ossos',required:true}),
    3:Object.freeze({id:'dark_choice',title:'O Preço da Escuridão',required:true}),
    4:Object.freeze({id:'corpse_knight',title:'Cavaleiro Cadáver',required:true}),
    7:Object.freeze({id:'spider_nests',title:'Ninhos da Matriarca',required:true}),
    8:Object.freeze({id:'webbed_survivor',title:'Sobrevivente Enredado',required:false}),
    9:Object.freeze({id:'hunter_spider',title:'Aranha Caçadora',required:true}),
    12:Object.freeze({id:'freezing_cold',title:'Frio Crescente',required:false}),
    13:Object.freeze({id:'lost_fires',title:'Fogueiras Perdidas',required:true}),
    14:Object.freeze({id:'frozen_gate',title:'Portão Congelado',required:true}),
    17:Object.freeze({id:'ancient_obelisks',title:'Obeliscos Ancestrais',required:true}),
    18:Object.freeze({id:'sandstorm',title:'Tempestade de Areia',required:false}),
    19:Object.freeze({id:'tremors',title:'Tremores do Devorador',required:false}),
    22:Object.freeze({id:'infernal_fissures',title:'Fissuras Infernais',required:true}),
    23:Object.freeze({id:'demon_altar',title:'Altar Demoníaco',required:false}),
    24:Object.freeze({id:'last_stand',title:'Última Resistência',required:true}),
  });

  const POSITIONS=Object.freeze({
    boneAltars:Object.freeze([[132,274],[320,226],[508,274]]),
    spiderNests:Object.freeze([[116,270],[242,388],[398,388],[524,270]]),
    frostFires:Object.freeze([[145,286],[320,390],[495,286]]),
    obelisks:Object.freeze([[112,272],[244,386],[396,386],[528,272]]),
    fissures:Object.freeze([[138,300],[320,238],[502,300]]),
  });

  class CampaignObjectiveTarget{
    constructor(config,runtime){
      Object.assign(this,config);
      this.runtime=runtime;this.dead=false;this.objectiveTarget=true;this.noNecroRewards=true;
      this.hp=Number.isFinite(config.hp)?config.hp:1;this.maxHp=Number.isFinite(config.maxHp)?config.maxHp:this.hp;
      this.radius=config.radius||18;this.phase=config.phase??Math.random()*Math.PI*2;
      this.damageable=config.damageable!==false;this.autoTarget=config.autoTarget!==false;
      this._destroyed=false;this.flashTimer=0;this.age=0;
    }
    takeDmg(raw){
      if(this.dead||!this.damageable)return 0;
      let amount=Math.max(0,Number(raw)||0);if(!amount)return 0;
      if(typeof this.adjustDamage==='function')amount=Math.max(0,this.adjustDamage(amount,this._lastDamageOwner,this));
      if(!amount)return 0;
      const before=this.hp;this.hp-=amount;this.flashTimer=110;
      this.runtime.parts(this.x,this.y,this.hitColor||'#e8c77a',Math.min(8,3+Math.round(amount/25)),34);
      this.onDamage?.(this,before,this.hp,amount);
      if(this.hp<=0){
        const handled=this.onDepleted?.(this,'damage');
        if(!handled)this.destroy('damage');
      }
      return Math.max(0,Math.min(before,amount));
    }
    destroy(reason='script'){
      if(this._destroyed)return;
      this._destroyed=true;this.dead=true;this.hp=0;this.onDestroyed?.(this,reason);
    }
    update(dt){
      this.age+=dt*1000;this.flashTimer=Math.max(0,this.flashTimer-dt*1000);this.customUpdate?.(this,dt);
    }
    draw(ctx,time){this.runtime.drawTarget(ctx,time,this);}
  }

  function create(dependencies={}){
    const deps={
      getPlayers:()=>[],getEnemies:()=>[],getWave:()=>0,getArena:()=>'',
      isBossRush:()=>false,isDungeon:()=>false,isCampaignActive:()=>true,
      spawnEnemy:()=>null,spawnParts:()=>{},spawnNotice:()=>{},damagePlayer:(pl,amount)=>pl?.takeDmg?.(amount),
      addCoins:()=>{},addXp:()=>{},addCampResource:()=>{},setWaveTimer:()=>{},requestWaveEnd:()=>{},
      showChoice:()=>{},hideChoice:()=>{},setHud:()=>{},setAction:()=>{},now:()=>Date.now(),
      ...dependencies,
    };
    const runtime={parts:(...args)=>deps.spawnParts(...args),drawTarget};
    let current=blankState();
    let buffs=blankBuffs();
    let modifiers=[];
    let heldActions=new Map();
    let targetSerial=0;
    let lastHudSignature='';
    let lastActionSignature='';
    let stormCanvas=null,stormCtx=null;

    function blankBuffs(){return {darkChoice:null,demonPower:0,skeletonKingDamage:0,aracneHpMult:1,aracneCooldownMult:1,fireBlessing:false};}
    function blankState(){return {wave:0,id:null,title:'',required:false,complete:true,targets:[],elapsed:0,data:{},active:false};}
    function players(){return alive(deps.getPlayers());}
    function enemies(){return alive(deps.getEnemies());}
    function validCampaign(){return !deps.isBossRush()&&!deps.isDungeon()&&deps.isCampaignActive();}
    function makeTarget(config){
      const target=new CampaignObjectiveTarget({id:`objective_${++targetSerial}`,...config},runtime);
      current.targets.push(target);return target;
    }
    function objectiveSpawns(source=current.id){return enemies().filter(enemy=>enemy.campaignObjectiveSource===source);}
    function spawnObjectiveEnemy(type,x,y,source=current.id,mutate=null){
      const enemy=deps.spawnEnemy(type,clamp(x,38,602),clamp(y,210,456),source);
      if(enemy){enemy.campaignObjectiveSource=source;enemy.noEventReward=true;mutate?.(enemy);onEnemySpawn(enemy);}
      return enemy;
    }
    function complete(message){
      if(current.complete)return;
      current.complete=true;heldActions.clear();deps.setAction(null);
      if(message)deps.spawnNotice(320,188,message,0);
    }
    function cleanupCurrent(reason='cleanup'){
      for(const target of current.targets)if(target&&!target.dead){target.dead=true;target.cleanup?.(reason);}
      for(const enemy of deps.getEnemies()||[]){
        if(enemy?._campaignObjectiveBaseSpeed!=null){enemy.speed=enemy._campaignObjectiveBaseSpeed;delete enemy._campaignObjectiveBaseSpeed;}
        delete enemy._campaignNpcAggro;delete enemy._campaignEmergingMs;
      }
      heldActions.clear();deps.hideChoice();deps.setHud(null);deps.setAction(null);
      lastHudSignature='';lastActionSignature='';current=blankState();
    }
    function resetRun(){cleanupCurrent('run-reset');clearPlayerEnvironmentFlags();buffs=blankBuffs();clearModifiers(true);modifiers=[];}
    function cleanup(reason='cleanup'){
      if(reason==='wave-end'||reason==='chapter')cleanupCurrent(reason);
      else resetRun();
    }

    function clearModifiers(revert){
      if(revert)for(const modifier of modifiers)revertModifier(modifier);
    }
    function applyMaxHpModifier(modifier){
      if(modifier.applied)return;
      modifier.playerDeltas=new Map();
      for(const pl of players()){
        const delta=Math.max(0,pl.maxHp*modifier.value);modifier.playerDeltas.set(pl,delta);
        pl.maxHp+=delta;pl.hp=Math.min(pl.maxHp,pl.hp+delta);
      }
      modifier.applied=true;
    }
    function revertModifier(modifier){
      if(modifier.type!=='maxHp'||!modifier.applied)return;
      for(const [pl,delta] of modifier.playerDeltas||[]){if(!pl)continue;pl.maxHp=Math.max(1,pl.maxHp-delta);pl.hp=Math.min(pl.maxHp,Math.max(1,pl.hp));}
      modifier.applied=false;
    }
    function addTimedModifier(spec={}){
      const wave=Number(deps.getWave())||current.wave||0;
      const startsWave=spec.startsWave??(spec.immediate?wave:wave+1);
      const duration=Math.max(1,Number(spec.waves)||1);
      const modifier={id:spec.id||`modifier_${deps.now()}_${modifiers.length}`,type:spec.type||'damage',value:Number(spec.value)||0,
        startsWave,endWave:startsWave+duration-1,source:spec.source||'event',applied:false};
      modifiers=modifiers.filter(existing=>{if(existing.id!==modifier.id)return true;revertModifier(existing);return false;});
      modifiers.push(modifier);if(modifier.type==='maxHp')applyMaxHpModifier(modifier);return modifier;
    }
    function expireModifiers(wave){
      modifiers=modifiers.filter(modifier=>{if(wave<=modifier.endWave)return true;revertModifier(modifier);return false;});
    }
    function modifierActive(modifier,wave=Number(deps.getWave())||current.wave){return wave>=modifier.startsWave&&wave<=modifier.endWave;}

    function startWave(wave){
      cleanupCurrent('wave-change');
      if(!validCampaign())return false;
      expireModifiers(wave);
      if(wave>5)buffs.skeletonKingDamage=0;
      if(wave>15)buffs.fireBlessing=false;
      const definition=OBJECTIVE_WAVES[wave];
      if(!definition)return false;
      current={wave,id:definition.id,title:definition.title,required:definition.required,complete:false,targets:[],elapsed:0,data:{},active:true};
      const hpScale=Math.max(.8,Number(deps.getObjectiveHpScale?.()||1));
      if(definition.id==='bone_altars'){
        current.data.spawnTimer=2600;
        POSITIONS.boneAltars.forEach(([x,y],index)=>makeTarget({kind:'bone_altar',label:`Altar ${index+1}`,x,y,hp:Math.round(150*hpScale),radius:20,hitColor:'#d9ccb2',onDestroyed:onMandatoryStructureDestroyed}));
      }else if(definition.id==='dark_choice'){
        current.data.revealAt=8000;current.data.revealed=false;
      }else if(definition.id==='corpse_knight'){
        const knight=makeTarget({kind:'corpse_knight',label:'Cavaleiro Cadáver',x:320,y:245,hp:Math.round(620*hpScale),radius:25,hitColor:'#ba4f55',
          facingAngle:Math.PI/2,attackTimer:1700,boneTimer:3800,combatState:'idle',customUpdate:updateCorpseKnight,
          adjustDamage:corpseKnightDamage,onDestroyed:()=>{buffs.skeletonKingDamage=.08;complete('RECOMPENSA: +8% DANO CONTRA O REI CADÁVER');}});
        knight.isMiniboss=true;
      }else if(definition.id==='spider_nests'){
        current.data.spawnTimer=1900;
        POSITIONS.spiderNests.forEach(([x,y],index)=>makeTarget({kind:'spider_nest',label:`Ninho ${index+1}`,x,y,hp:Math.round(180*hpScale),radius:22,hitColor:'#d9e4d6',onDestroyed:onMandatoryStructureDestroyed}));
      }else if(definition.id==='webbed_survivor'){
        const survivor=makeTarget({kind:'survivor_web',label:'Casulo',x:320,y:270,hp:Math.round(145*hpScale),radius:20,hitColor:'#e4eee6',optional:true,
          interactive:true,interactionText:'Libertar sobrevivente',onDepleted:target=>{startSurvivorDefense(target);return true;}});
        current.data.survivor=survivor;current.data.stage='web';current.data.defenseMs=22000;
      }else if(definition.id==='hunter_spider'){
        const hunter=makeTarget({kind:'hunter_spider',label:'Aranha Caçadora',x:320,y:238,hp:Math.round(520*hpScale),radius:23,hitColor:'#d7eee3',
          attackTimer:850,phaseTimer:3000,combatState:'hunt',customUpdate:updateHunterSpider,
          onDestroyed:()=>{buffs.aracneCooldownMult=Math.max(buffs.aracneCooldownMult,1.06);complete('ARACNE ENFRAQUECIDA: RECARGAS +6%');}});
        hunter.isElite=true;
      }else if(definition.id==='freezing_cold'){
        current.data.fires=POSITIONS.frostFires.map(([x,y])=>makeTarget({kind:'fire',label:'Fogueira acesa',x,y,radius:20,damageable:false,autoTarget:false,lit:true}));
        current.data.meters=new Map(players().map(pl=>[pl,{value:0,debuff:false}]));
      }else if(definition.id==='lost_fires'){
        current.data.lit=0;
        POSITIONS.frostFires.forEach(([x,y],index)=>makeTarget({kind:'fire',label:`Fogueira ${index+1}`,x,y,radius:20,damageable:false,autoTarget:false,lit:false,interactive:true,holdMs:1750,interactionText:'Acender fogueira'}));
      }else if(definition.id==='frozen_gate'){
        current.data.thresholds=new Set();
        makeTarget({kind:'frozen_gate',label:'Portão Congelado',x:320,y:250,hp:Math.round(900*hpScale),radius:42,width:96,hitColor:'#a9efff',
          onDamage:onGateDamaged,onDestroyed:()=>complete('PORTÃO ROMPIDO')});
      }else if(definition.id==='ancient_obelisks'){
        current.data.activated=0;
        POSITIONS.obelisks.forEach(([x,y],index)=>makeTarget({kind:'obelisk',label:`Obelisco ${index+1}`,x,y,radius:20,damageable:false,autoTarget:false,interactive:true,activated:false,interactionText:'Ativar obelisco'}));
      }else if(definition.id==='sandstorm'){
        current.data.gust=0;
      }else if(definition.id==='tremors'){
        current.data.nextTremor=4200;current.data.tremor=null;
      }else if(definition.id==='infernal_fissures'){
        current.data.spawnTimer=1700;
        POSITIONS.fissures.forEach(([x,y],index)=>makeTarget({kind:'infernal_fissure',label:`Fissura ${index+1}`,x,y,hp:Math.round(245*hpScale),radius:24,hitColor:'#ff7b37',onDestroyed:onMandatoryStructureDestroyed}));
      }else if(definition.id==='demon_altar'){
        makeTarget({kind:'demon_altar',label:'Altar Demoníaco',x:320,y:265,hp:Math.round(260*hpScale),radius:23,damageable:false,autoTarget:false,interactive:true,decisionMade:false,
          interactionText:'Decidir destino do altar',onDestroyed:()=>{deps.addCoins(16);deps.addXp(20);deps.spawnNotice(320,200,'ALTAR DESTRUÍDO · RECOMPENSA RECUPERADA',0);complete();}});
      }else if(definition.id==='last_stand'){
        current.data.remaining=60000;current.data.cleanup=false;current.data.stage=0;deps.setWaveTimer(60000);
      }
      refreshUi(true);return true;
    }

    function onMandatoryStructureDestroyed(target){
      runtime.parts(target.x,target.y,target.kind==='infernal_fissure'?'#ff5a20':'#d8c6a4',18,72);
      if(alive(current.targets).filter(item=>item.damageable).length===0){
        if(current.id==='spider_nests'){
          buffs.aracneHpMult=Math.min(buffs.aracneHpMult,.95);
          for(const pl of players())pl._campaignWebSlow=0;
          complete('TODOS OS NINHOS DESTRUÍDOS · ARACNE -5% VIDA');
        }
        else complete(current.id==='bone_altars'?'RITUAL INTERROMPIDO':current.id==='infernal_fissures'?'FISSURAS SELADAS':'OBJETIVO CONCLUÍDO');
      }
    }

    function revealDarkAltar(){
      if(current.data.revealed)return;current.data.revealed=true;
      makeTarget({kind:'dark_altar',label:'Altar Sombrio',x:320,y:270,radius:23,damageable:false,autoTarget:false,interactive:true,interactionText:'Escolher o preço'});
      deps.spawnNotice(320,202,'UM ALTAR SOMBRIO DESPERTA',0);runtime.parts(320,270,'#a64fd1',24,85);
    }
    function chooseDarkPath(){
      deps.showChoice({title:'O Preço da Escuridão',body:'A decisão é compartilhada por toda a expedição e dura até o fim da run.',options:[
        {id:'absorb',title:'Absorver',detail:'+15% de dano · −10% de vida máxima',costly:true,onChoose:()=>applyDarkChoice('absorb')},
        {id:'purify',title:'Purificar',detail:'+12% de vida máxima · −5% de velocidade',onChoose:()=>applyDarkChoice('purify')},
      ]});
    }
    function applyDarkChoice(choice){
      buffs.darkChoice=choice;
      for(const pl of players()){
        if(choice==='absorb'){pl.maxHp=Math.max(1,pl.maxHp*.90);pl.hp=Math.min(pl.hp,pl.maxHp);}
        else{const delta=pl.maxHp*.12;pl.maxHp+=delta;pl.hp=Math.min(pl.maxHp,pl.hp+delta);}
      }
      current.targets.forEach(target=>target.dead=true);complete(choice==='absorb'?'PODER ABSORVIDO':'ALTAR PURIFICADO');
    }

    function corpseKnightDamage(amount,owner,target){
      if(!owner)return amount;
      const incoming=Math.atan2(owner.y-target.y,owner.x-target.x);let diff=incoming-target.facingAngle;
      while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
      if(Math.abs(diff)<Math.PI*.43){
        if((target.shieldNotice||0)<=0){deps.spawnNotice(target.x,target.y-35,'ESCUDO FRONTAL',0);target.shieldNotice=650;}
        return amount*.35;
      }
      return amount;
    }
    function updateCorpseKnight(target,dt){
      const ms=dt*1000;target.shieldNotice=Math.max(0,(target.shieldNotice||0)-ms);
      const candidates=players();if(!candidates.length)return;
      const nearest=candidates.sort((a,b)=>distance(a,target)-distance(b,target))[0];
      if(target.combatState==='charge_wind'){
        target.stateTimer-=ms;
        if(target.stateTimer<=0){const angle=Math.atan2(target.chargeY-target.y,target.chargeX-target.x);target.chargeVx=Math.cos(angle)*330;target.chargeVy=Math.sin(angle)*330;target.combatState='charge';target.stateTimer=620;target.chargeHits=new Set();}
      }else if(target.combatState==='charge'){
        target.stateTimer-=ms;target.x+=target.chargeVx*dt;target.y+=target.chargeVy*dt;target.x=clamp(target.x,40,600);target.y=clamp(target.y,212,454);
        for(const pl of candidates)if(!target.chargeHits.has(pl)&&distance(pl,target)<pl.radius+target.radius){target.chargeHits.add(pl);deps.damagePlayer(pl,Math.min(pl.maxHp*.22,18+current.wave));}
        if(target.stateTimer<=0){target.combatState='idle';target.attackTimer=2400;}
      }else{
        const angle=Math.atan2(nearest.y-target.y,nearest.x-target.x);target.facingAngle=angle;
        if(distance(nearest,target)>70){target.x+=Math.cos(angle)*48*dt;target.y+=Math.sin(angle)*48*dt;}
        target.attackTimer-=ms;
        if(target.attackTimer<=0){target.combatState='charge_wind';target.stateTimer=900;target.chargeX=nearest.x;target.chargeY=nearest.y;deps.spawnNotice(target.x,target.y-38,'INVESTIDA!',0);}
      }
      target.boneTimer-=ms;
      if(target.boneTimer<=0&&!target.boneWave){target.boneWave={timer:720,phase:'telegraph',hit:new Set()};target.boneTimer=5200;}
      if(target.boneWave){
        target.boneWave.timer-=ms;
        if(target.boneWave.phase==='telegraph'&&target.boneWave.timer<=0){target.boneWave={timer:520,phase:'action',hit:new Set()};runtime.parts(target.x,target.y,'#d8ceb6',16,95);}
        else if(target.boneWave.phase==='action'){
          const radius=38+(1-target.boneWave.timer/520)*105;
          for(const pl of candidates)if(!target.boneWave.hit.has(pl)&&Math.abs(distance(pl,target)-radius)<24){target.boneWave.hit.add(pl);deps.damagePlayer(pl,Math.min(pl.maxHp*.16,13+current.wave));}
          if(target.boneWave.timer<=0)target.boneWave=null;
        }
      }
    }

    function updateHunterSpider(target,dt){
      const ms=dt*1000,candidates=players();if(!candidates.length)return;
      const nearest=candidates.sort((a,b)=>distance(a,target)-distance(b,target))[0];
      target.phaseTimer-=ms;
      if(target.combatState==='phase_wind'){
        target.stateTimer-=ms;
        if(target.stateTimer<=0){target.x=clamp(nearest.x+(Math.random()-.5)*90,42,598);target.y=clamp(nearest.y-55,215,450);target.combatState='phase_strike';target.stateTimer=500;target.phaseHit=false;runtime.parts(target.x,target.y,'#dceee6',14,65);}
      }else if(target.combatState==='phase_strike'){
        target.stateTimer-=ms;
        if(!target.phaseHit&&distance(target,nearest)<68){target.phaseHit=true;deps.damagePlayer(nearest,Math.min(nearest.maxHp*.18,15+current.wave));nearest.campaignWebTimer=Math.max(nearest.campaignWebTimer||0,2400);}
        if(target.stateTimer<=0){target.combatState='hunt';target.phaseTimer=4200;}
      }else{
        const angle=Math.atan2(nearest.y-target.y,nearest.x-target.x),d=distance(target,nearest);
        if(d>34){target.x+=Math.cos(angle)*94*dt;target.y+=Math.sin(angle)*94*dt;}
        target.attackTimer-=ms;
        if(d<42&&target.attackTimer<=0){target.attackTimer=950;deps.damagePlayer(nearest,Math.min(nearest.maxHp*.13,11+current.wave*.5));nearest.campaignWebTimer=Math.max(nearest.campaignWebTimer||0,1900);}
        if(target.phaseTimer<=0){target.combatState='phase_wind';target.stateTimer=680;deps.spawnNotice(target.x,target.y-32,'FASE PARCIAL',0);}
      }
      target.x=clamp(target.x,38,602);target.y=clamp(target.y,210,456);
    }

    function startSurvivorDefense(target){
      if(current.data.stage!=='web')return;
      current.data.stage='defend';current.data.remaining=current.data.defenseMs;
      target.kind='survivor';target.label='Sobrevivente';target.damageable=false;target.autoTarget=false;target.interactive=false;
      target._destroyed=false;target.dead=false;target.hp=120;target.maxHp=120;target.radius=15;
      runtime.parts(target.x,target.y,'#e8eee6',18,65);deps.spawnNotice(target.x,target.y-34,'DEFENDA O SOBREVIVENTE!',0);
    }
    function updateSurvivor(dt){
      const target=current.data.survivor;if(!target||current.data.stage!=='defend')return;
      current.data.remaining-=dt*1000;
      for(const enemy of enemies()){
        const wantsNpc=((Math.floor(enemy.x+enemy.y)%5)<2)||distance(enemy,target)<125;
        enemy._campaignNpcAggro=wantsNpc?target:null;
        if(!wantsNpc||distance(enemy,target)>=enemy.radius+target.radius+3)continue;
        enemy._objectiveNpcHit=(enemy._objectiveNpcHit||0)-dt*1000;
        if(enemy._objectiveNpcHit<=0){enemy._objectiveNpcHit=850;target.hp-=Math.max(2,enemy.damage*.32);runtime.parts(target.x,target.y,'#d36a65',5,30);}
      }
      if(target.hp<=0){target.dead=true;current.data.stage='failed';deps.spawnNotice(target.x,target.y-32,'O SOBREVIVENTE CAIU',0);complete();}
      else if(current.data.remaining<=0){
        current.data.stage='success';target.dead=true;
        for(const pl of players()){pl.hp=Math.min(pl.maxHp,pl.hp+pl.maxHp*.22);pl.gainXP?.(12);}
        deps.addCoins(12);deps.addCampResource('madeira',2);deps.spawnNotice(target.x,target.y-32,'RESGATE CONCLUÍDO · SUPRIMENTOS RECEBIDOS',0);complete();
      }
    }

    function onGateDamaged(target,before,after){
      const beforePct=before/target.maxHp,afterPct=Math.max(0,after/target.maxHp);
      for(const threshold of [.75,.50,.25]){
        if(beforePct>threshold&&afterPct<=threshold&&!current.data.thresholds.has(threshold)){
          current.data.thresholds.add(threshold);deps.spawnNotice(target.x,target.y-48,`PORTÃO ${Math.round(threshold*100)}%`,0);
          const count=threshold===.75?2:threshold===.5?3:4;
          const allowed=Math.min(count,Math.max(0,8-objectiveSpawns('frozen_gate').length));
          for(let index=0;index<allowed;index++)spawnObjectiveEnemy(index===allowed-1?'crystal_golem':'ice_zombie',target.x+(index-(allowed-1)/2)*34,target.y+55+index%2*18,'frozen_gate');
        }
      }
    }

    function activateObelisk(target){
      if(target.activated)return;target.activated=true;target.interactive=false;current.data.activated++;
      deps.spawnNotice(target.x,target.y-32,`OBELISCO ${current.data.activated}/4`,0);runtime.parts(target.x,target.y,'#e3b35d',14,60);
      const count=1+current.data.activated;
      const types=['cultist','obsidian_scorpion','sand_worm_small'];
      const allowed=Math.min(count,Math.max(0,8-objectiveSpawns('ancient_obelisks').length));
      for(let index=0;index<allowed;index++)spawnObjectiveEnemy(types[(current.data.activated+index)%types.length],target.x+(Math.random()-.5)*100,target.y+45+(Math.random()-.5)*40,'ancient_obelisks');
      if(current.data.activated===4){
        makeTarget({kind:'ancient_chest',label:'Baú Ancestral',x:320,y:268,radius:22,damageable:false,autoTarget:false,interactive:true,interactionText:'Abrir baú ancestral'});
        deps.spawnNotice(320,206,'UM BAÚ ANCESTRAL FOI REVELADO',0);
      }
    }
    function openAncientChest(target){
      target.dead=true;target.interactive=false;deps.addCoins(18);deps.addXp(24);
      for(const pl of players())pl.hp=Math.min(pl.maxHp,pl.hp+pl.maxHp*.15);
      runtime.parts(target.x,target.y,'#f2cc72',26,90);complete('TESOURO ANCESTRAL RECOLHIDO');
    }

    function chooseDemonAltar(target){
      if(target.decisionMade)return;
      deps.showChoice({title:'Altar Demoníaco',body:'Destruir preserva sua vida. Usar sacrifica 25% da vida atual de cada herói e fortalece toda a run.',options:[
        {id:'destroy',title:'Destruir',detail:'Ataque o altar para obter moedas e experiência.',onChoose:()=>{target.decisionMade=true;target.damageable=true;target.autoTarget=true;target.interactive=false;deps.spawnNotice(target.x,target.y-34,'DESTRUA O ALTAR',0);}},
        {id:'use',title:'Usar',detail:'−25% da vida atual · +20% de dano até o fim da run',costly:true,onChoose:()=>useDemonAltar(target)},
      ]});
    }
    function useDemonAltar(target){
      target.decisionMade=true;target.dead=true;buffs.demonPower=.20;
      for(const pl of players())pl.hp=Math.max(1,pl.hp-pl.hp*.25);
      runtime.parts(target.x,target.y,'#ff3d24',28,100);deps.spawnNotice(target.x,target.y-36,'PACTO INFERNAL: +20% DANO',0);complete();
    }

    function updateFreezing(dt){
      const fires=current.data.fires||[],meters=current.data.meters;
      for(const pl of players()){
        let meter=meters.get(pl);if(!meter){meter={value:0,debuff:false};meters.set(pl,meter);}
        const nearFire=fires.some(fire=>distance(pl,fire)<82);
        meter.value=clamp(meter.value+(nearFire?-18:4.7)*dt,0,100);
        if(meter.value>=100)meter.debuff=true;else if(meter.value<=78)meter.debuff=false;
        pl._campaignFrozenMeter=meter.value;pl._campaignFrozenDebuff=meter.debuff;
      }
    }
    function clearPlayerEnvironmentFlags(){for(const pl of deps.getPlayers()||[]){delete pl._campaignFrozenMeter;delete pl._campaignFrozenDebuff;delete pl._campaignWebSlow;}}

    function updateTremor(dt){
      const data=current.data,ms=dt*1000;data.nextTremor-=ms;
      if(!data.tremor&&data.nextTremor<=0){
        data.tremor={phase:'telegraph',timer:1200,y:238+Math.random()*180,hits:new Set()};data.nextTremor=8500;
        deps.spawnNotice(320,data.tremor.y-36,'O CHÃO ESTREME...',0);
      }
      const tremor=data.tremor;if(!tremor)return;
      tremor.timer-=ms;
      if(tremor.phase==='telegraph'&&tremor.timer<=0){tremor.phase='action';tremor.timer=850;runtime.parts(40,tremor.y,'#d4aa62',18,90);}
      if(tremor.phase==='action'){
        const x=40+(1-tremor.timer/850)*600;
        for(const pl of players())if(!tremor.hits.has(pl)&&Math.abs(pl.y-tremor.y)<42&&Math.abs(pl.x-x)<58){tremor.hits.add(pl);deps.damagePlayer(pl,Math.min(pl.maxHp*.20,18+current.wave*.45));}
        if(tremor.timer<=0)data.tremor=null;
      }
    }

    function updateLastStand(dt){
      const data=current.data;
      if(!data.cleanup){
        data.remaining=Math.max(0,data.remaining-dt*1000);deps.setWaveTimer(data.remaining);
        const elapsed=60000-data.remaining;data.stage=elapsed<20000?1:elapsed<40000?2:elapsed<55000?3:4;
        if(data.remaining<=0){data.cleanup=true;deps.spawnNotice(320,202,'ÚLTIMOS INIMIGOS · NÃO HÁ MAIS REFORÇOS',0);}
      }else if(enemies().length===0){complete('60 SEGUNDOS SOBREVIVIDOS');deps.setWaveTimer(0);deps.requestWaveEnd();}
    }

    function updateSpawners(dt){
      const ms=dt*1000;
      if(current.id==='bone_altars'&&!current.complete){
        current.data.spawnTimer-=ms;
        if(current.data.spawnTimer<=0&&objectiveSpawns().length<6){
          const sources=alive(current.targets);if(sources.length){const source=sources[Math.floor(Math.random()*sources.length)];spawnObjectiveEnemy('skeleton',source.x+(Math.random()-.5)*32,source.y+35);}
          current.data.spawnTimer=4100;
        }
      }else if(current.id==='spider_nests'&&!current.complete){
        current.data.spawnTimer-=ms;
        if(current.data.spawnTimer<=0&&objectiveSpawns().length<8){
          const sources=alive(current.targets);if(sources.length){const source=sources[Math.floor(Math.random()*sources.length)];spawnObjectiveEnemy('spider',source.x+(Math.random()-.5)*38,source.y+32);}
          current.data.spawnTimer=3000;
        }
        for(const pl of players())pl._campaignWebSlow=alive(current.targets).some(nest=>distance(pl,nest)<72) ? .15 : 0;
      }else if(current.id==='infernal_fissures'&&!current.complete){
        current.data.spawnTimer-=ms;
        if(current.data.spawnTimer<=0&&objectiveSpawns().length<8){
          const sources=alive(current.targets);if(sources.length){const source=sources[Math.floor(Math.random()*sources.length)];spawnObjectiveEnemy('fire_imp',source.x+(Math.random()-.5)*34,source.y+38);}
          current.data.spawnTimer=3400;
        }
      }
    }

    function update(dt){
      if(!current.active||!validCampaign())return;
      current.elapsed+=dt*1000;
      for(const target of current.targets)if(target&&!target.dead)target.update(dt);
      updateSpawners(dt);
      if(current.id==='dark_choice'&&!current.data.revealed&&current.elapsed>=current.data.revealAt)revealDarkAltar();
      if(current.id==='webbed_survivor')updateSurvivor(dt);
      if(current.id==='freezing_cold')updateFreezing(dt);
      if(current.id==='tremors')updateTremor(dt);
      if(current.id==='last_stand')updateLastStand(dt);
      for(const pl of players())if(pl.campaignWebTimer>0)pl.campaignWebTimer=Math.max(0,pl.campaignWebTimer-dt*1000);
      for(const enemy of enemies())if(enemy._campaignEmergingMs>0)enemy._campaignEmergingMs=Math.max(0,enemy._campaignEmergingMs-dt*1000);
      updateHeldActions(dt);refreshUi();
    }

    function updateHeldActions(dt){
      for(const [pl,target] of [...heldActions]){
        if(!pl||pl.dead||!target||target.dead||target.lit||distance(pl,target)>target.radius+58){heldActions.delete(pl);continue;}
        target.holdProgress=(target.holdProgress||0)+dt*1000;
        if(target.holdProgress>=target.holdMs){
          heldActions.delete(pl);target.holdProgress=0;target.lit=true;target.interactive=false;current.data.lit++;
          runtime.parts(target.x,target.y,'#7deaff',18,65);deps.spawnNotice(target.x,target.y-32,`FOGUEIRA ${current.data.lit}/3`,0);
          if(current.data.lit===3){buffs.fireBlessing=true;complete('BÊNÇÃO DO FOGO: +8% VELOCIDADE · +10% VS CONGELADOS');}
        }
      }
    }

    function nearestInteractive(pl){
      return alive(current.targets).filter(target=>target.interactive&&distance(pl,target)<=target.radius+58)
        .sort((a,b)=>distance(pl,a)-distance(pl,b))[0]||null;
    }
    function handleActionDown(playerIndex=0){
      if(!current.active||!validCampaign())return false;
      const pl=(deps.getPlayers()||[]).find(item=>item&&!item.dead&&Number(item.idx||0)===Number(playerIndex))||players()[0];
      if(!pl)return false;const target=nearestInteractive(pl);if(!target)return false;
      if(current.id==='dark_choice'){chooseDarkPath();return true;}
      if(current.id==='webbed_survivor'&&current.data.stage==='web'){startSurvivorDefense(target);return true;}
      if(current.id==='lost_fires'){target.holdProgress=target.holdProgress||0;heldActions.set(pl,target);return true;}
      if(current.id==='ancient_obelisks'){if(target.kind==='ancient_chest')openAncientChest(target);else activateObelisk(target);return true;}
      if(current.id==='demon_altar'){chooseDemonAltar(target);return true;}
      return false;
    }
    function handleActionUp(playerIndex=0){
      const pl=(deps.getPlayers()||[]).find(item=>item&&Number(item.idx||0)===Number(playerIndex));
      if(pl&&heldActions.has(pl)){heldActions.delete(pl);return true;}return false;
    }

    function activeDamageModifier(){return modifiers.filter(modifier=>modifier.type==='damage'&&modifierActive(modifier)).reduce((mult,modifier)=>mult*(1+modifier.value),1);}
    function modifyOutgoingDamage(owner,target,amount){
      if(!owner||!Number.isFinite(amount)||deps.isBossRush()||deps.isDungeon())return amount;
      let mult=activeDamageModifier();
      if(buffs.darkChoice==='absorb')mult*=1.15;
      if(buffs.demonPower)mult*=1+buffs.demonPower;
      if(buffs.skeletonKingDamage&&target&&(target.type==='boss_skel_king'||target.constructor?.name==='BossSkeletonKing'))mult*=1+buffs.skeletonKingDamage;
      if(buffs.fireBlessing&&target?.frozen)mult*=1.10;
      return amount*mult;
    }
    function movementMultiplier(pl){
      if(!pl||deps.isBossRush()||deps.isDungeon())return 1;
      let mult=1;
      if(buffs.darkChoice==='purify')mult*=.95;
      if(buffs.fireBlessing&&(Number(deps.getWave())||0)<=15)mult*=1.08;
      if(pl._campaignFrozenDebuff)mult*=.80;
      if(!pl.webbed&&((pl._campaignWebSlow||0)>0||pl.campaignWebTimer>0))mult*=.85;
      for(const modifier of modifiers)if(modifier.type==='move'&&modifierActive(modifier))mult*=1+modifier.value;
      return mult;
    }
    function cooldownDurationMultiplier(pl){
      if(!pl||deps.isBossRush()||deps.isDungeon())return 1;
      let mult=pl._campaignFrozenDebuff?1.10:1;
      for(const modifier of modifiers)if(modifier.type==='cooldown'&&modifierActive(modifier))mult*=1+modifier.value;
      return mult;
    }
    function cooldownRecoveryMultiplier(pl){return 1/cooldownDurationMultiplier(pl);}
    function enemySpeedMultiplier(){return current.id==='bone_altars'&&!current.complete&&alive(current.targets).length?1.10:1;}
    function applyEnemySpeed(enemy){
      if(!enemy||enemy.dead)return;
      if(enemy._campaignObjectiveBaseSpeed==null)enemy._campaignObjectiveBaseSpeed=enemy.speed;
      const emerging=enemy._campaignEmergingMs>0?0:1;
      enemy.speed=enemy._campaignObjectiveBaseSpeed*enemySpeedMultiplier()*emerging;
    }
    function enemyAggroTarget(enemy){return current.id==='webbed_survivor'&&current.data.stage==='defend'?enemy?._campaignNpcAggro||null:null;}
    function onEnemySpawn(enemy){if(current.id==='sandstorm'&&enemy)enemy._campaignEmergingMs=700;}
    function allowNormalSpawns(){return !(current.id==='last_stand'&&current.data.cleanup);}
    function normalSpawnCap(defaultCap){
      if(current.id!=='last_stand'||current.data.cleanup)return defaultCap;
      return Math.min(defaultCap,[defaultCap,13,15,17,18][current.data.stage]||defaultCap);
    }
    function spawnIntervalMultiplier(){return current.id==='last_stand'&&!current.data.cleanup?([1,.92,.76,.62,.48][current.data.stage]||1):1;}
    function controlsWaveTimer(){return current.id==='last_stand'&&!current.complete;}
    function canEndWave(wave){return !current.active||current.wave!==wave||!current.required||current.complete;}

    function onBossSpawn(boss,wave){
      if(!boss||deps.isBossRush())return;
      if(wave===10){
        if(buffs.aracneHpMult<1){boss.hp*=buffs.aracneHpMult;boss.maxHp*=buffs.aracneHpMult;}
        if(buffs.aracneCooldownMult>1)for(const key of ['eggCd','jumpCd','coneCd','webCd'])if(Number.isFinite(boss[key]))boss[key]*=buffs.aracneCooldownMult;
      }
    }
    function onWaveEnd(wave){
      if(current.wave!==wave)return;
      clearPlayerEnvironmentFlags();cleanupCurrent('wave-end');
    }
    function getCombatTargets(){return validCampaign()?alive(current.targets).filter(target=>target.damageable&&target.autoTarget):[];}
    function getCurrentDefinition(){return OBJECTIVE_WAVES[current.wave]||null;}

    function refreshUi(force=false){
      if(!current.active)return;
      const view=buildHud();const signature=JSON.stringify(view);
      if(force||signature!==lastHudSignature){lastHudSignature=signature;deps.setHud(view);}
      const action=buildAction();const actionSignature=JSON.stringify(action);
      if(force||actionSignature!==lastActionSignature){lastActionSignature=actionSignature;deps.setAction(action);}
    }
    function buildHud(){
      const base={kicker:current.required?'OBJETIVO OBRIGATÓRIO':'ENCONTRO DA ONDA',title:current.title,detail:'',progress:undefined};
      if(current.complete)return {...base,detail:'Concluído',progress:1};
      const living=alive(current.targets);
      if(current.id==='bone_altars')return {...base,detail:`Destrua os altares · ${living.length}/3 restantes`,progress:(3-living.length)/3};
      if(current.id==='dark_choice')return {...base,detail:current.data.revealed?'Aproxime-se e escolha um destino compartilhado.':'O ritual está se formando...',progress:current.data.revealed?undefined:current.elapsed/current.data.revealAt};
      if(current.id==='corpse_knight'||current.id==='hunter_spider'){const target=living[0];return {...base,detail:current.id==='corpse_knight'?'Ataque pelas costas; evite a investida e a onda de ossos.':'Observe a fase parcial, desvie e contra-ataque.',progress:target?1-target.hp/target.maxHp:1};}
      if(current.id==='spider_nests')return {...base,detail:`Destrua os ninhos · ${living.length}/4 restantes · teia −15%`,progress:(4-living.length)/4};
      if(current.id==='webbed_survivor'){
        const target=current.data.survivor;
        if(current.data.stage==='web')return {...base,detail:'Opcional: destrua ou interaja com o casulo.'};
        if(current.data.stage==='defend')return {...base,detail:`Defenda o sobrevivente · ${Math.ceil(current.data.remaining/1000)}s`,progress:1-current.data.remaining/current.data.defenseMs,meters:[{label:'VIDA NPC',value:target.hp/target.maxHp,text:`${Math.ceil(target.hp)}/${target.maxHp}`,danger:target.hp/target.maxHp<.3}]};
      }
      if(current.id==='freezing_cold')return {...base,detail:'Fique perto das três fogueiras para reduzir o congelamento.',meters:players().map(pl=>{const meter=current.data.meters.get(pl)||{value:0,debuff:false};return {label:`P${Number(pl.idx||0)+1} FRIO`,value:meter.value/100,text:`${Math.round(meter.value)}%`,danger:meter.debuff};})};
      if(current.id==='lost_fires')return {...base,detail:`Segure a interação para acender · ${current.data.lit}/3`,progress:current.data.lit/3};
      if(current.id==='frozen_gate'){const gate=living[0];return {...base,detail:'Rompa o portão; reforços surgem em 75%, 50% e 25%.',progress:gate?1-gate.hp/gate.maxHp:1};}
      if(current.id==='ancient_obelisks')return {...base,detail:current.data.activated<4?`Ative os obeliscos · ${current.data.activated}/4 · cada um chama uma emboscada`:'Abra o baú ancestral.',progress:current.data.activated/4};
      if(current.id==='sandstorm')return {...base,detail:'Permaneça perto do outro herói. Inimigos emergem sob marcas de areia.'};
      if(current.id==='tremors')return {...base,detail:'Saia da faixa marcada antes da passagem do Devorador.'};
      if(current.id==='infernal_fissures')return {...base,detail:`Sele as fissuras · ${living.length}/3 restantes`,progress:(3-living.length)/3};
      if(current.id==='demon_altar')return {...base,detail:'Opcional: decida entre destruir e usar o altar.'};
      if(current.id==='last_stand')return {...base,detail:current.data.cleanup?'Elimine os sobreviventes. Nenhum novo inimigo surgirá.':`Estágio ${current.data.stage}/4 · ${Math.ceil(current.data.remaining/1000)}s`,progress:1-current.data.remaining/60000};
      return base;
    }
    function buildAction(){
      let best=null,bestPlayer=null;
      for(const pl of players()){
        const target=nearestInteractive(pl);if(!target)continue;
        if(!best||distance(pl,target)<distance(bestPlayer,best)){best=target;bestPlayer=pl;}
      }
      if(!best)return null;
      const key=Number(bestPlayer.idx||0)===0?'E':'ENTER';
      let text=best.interactionText||'Interagir';
      if(best.holdMs){const held=heldActions.has(bestPlayer);text=`${held?'Segure':'Segure para'} ${best.interactionText.toLowerCase()}${held?` · ${Math.round((best.holdProgress||0)/best.holdMs*100)}%`:''}`;}
      return {key,text,mobileLabel:best.holdMs?'SEGURE':'INTERAGIR'};
    }

    function drawTarget(ctx,time,target){
      if(!ctx||target.dead)return;const x=target.x,y=target.y,pulse=.5+.5*Math.sin(time*.006+target.phase);
      ctx.save();
      if(target.flashTimer>0){ctx.shadowBlur=18;ctx.shadowColor='#fff';}
      ctx.globalAlpha=.30;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(x,y+15,target.radius*1.05,target.radius*.34,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      if(target.kind==='bone_altar'){
        ctx.fillStyle='#302b31';ctx.fillRect(x-17,y+3,34,9);ctx.fillStyle='#6e6260';ctx.fillRect(x-13,y-4,26,10);
        ctx.strokeStyle='#d6cfbd';ctx.lineWidth=4;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*9,y);ctx.lineTo(x+side*14,y-25);ctx.stroke();ctx.beginPath();ctx.arc(x+side*14,y-27,4,0,Math.PI*2);ctx.stroke();}
        ctx.fillStyle=`rgba(158,65,181,${.25+pulse*.22})`;ctx.beginPath();ctx.arc(x,y-11,12+pulse*3,0,Math.PI*2);ctx.fill();
      }else if(target.kind==='dark_altar'||target.kind==='demon_altar'){
        const infernal=target.kind==='demon_altar';ctx.fillStyle=infernal?'#42130f':'#24152e';ctx.fillRect(x-21,y+2,42,11);ctx.fillStyle=infernal?'#7a2718':'#57336b';ctx.fillRect(x-16,y-6,32,10);
        ctx.strokeStyle=infernal?'#ff5a2e':'#ba69db';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y-13,10+pulse*3,0,Math.PI*2);ctx.stroke();ctx.fillStyle=infernal?'#ff8b3d':'#d898ec';ctx.fillRect(x-3,y-17,6,9);
      }else if(target.kind==='corpse_knight'){
        const ang=target.facingAngle||0;ctx.fillStyle='#342b38';ctx.fillRect(x-11,y-19,22,34);ctx.fillStyle='#9f404a';ctx.fillRect(x-8,y-15,16,24);ctx.fillStyle='#d5c3a6';ctx.fillRect(x-6,y-26,12,10);
        ctx.save();ctx.translate(x+Math.cos(ang)*18,y+Math.sin(ang)*18);ctx.rotate(ang);ctx.fillStyle='#6a5f6c';ctx.fillRect(-4,-17,8,34);ctx.fillStyle='#a79ba9';ctx.fillRect(-2,-14,4,28);ctx.restore();
        if(target.combatState==='charge_wind'){ctx.globalAlpha=.65;ctx.strokeStyle='#e74e4e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(target.chargeX,target.chargeY);ctx.stroke();ctx.globalAlpha=1;}
        if(target.boneWave){const r=target.boneWave.phase==='telegraph'?48:38+(1-target.boneWave.timer/520)*105;ctx.strokeStyle='#ded2bc';ctx.lineWidth=target.boneWave.phase==='telegraph'?2:5;ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
      }else if(target.kind==='spider_nest'){
        ctx.strokeStyle='rgba(225,238,230,.75)';ctx.lineWidth=1;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*30,y+Math.sin(a)*21);ctx.stroke();}
        ctx.fillStyle='#5b594b';ctx.beginPath();ctx.ellipse(x,y,22,14,0,0,Math.PI*2);ctx.fill();for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#dfe6d9':'#aaa994';ctx.beginPath();ctx.arc(x-12+i*6,y-4+(i%2)*7,5,0,Math.PI*2);ctx.fill();}
      }else if(target.kind==='survivor_web'){
        ctx.strokeStyle='#e0ebe4';ctx.lineWidth=2;for(let i=0;i<7;i++){const a=i*Math.PI/7;ctx.beginPath();ctx.ellipse(x,y,21-i*2,28-i*2,a,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#865b47';ctx.fillRect(x-5,y-8,10,21);ctx.fillStyle='#d7b08a';ctx.fillRect(x-4,y-15,8,8);
      }else if(target.kind==='survivor'){
        ctx.fillStyle='#77533d';ctx.fillRect(x-6,y-10,12,24);ctx.fillStyle='#d8b08a';ctx.fillRect(x-5,y-18,10,9);ctx.fillStyle='#e8d378';ctx.fillRect(x-7,y+9,5,9);ctx.fillRect(x+2,y+9,5,9);
      }else if(target.kind==='hunter_spider'){
        ctx.globalAlpha=target.combatState==='phase_wind'?.42:1;ctx.fillStyle='#262231';ctx.beginPath();ctx.ellipse(x,y,20,15,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#805296';ctx.beginPath();ctx.arc(x,y-6,11,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d8e8df';ctx.lineWidth=3;for(let i=0;i<4;i++){const sy=-9+i*6;ctx.beginPath();ctx.moveTo(x-12,y+sy);ctx.lineTo(x-28,y+sy+(i-1.5)*4);ctx.moveTo(x+12,y+sy);ctx.lineTo(x+28,y+sy+(i-1.5)*4);ctx.stroke();}ctx.globalAlpha=1;
        if(target.combatState==='phase_wind'){ctx.strokeStyle='#f0f6f0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,32+pulse*8,0,Math.PI*2);ctx.stroke();}
      }else if(target.kind==='fire'){
        ctx.fillStyle='#474d58';ctx.fillRect(x-13,y+6,26,6);ctx.fillStyle='#657181';ctx.fillRect(x-9,y+2,18,5);
        if(target.lit){ctx.fillStyle='#4fd5ff';ctx.fillRect(x-7,y-9,14,13);ctx.fillStyle='#c9f8ff';ctx.fillRect(x-4,y-17,8,13);ctx.fillStyle='#fff';ctx.fillRect(x-2,y-20,4,8);const glow=ctx.createRadialGradient(x,y-10,0,x,y-10,42);glow.addColorStop(0,'rgba(105,220,255,.30)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(x-44,y-54,88,88);}else{ctx.fillStyle='#263341';ctx.fillRect(x-6,y-5,12,8);}
        if(target.holdProgress>0&&!target.lit){ctx.strokeStyle='#d7f7ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y-10,28,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(target.holdProgress/target.holdMs,0,1));ctx.stroke();}
      }else if(target.kind==='frozen_gate'){
        ctx.fillStyle='#263a4b';ctx.fillRect(x-target.width/2,y-26,target.width,54);ctx.fillStyle='#5ca2c1';ctx.fillRect(x-target.width/2+7,y-21,target.width-14,45);ctx.fillStyle='#b9efff';for(let i=0;i<6;i++)ctx.fillRect(x-target.width/2+10+i*15,y-18+(i%2)*8,8,34);ctx.strokeStyle='#e9fbff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-25,y-22);ctx.lineTo(x-8,y+5);ctx.lineTo(x-18,y+25);ctx.moveTo(x+22,y-20);ctx.lineTo(x+7,y+8);ctx.lineTo(x+19,y+25);ctx.stroke();
      }else if(target.kind==='obelisk'){
        ctx.fillStyle=target.activated?'#75522b':'#282832';ctx.beginPath();ctx.moveTo(x,y-31);ctx.lineTo(x+13,y+14);ctx.lineTo(x-13,y+14);ctx.closePath();ctx.fill();ctx.strokeStyle=target.activated?'#ffc95e':'#706a80';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=target.activated?'#ffe493':'#514b5f';ctx.fillRect(x-3,y-12,6,12);
      }else if(target.kind==='ancient_chest'){
        ctx.fillStyle='#3c2419';ctx.fillRect(x-23,y-8,46,25);ctx.fillStyle='#9a692d';ctx.fillRect(x-20,y-15,40,28);ctx.fillStyle='#e4b95f';ctx.fillRect(x-3,y-4,6,12);ctx.strokeStyle='#ffd97a';ctx.lineWidth=2;ctx.strokeRect(x-20,y-15,40,28);
      }else if(target.kind==='infernal_fissure'){
        const glow=ctx.createRadialGradient(x,y,0,x,y,38);glow.addColorStop(0,`rgba(255,70,20,${.45+pulse*.25})`);glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(x-40,y-40,80,80);ctx.strokeStyle='#ff5a20';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x-22,y-12);ctx.lineTo(x-7,y-2);ctx.lineTo(x-15,y+14);ctx.lineTo(x+5,y+4);ctx.lineTo(x+20,y+17);ctx.stroke();ctx.strokeStyle='#ffd15c';ctx.lineWidth=2;ctx.stroke();
      }
      if(target.damageable&&target.maxHp>1){const pct=clamp(target.hp/target.maxHp,0,1),width=Math.max(34,target.radius*2);ctx.fillStyle='#120a0b';ctx.fillRect(x-width/2-1,y-target.radius-16,width+2,7);ctx.fillStyle='#5a1417';ctx.fillRect(x-width/2,y-target.radius-15,width,5);ctx.fillStyle=pct>.5?'#73c65f':pct>.25?'#dbb64a':'#e04b4b';ctx.fillRect(x-width/2,y-target.radius-15,width*pct,5);}
      ctx.restore();
    }

    function draw(ctx,time){if(!current.active||!validCampaign())return;for(const target of current.targets)target.draw(ctx,time);drawObjectiveTelegraphs(ctx,time);}
    function drawObjectiveTelegraphs(ctx,time){
      if(current.id==='tremors'&&current.data.tremor){
        const tremor=current.data.tremor;ctx.save();
        if(tremor.phase==='telegraph'){ctx.globalAlpha=.35+.25*Math.sin(time*.025);ctx.strokeStyle='#f2bd6a';ctx.lineWidth=3;ctx.setLineDash([9,7]);ctx.beginPath();ctx.moveTo(30,tremor.y-36);ctx.lineTo(610,tremor.y-36);ctx.lineTo(610,tremor.y+36);ctx.lineTo(30,tremor.y+36);ctx.closePath();ctx.stroke();}
        else{const x=40+(1-tremor.timer/850)*600;ctx.globalAlpha=.75;ctx.fillStyle='#8b6338';ctx.beginPath();ctx.ellipse(x,tremor.y,58,25,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d3a65e';ctx.fillRect(x-28,tremor.y-19,56,15);ctx.fillStyle='#5a371f';ctx.fillRect(x+22,tremor.y-14,26,9);}
        ctx.restore();
      }
      if(current.id==='sandstorm')for(const enemy of enemies())if(enemy._campaignEmergingMs>0){const p=1-enemy._campaignEmergingMs/700;ctx.save();ctx.globalAlpha=.75*(1-p);ctx.strokeStyle='#ffe0a0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(enemy.x,enemy.y,18+p*26,7+p*11,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    }
    function drawOverlay(ctx,time,width=640,height=480){
      if(current.id!=='sandstorm'||!current.active||!ctx)return;
      if(!stormCanvas&&global.document?.createElement){stormCanvas=global.document.createElement('canvas');stormCanvas.width=width;stormCanvas.height=height;stormCtx=stormCanvas.getContext('2d');}
      if(!stormCtx)return;
      if(stormCanvas.width!==width||stormCanvas.height!==height){stormCanvas.width=width;stormCanvas.height=height;}
      stormCtx.clearRect(0,0,width,height);stormCtx.fillStyle=`rgba(186,126,54,${.28+.05*Math.sin(time*.0017)})`;stormCtx.fillRect(0,0,width,height);
      stormCtx.globalCompositeOperation='destination-out';
      for(const pl of players()){
        const radius=gameCoopVisibilityRadius(pl);const gradient=stormCtx.createRadialGradient(pl.x,pl.y,20,pl.x,pl.y,radius);
        gradient.addColorStop(0,'rgba(0,0,0,1)');gradient.addColorStop(.62,'rgba(0,0,0,.86)');gradient.addColorStop(1,'rgba(0,0,0,0)');stormCtx.fillStyle=gradient;stormCtx.fillRect(pl.x-radius,pl.y-radius,radius*2,radius*2);
      }
      stormCtx.globalCompositeOperation='source-over';ctx.drawImage(stormCanvas,0,0);
    }
    function gameCoopVisibilityRadius(pl){const all=players();if(all.length<2)return 116;const other=all.find(item=>item!==pl);return distance(pl,other)<190?128:104;}

    function debugSnapshot(){
      return {wave:current.wave,id:current.id,required:current.required,complete:current.complete,targetCount:alive(current.targets).length,
        buffs:{...buffs},modifiers:modifiers.map(({id,type,value,startsWave,endWave})=>({id,type,value,startsWave,endWave})),
        data:{stage:current.data.stage,lit:current.data.lit,activated:current.data.activated,remaining:current.data.remaining}};
    }

    return Object.freeze({
      resetRun,startWave,update,draw,drawOverlay,cleanup,onWaveEnd,onBossSpawn,onEnemySpawn,
      getCombatTargets,getCurrentDefinition,canEndWave,controlsWaveTimer,allowNormalSpawns,normalSpawnCap,spawnIntervalMultiplier,
      modifyOutgoingDamage,movementMultiplier,cooldownDurationMultiplier,cooldownRecoveryMultiplier,
      enemySpeedMultiplier,applyEnemySpeed,enemyAggroTarget,handleActionDown,handleActionUp,addTimedModifier,debugSnapshot,
    });
  }

  global.CampaignObjectives=Object.freeze({create,CampaignObjectiveTarget,OBJECTIVE_WAVES,POSITIONS});
})(typeof window!=='undefined'?window:globalThis);
