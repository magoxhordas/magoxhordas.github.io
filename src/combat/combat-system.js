// Shared campaign hit rules extracted from index.html. Dependencies are
// injected so this module does not own campaign arrays or create parallel
// gameplay state.
(function(global){
  'use strict';

  function create(deps){
    const options=deps||{};
    const noop=()=>{};
    const getShopEffect=options.getShopEffect||(()=>({}));
    const getEnemies=options.getEnemies||(()=>[]);
    const hasWeaponType=options.hasWeaponType||(()=>false);
    const spawnParts=options.spawnParts||noop;
    const markEnemyStatus=options.markEnemyStatus||noop;
    const applyShopHitEffects=options.applyShopHitEffects||noop;
    const notifyBlessingSpecial=options.notifyBlessingSpecial||noop;
    const notifyBlessingHit=options.notifyBlessingHit||noop;
    const clampEntity=options.clampEntity||noop;
    const addFirePatch=options.addFirePatch||noop;
    const addLinkPart=options.addLinkPart||noop;

    function healPlayer(owner,amount,x,y,useBlessing=true){
      if(!owner||amount<=0||owner.hp>=owner.maxHp)return 0;
      const boosted=amount*(1+(useBlessing?(owner.cardEffects?.healingMult||0):0));
      const healed=Math.min(boosted,owner.maxHp-owner.hp);
      owner.hp+=healed;
      if(healed>0&&x!=null&&y!=null)spawnParts(x,y,'#ff4466',4,30);
      return healed;
    }

    function applyBlessingKnockback(owner,enemy){
      const force=owner?.cardEffects?.extraKnockback||0;
      if(!force||!enemy||enemy.dead)return;
      const angle=Math.atan2(enemy.y-owner.y,enemy.x-owner.x);
      const distance=Math.min(85,force*.45);
      enemy.x+=Math.cos(angle)*distance;
      enemy.y+=Math.sin(angle)*distance;
      clampEntity(enemy,enemy.radius||12);
    }

    function applyClassHitEffect(proj,enemy){
      const owner=proj.owner;
      if(!owner)return;
      applyBlessingKnockback(owner,enemy);
      notifyBlessingSpecial(owner);
      const cid=owner.classId;
      const classElement={mage:'ice',warrior:'fire',archer:'electric',viking:'blood'}[cid]||'physical';
      const weaponType=proj.weapon?.type;
      markEnemyStatus(enemy,weaponType&&hasWeaponType(weaponType)?weaponType:classElement);
      applyShopHitEffects(owner,enemy,proj.dmg||0);
      notifyBlessingHit(owner,enemy,proj.dmg||0,proj.weapon||null);
      if(cid==='mage'){
        if(enemy.frozen)return;
        if(enemy.slowed){
          enemy.frozen=true;
          enemy.frozenTimer=2000;
          enemy.slowed=false;
          spawnParts(enemy.x,enemy.y,'#aaeeff',8,50);
        }else{
          enemy.slowed=true;
          enemy.slowTimer=owner.slowDur*(1+(getShopEffect(owner).elementDuration||0));
          if(owner.instantFreeze){
            enemy.frozen=true;
            enemy.frozenTimer=2000;
          }
        }
      }else if(cid==='warrior'){
        addFirePatch({x:enemy.x,y:enemy.y,timer:owner.fireDur,r:28,dmgTick:0,dmgPerSec:owner.dmg*0.18,owner});
      }else if(cid==='archer'){
        const linked=getEnemies().filter(candidate=>!candidate.dead&&candidate!==enemy&&Math.hypot(candidate.x-enemy.x,candidate.y-enemy.y)<80).slice(0,owner.plasmaChain||1);
        for(const linkedEnemy of linked){
          linkedEnemy.takeDmg(proj.dmg*0.6);
          markEnemyStatus(linkedEnemy,'electric');
          spawnParts(linkedEnemy.x,linkedEnemy.y,'#22ff88',5,40);
          const steps=5;
          for(let step=0;step<steps;step++){
            const x=enemy.x+(linkedEnemy.x-enemy.x)*(step/steps);
            const y=enemy.y+(linkedEnemy.y-enemy.y)*(step/steps);
            addLinkPart(x,y,'#22ff88',20);
          }
        }
        if(owner.igniteSelf){
          addFirePatch({x:enemy.x,y:enemy.y,timer:900,r:24,dmgTick:0,dmgPerSec:owner.dmg*0.15,owner});
          spawnParts(enemy.x,enemy.y,'#ff6600',4,30);
        }
      }else if(cid==='viking'){
        if(owner.berserkActive){
          healPlayer(owner,proj.dmg*owner.lifeSteal,owner.x,owner.y);
        }
        const bloodWeapon=proj.weapon?.type==='viking_bloodaxe'?proj.weapon:null;
        if(bloodWeapon){
          const low=owner.hp/owner.maxHp<.35;
          const steal=bloodWeapon.rarity==='legendary'?(low?.05:.03):bloodWeapon.rarity==='epic'?.03:bloodWeapon.rarity==='rare'?.03:bloodWeapon.rarity==='uncommon'?.025:.02;
          healPlayer(owner,proj.dmg*steal,owner.x,owner.y,false);
        }
      }
    }

    return Object.freeze({healPlayer,applyBlessingKnockback,applyClassHitEffect});
  }

  global.CampaignCombatSystem=Object.freeze({create});
})(window);
