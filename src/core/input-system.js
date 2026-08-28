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
    scopes.forEach(scope=>Object.keys(scope.state).forEach(key=>{ scope.state[key]=false; }));
    if(global.GameEvents) global.GameEvents.emit('input:released',{reason:reason||'manual'});
  }

  // Controle mobile sem botoes: joystick/sensor flutuante criado no ponto do toque.
  // O controle antigo continua no HTML por compatibilidade, mas e removido do DOM
  // em dispositivos touch para nao ocupar espaco nem disputar eventos de ponteiro.
  const mobileSensor=(()=>{
    const SOURCE='mobile-sensor';
    const DEAD_ZONE=11;
    const AXIS_THRESHOLD=.28;
    const VISUAL_RADIUS=46;
    const keys=new Set();
    let pointerId=null,startX=0,startY=0;
    let sensorEl=null,knobEl=null,installed=false;

    function isCoarseDevice(){
      const media=typeof global.matchMedia==='function'&&global.matchMedia('(pointer: coarse)').matches;
      const touches=Number(global.navigator?.maxTouchPoints||0)>0;
      return !!(media||touches);
    }

    function isGameplayActive(){
      return !!global.document?.body?.classList?.contains('mobile-gameplay-active');
    }

    function blockedTarget(target){
      if(!target||typeof target.closest!=='function')return false;
      return !!target.closest(
        'button,a,input,select,textarea,label,[contenteditable="true"],'+
        '#ui-top,#hud-bottom,#mobile-controls,#settings-screen,'+
        '#inventory-panel,#crafting-panel,#pause-menu,'+
        '#dng-pause-overlay,#dng-inv-overlay,#dng-shop-overlay,#dng-swap-overlay,#dng-gameover-overlay'
      );
    }

    function shouldCapture(event){
      if(!isCoarseDevice()||!isGameplayActive())return false;
      if(event?.isPrimary===false||event?.pointerType==='mouse')return false;
      return !blockedTarget(event?.target);
    }

    function directionForDelta(dx,dy){
      const distance=Math.hypot(Number(dx)||0,Number(dy)||0);
      if(distance<DEAD_ZONE)return [];
      const nx=dx/distance,ny=dy/distance,out=[];
      if(nx<=-AXIS_THRESHOLD)out.push('a');
      else if(nx>=AXIS_THRESHOLD)out.push('d');
      if(ny<=-AXIS_THRESHOLD)out.push('w');
      else if(ny>=AXIS_THRESHOLD)out.push('s');
      return out;
    }

    function syncDirection(nextKeys){
      const next=new Set(nextKeys);
      for(const key of [...keys])if(!next.has(key)){
        releaseVirtual(SOURCE,key);keys.delete(key);
      }
      for(const key of next)if(!keys.has(key)){
        pressVirtual(SOURCE,key);keys.add(key);
      }
    }

    function ensureVisual(){
      if(sensorEl||!global.document?.body)return;
      const style=global.document.createElement('style');
      style.id='mobile-touch-sensor-style';
      style.textContent=`
        :root{--mobile-controls-height:0px!important}
        #mobile-controls{display:none!important;pointer-events:none!important}
        body.mobile-gameplay-active #canvas{transform:none!important}
        #mobile-touch-sensor{position:fixed;left:0;top:0;width:94px;height:94px;z-index:46;
          display:none;pointer-events:none;border-radius:50%;border:1px solid rgba(240,208,128,.34);
          background:radial-gradient(circle,rgba(240,208,128,.08),rgba(8,6,15,.10) 60%,rgba(8,6,15,.22));
          box-shadow:0 0 18px rgba(0,0,0,.28),inset 0 0 12px rgba(240,208,128,.06);
          transform:translate(-50%,-50%);touch-action:none}
        #mobile-touch-sensor.active{display:block}
        #mobile-touch-sensor-knob{position:absolute;left:50%;top:50%;width:32px;height:32px;border-radius:50%;
          border:1px solid rgba(240,208,128,.68);background:rgba(200,168,75,.20);
          box-shadow:0 0 10px rgba(240,208,128,.18);transform:translate(-50%,-50%)}
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

    function hideLegacyControls(){
      const legacy=global.document?.getElementById?.('mobile-controls');
      if(legacy){
        legacy.classList.remove('active');
        legacy.setAttribute('aria-hidden','true');
        legacy.style.setProperty('display','none','important');
        legacy.replaceChildren?.();
      }
      global.document?.documentElement?.style?.setProperty('--mobile-controls-height','0px');
    }

    function showVisual(x,y){
      ensureVisual();if(!sensorEl)return;
      sensorEl.style.left=`${x}px`;sensorEl.style.top=`${y}px`;
      sensorEl.classList.add('active');
      if(knobEl)knobEl.style.transform='translate(-50%,-50%)';
    }

    function moveVisual(dx,dy){
      if(!knobEl)return;
      const distance=Math.hypot(dx,dy)||1;
      const scale=Math.min(1,VISUAL_RADIUS/distance);
      const x=dx*scale,y=dy*scale;
      knobEl.style.transform=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;
    }

    function release(){
      syncDirection([]);
      releaseSource(SOURCE);
      pointerId=null;
      sensorEl?.classList.remove('active');
      if(knobEl)knobEl.style.transform='translate(-50%,-50%)';
    }

    function onPointerDown(event){
      if(pointerId!==null||!shouldCapture(event))return;
      pointerId=event.pointerId;
      startX=Number(event.clientX)||0;startY=Number(event.clientY)||0;
      event.preventDefault?.();
      event.target?.setPointerCapture?.(event.pointerId);
      showVisual(startX,startY);
      syncDirection([]);
    }

    function onPointerMove(event){
      if(event.pointerId!==pointerId)return;
      event.preventDefault?.();
      const dx=(Number(event.clientX)||0)-startX,dy=(Number(event.clientY)||0)-startY;
      syncDirection(directionForDelta(dx,dy));
      moveVisual(dx,dy);
    }

    function onPointerUp(event){
      if(event.pointerId!==pointerId)return;
      event.preventDefault?.();
      release();
    }

    function install(){
      if(installed||!isCoarseDevice()||!global.document)return false;
      installed=true;
      hideLegacyControls();ensureVisual();
      // No touch o combate permanece automatico: o gesto inteiro fica reservado
      // para locomocao, sem clique/ataque manual concorrendo com o dedo.
      if(global.GameSettings?.autoAttack===false&&typeof global.GameSettings.toggleAutoAttack==='function')
        global.GameSettings.toggleAutoAttack();
      global.document.addEventListener('pointerdown',onPointerDown,{passive:false});
      global.document.addEventListener('pointermove',onPointerMove,{passive:false});
      global.document.addEventListener('pointerup',onPointerUp,{passive:false});
      global.document.addEventListener('pointercancel',onPointerUp,{passive:false});
      global.addEventListener?.('blur',release);
      global.document.addEventListener('visibilitychange',()=>{if(global.document.hidden)release();});
      return true;
    }

    return {install,release,shouldCapture,directionForDelta,isCoarseDevice};
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
    onPointerAttack(handler){ pointerHandlers.add(handler); return ()=>pointerHandlers.delete(handler); }
  };
  global.MobileTouchSensor=mobileSensor;

  if(global.document?.readyState==='loading')
    global.addEventListener?.('load',()=>mobileSensor.install(),{once:true});
  else mobileSensor.install();
})(window);
