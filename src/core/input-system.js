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

  function bind(){
    if(bound) return;
    bound=true;
    document.addEventListener('keydown',event=>dispatch(true,event));
    document.addEventListener('keyup',event=>dispatch(false,event));
    document.addEventListener('pointerdown',event=>{
      pointerHandlers.forEach(handler=>handler(event));
    },{passive:false});
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
})(window);
