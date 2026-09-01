// Regras de ataque das armas da campanha. Estado de mundo, renderizacao e
// projeteis sao fornecidos pelo index para preservar a integracao incremental.
(function(global){
  'use strict';

  function create(deps){
    const getDefinition=deps.getDefinition;
    const getTier=deps.getTier;
    const campaignWeaponDamage=deps.campaignWeaponDamage;
    const nearestWeaponTargets=deps.nearestWeaponTargets;
    const spawnProjectile=deps.spawnProjectile;
    const weaponChain=deps.weaponChain;
    const addMeleeAnim=deps.addMeleeAnim;
    const weaponDamage=deps.weaponDamage;
    const weaponCone=deps.weaponCone;
    const weaponKnockback=deps.weaponKnockback;
    const weaponBurst=deps.weaponBurst;
    const applyWeaponBurn=deps.applyWeaponBurn;
    const applyWeaponSlow=deps.applyWeaponSlow;
    const isPlaying=deps.isPlaying;

    function attack(player,enemies,rarity,manualTarget,weapon,type){
      const def=getDefinition(type);if(!def)return;const tier=getTier(rarity),base=campaignWeaponDamage(def,rarity);
      weapon.attackCount=(weapon.attackCount||0)+1;
      const targets=nearestWeaponTargets(player,enemies,def.range,8);const target=targets[0];const aimTarget=manualTarget||target;if(!aimTarget)return;
      const angle=Math.atan2(aimTarget.y-player.y,aimTarget.x-player.x),col=def.color;
      const shoot=(a,dmg,opts={})=>{const shotOpts={...opts};if(shotOpts.homing&&!shotOpts.target)shotOpts.target=manualTarget||target;return spawnProjectile(player.x,player.y,a,dmg,player,weapon,shotOpts);};
      if(def.classId==='necromancer'){
        return global.NecromancerSystem?.attackWeapon(player,enemies,rarity,manualTarget,weapon,type,{
          getDefinition,getTier,getDamage:campaignWeaponDamage,nearestTargets:nearestWeaponTargets,
          spawnProjectile,weaponDamage,weaponCone,weaponBurst,weaponKnockback,addMeleeAnim,
        });
      }else if(def.classId==='mage'){
        if(type==='mage_fire_staff'){
          const shots=tier>=4?3:tier>=2?2:1,mult=tier>=4?.65:tier>=3?.75:tier>=2?.65:1;
          for(let i=0;i<shots;i++)shoot(angle+(i-(shots-1)/2)*.16,base*mult,{color:col,homing:true,explode:tier===0?28:tier>=1?34:30,burn:tier>=3?{dps:base*(tier>=4?.25:.20),duration:3000}:null,fireTrail:tier>=4});
        }else if(type==='mage_lightning_staff'){
          if(!target)return;
          const n=tier>=4&&weapon.attackCount%4===0?4:tier>=3?3:tier>=2?2:1;
          weaponChain(player,enemies,target,n,tier>=4&&weapon.attackCount%4===0?[base*.7]:[base,base*.6,base*.35],weapon,col);
          addMeleeAnim('arrow',player.x,player.y,angle,def.range*(tier>=1?1.15:1),col,260);
          if(tier>=3&&Math.random()<.18&&!target.type?.startsWith('boss')){target.slowed=true;target.slowTimer=Math.max(target.slowTimer||0,250);}
        }else if(type==='mage_ice_staff'){
          const shots=tier>=2?2:1;for(let i=0;i<shots;i++)shoot(angle+(i?-.1:.1),base*(shots===2?.6:.9),{color:col,homing:true,slow:{pct:tier>=2?.25:.20,duration:tier>=1?2600:2000},iceHits:tier>=3?3:0,glacial:tier>=4});
        }else if(type==='mage_arcane_staff'){
          let shots=tier>=3?3:tier>=2?2:1,mult=shots===3?.5:shots===2?.6:1;if(tier>=4&&weapon.attackCount%5===0){shots=6;mult=.35;}
          for(let i=0;i<shots;i++){const t=targets[i%Math.max(1,targets.length)]||aimTarget;shoot(Math.atan2(t.y-player.y,t.x-player.x)+(i-(shots-1)/2)*.06,base*mult,{color:col,homing:true,target:t,pierce:tier>=3?1:0});}
        }else if(type==='mage_poison_staff'){
          const shots=tier>=2?2:1;for(let i=0;i<shots;i++)shoot(angle+(i?-.11:.11),base*(shots===2?.5:.8),{color:col,homing:true,poison:{dps:base*(tier>=1?.16:.12),duration:4000,maxStacks:tier>=3?3:tier>=2?2:1,spread:tier>=4}});
        }else if(type==='mage_shadow_staff'){
          shoot(angle,base*(tier>=2?1.1:1),{color:col,pierce:tier>=2?2:1,echo:tier>=3?{delay:350,mult:tier>=4?.7:.55,reverse:tier>=4}:null});
        }else if(type==='mage_solar_staff'){
          if(!target)return;
          const ticks=tier>=2?4:3,range=def.range*(tier>=2?1.2:tier>=1?1.12:1);for(let i=0;i<ticks;i++){setTimeout(()=>{if(!isPlaying())return;const dmg=base/ticks*(tier>=3&&i===ticks-1?1.5:1);weaponDamage(player,weapon,target,dmg,col);if(tier>=4&&i===ticks-1){nearestWeaponTargets(player,enemies,range,3,[target]).slice(0,2).forEach(enemy=>weaponDamage(player,weapon,enemy,dmg*.45,col));}},i*110);}addMeleeAnim('arrow',player.x,player.y,angle,range,col,500);
        }else if(type==='mage_wind_staff'){
          const range=def.range*(tier>=2?1.3:1),dmg=base*(tier>=2?.9:.7);weaponCone(player,enemies,angle,range,Math.PI*.55,weapon,dmg,col,enemy=>weaponKnockback(player,enemy,tier>=1?38:26));
          addMeleeAnim('sword',player.x,player.y,angle,range,col,300);
          if(tier>=3)setTimeout(()=>weaponCone(player,enemies,angle,range,Math.PI*.55,weapon,base*.55,col,enemy=>weaponKnockback(player,enemy,30)),300);
          if(tier>=4&&weapon.attackCount%4===0)weaponBurst(player,enemies,player.x+Math.cos(angle)*90,player.y+Math.sin(angle)*90,90,weapon,base*.35,col,enemy=>weaponKnockback(player,enemy,45));
        }
      }else if(def.classId==='archer'){
        const common={color:col,target:target||null,pierce:0};
        if(type==='archer_shortbow'){
          const shots=tier>=4&&weapon.attackCount%5===0?4:tier>=3&&weapon.attackCount%3===0?2:1,mult=shots===4?.45:shots===2?.65:.85;for(let i=0;i<shots;i++)shoot(angle+(i-(shots-1)/2)*.12,base*mult,{...common});
        }else if(type==='archer_longbow')shoot(angle,base*(tier>=4&&weapon.attackCount%5===0?2:1.4),{...common,pierce:tier>=4&&weapon.attackCount%5===0?5:tier>=3?2:tier>=2?1:0,critBonus:tier>=3?.25:0});
        else if(type==='archer_crossbow')shoot(angle,base*(tier>=4&&weapon.attackCount%3===0?2.5:tier>=2?2:1.75),{...common,pierce:tier>=4&&weapon.attackCount%3===0?3:0,bossBonus:tier>=3?.4:0,speed:.72});
        else if(type==='archer_poisonbow')shoot(angle,base*.8,{...common,poison:{dps:base*.13,duration:tier>=2?5000:4000,maxStacks:tier>=3?3:1,spread:tier>=4}});
        else if(type==='archer_explosivebow')shoot(angle,base,{...common,explode:tier>=4&&weapon.attackCount%4===0?72:tier>=2?46:35,explodeMult:tier>=4&&weapon.attackCount%4===0?1.3:tier>=3?.7:tier>=2?.52:.4});
        else if(type==='archer_ricochetbow')shoot(angle,base,{...common,ricochet:tier>=4?3:tier>=3?2:tier>=2?1:0,ricochetMult:tier>=4?.7:tier>=3?.65:.55});
        else if(type==='archer_frostbow')shoot(angle,base*.9,{...common,slow:{pct:tier>=2?.30:.20,duration:tier>=1?2600:2000},iceHits:tier>=3?3:0,frozenCrit:tier>=4?.3:0});
        else if(type==='archer_thunderbow'){shoot(angle,base,{...common});const n=tier>=3?3:tier>=2?2:1;if(target)weaponChain(player,enemies,target,n,[0,base*(tier>=3?.5:.4),base*.3],weapon,col);if(tier>=4&&weapon.attackCount%5===0)nearestWeaponTargets(player,enemies,def.range,4,target?[target]:[]).slice(0,3).forEach(enemy=>weaponDamage(player,weapon,enemy,base*.45,col));}
      }else{
        const isWarrior=def.classId==='warrior';
        const counter=weapon.attackCount;
        if(type==='warrior_longsword'){const swings=tier>=3?3:tier>=2?2:1;for(let i=0;i<swings;i++)setTimeout(()=>weaponCone(player,enemies,angle,def.range*(tier>=3&&i===2?1.2:1),Math.PI*(tier>=1?.92:.82),weapon,base*([1,.8,.7][i]||.6),col),i*105);if(tier>=4&&counter%3===0)weaponBurst(player,enemies,player.x+Math.cos(angle)*120,player.y+Math.sin(angle)*120,55,weapon,base*.65,col);}
        else if(type==='warrior_greatsword'){weaponCone(player,enemies,angle,def.range*(tier>=2?1.3:tier>=1?1.1:1),Math.PI*.85,weapon,base*(tier>=2?1.6:1.45),col,enemy=>{if(tier>=3){enemy.weaponVulnerable=.10;enemy.weaponVulnerableTimer=3000;}});if(tier>=4)weaponBurst(player,enemies,player.x+Math.cos(angle)*130,player.y+Math.sin(angle)*130,50,weapon,base*.8,col);}
        else if(type==='warrior_spear'||type==='viking_nordicspear'){shoot(angle,base*(type==='viking_nordicspear'?(tier>=3?1.5:1.1):1.2),{color:col,pierce:tier>=4?6:tier>=3?4:tier>=2?2:0,speed:1.2});if(tier>=4&&counter%3===0)shoot(angle,base*1.5,{color:'#e8e0ff',pierce:8,speed:1.4});}
        else if(type==='warrior_warhammer'){weaponBurst(player,enemies,player.x+Math.cos(angle)*60,player.y+Math.sin(angle)*60,def.range*(tier>=2?1.25:tier>=1?1.12:1),weapon,base*1.3,col,enemy=>{if(tier>=3&&counter%3===0&&!enemy.type?.startsWith('boss')){enemy.slowed=true;enemy.slowTimer=600;}});if(tier>=4&&counter%3===0)weaponBurst(player,enemies,player.x,player.y,150,weapon,base*.6,col);}
        else if(type==='warrior_warshield'){weaponCone(player,enemies,angle,def.range,Math.PI*.75,weapon,base*.8,col,enemy=>weaponKnockback(player,enemy,45));}
        else if(type==='warrior_twinblades'){const swings=tier>=2?3:2;for(let i=0;i<swings;i++)setTimeout(()=>weaponCone(player,enemies,angle+(i%2?-.12:.12),def.range,Math.PI*.58,weapon,base*(tier>=2?.45:.55),col,enemy=>{weapon.hitCount=(weapon.hitCount||0)+1;if(tier>=3&&i===swings-1)applyWeaponBurn(enemy,player,weapon,base*.15,3000);if(tier>=4&&weapon.hitCount%8===0)weapon.berserkTimer=3000;}),i*80);}
        else if(type==='warrior_chainblade'){const range=def.range*(tier>=2?1.35:tier>=1?1.18:1);weaponCone(player,enemies,angle,range,Math.PI,weapon,base*.9,col,enemy=>{if(tier>=3)weaponKnockback(player,enemy,-20);});if(tier>=4&&counter%4===0)weaponBurst(player,enemies,player.x,player.y,range,weapon,base*1.25,col);}
        else if(type==='warrior_spikedmace'){weaponCone(player,enemies,angle,def.range,Math.PI*.7,weapon,base*(tier>=2?1.3:tier>=1?1.18:1.1),col,enemy=>{if(tier>=2&&!enemy.type?.startsWith('boss')){enemy.slowed=true;enemy.slowTimer=180;}if(tier>=3){enemy.weaponVulnerable=.08;enemy.weaponVulnerableTimer=3000;}if(tier>=4&&enemy.weaponVulnerable)weaponBurst(player,enemies,enemy.x,enemy.y,38,weapon,base*.45,col);});}
        else if(type==='viking_waraxe'){weaponCone(player,enemies,angle,def.range*(tier>=2?1.15:tier>=1?1.08:1),Math.PI,weapon,base*(tier>=2?1.4:1.2),col,enemy=>{if(tier>=3&&Math.hypot(enemy.x-player.x,enemy.y-player.y)<def.range*.55)weaponDamage(player,weapon,enemy,base*.3,col);if(tier>=4&&!enemy.type?.startsWith('boss')&&enemy.hp<enemy.maxHp*.15)weaponDamage(player,weapon,enemy,base*2,col);});}
        else if(type==='viking_twinaxes'){for(let i=0;i<2;i++)setTimeout(()=>weaponCone(player,enemies,angle+(i?-.15:.15),def.range,Math.PI*.65,weapon,base*(tier>=2?.7:.6),col,enemy=>{weapon.hitCount=(weapon.hitCount||0)+1;if(tier>=4&&weapon.hitCount%10===0)weapon.berserkTimer=3000;}),i*85);if(tier>=3&&counter%3===0)weaponBurst(player,enemies,player.x,player.y,def.range,weapon,base,col);}
        else if(type==='viking_throwingaxe')shoot(angle,base*(tier>=2?.8:.7),{color:col,pierce:tier>=3?4:1,boomerang:true,returnSpin:tier>=4,rangeMult:tier>=2?1.2:tier>=1?1.15:1});
        else if(type==='viking_stormhammer'){weaponCone(player,enemies,angle,def.range,Math.PI*.8,weapon,base*1.2,col);const extra=tier>=3?2:tier>=2?1:0;nearestWeaponTargets(player,enemies,def.range*2.2,extra,[target]).forEach(enemy=>weaponDamage(player,weapon,enemy,base*.4,col));if(tier>=4&&counter%4===0)nearestWeaponTargets(player,enemies,def.range*2.2,3).forEach(enemy=>weaponDamage(player,weapon,enemy,base*.6,col));}
        else if(type==='viking_bloodaxe'){const low=1-player.hp/player.maxHp,dmg=base*(tier>=3?1+Math.min(.25,low*.35):tier>=2?1.1:1);weaponCone(player,enemies,angle,def.range,Math.PI,weapon,dmg,col);}
        else if(type==='viking_frostaxe'){weaponCone(player,enemies,angle,def.range,Math.PI,weapon,base*1.1,col,enemy=>{applyWeaponSlow(enemy,tier>=2?.25:.15,tier>=1?2400:1800,player);if(tier>=3&&counter%4===0&&!enemy.freezeImmune){enemy.frozen=true;enemy.frozenTimer=600;}if(tier>=4&&enemy.frozen){const around=nearestWeaponTargets(player,enemies,def.range*2,3,[enemy]);around.forEach(other=>weaponDamage(player,weapon,other,base*.35,col));}});}
        else if(type==='viking_colossalaxe'){weaponBurst(player,enemies,player.x,player.y,def.range*(tier>=1?1.1:1),weapon,base*(tier>=2?2.1:1.8),col);if(tier>=3)weaponBurst(player,enemies,player.x+Math.cos(angle)*def.range,player.y+Math.sin(angle)*def.range,55,weapon,base*.8,col);if(tier>=4&&counter%3===0){weaponBurst(player,enemies,player.x,player.y,def.range,weapon,base*2.5,col);weaponBurst(player,enemies,player.x,player.y,def.range*1.65,weapon,base*.75,col);}}
        addMeleeAnim(isWarrior?'sword':'axe',player.x,player.y,angle,def.range,col,420);
      }
    }

    return Object.freeze({attack});
  }

  global.CampaignWeaponSystem=Object.freeze({create});
})(window);
