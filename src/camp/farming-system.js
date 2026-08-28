// CampV2 farming behavior extracted without changing gameplay.
// The CampV2 closure injects only its local state/geometry helpers. Existing
// global farm bindings (farmCells, globalInventory, selectedSeed, activeTool
// and farmAction) keep the same runtime semantics used by the original code.
(function(global){
  'use strict';

  function create(deps){
    const {HORTA,SEMENTES,NOME_SEM,ACAO,S,px,dentro}=deps||{};
    if(!HORTA||!Array.isArray(SEMENTES)||!S||typeof px!=='function'||typeof dentro!=='function')
      throw new TypeError('CampFarmingSystem.create recebeu dependencias invalidas.');

    const CANTEIROS = (()=>{
      const out=[], cw=HORTA.fw/HORTA.cols, ch=HORTA.fh/HORTA.linhas;
      let n=0;
      for(let r=0;r<HORTA.linhas;r++) for(let c=0;c<HORTA.cols;c++){
        out.push({fx:HORTA.fx+c*cw, fy:HORTA.fy+r*ch, fw:cw, fh:ch, idx:n++});
      }
      return out;
    })();

    function canteiroEm(x,y){ return CANTEIROS.find(k=>dentro(x,y+6,k))||null; }
    function celula(k){
      return (typeof farmCells!=='undefined'&&k.idx<farmCells.length)?farmCells[k.idx]:null;
    }
    function estaArado(cell){
      // `state` continua sendo aceito para saves antigos, anteriores ao campo
      // `tilled`. No estado inicial vazio, nada e desenhado sobre camp_bg.png.
      return !!cell&&(cell.tilled===true||cell.state!=='empty');
    }

    function usarCanteiro(k){
      const cell=celula(k); if(!cell) return;
      if(cell.state==='watered'){ aviso('Ja regado. Volte da expedicao.'); return; }
      if(cell.state==='plowed'){
        const sem=sementeAtual();
        if(!sem){ aviso('Sem sementes. Ache-as nas expedicoes.'); return; }
        if(typeof selectedSeed!=='undefined') selectedSeed=sem;
        if(typeof activeTool!=='undefined') activeTool='plant';
      } else if(typeof activeTool!=='undefined'){
        activeTool = cell.state==='empty' ? 'plow' : (cell.state==='ready'?'harvest':'water');
      }
      const antes=cell.state;
      if(typeof farmAction==='function') farmAction(k.idx);
      if(cell.state!==antes) aviso(ACAO[antes]+' ok');
    }
    function sementeAtual(){
      if(typeof globalInventory==='undefined') return null;
      if(S.semente && (globalInventory[S.semente]||0)>0) return S.semente;
      return SEMENTES.find(x=>(globalInventory[x]||0)>0)||null;
    }
    function trocarSemente(){
      if(typeof globalInventory==='undefined') return;
      const tem=SEMENTES.filter(x=>(globalInventory[x]||0)>0);
      if(!tem.length){ aviso('Voce nao tem sementes.'); return; }
      const i=tem.indexOf(sementeAtual());
      S.semente=tem[(i+1)%tem.length];
      aviso('Semente: '+NOME_SEM[S.semente]+' ('+globalInventory[S.semente]+')');
    }
    function aviso(t){ S.aviso=t; S.avisoAte=performance.now()+1800; }

    // ── Plantacao: cada semente tem desenho e movimento proprios ──
    function plantaTrigo(c,cx,base,p,t,pronto){
      const alt=8+p*20, bal=Math.sin(t*.0024+cx*.06)*(1.6+p*2.4);
      for(let i=-1;i<=1;i++){
        const bx=cx+i*4.5, h=alt*(i?.82:1), b=bal*(i?.8:1);
        c.strokeStyle=pronto?'#c8a13c':'#6fa348'; c.lineWidth=1.8;
        c.beginPath(); c.moveTo(bx,base);
        c.quadraticCurveTo(bx+b*.5,base-h*.6,bx+b,base-h); c.stroke();
        if(pronto){
          c.fillStyle='#efc75a';
          c.beginPath(); c.ellipse(bx+b,base-h-2,2.4,5,0,0,Math.PI*2); c.fill();
          c.strokeStyle='#f7e08a'; c.lineWidth=.9;
          for(let k=0;k<3;k++){ const y=base-h-5+k*3.2;
            c.beginPath(); c.moveTo(bx+b,y); c.lineTo(bx+b-3,y-2.4); c.stroke();
            c.beginPath(); c.moveTo(bx+b,y); c.lineTo(bx+b+3,y-2.4); c.stroke(); }
        }
      }
    }
    function plantaTomate(c,cx,base,p,t,pronto){
      const alt=7+p*15, bal=Math.sin(t*.0018+cx*.05)*1.4;
      c.strokeStyle='#4d8a3a'; c.lineWidth=2.2;
      c.beginPath(); c.moveTo(cx,base); c.lineTo(cx+bal*.5,base-alt); c.stroke();
      c.fillStyle='#57a84c';
      for(const f of [[-6,.55,5],[6,.42,5],[0,.8,5.5]]){
        c.beginPath(); c.ellipse(cx+f[0]+bal*.6,base-alt*f[1],f[2],3.4,f[0]*.06,0,Math.PI*2); c.fill();
      }
      if(pronto){
        const bob=Math.sin(t*.004+cx)*1.1;
        for(const f of [[-5,.42],[5,.58],[0,.24]]){
          const x=cx+f[0]+bal*.5, y=base-alt*f[1]+bob;
          c.fillStyle='#d1372e'; c.beginPath(); c.arc(x,y,3.6,0,Math.PI*2); c.fill();
          c.fillStyle='#ff6a55'; c.beginPath(); c.arc(x-1.1,y-1.1,1.3,0,Math.PI*2); c.fill();
        }
      }
    }
    function plantaErva(c,cx,base,p,t,pronto){
      const alt=6+p*13;
      for(let i=-2;i<=2;i++){
        const bal=Math.sin(t*.0034+i*.9+cx*.04)*2.2, h=alt*(1-Math.abs(i)*.16);
        c.strokeStyle=pronto?'#7fd06a':'#4f9a44'; c.lineWidth=2;
        c.beginPath(); c.moveTo(cx+i*2.4,base);
        c.quadraticCurveTo(cx+i*5+bal*.5,base-h*.6,cx+i*7+bal,base-h); c.stroke();
      }
      if(pronto){
        const pul=.5+.5*Math.sin(t*.005+cx);
        c.fillStyle='rgba(150,240,140,'+(.10+.10*pul)+')';
        c.beginPath(); c.arc(cx,base-alt*.6,13,0,Math.PI*2); c.fill();
        c.fillStyle='#eaf7c0';
        for(let i=-1;i<=1;i++){
          c.beginPath(); c.arc(cx+i*6,base-alt*(1-Math.abs(i)*.16)-1,1.8+pul*.5,0,Math.PI*2); c.fill();
        }
      }
    }
    function plantaCogumelo(c,cx,base,p,t,pronto){
      const alt=5+p*11, pul=.5+.5*Math.sin(t*.0032+cx*.07);
      if(pronto){
        c.fillStyle='rgba(150,200,255,'+(.10+.12*pul)+')';
        c.beginPath(); c.arc(cx,base-alt,15+pul*3,0,Math.PI*2); c.fill();
      }
      for(const f of [[0,1],[-6,.62],[5,.5]]){
        const h=alt*f[1], x=cx+f[0];
        c.fillStyle='#d8dcf0'; c.fillRect(x-1.4,base-h,2.8,h);
        c.fillStyle=pronto?'#9fc4ff':'#6b7ba8';
        c.beginPath(); c.ellipse(x,base-h,5.2*f[1]+2,3.4*f[1]+1.6,0,Math.PI,0); c.fill();
        if(pronto){
          c.fillStyle='#eaf2ff';
          c.beginPath(); c.arc(x-1.6,base-h-1.4,.9,0,Math.PI*2); c.fill();
          c.beginPath(); c.arc(x+2,base-h-.6,.7,0,Math.PI*2); c.fill();
        }
      }
      if(pronto) for(let i=0;i<3;i++){
        const f=(t*.00035+i*.33+cx*.01)%1;
        c.fillStyle='rgba(200,225,255,'+(.55*(1-f))+')';
        c.beginPath(); c.arc(cx+Math.sin(f*7+i)*5,base-alt-2-f*16,1.1,0,Math.PI*2); c.fill();
      }
    }
    function plantaRaiz(c,cx,base,p,t,pronto){
      const alt=6+p*14, pul=.5+.5*Math.sin(t*.0042+cx*.05);
      if(pronto){
        c.fillStyle='rgba(200,40,50,'+(.10+.14*pul)+')';
        c.beginPath(); c.arc(cx,base-alt*.6,14+pul*3,0,Math.PI*2); c.fill();
      }
      c.strokeStyle=pronto?'#a4202c':'#6d3038'; c.lineWidth=2.6; c.lineCap='round';
      for(let i=-1;i<=1;i++){
        const tor=Math.sin(t*.0016+i*1.4)*2;
        c.beginPath(); c.moveTo(cx+i*3,base);
        c.bezierCurveTo(cx+i*7+tor,base-alt*.45,cx+i*2-tor,base-alt*.7,cx+i*5+tor*.6,base-alt);
        c.stroke();
      }
      c.lineCap='butt';
      if(pronto){
        c.fillStyle='#e0303c';
        for(let i=-1;i<=1;i++){ c.beginPath(); c.arc(cx+i*5,base-alt-1,2.2+pul*.6,0,Math.PI*2); c.fill(); }
        const g=(t*.0006+cx*.01)%1;
        c.fillStyle='rgba(190,30,40,'+(.8*(1-g))+')';
        c.beginPath(); c.ellipse(cx,base-alt+g*alt,1.2,2,0,0,Math.PI*2); c.fill();
      }
    }
    const DESENHO_CULTIVO = {
      semente_trigo:plantaTrigo, semente_tomate:plantaTomate, semente_erva:plantaErva,
      semente_cogumelo_lua:plantaCogumelo, semente_raiz_sangue:plantaRaiz,
    };

    function desenharHorta(c,t){
      const h=px(HORTA), x=Math.round(h.x-S.camX), y=Math.round(h.y-S.camY);
      if(x>c.canvas.width+30||y>c.canvas.height+30||x+h.w<-30||y+h.h<-30) return;
      c.save(); c.imageSmoothingEnabled=false;

      // O solo original ja faz parte do camp_bg.png. Arar nao deve criar um
      // segundo retangulo de terra: apenas acrescenta sulcos discretos dentro
      // da celula correspondente, preservando integralmente a arte-base.
      for(const k of CANTEIROS){
        const cell=celula(k); if(!estaArado(cell)) continue;
        const b=px(k), rx=Math.round(b.x-S.camX)+3, ry=Math.round(b.y-S.camY)+3;
        const rw=Math.max(8,Math.round(b.w)-6), rh=Math.max(8,Math.round(b.h)-6);
        const molhada=cell.state==='watered';
        const linhas=3;
        for(let f=0;f<linhas;f++){
          const fy=ry+Math.round((f+1)*rh/(linhas+1));
          const passo=10;
          for(let sx=rx+5;sx<rx+rw-5;sx+=passo){
            const largura=Math.min(6,rx+rw-5-sx);
            if(largura<=0)continue;
            c.fillStyle=molhada?'rgba(24,18,13,.58)':'rgba(67,42,22,.62)';
            c.fillRect(sx,fy,largura,1);
            if(f<2&&sx+3<rx+rw-5){
              c.fillStyle=molhada?'rgba(94,78,58,.28)':'rgba(151,96,45,.26)';
              c.fillRect(sx+2,fy-1,Math.min(4,rx+rw-5-(sx+2)),1);
            }
          }
        }
        if(molhada){
          const brilho=.16+.08*Math.sin(t*.002+k.idx*.8);
          c.fillStyle='rgba(110,170,190,'+brilho+')';
          c.fillRect(rx+7+(k.idx%3)*5,ry+rh-8,7,1);
        }
      }
      c.restore();
    }

    function desenharPlantas(c,t){
      for(const k of CANTEIROS){
        const cell=celula(k); if(!cell||cell.state==='empty') continue;
        const b=px(k), cx=b.x+b.w/2-S.camX, base=b.y+b.h*.78-S.camY;
        if(cx<-40||cx>c.canvas.width+40) continue;
        if(cell.state==='plowed') continue;
        if(cell.state==='watered'){
          c.fillStyle='rgba(30,20,10,.42)';
          c.fillRect(b.x+3-S.camX,b.y+3-S.camY,b.w-6,b.h-6);
        }
        const prog=cell.state==='ready'?1:(cell.state==='watered'?.62:.32);
        const pronto=cell.state==='ready';
        const desenhar=DESENHO_CULTIVO[cell.seed]||plantaErva;
        const quantidade=pronto?3:(cell.state==='watered'?2:1);
        const espacamento=Math.min(17,b.w*.22);
        for(let i=0;i<quantidade;i++){
          const off=(i-(quantidade-1)/2)*espacamento;
          desenhar(c,cx+off,base+(i%2)*2,prog,t+i*230+k.idx*17,pronto);
        }
      }
    }

    return {
      CANTEIROS, canteiroEm, celula, usarCanteiro, sementeAtual, trocarSemente, aviso,
      desenharHorta, desenharPlantas
    };
  }

  global.CampFarmingSystem=Object.freeze({create});
})(window);
