// Shared campaign damage rules extracted from index.html. The system owns the
// common player/enemy damage pipeline while callers retain mode- and enemy-
// specific death consequences through explicit callbacks.
(function(global){
  'use strict';

  function create(deps){
    const options=deps||{};
    const noop=()=>{};
    const no=()=>false;
    const one=()=>1;
    const getDifficulty=options.getDifficulty||(()=>({playerArmorCap:.75}));
    const getBlessingIncomingDamageMultiplier=options.getBlessingIncomingDamageMultiplier||one;
    const getCampaignShopIncomingDamageMultiplier=options.getCampaignShopIncomingDamageMultiplier||one;
    const getWeaponShieldReduction=options.getWeaponShieldReduction||(()=>0);
    const getCampProgressionDamageReduction=options.getCampProgressionDamageReduction||(()=>0);
    const shouldBlessingDodge=options.shouldBlessingDodge||no;
    const shouldCampProgressionDodge=options.shouldCampProgressionDodge||no;
    const shouldCampaignShopBlock=options.shouldCampaignShopBlock||no;
    const shouldBlessingPreventDeath=options.shouldBlessingPreventDeath||no;
    const shouldCampProgressionPreventDeath=options.shouldCampProgressionPreventDeath||no;
    const shouldEndGame=options.shouldEndGame||no;
    const notifyBlessingDashAvoid=options.notifyBlessingDashAvoid||noop;
    const notifyBlessingDamageTaken=options.notifyBlessingDamageTaken||noop;
    const notifyCampaignShopDamageTaken=options.notifyCampaignShopDamageTaken||noop;
    const notifyCampProgressionDamageTaken=options.notifyCampProgressionDamageTaken||noop;
    const weaponShieldCounter=options.weaponShieldCounter||noop;
    const spawnParts=options.spawnParts||noop;
    const spawnLevelUpNotice=options.spawnLevelUpNotice||noop;
    const triggerScreenShake=options.triggerScreenShake||noop;
    const endGame=options.endGame||noop;
    const incrementKills=options.incrementKills||noop;

    function calculatePlayerDamage(player,amount){
      const difficulty=getDifficulty();
      const blessingMult=getBlessingIncomingDamageMultiplier(player);
      return amount*blessingMult*getCampaignShopIncomingDamageMultiplier(player)*
        (1-Math.min(difficulty.playerArmorCap,(player.dmgReduce||0)+getWeaponShieldReduction(player)+getCampProgressionDamageReduction(player)));
    }

    function damagePlayer(player,amount,continuous){
      if(player.dead)return 0;
      // Contact, trails and puddles use their own short cadence instead of
      // granting the full invulnerability window that protects big attacks.
      if(continuous){
        if(player.inv||(player.chipT||0)>0)return 0;
        player.chipT=300;
      }else if(player.inv){
        if(player._dashActive)notifyBlessingDashAvoid(player);
        return 0;
      }
      if(shouldBlessingDodge(player))return 0;
      if(shouldCampProgressionDodge(player))return 0;
      if(shouldCampaignShopBlock(player))return 0;
      const reduced=calculatePlayerDamage(player,amount);
      const damageDealt=Math.min(Math.max(0,player.hp),Math.max(0,reduced));
      player.hp-=reduced;
      if(!continuous){
        player.inv=true;
        player.invT=600;
      }
      weaponShieldCounter(player);
      notifyBlessingDamageTaken(player,reduced);
      notifyCampaignShopDamageTaken(player,reduced);
      notifyCampProgressionDamageTaken(player,reduced);
      spawnParts(player.x,player.y,'#ff4444',8,65);
      triggerScreenShake(6,220);
      if(player.hp<=0){
        if(shouldCampProgressionPreventDeath(player))return damageDealt;
        if(shouldBlessingPreventDeath(player))return damageDealt;
        if((player._revivesLeft||0)>0){
          player._revivesLeft--;
          player.hp=Math.max(1,Math.round(player.maxHp*0.35));
          player.inv=true;
          player.invT=2500;
          spawnParts(player.x,player.y,'#77ffbb',24,95);
          spawnLevelUpNotice(player.x,player.y-36,`FIO DO DESTINO · ${player._revivesLeft} RESTANTE`,player.idx);
          return damageDealt;
        }
        player.hp=0;
        player.dead=true;
        triggerScreenShake(14,400);
        if(shouldEndGame())endGame();
      }
      return damageDealt;
    }

    function damageEnemy(target,amount,onDeath){
      if(target.isSpecter&&target.phased)return;
      if(target.hasShield)amount*=0.5;
      if(target.weaponVulnerable)amount*=1+target.weaponVulnerable;
      target.hp-=amount;
      spawnParts(target.x,target.y,'#88ff44',4,38);
      if(target.hp<=0){
        target.dead=true;
        incrementKills();
        if(typeof onDeath==='function')onDeath(target);
      }
    }

    return Object.freeze({calculatePlayerDamage,damagePlayer,damageEnemy});
  }

  global.CampaignDamageSystem=Object.freeze({create});
})(window);
