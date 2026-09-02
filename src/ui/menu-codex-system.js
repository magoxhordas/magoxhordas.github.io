// ── Class selection ──
let selectedClass  = { p1:'mage',  p2:'archer' }; // defaults
let charSelectStep = 1; // which player we're picking for

// ── Difficulty multipliers ──
// Campaign balance is centralized here so visuals and mechanics stay untouched.
const DIFF = {
  easy: {
    enemyHp:0.80, enemyDmg:0.60, enemySpd:0.84,
    enemyLateHp:0.008, enemyLateDmg:0.007,
    bossHp:1.15, bossDmg:0.78,
    coinMult:1.12, coinFactor:0.23,
    playerHp:120, playerArmorCap:0.55, waveLen:34000,
    spawnBase:2800, spawnMin:1400, spawnStep:45,
    spawnMax:13, spawnBatchMax:2, spawnBatchEvery:9,
    shopBase:0.92, shopWave:0.050, shopBiome:0.09, shopCap:2.55,
    rerollBase:2, rerollWave:0.35,
    waveBonusBase:2, waveBonusRate:0.50,
  },
  medium: {
    enemyHp:1.00, enemyDmg:0.82, enemySpd:0.95,
    enemyLateHp:0.012, enemyLateDmg:0.010,
    bossHp:1.45, bossDmg:1.00,
    coinMult:1.00, coinFactor:0.23,
    playerHp:100, playerArmorCap:0.50, waveLen:32000,
    spawnBase:2350, spawnMin:1100, spawnStep:52,
    spawnMax:17, spawnBatchMax:2, spawnBatchEvery:8,
    shopBase:0.98, shopWave:0.060, shopBiome:0.12, shopCap:3.05,
    rerollBase:2, rerollWave:0.45,
    waveBonusBase:2, waveBonusRate:0.45,
  },
  hard: {
    enemyHp:1.25, enemyDmg:1.05, enemySpd:1.05,
    enemyLateHp:0.016, enemyLateDmg:0.014,
    bossHp:1.80, bossDmg:1.30,
    coinMult:0.86, coinFactor:0.23,
    playerHp:85, playerArmorCap:0.45, waveLen:29000,
    spawnBase:2150, spawnMin:900, spawnStep:55,
    spawnMax:20, spawnBatchMax:3, spawnBatchEvery:10,
    shopBase:1.02, shopWave:0.072, shopBiome:0.15, shopCap:3.65,
    rerollBase:2, rerollWave:0.55,
    waveBonusBase:1, waveBonusRate:0.35,
  },
};

// ── Screen manager ──
function showScreen(id){
  SceneManager.show(id);
}
function hideAllScreens(){
  SceneManager.hideAll();
}

// ── Menu helpers ──
let _selMode=1, _selDiff='medium';

// ═══════════════════════════════════════════════════════
// SHOP INVENTORY PANEL — Brotato style
// ═══════════════════════════════════════════════════════
let shopSelectedSlot = null;

function renderShopInventory(){
  const panel = document.getElementById('shop-inv-slots');
  if(!panel) return;
  panel.innerHTML = '';
  const groups=[{pidx:0,label:'P1',slots:weaponSlots}];
  if(gameMode===2)groups.push({pidx:1,label:'P2',slots:weaponSlots2});
  for(const group of groups){
    if(gameMode===2){
      const label=document.createElement('div');
      label.style.cssText='grid-column:1/-1;color:#80673a;font-size:11px;letter-spacing:2px;margin-top:4px;';
      label.textContent=`${group.label} · ${CLASS_DEFS[group.pidx===0?selectedClass.p1:selectedClass.p2]?.name||''}`;
      panel.appendChild(label);
    }
    for(let i=0;i<3;i++){
      const w = group.slots[i];
      const div = document.createElement('div');
      const isSel = shopSelectedSlot && shopSelectedSlot.pidx===group.pidx&&shopSelectedSlot.idx===i;
      if(!w){
        div.className = 'shop-inv-slot empty-slot';
        div.innerHTML = `<span style="opacity:0.28;">${gamePixelIconHtml('chest',22)}</span><span style="font-size:12px;color:#3a2a10;">Vazio</span>`;
      } else {
        const wd = WEAPON_DEFS[w.type];
        if(!wd)continue;
        const rc = RARITY_COLORS[w.rarity];
        div.className = 'shop-inv-slot'+(isSel?' selected-slot':'');
        div.style.borderColor = isSel?rc:`${rc}44`;
        const dmg = Math.round(campaignWeaponDamage(wd,w.rarity));
        const dmgDone = w.damageDone||0;
        const dmgTxt = dmgDone>0?`<span class="pixel-inline" style="color:#ff8844;font-size:11px;">${gamePixelIconHtml('sword',12)} ${Math.round(dmgDone)} dano/onda</span>`:'';
        div.innerHTML = `<span class="slt-icon">${campaignWeaponIconHtml(w.type,46,'campaign-weapon-art-inventory',rc)}</span><div class="slt-info"><div class="slt-name">${wd.name}</div><div class="slt-rar" style="color:${rc}">${RARITY_NAMES[w.rarity].toUpperCase()}</div><div class="slt-stats">Dano <span class="hi">${dmg}</span> · CD <span class="hi">${(campaignWeaponCooldown(wd,w.rarity,group.pidx===0?player:player2,w)/1000).toFixed(1)}s</span></div>${dmgTxt}</div>`;
        div.onclick = ()=>shopSelectSlot(i,group.pidx);
      }
      panel.appendChild(div);
    }
  }
  renderShopSlotActions();
}

function shopSelectSlot(idx,pidx=0){
  const w = getSlots(pidx)[idx];
  if(!w) return;
  shopSelectedSlot = (shopSelectedSlot && shopSelectedSlot.pidx===pidx&&shopSelectedSlot.idx===idx) ? null : {idx,pidx};
  renderShopInventory();
}

function renderShopSlotActions(){
  const actDiv = document.getElementById('shop-slot-actions');
  if(!actDiv) return;
  if(!shopSelectedSlot){ actDiv.style.display='none'; return; }
  const slots=getSlots(shopSelectedSlot.pidx||0);
  const w = slots[shopSelectedSlot.idx];
  if(!w){ actDiv.style.display='none'; return; }
  actDiv.style.display='block';
  const def = WEAPON_DEFS[w.type];
  const rv={common:3,uncommon:6,rare:10,epic:16,legendary:25}[w.rarity]||3;
  document.getElementById('shop-sel-label').innerHTML=`<span class="pixel-inline">${campaignWeaponIconHtml(w.type,22,'campaign-weapon-art-shop-label',RARITY_COLORS[w.rarity])} ${def.name} · ${RARITY_NAMES[w.rarity]}</span>`;
  document.getElementById('recycle-val').innerHTML=`<span class="pixel-inline">${gamePixelIconHtml('coin',12)} +${rv}</span>`;
  const {idx} = shopSelectedSlot;
  const canUp = w.rarity!=='legendary' && slots.some((s,si)=>si!==idx&&s&&s.type===w.type&&s.rarity===w.rarity);
  const btn=document.getElementById('btn-upgrade');
  if(btn){btn.className='shop-slot-btn upgrade'+(canUp?'':' disabled');btn.disabled=!canUp;}
}

function shopRecycleSelected(){
  if(!shopSelectedSlot) return;
  const {idx,pidx=0} = shopSelectedSlot;
  const slots=getSlots(pidx);
  const w = slots[idx]; if(!w) return;
  const rv={common:3,uncommon:6,rare:10,epic:16,legendary:25}[w.rarity]||3;
  totalCoins+=rv;
  document.getElementById('shop-coins-val').textContent=totalCoins;
  document.getElementById('coin-display').textContent='🪙 '+totalCoins;
  slots[idx]=null; shopSelectedSlot=null;
  updateWeaponUI(); renderShopInventory();
  if(typeof spawnLevelUpNotice==='function') spawnLevelUpNotice(W/2,H/2-30,`♻ Reciclado! +🪙${rv}`,0);
}

function shopUpgradeSelected(){
  if(!shopSelectedSlot) return;
  const {idx,pidx=0} = shopSelectedSlot;
  const slots=getSlots(pidx);
  const w = slots[idx]; if(!w||w.rarity==='legendary') return;
  const mi = slots.findIndex((s,si)=>si!==idx&&s&&s.type===w.type&&s.rarity===w.rarity);
  if(mi<0) return;
  const nr=nextRarity(w.rarity);
  slots[idx]={...w,rarity:nr,timer:0};
  slots[mi]=null; shopSelectedSlot=null;
  updateWeaponUI(); renderShopInventory(); buildFuseUI();
  if(typeof spawnLevelUpNotice==='function') spawnLevelUpNotice(W/2,H/2-30,`⬆ UPGRADE → ${RARITY_NAMES[nr]}!`,0);
}

// ═══════════════════════════════════════════════════════
// COLEÇÃO / ENCICLOPÉDIA
// ═══════════════════════════════════════════════════════
let collTab='weapons';
let defeatedEnemies={};
try{ defeatedEnemies=SaveSystem.readJSON('mvh_enemies',{}); }catch(e){}

function openCollection(){
  // Refresh kill data from localStorage
  try{ defeatedEnemies=SaveSystem.readJSON('mvh_enemies',{}); }catch(e){}
  collTab='weapons';
  hideAllScreens();
  document.getElementById('collection-screen').style.display='flex';
  collSetTab('weapons');
}
function showCollection(){ openCollection(); }
function closeCollection(){ showScreen('main-menu'); }

function collSetTab(tab){
  collTab=tab;
  ['weapons','items','enemies','classes','bosses','pets','blessings','dungeon'].forEach(t=>{
    const b=document.getElementById('coll-tab-'+t);
    if(b) b.className='coll-tab'+(t===tab?' active':'');
  });
  const det=document.getElementById('coll-detail');
  det.className='coll-detail';
  det.innerHTML='<div style="text-align:center;padding:30px 10px;color:#3a2e18;font-size:17px;letter-spacing:2px;">← Selecione um item<br>para ver detalhes</div>';
  renderCollGrid();
  _updateCollProgress();
}

function _updateCollProgress(){
  const grid = document.getElementById('coll-grid');
  if(!grid) return;
  const total = grid.querySelectorAll('.coll-card').length;
  const discovered = grid.querySelectorAll('.coll-card:not(.locked)').length;
  const pct = total > 0 ? Math.round(discovered/total*100) : 0;
  const fill = document.getElementById('coll-prog-fill');
  const label = document.getElementById('coll-prog-label');
  if(fill) fill.style.width = pct+'%';
  if(label) label.textContent = `${discovered} / ${total}`;
}

function renderCollGrid(){
  const grid=document.getElementById('coll-grid');
  grid.innerHTML='';
  if(collTab==='weapons') renderCollWeapons(grid);
  else if(collTab==='items') renderCollItems(grid);
  else if(collTab==='enemies') renderCollEnemies(grid);
  else if(collTab==='classes') renderCollClasses(grid);
  else if(collTab==='bosses')  renderCollBosses(grid);
  else if(collTab==='pets')    renderCollPets(grid);
  else if(collTab==='blessings') renderCollBlessings(grid);
  else if(collTab==='dungeon')   renderCollDungeon(grid);
  // Update progress bar after grid populates
  setTimeout(_updateCollProgress, 0);
}

function collSpriteCanvas(spr, pal, size=46){
  const cv=document.createElement('canvas'); cv.width=size; cv.height=size;
  const c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
  const rows=spr.length, cols=Math.max(...spr.map(r=>r.length));
  const px=Math.max(1, Math.floor(Math.min(size/cols, size/rows)));
  const ox=Math.floor((size-cols*px)/2), oy=Math.floor((size-rows*px)/2);
  for(let r=0;r<rows;r++){ const row=spr[r];
    for(let cc=0;cc<row.length;cc++){ const ch=row[cc]; if(ch===' ')continue;
      const col=pal[ch]; if(!col)continue;
      c.fillStyle=col; c.fillRect(ox+cc*px, oy+r*px, px, px);
    }
  }
  cv.style.cssText='image-rendering:pixelated;display:block;margin:0 auto;';
  return cv;
}
const COLL_ICON_PAL={
  X:'#06110a',D:'#14281b',d:'#0b1a10',G:'#7de89a',g:'#2d9258',W:'#e8f4e9',
  Y:'#f0d080',O:'#d47732',R:'#d94a38',B:'#62bce8',P:'#a86bdd',
  S:'#9ba9a2',N:'#745132'
};
const COLL_ICON_SPRITES={
  sword:[
    '        WW ',
    '       WSW ',
    '      WSW  ',
    '     WSW   ',
    '    WSW    ',
    '   WSW     ',
    '  WSW      ',
    'GGXGXGG    ',
    '   NN      ',
    '   NN      ',
    '   YY      '
  ],
  bow:[
    '  GGG      ',
    ' G   G     ',
    'G     G    ',
    'G     G WW ',
    'GYYYYYYYSWW',
    'G     G WW ',
    ' G   G     ',
    '  GGG      '
  ],
  axe:[
    '   SSSGG   ',
    '  SSSGGGG  ',
    '  SSSGGGG  ',
    '   SSSGG   ',
    '    NN     ',
    '    NN     ',
    '    NN     ',
    '    NN     ',
    '    NN     ',
    '    NN     '
  ],
  shield:[
    '  GGGGGGG  ',
    ' GGDDDDDGG ',
    'GGDDGDDDDGG',
    'GGDGGGDDDGG',
    'GGDDGDDDDGG',
    ' GGDDDDDGG ',
    '  GGDDDGG  ',
    '   GGdGG   ',
    '    GGG    ',
    '     G     '
  ],
  potion:[
    '    WWW    ',
    '    WSW    ',
    '   WSSSW   ',
    '  WSSSSSW  ',
    ' WPPPPPPPW ',
    'WPPPPPPPPPW',
    'WPPPGGGPPPW',
    ' WPPPPPPPW ',
    '  WWWWWWW  '
  ],
  orb:[
    '   PPPPP   ',
    '  PPBBPPP  ',
    ' PPBWWBPPP ',
    'PPBWWWWBPPP',
    'PPBWWWWBPPP',
    ' PPBWWBPPP ',
    '  PPBBPPP  ',
    '   PPPPP   ',
    '    NNN    ',
    '   NNNNN   '
  ],
  boots:[
    '  GGG  GGG ',
    '  GGG  GGG ',
    '  GGG  GGG ',
    '  GGG  GGG ',
    '  GGG  GGG ',
    ' GGGG GGGG ',
    'GGGGG GGGGG',
    'GGGGG GGGGG',
    ' GGG   GGG  '
  ],
  target:[
    '   RRRRR   ',
    ' RRDDDDDRR ',
    'RRDDRRRDDRR',
    'RDDRRRRRDDR',
    'RDRRWWWRRDR',
    'RDRRWWWRRDR',
    'RDDRRRRRDDR',
    'RRDDRRRDDRR',
    ' RRDDDDDRR ',
    '   RRRRR   '
  ],
  fire:[
    '     Y     ',
    '    YYY    ',
    '   YYRYY   ',
    '  YYRRRYY  ',
    ' YRRROORRY ',
    ' YRROOORRY ',
    '  RROOORR  ',
    '   ROROR   ',
    '    RRR    '
  ],
  tree:[
    '    GGG    ',
    '  GGGGGGG  ',
    ' GGGgGGGGG ',
    'GGGgGGgGGGG',
    ' GGGGGGGGG ',
    '  GGGGGGG  ',
    '    NNN    ',
    '    NNN    ',
    '   NNNNN   '
  ],
  ring:[
    '   YYYYY   ',
    ' YYDDDDDYY ',
    'YYDDDDDDDYY',
    'YDDD   DDDY',
    'YDD     DDY',
    'YDDD   DDDY',
    'YYDDDDDDDYY',
    ' YYDDDDDYY ',
    '   YYYYY   '
  ],
  hammer:[
    ' SSSSSSSS  ',
    'SSWWWWWWSS ',
    'SSWWWWWWSS ',
    ' SSSSSSSS  ',
    '    NN     ',
    '    NN     ',
    '    NN     ',
    '    NN     ',
    '   NNNN    '
  ],
  map:[
    'GGGGGGGGGGG',
    'GDDGDDDGDDG',
    'GDDGGRDGDDG',
    'GDDGRRRGDDG',
    'GDDGGRDGDDG',
    'GDDGDDDGDDG',
    'GDDDDDDDDDG',
    'GGGGGGGGGGG'
  ],
  chest:[
    ' NNNNNNNNN ',
    'NNYYYYYYYNN',
    'NNYNNNNNYNN',
    'NNNNNNNNNNN',
    'NNYYYYYYYNN',
    'NNYYYXYYYNN',
    'NNYYYYYYYNN',
    ' NNNNNNNNN '
  ],
  stairs:[
    '        GGG',
    '        GDD',
    '      GGGDD',
    '      GDDDD',
    '    GGGDDDD',
    '    GDDDDDD',
    '  GGGDDDDDD',
    '  GDDDDDDDD',
    'GGGDDDDDDDD'
  ],
  armor:[
    '  SSS SSS  ',
    ' SSSSSSSSS ',
    'SSGSSSSSGSS',
    'SSSSSSSSSSS',
    'SSSSGGGSSSS',
    ' SSSGGGSSS ',
    ' SSSSSSSSS ',
    ' SSSS SSSS ',
    ' SSSS SSSS '
  ],
  shadow:[
    '    PPP    ',
    '  PPPPPPP  ',
    ' PPPXPPXPP ',
    'PPPPPPPPPPP',
    'PPPPPPPPPPP',
    ' PPPPPPPPP ',
    '  PPPPPPP  ',
    '  PP P PP  ',
    ' PP  P  PP '
  ],
  lightning:[
    '      YYY  ',
    '     YYY   ',
    '    YYY    ',
    '   YYYYYY  ',
    '      YYY  ',
    '     YYY   ',
    '    YYY    ',
    '   YYY     ',
    '  YYY      '
  ],
  wave:[
    '           ',
    '      BBB  ',
    ' BBB BBBBB ',
    'BBBBBBBBBBB',
    ' BBBBBBBBB ',
    '   BBBBBBB ',
    'BBBBBBBBBBB',
    ' BBBBBBBBB '
  ],
  eye:[
    '   RRRRR   ',
    ' RRRDDDRRR ',
    'RRDDPPPPDRR',
    'RDDPPWPPDDR',
    'RDDPPWPPDDR',
    'RRDDPPPPDRR',
    ' RRRDDDRRR ',
    '   RRRRR   '
  ],
  skull:[
    '  WWWWWWW  ',
    ' WWWWWWWWW ',
    'WWWXWWWXWWW',
    'WWWXWWWXWWW',
    'WWWWWWWWWWW',
    ' WWWXWXWWW ',
    '  WWXWXWW  ',
    '  W W W W  '
  ],
  wizard:[
    '     BB    ',
    '    BBBB   ',
    '   BBBBBB  ',
    '    YYY    ',
    '   YWYWY   ',
    '    YYY    ',
    '   PPPPP   ',
    '  PPPBPPP  ',
    '  PPPBPPP  ',
    '   NN NN   '
  ],
  leaf:[
    '      GGG  ',
    '    GGGGG  ',
    '  GGGgGG   ',
    ' GGGgGG    ',
    'GGGgGG     ',
    ' GGGG      ',
    '   gG GGG  ',
    '   gGGGG   ',
    '   gGGG    ',
    '   g       '
  ],
  heart:[
    ' GG   GG ',
    'GGGG GGGG',
    'GGGGGGGGG',
    'GGGGGGGGG',
    ' GGGGGGG ',
    '  GGGGG  ',
    '   GGG   ',
    '    G    '
  ],
  coin:[
    '   YYYYY   ',
    ' YYOOOOOYY ',
    'YYOYYYYYOYY',
    'YOYYOYOYYOY',
    'YOYYOYOYYOY',
    'YYOYYYYYOYY',
    ' YYOOOOOYY ',
    '   YYYYY   '
  ],
  lock:[
    '   SSSSS   ',
    '  SS   SS  ',
    '  SS   SS  ',
    ' SSSSSSSSS ',
    ' SYYYYYYYS ',
    ' SYYYXYYYS ',
    ' SYYYXYYYS ',
    ' SSSSSSSSS '
  ],
  key:[
    '  YYYYY    ',
    ' YYOOOYY   ',
    ' YYO OYY   ',
    '  YYYYY    ',
    '    YY     ',
    '    YYYYYY ',
    '    YY YY  ',
    '    YYYY   '
  ],
  play:[
    '  Y        ',
    '  YYY      ',
    '  YYYYY    ',
    '  YYYYYYY  ',
    '  YYYYYYYYY',
    '  YYYYYYY  ',
    '  YYYYY    ',
    '  YYY      ',
    '  Y        '
  ],
  book:[
    'GGGGG GGGGG',
    'GWWWG GWWWG',
    'GWWWG GWWWG',
    'GWWWG GWWWG',
    'GWWWG GWWWG',
    'GWWWG GWWWG',
    'GWWWGGGWWWG',
    ' GGGG GGGG '
  ],
  castle:[
    'GGG GGG GGG',
    'G G G G G G',
    'GGGGGGGGGGG',
    'GGDDDDDDDGG',
    'GGDGGGGGDGG',
    'GGDGGGGGDGG',
    'GGDGGXGGDGG',
    'GGDGGXGGDGG',
    'GGGGGXGGGGG'
  ],
  cross:[
    'RR       RR',
    ' RRR   RRR ',
    '  RRR RRR  ',
    '   RRRRR   ',
    '    RRR    ',
    '   RRRRR   ',
    '  RRR RRR  ',
    ' RRR   RRR ',
    'RR       RR'
  ],
  pause:[
    ' GGG  GGG ',
    ' GGG  GGG ',
    ' GGG  GGG ',
    ' GGG  GGG ',
    ' GGG  GGG ',
    ' GGG  GGG ',
    ' GGG  GGG ',
    ' GGG  GGG '
  ],
  sprout:[
    ' GG     GG ',
    'GGGG   GGGG',
    ' GGGG GGGG ',
    '  GGGGGGG  ',
    '    gG     ',
    '    gG     ',
    '    gG     ',
    '   NNNN    ',
    ' NNNNNNNN  '
  ],
  bowl:[
    '  O O O O  ',
    '   O O O   ',
    '           ',
    ' GGGGGGGGG ',
    'GGDDDDDDDGG',
    ' GGGDDDG G ',
    '  GGGGGGG  ',
    '   NNNNN   '
  ],
  fishing:[
    '   YYYYYYY ',
    '       YY  ',
    '      YY   ',
    '     YY B  ',
    '    YY  B  ',
    '   YY   B  ',
    '  YY    B  ',
    ' YY     B  ',
    'YY      BB ',
    '         BB'
  ],
  paw:[
    ' GG  GG    ',
    'GGGG GGGG  ',
    ' GG   GG   ',
    '   GGG     ',
    ' GGGGGGG   ',
    'GGGGGGGGG  ',
    ' GGGGGGG   ',
    '  GGGGG    '
  ],
  backpack:[
    '   PPPPP   ',
    '  PP   PP  ',
    ' PPPPPPPPP ',
    'PPPRRRRPPP ',
    'PPPRRRRPPP ',
    'PPPYYYYPPP ',
    'PPPYYYYPPP ',
    ' PPPPPPP   ',
    ' PP     PP '
  ],
  return:[
    '     OOO   ',
    '    OOOO   ',
    ' OOOOOOOO  ',
    'OOOOOOOOO  ',
    ' OOOOOOOO  ',
    '    OOO    ',
    '    OOO    ',
    '   OOO     '
  ],
  pickaxe:[
    ' SSSSSSSS  ',
    'SSSSSSSSSS ',
    '   SNN     ',
    '    NN     ',
    '    NN     ',
    '   NN      ',
    '   NN      ',
    '  NN       ',
    '  NN       '
  ],
  water:[
    '    BBB    ',
    '   BBBBB   ',
    '  BBBBBBB  ',
    ' BBBBBBBBB ',
    'BBBBBBBBBBB',
    'BBBBBBBBBBB',
    ' BBBBBBBBB ',
    '  BBBBBBB  '
  ],
  bucket:[
    'SS       SS',
    ' SSSSSSSSS ',
    '  SSSSSSS  ',
    '  SBBBBBS  ',
    '  SBBBBBS  ',
    '  SBBBBBS  ',
    '  SBBBBBS  ',
    '   SSSSS   '
  ],
  expand:[
    'YY       YY',
    'YYY     YYY',
    'YYYY   YYYY',
    'YY YY YY YY',
    '   YY YY   ',
    'YY YY YY YY',
    'YYYY   YYYY',
    'YYY     YYY',
    'YY       YY'
  ],
  wheat:[
    '  Y Y Y    ',
    '   YYY     ',
    '  YYYYY    ',
    '   YYY     ',
    '    Y YYY  ',
    '    YYYY   ',
    '   YYY     ',
    '    Y      ',
    '    Y      ',
    '    Y      '
  ],
  tomato:[
    '   GGGGG   ',
    ' GGGgGgGGG ',
    '   RRRRR   ',
    ' RRRRRRRRR ',
    'RRRRRRRRRRR',
    'RRRRRRRRRRR',
    ' RRRRRRRRR ',
    '  RRRRRRR  '
  ],
  berry:[
    '    gG     ',
    '   gGGG    ',
    '  P P P    ',
    ' PPPPPPP   ',
    'PPPPPPPPP  ',
    ' PPPPPPP   ',
    '  PPPPP    ',
    '   PPP     '
  ],
  melon:[
    '    GGG    ',
    '  GGWWWGG  ',
    ' GWWRRRWWG ',
    'GWRRRYRRRWG',
    'GWRRYRYRRWG',
    ' GWWRRRWWG ',
    '  GGWWWGG  ',
    '    GGG    '
  ],
  apple:[
    '    NN     ',
    '    NgG    ',
    '  RRRRRR   ',
    ' RRRRRRRR  ',
    'RRRRRRRRRR ',
    'RRRRRRRRRR ',
    ' RRRRRRRR  ',
    '  RRRRRR   '
  ],
  herb:[
    ' G       G ',
    'GGG     GGG',
    ' GGG   GGG ',
    '  GGG GGG  ',
    '    GGG    ',
    ' GGG G GGG ',
    '  GGG GGG  ',
    '    GGG    ',
    '     G     '
  ],
  mushroom:[
    '   PPPPP   ',
    ' PPPWWPPPP ',
    'PPPPPPPWPPP',
    'PPWPPPPPPPP',
    ' PPPPPPPPP ',
    '   WWWWW   ',
    '   WNNNW   ',
    '   WNNNW   ',
    '    NNN    '
  ],
  root:[
    '   RRRRR   ',
    ' RRRRGRRRR ',
    'RRRRGGGRRRR',
    ' RRRRRRRRR ',
    '   NNNNN   ',
    '  NN N NN  ',
    ' NN  N  NN ',
    ' N   N   N '
  ],
  plot:[
    'NNNNNNNNNNN',
    'NDDDDDDDDDN',
    'NDNDNDNDNDN',
    'NDDDDDDDDDN',
    'NDNDNDNDNDN',
    'NDDDDDDDDDN',
    'NNNNNNNNNNN'
  ],
  soil:[
    'NNNNNNNNNNN',
    'NOONOONOONN',
    'NONNONNONON',
    'NNOONOONOON',
    'NONNONNONON',
    'NOONOONOONN',
    'NNNNNNNNNNN'
  ],
  cup:[
    ' O O O     ',
    '  O O      ',
    '           ',
    ' SSSSSSS   ',
    ' SGGGGGS SS',
    ' SGGGGGS  S',
    ' SGGGGGS SS',
    '  SSSSSS   ',
    '   SSSS    '
  ],
  feast:[
    'Y    Y    Y',
    ' YY  Y  YY ',
    '  GGGGGGG  ',
    ' GGRRRRRGG ',
    'GGROOOOORGG',
    'GGROOOOORGG',
    ' GGRRRRRGG ',
    '  GGGGGGG  '
  ],
  clock:[
    '   SSSSS   ',
    ' SSWWWWWSS ',
    'SSWWYWWWYSS',
    'SWWWYWWWYWS',
    'SWWWYYYYYWS',
    'SWWWWWWWWWS',
    ' SSWWWWWSS ',
    '   SSSSS   '
  ],
  spark:[
    '    Y      ',
    '    Y      ',
    '  YYYYY    ',
    '    Y      ',
    '    Y   Y  ',
    '        Y  ',
    '       YYY ',
    '        Y  '
  ],
  training:[
    'SS       SS',
    'SSS     SSS',
    ' SSSSSSSSS ',
    '   SSSSS   ',
    '   SSSSS   ',
    ' SSSSSSSSS ',
    'SSS     SSS',
    'SS       SS'
  ],
  keyboard:[
    ' SSSSSSSSS ',
    'SSWWWWWWWSS',
    'SWGWGWGWGWS',
    'SWWWWWWWWWS',
    'SWGGGGGGGWS',
    ' SSSSSSSSS '
  ],
  wood:[
    'NNNNNNNNNNN',
    'NOOOOOOOOON',
    'NNOOOOOOONN',
    'NOOOOOOOOON',
    'NNNNNNNNNNN',
    '  NNNNNNN  '
  ],
  stone:[
    '    SSS    ',
    '  SSSSSSS  ',
    ' SSSWSSSSS ',
    'SSSSSSWSSSS',
    'SSWSSSSSSSS',
    ' SSSSSSSSS ',
    '  SSSSSSS  '
  ],
  fish:[
    '       BB  ',
    '  BBBBBBB  ',
    'BBBWBBBBBB ',
    '  BBBBBBBBB',
    '       BB  '
  ],
  river:[
    '   SS   SS ',
    '  SSSS SSSS',
    ' SSGSSSSGSS',
    'GGGGGBGGGGG',
    ' BBBBBBBBB ',
    'BBBBWBBBBBB',
    ' BBBBBBBBB '
  ],
  abyss:[
    '   PPPPP   ',
    ' PPPDDPPP  ',
    'PPDDDDDPPP ',
    'PPDDXDDDPP ',
    'PPDDDDDPPP ',
    ' PPPDDPPP  ',
    '   PPPPP   '
  ],
  moon:[
    '   YYYYY   ',
    ' YYYYYYY   ',
    'YYYYYY     ',
    'YYYYY      ',
    ' YYYYYY    ',
    '   YYYYY   '
  ],
  ice:[
    '    B    ',
    ' B  B  B ',
    '  B B B  ',
    'BBBBWBBBB',
    '  B B B  ',
    ' B  B  B ',
    '    B    '
  ],
  volcano:[
    '    R     ',
    '   ROR    ',
    '    R     ',
    '   SSS    ',
    '  SRSRS   ',
    ' SSSSSSS  ',
    'SSSRRSSSS ',
    'SSSSSSSSSS'
  ],
  village:[
    ' N   N   N ',
    'NNN NNN NNN',
    'NWN NWN NWN',
    'NNN NNN NNN',
    'NNNNNNNNNNN',
    'GGGGGGGGGGG'
  ],
  dice:[
    '  SSSSSSS  ',
    ' SSSSSSSSS ',
    'SSWSSSSSWSS',
    'SSSSSWSSSSS',
    'SSWSSSSSWSS',
    ' SSSSSSSSS ',
    '  SSSSSSS  '
  ],
  stew:[
    '   Y Y Y   ',
    '  Y Y Y    ',
    '           ',
    '  NNNNNNN  ',
    ' NNOOOOONN ',
    ' NNOYOOONN ',
    '  NNNNNNN  ',
    '   NNNNN   '
  ],
  soup:[
    '  R   R    ',
    '   R R R   ',
    '           ',
    '  NNNNNNN  ',
    ' NNRRRRRNN ',
    ' NNRORORNN ',
    '  NNNNNNN  ',
    '   NNNNN   '
  ],
  double_orb:[
    ' P      B  ',
    'PPP    BBB ',
    'PWP   BBWB ',
    'PPP    BBB ',
    ' P      B  ',
    '   Y  Y    ',
    '    YY     '
  ],
  vortex:[
    '   BBBB    ',
    ' BB    BB  ',
    'B   PP   B ',
    'B PP  P BB ',
    'B P BBP B  ',
    ' BB PP B   ',
    '   BBBB    '
  ],
  blast:[
    'Y    Y    Y',
    ' YY  Y  YY ',
    '  YYYYYYY  ',
    'YYYOROYYYYY',
    '  YYYYYYY  ',
    ' YY  Y  YY ',
    'Y    Y    Y'
  ],
  beacon:[
    '   ROROR   ',
    '    ROR    ',
    '   YYYYY   ',
    '    SSS    ',
    '   SSSSS   ',
    '   SWSWS   ',
    '  SSSSSSS  ',
    ' NNNNNNNNN '
  ],
  camp:[
    '     R     ',
    '    RYR    ',
    '           ',
    '     Y     ',
    '    YYY    ',
    '   YNYYN   ',
    '  YNNYYNN  ',
    ' NNNNNNNNN '
  ],
  eagle:[
    'W         W',
    'WWW     WWW',
    ' WWW W WWW ',
    '  WWWWWWW  ',
    '    WYW    ',
    '    NYN    ',
    '   N   N   '
  ],
  meat:[
    '   RRRR    ',
    ' RRRORRR   ',
    'RRROOORRR  ',
    ' RRRORRR S ',
    '   RRR  SSS',
    '        SWS',
    '         S '
  ]
};

// Ícones exclusivos das 32 armas da campanha. Cada silhueta é desenhada
// pixel a pixel e reutilizada na loja, HUD, fusão e Códex.
Object.assign(COLL_ICON_SPRITES,{
  mage_fire_staff:[
    '    YRY    ','   YRORRY  ','    RRR    ','     NN    ','    NN     ',
    '   NN      ','  NN       ',' NN        ','NN         ',' N         ','NNN        '
  ],
  mage_lightning_staff:[
    '   YYY  Y  ','     YYY   ','    YY     ','   YY      ','    YNN    ',
    '    NN     ','   NN      ','  NN       ',' NN        ','NN         ',' NNN       '
  ],
  mage_ice_staff:[
    '    BWB    ','   BWWWB   ','  BBWWWBB  ','   BWWWB   ','    BNB    ',
    '    NN     ','   NN      ','  NN       ',' NN        ','NN         ',' NNN       '
  ],
  mage_arcane_staff:[
    '   PPPPP   ','  PPBWBPP  ','  PBWWWBP  ','  PPBWBPP  ','   PPNP   ',
    '    NN     ','   NN      ','  NN       ',' NN        ','NN         ',' NNN       '
  ],
  mage_poison_staff:[
    '  G     G  ','   GGGGG   ','  GGWgWGG  ','  GGGgGGG  ','   GGNGG   ',
    '    NN     ','   NN      ','  NN       ',' NN        ','NN         ',' NNN       '
  ],
  mage_shadow_staff:[
    '   PPPPP   ','  PPDDDDP  ',' PPDDPPPP  ',' PPDDPPPP  ','  PPDDNNP  ',
    '    NN     ','   NN      ','  NN       ',' NN        ','NN         ',' NNN       '
  ],
  mage_solar_staff:[
    'Y Y  Y  Y Y',' Y YYY Y  ','  YYYYYYY  ','YYYWWWWWYYY','  YYYYYYY  ',
    '    NN     ','   NN      ','  NN       ',' NN        ','NN         ',' NNN       '
  ],
  mage_wind_staff:[
    '  BBBBBB   ',' BB    BB  ','B   WWW  B ',' BBWW  BBB ','   BBBBB   ',
    '    NN     ','   NN      ','  NN       ',' NN        ','NN         ',' NNN       '
  ],

  warrior_longsword:[
    '        WW ','       WSW ','      WSW  ','     WSW   ','    WSW    ',
    '   WSW     ','  WSW      ',' YYYYYYY   ','   NN      ','   NN      ','  NNNN     '
  ],
  warrior_greatsword:[
    '    WWW    ','   WSSSW   ','   WSSSW   ','   WSSSW   ','   WSSSW   ',
    '   WSSSW   ','   WSSSW   ',' YYYYYYYYY ','    NN     ','   NNNN    ','  NNNNNN   '
  ],
  warrior_spear:[
    '        W  ','       WWW ','      WSW  ','     NN    ','    NN     ',
    '   NN      ','  NN       ',' NN        ','NN         ','N          ','           '
  ],
  warrior_warhammer:[
    ' SSSSSSSSS ','SSWWWWWWWSS','SSWSSSSSWSS',' SSSSSSSSS ','    NNN    ',
    '    NNN    ','    NNN    ','    NNN    ','    NNN    ','   NNNNN   ','           '
  ],
  warrior_warshield:[
    '  SSSSSSS  ',' SSWWWWWSS ','SSWDDDDDWSS','SSWDYYDDWSS','SSWDDYDDWSS',
    ' SSWDDDWSS ','  SSWWWSS  ','   SSWSS   ','    SSS    ','     S     ','           '
  ],
  warrior_twinblades:[
    'W         W',' WW     WW ','  WW   WW  ','   WW WW   ','    WWW    ',
    '   YYYYY   ','  NN   NN  ',' NN     NN ','NN       NN','N         N','           '
  ],
  warrior_chainblade:[
    '      WWWW ','     WSSSW ','      WSW  ','     SNS   ','    S S    ',
    '   S S     ','  S S      ',' S S       ','S S        ',' NN        ','NNN        '
  ],
  warrior_spikedmace:[
    '  S  S  S  ',' SSSSSSSSS ','SSWSWSWSWSS',' SSSSSSSSS ','  S  N  S  ',
    '     N     ','     N     ','     N     ','     N     ','    NNN    ','           '
  ],

  archer_shortbow:[
    '  GGG      ',' GG GG     ','GG   GG  W ','G     G WW ','GYYYYYYYSWW',
    'G     G WW ','GG   GG  W ',' GG GG     ','  GGG      ','           ','           '
  ],
  archer_longbow:[
    ' GGG       ','G  GG      ','G   GG   W ','G    GG WW ','GYYYYYYYSWW',
    'G    GG WW ','G   GG   W ','G  GG      ',' GGG       ','           ','           '
  ],
  archer_crossbow:[
    ' GG     GG ','  GG   GG  ','   GG GG   ','SSSYYYYYSSS','  NNWNN    ',
    '   NNN     ','   NNN     ','   NNN     ','  NNNNN    ','           ','           '
  ],
  archer_poisonbow:[
    '  GGG      ',' GG gG     ','GG   GG  G ','G     G GG ','GgggggggWGG',
    'G     G GG ','GG   GG  G ',' GG gG     ','  GGG      ','       G   ','           '
  ],
  archer_explosivebow:[
    '  RRR      ',' RR RR     ','RR   RR  Y ','R     R YY ','ROOOOOOOSYY',
    'R     R YY ','RR   RR  Y ',' RR RR     ','  RRR      ','       ROR ','        R  '
  ],
  archer_ricochetbow:[
    '  YYY   Y  ',' YY YY   Y ','YY   YY  Y ','Y     Y YY ','YYYYYYYYSWW',
    'Y     Y  Y ','YY   YY Y  ',' YY YYY    ','  YYY YYY  ','        YY ','           '
  ],
  archer_frostbow:[
    '  BBB      ',' BB WB     ','BB   BB  B ','B     B BB ','BWWWWWWWSBB',
    'B     B BB ','BB   BB  B ',' BB WB     ','  BBB      ','       BWB ','        B  '
  ],
  archer_thunderbow:[
    '  YYY   Y  ',' YY YY YYY ','YY   YYY   ','Y    YY YY ','YYYYYYYYSWW',
    'Y   YY  YY ','YY YYY  Y  ',' YYY YY    ','  YYY      ','      YYY  ','       Y   '
  ],

  viking_waraxe:[
    '  SSSSSYY  ',' SSSYYYYYY ','SSSSYYYYYY ',' SSSSSYY   ','    NN     ',
    '    NN     ','    NN     ','    NN     ','   NNN     ','  NN NN    ','           '
  ],
  viking_twinaxes:[
    'SSS     SSS',' SSS   SSS ','  SSN NSS  ','    NNN    ','   NNNNN   ',
    '  NN   NN  ',' NN     NN ','NN       NN','N         N','           ','           '
  ],
  viking_throwingaxe:[
    '     SSSS  ','   SSSYYSS ','  SYYYYYYSS',' SYYYYYSS  ','   SSN     ',
    '    NN     ','   NN      ','  NN       ',' NN        ','NN         ',' NNN       '
  ],
  viking_stormhammer:[
    ' Y SSSSS Y ','YYYSSWSSYYY','  YSSSSSY  ','   SSSSS   ','    NNN    ',
    '  Y NNN Y  ',' YYYNNNYYY ','    NNN    ','   NNNNN   ','     Y     ','           '
  ],
  viking_bloodaxe:[
    '  RRRRRRR  ',' RRRORRRRR ','RRROORRRRR ',' RRRORRR   ','    NN     ',
    '    NN     ','    NN     ','  R NN R   ',' RRRNNRRR  ','  R NN R   ','           '
  ],
  viking_frostaxe:[
    '  BBWBWBB  ',' BBWWWWBBB ','BBWWWWWWBB ',' BBWWWWB   ','    NN     ',
    '    NN     ','  B NN B   ',' BBBNNBBB  ','  B NN B   ','    NN     ','           '
  ],
  viking_nordicspear:[
    '        Y  ','       YWY ','      YWY  ','     YNY   ','    NNY    ',
    '   NNY     ','  NNY      ',' NNY       ','NNY        ','N          ','           '
  ],
  viking_colossalaxe:[
    'SSSSSSSSYY ','SSSSYYYYYYY','SSYYYYYYYYY',' SSSYYYYYY ','   SNNYY   ',
    '    NN     ','    NN     ','   NNNN    ','   NNNN    ','  NN  NN   ',' NN    NN  '
  ]
});

function collGameIcon(kind,pal){
  return {spr:COLL_ICON_SPRITES[kind]||COLL_ICON_SPRITES.orb,pal:{...COLL_ICON_PAL,...(pal||{})}};
}
function collSpriteDataUrl(spr,pal,size=64){
  return collSpriteCanvas(spr,pal,size).toDataURL('image/png');
}
function collIconHtml(icon,size=54){
  if(icon&&typeof icon==='object'&&icon.weaponType&&typeof campaignWeaponIconHtml==='function'){
    return campaignWeaponIconHtml(icon.weaponType,size,'coll-weapon-art');
  }
  if(icon&&typeof icon==='object'&&icon.artPath){
    return codexArtIconHtml(icon.artPath,size,'coll-codex-art',icon.color);
  }
  if(icon&&typeof icon==='object'&&icon.spr){
    const src=collSpriteDataUrl(icon.spr,icon.pal,size);
    return `<img class="coll-pixel-icon" src="${src}" width="${size}" height="${size}" alt="">`;
  }
  return '<span class="coll-title-rune">ᚱ</span>';
}
function codexArtIconHtml(path,size=46,extraClass='',ringColor='#c8a84b'){
  const px=Math.max(20,Number(size)||46);
  return `<span class="codex-art-medallion ${extraClass}" style="--codex-art-size:${px}px;--codex-art-ring:${ringColor||'#c8a84b'};" aria-hidden="true"><img class="codex-art-image" src="${path}" alt=""></span>`;
}
function gamePixelIconHtml(icon,size=26,pal,extraClass=''){
  const data=typeof icon==='string'?collGameIcon(icon,pal):icon;
  if(!data||!data.spr)return '';
  const src=collSpriteDataUrl(data.spr,data.pal,size);
  return `<img class="game-pixel-icon ${extraClass}" src="${src}" width="${size}" height="${size}" alt="" aria-hidden="true">`;
}
function drawGamePixelIconToCanvas(context,icon,cx,cy,size=26,pal){
  const data=typeof icon==='string'?collGameIcon(icon,pal):icon;
  if(!context||!data||!data.spr)return;
  const rows=data.spr.length;
  const cols=Math.max(...data.spr.map(row=>row.length));
  const px=Math.max(1,Math.floor(size/Math.max(cols,rows)));
  const ox=Math.round(cx-cols*px/2);
  const oy=Math.round(cy-rows*px/2);
  for(let r=0;r<rows;r++){
    const row=data.spr[r];
    for(let c=0;c<row.length;c++){
      const color=data.pal[row[c]];
      if(!color)continue;
      context.fillStyle=color;
      context.fillRect(ox+c*px,oy+r*px,px,px);
    }
  }
}
function gamePetIconHtml(id,size=38,extraClass=''){
  // arte nova (PNG) quando existir — o sprite de grade ficava borrado ao ampliar
  if(typeof PET_IMG_SETS!=='undefined'&&PET_IMG_SETS[id]){
    const px=Math.max(12,Number(size)||38);
    return `<img class="game-pixel-icon ${extraClass}" src="assets/pets/${id}/icon.png" `
         + `width="${px}" height="${px}" alt="" aria-hidden="true" `
         + `style="image-rendering:pixelated;object-fit:contain;">`;
  }
  const pet=(typeof PET_SPRITES!=='undefined'&&PET_SPRITES[id])?PET_SPRITES[id]:null;
  return gamePixelIconHtml(pet?{spr:pet.idle,pal:pet.pal}:collGameIcon('paw'),size,null,extraClass);
}
function hydrateGamePixelIcons(root=document){
  root.querySelectorAll('[data-pixel-icon]').forEach(slot=>{
    if(slot.dataset.pixelReady==='1')return;
    const size=Math.max(10,parseInt(slot.dataset.pixelSize||'26',10)||26);
    slot.innerHTML=gamePixelIconHtml(slot.dataset.pixelIcon,size);
    slot.dataset.pixelReady='1';
    slot.setAttribute('aria-hidden','true');
  });
}
function gameItemPixelKind(idOrName){
  const s=(idOrName||'').toString().toLowerCase();
  if(/trigo|wheat/.test(s))return 'wheat';
  if(/tomate/.test(s))return 'tomato';
  if(/erva|folha/.test(s))return 'herb';
  if(/cogumelo|fungo/.test(s))return 'mushroom';
  if(/raiz|sangue/.test(s))return 'root';
  if(/madeira|lenha/.test(s))return 'wood';
  if(/pedra|rocha|mineral/.test(s))return 'stone';
  if(/machado/.test(s))return 'axe';
  if(/arco|flecha/.test(s))return 'bow';
  if(/martelo|oficina|forja/.test(s))return 'hammer';
  if(/adaga|espada|lâmina/.test(s))return 'sword';
  if(/cajado|orbe|magia/.test(s))return 'orb';
  if(/escudo|peitoral/.test(s))return 'shield';
  if(/bota/.test(s))return 'boots';
  if(/anel|reliquia|relíquia/.test(s))return 'ring';
  return 'spark';
}
requestAnimationFrame(()=>hydrateGamePixelIcons(document));
const CODEX_RELIC_ART=Object.freeze({
  mage_arcane_core:'assets/codex/relics/mage_arcane_core.png',
  mage_spellbook:'assets/codex/relics/mage_spellbook.png',
  mage_elemental_orb:'assets/codex/relics/mage_elemental_orb.png',
  mage_arcane_hourglass:'assets/codex/relics/mage_arcane_hourglass.png',
  mage_astral_cloak:'assets/codex/relics/mage_astral_cloak.png',
  mage_mana_fragment:'assets/codex/relics/mage_mana_fragment.png',
  mage_arcane_eye:'assets/codex/relics/mage_arcane_eye.png',
  mage_rune_circle:'assets/codex/relics/mage_rune_circle.png',
  warrior_reinforced_plate:'assets/codex/relics/warrior_reinforced_plate.png',
  warrior_whetstone:'assets/codex/relics/warrior_whetstone.png',
  warrior_gauntlet:'assets/codex/relics/warrior_gauntlet.png',
  warrior_guardian_medallion:'assets/codex/relics/warrior_guardian_medallion.png',
  warrior_broken_shield:'assets/codex/relics/warrior_broken_shield.png',
  warrior_heavy_boots:'assets/codex/relics/warrior_heavy_boots.png',
  warrior_iron_emblem:'assets/codex/relics/warrior_iron_emblem.png',
  warrior_titan_heart:'assets/codex/relics/warrior_titan_heart.png',
  archer_shooter_glove:'assets/codex/relics/archer_shooter_glove.png',
  archer_eagle_eye:'assets/codex/relics/archer_eagle_eye.png',
  archer_reinforced_quiver:'assets/codex/relics/archer_reinforced_quiver.png',
  archer_wind_feather:'assets/codex/relics/archer_wind_feather.png',
  archer_hunter_sight:'assets/codex/relics/archer_hunter_sight.png',
  archer_serrated_tip:'assets/codex/relics/archer_serrated_tip.png',
  archer_precision_medallion:'assets/codex/relics/archer_precision_medallion.png',
  archer_hunter_steps:'assets/codex/relics/archer_hunter_steps.png',
  viking_war_horn:'assets/codex/relics/viking_war_horn.png',
  viking_mead_mug:'assets/codex/relics/viking_mead_mug.png',
  viking_blood_rune:'assets/codex/relics/viking_blood_rune.png',
  viking_odin_eye:'assets/codex/relics/viking_odin_eye.png',
  viking_berserker_fury:'assets/codex/relics/viking_berserker_fury.png',
  viking_thor_totem:'assets/codex/relics/viking_thor_totem.png',
  viking_frozen_beard:'assets/codex/relics/viking_frozen_beard.png',
  viking_valhalla_heart:'assets/codex/relics/viking_valhalla_heart.png',
  necromancer_soul_reservoir:'assets/codex/relics/necromancer_soul_reservoir.png',
  necromancer_profane_army:'assets/codex/relics/necromancer_profane_army.png',
  necromancer_reinforced_bones:'assets/codex/relics/necromancer_reinforced_bones.png',
  necromancer_command_dead:'assets/codex/relics/necromancer_command_dead.png',
  necromancer_soul_harvest:'assets/codex/relics/necromancer_soul_harvest.png',
  necromancer_corpse_master:'assets/codex/relics/necromancer_corpse_master.png',
  necromancer_blood_pact:'assets/codex/relics/necromancer_blood_pact.png',
  necromancer_last_breath:'assets/codex/relics/necromancer_last_breath.png',
  universal_light_boots:'assets/codex/relics/universal_light_boots.png',
  universal_red_heart:'assets/codex/relics/universal_red_heart.png',
  universal_combat_ration:'assets/codex/relics/universal_combat_ration.png',
  universal_agile_gloves:'assets/codex/relics/universal_agile_gloves.png',
  universal_luck_amulet:'assets/codex/relics/universal_luck_amulet.png',
  universal_merchant_bag:'assets/codex/relics/universal_merchant_bag.png',
  universal_runic_magnet:'assets/codex/relics/universal_runic_magnet.png',
  universal_golden_clover:'assets/codex/relics/universal_golden_clover.png',
  dng_relic_vamp:'assets/codex/relics/dng_relic_vamp.png',
  dng_relic_crit:'assets/codex/relics/dng_relic_crit.png',
  dng_relic_shield:'assets/codex/relics/dng_relic_shield.png',
  dng_relic_speed:'assets/codex/relics/dng_relic_speed.png',
  dng_relic_aoe:'assets/codex/relics/dng_relic_aoe.png',
  dng_relic_gold:'assets/codex/relics/dng_relic_gold.png',
  dng_relic_regen:'assets/codex/relics/dng_relic_regen.png',
  dng_relic_maxhp:'assets/codex/relics/dng_relic_maxhp.png',
  dng_ring_furia:'assets/codex/relics/dng_ring_furia.png',
  dng_ring_vampirico:'assets/codex/relics/dng_ring_vampirico.png',
  dng_ring_critico:'assets/codex/relics/dng_ring_critico.png',
  dng_ring_ganancia:'assets/codex/relics/dng_ring_ganancia.png',
  dng_ring_vitalidade:'assets/codex/relics/dng_ring_vitalidade.png',
  dng_ring_pressa:'assets/codex/relics/dng_ring_pressa.png',
  dng_ring_regen:'assets/codex/relics/dng_ring_regen.png'
});
window.CODEX_RELIC_ART=CODEX_RELIC_ART;
function codexRelicIcon(id,color='#7bd99a'){
  const path=CODEX_RELIC_ART[id];
  return path?{artPath:path,color}:null;
}
function collItemIcon(it,classId){
  const relicIcon=codexRelicIcon(it?.id);
  if(relicIcon)return relicIcon;
  if(it?.pixelIcon)return collGameIcon(it.pixelIcon);
  const n=(it.name||'').toLowerCase();
  // Ícones específicos vêm primeiro para evitar que palavras amplas como
  // "arcana" ou "gelo" façam vários itens diferentes parecerem iguais.
  if(/magia glacial/.test(n)) return collGameIcon('ice',{B:'#72cfea',W:'#e8fbff'});
  if(/orbe duplo/.test(n)) return collGameIcon('double_orb');
  if(/vórtice/.test(n)) return collGameIcon('vortex',{B:'#72cfea',P:'#9a62e8'});
  if(/carga arcana/.test(n)) return collGameIcon('lightning',{Y:'#c477ff',W:'#e8d8ff'});
  if(/explosão arcana/.test(n)) return collGameIcon('blast',{Y:'#a965ef',O:'#55cfff',R:'#d8b4ff'});
  if(/meteoro arcano/.test(n)) return collGameIcon('fire',{R:'#ff5038',O:'#ff8a2a',Y:'#ffe071'});
  if(/bênção lunar|benção lunar/.test(n)) return collGameIcon('moon');
  if(/torrente gelada/.test(n)) return collGameIcon('wave',{B:'#72cfea',W:'#e8fbff'});
  if(/visão arcana/.test(n)) return collGameIcon('eye',{P:'#65c8ff',R:'#e7fbff'});
  if(/barreira de gelo/.test(n)) return collGameIcon('shield',{G:'#72cfea',g:'#327ca0',W:'#e8fbff'});
  if(/farol/.test(n)) return collGameIcon('beacon');
  if(/palantír/.test(n)) return collGameIcon('eye');
  if(/acampamento/.test(n)) return collGameIcon('camp');
  if(/ninho de águias/.test(n)) return collGameIcon('eagle');
  if(/banquete de guerra/.test(n)) return collGameIcon('meat');
  if(/fortaleza viva/.test(n)) return collGameIcon('castle');
  if(/vínculo de plasma|tempestade plasma/.test(n)) return collGameIcon('lightning',{Y:'#5fffd0',W:'#d8fff5'});
  if(/flecha ígnea/.test(n)) return collGameIcon('bow',{G:'#ef6b3c',g:'#9f2d20',Y:'#ffd16a'});
  if(/fúria de combate|fúria beserker|grito ampliado/.test(n)) return collGameIcon('blast',{Y:'#ff7147',O:'#c62f27',R:'#7d1717'});
  if(/machado/.test(n)) return collGameIcon('axe');
  if(/arco|flecha|ninho|balista/.test(n)) return collGameIcon('bow');
  if(/lâmina|espada|contra-ataque/.test(n)) return collGameIcon('sword');
  if(/escudo|barreira|fortaleza|capa/.test(n)) return collGameIcon('shield');
  if(/poção|banquete/.test(n)) return collGameIcon('potion');
  if(/veloc|carga de guerra|pés ligeiros|fúria/.test(n)) return collGameIcon('boots');
  if(/gelo|glacial|geada/.test(n)) return collGameIcon('ice',{B:'#72cfea',W:'#e8fbff'});
  if(/visão|olho|precisão|crítica/.test(n)) return collGameIcon('target');
  if(/orbe|arcana|explosão/.test(n)) return collGameIcon('orb');
  if(/fogo|chama|ígnea|meteoro/.test(n)) return collGameIcon('fire');
  if(/raiz|floresta|ent|águia/.test(n)) return collGameIcon('tree');
  if(/sangue|vampir|alma|osso/.test(n)) return collGameIcon('skull',{W:'#d94a38',S:'#7b1520'});
  return collGameIcon(({mage:'orb',warrior:'sword',archer:'bow',viking:'axe'})[classId]||'ring');
}
function collBlessingIcon(card){
  const id=card.id||'';
  if(id.startsWith('zeus_')) return collGameIcon('lightning');
  if(id.startsWith('ares_')) return collGameIcon('sword',{W:'#ef6b50',S:'#9b281f'});
  if(id.startsWith('hecate_')) return collGameIcon('shadow',{P:'#ba68e8',p:'#582a78'});
  if(id.startsWith('selene_')) return collGameIcon('moon',{W:'#eaf5ff',B:'#76aee8'});
  if(id.startsWith('moros_')) return collGameIcon('clock',{W:'#c9b7d8',S:'#5b426f'});
  if(id.startsWith('atena_')) return collGameIcon('shield');
  if(id.startsWith('hermes_')) return collGameIcon('boots',{G:'#e6d05e',g:'#a98522'});
  if(id.startsWith('dioni_')) return collGameIcon('potion',{P:'#9d4fc3',G:'#d68af0'});
  if(id.startsWith('hefesto_')) return collGameIcon('hammer',{S:'#ef8a45',W:'#f1b55e'});
  if(id.startsWith('artemis_')) return collGameIcon('bow');
  if(id.startsWith('poseidon_')) return collGameIcon('wave');
  if(id.startsWith('hercules_')) return collGameIcon('axe',{W:'#f2d07a',S:'#9d642a'});
  if(id.startsWith('sauron_')) return collGameIcon('eye');
  if(id.startsWith('nazgul_')) return collGameIcon('shadow');
  if(id.startsWith('ents_')) return collGameIcon('tree');
  if(id.startsWith('mordor_')) return collGameIcon('fire');
  return collGameIcon('orb');
}
function collGodName(god){
  return (god||'').replace(/^[^A-Za-zÀ-ÿ]+/,'').trim();
}
function collCard(icon,name,hint,locked,onclickFn,rarity,color){
  const d=document.createElement('div');
  const rarClass=rarity?'r-'+rarity:'';
  d.className='coll-card'+(locked?' locked':'')+(rarClass?' '+rarClass:'');
  if(icon&&typeof icon==='object'&&icon.weaponType)d.classList.add('weapon-art-card');
  if(icon&&typeof icon==='object'&&icon.artPath)d.classList.add('codex-art-card');
  // Cor do anel do medalhão: explícita > raridade > dourado padrão
  const rarRing={common:'#8a8a8a',uncommon:'#22cc55',rare:'#2277ee',epic:'#9933cc',legendary:'#ddaa00'};
  const ring=color||rarRing[rarity]||'#c8a84b';
  d.style.setProperty('--cc', ring);
  // Color for hint badge
  const hintColor=hint&&hint.includes('×')?'#ddaa44':hint&&hint.includes('✓')?'#44dd88':hint&&hint.includes('???')?'#3a2e28':'#5a4820';
  d.innerHTML=`
    <div class="coll-card-icon-wrap">
      ${collIconHtml(icon,46)}
    </div>
    <div class="coll-card-name">${name}</div>
    <div class="coll-card-hint" style="color:${hintColor};font-weight:${hint&&hint.includes('✓')?'bold':'normal'}">${hint||''}</div>`;
  if(!locked&&onclickFn) d.onclick=()=>{
    document.querySelectorAll('.coll-card').forEach(c=>c.classList.remove('active-card'));
    d.classList.add('active-card');
    onclickFn();
  };
  return d;
}

function collStatBar(label,val,max,color,unit){
  unit=unit||'';
  const pct=Math.min(100,Math.round(val/max*100));
  return `<div class="coll-stat-row"><span class="coll-stat-label">${label}</span><div class="coll-stat-bar"><div class="coll-stat-fill" style="width:${pct}%;background:${color}"></div></div><span class="coll-stat-val">${val}${unit}</span></div>`;
}

// ── ARMAS ──
function renderCollWeapons(grid){
  const classLabels={mage:'Mago',warrior:'Guerreiro',archer:'Arqueiro',viking:'Viking',necromancer:'Necromante'};
  const elementLabels={fire:'Fogo',ice:'Gelo',electric:'Elétrico',poison:'Veneno',shadow:'Sombras',arcane:'Arcano',solar:'Solar',wind:'Vento',blood:'Sangue',physical:'Físico'};
  for(const classId of ['mage','warrior','archer','viking','necromancer']){
    for(const spec of CAMPAIGN_WEAPON_SPECS[classId]||[]){
      const def=WEAPON_DEFS[spec[0]];if(!def)continue;
      const element=campaignWeaponElement(def.id);
      const icon={weaponType:def.id};
      const card=collCard(icon,def.name,elementLabels[element]||'Físico',false,()=>showCollWeaponDetail(def),null,def.color);
      const badge=document.createElement('div');
      badge.className='coll-weapon-class';badge.style.color=CLASS_DEFS[classId]?.color||def.color;badge.textContent=classLabels[classId];
      card.appendChild(badge);grid.appendChild(card);
    }
  }
}

function showCollWeaponDetail(w){
  const det=document.getElementById('coll-detail');
  det.className='coll-detail visible';
  const classNames={mage:'Mago · Magia',warrior:'Guerreiro · Corpo a corpo',archer:'Arqueiro · Longo alcance',viking:'Viking · Corpo a corpo',necromancer:'Necromante · Invocações'};
  const elementNames={fire:'Fogo',ice:'Gelo',electric:'Elétrico',poison:'Veneno',shadow:'Sombras',arcane:'Arcano',solar:'Solar',wind:'Vento',blood:'Sangue',physical:'Físico'};
  const rarRows=RARITIES.map((r,index)=>{
    const c=RARITY_COLORS[r],dmg=Math.round(campaignWeaponDamage(w,r)),cd=(campaignWeaponCooldown(w,r)/1000).toFixed(2),power=w.stages[index]||w.stages[0];
    return `<div class="coll-weapon-tier" style="--tier-color:${c}">
      <div class="coll-weapon-tier-head"><div class="coll-weapon-tier-name">${RARITY_NAMES[r].toUpperCase()}</div><div class="coll-weapon-tier-stats">${dmg} DANO · ${cd}s</div></div>
      <div class="coll-weapon-power">${power}</div>
    </div>`;
  }).join('');
  det.innerHTML=`
    <div class="coll-det-header">
      <div class="coll-det-icon">${collIconHtml({weaponType:w.id},54)}</div>
      <div class="coll-det-info">
        <div class="coll-det-name">${w.name}</div>
        <div class="coll-det-type">${classNames[w.classId]} · ${elementNames[campaignWeaponElement(w.id)]}</div>
      </div>
    </div>
    <div class="coll-det-divider"></div>
    <div class="coll-det-stats">
      ${collStatBar('Dano',w.baseDmg,60,'#ff6655')}
      ${collStatBar('Alcance',w.range,400,'#44aaff')}
      ${collStatBar('Veloc.',+(1000/w.cd).toFixed(1),2,'#44dd66','×/s')}
    </div>
    <div style="font-size:11px;color:#5a4020;letter-spacing:2px;text-transform:uppercase;margin:10px 0 6px;">PODERES POR RARIDADE</div>
    ${rarRows}`;
}

// ── ITENS ──
function renderCollItems(grid){
  const section=title=>{
    const heading=document.createElement('div');
    heading.className='coll-section-heading';heading.textContent=title;grid.appendChild(heading);
  };
  const showBuffDetail=(spec,className,color)=>{
    const icon=collItemIcon(spec,className);
    const tiers=RARITIES.map(r=>`<div class="coll-boon-rarity" style="--rarity-color:${RARITY_COLORS[r]}"><div class="coll-boon-rarity-name">${RARITY_NAMES[r].toUpperCase()}</div><div class="coll-boon-rarity-value">${campaignShopBuffDescription(spec,r)}</div></div>`).join('');
    const det=document.getElementById('coll-detail');det.className='coll-detail visible';
    det.innerHTML=`<div class="coll-det-header"><div class="coll-det-icon">${collIconHtml(icon,54)}</div><div class="coll-det-info"><div class="coll-det-name">${spec.name}</div><div class="coll-det-type">${className}</div><div class="coll-det-kills">Compra única por campanha</div></div></div><div class="coll-det-divider"></div><div class="coll-boon-rarity-grid">${tiers}</div>`;
  };
  const classNames={mage:'Mago',warrior:'Guerreiro',archer:'Arqueiro',viking:'Viking',necromancer:'Necromante'};
  const classColors={mage:'#b35cff',warrior:'#f05a42',archer:'#48d878',viking:'#e7b44a',necromancer:'#70d98b'};
  section('RELIQUIAS DE CLASSE');
  Object.entries(CAMPAIGN_CLASS_BUFFS).forEach(([classId,specs])=>specs.forEach(spec=>{
    const icon=collItemIcon(spec,classId);
    const card=collCard(icon,spec.name,classNames[classId],false,()=>showBuffDetail(spec,classNames[classId],classColors[classId]),null,classColors[classId]);
    const badge=document.createElement('div');badge.className='coll-weapon-class';badge.style.color=classColors[classId];badge.textContent=classNames[classId];card.appendChild(badge);grid.appendChild(card);
  }));
  section('ITENS UNIVERSAIS DA LOJA');
  CAMPAIGN_UNIVERSAL_ITEMS.forEach(spec=>{
    const icon=collItemIcon(spec);
    grid.appendChild(collCard(icon,spec.name,'Universal',false,()=>showBuffDetail(spec,'Item universal','#e4c65a'),null,'#e4c65a'));
  });
  if(Array.isArray(window.DNG_RELICS)){
    section('RELIQUIAS DA DUNGEON');
    window.DNG_RELICS.forEach(it=>{
      const icon=codexRelicIcon(`dng_relic_${it.id}`,'#63d8d1')||collItemIcon(it);
      grid.appendChild(collCard(icon,it.name,`${it.price} moedas`,false,()=>{
        const det=document.getElementById('coll-detail');det.className='coll-detail visible';
        det.innerHTML=`<div class="coll-det-header"><div class="coll-det-icon">${collIconHtml(icon,54)}</div><div class="coll-det-info"><div class="coll-det-name">${it.name}</div><div class="coll-det-type">Relíquia da Dungeon</div></div></div><div class="coll-det-divider"></div><div style="font-size:14px;color:#a9c8bd;line-height:1.7;">${it.desc}</div><div style="font-size:12px;color:#5f8c80;margin-top:8px;">Disponível no Ferreiro por ${it.price} moedas.</div>`;
      },null,'#63d8d1'));
    });
  }
  if(Array.isArray(window.DNG_RING_TYPES)){
    section('ANEIS DA DUNGEON');
    window.DNG_RING_TYPES.forEach(it=>{
      const icon=codexRelicIcon(`dng_ring_${it.id}`,'#a875ef')||collGameIcon('ring');
      grid.appendChild(collCard(icon,it.name,'Equipável',false,()=>{
        const det=document.getElementById('coll-detail');det.className='coll-detail visible';
        det.innerHTML=`<div class="coll-det-header"><div class="coll-det-icon">${collIconHtml(icon,54)}</div><div class="coll-det-info"><div class="coll-det-name">${it.name}</div><div class="coll-det-type">Anel da Dungeon</div></div></div><div class="coll-det-divider"></div><div style="font-size:14px;color:#bda7d8;line-height:1.7;">Anel equipável encontrado durante as expedições. Seus atributos escalam com a raridade e o piso.</div>`;
      },null,'#a875ef'));
    });
  }
}

// ── BESTIÁRIO ──
const BESTIARY=[
  {id:'runner_goblin',  icon:'👺',name:'Goblin Corredor',   biome:'Castelo', color:'#3db830',hp:30,hpGrow:8,  dmg:6, dmgGrow:0.8, spr:()=>GOB_DOWN[0], pal:()=>PAL_GOBLIN, art:'assets/enemies/goblin/codex.png'},
  {id:'shield_orc',     icon:'🛡️',name:'Orc Escudeiro',     biome:'Castelo', color:'#4a8c30',hp:55,hpGrow:12, dmg:10,dmgGrow:1.2, spr:()=>ORC_DOWN[0], pal:()=>PAL_ORC, art:'assets/enemies/shieldorc/codex.png'},
  {id:'archer_skeleton',icon:'💀',name:'Esqueleto Arqueiro', biome:'Castelo', color:'#ece4cc',hp:25,hpGrow:6,  dmg:8, dmgGrow:1.0, spr:()=>SKL_DOWN[0], pal:()=>PAL_SKELETON, art:'assets/enemies/skelarcher/codex.png'},
  {id:'spitting_spider',icon:'🕷️',name:'Aranha Cuspidora',  biome:'Floresta',color:'#888858',hp:35,hpGrow:9,  dmg:7, dmgGrow:0.9, spr:()=>SPD[0], pal:()=>PAL_SPIDER, art:'assets/enemies/spider2/codex.png'},
  {id:'corrupt_ent',    icon:'🌳',name:'Ent Corrompido',     biome:'Floresta',color:'#4a8228',hp:80,hpGrow:18, dmg:12,dmgGrow:1.5, spr:()=>ENT_SPR[0], pal:()=>PAL_ENT, art:'assets/enemies/ent/codex.png'},
  {id:'hungry_wolf',    icon:'🐺',name:'Lobo Faminto',       biome:'Floresta',color:'#888070',hp:40,hpGrow:10, dmg:14,dmgGrow:1.8, spr:()=>WOLF_SPR[0], pal:()=>PAL_WOLF, art:'assets/enemies/wolf/codex.png'},
  {id:'shroom',         icon:'🍄',name:'Cogumelo Esporo',    biome:'Floresta',color:'#cc2a24',hp:50,hpGrow:8,  dmg:12,dmgGrow:1.2, spr:()=>SHROOM_SPR[0], pal:()=>PAL_SHROOM, art:'assets/enemies/shroom/codex.png'},
  {id:'ice_zombie',     icon:'🧟',name:'Zumbi de Gelo',      biome:'Neve',    color:'#9abcbc',hp:45,hpGrow:10, dmg:8, dmgGrow:1.0, spr:()=>SNOW_ZOMBIE[0], pal:()=>PAL_SNOW_ZOMBIE, art:'assets/enemies/icezombie/codex.png'},
  {id:'crystal_golem',  icon:'💎',name:'Golem de Cristal',   biome:'Neve',    color:'#a8d8f8',hp:100,hpGrow:22,dmg:15,dmgGrow:2.0, spr:()=>ICE_GOLEM[0], pal:()=>PAL_ICE_GOLEM, art:'assets/enemies/crystalgolem/codex.png'},
  {id:'wind_specter',   icon:'👻',name:'Espectro dos Ventos',biome:'Neve',    color:'#9898cc',hp:30,hpGrow:7,  dmg:10,dmgGrow:1.2, spr:()=>SPECTER_SPR[0], pal:()=>PAL_SPECTER, art:'assets/enemies/windspecter/codex.png'},
  {id:'sand_worm_small',icon:'🪱',name:'Verme de Areia',     biome:'Deserto', color:'#d4a830',hp:60,hpGrow:14, dmg:12,dmgGrow:1.5, spr:()=>WORM_SPR[0], pal:()=>PAL_WORM, art:'assets/enemies/sandworm2/codex.png'},
  {id:'cultist',        icon:'🧙',name:'Cultista',           biome:'Deserto', color:'#cc3300',hp:35,hpGrow:8,  dmg:18,dmgGrow:2.2, spr:()=>CULTIST_SPR[0], pal:()=>PAL_CULTIST, art:'assets/enemies/cultist/codex.png'},
  {id:'obsidian_scorpion',icon:'🦂',name:'Escorpião Obsidiana',biome:'Deserto',color:'#c8742c',hp:50,hpGrow:11,dmg:16,dmgGrow:2.0, spr:()=>SCORPION_SPR[0], pal:()=>PAL_SCORPION, art:'assets/enemies/scorpion/codex.png'},
  {id:'fire_imp',       icon:'😈',name:'Diabrete de Fogo',   biome:'Vulcão',  color:'#cc2200',hp:30,hpGrow:7,  dmg:20,dmgGrow:2.5, spr:()=>IMP_SPR[0], pal:()=>PAL_IMP, art:'assets/enemies/fireimp/codex.png'},
  {id:'demon_knight',   icon:'⚔️',name:'Cavaleiro Demônio',  biome:'Vulcão',  color:'#880030',hp:90,hpGrow:20, dmg:22,dmgGrow:2.8, spr:()=>DKNIGHT_SPR[0], pal:()=>PAL_DKNIGHT, art:'assets/enemies/demonknight/codex.png'},
  {id:'lava_bat',       icon:'🦇',name:'Morcego de Lava',    biome:'Vulcão',  color:'#cc3800',hp:25,hpGrow:6,  dmg:12,dmgGrow:1.4, spr:()=>LAVABAT_SPR[0], pal:()=>PAL_LAVABAT, art:'assets/enemies/lavabat/codex.png'},
];
function renderCollEnemies(grid){
  BESTIARY.forEach(e=>{
    const killed=(defeatedEnemies[e.id]||0)>0;
    // A arte real dos inimigos, a mesma que o jogo desenha. O Codex mostrava
    // o desenho procedural antigo, que virou reserva para quem nao tem arte.
    const eIcon=e.art?{artPath:e.art,color:e.color}
                :e.spr?{spr:e.spr(),pal:e.pal()}:collGameIcon('skull');
    grid.appendChild(collCard(eIcon,e.name,killed?e.biome+' × '+(defeatedEnemies[e.id]):'???',!killed,killed?()=>showCollEnemyDetail(e):null,null,e.color));
  });
}
/* Vida e dano vem de statsInimigo(), a mesma tabela que o jogo usa para
   criar o inimigo. Os campos hp/hpGrow/dmg/dmgGrow das entradas abaixo eram
   uma copia a mao e sairam de sincronia: 15 dos 16 anunciavam numero que o
   jogo nao entregava. Ficam como reserva, para o caso de a tabela nao estar
   carregada (o Codex tambem abre pelo menu, antes de comecar a partida). */
function statsCodex(e){
  if(typeof statsInimigo!=='function') return e;
  const a=statsInimigo(1,e.id), b=statsInimigo(2,e.id);
  if(!a||!b) return e;
  // Arredonda: 24.4-22.2 da' 2.1999999999999993 em ponto flutuante, e isso
  // ia parar na tela como "+2.1999999999999993 dano por onda".
  const r=v=>Math.round(v*100)/100;
  const hpGrow=r(b.hp-a.hp), dmgGrow=r(b.dmg-a.dmg);
  return {...e, hp:r(a.hp-hpGrow), hpGrow, dmg:r(a.dmg-dmgGrow), dmgGrow};
}
function showCollEnemyDetail(e0){
  const e=statsCodex(e0);
  const det=document.getElementById('coll-detail'); det.className='coll-detail visible';
  const enemyIcon=e.art?{artPath:e.art,color:e.color}
                  :e.spr?{spr:e.spr(),pal:e.pal()}:collGameIcon('skull');
  const kills=defeatedEnemies[e.id]||0;
  const hpMax=e.hp+25*e.hpGrow;
  const hpBars=Array.from({length:25},(_,i)=>{const hp=Math.round(e.hp+(i+1)*e.hpGrow);const pct=Math.min(100,Math.round(hp/hpMax*100));return `<div class="coll-chart-bar" style="height:${pct}%;background:${e.color}bb" title="Onda ${i+1}: ${hp} HP"></div>`;}).join('');
  // A Aranha Cuspidora nao causa dano nenhum: sem dano de contato, e a teia
  // dela so' reduz velocidade. Sem esta guarda o grafico dividia 0 por 0 e
  // saia com height:NaN%.
  const dmgMax=e.dmg+25*e.dmgGrow;
  const semDano=!(dmgMax>0);
  const dmgBars=semDano?'':Array.from({length:25},(_,i)=>{const dmg=Math.round((e.dmg+(i+1)*e.dmgGrow)*10)/10;const pct=Math.min(100,Math.round(dmg/dmgMax*100));return `<div class="coll-chart-bar" style="height:${pct}%;background:#cc444488" title="Onda ${i+1}: ${dmg} dmg"></div>`;}).join('');
  det.innerHTML=`<div class="coll-det-header"><div class="coll-det-icon">${collIconHtml(enemyIcon,54)}</div><div class="coll-det-info"><div class="coll-det-name">${e.name}</div><div class="coll-det-type">${e.biome}</div><div class="coll-det-kills">${kills} eliminados</div></div></div>`
    +`<div class="coll-det-stats">${collStatBar('Vida onda 1',Math.round(e.hp+e.hpGrow),300,'#44cc66')}${collStatBar('Dano onda 1',Math.round((e.dmg+e.dmgGrow)*10)/10,50,'#ff5555')}</div>`
    +`<div style="font-size:12px;color:#8a6830;margin-top:2px;">+${e.hpGrow} HP / +${e.dmgGrow} dano por onda</div>`
    +`<div class="coll-chart-wrap"><div class="coll-chart-title">VIDA POR ONDA (1-25)</div><div class="coll-chart">${hpBars}</div><div class="coll-chart-labels"><span>1</span><span>5</span><span>10</span><span>15</span><span>20</span><span>25</span></div></div>`
    +(semDano
      ?`<div class="coll-chart-wrap"><div class="coll-chart-title">DANO POR ONDA (1-25)</div><div style="font-size:12px;color:#8a6830;padding:6px 2px;">Não causa dano direto — atrapalha em vez de ferir.</div></div>`
      :`<div class="coll-chart-wrap"><div class="coll-chart-title">DANO POR ONDA (1-25)</div><div class="coll-chart">${dmgBars}</div><div class="coll-chart-labels"><span>1</span><span>5</span><span>10</span><span>15</span><span>20</span><span>25</span></div></div>`);
}

// ── CLASSES ──
function renderCollClasses(grid){
  Object.values(CLASS_DEFS).forEach(cd=>{
    const clsPal={'mage':()=>PAL_WIZARD,'warrior':()=>PAL_WARRIOR_P,'archer':()=>PAL_ARCHER_P,'viking':()=>PAL_VIKING_P,'necromancer':()=>PAL_NECROMANCER}[cd.id];
    const clsSet=(typeof HERO_IMG_SETS!=='undefined')?HERO_IMG_SETS[cd.id]:null;
    const clsIcon=clsSet
      ?{artPath:clsSet.base+(clsSet.icon||'icon.png')}
      :((typeof WIZ!=='undefined'&&clsPal)
        ?{spr:WIZ.down[0],pal:clsPal()}
        :collGameIcon(({mage:'orb',warrior:'sword',archer:'bow',viking:'axe',necromancer:'skull'})[cd.id]||'orb'));
    grid.appendChild(collCard(
      clsIcon,
      cd.name, cd.badge, false,
      ()=>{
        const det=document.getElementById('coll-detail');det.className='coll-detail visible';
        const col=cd.color;
        const statBars=[
          collStatBar('Vida',     cd.stats.vida,   100, '#44cc66'),
          collStatBar('Dano',     cd.stats.dano,   100, '#ff5555'),
          collStatBar('Velocidade',cd.stats.veloc, 100, '#44aaff'),
          collStatBar('Crítico',  cd.stats.crit,   100, '#ffcc44'),
        ].join('');
        const activeClassBuffs=(window.CAMPAIGN_CLASS_BUFFS?.[cd.id]||cd.shopItems);
        const itemList=activeClassBuffs.map(it=>`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          ${collIconHtml(collItemIcon(it,cd.id),28)}
          <div><div style="font-size:14px;color:#f0d080;">${it.name}</div><div style="font-size:11px;color:#7a6030;">${it.values?`Comum: ${campaignShopBuffDescription(it,'common')} · Lendário: ${campaignShopBuffDescription(it,'legendary')}`:it.desc}</div></div>
          <span style="font-size:10px;color:#c8a84b;margin-left:auto;">ÚNICO</span>
        </div>`).join('');
        const universalItems=window.CAMPAIGN_UNIVERSAL_ITEMS||[];
        const universalList=universalItems.map(it=>`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
          ${collIconHtml(collItemIcon(it,'universal'),28)}
          <div><div style="font-size:14px;color:#79e89a;">${it.name}</div><div style="font-size:11px;color:#63806b;">Comum: ${campaignShopBuffDescription(it,'common')} · Lendário: ${campaignShopBuffDescription(it,'legendary')}</div></div>
          <span style="font-size:10px;color:#79e89a;margin-left:auto;">TODAS AS CLASSES</span>
        </div>`).join('');
        det.innerHTML=`
          <div style="border-bottom:2px solid ${col}44;padding-bottom:8px;margin-bottom:8px;">
            <div style="margin-bottom:4px;">${collIconHtml(clsIcon,54)}</div>
            <div style="font-size:24px;font-weight:bold;color:${col};letter-spacing:2px;">${cd.name}</div>
            <div style="font-size:12px;color:#5a4020;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;">${cd.badge}</div>
            <div style="font-size:12px;color:#a09060;line-height:1.6;">${cd.desc}</div>
          </div>
          <div class="coll-det-stats">${statBars}</div>
          <div style="background:rgba(0,0,0,0.3);border:1px solid ${col}33;border-radius:4px;padding:6px 8px;margin:6px 0;">
            <div style="font-size:12px;font-weight:bold;color:${col};letter-spacing:1px;margin-bottom:3px;">ᛞ HABILIDADE: ${cd.ability}</div>
            <div style="font-size:12px;color:#a09060;">${cd.abilityDesc}</div>
          </div>
          <div style="font-size:11px;color:#5a4020;letter-spacing:2px;margin:6px 0 4px;">BUFFS EXCLUSIVOS DA LOJA (${activeClassBuffs.length})</div>
          <div style="max-height:130px;overflow-y:auto;">${itemList}</div>
          <div style="font-size:11px;color:#4f7d5d;letter-spacing:2px;margin:10px 0 4px;">ITENS UNIVERSAIS DA LOJA (${universalItems.length})</div>
          <div style="max-height:130px;overflow-y:auto;">${universalList}</div>
        `;
      }
    , null, cd.color));
  });
}

// ── BOSSES ──
function renderCollBosses(grid){
  const BOSS_DATA=[
    {id:'brute',        icon:'🗿',name:'Brutamontes da Guerra', wave:4, biome:'Castelo', color:'#4a7a28',hp:1500,dmg:20.4,desc:'Arremessa pedras giratórias, Salto Esmagador em área marcada, soco de perto e entra em FÚRIA abaixo de 40% de vida (+55% velocidade).', art:'assets/bosses/orc/icon.png',statsNote:'Valores base da onda 4. A vida varia com a dificuldade e o cooperativo.'},
    {id:'skeleton_king',icon:'💀',name:'Rei Cadáver',      wave:5,  biome:'Castelo', color:'#ece4cc',hp:1100,dmg:43,desc:'Invoca esqueletos. Após o Giro Mortal, lança a espada em linha reta e ela retorna como bumerangue.', art:'assets/bosses/skelking/icon.png'},
    {id:'hunter_spider',icon:'🕷️',name:'Aranha Caçadora', wave:9, biome:'Floresta',color:'#b98bd8',hp:520,dmg:15.5,desc:'Persegue o herói e alterna mordidas com Fase Parcial, reaparecendo perto do alvo para atacar e desacelerar. Derrotá-la aumenta em 6% o tempo de recarga dos ataques de Aracne.',art:'assets/enemies/spider2/codex.png',statsNote:'Vida base: varia com a dificuldade e o cooperativo. Mordida: até 15,5 (limite de 13% da vida máxima do herói); ataque de fase: até 24 (limite de 18%).'},
    {id:'aracne',       icon:'🕷️',name:'Aracne Ancestral', wave:10, biome:'Floresta',color:'#aa66dd',hp:2100,dmg:60,desc:'Mordida de perto, cuspe de ovos e teia em cone. Se o primeiro Salto Predatório errar, salta novamente. A teia ampliada desacelera por 2,5s.', art:'assets/bosses/aracne/icon.png'},
    {id:'frost',        icon:'❄️',name:'Gigante de Gelo',  wave:15, biome:'Neve',    color:'#88ccee',hp:3650,dmg:98,desc:'Escudo 2000/1000 e +18 HP/s. Erupção: 60% do dano + 1s de gelo. Soco congela por 0,6s. Fim da nevasca: 0,6s.', art:'assets/bosses/icegolem/icon.png'},
    {id:'sandworm',     icon:'🪱',name:'Verme Devorador',  wave:20, biome:'Deserto', color:'#ffd22b',hp:5800,dmg:122,desc:'Mordida de perto, sumidouro ampliado, chuva e cuspe ácido. Mergulho a cada 7s, causando 50% do dano base.', art:'assets/bosses/sandworm/icon.png'},
    {id:'balrog',       icon:'🔥',name:'Balrog',           wave:25, biome:'Vulcão',  color:'#cc4400',hp:3000,dmg:60,desc:'Chicote Infernal em meia tela, chicotada curta de perto e chuva de meteoros. Abaixo de 30% entra em FÚRIA: dobra a velocidade e deixa rastro de fogo.', art:'assets/bosses/balrog/icon.png'},
  ];
  // A onda da campanha também revela os mini-chefes nos saves existentes;
  // o Brutamontes não depende de uma onda 30 fora dos cinco capítulos.
  const maxWave=SaveSystem.readNumber('mvh_max_wave',0);
  BOSS_DATA.forEach(b=>{
    const unlocked=maxWave>=b.wave;
    const bIcon=b.art?{artPath:b.art,color:b.color}
                     :b.spr?{spr:b.spr(),pal:b.pal()}:collGameIcon('skull');
    grid.appendChild(collCard(bIcon,b.name,'Onda '+b.wave,!unlocked,unlocked?()=>{
      const det=document.getElementById('coll-detail');det.className='coll-detail visible';
      det.innerHTML=`
        <div class="coll-det-header">
          <div class="coll-det-icon">${collIconHtml(bIcon,54)}</div>
          <div class="coll-det-info">
            <div class="coll-det-name">${b.name}</div>
            <div class="coll-det-type">${b.biome} · Onda ${b.wave}</div>
          </div>
        </div>
        <div style="font-size:12px;color:#a08050;line-height:1.7;margin:8px 0;">${b.desc}</div>
        ${b.statsNote?`<div style="font-size:12px;color:#a09060;line-height:1.6;margin:8px 0;">${b.statsNote}</div>`:''}
        <div class="coll-det-stats">
          ${collStatBar('Vida',b.hp,3000,'#44cc66')}
          ${collStatBar('Dano',b.dmg,60,'#ff5555')}
          ${collStatBar('Onda',b.wave,25,'#ffcc44')}
        </div>
      `;
    }:null,null,b.color));
  });
}

// ── PETS ──
function renderCollPets(grid){
  Object.values(PET_DEFS).forEach(def=>{
    const captured=!!capturedPets[def.id];
    const met=captured||SaveSystem.readText('mvh_pet_met_'+def.id,'')==='1';
    const petIcon=(typeof PET_IMG_SETS!=='undefined'&&PET_IMG_SETS[def.id])
      ?{artPath:'assets/pets/'+def.id+'/icon.png'}
      :((typeof PET_SPRITES!=='undefined'&&PET_SPRITES[def.id])?{spr:PET_SPRITES[def.id].idle,pal:PET_SPRITES[def.id].pal}:collGameIcon('shadow'));
    const bossIcon=(typeof PET_SPRITES!=='undefined'&&PET_SPRITES[def.id]?.boss)?{spr:PET_SPRITES[def.id].boss,pal:PET_SPRITES[def.id].pal}:petIcon;
    grid.appendChild(collCard(petIcon,def.name,captured?'✓ Capturado':met?'Encontrado':'???',!met,met?()=>{
      const det=document.getElementById('coll-detail');det.className='coll-detail visible';
      det.innerHTML=`
        <div style="text-align:center;margin-bottom:8px;">
          <div class="pet-form-pair">
            <div class="pet-form-preview wild"><span>FORMA SELVAGEM</span>${collIconHtml(bossIcon,78)}</div>
            <div class="pet-transform-arrow">→</div>
            <div class="pet-form-preview tame"><span>COMPANHEIRO</span>${collIconHtml(petIcon,62)}</div>
          </div>
          <div style="font-size:23px;font-weight:bold;color:#dd99ff;margin:3px 0;">${def.name}</div>
          <div style="font-size:12px;color:#6a3a8a;letter-spacing:2px;text-transform:uppercase;">${def.title}</div>
          ${captured?'<div style="font-size:12px;color:#44aa44;margin-top:4px;letter-spacing:1px;">✓ CAPTURADO</div>':'<div style="font-size:12px;color:#8a5a2a;margin-top:4px;">Não capturado ainda</div>'}
        </div>
        <div style="font-size:12px;color:#a08060;line-height:1.7;margin-bottom:8px;">${def.desc}</div>
        <div style="background:rgba(100,30,160,0.15);border:1px solid rgba(180,80,255,0.3);border-radius:4px;padding:7px 10px;">
          <div style="font-size:12px;color:#bb88ff;font-weight:bold;margin-bottom:3px;">ᛞ ${def.ability}</div>
          <div style="font-size:12px;color:#8a5aaa;">${def.abilityDesc}</div>
        </div>
        <div class="coll-det-stats" style="margin-top:8px;">
          ${collStatBar('HP Boss',def.bossHp,800,'#44cc66')}
          ${def.passiveSpeedBonus?collStatBar('Bônus Vel.',Math.round(def.passiveSpeedBonus*100),20,'#44aaff','%'):''}
          ${def.tick?collStatBar('Intervalo',def.tick/1000,6,'#ffcc44','s'):''}
        </div>
      `;
    }:null,null,def.color||"#b06ad0"));
  });
}

// ── BÊNÇÃOS ──
const CODEX_DEITY_ART=Object.freeze({
  zeus:{path:'assets/codex/blessings/zeus.png',color:'#ffd83d'},
  ares:{path:'assets/codex/blessings/ares.png',color:'#ff4c3d'},
  hecate:{path:'assets/codex/blessings/hecate.png',color:'#b866ff'},
  selene:{path:'assets/codex/blessings/selene.png',color:'#ffd765'},
  moros:{path:'assets/codex/blessings/moros.png',color:'#a866ff'},
  atena:{path:'assets/codex/blessings/atena.png',color:'#70d36d'},
  hermes:{path:'assets/codex/blessings/hermes.png',color:'#f0b34d'},
  dionisio:{path:'assets/codex/blessings/dionisio.png',color:'#9b54e8'},
  hefesto:{path:'assets/codex/blessings/hefesto.png',color:'#e0992a'},
  artemis:{path:'assets/codex/blessings/artemis.png',color:'#6bd65c'},
  poseidon:{path:'assets/codex/blessings/poseidon.png',color:'#45a9ff'},
  hercules:{path:'assets/codex/blessings/hercules.png',color:'#c28a52'},
  sauron:{path:'assets/codex/blessings/sauron.png',color:'#ff3b30'},
  nazgul:{path:'assets/codex/blessings/nazgul.png',color:'#9b58e6'},
  ents:{path:'assets/codex/blessings/ents.png',color:'#70c55b'}
});
function collDeityArtIcon(id){
  const art=CODEX_DEITY_ART[id];
  return art?{artPath:art.path,color:art.color}:collBlessingIcon({id:`${id}_codex`});
}
function renderCollBlessings(grid){
  const deities=Array.isArray(window.DEITY_BLESSINGS_V2)?window.DEITY_BLESSINGS_V2:[];
  const rarities=Array.isArray(window.DEITY_BLESSING_RARITIES)?window.DEITY_BLESSING_RARITIES:[
    {id:'comum',label:'COMUM',color:'#79e89a'},
    {id:'incomum',label:'INCOMUM',color:'#43d477'},
    {id:'rara',label:'RARA',color:'#58a8ff'},
    {id:'epica',label:'EPICA',color:'#c86cff'},
    {id:'lendaria',label:'LENDARIA',color:'#ffd35a'}
  ];
  const valueText=typeof window.formatDeityBlessingValue==='function'
    ?window.formatDeityBlessingValue
    :(boon,value)=>`+${Math.round(value*100)}%`;
  deities.forEach(deity=>{
    const boons=Array.isArray(deity.boons)?deity.boons:[];
    const godIcon=collDeityArtIcon(deity.id);
    grid.appendChild(collCard(godIcon, deity.name, `${boons.length} bênçãos`, false, ()=>{
      const det=document.getElementById('coll-detail');det.className='coll-detail visible';
      const boonHtml=boons.map(boon=>{
        const rarityHtml=rarities.map((rarity,index)=>{
          const value=boon.values?.[index]??0;
          return `<div class="coll-boon-rarity" style="--rarity-color:${rarity.color}">
            <div class="coll-boon-rarity-name">${rarity.label}</div>
            <div class="coll-boon-rarity-value">${valueText(boon,value,index)}</div>
          </div>`;
        }).join('');
        return `<div class="coll-boon-card" style="--boon-color:${rarities[rarities.length-1].color}">
          <div class="coll-boon-head">
            ${collIconHtml(collBlessingIcon(boon),30)}
            <div class="coll-boon-title">
              <div class="coll-boon-name">${boon.name}</div>
              <div class="coll-boon-role">${boon.role||'DANO'}</div>
            </div>
          </div>
          <div class="coll-boon-desc">${boon.desc}</div>
          <div class="coll-boon-rarity-grid">${rarityHtml}</div>
        </div>`;
      }).join('');
      det.innerHTML=`<div class="coll-det-header">
        <div class="coll-det-icon">${collIconHtml(godIcon,48)}</div>
        <div class="coll-det-info">
          <div class="coll-det-name">${deity.name}</div>
          <div class="coll-det-type">${deity.title}</div>
          <div class="coll-det-kills">${boons.length} bênçãos · ${rarities.length} raridades</div>
        </div>
      </div><div class="coll-det-divider"></div>${boonHtml}`;
    }, null, godIcon.color||'#c8a84b'));
  });
}

// ── DUNGEON ──
function renderCollDungeon(grid){
  const dungeonIcon=(id,color='#e0992a')=>({artPath:`assets/codex/dungeons/${id}.png`,color});
  const dngInfo=[
    {icon:dungeonIcon('dungeon_exploration','#69cf5f'),name:'Exploração',    hint:'4 biomas',  detail:{title:'Exploração de Dungeons',desc:'Salas procedurais com névoa de guerra em 4 biomas — Masmorra, Gelo, Pântano e Fogo. Visual, inimigos e bosses mudam conforme você desce. Pisos infinitos, dificuldade crescente.', extra:''}},
    {icon:dungeonIcon('dungeon_enemies','#73d65d'),name:'Inimigos',       hint:'23 tipos',  detail:{title:'Inimigos da Dungeon',desc:'Goblins, esqueletos, orcs, trolls, aranhas, lobos, cultistas, tigres da neve, espectros, ents corrompidos, escorpiões, diabretes, cavaleiros demônio, morcegos de lava e mais — cada bioma tem seu próprio elenco.',extra:collStatBar('Variedade',23,23,'#ff5555')}},
    {icon:dungeonIcon('dungeon_bosses','#9b58e6'),name:'Bosses',          hint:'19 bosses', detail:{title:'Bosses da Dungeon',desc:'Rei Cadáver, Orc Sombrio, Troll Antigo, Ogro Pálido (Clavada que empurra e atordoa!), Troll das Cavernas (arremessa pedregulhos e varre com a clava!), Rainha Arainha, Lich Glacial, Lobo Alfa, Tigre Ancestral, Ent Ancião, Escorpião-Rei, Cavaleiro do Abismo e outros. Cada um nasce com raridade (comum → lendária) que multiplica força e recompensa. HIPER BOSS: do piso 3 em diante, o HORROR RÚNICO pode despertar (marcado em LARANJA no mapa) — 4 ataques rotativos, 3× mais vida, e derrotá-lo garante armadura LENDÁRIA + anel épico/lendário + cura vital!',extra:collStatBar('Força',5,5,'#cc44ff')}},
    {icon:dungeonIcon('dungeon_equipment','#c9d5da'),name:'Equipamento',    hint:'Tecla C',   detail:{title:'Armaduras & Anéis',desc:'Elmos, peitorais e botas (Couro → Dragônico) + 7 tipos de anéis (Fúria, Vampírico, Crítico, Ganância, Vitalidade, Pressa, Regeneração) em 5 raridades. Caem de baús (45%) e bosses (60%). Abra o menu [I] → aba Personagem para equipar, vender e ver os bônus totais.',extra:''}},
    {icon:dungeonIcon('dungeon_shadows','#9b58e6'),name:'Sombras',        hint:'Tecla E',   detail:{title:'Exército de Sombras',desc:'Derrote um boss e pressione ESPAÇO para extraí-lo como Sombra aliada que luta ao seu lado. [E] abre o painel: upgrades de dano/vida/velocidade e FUSÃO — duas sombras iguais viram uma de raridade superior.',extra:''}},
    {icon:dungeonIcon('dungeon_crafting','#d29a56'),name:'Crafting',        hint:'Tecla T',   detail:{title:'Crafting de Exploração',desc:'Materiais coletados na dungeon viram itens úteis na aba Crafting do menu unificado [I].',extra:''}},
    {icon:dungeonIcon('dungeon_chests','#d9a34b'),name:'Baús',           hint:'Recompensa',detail:{title:'Baús do Tesouro',desc:'Restauram 14% da vida máxima, concedem moedas (escalam com o piso) e têm 45% de chance de trazer um equipamento — armadura ou anel com raridade rolada.',extra:''}},
    {icon:dungeonIcon('dungeon_stairs','#69c85b'),name:'Escadas',        hint:'Progresso', detail:{title:'Escadas para o Próximo Piso',desc:'Aparecem após derrotar o boss do piso. Descer cura 30% da vida e aumenta HP máximo — mas os inimigos escalam junto.',extra:''}},
    {icon:dungeonIcon('dungeon_shops','#d69c5d'),name:'Mercador & Ferreiro',hint:'Lojas', detail:{title:'Mercador & Ferreiro',desc:'O Mercador vende armas por raridade; o Ferreiro vende poções, elixires e relíquias. Preços escalam com o piso e o botão ATUALIZAR rerola as ofertas por moedas.',extra:''}},
    {icon:dungeonIcon('dungeon_relics','#59cf6f'),name:'Relíquias',      hint:'Especial',  detail:{title:'Relíquias',desc:'Efeitos passivos permanentes para a run: vampirismo, escudo, crítico, ouro extra, regeneração e mais.',extra:''}},
    {icon:dungeonIcon('dungeon_minimap','#58bce8'),name:'Minimapa',       hint:'Navegação', detail:{title:'Minimapa',desc:'Revela salas exploradas em tempo real. Inimigos aparecem como pontos vermelhos, o boss como ponto roxo, escada e baús marcados.',extra:''}},
  ];
  dngInfo.forEach(d=>{
    grid.appendChild(collCard(d.icon,d.name,d.hint,false,()=>{
      const det=document.getElementById('coll-detail');det.className='coll-detail visible';
      det.innerHTML=`
        <div style="margin-bottom:6px;">${collIconHtml(d.icon,54)}</div>
        <div style="font-size:21px;font-weight:bold;color:#f0d080;margin-bottom:4px;">${d.detail.title}</div>
        <div style="font-size:12px;color:#a08050;line-height:1.7;margin-bottom:8px;">${d.detail.desc}</div>
        ${d.detail.extra||''}
      `;
    }, null, d.icon.color||'#e0992a'));
  });
}

let _killSaveTimer=null;
function trackEnemyKill(type){
  defeatedEnemies[type]=(defeatedEnemies[type]||0)+1;
  // FIX: gravar no localStorage a CADA abate travava o frame (tela "piscava").
  // Agora acumula e salva com debounce de 2.5s.
  if(_killSaveTimer) return;
  _killSaveTimer=setTimeout(()=>{
    _killSaveTimer=null;
    SaveSystem.writeJSON('mvh_enemies',defeatedEnemies);
  },2500);
}

// ═══════════════════════════════════════════════════════
