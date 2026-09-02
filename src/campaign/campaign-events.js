// Eventos opcionais e ponderados entre ondas. Não grava estado no save.
(function(global){
  'use strict';

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const distance=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));
  const EVENT_CHANCE=.25;
  const MAX_EVENTS_PER_RUN=3;
  const CHAPTER_WAVES=new Set([1,6,11,16,21]);
  const EVENT_DEFS=Object.freeze([
    Object.freeze({id:'lost_merchant',title:'Mercador Perdido',kind:'merchant',weight:18,positive:true}),
    Object.freeze({id:'god_altar',title:'Altar dos Deuses',kind:'god_altar',weight:15,positive:true}),
    Object.freeze({id:'mysterious_fountain',title:'Fonte Misteriosa',kind:'fountain',weight:19,positive:false}),
    Object.freeze({id:'cursed_chest',title:'Baú Amaldiçoado',kind:'cursed_chest',weight:15,positive:false}),
    Object.freeze({id:'wandering_spirit',title:'Espírito Errante',kind:'spirit',weight:17,positive:true}),
    Object.freeze({id:'profaned_treasure',title:'Tesouro Profanado',kind:'profaned_treasure',weight:16,positive:false}),
  ]);

  function create(dependencies={}){
    const deps={
      random:Math.random,getPlayers:()=>[],getEnemies:()=>[],getWave:()=>0,getArena:()=>'',getMerlinLevel:()=>0,
      isBossRush:()=>false,isDungeon:()=>false,hasMandatoryObjective:()=>false,setEncounterMode:()=>{},
      spawnEnemy:()=>null,spawnParts:()=>{},spawnNotice:()=>{},setHud:()=>{},setAction:()=>{},showChoice:()=>{},hideChoice:()=>{},
      getCoins:()=>0,spendCoins:()=>false,addCoins:()=>{},addXp:()=>{},addCampResource:()=>{},
      getBlessingOffers:()=>[],applyBlessing:()=>false,addTimedModifier:()=>{},now:()=>Date.now(),
      drawHero:()=>false,drawObject:()=>false,
      ...dependencies,
    };
    let active=null;
    let history=[];
    let completedCount=0;
    let eventSerial=0;
    let lastHudSignature='';
    let lastActionSignature='';

    function players(){return (deps.getPlayers()||[]).filter(player=>player&&!player.dead);}
    function livingEventEnemies(){return (active?.enemies||[]).filter(enemy=>enemy&&!enemy.dead);}
    function resetRun(){cleanup('run-reset');history=[];completedCount=0;eventSerial=0;}
    function eligible(completedWave){
      if(active||deps.isBossRush()||deps.isDungeon()||completedCount>=MAX_EVENTS_PER_RUN)return false;
      if(completedWave<=0||completedWave%5===0||CHAPTER_WAVES.has(completedWave+1))return false;
      if(deps.hasMandatoryObjective(completedWave))return false;
      return true;
    }
    function eventWeight(definition){
      const merlin=clamp(Number(deps.getMerlinLevel())||0,0,5);
      if(definition.positive)return definition.weight*(1+merlin*.18);
      return definition.weight*Math.max(.82,1-merlin*.035);
    }
    function weightedPick(){
      const pool=EVENT_DEFS.filter(definition=>!history.includes(definition.id));
      if(!pool.length)return null;
      let roll=deps.random()*pool.reduce((sum,item)=>sum+eventWeight(item),0);
      for(const item of pool){roll-=eventWeight(item);if(roll<=0)return item;}
      return pool[pool.length-1];
    }
    function tryStartAfterWave(completedWave,onDone){
      if(!eligible(completedWave)||deps.random()>=EVENT_CHANCE)return false;
      const definition=weightedPick();if(!definition)return false;
      start(definition,onDone,completedWave);return true;
    }
    function forceStart(id,onDone=()=>{},completedWave=Number(deps.getWave())||1){
      const definition=EVENT_DEFS.find(item=>item.id===id);if(!definition)return false;
      cleanup('force-replace');start(definition,onDone,completedWave);return true;
    }
    function start(definition,onDone,completedWave){
      active={id:definition.id,title:definition.title,kind:definition.kind,wave:completedWave,elapsed:0,timeout:22000,
        phase:'waiting',node:{id:`event_${++eventSerial}`,kind:definition.kind,x:320,y:270,radius:24,phase:deps.random()*Math.PI*2,dead:false},
        enemies:[],rewards:[],data:{},onDone:typeof onDone==='function'?onDone:()=>{},finished:false};
      if(definition.id==='profaned_treasure'){active.timeout=26000;active.data.duration=20000;active.data.rewardTimer=300;active.data.spawnTimer=1200;}
      history.push(definition.id);completedCount++;
      deps.setEncounterMode(true);deps.spawnNotice(320,200,definition.title.toUpperCase(),0);deps.spawnParts(320,270,eventColor(definition.id),20,80);
      refreshUi(true);
    }
    function cleanup(reason='cleanup'){
      if(!active)return;
      const callback=active.onDone;
      for(const enemy of active.enemies||[]){if(enemy&&!enemy.dead){enemy.noEventReward=true;enemy.dead=true;}}
      active.rewards.length=0;active.node.dead=true;active.finished=true;active=null;
      deps.hideChoice();deps.setHud(null);deps.setAction(null);deps.setEncounterMode(false);
      lastHudSignature='';lastActionSignature='';
      if(reason==='complete')callback();
    }
    function finish(message){if(!active||active.finished)return;if(message)deps.spawnNotice(320,202,message,0);cleanup('complete');}
    function ignore(){finish('EVENTO IGNORADO');}

    function spawnEventEnemy(type,x,y,mutate=null){
      const enemy=deps.spawnEnemy(type,clamp(x,42,598),clamp(y,212,452),`event:${active.id}`);
      if(enemy){enemy.campaignEventSource=active.id;enemy.noEventReward=false;mutate?.(enemy);active.enemies.push(enemy);}
      return enemy;
    }
    function arenaEnemies(){
      const arena=deps.getArena();
      if(arena==='forest')return ['hungry_wolf','spitting_spider','corrupt_ent'];
      if(arena==='snow')return ['ice_zombie','wind_specter','crystal_golem'];
      if(arena==='desert')return ['cultist','obsidian_scorpion','sand_worm_small'];
      if(arena==='volcano')return ['fire_imp','lava_bat','demon_knight'];
      return ['runner_goblin','archer_skeleton','shield_orc'];
    }

    function handleActionDown(playerIndex=0){
      if(!active||active.finished||active.phase==='choice')return false;
      const player=(deps.getPlayers()||[]).find(item=>item&&!item.dead&&Number(item.idx||0)===Number(playerIndex))||players()[0];
      if(!player||distance(player,active.node)>active.node.radius+64)return false;
      if(active.id==='lost_merchant')openMerchant();
      else if(active.id==='god_altar')openGodAltar();
      else if(active.id==='mysterious_fountain')openFountain();
      else if(active.id==='cursed_chest')startCursedFight();
      else if(active.id==='wandering_spirit')openSpiritChoice();
      else if(active.id==='profaned_treasure')startProfanedTreasure();
      return true;
    }
    function handleActionUp(){return !!active;}

    function openMerchant(){
      if(active.phase!=='waiting')return;active.phase='choice';
      const offers=[
        {id:'ration',title:'Ração de Campo · 7🪙',detail:'Cura 35% da vida máxima de cada herói.',cost:7,apply:()=>{for(const pl of players())pl.hp=Math.min(pl.maxHp,pl.hp+pl.maxHp*.35);}},
        {id:'whetstone',title:'Pedra de Amolar · 11🪙',detail:'+8% de dano nas próximas 2 ondas.',cost:11,apply:()=>deps.addTimedModifier({id:`merchant_damage_${active.wave}`,type:'damage',value:.08,waves:2,source:'merchant'})},
        {id:'wind_charm',title:'Talismã do Vento · 9🪙',detail:'+8% de velocidade nas próximas 2 ondas.',cost:9,apply:()=>deps.addTimedModifier({id:`merchant_move_${active.wave}`,type:'move',value:.08,waves:2,source:'merchant'})},
      ];
      deps.showChoice({kicker:'OFERTAS TEMPORÁRIAS · 25% DE DESCONTO',title:'Mercador Perdido',body:`Moedas disponíveis: ${deps.getCoins()} · escolha uma oferta ou siga viagem.`,options:[
        ...offers.map(offer=>({id:offer.id,title:offer.title,detail:offer.detail,onChoose:()=>buyMerchantOffer(offer)})),
        {id:'leave',title:'Seguir viagem',detail:'Não comprar nada.',onChoose:ignore},
      ]});
    }
    function buyMerchantOffer(offer){
      if(!deps.spendCoins(offer.cost)){deps.spawnNotice(320,210,'MOEDAS INSUFICIENTES',0);finish();return;}
      offer.apply();deps.spawnParts(320,270,'#f1c96c',18,70);finish('NEGÓCIO FECHADO');
    }

    function openGodAltar(){
      if(active.phase!=='waiting')return;
      const offers=(deps.getBlessingOffers(2)||[]).slice(0,2);
      if(offers.length<2){finish('O ALTAR PERMANECE SILENCIOSO');return;}
      active.phase='choice';
      deps.showChoice({kicker:'BÊNÇÃO REAL · ESCOLHA 1 DE 2',title:'Altar dos Deuses',body:'A bênção escolhida entra no sistema normal da expedição.',options:[
        ...offers.map(card=>({id:card.id,title:`${card.icon||'✦'} ${card.name}`,detail:`${card.god||''} · ${card.valueText||card.desc||''}`,onChoose:()=>{deps.applyBlessing(card);finish('BÊNÇÃO CONCEDIDA');}})),
        {id:'ignore',title:'Ignorar',detail:'Deixar o altar intacto.',onChoose:ignore},
      ]});
    }

    function openFountain(){
      if(active.phase!=='waiting')return;active.phase='choice';
      deps.showChoice({title:'Fonte Misteriosa',body:'A água reflete possibilidades contraditórias. O resultado é controlado, mas não garantido.',options:[
        {id:'drink',title:'Beber',detail:'Resultados positivos são ligeiramente mais prováveis.',onChoose:drinkFountain},
        {id:'ignore',title:'Ignorar',detail:'Nenhum efeito.',onChoose:ignore},
      ]});
    }
    function drinkFountain(){
      const positiveChance=clamp(.66+(Number(deps.getMerlinLevel())||0)*.05,.66,.86);
      if(deps.random()<positiveChance){
        const outcome=Math.floor(deps.random()*3);
        if(outcome===0){for(const pl of players())pl.hp=Math.min(pl.maxHp,pl.hp+pl.maxHp*.30);finish('ÁGUA REVIGORANTE · VIDA RESTAURADA');}
        else if(outcome===1){deps.addCoins(10);deps.addXp(10);finish('MOEDAS ANTIGAS EMERGEM DA FONTE');}
        else{deps.addTimedModifier({id:`fountain_move_${active.wave}`,type:'move',value:.07,waves:2,source:'fountain'});finish('CORRENTEZA FAVORÁVEL · +7% VELOCIDADE');}
      }else{
        const outcome=deps.random()<.5?'hp':'slow';
        if(outcome==='hp'){for(const pl of players())pl.hp=Math.max(1,pl.hp-pl.maxHp*.12);finish('ÁGUA AMARGA · −12% VIDA');}
        else{deps.addTimedModifier({id:`fountain_slow_${active.wave}`,type:'move',value:-.07,waves:1,source:'fountain'});finish('ÁGUA PESADA · −7% VELOCIDADE NA PRÓXIMA ONDA');}
      }
    }

    function startCursedFight(){
      if(active.phase!=='waiting')return;active.phase='fight';active.timeout=Infinity;
      const types=arenaEnemies(),eliteType=types[2];
      spawnEventEnemy(eliteType,320,230,enemy=>{enemy.isElite=true;enemy.hp=Math.round(enemy.hp*1.55);enemy.maxHp=enemy.hp;enemy.damage*=1.12;});
      for(let index=0;index<3;index++)spawnEventEnemy(types[index%2],220+index*100,330+(index%2)*35);
      deps.spawnNotice(320,198,'A MALDIÇÃO EXIGE COMBATE',0);deps.spawnParts(320,270,'#a947c6',22,85);
    }

    function openSpiritChoice(){
      if(active.phase!=='waiting')return;active.phase='choice';
      deps.showChoice({title:'Espírito Errante',body:'A vontade compartilhada guiará os dois heróis pelas próximas duas ondas.',options:[
        {id:'damage',title:'Fúria',detail:'+10% de dano nas próximas 2 ondas.',onChoose:()=>{deps.addTimedModifier({id:`spirit_damage_${active.wave}`,type:'damage',value:.10,waves:2,source:'spirit'});finish('O ESPÍRITO CONCEDE FÚRIA');}},
        {id:'health',title:'Vigor',detail:'+12% de vida máxima nas próximas 2 ondas.',onChoose:()=>{deps.addTimedModifier({id:`spirit_hp_${active.wave}`,type:'maxHp',value:.12,waves:2,source:'spirit'});finish('O ESPÍRITO CONCEDE VIGOR');}},
      ]});
    }

    function startProfanedTreasure(){
      if(active.phase!=='waiting')return;active.phase='collect';active.timeout=Infinity;active.data.remaining=active.data.duration;
      deps.spawnNotice(320,200,'20 SEGUNDOS · COLETE O QUE PUDER',0);
    }
    function spawnRewardOrb(){
      active.rewards.push({x:160+deps.random()*320,y:245+deps.random()*170,radius:8,life:6500,phase:deps.random()*Math.PI*2,dead:false,value:2});
    }
    function updateProfaned(dt){
      const data=active.data,ms=dt*1000;data.remaining-=ms;data.rewardTimer-=ms;data.spawnTimer-=ms;
      if(data.rewardTimer<=0){spawnRewardOrb();data.rewardTimer=1700;}
      if(data.spawnTimer<=0&&livingEventEnemies().length<6){const types=arenaEnemies();spawnEventEnemy(types[Math.floor(deps.random()*types.length)],80+deps.random()*480,220+deps.random()*220);data.spawnTimer=2700;}
      for(const reward of active.rewards){
        reward.life-=ms;if(reward.life<=0){reward.dead=true;continue;}
        for(const pl of players())if(distance(pl,reward)<pl.radius+reward.radius+5){reward.dead=true;deps.addCoins(reward.value);deps.addXp(2);deps.spawnParts(reward.x,reward.y,'#f4cc61',6,36);break;}
      }
      active.rewards=active.rewards.filter(reward=>!reward.dead);
      if(data.remaining<=0)finish('O TESOURO SE DISSIPA');
    }

    function update(dt){
      if(!active||active.finished)return;
      active.elapsed+=dt*1000;
      if(Number.isFinite(active.timeout)&&active.phase==='waiting'){
        active.timeout-=dt*1000;if(active.timeout<=0){ignore();return;}
      }
      if(active.id==='cursed_chest'&&active.phase==='fight'&&livingEventEnemies().length===0){deps.addCoins(22);deps.addXp(28);deps.addCampResource('pedra',2);finish('MALDIÇÃO QUEBRADA · RECOMPENSA SUPERIOR');return;}
      if(active.id==='profaned_treasure'&&active.phase==='collect'){updateProfaned(dt);if(!active)return;}
      refreshUi();
    }

    function buildHud(){
      if(!active)return null;
      const base={kicker:'EVENTO OPCIONAL',title:active.title,detail:'',progress:undefined};
      if(active.phase==='waiting')return {...base,detail:`Aproxime-se para interagir · desaparece em ${Math.max(0,Math.ceil(active.timeout/1000))}s`,progress:Number.isFinite(active.timeout)?active.timeout/22000:undefined};
      if(active.id==='cursed_chest'&&active.phase==='fight')return {...base,detail:`Quebre a maldição · ${livingEventEnemies().length} inimigo(s) restante(s)`};
      if(active.id==='profaned_treasure'&&active.phase==='collect')return {...base,detail:`Colete recompensas e resista · ${Math.ceil(active.data.remaining/1000)}s`,progress:1-active.data.remaining/active.data.duration};
      return {...base,detail:'Decisão compartilhada em andamento.'};
    }
    function buildAction(){
      if(!active||active.phase!=='waiting')return null;
      let nearest=null,player=null;
      for(const pl of players())if(distance(pl,active.node)<=active.node.radius+64&&(!nearest||distance(pl,active.node)<distance(player,active.node))){nearest=active.node;player=pl;}
      if(!nearest)return null;
      const labels={lost_merchant:'Ver ofertas',god_altar:'Receber bênção',mysterious_fountain:'Examinar fonte',cursed_chest:'Abrir baú',wandering_spirit:'Ouvir espírito',profaned_treasure:'Iniciar coleta'};
      return {key:Number(player.idx||0)===0?'E':'ENTER',text:labels[active.id]||'Interagir',mobileLabel:'INTERAGIR'};
    }
    function refreshUi(force=false){
      if(!active)return;const hud=buildHud(),hudSignature=JSON.stringify(hud);if(force||hudSignature!==lastHudSignature){lastHudSignature=hudSignature;deps.setHud(hud);}
      const action=buildAction(),actionSignature=JSON.stringify(action);if(force||actionSignature!==lastActionSignature){lastActionSignature=actionSignature;deps.setAction(action);}
    }

    function eventColor(id){return {lost_merchant:'#e6bd63',god_altar:'#8ccfff',mysterious_fountain:'#65e0ca',cursed_chest:'#b552d2',wandering_spirit:'#b7a4ff',profaned_treasure:'#ff6742'}[id]||'#fff';}
    function drawNode(ctx,time,node){
      const x=node.x,y=node.y,pulse=.5+.5*Math.sin(time*.006+node.phase),color=eventColor(active.id);ctx.save();
      ctx.globalAlpha=.28;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(x,y+17,30,9,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      if(node.kind==='merchant'){
        ctx.fillStyle='#5a3c2a';ctx.fillRect(x-10,y-14,20,31);ctx.fillStyle='#c49458';ctx.fillRect(x-8,y-26,16,13);ctx.fillStyle='#513b70';ctx.fillRect(x-14,y-15,28,12);ctx.fillStyle='#e4c06b';ctx.fillRect(x-18,y+7,11,12);ctx.fillRect(x+7,y+7,11,12);
      }else if(node.kind==='god_altar'){
        // A quinta arte escolhida pelo usuario ja existe recortada no pacote.
        // O evento usa exatamente esse santuario, sem o placeholder circular.
        const arte=deps.drawObject?.(ctx,'santuario',x,y+30,88);
        if(!arte){ctx.fillStyle='#303442';ctx.fillRect(x-25,y+4,50,14);ctx.fillStyle='#d9c57a';ctx.fillRect(x-17,y-8,34,13);ctx.fillStyle='#fff0aa';ctx.fillRect(x-2,y-29,4,24);ctx.fillRect(x-12,y-19,24,4);}
      }else if(node.kind==='fountain'){
        ctx.fillStyle='#354d57';ctx.beginPath();ctx.ellipse(x,y+8,27,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6ba9b2';ctx.beginPath();ctx.ellipse(x,y+5,21,8,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b7fff1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y+3);ctx.quadraticCurveTo(x+10,y-27,x,y-33);ctx.quadraticCurveTo(x-10,y-27,x,y+3);ctx.stroke();
      }else if(node.kind==='cursed_chest'||node.kind==='profaned_treasure'){
        ctx.fillStyle='#32192f';ctx.fillRect(x-24,y-10,48,28);ctx.fillStyle=node.kind==='cursed_chest'?'#7e328d':'#8a3527';ctx.fillRect(x-21,y-16,42,28);ctx.fillStyle=color;ctx.fillRect(x-3,y-4,6,12);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(x-21,y-16,42,28);
      }else if(node.kind==='spirit'){
        const necromanteDaQuinta=deps.getArena()==='volcano'||active.wave>=21;
        let desenhado=false;
        if(necromanteDaQuinta){
          ctx.save();ctx.globalAlpha=.78;ctx.filter='brightness(1.18) saturate(.78) hue-rotate(24deg)';
          desenhado=!!deps.drawHero?.(ctx,'necromancer',x,y+23,'down','idle',0);ctx.restore();
          if(desenhado){ctx.globalAlpha=.42;ctx.strokeStyle='#9f6cff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+16,18,6,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
        }
        if(!desenhado){ctx.globalAlpha=.70;ctx.fillStyle='#c9baff';ctx.beginPath();ctx.arc(x,y-12,12,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x-13,y-6);ctx.quadraticCurveTo(x-18,y+16,x-5,y+23);ctx.lineTo(x,y+14);ctx.lineTo(x+7,y+23);ctx.quadraticCurveTo(x+18,y+14,x+13,y-6);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(x-5,y-15,3,3);ctx.fillRect(x+3,y-15,3,3);ctx.globalAlpha=1;}
      }
      const glow=ctx.createRadialGradient(x,y,0,x,y,48);glow.addColorStop(0,`${color}44`);glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(x-50,y-50,100,100);ctx.restore();
    }
    function draw(ctx,time){
      if(!active||!ctx)return;drawNode(ctx,time,active.node);
      for(const reward of active.rewards){const bob=Math.sin(time*.008+reward.phase)*3;ctx.save();ctx.shadowBlur=10;ctx.shadowColor='#ffd765';ctx.fillStyle='#f5c64d';ctx.beginPath();ctx.arc(reward.x,reward.y+bob,reward.radius,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff2a8';ctx.fillRect(reward.x-2,reward.y+bob-5,4,5);ctx.restore();}
    }

    function isActive(){return !!active;}
    function blocksNormalWave(){return !!active;}
    function debugSnapshot(){return active?{id:active.id,phase:active.phase,wave:active.wave,enemies:livingEventEnemies().length,rewards:active.rewards.length,history:[...history],completedCount}:{id:null,history:[...history],completedCount};}
    function debugWeights(){return Object.fromEntries(EVENT_DEFS.map(definition=>[definition.id,eventWeight(definition)]));}

    return Object.freeze({resetRun,tryStartAfterWave,forceStart,update,draw,cleanup,isActive,blocksNormalWave,handleActionDown,handleActionUp,debugSnapshot,debugWeights});
  }

  global.CampaignEvents=Object.freeze({create,EVENT_DEFS,EVENT_CHANCE,MAX_EVENTS_PER_RUN});
})(typeof window!=='undefined'?window:globalThis);
