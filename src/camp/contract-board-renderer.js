/* ══════════════════════════════════════════════════════
   QUADRO DE CONTRATOS — DESENHO NO ACAMPAMENTO

   Mesma forma do CampArcherSystem: uma fabrica create(deps) que devolve a
   funcao de desenho, sem estado proprio e sem tocar em gameplay. O CampV2
   decide QUANDO chamar (antes ou depois do heroi, pela profundidade em Y).

   Nao ha' arte em arquivo para o quadro: ele e' desenhado com primitivas,
   como o resto da cena. Madeira, papeis pregados e um selo vermelho bastam
   para ler "mural de ordens" a essa distancia — arte grande demais poluiria
   a margem do lago, que ja' tem o pier e a tenda do Merlin por perto.
   ══════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  function create(deps){
    const {S,QUADRO,GUERREIRO,getWorldSize,getHeroImageSets,getHeroImage}=deps||{};
    if(!S||!QUADRO||!GUERREIRO||typeof getWorldSize!=='function'||
       typeof getHeroImageSets!=='function'||typeof getHeroImage!=='function')
      throw new TypeError('CampContractBoard.create recebeu dependencias invalidas.');

    function desenharQuadro(c,t){
      const world=getWorldSize(), MW=world.width, MH=world.height;
      const bx=QUADRO.fx*MW, by=QUADRO.fy*MH;
      const x=Math.round(bx-S.camX), y=Math.round(by-S.camY);
      if(x<-80||x>c.canvas.width+80||y<-80||y>c.canvas.height+80) return;

      c.save();
      c.imageSmoothingEnabled=false;

      /* Luz quente fraca atras da tabua. Numa cena escura como o
         acampamento a noite, sem isso o mural sumia no mato — e faze-lo
         MAIOR para aparecer seria pior, porque brigaria com o pier e a
         tenda do Merlin ali do lado. */
      const brilho=c.createRadialGradient(x,y-38,2,x,y-38,34);
      brilho.addColorStop(0,'rgba(224,176,96,.16)');
      brilho.addColorStop(1,'rgba(224,176,96,0)');
      c.fillStyle=brilho;
      c.fillRect(x-36,y-72,72,72);

      // sombra no chao, como os demais objetos da cena
      c.fillStyle='rgba(0,0,0,.34)';
      c.beginPath(); c.ellipse(x,y+1,21,5,0,0,Math.PI*2); c.fill();

      // dois postes fincados, com base mais escura (assenta no chao)
      for(const px of [-17,13]){
        c.fillStyle='#4a2f18'; c.fillRect(x+px,y-30,4,30);
        c.fillStyle='#2e1c0e'; c.fillRect(x+px,y-4,4,4);
        c.fillStyle='rgba(255,214,150,.16)'; c.fillRect(x+px,y-30,1,26);   // luz na quina esquerda
      }

      // tabua de fundo, com quina clara em cima e sombra embaixo
      c.fillStyle='#6b4423'; c.fillRect(x-21,y-53,42,27);
      c.fillStyle='#8a5c30'; c.fillRect(x-21,y-53,42,2);
      c.fillStyle='#3a2413'; c.fillRect(x-21,y-28,42,2);
      c.fillStyle='rgba(58,36,19,.5)';
      c.fillRect(x-21,y-46,42,1); c.fillRect(x-21,y-38,42,1);
      // cantoneiras de metal
      c.fillStyle='#7d838a';
      c.fillRect(x-21,y-53,3,3); c.fillRect(x+18,y-53,3,3);
      c.fillRect(x-21,y-29,3,3); c.fillRect(x+18,y-29,3,3);

      /* Telhadinho de duas aguas: e' o que faz ler como "mural" e nao como
         caixote. Duas fileiras bastam nessa escala. */
      c.fillStyle='#553318';
      c.fillRect(x-24,y-58,48,3);
      c.fillStyle='#6e4522';
      c.fillRect(x-22,y-61,44,3);
      c.fillStyle='#3a2413';
      c.fillRect(x-24,y-56,48,1);

      /* Papeis pregados: dois envelhecidos, um recente e um solto na
         diagonal — a assimetria e' o que tira o ar de tabela. */
      const papeis=[
        {dx:-18,dy:-50,w:12,h:16,cor:'#d8cba6',inc:0},
        {dx:-4, dy:-48,w:11,h:14,cor:'#c9b98e',inc:0},
        {dx:8,  dy:-51,w:12,h:17,cor:'#efe6c8',inc:0},
        {dx:-13,dy:-33,w:9, h:7, cor:'#bfae84',inc:-0.16},   // rasgado, meio solto
      ];
      for(const p of papeis){
        c.save();
        if(p.inc){ c.translate(x+p.dx+p.w/2,y+p.dy+p.h/2); c.rotate(p.inc); c.translate(-(x+p.dx+p.w/2),-(y+p.dy+p.h/2)); }
        c.fillStyle='rgba(0,0,0,.4)'; c.fillRect(x+p.dx+1,y+p.dy+1,p.w,p.h);
        c.fillStyle=p.cor;            c.fillRect(x+p.dx,y+p.dy,p.w,p.h);
        c.fillStyle='rgba(255,255,255,.22)'; c.fillRect(x+p.dx,y+p.dy,p.w,1);
        c.fillStyle='rgba(70,52,30,.5)';
        for(let i=3;i<p.h-2;i+=4) c.fillRect(x+p.dx+2,y+p.dy+i,p.w-4,1);
        c.fillStyle='#9aa0a8';        c.fillRect(x+p.dx+Math.floor(p.w/2),y+p.dy+1,1,1);
        c.restore();
      }
      // selo de cera vermelho no papel novo: a marca de "ordem de batalha"
      c.fillStyle='#a8302a';
      c.beginPath(); c.arc(x+14,y-38,2.6,0,Math.PI*2); c.fill();
      c.fillStyle='#d4423a';
      c.beginPath(); c.arc(x+13.4,y-38.7,1.1,0,Math.PI*2); c.fill();

      // brasao de espada cravada no topo do telhado
      c.fillStyle='#c9ad63';
      c.fillRect(x-1,y-70,2,9);
      c.fillRect(x-4,y-66,8,1);
      c.fillStyle='#f0d89a';
      c.fillRect(x-1,y-70,1,9);
      c.restore();
    }

    function desenharGuerreiro(c,t){
      const world=getWorldSize(), MW=world.width, MH=world.height;
      const gx=GUERREIRO.fx*MW, gy=GUERREIRO.fy*MH;
      const x=Math.round(gx-S.camX), y=Math.round(gy-S.camY);
      if(x<-70||x>c.canvas.width+70||y<-70||y>c.canvas.height+70) return;

      c.fillStyle='rgba(0,0,0,.34)';
      c.beginPath(); c.ellipse(x,y,11,4,0,0,Math.PI*2); c.fill();

      const sets=getHeroImageSets();
      const set=sets?sets.warrior:null;
      const heroImage=getHeroImage();
      if(!set||typeof heroImage!=='function') return;

      // olha para o jogador quando ele chega perto — mesma regra do Arqueiro
      const dx=S.x-gx, dy=S.y-gy;
      let dir='down', flip=false;
      if(Math.hypot(dx,dy)<150){
        if(Math.abs(dx)>Math.abs(dy)*1.2){ dir='side'; flip=dx>0; }
        else dir = dy<0?'up':'down';
      }
      const im=heroImage('warrior',dir,0,'idle'); if(!im) return;
      const w=set.frame, respiro=Math.sin(t*.0016)*1.1;
      const px=Math.round(x-w/2), py=Math.round(y-set.feet+respiro);
      c.save(); c.imageSmoothingEnabled=false;
      if(flip){ c.translate(px+w,py); c.scale(-1,1); c.drawImage(im,0,0,w,w); }
      else c.drawImage(im,px,py,w,w);
      c.restore();
    }

    return {desenharQuadro,desenharGuerreiro};
  }

  global.CampContractBoard=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);

