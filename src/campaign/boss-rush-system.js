const {BOSS_RUSH_LIST,PET_BOSS_RUSH_LIST,BOSS_RUSH_ARENA_NAMES}=window.MagoCampaignBossData;
// BOSS RUSH MODE
// ═══════════════════════════════════════════════════════


// Pet bosses — aparecem apenas se o jogador já teve o encontro (capturado ou não)


let bossRushMode=false;
let bossRushQueue=[];
let bossRushCurrent=0;
let bossRushSelected=[];

function bossRushPixelIcon(b,size=46){
  if(b.petId)return gamePetIconHtml(b.petId,size);
  let data=null;
  if(b.id==='skeleton_king'&&typeof SKING_DOWN!=='undefined'&&typeof PAL_SKELETON_KING!=='undefined')data={spr:SKING_DOWN[0],pal:PAL_SKELETON_KING};
  else if(b.id==='aracne'&&typeof ARACNE_FRONT!=='undefined'&&typeof PAL_ARACNE_ANCESTRAL!=='undefined')data={spr:ARACNE_FRONT[0],pal:PAL_ARACNE_ANCESTRAL};
  else if(b.id==='frost'&&typeof FROST_GIANT_FRONT!=='undefined'&&typeof PAL_FROST_GIANT!=='undefined')data={spr:FROST_GIANT_FRONT[0],pal:PAL_FROST_GIANT};
  else if(b.id==='sandworm'&&typeof DEVOURER_ICON!=='undefined'&&typeof PAL_DEVOURER!=='undefined')data={spr:DEVOURER_ICON[0],pal:PAL_DEVOURER};
  else if(b.id==='balrog'&&typeof BALROG_BODY!=='undefined'&&typeof PAL_BOSS_BALROG!=='undefined')data={spr:BALROG_BODY[0],pal:PAL_BOSS_BALROG};
  else if(b.id==='brute'&&typeof BRUTE_BODY!=='undefined'&&typeof PAL_BOSS_BRUTE!=='undefined')data={spr:BRUTE_BODY[0],pal:PAL_BOSS_BRUTE};
  return gamePixelIconHtml(data||collGameIcon(b.id==='balrog'?'fire':'skull'),size);
}

function buildBossRushScreen(){
  const list=document.getElementById('br-boss-list');
  if(!list) return;
  list.innerHTML='';
  const maxWave=SaveSystem.readNumber('mvh_max_wave',0);

  // ── Regular bosses ──
  BOSS_RUSH_LIST.forEach(b=>{
    const unlocked=maxWave>=b.unlockWave;
    const sel=bossRushSelected.includes(b.id);
    const card=document.createElement('div');
    card.className='br-boss-card'+(unlocked?'':' br-locked');
    if(unlocked&&sel) card.style.cssText='border-color:#ff4422;box-shadow:0 0 12px rgba(255,60,20,0.3);';
    card.innerHTML=`<div class="br-boss-icon">${bossRushPixelIcon(b,46)}${!unlocked?gamePixelIconHtml('lock',20,null,'br-lock-pixel'):''}</div><div class="br-boss-name">${b.name}</div><div class="br-boss-wave">Onda ${b.unlockWave}+</div>`;
    if(unlocked) card.onclick=()=>{ bossRushSelected=sel?bossRushSelected.filter(x=>x!==b.id):[...bossRushSelected,b.id]; buildBossRushScreen(); };
    list.appendChild(card);
  });

  // ── Pet bosses — só aparecem se já houve encontro ──
  const metPets = PET_BOSS_RUSH_LIST.filter(pb=>{
    // "Já teve encontro" = está em capturedPets OU teve petEncounterUsed com esse pet
    // Usamos capturedPets como proxy — se capturou, já encontrou
    // Também salvamos encontros em localStorage para pets não-capturados
    const encKey = 'mvh_pet_met_'+pb.petId;
    return capturedPets[pb.petId] || SaveSystem.readText(encKey,'')==='1';
  });

  if(metPets.length>0){
    // Divisor visual
    const div=document.createElement('div');
    div.className='br-pet-divider';
    div.style.cssText='width:100%;';
    div.innerHTML=`<div class="br-pet-divider-line"></div><div class="br-pet-divider-label pixel-inline">${gamePixelIconHtml('paw',18)} Criaturas Encontradas</div><div class="br-pet-divider-line"></div>`;
    list.appendChild(div);

    metPets.forEach(pb=>{
      const sel=bossRushSelected.includes(pb.id);
      const captured=!!capturedPets[pb.petId];
      const card=document.createElement('div');
      card.className='br-boss-card br-pet';
      if(sel) card.style.cssText='border-color:#cc88ff;box-shadow:0 0 12px rgba(150,60,220,0.35);';
      const capturedBadge=captured?'<div style="font-size:9px;color:#88aa44;letter-spacing:1px;margin-top:2px;">✓ CAPTURADO</div>':'<div style="font-size:9px;color:#5a3a7a;letter-spacing:1px;margin-top:2px;">Não capturado</div>';
      card.innerHTML=`<div class="br-boss-icon">${bossRushPixelIcon(pb,46)}</div><div class="br-boss-name">${pb.name}</div><div class="br-boss-wave">Onda ${pb.wave}</div>${capturedBadge}`;
      card.onclick=()=>{ bossRushSelected=sel?bossRushSelected.filter(x=>x!==pb.id):[...bossRushSelected,pb.id]; buildBossRushScreen(); };
      list.appendChild(card);
    });
  }

  // Hint if no pet bosses found yet
  if(metPets.length===0){
    const hint=document.createElement('div');
    hint.style.cssText='width:100%;font-size:12px;color:#3a1a5a;letter-spacing:2px;text-align:center;margin-top:8px;';
    hint.innerHTML=`<span class="pixel-inline">${gamePixelIconHtml('paw',18)} Encontre criaturas selvagens durante expedições para reavê-las aqui</span>`;
    list.appendChild(hint);
  }

  const btn=document.getElementById('br-start-btn');
  if(btn) btn.disabled=bossRushSelected.length===0;
}

function startBossRush(){
  if(!bossRushSelected.length) return;
  bossRushMode=true;
  // Merge regular + pet bosses in selected order
  const allBosses=[...BOSS_RUSH_LIST,...PET_BOSS_RUSH_LIST];
  bossRushQueue=allBosses.filter(b=>bossRushSelected.includes(b.id));
  bossRushCurrent=0;
  _selMode=1; _selDiff='medium';
  charSelectStep=1; buildCharSelectUI(1);
  showScreen('char-select');
}


function prepareBossRushArena(b){
  const arena=b.arena||'crypt';
  // Cada combate começa limpo: nada do chefe anterior atravessa o portal.
  if(typeof resetCampaignMapObjects==='function')resetCampaignMapObjects();
  else {
    enemies=[];projs=[];coins=[];parts=[];meleeAnims=[];firePatches=[];
    structures=[];webBlobs=[];webPuddles=[];
    bossOrc=null;bossSkel=null;bossSpider=null;bossMajor=null;
    if(typeof petBoss!=='undefined')petBoss=null;
  }
  buildBG(arena);
  const arrivals=[];
  if(player&&!player.dead)arrivals.push(player);
  if(gameMode===2&&player2&&!player2.dead)arrivals.push(player2);
  arrivals.forEach((pl,index)=>{
    pl.x=W/2+(arrivals.length>1?(index===0?-42:42):0);
    pl.y=H-70;
    if('vx' in pl)pl.vx=0;
    if('vy' in pl)pl.vy=0;
  });
  spawnParts(W/2,H-74,'#75f09a',20,95);
  spawnLevelUpNotice(W/2,H/2-74,`✦ ${BOSS_RUSH_ARENA_NAMES[arena]||'NOVA ARENA'} ✦`,0);
}

function spawnNextBossRush(){
  if(bossRushCurrent>=bossRushQueue.length){ endBossRush(true); return; }
  const b=bossRushQueue[bossRushCurrent++];
  prepareBossRushArena(b);
  if(typeof Audio!=='undefined'){
    Audio.playBossMusic(b.petId?'pet':b.id);
    Audio.playBossSpawn();
  }
  const hud=document.getElementById('br-hud');
  if(hud){hud.className='br-hud visible';hud.textContent=`Boss ${bossRushCurrent}/${bossRushQueue.length}: ${b.icon} ${b.name}`;}

  // Pet boss — spawn via PetWildBoss
  if(b.petId){
    petBoss=new PetWildBoss(b.petId, b.wave||8);
    petBoss.x=W/2; petBoss.y=240;
    // Show pet HP bar
    document.getElementById('pet-enc-hpbar-wrap').classList.add('visible');
    document.getElementById('pet-enc-hp-bar').style.width='100%';
    document.getElementById('pet-enc-hp-text').textContent=`${b.name.toUpperCase()}: 100%`;
    document.getElementById('pet-enc-taming').style.display='none';
    // Override taming so in boss rush it just dies instead of being captured
    petBoss._bossRushMode=true;
    bossWarning=1800; bossSpawnedThisWave=true; waveTimer=999999;
    spawnLevelUpNotice(W/2,H/2-50,`⚔ ${b.icon} ${b.name.toUpperCase()}!`,0);
    spawnParts(W/2,H/2,PET_DEFS[b.petId].color,20,100);
  } else {
    // Regular boss
    const petHpWrap=document.getElementById('pet-enc-hpbar-wrap');
    if(petHpWrap)petHpWrap.classList.remove('visible');
    const ctors={BossSkeletonKing,BossAracne,BossFrostBehemoth,BossSandworm,BossBalrog,BossOrc,BossBrute};
    const ctor=ctors[b.cls]||BossOrc;
    bossMajor=new ctor(b.wave||5);
    bossMajor.x=W/2; bossMajor.y=240;
    bossWarning=1800; bossSpawnedThisWave=true; waveTimer=999999;
    spawnLevelUpNotice(W/2,H/2-50,`⚔ ${b.icon} ${b.name.toUpperCase()}!`,0);
  }
  CampProgressionSystem.onBossStarted([player,player2],petBoss||bossMajor);
}

let campaignCompletionPending=false;
let campaignVictoryReturnTimer=null;
let campaignVictoryCountdownTimer=null;

function endBossRush(victory){
  if(victory&&typeof GameSettings!=='undefined'&&typeof GameSettings.recordBossRushVictory==='function') GameSettings.recordBossRushVictory(bossRushQueue);
  bossRushMode=false;
  document.body.classList.remove('boss-rush-no-coins');
  const hud=document.getElementById('br-hud'); if(hud) hud.className='br-hud';
  if(victory){
    spawnLevelUpNotice(W/2,H/2-40,'🏆 BOSS RUSH CONCLUÍDO!',0);
    spawnParts(W/2,H/2,'#f0d080',30,120);
    spawnParts(W/2,H/2,'#ff9922',20,100);
    setTimeout(()=>showVictoryScreen('bossrush'),2600);
  } else {
    setTimeout(()=>endGame(),0);
  }
}

function showVictoryScreen(mode='bossrush'){
  CampProgressionSystem.endRun([player,player2]);
  runCookingBuffs=[];
  if(raf){cancelAnimationFrame(raf);raf=null;}
  const campaignClear=mode==='campaign';
  const screen=document.getElementById('victory-screen');
  screen.classList.toggle('campaign-clear',campaignClear);
  document.getElementById('vic-emblem').textContent=campaignClear?'👑':'🏆';
  document.getElementById('vic-title').textContent=campaignClear?'JOGO CONCLUÍDO!':'VITÓRIA!';
  document.getElementById('vic-sub').textContent=campaignClear
    ?'— O BALROG CAIU · A CAMPANHA FOI ZERADA —'
    :'— Todas as criaturas foram derrotadas —';
  const hubBtn=document.getElementById('vic-hub-btn');
  hubBtn.style.display=campaignClear?'none':'';
  document.getElementById('vic-menu-btn').textContent=campaignClear?'VOLTAR AO MENU AGORA':'MENU PRINCIPAL';
  // Stats
  const p2line=gameMode===2&&player2?`<br>Nível P2: <b>${player2.level}</b>`:'';
  document.getElementById('vic-stats').innerHTML=
    (campaignClear?`Campanha concluída: <b>Onda 25</b><br>`:`Ondas sobrevividas: <b>${totalWavesSurvived}</b><br>`)+
    `Monstros eliminados: <b>${kills}</b><br>`+
    `Nível P1: <b>${player?player.level:1}</b>${p2line}`;
  // Boss chips
  const bossDiv=document.getElementById('vic-bosses');
  bossDiv.innerHTML='';
  const clearedBosses=campaignClear?[
    {icon:'💀',name:'Rei Esqueleto'},
    {icon:'🕷',name:'Aracne'},
    {icon:'❄',name:'Behemoth Glacial'},
    {icon:'🐍',name:'Verme da Areia'},
    {icon:'🔥',name:'Balrog'}
  ]:(bossRushQueue||[]);
  clearedBosses.forEach((b,i)=>{
    const chip=document.createElement('div');
    chip.className='vic-boss-chip';
    chip.style.animationDelay=`${i*0.14+0.25}s`;
    chip.innerHTML=campaignClear
      ?`<span class="pixel-inline">${b.icon} ${b.name} <span style="color:#88cc44;font-size:12px;">✓</span></span>`
      :`<span class="pixel-inline">${bossRushPixelIcon(b,22)} ${b.name} <span style="color:#88cc44;font-size:12px;">✓</span></span>`;
    bossDiv.appendChild(chip);
  });
  // Particles
  const pDiv=document.getElementById('victory-particles');
  pDiv.innerHTML='';
  const colors=campaignClear
    ?['#ffbd4a','#ff5a20','#d51c16','#ff8126','#ffd878','#82130e']
    :['#f0d080','#ff9922','#ffcc44','#ff6600','#ffffff','#ffee88'];
  for(let i=0;i<40;i++){
    const p=document.createElement('div');
    p.className='vic-particle';
    const sz=3+Math.random()*9;
    p.style.cssText=`width:${sz}px;height:${sz}px;background:${colors[i%colors.length]};`+
      `left:${Math.random()*100}%;`+
      `animation-duration:${2.5+Math.random()*3.5}s;`+
      `animation-delay:${Math.random()*2.5}s;opacity:0.85;`;
    pDiv.appendChild(p);
  }
  savePersistentData(true);
  screen.classList.add('open');
  const autoReturn=document.getElementById('vic-auto-return');
  if(campaignVictoryReturnTimer) clearTimeout(campaignVictoryReturnTimer);
  if(campaignVictoryCountdownTimer) clearInterval(campaignVictoryCountdownTimer);
  if(campaignClear){
    let seconds=9;
    autoReturn.textContent=`Retornando ao menu em ${seconds}s`;
    campaignVictoryCountdownTimer=setInterval(()=>{
      seconds--;
      autoReturn.textContent=seconds>0?`Retornando ao menu em ${seconds}s`:'Retornando ao menu...';
    },1000);
    campaignVictoryReturnTimer=setTimeout(()=>closeVictory('menu'),9000);
  }else{
    autoReturn.textContent='';
  }
}

function closeVictory(dest){
  if(campaignVictoryReturnTimer) clearTimeout(campaignVictoryReturnTimer);
  if(campaignVictoryCountdownTimer) clearInterval(campaignVictoryCountdownTimer);
  campaignVictoryReturnTimer=null;
  campaignVictoryCountdownTimer=null;
  const screen=document.getElementById('victory-screen');
  screen.classList.remove('open','campaign-clear');
  document.getElementById('victory-particles').innerHTML='';
  document.getElementById('vic-auto-return').textContent='';
  if(dest==='hub') goToHub();
  else {
    goMainMenu();
    if(typeof Audio!=='undefined') Audio.playMenuMusic();
  }
}

function completeCampaign(){
  if(campaignCompletionPending||state==='victory') return;
  campaignCompletionPending=true;
  state='victory';
  document.body.classList.remove('campaign-coop-active');
  totalWavesSurvived++;
  growFarm(1);
  const d=DIFF[difficulty]||DIFF.medium;
  totalCoins+=Math.max(1,Math.round(d.waveBonusBase+25*d.waveBonusRate));
  if(SaveSystem.readNumber('mvh_max_wave',0)<25) SaveSystem.writeText('mvh_max_wave',25);
  SaveSystem.writeText('mvh_campaign_complete','1');
  savePersistentData(true);
  spawnParts(W/2,H/2,'#ffcc44',36,145);
  spawnParts(W/2,H/2,'#ff4a18',30,125);
  spawnLevelUpNotice(W/2,H/2-44,'👑 O BALROG CAIU!',0);
  if(typeof Audio!=='undefined') Audio.stopMusic(.9);
  setTimeout(()=>showVictoryScreen('campaign'),1900);
}

// ═══════════════════════════════════════════════════════
