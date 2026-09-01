import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sandbox={console,Math,Date,performance:{now:()=>1000}};sandbox.window=sandbox;sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(read('src/campaign/campaign-objectives.js'),sandbox);
vm.runInContext(read('src/campaign/campaign-events.js'),sandbox);

function rng(seed){
  let value=seed>>>0;
  return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
}

function runCampaign(runIndex){
  const random=rng(0xC0FFEE+runIndex*7919);
  let wave=1,choice=null,coins=80,eventDone=0,maxEnemies=0,maxObjectiveTargets=0;
  const enemies=[];
  const players=[0,1].map(idx=>({idx,x:idx?360:320,y:300,radius:16,hp:120,maxHp:120,dead:false,speed:100,
    gainXP(){},takeDmg(amount){this.hp=Math.max(1,this.hp-(Number(amount)||0));}}));
  const spawnEnemy=(type,x,y,source)=>{
    const enemy={type,x,y,source,hp:100,maxHp:100,speed:55,damage:9,radius:12,dead:false,takeDmg(amount){this.hp-=amount;if(this.hp<=0)this.dead=true;}};
    enemies.push(enemy);maxEnemies=Math.max(maxEnemies,enemies.filter(item=>!item.dead).length);return enemy;
  };
  let objectives;
  const common={
    random,getPlayers:()=>players,getEnemies:()=>enemies,getWave:()=>wave,getArena:()=>wave>=21?'volcano':wave>=16?'desert':wave>=11?'snow':wave>=6?'forest':'crypt',
    isBossRush:()=>false,isDungeon:()=>false,spawnEnemy,spawnParts(){},spawnNotice(){},showChoice:value=>{choice=value;},hideChoice:()=>{choice=null;},setHud(){},setAction(){},now:()=>1000,
  };
  objectives=sandbox.CampaignObjectives.create({...common,isCampaignActive:()=>true,getObjectiveHpScale:()=>1,damagePlayer:(player,amount)=>player.takeDmg(amount),
    addCoins:value=>{coins+=value;},addXp(){},addCampResource(){},setWaveTimer(){},requestWaveEnd(){}});
  const events=sandbox.CampaignEvents.create({...common,getMerlinLevel:()=>2,hasMandatoryObjective:value=>Boolean(sandbox.CampaignObjectives.OBJECTIVE_WAVES[value]?.required),
    setEncounterMode(){},getCoins:()=>coins,spendCoins:value=>{if(coins<value)return false;coins-=value;return true;},addCoins:value=>{coins+=value;},addXp(){},addCampResource(){},
    getBlessingOffers:()=>[{id:'a',name:'A',icon:'✦'},{id:'b',name:'B',icon:'✧'}],applyBlessing:()=>true,addTimedModifier:spec=>objectives.addTimedModifier(spec)});

  function damageAll(){for(const target of objectives.getCombatTargets())target.takeDmg(999999);}
  function resolveObjective(){
    const id=objectives.debugSnapshot().id;
    maxObjectiveTargets=Math.max(maxObjectiveTargets,objectives.debugSnapshot().targetCount);
    if(id==='bone_altars'||id==='spider_nests'||id==='infernal_fissures'){
      for(let tick=0;tick<24;tick++)objectives.update(.5);
      maxEnemies=Math.max(maxEnemies,enemies.filter(item=>!item.dead).length);damageAll();
    }else if(id==='dark_choice'){
      objectives.update(8.1);players[0].x=320;players[0].y=270;objectives.handleActionDown(0);
      choice.options[runIndex%2].onChoose();
    }else if(id==='corpse_knight'||id==='hunter_spider')damageAll();
    else if(id==='webbed_survivor'){
      damageAll();enemies.length=0;objectives.update(22.1);
    }else if(id==='freezing_cold')objectives.update(8);
    else if(id==='lost_fires'){
      for(const [x,y] of sandbox.CampaignObjectives.POSITIONS.frostFires){players[0].x=x;players[0].y=y;objectives.handleActionDown(0);objectives.update(1.8);objectives.handleActionUp(0);}
    }else if(id==='ancient_obelisks'){
      for(const [x,y] of sandbox.CampaignObjectives.POSITIONS.obelisks){players[0].x=x;players[0].y=y;objectives.handleActionDown(0);}
      players[0].x=320;players[0].y=268;objectives.handleActionDown(0);
    }else if(id==='sandstorm')objectives.update(3);
    else if(id==='tremors')objectives.update(6);
    else if(id==='demon_altar'){
      players[0].x=320;players[0].y=265;objectives.handleActionDown(0);
      const option=choice.options.find(item=>item.id===(runIndex%2?'destroy':'use'));option.onChoose();if(option.id==='destroy')damageAll();
    }else if(id==='last_stand'){
      enemies.length=0;objectives.update(60.1);objectives.update(.01);
    }
    if(sandbox.CampaignObjectives.OBJECTIVE_WAVES[wave]?.required)assert.ok(objectives.canEndWave(wave),`run ${runIndex}: objetivo obrigatório ${wave} bloqueado`);
  }

  function resolveEvent(){
    const id=events.debugSnapshot().id;if(!id)return;
    players[0].x=320;players[0].y=id==='profaned_treasure'?330:270;events.handleActionDown(0);
    if(choice){const option=choice.options[0];option.onChoose();}
    if(id==='cursed_chest'){enemies.filter(enemy=>enemy.campaignEventSource===id).forEach(enemy=>{enemy.dead=true;});events.update(.02);}
    if(id==='profaned_treasure')events.update(20.1);
    if(events.isActive())events.cleanup('stress-timeout');
  }

  objectives.resetRun();events.resetRun();
  for(wave=1;wave<=25;wave++){
    players.forEach((player,index)=>{player.x=index?360:320;player.y=300;player.dead=false;player.hp=Math.max(1,player.hp);});
    objectives.startWave(wave);resolveObjective();objectives.onWaveEnd(wave);
    enemies.length=0;
    if(events.tryStartAfterWave(wave,()=>{eventDone++;}))resolveEvent();
    enemies.length=0;
    assert.equal(objectives.debugSnapshot().targetCount,0,`run ${runIndex}: alvo residual após onda ${wave}`);
  }
  const eventState=events.debugSnapshot();
  assert.ok(eventState.completedCount<=3,`run ${runIndex}: mais de três eventos`);
  assert.equal(new Set(eventState.history).size,eventState.history.length,`run ${runIndex}: evento repetido`);
  events.cleanup('run-end');objectives.cleanup('run-end');
  const final=objectives.debugSnapshot();
  assert.equal(final.targetCount,0,`run ${runIndex}: alvos residuais`);
  assert.equal(final.modifiers.length,0,`run ${runIndex}: modificadores residuais`);
  return {run:runIndex,events:eventState.completedCount,eventosConcluidos:eventDone,maxEnemies,maxObjectiveTargets,coins:Math.round(coins),hpP1:Math.round(players[0].hp),hpP2:Math.round(players[1].hp)};
}

const results=[];
for(let run=1;run<=5;run++)results.push(runCampaign(run));
console.log('STRESS DETERMINÍSTICO — 5 CAMPANHAS DE 25 ONDAS');
console.table(results);
console.log('OK: 125 ondas simuladas; objetivos, eventos, limites cooperativos e cleanup terminaram sem estado residual.');
