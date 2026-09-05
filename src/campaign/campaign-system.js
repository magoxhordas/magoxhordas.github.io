const {CAMPAIGN_CHAPTER_DURATION,CAMPAIGN_CHAPTERS}=window.MagoCampaignChapterData;
function campaignArenaForWave(nextWave){
  if(nextWave>=21) return 'volcano';
  if(nextWave>=16) return 'desert';
  if(nextWave>=11) return 'snow';
  if(nextWave>=6) return 'forest';
  return 'crypt';
}

function resetCampaignMapObjects(){
  if(typeof BossModifierSystem!=='undefined')BossModifierSystem.limpar('map-reset');
  if(typeof campaignEvents!=='undefined')campaignEvents.cleanup('chapter');
  if(typeof campaignObjectives!=='undefined')campaignObjectives.cleanup('chapter');
  enemies=[]; projs=[]; coins=[]; parts=[]; meleeAnims=[]; firePatches=[];
  structures=[]; webBlobs=[]; webPuddles=[];
  bossOrc=null; bossSkel=null; bossSpider=null; bossMajor=null;
  if(typeof petBoss!=='undefined') petBoss=null;
  if(typeof NecromancerSystem!=='undefined')NecromancerSystem.clearWorld({preservePermanent:true});
}

function advWave(){
  weaponDmgDone=[0,0,0];
  for(const w of [...weaponSlots,...weaponSlots2])if(w)w.damageDone=0;
  wave++;
  CampProgressionSystem.onWaveStarted([player,player2],wave);
  waveTimer=DIFF[difficulty].waveLen;
  const d=DIFF[difficulty]||DIFF.medium;
  spawnInt=Math.max(d.spawnMin,d.spawnBase-wave*d.spawnStep);
  bossSpawnedThisWave=false;
  // Remove qualquer obstáculo aleatório legado ao trocar de onda.
  const nextArena=campaignArenaForWave(wave);
  if(nextArena!==currentArena) resetCampaignMapObjects();
  spawnWaveObstacles(nextArena);
  if(typeof campaignObjectives!=='undefined')campaignObjectives.startWave(wave);
}

// A campanha não gera mais pedras, árvores ou rochas aleatórias.
// A limpeza também roda durante a partida para neutralizar qualquer chamada legada tardia.
function removeCampaignRandomObjects(){
  structures=structures.filter(s=>s&&s.type!=='obstacle');
}
function spawnWaveObstacles(){
  removeCampaignRandomObjects();
}

// ═══════════════════════════════════════════════════════
// ABERTURAS CINEMATOGRÁFICAS DOS BIOMAS DA CAMPANHA
// Ondas 1, 6, 11, 16 e 21: 6 segundos, jogo pausado e HUD oculta.
// ═══════════════════════════════════════════════════════


const campaignChapterImages=Object.values(CAMPAIGN_CHAPTERS).map(chapter=>{
  const image=new Image(); image.decoding='async'; image.src=chapter.image; return image;
});
let campaignChaptersShown=new Set();
let campaignChapterTimer=null;
let campaignChapterToken=0;

function campaignChapterParticle(kind,index,count){
  const particle=document.createElement('i');
  particle.className=`campaign-chapter-particle ${kind}`;
  const seed=(index+1)/(count+1);
  const jitter=()=>Math.random();
  particle.style.left=`${Math.round((seed*.76+jitter()*.24)*100)}%`;
  particle.style.top=`${Math.round(jitter()*92)}%`;
  particle.style.setProperty('--delay',`${(-jitter()*4.8).toFixed(2)}s`);
  particle.style.setProperty('--dur',`${(2.7+jitter()*3.4).toFixed(2)}s`);
  particle.style.setProperty('--drift',`${Math.round(-34+jitter()*68)}px`);
  particle.style.setProperty('--rot',`${Math.round(-28+jitter()*56)}deg`);
  if(kind==='rolling-stone') particle.style.top='auto';
  if(kind==='sand'||kind==='gold-dust') particle.style.top=`${Math.round(25+jitter()*70)}%`;
  if(kind==='green-spark') particle.style.left=`${Math.round((index%2?58:8)+jitter()*28)}%`;
  if(kind==='eye'){
    particle.style.left=`${Math.round(52+jitter()*43)}%`;
    particle.style.top=`${Math.round(18+jitter()*53)}%`;
  }
  if(kind==='smoke') particle.style.left=`${Math.round(jitter()*92)}%`;
  return particle;
}

function buildCampaignChapterEffects(chapter){
  const particles=document.getElementById('campaign-chapter-particles');
  const atmosphere=document.getElementById('campaign-chapter-atmosphere');
  if(!particles||!atmosphere) return;
  particles.replaceChildren(); atmosphere.replaceChildren();
  for(const className of chapter.atmosphere){
    const layer=document.createElement('i'); layer.className=className; atmosphere.appendChild(layer);
  }
  for(const [kind,count] of chapter.particles){
    for(let index=0;index<count;index++) particles.appendChild(campaignChapterParticle(kind,index,count));
  }
}

function closeCampaignChapterOverlay(){
  if(campaignChapterTimer){ clearTimeout(campaignChapterTimer); campaignChapterTimer=null; }
  campaignChapterToken++;
  const screen=document.getElementById('campaign-chapter-screen');
  if(screen){ screen.classList.remove('active'); screen.setAttribute('aria-hidden','true'); }
  document.body.classList.remove('campaign-chapter-active');
}

function resetCampaignChapters(){
  closeCampaignChapterOverlay();
  campaignChaptersShown=new Set();
}

function finishCampaignChapter(chapter,token){
  if(token!==campaignChapterToken) return;
  campaignChapterTimer=null;
  const screen=document.getElementById('campaign-chapter-screen');
  if(screen){ screen.classList.remove('active'); screen.setAttribute('aria-hidden','true'); }
  document.body.classList.remove('campaign-chapter-active');
  buildBG(chapter.arena);
  if(typeof Audio!=='undefined') Audio.playCombatMusic(chapter.arena);
  waveAnnounce=Math.max(waveAnnounce,900);
  state='playing'; lastTs=null; campaignClock.reset();
}

function maybeStartCampaignChapter(currentWave){
  if(bossRushMode||campaignChaptersShown.has(currentWave)) return false;
  const chapter=CAMPAIGN_CHAPTERS[currentWave];
  if(!chapter) return false;
  campaignChaptersShown.add(currentWave);
  const screen=document.getElementById('campaign-chapter-screen');
  if(!screen) return false;
  state='chapter'; lastTs=null; campaignClock.reset();
  buildCampaignChapterEffects(chapter);
  screen.dataset.chapter=String(chapter.number);
  screen.style.setProperty('--chapter-image',`url("${chapter.image}")`);
  screen.setAttribute('aria-hidden','false');
  screen.classList.remove('active');
  void screen.offsetWidth;
  document.body.classList.add('campaign-chapter-active');
  screen.classList.add('active');
  if(typeof Audio!=='undefined') Audio.playChapterIntro(chapter.number);
  const token=++campaignChapterToken;
  campaignChapterTimer=setTimeout(()=>finishCampaignChapter(chapter,token),CAMPAIGN_CHAPTER_DURATION);
  return true;
}

function updateCampaignBiomeAndBoss(wildPetFight){
  // ── Biome transitions ──
  if(wave===6&&currentArena!=='forest'){ buildBG('forest'); if(typeof Audio!=='undefined')Audio.playCombatMusic('forest'); spawnLevelUpNotice(W/2,H/2-30,'🌲 FLORESTA ASSOMBRADA! 🌲',0); }
  if(wave===11&&currentArena!=='snow'){ buildBG('snow'); if(typeof Audio!=='undefined')Audio.playCombatMusic('snow'); spawnLevelUpNotice(W/2,H/2-30,'❄ FORTALEZA CONGELADA! ❄',0); }
  if(wave===16&&currentArena!=='desert'){ buildBG('desert'); if(typeof Audio!=='undefined')Audio.playCombatMusic('desert'); spawnLevelUpNotice(W/2,H/2-30,'🏜 RUÍNAS FÓSSEIS! 🏜',0); }
  if(wave===21&&currentArena!=='volcano'){ buildBG('volcano'); if(typeof Audio!=='undefined')Audio.playCombatMusic('volcano'); spawnLevelUpNotice(W/2,H/2-30,'🌋 PROFUNDEZAS VULCÂNICAS! 🌋',0); }
  // ── Boss spawns at wave 5,10,15,20,25 ──
  if(!wildPetFight&&wave%5===0&&wave>=5&&!bossSpawnedThisWave&&!bossMajor){
    bossSpawnedThisWave=true; bossWarning=1800;
    if(wave===5) bossMajor=new BossSkeletonKing(wave);
    else if(wave===10) bossMajor=new BossAracne(wave);
    else if(wave===15) bossMajor=new BossFrostBehemoth(wave);
    else if(wave===20) bossMajor=new BossSandworm(wave);
    else if(wave===25) bossMajor=new BossBalrog(wave);
    else if(wave===30) bossMajor=new BossBrute(wave);
    else bossMajor=(wave>30&&wave%10===0)?new BossBrute(wave):new BossOrc(wave);
    // FIX v10: raridade de boss (Solo Leveling) existia mas nunca era aplicada
    if(typeof applyBossRarity==='function') applyBossRarity(bossMajor);
    // Recupera a resistencia original e aumenta a pressao a cada novo bioma.
    const bossDiff=DIFF[difficulty]||DIFF.medium;
    const bossTier=Math.max(0,Math.floor((wave-5)/5));
    const bossWaveHp=1+bossTier*.08;
    const bossWaveDmg=1+bossTier*.04;
    bossMajor.hp=Math.round(bossMajor.hp*bossDiff.bossHp*bossWaveHp);
    bossMajor.maxHp=Math.round(bossMajor.maxHp*bossDiff.bossHp*bossWaveHp);
    bossMajor.damage=(bossMajor.damage||30)*bossDiff.bossDmg*bossWaveDmg;
    if(bossMajor.shieldMax){
      bossMajor.shieldMax=Math.round(bossMajor.shieldMax*bossDiff.bossHp*bossWaveHp);
      bossMajor.shieldHp=bossMajor.shieldMax;
    }
    if(typeof campaignObjectives!=='undefined')campaignObjectives.onBossSpawn(bossMajor,wave);
    if(typeof RunStats!=='undefined'){
      const runBossId={5:'skeleton_king',10:'aracne',15:'ice_giant',20:'worm',25:'balrog',30:'brute'}[wave]||bossMajor.type||'boss';
      const runBossName={5:'Rei Cadáver',10:'Aracne',15:'Gigante de Gelo',20:'Verme Devorador',25:'Balrog',30:'Brutamontes'}[wave]||bossMajor.name||bossMajor.constructor?.name||'Chefão';
      RunStats.recordBossStart({id:runBossId,name:runBossName});
    }
    // O sorteio ocorre uma única vez por encontro e somente na campanha.
    if(typeof BossModifierSystem!=='undefined')BossModifierSystem.aoNascerChefe(bossMajor);
    CampProgressionSystem.onBossStarted([player,player2],bossMajor);
    if(typeof Audio!=='undefined'){
      const bossTheme={5:'skeleton_king',10:'aracne',15:'frost',20:'sandworm',25:'balrog',30:'brute'}[wave]||bossMajor.type||'default';
      Audio.playBossMusic(bossTheme);
      Audio.playBossSpawn();
    }
  }
}

// Obstáculos do bioma — Castelo: pedras
class CastleRock {
  constructor(x,y){
    this.x=x; this.y=y; this.type='obstacle';
    this.radius=16; this.dead=false; this.phase=Math.random()*Math.PI*2;
  }
  update(dt,enemies){ /* static */ }
  draw(t){
    // sprite pixel-art compartilhado com o modo dungeon
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.x,this.y+7,15,4.5,0,0,Math.PI*2); ctx.fill();
    if(window.drawNodeSprite) window.drawNodeSprite(ctx,'rock','normal',this.x,this.y+9,2);
  }
}

// Obstáculos do bioma — Floresta: árvores
class ForestTree {
  constructor(x,y){
    this.x=x; this.y=y; this.type='obstacle';
    this.radius=14; this.dead=false; this.phase=Math.random()*Math.PI*2;
    this.h=30+Math.random()*15;
  }
  update(dt,enemies){ /* static */ }
  draw(t){
    // sprite pixel-art compartilhado com o modo dungeon (drawNodeSprite em dungeon.js)
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.x,this.y+6,14,4.5,0,0,Math.PI*2); ctx.fill();
    if(window.drawNodeSprite) window.drawNodeSprite(ctx,'tree','normal',this.x,this.y+8,3);
  }
}

// Obstáculos do bioma — Neve: rochas de gelo
class SnowRock {
  constructor(x,y){
    this.x=x; this.y=y; this.type='obstacle';
    this.radius=15; this.dead=false; this.phase=Math.random()*Math.PI*2;
  }
  update(dt,enemies){ /* static */ }
  draw(t){
    // sprite pixel-art compartilhado com o modo dungeon (variante de gelo)
    const pulse=0.7+0.15*Math.sin(t*0.003+this.phase);
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.x,this.y+7,15,4.5,0,0,Math.PI*2); ctx.fill();
    if(window.drawNodeSprite) window.drawNodeSprite(ctx,'rock','ice',this.x,this.y+9,2);
    ctx.globalAlpha=0.25+0.2*pulse; ctx.fillStyle='#ffffff';
    ctx.fillRect(this.x-3,this.y-9,6,3); ctx.globalAlpha=1;
  }
}

// Obstáculos do bioma — Vulcão: rochas de lava
class LavaRock {
  constructor(x,y){
    this.x=x; this.y=y; this.type='obstacle';
    this.radius=15; this.dead=false; this.phase=Math.random()*Math.PI*2;
  }
  update(dt,enemies){ /* static */ }
  draw(t){
    // sprite pixel-art compartilhado com o modo dungeon (variante vulcânica com brasas)
    const r=this.radius;
    const glow=0.6+0.3*Math.sin(t*0.004+this.phase);
    const g=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,r*2);
    g.addColorStop(0,`rgba(255,80,0,${glow*0.4})`); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.fillRect(this.x-r*2,this.y-r*2,r*4,r*4);
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.x,this.y+7,15,4.5,0,0,Math.PI*2); ctx.fill();
    if(window.drawNodeSprite) window.drawNodeSprite(ctx,'rock','fire',this.x,this.y+9,2);
  }
}

// Devolve true so' quando a onda REALMENTE terminou. As guardas abaixo
// devolvem false, e quem chama precisa seguir com a atualizacao normal —
// era exatamente ai que o jogo travava (veja o comentario no laco).
function endWave(){
  if(state==='endwave'||state==='shop'||state==='temple') return false;
  if(bossRushMode) return false;
  if(typeof campaignEvents!=='undefined'&&campaignEvents.isActive()) return false;
  if(wave>=5&&wave%5===0&&bossMajor&&!bossMajor.dead) return false;
  if(typeof campaignObjectives!=='undefined'&&!campaignObjectives.canEndWave(wave)) return false;
  if(typeof campaignObjectives!=='undefined')campaignObjectives.onWaveEnd(wave);
  if(typeof RunStats!=='undefined')RunStats.recordWaveCompleted({wave});
  state='endwave';
  totalWavesSurvived++;
  growFarm(1);
  // Completion bonus grows slower than shop prices to keep late-game choices relevant.
  const d=DIFF[difficulty]||DIFF.medium;
  const waveBonus=Math.max(1,Math.round(d.waveBonusBase+wave*d.waveBonusRate));
  totalCoins += waveBonus;
  if(typeof RunStats!=='undefined')RunStats.recordCoins({amount:waveBonus,playerIndex:0});
  spawnLevelUpNotice(W/2, H/2-52, `🏆 ONDA ${wave} · +${waveBonus}🪙`, 0);
  // Card blessings — wave regen
  if(typeof applyCardWaveRegen==='function') applyCardWaveRegen();
  // Wave regen — cooking buffs + exp_recuperacao upgrade
  const activePlayers2=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
  for(const pl of activePlayers2){
    applyCookingWaveRegen(pl);
    if(metaUpgrades.exp_recuperacao) pl.hp=Math.min(pl.maxHp, pl.hp + pl.maxHp*0.08*metaUpgrades.exp_recuperacao);
  }
  const prev=SaveSystem.readNumber('mvh_max_wave',0);
  if(wave>prev) SaveSystem.writeText('mvh_max_wave',wave);
  savePersistentData();

  // Auto-collect remaining coins — give XP to all players + count as currency
  const canvasEl=document.getElementById('canvas');
  const rect=canvasEl.getBoundingClientRect();
  const scaleX=rect.width/640, scaleY=rect.height/480;
  const alive=coins.filter(c=>!c.dead);
  const activePlayers=[player,...(gameMode===2&&player2&&!player2.dead?[player2]:[])].filter(p=>!p.dead);
  const BATCH=3, GAP=18;
  let delay=0;
  for(let i=0;i<alive.length;i++){
    const c=alive[i]; c.dead=true;
    // Give XP to all active players
    for(const p of activePlayers) p.gainXP(c.xpVal);
    const sx=rect.left+c.x*scaleX, sy=rect.top+c.y*scaleY, d=delay;
    setTimeout(()=>spawnCoinFlyAnim(sx,sy), d);
    if((i+1)%BATCH===0) delay+=GAP;
  }
  const totalDelay=Math.max(delay+250, 300);
  setTimeout(()=>{
    // In boss rush mode, spawn next boss instead of shop
    if(bossRushMode){
      state='playing'; enemies=[]; spawnNextBossRush(); return;
    }
    const continueBetweenWaves=()=>{
      // Card offer every 2 waves from wave 2 onwards, shop on odd waves
      if(wave>=2 && (wave%2===0)){
        if(rollPetEncounter()){ openPetEncounter(); return; }
        if(rollTemple()){ openTempleEvent(); return; }
        openCardOffer(); return;
      }
      // Odd waves (1, 3, 5...) → shop, but skip shop on boss waves (already handled above)
      if(rollPetEncounter()){ openPetEncounter(); return; }
      if(rollTemple()){ openTempleEvent(); return; }
      openShop();
    };
    if(typeof campaignEvents!=='undefined'&&campaignEvents.tryStartAfterWave(wave,continueBetweenWaves))return;
    continueBetweenWaves();
  }, totalDelay);
  return true;
}
