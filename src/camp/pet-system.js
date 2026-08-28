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

    const PET_OFFSET_X=-38, PET_OFFSET_Y=8;
    const PET_SEGUE=42, PET_PARA=18, PET_LONGE=300, PET_PRESO_MS=360;

    function petAtivo(){
      const imageSets=getImageSets();
      if(!imageSets) return null;
      const tem=getCapturedPets();
      const activeId=getActivePetId();
      if(activeId && imageSets[activeId] && (!tem || tem[activeId])) return activeId;
      if(tem) for(const id in tem) if(imageSets[id]) return id;
      return null;
    }

    function pontoLateral(){ return {x:S.x+PET_OFFSET_X,y:S.y+PET_OFFSET_Y}; }

    function reposicionarAoLado(p){
      const alvo=pontoLateral();
      if(!livre(alvo.x,alvo.y)) return false;
      p.x=alvo.x; p.y=alvo.y;
      p.seguindo=false; p.andando=false; p.presoMs=0;
      return true;
    }

    function atualizarPet(dt){
      const id=petAtivo();
      if(!id){ S.pet=null; return; }
      if(!S.pet || S.pet.id!==id){
        const alvo=pontoLateral();
        S.pet={id,x:alvo.x,y:alvo.y,dir:'south',flip:false,andando:false,seguindo:false,presoMs:0};
      }
      const p=S.pet;
      const alvo=pontoLateral();
      const dx=alvo.x-p.x, dy=alvo.y-p.y, d=Math.hypot(dx,dy);

      // Se o jogador disparou para longe, nao deixa o companheiro atravessar o
      // mapa tentando alcancar a posicao antiga: recupera-o no ponto lateral.
      if(d>PET_LONGE){ reposicionarAoLado(p); return; }
      if(d>PET_SEGUE) p.seguindo=true;
      else if(d<PET_PARA) p.seguindo=false;
      if(!p.seguindo){ p.andando=false; p.presoMs=0; return; }

      const maxPasso=(S.correndo?235:165)*Math.max(0,Number(dt)||0);
      const vel=Math.min(Math.max(0,d-PET_PARA*.45),maxPasso);
      if(d<=.001||vel<=0){ p.andando=false; return; }

      const ax=p.x, ay=p.y;
      const nx=p.x+dx/d*vel, ny=p.y+dy/d*vel;
      if(livre(nx,p.y)) p.x=nx;
      if(livre(p.x,ny)) p.y=ny;
      p.andando=(p.x!==ax||p.y!==ay);

      if(p.andando) p.presoMs=0;
      else {
        p.presoMs=(p.presoMs||0)+Math.max(0,Number(dt)||0)*1000;
        if(p.presoMs>=PET_PRESO_MS){
          // Objetos estreitos podem bloquear os dois eixos do passo incremental.
          // O ponto lateral e validado por `livre`, portanto o recovery nao
          // atravessa paredes: apenas recoloca o pet num destino navegavel.
          reposicionarAoLado(p);
        }
      }

      if(Math.abs(dx)>Math.abs(dy)*1.2){ p.dir='side'; p.flip=dx<0; }
      else if(Math.abs(dy)>.5) p.dir=dy<0?'north':'south';
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
