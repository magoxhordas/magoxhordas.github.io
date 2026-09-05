// Ciclo de vida e movimento dos projeteis das armas. O desenho continua no
// renderer legado nesta fase para limitar o corte e preservar o visual exato.
(function(global){
  'use strict';

  function create(deps){
    const getBounds=deps.getBounds;
    const getShopEffect=deps.getShopEffect;
    const isPlaying=deps.isPlaying;
    const createCampaignProjectile=deps.createCampaignProjectile;
    const addProjectile=deps.addProjectile;
    const getEnemies=deps.getEnemies;
    const weaponBurst=deps.weaponBurst;
    const addFirePatch=deps.addFirePatch;
    const getHeroSkinAttackColors=deps.getHeroSkinAttackColors;

    function initializeWeapon(projectile,x,y,angle,dmg,wtype,color,secondaryColor=null,owner=null){
      projectile.x=x;projectile.y=y;projectile.angle=angle;projectile.dmg=dmg;projectile.wtype=wtype;projectile.color=color;
      projectile.secondaryColor=secondaryColor;
      projectile.owner=owner;
      const spd=wtype==='bow'?500:350;
      projectile.vx=Math.cos(angle)*spd;projectile.vy=Math.sin(angle)*spd;
      projectile.radius=6;projectile.dead=false;projectile.born=Date.now();projectile.life=1600;
      projectile.trail=[];
    }

    function updateWeapon(projectile,dt){
      const {W,H}=getBounds();
      projectile.trail.push({x:projectile.x,y:projectile.y});
      if(projectile.trail.length>14)projectile.trail.shift();
      projectile.x+=projectile.vx*dt;projectile.y+=projectile.vy*dt;
      if(Date.now()-projectile.born>projectile.life||projectile.x<0||projectile.x>W||projectile.y<0||projectile.y>H)projectile.dead=true;
    }

    function initializeCampaign(projectile,x,y,angle,dmg,owner,weapon,opts={}){
      projectile.x=x;projectile.y=y;projectile.angle=angle;projectile.dmg=dmg;projectile.owner=owner;projectile.weapon=weapon;projectile.opts=opts;
      projectile.color=opts.color||'#ffffff';projectile.radius=(opts.radius||7)*(1+(owner?.classId==='mage'?(getShopEffect(owner).magicArea||0):0));projectile.dead=false;projectile.born=Date.now();projectile.life=2200*(opts.rangeMult||1);
      projectile.speed=420*(opts.speed||1);projectile.vx=Math.cos(angle)*projectile.speed;projectile.vy=Math.sin(angle)*projectile.speed;
      projectile.target=opts.target||null;projectile.homing=!!opts.homing;projectile.pierce=opts.pierce||0;projectile.hitTargets=new Set();projectile.trail=[];projectile.isCampaignWeaponProj=true;
      projectile.originX=x;projectile.originY=y;projectile.returning=false;
      /* Id do ciclo de combo que disparou este projetil. Todos os
         projeteis da mesma rajada carregam o MESMO id, entao a rajada
         inteira vale um evento so' — nao um por flecha. */
      projectile.comboEventId=opts.comboEventId||owner?._comboEventoAtual||0;
    }

    function updateCampaign(projectile,dt){
      const {W,H}=getBounds();
      if(projectile.opts.echo&&!projectile._echoScheduled){
        projectile._echoScheduled=true;const echo=projectile.opts.echo;
        setTimeout(()=>{
          if(!isPlaying())return;
          addProjectile(createCampaignProjectile(projectile.originX,projectile.originY,projectile.angle,projectile.dmg*echo.mult,projectile.owner,projectile.weapon,{...projectile.opts,echo:null,fireTrail:false}));
          if(echo.reverse)addProjectile(createCampaignProjectile(projectile.originX,projectile.originY,projectile.angle+Math.PI,projectile.dmg*echo.mult,projectile.owner,projectile.weapon,{...projectile.opts,echo:null,fireTrail:false}));
        },echo.delay);
      }
      projectile.trail.push({x:projectile.x,y:projectile.y});if(projectile.trail.length>12)projectile.trail.shift();
      if(projectile.homing&&projectile.target&&!projectile.target.dead){let desired=Math.atan2(projectile.target.y-projectile.y,projectile.target.x-projectile.x),diff=desired-projectile.angle;while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;projectile.angle+=diff*.16;projectile.vx=Math.cos(projectile.angle)*projectile.speed;projectile.vy=Math.sin(projectile.angle)*projectile.speed;}
      if(projectile.opts.boomerang&&!projectile.returning&&Math.hypot(projectile.x-projectile.originX,projectile.y-projectile.originY)>160*(projectile.opts.rangeMult||1)){projectile.returning=true;projectile.hitTargets.clear();}
      if(projectile.returning){const desired=Math.atan2(projectile.owner.y-projectile.y,projectile.owner.x-projectile.x);projectile.angle=desired;projectile.vx=Math.cos(desired)*projectile.speed;projectile.vy=Math.sin(desired)*projectile.speed;if(Math.hypot(projectile.x-projectile.owner.x,projectile.y-projectile.owner.y)<15){if(projectile.opts.returnSpin)weaponBurst(projectile.owner,getEnemies(),projectile.owner.x,projectile.owner.y,85,projectile.weapon,projectile.dmg*.6,projectile.color);projectile.dead=true;return;}}
      projectile.x+=projectile.vx*dt;projectile.y+=projectile.vy*dt;
      if(projectile.opts.fireTrail&&Math.random()<.35)addFirePatch({x:projectile.x,y:projectile.y,timer:3000,r:22,dmgTick:0,dmgPerSec:projectile.dmg*.25,owner:projectile.owner,noStackKey:projectile.weapon.type});
      if(Date.now()-projectile.born>projectile.life||projectile.x<-40||projectile.x>W+40||projectile.y<-40||projectile.y>H+40)projectile.dead=true;
    }

    function initializeArrow(projectile,x,y,target,dmg,owner){
      projectile.x=x;projectile.y=y;
      projectile.target=target;
      projectile.owner=owner;
      projectile.dmg=dmg;
      projectile.radius=6;projectile.dead=false;
      projectile.born=Date.now();projectile.life=2000;
      projectile.speed=520*(1+(owner?.cardEffects?.projectileSpeed||0))*(1+(getShopEffect(owner).critProjectileSpeed||0));
      const dx=target.x-x,dy=target.y-y;
      projectile.angle=Math.atan2(dy,dx);
      projectile.vx=Math.cos(projectile.angle)*projectile.speed;
      projectile.vy=Math.sin(projectile.angle)*projectile.speed;
      projectile.trail=[];
      const skinAttack=getHeroSkinAttackColors();
      projectile.color=skinAttack?.primary||'#22ff88';
      projectile.secondaryColor=skinAttack?.secondary||'#ffffff';
    }

    function updateArrow(projectile,dt){
      const {W,H}=getBounds();
      projectile.trail.push({x:projectile.x,y:projectile.y});
      if(projectile.trail.length>12)projectile.trail.shift();
      if(projectile.target&&!projectile.target.dead){
        const tx=projectile.target.x,ty=projectile.target.y;
        const desiredAngle=Math.atan2(ty-projectile.y,tx-projectile.x);
        let diff=desiredAngle-projectile.angle;
        while(diff>Math.PI)diff-=Math.PI*2;
        while(diff<-Math.PI)diff+=Math.PI*2;
        projectile.angle+=diff*0.22;
        projectile.vx=Math.cos(projectile.angle)*projectile.speed;
        projectile.vy=Math.sin(projectile.angle)*projectile.speed;
      }
      projectile.x+=projectile.vx*dt;projectile.y+=projectile.vy*dt;
      if(Date.now()-projectile.born>projectile.life||projectile.x<-20||projectile.x>W+20||projectile.y<-20||projectile.y>H+20)projectile.dead=true;
    }

    return Object.freeze({initializeWeapon,updateWeapon,initializeCampaign,updateCampaign,initializeArrow,updateArrow});
  }

  global.CampaignProjectileSystem=Object.freeze({create});
})(window);
