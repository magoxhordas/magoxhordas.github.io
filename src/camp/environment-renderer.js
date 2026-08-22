// CampV2 environmental rendering extracted without changing pixels or timing.
(function(global){
  'use strict';

  function create(deps){
    const {S,LUZES_ACAMPAMENTO}=deps||{};
    if(!S||!Array.isArray(LUZES_ACAMPAMENTO))
      throw new TypeError('CampEnvironmentRenderer.create recebeu dependencias invalidas.');

    const VAGALUMES = Array.from({length:18},(_,i)=>(
        {x:82+(i*173)%1270,y:115+(i*97)%790,fase:i*.83,raio:1+(i%3)*.35}
      ));

      function brilho(c,x,y,cor,raio,alpha){
        const g=c.createRadialGradient(x,y,1,x,y,raio);
        g.addColorStop(0,cor); g.addColorStop(.22,cor);
        g.addColorStop(1,'rgba(0,0,0,0)');
        c.save(); c.globalAlpha=alpha; c.fillStyle=g;
        c.fillRect(x-raio,y-raio,raio*2,raio*2); c.restore();
      }

      function desenharAgua(c,t){
        c.save();
        c.beginPath();
        c.moveTo(870,105); c.quadraticCurveTo(1110,55,1335,95);
        c.quadraticCurveTo(1420,145,1390,260);
        c.quadraticCurveTo(1310,340,1110,345);
        c.quadraticCurveTo(900,330,842,248);
        c.quadraticCurveTo(820,160,870,105); c.closePath(); c.clip();
        for(let i=0;i<13;i++){
          const y=104+i*18+Math.sin(t*.0012+i)*3;
          const x=842+((t*.018+i*89)%520);
          c.strokeStyle=i%3===0?'rgba(90,205,255,.32)':'rgba(38,135,210,.22)';
          c.lineWidth=i%3===0?2:1;
          c.beginPath(); c.moveTo(x,y); c.lineTo(x+18+(i%4)*5,y);
          c.lineTo(x+24+(i%4)*5,y-2); c.stroke();
        }
        for(let i=0;i<4;i++){
          const pul=(t*.00045+i*.24)%1;
          c.strokeStyle='rgba(100,220,255,'+(.23*(1-pul))+')'; c.lineWidth=1.2;
          c.beginPath(); c.ellipse(1120+i*42,250-i*18,10+pul*30,4+pul*12,0,0,Math.PI*2); c.stroke();
        }
        c.restore();
      }

      function desenharFogueira(c,t){
        // A chama principal ja faz parte da arte do mapa. Estes poucos pixels so
        // movimentam a ponta e as brasas, sem desenhar outra fogueira por cima.
        const quadro=Math.floor(t/140)%4;
        const pixels=[
          [[-5,-12,3,5,'#ff6b1b'],[ 1,-17,3,6,'#ffc43b'],[ 5,-10,2,4,'#ff7a18']],
          [[-7,-10,3,4,'#ff7a18'],[-1,-19,3,7,'#ffd75a'],[ 4,-13,3,5,'#ff5a16']],
          [[-4,-15,3,6,'#ff5a16'],[ 2,-16,3,6,'#ffe27a'],[ 6, -9,2,4,'#ff7a18']],
          [[-6,-11,3,5,'#ff7a18'],[ 0,-20,3,7,'#ffc43b'],[ 5,-12,2,5,'#ff5a16']],
        ][quadro];
        const pul=.5+.5*Math.sin(t*.008);
        brilho(c,765,552,'#ff7a18',38,.025+.035*pul);
        c.save();
        c.imageSmoothingEnabled=false; c.globalAlpha=.58;
        for(const [x,y,w,h,cor] of pixels){ c.fillStyle=cor; c.fillRect(765+x,552+y,w,h); }
        for(let i=0;i<3;i++){
          const f=(t*.00032+i*.31)%1;
          c.globalAlpha=(1-f)*.55; c.fillStyle=i%2?'#ffb42b':'#ff6b1b';
          c.fillRect(Math.round(765+Math.sin(f*7+i)*8),Math.round(535-f*28),1,1);
        }
        c.restore();
      }

      function desenharAmbiente(c,t){
        c.save(); c.translate(-S.camX,-S.camY);
        desenharAgua(c,t);
        for(const [x,y,cor,raio,fase] of LUZES_ACAMPAMENTO){
          const pul=.5+.5*Math.sin(t*.0027+fase);
          brilho(c,x,y,cor,raio,.035+.07*pul);
          c.globalAlpha=.65+.3*pul; c.fillStyle=cor; c.fillRect(Math.round(x-1),Math.round(y-2),3,4);
        }
        c.globalAlpha=1;
        desenharFogueira(c,t);

        // O portal respira devagar e os dois aneis nunca piscam no mesmo ritmo.
        const pp=.5+.5*Math.sin(t*.0022);
        brilho(c,748,978,'#22a8ff',72,.05+.07*pp);
        c.strokeStyle='rgba(74,205,255,'+(.24+.22*pp)+')'; c.lineWidth=2;
        c.beginPath(); c.ellipse(748,977,46+pp*3,67+pp*4,0,0,Math.PI*2); c.stroke();
        c.strokeStyle='rgba(125,96,255,'+(.18+.18*(1-pp))+')'; c.lineWidth=1;
        c.beginPath(); c.ellipse(748,977,53-pp*2,73-pp*3,0,0,Math.PI*2); c.stroke();

        for(const v of VAGALUMES){
          const pul=Math.max(0,Math.sin(t*.0018+v.fase));
          if(pul<.35) continue;
          const x=v.x+Math.sin(t*.00055+v.fase)*9, y=v.y+Math.cos(t*.00043+v.fase)*6;
          c.globalAlpha=(pul-.35)*.7; c.fillStyle='#d8ff68';
          c.fillRect(Math.round(x),Math.round(y),v.raio,v.raio);
        }
        c.restore(); c.globalAlpha=1;
      }

    return {desenharAmbiente};
  }

  global.CampEnvironmentRenderer=Object.freeze({create});
})(window);
