(function(global){
  'use strict';

  const scopes=new Map();
  const virtualSources=new Map();
  const pointerHandlers=new Set();
  let bound=false;

  function normalizeKey(key){
    if(key===' ') return ' ';
    return String(key||'').toLowerCase();
  }

  function sortedActiveScopes(){
    return [...scopes.values()]
      .filter(scope=>!scope.isActive||scope.isActive())
      .sort((a,b)=>(b.priority||0)-(a.priority||0));
  }

  function dispatch(pressed,event){
    const key=normalizeKey(event.key);
    const aliases=new Set([key,event.key,event.code]);
    if(event.code) aliases.add(String(event.code).toLowerCase());
    if(event.key&&event.key.length===1){ aliases.add(event.key.toLowerCase()); aliases.add(event.key.toUpperCase()); }
    for(const scope of sortedActiveScopes()){
      aliases.forEach(alias=>{ if(alias) scope.state[alias]=pressed; });
      const handler=pressed?scope.onKeyDown:scope.onKeyUp;
      if(handler) handler(event,key);
      if(scope.exclusive) break;
    }
  }

  function registerScope(id,options){
    const opts=options||{};
    const scope={
      id,
      state:opts.state||{},
      isActive:opts.isActive,
      onKeyDown:opts.onKeyDown,
      onKeyUp:opts.onKeyUp,
      priority:opts.priority||0,
      exclusive:!!opts.exclusive
    };
    scopes.set(id,scope);
    bind();
    return ()=>unregisterScope(id);
  }

  function unregisterScope(id){
    const scope=scopes.get(id);
    if(scope) Object.keys(scope.state).forEach(key=>{ scope.state[key]=false; });
    scopes.delete(id);
  }

  function pressVirtual(source,key){
    const normalized=normalizeKey(key);
    let held=virtualSources.get(source);
    if(!held){ held=new Set(); virtualSources.set(source,held); }
    held.add(normalized);
    sortedActiveScopes().forEach(scope=>{
      scope.state[normalized]=true;
      if(normalized.length===1) scope.state[normalized.toUpperCase()]=true;
    });
  }

  function releaseVirtual(source,key){
    const normalized=normalizeKey(key);
    const held=virtualSources.get(source);
    if(held){ held.delete(normalized); if(!held.size) virtualSources.delete(source); }
    const stillHeld=[...virtualSources.values()].some(keys=>keys.has(normalized));
    if(!stillHeld) scopes.forEach(scope=>{
      scope.state[normalized]=false;
      if(normalized.length===1) scope.state[normalized.toUpperCase()]=false;
    });
  }

  function releaseSource(source){
    const held=virtualSources.get(source);
    if(!held) return;
    [...held].forEach(key=>releaseVirtual(source,key));
  }

  function releaseAll(reason){
    virtualSources.clear();
    resetAnalog();
    scopes.forEach(scope=>Object.keys(scope.state).forEach(key=>{ scope.state[key]=false; }));
    if(global.GameEvents) global.GameEvents.emit('input:released',{reason:reason||'manual'});
  }

  /* ══════════════════════════════════════════════════════
     MOVIMENTO ANALOGICO

     O toque NAO vira mais W/A/S/D. Antes o joystick convertia o dedo em
     quatro teclas digitais: o personagem so' andava em 8 direcoes, sempre
     em velocidade cheia, e para compensar a rigidez havia um multiplicador
     de 1,85x colado por cima do Player e da Dungeon. Isso escondia o
     problema — o input e' que era grosso, nao a velocidade que era baixa.

     Agora o toque publica um VETOR (x, y, magnitude) aqui, e cada modo
     (campanha, Dungeon, acampamento) le' esse vetor e decide a propria
     velocidade. O InputManager fornece INTENCAO; quem decide quao rapido o
     personagem anda continua sendo o gameplay.

     `pressVirtual` segue existindo para BOTOES virtuais (Dash, Pausa,
     interagir) — o que saiu foi so' o movimento.
     ══════════════════════════════════════════════════════ */
  const AJUSTE_ANALOGICO={
    /* Zona morta RADIAL (fracao do raio). Pequena de proposito: o jogador
       precisa sentir resposta quase imediata. */
    ZONA_MORTA:0.10,
    /* Curva aplicada depois da zona morta. Abaixo de 1 o comeco responde
       mais rapido; 0.80 da' ~46% de velocidade com meio curso. */
    CURVA:0.80,
    /* Constantes de tempo da suavizacao, em ms. Sao TEMPOS, nao fatores
       por quadro: a conta usa exp(-dt/tau), entao 30 e 120 fps chegam ao
       mesmo lugar. */
    ACELERACAO_MS:55,
    DESACELERACAO_MS:40,
    /* Virar mais de 90 graus usa metade do tempo de aceleracao — e' o que
       faz o giro de 180 parecer imediato. */
    FATOR_INVERSAO:0.5,
  };

  const analogico={
    fontes:new Map(),                 // fonte -> {x,y} cru, ja' com curva aplicada
    alvoX:0, alvoY:0,                 // soma das fontes
    x:0, y:0,                         // vetor suavizado, o que o jogo consome
    ultimaDirX:0, ultimaDirY:1,       // ultima direcao valida (para o Dash)
    ultimoTique:0,
  };

  const agora=()=>(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();

  function recomputarAlvo(){
    let x=0,y=0;
    for(const v of analogico.fontes.values()){ x+=v.x; y+=v.y; }
    const tamanho=Math.hypot(x,y);
    if(tamanho>1){ x/=tamanho; y/=tamanho; }   // nunca passa de 1: diagonal nao corre mais
    analogico.alvoX=x; analogico.alvoY=y;
  }

  /* Suavizacao exponencial, avancada no MAXIMO uma vez por quadro: se o
     Player e a Dungeon lerem no mesmo quadro, o segundo ve dt~0 e nao
     adianta o estado duas vezes. */
  function avancarAnalogico(){
    const t=agora();
    let dt=analogico.ultimoTique?t-analogico.ultimoTique:16;
    analogico.ultimoTique=t;
    dt=Math.max(0,Math.min(64,dt));
    if(dt<=0) return;

    const magAlvo=Math.hypot(analogico.alvoX,analogico.alvoY);
    const magAtual=Math.hypot(analogico.x,analogico.y);
    let tau=magAlvo>=magAtual?AJUSTE_ANALOGICO.ACELERACAO_MS:AJUSTE_ANALOGICO.DESACELERACAO_MS;
    // troca brusca de direcao responde mais rapido que uma aceleracao comum
    if(magAlvo>0.01&&magAtual>0.01){
      const cos=(analogico.alvoX*analogico.x+analogico.alvoY*analogico.y)/(magAlvo*magAtual);
      if(cos<0) tau*=AJUSTE_ANALOGICO.FATOR_INVERSAO;
    }
    const k=tau>0?1-Math.exp(-dt/tau):1;
    analogico.x+=(analogico.alvoX-analogico.x)*k;
    analogico.y+=(analogico.alvoY-analogico.y)*k;
    if(Math.hypot(analogico.x,analogico.y)<0.004){ analogico.x=0; analogico.y=0; }
  }

  function setAnalogMovement(fonte,x,y){
    const nx=Number(x)||0, ny=Number(y)||0;
    const tamanho=Math.hypot(nx,ny);
    if(tamanho<=0){ clearAnalogMovement(fonte); return; }
    analogico.fontes.set(String(fonte||'touch'),{x:nx,y:ny});
    analogico.ultimaDirX=nx/tamanho; analogico.ultimaDirY=ny/tamanho;
    recomputarAlvo();
  }

  function clearAnalogMovement(fonte){
    if(fonte===undefined) analogico.fontes.clear();
    else analogico.fontes.delete(String(fonte));
    recomputarAlvo();
  }

  function getMovementVector(){
    avancarAnalogico();
    /* Magnitude REAL, sem Math.min. Antes o getter devolvia o valor
       limitado enquanto x e y podiam passar de 1: quem lesse a magnitude
       via 1, quem lesse o vetor via 1.41, e a diagonal andaria mais rapido
       sem nada acusar. Quem limita e' recomputarAlvo, na entrada. */
    const magnitude=Math.hypot(analogico.x,analogico.y);
    return {x:analogico.x,y:analogico.y,magnitude,active:magnitude>0.001};
  }
  function getMovementMagnitude(){ return getMovementVector().magnitude; }
  function hasAnalogMovement(){ return analogico.fontes.size>0; }
  function getLastMovementDirection(){ return {x:analogico.ultimaDirX,y:analogico.ultimaDirY}; }

  /* Soma a intencao do toque a' do teclado e limita o resultado a 1.
     Vive aqui para a regra existir em UM lugar so' — campanha, Dungeon e
     acampamento chamam a mesma funcao. Somar (em vez de substituir) faz
     teclado e toque conviverem em aparelho hibrido. */
  function combinarMovimento(dx,dy){
    const v=getMovementVector();
    let x=(Number(dx)||0)+(v.active?v.x:0);
    let y=(Number(dy)||0)+(v.active?v.y:0);
    const tamanho=Math.hypot(x,y);
    if(tamanho>1){ x/=tamanho; y/=tamanho; }
    return {dx:x,dy:y};
  }

  /* Direcao VISUAL a partir do vetor fisico. A fisica e' 360 graus, mas os
     sprites tem quatro direcoes: escolher pelo eixo dominante evita que
     qualquer dx minusculo vire 'esquerda/direita' o tempo todo. */
  function direcaoVisual(dx,dy,atual){
    if(Math.abs(dx)<1e-4&&Math.abs(dy)<1e-4) return atual;
    if(Math.abs(dx)>=Math.abs(dy)) return dx<0?'left':'right';
    return dy<0?'up':'down';
  }

  function resetAnalog(){
    analogico.fontes.clear();
    analogico.alvoX=analogico.alvoY=0;
    analogico.x=analogico.y=0;
  }

  /* ══════════════════════════════════════════════════════
     JOYSTICK FLUTUANTE

     Nasce sob o polegar dentro da METADE ESQUERDA da tela durante o
     gameplay, publica o vetor acima e some rapido ao soltar. O Dash e a
     Pausa ficam do lado direito com os pointers deles — cada dedo tem
     dono, entao os dois funcionam ao mesmo tempo.
     ══════════════════════════════════════════════════════ */
  const mobileSensor=(()=>{
    const FONTE='touch';
    const AJUSTE={
      RAIO_MIN:48, RAIO_MAX:68, RAIO_VW:0.062,   // raio confortavel para o polegar
      ZONA_MOVIMENTO:0.48,                        // fracao esquerda da tela
      SEGUE_CENTRO:0.5,                           // quanto o centro cede ao passar do raio
      SUMICO_MS:140,
    };
    let pointerId=null,centroX=0,centroY=0,raio=56;
    let sensorEl=null,knobEl=null,installed=false;

    function raioAtual(){
      const largura=Number(global.innerWidth)||360;
      return Math.max(AJUSTE.RAIO_MIN,Math.min(AJUSTE.RAIO_MAX,largura*AJUSTE.RAIO_VW));
    }

    function isCoarseDevice(){
      const media=typeof global.matchMedia==='function'&&global.matchMedia('(pointer: coarse)').matches;
      const touches=Number(global.navigator?.maxTouchPoints||0)>0;
      return !!(media||touches);
    }
    function isGameplayActive(){
      return !!global.document?.body?.classList?.contains('mobile-gameplay-active');
    }
    function isMoving(){ return pointerId!==null; }

    function blockedTarget(target){
      if(!target||typeof target.closest!=='function')return false;
      return !!target.closest(
        'button,a,input,select,textarea,label,[contenteditable="true"],'+
        '#ui-top,#hud-bottom,#mobile-controls,#settings-screen,'+
        '#inventory-panel,#crafting-panel,#pause-menu,'+
        '#dng-pause-overlay,#dng-inv-overlay,#dng-shop-overlay,#dng-swap-overlay,#dng-gameover-overlay'
      );
    }

    /* A zona existe para que o dedo do Dash nunca vire movimento e o
       jogador nao cubra a arena com a mao inteira. */
    function dentroDaZona(event){
      const largura=Number(global.innerWidth)||0;
      if(!largura) return true;
      return (Number(event?.clientX)||0)<=largura*AJUSTE.ZONA_MOVIMENTO;
    }

    function shouldCapture(event){
      if(!isCoarseDevice()||!isGameplayActive())return false;
      if(event?.pointerType==='mouse')return false;
      // isPrimary NAO e' consultado: o segundo dedo precisa poder assumir o
      // movimento quando o primeiro esta' segurando o Dash.
      if(pointerId!==null)return false;
      if(!dentroDaZona(event))return false;
      return !blockedTarget(event?.target);
    }

    /* Vetor cru -> vetor de jogo: zona morta RADIAL (uniforme em todas as
       direcoes, ao contrario de uma zona morta por eixo) e curva de
       magnitude. A direcao sai intacta; so' a intensidade e' remapeada. */
    function vetorDoDelta(dx,dy,r){
      const distancia=Math.hypot(dx,dy);
      if(distancia<=0) return {x:0,y:0,magnitude:0};
      const bruta=Math.min(1,distancia/(r||raio));
      if(bruta<=AJUSTE_ANALOGICO.ZONA_MORTA) return {x:0,y:0,magnitude:0};
      const ajustada=(bruta-AJUSTE_ANALOGICO.ZONA_MORTA)/(1-AJUSTE_ANALOGICO.ZONA_MORTA);
      const magnitude=Math.pow(Math.max(0,Math.min(1,ajustada)),AJUSTE_ANALOGICO.CURVA);
      return {x:(dx/distancia)*magnitude,y:(dy/distancia)*magnitude,magnitude};
    }

    function ensureVisual(){
      if(sensorEl||!global.document?.body)return;
      const style=global.document.createElement('style');
      style.id='mobile-touch-sensor-style';
      style.textContent=`
        :root{--mobile-controls-height:0px!important}
        body.mobile-gameplay-active #canvas{transform:none!important}
        /* Durante o gameplay o navegador nao pode rolar, dar zoom nem
           puxar-para-atualizar em cima do jogo. Menus continuam livres. */
        body.mobile-gameplay-active{overscroll-behavior:none;touch-action:none;
          -webkit-user-select:none;user-select:none}
        body.mobile-gameplay-active #canvas{touch-action:none}

        /* No mobile ficam apenas Dash + Pausa. As setas, Criar/Acao e Itens somem. */
        #mobile-controls{
          inset:auto max(10px,var(--safe-right,0px)) max(10px,var(--safe-bottom,0px)) auto!important;
          left:auto!important;right:max(10px,var(--safe-right,0px))!important;
          width:auto!important;padding:0!important;transform:none!important;
          align-items:center!important;justify-content:flex-end!important;
          pointer-events:none!important;
        }
        #mobile-controls.active{display:flex!important}
        #mobile-controls .mobile-dpad{display:none!important}
        #mobile-controls .mobile-action-pad{
          width:auto!important;display:flex!important;grid-template-columns:none!important;
          gap:8px!important;pointer-events:auto!important;
        }
        #mobile-controls [data-mobile-action="context"],
        #mobile-controls [data-mobile-action="menu"]{display:none!important}
        #mobile-controls [data-mobile-action="dash"]{
          display:flex!important;min-width:76px!important;min-height:68px!important;
          padding:10px 12px!important;touch-action:none!important;opacity:.86;
        }
        /* Pausa no ALTO a direita: embaixo ela disputava o polegar com o
           Dash, e errar o botao no meio de uma horda e' caro. */
        #mobile-controls [data-mobile-action="pause"]{
          display:flex!important;position:fixed!important;
          top:max(10px,var(--safe-top,0px))!important;
          right:max(10px,var(--safe-right,0px))!important;
          min-width:52px!important;min-height:52px!important;
          padding:8px 10px!important;touch-action:none!important;opacity:.62;
        }
        #mobile-controls [data-mobile-action="pause"].pressed{opacity:1;transform:scale(.94)}
        #mobile-controls [data-mobile-action="dash"].pressed{
          transform:scale(.94);filter:brightness(1.35);
        }

        #mobile-touch-sensor{position:fixed;left:0;top:0;z-index:46;
          display:none;pointer-events:none;border-radius:50%;
          border:1px solid rgba(240,208,128,.30);
          background:radial-gradient(circle,rgba(240,208,128,.07),rgba(8,6,15,.10) 60%,rgba(8,6,15,.20));
          box-shadow:0 0 18px rgba(0,0,0,.26),inset 0 0 12px rgba(240,208,128,.05);
          transform:translate(-50%,-50%);touch-action:none;
          opacity:0;transition:opacity ${AJUSTE.SUMICO_MS}ms ease}
        #mobile-touch-sensor.active{display:block;opacity:1}
        #mobile-touch-sensor-knob{position:absolute;left:50%;top:50%;
          width:38%;height:38%;border-radius:50%;
          border:1px solid rgba(240,208,128,.72);background:rgba(200,168,75,.24);
          box-shadow:0 0 10px rgba(240,208,128,.16);
          transform:translate(-50%,-50%);will-change:transform}
        @media (hover:hover) and (pointer:fine){#mobile-touch-sensor{display:none!important}}
      `;
      global.document.head?.appendChild(style);
      sensorEl=global.document.createElement('div');
      sensorEl.id='mobile-touch-sensor';
      sensorEl.setAttribute('aria-hidden','true');
      knobEl=global.document.createElement('div');
      knobEl.id='mobile-touch-sensor-knob';
      sensorEl.appendChild(knobEl);
      global.document.body.appendChild(sensorEl);
    }

    function configureLegacyControls(){
      const legacy=global.document?.getElementById?.('mobile-controls');
      if(!legacy)return;
      legacy.style.removeProperty?.('display');
      legacy.querySelector?.('.mobile-dpad')?.remove?.();
      legacy.querySelector?.('[data-mobile-action="context"]')?.remove?.();
      legacy.querySelector?.('[data-mobile-action="menu"]')?.remove?.();
      global.document?.documentElement?.style?.setProperty('--mobile-controls-height','0px');
    }

    function posicionar(x,y){
      if(!sensorEl)return;
      const d=raio*2;
      sensorEl.style.width=`${d}px`; sensorEl.style.height=`${d}px`;
      sensorEl.style.left=`${x}px`; sensorEl.style.top=`${y}px`;
    }
    /* So' transform no knob: mexer em left/top a cada pointermove forcaria
       layout em todo movimento do dedo. */
    function moverKnob(dx,dy,magnitude){
      if(!knobEl)return;
      const distancia=Math.hypot(dx,dy)||1;
      const escala=Math.min(1,raio/distancia);
      knobEl.style.transform=`translate(calc(-50% + ${dx*escala}px),calc(-50% + ${dy*escala}px))`;
      knobEl.style.opacity=String(0.55+0.45*Math.min(1,magnitude));
    }

    function release(){
      clearAnalogMovement(FONTE);
      pointerId=null;
      sensorEl?.classList.remove('active');
      if(knobEl){ knobEl.style.transform='translate(-50%,-50%)'; knobEl.style.opacity='0.55'; }
    }

    function onPointerDown(event){
      if(!shouldCapture(event))return;
      pointerId=event.pointerId;
      raio=raioAtual();
      centroX=Number(event.clientX)||0; centroY=Number(event.clientY)||0;
      event.preventDefault?.();
      ensureVisual();
      posicionar(centroX,centroY);
      sensorEl?.classList.add('active');
      moverKnob(0,0,0);
      clearAnalogMovement(FONTE);
    }

    function onPointerMove(event){
      if(event.pointerId!==pointerId)return;
      event.preventDefault?.();
      const px=Number(event.clientX)||0, py=Number(event.clientY)||0;
      let dx=px-centroX, dy=py-centroY;
      /* Soft follow: passando do raio, o centro cede PARTE do excesso em vez
         de grudar no dedo. Assim o polegar nunca perde o alcance, e inverter
         a direcao continua custando so' a zona morta — nao o arrasto inteiro
         de volta. */
      const distancia=Math.hypot(dx,dy);
      if(distancia>raio){
        const excesso=(distancia-raio)*AJUSTE.SEGUE_CENTRO/distancia;
        centroX+=dx*excesso; centroY+=dy*excesso;
        dx=px-centroX; dy=py-centroY;
        posicionar(centroX,centroY);
      }
      const v=vetorDoDelta(dx,dy,raio);
      if(v.magnitude>0) setAnalogMovement(FONTE,v.x,v.y);
      else clearAnalogMovement(FONTE);
      moverKnob(dx,dy,v.magnitude);
    }

    function onPointerUp(event){
      if(event.pointerId!==pointerId)return;
      event.preventDefault?.();
      release();
    }

    function install(){
      if(installed||!isCoarseDevice()||!global.document)return false;
      installed=true;
      configureLegacyControls();ensureVisual();
      /* No touch o combate segue automatico: o gesto inteiro fica para a
         locomocao. Isso e' um override de RUNTIME — a preferencia salva do
         jogador nao e' reescrita. */
      if(global.GameSettings) global.GameSettings.mobileAutoAttackOverride=true;
      global.document.addEventListener('pointerdown',onPointerDown,{passive:false});
      global.document.addEventListener('pointermove',onPointerMove,{passive:false});
      global.document.addEventListener('pointerup',onPointerUp,{passive:false});
      global.document.addEventListener('pointercancel',onPointerUp,{passive:false});
      global.addEventListener?.('blur',release);
      global.addEventListener?.('orientationchange',release);
      global.document.addEventListener('visibilitychange',()=>{if(global.document.hidden)release();});
      return true;
    }

    return {
      install,release,shouldCapture,isCoarseDevice,isMoving,
      vetorDoDelta,dentroDaZona,
      get ajuste(){return {...AJUSTE,...AJUSTE_ANALOGICO};},
      get raio(){return raio;},
    };
  })();
  function bind(){
    if(bound) return;
    bound=true;
    document.addEventListener('keydown',event=>dispatch(true,event));
    document.addEventListener('keyup',event=>dispatch(false,event));
    document.addEventListener('pointerdown',event=>{
      // Em touch durante gameplay o ponteiro pertence ao sensor de movimento.
      // Isso impede que o mesmo toque seja interpretado como ataque manual.
      if(mobileSensor.shouldCapture(event))return;
      pointerHandlers.forEach(handler=>handler(event));
    },{passive:false});
  }

  bind();
  global.InputManager={
    registerScope,
    unregisterScope,
    pressVirtual,
    releaseVirtual,
    releaseSource,
    releaseAll,
    normalizeKey,
    onPointerAttack(handler){ pointerHandlers.add(handler); return ()=>pointerHandlers.delete(handler); },
    // ── intencao de movimento analogica ──
    setAnalogMovement,
    clearAnalogMovement,
    getMovementVector,
    getMovementMagnitude,
    getLastMovementDirection,
    hasAnalogMovement,
    resetAnalog,
    combinarMovimento,
    direcaoVisual,
    AJUSTE_ANALOGICO,
  };
  global.MobileTouchSensor=mobileSensor;

  if(global.document?.readyState==='loading')
    global.addEventListener?.('load',()=>mobileSensor.install(),{once:true});
  else mobileSensor.install();
})(window);
