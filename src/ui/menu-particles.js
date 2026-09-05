/* ══════════════════════════════════════════════════════
   PARTICULAS DOS MENUS

   As telas de menu sao imagens paradas com texto por cima. Um punhado de
   motas subindo devagar, nas cores do proprio fundo, tira o ar de cartaz
   sem competir com a leitura.

   Regras que orientam o modulo:
     - a paleta vem de FORA (a tela diz as suas cores), entao trocar o
       fundo troca as particulas junto;
     - o laco so' roda com a tela visivel — menu escondido nao gasta
       quadro;
     - respeita prefers-reduced-motion e a intensidade de efeitos que o
       jogador escolheu nas configuracoes.

   Script classico, como o resto do projeto.
   ══════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  const CONFIG={
    /* Quantidade por 100 mil pixels de tela: assim uma janela grande nao
       fica vazia nem uma pequena fica poluida. */
    DENSIDADE:7.5,
    MAX:110,
    /* Motas pequenas e lentas de proposito: e' atmosfera, nao chuva.
       A primeira medicao com densidade 2.6 dava ~12 motas numa janela de
       700x680 — quase invisiveis. */
    RAIO:[0.9,2.9],
    SUBIDA:[4,15],        // px por segundo
    BALANCO:[6,20],       // amplitude do vaivem horizontal
    VIDA:[4200,11000],    // ms
    ALPHA_MAX:0.62,
  };

  const acaso=(a,b)=>a+Math.random()*(b-a);

  let canvas=null, ctx=null, laco=null;
  let particulas=[], cores=['#ffffff'], ultimo=0;

  function intensidade(){
    try{
      const p=(typeof global.GameSettings!=='undefined'&&global.GameSettings.getCombatFx)
        ?global.GameSettings.getCombatFx():null;
      if(p&&p.reduzirMovimento)return 0;
      return ({baixa:0.6,normal:1,alta:1.3})[p&&p.intensidade]||1;
    }catch(_){ return 1; }
  }

  function querMenosMovimento(){
    try{ return global.matchMedia&&global.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch(_){ return false; }
  }

  function nova(l,a,nascendoNoMeio){
    return {
      x:Math.random()*l,
      // ao ligar, espalha pela tela inteira; depois nascem embaixo
      y:nascendoNoMeio?Math.random()*a:a+acaso(0,40),
      r:acaso(CONFIG.RAIO[0],CONFIG.RAIO[1]),
      sobe:acaso(CONFIG.SUBIDA[0],CONFIG.SUBIDA[1]),
      balanco:acaso(CONFIG.BALANCO[0],CONFIG.BALANCO[1]),
      fase:Math.random()*Math.PI*2,
      cor:cores[Math.floor(Math.random()*cores.length)],
      nasceu:performance.now()-(nascendoNoMeio?acaso(0,CONFIG.VIDA[0]):0),
      vida:acaso(CONFIG.VIDA[0],CONFIG.VIDA[1]),
    };
  }

  function ajustarTamanho(){
    if(!canvas)return;
    const r=canvas.getBoundingClientRect();
    const dpr=Math.min(2,global.devicePixelRatio||1);
    const l=Math.max(1,Math.round(r.width)), a=Math.max(1,Math.round(r.height));
    if(canvas.width!==l*dpr||canvas.height!==a*dpr){
      canvas.width=l*dpr; canvas.height=a*dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    const alvo=Math.min(CONFIG.MAX,
      Math.round((l*a/100000)*CONFIG.DENSIDADE*intensidade()));
    while(particulas.length<alvo) particulas.push(nova(l,a,true));
    if(particulas.length>alvo) particulas.length=alvo;
  }

  function quadro(agora){
    /* Tela saiu de vista: para o laco E LIMPA. Sem limpar, o canvas
       guardava o ultimo quadro pintado, e ao voltar para aquela tela o
       jogador via motas CONGELADAS ate' o laco reassumir. */
    if(!canvas||!canvas.isConnected||canvas.offsetParent===null){ limpar(); parar(); return; }
    const dt=Math.min(64,agora-(ultimo||agora)); ultimo=agora;
    ajustarTamanho();
    const l=canvas.clientWidth, a=canvas.clientHeight;
    ctx.clearRect(0,0,l,a);
    for(let i=0;i<particulas.length;i++){
      const p=particulas[i];
      const idade=agora-p.nasceu;
      if(idade>p.vida||p.y<-20){ particulas[i]=nova(l,a,false); continue; }
      p.y-=p.sobe*(dt/1000);
      const x=p.x+Math.sin(agora*0.0006+p.fase)*p.balanco;
      // aparece e some nas pontas da vida: nada surge nem corta de repente
      const t=idade/p.vida;
      const fade=t<0.18?(t/0.18):(t>0.78?(1-t)/0.22:1);
      ctx.globalAlpha=Math.max(0,Math.min(1,fade))*CONFIG.ALPHA_MAX;
      ctx.fillStyle=p.cor;
      ctx.beginPath(); ctx.arc(x,p.y,p.r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    laco=requestAnimationFrame(quadro);
  }

  function parar(){
    if(laco){ cancelAnimationFrame(laco); laco=null; }
  }

  function limpar(){
    if(ctx&&canvas) ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  /* Liga as particulas num canvas, com a paleta daquela tela. Chamar de
     novo com outras cores troca a paleta sem reiniciar o efeito. */
  function ligar(alvo,paleta){
    if(!alvo||typeof document==='undefined')return;
    if(Array.isArray(paleta)&&paleta.length) cores=paleta.slice();
    if(canvas!==alvo){
      parar();
      limpar();               // o canvas anterior nao pode ficar sujo
      canvas=alvo; ctx=canvas.getContext('2d');
      particulas=[]; ultimo=0;
    }
    // as particulas vivas trocam de cor aos poucos, conforme renascem
    if(querMenosMovimento()||intensidade()===0){ parar(); if(ctx)ctx.clearRect(0,0,canvas.width,canvas.height); return; }
    if(!laco) laco=requestAnimationFrame(quadro);
  }

  function desligar(){
    parar();
    if(ctx&&canvas) ctx.clearRect(0,0,canvas.width,canvas.height);
    canvas=null; ctx=null; particulas=[];
  }

  /* Troca so' a paleta. As motas que ja' estao na tela mantem a cor ate'
     renascerem, entao a transicao acontece sozinha, sem corte. */
  function pintar(paleta){
    if(Array.isArray(paleta)&&paleta.length) cores=paleta.slice();
  }

  global.MenuParticulas=Object.freeze({CONFIG,ligar,desligar,pintar});
})(typeof window!=='undefined'?window:globalThis);
