// Core persistence adapter extracted from index.html without changing storage
// keys, payloads, fallbacks, manifest behavior or the public SaveSystem API.
(function(global){
  'use strict';

  const MANIFEST_KEY='mago_x_hordas_save_manifest';
  const CURRENT_VERSION=2;
  let manifest={version:CURRENT_VERSION,updatedAt:0,keys:{}};

  function safeParse(raw,fallback){
    if(raw===null||typeof raw==='undefined'||raw==='') return fallback;
    try{ return JSON.parse(raw); }catch(_error){ return fallback; }
  }

  try{
    const stored=safeParse(localStorage.getItem(MANIFEST_KEY),null);
    if(stored&&typeof stored==='object') manifest=Object.assign(manifest,stored);
  }catch(_error){}

  function record(key){
    manifest.version=CURRENT_VERSION;
    manifest.updatedAt=Date.now();
    manifest.keys=manifest.keys&&typeof manifest.keys==='object'?manifest.keys:{};
    manifest.keys[key]=manifest.updatedAt;
    try{ localStorage.setItem(MANIFEST_KEY,JSON.stringify(manifest)); }catch(_error){}
  }

  function readText(key,fallback){
    try{
      const value=localStorage.getItem(key);
      return value===null?fallback:value;
    }catch(_error){ return fallback; }
  }

  function writeText(key,value){
    try{ localStorage.setItem(key,String(value)); record(key); return true; }
    catch(_error){ return false; }
  }

  function readJSON(key,fallback,options){
    const raw=readText(key,null);
    if(raw===null) return fallback;
    try{
      let value=JSON.parse(raw);
      const opts=options||{};
      if(typeof opts.migrate==='function') value=opts.migrate(value,manifest.version||1);
      if(typeof opts.validate==='function'&&!opts.validate(value)) return fallback;
      return value;
    }catch(error){
      try{ localStorage.setItem('mago_x_hordas_corrupt_backup',JSON.stringify({key,raw:String(raw).slice(0,50000),at:Date.now()})); }catch(_error){}
      return fallback;
    }
  }

  function writeJSON(key,value){
    try{ return writeText(key,JSON.stringify(value)); }catch(_error){ return false; }
  }

  function remove(key){
    try{ localStorage.removeItem(key); record(key); return true; }catch(_error){ return false; }
  }

  function readNumber(key,fallback){
    const raw=readText(key,null);
    if(raw===null||String(raw).trim()==='') return fallback;
    const value=Number(raw);
    return Number.isFinite(value)?value:fallback;
  }

  global.SaveSystem={
    version:CURRENT_VERSION,
    readText,writeText,readJSON,writeJSON,readNumber,remove,
    getManifest(){ return JSON.parse(JSON.stringify(manifest)); }
  };
})(window);
