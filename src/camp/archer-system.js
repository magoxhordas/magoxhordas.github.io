// CampV2 archer renderer extracted without moving ArqueiroNPC gameplay/dialogue.
// World dimensions and existing hero art helpers stay owned by the index and
// are accessed through the small dependency surface below.
(function(global){
  'use strict';

  function create(deps){
    const {S,ARQ,getWorldSize,getHeroImageSets,getHeroImage}=deps||{};
    if(!S||!ARQ||typeof getWorldSize!=='function'||
       typeof getHeroImageSets!=='function'||typeof getHeroImage!=='function')
      throw new TypeError('CampArcherSystem.create recebeu dependencias invalidas.');

    function desenharArqueiro(c,t){
      const world=getWorldSize(), MW=world.width, MH=world.height;
      const ax=ARQ.fx*MW, ay=ARQ.fy*MH;
      const x=Math.round(ax-S.camX), y=Math.round(ay-S.camY);
      if(x<-70||x>c.canvas.width+70||y<-70||y>c.canvas.height+70) return;
      c.fillStyle='rgba(0,0,0,.34)';
      c.beginPath(); c.ellipse(x,y,11,4,0,0,Math.PI*2); c.fill();
      const imageSets=getHeroImageSets();
      const set=imageSets?imageSets.archer:null;
      const heroImage=getHeroImage();
      if(!set||typeof heroImage!=='function') return;
      const dx=S.x-ax, dy=S.y-ay;
      let dir='down', flip=false;
      if(Math.hypot(dx,dy)<150){
        if(Math.abs(dx)>Math.abs(dy)*1.2){ dir='side'; flip=dx>0; }
        else dir = dy<0?'up':'down';
      }
      const im=heroImage('archer',dir,0,'idle'); if(!im) return;
      const w=set.frame, bob=Math.sin(t*.0016)*1.1;
      const px2=Math.round(x-w/2), py2=Math.round(y-set.feet+bob);
      c.save(); c.imageSmoothingEnabled=false;
      if(flip){ c.translate(px2+w,py2); c.scale(-1,1); c.drawImage(im,0,0,w,w); }
      else c.drawImage(im,px2,py2,w,w);
      c.restore();
    }

    return {desenharArqueiro};
  }

  global.CampArcherSystem=Object.freeze({create});
})(window);
