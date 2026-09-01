// ══════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES — áudio, ataque, comandos e resolução
// ══════════════════════════════════════════════════════════════════
const GameSettings = (function(){
  const STORAGE_KEY='mago_x_hordas_settings_v1';
  const PROGRESS_KEY='mago_x_hordas_skin_progress_v1';
  const defaults={
    musicEnabled:true,
    musicVolume:0.48,
    attackSoundEnabled:true,
    attackSoundVolume:0.65,
    autoAttack:true,
    skinId:'classic',
    renderScale:'auto',
    controls:{
      moveUp:'KeyW', moveDown:'KeyS', moveLeft:'KeyA', moveRight:'KeyD',
      dash:'ShiftLeft', inventory:'KeyI', map:'KeyM', crafting:'KeyT', pause:'Escape'
    }
  };
  const controlMeta=[
    ['moveUp','Mover para cima'],['moveDown','Mover para baixo'],
    ['moveLeft','Mover para esquerda'],['moveRight','Mover para direita'],
    ['dash','Esquiva / dash'],['inventory','Inventário'],
    ['map','Mapa da Dungeon'],['crafting','Criação na Dungeon'],['pause','Pausar']
  ];
  const resolutions=[
    ['auto','Automática','Ocupa o maior espaço disponível'],
    ['1','640 × 480','Janela compacta'],
    ['2','960 × 720','Janela média'],
    ['3','1280 × 960','Janela grande']
  ];
  let data=load();
  let activeTab='audio';
  let listeningAction=null;
  let previousScreen='main-menu';
  const manualQueue={campaign:null,dungeon:null};
  const manualAim={campaign:null,dungeon:null};
  const progressDefaults={
    bossRushComplete:false,
    allPetsCaptured:false,
    dungeonBossKills:0,
    hyperBossDefeated:false,
    notified:{}
  };
  let skinProgress=loadSkinProgress();
  const skinRequirements={
    rune_warrior:'Conclua todo o Modo Chefão.',
    white_sage:'Conquiste todos os pets.',
    imperial_time:'Derrote 20 chefes na Dungeon.',
    urban_chrono:'Derrote o chefe marcado pelo pino laranja na Dungeon.'
  };

  function cloneDefaults(){ return JSON.parse(JSON.stringify(defaults)); }
  function load(){
    const base=cloneDefaults();
    try{
      const saved=SaveSystem.readJSON(STORAGE_KEY,{});
      return {...base,...saved,controls:{...base.controls,...(saved.controls||{})}};
    }catch(_){ return base; }
  }
  function loadSkinProgress(){
    try{
      const saved=SaveSystem.readJSON(PROGRESS_KEY,{});
      return {...progressDefaults,...saved,notified:{...(saved.notified||{})}};
    }catch(_){ return {...progressDefaults,notified:{}}; }
  }
  function saveSkinProgress(){
    SaveSystem.writeJSON(PROGRESS_KEY,skinProgress);
  }
  function save(){
    SaveSystem.writeJSON(STORAGE_KEY,data);
    flashSaved();
  }
  function flashSaved(){
    const el=document.getElementById('settings-save-status');
    if(!el) return;
    el.textContent='ALTERAÇÕES SALVAS';
    clearTimeout(flashSaved._timer);
    flashSaved._timer=setTimeout(()=>{ el.textContent='ALTERAÇÕES SALVAS AUTOMATICAMENTE'; },1100);
  }
  function clampVolume(value){ return Math.max(0,Math.min(1,Number(value)/100)); }
  function applyAudio(){
    if(typeof Audio==='undefined') return;
    Audio.setMusicVol(data.musicEnabled?data.musicVolume:0);
    Audio.setAttackVol(data.attackSoundVolume);
    Audio.setAttackEnabled(data.attackSoundEnabled);
  }
  function setMusicVolume(value){ data.musicVolume=clampVolume(value); applyAudio(); save(); renderAudio(); }
  function setAttackVolume(value){ data.attackSoundVolume=clampVolume(value); applyAudio(); save(); renderAudio(); }
  function toggleMusic(){
    data.musicEnabled=!data.musicEnabled;
    applyAudio(); save(); renderAudio();
    if(data.musicEnabled&&typeof Audio!=='undefined'){ Audio.init(); Audio.playMenuMusic(); }
  }
  function toggleAttackSound(){ data.attackSoundEnabled=!data.attackSoundEnabled; applyAudio(); save(); renderAudio(); }
  function toggleAutoAttack(){
    data.autoAttack=!data.autoAttack;
    manualQueue.campaign=null; manualQueue.dungeon=null;
    manualAim.campaign=null; manualAim.dungeon=null;
    save(); renderControls();
  }

  function setToggle(id,on,onText,offText){
    const button=document.getElementById(id); if(!button) return;
    button.classList.toggle('is-on',on);
    button.setAttribute('aria-pressed',String(on));
    const label=button.querySelector('b'); if(label) label.textContent=on?onText:offText;
  }
  function renderAudio(){
    setToggle('settings-music-toggle',data.musicEnabled,'ATIVADA','DESATIVADA');
    setToggle('settings-attack-sound-toggle',data.attackSoundEnabled,'ATIVADO','DESATIVADO');
    const music=document.getElementById('settings-music-volume');
    const attack=document.getElementById('settings-attack-volume');
    const musicPct=Math.round(data.musicVolume*100), attackPct=Math.round(data.attackSoundVolume*100);
    if(music) music.value=musicPct;
    if(attack) attack.value=attackPct;
    const mo=document.getElementById('settings-music-output'); if(mo) mo.textContent=musicPct+'%';
    const ao=document.getElementById('settings-attack-output'); if(ao) ao.textContent=attackPct+'%';
  }
  function renderControls(){
    setToggle('settings-auto-attack-toggle',data.autoAttack,'ATIVADO','MANUAL');
    const hint=document.getElementById('settings-attack-hint');
    if(hint) hint.textContent=data.autoAttack
      ?'O herói ataca o inimigo mais próximo automaticamente.'
      :'Mova o mouse para mirar e clique com o botão esquerdo para atacar naquela direção.';
    const grid=document.getElementById('settings-key-grid'); if(!grid) return;
    grid.innerHTML=controlMeta.map(([action,label])=>
      `<div class="settings-key-row"><span>${label}</span><button class="settings-key ${listeningAction===action?'listening':''}" data-action="${action}" onclick="GameSettings.listenForKey('${action}')">${listeningAction===action?'PRESSIONE UMA TECLA':codeLabel(data.controls[action])}</button></div>`
    ).join('');
  }
  function renderVideo(){
    const grid=document.getElementById('settings-resolution-grid'); if(!grid) return;
    grid.innerHTML=resolutions.map(([value,title,desc])=>
      `<button class="settings-resolution ${String(data.renderScale)===value?'selected':''}" onclick="GameSettings.setResolution('${value}')"><span>${title}</span><small>${desc}</small></button>`
    ).join('');
  }
  function renderSkins(){
    const grid=document.getElementById('settings-skin-grid'); if(!grid) return;
    refreshSkinUnlocks(true);
    const skins=Array.isArray(window.HERO_SKINS)?window.HERO_SKINS:[];
    const classId=(typeof selectedClass!=='undefined'&&selectedClass.p1)||'mage';
    grid.innerHTML=skins.map(skin=>{
      const req=getSkinRequirementState(skin.id);
      const locked=!req.unlocked;
      const pct=req.max>0?Math.round(req.value/req.max*100):(req.unlocked?100:0);
      return `<button class="settings-skin-card ${data.skinId===skin.id?'selected':''} ${locked?'locked':''}" data-skin-id="${skin.id}" onclick="GameSettings.setSkin('${skin.id}')" style="--skin-accent:${skin.accent||'#6de895'}" ${locked?'aria-disabled="true"':''}>
        <canvas width="144" height="144" aria-hidden="true"></canvas>
        <span class="settings-skin-copy"><strong>${skin.name}</strong><em>${skin.subtitle||'Visual cosmético'}</em><small>${skin.description||''}</small>
          ${skin.id==='classic'?'<span class="settings-skin-task unlocked">DISPONÍVEL</span>':`<span class="settings-skin-task ${locked?'':'unlocked'}">${locked?'TAREFA':'DESBLOQUEADA'}: ${req.label}</span><span class="settings-skin-progress"><i style="width:${pct}%"></i><b>${req.progressText}</b></span>`}
        </span>
      </button>`;
    }).join('');
    if(typeof window.drawHeroOnCanvas==='function'){
      grid.querySelectorAll('.settings-skin-card').forEach(card=>{
        window.drawHeroOnCanvas(card.querySelector('canvas'),{
          classId,skinId:card.dataset.skinId,direction:'down',frameIndex:0,pixelSize:7
        });
      });
    }
  }
  function setSkin(id){
    const skins=Array.isArray(window.HERO_SKINS)?window.HERO_SKINS:[];
    if(!skins.some(skin=>skin.id===id)) return;
    const req=getSkinRequirementState(id);
    if(!req.unlocked){
      if(typeof showInvNotif==='function') showInvNotif(`🔒 ${req.label}`);
      return;
    }
    data.skinId=id;
    save();renderSkins();
    if(typeof window.drawMenuHero==='function') window.drawMenuHero();
    if(typeof DNG!=='undefined'&&typeof DNG._updateHUD==='function') DNG._updateHUD();
  }
  function render(){ renderAudio(); renderControls(); renderVideo(); renderSkins(); setTab(activeTab); }

  function setTab(tab){
    activeTab=tab;
    document.querySelectorAll('[data-settings-tab]').forEach(el=>el.classList.toggle('active',el.dataset.settingsTab===tab));
    document.querySelectorAll('[data-settings-panel]').forEach(el=>el.classList.toggle('active',el.dataset.settingsPanel===tab));
  }
  function open(){
    const visible=[...document.querySelectorAll('.screen')].find(el=>getComputedStyle(el).display!=='none'&&el.id!=='settings-screen');
    previousScreen=visible?.id||'main-menu';
    if(typeof showScreen==='function') showScreen('settings-screen');
    render();
  }
  function close(){
    listeningAction=null;
    if(typeof showScreen==='function') showScreen(previousScreen==='settings-screen'?'main-menu':previousScreen);
    if(typeof DNG!=='undefined'&&DNG.paused&&typeof DNG._renderPause==='function'&&!document.getElementById('dng-pause-overlay')) DNG._renderPause();
  }

  function codeLabel(code){
    const labels={ShiftLeft:'SHIFT',ShiftRight:'SHIFT',Escape:'ESC',Space:'ESPAÇO',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'};
    if(labels[code]) return labels[code];
    if(/^Key[A-Z]$/.test(code)) return code.slice(3);
    if(/^Digit\d$/.test(code)) return code.slice(5);
    return String(code||'—').replace('Left','').replace('Right','').toUpperCase();
  }
  function listenForKey(action){ listeningAction=action; renderControls(); }
  function captureKey(e){
    const settingsVisible=(()=>{const el=document.getElementById('settings-screen');return !!el&&getComputedStyle(el).display!=='none';})();
    if(!listeningAction){
      if(settingsVisible&&(e.key==='Escape'||matchesAction('pause',e))){
        e.preventDefault();e.stopImmediatePropagation();close();
      }
      return;
    }
    e.preventDefault(); e.stopImmediatePropagation();
    const action=listeningAction, code=e.code||e.key;
    const conflict=Object.keys(data.controls).find(key=>key!==action&&data.controls[key]===code);
    if(conflict) data.controls[conflict]=data.controls[action];
    data.controls[action]=code;
    listeningAction=null; save(); renderControls();
  }
  function resetControls(){ data.controls=cloneDefaults().controls; listeningAction=null; save(); renderControls(); }
  function matchesAction(action,e){
    const wanted=data.controls[action];
    return !!wanted&&(e.code===wanted||e.key===wanted||e.key?.toLowerCase()===wanted.toLowerCase());
  }
  function isActionDown(action,keyState){
    const code=data.controls[action];
    if(!code||!keyState) return false;
    const aliases=[code,code.toLowerCase()];
    if(/^Key[A-Z]$/.test(code)) aliases.push(code.slice(3).toLowerCase(),code.slice(3));
    if(code==='ShiftLeft'||code==='ShiftRight') aliases.push('Shift','shift');
    return aliases.some(key=>!!keyState[key]);
  }

  function setResolution(value){
    data.renderScale=value; save(); renderVideo();
    if(typeof sizeHordeCanvas==='function') sizeHordeCanvas();
    if(typeof DNG!=='undefined'&&DNG.running&&typeof DNG._resize==='function') DNG._resize();
  }
  function getRenderScale(displayWidth){
    if(data.renderScale!=='auto') return Math.max(1,Math.min(2,Number(data.renderScale)||2));
    // Quanto a tela REALMENTE mostra: a largura exibida vezes a densidade,
    // sobre a largura logica de 640. A conta antiga olhava so' para a
    // densidade e pedia escala 2 em qualquer celular, desenhando 1280x960
    // para um canvas de 363 pixels de CSS. Em DPR 3 o resultado e' o mesmo;
    // em DPR 2 o buffer cai para 640x480, um quarto dos pixels por quadro.
    const density=Math.max(1,Number(window.devicePixelRatio)||1);
    const necessario=(Number(displayWidth)||960)*density/640;
    return Math.max(1,Math.min(2,Math.round(necessario)));
  }

  function getDisplaySize(maxWidth,maxHeight){
    const safeW=Math.max(160,Math.floor(Number(maxWidth)||640));
    const safeH=Math.max(120,Math.floor(Number(maxHeight)||480));
    let fitW=safeW, fitH=Math.floor(fitW*0.75);
    if(fitH>safeH){ fitH=safeH; fitW=Math.floor(fitH*(4/3)); }
    if(data.renderScale==='auto') return {width:fitW,height:fitH};
    const requested={1:640,2:960,3:1280}[Number(data.renderScale)]||960;
    const width=Math.max(160,Math.min(fitW,requested));
    return {width,height:Math.floor(width*0.75)};
  }

  function getCapturedPetCount(){
    try{
      const saved=SaveSystem.readJSON('mvh_pets',{});
      const ids=typeof PET_DEFS!=='undefined'?Object.keys(PET_DEFS):['ignis','zefiro','aurora','umbra','aegis'];
      return ids.filter(id=>saved.capturedPets&&saved.capturedPets[id]).length;
    }catch(_){ return 0; }
  }
  function notifySkinUnlock(id){
    if(skinProgress.notified[id]) return;
    skinProgress.notified[id]=true; saveSkinProgress();
    const skin=(Array.isArray(window.HERO_SKINS)?window.HERO_SKINS:[]).find(item=>item.id===id);
    if(typeof showInvNotif==='function'&&skin) showInvNotif(`✨ Skin desbloqueada: ${skin.name}!`);
  }
  function getSkinRequirementState(id){
    if(id==='classic') return {unlocked:true,label:'Skin inicial.',value:1,max:1,progressText:'DISPONÍVEL'};
    if(id==='rune_warrior') return {unlocked:!!skinProgress.bossRushComplete,label:skinRequirements[id],value:skinProgress.bossRushComplete?1:0,max:1,progressText:skinProgress.bossRushComplete?'CONCLUÍDO':'PENDENTE'};
    if(id==='white_sage'){
      const value=skinProgress.allPetsCaptured?5:getCapturedPetCount();
      return {unlocked:!!skinProgress.allPetsCaptured,label:skinRequirements[id],value,max:5,progressText:`${value}/5 PETS`};
    }
    if(id==='imperial_time'){
      const value=Math.min(20,Math.max(0,Number(skinProgress.dungeonBossKills)||0));
      return {unlocked:value>=20,label:skinRequirements[id],value,max:20,progressText:`${value}/20 CHEFES`};
    }
    if(id==='urban_chrono') return {unlocked:!!skinProgress.hyperBossDefeated,label:skinRequirements[id],value:skinProgress.hyperBossDefeated?1:0,max:1,progressText:skinProgress.hyperBossDefeated?'CONCLUÍDO':'PENDENTE'};
    return {unlocked:true,label:'',value:1,max:1,progressText:'DISPONÍVEL'};
  }
  function refreshSkinUnlocks(silent=false){
    if(!skinProgress.allPetsCaptured&&getCapturedPetCount()>=5){
      skinProgress.allPetsCaptured=true; saveSkinProgress();
      if(!silent) notifySkinUnlock('white_sage');
    }
    for(const id of ['rune_warrior','imperial_time','urban_chrono']){
      if(getSkinRequirementState(id).unlocked&&!silent) notifySkinUnlock(id);
    }
    if(!getSkinRequirementState(data.skinId).unlocked){ data.skinId='classic'; save(); }
  }
  function recordBossRushVictory(queue){
    const required=typeof BOSS_RUSH_LIST!=='undefined'?BOSS_RUSH_LIST:[];
    const completed=new Set((queue||[]).map(item=>item.id));
    if(required.length&&required.every(item=>completed.has(item.id))){
      skinProgress.bossRushComplete=true; saveSkinProgress(); notifySkinUnlock('rune_warrior'); renderSkins();
    }
  }
  function recordDungeonBoss(isHyper){
    skinProgress.dungeonBossKills=Math.max(0,Number(skinProgress.dungeonBossKills)||0)+1;
    if(isHyper) skinProgress.hyperBossDefeated=true;
    saveSkinProgress();
    if(skinProgress.dungeonBossKills>=20) notifySkinUnlock('imperial_time');
    if(isHyper) notifySkinUnlock('urban_chrono');
    renderSkins();
  }

  function queueManualAttack(mode,aim){
    if(data.autoAttack||!(mode in manualQueue)) return;
    if(aim) manualAim[mode]={x:Number(aim.x)||0,y:Number(aim.y)||0};
    if(manualAim[mode]) manualQueue[mode]={...manualAim[mode]};
  }
  function hasManualAttack(mode){ return !data.autoAttack&&!!manualQueue[mode]; }
  function clearManualAttack(mode){ if(mode in manualQueue) manualQueue[mode]=null; }
  function consumeManualAttack(mode){
    if(data.autoAttack||!manualQueue[mode]) return null;
    const aim=manualQueue[mode]; manualQueue[mode]=null; return aim;
  }
  function playAttackSound(type){
    if(!data.attackSoundEnabled||typeof Audio==='undefined') return;
    const value=String(type||'').toLowerCase();
    if(value.includes('bow')||value.includes('archer')||value.includes('arco')) Audio.sfxBow();
    else if(value.includes('axe')||value.includes('viking')||value.includes('machado')||value.includes('hammer')) Audio.sfxAxe();
    else Audio.sfxSword();
  }
  function currentPointerMode(e){
    if(data.autoAttack) return null;
    const canvas=document.getElementById('canvas');
    if(!canvas||e.target!==canvas) return null;
    if(typeof DNG!=='undefined'&&DNG.running) return 'dungeon';
    if(typeof state!=='undefined'&&state==='playing'&&typeof player!=='undefined'&&player&&!player.dead) return 'campaign';
    return null;
  }
  function handlePointer(e){
    if(e.button!==0||data.autoAttack) return;
    const mode=currentPointerMode(e);
    if(!mode) return;
    const directionalSignal={x:0,y:0};
    manualAim[mode]=directionalSignal;
    queueManualAttack(mode,directionalSignal);
    e.preventDefault();
  }
  function init(){
    refreshSkinUnlocks(true); applyAudio(); render();
    document.addEventListener('keydown',captureKey,true);
    InputManager.onPointerAttack(handlePointer);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  return{
    open,close,setTab,render,applyAudio,
    toggleMusic,toggleAttackSound,toggleAutoAttack,setMusicVolume,setAttackVolume,
    setSkin,
    listenForKey,resetControls,matchesAction,isActionDown,
    setResolution,getRenderScale,getDisplaySize,
    queueManualAttack,hasManualAttack,clearManualAttack,consumeManualAttack,playAttackSound,
    recordBossRushVictory,recordDungeonBoss,refreshSkinUnlocks,getSkinRequirementState,
    get autoAttack(){ return data.autoAttack; },
    get skinId(){ return data.skinId; },
    get controls(){ return {...data.controls}; }
  };
})();

function openSettings(){ GameSettings.open(); }
function closeSettings(){ GameSettings.close(); }
