// SHOP SYSTEM — execução e apresentação preservadas da versão monolítica.
const MagoShopData=window.MagoShopData;
if(!MagoShopData)throw new Error('MagoShopData deve ser carregado antes do sistema da loja.');
const {CAMPAIGN_CLASS_BUFFS,CAMPAIGN_UNIVERSAL_ITEMS,CAMPAIGN_POTIONS}=MagoShopData;
function makePotionOffer(spec){
  return {id:spec.id,name:spec.name,desc:spec.desc,price:spec.price,rarity:'common',
    category:'universal',isUniversal:true,pixelIcon:spec.pixelIcon,
    unique:false,consumable:true,          // pode ser comprada quantas vezes quiser
    apply(target){
      if(!target||target.dead)return;
      const max=target.maxHp||target.hpMax||100;
      target.hp=Math.min(max,(target.hp||0)+Math.round(max*spec.heal));
      try{ if(typeof spawnParts==='function')spawnParts(target.x,target.y,'#44ff88',14,60); }catch(e){}
      try{ if(typeof updateUI==='function')updateUI(); }catch(e){}
    }};
}

function campaignShopPct(value,digits=0){return `${(value*100).toFixed(digits).replace('.',',').replace(/,0$/,'')}%`;}
function campaignShopBuffDescription(spec,rarity){
  const v=spec.values[Math.max(0,RARITIES.indexOf(rarity))]??spec.values[0];
  const legendary=rarity==='legendary';
  switch(spec.id){
    case 'mage_arcane_core':return `+${campaignShopPct(v)} de dano mágico.${legendary?' Feitiços ganham +5% de área.':''}`;
    case 'mage_spellbook':return `+${campaignShopPct(v)} de velocidade de ataque.${legendary?' A cada 8 ataques, o próximo intervalo cai pela metade.':''}`;
    case 'mage_elemental_orb':return `+${campaignShopPct(v)} de duração para fogo, gelo e veneno.${legendary?' Efeitos elementais causam +8% de dano.':''}`;
    case 'mage_arcane_hourglass':return `−${campaignShopPct(v,1)} de recarga de ataques, armas e habilidade.`;
    case 'mage_astral_cloak':return `${campaignShopPct(v)} de redução de dano.${legendary?' Bloqueia um ataque a cada 15s.':''}`;
    case 'mage_mana_fragment':return `${campaignShopPct(v)} de chance de duplicar um feitiço com 60% do dano.`;
    case 'mage_arcane_eye':return `+${campaignShopPct(v,1)} de crítico mágico.${legendary?' Críticos geram um impacto arcano maior.':''}`;
    case 'mage_rune_circle':return `Acertos consecutivos acumulam até +${v}% de dano; perde as cargas após 3s sem acertar.`;
    case 'warrior_reinforced_plate':return `+${campaignShopPct(v,1)} de armadura.`;
    case 'warrior_whetstone':return `+${campaignShopPct(v)} de dano corpo a corpo.${legendary?' Também concede +5% de crítico corpo a corpo.':''}`;
    case 'warrior_gauntlet':return `+${campaignShopPct(v,1)} de velocidade de ataque.${legendary?' Todo 3º ataque é 10% mais rápido.':''}`;
    case 'warrior_guardian_medallion':return `+${v} de vida máxima.${legendary?' Abaixo de 25% de vida, ganha 10% de defesa por 4s (20s de recarga).':''}`;
    case 'warrior_broken_shield':return `Após sofrer dano, causa +${campaignShopPct(v,1)} por 2s.${legendary?' Também ganha +10% de velocidade de ataque.':''}`;
    case 'warrior_heavy_boots':return `−${campaignShopPct(v,1)} de empurrão recebido.${legendary?' Também concede +5% de movimento.':''}`;
    case 'warrior_iron_emblem':return `A cada 5 ataques, ganha ${campaignShopPct(v,1)} de defesa por 3s.`;
    case 'warrior_titan_heart':return `Acima de 80% de vida, causa +${campaignShopPct(v,1)} de dano.`;
    case 'archer_shooter_glove':return `+${campaignShopPct(v)} de velocidade de ataque.`;
    case 'archer_eagle_eye':return `+${campaignShopPct(v,1)} de chance crítica.${legendary?' Projéteis críticos viajam 10% mais rápido.':''}`;
    case 'archer_reinforced_quiver':return `${campaignShopPct(v)} de chance de disparar uma flecha extra com 50% do dano.`;
    case 'archer_wind_feather':return `+${campaignShopPct(v,1)} de movimento.${legendary?' Abates críticos concedem +10% de movimento por 1s.':''}`;
    case 'archer_hunter_sight':return `Até +${campaignShopPct(v)} de dano conforme a distância do alvo.`;
    case 'archer_serrated_tip':return `Críticos causam sangramento de ${campaignShopPct(v)} do dano ao longo de 2s.`;
    case 'archer_precision_medallion':return `Após 1s sem sofrer dano, ganha +${campaignShopPct(v)} de crítico.${legendary?' Também ganha +5% de dano.':''}`;
    case 'archer_hunter_steps':return `Enquanto se move, ganha +${campaignShopPct(v)} de velocidade de ataque.${legendary?' Também causa +5% de dano.':''}`;
    case 'viking_war_horn':return `+${campaignShopPct(v)} de dano corpo a corpo.${legendary?' Ataques corpo a corpo ganham +5% de área.':''}`;
    case 'viking_mead_mug':return `Regenera 1 de vida a cada ${(v/1000).toFixed(1).replace('.0','')}s.`;
    case 'viking_blood_rune':return `${campaignShopPct(v,1)} de roubo de vida, com limite de cura por segundo.`;
    case 'viking_odin_eye':return `+${campaignShopPct(v,1)} de crítico.${legendary?' Críticos causam um pequeno impacto em área.':''}`;
    case 'viking_berserker_fury':return `Quanto menor a vida, até +${campaignShopPct(v)} de velocidade de ataque abaixo de 25%.`;
    case 'viking_thor_totem':return `A cada ${v} ataques, um raio atinge um inimigo próximo por 50% do dano da arma.`;
    case 'viking_frozen_beard':return `Inimigos próximos sofrem ${campaignShopPct(v,1)} de lentidão.${legendary?' Após 3s próximos, recebem 20% por 1s.':''}`;
    case 'viking_valhalla_heart':return `${campaignShopPct(v,2)} de chance por abate de recuperar 1 de vida; elites e chefes aumentam a chance.`;
    case 'necromancer_soul_reservoir':return '+3 ao limite de almas e maior alcance de atração.';
    case 'necromancer_profane_army':return '+1 invocação permanente; −8% de vida máxima.';
    case 'necromancer_reinforced_bones':return '+25% de vida para todas as invocações.';
    case 'necromancer_command_dead':return '+15% de velocidade de ataque para invocações.';
    case 'necromancer_soul_harvest':return 'Abates diretos passam de 22% para 30% de chance de gerar alma.';
    case 'necromancer_corpse_master':return 'O limite de Reanimados sobe de 3 para 4 e eles recebem +20% de vida máxima.';
    case 'necromancer_blood_pact':return '+20% de dano das invocações; −10% de vida máxima.';
    case 'necromancer_last_breath':return 'Invocações permanentes explodem ao morrer, com recarga por jogador.';
    case 'universal_light_boots':return `+${campaignShopPct(v,1)} de velocidade de movimento.`;
    case 'universal_red_heart':return `+${v} de vida máxima.`;
    case 'universal_combat_ration':return `Regenera 1 de vida a cada ${(v/1000).toFixed(1).replace('.0','')}s.`;
    case 'universal_agile_gloves':return `+${campaignShopPct(v,1)} de velocidade de ataque.`;
    case 'universal_luck_amulet':return `+${campaignShopPct(v,1)} de sorte na loja e nos drops; melhora a chance de raridades altas.`;
    case 'universal_merchant_bag':return `+${campaignShopPct(v,1)} de moedas obtidas.${legendary?' O primeiro reroll de cada loja custa metade.':''}`;
    case 'universal_runic_magnet':return `+${v} px de alcance para coletar moedas.${legendary?' Moedas são puxadas visualmente até o herói.':''}`;
    case 'universal_golden_clover':return `+${campaignShopPct(v,1)} de chance de encontrar cura, moedas e recursos extras.`;
  }
  return 'Bônus permanente durante esta campanha.';
}

function getCampaignShopEffect(playerRef){return playerRef?(playerRef.shopEffects||(playerRef.shopEffects={})):{};}
function applyCampaignShopItem(playerRef,spec,rarity){
  if(!playerRef||!spec)return;
  const e=getCampaignShopEffect(playerRef),idx=Math.max(0,RARITIES.indexOf(rarity)),v=spec.values[idx]??spec.values[0];
  if(spec.effect==='attackSpeed')e.attackSpeed=(e.attackSpeed||0)+v;
  else e[spec.effect]=v;
  e[`${spec.id}Rarity`]=rarity;
  if(spec.effect==='maxHpFlat'){playerRef.maxHp+=v;playerRef.hp=Math.min(playerRef.maxHp,playerRef.hp+v);}
  if(spec.effect==='moveSpeed')playerRef.speed*=1+v;
  if(spec.effect==='armor'||spec.effect==='astralDefense')playerRef.dmgReduce=Math.min(.65,(playerRef.dmgReduce||0)+v);
  if(spec.id==='warrior_heavy_boots'&&rarity==='legendary')playerRef.speed*=1.05;
  if(spec.id==='mage_arcane_core'&&rarity==='legendary')e.magicArea=.05;
  if(spec.id==='mage_elemental_orb'&&rarity==='legendary')e.elementDamage=.08;
  if(spec.id==='mage_astral_cloak'&&rarity==='legendary')e.astralBlock=true;
  if(spec.id==='mage_arcane_eye'&&rarity==='legendary')e.magicCritImpact=true;
  if(spec.id==='warrior_whetstone'&&rarity==='legendary')e.meleeCrit=.05;
  if(spec.id==='warrior_gauntlet'&&rarity==='legendary')e.thirdAttackSpeed=true;
  if(spec.id==='warrior_guardian_medallion'&&rarity==='legendary')e.guardianLowHp=true;
  if(spec.id==='warrior_broken_shield'&&rarity==='legendary')e.revengeAttackSpeed=.10;
  if(spec.id==='archer_eagle_eye'&&rarity==='legendary')e.critProjectileSpeed=.10;
  if(spec.id==='archer_wind_feather'&&rarity==='legendary')e.critKillSpeed=.10;
  if(spec.id==='archer_precision_medallion'&&rarity==='legendary')e.safeDamage=.05;
  if(spec.id==='archer_hunter_steps'&&rarity==='legendary')e.movingDamage=.05;
  if(spec.id==='viking_war_horn'&&rarity==='legendary')e.meleeArea=.05;
  if(spec.id==='viking_odin_eye'&&rarity==='legendary')e.odinCritImpact=true;
  if(spec.id==='viking_frozen_beard'&&rarity==='legendary')e.deepSlowAura=true;
  if(spec.id==='necromancer_profane_army'){
    const loss=Math.max(1,Math.round(playerRef.maxHp*.08));playerRef.maxHp=Math.max(1,playerRef.maxHp-loss);playerRef.hp=Math.min(playerRef.hp,playerRef.maxHp);
  }
  if(spec.id==='necromancer_blood_pact'){
    const loss=Math.max(1,Math.round(playerRef.maxHp*.10));playerRef.maxHp=Math.max(1,playerRef.maxHp-loss);playerRef.hp=Math.min(playerRef.hp,playerRef.maxHp);
  }
  if(spec.id==='universal_merchant_bag'&&rarity==='legendary')e.merchantRerollDiscount=true;
  if(spec.id==='universal_runic_magnet'&&rarity==='legendary')e.magnetPull=true;
  e.lastDamageAt=e.lastDamageAt||-Infinity;
}

function campaignShopMaxEffect(key){
  const list=[typeof player!=='undefined'?player:null,...(typeof gameMode!=='undefined'&&gameMode===2&&typeof player2!=='undefined'&&player2?[player2]:[])].filter(Boolean);
  return Math.max(0,...list.map(pl=>getCampaignShopEffect(pl)[key]||0));
}

function campaignShopRarityForWave(){
  const luck=campaignShopMaxEffect('shopLuck');
  const roll=Math.max(0,Math.random()-luck*.45);
  const w=Math.max(1,wave||1);
  if(w>=21&&roll<0.07)return 'legendary';
  if(w>=16&&roll<0.22)return 'epic';
  if(w>=11&&roll<0.43)return 'rare';
  if(w>=6&&roll<0.68)return 'uncommon';
  return 'common';
}

function makeCampaignWeaponOffer(type,pidx){
  const def=WEAPON_DEFS[type];
  const rarity=campaignShopRarityForWave();
  const basePrice={common:9,uncommon:14,rare:21,epic:30,legendary:42}[rarity];
  return {id:`campaign_${pidx}_${type}_${rarity}`,name:def.name,desc:def.desc(rarity),price:basePrice,
    wtype:type,rarity,pidx,classId:def.classId,isCampaignWeapon:true,category:'weapon',pixelIcon:def.pixelIcon,unique:false};
}

function makeCampaignBuffOffer(spec,pidx=null,universal=false){
  const rarity=campaignShopRarityForWave();
  const priceMap=universal?{common:8,uncommon:12,rare:18,epic:27,legendary:39}:{common:9,uncommon:13,rare:19,epic:28,legendary:41};
  const classId=universal?null:(pidx===1?selectedClass.p2:selectedClass.p1);
  const artPath=typeof CODEX_RELIC_ART!=='undefined'?CODEX_RELIC_ART[spec.id]:null;
  return {id:spec.id,name:spec.name,desc:campaignShopBuffDescription(spec,rarity),price:priceMap[rarity],rarity,pidx,classId,
    category:universal?'universal':'classBuff',isClassBuff:!universal,isUniversal:universal,pixelIcon:spec.pixelIcon,artPath,unique:true,spec,
    apply(target){applyCampaignShopItem(target,spec,rarity);}};
}

function getClassShopItems(category='weapon',forcedPidx=null){
  const playerDefs=[{pidx:0,classId:selectedClass.p1}];
  if(gameMode===2)playerDefs.push({pidx:1,classId:selectedClass.p2});
  const items=[];
  for(const pd of playerDefs){
    if(forcedPidx!=null&&pd.pidx!==forcedPidx)continue;
    if(category==='weapon'){
      const defs=Object.values(WEAPON_DEFS).filter(def=>def.classId===pd.classId);
      for(const def of defs)items.push(makeCampaignWeaponOffer(def.id,pd.pidx));
    }else if(category==='classBuff'){
      for(const spec of CAMPAIGN_CLASS_BUFFS[pd.classId]||[])items.push(makeCampaignBuffOffer(spec,pd.pidx,false));
    }
  }
  if(category==='universal'){
    for(const spec of CAMPAIGN_UNIVERSAL_ITEMS)items.push(makeCampaignBuffOffer(spec,null,true));
    for(const spec of CAMPAIGN_POTIONS)items.push(makePotionOffer(spec));
  }
  return items;
}

window.CAMPAIGN_CLASS_BUFFS=CAMPAIGN_CLASS_BUFFS;
window.CAMPAIGN_UNIVERSAL_ITEMS=CAMPAIGN_UNIVERSAL_ITEMS;
window.CAMPAIGN_POTIONS=CAMPAIGN_POTIONS;

function getCampaignShopDamageBonus(pl,target){
  if(!pl)return 0;
  const e=getCampaignShopEffect(pl),now=performance.now(),hp=pl.maxHp?pl.hp/pl.maxHp:1;
  let bonus=0;
  if(pl.classId==='mage')bonus+=e.magicDamage||0;
  if(pl.classId==='warrior'||pl.classId==='viking')bonus+=e.meleeDamage||0;
  if(pl.classId==='warrior'&&hp>.8)bonus+=e.highHpDamage||0;
  if(now<(e.revengeUntil||0))bonus+=e.revengeDamage||0;
  if(pl.classId==='archer'){
    if(target&&e.distanceDamage){const distance=Math.hypot(target.x-pl.x,target.y-pl.y);bonus+=e.distanceDamage*Math.min(1,distance/Math.max(1,pl.range||300));}
    if(now-(e.lastDamageAt||-Infinity)>=1000)bonus+=e.safeDamage||0;
    if(pl.isMoving)bonus+=e.movingDamage||0;
  }
  if(target&&e.runeMax){
    const mark=target._campaignRuneHits?.[pl.idx||0];
    if(mark&&now-mark.at<3000)bonus+=Math.min(e.runeMax,mark.hits||0)/100;
  }
  return bonus;
}

function getCampaignShopCritBonus(pl){
  if(!pl)return 0;
  const e=getCampaignShopEffect(pl),now=performance.now();let chance=e.critChance||0;
  if(pl.classId==='mage')chance+=e.magicCrit||0;
  if((pl.classId==='warrior'||pl.classId==='viking'))chance+=e.meleeCrit||0;
  if(pl.classId==='archer'&&now-(e.lastDamageAt||-Infinity)>=1000)chance+=e.safeCrit||0;
  return chance;
}

function getCampaignShopAttackSpeedBonus(pl){
  if(!pl)return 0;
  const e=getCampaignShopEffect(pl),now=performance.now(),hp=pl.maxHp?Math.max(0,Math.min(1,pl.hp/pl.maxHp)):1;
  let bonus=e.attackSpeed||0;
  if(e.cooldownReduction)bonus+=1/(1-Math.min(.45,e.cooldownReduction))-1;
  if(pl.classId==='viking'&&e.lowHpAttackSpeed)bonus+=e.lowHpAttackSpeed*Math.min(1,(1-hp)/.75);
  if(pl.classId==='archer'&&pl.isMoving)bonus+=e.movingAttackSpeed||0;
  if(now<(e.revengeUntil||0))bonus+=e.revengeAttackSpeed||0;
  return bonus;
}

function notifyCampaignShopAttack(pl,target,sourceDamage,weapon=null){
  if(!pl)return 1;
  const e=getCampaignShopEffect(pl);e.attackCount=(e.attackCount||0)+1;
  let cooldownMult=1;
  if(pl.classId==='mage'&&e[`${'mage_spellbook'}Rarity`]==='legendary'&&e.attackCount%8===0)cooldownMult*=.5;
  if(pl.classId==='warrior'&&e.thirdAttackSpeed&&e.attackCount%3===0)cooldownMult/=1.10;
  if(e.ironDefense&&e.attackCount%5===0)e.ironDefenseUntil=performance.now()+3000;
  const actualTarget=target&&(!target.dead||target._manualAim)?target:(typeof nearestWeaponTargets==='function'?nearestWeaponTargets(pl,enemies,Math.max(360,pl.range||0),1)[0]:null);
  if(actualTarget&&pl.classId==='mage'&&e.spellDuplicate&&Math.random()<e.spellDuplicate&&typeof CampaignWeaponProj!=='undefined'){
    const angle=Math.atan2(actualTarget.y-pl.y,actualTarget.x-pl.x),duplicateWeapon=weapon||{type:'mage_arcane_staff',damageDone:0};
    projs.push(new CampaignWeaponProj(pl.x,pl.y,angle,(sourceDamage||pl.dmg)*.60,pl,duplicateWeapon,{color:'#b866ff',homing:!actualTarget._manualAim,target:actualTarget,pierce:0}));
    spawnParts(pl.x,pl.y,'#d68cff',5,34);
  }
  if(actualTarget&&pl.classId==='archer'&&e.extraArrow&&Math.random()<e.extraArrow){
    projs.push(new ArrowProj(pl.x,pl.y,actualTarget,(sourceDamage||pl.dmg)*.50,pl));
    spawnParts(pl.x,pl.y,'#8dff71',4,32);
  }
  if(actualTarget&&pl.classId==='viking'&&e.thorEvery&&e.attackCount%e.thorEvery===0){
    const lightningTarget=(typeof nearestWeaponTargets==='function'?nearestWeaponTargets(pl,enemies,360,1)[0]:actualTarget)||actualTarget;
    if(lightningTarget){const lightningDamage=(sourceDamage||pl.dmg)*.50;lightningTarget._lastDamageOwner=pl;lightningTarget.takeDmg(lightningDamage);applyCampaignShopHitEffects(pl,lightningTarget,lightningDamage);spawnParts(lightningTarget.x,lightningTarget.y,'#ffd83d',10,65);spawnLevelUpNotice(lightningTarget.x,lightningTarget.y-18,'⚡ THOR',pl.idx||0);}
  }
  if(typeof notifyBlessingAttack==='function')cooldownMult*=notifyBlessingAttack(pl,actualTarget,sourceDamage,weapon);
  return cooldownMult;
}

function campaignShopIncomingDamageMultiplier(pl){
  if(!pl)return 1;
  const e=getCampaignShopEffect(pl),now=performance.now(),hp=pl.maxHp?pl.hp/pl.maxHp:1;let reduction=0;
  if(now<(e.ironDefenseUntil||0))reduction+=e.ironDefense||0;
  if(e.guardianLowHp&&hp<.25){
    if(now>=(e.guardianReadyAt||0)){e.guardianUntil=now+4000;e.guardianReadyAt=now+20000;}
    if(now<(e.guardianUntil||0))reduction+=.10;
  }
  return 1-Math.min(.45,reduction);
}

function shouldCampaignShopBlock(pl){
  const e=getCampaignShopEffect(pl),now=performance.now();
  if(!e.astralBlock||now<(e.astralBlockReadyAt||0))return false;
  e.astralBlockReadyAt=now+15000;spawnParts(pl.x,pl.y,'#c68cff',14,72);spawnLevelUpNotice(pl.x,pl.y-28,'BLOQUEIO ASTRAL',pl.idx||0);return true;
}

function notifyCampaignShopDamageTaken(pl){
  const e=getCampaignShopEffect(pl),now=performance.now();e.lastDamageAt=now;
  if(e.revengeDamage)e.revengeUntil=now+2000;
}

function notifyCampaignShopTargetKilled(pl,target){
  if(!pl||!target||!target.dead||target._campaignShopKillNotified)return;
  target._campaignShopKillNotified=true;
  const e=getCampaignShopEffect(pl),boss=target===bossOrc||target===bossSkel||target===bossSpider||target===bossMajor||target===petBoss||target.isBoss;
  const elite=!boss&&(target.maxHp||0)>300;
  if(e.killHealChance&&Math.random()<e.killHealChance*(boss?3:elite?2:1)){
    healCampaignPlayer(pl,1,target.x,target.y,false);spawnLevelUpNotice(pl.x,pl.y-24,'+1 VALHALLA',pl.idx||0);
  }
  if(pl.classId==='archer'&&e.critKillSpeed&&target._lastHitCrit)e.critKillSpeedUntil=performance.now()+1000;
  if(e.dropBonus&&Math.random()<e.dropBonus){
    if(Math.random()<.5){healCampaignPlayer(pl,Math.max(1,Math.round(pl.maxHp*.02)),target.x,target.y,false);spawnLevelUpNotice(target.x,target.y-18,'CURA EXTRA',pl.idx||0);}
    else{totalCoins+=1;spawnLevelUpNotice(target.x,target.y-18,'+1 MOEDA',pl.idx||0);}
  }
}

function applyCampaignShopHitEffects(pl,target,dmg){
  if(!pl||!target)return;
  const e=getCampaignShopEffect(pl),now=performance.now(),crit=!!pl._lastAttackWasCrit;
  target._lastDamageOwner=pl;target._lastHitCrit=crit;
  if(e.runeMax){target._campaignRuneHits=target._campaignRuneHits||{};const key=pl.idx||0,old=target._campaignRuneHits[key];target._campaignRuneHits[key]={hits:old&&now-old.at<3000?Math.min(e.runeMax,(old.hits||0)+1):1,at:now};}
  if(e.lifeStealPct&&dmg>0){
    if(now-(e.lifeStealWindowAt||0)>=1000){e.lifeStealWindowAt=now;e.lifeStealWindowHeal=0;}
    const cap=Math.max(1,pl.maxHp*.06),heal=Math.min(dmg*e.lifeStealPct,cap-(e.lifeStealWindowHeal||0));
    if(heal>0){e.lifeStealWindowHeal=(e.lifeStealWindowHeal||0)+heal;healCampaignPlayer(pl,heal,pl.x,pl.y,false);}
  }
  if(crit&&e.critBleed&&dmg>0&&!target.dead){
    const tick=dmg*e.critBleed/4;for(let i=1;i<=4;i++)setTimeout(()=>{if(state==='playing'&&target&&!target.dead){target._lastDamageOwner=pl;target.takeDmg(tick);spawnParts(target.x,target.y,'#b32b35',2,18);}},i*500);
  }
  if(crit&&e.odinCritImpact){
    for(const other of allTargets(enemies))if(other&&other!==target&&!other.dead&&Math.hypot(other.x-target.x,other.y-target.y)<42){other._lastDamageOwner=pl;other.takeDmg(dmg*.10);}
    spawnParts(target.x,target.y,'#e1a05b',11,70);
  }else if(crit&&e.magicCritImpact)spawnParts(target.x,target.y,'#c67aff',10,68);
  notifyCampaignShopTargetKilled(pl,target);
}

function updateCampaignShopEffects(pl,dt){
  if(!pl)return;
  const e=getCampaignShopEffect(pl),now=performance.now();
  for(const [intervalKey,timerKey] of [['vikingRegenInterval','vikingRegenTimer'],['universalRegenInterval','universalRegenTimer']]){
    if(!e[intervalKey])continue;e[timerKey]=(e[timerKey]||e[intervalKey])-dt*1000;
    if(e[timerKey]<=0){e[timerKey]+=e[intervalKey];if(healCampaignPlayer(pl,1,pl.x,pl.y,false)>0)spawnParts(pl.x,pl.y,'#59d982',3,24);}
  }
  if(now<(e.critKillSpeedUntil||0)&&!e._critKillSpeedOn){pl.speed*=1+e.critKillSpeed;e._critKillSpeedOn=true;}
  else if(now>=(e.critKillSpeedUntil||0)&&e._critKillSpeedOn){pl.speed/=1+e.critKillSpeed;e._critKillSpeedOn=false;}
  if(e.slowAura&&now>=(e.slowAuraTickAt||0)){
    e.slowAuraTickAt=now+250;
    for(const target of allTargets(enemies)){
      if(!target||target.dead)continue;target._vikingAuraSince=target._vikingAuraSince||{};const key=pl.idx||0;
      if(Math.hypot(target.x-pl.x,target.y-pl.y)<=72){target._vikingAuraSince[key]=target._vikingAuraSince[key]||now;const pct=e.deepSlowAura&&now-target._vikingAuraSince[key]>=3000?.20:e.slowAura;applyWeaponSlow(target,pct,500,pl);}
      else delete target._vikingAuraSince[key];
    }
  }
}

function getCampaignShopGoldMult(){return 1+campaignShopMaxEffect('goldBonus');}
function getCampaignShopPickupRadius(pl){return getCampaignShopEffect(pl).pickupRadius||0;}
function getCampaignShopLootBonus(){return campaignShopMaxEffect('dropBonus')+campaignShopMaxEffect('shopLuck')*.25;}
function getCampaignShopKnockbackMultiplier(pl){return 1-Math.min(.85,getCampaignShopEffect(pl).knockbackResist||0);}

let shopPool=[];
let shopLocked=[];
let shopPurchasedUnique=new Set();
const SHOP_OPTION_COUNT=3;

function shopItemKey(item){
  if(!item)return '';
  if(item.id)return item.isClassBuff?`${item.id}_p${item.pidx||0}`:item.id;
  return `item_${String(item.name||'sem_nome').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}`;
}
function shopItemIsUnique(item){
  return !!item&&item.unique!==false&&!item.isCampaignWeapon&&!item.wtype&&!item.consumable;
}
function shopItemAlreadyPurchased(item){
  return shopItemIsUnique(item)&&shopPurchasedUnique.has(shopItemKey(item));
}
function resetShopPurchases(){
  shopPurchasedUnique=new Set();
  shopPool=[];
  shopLocked=Array(SHOP_OPTION_COUNT).fill(false);
}
// Prices rise with both wave and biome, using the selected campaign difficulty.
function shopPrice(it){
  const d=DIFF[difficulty]||DIFF.medium;
  const waveIndex=Math.max(0,Math.max(1,wave)-1);
  const biomeIndex=Math.floor(waveIndex/5);
  const priceScale=Math.min(d.shopCap,d.shopBase+waveIndex*d.shopWave+biomeIndex*d.shopBiome);
  return Math.max(1,Math.round(it.price*priceScale));
}

let shopRerollCost=2;
let shopRerollBaseCost=2;
let shopRerollsThisVisit=0;

function buildShopPool(){
  const result=Array(SHOP_OPTION_COUNT).fill(null);
  for(let i=0;i<SHOP_OPTION_COUNT;i++) if(shopLocked[i]) result[i]=shopPool[i];
  const categories=['weapon','classBuff','universal'];
  const present=new Set(result.filter(Boolean).map(item=>item.category));
  for(let i=0;i<SHOP_OPTION_COUNT;i++){
    if(result[i]) continue;
    const category=categories.find(cat=>!present.has(cat))||categories[i];
    const pidx=gameMode===2&&category!=='universal'?(Math.max(1,wave)+shopRerollsThisVisit+i)%2:0;
    const available=getClassShopItems(category,pidx)
      .filter(item=>!shopItemAlreadyPurchased(item)&&!result.some(r=>r&&shopItemKey(r)===shopItemKey(item)))
      .sort(()=>Math.random()-0.5);
    result[i]=available[0]||null;
    if(result[i])present.add(category);
  }
  shopPool=result;
}

function renderShopGrid(){
  const grid=document.getElementById('shop-grid');
  grid.innerHTML='';
  const cid=selectedClass.p1;
  const def=CLASS_DEFS[cid];
  const rarityFlavour={common:'COMUM',uncommon:'INCOMUM',rare:'RARO',epic:'ÉPICO',legendary:'LENDÁRIO'};
  const titleEl=document.getElementById('shop-title-text');
  if(titleEl&&def){
    const titleIcons={mage:'orb',warrior:'sword',archer:'bow',viking:'axe',necromancer:'skull'};
    const p2Title=gameMode===2?` + ${CLASS_DEFS[selectedClass.p2]?.name||'P2'}`:'';
    titleEl.innerHTML=`<span class="pixel-inline">${gamePixelIconHtml(titleIcons[cid]||'hammer',26)} Arsenal da ${def.name}${p2Title}</span>`;
  }
  for(let i=0;i<SHOP_OPTION_COUNT;i++){
    const item=shopPool[i];
    if(!item){ grid.appendChild(document.createElement('div')); continue; }
    const itemRarity=item.rarity||'common';
    const locked=shopLocked[i];
    const cantAfford=totalCoins<shopPrice(item);
    const card=document.createElement('div');
    const offerDef=WEAPON_DEFS[item.wtype];
    const offerClass=CLASS_DEFS[item.classId];
    card.className=`s-card r-${itemRarity}${locked?' locked-card':''}${cantAfford&&!locked?' cant-afford':''}`;
    card.dataset.idx=i;
    const rarCol={common:'#9a9487',uncommon:'#43cf70',rare:'#4b9eff',epic:'#be55ee',legendary:'#e1b936'}[itemRarity];
    card.style.setProperty('--shop-rarity',rarCol);
    const classBadge=item.isUniversal
      ?`<span class="shop-item-badge" style="color:#e7c85b;border-color:#e7c85b;">UNIVERSAL</span>`
      :(offerClass?`<span class="shop-item-badge" style="color:${offerClass.color||'#f0d080'};border-color:${offerClass.color||'#f0d080'};">${gameMode===2?`P${item.pidx+1} · `:''}${offerClass.name.toUpperCase()}</span>`:'');
    // Weapon stats block (only for weapons)
    let weaponStatsHtml = '';
    if(item.wtype && WEAPON_DEFS[item.wtype]){
      const wd = WEAPON_DEFS[item.wtype];
      const dmg = Math.round(campaignWeaponDamage(wd,itemRarity));
      const cd  = (campaignWeaponCooldown(wd,itemRarity)/1000).toFixed(2);
      const rng = wd.range;
      const type= wd.type==='melee'?'Corpo a corpo':wd.type==='ranged'?'Longo alcance':'Magia';
      weaponStatsHtml = `<div class="s-weapon-summary"><b>${dmg}</b> dano · ${cd}s · ${rng} alcance<br><span>${type}</span></div>`;
    }
    const itemIcon=item.pixelIcon||offerDef?.pixelIcon||'orb';
    const offerIconHtml=item.wtype&&offerDef
      ?campaignWeaponIconHtml(item.wtype,104,'campaign-weapon-art-shop',rarCol)
      :item.artPath
        ?codexArtIconHtml(item.artPath,84,'shop-relic-art',rarCol)
        :gamePixelIconHtml(itemIcon,84);
    card.innerHTML=`
      <div class="s-card-top">
        <div class="s-card-icon${item.wtype?' weapon-offer-icon':''}">${offerIconHtml}</div>
        <div class="s-card-content">
          <div class="s-card-info">
            <div class="s-card-name">${item.name}${classBadge}</div>
            <div class="s-card-rarity" style="color:${rarCol}">${rarityFlavour[itemRarity]||'COMUM'}</div>
            <div class="s-card-type">${item.wtype?`ARMA DE ${offerClass?.name.toUpperCase()||''}`:item.isClassBuff?'BUFF ÚNICO DE CLASSE':'ITEM UNIVERSAL ÚNICO'}</div>
          </div>
          ${weaponStatsHtml}
          <div class="s-card-effect">${item.desc}</div>
        </div>
      </div>
      <div class="s-card-actions">
        <button class="s-buy-btn" data-i="${i}" onclick="shopBuy(${i},event)">
          <span class="pixel-btn-content">${gamePixelIconHtml('coin',15)} ${shopPrice(item)}</span>
        </button>
        <button class="s-lock-btn${locked?' locked':''}" data-lock-idx="${i}" onclick="shopToggleLock(${i},event)">
          <span class="pixel-btn-content">${gamePixelIconHtml(locked?'lock':'key',14)} ${locked?'BLOQUEADO':'BLOQUEAR'}</span>
        </button>
      </div>`;
    grid.appendChild(card);
  }
  refreshAffordability();
}

function refreshAffordability(){
  const cards=document.querySelectorAll('.s-card');
  cards.forEach((card,i)=>{
    if(i>=shopPool.length||!shopPool[i]) return;
    const item=shopPool[i];
    card.classList.toggle('cant-afford',totalCoins<shopPrice(item));
    const buyBtn=card.querySelector('.s-buy-btn');
    if(buyBtn) buyBtn.style.opacity=totalCoins<shopPrice(item)?'0.4':'1';
  });
  const rc=document.getElementById('reroll-cost-badge');
  const rb=document.getElementById('reroll-btn');
  if(rc) rc.innerHTML=`${gamePixelIconHtml('coin',14)} ${shopRerollCost}`;
  if(rb) rb.style.opacity=totalCoins<shopRerollCost?'0.4':'1';
}

function shopBuy(i, e){
  e.stopPropagation();
  const item=shopPool[i];
  if(!item||shopItemAlreadyPurchased(item)||totalCoins<shopPrice(item)) return;
  if(item.wtype&&!canAddWeapon(item.wtype,item.rarity,item.pidx||0)) return;
  totalCoins-=shopPrice(item);
  document.getElementById('shop-coins-val').textContent=totalCoins;
  document.getElementById('coin-display').textContent='🪙 '+totalCoins;
  if(item.wtype){
    addWeapon(item.wtype,item.rarity,item.pidx||0);
  } else if(item.isClassBuff){
    const target=item.pidx===1?player2:player;
    if(target&&!target.dead)item.apply(target);
  } else if(item.isUniversal){
    [player,...(gameMode===2&&player2?[player2]:[])].filter(pl=>pl&&!pl.dead).forEach(pl=>item.apply(pl));
  } else if(item.isStructure){
    item.apply(); // structures use no player arg — placed near player
  } else {
    item.apply(player);
    if(gameMode===2&&player2&&!player2.dead) item.apply(player2);
  }
  if(shopItemIsUnique(item))shopPurchasedUnique.add(shopItemKey(item));
  const cards=document.querySelectorAll('.s-card');
  if(cards[i]){
    cards[i].classList.add('sold-card');
    cards[i].innerHTML=`<div class="shop-purchased">${gamePixelIconHtml('spark',30)}<div>ADQUIRIDO</div></div>`;
  }
  shopPool[i]=null; shopLocked[i]=false;
  renderShopInventory();
  buildFuseUI();
  refreshAffordability();
}

function shopToggleLock(i, e){
  e.stopPropagation();
  if(!shopPool[i]) return;
  shopLocked[i]=!shopLocked[i];
  // Reliable lookup by data attribute
  const btn=document.querySelector(`[data-lock-idx="${i}"]`);
  if(btn){
    btn.classList.toggle('locked',shopLocked[i]);
    btn.innerHTML=`<span class="pixel-btn-content">${gamePixelIconHtml(shopLocked[i]?'lock':'key',14)} ${shopLocked[i]?'BLOQUEADO':'BLOQUEAR'}</span>`;
  }
  const card=document.querySelector(`[data-idx="${i}"]`);
  if(card) card.classList.toggle('locked-card',shopLocked[i]);
}

function shopReroll(){
  if(totalCoins<shopRerollCost) return;
  totalCoins-=shopRerollCost;
  shopRerollsThisVisit++;
  shopRerollCost=Math.max(1,Math.round(shopRerollBaseCost*Math.pow(2,shopRerollsThisVisit)));
  document.getElementById('shop-coins-val').textContent=totalCoins;
  document.getElementById('coin-display').textContent='🪙 '+totalCoins;
  buildShopPool();
  renderShopGrid();
}

function openShop(){
  shopSelectedSlot=null;
  state='shop';
  const d=DIFF[difficulty]||DIFF.medium;
  shopRerollsThisVisit=0;
  shopRerollBaseCost=Math.max(2,Math.round(d.rerollBase+Math.max(1,wave)*d.rerollWave));
  shopRerollCost=campaignShopMaxEffect('merchantRerollDiscount')>0?Math.max(1,Math.round(shopRerollBaseCost*.5)):shopRerollBaseCost;
  if(!Array.isArray(shopPool)||shopPool.length!==SHOP_OPTION_COUNT) shopPool=Array(SHOP_OPTION_COUNT).fill(null);
  if(!Array.isArray(shopLocked)||shopLocked.length!==SHOP_OPTION_COUNT) shopLocked=Array(SHOP_OPTION_COUNT).fill(false);
  shopLocked=shopLocked.map((locked,i)=>!!locked&&!!shopPool[i]&&!shopItemAlreadyPurchased(shopPool[i]));
  hideAllScreens();
  showScreen('shop');
  document.getElementById('shop-wave-label').textContent=`Onda ${wave} Concluída`;
  document.getElementById('shop-coins-val').textContent=totalCoins;
  renderShopInventory();
  buildShopPool();
  renderShopGrid();
  buildFuseUI();
  refreshAffordability();
}

function closeShop(){
  hideAllScreens();
  advWave();
  waveAnnounce=1200;
  lastTs=null; // reset dt so no huge jump
  state='playing';
  if(typeof window.resumeCampaignMusic==='function') window.resumeCampaignMusic();
  if(!raf) raf=requestAnimationFrame(loop);
}

// ═══════════════════════════════════════════════════════
