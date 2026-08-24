// Campaign combat status lifecycle extracted from index.html without changing
// element names, visual durations, stacking, tick cadence or slow/freeze rules.
(function(global){
  'use strict';

  const ELEMENT_FX_DURATION=Object.freeze({
    fire:1500,ice:1600,electric:900,poison:1700,shadow:1250,
    arcane:1050,solar:950,wind:850,blood:1300,physical:280
  });
  const DIRECT_ELEMENTS=Object.freeze([
    'fire','ice','electric','poison','shadow','arcane','solar','wind','blood','physical'
  ]);

  function create(deps){
    const options=deps||{};
    const now=typeof options.now==='function'?options.now:()=>performance.now();
    const resolveWeaponElement=typeof options.resolveWeaponElement==='function'
      ?options.resolveWeaponElement
      :()=> 'physical';
    const getCampaignShopEffect=typeof options.getCampaignShopEffect==='function'
      ?options.getCampaignShopEffect
      :()=>({});

    function damageElement(source=''){
      const raw=typeof source==='string'?source:(source?.type||source?.id||'');
      return DIRECT_ELEMENTS.includes(raw)?raw:resolveWeaponElement(raw);
    }

    function markEnemy(target,source,duration){
      if(!target||target.dead)return;
      const element=damageElement(source);
      target.elementFx=target.elementFx||{};
      const until=now()+(duration||ELEMENT_FX_DURATION[element]||700);
      target.elementFx[element]=Math.max(target.elementFx[element]||0,until);
    }

    function applySlow(target,pct,duration,owner){
      if(!target||target.slowImmune)return;
      if(owner?.classId==='mage')duration*=1+(getCampaignShopEffect(owner).elementDuration||0);
      target.slowed=true;
      target.slowTimer=Math.max(target.slowTimer||0,duration);
      target.weaponSlow=Math.max(target.weaponSlow||0,pct);
      target.weaponSlowTimer=Math.max(target.weaponSlowTimer||0,duration);
      markEnemy(target,'ice',duration);
      if(owner)target._lastWeaponOwner=owner;
    }

    function applyPoison(target,owner,weapon,dps,duration,maxStacks){
      if(!target||target.dead)return;
      if(owner?.classId==='mage'){
        const effect=getCampaignShopEffect(owner);
        duration*=1+(effect.elementDuration||0);
        dps*=1+(effect.elementDamage||0);
      }
      target._lastDamageOwner=owner;
      target.weaponPoisons=target.weaponPoisons||[];
      markEnemy(target,'poison',duration);
      const active=target.weaponPoisons.filter(poison=>poison.owner===owner&&poison.type===weapon.type);
      if(active.length>=maxStacks)active[0].timer=duration;
      else target.weaponPoisons.push({owner,type:weapon.type,dps,timer:duration,weapon});
    }

    function applyBurn(target,owner,weapon,dps,duration){
      if(!target||target.dead)return;
      if(owner?.classId==='mage'){
        const effect=getCampaignShopEffect(owner);
        duration*=1+(effect.elementDuration||0);
        dps*=1+(effect.elementDamage||0);
      }
      target._lastDamageOwner=owner;
      target.weaponBurn={owner,dps,timer:duration,weapon};
      markEnemy(target,'fire',duration);
    }

    function updateFrozen(target,dt){
      if(!target.frozen)return false;
      target.frozenTimer-=dt*1000;
      if(target.frozenTimer<=0){target.frozen=false;target.slowed=false;}
      return true;
    }

    function updateEnemy(target,dt){
      if(target.weaponVulnerableTimer>0){
        target.weaponVulnerableTimer-=dt*1000;
        if(target.weaponVulnerableTimer<=0)target.weaponVulnerable=0;
      }
      if(target.weaponSlowTimer>0){
        target.weaponSlowTimer-=dt*1000;
        if(target.weaponSlowTimer<=0)target.weaponSlow=0;
      }
      if(target.weaponBurn?.timer>0){
        target.weaponBurn.timer-=dt*1000;
        target._weaponBurnTick=(target._weaponBurnTick||0)+dt*1000;
        if(target._weaponBurnTick>=500){
          target._weaponBurnTick-=500;
          const burn=target.weaponBurn;
          burn.weapon.damageDone=(burn.weapon.damageDone||0)+burn.dps*.5;
          target.takeDmg(burn.dps*.5);
        }
      }
      if(target.weaponPoisons?.length){
        target._weaponPoisonTick=(target._weaponPoisonTick||0)+dt*1000;
        if(target._weaponPoisonTick>=500){
          target._weaponPoisonTick-=500;
          for(const poison of target.weaponPoisons){
            poison.weapon.damageDone=(poison.weapon.damageDone||0)+poison.dps*.5;
            target.takeDmg(poison.dps*.5);
          }
        }
        target.weaponPoisons.forEach(poison=>poison.timer-=dt*1000);
        target.weaponPoisons=target.weaponPoisons.filter(poison=>poison.timer>0);
      }
      let speedMult=1;
      if(target.slowed&&!target.slowImmune){
        target.slowTimer-=dt*1000;
        if(target.slowTimer<=0)target.slowed=false;
        else speedMult=target.weaponSlow?Math.max(.3,1-target.weaponSlow):0.35;
      }
      return speedMult;
    }

    return Object.freeze({
      damageElement,markEnemy,applySlow,applyPoison,applyBurn,updateFrozen,updateEnemy
    });
  }

  global.CampaignStatusEffects=Object.freeze({ELEMENT_FX_DURATION,create});
})(window);
