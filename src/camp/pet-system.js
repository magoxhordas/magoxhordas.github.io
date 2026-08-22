// CampV2 companion behavior extracted without changing movement or rendering.
// The CampV2 closure keeps the single S.pet state and injects accessors for the
// existing global pet selection/assets instead of duplicating them here.
(function(global){
  'use strict';

  function create(deps){
    const {
      S,livre,getImageSets,getCapturedPets,getActivePetId,getFlyingPets,
      getFlyLift,getDrawPetImage,
    }=deps||{};
    if(!S||typeof livre!=='function'||typeof getImageSets!=='function'||
       typeof getCapturedPets!=='function'||typeof getActivePetId!=='function'||
       typeof getFlyingPets!=='function'||typeof getFlyLift!=='function'||
       typeof getDrawPetImage!=='function')
      throw new TypeError('CampPetSystem.create recebeu dependencias invalidas.');

    const PET_SEGUE=76, PET_PARA=52, PET_LONGE=340;

    function petAtivo(){
      const imageSets=getImageSets();
      if(!imageSets) return null;
      const tem=getCapturedPets();
      const activeId=getActivePetId();
      if(activeId && imageSets[activeId] && (!tem || tem[activeId])) return activeId;
      if(tem) for(const id in tem) if(imageSets[id]) return id;
      return null;
    }

    function atualizarPet(dt){
      const id=petAtivo();
      if(!id){ S.pet=null; return; }
      if(!S.pet || S.pet.id!==id)
        S.pet={id, x:S.x-58, y:S.y+10, dir:'south', flip:false, andando:false};
      const p=S.pet;
      const dx=S.x-p.x, dy=(S.y+6)-p.y, d=Math.hypot(dx,dy);
      if(d>PET_LONGE){ p.x=S.x-58; p.y=S.y+10; p.seguindo=false; p.andando=false; return; }
      if(d>PET_SEGUE) p.seguindo=true;
      else if(d<PET_PARA) p.seguindo=false;
      if(!p.seguindo){ p.andando=false; return; }
      const vel=Math.min(d-PET_PARA*.5, (S.correndo?205:140)*dt);
      const ax=p.x, ay=p.y;
      if(livre(p.x+dx/d*vel, p.y)) p.x+=dx/d*vel;
      if(livre(p.x, p.y+dy/d*vel)) p.y+=dy/d*vel;
      p.andando = (p.x!==ax || p.y!==ay);
      if(Math.abs(dx)>Math.abs(dy)*1.2){ p.dir='side'; p.flip=dx<0; }
      else p.dir = dy<0?'north':'south';
    }

    function desenharPet(c,t){
      const p=S.pet; if(!p) return;
      const flyingPets=getFlyingPets();
      const voa=!!(flyingPets&&flyingPets[p.id]);
      const sobe=voa?getFlyLift():0;
      const x=Math.round(p.x-S.camX), y=Math.round(p.y-S.camY);
      const bal=voa?Math.sin(t*.004)*2:0;
      c.fillStyle=voa?'rgba(0,0,0,.20)':'rgba(0,0,0,.30)';
      c.beginPath(); c.ellipse(x,y,9,3.5,0,0,Math.PI*2); c.fill();
      const drawPetImage=getDrawPetImage();
      if(typeof drawPetImage==='function')
        drawPetImage(c,p.id,x,y-sobe+bal,p.flip,p.andando,t,p.dir);
    }

    return {atualizarPet,desenharPet};
  }

  global.CampPetSystem=Object.freeze({create});
})(window);
