// BÊNÇÃOS DOS FORNECEDORES — execução preservada da versão monolítica.
(function(global){
  'use strict';
  const data=global.MagoBlessingData;
  if(!data)throw new Error('MagoBlessingData deve ser carregado antes do sistema de bencaos.');
  const {DEITIES,RARITY_ORDER,RARITY_META}=data;
  const DEITY_MAP=Object.fromEntries(DEITIES.map(d=>[d.id,d]));
  let selectedCardOffer=null;
  let selectedCardElement=null;

  function pct(value){ return `${Math.round(value*100)}%`; }
  function cardValueText(boon,value,rarityIndex){
    const at=key=>Array.isArray(boon[key])?boon[key][rarityIndex]:boon[key];
    const type=boon.type;
    if(type==='zeusOverload')return `${at('hits')} acertos · +${pct(value)} no próximo ataque`;
    if(type==='hecateEcho')return `a cada ${at('hits')} ativações · +${pct(value)} de poder`;
    if(type==='morosMarked')return `${at('hits')}º ataque crítico garantido`;
    if(type==='morosRevive')return `sobrevive com ${Math.max(1,Math.round(value*100))}% de vida · 1 vez/onda`;
    if(type==='poseidonRelentless')return `+${String(value).replace('.',',')}s antes da Maré cair`;
    if(type==='entsWaveDefense')return `+${String((value*100).toFixed(1)).replace('.',',')}% defesa/onda · teto ${pct(at('max'))}`;
    if(type==='hecateForbidden'||type==='sauronCorruption')return `−${pct(at('hpPenalty'))} vida · +${pct(value)} poder`;
    if(type==='critBoth') return `+${pct(value)} chance · +${pct(boon.secondary[rarityIndex])} dano crítico`;
    if(type==='killHealPct') return `+${String((value*100).toFixed(1)).replace('.',',')}% da vida por eliminação`;
    if(type==='growthHp') return `+${String((value*100).toFixed(1)).replace('.',',')}% de vida a cada 10 eliminações`;
    if(type==='abilityCd'||type==='dashCd') return `−${pct(value)} de recarga`;
    if(type==='killAtk'||type==='killDamage') return `+${pct(value)} por acúmulo · máximo 5`;
    if(type==='damageDefense'||type==='damageMaxHp'||type==='lowHpDamageSpeed'||type==='afterDashBoth') return `+${pct(value)} em ambos os atributos`;
    const labels={damage:'dano',meleeDamage:'dano corpo a corpo',attackSpeed:'velocidade de ataque',consecutive:'dano máximo',bossDamage:'dano contra chefes',specialDamage:'dano especial',safeDamage:'dano',buffDuration:'duração',specialNormal:'dano de ataque',maxHp:'vida máxima',defense:'defesa',safeSpeed:'velocidade',highHp80Damage:'dano',crit:'chance crítica',critDmg:'dano crítico',low30Defense:'defesa',rarityBoost:'raridade superior',lowHpCrit:'chance crítica',highHp70Damage:'dano',dashDefense:'defesa',move:'velocidade',movingDamage:'dano',projectile:'alcance e velocidade',lowHpDefense:'defesa máxima',healing:'cura recebida',killSpeed:'velocidade',highEnemy:'dano',highHpAtk:'velocidade de ataque',afterDamage:'dano',missingHpDamage:'dano máximo',lowEnemy:'dano',afterDamageDefense:'defesa',dodge:'esquiva',rootsDefense:'defesa'};
    const roleLabels={DANO:'dano',COMBO:'poder de combo',CRÍTICO:'chance crítica',CHEFE:'dano especializado',RISCO:'poder máximo',MAGIA:'poder mágico',FASES:'bônus da fase',MOVIMENTO:'velocidade',DESTINO:'efeito de destino',SOBREVIVÊNCIA:'sobrevivência',PROGRESSÃO:'progressão',TÉCNICA:'eficiência',RITMO:'velocidade de ataque',CAOS:'efeito temporário',ARMA:'poder da arma',PRECISÃO:'precisão',DEFESA:'defesa',PROVAÇÃO:'dano',CORRUPÇÃO:'poder',ESQUIVA:'esquiva',ASSASSINATO:'dano',CRESCIMENTO:'crescimento'};
    return `+${pct(value)} ${labels[type]||roleLabels[boon.role]||'bônus'}`;
  }

  function materialize(deity,boon,rarity){
    const rarityIndex=RARITY_ORDER.indexOf(rarity);
    const value=boon.values[rarityIndex];
    return {...boon,deityId:deity.id,god:`${deity.icon} ${deity.name}`,rarity,value,rarityIndex,
      uniqueGroup:boon.id,desc:boon.desc,valueText:cardValueText(boon,value,rarityIndex)};
  }

  function randomItem(items){ return items[Math.floor(Math.random()*items.length)]; }
  function ownedIds(){ return new Set(activeCardBlessings.map(card=>card.id)); }
  function eligibleDeities(){
    const owned=ownedIds();
    return DEITIES.filter(deity=>deity.boons.filter(boon=>!owned.has(boon.id)).length>=3);
  }

  rollCardRarity=function(){
    const pls=[typeof player!=='undefined'?player:null,typeof player2!=='undefined'?player2:null].filter(Boolean);
    const omen=Math.max(0,...pls.map(p=>p.cardEffects?.rarityBoost||0));
    const late=wave>20?3:wave>10?1.5:0;
    const weights={comum:48,incomum:25,rara:18+late*1.2,epica:7+late*.6,lendaria:2+(wave>15?1:0)};
    const shift=Math.min(18,omen*100);
    weights.comum=Math.max(24,weights.comum-shift);
    weights.incomum+=shift*.20;weights.rara+=shift*.42;weights.epica+=shift*.25;weights.lendaria+=shift*.13;
    let roll=Math.random()*Object.values(weights).reduce((a,b)=>a+b,0);
    for(const rarity of RARITY_ORDER){roll-=weights[rarity];if(roll<=0)return rarity;}
    return 'comum';
  };

  rollCardOffer=function(count=3){
    const deities=eligibleDeities();
    if(!deities.length) return [];
    const deity=randomItem(deities);
    const owned=ownedIds();
    let pool=deity.boons.filter(boon=>!owned.has(boon.id));
    const offers=[];
    while(offers.length<Math.min(3,count,pool.length)){
      const index=Math.floor(Math.random()*pool.length);
      const boon=pool.splice(index,1)[0];
      offers.push(materialize(deity,boon,rollCardRarity()));
      if(boon.id==='hefesto_specialist')pool=pool.filter(item=>item.id!=='hefesto_perfect_alloy');
      if(boon.id==='hefesto_perfect_alloy')pool=pool.filter(item=>item.id!=='hefesto_specialist');
    }
    const guarantee=[typeof player!=='undefined'?player:null,typeof player2!=='undefined'?player2:null]
      .filter(Boolean).find(pl=>(pl.cardEffects?.omenGuarantee||0)>0);
    if(guarantee&&offers.length&&!offers.some(card=>card.rarityIndex>=2)){
      offers[0]=materialize(deity,deity.boons.find(boon=>boon.id===offers[0].id),randomItem(['rara','epica','lendaria']));
      guarantee.cardEffects.omenGuarantee--;
    }
    offers.deityId=deity.id;
    return offers;
  };

  openDeityIntro=function(deityId,offers){
    const screen=document.getElementById('deity-intro-screen');
    const deity=DEITY_MAP[deityId];
    if(!screen||!deity){revealCardOffers(offers);return;}
    pendingCardOffers=offers; activeDeityPresentation=deityId; deityIntroTransitioning=false;
    clearTimeout(deityIntroTimer);
    const art=document.getElementById('deity-intro-art');
    art.src=deity.image; art.alt=`${deity.name} — ${deity.title}`;
    document.getElementById('deity-intro-name').textContent=deity.name;
    document.getElementById('deity-intro-title').textContent=deity.title;
    document.getElementById('deity-intro-dialogue').textContent=`“${randomItem(deity.dialogues)}”`;
    screen.dataset.deity=deityId; screen.setAttribute('aria-hidden','false');
    screen.classList.remove('open','leaving'); void screen.offsetWidth; screen.classList.add('open');
    if(typeof Audio!=='undefined'&&Audio.playDeityArrival) Audio.playDeityArrival(deityId);
    const button=screen.querySelector('.deity-dialogue-continue');
    if(button){button.disabled=false;setTimeout(()=>button.focus({preventScroll:true}),560);}
  };

  revealCardOffers=function(offers){
    if(!offers||offers.length!==3){closeCardOffer();return;}
    const deity=DEITY_MAP[offers.deityId||offers[0].deityId];
    const label=document.getElementById('card-deity-label');
    if(label&&deity) label.textContent=`${deity.name} — ${deity.title}`;
    selectedCardOffer=null;selectedCardElement=null;
    const confirm=document.getElementById('card-confirm-btn');
    if(confirm){confirm.disabled=true;confirm.textContent='CONFIRMAR ›';}
    const skip=document.querySelector('#card-screen .card-skip-btn');
    if(skip) skip.textContent='‹ VOLTAR';
    const waveLabel=document.getElementById('card-wave-label');
    if(waveLabel) waveLabel.textContent=`Onda ${wave} concluída`;
    renderCardOffers(offers);
    document.getElementById('card-screen').classList.add('open');
  };

  openCardOffer=function(){
    cardOfferOpen=true;state='shop';hideAllScreens();
    const offers=rollCardOffer(3);
    if(offers.length!==3){closeCardOffer();return;}
    openDeityIntro(offers.deityId,offers);
  };

  renderCardOffers=function(offers){
    const row=document.getElementById('cards-row');
    if(!row)return;
    row.innerHTML='';
    const preview=document.getElementById('card-active-preview');
    if(preview) preview.innerHTML=activeCardBlessings.map(b=>`<span class="card-active-pip r-${b.rarity}" title="${b.name}">${b.icon}</span>`).join('');
    offers.forEach((card,index)=>{
      const rarity=RARITY_META[card.rarity];
      const el=document.createElement('button');
      el.type='button';el.className=`bless-card r-${card.rarity}`;
      el.style.animationDelay=`${index*.11}s`;
      el.setAttribute('aria-label',`${rarity.label}: ${card.name}. ${card.valueText}`);
      el.innerHTML=`
        <div class="bless-card-header">
          <span class="bless-card-icon" aria-hidden="true">${card.icon}</span>
          <div class="bless-card-heading"><div class="bless-card-name">${card.name}</div><div class="bless-card-rarity">${rarity.label}</div></div>
        </div>
        <div class="bless-card-body">
          <div class="bless-card-role">${card.role}</div>
          <div class="bless-card-desc">${card.desc}</div>
          <div class="bless-card-divider"><span></span></div>
          <div class="bless-card-value">${card.valueText}</div>
        </div>`;
      el.onclick=()=>pickCard(card,el);
      row.appendChild(el);
    });
  };

  pickCard=function(card,el){
    if(!card||activeCardBlessings.some(owned=>owned.id===card.id))return;
    selectedCardOffer=card;selectedCardElement=el;
    document.querySelectorAll('#cards-row .bless-card').forEach(node=>node.classList.toggle('selected',node===el));
    const confirm=document.getElementById('card-confirm-btn');
    if(confirm){confirm.disabled=false;confirm.textContent=`CONFIRMAR ${card.name.toUpperCase()} ›`;confirm.focus({preventScroll:true});}
  };

  window.confirmCardOffer=function(){
    const card=selectedCardOffer;
    if(!card||activeCardBlessings.some(owned=>owned.id===card.id))return;
    const activePlayers=[typeof player!=='undefined'?player:null,...(gameMode===2&&typeof player2!=='undefined'&&player2?[player2]:[])].filter(p=>p&&!p.dead);
    activePlayers.forEach(pl=>applyDeityBoon(pl,card));
    activeCardBlessings.push(card);updateBlessingsHUD();
    const colors={comum:'#79e89a',incomum:'#43d477',rara:'#58a8ff',epica:'#c86cff',lendaria:'#ffd35a'};
    spawnLevelUpNotice(W/2,H/2-50,`${card.icon} ${card.name}!`,0);
    if(typeof parts!=='undefined'&&Array.isArray(parts)){
      spawnParts(W/2,H/2,colors[card.rarity],card.rarity==='lendaria'?34:22,95);
    }
    if(selectedCardElement)selectedCardElement.classList.add('confirmed');
    selectedCardOffer=null;selectedCardElement=null;
    setTimeout(()=>closeCardOffer(),260);
  };

  function effect(pl){return pl.cardEffects||(pl.cardEffects={});}
  function add(e,key,value){e[key]=(e[key]||0)+value;}
  function increaseMaxHp(pl,value){const delta=pl.maxHp*value;pl.maxHp+=delta;pl.hp=Math.min(pl.maxHp,pl.hp+delta);}
  function applyDeityBoon(pl,card){
    const e=effect(pl),v=card.value,t=card.type;
    if(t==='damage')pl.dmg*=1+v;
    else if(t==='meleeDamage')add(e,'meleeDamage',v);
    else if(t==='attackSpeed')pl.atkCd/=1+v;
    else if(t==='maxHp')increaseMaxHp(pl,v);
    else if(t==='defense')pl.dmgReduce=Math.min(.65,(pl.dmgReduce||0)+v);
    else if(t==='move')pl.speed*=1+v;
    else if(t==='dashCd')pl._dashMaxCd*=1-v;
    else if(t==='crit')add(e,'critChance',v);
    else if(t==='critDmg')add(e,'critMultBonus',v);
    else if(t==='projectile'){pl.range*=1+v;add(e,'projectileSpeed',v);}
    else if(t==='healing')add(e,'healingMult',v);
    else if(t==='rarityBoost')add(e,'rarityBoost',v);
    else if(t==='dodge')add(e,'dodgeChance',v);
    else if(t==='damageDefense'){pl.dmg*=1+v;pl.dmgReduce=Math.min(.65,(pl.dmgReduce||0)+v);}
    else if(t==='damageMaxHp'){pl.dmg*=1+v;increaseMaxHp(pl,v);}
    else if(t==='critBoth'){add(e,'critChance',v);add(e,'critMultBonus',card.secondary[card.rarityIndex]);}
    else if(t==='abilityCd'){
      add(e,'abilityCd',v);
      // As habilidades de mago, guerreiro e arqueiro disparam junto do ataque.
      // Neles, acelerar o ataque tambem acelera a habilidade. O Viking usa o
      // cooldown proprio do Grito de Guerra, atualizado em updateAbility().
      if(pl.classId!=='viking')pl.atkCd/=1+v;
    }
    else add(e,t,v);
    e.lastHitAt=e.lastHitAt||performance.now();
  }
  window.applyDeityBoon=applyDeityBoon;

  function isBossTarget(target){
    if(!target)return false;
    return (typeof bossOrc!=='undefined'&&target===bossOrc)
      ||(typeof bossSkel!=='undefined'&&target===bossSkel)
      ||(typeof bossSpider!=='undefined'&&target===bossSpider)
      ||(typeof bossMajor!=='undefined'&&target===bossMajor)
      ||(typeof petBoss!=='undefined'&&target===petBoss)
      ||target.isBoss||target.boss;
  }
  function hpRatio(entity){return entity&&entity.maxHp?Math.max(0,Math.min(1,entity.hp/entity.maxHp)):1;}
  function temporaryDuration(pl,base){return base*(1+(pl.cardEffects?.buffDuration||0));}
  function dynamicDamageBonus(pl,target){
    const e=pl.cardEffects||{},now=performance.now(),hp=hpRatio(pl),targetHp=hpRatio(target);let bonus=0;
    // As habilidades de classe fazem parte do golpe que as dispara. Este bônus
    // entra aqui para funcionar igualmente no mago, guerreiro, arqueiro e viking.
    bonus+=e.specialDamage||0;
    if(isBossTarget(target))bonus+=e.bossDamage||0;
    if(targetHp<.4)bonus+=e.lowEnemy||0;
    if(targetHp>.7)bonus+=e.highEnemy||0;
    bonus+=(e.missingHpDamage||0)*(1-hp);
    if(hp>.8)bonus+=e.highHp80Damage||0;
    if(hp>.7)bonus+=e.highHp70Damage||0;
    if(hp<.4)bonus+=e.lowHpDamageSpeed||0;
    if(now-(e.lastHitAt||0)>=3000)bonus+=e.safeDamage||0;
    if(pl.isMoving)bonus+=e.movingDamage||0;
    if(now<(e.afterDashUntil||0))bonus+=e.afterDashBoth||0;
    if(now<(e.afterDamageUntil||0))bonus+=e.afterDamage||0;
    if(now<(e.killStackUntil||0))bonus+=(e.killDamage||0)*(e.killStacks||0);
    if(now<(e.specialNormalUntil||0))bonus+=e.specialNormal||0;
    if(e.consecutive){
      if(now-(e.lastAttackAt||0)>1800)e.consecutiveCharge=0;
      e.consecutiveCharge=Math.min(1,(e.consecutiveCharge||0)+.2);
      bonus+=e.consecutive*e.consecutiveCharge;e.lastAttackAt=now;
    }
    return bonus;
  }

  applyCardCrit=function(pl,baseDmg,target){
    if(!pl)return baseDmg;
    const e=pl.cardEffects||{};let damage=baseDmg*(1+dynamicDamageBonus(pl,target)+getCampaignShopDamageBonus(pl,target)+CampProgressionSystem.damageBonus(pl,target));
    if((pl.classId==='warrior'||pl.classId==='viking')&&e.meleeDamage)damage*=1+e.meleeDamage;
    let chance=(e.critChance||0)+getCampaignShopCritBonus(pl),didCrit=false;
    if(e.lowHpCrit)chance+=e.lowHpCrit*(1-hpRatio(pl));
    if(chance>0&&Math.random()<chance){
      didCrit=true;damage*=2.5+(e.critMultBonus||0);e.critAtkUntil=performance.now()+temporaryDuration(pl,2600);
      spawnParts(pl.x,pl.y-10,'#ffd35a',6,45);
    }
    pl._lastAttackWasCrit=didCrit;
    if(target){target._lastDamageOwner=pl;target._lastHitCrit=didCrit;}
    if(typeof campaignModifyOutgoingDamage==='function')damage=campaignModifyOutgoingDamage(pl,target,damage);
    return damage;
  };

  applyCardLifesteal=function(pl,x,y){
    if(!pl)return;const e=pl.cardEffects||{},now=performance.now();
    let heal=e.lifeSteal||0;
    if(e.killHealPct)heal+=pl.maxHp*e.killHealPct;
    if(heal>0){heal*=1+(e.healingMult||0);pl.hp=Math.min(pl.maxHp,pl.hp+heal);spawnParts(x,y,'#79e89a',5,34);}
    if(e.killAtk){e.killAtkStacks=Math.min(5,(e.killAtkStacks||0)+1);e.killAtkUntil=now+temporaryDuration(pl,4200);}
    if(e.killSpeed){e.killSpeedUntil=now+temporaryDuration(pl,3200);}
    if(e.killDamage){e.killStacks=Math.min(5,(e.killStacks||0)+1);e.killStackUntil=now+temporaryDuration(pl,4500);}
    if(e.growthHp){
      e.growthKills=(e.growthKills||0)+1;
      if(e.growthKills%10===0&&(e.growthStacks||0)<10){e.growthStacks=(e.growthStacks||0)+1;increaseMaxHp(pl,e.growthHp);spawnLevelUpNotice(pl.x,pl.y-28,'CRESCIMENTO ANCESTRAL',pl.idx||0);}
    }
    const killed=[...allTargets(enemies)].find(target=>target&&target.dead&&target.x===x&&target.y===y);
    if(killed)notifyCampaignShopTargetKilled(pl,killed);
  };

  window.notifyBlessingDash=function(pl){
    const e=pl?.cardEffects;if(!e)return;const now=performance.now();
    if(e.dashDefense)e.dashDefenseUntil=now+temporaryDuration(pl,1500);
    if(e.afterDashBoth)e.afterDashUntil=now+temporaryDuration(pl,2000);
  };
  window.notifyBlessingSpecial=function(pl){
    const e=pl?.cardEffects;if(!e||!e.specialNormal)return;
    e.specialNormalUntil=performance.now()+temporaryDuration(pl,4000);
  };
  window.notifyBlessingDamageTaken=function(pl){
    const e=pl?.cardEffects;if(!e)return;const now=performance.now();e.lastHitAt=now;
    e.consecutiveCharge=0;
    if(e.afterDamageDefense)e.afterDamageDefenseUntil=now+temporaryDuration(pl,3200);
    if(e.afterDamage)e.afterDamageUntil=now+temporaryDuration(pl,4000);
  };
  window.shouldBlessingDodge=function(pl){
    const chance=pl?.cardEffects?.dodgeChance||0;
    if(chance>0&&Math.random()<chance){pl.inv=true;pl.invT=Math.max(pl.invT||0,220);spawnParts(pl.x,pl.y,'#8c78a8',10,55);return true;}
    return false;
  };
  window.getBlessingIncomingDamageMultiplier=function(pl){
    const e=pl?.cardEffects||{},now=performance.now(),hp=hpRatio(pl);let reduction=0;
    reduction+=(e.lowHpDefense||0)*(1-hp);
    if(hp<.3)reduction+=e.low30Defense||0;
    if(now<(e.dashDefenseUntil||0))reduction+=e.dashDefense||0;
    if(now<(e.afterDamageDefenseUntil||0))reduction+=e.afterDamageDefense||0;
    if(now-(e.lastHitAt||0)>=3000)reduction+=e.rootsDefense||0;
    return 1-Math.min(.70,reduction);
  };

  window.updateBlessingEffects=function(pl,dt){
    const e=pl?.cardEffects;if(!e)return;const now=performance.now(),hp=hpRatio(pl);
    let atkBonus=0,speedBonus=0;
    if(hp<.4)atkBonus+=e.lowHpDamageSpeed||0;
    if(hp>.7)atkBonus+=e.highHpAtk||0;
    if(now<(e.critAtkUntil||0))atkBonus+=e.critAtk||0;
    if(now<(e.killAtkUntil||0))atkBonus+=(e.killAtk||0)*(e.killAtkStacks||0);else e.killAtkStacks=0;
    if(now<(e.afterDashUntil||0))atkBonus+=e.afterDashBoth||0;
    if(now-(e.lastHitAt||0)>=3000)speedBonus+=e.safeSpeed||0;
    if(now<(e.killSpeedUntil||0))speedBonus+=e.killSpeed||0;
    if(now<(e.afterDashUntil||0))speedBonus+=e.afterDashBoth||0;
    const atkFactor=1/(1+atkBonus),speedFactor=1+speedBonus;
    pl.atkCd=pl.atkCd/(e._atkFactor||1)*atkFactor;pl.speed=pl.speed/(e._speedFactor||1)*speedFactor;
    e._atkFactor=atkFactor;e._speedFactor=speedFactor;
  };

  // Motor v3 compartilhado pelas 75 bênçãos. O estado fica por jogador para
  // funcionar tanto no solo quanto no cooperativo sem misturar sequências.
  const legacyBlessingWaveRegen=applyCardWaveRegen;
  function boon(pl,id){return pl?.cardEffects?.boons?.[id]||null;}
  function bv(card,key='value',fallback=0){
    if(!card)return fallback;
    const raw=key==='value'?card.value:card[key];
    return Array.isArray(raw)?(raw[card.rarityIndex]??fallback):(raw??fallback);
  }
  function blessingAmp(pl,value){const ring=boon(pl,'sauron_one_ring');return value*(1+bv(ring));}
  function penaltyAmp(pl,value){const ring=boon(pl,'sauron_one_ring');return value*(1+bv(ring,'penalty'));}
  function changeMaxHp(pl,delta,heal=true){
    if(!pl||!Number.isFinite(delta)||!delta)return 0;
    const old=pl.maxHp;pl.maxHp=Math.max(1,pl.maxHp+delta);
    if(heal&&delta>0)pl.hp=Math.min(pl.maxHp,pl.hp+delta);else pl.hp=Math.min(pl.maxHp,Math.max(1,pl.hp));
    return pl.maxHp-old;
  }
  function targetState(e,target){
    if(!target)return {};
    e.targetStates=e.targetStates||new WeakMap();
    let state=e.targetStates.get(target);if(!state){state={};e.targetStates.set(target,state);}return state;
  }
  function sourceKey(pl,weapon){return weapon?.type||`${pl?.classId||'hero'}_base`;}
  function slotsFor(pl){
    if(typeof getSlots==='function')return getSlots(pl.idx)||[];
    if(typeof weaponSlots!=='undefined')return pl.idx===1?(typeof weaponSlots2!=='undefined'?weaponSlots2:[]):weaponSlots;
    return [];
  }
  function weaponFamily(weapon){
    if(!weapon)return 'base';
    if(typeof campaignWeaponElement==='function')return campaignWeaponElement(weapon.type)||'physical';
    return String(weapon.type||'base').split('_')[1]||'base';
  }
  function rarityRank(rarity){return ({common:0,uncommon:1,rare:2,epic:3,legendary:4})[rarity]??0;}
  function isEliteTarget(target){return !!target&&!isBossTarget(target)&&(target.elite||target.isElite||(target.maxHp||0)>=300);}
  function activeTempBuffs(e,now=performance.now()){return (e.tempBuffs||[]).filter(buff=>buff.until>now);}
  function tempDuration(pl,ms){
    const toast=boon(pl,'dionisio_double_toast');let mult=1+bv(toast);
    if(toast?.rarityIndex===4&&Math.random()<.15)mult*=2;
    return ms*mult;
  }
  function addTempBuff(pl,type,value,ms,renewed=false){
    const e=effect(pl),now=performance.now();e.tempBuffs=e.tempBuffs||[];
    e.tempBuffs.push({type,value,baseMs:ms,until:now+tempDuration(pl,ms),renewed});
  }
  function addHerculesFeat(pl,label){
    const card=boon(pl,'hercules_twelve_labors'),e=effect(pl);if(!card||(e.herculesFeats||0)>=12)return;
    e.herculesFeats=(e.herculesFeats||0)+1;
    if(bv(card,'hp')>0)changeMaxHp(pl,pl.maxHp*blessingAmp(pl,bv(card,'hp')));
    if(typeof spawnLevelUpNotice==='function')spawnLevelUpNotice(pl.x,pl.y-30,`★ FEITO: ${label}`,pl.idx||0);
  }

  applyDeityBoon=function(pl,card){
    const e=effect(pl);e.boons=e.boons||{};e.boons[card.id]=card;
    e.lastDamageAt=e.lastDamageAt||performance.now();e.lastDashAt=e.lastDashAt||performance.now();
    e.waveDamageTaken=e.waveDamageTaken||0;e.morosFatalReady=e.morosFatalReady!==false;
    if(card.id==='hecate_forbidden_knowledge'||card.id==='sauron_corrupting_power'){
      const penalty=penaltyAmp(pl,bv(card,'hpPenalty'));changeMaxHp(pl,-pl.maxHp*penalty,false);
    }
    if(card.id==='sauron_one_ring'){
      for(const id of ['hecate_forbidden_knowledge','sauron_corrupting_power']){
        const risky=boon(pl,id);if(risky)changeMaxHp(pl,-pl.maxHp*bv(risky,'hpPenalty')*bv(card,'penalty'),false);
      }
    }
    if(card.id==='moros_omen'){
      e.rarityBoost=(e.rarityBoost||0)+bv(card);
      if(card.rarityIndex===4)e.omenGuarantee=(e.omenGuarantee||0)+1;
    }
    if(card.id==='moros_delayed_fate')e.morosFatalReady=true;
  };
  window.applyDeityBoon=applyDeityBoon;

  function currentDirectionState(pl,target){
    if(!target||(!pl._moveDx&&!pl._moveDy))return 0;
    const len=Math.hypot(target.x-pl.x,target.y-pl.y)||1;
    return ((pl._moveDx||0)*(target.x-pl.x)+(pl._moveDy||0)*(target.y-pl.y))/len;
  }
  function hefestusWeaponBonuses(pl,weapon){
    if(!weapon)return {damage:0,speed:0};
    const slots=slotsFor(pl).filter(Boolean),family=weaponFamily(weapon);let damage=0,speed=0;
    const temper=boon(pl,'hefesto_tempering'),e=effect(pl);
    if(temper&&e.temperSource===sourceKey(pl,weapon)){
      damage+=e.temperFull&&temper.rarityIndex===4?bv(temper,'damage'):0;
      speed+=Math.min(bv(temper),(e.temperCount||0)*.02);
    }
    const specialist=boon(pl,'hefesto_specialist');
    if(specialist){const extra=Math.max(0,slots.filter(item=>weaponFamily(item)===family).length-1);damage+=extra*bv(specialist);if(specialist.rarityIndex===4)speed+=extra*bv(specialist,'speed');}
    const alloy=boon(pl,'hefesto_perfect_alloy');
    if(alloy&&new Set(slots.map(weaponFamily)).size>=3){damage+=bv(alloy);speed+=bv(alloy,'speed');}
    const reinforce=boon(pl,'hefesto_reinforcement');
    if(reinforce&&e.reinforcedWeapon===weapon.type){damage+=bv(reinforce);speed+=bv(reinforce,'speed');}
    const masterpiece=boon(pl,'hefesto_masterpiece');
    if(masterpiece&&slots.length){
      const sorted=slots.slice().sort((a,b)=>rarityRank(b.rarity)-rarityRank(a.rarity));
      if(weapon===sorted[0]){damage+=bv(masterpiece);speed+=bv(masterpiece,'speed');}
      else if(masterpiece.rarityIndex===4&&weapon===sorted[1])damage+=bv(masterpiece)*.5;
    }
    return {damage,speed};
  }
  function blessingAttackSpeed(pl,weapon){
    const e=effect(pl),now=performance.now(),hp=hpRatio(pl);let bonus=0;
    const conductor=boon(pl,'zeus_conductor');if(conductor)bonus+=(e.zeusConductor||0)*bv(conductor);
    if(now<(e.zeusOverloadSpeedUntil||0))bonus+=.20;
    const storm=boon(pl,'zeus_storm_child');if(storm&&hp<.4)bonus+=bv(storm);
    const fury=boon(pl,'ares_war_thirst');if(fury?.rarityIndex===4&&now<(e.aresFuryUntil||0))bonus+=(e.aresFury||0)*.02;
    const retaliate=boon(pl,'ares_pain_feeds_pain');if(retaliate&&now<(e.aresRetaliateUntil||0))bonus+=bv(retaliate,'speed');
    const lastWar=boon(pl,'ares_last_war');if(lastWar&&lastWar.rarityIndex===4&&hp<.5)bonus+=bv(lastWar,'speed')*Math.min(1,(.5-hp)/.4);
    const forbidden=boon(pl,'hecate_forbidden_knowledge');if(forbidden)bonus+=bv(forbidden);
    const focus=boon(pl,'hecate_hidden_focus');if(focus&&now-(e.lastDamageAt||0)>=4000)bonus+=bv(focus,'cooldown');
    const triple=boon(pl,'hecate_triple_path');if(triple&&now<(e.hecateTripleUntil||0)){bonus+=bv(triple,'speed')+bv(triple,'cooldown');}
    const hdash=boon(pl,'hermes_lightning_attack');if(hdash&&now<(e.hermesDashUntil||0))bonus+=bv(hdash);
    const hcycle=boon(pl,'hermes_divine_speed');if(hcycle&&now<(e.hermesCycleUntil||0))bonus+=bv(hcycle);
    const art=boon(pl,'artemis_perfect_hunt');if(art&&now<(e.artemisCritUntil||0))bonus+=bv(art);
    const high=boon(pl,'poseidon_high_tide');if(high&&hp>.7)bonus+=bv(high);
    const lion=boon(pl,'hercules_lion_skin');if(lion&&hp<.25)bonus+=bv(lion,'attack');
    for(const buff of activeTempBuffs(e,now))if(buff.type==='attack')bonus+=buff.value;
    bonus+=hefestusWeaponBonuses(pl,weapon).speed;
    if(e._nextAttackSpeed){bonus+=e._nextAttackSpeed;e._nextAttackSpeed=0;}
    return blessingAmp(pl,bonus);
  }

  window.notifyBlessingAttack=function(pl,target,sourceDamage,weapon=null){
    if(!pl)return 1;const e=effect(pl),now=performance.now(),source=sourceKey(pl,weapon);
    e.currentTarget=target;e.currentWeapon=weapon;e.attackBonus=0;e.attackCritBonus=0;e.forceCrit=false;
    if(e.zeusOverloadReady){e.attackBonus+=e.zeusOverloadReady;e.zeusOverloadReady=0;if(boon(pl,'zeus_overload')?.rarityIndex===4)e.zeusOverloadSpeedUntil=now+2000;}
    const consume=(key,cardId,critKey)=>{const card=boon(pl,cardId);if(card&&e[key]&&now<(e[key+'Until']||Infinity)){e.attackBonus+=e[key];e[key]=0;if(critKey)e.attackCritBonus+=bv(card,critKey);return card;}return null;};
    const thunder=consume('zeusThunderReady','zeus_critical_thunder');
    if(thunder&&thunder.rarityIndex===3)e._nextAttackSpeed=(e._nextAttackSpeed||0)+bv(thunder,'nextSpeed');
    e._usingZeusThunder=!!thunder;
    const supreme=consume('artemisSupremeReady','artemis_supreme_hunter');e._usingArtemisSupreme=!!supreme;
    consume('atenaCounterReady','atena_counter','crit');
    consume('nazgulDashReady','nazgul_dark_hunt','crit');
    consume('nazgulCycleReady','nazgul_relentless_specter');
    const marked=boon(pl,'moros_marked_fate');if(marked){e.morosAttack=(e.morosAttack||0)+1;if(e.morosAttack>=bv(marked,'hits')){e.morosAttack=0;e.forceCrit=true;e.morosMarkedCrit=marked.rarityIndex===4;}}
    const ritual=boon(pl,'hecate_rising_ritual');if(ritual&&source!==e.hecateLastSource){e.hecateRitual=Math.min(3,(e.hecateRitual||0)+1);e.hecateLastSource=source;}
    const echo=boon(pl,'hecate_arcane_echo');if(echo){e.hecateEcho=(e.hecateEcho||0)+1;if(e.hecateEcho>=bv(echo,'hits')){e.hecateEcho=0;if(echo.rarityIndex===4)e.hecateEchoRepeat=true;else e.attackBonus+=bv(echo);}}
    const triple=boon(pl,'hecate_triple_path');if(triple){e.hecateTripleSources=e.hecateTripleSources||[];if(!e.hecateTripleSources.includes(source))e.hecateTripleSources.push(source);if(e.hecateTripleSources.length>=3){e.hecateTripleSources=[];e.hecateTripleUntil=now+3000;}}
    const temper=boon(pl,'hefesto_tempering');if(temper){if(e.temperSource===source)e.temperCount=Math.min(13,(e.temperCount||0)+1);else{e.temperSource=source;e.temperCount=1;}e.temperFull=(e.temperCount*.02)>=bv(temper);}
    const speed=blessingAttackSpeed(pl,weapon);return 1/(1+Math.max(0,speed));
  };

  function dynamicDamageBonusV3(pl,target,weapon){
    const e=effect(pl),now=performance.now(),hp=hpRatio(pl),thp=hpRatio(target);let bonus=e.attackBonus||0;
    const conductor=boon(pl,'zeus_conductor');if(conductor&&conductor.rarityIndex===4&&(e.zeusConductor||0)>=12)bonus+=.10;
    const authority=boon(pl,'zeus_authority');if(authority){if(isBossTarget(target))bonus+=bv(authority,'boss')+(now<(e.zeusBossPowerUntil||0)?.10:0);else if(isEliteTarget(target))bonus+=bv(authority);}
    const storm=boon(pl,'zeus_storm_child');if(storm&&hp<.4)bonus+=bv(storm,'damage');
    const fury=boon(pl,'ares_war_thirst');if(fury&&now<(e.aresFuryUntil||0))bonus+=(e.aresFury||0)*bv(fury);
    const wound=boon(pl,'ares_open_wound');if(wound&&target)bonus+=Math.min(bv(wound,'max'),(targetState(e,target).aresWounds||0)*bv(wound));
    const execute=boon(pl,'ares_executioner');if(execute&&thp<.5)bonus+=bv(execute)*(thp<.2?2:1);
    const retaliate=boon(pl,'ares_pain_feeds_pain');if(retaliate&&now<(e.aresRetaliateUntil||0))bonus+=bv(retaliate);
    const lastWar=boon(pl,'ares_last_war');if(lastWar&&hp<.5)bonus+=bv(lastWar)*Math.min(1,(.5-hp)/.4);
    const ritual=boon(pl,'hecate_rising_ritual');if(ritual)bonus+=(e.hecateRitual||0)*bv(ritual);
    const forbidden=boon(pl,'hecate_forbidden_knowledge');if(forbidden)bonus+=bv(forbidden,'skillDamage');
    const focus=boon(pl,'hecate_hidden_focus');if(focus&&now-(e.lastDamageAt||0)>=4000)bonus+=bv(focus);
    const triple=boon(pl,'hecate_triple_path');if(triple&&now<(e.hecateTripleUntil||0))bonus+=bv(triple);
    const cycle=boon(pl,'selene_lunar_cycle');if(cycle&&e.selenePhase===1)bonus+=bv(cycle)+(e.selenePreviousPhase===1?bv(cycle)*.5:0);
    const full=boon(pl,'selene_full_moon');if(full&&hp>.8)bonus+=bv(full);
    const eclipse=boon(pl,'selene_eclipse');if(eclipse&&e.seleneEclipse)bonus+=bv(eclipse);
    const stance=boon(pl,'atena_perfect_stance');if(stance)bonus+=(e.atenaStance||0)*bv(stance,'damage');
    const discipline=boon(pl,'atena_discipline');if(discipline)bonus+=e.atenaDisciplineDamage||0;
    const medals=boon(pl,'atena_perfect_battle');if(medals)bonus+=(e.atenaMedals||0)*bv(medals);
    if(now<(e.atenaAegisPowerUntil||0))bonus+=.20;
    const hDash=boon(pl,'hermes_lightning_attack');if(hDash&&now<(e.hermesDashUntil||0))bonus+=bv(hDash,'damage');
    const speedDmg=boon(pl,'hermes_never_stop');if(speedDmg)bonus+=bv(speedDmg)*Math.min(1,e.movementPower||0);
    const dir=boon(pl,'poseidon_against_current');if(dir&&currentDirectionState(pl,target)>.15)bonus+=bv(dir);
    const dion=boon(pl,'dionisio_more_the_merrier');if(dion)bonus+=Math.min(bv(dion,'max'),activeTempBuffs(e,now).length*bv(dion));
    for(const buff of activeTempBuffs(e,now))if(buff.type==='damage')bonus+=buff.value;
    if(now<(e.dionHangoverUntil||0)&&e.dionHangoverType==='damage')bonus+=e.dionHangoverValue||0;
    bonus+=hefestusWeaponBonuses(pl,weapon).damage;
    const distance=boon(pl,'artemis_predator');if(distance&&target){const ideal=Math.max(120,pl.range||120);bonus+=bv(distance)*Math.min(1,Math.hypot(target.x-pl.x,target.y-pl.y)/ideal);}
    const weak=boon(pl,'artemis_weak_point');if(weak&&target)bonus+=targetState(e,target).artemisWeak||0;
    const tide=boon(pl,'poseidon_rising_tide');if(tide)bonus+=e.poseidonTide||0;
    const hk=boon(pl,'hercules_first_labor');if(hk)bonus+=(e.herculesWork||0)*bv(hk);
    const trial=boon(pl,'hercules_trial');if(trial&&now<(e.herculesTrialUntil||0))bonus+=bv(trial);
    const chain=boon(pl,'hercules_rising_strength');if(chain)bonus+=(e.herculesChain||0)*bv(chain);
    const feats=boon(pl,'hercules_twelve_labors');if(feats)bonus+=(e.herculesFeats||0)*bv(feats);
    const domination=boon(pl,'sauron_domination');if(domination&&now-(e.sauronLastKill||0)<4500)bonus+=(e.sauronStacks||0)*bv(domination);
    const eye=boon(pl,'sauron_watchful_eye');if(eye&&target)bonus+=targetState(e,target).sauronEye||0;
    const will=boon(pl,'sauron_dark_will');if(will)bonus+=bv(will)*(1-hp);
    const corrupt=boon(pl,'sauron_corrupting_power');if(corrupt)bonus+=bv(corrupt);
    const roots=boon(pl,'ents_deep_roots');if(roots?.rarityIndex===4&&now-(e.lastDashAt||0)>=3000)bonus+=bv(roots,'damage');
    return blessingAmp(pl,bonus);
  }

  applyCardCrit=function(pl,baseDmg,target,weapon=null){
    if(!pl)return baseDmg;const e=effect(pl),now=performance.now();
    let damage=baseDmg*(1+dynamicDamageBonusV3(pl,target,weapon)+getCampaignShopDamageBonus(pl,target)+CampProgressionSystem.damageBonus(pl,target));
    let chance=getCampaignShopCritBonus(pl)+(e.attackCritBonus||0)+(e.morosCritMiss||0),force=!!e.forceCrit;
    const marked=boon(pl,'moros_marked_fate');
    const last=boon(pl,'moros_last_page');if(last)chance+=bv(last)*(1-hpRatio(pl));
    const full=boon(pl,'selene_full_moon');if(full?.rarityIndex===4&&hpRatio(pl)>.8)chance+=bv(full,'crit');
    const aim=boon(pl,'artemis_rising_aim');if(aim)chance+=e.artemisAim||0;
    const discipline=boon(pl,'atena_discipline');if(discipline?.rarityIndex===4&&(e.atenaDisciplineDamage||0)>=bv(discipline))chance+=bv(discipline,'crit');
    if(target){const ts=targetState(e,target),wound=boon(pl,'ares_open_wound'),eye=boon(pl,'sauron_watchful_eye');if(wound?.rarityIndex===4&&ts.aresWounds*bv(wound)>=bv(wound,'max'))chance+=.15;if(eye?.rarityIndex===4&&(ts.sauronEye||0)>=bv(eye))chance+=.10;}
    const didCrit=force||Math.random()<Math.max(0,chance);
    if(didCrit){
      let critMult=2.5;if(e.morosMarkedCrit&&marked)critMult+=.50;if(last?.rarityIndex===4&&hpRatio(pl)<.2)critMult+=bv(last,'critDamage');damage*=critMult;
      e.morosCritMiss=0;e.zeusThunderReady=bv(boon(pl,'zeus_critical_thunder'));
      const artSpeed=boon(pl,'artemis_perfect_hunt');if(artSpeed)e.artemisCritUntil=now+2000;
      const supreme=boon(pl,'artemis_supreme_hunter');if(supreme)e.artemisSupremeReady=bv(supreme);
      const phantom=boon(pl,'nazgul_phantom_blade');if(phantom){e.nazgulCritDodge=bv(phantom);e.nazgulCritDodgeUntil=now+2000;}
      const specter=boon(pl,'nazgul_relentless_specter');if(specter&&specter.rarityIndex>=3){e.nazgulCycleDodge=bv(specter,'dodge');e.nazgulCycleDodgeUntil=now+2000;}
      if(e._usingZeusThunder&&boon(pl,'zeus_critical_thunder')?.rarityIndex===4)e.zeusThunderReady=bv(boon(pl,'zeus_critical_thunder'));
      if(e._usingArtemisSupreme&&supreme?.rarityIndex===4)e.artemisSupremeReady=bv(supreme)*.5;
      if(typeof spawnParts==='function')spawnParts(pl.x,pl.y-10,'#ffd35a',6,45);
    }else{
      const inevitable=boon(pl,'moros_inevitable');if(inevitable)e.morosCritMiss=Math.min(.30,(e.morosCritMiss||0)+bv(inevitable));
    }
    e.attackBonus=0;e.attackCritBonus=0;e.forceCrit=false;e.morosMarkedCrit=false;e._usingZeusThunder=false;e._usingArtemisSupreme=false;
    pl._lastAttackWasCrit=didCrit;if(target){target._lastDamageOwner=pl;target._lastHitCrit=didCrit;}
    if(typeof campaignModifyOutgoingDamage==='function')damage=campaignModifyOutgoingDamage(pl,target,damage);
    return damage;
  };

  window.notifyBlessingHit=function(pl,target,damage,weapon=null){
    if(!pl||!target)return;const e=effect(pl),now=performance.now(),ts=targetState(e,target);e.lastHitAt=now;ts.lastWeapon=weapon;
    const overload=boon(pl,'zeus_overload');if(overload){const step=(pl._lastAttackWasCrit&&overload.rarityIndex>=3)?2:1;e.zeusOverloadHits=(e.zeusOverloadHits||0)+step;let need=bv(overload,'hits');if(overload.rarityIndex===4&&boon(pl,'zeus_storm_child')&&hpRatio(pl)<.4)need--;if(e.zeusOverloadHits>=need){e.zeusOverloadHits=0;e.zeusOverloadReady=bv(overload);}}
    const conductor=boon(pl,'zeus_conductor');if(conductor){e.zeusConductor=Math.min(Math.round(bv(conductor,'max')/bv(conductor)),(e.zeusConductor||0)+1);e.zeusConductorLast=now;}
    const authority=boon(pl,'zeus_authority');if(authority&&isBossTarget(target)){e.zeusBossHits=(e.zeusBossHits||0)+1;if(authority.rarityIndex===4&&e.zeusBossHits>=10){e.zeusBossHits=0;e.zeusBossPowerUntil=now+3000;}}
    const wound=boon(pl,'ares_open_wound');if(wound){if(e.aresTarget!==target&&now-(e.aresTargetAt||0)>2000)ts.aresWounds=0;e.aresTarget=target;e.aresTargetAt=now;ts.aresWounds=Math.min(Math.ceil(bv(wound,'max')/bv(wound)),(ts.aresWounds||0)+1);}
    const discipline=boon(pl,'atena_discipline');if(discipline){e.atenaHits=(e.atenaHits||0)+1;if(e.atenaHits%5===0)e.atenaDisciplineDamage=Math.min(bv(discipline),(e.atenaDisciplineDamage||0)+bv(discipline)/5);}
    const step=boon(pl,'hermes_impossible_step');if(step){if(now-(e.hermesDashBucketAt||0)>1000){e.hermesDashBucketAt=now;e.hermesDashBucket=0;}const cut=Math.min(bv(step)*1000,Math.max(0,200-(e.hermesDashBucket||0)));pl._dashCd=Math.max(0,(pl._dashCd||0)-cut);e.hermesDashBucket=(e.hermesDashBucket||0)+cut;}
    const aim=boon(pl,'artemis_rising_aim');if(aim){e.artemisAimHits=(e.artemisAimHits||0)+1;e.artemisAimLast=now;if(e.artemisAimHits%3===0)e.artemisAim=Math.min(bv(aim),(e.artemisAim||0)+.01);}
    const weak=boon(pl,'artemis_weak_point');if(weak){ts.artemisWeak=Math.min(bv(weak),(ts.artemisWeak||0)+bv(weak)/6);}
    const tide=boon(pl,'poseidon_rising_tide');if(tide){e.poseidonTide=Math.min(bv(tide),(e.poseidonTide||0)+.01);e.poseidonTideLast=now;}
    const eye=boon(pl,'sauron_watchful_eye');if(eye){ts.sauronEye=Math.min(bv(eye),(ts.sauronEye||0)+bv(eye)/6);}
    if(e.hecateEchoRepeat){e.hecateEchoRepeat=false;setTimeout(()=>{if(target&&!target.dead){const echoDamage=damage*.5;target._lastDamageOwner=pl;target.takeDmg(echoDamage);if(typeof spawnParts==='function')spawnParts(target.x,target.y,'#b866ff',7,42);}},80);}
    if(target.dead)window.notifyBlessingKill(pl,target,weapon);
  };

  window.notifyBlessingKill=function(pl,target,weapon=null){
    if(!pl||!target||target._blessingKillNotified)return;target._blessingKillNotified=true;
    const e=effect(pl),now=performance.now(),elite=isEliteTarget(target),boss=isBossTarget(target);
    const fury=boon(pl,'ares_war_thirst');if(fury){e.aresFury=Math.min(bv(fury,'max'),(e.aresFury||0)+1);e.aresFuryUntil=now+tempDuration(pl,4000);}
    const drunk=boon(pl,'dionisio_divine_drunkenness');if(drunk&&Math.random()<bv(drunk)){addTempBuff(pl,randomItem(['damage','speed','attack']),bv(drunk,'power'),4000);}
    const work=boon(pl,'hercules_first_labor');if(work){e.herculesWaveKills=(e.herculesWaveKills||0)+1;if(e.herculesWaveKills%15===0)e.herculesWork=Math.min(bv(work,'max'),(e.herculesWork||0)+1);}
    const hchain=boon(pl,'hercules_rising_strength');if(hchain){e.herculesChain=now-(e.herculesLastKill||0)<=2000?Math.min(5,(e.herculesChain||0)+1):1;e.herculesLastKill=now;if(e.herculesChain===5)addHerculesFeat(pl,'SEQUÊNCIA');}
    const trial=boon(pl,'hercules_trial');if(trial&&elite){e.herculesTrialUntil=now+tempDuration(pl,8000);addHerculesFeat(pl,'ELITE');}
    if(boss)addHerculesFeat(pl,'CHEFE');
    const domination=boon(pl,'sauron_domination');if(domination){e.sauronStacks=now-(e.sauronLastKill||0)<4500?Math.min(bv(domination,'max'),(e.sauronStacks||0)+1):1;e.sauronLastKill=now;}
    const terror=boon(pl,'nazgul_rising_terror');if(terror){e.nazgulKills=(e.nazgulKills||0)+1;if(e.nazgulKills%5===0)e.nazgulTerror=Math.min(3,(e.nazgulTerror||0)+1);}
    const battle=boon(pl,'atena_perfect_battle');if(battle){e.atenaCleanKills=(e.atenaCleanKills||0)+1;if(e.atenaCleanKills>=10){e.atenaCleanKills=0;e.atenaMedals=Math.min(3,(e.atenaMedals||0)+1);}}
    const growth=boon(pl,'ents_ancestral_growth');if(growth){e.entsWaveKills=(e.entsWaveKills||0)+1;if(e.entsWaveKills%20===0&&(e.entsGrowthStacks||0)<5){e.entsGrowthStacks=(e.entsGrowthStacks||0)+1;const delta=changeMaxHp(pl,pl.maxHp*blessingAmp(pl,bv(growth)));e.entsTempHp=(e.entsTempHp||0)+delta;}}
    const used=weapon||targetState(e,target).lastWeapon;if(used){e.hefestoKills=e.hefestoKills||{};e.hefestoKills[used.type]=(e.hefestoKills[used.type]||0)+1;}
  };

  applyCardLifesteal=function(pl,x,y){
    if(!pl)return;const e=effect(pl),heal=(e.lifeSteal||0)+(e.killHealPct?pl.maxHp*e.killHealPct:0);
    if(heal>0)healCampaignPlayer(pl,heal,x,y);
    const killed=typeof allTargets==='function'?allTargets(enemies).find(target=>target&&target.dead&&target.x===x&&target.y===y):null;
    if(killed){notifyCampaignShopTargetKilled(pl,killed);window.notifyBlessingKill(pl,killed,null);}
  };

  window.notifyBlessingDash=function(pl){const e=effect(pl),now=performance.now();e.lastDashAt=now;e.hermesDashUntil=now+1500;e.hermesCycleUntil=now+1500;e.nazgulDashReady=bv(boon(pl,'nazgul_dark_hunt'));e.nazgulDashReadyUntil=now+1500;if(boon(pl,'hermes_divine_speed')?.rarityIndex===4)e.weaponDashReduction=.10;};
  window.notifyBlessingDashAvoid=function(pl){const card=boon(pl,'atena_counter');if(card){const e=effect(pl);e.atenaCounterReady=bv(card);e.atenaCounterReadyUntil=performance.now()+2000;e.attackCritBonus=bv(card,'crit');}};
  window.notifyBlessingSpecial=function(){/* compatibilidade: ativações são contadas em notifyBlessingAttack */};
  window.notifyBlessingDamageTaken=function(pl,amount=0){
    if(!pl)return;const e=effect(pl),now=performance.now();e.lastDamageAt=now;e.waveDamageTaken=(e.waveDamageTaken||0)+amount;
    const retaliation=boon(pl,'ares_pain_feeds_pain');if(retaliation&&now>=(e.aresRetaliateReadyAt||0)){e.aresRetaliateUntil=now+3000;e.aresRetaliateReadyAt=now+(retaliation.rarityIndex===4?4000:5000);}
    if(boon(pl,'selene_waning_moon'))e.seleneAfterHitUntil=now+3000;
    e.atenaStance=Math.max(0,(e.atenaStance||0)-2);e.atenaDisciplineDamage=(e.atenaDisciplineDamage||0)*.5;e.atenaMedals=Math.max(0,(e.atenaMedals||0)-1);e.atenaCleanKills=0;
    e.nazgulTerror=Math.max(0,(e.nazgulTerror||0)-1);e.nazgulKills=0;
    const resilience=boon(pl,'ents_resilience');if(resilience){if(now-(e.entDamageWindowAt||0)>3000){e.entDamageWindowAt=now;e.entDamageWindow=0;}e.entDamageWindow=(e.entDamageWindow||0)+amount;if(e.entDamageWindow>=pl.maxHp*.20&&now>=(e.entResilienceReadyAt||0)){e.entResilienceUntil=now+3000;e.entResilienceReadyAt=now+10000;e.entDamageWindow=0;}}
  };
  window.shouldBlessingDodge=function(pl){
    if(!pl)return false;const e=effect(pl),now=performance.now();let chance=bv(boon(pl,'nazgul_spectral_form'));
    if(now<(e.nazgulCritDodgeUntil||0))chance+=e.nazgulCritDodge||0;if(now<(e.nazgulCycleDodgeUntil||0))chance+=e.nazgulCycleDodge||0;
    if(chance>0&&Math.random()<chance){const form=boon(pl,'nazgul_spectral_form');if(form?.rarityIndex===4)e.nazgulDodgeSpeedUntil=now+2000;const cycle=boon(pl,'nazgul_relentless_specter');if(cycle)e.nazgulCycleReady=bv(cycle);pl.inv=true;pl.invT=Math.max(pl.invT||0,220);if(typeof spawnParts==='function')spawnParts(pl.x,pl.y,'#8c78a8',10,55);return true;}return false;
  };
  window.shouldBlessingPreventDeath=function(pl){
    const card=boon(pl,'moros_delayed_fate'),e=effect(pl);if(!card||!e.morosFatalReady)return false;e.morosFatalReady=false;
    pl.hp=Math.max(1,Math.round(pl.maxHp*bv(card)));const inv=bv(card,'invuln');if(inv){pl.inv=true;pl.invT=Math.max(pl.invT||0,inv*1000);}if(card.rarityIndex===4)e.morosEscapeSpeedUntil=performance.now()+3000;
    if(typeof spawnLevelUpNotice==='function')spawnLevelUpNotice(pl.x,pl.y-34,'⌛ DESTINO ADIADO',pl.idx||0);return true;
  };
  window.getBlessingIncomingDamageMultiplier=function(pl){
    if(!pl)return 1;const e=effect(pl),now=performance.now(),hp=hpRatio(pl);let reduction=0;
    const cycle=boon(pl,'selene_lunar_cycle');if(cycle&&e.selenePhase===2)reduction+=bv(cycle)+(e.selenePreviousPhase===2?bv(cycle)*.5:0);
    const waning=boon(pl,'selene_waning_moon');if(waning&&now<(e.seleneAfterHitUntil||0))reduction+=bv(waning);
    const eclipse=boon(pl,'selene_eclipse');if(eclipse&&e.seleneEclipse)reduction+=bv(eclipse,'defense');
    const stance=boon(pl,'atena_perfect_stance');if(stance)reduction+=(e.atenaStance||0)*bv(stance);
    const aegis=boon(pl,'atena_aegis');if(aegis&&now-(e.lastDamageAt||0)>=6000){reduction+=bv(aegis);e.lastDamageAt=now;if(aegis.rarityIndex===4)e.atenaAegisPowerUntil=now+2000;}
    const pressure=boon(pl,'poseidon_ocean_pressure');if(pressure&&typeof allTargets==='function'){const near=allTargets(enemies).filter(target=>target&&!target.dead&&Math.hypot(target.x-pl.x,target.y-pl.y)<150).length;reduction+=Math.min(5,Math.floor(near/3))*bv(pressure);}
    const trial=boon(pl,'hercules_trial');if(trial&&now<(e.herculesTrialUntil||0))reduction+=bv(trial,'defense');
    const lion=boon(pl,'hercules_lion_skin');if(lion&&hp<.25)reduction+=bv(lion);
    const will=boon(pl,'sauron_dark_will');if(will?.rarityIndex===4)reduction+=bv(will,'defense')*(1-hp);
    const bark=boon(pl,'ents_growing_bark');if(bark)reduction+=e.entsWaveDefense||0;
    const roots=boon(pl,'ents_deep_roots');if(roots&&now-(e.lastDashAt||0)>=3000)reduction+=bv(roots);
    const resilience=boon(pl,'ents_resilience');if(resilience&&now<(e.entResilienceUntil||0))reduction+=bv(resilience);
    const battle=boon(pl,'atena_perfect_battle');if(battle?.rarityIndex===4)reduction+=(e.atenaMedals||0)*bv(battle,'defense');
    return 1-Math.min(.75,blessingAmp(pl,reduction));
  };

  window.updateBlessingEffects=function(pl,dt){
    if(!pl)return;const e=effect(pl),now=performance.now();
    if(e.zeusConductor&&now-(e.zeusConductorLast||0)>1200)e.zeusConductor=0;
    const cycle=boon(pl,'selene_lunar_cycle');if(cycle){const duration=cycle.rarityIndex===4?10000:8000,elapsed=now-(e.seleneCycleAt||now);if(!e.seleneCycleAt)e.seleneCycleAt=now;if(elapsed>=duration){e.selenePreviousPhase=e.selenePhase??0;e.selenePreviousUntil=now+2000;e.selenePhase=((e.selenePhase??0)+1)%3;e.seleneCycleAt=now;}if(now>(e.selenePreviousUntil||0))e.selenePreviousPhase=-1;}
    const smove=boon(pl,'selene_waxing_moon');if(smove){if(pl.isMoving){e.seleneMoveTime=(e.seleneMoveTime||0)+dt;e.seleneMove=Math.min(bv(smove),e.seleneMoveTime*.01);e.seleneStoppedAt=0;}else{e.seleneStoppedAt=e.seleneStoppedAt||now;if(now-e.seleneStoppedAt>1500){e.seleneMove=Math.max(0,(e.seleneMove||0)-dt*.04);e.seleneMoveTime=Math.max(0,(e.seleneMoveTime||0)-dt*4);}}}
    const momentum=boon(pl,'hermes_momentum');if(momentum){e.hermesMoveTime=pl.isMoving?(e.hermesMoveTime||0)+dt:0;e.hermesMomentum=Math.min(bv(momentum),(e.hermesMoveTime||0)*.01);}
    const eclipse=boon(pl,'selene_eclipse');if(eclipse){if(hpRatio(pl)<.30)e.seleneEclipse=true;else if(hpRatio(pl)>.40)e.seleneEclipse=false;}
    const stance=boon(pl,'atena_perfect_stance');if(stance&&now-(e.lastDamageAt||0)>=2000){const earned=Math.min(5,Math.floor((now-(e.lastDamageAt||now))/2000));e.atenaStance=Math.max(e.atenaStance||0,earned);}
    if((e.artemisAim||0)>0&&now-(e.artemisAimLast||0)>2000)e.artemisAim=Math.max(0,e.artemisAim-dt*.03);
    const relentless=boon(pl,'poseidon_relentless_tide'),tide=boon(pl,'poseidon_rising_tide');if(tide&&e.poseidonTide&&now-(e.poseidonTideLast||0)>2000+(relentless?bv(relentless)*1000:0))e.poseidonTide=Math.max(0,e.poseidonTide-dt*.04);
    const buffs=e.tempBuffs||[];for(let i=buffs.length-1;i>=0;i--){const buff=buffs[i];if(buff.until>now)continue;const renew=boon(pl,'dionisio_endless_party');if(renew&&!buff.renewed&&Math.random()<bv(renew)){buff.renewed=true;buff.until=now+tempDuration(pl,buff.baseMs);continue;}buffs.splice(i,1);const hang=boon(pl,'dionisio_hangover');if(hang){e.dionHangoverValue=bv(hang);e.dionHangoverType=hang.rarityIndex>=3?randomItem(['damage','speed']):'speed';e.dionHangoverUntil=now+(hang.rarityIndex===4?3000:2000);}}
    let move=0;if(cycle&&e.selenePhase===0)move+=bv(cycle)+(e.selenePreviousPhase===0?bv(cycle)*.5:0);move+=e.seleneMove||0;move+=e.hermesMomentum||0;
    const direction=boon(pl,'poseidon_against_current');if(direction&&currentDirectionState(pl,e.currentTarget)<-.15)move+=bv(direction);
    const high=boon(pl,'poseidon_high_tide');if(high?.rarityIndex===4&&hpRatio(pl)>.7)move+=bv(high,'speed');
    if(relentless&&tide&&e.poseidonTide>=bv(tide)&&relentless.rarityIndex>=3)move+=bv(relentless,'speed');
    const waning=boon(pl,'selene_waning_moon');if(waning?.rarityIndex===4&&now<(e.seleneAfterHitUntil||0))move+=bv(waning,'speed');
    if(e.seleneEclipse)move+=bv(eclipse,'speed');if(now<(e.herculesTrialUntil||0))move+=bv(boon(pl,'hercules_trial'),'speed');
    move+=(e.nazgulTerror||0)*bv(boon(pl,'nazgul_rising_terror'));if(now<(e.nazgulDodgeSpeedUntil||0))move+=.15;if(now<(e.morosEscapeSpeedUntil||0))move+=.15;if(now<(e.entResilienceUntil||0))move+=bv(boon(pl,'ents_resilience'),'speed');
    for(const buff of activeTempBuffs(e,now))if(buff.type==='speed')move+=buff.value;if(now<(e.dionHangoverUntil||0)&&e.dionHangoverType==='speed')move+=e.dionHangoverValue||0;
    e.movementPower=Math.min(1,move/Math.max(.01,bv(boon(pl,'hermes_momentum'))||.25));const factor=1+blessingAmp(pl,move);pl.speed=pl.speed/(e._speedFactorV3||1)*factor;e._speedFactorV3=factor;
  };

  applyCardWaveRegen=function(){
    legacyBlessingWaveRegen();const pls=[typeof player!=='undefined'?player:null,...(typeof gameMode!=='undefined'&&gameMode===2&&typeof player2!=='undefined'&&player2?[player2]:[])].filter(p=>p&&!p.dead);
    for(const pl of pls){const e=effect(pl),bark=boon(pl,'ents_growing_bark');if(bark)e.entsWaveDefense=Math.min(bv(bark,'max'),(e.entsWaveDefense||0)+bv(bark));
      if(e.entsTempHp){const elder=boon(pl,'ents_forest_elder'),keep=e.entsTempHp*bv(elder);changeMaxHp(pl,-e.entsTempHp,false);if(keep>0)changeMaxHp(pl,keep,true);e.entsTempHp=0;e.entsGrowthStacks=0;}
      const reinforce=boon(pl,'hefesto_reinforcement');if(reinforce&&e.hefestoKills){e.reinforcedWeapon=Object.entries(e.hefestoKills).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;}e.hefestoKills={};
      if(boon(pl,'hercules_twelve_labors')&&(e.waveDamageTaken||0)===0)addHerculesFeat(pl,'ONDA PERFEITA');
      e.waveDamageTaken=0;e.herculesWaveKills=0;e.herculesWork=0;e.entsWaveKills=0;e.morosFatalReady=true;e.zeusBossHits=0;
    }
  };
  window.__DEITY_BLESSING_DEBUG__={boon,bv,dynamicDamageBonusV3,blessingAttackSpeed};

  resetCardBlessings=function(){
    activeCardBlessings=[];selectedCardOffer=null;selectedCardElement=null;
    [typeof player!=='undefined'?player:null,typeof player2!=='undefined'?player2:null].filter(Boolean).forEach(pl=>{pl.cardEffects={};});
    updateBlessingsHUD();
  };

  window.DEITY_BLESSINGS_V2=Object.freeze(DEITIES);
  window.DEITY_BLESSING_RARITIES=Object.freeze(RARITY_ORDER.map(id=>Object.freeze({id,...RARITY_META[id]})));
  window.formatDeityBlessingValue=cardValueText;
})(window);
