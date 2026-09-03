// Sistema de afinidade v4: 75 bencaos, 30 ascensoes e 15 apoteoses.
// Este modulo e carregado por ultimo e substitui apenas os pontos publicos do
// sistema antigo. Todo estado de combate fica dentro de cardEffects de cada
// jogador, evitando que P1 e P2 compartilhem contadores ou escolhas.
(function(global){
  'use strict';
  const data=global.MagoBlessingData;
  if(!data)throw new Error('MagoBlessingData deve ser carregado antes da afinidade.');
  const {DEITIES,RARITY_ORDER,RARITY_META,PROGRESSION}=data;
  const DEITY_MAP=Object.fromEntries(DEITIES.map(deity=>[deity.id,deity]));
  const BOON_MAP=Object.fromEntries(DEITIES.flatMap(deity=>deity.boons.map(boon=>[boon.id,{...boon,deityId:deity.id}])));
  const COLORS={zeus:'#73d7ff',ares:'#ff5b5b',hecate:'#bd70ff',selene:'#bcd7ff',moros:'#d9c48b',atena:'#8eb8ff',hermes:'#79f1e8',dionisio:'#e888ff',hefesto:'#ff9a52',artemis:'#8eff9b',poseidon:'#55cfff',hercules:'#ffd15a',sauron:'#ff694f',nazgul:'#9b78cf',ents:'#75d178'};
  const AFFINITY_WEIGHTS=[1,1.35,1.75,1.50,2.25,0];
  let selected=null,selectedElement=null,ascensionQueue=[];

  const now=()=>typeof performance!=='undefined'?performance.now():Date.now();
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const hpRatio=entity=>entity?.maxHp?clamp(entity.hp/entity.maxHp,0,1):1;
  const pct=n=>`${Math.round(n*100)}%`;
  const random=items=>items[Math.floor(Math.random()*items.length)];
  const players=()=>[typeof player!=='undefined'?player:null,...(typeof gameMode!=='undefined'&&gameMode===2&&typeof player2!=='undefined'&&player2?[player2]:[])].filter(Boolean);
  function effect(pl){return pl.cardEffects||(pl.cardEffects={});}
  function root(pl){
    const e=effect(pl);
    return e.affinityV4||(e.affinityV4={version:4,boons:Object.create(null),gods:Object.create(null),targetStates:new WeakMap(),delayed:[],zones:[],lastDamageAt:now(),waveDamage:0});
  }
  function godState(pl,id){const r=root(pl);return r.gods[id]||(r.gods[id]={count:0,resonance:false,ascension:null,evolved:false,apotheosis:false});}
  function boon(pl,id){return root(pl).boons[id]||null;}
  function value(card,key='value',fallback=0){
    if(!card)return fallback;
    const raw=key==='value'?card.value:card[key];
    return Array.isArray(raw)?(raw[card.rarityIndex]??fallback):(raw??fallback);
  }
  function amp(pl,deityId,n){
    const g=godState(pl,deityId);let mult=1;
    if(g.resonance)mult+=.10;if(g.evolved)mult+=.18;if(g.apotheosis)mult+=.28;
    if(deityId==='sauron'){const ring=boon(pl,'sauron_one_ring');if(ring)mult+=value(ring);}
    return n*mult;
  }
  function targetState(pl,target){
    if(!target||typeof target!=='object')return {};
    const r=root(pl);let state=r.targetStates.get(target);
    if(!state){state=Object.create(null);r.targetStates.set(target,state);}return state;
  }
  function isBoss(target){
    if(!target)return false;
    return target.isBoss||target.boss||target.type?.startsWith?.('boss')||target.constructor?.name?.includes?.('Boss')||
      (typeof bossOrc!=='undefined'&&target===bossOrc)||(typeof bossSkel!=='undefined'&&target===bossSkel)||
      (typeof bossSpider!=='undefined'&&target===bossSpider)||(typeof bossMajor!=='undefined'&&target===bossMajor)||
      (typeof petBoss!=='undefined'&&target===petBoss);
  }
  const isElite=target=>!!target&&(target.isElite||target.elite||target.isMiniboss||target.miniBoss||target.type?.includes?.('elite')||(!isBoss(target)&&Number(target.maxHp||0)>=260));
  function targets(){
    const list=[];const seen=new Set();
    const add=target=>{if(target&&!target.dead&&!seen.has(target)){seen.add(target);list.push(target);}};
    const base=typeof enemies!=='undefined'&&Array.isArray(enemies)?enemies:[];
    const expanded=typeof allTargets==='function'?allTargets(base):base;for(const target of expanded||[])add(target);
    for(const key of ['bossOrc','bossSkel','bossSpider','bossMajor','petBoss'])try{add(global[key]);}catch(_error){}
    return list;
  }
  function nearest(x,y,radius=Infinity,exclude=null,limit=1){return targets().filter(t=>t!==exclude&&Math.hypot(t.x-x,t.y-y)<=radius).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).slice(0,limit);}
  function strongest(){return targets().sort((a,b)=>(isBoss(b)-isBoss(a))||(isElite(b)-isElite(a))||((b.hp||0)-(a.hp||0)))[0]||null;}
  function color(pl,deityId){return COLORS[deityId]||'#b866ff';}
  function particles(x,y,c,count=8,power=48){if(typeof spawnParts==='function')spawnParts(x,y,c,count,power);}
  function notice(pl,text,x=pl?.x,y=(pl?.y||0)-28){if(typeof spawnLevelUpNotice==='function')spawnLevelUpNotice(x,y,text,pl?.idx||0);}
  function hurt(pl,target,amount,deityId,symbol='✦'){
    if(!target||target.dead||!Number.isFinite(amount)||amount<=0)return 0;
    const before=Math.max(0,Number(target.hp||0));target._lastDamageOwner=pl;
    if(typeof target.takeDmg==='function')target.takeDmg(amount);else target.hp=before-amount;
    particles(target.x,target.y,color(pl,deityId),7,46);
    if(before>0&&(target.dead||target.hp<=0))global.notifyBlessingKill?.(pl,target,null);
    return Math.min(before,amount);
  }
  function area(pl,x,y,radius,damage,deityId,exclude=null,push=0){
    let hits=0;for(const target of targets()){
      if(target===exclude||Math.hypot(target.x-x,target.y-y)>radius)continue;
      hurt(pl,target,damage,deityId);hits++;
      if(push&&target&&!target.dead){const dx=target.x-x,dy=target.y-y,d=Math.max(1,Math.hypot(dx,dy));target.x+=dx/d*push;target.y+=dy/d*push;targetState(pl,target).pushed=(targetState(pl,target).pushed||0)+1;}
    }
    particles(x,y,color(pl,deityId),Math.min(28,8+hits*2),Math.max(55,radius));return hits;
  }
  function heal(pl,amount,label='CURA'){
    if(!pl||amount<=0)return 0;const before=pl.hp;
    if(typeof healCampaignPlayer==='function')healCampaignPlayer(pl,amount,pl.x,pl.y);else pl.hp=Math.min(pl.maxHp,pl.hp+amount);
    const gained=Math.max(0,pl.hp-before);if(gained){particles(pl.x,pl.y,'#79e89a',7,38);notice(pl,`+${Math.round(gained)} ${label}`);}return gained;
  }
  function changeMaxHp(pl,factor){const old=pl.maxHp||1,delta=old*factor;pl.maxHp=Math.max(1,old+delta);pl.hp=Math.min(pl.maxHp,Math.max(1,pl.hp+(factor>0?delta:0)));return delta;}
  function charge(store,key,need,amount=1){store[key]=(store[key]||0)+amount;if(store[key]<Math.max(1,need))return false;store[key]=0;return true;}
  function procNeed(pl,card,key='hits'){
    let need=value(card,key,6),g=godState(pl,card.deityId);
    if(g.evolved)need-=1;if(g.apotheosis)need-=1;
    if(card.deityId==='ares'&&g.ascension==='war_god')need-=1;
    if(card.deityId==='hercules'&&g.ascension==='demigod')need-=1;
    return Math.max(2,Math.round(need));
  }
  function materialize(deity,base,rarity){
    const rarityIndex=Math.max(0,RARITY_ORDER.indexOf(rarity));const amount=base.values[rarityIndex];
    const details=[];if(base.hits)details.push(`${base.hits[rarityIndex]} acertos`);if(base.cooldown)details.push(`${String(base.cooldown[rarityIndex]).replace('.',',')}s`);if(base.hpPenalty)details.push(`−${pct(base.hpPenalty[rarityIndex])} vida máx.`);details.push(`potência ${pct(amount)}`);
    return {...base,deityId:deity.id,god:`${deity.icon} ${deity.name}`,rarity,rarityIndex,value:amount,uniqueGroup:base.id,valueText:details.join(' · ')};
  }
  function ownedIds(){return new Set((typeof activeCardBlessings!=='undefined'?activeCardBlessings:[]).map(card=>card.id));}
  function affinityCounts(){const counts=Object.fromEntries(DEITIES.map(d=>[d.id,0]));for(const card of typeof activeCardBlessings!=='undefined'?activeCardBlessings:[])if(card.deityId in counts)counts[card.deityId]++;return counts;}
  function eligibleDeities(){const owned=ownedIds(),counts=affinityCounts();return DEITIES.filter(d=>counts[d.id]<5&&d.boons.some(b=>!owned.has(b.id)));}
  function pickWeighted(items,weight){let total=items.reduce((sum,item)=>sum+weight(item),0),roll=Math.random()*total;for(const item of items){roll-=weight(item);if(roll<=0)return item;}return items.at(-1);}
  global.rollCardOffer=function(count=3){
    const eligible=eligibleDeities();if(!eligible.length)return [];
    const counts=affinityCounts();const deity=pickWeighted(eligible,d=>AFFINITY_WEIGHTS[counts[d.id]]||0);
    const owned=ownedIds(),pool=deity.boons.filter(b=>!owned.has(b.id)),offers=[];
    while(pool.length&&offers.length<Math.min(count,pool.length)){const base=pool.splice(Math.floor(Math.random()*pool.length),1)[0];offers.push(materialize(deity,base,global.rollCardRarity?.()||'comum'));}
    const omen=players().find(pl=>boon(pl,'moros_omen')?.rarityIndex===4&&root(pl).omenGuarantee!==false);
    if(omen&&offers.length&&!offers.some(card=>card.rarityIndex>=2)){offers[0]=materialize(deity,BOON_MAP[offers[0].id],random(['rara','epica','lendaria']));root(omen).omenGuarantee=false;}
    offers.deityId=deity.id;return offers;
  };
  global.revealCardOffers=function(offers){
    if(!offers?.length){global.closeCardOffer?.();return;}
    const deity=DEITY_MAP[offers.deityId||offers[0].deityId];const label=document.getElementById('card-deity-label');if(label)label.textContent=`${deity.name} — AFINIDADE ${affinityCounts()[deity.id]}/5`;
    selected=null;selectedElement=null;const confirm=document.getElementById('card-confirm-btn');if(confirm){confirm.disabled=true;confirm.textContent='CONFIRMAR ›';}
    const waveLabel=document.getElementById('card-wave-label');if(waveLabel)waveLabel.textContent=`Onda ${typeof wave!=='undefined'?wave:'—'} concluída`;
    global.renderCardOffers(offers);document.getElementById('card-screen')?.classList.add('open');
  };
  global.openCardOffer=function(){
    cardOfferOpen=true;state='shop';global.hideAllScreens?.();const offers=global.rollCardOffer(3);
    if(!offers.length){global.closeCardOffer?.();return;}global.openDeityIntro?.(offers.deityId,offers);
  };
  global.renderCardOffers=function(offers){
    const row=document.getElementById('cards-row');if(!row)return;row.innerHTML='';row.dataset.offerCount=String(offers.length);
    const preview=document.getElementById('card-active-preview');if(preview)preview.innerHTML=(activeCardBlessings||[]).map(b=>`<span class="card-active-pip r-${b.rarity}" title="${b.name}">${b.icon}</span>`).join('');
    for(const [index,card] of offers.entries()){
      const rarity=RARITY_META[card.rarity];const el=document.createElement('button');el.type='button';el.className=`bless-card r-${card.rarity}`;el.style.animationDelay=`${index*.11}s`;el.setAttribute('aria-label',`${rarity.label}: ${card.name}. ${card.valueText}`);
      el.innerHTML=`<div class="bless-card-header"><span class="bless-card-icon">${card.icon}</span><div class="bless-card-heading"><div class="bless-card-name">${card.name}</div><div class="bless-card-rarity">${rarity.label}</div></div></div><div class="bless-card-body"><div class="bless-card-role">${card.role}</div><div class="bless-card-desc">${card.desc}</div><div class="bless-card-divider"><span></span></div><div class="bless-card-value">${card.valueText}</div></div>`;
      el.onclick=()=>global.pickCard(card,el);row.appendChild(el);
    }
  };
  global.pickCard=function(card,element){if(!card||ownedIds().has(card.id))return;selected=card;selectedElement=element;document.querySelectorAll('#cards-row .bless-card').forEach(node=>node.classList.toggle('selected',node===element));const confirm=document.getElementById('card-confirm-btn');if(confirm){confirm.disabled=false;confirm.textContent=`CONFIRMAR ${card.name.toUpperCase()} ›`;}};

  function milestone(pl,deityId){
    const g=godState(pl,deityId),count=Object.values(root(pl).boons).filter(card=>card.deityId===deityId).length;g.count=count;
    const deity=DEITY_MAP[deityId];
    if(count>=2&&!g.resonance){g.resonance=true;notice(pl,`✦ RESSONÂNCIA: ${deity.progression.resonance[0]}`);particles(pl.x,pl.y,color(pl,deityId),24,90);}
    if(count>=3&&!g.ascension&&!ascensionQueue.some(item=>item.pl===pl&&item.deityId===deityId))ascensionQueue.push({pl,deityId});
    if(count>=4&&g.ascension&&!g.evolved){g.evolved=true;notice(pl,`⬆ ${deity.name}: ASCENSÃO EVOLUÍDA`);particles(pl.x,pl.y,color(pl,deityId),30,110);}
    if(count>=5&&!g.apotheosis){g.apotheosis=true;notice(pl,`★ APOTEOSE: ${deity.progression.apotheosis[0]}`);particles(pl.x,pl.y,'#fff0a8',38,135);}
    return g;
  }
  function applyBoon(pl,card){
    if(!pl||!card||boon(pl,card.id))return false;const r=root(pl);r.boons[card.id]={...card};r.lastDamageAt=r.lastDamageAt||now();
    if(card.id==='hecate_forbidden_knowledge')changeMaxHp(pl,-value(card,'hpPenalty'));
    if(card.id==='sauron_corrupting_power')changeMaxHp(pl,-value(card,'hpPenalty'));
    if(card.id==='moros_omen'){effect(pl).rarityBoost=(effect(pl).rarityBoost||0)+value(card);r.omenGuarantee=true;}
    if(card.id==='moros_delayed_fate')r.morosFatalReady=true;
    milestone(pl,card.deityId);return true;
  }
  global.applyDeityBoon=applyBoon;
  global.confirmCardOffer=function(){
    const card=selected;if(!card||ownedIds().has(card.id))return;
    for(const pl of players().filter(p=>!p.dead))applyBoon(pl,card);
    activeCardBlessings.push(card);global.updateBlessingsHUD?.();notice(players()[0],`${card.icon} ${card.name}!`,typeof W!=='undefined'?W/2:400,typeof H!=='undefined'?H/2-50:260);particles(typeof W!=='undefined'?W/2:400,typeof H!=='undefined'?H/2:300,COLORS[card.deityId],card.rarity==='lendaria'?34:22,95);
    selectedElement?.classList.add('confirmed');selected=null;selectedElement=null;
    setTimeout(()=>{global.closeCardOffer?.();setTimeout(showNextAscension,120);},260);
  };

  function injectUI(){
    if(typeof document==='undefined'||document.getElementById('blessing-affinity-style'))return;
    const style=document.createElement('style');style.id='blessing-affinity-style';style.textContent=`
      #cards-row[data-offer-count="1"]{grid-template-columns:minmax(270px,390px);justify-content:center}#cards-row[data-offer-count="2"]{grid-template-columns:repeat(2,minmax(250px,390px));justify-content:center}
      #blessing-ascension-screen{position:fixed;inset:0;z-index:10040;display:none;place-items:center;padding:24px;background:radial-gradient(circle at 50% 35%,rgba(70,36,112,.38),rgba(3,5,15,.96) 58%);backdrop-filter:blur(8px)}#blessing-ascension-screen.open{display:grid}
      .affinity-panel{width:min(920px,96vw);padding:clamp(22px,4vw,48px);border:1px solid rgba(174,120,255,.4);border-radius:22px;background:#080b19;box-shadow:0 25px 90px #000,0 0 50px rgba(132,70,255,.2)}.affinity-kicker{color:#79e8ff;font:700 12px/1.4 monospace;letter-spacing:3px}.affinity-title{margin:8px 0 4px;font-size:clamp(32px,5vw,58px)}.affinity-sub{color:#aeb7d7;margin:0 0 24px}.affinity-choices{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.affinity-choice{padding:24px;text-align:left;color:#f5f6ff;background:linear-gradient(150deg,#141a32,#0d1022);border:1px solid #35406a;border-radius:16px;cursor:pointer}.affinity-choice:hover,.affinity-choice:focus{border-color:#a86cff;transform:translateY(-2px);box-shadow:0 10px 35px rgba(126,67,255,.25)}.affinity-choice b{display:block;font-size:20px;margin-bottom:8px}.affinity-choice span{color:#b9c2df;line-height:1.55}.affinity-player{color:#ffd76d;font-weight:800;margin-bottom:8px}
      .affinity-stage-pip{display:grid;place-items:center;min-width:28px;height:28px;padding:0 7px;border-radius:8px;border:1px solid #bb78ff;background:#16102d;color:#f2dcff;font:800 10px/1 monospace}.affinity-stage-pip.apotheosis{border-color:#ffd76d;color:#ffe99d;box-shadow:0 0 16px rgba(255,208,80,.38)}
      #affinity-combat-hud{position:fixed;right:12px;top:92px;z-index:120;display:flex;flex-direction:column;align-items:flex-end;gap:5px;pointer-events:none}.affinity-combat-row{max-width:min(380px,72vw);padding:5px 9px;border:1px solid rgba(176,128,255,.3);border-radius:8px;background:rgba(5,7,18,.78);color:#dfe5ff;font:700 10px/1.35 monospace;letter-spacing:.3px}.affinity-combat-row b{color:#79e8ff}@media(max-width:720px){.affinity-choices{grid-template-columns:1fr}.affinity-panel{max-height:90vh;overflow:auto}#affinity-combat-hud{top:78px}.affinity-combat-row{font-size:9px}}
    `;document.head.appendChild(style);
    const overlay=document.createElement('section');overlay.id='blessing-ascension-screen';overlay.setAttribute('aria-hidden','true');overlay.innerHTML='<div class="affinity-panel"><div class="affinity-player" id="affinity-player-label"></div><div class="affinity-kicker">AFINIDADE 3/5 · ESCOLHA PERMANENTE</div><h2 class="affinity-title" id="affinity-title">ASCENSÃO</h2><p class="affinity-sub">No quarto benefício ela evolui automaticamente. No quinto, a apoteose desperta.</p><div class="affinity-choices" id="affinity-choices"></div></div>';document.body.appendChild(overlay);
    const hud=document.createElement('div');hud.id='affinity-combat-hud';hud.setAttribute('aria-live','polite');document.body.appendChild(hud);
  }
  function chooseAscension(pl,deityId,ascensionId){
    const g=godState(pl,deityId),valid=PROGRESSION[deityId].ascensions.find(a=>a[0]===ascensionId);if(!valid||g.ascension)return false;
    g.ascension=ascensionId;if(deityId==='sauron'&&ascensionId==='ring_lord')changeMaxHp(pl,-.08);if(g.count>=4)g.evolved=true;
    notice(pl,`◆ ASCENSÃO: ${valid[1]}`);particles(pl.x,pl.y,color(pl,deityId),32,120);return true;
  }
  function showNextAscension(){
    injectUI();const overlay=document.getElementById('blessing-ascension-screen');if(!overlay)return;
    const next=ascensionQueue.shift();if(!next){overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');return;}
    if(next.pl.dead||godState(next.pl,next.deityId).ascension){showNextAscension();return;}
    const deity=DEITY_MAP[next.deityId];document.getElementById('affinity-player-label').textContent=`JOGADOR ${(next.pl.idx||0)+1}`;document.getElementById('affinity-title').textContent=`${deity.icon} ASCENSÃO DE ${deity.name}`;
    const choices=document.getElementById('affinity-choices');choices.innerHTML='';for(const asc of deity.progression.ascensions){const button=document.createElement('button');button.type='button';button.className='affinity-choice';button.innerHTML=`<b>${asc[1]}</b><span>${asc[2]}</span>`;button.onclick=()=>{chooseAscension(next.pl,next.deityId,asc[0]);overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');global.updateBlessingsHUD?.();setTimeout(showNextAscension,180);};choices.appendChild(button);}
    overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');choices.firstElementChild?.focus();
  }

  const legacyHud=global.updateBlessingsHUD;
  global.updateBlessingsHUD=function(){
    legacyHud?.();const hud=document.getElementById('blessings-hud');if(!hud)return;
    const lead=players()[0];if(!lead)return;for(const deity of DEITIES){const g=godState(lead,deity.id);if(g.count<2)continue;const pip=document.createElement('div');pip.className=`affinity-stage-pip${g.apotheosis?' apotheosis':''}`;pip.textContent=g.apotheosis?'★':g.evolved?'IV':g.ascension?'III':'II';pip.title=`${deity.name} ${g.count}/5 — ${g.apotheosis?deity.progression.apotheosis[0]:g.ascension?deity.progression.ascensions.find(a=>a[0]===g.ascension)?.[1]:deity.progression.resonance[0]}`;hud.appendChild(pip);}
  };

  function activeBuffs(r,current=now()){return (r.dionBuffs||[]).filter(buff=>buff.until>current);}
  function addBuff(pl,type,power,duration){
    const r=root(pl),toast=boon(pl,'dionisio_double_toast'),mult=1+(toast?value(toast):0),current=now();r.dionBuffs=r.dionBuffs||[];
    const old=r.dionBuffs.find(buff=>buff.type===type&&buff.until>current);if(old){old.until=Math.max(old.until,current+duration*1000*mult);old.power=Math.max(old.power,power);}else r.dionBuffs.push({type,power,until:current+duration*1000*mult,renewed:false});
    notice(pl,`🍷 ${type==='damage'?'PODER':type==='attack'?'RITMO':'VELOCIDADE'}`);particles(pl.x,pl.y,COLORS.dionisio,9,52);
  }
  function attackSpeedBonus(pl){
    if(!pl)return 0;const r=root(pl),current=now();let bonus=0;
    const frenzy=boon(pl,'ares_war_frenzy');if(frenzy&&current<(r.aresFrenzyUntil||0))bonus+=amp(pl,'ares',value(frenzy))*(r.aresFrenzy||1);
    const cycle=boon(pl,'selene_lunar_cycle');if(cycle&&r.selenePhase===0)bonus+=amp(pl,'selene',value(cycle));
    const momentum=boon(pl,'hermes_momentum');if(momentum)bonus+=r.hermesMomentum||0;
    const flow=boon(pl,'hermes_divine_flow');if(flow)bonus+=(r.hermesFlow||0)*value(flow)*.45;
    for(const buff of activeBuffs(r,current))if(buff.type==='attack')bonus+=buff.power;
    const trophy=boon(pl,'hercules_monster_trophy');if(trophy&&current<(r.herculesTrophyUntil||0))bonus+=value(trophy)*.55;
    const terror=boon(pl,'nazgul_rising_terror');if(terror)bonus+=(r.nazgulTerror||0)*value(terror)*.65;
    for(const deity of DEITIES)if(godState(pl,deity.id).apotheosis)bonus+=.015;
    return clamp(bonus,0,1.5);
  }
  function criticalChance(pl){
    if(!pl)return 0;const r=root(pl);let chance=Number(effect(pl).critChance||0)+(r.morosInevitable||0);
    const stance=boon(pl,'atena_perfect_stance');if(stance)chance+=(r.atenaStance||0)*value(stance);
    const hunt=boon(pl,'artemis_hunt_mark');if(hunt&&r.artemisPrey)chance+=value(hunt);
    const phantom=boon(pl,'nazgul_phantom_blade');if(phantom&&now()<(r.nazgulSpectralCritUntil||0))chance+=value(phantom);
    return clamp(chance,0,.92);
  }
  function damageBonus(pl,target,weapon=null){
    if(!pl)return 0;const r=root(pl),current=now();let bonus=0;
    const pending=r.pending||{};
    if(pending.retaliation)bonus+=amp(pl,'ares',value(boon(pl,'ares_pain_feeds_pain')));
    const mercy=boon(pl,'ares_no_mercy');if(mercy&&target&&hpRatio(target)<=value(mercy,'threshold'))bonus+=amp(pl,'ares',value(mercy));
    const cycle=boon(pl,'selene_lunar_cycle');if(cycle&&r.selenePhase===1)bonus+=amp(pl,'selene',value(cycle));
    const eclipse=boon(pl,'selene_eclipse');if(eclipse&&r.seleneEclipse)bonus+=amp(pl,'selene',value(eclipse));
    if(pending.counter)bonus+=amp(pl,'atena',value(boon(pl,'atena_counterattack')));
    if(pending.breach)bonus+=amp(pl,'atena',value(boon(pl,'atena_tactical_breach')));
    const stance=boon(pl,'atena_perfect_stance');if(stance)bonus+=(r.atenaStance||0)*value(stance);
    if(pending.hermesLightning)bonus+=amp(pl,'hermes',value(boon(pl,'hermes_lightning_attack')));
    const momentum=boon(pl,'hermes_momentum');if(momentum)bonus+=r.hermesMomentum||0;
    for(const buff of activeBuffs(r,current))if(buff.type==='damage')bonus+=buff.power;
    const distance=boon(pl,'artemis_deadly_distance');if(distance&&target){const d=Math.hypot(target.x-pl.x,target.y-pl.y);bonus+=amp(pl,'artemis',value(distance))*clamp((d-70)/260,0,1);}
    const hunt=boon(pl,'artemis_hunt_mark');if(hunt&&target===r.artemisPrey)bonus+=amp(pl,'artemis',value(hunt));
    const weak=boon(pl,'artemis_weak_point');if(weak&&target)bonus+=Math.min(value(weak),targetState(pl,target).artemisWeak||0);
    const tide=boon(pl,'poseidon_rising_tide');if(tide)bonus+=amp(pl,'poseidon',value(tide))*(r.poseidonTide||0);
    const labors=boon(pl,'hercules_labors');if(labors)bonus+=(r.herculesLabors||0)*value(labors);
    const trophy=boon(pl,'hercules_monster_trophy');if(trophy&&current<(r.herculesTrophyUntil||0))bonus+=value(trophy);
    const strength=boon(pl,'hercules_rising_strength');if(strength)bonus+=(r.herculesStrength||0)*value(strength)*.28;
    const lion=boon(pl,'hercules_lion_skin');if(lion&&hpRatio(pl)<.30)bonus+=amp(pl,'hercules',value(lion));
    const corrupt=boon(pl,'sauron_corrupting_power');if(corrupt)bonus+=amp(pl,'sauron',value(corrupt))*(.35+.65*(r.sauronCorruption||0));
    const domination=boon(pl,'sauron_domination');if(domination)bonus+=(r.sauronDomination||0)*value(domination)*.24;
    const terror=boon(pl,'sauron_mordor_terror');if(terror&&hpRatio(pl)<.5)bonus+=amp(pl,'sauron',value(terror));
    const nterror=boon(pl,'nazgul_rising_terror');if(nterror)bonus+=(r.nazgulTerror||0)*value(nterror);
    const huntLow=boon(pl,'nazgul_relentless_hunt');if(huntLow&&target&&hpRatio(target)<value(huntLow,'threshold'))bonus+=amp(pl,'nazgul',value(huntLow));
    for(const deity of DEITIES)if(godState(pl,deity.id).apotheosis)bonus+=.025;
    return Math.max(0,bonus);
  }
  global.getBlessingAttackSpeedBonus=attackSpeedBonus;
  global.getBlessingCritChance=criticalChance;
  global.applyBlessingSummonDamage=(pl,target,damage)=>damage*(1+damageBonus(pl,target,null)*.65);

  global.notifyBlessingAttack=function(pl,target,sourceDamage,weapon=null){
    if(!pl)return 1;const r=root(pl),current=now(),pending={target,sourceDamage:sourceDamage||pl.dmg||1,weapon,at:current};r.pending=pending;r.attackCount=(r.attackCount||0)+1;
    const chain=boon(pl,'zeus_celestial_chain');if(chain&&r.zeusChainReady){pending.zeusChain=true;r.zeusChainReady=false;}
    if(boon(pl,'zeus_thunder_step')&&current<(r.zeusThunderUntil||0)){pending.zeusThunder=true;r.zeusThunderUntil=0;}
    const lastStorm=boon(pl,'zeus_last_storm');if(lastStorm&&hpRatio(pl)<.35&&charge(r,'zeusLastStorm',procNeed(pl,lastStorm)))pending.zeusLastStorm=true;
    if((r.aresRetaliation||0)>0){pending.retaliation=true;r.aresRetaliation--;}
    const echo=boon(pl,'hecate_arcane_echo');if(echo&&charge(r,'hecateEcho',procNeed(pl,echo)))pending.hecateEcho=true;
    const ritual=boon(pl,'hecate_ritual_circle');if(ritual&&charge(r,'hecateRitual',procNeed(pl,ritual))){r.zones.push({kind:'ritual',x:pl.x,y:pl.y,radius:72,until:current+value(ritual,'duration')*1000,next:current,card:ritual});notice(pl,'◌ CÍRCULO RITUAL');}
    const forbidden=boon(pl,'hecate_forbidden_knowledge');if(forbidden&&charge(r,'hecateForbidden',procNeed(pl,forbidden)))pending.hecateForbidden=true;
    const pred=boon(pl,'moros_predestined_strike');if(pred&&charge(r,'morosPredestined',procNeed(pl,pred)))pending.forceCrit=true;
    if((r.morosRewriteCrits||0)>0){pending.forceCrit=true;r.morosRewriteCrits--;}
    if(boon(pl,'atena_counterattack')&&current<(r.atenaCounterUntil||0)){pending.counter=true;r.atenaCounterUntil=0;}
    if(r.atenaBreachReady){pending.breach=true;r.atenaBreachReady=false;}
    if(boon(pl,'hermes_lightning_attack')&&current<(r.hermesLightningUntil||0)){pending.hermesLightning=true;r.hermesLightningUntil=0;}
    if((r.hermesAfterimages||0)>0){pending.hermesAfterimage=r.hermesAfterimages;r.hermesAfterimages=0;}
    if(r.artemisForceCrit){pending.forceCrit=true;r.artemisForceCrit=false;}
    if(r.atenaLastRetaliation){pending.counter=true;r.atenaLastRetaliation=false;}
    if(r.nazgulPhantomReady&&current<(r.nazgulPhantomUntil||0)){pending.nazgulPhantom=true;r.nazgulPhantomReady=false;}
    if(r.nazgulDodgeCrit){pending.forceCrit=true;r.nazgulDodgeCrit=false;}
    if(boon(pl,'sauron_mordor_terror')&&hpRatio(pl)<.5&&charge(r,'sauronTerrorAttack',procNeed(pl,boon(pl,'sauron_mordor_terror'))))pending.sauronTerror=true;
    if(godState(pl,'hermes').apotheosis&&r.hermesFlow>=4)pending.hermesAfterimage=Math.max(2,pending.hermesAfterimage||0);
    return 1/(1+attackSpeedBonus(pl));
  };

  global.applyCardCrit=function(pl,baseDamage,target,weapon=null){
    if(!pl)return baseDamage;const r=root(pl),pending=r.pending||{};let damage=baseDamage*(1+damageBonus(pl,target,weapon));
    if(typeof getCampaignShopDamageBonus==='function')damage*=1+getCampaignShopDamageBonus(pl,target);
    if(typeof CampProgressionSystem!=='undefined'&&CampProgressionSystem.damageBonus)damage*=1+CampProgressionSystem.damageBonus(pl,target);
    let chance=criticalChance(pl)+(typeof getCampaignShopCritBonus==='function'?getCampaignShopCritBonus(pl):0),didCrit=!!(pending.forceCrit||effect(pl).forceCrit);
    if(!didCrit)didCrit=Math.random()<chance;
    const inevitable=boon(pl,'moros_inevitable');if(didCrit){damage*=2.5+(effect(pl).critMultBonus||0);r.morosInevitable=0;}else if(inevitable)r.morosInevitable=Math.min(value(inevitable,'max'),(r.morosInevitable||0)+value(inevitable));
    pending.didCrit=didCrit;pl._lastAttackWasCrit=didCrit;if(target){target._lastDamageOwner=pl;target._lastHitCrit=didCrit;}
    if(didCrit)particles(target?.x||pl.x,target?.y||pl.y,'#ffd35a',7,48);
    if(typeof campaignModifyOutgoingDamage==='function')damage=campaignModifyOutgoingDamage(pl,target,damage);
    effect(pl).forceCrit=false;return damage;
  };

  function chainFrom(pl,target,damage,card,count=value(card,'targets',1)){for(const next of nearest(target.x,target.y,185,target,count))hurt(pl,next,amp(pl,card.deityId,damage*value(card)),card.deityId,'⚡');}
  function pressure(pl,target,damage){const card=boon(pl,'poseidon_abyssal_pressure');if(!card||!target)return;const ts=targetState(pl,target);if(charge(ts,'poseidonPressure',procNeed(pl,card))){hurt(pl,target,amp(pl,'poseidon',damage*value(card)),'poseidon');notice(pl,'◉ PRESSÃO ABISSAL',target.x,target.y-20);}}
  global.notifyBlessingHit=function(pl,target,damage,weapon=null){
    if(!pl||!target)return;const r=root(pl),pending=r.pending||{},current=now();r.lastHitAt=current;const base=Math.max(1,damage||pending.sourceDamage||pl.dmg||1),ts=targetState(pl,target);
    const chain=boon(pl,'zeus_celestial_chain');if(chain){if(pending.zeusChain)chainFrom(pl,target,base,chain,value(chain,'targets'));if(charge(r,'zeusChainHits',procNeed(pl,chain)))r.zeusChainReady=true;}
    const staticCard=boon(pl,'zeus_static_charge');if(staticCard&&charge(ts,'zeusStatic',procNeed(pl,staticCard))){area(pl,target.x,target.y,value(staticCard,'radius'),amp(pl,'zeus',base*value(staticCard)),'zeus',target);hurt(pl,target,base*value(staticCard),'zeus');notice(pl,'ϟ CARGA ESTÁTICA',target.x,target.y-20);}
    const thunder=boon(pl,'zeus_thunder_step');if(thunder&&pending.zeusThunder){area(pl,target.x,target.y,value(thunder,'radius'),base*value(thunder),'zeus');notice(pl,'☈ PASSO TROVEJANTE',target.x,target.y-22);}
    const storm=boon(pl,'zeus_storm_mark');if(storm){if(ts.zeusStorm){ts.zeusStorm=false;hurt(pl,target,base*amp(pl,'zeus',value(storm)),'zeus');chainFrom(pl,target,base,storm,value(storm,'targets'));}if(pl._lastAttackWasCrit)ts.zeusStorm=true;}
    if(pending.zeusLastStorm){area(pl,target.x,target.y,80,base*value(boon(pl,'zeus_last_storm')),'zeus');notice(pl,'☇ ÚLTIMA TEMPESTADE',target.x,target.y-20);}

    const blood=boon(pl,'ares_blood_mark');if(blood&&charge(ts,'aresBlood',procNeed(pl,blood))){area(pl,target.x,target.y,value(blood,'radius'),base*amp(pl,'ares',value(blood)),'ares',target);hurt(pl,target,base*value(blood),'ares');ts.aresWoundedUntil=current+5000;notice(pl,'🩸 FERIDA ROMPIDA',target.x,target.y-20);}
    const condemnation=boon(pl,'ares_condemnation');if(condemnation&&charge(ts,'aresCondemnation',procNeed(pl,condemnation))){r.delayed.push({at:current+value(condemnation,'delay')*1000,target,damage:base*amp(pl,'ares',value(condemnation)),deityId:'ares',label:'☠ CONDENAÇÃO'});}

    const curse=boon(pl,'hecate_crossroads_curse');if(curse&&charge(ts,'hecateCurse',procNeed(pl,curse))){ts.hecateCursed=true;ts.hecateCurseDamage=base*amp(pl,'hecate',value(curse));particles(target.x,target.y,COLORS.hecate,12,58);}
    if(pending.hecateEcho){setTimeout(()=>{if(!target.dead){hurt(pl,target,base*amp(pl,'hecate',value(boon(pl,'hecate_arcane_echo'))),'hecate');notice(pl,'◈ ECO ARCANO',target.x,target.y-20);}},90);}
    const witch=boon(pl,'hecate_witch_fire');if(witch&&pl._lastAttackWasCrit)r.zones.push({kind:'witch',x:target.x,y:target.y,radius:value(witch,'radius'),until:current+value(witch,'duration')*1000,next:current+350,damage:base*value(witch),card:witch});
    const ritual=boon(pl,'hecate_ritual_circle');if(ritual&&r.zones.some(z=>z.kind==='ritual'&&z.until>current&&Math.hypot(pl.x-z.x,pl.y-z.y)<=z.radius)){for(const extra of nearest(target.x,target.y,170,target,godState(pl,'hecate').evolved?2:1))hurt(pl,extra,base*value(ritual),'hecate');}
    if(pending.hecateForbidden){const count=value(boon(pl,'hecate_forbidden_knowledge'),'shadows',1);for(const extra of nearest(target.x,target.y,220,null,count))hurt(pl,extra,base*value(boon(pl,'hecate_forbidden_knowledge')),'hecate');notice(pl,'☾ SOMBRA PROIBIDA');}

    const thread=boon(pl,'moros_fate_thread');if(thread&&charge(ts,'morosThread',procNeed(pl,thread))){hurt(pl,target,base*amp(pl,'moros',value(thread)),'moros');notice(pl,'⌁ FIO ROMPIDO',target.x,target.y-20);if(godState(pl,'moros').resonance)r.morosPredestined=(r.morosPredestined||0)+2;}
    const breach=boon(pl,'atena_tactical_breach');if(breach&&charge(ts,'atenaBreach',procNeed(pl,breach)))r.atenaBreachReady=true;
    const mercury=boon(pl,'hermes_living_mercury');if(mercury){const elapsed=current-(r.hermesMercuryAt||0);if(elapsed>1000){r.hermesMercuryAt=current;r.hermesMercurySpent=0;}const cap=(pl._dashMaxCd||2000)*value(mercury,'cap'),cut=Math.min((pl._dashMaxCd||2000)*value(mercury),Math.max(0,cap-(r.hermesMercurySpent||0)));pl._dashCd=Math.max(0,(pl._dashCd||0)-cut);r.hermesMercurySpent=(r.hermesMercurySpent||0)+cut;}
    if(pending.hermesAfterimage){for(let i=0;i<pending.hermesAfterimage;i++)setTimeout(()=>{const next=nearest(target.x,target.y,210,null,1)[0];if(next)hurt(pl,next,base*value(boon(pl,'hermes_afterimage')),'hermes');},70+i*60);}

    const hangover=boon(pl,'dionisio_hangover');if(hangover&&charge(ts,'dionHangover',procNeed(pl,hangover))){area(pl,target.x,target.y,value(hangover,'radius'),base*amp(pl,'dionisio',value(hangover)),'dionisio',target);hurt(pl,target,base*value(hangover),'dionisio');notice(pl,'🍷 RESSACA',target.x,target.y-20);}

    const anvil=boon(pl,'hefesto_anvil_strike');if(anvil&&charge(r,'hefestoAnvil',procNeed(pl,anvil))){area(pl,target.x,target.y,value(anvil,'radius'),base*amp(pl,'hefesto',value(anvil)),'hefesto');notice(pl,'🔨 BIGORNA',target.x,target.y-24);}
    const overheat=boon(pl,'hefesto_overheat');if(overheat){const key=`hefestoHeat_${weapon?.type||'auto'}`;if(charge(r,key,procNeed(pl,overheat))){area(pl,target.x,target.y,75,base*amp(pl,'hefesto',value(overheat)),'hefesto');notice(pl,'♨ SUPERAQUECIDO',target.x,target.y-20);}}
    const master=boon(pl,'hefesto_masterpiece');if(master&&charge(r,'hefestoMasterpiece',procNeed(pl,master))){hurt(pl,target,base*amp(pl,'hefesto',value(master)),'hefesto');for(const extra of nearest(target.x,target.y,170,target,godState(pl,'hefesto').ascension==='living_forge'?2:1))hurt(pl,extra,base*value(master)*.65,'hefesto');notice(pl,'◆ OBRA-PRIMA',target.x,target.y-20);}
    const core=boon(pl,'hefesto_forged_core');if(core&&charge(r,'hefestoCore',procNeed(pl,core))){r.hefestoArmor=Math.min(value(core,'charges',1), (r.hefestoArmor||0)+1);notice(pl,'⛨ ARMADURA FORJADA');}

    const prey=boon(pl,'artemis_hunt_mark');if(prey&&target===r.artemisPrey&&charge(ts,'artemisPreyHits',procNeed(pl,prey)))r.artemisForceCrit=true;
    const ricochet=boon(pl,'artemis_ricochet_arrow');if(ricochet&&pl._lastAttackWasCrit)chainFrom(pl,target,base,ricochet,value(ricochet,'targets'));
    const weak=boon(pl,'artemis_weak_point');if(weak){ts.artemisWeak=Math.min(value(weak), (ts.artemisWeak||0)+value(weak)/procNeed(pl,weak));if(ts.artemisWeak>=value(weak)){hurt(pl,target,base*value(weak),'artemis');ts.artemisWeak=0;}}
    const rain=boon(pl,'artemis_arrow_rain');if(rain&&pl._lastAttackWasCrit&&charge(r,'artemisCrits',procNeed(pl,rain))){for(const victim of nearest(target.x,target.y,300,null,value(rain,'targets')))hurt(pl,victim,base*value(rain),'artemis');notice(pl,'☄ CHUVA DE FLECHAS');}

    const impact=boon(pl,'poseidon_impact_wave');if(impact&&charge(r,'poseidonImpact',procNeed(pl,impact))){area(pl,target.x,target.y,value(impact,'radius'),base*amp(pl,'poseidon',value(impact)),'poseidon',null,22);for(const pushed of nearest(target.x,target.y,value(impact,'radius'),null,12))pressure(pl,pushed,base);notice(pl,'🌊 ONDA DE IMPACTO',target.x,target.y-22);}
    const tide=boon(pl,'poseidon_rising_tide');if(tide){r.poseidonTide=clamp((r.poseidonTide||0)+.12,0,1);r.poseidonTideAt=current;}
    if((ts.pushed||0)>0){pressure(pl,target,base);ts.pushed=0;}

    const titan=boon(pl,'hercules_titanic_strike');if(titan&&charge(r,'herculesTitanic',procNeed(pl,titan))){area(pl,target.x,target.y,value(titan,'radius'),base*amp(pl,'hercules',value(titan)),'hercules',null,16);notice(pl,'✊ GOLPE TITÂNICO',target.x,target.y-22);}
    const eye=boon(pl,'sauron_watchful_eye');if(eye&&charge(ts,'sauronEye',procNeed(pl,eye))){hurt(pl,target,base*amp(pl,'sauron',value(eye)),'sauron');notice(pl,'👁 O OLHO VÊ',target.x,target.y-22);ts.sauronWatched=true;}
    if(pending.sauronTerror){area(pl,pl.x,pl.y,120,base*value(boon(pl,'sauron_mordor_terror')),'sauron');notice(pl,'◼ TERROR DE MORDOR');}
    if(pending.nazgulPhantom){area(pl,target.x,target.y,godState(pl,'nazgul').ascension==='witch_king'?75:35,base*value(boon(pl,'nazgul_phantom_strike')),'nazgul');notice(pl,'🗡 GOLPE FANTASMA',target.x,target.y-22);}
    const phantomBlade=boon(pl,'nazgul_phantom_blade');if(phantomBlade&&pl._lastAttackWasCrit){r.nazgulSpectralCritUntil=current+value(phantomBlade,'duration')*1000;pl._dashCd=Math.max(0,(pl._dashCd||0)-(pl._dashMaxCd||2000)*value(phantomBlade));}
    if(target.dead||target.hp<=0)global.notifyBlessingKill(pl,target,weapon);r.pending={};
  };

  global.notifyBlessingKill=function(pl,target,weapon=null){
    if(!pl||!target)return;const key=String(pl.idx||0);target._blessingKillsV4=target._blessingKillsV4||Object.create(null);if(target._blessingKillsV4[key])return;target._blessingKillsV4[key]=true;
    const r=root(pl),current=now(),base=Math.max(1,pl.dmg||target.maxHp*.03||1),ts=targetState(pl,target),elite=isElite(target),boss=isBoss(target);
    const zeus=godState(pl,'zeus');if(zeus.ascension==='judgment'||zeus.apotheosis){const strikes=zeus.apotheosis?4:2;for(const victim of nearest(target.x,target.y,340,target,strikes))hurt(pl,victim,base*(zeus.apotheosis?.55:.35),'zeus');}
    if(ts.aresWoundedUntil>current&&godState(pl,'ares').resonance)area(pl,target.x,target.y,80,base*.35,'ares',target);
    const frenzy=boon(pl,'ares_war_frenzy');if(frenzy){r.aresFrenzy= current-(r.aresLastKill||0)<2400?Math.min(5,(r.aresFrenzy||0)+1):1;r.aresLastKill=current;const need=Math.max(2,value(frenzy,'kills')-(godState(pl,'ares').ascension==='war_god'?1:0));if(r.aresFrenzy>=need){r.aresFrenzyUntil=current+value(frenzy,'duration')*1000;notice(pl,'🔥 FRENESI DE GUERRA');if(godState(pl,'ares').apotheosis)area(pl,target.x,target.y,110,base*.65,'ares');}}
    if(godState(pl,'ares').ascension==='blood_feast'&&(ts.aresWoundedUntil>current||ts.aresCondemnation))heal(pl,pl.maxHp*.015,'SANGUE');
    if(ts.hecateCursed){const curse=boon(pl,'hecate_crossroads_curse');area(pl,target.x,target.y,value(curse,'radius'),ts.hecateCurseDamage||base*value(curse),'hecate',target);if(godState(pl,'hecate').ascension==='endless_night'){const next=nearest(target.x,target.y,180,target,2)[0];if(next)targetState(pl,next).hecateCursed=true;}}
    const harvest=boon(pl,'selene_moon_harvest');if(harvest&&root(pl).selenePhase===1){heal(pl,pl.maxHp*value(harvest),'LUAR');r.seleneMoonbeamAt=Math.max(0,(r.seleneMoonbeamAt||current)-value(harvest,'cooldownCut')*1000);}
    if(godState(pl,'moros').resonance&&pl._lastAttackWasCrit)r.morosPredestined=(r.morosPredestined||0)+1;
    if(godState(pl,'atena').ascension==='strategist'){r.atenaCleanKills=(r.atenaCleanKills||0)+1;if(r.atenaCleanKills>=8){r.atenaCleanKills=0;r.atenaMedals=Math.min(3,(r.atenaMedals||0)+1);notice(pl,'♜ MEDALHA TÁTICA');}}
    const euphoria=boon(pl,'dionisio_euphoria');if(euphoria){const type=random(['damage','attack','speed']);addBuff(pl,type,value(euphoria),value(euphoria,'duration'));}
    const blackout=boon(pl,'dionisio_blackout');if(blackout&&new Set(activeBuffs(r,current).map(buff=>buff.type)).size>=3){area(pl,target.x,target.y,value(blackout,'radius'),base*amp(pl,'dionisio',value(blackout)),'dionisio');notice(pl,'◉ APAGÃO');}
    const lastRound=boon(pl,'dionisio_last_round');if(lastRound&&hpRatio(pl)<.40){r.dionLastKills=current-(r.dionLastAt||0)<2600?(r.dionLastKills||0)+1:1;r.dionLastAt=current;if(r.dionLastKills>=value(lastRound,'kills')){r.dionLastKills=0;heal(pl,pl.maxHp*value(lastRound),'ÚLTIMA RODADA');if(euphoria)addBuff(pl,'attack',value(euphoria),value(euphoria,'duration'));}}
    if(godState(pl,'dionisio').apotheosis){addBuff(pl,random(['damage','attack','speed']),.12,5);area(pl,target.x,target.y,100,base*.35,'dionisio');}
    const shards=boon(pl,'hefesto_forge_shards');if(shards&&target._lastHitCrit)for(const victim of nearest(target.x,target.y,220,target,value(shards,'targets')))hurt(pl,victim,base*amp(pl,'hefesto',value(shards)),'hefesto');
    if(godState(pl,'hefesto').apotheosis){r.hefestoAnvil=999;r.hefestoMasterpiece=999;}
    if(target===r.artemisPrey){r.artemisPrey=null;if(godState(pl,'artemis').resonance){const next=strongest();if(next)targetState(pl,next).artemisPreyHits=Math.floor(procNeed(pl,boon(pl,'artemis_hunt_mark'))/2);}}
    if(godState(pl,'artemis').apotheosis){const marked=targets().sort((a,b)=>(b.hp||0)-(a.hp||0)).slice(0,3);r.artemisPrey=marked[0]||null;for(const markedTarget of marked)targetState(pl,markedTarget).artemisGreatHunt=true;}
    const labors=boon(pl,'hercules_labors');if(labors){r.herculesWaveKills=(r.herculesWaveKills||0)+1;if(r.herculesWaveKills%value(labors,'kills')===0&&(r.herculesLabors||0)<value(labors,'max')){r.herculesLabors++;notice(pl,`💪 TRABALHO ${r.herculesLabors}`);if(godState(pl,'hercules').resonance)area(pl,target.x,target.y,100,base*.65,'hercules');}}
    const trophy=boon(pl,'hercules_monster_trophy');if(trophy&&(elite||boss)){const duration=value(trophy,'duration')*(godState(pl,'hercules').ascension==='demigod'?1.5:1);r.herculesTrophyUntil=current+duration*1000;notice(pl,boss?'♜ TROFÉU DE CHEFE':'♜ TROFÉU DE ELITE');}
    const strength=boon(pl,'hercules_rising_strength');if(strength){r.herculesStrength=current-(r.herculesLastKill||0)<2200?Math.min(value(strength,'kills'),(r.herculesStrength||0)+1):1;r.herculesLastKill=current;if(r.herculesStrength>=value(strength,'kills')){area(pl,target.x,target.y,105,base*value(strength),'hercules');r.herculesStrength=0;}}
    const corruption=boon(pl,'sauron_corrupting_power');if(corruption)r.sauronCorruption=clamp((r.sauronCorruption||0)+.08,0,1);
    const domination=boon(pl,'sauron_domination');if(domination){r.sauronDomination=current-(r.sauronLastKill||0)<3200?Math.min(value(domination,'kills'),(r.sauronDomination||0)+1):1;r.sauronLastKill=current;if(r.sauronDomination>=value(domination,'kills')&&(godState(pl,'sauron').ascension==='dark_lord'||godState(pl,'sauron').apotheosis))area(pl,target.x,target.y,125,base*value(domination),'sauron');}
    if(ts.sauronWatched&&godState(pl,'sauron').resonance)r.sauronDomination=Math.min(5,(r.sauronDomination||0)+1);
    const terror=boon(pl,'nazgul_rising_terror');if(terror){r.nazgulKills=(r.nazgulKills||0)+1;if(r.nazgulKills%5===0){r.nazgulTerror=Math.min(value(terror,'max'),(r.nazgulTerror||0)+1);notice(pl,`☠ TERROR ${r.nazgulTerror}`);}}
    if(godState(pl,'nazgul').ascension==='the_nine'){r.nazgulNineKills=(r.nazgulNineKills||0)+1;if(r.nazgulNineKills>=9){r.nazgulNineKills=0;for(const [i,victim] of nearest(target.x,target.y,360,null,9).entries())setTimeout(()=>hurt(pl,victim,base*.28,'nazgul'),i*45);notice(pl,'♟ OS NOVE');}}
    const relentless=boon(pl,'nazgul_relentless_hunt');if(relentless)pl._dashCd=Math.max(0,(pl._dashCd||0)-(pl._dashMaxCd||2000)*value(relentless));
    const seed=boon(pl,'ents_ancestral_seed');if(seed){r.entsSeedKills=(r.entsSeedKills||0)+1;if(r.entsSeedKills%value(seed,'kills')===0&&(r.entsSeeds||0)<value(seed,'max')){r.entsSeeds++;const added=changeMaxHp(pl,value(seed));r.entsTempHp=(r.entsTempHp||0)+added;notice(pl,`🌱 SEMENTE ${r.entsSeeds}`);}}
  };

  global.notifyBlessingDash=function(pl){
    if(!pl)return;const r=root(pl),current=now();r.lastDashAt=current;
    const thunder=boon(pl,'zeus_thunder_step');if(thunder)r.zeusThunderUntil=current+value(thunder,'duration')*1000;
    const moon=boon(pl,'selene_moon_step');if(moon){area(pl,pl.x,pl.y,value(moon,'radius'),(pl.dmg||1)*amp(pl,'selene',value(moon)),'selene',null,24);notice(pl,'☽ PASSO LUNAR');}
    const counter=boon(pl,'atena_counterattack');if(counter)r.atenaCounterUntil=current+value(counter,'duration')*1000;
    const lightning=boon(pl,'hermes_lightning_attack');if(lightning)r.hermesLightningUntil=current+value(lightning,'duration')*1000;
    const image=boon(pl,'hermes_afterimage');if(image)r.hermesAfterimages=value(image,'images');
    const flow=boon(pl,'hermes_divine_flow');if(flow){r.hermesFlow=Math.min(value(flow,'max'),(r.hermesFlow||0)+1);r.hermesFlowAt=current;if(godState(pl,'hermes').ascension==='divine_speed'&&r.hermesFlow>=value(flow,'max'))pl._dashCd=0;}
    const currentCard=boon(pl,'poseidon_combat_current');if(currentCard){area(pl,pl.x,pl.y,value(currentCard,'radius'),(pl.dmg||1)*amp(pl,'poseidon',value(currentCard)),'poseidon',null,32);for(const pushed of nearest(pl.x,pl.y,value(currentCard,'radius'),null,20))pressure(pl,pushed,pl.dmg||1);notice(pl,'≋ CORRENTEZA');}
    if(godState(pl,'poseidon').ascension==='raging_seas'&&boon(pl,'poseidon_impact_wave'))area(pl,pl.x,pl.y,105,(pl.dmg||1)*.45,'poseidon',null,30);
    const phantom=boon(pl,'nazgul_phantom_strike');if(phantom){r.nazgulPhantomReady=true;r.nazgulPhantomUntil=current+value(phantom,'duration')*1000;}
    if(godState(pl,'nazgul').apotheosis&&(r.nazgulTerror||0)>=3){for(const [i,victim] of nearest(pl.x,pl.y,330,null,3).entries())setTimeout(()=>hurt(pl,victim,(pl.dmg||1)*.55,'nazgul'),i*80);notice(pl,'♞ CAVALEIROS NEGROS');}
    r.entsRooted=false;r.entsRootAt=current;
  };
  global.notifyBlessingDashAvoid=function(pl){if(!pl)return;const counter=boon(pl,'atena_counterattack');if(counter)root(pl).atenaCounterUntil=now()+value(counter,'duration')*1000;};
  global.notifyBlessingSpecial=function(){/* ataques especiais tambem passam pelos ganchos automaticos de ataque e acerto */};

  global.notifyBlessingDamageTaken=function(pl,amount=0){
    if(!pl)return;const r=root(pl),current=now();r.lastDamageAt=current;r.waveDamage=(r.waveDamage||0)+amount;r.atenaStance=0;r.atenaCleanKills=0;r.atenaMedals=Math.max(0,(r.atenaMedals||0)-1);r.nazgulKills=0;r.nazgulTerror=Math.max(0,(r.nazgulTerror||0)-1);r.entsHeartCharge=0;
    const retaliation=boon(pl,'ares_pain_feeds_pain');if(retaliation){r.aresRetaliation=value(retaliation,'charges');notice(pl,'⚔ RETALIAÇÃO PRONTA');}
    const last=boon(pl,'atena_last_defense');if(last&&amount>=pl.maxHp*value(last,'threshold')){r.atenaLastDefenseUntil=current+1800;r.atenaLastRetaliation=true;notice(pl,'⚖ ÚLTIMA DEFESA');}
    const resilience=boon(pl,'ents_resilience');if(resilience){if(current-(r.entsDamageWindowAt||0)>3000){r.entsDamageWindowAt=current;r.entsDamageWindow=0;}r.entsDamageWindow=(r.entsDamageWindow||0)+amount;if(r.entsDamageWindow>=pl.maxHp*.20&&current>=(r.entsResilienceReadyAt||0)){r.entsResilienceUntil=current+value(resilience,'duration')*1000;r.entsResilienceReadyAt=current+10000;r.entsDamageWindow=0;notice(pl,'❧ RESILIÊNCIA');}}
  };
  global.shouldBlessingDodge=function(pl){
    if(!pl)return false;const r=root(pl),form=boon(pl,'nazgul_spectral_form'),blade=boon(pl,'nazgul_phantom_blade');let chance=value(form);
    if(blade&&now()<(r.nazgulSpectralCritUntil||0))chance+=value(blade);if(!chance||Math.random()>=chance)return false;
    pl.inv=true;pl.invT=Math.max(pl.invT||0,260);r.nazgulPhantomReady=godState(pl,'nazgul').resonance;r.nazgulPhantomUntil=now()+2500;if(godState(pl,'nazgul').ascension==='witch_king')r.nazgulDodgeCrit=true;particles(pl.x,pl.y,COLORS.nazgul,13,70);notice(pl,'♟ FORMA ESPECTRAL');return true;
  };
  global.shouldBlessingPreventDeath=function(pl){
    if(!pl)return false;const r=root(pl),fate=boon(pl,'moros_delayed_fate');
    if(fate&&r.morosFatalReady){r.morosFatalReady=false;pl.hp=Math.max(1,Math.round(pl.maxHp*value(fate)));pl.inv=true;pl.invT=Math.max(pl.invT||0,value(fate,'invuln')*1000);if(godState(pl,'moros').ascension==='rewrite_fate')r.morosRewriteCrits=3;notice(pl,'⌛ DESTINO ADIADO');particles(pl.x,pl.y,COLORS.moros,22,95);return true;}
    if(now()<(r.atenaLastDefenseUntil||0)){pl.hp=Math.max(1,pl.hp);pl.inv=true;pl.invT=Math.max(pl.invT||0,500);r.atenaLastDefenseUntil=0;return true;}return false;
  };
  global.getBlessingIncomingDamageMultiplier=function(pl){
    if(!pl)return 1;const r=root(pl),current=now();let reduction=0;
    const cycle=boon(pl,'selene_lunar_cycle');if(cycle&&r.selenePhase===2)reduction+=amp(pl,'selene',value(cycle));
    const eclipse=boon(pl,'selene_eclipse');if(eclipse&&r.seleneEclipse)reduction+=value(eclipse);
    const aegis=boon(pl,'atena_living_aegis');if(aegis&&r.atenaAegisReady){reduction+=amp(pl,'atena',value(aegis))+(godState(pl,'atena').ascension==='absolute_aegis'?.08:0);r.atenaAegisReady=false;area(pl,pl.x,pl.y,90,(pl.dmg||1)*value(aegis),'atena',null,18);notice(pl,'◩ ÉGIDE VIVA');}
    const stance=boon(pl,'atena_perfect_stance');if(stance)reduction+=(r.atenaStance||0)*value(stance);
    if(current<(r.atenaLastDefenseUntil||0))reduction+=.55;
    const core=boon(pl,'hefesto_forged_core');if(core&&(r.hefestoArmor||0)>0){reduction+=amp(pl,'hefesto',value(core));r.hefestoArmor--;notice(pl,'⛨ ARMADURA ABSORVEU');}
    const lion=boon(pl,'hercules_lion_skin');if(lion&&hpRatio(pl)<.30)reduction+=value(lion);
    const bark=boon(pl,'ents_growing_bark');if(bark)reduction+=r.entsBark||0;
    const roots=boon(pl,'ents_deep_roots');if(roots&&r.entsRooted)reduction+=value(roots);
    const resilience=boon(pl,'ents_resilience');if(resilience&&current<(r.entsResilienceUntil||0))reduction+=value(resilience);
    return 1-clamp(reduction,0,.78);
  };

  function updateZones(pl,r,current){
    for(let i=r.delayed.length-1;i>=0;i--){const hit=r.delayed[i];if(hit.at>current)continue;r.delayed.splice(i,1);if(hit.target&&!hit.target.dead){hurt(pl,hit.target,hit.damage,hit.deityId);notice(pl,hit.label,hit.target.x,hit.target.y-22);if(hit.deityId==='ares'&&godState(pl,'ares').resonance)area(pl,hit.target.x,hit.target.y,75,hit.damage*.35,'ares',hit.target);}}
    for(let i=r.zones.length-1;i>=0;i--){const zone=r.zones[i];if(zone.until<=current){r.zones.splice(i,1);continue;}if(zone.next>current)continue;zone.next=current+(zone.kind==='witch'?650:500);particles(zone.x,zone.y,zone.kind==='witch'?COLORS.hecate:'#d791ff',zone.kind==='witch'?4:2,zone.radius);
      if(zone.kind==='witch')area(pl,zone.x,zone.y,zone.radius,zone.damage,'hecate');
    }
  }
  function apotheosisPulse(pl,r,current){
    if(current<(r.apotheosisPulseAt||0))return;r.apotheosisPulseAt=current+4200;const base=pl.dmg||1;
    if(godState(pl,'zeus').apotheosis){for(const victim of targets().slice(0,5))hurt(pl,victim,base*.48,'zeus');notice(pl,'⚡ TEMPESTADE TOTAL');}
    if(godState(pl,'hecate').apotheosis){for(const [i,victim] of targets().slice(0,3).entries())setTimeout(()=>hurt(pl,victim,base*(.38+i*.08),'hecate'),i*90);notice(pl,'🔮 TRÊS HÉCATES');}
    if(godState(pl,'selene').apotheosis){area(pl,pl.x,pl.y,150,base*.45,'selene');heal(pl,pl.maxHp*.012,'CONVERGÊNCIA');}
    if(godState(pl,'poseidon').apotheosis&&r.poseidonTide>=.8){area(pl,pl.x,pl.y,360,base*.58,'poseidon',null,40);notice(pl,'🌊 DILÚVIO');}
    if(godState(pl,'ents').apotheosis&&current-(r.lastDamageAt||0)>7000){for(const victim of nearest(pl.x,pl.y,320,null,3))hurt(pl,victim,base*.46,'ents');notice(pl,'🌳 MARCHA DOS ENTS');}
  }
  function updateCombatHud(){
    if(typeof document==='undefined')return;injectUI();const hud=document.getElementById('affinity-combat-hud');if(!hud)return;
    const lines=[];for(const pl of players()){
      const r=root(pl),states=[];
      for(const deity of DEITIES){const g=godState(pl,deity.id);if(!g.count)continue;const tags=[];if(g.resonance)tags.push('R');if(g.ascension)tags.push('A');if(g.evolved)tags.push('↑');if(g.apotheosis)tags.push('★');states.push(`${deity.icon}${g.count}/5${tags.join('')}`);}
      const meters=[];if(boon(pl,'poseidon_rising_tide'))meters.push(`Maré ${Math.round((r.poseidonTide||0)*100)}%`);if(boon(pl,'sauron_corrupting_power'))meters.push(`Corrupção ${Math.round((r.sauronCorruption||0)*100)}%`);if(boon(pl,'hermes_divine_flow'))meters.push(`Fluxo ${r.hermesFlow||0}`);if(boon(pl,'atena_perfect_stance'))meters.push(`Postura ${r.atenaStance||0}/5`);if(boon(pl,'nazgul_rising_terror'))meters.push(`Terror ${r.nazgulTerror||0}`);
      if(states.length)lines.push(`<div class="affinity-combat-row"><b>P${(pl.idx||0)+1}</b> ${states.join(' · ')}${meters.length?`<br>${meters.join(' · ')}`:''}</div>`);
    }
    hud.innerHTML=lines.join('');
  }
  global.updateBlessingEffects=function(pl,dt=0){
    if(!pl)return;const r=root(pl),current=now();updateZones(pl,r,current);
    const cycle=boon(pl,'selene_lunar_cycle');if(cycle){if(!r.selenePhaseAt)r.selenePhaseAt=current;if(current-r.selenePhaseAt>=value(cycle,'duration')*1000){r.selenePhase=(Number(r.selenePhase||0)+1)%3;r.selenePhaseAt=current;r.seleneCycles=(r.seleneCycles||0)+(r.selenePhase===0?1:0);notice(pl,['☽ CRESCENTE','● LUA CHEIA','◐ MINGUANTE'][r.selenePhase]);area(pl,pl.x,pl.y,100,(pl.dmg||1)*value(cycle)*.7,'selene');}}
    const beam=boon(pl,'selene_moonbeam');if(beam&&current>=(r.seleneMoonbeamAt||0)){r.seleneMoonbeamAt=current+value(beam,'cooldown')*1000;const prey=strongest();if(prey){hurt(pl,prey,(pl.dmg||1)*amp(pl,'selene',value(beam)),'selene');notice(pl,'☄ RAIO DE LUAR',prey.x,prey.y-24);}}
    const eclipse=boon(pl,'selene_eclipse');if(eclipse){const active=hpRatio(pl)<value(eclipse,'threshold');if(active&&!r.seleneEclipse)notice(pl,'◒ ECLIPSE');r.seleneEclipse=active||(r.seleneEclipse&&hpRatio(pl)<.52);if(r.seleneEclipse&&current>=(r.seleneEclipsePulseAt||0)){r.seleneEclipsePulseAt=current+1800;area(pl,pl.x,pl.y,95,(pl.dmg||1)*value(eclipse)*.45,'selene');}}
    const aegis=boon(pl,'atena_living_aegis');if(aegis&&!r.atenaAegisReady&&current-(r.lastDamageAt||0)>=value(aegis,'cooldown')*1000)r.atenaAegisReady=true;
    const stance=boon(pl,'atena_perfect_stance');if(stance&&current-(r.lastDamageAt||0)>=(r.atenaStance||0)+1*value(stance,'interval')*1000&&r.atenaStance<5){r.atenaStance++;if(r.atenaStance===5)notice(pl,'♜ POSTURA PERFEITA');}
    const momentum=boon(pl,'hermes_momentum');if(momentum){const delta=Math.max(0,Number(dt)||0);r.hermesMomentum=pl.isMoving?Math.min(value(momentum),(r.hermesMomentum||0)+delta*value(momentum)*.30):Math.max(0,(r.hermesMomentum||0)-delta*value(momentum)*.8);}
    if((r.hermesFlow||0)>0&&current-(r.hermesFlowAt||0)>2400)r.hermesFlow=Math.max(0,(r.hermesFlow||0)-Math.max(.02,(dt||0)*.5));
    const oldBuffs=r.dionBuffs||[];for(const buff of oldBuffs){if(buff.until>current||buff.expired)continue;buff.expired=true;const hang=boon(pl,'dionisio_hangover');if(hang){area(pl,pl.x,pl.y,70,(pl.dmg||1)*value(hang)*.35,'dionisio');if(godState(pl,'dionisio').resonance&&Math.random()<.5)addBuff(pl,random(['damage','attack','speed']),value(hang)*.4,2.5);}}
    r.dionBuffs=oldBuffs.filter(buff=>buff.until>current||current-buff.until<500);
    const tide=boon(pl,'poseidon_rising_tide');if(tide&&r.poseidonTide&&current-(r.poseidonTideAt||0)>value(tide,'decay')*1000&&godState(pl,'poseidon').ascension!=='raging_seas')r.poseidonTide=Math.max(0,r.poseidonTide-Math.max(.001,(dt||0)*.09));
    const rough=boon(pl,'poseidon_rough_sea');if(rough&&nearest(pl.x,pl.y,145,null,99).length>=value(rough,'near')&&current>=(r.poseidonRoughAt||0)){r.poseidonRoughAt=current+value(rough,'cooldown')*1000;area(pl,pl.x,pl.y,145,(pl.dmg||1)*amp(pl,'poseidon',value(rough)),'poseidon',null,26);notice(pl,'≈ MAR REVOLTO');}
    const roots=boon(pl,'ents_deep_roots');if(roots){if(!r.entsRootAt)r.entsRootAt=current;r.entsRooted=current-(r.lastDashAt||r.entsRootAt)>=value(roots,'delay')*1000;if(r.entsRooted&&current>=(r.entsRootPulseAt||0)){r.entsRootPulseAt=current+1700;for(const victim of nearest(pl.x,pl.y,150,null,godState(pl,'ents').ascension==='awakened_forest'?3:1))hurt(pl,victim,(pl.dmg||1)*value(roots)*.55,'ents');particles(pl.x,pl.y,COLORS.ents,5,55);}}
    const heart=boon(pl,'ents_forest_heart');if(heart){const fertile=godState(pl,'ents').resonance&&r.entsRooted?1.65:1;r.entsHeartCharge=current-(r.lastDamageAt||current);if(r.entsHeartCharge>=value(heart,'charge')*1000/fertile&&current>=(r.entsHeartAt||0)){r.entsHeartAt=current+value(heart,'charge')*1000;heal(pl,pl.maxHp*value(heart),'CORAÇÃO');if(godState(pl,'ents').ascension==='awakened_forest')area(pl,pl.x,pl.y,130,(pl.dmg||1)*.5,'ents');}}
    if(godState(pl,'hercules').apotheosis&&(r.herculesLabors||0)>=3)r.herculesHeroUntil=current+1200;
    if(godState(pl,'moros').apotheosis&&hpRatio(pl)<.30){r.morosInevitable=Math.max(r.morosInevitable||0,.25);r.morosPredestined=(r.morosPredestined||0)+Math.max(0,dt||0)*.5;}
    apotheosisPulse(pl,r,current);
    let move=0;if(cycle&&r.selenePhase===0)move+=value(cycle);move+=r.hermesMomentum||0;const flow=boon(pl,'hermes_divine_flow');if(flow)move+=(r.hermesFlow||0)*value(flow)*.40;for(const buff of activeBuffs(r,current))if(buff.type==='speed')move+=buff.power;const terror=boon(pl,'nazgul_rising_terror');if(terror)move+=(r.nazgulTerror||0)*value(terror);if(current<(r.herculesTrophyUntil||0))move+=value(boon(pl,'hercules_monster_trophy'))*.5;if(current<(r.herculesHeroUntil||0))move+=.22;
    const factor=1+clamp(move,0,1.4);pl.speed=pl.speed/(r.speedFactor||1)*factor;r.speedFactor=factor;
    if(current>=(r.hudAt||0)){r.hudAt=current+250;updateCombatHud();}
  };

  const legacyWave=global.applyCardWaveRegen;
  global.applyCardWaveRegen=function(){
    legacyWave?.();for(const pl of players().filter(p=>!p.dead)){
      const r=root(pl);r.morosFatalReady=!!boon(pl,'moros_delayed_fate');r.waveDamage=0;r.atenaCleanKills=0;r.herculesWaveKills=0;r.entsSeedKills=0;r.sauronCorruption=Math.max(0,(r.sauronCorruption||0)-.15);r.omenGuarantee=true;
      const bark=boon(pl,'ents_growing_bark');if(bark){r.entsBark=Math.min(value(bark,'max'),(r.entsBark||0)+value(bark));notice(pl,`🌳 CASCA ${pct(r.entsBark)}`);}
      if(r.entsTempHp){const keep=godState(pl,'ents').ascension==='last_shepherd'?r.entsTempHp*.30:0;changeMaxHp(pl,-r.entsTempHp/pl.maxHp);if(keep>0)changeMaxHp(pl,keep/pl.maxHp);r.entsTempHp=0;r.entsSeeds=0;}
      if(boon(pl,'hercules_labors')&&r.herculesLabors>=value(boon(pl,'hercules_labors'),'max')){r.herculesHeroUntil=now()+8000;notice(pl,'★ ESTADO HEROICO');}
    }
  };
  const legacyLifesteal=global.applyCardLifesteal;
  global.applyCardLifesteal=function(pl,x,y){legacyLifesteal?.(pl,x,y);if(!pl)return;const killed=targets().find(t=>t.dead&&t.x===x&&t.y===y);if(killed)global.notifyBlessingKill(pl,killed,null);};

  global.resetCardBlessings=function(){
    if(typeof activeCardBlessings!=='undefined')activeCardBlessings=[];selected=null;selectedElement=null;ascensionQueue=[];
    for(const pl of [typeof player!=='undefined'?player:null,typeof player2!=='undefined'?player2:null].filter(Boolean)){const r=pl.cardEffects?.affinityV4;if(r?.speedFactor)pl.speed/=r.speedFactor;pl.cardEffects={};}
    document.getElementById('blessing-ascension-screen')?.classList.remove('open');const combat=document.getElementById('affinity-combat-hud');if(combat)combat.innerHTML='';global.updateBlessingsHUD?.();
  };
  function exportState(pl){const r=root(pl);return {version:4,boons:Object.values(r.boons).map(card=>({id:card.id,rarity:card.rarity})),gods:JSON.parse(JSON.stringify(r.gods))};}
  const handledTypes=new Set(DEITIES.flatMap(deity=>deity.boons.map(boon=>boon.type)));
  global.__BLESSING_AFFINITY_DEBUG__={
    AFFINITY_WEIGHTS:Object.freeze([...AFFINITY_WEIGHTS]),BOON_MAP,handledTypes,root,godState,boon,value,materialize,eligibleDeities,milestone,chooseAscension,applyBoon,damageBonus,attackSpeedBonus,criticalChance,exportState,
    resetPlayer(pl){pl.cardEffects={};return root(pl);},flushAscensions(){ascensionQueue=[];},get ascensionQueueSize(){return ascensionQueue.length;}
  };
  global.DEITY_BLESSINGS_V4=Object.freeze(DEITIES);
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener?.('DOMContentLoaded',injectUI,{once:true});else injectUI();}
})(window);
