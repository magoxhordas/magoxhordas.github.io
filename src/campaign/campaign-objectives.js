// Objetivos narrativos das ondas 2–24. Todo estado pertence somente a run.
(function(global){
  'use strict';

  /* Arte dos objetos de cenario, ancorada pela BASE, porque os alvos
     guardam a posicao no CHAO. Os ninhos usam as vistas east/west.
     Se a imagem ainda nao carregou, quem chama volta ao
     desenho a mao, que continua ali de reserva. */
  const ARTE_BASE='assets/objects/';
  // As vistas laterais permanecem nos PNGs originais de 48x48. Ignorar a
  // margem transparente no desenho mantém a base no chão e a largura de 48px.
  const ARTE_RECORTES=Object.freeze({
    ninho_east:Object.freeze({x:1,y:12,w:47,h:27}),
    ninho_west:Object.freeze({x:1,y:12,w:47,h:27}),
  });
  const arteCache={};
  function arteObjeto(nome){
    // O modulo tambem roda fora do navegador (os verificadores o carregam
    // num vm sem DOM), e la' nao existe Image. Sem arte, quem chama volta
    // ao desenho a mao.
    if(typeof Image!=='function')return null;
    let im=arteCache[nome];
    if(!im){im=new Image();im.src=ARTE_BASE+nome+'.png';arteCache[nome]=im;}
    return (im.complete&&im.naturalWidth)?im:null;
  }
  /* Tinge o mesmo recorte usado no desenho do objeto. O canvas auxiliar e
     reaproveitado para evitar alocacoes durante o loop de renderizacao. */
  let auxObj=null,auxObjCtx=null;
  function tingirObjeto(ctx,reg,cor,forca){
    if(!reg||typeof document==='undefined')return false;
    const im=arteObjeto(reg.nome);
    if(!im)return false;
    const recorte=ARTE_RECORTES[reg.nome];
    const largura=recorte?recorte.w:im.naturalWidth,altura=recorte?recorte.h:im.naturalHeight;
    const k=reg.largura/largura;
    const w=Math.round(largura*k),h=Math.round(altura*k);
    if(!(w>0&&h>0))return false;
    if(!auxObj){auxObj=document.createElement('canvas');auxObjCtx=auxObj.getContext('2d');}
    if(auxObj.width!==w||auxObj.height!==h){auxObj.width=w;auxObj.height=h;}
    auxObjCtx.clearRect(0,0,w,h);
    auxObjCtx.imageSmoothingEnabled=false;
    auxObjCtx.globalCompositeOperation='source-over';
    if(recorte)auxObjCtx.drawImage(im,recorte.x,recorte.y,recorte.w,recorte.h,0,0,w,h);
    else auxObjCtx.drawImage(im,0,0,w,h);
    auxObjCtx.globalCompositeOperation='source-atop';
    auxObjCtx.fillStyle=cor;auxObjCtx.fillRect(0,0,w,h);
    auxObjCtx.globalCompositeOperation='source-over';
    ctx.save();ctx.globalAlpha=forca;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(auxObj,Math.round(reg.x-w/2),Math.round(reg.yBase-h));
    ctx.restore();
    return true;
  }

  /* Desenha ancorado pela base em (x, yBase). `larguraAlvo` diz quantos
     pixels o objeto deve ocupar na tela; a altura acompanha a proporcao. */
  function desenharObjeto(ctx,nome,x,yBase,larguraAlvo,dono){
    const im=arteObjeto(nome);
    if(!im)return false;
    if(dono)dono._ultimoObjeto={nome,x,yBase,largura:larguraAlvo};
    const recorte=ARTE_RECORTES[nome];
    const largura=recorte?recorte.w:im.naturalWidth,altura=recorte?recorte.h:im.naturalHeight;
    const k=larguraAlvo/largura;
    const w=Math.round(largura*k), h=Math.round(altura*k);
    ctx.save();
    ctx.imageSmoothingEnabled=false;
    if(recorte)ctx.drawImage(im,recorte.x,recorte.y,recorte.w,recorte.h,Math.round(x-w/2),Math.round(yBase-h),w,h);
    else ctx.drawImage(im,Math.round(x-w/2),Math.round(yBase-h),w,h);
    ctx.restore();
    return true;
  }
  /* ── ANIMACAO DOS OBJETOS ──
     A arte nova sao FOTOS: um quadro so', sem folha de animacao. Para elas
     nao ficarem paradas como adesivo, o movimento vem do desenho, e nao de
     sprites novos:

       balanco  — sobe e desce 1-2px, no ritmo de cada objeto;
       respiro  — a largura oscila ~1.5%, como se o objeto inflasse;
       brilho   — uma copia clara por cima, pulsando (so' onde faz sentido).

     Cada objeto ganha uma FASE propria a partir da posicao, entao dois
     altares na mesma tela nao pulsam em uniss..o. Nada disso mexe em
     hitbox, raio de colisao ou vida: o desenho e' o unico afetado. */
  let auxAnim=null,auxAnimCtx=null;
  function desenharObjetoAnimado(ctx,nome,x,yBase,larguraAlvo,dono,tempo,estilo){
    const im=arteObjeto(nome);
    if(!im)return false;
    const e=estilo||{};
    const t=Number(tempo)||0;
    // fase propria por objeto: nada de dois altares pulsando juntos
    const fase=((x*0.37+yBase*0.71)%6.283);
    const balanco=(e.balanco||0)*Math.sin(t*(e.ritmo||0.0016)+fase);
    const respiro=1+(e.respiro||0)*Math.sin(t*(e.ritmo||0.0016)*0.8+fase*1.3);
    const larg=Math.max(1,larguraAlvo*respiro);
    const ok=desenharObjeto(ctx,nome,x,yBase-balanco,larg,dono);
    if(!ok)return false;
    // brilho: a mesma silhueta, clareada e pulsando por cima
    if(e.brilho>0&&typeof document!=='undefined'){
      const recorte=ARTE_RECORTES[nome];
      const lw=recorte?recorte.w:im.naturalWidth, lh=recorte?recorte.h:im.naturalHeight;
      const k=larg/lw, w=Math.round(lw*k), h=Math.round(lh*k);
      if(w>0&&h>0){
        if(!auxAnim){auxAnim=document.createElement('canvas');auxAnimCtx=auxAnim.getContext('2d');}
        if(auxAnim.width!==w||auxAnim.height!==h){auxAnim.width=w;auxAnim.height=h;}
        auxAnimCtx.clearRect(0,0,w,h);
        auxAnimCtx.imageSmoothingEnabled=false;
        auxAnimCtx.globalCompositeOperation='source-over';
        if(recorte)auxAnimCtx.drawImage(im,recorte.x,recorte.y,recorte.w,recorte.h,0,0,w,h);
        else auxAnimCtx.drawImage(im,0,0,w,h);
        auxAnimCtx.globalCompositeOperation='source-atop';
        auxAnimCtx.fillStyle=e.corBrilho||'#ffd88a';
        auxAnimCtx.fillRect(0,0,w,h);
        auxAnimCtx.globalCompositeOperation='source-over';
        const p=0.5+0.5*Math.sin(t*(e.ritmoBrilho||0.0032)+fase);
        ctx.save();
        ctx.globalCompositeOperation='lighter';
        ctx.globalAlpha=e.brilho*(0.45+0.55*p);
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(auxAnim,Math.round(x-w/2),Math.round(yBase-balanco-h));
        ctx.restore();
      }
    }
    return true;
  }

  (function precarregarObjetos(){
    for(const n of ['altar_ossos','ninho','ninho_east','ninho_west','fogueira_off','fogueira_on',
                    'obelisco','santuario','altar_demoniaco','obelisco_deserto_on',
                    'obelisco_deserto_off','bau_antigo','fissura_infernal'])arteObjeto(n);
  })();

  /* Objetos que o heroi NAO atravessa. Ficam de fora a fissura infernal
     (e' uma racha no chao), o casulo do sobrevivente (que se resgata
     chegando perto), os NPCs e a Aranha Cacadora, que anda. */
  const SOLIDOS=Object.freeze(['bone_altar','dark_altar','demon_altar','obelisk','fire','spider_nest','ancient_chest']);

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const distance=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));
  const alive=list=>(list||[]).filter(item=>item&&!item.dead);
  const ALTAR_KINDS=Object.freeze(['bone_altar','dark_altar','demon_altar']);
  const HUNTER_SKILLS=Object.freeze({
    biteDamage:30,biteHpCap:.22,phaseDamage:40,phaseHpCap:.28,chargeDamage:48,chargeHpCap:.32,
    chargeWindMs:800,chargeSpeed:430,chargeDistance:270,chargeRecoverMs:1000,chargeCooldownMs:6500,
    silkWindMs:650,silkLifeMs:6000,silkCooldownMs:8500,silkLimit:3,silkRadius:30,silkRadiusY:20,silkSlow:.30,
  });

  /* As artes importadas retornavam antes da antiga barra generica, entao os
     altares pareciam indestrutiveis. Esta rotina fica separada do desenho do
     sprite para poder ser chamada tanto antes dos retornos das artes quanto
     no caminho procedural. Altares mostram tambem o valor exato: cada um tem
     sua propria vida, e o jogador enxerga qual esta mais perto de cair. */
  function drawTargetHealth(ctx,target,x,barY){
    if(!target?.damageable||!(target.maxHp>1))return;
    const pct=clamp(target.hp/target.maxHp,0,1),altar=ALTAR_KINDS.includes(target.kind);
    const width=Math.max(altar?50:34,target.radius*(altar?2.5:2));
    if(altar){
      const atual=Math.max(0,Math.ceil(target.hp)),maximo=Math.max(1,Math.ceil(target.maxHp));
      ctx.fillStyle='rgba(8,5,11,.86)';ctx.fillRect(x-width/2-2,barY-13,width+4,21);
      ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.textBaseline='top';
      ctx.fillStyle='#160d19';ctx.fillText(`${atual}/${maximo}`,x+1,barY-11);
      ctx.fillStyle='#f4e8ff';ctx.fillText(`${atual}/${maximo}`,x,barY-12);
    }
    ctx.fillStyle='#120a0b';ctx.fillRect(x-width/2-1,barY-1,width+2,7);
    ctx.fillStyle='#5a1417';ctx.fillRect(x-width/2,barY,width,5);
    ctx.fillStyle=pct>.5?'#73c65f':pct>.25?'#dbb64a':'#e04b4b';ctx.fillRect(x-width/2,barY,width*pct,5);
  }
  const OBJECTIVE_WAVES=Object.freeze({
    2:Object.freeze({id:'bone_altars',title:'Altares de Ossos',required:true}),
    3:Object.freeze({id:'dark_choice',title:'O Preço da Escuridão',required:true}),
    4:Object.freeze({id:'brute',title:'Brutamontes',required:true}),
    7:Object.freeze({id:'spider_nests',title:'Ninhos da Matriarca',required:true}),
    8:Object.freeze({id:'webbed_survivor',title:'Sobrevivente Enredado',required:false}),
    9:Object.freeze({id:'hunter_spider',title:'Aranha Caçadora',required:true}),
    12:Object.freeze({id:'freezing_cold',title:'Frio Crescente',required:false}),
    13:Object.freeze({id:'lost_fires',title:'Fogueiras Perdidas',required:true}),
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

    function blankBuffs(){return {darkChoice:null,demonPower:0,skeletonKingDamage:0,aracneHpMult:1,aracneCooldownMult:1,fireBlessing:false,heroiResgatado:null};}
    function blankState(){return {wave:0,id:null,title:'',required:false,complete:true,targets:[],elapsed:0,data:{},active:false};}
    function players(){return alive(deps.getPlayers());}
    function herois(){try{return deps.heroisDisponiveis?.()||[];}catch(_){return [];}}
    function desenharHeroi(ctx,cls,x,pesY,dir,estado,p){
      try{return !!deps.desenharHeroi?.(ctx,cls,x,pesY,dir,estado,p);}catch(_){return false;}
    }
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
        delete enemy._campaignNpcAggro;delete enemy._campaignNpcObjectiveId;delete enemy._campaignNpcAssigned;
        delete enemy._objectiveNpcHit;delete enemy._campaignEmergingMs;
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
      }else if(definition.id==='brute'){
        // O Brutamontes de verdade, e nao um alvo de objetivo: e' a mesma
        // classe da onda 30, com a vida ajustada ao mini-chefe da onda 4
        // (2400 aqui, contra 1800+onda*190 la'). Assim ele
        // chega com os golpes proprios — Salto Esmagador, pedra e furia —
        // e todo o maquinario de chefe do jogo (colisao, dano, desenho,
        // musica) ja' cuida dele sem precisar de nada novo.
        const vida=Math.round(2400*hpScale);
        current.data.bruto=deps.spawnMiniboss?.(vida,14+Number(deps.getWave()||4)*1.6)||null;
        current.data.brutoVida=vida;
        // Se a classe nao existir, o objetivo se completa em vez de travar a onda.
        if(!current.data.bruto)complete();
      }else if(definition.id==='spider_nests'){
        current.data.spawnTimer=1900;
        POSITIONS.spiderNests.forEach(([x,y],index)=>makeTarget({kind:'spider_nest',label:`Ninho ${index+1}`,x,y,artVariant:x<320?'ninho_east':'ninho_west',hp:Math.round(180*hpScale),radius:22,hitColor:'#d9e4d6',onDestroyed:onMandatoryStructureDestroyed}));
      }else if(definition.id==='webbed_survivor'){
        // Quem esta' no casulo e' um dos herois do jogo, sorteado na hora — e o
        // titulo da missao passa a dizer QUEM e'.
        const lista=herois();
        current.data.heroi=lista.length?lista[Math.floor(Math.random()*lista.length)]:{id:'mage',nome:'Sobrevivente'};
        current.title=`Sobrevivente: ${current.data.heroi.nome}`;
        const survivor=makeTarget({kind:'survivor_web',label:'Casulo',x:320,y:270,hp:Math.round(145*hpScale),radius:20,hitColor:'#e4eee6',optional:true,
          interactive:true,interactionText:`Libertar ${current.data.heroi.nome}`,onDepleted:target=>{startSurvivorDefense(target);return true;}});
        current.data.survivor=survivor;current.data.stage='web';current.data.defenseMs=22000;
      }else if(definition.id==='hunter_spider'){
        const hunter=makeTarget({kind:'hunter_spider',label:'Aranha Caçadora',x:320,y:238,hp:Math.round(2400*hpScale),radius:40,healthOffset:96,hitColor:'#d7eee3',
          attackTimer:850,phaseTimer:3000,chargeTimer:4800,silkTimer:1600,silkTraps:[],combatState:'hunt',customUpdate:updateHunterSpider,
          cleanup(){cleanupHunterSpider(this);},
          onDestroyed:target=>{cleanupHunterSpider(target);buffs.aracneCooldownMult=Math.max(buffs.aracneCooldownMult,1.06);complete('ARACNE ENFRAQUECIDA: RECARGAS +6%');}});
        hunter.isElite=true;
      }else if(definition.id==='freezing_cold'){
        current.data.fires=POSITIONS.frostFires.map(([x,y])=>makeTarget({kind:'fire',label:'Fogueira acesa',x,y,radius:20,damageable:false,autoTarget:false,lit:true}));
        current.data.meters=new Map(players().map(pl=>[pl,{value:0,debuff:false}]));
      }else if(definition.id==='lost_fires'){
        current.data.lit=0;
        POSITIONS.frostFires.forEach(([x,y],index)=>makeTarget({kind:'fire',label:`Fogueira ${index+1}`,x,y,radius:20,damageable:false,autoTarget:false,lit:false,interactive:true,holdMs:1750,interactionText:'Acender fogueira'}));
      }else if(definition.id==='ancient_obelisks'){
        current.data.activated=0;
        POSITIONS.obelisks.forEach(([x,y],index)=>makeTarget({kind:'obelisk',label:`Obelisco ${index+1}`,x,y,radius:20,damageable:false,autoTarget:false,interactive:true,activated:false,interactionText:'Ativar obelisco'}));
      }else if(definition.id==='sandstorm'){
        current.data.gust=0;
        // O heroi salvo na onda 8 volta para lutar do seu lado. Ele nao pode
        // morrer: e' recompensa, nao mais um objeto para o jogador defender.
        const salvo=buffs.heroiResgatado;
        if(salvo){
          current.data.aliado=makeTarget({kind:'hero_ally',label:salvo.nome,x:320,y:330,radius:14,
            damageable:false,autoTarget:false,interactive:false,heroi:salvo,
            golpeT:900,passo:0,olhando:'down',atacando:0,customUpdate:updateHeroAlly});
          deps.spawnNotice(320,196,`${salvo.nome.toUpperCase()} VEIO AJUDAR`,0);
        }
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

    function cleanupHunterSpider(target){
      target.silkTraps.length=0;target.charge=null;
      for(const pl of deps.getPlayers()||[])if(pl)delete pl._campaignSilkSlow;
    }

    function updateHunterSilk(target,dt,candidates){
      const ms=dt*1000;
      for(const pl of deps.getPlayers()||[])if(pl)delete pl._campaignSilkSlow;
      for(const trap of target.silkTraps){trap.armMs=Math.max(0,trap.armMs-ms);trap.lifeMs-=ms;}
      target.silkTraps=target.silkTraps.filter(trap=>trap.lifeMs>0);
      for(const trap of target.silkTraps){
        if(trap.armMs>0)continue;
        for(const pl of candidates){
          // A colisão acompanha a elipse desenhada no chão; não causa dano nem imobiliza.
          const rx=HUNTER_SKILLS.silkRadius+(pl.radius||16),ry=HUNTER_SKILLS.silkRadiusY+(pl.radius||16);
          if(Math.hypot((pl.x-trap.x)/rx,(pl.y-trap.y)/ry)<=1)pl._campaignSilkSlow=HUNTER_SKILLS.silkSlow;
        }
      }
    }

    function startHunterSilk(target,nearest){
      const aim=Math.atan2(nearest.y-target.y,nearest.x-target.x);
      for(let i=0;i<HUNTER_SKILLS.silkLimit&&target.silkTraps.length<HUNTER_SKILLS.silkLimit;i++){
        const angle=aim+i*Math.PI*2/3;
        const trap={x:clamp(nearest.x+Math.cos(angle)*76,38,602),y:clamp(nearest.y+Math.sin(angle)*64,234,432),
          armMs:HUNTER_SKILLS.silkWindMs,lifeMs:HUNTER_SKILLS.silkWindMs+HUNTER_SKILLS.silkLifeMs};
        if(target.silkTraps.some(other=>distance(other,trap)<65))continue;
        target.silkTraps.push(trap);
      }
      target.combatState='silk_wind';target.stateTimer=HUNTER_SKILLS.silkWindMs;
      target.silkTimer=HUNTER_SKILLS.silkCooldownMs;
      deps.spawnNotice(target.x,target.y-38,'ARMADILHAS DE SEDA',0);
    }

    function startHunterCharge(target,nearest){
      const dx=nearest.x-target.x,dy=nearest.y-target.y,d=Math.hypot(dx,dy);
      // Trava o destino ANTES do aviso; não persegue o jogador durante a arrancada.
      const nx=d>0?dx/d:0,ny=d>0?dy/d:1,travel=Math.min(HUNTER_SKILLS.chargeDistance,Math.max(120,d+55));
      const end={x:clamp(target.x+nx*travel,target.radius,640-target.radius),y:clamp(target.y+ny*travel,210,456)};
      const length=distance(target,end);
      if(length<45){target.chargeTimer=1000;return false;}
      target.charge={start:{x:target.x,y:target.y},end,length,travelled:0,hit:new Set()};
      target.combatState='charge_wind';target.stateTimer=HUNTER_SKILLS.chargeWindMs;
      target.chargeTimer=HUNTER_SKILLS.chargeCooldownMs;
      deps.spawnNotice(target.x,target.y-38,'INVESTIDA DA CAÇADORA',0);
      return true;
    }

    function hunterSegmentDistance(pl,a,b){
      const dx=b.x-a.x,dy=b.y-a.y,squared=dx*dx+dy*dy;
      const p=squared?clamp(((pl.x-a.x)*dx+(pl.y-a.y)*dy)/squared,0,1):0;
      return Math.hypot(pl.x-a.x-dx*p,pl.y-a.y-dy*p);
    }

    function updateHunterCharge(target,dt,candidates){
      const charge=target.charge,previous={x:target.x,y:target.y};
      charge.travelled=Math.min(charge.length,charge.travelled+HUNTER_SKILLS.chargeSpeed*dt);
      const p=charge.travelled/charge.length;
      target.x=charge.start.x+(charge.end.x-charge.start.x)*p;
      target.y=charge.start.y+(charge.end.y-charge.start.y)*p;
      for(const pl of candidates){
        // Varrimento do trecho percorrido evita atravessar o jogador em frames lentos.
        if(!charge.hit.has(pl)&&hunterSegmentDistance(pl,previous,target)<=target.radius*.75+(pl.radius||16)){
          charge.hit.add(pl);deps.damagePlayer(pl,Math.min(pl.maxHp*HUNTER_SKILLS.chargeHpCap,HUNTER_SKILLS.chargeDamage));
          runtime.parts(pl.x,pl.y,'#edc17d',8,45);
        }
      }
      if(charge.travelled>=charge.length){
        target.combatState='charge_recover';target.stateTimer=HUNTER_SKILLS.chargeRecoverMs;
        target.attackTimer=Math.max(target.attackTimer,600);
        runtime.parts(target.x,target.y,'#ae8b69',10,45);
      }
    }

    function updateHunterSpider(target,dt){
      const ms=dt*1000,candidates=players();
      updateHunterSilk(target,dt,candidates);
      if(!candidates.length)return;
      const nearest=candidates.sort((a,b)=>distance(a,target)-distance(b,target))[0];
      const reach=target.radius+(nearest.radius||16);
      const facingDx=nearest.x-target.x,facingDy=nearest.y-target.y;
      if(!target.combatState.startsWith('charge_'))target.facing=Math.abs(facingDx)>Math.abs(facingDy)?(facingDx>0?'right':'left'):(facingDy>0?'down':'up');
      target.walkFrame=((target.walkFrame||0)+dt*(target.combatState==='charge_dash'?22:8))%9;
      target.phaseTimer-=ms;target.chargeTimer-=ms;target.silkTimer-=ms;
      if(target.combatState==='charge_wind'){
        target.stateTimer=Math.max(0,target.stateTimer-ms);
        if(target.stateTimer===0)target.combatState='charge_dash';
        return;
      }
      if(target.combatState==='charge_dash'){updateHunterCharge(target,dt,candidates);return;}
      if(target.combatState==='charge_recover'||target.combatState==='silk_wind'){
        target.stateTimer=Math.max(0,target.stateTimer-ms);
        if(target.stateTimer===0){
          target.combatState='hunt';target.charge=null;
          target.phaseTimer=Math.max(target.phaseTimer,1200);target.attackTimer=Math.max(target.attackTimer,500);
        }
        return;
      }
      if(target.combatState==='phase_wind'){
        target.stateTimer-=ms;
        if(target.stateTimer<=0){target.x=clamp(nearest.x+(Math.random()-.5)*90,42,598);target.y=clamp(nearest.y-55,215,450);target.combatState='phase_strike';target.stateTimer=500;target.phaseHit=false;runtime.parts(target.x,target.y,'#dceee6',14,65);}
      }else if(target.combatState==='phase_strike'){
        target.stateTimer-=ms;
        if(!target.phaseHit&&distance(target,nearest)<reach+29){target.phaseHit=true;deps.damagePlayer(nearest,Math.min(nearest.maxHp*HUNTER_SKILLS.phaseHpCap,HUNTER_SKILLS.phaseDamage));nearest.campaignWebTimer=Math.max(nearest.campaignWebTimer||0,2400);}
        if(target.stateTimer<=0){target.combatState='hunt';target.phaseTimer=4200;target.chargeTimer=Math.max(target.chargeTimer,1000);}
      }else{
        if(target.chargeTimer<=0&&startHunterCharge(target,nearest))return;
        if(target.silkTimer<=0&&target.silkTraps.length===0){startHunterSilk(target,nearest);return;}
        const angle=Math.atan2(nearest.y-target.y,nearest.x-target.x),d=distance(target,nearest);
        if(d>reach-5){target.x+=Math.cos(angle)*94*dt;target.y+=Math.sin(angle)*94*dt;}
        target.attackTimer-=ms;
        if(d<reach+3&&target.attackTimer<=0){target.attackTimer=950;deps.damagePlayer(nearest,Math.min(nearest.maxHp*HUNTER_SKILLS.biteHpCap,HUNTER_SKILLS.biteDamage));nearest.campaignWebTimer=Math.max(nearest.campaignWebTimer||0,1900);}
        if(target.phaseTimer<=0){target.combatState='phase_wind';target.stateTimer=680;deps.spawnNotice(target.x,target.y-32,'FASE PARCIAL',0);}
      }
      target.x=clamp(target.x,target.radius,640-target.radius);target.y=clamp(target.y,210,456);
    }

    function startSurvivorDefense(target){
      if(current.data.stage!=='web')return;
      current.data.stage='defend';current.data.remaining=current.data.defenseMs;
      target.kind='survivor';target.label=current.data.heroi?.nome||'Sobrevivente';target.heroi=current.data.heroi;
      target.damageable=false;target.autoTarget=false;target.interactive=false;
      target._destroyed=false;target.dead=false;target.hp=120;target.maxHp=120;target.radius=15;target.flashTimer=0;
      current.data.survivorAggroSerial=0;
      runtime.parts(target.x,target.y,'#e8eee6',18,65);deps.spawnNotice(target.x,target.y-34,'DEFENDA O SOBREVIVENTE!',0);
    }
    /* O resgatado: anda atras do jogador mais proximo e bate em quem chega
       perto. Nao leva dano — ele e' recompensa pelo resgate, e nao um novo
       objeto de escolta. */
    function updateHeroAlly(target,dt){
      const alvoJogador=players().sort((a,b)=>distance(a,target)-distance(b,target))[0];
      if(alvoJogador){
        const dx=alvoJogador.x-target.x,dy=alvoJogador.y-target.y,d=Math.hypot(dx,dy);
        if(d>52){
          const v=132*dt;target.x+=dx/d*v;target.y+=dy/d*v;
          target.passo+=Math.hypot(dx/d*v,dy/d*v);
          target.olhando=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
          target.andando=true;
        } else target.andando=false;
      }
      target.x=clamp(target.x,30,610);target.y=clamp(target.y,208,452);
      if(target.atacando>0)target.atacando-=dt*1000;
      target.golpeT-=dt*1000;
      if(target.golpeT<=0){
        const perto=enemies().filter(e=>distance(e,target)<74)
          .sort((a,b)=>distance(a,target)-distance(b,target))[0];
        if(perto){
          target.golpeT=900;target.atacando=340;
          const dx=perto.x-target.x,dy=perto.y-target.y;
          target.olhando=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
          perto.takeDmg?.(16+(Number(deps.getWave())||18)*1.6);
          runtime.parts(perto.x,perto.y,'#ffe6a8',5,34);
        } else target.golpeT=280;
      }
    }

    function damageSurvivor(raw){
      const target=current.data.survivor;
      if(!validCampaign()||current.data.stage!=='defend'||!target||target.dead)return 0;
      const amount=Number(raw);if(!Number.isFinite(amount)||amount<=0)return 0;
      const dano=Math.min(target.hp,Math.max(2,Math.min(10,amount*.32)));
      target.hp=Math.max(0,target.hp-dano);target.flashTimer=180;
      runtime.parts(target.x,target.y,'#ef625c',8,38);
      deps.spawnNotice(target.x+(Math.random()-.5)*12,target.y-48,`-${Math.ceil(dano)}`,0);
      if(target.hp<=0){target.dead=true;current.data.stage='failed';deps.spawnNotice(target.x,target.y-32,'O SOBREVIVENTE CAIU',0);complete();}
      return dano;
    }
    function hitSurvivorWithProjectile(projectile){
      const target=current.data.survivor;
      if(!validCampaign()||current.data.stage!=='defend'||!target||target.dead||!projectile||projectile.dead||projectile.isFriendly||!(projectile.dmg>0))return false;
      if(distance(projectile,target)>=(projectile.radius||0)+target.radius)return false;
      if(!damageSurvivor(projectile.dmg))return false;
      projectile.dead=true;return true;
    }
    function updateSurvivor(dt){
      const target=current.data.survivor;if(!target||current.data.stage!=='defend')return;
      current.data.remaining-=dt*1000;
      for(const enemy of enemies()){
        /* A escolha de alvo precisa ser estavel. Antes dependia de x+y em
           TODO quadro; ao caminhar, o mesmo inimigo alternava entre heroi e
           NPC e parecia ser puxado para perto do jogador depois de um golpe. */
        if(enemy._campaignNpcObjectiveId!==target.id){
          enemy._campaignNpcObjectiveId=target.id;
          const aggroIndex=current.data.survivorAggroSerial||0;
          current.data.survivorAggroSerial=aggroIndex+1;
          enemy._campaignNpcAssigned=(aggroIndex%2)===0;
          enemy._objectiveNpcHit=0;
        }
        const wantsNpc=!!enemy._campaignNpcAssigned;
        enemy._campaignNpcAggro=wantsNpc?target:null;
        if(enemy.frozen||(enemy.isSpecter&&enemy.phased)||enemy.burrowState==='burrowing'||distance(enemy,target)>=enemy.radius+target.radius+3)continue;
        enemy._objectiveNpcHit=(enemy._objectiveNpcHit||0)-dt*1000;
        if(enemy._objectiveNpcHit<=0){
          enemy._objectiveNpcHit=850;
          damageSurvivor(enemy.damage);
          if(target.dead)return;
        }
      }
      if(current.data.remaining<=0){
        current.data.stage='success';target.dead=true;
        // Fica guardado para a run inteira: este heroi reaparece na Tempestade
        // de Areia (onda 18) lutando do seu lado.
        buffs.heroiResgatado=current.data.heroi||null;
        for(const pl of players()){pl.hp=Math.min(pl.maxHp,pl.hp+pl.maxHp*.22);pl.gainXP?.(12);}
        deps.addCoins(12);deps.addCampResource('madeira',2);
        deps.spawnNotice(target.x,target.y-32,`${(current.data.heroi?.nome||'SOBREVIVENTE').toUpperCase()} RESGATADO · ELE VOLTARÁ`,0);complete();
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
    function clearPlayerEnvironmentFlags(){for(const pl of deps.getPlayers()||[]){delete pl._campaignFrozenMeter;delete pl._campaignFrozenDebuff;delete pl._campaignWebSlow;delete pl._campaignSilkSlow;}}

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
      if(current.id==='brute'&&!current.complete&&current.data.bruto){
        const vivo=deps.getMiniboss?.();
        if(!vivo||vivo.dead||vivo!==current.data.bruto){
          buffs.skeletonKingDamage=.08;
          complete('RECOMPENSA: +8% DANO CONTRA O REI CADÁVER');
        }
      }
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
      const webSlow=Math.max(((pl._campaignWebSlow||0)>0||pl.campaignWebTimer>0)? .15:0,pl._campaignSilkSlow||0);
      if(!pl.webbed&&webSlow>0)mult*=1-clamp(webSlow,0,.75);
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
      if(current.id==='brute'){
        const bruto=deps.getMiniboss?.();
        const vivo=bruto&&!bruto.dead&&bruto===current.data.bruto;
        return {...base,detail:'Desvie do Salto Esmagador e das pedras; abaixo de 40% ele entra em fúria.',
                progress:vivo?1-bruto.hp/bruto.maxHp:1};
      }
      if(current.id==='hunter_spider'){const target=living[0];return {...base,detail:'Saia da linha da investida e evite as teias no chão.',progress:target?1-target.hp/target.maxHp:1};}
      if(current.id==='spider_nests')return {...base,detail:`Destrua os ninhos · ${living.length}/4 restantes · teia −15%`,progress:(4-living.length)/4};
      if(current.id==='webbed_survivor'){
        const target=current.data.survivor;
        if(current.data.stage==='web')return {...base,detail:`Opcional: liberte ${current.data.heroi?.nome||'o sobrevivente'} do casulo.`};
        if(current.data.stage==='defend')return {...base,detail:`Defenda o sobrevivente · ${Math.ceil(current.data.remaining/1000)}s`,progress:1-current.data.remaining/current.data.defenseMs,meters:[{label:'VIDA NPC',value:target.hp/target.maxHp,text:`${Math.ceil(target.hp)}/${target.maxHp}`,danger:target.hp/target.maxHp<.3}]};
      }
      if(current.id==='freezing_cold')return {...base,detail:'Fique perto das três fogueiras para reduzir o congelamento.',meters:players().map(pl=>{const meter=current.data.meters.get(pl)||{value:0,debuff:false};return {label:`P${Number(pl.idx||0)+1} FRIO`,value:meter.value/100,text:`${Math.round(meter.value)}%`,danger:meter.debuff};})};
      if(current.id==='lost_fires')return {...base,detail:`Segure a interação para acender · ${current.data.lit}/3`,progress:current.data.lit/3};
      if(current.id==='ancient_obelisks')return {...base,detail:current.data.activated<4?`Ative os obeliscos · ${current.data.activated}/4 · cada um chama uma emboscada`:'Abra o baú ancestral.',progress:current.data.activated/4};
      if(current.id==='sandstorm'){
        const salvo=current.data.aliado?.heroi;
        return {...base,detail:salvo
          ? `${salvo.nome} luta ao seu lado e abre a névoa. Inimigos emergem sob marcas de areia.`
          : 'Permaneça perto do outro herói. Inimigos emergem sob marcas de areia.'};
      }
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

    /* Os objetos de cenario que barram o heroi. O bloqueio usa o raio do
       proprio alvo mais o do heroi (36 a 39px); a interacao alcanca
       raio+58, entao continua dando para acender a fogueira e mexer nos
       altares encostado neles. */
    function getTodosAlvos(){return alive(current.targets);}

    function getSolidTargets(){
      return alive(current.targets).filter(target=>SOLIDOS.indexOf(target.kind)>=0);
    }

    function drawHunterGround(ctx,target){
      ctx.save();
      for(const trap of target.silkTraps){
        const ready=trap.armMs<=0,fade=Math.min(1,trap.lifeMs/650),rx=HUNTER_SKILLS.silkRadius,ry=HUNTER_SKILLS.silkRadiusY;
        ctx.globalAlpha=fade*(ready?1:.45);ctx.fillStyle='rgba(14,24,33,.60)';
        ctx.beginPath();ctx.ellipse(trap.x,trap.y,rx+3,ry+3,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=ready?'#d1e7e9':'#9e99b8';ctx.lineWidth=ready?1.35:1;
        // Fios radiais e três anéis segmentados, sem criar partículas a cada frame.
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(trap.x,trap.y);ctx.lineTo(trap.x+Math.cos(a)*rx,trap.y+Math.sin(a)*ry);ctx.stroke();
        }
        for(let ring=1;ring<=3;ring++){
          const k=ring/3;ctx.beginPath();
          for(let i=0;i<=8;i++){
            const a=i*Math.PI/4,x=trap.x+Math.cos(a)*rx*k,y=trap.y+Math.sin(a)*ry*k;
            if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
          }
          ctx.stroke();
        }
        ctx.fillStyle=ready?'#af7acf':'#e6d5ef';ctx.fillRect(trap.x-2,trap.y-2,4,4);
        if(!ready){
          ctx.strokeStyle='#cda1ed';ctx.lineWidth=2;ctx.beginPath();
          ctx.ellipse(trap.x,trap.y,rx+5,ry+5,0,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-trap.armMs/HUNTER_SKILLS.silkWindMs));ctx.stroke();
        }
      }
      ctx.globalAlpha=1;
      const charge=target.charge;
      if(charge&&(target.combatState==='charge_wind'||target.combatState==='charge_dash')){
        const nx=(charge.end.x-charge.start.x)/charge.length,ny=(charge.end.y-charge.start.y)/charge.length;
        const width=target.radius*.75;
        if(target.combatState==='charge_wind'){
          ctx.fillStyle='rgba(235,156,73,.16)';ctx.strokeStyle='#efb562';ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(charge.start.x-ny*width,charge.start.y+nx*width);
          ctx.lineTo(charge.end.x-ny*width,charge.end.y+nx*width);ctx.lineTo(charge.end.x+ny*width,charge.end.y-nx*width);
          ctx.lineTo(charge.start.x+ny*width,charge.start.y-nx*width);ctx.closePath();ctx.fill();
          ctx.setLineDash([7,5]);ctx.stroke();ctx.setLineDash([]);
          ctx.fillStyle='#ffe0a0';ctx.beginPath();ctx.moveTo(charge.end.x,charge.end.y);
          ctx.lineTo(charge.end.x-nx*17-ny*10,charge.end.y-ny*17+nx*10);
          ctx.lineTo(charge.end.x-nx*17+ny*10,charge.end.y-ny*17-nx*10);ctx.closePath();ctx.fill();
        }else{
          ctx.strokeStyle='#d2b294';ctx.lineWidth=2;
          for(let i=-1;i<=1;i++){
            const offset=i*19;ctx.globalAlpha=.3;
            ctx.beginPath();ctx.moveTo(target.x-nx*36-ny*offset,target.y-ny*36+nx*offset);
            ctx.lineTo(target.x-nx*70-ny*offset,target.y-ny*70+nx*offset);ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    function drawTarget(ctx,time,target){
      if(!ctx||target.dead)return;const x=target.x,y=target.y,pulse=['bone_altar','dark_altar'].includes(target.kind)?.5:.5+.5*Math.sin(time*.006+target.phase);
      if(target.kind==='hunter_spider')drawHunterGround(ctx,target);
      ctx.save();
      if(target.flashTimer>0){ctx.shadowBlur=18;ctx.shadowColor='#fff';}
      ctx.globalAlpha=.30;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(x,y+15,target.radius*1.05,target.radius*.34,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      if(target.kind==='bone_altar'){
        const altarY=y+14;
        if(desenharObjeto(ctx,'altar_ossos',x,altarY,50,target)){
          // O altar fica firme no chao: sem bob e sem brilho pulsante.
          const g=ctx.createRadialGradient(x,y-14,1,x,y-14,25);
          g.addColorStop(0,'rgba(206,142,232,.30)');
          g.addColorStop(1,'rgba(60,10,80,0)');
          ctx.fillStyle=g;ctx.fillRect(x-30,y-40,60,44);
          const chamaH=15;
          ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.52;
          ctx.fillStyle='#b85ee8';ctx.beginPath();ctx.moveTo(x-8,y-9);
          ctx.quadraticCurveTo(x-12,y-20-chamaH*.35,x-2,y-18-chamaH);
          ctx.quadraticCurveTo(x+2,y-10-chamaH*.5,x+8,y-9);ctx.closePath();ctx.fill();
          ctx.fillStyle='#efd1ff';ctx.beginPath();ctx.moveTo(x-3,y-9);
          ctx.quadraticCurveTo(x-4,y-17-chamaH*.3,x+1,y-17-chamaH*.62);
          ctx.quadraticCurveTo(x+5,y-12-chamaH*.2,x+3,y-9);ctx.closePath();ctx.fill();
          ctx.restore();
          for(let i=0;i<4;i++){
            const ciclo=(time*.035+i*17+target.phase*13)%46,fa=(1-ciclo/46)*.48;
            const sx=x-12+i*8+Math.sin(time*.003+i+target.phase)*3,sy=y-12-ciclo*.72;
            ctx.globalAlpha=fa;ctx.fillStyle=i%2?'#f1c9ff':'#a855d6';ctx.fillRect(Math.round(sx),Math.round(sy),2,2);
          }
          ctx.globalAlpha=1;drawTargetHealth(ctx,target,x,y-55);
          ctx.restore();return;
        }
        // base em dois degraus, com o topo mais claro para dar volume
        ctx.fillStyle='#221d24';ctx.fillRect(x-19,y+6,38,8);
        ctx.fillStyle='#39323c';ctx.fillRect(x-17,y+1,34,7);
        ctx.fillStyle='#544a56';ctx.fillRect(x-14,y-5,28,8);
        ctx.fillStyle='#6f6470';ctx.fillRect(x-14,y-5,28,3);
        ctx.fillStyle='#2a242c';ctx.fillRect(x-9,y-2,4,4);ctx.fillRect(x+6,y-1,3,3);   // lascas
        // pilares de osso saindo da base, com cranio no topo
        for(const lado of [-1,1]){
          ctx.fillStyle='#cfc7b2';ctx.fillRect(x+lado*11-2,y-24,4,20);
          ctx.fillStyle='#a89f8b';ctx.fillRect(x+lado*11-2,y-24,2,20);
          ctx.fillStyle='#e2dac4';ctx.fillRect(x+lado*11-4,y-30,8,7);
          ctx.fillStyle='#3a3129';ctx.fillRect(x+lado*11-3,y-28,2,2);ctx.fillRect(x+lado*11+1,y-28,2,2);
          ctx.fillStyle='#c6bda6';ctx.fillRect(x+lado*11-3,y-22,6,2);
        }
        // chama de alma saindo de DENTRO da pedra
        const alt=9+pulse*4;
        const g=ctx.createRadialGradient(x,y-9,1,x,y-9,20+pulse*5);
        g.addColorStop(0,`rgba(214,150,238,${.55+pulse*.25})`);
        g.addColorStop(.5,`rgba(140,52,168,${.30+pulse*.15})`);
        g.addColorStop(1,'rgba(60,10,80,0)');
        ctx.fillStyle=g;ctx.fillRect(x-26,y-34,52,44);
        ctx.fillStyle=`rgba(178,86,206,${.75+pulse*.2})`;
        ctx.fillRect(x-4,y-6-alt,8,alt);
        ctx.fillStyle=`rgba(232,178,250,${.8+pulse*.2})`;
        ctx.fillRect(x-2,y-4-alt,4,alt-2);
        // runas na pedra
        ctx.fillStyle=`rgba(206,142,232,${.4+pulse*.35})`;
        ctx.fillRect(x-11,y-3,3,1);ctx.fillRect(x-2,y-3,4,1);ctx.fillRect(x+8,y-3,3,1);
      }else if(target.kind==='dark_altar'||target.kind==='demon_altar'){
        const altarY=y+16;
        /* O Demoniaco ganhou arte propria. Balanco lento e brilho quente
           pulsando: a foto e' um quadro so', o movimento vem daqui. */
        if(target.kind==='demon_altar'&&desenharObjetoAnimado(ctx,'altar_demoniaco',x,altarY,44,target,time,
             {balanco:1.2,ritmo:0.0013,respiro:0.012,brilho:0.30,corBrilho:'#ff7a3a',ritmoBrilho:0.0042})){
          const g=ctx.createRadialGradient(x,y-14,1,x,y-14,30);
          g.addColorStop(0,'rgba(255,110,40,.30)');
          g.addColorStop(1,'rgba(60,10,0,0)');
          ctx.fillStyle=g;ctx.fillRect(x-36,y-46,72,58);
          ctx.globalAlpha=1;drawTargetHealth(ctx,target,x,y-58);
          ctx.restore();return;
        }
        if(target.kind==='dark_altar'&&desenharObjeto(ctx,'obelisco',x,altarY,40,target)){
          const g=ctx.createRadialGradient(x,y-16,1,x,y-16,29);
          g.addColorStop(0,'rgba(190,120,235,.36)');
          g.addColorStop(1,'rgba(40,10,60,0)');
          ctx.fillStyle=g;ctx.fillRect(x-34,y-46,68,54);
          ctx.globalAlpha=.46;ctx.strokeStyle='#d8a5ff';ctx.lineWidth=1.5;
          ctx.beginPath();ctx.ellipse(x,y+9,17,5,0,0,Math.PI*2);ctx.stroke();
          for(let i=0;i<4;i++){
            const ciclo=(time*.028+i*21+target.phase*9)%54,fa=(1-ciclo/54)*.52;
            const sx=x-13+i*9+Math.sin(time*.0025+i)*2,sy=y+4-ciclo*.82;
            ctx.globalAlpha=fa;ctx.fillStyle=i%2?'#e9c9ff':'#8e46c1';ctx.fillRect(Math.round(sx),Math.round(sy),2,2);
          }
          ctx.globalAlpha=1;drawTargetHealth(ctx,target,x,y-59);
          ctx.restore();return;
        }
        const inf=target.kind==='demon_altar';
        const esc=inf?'#2d0d09':'#180d20', med=inf?'#5c1c12':'#3b2350',
              cla=inf?'#8d3520':'#5d3a78', luz=inf?'#ff6a30':'#c47ce4', luz2=inf?'#ffc06a':'#ecb6ff';
        // plinto em degraus
        ctx.fillStyle=esc;ctx.fillRect(x-22,y+6,44,9);
        ctx.fillStyle=med;ctx.fillRect(x-19,y+1,38,7);
        ctx.fillStyle=cla;ctx.fillRect(x-19,y+1,38,3);
        // coluna com entalhe
        ctx.fillStyle=med;ctx.fillRect(x-11,y-12,22,14);
        ctx.fillStyle=cla;ctx.fillRect(x-11,y-12,22,3);
        ctx.fillStyle=esc;ctx.fillRect(x-7,y-9,14,8);
        ctx.fillStyle=`rgba(${inf?'255,120,60':'190,120,235'},${.35+pulse*.35})`;
        ctx.fillRect(x-5,y-7,10,1);ctx.fillRect(x-5,y-4,10,1);
        // tigela e a chama nascendo dentro dela
        ctx.fillStyle=cla;ctx.fillRect(x-9,y-16,18,5);
        ctx.fillStyle=esc;ctx.fillRect(x-7,y-15,14,3);
        const g=ctx.createRadialGradient(x,y-20,1,x,y-20,24+pulse*6);
        g.addColorStop(0,`rgba(${inf?'255,150,70':'205,140,240'},${.6+pulse*.25})`);
        g.addColorStop(1,`rgba(${inf?'90,20,0':'40,10,60'},0)`);
        ctx.fillStyle=g;ctx.fillRect(x-30,y-46,60,42);
        const h=11+pulse*5;
        ctx.fillStyle=luz;ctx.fillRect(x-4,y-16-h,8,h);
        ctx.fillStyle=luz2;ctx.fillRect(x-2,y-14-h,4,h-3);
        // fagulhas subindo
        for(let i=0;i<3;i++){
          const fy=y-20-((time*.05+i*23)%30), fa=1-((time*.05+i*23)%30)/30;
          ctx.globalAlpha=fa*.7;ctx.fillStyle=luz2;
          ctx.fillRect(x-6+i*5+Math.sin(time*.004+i)*2,fy,2,2);
        }
        ctx.globalAlpha=1;
      }else if(target.kind==='corpse_knight'){
        const ang=target.facingAngle||0;
        const bob=Math.sin(time*.0032+target.phase)*1.4;           // respiro
        const balanco=Math.sin(time*.0026+target.phase)*2.2;       // capa
        ctx.save();ctx.translate(0,bob);
        // capa esfarrapada, atras de tudo
        ctx.fillStyle='#4b1620';
        ctx.beginPath();ctx.moveTo(x-12,y-22);ctx.lineTo(x+12,y-22);
        ctx.lineTo(x+13+balanco,y+12);ctx.lineTo(x+7+balanco,y+7);ctx.lineTo(x+3+balanco,y+15);
        ctx.lineTo(x-2+balanco,y+6);ctx.lineTo(x-7+balanco,y+14);ctx.lineTo(x-13+balanco,y+11);
        ctx.closePath();ctx.fill();
        ctx.fillStyle='#33101a';ctx.fillRect(x-12,y-22,24,5);
        // pernas: grevas escuras com joelheira
        ctx.fillStyle='#2b2530';ctx.fillRect(x-8,y+2,6,15);ctx.fillRect(x+2,y+2,6,15);
        ctx.fillStyle='#4a4152';ctx.fillRect(x-8,y+2,6,4);ctx.fillRect(x+2,y+2,6,4);
        ctx.fillStyle='#171319';ctx.fillRect(x-9,y+15,8,4);ctx.fillRect(x+1,y+15,8,4);
        // peitoral rompido, com costelas aparecendo
        ctx.fillStyle='#3a3040';ctx.fillRect(x-10,y-18,20,21);
        ctx.fillStyle='#0f0b12';ctx.fillRect(x-5,y-13,10,12);          // buraco na armadura
        ctx.fillStyle='#cbbda2';
        for(let i=0;i<3;i++){ctx.fillRect(x-4,y-12+i*4,8,2);}          // costelas
        ctx.fillStyle='#8e2f3c';ctx.fillRect(x-10,y-18,20,4);          // tabardo
        ctx.fillStyle='#b8434f';ctx.fillRect(x-2,y-18,4,20);
        // ombreiras com espinho
        for(const lado of [-1,1]){
          ctx.fillStyle='#544a5e';ctx.fillRect(x+lado*13-4,y-20,8,8);
          ctx.fillStyle='#6d6178';ctx.fillRect(x+lado*13-4,y-20,8,3);
          ctx.fillStyle='#8f8399';ctx.beginPath();ctx.moveTo(x+lado*15,y-20);
          ctx.lineTo(x+lado*19,y-27);ctx.lineTo(x+lado*12,y-21);ctx.closePath();ctx.fill();
        }
        // elmo com chifres e olhos acesos
        ctx.fillStyle='#4a4152';ctx.fillRect(x-8,y-31,16,13);
        ctx.fillStyle='#2b2530';ctx.fillRect(x-8,y-24,16,4);            // viseira
        ctx.fillStyle='#635871';ctx.fillRect(x-8,y-31,16,3);
        for(const lado of [-1,1]){
          ctx.fillStyle='#8d8296';ctx.beginPath();ctx.moveTo(x+lado*7,y-30);
          ctx.lineTo(x+lado*14,y-38);ctx.lineTo(x+lado*8,y-27);ctx.closePath();ctx.fill();
        }
        const brilho=.55+.45*Math.sin(time*.006+target.phase);
        ctx.fillStyle=`rgba(255,86,60,${brilho})`;
        ctx.fillRect(x-6,y-24,4,3);ctx.fillRect(x+2,y-24,4,3);
        ctx.globalAlpha=.35*brilho;ctx.fillStyle='#ff5a3c';
        ctx.fillRect(x-7,y-25,6,5);ctx.fillRect(x+1,y-25,6,5);ctx.globalAlpha=1;
        // espada: lamina, guarda e cabo, girando com a investida
        ctx.save();ctx.translate(x+Math.cos(ang)*19,y+Math.sin(ang)*19);ctx.rotate(ang+Math.PI/2);
        ctx.fillStyle='#1d1a22';ctx.fillRect(-4,-20,8,40);             // contorno
        ctx.fillStyle='#7b7286';ctx.fillRect(-3,-19,6,32);             // lamina
        ctx.fillStyle='#bdb2c8';ctx.fillRect(-1,-18,2,30);             // fio
        ctx.fillStyle='#8e2f3c';ctx.fillRect(-9,11,18,4);              // guarda
        ctx.fillStyle='#3a3040';ctx.fillRect(-2,15,4,8);               // cabo
        ctx.fillStyle='#d8a349';ctx.fillRect(-3,22,6,3);               // pomo
        ctx.restore();
        ctx.restore();
        if(target.combatState==='charge_wind'){ctx.globalAlpha=.65;ctx.strokeStyle='#e74e4e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(target.chargeX,target.chargeY);ctx.stroke();ctx.globalAlpha=1;}
        if(target.boneWave){const r=target.boneWave.phase==='telegraph'?48:38+(1-target.boneWave.timer/520)*105;ctx.strokeStyle='#ded2bc';ctx.lineWidth=target.boneWave.phase==='telegraph'?2:5;ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
      }else if(target.kind==='spider_nest'){
        // os fios saem por BAIXO do ninho: sao eles que amarram o objeto ao
        // chao e explicam a lentidao de quem chega perto
        ctx.strokeStyle='rgba(225,238,230,.75)';ctx.lineWidth=1;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x,y+6);ctx.lineTo(x+Math.cos(a)*30,y+6+Math.sin(a)*21);ctx.stroke();}
        // Vistas laterais voltadas para o centro, fixas durante toda a onda.
        if(desenharObjeto(ctx,target.artVariant||'ninho_east',x,y+16,48,target)||desenharObjeto(ctx,'ninho',x,y+16,48,target)){ctx.restore();return;}
        ctx.fillStyle='#5b594b';ctx.beginPath();ctx.ellipse(x,y,22,14,0,0,Math.PI*2);ctx.fill();for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#dfe6d9':'#aaa994';ctx.beginPath();ctx.arc(x-12+i*6,y-4+(i%2)*7,5,0,Math.PI*2);ctx.fill();}
      }else if(target.kind==='survivor_web'){
        ctx.strokeStyle='#e0ebe4';ctx.lineWidth=2;for(let i=0;i<7;i++){const a=i*Math.PI/7;ctx.beginPath();ctx.ellipse(x,y,21-i*2,28-i*2,a,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#865b47';ctx.fillRect(x-5,y-8,10,21);ctx.fillStyle='#d7b08a';ctx.fillRect(x-4,y-15,8,8);
      }else if(target.kind==='survivor'||target.kind==='hero_ally'){
        const aliado=target.kind==='hero_ally';
        const lado=aliado?(target.olhando==='left'||target.olhando==='right'?'side':(target.olhando==='up'?'up':'down')):'down';
        const estado=aliado?(target.atacando>0?'atk':(target.andando?'walk':'idle')):'idle';
        const prog=target.atacando>0?1-target.atacando/340:0;
        ctx.save();
        if(!aliado&&target.flashTimer>0){
          ctx.translate(Math.sin(time*.12)*2.2,0);
          ctx.filter='brightness(1.65) sepia(.8) saturate(5) hue-rotate(315deg)';
        }
        if(aliado&&target.olhando==='right'){ctx.translate(x*2,0);ctx.scale(-1,1);}
        const px=(aliado&&target.olhando==='right')?x:x;
        if(!desenharHeroi(ctx,target.heroi?.id||'mage',px,y+13,lado,estado,prog)){
          ctx.fillStyle='#77533d';ctx.fillRect(x-6,y-10,12,24);ctx.fillStyle='#d8b08a';ctx.fillRect(x-5,y-18,10,9);ctx.fillStyle='#e8d378';ctx.fillRect(x-7,y+9,5,9);ctx.fillRect(x+2,y+9,5,9);
        }
        ctx.restore();
        if(!aliado){
          const vida=clamp(target.hp/target.maxHp,0,1),largura=34;
          ctx.fillStyle='#18090b';ctx.fillRect(x-largura/2-1,y-51,largura+2,6);
          ctx.fillStyle='#5a1417';ctx.fillRect(x-largura/2,y-50,largura,4);
          ctx.fillStyle=vida>.3?'#70cf67':'#ef4d54';ctx.fillRect(x-largura/2,y-50,largura*vida,4);
        }
        if(aliado){ctx.globalAlpha=.5+.2*Math.sin(time*.005);ctx.strokeStyle='#ffdf9a';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(x,y+14,15,6,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
      }else if(target.kind==='hunter_spider'){
        const emFase=target.combatState==='phase_wind',golpe=target.combatState==='phase_strike';
        const prepara=target.combatState==='charge_wind',tecendo=target.combatState==='silk_wind',recupera=target.combatState==='charge_recover';
        const dir=target.facing==='up'?'up':target.facing==='down'?'down':'side';
        const flip=target.facing==='right';
        const estado=golpe||tecendo?'hit':emFase||prepara||recupera?'idle':'walk';
        const quadro=golpe?Math.floor((1-target.stateTimer/500)*8):tecendo?Math.floor((1-target.stateTimer/HUNTER_SKILLS.silkWindMs)*8):Math.floor(target.walkFrame||0);
        ctx.globalAlpha=emFase?.48:1;
        ctx.save();
        if(prepara){ctx.translate(x,y+34);ctx.scale(1,.84);ctx.translate(-x,-y-34);}
        // Corpo visivel ~122px: o mesmo porte da Aracne (42px * 2.9).
        // A Caçadora preserva sua arte, cujo corpo ocupa 26px no quadro.
        const sprite=global.InimigosNormais?.desenhar?.(ctx,'spitting_spider',x,y+34,dir,estado,quadro,flip,3.2);
        if(!sprite){ctx.fillStyle='#262231';ctx.beginPath();ctx.ellipse(x,y,50,37,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#805296';ctx.beginPath();ctx.arc(x,y-15,27,0,Math.PI*2);ctx.fill();}
        ctx.restore();
        ctx.globalAlpha=1;
        if(target.combatState==='phase_wind'){ctx.strokeStyle='#f0f6f0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,target.radius+9+pulse*8,0,Math.PI*2);ctx.stroke();}
        if(recupera){ctx.fillStyle='#ffe1a4';for(let i=0;i<3;i++)ctx.fillRect(x-9+i*8,y-69,3,3);}
      }else if(target.kind==='fire'){
        // a arte veio em par: o mesmo braseiro apagado e aceso. As duas
        // larguras-alvo saem do MESMO fator de escala, senao a pedra mudava
        // de tamanho na hora de acender.
        const arte=desenharObjeto(ctx,target.lit?'fogueira_on':'fogueira_off',x,y+14,target.lit?32:36,target);
        if(arte&&target.lit){
          const glow=ctx.createRadialGradient(x,y-12,0,x,y-12,40+pulse*8);
          glow.addColorStop(0,`rgba(105,220,255,${.26+pulse*.14})`);glow.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=glow;ctx.fillRect(x-46,y-56,92,90);
        }
        if(arte){
          if(target.holdProgress>0&&!target.lit){ctx.strokeStyle='#d7f7ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y-10,28,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(target.holdProgress/target.holdMs,0,1));ctx.stroke();}
          ctx.restore();return;
        }
        ctx.fillStyle='#474d58';ctx.fillRect(x-13,y+6,26,6);ctx.fillStyle='#657181';ctx.fillRect(x-9,y+2,18,5);
        if(target.lit){ctx.fillStyle='#4fd5ff';ctx.fillRect(x-7,y-9,14,13);ctx.fillStyle='#c9f8ff';ctx.fillRect(x-4,y-17,8,13);ctx.fillStyle='#fff';ctx.fillRect(x-2,y-20,4,8);const glow=ctx.createRadialGradient(x,y-10,0,x,y-10,42);glow.addColorStop(0,'rgba(105,220,255,.30)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(x-44,y-54,88,88);}else{ctx.fillStyle='#263341';ctx.fillRect(x-6,y-5,12,8);}
        if(target.holdProgress>0&&!target.lit){ctx.strokeStyle='#d7f7ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y-10,28,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(target.holdProgress/target.holdMs,0,1));ctx.stroke();}
      }else if(target.kind==='obelisk'){
        const on=target.activated;
        /* Os dois estados dividem a MESMA moldura (34x52), entao acender
           nao muda o tamanho do objeto — so' a luz. */
        if(desenharObjetoAnimado(ctx,on?'obelisco_deserto_on':'obelisco_deserto_off',x,y+17,32,target,time,
             on?{balanco:1.0,ritmo:0.0015,respiro:0.010,brilho:0.34,corBrilho:'#ffd77a',ritmoBrilho:0.0038}
               :{balanco:0.5,ritmo:0.0009,respiro:0.006,brilho:0})){
          if(on){
            const g=ctx.createRadialGradient(x,y-10,1,x,y-10,26);
            g.addColorStop(0,`rgba(255,214,122,${.22+pulse*.16})`);
            g.addColorStop(1,'rgba(60,40,0,0)');
            ctx.fillStyle=g;ctx.fillRect(x-30,y-38,60,50);
          }
          ctx.globalAlpha=1;drawTargetHealth(ctx,target,x,y-46);
          ctx.restore();return;
        }
        // plinto
        ctx.fillStyle='#231f28';ctx.fillRect(x-15,y+10,30,7);
        ctx.fillStyle=on?'#5a4326':'#332e3c';ctx.fillRect(x-13,y+5,26,6);
        ctx.fillStyle=on?'#7d5f33':'#413b4c';ctx.fillRect(x-13,y+5,26,2);
        // monolito afunilado, com face iluminada e face na sombra
        ctx.fillStyle=on?'#6b4d28':'#2b2733';
        ctx.beginPath();ctx.moveTo(x,y-33);ctx.lineTo(x+11,y+6);ctx.lineTo(x-11,y+6);ctx.closePath();ctx.fill();
        ctx.fillStyle=on?'#8a6533':'#3a3547';
        ctx.beginPath();ctx.moveTo(x,y-33);ctx.lineTo(x+11,y+6);ctx.lineTo(x+2,y+6);ctx.lineTo(x,y-33);ctx.closePath();ctx.fill();
        // faixas entalhadas
        ctx.fillStyle=on?'#4b3419':'#1e1a26';
        for(let i=0;i<3;i++){const yy=y-18+i*10,w=5+i*3;ctx.fillRect(x-w,yy,w*2,2);}
        // glifo central
        const b=on?(.6+pulse*.4):.16;
        ctx.fillStyle=on?`rgba(255,214,122,${b})`:'#4b4557';
        ctx.fillRect(x-3,y-14,6,3);ctx.fillRect(x-1,y-11,2,9);ctx.fillRect(x-4,y-4,8,2);
        if(on){
          const g=ctx.createRadialGradient(x,y-12,1,x,y-12,30+pulse*8);
          g.addColorStop(0,`rgba(255,198,92,${.35+pulse*.2})`);g.addColorStop(1,'rgba(90,50,0,0)');
          ctx.fillStyle=g;ctx.fillRect(x-38,y-46,76,60);
        }
      }else if(target.kind==='ancient_chest'){
        /* Bau: respiro bem curto e brilho ARCANO. A arte e' um bau roxo
           com cranio e runas, entao o brilho segue a paleta dela — dourado
           brigaria com a propria pintura. */
        if(desenharObjetoAnimado(ctx,'bau_antigo',x,y+17,46,target,time,
             {balanco:0.8,ritmo:0.0011,respiro:0.008,brilho:0.26,corBrilho:'#c86bff',ritmoBrilho:0.0030})){
          ctx.globalAlpha=1;drawTargetHealth(ctx,target,x,y-26);
          ctx.restore();return;
        }
        // corpo
        ctx.fillStyle='#2a1810';ctx.fillRect(x-22,y-4,44,21);
        ctx.fillStyle='#6d4823';ctx.fillRect(x-21,y-3,42,19);
        ctx.fillStyle='#8a5c2d';ctx.fillRect(x-21,y-3,42,4);
        // tampa abaulada
        ctx.fillStyle='#7d5527';ctx.fillRect(x-21,y-16,42,13);
        ctx.fillStyle='#9c6c33';ctx.fillRect(x-19,y-18,38,4);
        ctx.fillStyle='#5a3a1c';ctx.fillRect(x-21,y-5,42,2);
        // cintas de metal
        ctx.fillStyle='#3f3a33';
        for(const off of [-14,14]){ctx.fillRect(x+off-2,y-18,4,35);}
        ctx.fillStyle='#5d564c';
        for(const off of [-14,14]){ctx.fillRect(x+off-2,y-18,2,35);}
        // fechadura com brilho
        ctx.fillStyle='#3a3229';ctx.fillRect(x-5,y-8,10,11);
        ctx.fillStyle=`rgba(240,198,102,${.7+pulse*.3})`;ctx.fillRect(x-4,y-7,8,9);
        ctx.fillStyle='#2a1c0c';ctx.fillRect(x-1,y-4,2,4);
        const g=ctx.createRadialGradient(x,y-4,1,x,y-4,26+pulse*6);
        g.addColorStop(0,`rgba(255,206,110,${.22+pulse*.16})`);g.addColorStop(1,'rgba(80,50,0,0)');
        ctx.fillStyle=g;ctx.fillRect(x-32,y-32,64,52);
      }else if(target.kind==='infernal_fissure'){
        /* A fissura e' uma racha NO CHAO: nada de balanco vertical, que a
           faria parecer flutuando. So' respiro e brasa pulsando. */
        if(desenharObjetoAnimado(ctx,'fissura_infernal',x,y+12,52,target,time,
             {balanco:0,ritmo:0.0018,respiro:0.016,brilho:0.34,corBrilho:'#ff5a20',ritmoBrilho:0.0050})){
          const g=ctx.createRadialGradient(x,y,0,x,y,34);
          g.addColorStop(0,`rgba(255,70,20,${.30+pulse*.18})`);
          g.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=g;ctx.fillRect(x-36,y-24,72,48);
          ctx.globalAlpha=1;drawTargetHealth(ctx,target,x,y-26);
          ctx.restore();return;
        }
        const glow=ctx.createRadialGradient(x,y,0,x,y,38);glow.addColorStop(0,`rgba(255,70,20,${.45+pulse*.25})`);glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(x-40,y-40,80,80);ctx.strokeStyle='#ff5a20';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x-22,y-12);ctx.lineTo(x-7,y-2);ctx.lineTo(x-15,y+14);ctx.lineTo(x+5,y+4);ctx.lineTo(x+20,y+17);ctx.stroke();ctx.strokeStyle='#ffd15c';ctx.lineWidth=2;ctx.stroke();
      }
      drawTargetHealth(ctx,target,x,y-(target.healthOffset||target.radius+15));
      ctx.restore();
    }

    function draw(ctx,time){if(!current.active||!validCampaign())return;for(const target of current.targets)target.draw(ctx,time);drawObjectiveTelegraphs(ctx,time);}
    function drawObjectiveTelegraphs(ctx,time){
      if(current.id==='tremors'&&current.data.tremor){
        const tremor=current.data.tremor;ctx.save();
        if(tremor.phase==='telegraph'){
          ctx.globalAlpha=.62;ctx.strokeStyle='#f2bd6a';ctx.lineWidth=2;ctx.setLineDash([8,7]);
          ctx.beginPath();ctx.moveTo(30,tremor.y-36);ctx.lineTo(610,tremor.y-36);ctx.lineTo(610,tremor.y+36);ctx.lineTo(30,tremor.y+36);ctx.closePath();ctx.stroke();
          ctx.setLineDash([]);ctx.strokeStyle='#8f5c32';
          for(let x=42;x<610;x+=32){const off=Math.sin(x*.17+time*.018)*4;ctx.beginPath();ctx.moveTo(x,tremor.y+off);ctx.lineTo(x+9,tremor.y-6+off);ctx.lineTo(x+17,tremor.y+3+off);ctx.stroke();}
        }else{
          const x=40+(1-tremor.timer/850)*600,progresso=1-tremor.timer/850;
          ctx.globalAlpha=.72;ctx.fillStyle='#4b2d19';ctx.beginPath();ctx.ellipse(x,tremor.y+14,42,14,0,0,Math.PI*2);ctx.fill();
          ctx.globalAlpha=1;
          const quadro=Math.min(8,Math.floor(progresso*9));
          const sprite=global.InimigosNormais?.desenhar?.(ctx,'sand_worm_small',x,tremor.y+26,'side','surge',quadro,true,1.75);
          if(!sprite){ctx.fillStyle='#8b6338';ctx.beginPath();ctx.ellipse(x,tremor.y,34,22,0,0,Math.PI*2);ctx.fill();}
          ctx.fillStyle='#d3a65e';for(let i=0;i<5;i++){const a=i*1.37+time*.006,r=28+(i%2)*9;ctx.fillRect(x+Math.cos(a)*r-2,tremor.y+Math.sin(a)*12,4,4);}
        }
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
      // O resgatado abre um circulo proprio: e' o sentido de 'permaneca perto
      // do outro heroi' valendo tambem para quem joga sozinho.
      const focos=players().map(pl=>({x:pl.x,y:pl.y,r:gameCoopVisibilityRadius(pl)}));
      const aliado=current.data.aliado;
      if(aliado&&!aliado.dead)focos.push({x:aliado.x,y:aliado.y,r:96});
      for(const foco of focos){
        const radius=foco.r;const gradient=stormCtx.createRadialGradient(foco.x,foco.y,20,foco.x,foco.y,radius);
        gradient.addColorStop(0,'rgba(0,0,0,1)');gradient.addColorStop(.62,'rgba(0,0,0,.86)');gradient.addColorStop(1,'rgba(0,0,0,0)');stormCtx.fillStyle=gradient;stormCtx.fillRect(foco.x-radius,foco.y-radius,radius*2,radius*2);
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
      getCombatTargets,getSolidTargets,getTodosAlvos,getCurrentDefinition,canEndWave,controlsWaveTimer,allowNormalSpawns,normalSpawnCap,spawnIntervalMultiplier,
      modifyOutgoingDamage,movementMultiplier,cooldownDurationMultiplier,cooldownRecoveryMultiplier,
      enemySpeedMultiplier,applyEnemySpeed,enemyAggroTarget,hitSurvivorWithProjectile,handleActionDown,handleActionUp,addTimedModifier,debugSnapshot,
    });
  }

  // O evento Altar dos Deuses compartilha o cache de arte dos objetivos.
  global.CampaignObjectives=Object.freeze({create,CampaignObjectiveTarget,OBJECTIVE_WAVES,POSITIONS,desenharObjeto,tingirObjeto});
})(typeof window!=='undefined'?window:globalThis);
