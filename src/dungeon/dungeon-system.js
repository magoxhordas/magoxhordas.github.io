// DUNGEON MODE — v3: responsivo + visual por arma
// ═══════════════════════════════════════════════════════
(function(){

// ── Constantes ──
const T_VOID=0,T_FLOOR=1,T_WALL=2,T_STAIRS=3,T_CHEST=4,T_TORCH=5,T_BARREL=6,T_MERCHANT=7;
// BOSQUE DA FENDA (MVP) — tiles novos
const T_PORTAL=8,T_RETURN=9,T_RWOOD=10,T_RSTONE=11,T_RORE=12,T_RESS=13,T_RFOOD=14,T_NPCF=15,T_NPCC=16,T_NPCM=17,T_STORAGE=18;
const DTS=40,MW=50,MH=50;
// Recursos do Bosque + persistencia
const MVP_KEY='magoVsHordas_MVP_Save';
const MVP_RES=[['madeira','🪵'],['pedra','🪨'],['minerio','⛏️'],['essencia','✨'],['comida','🍄']];
const MVP_NODES={ [T_RWOOD]:{res:'madeira',lo:1,hi:3}, [T_RSTONE]:{res:'pedra',lo:1,hi:3}, [T_RORE]:{res:'minerio',lo:1,hi:2,ess:0.25}, [T_RESS]:{res:'essencia',lo:1,hi:2}, [T_RFOOD]:{res:'comida',lo:1,hi:3} };
// NPCs do Bosque (dialogos, upgrades, missoes) — AJUSTE textos/custos aqui
const MVP_NPCS={
  ferreiro:{ name:'Brann Ferro-Brasa', role:'Ferreiro', icon:'⚒️', col:'#ff8a3a', tile:T_NPCF,
    intro:'Entao voce e o mago que segura as hordas sozinho? Hm. Traga ferro, madeira e um pouco de vergonha na cara, que eu faco seu poder bater mais forte.',
    def:'Trouxe material ou veio so esquentar as maos na minha forja?',
    upgName:'Fio da Lamina Arcana', upgDesc:'+10% de dano por nivel',
    costs:[{madeira:5,pedra:3},{madeira:8,pedra:5,minerio:2},{pedra:10,minerio:5,essencia:2}],
    missName:'Sangue e Ferro', missDesc:'Derrote 12 inimigos.', missKind:'enemy', missTarget:12, missReward:{minerio:4} },
  curandeira:{ name:'Liora Erva-Lua', role:'Curandeira', icon:'🌿', col:'#6fe08a', tile:T_NPCC,
    intro:'Voce voltou coberto de poeira e teimosia. Traga comida e essencia, e eu mantenho voce respirando.',
    def:'Feridas contam historias. Mas algumas nao precisam terminar cedo.',
    upgName:'Infusao Vital', upgDesc:'+10 de vida maxima por nivel',
    costs:[{comida:5,madeira:2},{comida:8,essencia:2},{comida:10,essencia:4,minerio:3}],
    missName:'Raizes e Cinzas', missDesc:'Derrote 8 inimigos e volte vivo.', missKind:'enemy', missTarget:8, missReward:{comida:6} },
  mestre:{ name:'Mestre Merlin', role:'Guardiao das Runas', icon:'🔮', col:'#b58cff', tile:T_NPCM,
    intro:'O Coracao Runico despertou quando voce chegou. As hordas vazam de uma fenda antiga. Traga essencia — a magia lembra o que os homens esquecem.',
    def:'O bosque sussurra seu nome. Voce vai responder com medo ou com preparo?',
    upgName:'Eco Runico', upgDesc:'+15% de recursos coletados por nivel',
    costs:[{essencia:3,pedra:3},{essencia:6,minerio:5},{essencia:10,minerio:5,comida:5}],
    missName:'Selo Partido', missDesc:'Derrote 1 chefe da dungeon.', missKind:'boss', missTarget:1, missReward:{essencia:5} },
};
function mvpLoad(){ try{ const o=SaveSystem.readJSON(MVP_KEY,{});
  return { res:Object.assign({madeira:0,pedra:0,minerio:0,essencia:0,comida:0}, o.res||{}),
    upg:Object.assign({ferreiro:0,curandeira:0,mestre:0}, o.upg||{}),
    talked:Object.assign({ferreiro:false,curandeira:false,mestre:false}, o.talked||{}),
    missions:o.missions||{}, potions:o.potions||0, mats:o.mats||{} };
}catch(e){ return {res:{madeira:0,pedra:0,minerio:0,essencia:0,comida:0},upg:{ferreiro:0,curandeira:0,mestre:0},talked:{ferreiro:false,curandeira:false,mestre:false},missions:{},potions:0,mats:{}}; } }
function mvpSave(){ SaveSystem.writeJSON(MVP_KEY,MVP); }
function mvpOnKill(kind){ let changed=false; for(const id in MVP_NPCS){ const m=MVP.missions[id]; const d=MVP_NPCS[id]; if(!m||!m.accepted||m.done) continue; if(d.missKind!==kind) continue; if(m.progress<d.missTarget){ m.progress++; changed=true; } } if(changed){ mvpSave(); if(typeof DNG!=='undefined'&&DNG._updateMissionHud) DNG._updateMissionHud(); } }
let MVP=mvpLoad();
// MATERIAIS distintos por bioma (bau de armazenamento)
const MAT_CAT_ORDER=['Madeiras','Pedras','Minérios','Cristais','Comida'];
const MAT_RAR_COL={common:'#aaaaaa',uncommon:'#43c443',rare:'#4488ff',epic:'#cc66ff',legendary:'#ffcc00'};
const MATERIALS={
  madeira:{base:'madeira',name:'Madeira',icon:'🪵',cat:'Madeiras',rar:'common',biome:'Floresta',desc:'Madeira natural. Base de tudo que se constroi.'},
  madeira_gelo:{base:'madeira',name:'Madeira Congelada',icon:'🪵',cat:'Madeiras',rar:'uncommon',biome:'Gelo',desc:'Rija e gelida, cortada sob a neve.'},
  madeira_fogo:{base:'madeira',name:'Madeira Chamuscada',icon:'🪵',cat:'Madeiras',rar:'uncommon',biome:'Fogo',desc:'Tronco carbonizado, ainda morno.'},
  madeira_corr:{base:'madeira',name:'Madeira Corroida',icon:'🪵',cat:'Madeiras',rar:'uncommon',biome:'Corrosao',desc:'Deformada pela corrupcao da fenda.'},
  pedra:{base:'pedra',name:'Pedra',icon:'🪨',cat:'Pedras',rar:'common',biome:'Floresta',desc:'Rocha firme para reforcar estruturas.'},
  pedra_gelo:{base:'pedra',name:'Pedra Congelada',icon:'🪨',cat:'Pedras',rar:'uncommon',biome:'Gelo',desc:'Coberta de gelo, dura e escorregadia.'},
  pedra_fogo:{base:'pedra',name:'Pedra Vulcanica',icon:'🪨',cat:'Pedras',rar:'uncommon',biome:'Fogo',desc:'Porosa, com veios de lava adormecida.'},
  pedra_corr:{base:'pedra',name:'Pedra Corroida',icon:'🪨',cat:'Pedras',rar:'uncommon',biome:'Corrosao',desc:'Quebradica e coberta de mofo toxico.'},
  minerio:{base:'minerio',name:'Minerio',icon:'⛏️',cat:'Minérios',rar:'uncommon',biome:'Floresta',desc:'Metal frio. O ferreiro sabe usar.'},
  minerio_fogo:{base:'minerio',name:'Minerio Igneo',icon:'⛏️',cat:'Minérios',rar:'rare',biome:'Fogo',desc:'Metal fundido das profundezas.'},
  essencia:{base:'essencia',name:'Essencia',icon:'✨',cat:'Cristais',rar:'rare',biome:'Bosque',desc:'Vibra como um sussurro magico antigo.'},
  essencia_gelo:{base:'essencia',name:'Cristal Glacial',icon:'✨',cat:'Cristais',rar:'rare',biome:'Gelo',desc:'Essencia aprisionada em cristal de gelo.'},
  comida:{base:'comida',name:'Comida Selvagem',icon:'🍄',cat:'Comida',rar:'common',biome:'Floresta',desc:'Frutos e cogumelos. Liora faz maravilhas.'},
  comida_corr:{base:'comida',name:'Fungo Corrompido',icon:'🍄',cat:'Comida',rar:'uncommon',biome:'Corrosao',desc:'Comestivel... com muita cautela.'},
};
function matIdFor(base,mode){ const suf={ice:'_gelo',fire:'_fogo',toxic:'_corr'}[mode]||''; const id=base+suf; return MATERIALS[id]?id:base; }
function matName(id){ return MATERIALS[id]?MATERIALS[id].name:id; }
function spendMat(base,amt){ for(const id in MVP.mats){ if(amt<=0)break; const m=MATERIALS[id]; if(!m||m.base!==base)continue; const take=Math.min(MVP.mats[id],amt); MVP.mats[id]-=take; amt-=take; if(MVP.mats[id]<=0) delete MVP.mats[id]; } if(amt>0){ MVP.mats[base]=Math.max(0,(MVP.mats[base]||0)-amt); if(MVP.mats[base]<=0) delete MVP.mats[base]; } }
// ═══ MINERAÇÃO estilo Minecraft — nós por bioma ═══
const NODE_KINDS={
  tree:   {tool:'axe',     res:'madeira', hp:14, lo:1,hi:3, part:'#7a4a24'},
  rock:   {tool:'pickaxe', res:'pedra',   hp:18, lo:1,hi:3, part:'#78727f'},
  ore:    {tool:'pickaxe', res:'minerio', hp:24, lo:1,hi:2, part:'#6aa8ff', ess:0.2},
  bush:   {tool:'sickle',  res:'comida',  hp:8,  lo:1,hi:3, part:'#5aee6a'},
  crystal:{tool:'pickaxe', res:'essencia',hp:16, lo:1,hi:2, part:'#c8a0ff'},
};
const RES_ICON={madeira:'🪵',pedra:'🪨',minerio:'⛏️',essencia:'✨',comida:'🍄'};
const RES_NAME={madeira:'Madeira',pedra:'Pedra',minerio:'Minério',essencia:'Essência',comida:'Comida'};
// que armas contam como cada ferramenta (1ª da lista = ideal)
const TOOL_OK={ axe:['axe','sword'], pickaxe:['hammer','axe'], sickle:['dagger','sword','staff'] };
// pele/variação por bioma: sufixo do nome + tinta + partícula + tipos que surgem
function biomeSkin(b){ const n=b&&b.name;
  if(n==='Cavernas de Gelo') return {suf:' Congelada', tint:'#bfe4ff', part:'#e8f6ff', kinds:['tree','rock','crystal'], mode:'ice'};
  if(n==='Pântano Tóxico')   return {suf:' Corroída',  tint:'#8fe04a', part:'#8fe04a', kinds:['tree','bush','rock'],    mode:'toxic'};
  if(n==='Deserto de Fogo')  return {suf:' Chamuscada',tint:'#ff9a4a', part:'#ff7a20', kinds:['tree','rock','ore'],     mode:'fire'};
  if(n==='Bosque da Fenda')  return {suf:'',           tint:null,      part:'#8fe07a', kinds:['tree','rock','ore','crystal','bush'], mode:'bosque'};
  return {suf:'', tint:null, part:null, kinds:['tree','rock','ore','bush'], mode:'normal'}; // Dungeon
}
// ── Sprites pixel-art dos nós de recurso ──
const NSPR_TREE=["      DDDD      ","    DDLLLLDD    ","   DLLLLLLLLD   ","  DLLLlllLLLLD  ","  DLLlllllLLLD  "," DLLLlllllLLLLD "," DLLLLLlLLLLLLD "," DLLLLLLLLLLLLD ","  DLLLLLLLLLLD  ","   DLLLLLLLLD   ","    DDLLLLDD    ","      TttT      ","      TttT      ","      TttT      ","     TttttT     ","    TT    tT    "];
const NSPR_ROCK=["            Vv  ","         v vVv  ","        vVvVVv v","   DDD  vVVVVvVv","  DLLMD vVVVVVVv"," DLLLLMDVVVVVVX "," DMLLLLMDVVVVX  ","DMMMLLLLLMVVVX  ","DMMMMMLLLLMVVX  ","DDMMMMMMMLLMMD  "," DDDDDDDDDDDDD  "];
const NSPR_ORE=["     XXXX    ","    XYOOoX   ","   XYOOOOoX  ","  XYOOOOOOoX "," XXOoXOOoXOX "," XYOOoOOoOOoX","XYOOOOoOOOOoX","XOOoXOOoXOOoX","XOOOoXOoXOOoX","XoOOOOoOOOOoX"," XoooooooooX ","  XXXXXXXXX  "];
const NSPR_CRYS=["     XXX     ","    XWCcX    ","   XWCCCcX   ","  XWCCCCCcX  "," XWCCcXCCcX  "," XCCCcXCcXX  ","XWCCCCcCCCcX ","XCCcXCCcXCCX ","XCCCcXCcXCcX ","XcCCCCcCCCCX ","XCcXCCcXCCcX "," XcccccccccX ","  XXXXXXXXX  "];
const NSPR_BUSH=["    VvV    ","  vVVVVVv  "," vVVrVVVVv ","vVVVVVVrVVv","vVrVVVVVVVv"," vVVVVrVVv ","  vVVVVVv  ","    v v    "];
const NPAL={
  tree:{'D':'#2c7a30','L':'#4dbf4a','l':'#86d86a','T':'#5a3a1a','t':'#7a4a24'},
  rock:{'D':'#3f3c47','M':'#63606c','L':'#918e9a','V':'#43c443','v':'#237a23','X':'#2a2830'},
  ore:{'X':'#5a3208','O':'#e08a1a','o':'#a85c0e','Y':'#ffca4c'},
  crystal:{'X':'#1a5a6a','C':'#3ac8d8','c':'#1f8a9a','W':'#c8f4fa'},
  bush:{'V':'#43b043','v':'#237a23','r':'#e23a2a'},
};
const NSPR_BY={tree:NSPR_TREE,rock:NSPR_ROCK,ore:NSPR_ORE,crystal:NSPR_CRYS,bush:NSPR_BUSH};
// Sprites de nós — árvores grandes (PX3) + pedras por bioma
const NT_N=["       DDD       ","     DDLLLDD     ","    DLLLLLLLD    ","   DLLLlllLLLD   ","  DLLLllllllLLD  ","  DLLlllllllLLD  "," DLLLlllllllLLLD "," DLLLLlllllLLLLD "," DLLLLLLLLLLLLLD "," DLLLLLLLLLLLLLD ","  DLLLLLLLLLLLD  ","  DDLLLLLLLLLDD  ","   DDLLLLLLLDD   ","     DDLLLDD     ","       TtT       ","       TtT       ","      TTttT      ","      TttT       ","      TttT       ","     TtttT       ","    TT   ttT     ","   TT      TT    "];
const NT_I=["      SSSSS      ","    SSSDSDSSS    ","   SSDLLLLDSS    ","  SDLLlllLLDS    ","  DLLlllllLLD I  "," SDLLlllllLLLD   "," DLLLlllllLLLLD  "," DLLLLLLLLLLLLD  "," DLLLLLLLLLLLLD I","  DLLLLLLLLLLD   "," IDDLLLLLLLLDD   ","  I DDLLLLLDD  I ","     DDLLLDD     ","     I  I  I     ","       TtT       ","       TtT       ","      TTttT      ","      TttT       ","      TttT       ","     TtttT       ","    TT   ttT     ","   TT      TT    "];
const NT_F=["       K K       ","     K DLD  K    ","    KDLLK KDL    ","   DL K DK KLD   ","  K DLLK LDK e   ","   KDLDKKDLDK    ","  DLD K  K DLD   "," K K DLLLD K K   ","  DLD KDDK DLD   ","   K DLDLD K e   ","    KK KKK Ke    ","     K KtK K     ","      KtK        ","      KtK  E     ","      TtK        ","     ETtK        ","      TtK e      ","      TtK        ","     TttK        ","    TT KtK       ","    T    TK      ","   TT     TT     "];
const NT_C=["   K       K      ","    K  D  K K     ","   KDL K KDLK     ","  K K DLDK K L    ","   DLDK K KDL o   ","    K KDLDK K     ","  DLD K K K DL    ","   K KDLDLDK K    ","  K DL K K DLDo   ","   K K KDK K K    ","    KDL KKDLK     ","     K KtK K      ","      KtK o       ","      KtK         ","      TtK         ","      TtK  o      ","     TttK         ","     TtK          ","    TT KtK        ","    T   TtK       ","   TT    TT       ","  TT       T      "];
const NR_N=["            Vv  ","         v vVv  ","        vVvVVv v","   DDD  vVVVVvVv","  DLLMD vVVVVVVv"," DLLLLMDVVVVVVX "," DMLLLLMDVVVVX  ","DMMMLLLLLMVVVX  ","DMMMMMLLLLMVVX  ","DDMMMMMMMLLMMD  "," DDDDDDDDDDDDD  "];
const NR_I=["   S S  SS      ","  SSS SSSS      ","   DDDSS        ","  DLLWD  S      "," DLWLLMD S  S   "," DMLWLLMD       ","DMWMLLLLMW      ","DMMMWLLLLW      ","DDMMMMWLLMW     ","DDMMMMMMLMMD    "," DDDDDDDDDDD    "];
const NR_F=["   DDD          ","  DKKKD         "," DKKEKKD        "," DKEKKKKD       ","DKKKEKKKED      ","DKKKKKEKKKD     ","DKEKKKKKEKD     ","DKKKEKKKKKD     ","DDKKKKKEKKKD    ","DDKKKKKKKKKD    "," DDDDDDDDDDD    "];
const NR_C=["        oo      ","   DDD  omo     ","  DMMGD ommo    "," DMGMGGDooX     "," DGGMGGMDmo     ","DGMMGGGGMoo     ","DGGGMoGGGMo     ","DGGGGGoMGGD     ","DDGGoGGGGGD     ","DDGGGGGoGGD     "," DDDDDDDDDDD    "];
const NPAL2={
  tree_n:{'D':'#256a2a','L':'#3faf3c','l':'#7ad058','T':'#5a3a1a','t':'#7a4a24'},
  tree_i:{'D':'#5a8a8a','L':'#9fd0c8','l':'#eef8ff','S':'#ffffff','I':'#cfeaff','T':'#4a5e66','t':'#6a7e86'},
  tree_f:{'D':'#5a2a14','L':'#9a4a1a','K':'#1e1610','T':'#241a12','t':'#3a2818','E':'#ff6a20','e':'#ffcc44'},
  tree_c:{'D':'#5a6a1a','L':'#8aca2a','K':'#2a2818','T':'#3a3420','t':'#4a4428','o':'#aaff44'},
  rock_n:{'D':'#3f3c47','M':'#63606c','L':'#918e9a','V':'#43c443','v':'#237a23','X':'#2a2830'},
  rock_i:{'D':'#3a5a6a','M':'#6a8ca0','L':'#a8ccdc','W':'#eef8ff','S':'#ffffff','X':'#2a3a44'},
  rock_f:{'D':'#2a1810','K':'#3a2418','E':'#ff5a10'},
  rock_c:{'D':'#2a3420','M':'#4a5a34','G':'#5a6a3a','o':'#9aff3a'},
};
const NODE_SPR={
  tree:{normal:[NT_N,NPAL2.tree_n],bosque:[NT_N,NPAL2.tree_n],ice:[NT_I,NPAL2.tree_i],fire:[NT_F,NPAL2.tree_f],toxic:[NT_C,NPAL2.tree_c]},
  rock:{normal:[NR_N,NPAL2.rock_n],bosque:[NR_N,NPAL2.rock_n],ice:[NR_I,NPAL2.rock_i],fire:[NR_F,NPAL2.rock_f],toxic:[NR_C,NPAL2.rock_c]},
};
// Exposto ao modo campanha: desenha o MESMO sprite pixel-art de nó em qualquer canvas.
// kind: tree/rock/ore/crystal/bush · mode: normal/bosque/ice/fire/toxic · footY: pé do sprite
window.drawNodeSprite=function(c,kind,mode,x,footY,PX,palOver){
  let grid,pal;
  if((kind==='tree'||kind==='rock')&&NODE_SPR[kind]){ const v=NODE_SPR[kind][mode]||NODE_SPR[kind].normal; grid=v[0]; pal=v[1]; }
  else { grid=NSPR_BY[kind]||NSPR_ROCK; pal=NPAL[kind]||NPAL.rock; }
  if(palOver) pal=Object.assign({},pal,palOver);
  const gw=grid[0].length*PX, gh=grid.length*PX, ox=Math.round(x-gw/2), oy=Math.round(footY-gh);
  for(let r=0;r<grid.length;r++){ const row=grid[r];
    for(let cc=0;cc<row.length;cc++){ const ch=row[cc]; if(ch===' ')continue; const col=pal[ch]; if(!col)continue;
      c.fillStyle=col; c.fillRect(ox+cc*PX, oy+r*PX, PX, PX); } }
  return {w:gw,h:gh};
};

// ── Paletas por arma equipada ──
// Cada arma muda a coloração do herói (PAL_WIZARD como base)
const DNG_PAL_BY_WEAPON = {
  unarmed: PAL_WIZARD,  // resolvido em runtime
  sword:   null, // guerreiro — armadura
  bow:     null, // arqueiro — verde floresta
  axe:     null, // viking   — couro/fogo
  dagger:  null, // assassino — preto/roxo
  staff:   null, // mago puro — roxo/ouro
  hammer:  null, // paladino — dourado
};

function getDngHeroPal(equippedId){
  // Paletas dinamicamente referenciadas (definidas após load do jogo)
  switch(equippedId){
    case 'sword':   return PAL_WARRIOR_P;
    case 'bow':     return PAL_ARCHER_P;
    case 'axe':     return PAL_VIKING_P;
    case 'dagger':  return {
      'S':'#f8c878','s':'#e8a840','k':'#c07830',
      'R':'#1a1a2a','r':'#0e0e1a','L':'#3a2a5a','l':'#2a1a4a',
      'H':'#0a080e','h':'#141020','X':'#060408',
      'V':'#8800aa','v':'#660088',
      'W':'#ddddee','w':'#aaaacc',
      'O':'#cc00ff','o':'#8800cc','0':'#eec0ff',
      'B':'#3a3a3a','b':'#222222',
      'T':'#1a1020','t':'#2a1a30',
      'E':'#1a1a3a','e':'#aa00ff',
      'G':'#880099','g':'#660077','C':'#7700aa',
    };
    case 'staff':   return {
      'S':'#f8c878','s':'#e8a840','k':'#c07830',
      'R':'#3a0870','r':'#28044a','L':'#6a20b8','l':'#5010a0',
      'H':'#1a0830','h':'#220a38','X':'#100420',
      'V':'#cc66ff','v':'#aa44dd',
      'W':'#ddbbff','w':'#bb88ee',
      'O':'#ff88ff','o':'#dd44ee','0':'#ffccff',
      'B':'#eeeeee','b':'#cccccc',
      'T':'#2a1040','t':'#3a1a50',
      'E':'#1a1a3a','e':'#dd66ff',
      'G':'#ffaa00','g':'#cc8800','C':'#cc55ff',
    };
    case 'hammer':  return {
      'S':'#f8d090','s':'#e8b860','k':'#c89040',
      'R':'#887040','r':'#664e28','L':'#c8a060','l':'#aa8840',
      'H':'#d8c888','h':'#b8a860','X':'#887840',
      'V':'#ffaa00','v':'#dd8800',
      'W':'#e0e0f0','w':'#c0c0e0',
      'O':'#ffcc44','o':'#ddaa22','0':'#ffee99',
      'B':'#c8a840','b':'#a08828',
      'T':'#2a1808','t':'#3a2410',
      'E':'#1a1a2a','e':'#ffaa00',
      'G':'#ffdd44','g':'#ddbb22','C':'#ffcc00',
    };
    default: return PAL_WIZARD;
  }
}

// ── Frames de ataque por arma ──
// cast1/cast2 são os frames de ataque do WIZ
function getDngAttackFrameIdx(equippedId, attackPhase){
  // attackPhase: 0=idle, 1=swing1, 2=swing2
  if(!equippedId) return attackPhase===0?0:3;
  switch(equippedId){
    case 'sword': case 'axe': case 'hammer': case 'dagger':
      return attackPhase===0?0:(attackPhase===1?3:4); // melee usa cast frames
    case 'bow': case 'staff':
      return attackPhase===0?0:(attackPhase===1?3:4); // ranged usa cast frames
    default: return attackPhase===0?0:3;
  }
}

// ── Weapon definitions ──
const DNG_WPN_DEFS=[
  {id:'sword', icon:'⚔️',name:'Espada',  baseDmg:20,color:'#c8d8ff',desc:'Corpo a corpo — arco de 70px'},
  {id:'bow',   icon:'🏹',name:'Arco',    baseDmg:15,color:'#88cc44',desc:'Ranged — flechas velozes'},
  {id:'axe',   icon:'🪓',name:'Machado', baseDmg:18,color:'#ff8844',desc:'Área — giro em volta'},
  {id:'dagger',icon:'🗡️',name:'Adaga',  baseDmg:12,color:'#cc88ff',desc:'Duplo ataque rápido'},
  {id:'staff', icon:'🔮',name:'Cajado',  baseDmg:22,color:'#dd44ff',desc:'Projétil mágico'},
  {id:'hammer',icon:'🔨',name:'Martelo', baseDmg:28,color:'#ffcc44',desc:'Stun ao acertar'},
];
const DNG_RAR=['common','uncommon','rare','epic','legendary'];
const DNG_RNAME={common:'Comum',uncommon:'Incomum',rare:'Raro',epic:'Épico',legendary:'Lendário'};
const DNG_RCOL={common:'#aaaaaa',uncommon:'#22dd66',rare:'#44aaff',epic:'#cc66ff',legendary:'#ffcc00'};
const DNG_RMULT={common:1,uncommon:1.4,rare:1.9,epic:2.6,legendary:3.5};
function rollDngRarity(fl){const r=Math.random();if(r<0.38)return'common';if(r<0.68)return'uncommon';if(r<0.87)return'rare';if(r<0.96)return'epic';return'legendary';}
function nextDngRarity(r){const i=DNG_RAR.indexOf(r);return i<DNG_RAR.length-1?DNG_RAR[i+1]:r;}
function makeDngWeapon(id,rarity,fl){
  const def=DNG_WPN_DEFS.find(d=>d.id===id)||DNG_WPN_DEFS[Math.floor(Math.random()*DNG_WPN_DEFS.length)];
  return{defId:def.id,icon:def.icon,name:def.name,rarity,dmg:Math.round(def.baseDmg*(DNG_RMULT[rarity]||1)*(1+(fl-1)*0.08)),color:def.color,desc:def.desc,upgrades:0};
}
function dngWeaponPixelKind(item){
  const id=typeof item==='string'?item:(item?.defId||item?.id||'');
  return ({sword:'sword',bow:'bow',axe:'axe',dagger:'sword',staff:'orb',hammer:'hammer'})[id]||'sword';
}

// ── Relics ──
// ═══ EQUIPAMENTOS: armaduras + anéis (menu Personagem [C]) ═══
const DNG_GEAR_VAL={common:4,uncommon:9,rare:16,epic:30,legendary:55};
const DNG_ARMOR_MATS={common:'de Couro',uncommon:'de Ferro',rare:'de Aço Élfico',epic:'Rúnico',legendary:'Dragônico'};
const DNG_ARMOR_MATS_F={common:'de Couro',uncommon:'de Ferro',rare:'de Aço Élfico',epic:'Rúnica',legendary:'Dragônica'};
function makeDngArmor(slot,rarity,fl){
  const m=DNG_RMULT[rarity]||1;
  if(slot==='helmet') return {kind:'armor',slot,icon:'🪖',name:'Elmo '+DNG_ARMOR_MATS[rarity],rarity,
    stats:{armor:Math.round((1+fl*0.25)*m),hp:Math.round(8*m)}};
  if(slot==='chest') return {kind:'armor',slot,icon:'🛡️',name:'Peitoral '+DNG_ARMOR_MATS[rarity],rarity,
    stats:{armor:Math.round((2+fl*0.35)*m),hp:Math.round(16*m)}};
  return {kind:'armor',slot:'boots',icon:'🥾',name:'Botas '+DNG_ARMOR_MATS_F[rarity],rarity,
    stats:{armor:Math.round((0.5+fl*0.15)*m),spd:+(0.06*m).toFixed(2),dodge:+(0.015*m).toFixed(3)}};
}
const DNG_RING_TYPES=[
  {id:'furia',     icon:'💍',name:'Anel da Fúria',       mk:(m,fl)=>({dmg:Math.round((3+fl*0.7)*m)})},
  {id:'vampirico', icon:'🩸',name:'Anel Vampírico',      mk:(m,fl)=>({vamp:+(0.015*m).toFixed(3)})},
  {id:'critico',   icon:'💥',name:'Anel do Crítico',     mk:(m,fl)=>({crit:+(0.04*m).toFixed(3)})},
  {id:'ganancia',  icon:'🪙',name:'Anel da Ganância',    mk:(m,fl)=>({gold:+(0.12*m).toFixed(2)})},
  {id:'vitalidade',icon:'❤️',name:'Anel da Vitalidade',  mk:(m,fl)=>({hp:Math.round(14*m)})},
  {id:'pressa',    icon:'⏩',name:'Anel da Pressa',       mk:(m,fl)=>({cd:+(0.04*m).toFixed(3)})},
  {id:'regen',     icon:'💚',name:'Anel da Regeneração', mk:(m,fl)=>({regen:Math.max(1,Math.round(1*m))})},
];
function makeDngRing(rarity,fl){
  const t=DNG_RING_TYPES[Math.floor(Math.random()*DNG_RING_TYPES.length)];
  return {kind:'ring',slot:'ring',ringId:t.id,icon:t.icon,name:t.name,rarity,stats:t.mk(DNG_RMULT[rarity]||1,fl)};
}
function rollDngGear(fl){
  const rarity=rollDngRarity(fl);
  if(Math.random()<0.55){
    const slots=['helmet','chest','boots'];
    return makeDngArmor(slots[Math.floor(Math.random()*slots.length)],rarity,fl);
  }
  return makeDngRing(rarity,fl);
}
const DNG_STAT_LBL={armor:['🛡️','armadura',v=>'+'+v],hp:['❤️','HP máx',v=>'+'+v],dmg:['⚔️','dano',v=>'+'+v],
  spd:['💨','velocidade',v=>'+'+v],dodge:['✨','esquiva',v=>'+'+Math.round(v*100)+'%'],
  crit:['💥','crítico',v=>'+'+Math.round(v*100)+'%'],vamp:['🩸','lifesteal',v=>'+'+Math.round(v*100)+'%'],
  gold:['🪙','ouro',v=>'+'+Math.round(v*100)+'%'],cd:['⏩','vel. ataque',v=>'+'+Math.round(v*100)+'%'],
  regen:['💚','regen',v=>'+'+v+'/2s']};
function dngGearStatLines(it){
  const out=[]; for(const k in it.stats){ const d=DNG_STAT_LBL[k]; if(d&&it.stats[k]) out.push(d[0]+' '+d[2](it.stats[k])+' '+d[1]); }
  return out;
}

const DNG_RELICS=[
  {id:'vamp',  icon:'🩸',name:'Amuleto Vampírico',desc:'5% lifesteal',price:20,apply(d){d._vamp=(d._vamp||0)+0.05;}},
  {id:'crit',  icon:'💥',name:'Pedra do Crítico', desc:'20% dano duplo',price:18,apply(d){d._crit=(d._crit||0)+0.20;}},
  {id:'shield',icon:'🛡️',name:'Escudo Espectral',desc:'Absorve 1 hit/10s',price:22,apply(d){d._shCd=0;}},
  {id:'speed', icon:'💨',name:'Botas Élficas',    desc:'+25% velocidade',price:15,apply(d){d.pSpeed*=1.25;}},
  {id:'aoe',   icon:'💫',name:'Orbe de Explosão', desc:'AoE ao matar',  price:24,apply(d){d._aoe=true;}},
  {id:'gold',  icon:'🪙',name:'Moeda da Sorte',   desc:'+50% ouro',     price:12,apply(d){d._goldMult=(d._goldMult||1)*1.5;}},
  {id:'regen', icon:'💚',name:'Coração de Pedra', desc:'1HP/3s',        price:16,apply(d){d._regenT=3000;}},
  {id:'maxhp', icon:'❤️',name:'Frasco de Sangue', desc:'+40HP+cura',    price:14,apply(d){d.pMaxHp+=40;d.pHp=Math.min(d.pHp+40,d.pMaxHp);}},
];
window.DNG_RELICS=DNG_RELICS;
window.DNG_RING_TYPES=DNG_RING_TYPES;
function dngStorePixelKind(item){
  if(item?.pixelKey)return item.pixelKey;
  if(item?.defId)return dngWeaponPixelKind(item);
  return ({
    vamp:'potion',crit:'spark',shield:'shield',speed:'boots',
    aoe:'blast',gold:'coin',regen:'heart',maxhp:'heart'
  })[item?.id]||'potion';
}

// ── Enemy defs ──
const ENEMY_DEFS=[
  // ── Dungeon (castelo, pisos 1-4) ──
  {name:'Goblin',    sprFn:()=>GOB_DOWN,  palFn:()=>PAL_GOBLIN,  sc:0.85,r:12,ar:30,ac:800, coin:1,ranged:false,sk:'dash',     skCd:3200,biome:'dungeon'},
  {name:'Esqueleto', sprFn:()=>SKL_DOWN,  palFn:()=>PAL_SKELETON,sc:1.0, r:12,ar:30,ac:850, coin:0,ranged:false,sk:'bone',     skCd:3800,biome:'dungeon'},
  {name:'Orc',       sprFn:()=>ORC_DOWN,  palFn:()=>PAL_ORC,     sc:1.0, r:16,ar:34,ac:1100,coin:1,ranged:false,sk:'slam',     skCd:4500,biome:'dungeon'},
  {name:'Troll',     sprFn:()=>TRL_DOWN,  palFn:()=>PAL_TROLL,   sc:1.0, r:18,ar:36,ac:1200,coin:2,ranged:false,sk:'roar',     skCd:5500,biome:'dungeon'},
  {name:'Arainha',   sprFn:()=>SPD,       palFn:()=>PAL_SPIDER,  sc:0.8, r:10,ar:80,ac:1400,coin:0,ranged:true, sk:'web',      skCd:5000,biome:'dungeon'},
  {name:'Lobo Faminto', sprFn:()=>WOLF_SPR, palFn:()=>PAL_WOLF,   sc:0.95,r:13,ar:30,ac:700, coin:1,ranged:false,sk:'dash',     skCd:2600,biome:'dungeon'},
  {name:'Cultista',     sprFn:()=>CULTIST_SPR,palFn:()=>PAL_CULTIST,sc:0.95,r:12,ar:85,ac:1100,coin:1,ranged:true,sk:'bone',    skCd:3600,biome:'dungeon'},
  // ── Gelo (pisos 5-9): lentos, muita vida ──
  {name:'Zumbi Gelo',  sprFn:()=>SNOW_ZOMBIE, palFn:()=>PAL_SNOW_ZOMBIE, sc:1.0,r:13,ar:32,ac:1000,coin:1,ranged:false,sk:'bone',  skCd:4500,biome:'ice'},
  {name:'Golem Cristal',sprFn:()=>ICE_GOLEM,  palFn:()=>PAL_ICE_GOLEM,  sc:1.2,r:18,ar:30,ac:1600,coin:2,ranged:false,sk:'slam',  skCd:6500,biome:'ice'},
  {name:'Espectro',    sprFn:()=>SPECTER_SPR, palFn:()=>PAL_SPECTER,     sc:0.95,r:12,ar:90,ac:1200,coin:0,ranged:true, sk:'bone', skCd:4500,biome:'ice'},
  {name:'Tigre da Neve',sprFn:()=>SNOW_TIGER,  palFn:()=>PAL_SNOW_TIGER,  sc:1.0,r:14,ar:30,ac:750, coin:1,ranged:false,sk:'dash',  skCd:2800,biome:'ice'},
  // ── Pântano (pisos 10-14): venenosos, teias ──
  {name:'Aranha Tóxica',sprFn:()=>SPD,     palFn:()=>PAL_SPIDER,  sc:0.9,r:11,ar:85,ac:1100,coin:0,ranged:true, sk:'web',     skCd:3800,biome:'swamp'},
  {name:'Goblin Pântano',sprFn:()=>GOB_DOWN,palFn:()=>PAL_GOBLIN, sc:0.9,r:12,ar:30,ac:720, coin:1,ranged:false,sk:'dash',    skCd:2800,biome:'swamp'},
  {name:'Troll Podre',   sprFn:()=>TRL_DOWN,palFn:()=>PAL_TROLL,  sc:1.1,r:19,ar:36,ac:1000,coin:2,ranged:false,sk:'roar',    skCd:5000,biome:'swamp'},
  {name:'Ent Corrompido', sprFn:()=>ENT_SPR,  palFn:()=>PAL_ENT,    sc:1.15,r:19,ar:34,ac:1400,coin:2,ranged:false,sk:'slam',   skCd:5200,biome:'swamp'},
  {name:'Escorpião',      sprFn:()=>SCORPION_SPR,palFn:()=>PAL_SCORPION,sc:0.95,r:12,ar:30,ac:850,coin:1,ranged:false,sk:'dash', skCd:3000,biome:'swamp'},
  // ── Fogo (pisos 15+): rápidos, agressivos ──
  {name:'Orc Ígneo',    sprFn:()=>ORC_DOWN, palFn:()=>PAL_ORC,      sc:1.0,r:15,ar:32,ac:800, coin:1,ranged:false,sk:'charge', skCd:3000,biome:'fire'},
  {name:'Esquel. Chama', sprFn:()=>SKL_DOWN, palFn:()=>PAL_SKELETON,sc:0.95,r:12,ar:75,ac:700,coin:0,ranged:true, sk:'bone',  skCd:3000,biome:'fire'},
  {name:'Goblin Vulcão', sprFn:()=>GOB_DOWN, palFn:()=>PAL_GOBLIN,  sc:0.9,r:12,ar:30,ac:580, coin:1,ranged:false,sk:'dash',  skCd:2400,biome:'fire'},
  {name:'Diabrete',       sprFn:()=>IMP_SPR,  palFn:()=>PAL_IMP,     sc:0.9,r:11,ar:28,ac:620, coin:1,ranged:false,sk:'dash',   skCd:2200,biome:'fire'},
  {name:'Cav. Demônio',   sprFn:()=>DKNIGHT_SPR,palFn:()=>PAL_DKNIGHT,sc:1.1,r:16,ar:34,ac:1000,coin:2,ranged:false,sk:'charge',skCd:3400,biome:'fire'},
  {name:'Morcego de Lava',sprFn:()=>LAVABAT_SPR,palFn:()=>PAL_LAVABAT,sc:0.9,r:11,ar:80,ac:900, coin:1,ranged:true, sk:'bone',  skCd:3200,biome:'fire'},
];
const BOSS_DEFS=[
  // ── DUNGEON ──
  {name:'Rei Cadáver',    sprFn:()=>SKING_DOWN, palFn:()=>PAL_SKELETON_KING, sc:1.9,r:28,ranged:false, sk:'summon',      skCd:4500, biome:'dungeon'},
  {name:'Orc Sombrio',    sprFn:()=>ORC_DOWN, palFn:()=>PAL_ORC,      sc:2.4,r:30,ranged:false, sk:'charge',      skCd:3500, biome:'dungeon'},
  {name:'Troll Antigo',   sprFn:()=>TRL_DOWN, palFn:()=>PAL_TROLL,    sc:2.6,r:34,ranged:false, sk:'shockwave',   skCd:4000, biome:'dungeon'},
  {name:'Ogro Pálido',    sprFn:()=>OGRE_SPR, palFn:()=>PAL_OGRE,     sc:2.8,r:36,ranged:false, sk:'clubslam',    skCd:4400, biome:'dungeon'},
  {name:'Rainha Arainha', sprFn:()=>SPD,      palFn:()=>PAL_SPIDER,   sc:2.0,r:26,ranged:true,  sk:'spiderlings', skCd:5000, biome:'dungeon'},
  // ── ICE ──
  {name:'Lich Glacial',   sprFn:()=>SKL_DOWN, palFn:()=>PAL_SKELETON, sc:2.3,r:28,ranged:true,  sk:'blizzard',    skCd:3800, biome:'ice',
    palOverride:{r:0,g:0.5,b:1.0}},
  {name:'Colossus Gelo',  sprFn:()=>TRL_DOWN, palFn:()=>PAL_TROLL,    sc:2.8,r:36,ranged:false, sk:'ice_slam',    skCd:4200, biome:'ice',
    palOverride:{r:0.4,g:0.8,b:1.0}},
  // ── SWAMP ──
  {name:'Bruxo Pântano',  sprFn:()=>ORC_DOWN, palFn:()=>PAL_ORC,      sc:2.1,r:26,ranged:true,  sk:'poison_cloud', skCd:3500, biome:'swamp',
    palOverride:{r:0.2,g:0.8,b:0.1}},
  {name:'Hidra Tóxica',   sprFn:()=>SPD,      palFn:()=>PAL_SPIDER,   sc:2.5,r:32,ranged:true,  sk:'hydra_heads',  skCd:5000, biome:'swamp',
    palOverride:{r:0.3,g:0.9,b:0.2}},
  // ── FIRE ──
  {name:'Senhor das Chamas', sprFn:()=>ORC_DOWN, palFn:()=>PAL_ORC,   sc:2.5,r:32,ranged:true,  sk:'meteor',      skCd:4000, biome:'fire',
    palOverride:{r:1.0,g:0.3,b:0.0}},
  {name:'Dragão Ígneo',   sprFn:()=>TRL_DOWN, palFn:()=>PAL_TROLL,    sc:2.9,r:38,ranged:true,  sk:'dragon_breath',skCd:3200, biome:'fire',
    palOverride:{r:1.0,g:0.5,b:0.0}},
  // ── NOVOS CHEFES ──
  {name:'Lobo Alfa',        sprFn:()=>WOLF_SPR,    palFn:()=>PAL_WOLF,    sc:2.3,r:28,ranged:false, sk:'charge',      skCd:2800, biome:'dungeon'},
  {name:'Arauto Cultista',  sprFn:()=>CULTIST_SPR, palFn:()=>PAL_CULTIST, sc:2.2,r:26,ranged:true,  sk:'summon',      skCd:4000, biome:'dungeon'},
  {name:'Tigre Ancestral',  sprFn:()=>SNOW_TIGER,  palFn:()=>PAL_SNOW_TIGER,sc:2.4,r:29,ranged:false,sk:'charge',     skCd:3000, biome:'ice',
    palOverride:{r:0.6,g:0.85,b:1.0}},
  {name:'Ent Ancião',       sprFn:()=>ENT_SPR,     palFn:()=>PAL_ENT,     sc:2.6,r:33,ranged:false, sk:'shockwave',   skCd:4200, biome:'swamp'},
  {name:'Escorpião-Rei',    sprFn:()=>SCORPION_SPR,palFn:()=>PAL_SCORPION,sc:2.4,r:29,ranged:false, sk:'summon',      skCd:3800, biome:'swamp'},
  {name:'Cavaleiro do Abismo',sprFn:()=>DKNIGHT_SPR,palFn:()=>PAL_DKNIGHT,sc:2.5,r:31,ranged:true,  sk:'meteor',      skCd:3600, biome:'fire'},
  {name:'Troll das Cavernas',sprFn:()=>CTROLL_SPR,  palFn:()=>PAL_CTROLL, sc:2.7,r:35,ranged:false, sk:'boulder',     skCd:4200, biome:'dungeon'},
];

// ── Tile draw ──
// Curandeira (Liora) no estilo chunky do hub — capuz verde + caldeirão borbulhante
function drawBosqueHealer(c,x,y,now){
  const bob=Math.sin(now*0.0025)*1.2;
  c.fillStyle='rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x,y+2,14,4,0,0,Math.PI*2); c.fill();
  // caldeirão
  c.fillStyle='#1c1c1c'; c.beginPath(); c.ellipse(x-17,y-4,11,6,0,0,Math.PI*2); c.fill();
  c.fillStyle='#2a2a2a'; c.fillRect(x-27,y-9,20,7);
  c.fillStyle='hsl(120,60%,'+(40+8*Math.sin(now*0.06))+'%)'; c.beginPath(); c.ellipse(x-17,y-9,8,3,0,0,Math.PI*2); c.fill();
  for(let b=0;b<3;b++){ const bp=(now*0.003+b*1.2)%1; if(bp<0.5){ c.globalAlpha=0.85; c.fillStyle='#aaffaa'; c.fillRect(x-21+b*4,y-11-bp*10,2,2);} } c.globalAlpha=1;
  // corpo — manto verde escuro + detalhe dourado
  c.fillStyle='#0f2a16'; c.fillRect(x-9,y-22+bob,18,22); c.fillStyle='#1d4a28'; c.fillRect(x-8,y-21+bob,16,20);
  c.fillStyle='#2e7a42'; c.fillRect(x-7,y-20+bob,7,14);
  c.fillStyle='#c8a84b'; c.fillRect(x-8,y-8+bob,16,2);
  // capuz + rosto sombreado
  c.fillStyle='#1d4a28'; c.beginPath(); c.arc(x,y-26+bob,9,0,Math.PI*2); c.fill();
  c.fillStyle='#e8c8a0'; c.fillRect(x-4,y-27+bob,8,7);
  c.fillStyle='#1a1a1a'; c.fillRect(x-3,y-25+bob,2,2); c.fillRect(x+1,y-25+bob,2,2);
  // ponta do capuz
  c.fillStyle='#1d4a28'; c.beginPath(); c.moveTo(x+5,y-32+bob); c.quadraticCurveTo(x+11,y-33+bob,x+11,y-27+bob); c.lineTo(x+6,y-27+bob); c.closePath(); c.fill();
  // aura verde suave
  const g=c.createRadialGradient(x,y-16+bob,0,x,y-16+bob,24); g.addColorStop(0,'rgba(90,230,120,'+(0.14+0.05*Math.sin(now*0.05))+')'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(x-24,y-40+bob,48,48);
}
function drawDngTile(c,t,sx,sy,tx,ty,lf,flicker,ts2,biome){
  const bm = biome || BIOMES.dungeon;
  if(t===T_VOID)return;
  const h=(tx*73856093 ^ ty*19349663)>>>0;          // hash estável por tile
  if(t===T_WALL){
    const cols=bm.wallCols||['#565664','#5c5c6a','#525260','#646474','#484858'];
    c.globalAlpha=0.1+lf*0.9;
    // face frontal
    c.fillStyle=cols[h%5];c.fillRect(sx,sy,DTS,DTS);
    // topo 3D (faixa mais clara)
    c.fillStyle=bm.wallTop||'#6e6e80';c.fillRect(sx,sy,DTS,6);
    c.fillStyle='rgba(255,255,255,0.10)';c.fillRect(sx,sy,DTS,2);
    // tijolos (2 fileiras com offset e variação por tijolo)
    const half=Math.floor((DTS-6)/2);
    for(let row=0;row<2;row++){
      const by=sy+6+row*half;
      const off=(row+ty)%2?Math.floor(DTS/2):0;
      for(let bxi=-1;bxi<2;bxi++){
        const bx=sx+off+bxi*Math.floor(DTS/2);
        const bh2=((h>>(row*3+bxi+3))&3);
        c.fillStyle=cols[(h+row*7+bxi*13)%5];
        c.fillRect(Math.max(sx,bx)+1,by+1,Math.min(DTS/2-2,sx+DTS-bx-2),half-2);
        if(bh2===0){c.fillStyle='rgba(255,255,255,0.05)';c.fillRect(Math.max(sx,bx)+1,by+1,Math.min(DTS/2-2,sx+DTS-bx-2),2);}
      }
      c.fillStyle=bm.grout||'rgba(0,0,0,0.5)';c.fillRect(sx,by,DTS,1);
    }
    c.fillStyle=bm.grout||'rgba(0,0,0,0.5)';c.fillRect(sx,sy+DTS-1,DTS,1);
    // acentos por bioma no topo/base da parede
    if(bm===BIOMES.dungeon&&h%11===0){ // teia de aranha
      c.strokeStyle=`rgba(220,220,235,${0.22*lf})`;c.lineWidth=1;
      c.beginPath();c.moveTo(sx,sy+6);c.lineTo(sx+9,sy+15);c.moveTo(sx+9,sy+6);c.lineTo(sx,sy+13);
      c.moveTo(sx,sy+9);c.lineTo(sx+7,sy+9);c.stroke();
    }
    if(bm===BIOMES.ice&&h%5===0){ // estalactites de gelo
      c.fillStyle=`rgba(210,240,255,${0.75*lf})`;
      const ic=2+(h>>4)%3;
      for(let k=0;k<ic;k++){const ix=sx+6+((h>>k)%(DTS-12));const il=5+((h>>(k+2))%7);
        c.beginPath();c.moveTo(ix-2,sy+DTS-1);c.lineTo(ix,sy+DTS-1+il);c.lineTo(ix+2,sy+DTS-1);c.closePath();c.fill();}
    }
    if(bm===BIOMES.swamp&&h%6===0){ // vinhas pendentes
      c.strokeStyle=`rgba(70,140,40,${0.6*lf})`;c.lineWidth=2;
      const vx=sx+8+(h%(DTS-16));
      c.beginPath();c.moveTo(vx,sy+DTS-2);c.quadraticCurveTo(vx+3,sy+DTS+6,vx-1,sy+DTS+12);c.stroke();
      c.fillStyle=`rgba(110,200,60,${0.6*lf})`;c.fillRect(vx-2,sy+DTS+10,4,3);
    }
    if(bm===BIOMES.fire&&h%7===0){ // rachadura incandescente
      c.strokeStyle=`rgba(255,120,20,${(0.35+0.25*flicker)*lf})`;c.lineWidth=1.5;
      c.beginPath();c.moveTo(sx+5,sy+10);c.lineTo(sx+14,sy+20);c.lineTo(sx+10,sy+30);c.stroke();
    }
    // ── CORE KEEPER: veios de minério brilhando nas paredes ──
    if(h%8===1){
      const oreCols=bm===BIOMES.ice?['#7ae8ff','#b8f4ff']:bm===BIOMES.swamp?['#d8c840','#f0e88a']:bm===BIOMES.fire?['#ff4a5a','#ff9aa4']:['#ffb830','#ffe08a'];
      const g3=0.45+0.35*Math.sin(ts2*0.0035+h);
      for(let o2=0;o2<4;o2++){
        const oxp=sx+6+((h>>(o2*3))%(DTS-14)), oyp=sy+9+((h>>(o2*2+1))%(DTS-16));
        c.globalAlpha=(0.55+0.35*g3)*lf;
        c.fillStyle=oreCols[0];c.fillRect(oxp,oyp,4,4);
        c.fillStyle=oreCols[1];c.fillRect(oxp+1,oyp+1,2,2);
      }
      // halo do veio
      const og=c.createRadialGradient(sx+DTS/2,sy+DTS/2,2,sx+DTS/2,sy+DTS/2,DTS*0.8);
      og.addColorStop(0,oreCols[0]+'22');og.addColorStop(1,'rgba(0,0,0,0)');
      c.globalAlpha=g3*lf;c.fillStyle=og;c.fillRect(sx-6,sy-6,DTS+12,DTS+12);
    }
    c.globalAlpha=1;return;
  }
  // ── PISO ──
  const fc=bm.floorCols||['#8a7050','#927858','#7a6040','#8a7a52','#968862'];
  c.globalAlpha=0.1+lf*0.9;
  c.fillStyle=fc[(ty*3+tx*2)%5];c.fillRect(sx,sy,DTS,DTS);
  // lajota: rejunte + brilho superior sutil
  c.fillStyle=bm.grout||'rgba(60,45,25,0.45)';c.fillRect(sx,sy,DTS,1);c.fillRect(sx,sy,1,DTS);
  c.fillStyle='rgba(255,255,255,0.04)';c.fillRect(sx+1,sy+1,DTS-2,2);
  // ── CORE KEEPER: parede acima projeta sombra no chão (profundidade) ──
  if(typeof DNG!=='undefined'&&DNG.map&&DNG.map[(ty-1)*MW+tx]===T_WALL){
    const shG=c.createLinearGradient(0,sy,0,sy+Math.floor(DTS*0.55));
    shG.addColorStop(0,'rgba(0,0,0,0.55)');shG.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=shG;c.fillRect(sx,sy,DTS,Math.floor(DTS*0.55));
  }
  // esporo/vagalume flutuante ambiente (1 a cada ~9 tiles)
  if(h%9===2){
    const fp2=((ts2*0.0004)+(h%7)*0.14)%1;
    const fx2=sx+6+((h>>3)%(DTS-12))+Math.sin(ts2*0.002+h)*3;
    const fy2=sy+DTS-6-fp2*(DTS-10);
    const spCol=bm===BIOMES.ice?'#bff0ff':bm===BIOMES.swamp?'#a8ff70':bm===BIOMES.fire?'#ffb060':'#ffe9a0';
    c.globalAlpha=(0.35+0.3*Math.sin(ts2*0.004+h))*(1-fp2)*lf;
    c.fillStyle=spCol;c.fillRect(fx2,fy2,2,2);
    c.globalAlpha=1;
  }
  // decoração pseudo-aleatória por bioma (mais vida no chão)
  const dec=h%17;
  if(bm===BIOMES.dungeon){
    if(dec===0){c.fillStyle=`rgba(30,22,12,${0.5*lf})`; // rachadura
      c.fillRect(sx+8,sy+14,10,1);c.fillRect(sx+17,sy+15,6,1);c.fillRect(sx+14,sy+11,1,4);}
    else if(dec===1){c.fillStyle=`rgba(210,200,175,${0.55*lf})`; // ossinhos
      c.fillRect(sx+12,sy+22,9,2);c.fillRect(sx+10,sy+21,3,4);c.fillRect(sx+20,sy+21,3,4);}
    else if(dec===2){c.fillStyle=`rgba(70,90,50,${0.35*lf})`; // musgo no canto
      c.fillRect(sx+1,sy+DTS-6,7,5);c.fillRect(sx+3,sy+DTS-9,4,3);}
    else if(dec===3){c.fillStyle=`rgba(40,30,18,${0.5*lf})`;c.fillRect(sx+24,sy+8,3,3);c.fillRect(sx+28,sy+11,2,2);} // pedrinhas
  }
  if(bm===BIOMES.ice){
    if(dec<2){c.strokeStyle=`rgba(200,235,255,${0.30*lf})`;c.lineWidth=1; // rachaduras de gelo
      c.beginPath();c.moveTo(sx+DTS*0.25,sy+DTS*0.3);c.lineTo(sx+DTS*0.75,sy+DTS*0.65);c.stroke();
      c.beginPath();c.moveTo(sx+DTS*0.55,sy+DTS*0.1);c.lineTo(sx+DTS*0.4,sy+DTS*0.85);c.stroke();}
    else if(dec===2){const g2=0.5+0.3*Math.sin(ts2*0.003+h); // cristal brilhante
      c.fillStyle=`rgba(220,245,255,${g2*lf})`;
      c.beginPath();c.moveTo(sx+20,sy+12);c.lineTo(sx+16,sy+20);c.lineTo(sx+20,sy+28);c.lineTo(sx+24,sy+20);c.closePath();c.fill();}
    else if(dec===3){c.fillStyle=`rgba(240,250,255,${0.35*lf})`;c.fillRect(sx+4,sy+4,10,7);} // neve
  }
  if(bm===BIOMES.swamp){
    if(dec<2){c.fillStyle=`rgba(30,150,20,${0.22*lf})`; // poça
      c.beginPath();c.ellipse(sx+DTS/2,sy+DTS/2,DTS*0.32,DTS*0.18,0,0,Math.PI*2);c.fill();
      c.fillStyle=`rgba(120,255,90,${(0.25+0.2*Math.sin(ts2*0.004+h))*lf})`;
      c.beginPath();c.arc(sx+DTS/2+4,sy+DTS/2-2,2,0,Math.PI*2);c.fill();}
    else if(dec===2){ // cogumelos luminosos
      const g2=0.5+0.3*Math.sin(ts2*0.0035+h);
      c.fillStyle=`rgba(120,240,80,${g2*lf})`;c.fillRect(sx+10,sy+18,4,3);c.fillRect(sx+16,sy+20,3,3);
      c.fillStyle=`rgba(60,120,40,${0.7*lf})`;c.fillRect(sx+11,sy+21,2,4);c.fillRect(sx+17,sy+23,1,3);}
    else if(dec===3){c.strokeStyle=`rgba(60,90,30,${0.5*lf})`;c.lineWidth=1.5; // raiz
      c.beginPath();c.moveTo(sx+4,sy+30);c.quadraticCurveTo(sx+16,sy+24,sx+30,sy+30);c.stroke();}
  }
  if(bm===BIOMES.fire){
    if(dec<2){const g2=0.3+0.35*flicker; // bolsão de lava pulsante
      c.fillStyle=`rgba(255,90,10,${g2*lf})`;
      c.beginPath();c.ellipse(sx+DTS/2,sy+DTS/2,DTS*0.20,DTS*0.13,0,0,Math.PI*2);c.fill();
      c.fillStyle=`rgba(255,200,80,${g2*0.8*lf})`;
      c.beginPath();c.ellipse(sx+DTS/2,sy+DTS/2,DTS*0.09,DTS*0.05,0,0,Math.PI*2);c.fill();}
    else if(dec===2){c.strokeStyle=`rgba(255,130,30,${(0.30+0.25*flicker)*lf})`;c.lineWidth=1.5; // veia
      c.beginPath();c.moveTo(sx+6,sy+8);c.lineTo(sx+16,sy+16);c.lineTo(sx+12,sy+28);c.stroke();}
    else if(dec===3){c.fillStyle=`rgba(60,45,40,${0.55*lf})`; // cinzas
      c.fillRect(sx+20,sy+24,8,4);c.fillRect(sx+23,sy+21,4,3);}
  }
  c.globalAlpha=1;
  // ── PROPS ──
  if(t===T_TORCH){
    const tcx=sx+Math.floor(DTS/2),tcy=sy+DTS-6;
    c.globalAlpha=0.2+lf*0.8;
    // suporte de metal + cabo
    c.fillStyle='#2e2e38';c.fillRect(tcx-6,tcy-13,13,3);c.fillRect(tcx-5,tcy-16,3,4);c.fillRect(tcx+3,tcy-16,3,4);
    c.fillStyle='#6a4a20';c.fillRect(tcx-2,tcy-11,5,11);c.fillStyle='#8a6430';c.fillRect(tcx-2,tcy-11,2,11);
    // chama em camadas animada
    const fr=Math.floor(ts2/85)%3;
    const fc1=bm===BIOMES.ice?'#3366cc':bm===BIOMES.swamp?'#118822':bm===BIOMES.fire?'#ff2200':'#992200';
    const fc2=bm===BIOMES.ice?'#55aaee':bm===BIOMES.swamp?'#33aa33':bm===BIOMES.fire?'#ff5500':'#cc4400';
    c.fillStyle=fc1;c.fillRect(tcx-4,tcy-22-fr,9,8);
    c.fillStyle=fc2;c.fillRect(tcx-3,tcy-26+(fr>>1),7,8);
    c.fillStyle='#ff9900';c.fillRect(tcx-2,tcy-29+fr%2,5,6);
    c.fillStyle='#ffcc44';c.fillRect(tcx-1,tcy-31+fr,3,5);
    c.fillStyle='#fff2b0';c.fillRect(tcx,tcy-27+fr%2,1,3);
    // fagulhas subindo
    for(let sp2=0;sp2<3;sp2++){
      const spp=((ts2*0.0012)+sp2*0.33+(h%10)*0.1)%1;
      c.globalAlpha=(1-spp)*0.7*lf;
      c.fillStyle=sp2%2?'#ffcc44':'#ff8822';
      c.fillRect(tcx-3+((h>>sp2)%7)+Math.sin(ts2*0.004+sp2)*2, tcy-30-spp*20, 2,2);
    }
    c.globalAlpha=1;
    const tgRgb=bm.glowRgb||'255,140,30';
    const tg=c.createRadialGradient(tcx,tcy-16,0,tcx,tcy-16,DTS*2);
    tg.addColorStop(0,`rgba(${tgRgb},${0.35*flicker})`);tg.addColorStop(0.5,`rgba(${tgRgb},${0.12*flicker})`);tg.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=tg;c.fillRect(sx-DTS,sy-DTS,DTS*4,DTS*4);
  }
  if(t===T_STAIRS){
    c.globalAlpha=0.2+lf*0.8;
    // buraco escuro descendo com moldura de pedra
    c.fillStyle='#0a0806';c.fillRect(sx+5,sy+5,DTS-10,DTS-10);
    c.strokeStyle='rgba(200,170,110,0.5)';c.lineWidth=2;c.strokeRect(sx+5,sy+5,DTS-10,DTS-10);
    // degraus em perspectiva
    for(let s2=0;s2<4;s2++){
      const sw=DTS-14-s2*7;
      c.fillStyle=['#7a6040','#655032','#4e3c22','#352a14'][s2];
      c.fillRect(sx+(DTS-sw)/2,sy+8+s2*7,sw,5);
    }
    // luz vinda das profundezas
    const sg=c.createRadialGradient(sx+DTS/2,sy+DTS/2,2,sx+DTS/2,sy+DTS/2,DTS);
    sg.addColorStop(0,`rgba(255,220,100,${(0.28+0.12*flicker)*lf})`);sg.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=sg;c.fillRect(sx-DTS/2,sy-DTS/2,DTS*2,DTS*2);
    c.globalAlpha=1;
  }
  if(t===T_CHEST){
    c.globalAlpha=0.2+lf*0.8;
    const cw=Math.floor(DTS*0.68),ch2=Math.floor(DTS*0.5),cx=sx+(DTS-cw)/2,cy=sy+(DTS-ch2)/2+3;
    // sombra
    c.fillStyle='rgba(0,0,0,0.35)';c.beginPath();c.ellipse(cx+cw/2,cy+ch2,cw*0.55,4,0,0,Math.PI*2);c.fill();
    // corpo de madeira escura + tampa
    c.fillStyle='#4a2e0e';c.fillRect(cx,cy+7,cw,ch2-7);
    c.fillStyle='#6e4a1a';c.fillRect(cx,cy,cw,9);
    c.fillStyle='#8a6228';c.fillRect(cx,cy,cw,3);
    // faixas douradas + rebites
    c.fillStyle='#c8a030';c.fillRect(cx,cy+8,cw,2);c.fillRect(cx+2,cy+ch2-4,cw-4,2);
    c.fillStyle='#ffe070';c.fillRect(cx,cy+8,cw,1);
    c.fillStyle='#e8c050';
    c.fillRect(cx+2,cy+2,2,2);c.fillRect(cx+cw-4,cy+2,2,2);
    c.fillRect(cx+2,cy+ch2-8,2,2);c.fillRect(cx+cw-4,cy+ch2-8,2,2);
    // fechadura dourada com buraco
    c.fillStyle='#e8c050';c.fillRect(cx+Math.floor(cw/2)-3,cy+5,7,8);
    c.fillStyle='#3a2404';c.fillRect(cx+Math.floor(cw/2)-1,cy+8,3,3);
    // brilho pulsante + faísca
    const cg=c.createRadialGradient(sx+DTS/2,sy+DTS/2,0,sx+DTS/2,sy+DTS/2,DTS);
    cg.addColorStop(0,`rgba(255,200,60,${(0.20+0.10*Math.sin(ts2*0.004+h))*lf})`);cg.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=cg;c.fillRect(sx-DTS/2,sy-DTS/2,DTS*2,DTS*2);
    if(Math.floor(ts2/700+h)%3===0){c.fillStyle='#fff6c8';c.fillRect(cx+cw-5,cy+1,2,2);c.fillRect(cx+cw-4,cy,1,1);}
    c.globalAlpha=1;
  }
  if(t===T_BARREL){
    c.globalAlpha=0.2+lf*0.8;
    if(h%2===0){
      // BARRIL: aduelas verticais + 2 aros de metal + tampa
      const bh=Math.floor(DTS*0.62),bw2=Math.floor(DTS*0.5),bx=sx+(DTS-bw2)/2,by2=sy+(DTS-bh)/2+2;
      c.fillStyle='rgba(0,0,0,0.3)';c.beginPath();c.ellipse(bx+bw2/2,by2+bh,bw2*0.55,3,0,0,Math.PI*2);c.fill();
      c.fillStyle='#6a4020';c.fillRect(bx,by2,bw2,bh);
      c.fillStyle='#7e5028';c.fillRect(bx+3,by2,3,bh);c.fillRect(bx+9,by2,3,bh);c.fillRect(bx+15,by2,2,bh);
      c.fillStyle='#4a2a0c';c.fillRect(bx+6,by2,1,bh);c.fillRect(bx+12,by2,1,bh);
      c.fillStyle='#3a3a44';c.fillRect(bx-1,by2+Math.floor(bh*0.22),bw2+2,3);c.fillRect(bx-1,by2+Math.floor(bh*0.68),bw2+2,3);
      c.fillStyle='#585866';c.fillRect(bx-1,by2+Math.floor(bh*0.22),bw2+2,1);c.fillRect(bx-1,by2+Math.floor(bh*0.68),bw2+2,1);
      c.fillStyle='#8a6228';c.beginPath();c.ellipse(bx+bw2/2,by2+1,bw2/2,3,0,0,Math.PI*2);c.fill();
    } else {
      // CAIXA DE ITENS: madeira clara com tábuas em X e cantos de metal
      const cs=Math.floor(DTS*0.6),cx2=sx+(DTS-cs)/2,cy2=sy+(DTS-cs)/2+3;
      c.fillStyle='rgba(0,0,0,0.3)';c.beginPath();c.ellipse(cx2+cs/2,cy2+cs,cs*0.55,3,0,0,Math.PI*2);c.fill();
      c.fillStyle='#8a6430';c.fillRect(cx2,cy2,cs,cs);
      c.fillStyle='#a07840';c.fillRect(cx2,cy2,cs,3);c.fillRect(cx2,cy2,3,cs);
      c.fillStyle='#5e421c';c.fillRect(cx2,cy2+cs-2,cs,2);c.fillRect(cx2+cs-2,cy2,2,cs);
      c.strokeStyle='#5e421c';c.lineWidth=2;
      c.beginPath();c.moveTo(cx2+2,cy2+2);c.lineTo(cx2+cs-2,cy2+cs-2);c.moveTo(cx2+cs-2,cy2+2);c.lineTo(cx2+2,cy2+cs-2);c.stroke();
      c.fillStyle='#3a3a44';
      c.fillRect(cx2-1,cy2-1,4,4);c.fillRect(cx2+cs-3,cy2-1,4,4);
      c.fillRect(cx2-1,cy2+cs-3,4,4);c.fillRect(cx2+cs-3,cy2+cs-3,4,4);
    }
    c.globalAlpha=1;
  }
  if(t===T_MERCHANT){
    c.globalAlpha=0.25+lf*0.75;
    const mx2=sx+DTS/2, my2=sy+DTS-4;
    // sombra
    c.fillStyle='rgba(0,0,0,0.4)';c.beginPath();c.ellipse(mx2,my2,13,4,0,0,Math.PI*2);c.fill();
    // COMERCIANTE ENCAPUZADO (pixel-art) — capa verde-musgo, olhos brilhando, lanterna
    const MP={'X':'#10140a','C':'#2e4416','c':'#3e5a20','d':'#22340e','E':'#ffd21a','G':'#c8a030','g':'#8a6430','S':'#e8d8b0','B':'#5e421c'};
    const MSPR=['   XXXXX    ','  XCCCCCX   ',' XCcCCCcCX  ',' XCdEXEdCX  ',' XCddddClX G'.replace('l','C'),' XCCcccCCXGg','XCcCCCCCcXGg','XCdCCCCCdX g','XCdCCCCCdX  ',' XBSSSSSBX  ',' XBBBBBBBX  '];
    const px2=3;
    const ox=Math.round(mx2-6*px2), oy=Math.round(my2-MSPR.length*px2);
    for(let r=0;r<MSPR.length;r++){const row=MSPR[r];
      for(let cc2=0;cc2<row.length;cc2++){const ch3=row[cc2];if(ch3===' ')continue;
        const col2=MP[ch3];if(!col2)continue;
        c.fillStyle=col2;c.fillRect(ox+cc2*px2,oy+r*px2,px2,px2);}}
    // lanterna balançando com luz quente
    const sw2=Math.sin(ts2*0.003)*2;
    c.fillStyle='#3a3a44';c.fillRect(mx2+11+sw2,my2-20,2,6);
    c.fillStyle='#ffcf6a';c.fillRect(mx2+9+sw2,my2-14,6,7);
    c.fillStyle='#fff2b0';c.fillRect(mx2+11+sw2,my2-12,2,3);
    const lg2=c.createRadialGradient(mx2+12+sw2,my2-11,1,mx2+12+sw2,my2-11,16);
    lg2.addColorStop(0,`rgba(255,200,90,${0.4*flicker})`);lg2.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=lg2;c.fillRect(mx2-6+sw2,my2-28,36,34);
    // moeda flutuando acima (indica loja)
    const cb=Math.sin(ts2*0.004)*2.5;
    c.fillStyle='#7a4e08';c.beginPath();c.ellipse(mx2,my2-40+cb,5,5.6,0,0,Math.PI*2);c.fill();
    c.fillStyle='#f4c020';c.beginPath();c.ellipse(mx2,my2-40+cb,4,4.6,0,0,Math.PI*2);c.fill();
    c.fillStyle='#8a5a08';c.font='bold 6px Courier New';c.textAlign='center';c.fillText('$',mx2,my2-38+cb);c.textAlign='left';
    // aura esverdeada de "loja"
    const mg2=c.createRadialGradient(mx2,sy+DTS/2,2,mx2,sy+DTS/2,DTS*1.2);
    mg2.addColorStop(0,`rgba(60,220,90,${0.15*flicker*lf})`);mg2.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=mg2;c.fillRect(sx-DTS/2,sy-DTS/2,DTS*2,DTS*2);
    c.globalAlpha=1;
  }
  // Portal do Bosque (verde animado) / Portal de retorno
  if(t===T_PORTAL||t===T_RETURN){
    const isR=t===T_RETURN; const cx=sx+DTS/2, cy=sy+DTS/2; const rr=13+Math.sin(ts2*0.006)*2;
    const g=c.createRadialGradient(cx,cy,2,cx,cy,DTS*0.95);
    g.addColorStop(0,`rgba(120,255,140,${0.55*flicker})`); g.addColorStop(0.5,'rgba(40,180,80,0.22)'); g.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=g; c.fillRect(sx-DTS/2,sy-DTS/2,DTS*2,DTS*2);
    c.save(); c.translate(cx,cy); c.rotate(ts2*0.001*(isR?-1:1));
    c.strokeStyle=`rgba(150,255,170,${0.7*flicker})`; c.lineWidth=2; c.setLineDash([5,5]);
    c.beginPath(); c.ellipse(0,0,rr,rr*0.72,0,0,Math.PI*2); c.stroke(); c.setLineDash([]); c.restore();
    c.fillStyle=isR?'#1a3a1e':'#0c2410'; c.beginPath(); c.ellipse(cx,cy,rr*0.7,rr*0.52,0,0,Math.PI*2); c.fill();
    c.fillStyle=`rgba(90,255,130,${0.45+0.3*Math.sin(ts2*0.008)})`; c.beginPath(); c.ellipse(cx,cy,rr*0.42,rr*0.3,0,0,Math.PI*2); c.fill();
    for(let i=0;i<4;i++){ const pa=(ts2*0.002+i*1.6)%1; c.globalAlpha=(1-pa)*0.8*flicker; c.fillStyle='#aaffbb'; c.fillRect(Math.round(cx-8+i*5), Math.round(cy+10-pa*24), 2,2); }
    c.globalAlpha=1;
    c.fillStyle=`rgba(160,255,180,${0.85*lf})`; c.font='bold 7px Courier New'; c.textAlign='center'; c.fillText(isR?'↩ SAIDA':'✦ FENDA ✦', cx, sy-3); c.textAlign='left';
  }
  // Nos de recurso do Bosque
  if(MVP_NODES[t]){
    c.globalAlpha=0.3+lf*0.7; const cx=sx+DTS/2, cy=sy+DTS-6;
    c.fillStyle='rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(cx,cy+2,11,4,0,0,Math.PI*2); c.fill();
    if(t===T_RWOOD){ c.fillStyle='#2a5a1a'; c.fillRect(cx-4,cy-26,8,28); c.fillStyle='#3a7a2a'; c.fillRect(cx-3,cy-26,6,28); c.fillStyle='#1a3a10'; for(let i=0;i<3;i++)c.fillRect(cx-4,cy-20+i*9,8,2); c.fillStyle='#5aaa3a'; c.beginPath();c.moveTo(cx,cy-30);c.lineTo(cx+9,cy-24);c.lineTo(cx,cy-22);c.fill(); c.beginPath();c.moveTo(cx,cy-26);c.lineTo(cx-9,cy-20);c.lineTo(cx,cy-18);c.fill(); }
    else if(t===T_RSTONE){ c.fillStyle='#2a2830'; c.beginPath();c.arc(cx,cy-6,13,0,Math.PI*2);c.fill(); c.fillStyle='#55515f'; c.beginPath();c.arc(cx,cy-8,11,0,Math.PI*2);c.fill(); c.strokeStyle='#78727f';c.lineWidth=1;c.beginPath();c.moveTo(cx-6,cy-10);c.lineTo(cx+2,cy-2);c.stroke(); }
    else if(t===T_RORE){ c.fillStyle='#2a2830'; c.beginPath();c.arc(cx,cy-6,13,0,Math.PI*2);c.fill(); c.fillStyle='#3a4a6a'; c.beginPath();c.arc(cx,cy-8,11,0,Math.PI*2);c.fill(); for(let i=0;i<5;i++){ const a=i*1.3+ts2*0.001; c.globalAlpha=(0.55+0.4*Math.sin(ts2*0.006+i))*lf; c.fillStyle='#6aa8ff'; c.fillRect(Math.round(cx+Math.cos(a)*6-1),Math.round(cy-8+Math.sin(a)*6-1),3,3);} c.globalAlpha=0.3+lf*0.7; }
    else if(t===T_RESS){ const g2=c.createRadialGradient(cx,cy-8,0,cx,cy-8,20); g2.addColorStop(0,`rgba(170,102,255,${(0.35+0.15*Math.sin(ts2*0.006))*lf})`);g2.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g2;c.fillRect(cx-20,cy-28,40,40); c.fillStyle='#2a0f4a';c.beginPath();c.moveTo(cx,cy-26);c.lineTo(cx+9,cy);c.lineTo(cx-9,cy);c.fill(); c.fillStyle='#aa66ff';c.beginPath();c.moveTo(cx,cy-22);c.lineTo(cx+6,cy-2);c.lineTo(cx-6,cy-2);c.fill(); c.fillStyle='#e0c0ff';c.fillRect(cx-1,cy-16,2,10); }
    else if(t===T_RFOOD){ c.fillStyle='#e8d0b0';c.fillRect(cx-2,cy-6,4,10); c.fillStyle='#cc2a24';c.beginPath();c.arc(cx,cy-8,9,Math.PI,0);c.fill(); c.fillStyle='#fff';c.fillRect(cx-5,cy-10,2,2);c.fillRect(cx+3,cy-9,2,2);c.fillRect(cx-1,cy-12,2,2); }
    c.globalAlpha=1;
  }
  // NPCs do Bosque — reaproveitam os VISUAIS do Acampamento (hub)
  if(t===T_NPCF||t===T_NPCC||t===T_NPCM){
    const cx=sx+DTS/2, cy=sy+DTS-6;
    if(t===T_NPCF && typeof drawHubSmith==='function') drawHubSmith(c,cx,cy,ts2);        // Brann → ferreiro do hub
    else if(t===T_NPCM && typeof drawHubMerlin==='function') drawHubMerlin(c,cx,cy,ts2); // Merlin → mago do hub
    else drawBosqueHealer(c,cx,cy,ts2);                                                  // Liora → curandeira
    // ── Ícone de CONVERSA (balão flutuante "fale comigo") ──
    const by=cy-50+Math.sin(ts2*0.004+cx)*2; c.globalAlpha=Math.min(1,0.4+lf);
    c.fillStyle='#f4f0e0';
    if(c.roundRect){ c.beginPath(); c.roundRect(cx-13,by-10,26,16,5); c.fill(); } else c.fillRect(cx-13,by-10,26,16);
    c.beginPath(); c.moveTo(cx-4,by+5); c.lineTo(cx+5,by+5); c.lineTo(cx-1,by+12); c.closePath(); c.fill();
    c.strokeStyle='rgba(200,168,75,0.7)'; c.lineWidth=1; if(c.roundRect){ c.beginPath(); c.roundRect(cx-13,by-10,26,16,5); c.stroke(); }
    c.fillStyle='#4a3a26'; for(let d=0;d<3;d++){ const yy=by-2+Math.sin(ts2*0.01+d)*0.5; c.fillRect(cx-7+d*5, Math.round(yy), 3,3); }
    c.globalAlpha=1;
  }
  // Baú de armazenamento do acampamento
  if(t===T_STORAGE){
    const cx=sx+DTS/2, cy=sy+DTS-6, pulse=0.6+0.4*Math.sin(ts2*0.004);
    c.globalAlpha=0.3+lf*0.7;
    const g=c.createRadialGradient(cx,cy-8,0,cx,cy-8,26); g.addColorStop(0,`rgba(120,220,150,${0.18*pulse})`); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(cx-26,cy-30,52,44);
    c.fillStyle='rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(cx,cy+3,15,4,0,0,Math.PI*2); c.fill();
    c.fillStyle='#3a2410'; c.fillRect(cx-15,cy-8,30,18); c.fillStyle='#5a3a18'; c.fillRect(cx-14,cy-7,28,16);
    c.fillStyle='#4a3014'; for(let i=-12;i<14;i+=6) c.fillRect(cx+i,cy-7,2,16);
    c.fillStyle='#4a3018'; c.fillRect(cx-15,cy-16,30,9); c.fillStyle='#6a4a20'; c.fillRect(cx-14,cy-15,28,3);
    c.fillStyle='#c8a84b'; c.fillRect(cx-15,cy-8,30,2); c.fillRect(cx-3,cy-13,6,10); c.fillStyle='#f0d080'; c.fillRect(cx-2,cy-9,4,3);
    c.fillStyle=`rgba(120,255,150,${0.65*pulse})`; c.font='bold 9px Courier New'; c.textAlign='center'; c.fillText('◈',cx,cy+3);
    c.globalAlpha=1;
    c.fillStyle=`rgba(160,255,180,${0.85*lf})`; c.font='bold 7px Courier New'; c.textAlign='center'; c.fillText('BAÚ',cx,sy-2); c.textAlign='left';
  }
}


// ── Responsive canvas sizing ──
function getDngCanvasSize(){
  const vp=typeof getResponsiveViewport==='function'
    ? getResponsiveViewport()
    : {width:window.innerWidth,height:window.innerHeight,coarse:false,portrait:window.innerHeight>=window.innerWidth};
  const touch=vp.coarse&&vp.width<=1024;
  const controls=document.getElementById('mobile-controls');
  const controlsH=touch&&vp.portrait
    ? Math.max(132,Math.ceil(controls?.getBoundingClientRect().height||0))
    : 0;
  const horizontalReserve=touch&&!vp.portrait?Math.min(320,Math.round(vp.width*0.34)):16;
  const maxW=Math.max(160,vp.width-horizontalReserve);
  const maxH=Math.max(120,vp.height-(touch&&vp.portrait?controlsH+70:16));
  if(typeof GameSettings!=='undefined'&&typeof GameSettings.getDisplaySize==='function'){
    const chosen=GameSettings.getDisplaySize(maxW,maxH);
    return{W:chosen.width,H:chosen.height};
  }
  // Maintain 4:3
  let W2=maxW,H2=Math.floor(maxW*0.75);
  if(H2>maxH){H2=maxH;W2=Math.floor(maxH*(4/3));}
  return{W:W2,H:H2};
}

// ── Main DNG object ──
const DNG={
  map:null,rooms:[],entities:[],particles:[],projectiles:[],floatingTexts:[],meleeSwings:[],
  explored:null,camX:0,camY:0,
  px:0,py:0,pHp:100,pMaxHp:100,pSpeed:1.9,
  pAttackCd:0,pAttackRange:54,pDmg:18,pInvTimer:0,
  pFacing:0,pFrameIdx:0,pFrameTick:0,pDir:'down',
  pKills:0,pCoins:0,torchFlicker:0,floor:1,pClassId:'mage',
  _necroSouls:0,_necroSoulCap:12,_necroPity:0,
  _necroSoulOrbs:[],_necroCorpses:[],_necroSummons:[],
  _necroSummonTimer:0,_necroRaiseTimer:0,_necroHealAt:0,_necroHealWindow:0,_necroHudTimer:0,
  // attack animation
  pAttackAnim:0, pAttackAnimMax:400,
  running:false,paused:false,invOpen:false,
  // Combat feedback
  _shake:{x:0,y:0,t:0,mag:0},
  _freeze:0,          // ms remaining in freeze-frame
  _bloodParts:[],     // blood/impact particles
  _projTrails:[],     // projectile trail dots
  keys:{},lastTs:0,raf:null,_sc:false,clock:new FrameClock(50),
  inv:[],equippedIdx:-1,
  ownedRelics:new Set(),
  _vamp:0,_crit:0,_shCd:undefined,_shActive:false,
  _aoe:false,_goldMult:1,_regenT:undefined,
  _webTimer:0,_chestCd:false,_barrelCd:false,
  // Responsive
  dW:640,dH:480,dScale:1,

  _ta(tx,ty){if(tx<0||tx>=MW||ty<0||ty>=MH)return T_WALL;return this.map[ty*MW+tx];},
  _tw(tx,ty){const t=this._ta(tx,ty);return t===T_FLOOR||t===T_STAIRS||t===T_TORCH||t===T_CHEST||t===T_BARREL||t===T_MERCHANT||t===T_PORTAL||t===T_RETURN||t===T_RWOOD||t===T_RSTONE||t===T_RORE||t===T_RESS||t===T_RFOOD||t===T_NPCF||t===T_NPCC||t===T_NPCM||t===T_STORAGE;},

  _resize(){
    const {W:nW,H:nH}=getDngCanvasSize();
    const cv=document.getElementById('canvas');
    if(!cv)return;
    this.dW=nW;this.dH=nH;this.dScale=nW/640;
    cv.style.width=nW+'px';cv.style.height=nH+'px';
    // Update HUD font sizes
    const hud=document.getElementById('dungeon-hud');
    if(hud){
      const fs=Math.max(9,Math.floor(11*this.dScale));
      hud.style.fontSize=fs+'px';
    }
    this._positionHud(cv);
    requestAnimationFrame(()=>this._positionHud(cv));
  },

  _positionHud(cv=document.getElementById('canvas')){
    if(!cv)return;
    const rect=cv.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const inset=Math.max(6,Math.min(12,Math.round(rect.width*0.012)));
    const leftHud=document.getElementById('dng-hud-left');
    if(leftHud){
      const compactScale=Math.max(0.58,Math.min(0.82,rect.width/780));
      leftHud.style.left=Math.round(rect.left+inset)+'px';
      leftHud.style.top=Math.round(rect.top+inset)+'px';
      leftHud.style.transform=`scale(${compactScale})`;
    }
    const msg=document.getElementById('dng-msg');
    if(msg){
      msg.style.left=Math.round(rect.left+rect.width/2)+'px';
      msg.style.top=Math.round(rect.top+inset)+'px';
    }
  },

  generateMap(fl){
    this.map=new Uint8Array(MW*MH);this.rooms=[];this.entities=[];
    this.particles=[];this.projectiles=[];this.floatingTexts=[];this.meleeSwings=[];
    this.resNodes=[];this.drops=[];
    this.explored=new Uint8Array(MW*MH);
    for(let i=0;i<70;i++){
      const rw=5+Math.floor(Math.random()*7),rh=5+Math.floor(Math.random()*7);
      const rx=2+Math.floor(Math.random()*(MW-rw-4)),ry=2+Math.floor(Math.random()*(MH-rh-4));
      if(this.rooms.some(r=>rx<r.x+r.w+2&&rx+rw+2>r.x&&ry<r.y+r.h+2&&ry+rh+2>r.y))continue;
      this.rooms.push({x:rx,y:ry,w:rw,h:rh});
      for(let ty=ry;ty<ry+rh;ty++)for(let tx=rx;tx<rx+rw;tx++)this.map[ty*MW+tx]=T_FLOOR;
      for(let ty=ry-1;ty<=ry+rh;ty++)for(let tx=rx-1;tx<=rx+rw;tx++)
        if(tx>=0&&tx<MW&&ty>=0&&ty<MH&&this.map[ty*MW+tx]===T_VOID)this.map[ty*MW+tx]=T_WALL;
    }
    for(let i=1;i<this.rooms.length;i++){
      const a=this.rooms[i-1],b=this.rooms[i];
      this._carve(Math.floor(a.x+a.w/2),Math.floor(a.y+a.h/2),Math.floor(b.x+b.w/2),Math.floor(b.y+b.h/2));
    }
    const r0=this.rooms[0];
    this.px=(r0.x+Math.floor(r0.w/2))*DTS+DTS/2;this.py=(r0.y+Math.floor(r0.h/2))*DTS+DTS/2;
    const rL=this.rooms[this.rooms.length-1];
    this.map[(rL.y+Math.floor(rL.h/2))*MW+(rL.x+Math.floor(rL.w/2))]=T_STAIRS;
    for(let i=1;i<this.rooms.length;i++){
      const rm=this.rooms[i],isBoss=(i===this.rooms.length-1);
      if(!isBoss){
        [[rm.x+1,rm.y+1],[rm.x+rm.w-2,rm.y+1],[rm.x+1,rm.y+rm.h-2],[rm.x+rm.w-2,rm.y+rm.h-2]].forEach(([tx,ty])=>{
          if(this.map[ty*MW+tx]===T_FLOOR)this.map[ty*MW+tx]=T_TORCH;
        });
        // Baús — chance maior + possibilidade de 2 por sala
        if(Math.random()<0.65){const p=this._rf(rm);if(p)this.map[p.y*MW+p.x]=T_CHEST;}
        if(Math.random()<0.30){const p=this._rf(rm);if(p)this.map[p.y*MW+p.x]=T_CHEST;}
        if(Math.random()<0.50){const p=this._rf(rm);if(p)this.map[p.y*MW+p.x]=T_BARREL;}
        const cnt=2+Math.floor(Math.random()*4)+Math.floor(fl/2);
        for(let e=0;e<cnt;e++){const p=this._rf(rm);if(p)this._spawnEnemy(p.x*DTS+DTS/2,p.y*DTS+DTS/2,fl);}
      } else {
        this._spawnBoss(Math.floor(rm.x+rm.w/2)*DTS+DTS/2,Math.floor(rm.y+rm.h/2)*DTS+DTS/2,fl);
      }
    }
    // Spawn exactly 1 merchant in a random non-boss, non-start room
    const merchantRooms = this.rooms.slice(1, this.rooms.length-1);
    if(merchantRooms.length>0){
      const mr = merchantRooms[Math.floor(Math.random()*merchantRooms.length)];
      const mp = this._rf(mr);
      if(mp) this.map[mp.y*MW+mp.x]=T_MERCHANT;
    }
    // Portal verde do Bosque da Fenda (~50% dos pisos, so na dungeon normal)
    if(!this._inBosque && merchantRooms.length>0 && Math.random()<0.5){
      const pr = merchantRooms[Math.floor(Math.random()*merchantRooms.length)];
      const pp = this._rf(pr); if(pp && this.map[pp.y*MW+pp.x]===T_FLOOR) this.map[pp.y*MW+pp.x]=T_PORTAL;
    }
    this._populateResNodes(fl);
  },
  // === BOSQUE DA FENDA — entrada/saida/geracao (usa o motor da dungeon) ===
  _enterBosque(){
    this._bosqueReturn = this.floor;
    this._necroClearFloor(true);
    this._inBosque = true; this._prevBiome = this._biome; this._biome = BIOMES.bosque;
    this._genBosque();
    this._msg('🌲 Voce atravessou a Fenda... Bem-vindo ao Bosque da Fenda.',2600);
    this._parts(this.px,this.py,'#8fe07a',20,60); this._updateHUD();
    setTimeout(()=>{ this._portalCd=false; },700);
  },
  _exitBosque(){
    this._inBosque = false; this.floor = this._bosqueReturn||this.floor;
    this._biome = getBiomeForFloor(this.floor);
    this.generateMap(this.floor);
    this._msg('↩ Voce retornou a Dungeon.',2000); this._updateHUD();
    setTimeout(()=>{ this._portalCd=false; },700);
  },
  _genBosque(){
    this.map=new Uint8Array(MW*MH); this.rooms=[]; this.entities=[];
    this.particles=[]; this.projectiles=[]; this.floatingTexts=[]; this.meleeSwings=[];
    this.resNodes=[]; this.drops=[];
    this.explored=new Uint8Array(MW*MH);
    for(let i=0;i<10;i++){ const rw=9+Math.floor(Math.random()*6),rh=9+Math.floor(Math.random()*6);
      const rx=2+Math.floor(Math.random()*(MW-rw-4)),ry=2+Math.floor(Math.random()*(MH-rh-4));
      if(this.rooms.some(r=>rx<r.x+r.w+3&&rx+rw+3>r.x&&ry<r.y+r.h+3&&ry+rh+3>r.y))continue;
      this.rooms.push({x:rx,y:ry,w:rw,h:rh});
      for(let ty=ry;ty<ry+rh;ty++)for(let tx=rx;tx<rx+rw;tx++)this.map[ty*MW+tx]=T_FLOOR;
      for(let ty=ry-1;ty<=ry+rh;ty++)for(let tx=rx-1;tx<=rx+rw;tx++) if(tx>=0&&tx<MW&&ty>=0&&ty<MH&&this.map[ty*MW+tx]===T_VOID)this.map[ty*MW+tx]=T_WALL;
    }
    for(let i=1;i<this.rooms.length;i++){ const a=this.rooms[i-1],b=this.rooms[i]; this._carve(Math.floor(a.x+a.w/2),Math.floor(a.y+a.h/2),Math.floor(b.x+b.w/2),Math.floor(b.y+b.h/2)); }
    const r0=this.rooms[0];
    this.px=(r0.x+Math.floor(r0.w/2))*DTS+DTS/2; this.py=(r0.y+Math.floor(r0.h/2))*DTS+DTS/2;
    this.map[(r0.y+1)*MW+(r0.x+1)]=T_RETURN;
    // NPCs no salao inicial (Acampamento das Runas dentro do Bosque)
    const npcRow=r0.y+r0.h-2;
    const npcSpots=[[r0.x+2,npcRow,T_NPCF],[r0.x+Math.floor(r0.w/2),npcRow,T_NPCC],[r0.x+r0.w-3,npcRow,T_NPCM]];
    for(const [tx,ty,tt] of npcSpots){ if(tx>r0.x&&tx<r0.x+r0.w-1&&this.map[ty*MW+tx]===T_FLOOR) this.map[ty*MW+tx]=tt; }
    { const stx=r0.x+Math.floor(r0.w/2), sty=r0.y+2; if(this.map[sty*MW+stx]===T_FLOOR) this.map[sty*MW+stx]=T_STORAGE; }
    for(const rm of this.rooms){ [[rm.x+1,rm.y+1],[rm.x+rm.w-2,rm.y+rm.h-2]].forEach(([tx,ty])=>{ if(this.map[ty*MW+tx]===T_FLOOR)this.map[ty*MW+tx]=T_TORCH; }); }
    this._populateResNodes(Math.max(1,this._bosqueReturn||1));
    for(const rm of this.rooms.slice(1)){ if(Math.random()<0.6){ const p=this._rf(rm); if(p)this._spawnEnemy(p.x*DTS+DTS/2,p.y*DTS+DTS/2,Math.max(1,this._bosqueReturn||1)); } }
    this.camX=Math.max(0,Math.min(MW*DTS-W,this.px-W/2)); this.camY=Math.max(0,Math.min(MH*DTS-H,this.py-H/2));
  },
  _collectNode(tx,ty,tile){
    const def=MVP_NODES[tile]; if(!def) return;
    let q=def.lo+Math.floor(Math.random()*(def.hi-def.lo+1));
    q=Math.max(1,Math.round(q*(1+0.15*(MVP.upg.mestre||0))));   // Eco Runico
    MVP.res[def.res]=(MVP.res[def.res]||0)+q;
    if(def.ess && Math.random()<def.ess) MVP.res.essencia=(MVP.res.essencia||0)+1;
    const ic={madeira:'🪵',pedra:'🪨',minerio:'⛏️',essencia:'✨',comida:'🍄'}[def.res];
    this._ft(this.px,this.py-30,`+${q} ${ic}`,'#8fe07a'); this._parts(this.px,this.py,'#8fe07a',10,40);
    this.map[ty*MW+tx]=T_FLOOR; mvpSave(); this._updateHUD();
  },
  // === Painel de NPC do Bosque (dialogo + upgrade + missao) ===
  _openNpc(id){
    this.running=false; const self=this; const npc=MVP_NPCS[id]; const ICO={madeira:'🪵',pedra:'🪨',minerio:'⛏️',essencia:'✨',comida:'🍄'};
    document.getElementById('dng-npc-overlay')?.remove();
    // backdrop suave (nao cobre o cenario) + caixa ancorada embaixo
    const el=document.createElement('div'); el.id='dng-npc-overlay';
    el.style.cssText='position:fixed;left:0;right:0;bottom:0;top:0;z-index:64;font-family:Courier New,monospace;display:flex;align-items:flex-end;justify-content:center;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(2,6,3,0.55) 100%);pointer-events:auto;';
    document.body.appendChild(el);
    const box=document.createElement('div'); el.appendChild(box);
    box.style.cssText='width:min(1080px,97vw);margin:0 8px 22px;background:linear-gradient(165deg,#0a1c10,#05130a 55%,#020a06);border:2px solid '+npc.col+'aa;border-radius:16px;box-shadow:0 0 0 3px #021006,0 -6px 48px rgba(0,0,0,0.75),0 0 32px '+npc.col+'44;padding:clamp(20px,2.6vw,34px);box-sizing:border-box;transform:translateY(120%);opacity:0;transition:transform .30s cubic-bezier(.2,.9,.3,1),opacity .30s;';
    requestAnimationFrame(()=>{ box.style.transform='translateY(0)'; box.style.opacity='1'; });
    const closeNpc=()=>{ box.style.transform='translateY(120%)'; box.style.opacity='0'; document.removeEventListener('keydown',keyH,true); setTimeout(()=>{ el.remove(); self.running=true; self.lastTs=0; self._updateMissionHud(); if(self.raf)cancelAnimationFrame(self.raf); self.raf=requestAnimationFrame(ts=>self._loop(ts)); },300); };
    const keyH=(e)=>{ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); closeNpc(); } };
    document.addEventListener('keydown',keyH,true);
    el.addEventListener('mousedown',(e)=>{ if(e.target===el) closeNpc(); });
    const render=(msg)=>{
      const lvl=MVP.upg[id]||0, maxed=lvl>=3, cost=maxed?null:npc.costs[lvl];
      const afford=cost&&Object.entries(cost).every(([k,v])=>(MVP.res[k]||0)>=v);
      const costStr=cost?Object.entries(cost).map(([k,v])=>{ const ok=(MVP.res[k]||0)>=v; return '<span style=\'color:'+(ok?'#8fe0a8':'#e07a6a')+'\'>'+ICO[k]+v+'</span>'; }).join(' '):'';
      const m=MVP.missions[id]||{accepted:false,progress:0,done:false};
      const resBar=Object.entries(MVP.res).map(([k,v])=>'<span style=\'font-size:13px;color:#cfe8d6;margin-left:10px;\'>'+ICO[k]+' '+v+'</span>').join('');
      // monta lista de ESCOLHAS destacadas
      const choices=[];
      if(id==='curandeira'){
        choices.push({lbl:'🧪 Curar 30% da vida <span style=\'opacity:.7\'>(3🍄)</span>', on:()=>render(self._mvpHeal()), en:MVP.res.comida>=3});
        choices.push({lbl:'⚗ Preparar pocao <span style=\'opacity:.7\'>(5🍄 + 1✨)</span>', on:()=>render(self._mvpPotion()), en:MVP.res.comida>=5&&MVP.res.essencia>=1});
      }
      if(maxed) choices.push({lbl:'✦ '+npc.upgName+' — <span style=\'color:#8fe0a8\'>Nivel maximo</span>', on:null, en:false});
      else choices.push({lbl:'⚒ Melhorar '+npc.upgName+' <span style=\'opacity:.7\'>Nv '+lvl+'/3</span> — '+costStr, on:afford?()=>{ self._mvpBuy(id); render('Feito. '+npc.upgName+' agora esta no nivel '+MVP.upg[id]+'.'); }:null, en:afford, hint:afford?'':'recursos insuficientes'});
      if(m.done) choices.push({lbl:'✓ Missao "'+npc.missName+'" concluida', on:null, en:false, done:true});
      else if(!m.accepted) choices.push({lbl:'📜 Aceitar missao: '+npc.missName, on:()=>render(self._mvpMission(id)), en:true, gold:true});
      else if(m.progress>=npc.missTarget) choices.push({lbl:'✓ Entregar missao: '+npc.missName, on:()=>render(self._mvpMission(id)), en:true, ready:true});
      else choices.push({lbl:'📜 '+npc.missName+' — <b>'+m.progress+'/'+npc.missTarget+'</b>', on:null, en:false});
      choices.push({lbl:'↩ Encerrar conversa', on:closeNpc, en:true, close:true});
      const choicesHtml=choices.map((ch,i)=>{
        const bd = ch.ready?'#3fce6a':ch.gold?'#e8cf90':ch.close?'rgba(90,200,125,0.5)':(ch.en?'rgba(120,220,150,0.55)':'rgba(70,110,80,0.3)');
        const cl = ch.en?(ch.ready?'#c8ffd8':ch.gold?'#f0d080':'#dfe8dc'):'#6a8a76';
        const bg = ch.en?(ch.ready?'linear-gradient(180deg,rgba(30,90,45,0.6),rgba(12,45,22,0.7))':'rgba(8,24,14,0.85)'):'rgba(6,16,10,0.6)';
        return '<button class=\'npc-choice\' data-i=\''+i+'\' '+(ch.en?'':'disabled')+' style=\'display:block;width:100%;text-align:left;margin-top:9px;background:'+bg+';border:2px solid '+bd+';border-radius:9px;padding:13px 18px;cursor:'+(ch.en?'pointer':'default')+';font-family:Courier New,monospace;font-size:clamp(15px,1.6vw,18px);color:'+cl+';letter-spacing:.4px;transition:all .12s;\'>▸ '+ch.lbl+(ch.hint?' <span style=\'font-size:12px;color:#e07a6a\'>('+ch.hint+')</span>':'')+'</button>';
      }).join('');
      box.innerHTML=
        '<div style=\'display:flex;align-items:flex-start;gap:20px;\'>'+
          '<div style=\'flex-shrink:0;width:clamp(96px,11vw,124px);height:clamp(96px,11vw,124px);border-radius:14px;background:radial-gradient(circle at 50% 40%,'+npc.col+'55,rgba(0,0,0,0.7));border:2px solid '+npc.col+';box-shadow:inset 0 0 18px rgba(0,0,0,0.6),0 0 20px '+npc.col+'44;display:flex;align-items:center;justify-content:center;font-size:clamp(52px,6.6vw,76px);\'>'+npc.icon+'</div>'+
          '<div style=\'flex:1;min-width:0;\'>'+
            '<div style=\'display:flex;align-items:baseline;flex-wrap:wrap;gap:9px;\'><span style=\'font-size:clamp(23px,2.7vw,31px);font-weight:900;color:'+npc.col+';text-shadow:0 2px 0 rgba(0,0,0,0.5);\'>'+npc.name+'</span><span style=\'font-size:12px;color:#7fae8c;letter-spacing:2px;text-transform:uppercase;\'>'+npc.role+'</span><span style=\'margin-left:auto;\'>'+resBar+'</span></div>'+
            '<div style=\'font-size:clamp(18px,2vw,23px);color:#eef4ea;line-height:1.8;margin:12px 0 6px;min-height:66px;\'>'+msg+'</div>'+
          '</div>'+
        '</div>'+
        '<div style=\'margin-top:8px;\'>'+choicesHtml+'</div>'+
        '<div style=\'text-align:right;font-size:11px;color:#5a8a6e;margin-top:8px;letter-spacing:1px;\'>ESC / clique fora para sair</div>';
      box.querySelectorAll('.npc-choice').forEach(b=>{ const ci=+b.dataset.i; const ch=choices[ci];
        if(ch.en&&ch.on){ b.onmouseenter=()=>{ b.style.transform='translateX(4px)'; b.style.filter='brightness(1.15)'; }; b.onmouseleave=()=>{ b.style.transform='none'; b.style.filter='none'; }; b.onclick=ch.on; } });
    };
    const first=!MVP.talked[id]; if(first){ MVP.talked[id]=true; mvpSave(); }
    render(first?npc.intro:npc.def);
  },
  // Rastreador de missao no HUD (abaixo da barra de vida)
  _updateMissionHud(){
    const el=document.getElementById('dng-mission-hud'); if(!el) return;
    let id=null; for(const k in MVP_NPCS){ const mm=MVP.missions[k]; if(mm&&mm.accepted&&!mm.done){ id=k; break; } }
    if(!id){ el.style.display='none'; return; }
    const npc=MVP_NPCS[id], m=MVP.missions[id], done=m.progress>=npc.missTarget;
    const pct=Math.min(100,Math.round(m.progress/npc.missTarget*100)), nome=npc.name.split(' ')[0];
    el.style.display='block';
    el.innerHTML='<div style="font-size:9px;color:#8a7050;letter-spacing:2px;">📜 MISSAO</div>'+
      '<div style="font-size:12px;color:#f0d080;font-weight:bold;margin:1px 0 3px;">'+npc.missName+'</div>'+
      '<div style="font-size:11px;color:'+(done?'#8fe0a8':'#c8b890')+';">'+(done?'✓ Volte falar com '+nome:npc.missDesc)+'</div>'+
      '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;"><div style="flex:1;height:6px;background:rgba(0,0,0,0.5);border-radius:3px;overflow:hidden;"><div style="height:100%;width:'+pct+'%;background:'+(done?'linear-gradient(90deg,#3fae5a,#7de89a)':'linear-gradient(90deg,#c8a84b,#f0d080)')+';"></div></div><span style="font-size:11px;color:#e8cf90;font-weight:bold;">'+Math.min(m.progress,npc.missTarget)+'/'+npc.missTarget+'</span></div>';
  },
  // Localiza o NPC-destino de uma missão PRONTA PARA ENTREGAR (progresso>=alvo, não concluída).
  // Só no Bosque (onde os NPCs existem). Cacheia posições dos NPCs geradas em _genBosque.
  _missionMarkerTile(){
    if(!this._inBosque) return null;
    const tileOf={ferreiro:T_NPCF,curandeira:T_NPCC,mestre:T_NPCM};
    for(const id in MVP_NPCS){
      const m=MVP.missions[id], npc=MVP_NPCS[id];
      if(m&&m.accepted&&!m.done&&m.progress>=npc.missTarget){
        const want=tileOf[id]; if(want===undefined) continue;
        // procura tile do NPC (cache leve)
        if(!this._npcTileCache) this._npcTileCache={};
        let pos=this._npcTileCache[id];
        if(!pos||this.map[pos.ty*MW+pos.tx]!==want){ pos=null;
          for(let ty=0;ty<MH&&!pos;ty++)for(let tx=0;tx<MW;tx++){ if(this.map[ty*MW+tx]===want){ pos={tx,ty}; break; } }
          this._npcTileCache[id]=pos;
        }
        if(pos) return {tx:pos.tx,ty:pos.ty,id};
      }
    }
    return null;
  },
  // Pino vermelho pulsante sobre o NPC-destino da missão pronta (no mundo)
  _drawMissionMarker(c){
    const mk=this._missionMarkerTile(); if(!mk) return;
    const wx=mk.tx*DTS+DTS/2, wy=mk.ty*DTS+DTS/2;
    const x=Math.floor(wx-this.camX), y=Math.floor(wy-this.camY);
    if(x<-40||x>W+40||y<-60||y>H+40) return;
    const t=performance.now(), bob=Math.sin(t*0.005)*3, py=y-46+bob;
    const pulse=0.6+0.4*Math.sin(t*0.006);
    c.save();
    // halo
    const g=c.createRadialGradient(x,py,0,x,py,20); g.addColorStop(0,'rgba(255,70,60,'+(0.35*pulse)+')'); g.addColorStop(1,'rgba(255,70,60,0)');
    c.fillStyle=g; c.fillRect(x-20,py-20,40,40);
    // pino (gota)
    c.fillStyle='#ff3b30'; c.strokeStyle='#7a0e0a'; c.lineWidth=1.5;
    c.beginPath(); c.arc(x,py,8,Math.PI*0.15,Math.PI*0.85,true); c.lineTo(x,py+13); c.closePath(); c.fill(); c.stroke();
    c.fillStyle='#ffd0cc'; c.beginPath(); c.arc(x,py-1,3.2,0,Math.PI*2); c.fill();
    // "!" flutuante
    c.fillStyle='#fff2f0'; c.font='bold 11px Courier New'; c.textAlign='center'; c.textBaseline='middle';
    c.fillText('!',x,py-1);
    c.textAlign='left'; c.textBaseline='alphabetic';
    c.restore();
  },
  _mvpBuy(id){

    const npc=MVP_NPCS[id], lvl=MVP.upg[id]||0; if(lvl>=3) return; const cost=npc.costs[lvl];
    if(!Object.entries(cost).every(([k,v])=>(MVP.res[k]||0)>=v)) return;
    Object.entries(cost).forEach(([k,v])=>{MVP.res[k]-=v; spendMat(k,v);}); MVP.upg[id]=lvl+1;
    if(id==='curandeira'){ this.pMaxHp+=10; this.pHp=Math.min(this.pMaxHp,this.pHp+10); this._updateHUD(); }
    mvpSave(); this._ft(this.px,this.py-40,'✦ '+npc.upgName+' Nv'+MVP.upg[id],npc.col);
  },
  _mvpMission(id){
    const npc=MVP_NPCS[id]; let m=MVP.missions[id];
    if(!m||!m.accepted){ MVP.missions[id]={accepted:true,progress:0,done:false}; mvpSave(); return 'Missao aceita: '+npc.missDesc+' Volte quando terminar.'; }
    if(!m.done && m.progress>=npc.missTarget){ m.done=true; Object.entries(npc.missReward).forEach(([k,v])=>{MVP.res[k]=(MVP.res[k]||0)+v; MVP.mats[k]=(MVP.mats[k]||0)+v;}); mvpSave();
      const rw=Object.entries(npc.missReward).map(([k,v])=>{ const ic={madeira:'🪵',pedra:'🪨',minerio:'⛏️',essencia:'✨',comida:'🍄'}[k]; return '+'+v+ic; }).join(' ');
      return 'Missao concluida! Recompensa: '+rw; }
    return npc.def;
  },
  _mvpHeal(){ if(MVP.res.comida<3) return 'Nao ha milagre sem cogumelo ou fruto. Traga comida.'; MVP.res.comida-=3; spendMat('comida',3); this.pHp=Math.min(this.pMaxHp,this.pHp+Math.round(this.pMaxHp*0.30)); mvpSave(); this._updateHUD(); return 'Pronto. Respire devagar. A dor ja nao manda mais em voce.'; },
  _mvpPotion(){ if(MVP.res.comida<5||MVP.res.essencia<1) return 'Preciso de 5 comida e 1 essencia para a pocao.'; MVP.res.comida-=5; MVP.res.essencia-=1; spendMat('comida',5); spendMat('essencia',1); MVP.potions=(MVP.potions||0)+1; this.pHp=Math.min(this.pMaxHp,this.pHp+Math.round(this.pMaxHp*0.40)); mvpSave(); this._updateHUD(); return 'Leve isto. Nao espere estar quase caindo para usar.'; },
  // === BAÚ DE ARMAZENAMENTO (materiais permanentes, categorias/filtros) ===
  _openStorage(){
    this.running=false; const self=this;
    document.getElementById('dng-storage-overlay')?.remove();
    const el=document.createElement('div'); el.id='dng-storage-overlay';
    el.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:64;background:rgba(2,8,4,0.84);font-family:Courier New,monospace;padding:14px;box-sizing:border-box;';
    document.body.appendChild(el);
    const close=()=>{ document.removeEventListener('keydown',keyH,true); el.remove(); self.running=true; self.lastTs=0; if(self.raf)cancelAnimationFrame(self.raf); self.raf=requestAnimationFrame(ts=>self._loop(ts)); };
    const keyH=(e)=>{ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); close(); } };
    document.addEventListener('keydown',keyH,true);
    el.addEventListener('mousedown',(e)=>{ if(e.target===el) close(); });
    let filtro='Todos';
    const render=()=>{
      const cats=['Todos',...MAT_CAT_ORDER];
      const entries=Object.entries(MVP.mats||{}).filter(([id,q])=>q>0 && MATERIALS[id]);
      const total=entries.reduce((a,[,q])=>a+q,0), tipos=entries.length;
      const tabs=cats.map(cat=>{ const on=cat===filtro; return "<button class='st-tab' data-cat='"+cat+"' style='background:"+(on?'linear-gradient(180deg,rgba(40,120,60,0.5),rgba(15,50,25,0.6))':'rgba(6,20,12,0.8)')+";border:2px solid "+(on?'#7de89a':'rgba(60,140,90,0.35)')+";border-radius:7px;padding:6px 12px;cursor:pointer;font-family:Courier New,monospace;font-size:12px;color:"+(on?'#c8ffd8':'#6fae86')+";letter-spacing:1px;'>"+cat+"</button>"; }).join('');
      const vis=entries.filter(([id])=>filtro==='Todos'||MATERIALS[id].cat===filtro)
        .sort((a,b)=>{ const ma=MATERIALS[a[0]],mb=MATERIALS[b[0]]; return (MAT_CAT_ORDER.indexOf(ma.cat)-MAT_CAT_ORDER.indexOf(mb.cat))||(b[1]-a[1]); });
      const cards = vis.length ? vis.map(([id,q])=>{ const m=MATERIALS[id]; const rc=MAT_RAR_COL[m.rar]||'#aaa';
        return "<div title='"+m.desc+"' style='background:linear-gradient(160deg,rgba(8,20,12,0.97),rgba(4,12,8,0.98));border:2px solid "+rc+"66;border-radius:8px;padding:10px;text-align:center;'>"
          +"<div style='font-size:26px;line-height:1;'>"+m.icon+"</div>"
          +"<div style='font-size:12px;color:#eef4ea;font-weight:bold;margin:4px 0 2px;line-height:1.2;'>"+m.name+"</div>"
          +"<div style='font-size:9px;color:"+rc+";letter-spacing:1px;text-transform:uppercase;'>"+m.rar+" · "+m.biome+"</div>"
          +"<div style='font-size:16px;color:#f0d080;font-weight:bold;margin-top:3px;'>×"+q+"</div>"
          +"<div style='font-size:9px;color:#7fae8c;margin-top:3px;line-height:1.35;'>"+m.desc+"</div></div>"; }).join('')
        : "<div style='grid-column:1/-1;text-align:center;color:#5a9a6e;font-size:13px;padding:30px;'>Nenhum material desta categoria ainda.<br>Minere árvores, pedras e cristais nas dungeons!</div>";
      el.innerHTML="<div style='width:min(720px,96vw);max-height:92vh;overflow-y:auto;background:linear-gradient(165deg,#08180e,#04100a 60%,#020a06);border:2px solid rgba(90,220,130,0.55);border-radius:12px;box-shadow:0 0 0 3px #021006,0 0 40px rgba(60,200,110,0.18);padding:18px;box-sizing:border-box;'>"
        +"<div style='display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap;'>"
          +"<div style='font-size:34px;'>📦</div>"
          +"<div><div style='font-size:20px;color:#9fe8b4;letter-spacing:2px;font-weight:900;text-shadow:0 0 12px rgba(90,230,140,0.4);'>BAÚ DO ACAMPAMENTO</div>"
          +"<div style='font-size:11px;color:#7fae8c;letter-spacing:1px;'>Armazenamento permanente · "+tipos+" tipos · "+total+" itens</div></div>"
          +"<button id='st-close' style='margin-left:auto;background:rgba(4,18,10,0.95);border:2px solid rgba(90,200,125,0.5);border-radius:6px;padding:8px 16px;cursor:pointer;font-family:Courier New,monospace;font-size:14px;color:#c8ffd8;letter-spacing:2px;'>✖ FECHAR</button></div>"
        +"<div style='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;'>"+tabs+"</div>"
        +"<div style='display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;'>"+cards+"</div>"
        +"<div style='text-align:center;font-size:11px;color:#5a8a6e;margin-top:12px;'>Materiais salvos entre partidas · usados em melhorias e (em breve) fabricação · ESC fecha</div></div>";
      el.querySelector('#st-close').onclick=close;
      el.querySelectorAll('.st-tab').forEach(b=>b.onclick=()=>{ filtro=b.dataset.cat; render(); });
    };
    render();
  },
  _drawBosqueRes(c){
    if(!this._inBosque) return;
    let x=12,y=10; c.font='bold 13px Courier New'; c.textAlign='left';
    for(const [id,ic] of MVP_RES){ const txt=`${ic} ${MVP.res[id]||0}`; const w=c.measureText(txt).width+16;
      c.fillStyle='rgba(6,18,10,0.85)'; c.fillRect(x,y,w,22);
      c.strokeStyle='rgba(120,220,150,0.45)'; c.lineWidth=1; c.strokeRect(x,y,w,22);
      c.fillStyle='#dfffe6'; c.fillText(txt,x+8,y+15); x+=w+6; }
    c.textAlign='left';
  },
  // === MINERAÇÃO ===
  _populateResNodes(fl){
    if(!this.resNodes) this.resNodes=[]; if(!this.drops) this.drops=[];
    const sk=biomeSkin(this._biome); const kinds=sk.kinds;
    const roomsForNodes = this.rooms.slice(1);  // evita a sala inicial (spawn/NPCs)
    const dense = sk.mode==='bosque';
    for(const rm of roomsForNodes){
      const n=(dense?3:1)+Math.floor(Math.random()*(dense?4:3));
      for(let k=0;k<n;k++){ if(Math.random()<(dense?0.9:0.7)){
        const p=this._rf(rm); if(!p||this.map[p.y*MW+p.x]!==T_FLOOR) continue;
        const kind=kinds[Math.floor(Math.random()*kinds.length)]; const def=NODE_KINDS[kind];
        // minério raro: só 30% das vezes que sortear 'ore'
        if(kind==='ore'&&Math.random()>0.5) { k--; continue; }
        this.resNodes.push({kind,x:p.x*DTS+DTS/2,y:p.y*DTS+DTS/2,hp:def.hp,maxHp:def.hp,tool:def.tool,r:15,flash:0,shake:0});
      } }
    }
  },
  _mineNode(n){
    const def=NODE_KINDS[n.kind]; const equip=this.inv[this.equippedIdx]; const wId=equip?equip.defId:'unarmed';
    const ok=(TOOL_OK[n.tool]||[]).includes(wId);
    const base=(equip?equip.dmg:this.pDmg)||14;
    const dealt=Math.max(1,Math.round(base*(ok?1.0:0.35)));
    n.hp-=dealt; n.flash=180; n.shake=7;
    const sk=biomeSkin(this._biome);
    this._parts(n.x,n.y-8, sk.part||def.part, ok?6:3, 2.6);
    if(!ok && !n._warned){ n._warned=true; setTimeout(()=>{n._warned=false;},900); this._ft(n.x,n.y-26,'⚠ ferramenta errada','#e0b040'); }
    if(n.hp<=0) this._destroyNode(n);
  },
  _destroyNode(n){
    const def=NODE_KINDS[n.kind]; const sk=biomeSkin(this._biome);
    let q=Math.max(1,Math.round((def.lo+Math.floor(Math.random()*(def.hi-def.lo+1)))*(1+0.15*(MVP.upg.mestre||0))));
    const nome=(RES_NAME[def.res]||def.res)+sk.suf;
    // solta drops físicos (até 3 pilhas)
    const stacks=Math.min(q,3); const per=Math.floor(q/stacks), extra=q-per*stacks;
    const mid=matIdFor(def.res, sk.mode);
    for(let i=0;i<stacks;i++) this._spawnDrop(n.x,n.y-6,def.res, mid, per+(i<extra?1:0), matName(mid));
    if(def.ess && Math.random()<def.ess){ const em=matIdFor('essencia', sk.mode); this._spawnDrop(n.x,n.y-6,'essencia', em, 1, matName(em)); }
    this._parts(n.x,n.y-8, sk.part||def.part, 16, 4.2);
    this._shake={x:0,y:0,t:150,mag:2.4};
    this.resNodes=this.resNodes.filter(x=>x!==n);
  },
  _spawnDrop(x,y,base,mat,qty,name){
    const a=Math.random()*Math.PI*2, sp=1.1+Math.random()*1.5;
    this.drops.push({x,y,base,mat,qty,name, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-1.2, t:0, life:18000});
  },
  _updateResources(dt){
    if(this.resNodes) for(const n of this.resNodes){ if(n.shake>0) n.shake-=dt/16.67; if(n.flash>0) n.flash-=dt; }
    if(!this.drops) return; const f=dt/16.67;
    for(let i=this.drops.length-1;i>=0;i--){ const d=this.drops[i]; d.t+=dt;
      if(d.t<300){ d.x+=d.vx*f; d.y+=d.vy*f; d.vy+=0.14*f; d.vx*=0.90; d.vy*=0.90; }
      const dx=this.px-d.x, dy=this.py-d.y, dist=Math.hypot(dx,dy)||1;
      if(dist<100 && d.t>140){ const pull=Math.min(11, 150/Math.max(8,dist)); d.x+=dx/dist*pull*f; d.y+=dy/dist*pull*f; }
      if(dist<24){ MVP.res[d.base]=(MVP.res[d.base]||0)+d.qty; MVP.mats[d.mat]=(MVP.mats[d.mat]||0)+d.qty; this._notify((d.name||d.base)+' +'+d.qty, RES_ICON[d.base]); this._parts(d.x,d.y,'#dfffe6',5,2); mvpSave(); this._updateHUD(); this.drops.splice(i,1); continue; }
      d.life-=dt; if(d.life<=0) this.drops.splice(i,1);
    }
  },
  _notify(text,icon){
    // notificação discreta (empilha no canto)
    if(!this._notes) this._notes=[];
    this._notes.unshift({text:(icon?icon+' ':'')+text, life:2200}); if(this._notes.length>4) this._notes.pop();
  },
  _drawResNodes(c){
    if(!this.resNodes) return; const sk=biomeSkin(this._biome); const mode=sk.mode;
    for(const n of this.resNodes){
      let x=Math.floor(n.x-this.camX), y=Math.floor(n.y-this.camY);
      // seleciona sprite: árvore/pedra têm variante por bioma; demais usam base
      let grid,pal,PX;
      if((n.kind==='tree'||n.kind==='rock') && NODE_SPR[n.kind]){ const v=NODE_SPR[n.kind][mode]||NODE_SPR[n.kind].normal; grid=v[0]; pal=v[1]; PX=(n.kind==='tree')?4:3; }
      else { grid=NSPR_BY[n.kind]||NSPR_ROCK; pal=NPAL[n.kind]||NPAL.rock; PX=2; }
      const gw=grid[0].length*PX, gh=grid.length*PX;
      if(x<-gw||x>W+gw||y<-gh-20||y>H+gh) continue;
      if(n.shake>0){ x+=Math.round((Math.random()*4-2)*(n.shake/7)); }
      const hpf=n.hp/n.maxHp, flash=n.flash>0&&Math.floor(n.flash/60)%2===0;
      const ox=Math.round(x-gw/2), oy=Math.round(y+6-gh);
      // glow em minério/cristal
      if(n.kind==='crystal'||n.kind==='ore'){ const gc=n.kind==='crystal'?(mode==='ice'?'190,235,255':'200,160,255'):'255,180,60';
        const g2=c.createRadialGradient(x,y-gh*0.35,0,x,y-gh*0.35,gw*0.75); g2.addColorStop(0,'rgba('+gc+','+(0.20+0.1*Math.sin(this.torchFlicker*3))+')'); g2.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g2; c.fillRect(x-gw,y-gh,gw*2,gh*1.4); }
      // sombra proporcional
      c.fillStyle='rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x,y+7,Math.max(10,gw*0.24),4,0,0,Math.PI*2); c.fill();
      // sprite
      for(let r=0;r<grid.length;r++){ const row=grid[r];
        for(let cc=0;cc<row.length;cc++){ const ch=row[cc]; if(ch===' ')continue; const col=flash?'#ffffff':pal[ch]; if(!col)continue;
          c.fillStyle=col; c.fillRect(ox+cc*PX, oy+r*PX, PX, PX); } }
      // rachaduras conforme dano (na base do nó)
      if(hpf<0.66){ c.strokeStyle='rgba(0,0,0,0.5)'; c.lineWidth=1.4; c.beginPath(); c.moveTo(x-5,oy+gh*0.62); c.lineTo(x-1,oy+gh*0.78); c.lineTo(x-4,oy+gh*0.92); c.stroke(); }
      if(hpf<0.33){ c.strokeStyle='rgba(0,0,0,0.5)'; c.lineWidth=1.4; c.beginPath(); c.moveTo(x+5,oy+gh*0.64); c.lineTo(x+1,oy+gh*0.80); c.lineTo(x+4,oy+gh*0.93); c.stroke(); }
    }
  },
  _drawDrops(c){
    if(!this.drops) return;
    for(const d of this.drops){ const x=Math.floor(d.x-this.camX), y=Math.floor(d.y-this.camY);
      if(x<-20||x>W+20||y<-20||y>H+20) continue;
      const bob=Math.sin((d.t)*0.008)*2;
      const g=c.createRadialGradient(x,y-2+bob,0,x,y-2+bob,10); g.addColorStop(0,'rgba(220,255,220,0.35)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(x-10,y-12+bob,20,20);
      c.font='14px serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText(RES_ICON[d.base]||'?', x, y-2+bob); c.textAlign='left'; c.textBaseline='alphabetic';
    }
  },
  _drawNotes(c){
    if(!this._notes||!this._notes.length) return;
    let y=H-90; c.textAlign='left'; c.font='bold 13px Courier New';
    for(let i=this._notes.length-1;i>=0;i--){ const nt=this._notes[i]; nt.life-=16;
      const a=Math.min(1,nt.life/400); c.globalAlpha=a*0.9;
      const w=c.measureText(nt.text).width+18;
      c.fillStyle='rgba(6,18,10,0.9)'; c.fillRect(14,y,w,22); c.strokeStyle='rgba(120,220,150,0.5)'; c.lineWidth=1; c.strokeRect(14,y,w,22);
      c.fillStyle='#dfffe6'; c.fillText(nt.text,22,y+15); y-=27;
    }
    c.globalAlpha=1;
    this._notes=this._notes.filter(n=>n.life>0);
  },
  _carve(x1,y1,x2,y2){
    // L-shaped corridor, 2 tiles wide so player never gets stuck
    const carve1=(tx,ty)=>{
      if(tx<0||tx>=MW||ty<0||ty>=MH)return;
      // Force floor — clear ANY blocking tile including special ones
      this.map[ty*MW+tx]=T_FLOOR;
    };
    // Horizontal then vertical
    let cx=x1,cy=y1;
    while(cx!==x2){
      carve1(cx,cy);   // main row
      carve1(cx,cy+1); // 2nd tile width
      cx+=cx<x2?1:-1;
    }
    while(cy!==y2){
      carve1(cx,cy);
      carve1(cx+1,cy); // 2nd tile width
      cy+=cy<y2?1:-1;
    }
    carve1(cx,cy);carve1(cx+1,cy);carve1(cx,cy+1); // endpoint
    // Add walls around the full corridor (only over VOID tiles)
    cx=x1;cy=y1;
    const wallSet=[];
    while(cx!==x2){wallSet.push([cx,cy]);wallSet.push([cx,cy+1]);cx+=cx<x2?1:-1;}
    while(cy!==y2){wallSet.push([cx,cy]);wallSet.push([cx+1,cy]);cy+=cy<y2?1:-1;}
    for(const [tx2,ty2] of wallSet){
      for(let dy2=-1;dy2<=1;dy2++) for(let dx2=-1;dx2<=1;dx2++){
        const nx=tx2+dx2,ny=ty2+dy2;
        if(nx>=0&&nx<MW&&ny>=0&&ny<MH&&this.map[ny*MW+nx]===T_VOID)
          this.map[ny*MW+nx]=T_WALL;
      }
    }
  },
  _ct(tx,ty){if(tx>=0&&tx<MW&&ty>=0&&ty<MH){this.map[ty*MW+tx]=T_FLOOR;}},
  _rf(room){
    const cs=[];
    for(let ty=room.y+1;ty<room.y+room.h-1;ty++)
      for(let tx=room.x+1;tx<room.x+room.w-1;tx++)
        if(this.map[ty*MW+tx]===T_FLOOR)cs.push({x:tx,y:ty});
    return cs.length?cs[Math.floor(Math.random()*cs.length)]:null;
  },
  _spawnEnemy(px,py,fl){
    // Pool de inimigos do bioma atual
    const bm = this._biome || BIOMES.dungeon;
    const bmKey = Object.keys(BIOMES).find(k=>BIOMES[k]===bm) || 'dungeon';
    let pool = ENEMY_DEFS.filter(d=>d.biome===bmKey);
    if(!pool.length) pool = ENEMY_DEFS.filter(d=>d.biome==='dungeon');
    const d = pool[Math.floor(Math.random()*pool.length)];
    // Stats escalam com bioma
    const spdMult = bm.enemySpeedMult || 1.0;
    const hpMult  = bm.enemyHpMult  || 1.0;
    this.entities.push({type:'enemy',name:d.name,x:px,y:py,
      hp:Math.round((18+fl*8.5)*hpMult), maxHp:Math.round((18+fl*8.5)*hpMult), // BALANCE: curva mais suave
      dmg:Math.round((3+fl*1.3)*1.0), spd:Math.min(1.7,(0.65+fl*0.05))*spdMult,
      r:d.r,ar:d.ar,ac:d.ac,at:Math.random()*d.ac,ranged:d.ranged,coin:d.coin,
      sprFn:d.sprFn,palFn:d.palFn,sc:d.sc,sk:d.sk,skCd:d.skCd,skTimer:Math.random()*d.skCd,
      dead:false,flash:0,alert:0,frameIdx:0,frameTick:0,dir:'down',spdBuff:0});
  },
  _spawnBoss(px,py,fl){
    // HIPER BOSS: a partir do piso 3, 15% de chance de substituir o boss normal
    if(fl>=3 && Math.random()<0.15){ this._spawnHyperBoss(px,py,fl); return; }
    // Escolhe boss compatível com o bioma atual
    const bmKey = Object.keys(BIOMES).find(k=>BIOMES[k]===(this._biome||BIOMES.dungeon))||'dungeon';
    const biomeBosses = BOSS_DEFS.filter(b=>b.biome===bmKey);
    const pool = biomeBosses.length ? biomeBosses : BOSS_DEFS.filter(b=>b.biome==='dungeon');
    const d = pool[Math.floor(Math.random()*pool.length)];
    const bossRar = rollBossRarity();
    const baseHp = 200+fl*62; // BALANCE: bosses iniciais +fortes, tardios -esponja
    const hp = Math.round(baseHp * bossRar.hpMult);
    const sc = d.sc * bossRar.scaleMult;
    const r  = Math.round(d.r * bossRar.scaleMult);
    const coinVal = Math.round(20 * bossRar.coinMult);
    // Palette tintada pelo bioma se definida
    const palFn = d.palOverride
      ? ()=>{ const base=d.palFn(); const o=d.palOverride; const out={}; for(const k in base){ const c=base[k]; const r2=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16); const nr=Math.min(255,Math.round(r2*0.3+255*o.r*0.7)),ng=Math.min(255,Math.round(g*0.3+255*o.g*0.7)),nb=Math.min(255,Math.round(b*0.3+255*o.b*0.7)); out[k]='#'+nr.toString(16).padStart(2,'0')+ng.toString(16).padStart(2,'0')+nb.toString(16).padStart(2,'0'); } return out; }
      : d.palFn;
    this.entities.push({type:'boss',name:d.name,x:px,y:py,
      hp:hp,maxHp:hp,dmg:Math.round((16+fl*3.5)*bossRar.hpMult*0.6),spd:0.45,
      r,ar:d.ranged?220:40,ac:1600,at:800,ranged:d.ranged,coin:coinVal,
      sprFn:d.sprFn,palFn,sc,sk:d.sk,skCd:d.skCd,skTimer:800,
      dead:false,flash:0,alert:9999,frameIdx:0,frameTick:0,dir:'down',spdBuff:0,
      _enragedShown:false,_phase2:false,
      bossRar, _shadowBound:false, _extracted:false, _extractFailed:false,
      biome:bmKey,
    });
    setTimeout(()=>{
      const rarLabel=bossRar.id!=='common'?` ${bossRar.name.toUpperCase()}`:'';
      this._msg(`${d.biome==='ice'?'❄️':d.biome==='swamp'?'☠️':d.biome==='fire'?'🔥':'💀'} ${d.name}${rarLabel} apareceu!`,3200);
    },600);
  },

  // ═══ HIPER BOSS — Horror Rúnico: maior/mais forte que bosses normais, 4 ataques,
  //     laranja no mapa (perigo) e recompensa lendária garantida ═══
  _spawnHyperBoss(px,py,fl){
    const bossRar = BOSS_RARITY_TABLE[BOSS_RARITY_TABLE.length-1];   // lendário → sombra extraída top
    const hp = Math.round((200+fl*62)*3.4);                          // ~3.4× um boss comum
    this.entities.push({type:'boss',name:'Horror Rúnico',x:px,y:py,
      hp,maxHp:hp,dmg:Math.round((16+fl*3.5)*1.0),spd:0.5,
      r:46,ar:240,ac:1500,at:800,ranged:true,coin:60,
      sprFn:()=>HYPER_SPR,palFn:()=>PAL_HYPER,sc:3.2,sk:'hyper',skCd:2600,skTimer:900,
      dead:false,flash:0,alert:9999,frameIdx:0,frameTick:0,dir:'down',spdBuff:0,
      _enragedShown:false,_phase2:false,_hyper:true,
      bossRar,_shadowBound:false,_extracted:false,_extractFailed:false,
      biome:Object.keys(BIOMES).find(k=>BIOMES[k]===(this._biome||BIOMES.dungeon))||'dungeon',
    });
    this._shake={x:0,y:0,t:500,mag:7};
    setTimeout(()=>{ this._msg('🟠☠ HORROR RÚNICO despertou! PERIGO EXTREMO — recompensa lendária!',4200); },600);
  },

  start(){
    this.pClassId=(typeof selectedClass!=='undefined'&&selectedClass.p1)||'mage';
    this.floor=1;this.pHp=100;this.pMaxHp=100;this.pDmg=18;this.pSpeed=1.9;
    if(this.pClassId==='necromancer'){this.pMaxHp=90;this.pHp=90;this.pDmg=16;this.pSpeed=1.85;}
    this._necroReset();
    this._revivesLeft=Math.min(2,Number((typeof metaUpgrades!=='undefined'&&metaUpgrades.destino_reviver)||0));
    this.pMaxHp+=10*((typeof MVP!=='undefined'&&MVP.upg.curandeira)||0); this.pHp=this.pMaxHp;   // Infusao Vital
    this.pKills=0;this.pCoins=0;this.pFacing=0;this.pAttackCd=0;this.pInvTimer=0;
    this.pFrameIdx=0;this.pFrameTick=0;this.pDir='down';this._sc=false;
    this.pAttackAnim=0;
    this.paused=false;this.invOpen=false;this.menuOpen=false;this._menuTab='personagem';this._inBosque=false;this._portalCd=false;this._storageCd=false;
    this.mapOpen=false;if(this._mapInt){clearInterval(this._mapInt);this._mapInt=null;}
    document.getElementById('dng-menu-overlay')?.remove();
    document.getElementById('dng-map-overlay')?.remove();
    this.inv=[];this.equippedIdx=-1;this.ownedRelics=new Set();
    this.gear={helmet:null,chest:null,boots:null,ring1:null,ring2:null};this.gearBag=[];
    this.equipOpen=false;this._gearApplied=null;this._gearCdMult=1;this._gearRegen=0;this._gearHintShown=false;
    this._vamp=0;this._crit=0;this._shCd=undefined;this._shActive=false;
    this._aoe=false;this._goldMult=1;this._regenT=undefined;
    this._webTimer=0;this._chestCd=false;this._barrelCd=false;this._merchantCd=false;
    this._shake={x:0,y:0,t:0,mag:0};this._freeze=0;
    this._bloodParts=[];this._projTrails=[];
    // New systems
    this._biome = getBiomeForFloor(1);
    this._armor = 0;
    this._speedBuff = 0; this._speedBuffTimer = 0;
    this._dmgBuff = 0; this._dmgBuffTimer = 0;
    this._critBuff = 0;
    this._regenActive = false; this._regenActiveTimer = 0; this._regenAmt = 1;
    this._aoeTimer = 0;
    this._poisonTimer = 0;
    this._dodge = 0;
    shadowAllies = [];
    craftingInv = {};
    extractionState = null;
    document.getElementById('extraction-overlay')?.classList.remove('open');
    updateShadowHUD();
    this._resize();
    this.generateMap(this.floor);
    this.running=true;this.lastTs=0;
    this._updateHUD();
    if(this.raf)cancelAnimationFrame(this.raf);
    this.raf=requestAnimationFrame(ts=>this._loop(ts));
  },
  stop(){
    this.running=false;this.paused=false;this.invOpen=false;
    if(this.raf){cancelAnimationFrame(this.raf);this.raf=null;}
    document.getElementById('dng-pause-overlay')?.remove();
    document.getElementById('dng-inv-overlay')?.remove();
    document.getElementById('dng-swap-overlay')?.remove();
    document.getElementById('dng-shop-overlay')?.remove();
    document.getElementById('dng-gameover-overlay')?.remove();
    const dh=document.getElementById('dungeon-hud');if(dh)dh.style.display='none';
    // Restore canvas size
    const cv=document.getElementById('canvas');
    if(cv){cv.style.width='';cv.style.height='';}
    const topHud=document.getElementById('ui-top'); if(topHud) topHud.style.removeProperty('display');
    const hb2=document.getElementById('hud-bottom'); if(hb2) hb2.style.removeProperty('display');
  },

  _updateHUD(){
    const g=id=>document.getElementById(id);
    if(!g('dng-hp')) return;
    this._updateMissionHud();

    const hp    = Math.max(0,Math.floor(this.pHp));
    const maxHp = this.pMaxHp;
    const pct   = maxHp>0 ? Math.max(0,Math.min(1,hp/maxHp)) : 0;

    // Texto
    g('dng-hp').textContent    = hp;
    g('dng-maxhp').textContent = maxHp;
    g('dng-floor').textContent = this.floor;
    g('dng-kills').textContent = this.pKills;
    g('dng-coins').textContent = this.pCoins;

    // Barra de HP
    const bar = g('dng-hp-bar');
    if(bar){
      bar.style.width = (pct*100)+'%';
      if(pct<0.2)      bar.style.background='linear-gradient(90deg,#660000,#aa0000,#cc1111)';
      else if(pct<0.4) bar.style.background='linear-gradient(90deg,#881111,#cc2222,#ee3333)';
      else             bar.style.background='linear-gradient(90deg,#aa1111,#dd3333,#ff5555,#ff8888)';
    }

    // Ghost bar — drena devagar
    const ghost = g('dng-hp-ghost');
    if(ghost){
      const prev = parseFloat(ghost.dataset.prev||'1');
      if(pct < prev-0.01){
        ghost.style.width = ((prev-pct)*100)+'%';
        clearTimeout(ghost._t);
        ghost._t = setTimeout(()=>{ ghost.style.width='0%'; ghost.dataset.prev=String(pct); },700);
      } else {
        ghost.dataset.prev = String(pct);
      }
    }

    // Borda do avatar pulsa em HP crítico
    const frame = g('dng-avatar-frame');
    if(frame){
      if(pct<0.25) frame.style.boxShadow='0 0 18px rgba(220,30,30,0.8),inset 0 0 10px rgba(0,0,0,0.6)';
      else         frame.style.boxShadow='0 0 14px rgba(120,50,210,0.4),inset 0 0 10px rgba(0,0,0,0.6)';
    }

    // Arma equipada
    const wEl = g('dng-weapon-hud');
    if(wEl){
      const w=this.inv[this.equippedIdx];
      if(w){ const col=DNG_RCOL[w.rarity];
        wEl.innerHTML=`${w.icon} <span style="color:${col};font-size:14px;font-weight:bold;">${DNG_RNAME[w.rarity].toUpperCase()}</span> <span style="font-size:15px;color:#c8a84b;">⚔️${w.dmg}</span>`;
      } else {
        wEl.innerHTML=this.pClassId==='necromancer'
          ?`✦ <span style="font-size:12px;color:#70d98b;">FOCO PROFANO</span>`
          :`👊 <span style="font-size:12px;color:#5a4020;">SEM ARMA</span>`;
      }
    }

    // Biome label
    const biomeEl = g('dng-biome-label');
    if(biomeEl&&this._biome) biomeEl.textContent = `${this._biome.icon} ${this._biome.name}`;
    // Armor label
    const armorEl = g('dng-armor-label');
    if(armorEl){ if(this._armor>0){armorEl.textContent=`🛡 -${this._armor}`;armorEl.style.display='inline';}else{armorEl.style.display='none';} }
    // Meal buffs row
    const mealRow = g('dng-meal-buffs');
    if(mealRow){
      mealRow.innerHTML='';
      if(this._speedBuff>0){ const c=document.createElement('span');c.style.cssText=`font-size:11px;background:rgba(0,100,200,0.2);border:1px solid #44aaff44;color:#44aaff;padding:1px 5px;border-radius:8px;`;c.textContent=`💨 +${Math.round(this._speedBuff*100)}%`;mealRow.appendChild(c); }
      if(this._dmgBuff>0){ const c=document.createElement('span');c.style.cssText=`font-size:11px;background:rgba(200,80,0,0.2);border:1px solid #ff660044;color:#ff8844;padding:1px 5px;border-radius:8px;`;c.textContent=`⚔ +${Math.round(this._dmgBuff*100)}%`;mealRow.appendChild(c); }
      if(this._regenActive){ const c=document.createElement('span');c.style.cssText=`font-size:11px;background:rgba(0,180,60,0.15);border:1px solid #44ff6644;color:#44ff88;padding:1px 5px;border-radius:8px;`;c.textContent=`💚 regen +${this._regenAmt||1}/s`;mealRow.appendChild(c); }
      if(this._dodge>0){ const c=document.createElement('span');c.style.cssText=`font-size:11px;background:rgba(100,220,200,0.15);border:1px solid #44ffcc44;color:#44ffcc;padding:1px 5px;border-radius:8px;`;c.textContent=`✨ esquiva ${Math.round(this._dodge*100)}%`;mealRow.appendChild(c); }
      if(this._aoe){ const c=document.createElement('span');c.style.cssText=`font-size:11px;background:rgba(200,80,0,0.15);border:1px solid #ff660044;color:#ff9944;padding:1px 5px;border-radius:8px;`;c.textContent='💥 AoE';mealRow.appendChild(c); }
    }
    const necroRow=g('dng-necro-row');
    if(necroRow){
      necroRow.style.display=this.pClassId==='necromancer'?'flex':'none';
      if(this.pClassId==='necromancer'){
        const permanent=this._necroSummons.filter(s=>s.permanent&&!s.dead).length;
        necroRow.textContent=`✦ ALMAS ${this._necroSouls}/${this._necroSoulCap} · ☠ CADÁVERES ${this._necroCorpses.length}/8 · ⚔ EXÉRCITO ${permanent}/2`;
      }
    }

    // Avatar — sprite do herói
    const cv = g('dng-avatar-canvas');
    if(cv && typeof getHeroVisual==='function'){
      const c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
      c.clearRect(0,0,50,50);
      const bg=c.createRadialGradient(25,25,0,25,25,27);
      bg.addColorStop(0,'rgba(90,35,160,0.35)'); bg.addColorStop(1,'rgba(0,0,0,0.5)');
      c.fillStyle=bg; c.fillRect(0,0,50,50);
      const classId=this.pClassId||(typeof selectedClass!=='undefined'?selectedClass.p1:'mage');
      drawHeroOnCanvas(cv,{classId,direction:'down',frameIndex:0,pixelSize:3,clear:false});
    }
    const hpin=document.getElementById('dng-hp-inbar'); if(hpin) hpin.textContent=Math.max(0,Math.floor(this.pHp));
    const mhin=document.getElementById('dng-maxhp-inbar'); if(mhin) mhin.textContent=this.pMaxHp;
    const wrap=document.getElementById('dng-hp-wrap');
    if(wrap) wrap.classList.toggle('low-hp', this.pHp/this.pMaxHp < 0.3);
  },
  _msg(txt,dur=2200){
    const el=document.getElementById('dng-msg');if(!el)return;
    el.textContent=txt;el.style.display='block';clearTimeout(el._t);el._t=setTimeout(()=>el.style.display='none',dur);
  },
  _parts(x,y,col,n,spd){
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=(0.3+Math.random()*0.7)*spd/30;
      this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-0.8,col,r:1.5+Math.random()*2.5,life:250+Math.random()*400});}
  },
  _ft(x,y,txt,col){this.floatingTexts.push({x,y,txt,col,life:900});},

  _necroReset(){
    this._necroSouls=0;this._necroPity=0;this._necroSoulOrbs=[];this._necroCorpses=[];this._necroSummons=[];
    this._necroSummonTimer=0;this._necroRaiseTimer=0;this._necroHealAt=0;this._necroHealWindow=0;this._necroHudTimer=0;
  },
  _necroClearFloor(preservePermanent=true){
    this._necroSoulOrbs=[];this._necroCorpses=[];
    this._necroSummons=(this._necroSummons||[]).filter(s=>preservePermanent&&s.permanent&&!s.dead);
    this._necroSummons.forEach((s,index)=>{s.x=this.px+(index-.5)*24;s.y=this.py+22;s.target=null;});
  },
  _necroSpawnSoul(x,y,count=1){
    if(this.pClassId!=='necromancer'||this._necroSouls>=this._necroSoulCap)return;
    for(let i=0;i<count&&this._necroSoulOrbs.length<20;i++){
      this._necroSoulOrbs.push({x:x+(Math.random()-.5)*14,y:y+(Math.random()-.5)*14,ttl:8000,phase:Math.random()*Math.PI*2});
    }
  },
  _necroBossDamage(enemy,before,after){
    if(this.pClassId!=='necromancer'||enemy?.type!=='boss'||before<=after)return;
    const max=Math.max(1,enemy.maxHp||before);let mask=enemy._necroSoulMask||0,created=0;
    for(let i=1;i<=5;i++){
      const threshold=1-i*.2,bit=1<<(i-1);
      if(!(mask&bit)&&before/max>threshold&&after/max<=threshold){mask|=bit;created++;}
    }
    enemy._necroSoulMask=mask;if(created)this._necroSpawnSoul(enemy.x,enemy.y,created);
  },
  _necroOnKill(enemy,source='direct'){
    if(this.pClassId!=='necromancer'||!enemy||enemy.type==='boss'||enemy._necroRewarded)return;
    enemy._necroRewarded=true;
    const chance=source==='summon'?.14:.22;
    if(Math.random()<chance||this._necroPity>=5){this._necroSpawnSoul(enemy.x,enemy.y,1);this._necroPity=0;}
    else this._necroPity++;
    if(Math.random()<(source==='summon'?.22:.35)){
      while(this._necroCorpses.length>=8)this._necroCorpses.shift();
      this._necroCorpses.push({x:enemy.x,y:enemy.y,ttl:6000,phase:Math.random()*Math.PI*2});
    }
  },
  _necroSpawnSummon(type,x=this.px,y=this.py){
    if(this.pClassId!=='necromancer')return null;
    const permanent=type==='skeleton',same=this._necroSummons.filter(s=>!s.dead&&s.permanent===permanent).length;
    if(this._necroSummons.filter(s=>!s.dead).length>=12||(permanent&&same>=2)||(!permanent&&same>=3))return null;
    const maxHp=Math.max(10,Math.round(this.pMaxHp*(permanent?.34:.28)));
    const summon={
      x,y,hp:maxHp,maxHp,damage:Math.max(3,this.pDmg*(permanent?.48:.42)),speed:permanent?1.55:1.45,
      range:permanent?48:44,attackCd:permanent?860:930,attackTimer:180,duration:permanent?Infinity:6000,
      permanent,type,dead:false,target:null,hitTimer:0,phase:Math.random()*Math.PI*2,_necroSummon:true,
    };
    this._necroSummons.push(summon);
    if(typeof Audio!=='undefined')Audio.sfxNecroSummon?.();
    return summon;
  },
  _necroHeal(amount){
    const stamp=performance.now();
    if(stamp-this._necroHealAt>=1000){this._necroHealAt=stamp;this._necroHealWindow=0;}
    const cap=this.pMaxHp*.03,allowed=Math.max(0,Math.min(amount,cap-this._necroHealWindow));
    if(allowed>0){this._necroHealWindow+=allowed;this.pHp=Math.min(this.pMaxHp,this.pHp+allowed);}
  },
  _necroAggroTarget(enemy){
    if(this.pClassId!=='necromancer'||!enemy||enemy.type==='boss'||enemy.ranged)return null;
    let best=null,bd=110;
    for(const summon of this._necroSummons){
      if(summon.dead)continue;const d=Math.hypot(enemy.x-summon.x,enemy.y-summon.y);
      if(d<bd){bd=d;best=summon;}
    }
    return best;
  },
  _necroUpdate(dt){
    if(this.pClassId!=='necromancer')return;
    this._necroSummonTimer-=dt;this._necroRaiseTimer-=dt;this._necroHudTimer-=dt;
    for(const orb of this._necroSoulOrbs){
      orb.ttl-=dt;orb.phase+=dt*.004;
      const dx=this.px-orb.x,dy=this.py-orb.y,d=Math.max(1,Math.hypot(dx,dy));
      if(d<125){const speed=(2.2+(125-d)*.018)*(dt/16.67);orb.x+=dx/d*speed;orb.y+=dy/d*speed;}
      if(d<19){
        const before=this._necroSouls;this._necroSouls=Math.min(this._necroSoulCap,this._necroSouls+1);orb.dead=true;
        if(this._necroSouls>before&&typeof Audio!=='undefined')Audio.sfxNecroSoul?.();
      }
    }
    this._necroSoulOrbs=this._necroSoulOrbs.filter(o=>!o.dead&&o.ttl>0);
    for(const corpse of this._necroCorpses)corpse.ttl-=dt;
    this._necroCorpses=this._necroCorpses.filter(c=>c.ttl>0);
    if(this._necroSummonTimer<=0&&this._necroSouls>=2&&this._necroSummons.filter(s=>s.permanent&&!s.dead).length<2){
      if(this._necroSpawnSummon('skeleton')){this._necroSouls-=2;this._necroSummonTimer=900;}
    }
    if(this._necroRaiseTimer<=0&&this._necroCorpses.length>=2&&this._necroSummons.filter(s=>!s.permanent&&!s.dead).length<3){
      let raised=0;
      for(const corpse of [...this._necroCorpses].slice(0,2)){
        const summon=this._necroSpawnSummon('reanimated',corpse.x,corpse.y);if(!summon)break;
        this._necroCorpses.splice(this._necroCorpses.indexOf(corpse),1);raised++;
      }
      if(raised)this._necroRaiseTimer=6500;
    }
    for(const summon of this._necroSummons){
      summon.duration-=dt;summon.attackTimer-=dt;summon.hitTimer-=dt;
      if(summon.hp<=0||summon.duration<=0){summon.dead=true;continue;}
      if(Math.hypot(this.px-summon.x,this.py-summon.y)>380){summon.x=this.px+(Math.random()-.5)*22;summon.y=this.py+18;summon.target=null;}
      if(!summon.target||summon.target.dead||Math.hypot(summon.target.x-summon.x,summon.target.y-summon.y)>300){
        let best=null,bd=300;
        for(const enemy of this.entities){if(enemy.dead||enemy._shadowBound)continue;const d=Math.hypot(enemy.x-summon.x,enemy.y-summon.y);if(d<bd){bd=d;best=enemy;}}
        summon.target=best;
      }
      const target=summon.target;
      if(target){
        const dx=target.x-summon.x,dy=target.y-summon.y,d=Math.max(1,Math.hypot(dx,dy));
        if(d>summon.range*.78){
          const step=summon.speed*(dt/16.67),nx=summon.x+dx/d*step,ny=summon.y+dy/d*step;
          if(this._tw(Math.floor(nx/DTS),Math.floor(ny/DTS))){summon.x=nx;summon.y=ny;}
        }
        if(d<=summon.range&&summon.attackTimer<=0){
          summon.attackTimer=summon.attackCd;
          const damage=summon.damage*(target.type==='boss'?.85:1),before=target.hp;
          target.hp-=damage;target.flash=180;this._necroBossDamage(target,before,target.hp);
          this._necroHeal(Math.min(before,damage)*.20);this._applyKill(target,null,damage,'summon');this._parts(target.x,target.y,'#70d98b',3,22);
        }
      }else if(Math.hypot(this.px-summon.x,this.py-summon.y)>70){
        const dx=this.px-summon.x,dy=this.py-summon.y,d=Math.max(1,Math.hypot(dx,dy));
        summon.x+=dx/d*summon.speed*(dt/16.67);summon.y+=dy/d*summon.speed*(dt/16.67);
      }
    }
    this._necroSummons=this._necroSummons.filter(s=>!s.dead);
    if(this._necroHudTimer<=0){this._necroHudTimer=160;this._updateHUD();}
  },
  _drawNecro(c,ts){
    if(this.pClassId!=='necromancer')return;c.save();
    for(const corpse of this._necroCorpses){
      const x=corpse.x-this.camX,y=corpse.y-this.camY;c.globalAlpha=.38+.25*Math.sin(ts*.006+corpse.phase);c.strokeStyle='#9ac6a0';c.lineWidth=2;
      c.beginPath();c.moveTo(x-6,y-4);c.lineTo(x+6,y+4);c.moveTo(x+6,y-4);c.lineTo(x-6,y+4);c.stroke();
    }
    for(const orb of this._necroSoulOrbs){
      const x=orb.x-this.camX,y=orb.y-this.camY,p=1+Math.sin(ts*.008+orb.phase)*.16;c.globalAlpha=Math.min(1,orb.ttl/700);c.shadowColor='#64ffc0';c.shadowBlur=8;
      c.fillStyle='#79e8d0';c.beginPath();c.arc(x,y,4*p,0,Math.PI*2);c.fill();c.shadowBlur=0;
    }
    for(const summon of this._necroSummons){
      const x=summon.x-this.camX,y=summon.y-this.camY,bob=Math.sin(ts*.006+summon.phase);c.globalAlpha=summon.permanent?1:.78;
      c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(x,y+9,9,3,0,0,Math.PI*2);c.fill();c.fillStyle=summon.permanent?'#d8d1b5':'#89a783';
      c.fillRect(x-5,y-7+bob,10,9);c.fillRect(x-4,y+2+bob,3,7);c.fillRect(x+1,y+2+bob,3,7);c.fillStyle='#18231d';c.fillRect(x-3,y-4+bob,2,2);c.fillRect(x+2,y-4+bob,2,2);
      c.fillStyle='rgba(0,0,0,.7)';c.fillRect(x-8,y-12,16,2);c.fillStyle='#65d77d';c.fillRect(x-8,y-12,16*Math.max(0,summon.hp/summon.maxHp),2);
    }
    c.globalAlpha=1;c.restore();
  },

  _togglePause(){
    if(this.invOpen)return;
    if(this.paused){
      this.paused=false;this.running=true;this.lastTs=0;
      document.getElementById('dng-pause-overlay')?.remove();
      if(this.raf)cancelAnimationFrame(this.raf);
      this.raf=requestAnimationFrame(ts=>this._loop(ts));
    } else {
      this.paused=true;this.running=false;this._renderPause();
    }
  },
  _renderPause(){
    document.getElementById('dng-pause-overlay')?.remove();
    const el=document.createElement('div');el.id='dng-pause-overlay';
    el.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:60;background:rgba(0,0,0,0.72);font-family:Courier New,monospace;';
    el.innerHTML=`<div style="background:linear-gradient(165deg,#08180e,#04100a 60%,#020a06);border:2px solid rgba(90,220,130,0.55);border-radius:10px;box-shadow:0 0 0 2px #021006, 0 0 40px rgba(60,200,110,0.18), 0 18px 60px rgba(0,0,0,0.85);padding:clamp(18px,3vw,30px) clamp(24px,4vw,44px);text-align:center;min-width:min(280px,90vw);max-width:90vw;">
      <div style="margin-bottom:6px;color:#9fe8b4;text-shadow:0 0 16px rgba(90,230,140,0.5);">${gamePixelIconHtml('pause',38)}</div>
      <div style="font-size:clamp(16px,2.6vw,22px);color:#9fe8b4;letter-spacing:clamp(3px,0.6vw,6px);margin-bottom:5px;font-weight:900;text-shadow:0 0 14px rgba(90,230,140,0.4);">PAUSADO</div>
      <div style="font-size:clamp(9px,1.3vw,11px);color:#4f8a5e;letter-spacing:3px;margin-bottom:16px;text-transform:uppercase;">— A dungeon aguarda —</div>
      <div style="font-size:clamp(11px,1.6vw,13px);color:#a8d4b4;margin-bottom:18px;background:rgba(6,20,12,0.7);border:1px solid rgba(70,160,100,0.3);border-radius:8px;padding:7px 12px;display:inline-flex;align-items:center;gap:5px;">Piso <b style="color:#e8cf90">${this.floor}</b> · ${gamePixelIconHtml('heart',15)} <b style="color:#ff8888">${Math.floor(this.pHp)}/${this.pMaxHp}</b> · ${gamePixelIconHtml('coin',15)} <b style="color:#f0d080">${this.pCoins}</b></div>
      <button id="dng-resume-btn" style="display:block;width:100%;background:linear-gradient(180deg,rgba(40,120,60,0.5),rgba(15,50,25,0.6));border:2px solid rgba(125,232,154,0.65);border-radius:7px;padding:clamp(10px,1.6vw,13px);cursor:pointer;font-family:Courier New,monospace;font-size:clamp(12px,1.9vw,15px);color:#c8ffd8;letter-spacing:3px;margin-bottom:9px;text-transform:uppercase;font-weight:bold;"><span class="pixel-btn-content">${gamePixelIconHtml('play',20)} CONTINUAR</span></button>
      <button id="dng-settings-btn" style="display:block;width:100%;background:rgba(7,28,17,0.94);border:1px solid rgba(90,190,120,0.58);border-radius:7px;padding:clamp(9px,1.3vw,11px);cursor:pointer;font-family:Courier New,monospace;font-size:clamp(10px,1.6vw,13px);color:#b9efc8;letter-spacing:2px;margin-bottom:9px;text-transform:uppercase;"><span class="pixel-btn-content">${gamePixelIconHtml('hammer',20)} CONFIGURAÇÕES</span></button>
      <button id="dng-quit-btn" style="display:block;width:100%;background:rgba(40,10,8,0.9);border:2px solid rgba(180,60,50,0.55);border-radius:7px;padding:clamp(9px,1.3vw,11px);cursor:pointer;font-family:Courier New,monospace;font-size:clamp(10px,1.6vw,13px);color:#ff9a8a;letter-spacing:2px;text-transform:uppercase;"><span class="pixel-btn-content">${gamePixelIconHtml('cross',20)} SAIR DA DUNGEON</span></button>
      <div style="font-size:clamp(8px,1.1vw,10px);color:#4f8a5e;margin-top:12px;letter-spacing:1px;">ESC → CONTINUAR · I → INVENTÁRIO · M → MAPA</div>
    </div>`;
    document.body.appendChild(el);
    document.getElementById('dng-resume-btn').onclick=()=>this._togglePause();
    document.getElementById('dng-settings-btn').onclick=()=>{
      document.getElementById('dng-pause-overlay')?.remove();
      if(typeof openSettings==='function') openSettings();
    };
    document.getElementById('dng-quit-btn').onclick=()=>{this.stop();showScreen('main-menu');};
  },

  _recalcGear(){
    const prev=this._gearApplied||{hp:0,dmg:0,armor:0,crit:0,vamp:0,dodge:0,gold:0,spd:0};
    this.pMaxHp-=prev.hp;this.pDmg-=prev.dmg;this._armor-=prev.armor;this._crit-=prev.crit;
    this._vamp-=prev.vamp;this._dodge-=prev.dodge;this._goldMult-=prev.gold;this.pSpeed-=prev.spd;
    const tot={hp:0,dmg:0,armor:0,crit:0,vamp:0,dodge:0,gold:0,spd:0};let cdMult=1,regen=0;
    for(const k of ['helmet','chest','boots','ring1','ring2']){
      const it=this.gear[k];if(!it)continue;const st=it.stats;
      tot.hp+=st.hp||0;tot.dmg+=st.dmg||0;tot.armor+=st.armor||0;tot.crit+=st.crit||0;
      tot.vamp+=st.vamp||0;tot.dodge+=st.dodge||0;tot.gold+=st.gold||0;tot.spd+=st.spd||0;
      if(st.cd)cdMult*=(1-st.cd);if(st.regen)regen+=st.regen;
    }
    this.pMaxHp+=tot.hp;if(tot.hp>prev.hp)this.pHp+=(tot.hp-prev.hp);
    this.pHp=Math.max(1,Math.min(this.pHp,this.pMaxHp));
    this.pDmg+=tot.dmg;this._armor+=tot.armor;this._crit+=tot.crit;this._vamp+=tot.vamp;
    this._dodge+=tot.dodge;this._goldMult+=tot.gold;this.pSpeed+=tot.spd;
    this._gearCdMult=Math.max(0.55,cdMult);this._gearRegen=regen;
    this._gearApplied=tot;this._updateHUD();
  },
  _giveGear(it){
    if(this.gearBag.length>=12){
      const v=(DNG_GEAR_VAL[it.rarity]||4)+this.floor;this.pCoins+=v;
      this._ft(this.px,this.py-40,`🎒 cheia! ${it.icon} vendido +${v}🪙`,'#c8a84b');this._updateHUD();return;
    }
    this.gearBag.push(it);
    this._ft(this.px,this.py-40,`${it.icon} ${it.name} [${DNG_RNAME[it.rarity]}]!`,DNG_RCOL[it.rarity]);
    this._parts(this.px,this.py,DNG_RCOL[it.rarity],12,55);
    if(!this._gearHintShown){this._gearHintShown=true;this._msg('🧍 Aperte [C] para equipar armaduras e anéis!',3200);}
  },
  _toggleMap(){
    if(this.paused||this.menuOpen)return;
    if(this.mapOpen){
      this.mapOpen=false;this.running=true;this.lastTs=0;
      if(this._mapInt){clearInterval(this._mapInt);this._mapInt=null;}
      document.getElementById('dng-map-overlay')?.remove();
      if(this.raf)cancelAnimationFrame(this.raf);
      this.raf=requestAnimationFrame(ts=>this._loop(ts));
    } else {
      this.mapOpen=true;this.running=false;this._renderMap();
      this._mapInt=setInterval(()=>{ if(this.mapOpen) this._drawMapCanvas(); },400);
    }
  },
  _renderMap(){
    document.getElementById('dng-map-overlay')?.remove();
    const self=this;
    const el=document.createElement('div');el.id='dng-map-overlay';
    el.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:63;background:rgba(2,8,4,0.86);font-family:Courier New,monospace;padding:14px;box-sizing:border-box;';
    const legenda=[['🟡','Você'],['🔴','Inimigo'],['🟣','Boss'],['🪜','Escada'],['📦','Baú'],['🛒','Mercador'],['🟩','Explorado'],['⬛','Névoa']]
      .map(([ic,lb])=>`<span style="font-size:12px;background:rgba(5,18,10,0.9);border:1px solid rgba(120,220,150,0.25);color:#9fc8a8;padding:3px 9px;border-radius:9px;white-space:nowrap;">${ic} ${lb}</span>`).join('');
    el.innerHTML=`
      <div style="background:linear-gradient(165deg,#08180e,#04100a 60%,#020a06);border:2px solid rgba(90,220,130,0.55);border-radius:10px;box-shadow:0 0 0 2px #021006, 0 0 40px rgba(60,200,110,0.18), 0 18px 60px rgba(0,0,0,0.85);padding:clamp(12px,1.6vw,20px);max-width:96vw;max-height:94vh;overflow:auto;text-align:center;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:10px;">
          <div style="font-size:clamp(15px,1.8vw,20px);color:#9fe8b4;letter-spacing:3px;font-weight:900;text-shadow:0 0 12px rgba(90,230,140,0.4);">◈ MAPA DO PISO ${this.floor} ◈</div>
          <button id="dng-map-close" style="background:rgba(4,18,10,0.95);border:2px solid rgba(90,200,125,0.5);border-radius:5px;padding:6px 14px;cursor:pointer;font-family:Courier New,monospace;font-size:14px;color:#c8ffd8;letter-spacing:2px;">✖ [M]</button>
        </div>
        <canvas id="dng-map-cv" width="600" height="600" style="image-rendering:pixelated;display:block;margin:0 auto;width:min(70vh,600px,88vw);height:min(70vh,600px,88vw);border:1px solid rgba(80,200,120,0.3);border-radius:6px;background:#030a06;"></canvas>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:10px;">${legenda}</div>
      </div>`;
    document.body.appendChild(el);
    document.getElementById('dng-map-close').onclick=()=>self._toggleMap();
    el.onclick=(ev)=>{ if(ev.target===el) self._toggleMap(); };
    this._drawMapCanvas();
  },
  _drawMapCanvas(){
    const cv=document.getElementById('dng-map-cv'); if(!cv)return;
    const c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
    const S=cv.width/MW;
    c.fillStyle='#030a06'; c.fillRect(0,0,cv.width,cv.height);
    // ── Tiles ──
    for(let ty=0;ty<MH;ty++)for(let tx=0;tx<MW;tx++){
      const t=this._ta(tx,ty); if(t===T_VOID)continue;
      const exp=this.explored[ty*MW+tx];
      const x=tx*S,y=ty*S;
      if(!exp){ c.fillStyle='rgba(12,7,26,0.92)'; c.fillRect(x,y,S,S); continue; }
      if(t===T_WALL)          c.fillStyle='#6e66a0';
      else if(t===T_STAIRS)   c.fillStyle='#ffe840';
      else if(t===T_CHEST)    c.fillStyle='#ddaa22';
      else if(t===T_TORCH)    c.fillStyle='#ff9a20';
      else if(t===T_BARREL)   c.fillStyle='#9a6028';
      else if(t===T_MERCHANT) c.fillStyle='#22aa44';
      else                    c.fillStyle='#3f4a34';
      c.fillRect(x,y,S,S);
    }
    // ── POIs (emoji, só em área explorada) ──
    c.textAlign='center'; c.textBaseline='middle';
    for(let ty=0;ty<MH;ty++)for(let tx=0;tx<MW;tx++){
      if(!this.explored[ty*MW+tx])continue;
      const t=this._ta(tx,ty);
      if(t===T_STAIRS){ c.font=`${Math.round(S*1.5)}px serif`; c.fillText('🪜',tx*S+S/2,ty*S+S/2); }
      else if(t===T_CHEST){ c.font=`${Math.round(S*1.1)}px serif`; c.fillText('📦',tx*S+S/2,ty*S+S/2); }
      else if(t===T_MERCHANT){ c.font=`${Math.round(S*1.3)}px serif`; c.fillText('🛒',tx*S+S/2,ty*S+S/2); }
    }
    // ── Entidades vivas (em área explorada) ──
    for(const e of this.entities){
      if(e.dead||(e.type!=='enemy'&&e.type!=='boss'))continue;
      const tx=Math.floor(e.x/DTS),ty=Math.floor(e.y/DTS);
      if(tx<0||tx>=MW||ty<0||ty>=MH||!this.explored[ty*MW+tx])continue;
      if(e.type==='boss'){
        // Hiper boss = LARANJA (perigo); boss normal = roxo
        const hyC=e._hyper;
        const g=c.createRadialGradient(e.x/DTS*S,e.y/DTS*S,0,e.x/DTS*S,e.y/DTS*S,S*(hyC?2.2:1.6));
        g.addColorStop(0,hyC?'rgba(255,140,0,0.7)':'rgba(200,80,255,0.6)');g.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=g;c.fillRect(e.x/DTS*S-S*2.2,e.y/DTS*S-S*2.2,S*4.4,S*4.4);
        c.fillStyle=hyC?'#ff8c00':'#cc44ff';c.beginPath();c.arc(e.x/DTS*S,e.y/DTS*S,S*(hyC?0.75:0.55),0,Math.PI*2);c.fill();
      } else {
        c.fillStyle='#ff4433';c.beginPath();c.arc(e.x/DTS*S,e.y/DTS*S,S*0.34,0,Math.PI*2);c.fill();
      }
    }
    // ── Sombras aliadas ──
    if(typeof shadowAllies!=='undefined'){
      for(const sa of shadowAllies){ if(sa.dead)continue;
        c.fillStyle='#44e0ff';c.beginPath();c.arc(sa.x/DTS*S,sa.y/DTS*S,S*0.3,0,Math.PI*2);c.fill();
      }
    }
    // ── Missão pronta — pino vermelho sobre o NPC-destino ──
    { const mk=this._missionMarkerTile();
      if(mk){ const rx=(mk.tx+0.5)*S, ry=(mk.ty+0.5)*S, rp=0.55+0.45*Math.sin(Date.now()*0.006);
        const rg=c.createRadialGradient(rx,ry,0,rx,ry,S*1.8);
        rg.addColorStop(0,'rgba(255,60,50,'+(0.6*rp)+')'); rg.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=rg; c.fillRect(rx-S*1.8,ry-S*1.8,S*3.6,S*3.6);
        c.fillStyle='#ff3b30'; c.beginPath(); c.arc(rx,ry,S*0.5,0,Math.PI*2); c.fill();
        c.fillStyle='#fff2f0'; c.font='bold '+Math.round(S*0.8)+'px Courier New'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('!',rx,ry);
      } }
    // ── Jogador (pulsante dourado) ──
    const pu=0.7+0.3*Math.sin(Date.now()*0.006);
    const px2=this.px/DTS*S, py2=this.py/DTS*S;
    const pg=c.createRadialGradient(px2,py2,0,px2,py2,S*2*pu);
    pg.addColorStop(0,'rgba(255,220,80,0.55)');pg.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=pg;c.fillRect(px2-S*2,py2-S*2,S*4,S*4);
    c.fillStyle='#ffe060';c.beginPath();c.arc(px2,py2,S*0.5*pu+S*0.2,0,Math.PI*2);c.fill();
    c.fillStyle='#fff8d0';c.beginPath();c.arc(px2,py2,S*0.25,0,Math.PI*2);c.fill();
  },
  _toggleEquip(){ this._toggleMenu('personagem'); },
  _toggleMenu(tab){
    if(this.paused)return;
    if(this.menuOpen){
      if(tab && tab!==this._menuTab){ this._menuTab=tab; this._renderMenu(); return; }
      this.menuOpen=false;this.invOpen=false;this.equipOpen=false;
      this.running=true;this.lastTs=0;
      this._restoreCraftPanel();
      document.getElementById('dng-menu-overlay')?.remove();
      if(this.raf)cancelAnimationFrame(this.raf);
      this.raf=requestAnimationFrame(ts=>this._loop(ts));
    } else {
      this.menuOpen=true;this.invOpen=true;this.equipOpen=true;this.running=false;
      this._menuTab=tab||this._menuTab||'personagem';
      this._renderMenu();
    }
  },
  _restoreCraftPanel(){
    const cp=document.getElementById('crafting-panel');
    if(cp&&cp._grafted){
      document.body.appendChild(cp); cp.classList.remove('open');
      cp.style.cssText=cp._oldCss||''; cp._grafted=false;
      cp.querySelectorAll('button').forEach(b=>{ if(b._hiddenByMenu){ b.style.display=''; b._hiddenByMenu=false; } });
    }
  },
  _renderMenu(){
    this._restoreCraftPanel();
    document.getElementById('dng-menu-overlay')?.remove();
    const self=this;
    const el=document.createElement('div');el.id='dng-menu-overlay';
    el.style.cssText='position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:62;background:rgba(2,8,4,0.84);font-family:Courier New,monospace;padding:14px;box-sizing:border-box;';
    const panel=document.createElement('div');
    panel.style.cssText='background:linear-gradient(165deg,#08180e,#04100a 60%,#020a06);border:2px solid rgba(90,220,130,0.5);border-radius:10px;box-shadow:0 0 0 2px #021006, 0 0 40px rgba(60,200,110,0.16), 0 18px 60px rgba(0,0,0,0.85);padding:clamp(14px,2vw,22px);width:min(700px,100%);max-height:92vh;overflow-y:auto;';
    el.appendChild(panel);document.body.appendChild(el);
    const tabs=[['personagem','PERSONAGEM','C','wizard'],['armas','ARMAS','I','sword'],['craft','CRAFTING','T','hammer']];
    const bar=tabs.map(([id,lb,key,icon])=>{
      const on=id===self._menuTab;
      return `<button class="dmn-tab" data-tab="${id}" style="flex:1;background:${on?'linear-gradient(180deg,rgba(40,120,60,0.5),rgba(15,50,25,0.6))':'rgba(6,20,12,0.8)'};border:2px solid ${on?'#7de89a':'rgba(60,140,90,0.35)'};border-radius:7px;padding:10px 6px;cursor:pointer;font-family:Courier New,monospace;font-size:clamp(13px,1.4vw,17px);font-weight:bold;color:${on?'#c8ffd8':'#5a9a6e'};letter-spacing:2px;"><span class="pixel-btn-content">${gamePixelIconHtml(icon,18)} ${lb}</span> <span style="font-size:0.72em;opacity:0.6;">[${key}]</span></button>`;
    }).join('');
    panel.innerHTML=`<div style="display:flex;gap:8px;margin-bottom:14px;">${bar}</div><div id="dng-menu-body"></div>`;
    panel.querySelectorAll('.dmn-tab').forEach(b=>b.onclick=()=>{ self._menuTab=b.dataset.tab; self._renderMenu(); });
    const body=document.getElementById('dng-menu-body');
    if(this._menuTab==='armas') this._renderInv(body);
    else if(this._menuTab==='craft'){
      const cp=document.getElementById('crafting-panel');
      if(cp){
        cp._oldCss=cp.style.cssText; cp._grafted=true;
        body.appendChild(cp);
        cp.style.cssText='position:static;transform:none;margin:0 auto;box-shadow:none;zoom:1;max-height:none;';
        cp.querySelectorAll('button').forEach(b=>{
          const oc=b.getAttribute('onclick')||'';
          if(oc.includes('closeCraftingPanel')){ b.style.display='none'; b._hiddenByMenu=true; }
        });
        openCraftingPanel();
      }
    }
    else this._renderEquip(body);
  },
  _renderEquip(container){
    const self=this;
    const panel=container;
    let selBag=-1;
    const slotBox=(key,label)=>{
      const it=self.gear[key];const col=it?DNG_RCOL[it.rarity]:'rgba(80,150,105,0.4)';
      const tip=it?`${it.name} [${DNG_RNAME[it.rarity]}]\n`+dngGearStatLines(it).join('\n')+'\n(clique para desequipar)':label+' — vazio';
      return `<div class="deq-slot" data-slot="${key}" title="${tip}" style="width:58px;height:58px;border-radius:7px;cursor:${it?'pointer':'default'};
        background:linear-gradient(160deg,#081810,#04100a);border:2px solid ${col};box-shadow:inset 0 2px 6px rgba(0,0,0,0.8)${it?`,0 0 9px ${col}55`:''};
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;">
        <div style="font-size:${it?'24px':'19px'};${it?'':'opacity:0.25;filter:grayscale(1);'}">${it?it.icon:label.split(' ')[0]}</div>
        <div style="font-size:9px;color:${it?col:'#4a8a62'};letter-spacing:0.5px;text-align:center;line-height:1.15;">${it?DNG_RNAME[it.rarity].toUpperCase():label.split(' ').slice(1).join(' ')}</div>
      </div>`;
    };
    const rebuild=()=>{
      const wpn=self.equippedIdx>=0?self.inv[self.equippedIdx]:null;
      const ga=self._gearApplied||{};
      const chips=[];
      chips.push(['⚔️','Dano',(wpn?wpn.dmg:self.pDmg)+(ga.dmg?` <span style="color:#7dffa0">(+${ga.dmg})</span>`:'')]);
      if(ga.armor)chips.push(['🛡️','Armadura','+'+ga.armor]);
      chips.push(['❤️','HP',Math.floor(self.pHp)+'/'+self.pMaxHp]);
      if(ga.spd)chips.push(['💨','Vel','+'+ga.spd]);
      if(self._crit>0)chips.push(['💥','Crít',Math.round(self._crit*100)+'%']);
      if(self._vamp>0)chips.push(['🩸','Vamp',Math.round(self._vamp*100)+'%']);
      if(self._dodge>0)chips.push(['✨','Esquiva',Math.round(self._dodge*100)+'%']);
      if(self._gearCdMult<1)chips.push(['⏩','Vel.Atq','+'+Math.round((1-self._gearCdMult)*100)+'%']);
      if(self._gearRegen>0)chips.push(['💚','Regen','+'+self._gearRegen+'/2s']);
      if(ga.gold)chips.push(['🪙','Ouro','+'+Math.round(ga.gold*100)+'%']);
      panel.innerHTML=`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div>
            <div style="font-size:clamp(14px,2vw,17px);color:#f0d080;letter-spacing:3px;font-weight:900;text-shadow:0 2px 0 #1a0e02;">🧍 PERSONAGEM</div>
            <div style="font-size:10.5px;color:#7fae8c;margin-top:2px;letter-spacing:1px;">Piso ${self.floor} · 🪙${self.pCoins}</div>
          </div>
          <button id="deq-close" style="background:rgba(4,18,10,0.95);border:2px solid rgba(90,200,125,0.5);border-radius:5px;padding:6px 14px;cursor:pointer;font-family:Courier New,monospace;font-size:15px;color:#c8a84b;letter-spacing:2px;">✖ [C]</button>
        </div>
        <div style="display:flex;gap:12px;justify-content:center;align-items:stretch;background:rgba(14,8,2,0.55);border:2px solid rgba(70,170,105,0.4);border-radius:8px;padding:12px;margin-bottom:10px;flex-wrap:wrap;">
          <div style="display:flex;flex-direction:column;gap:8px;justify-content:center;">
            ${slotBox('helmet','🪖 ELMO')}
            ${slotBox('chest','🛡️ PEITORAL')}
            ${slotBox('boots','🥾 BOTAS')}
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;">
            <div style="background:radial-gradient(circle at 50% 38%, #2c1c40 0%, #160c26 55%, #0c0614 100%);border:2px solid rgba(90,200,125,0.5);border-radius:9px;padding:6px;box-shadow:inset 0 0 18px rgba(0,0,0,0.8);">
              <canvas id="dng-doll-canvas" width="120" height="132" style="display:block;image-rendering:pixelated;"></canvas>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              <div title="${wpn?wpn.name+' ['+DNG_RNAME[wpn.rarity]+'] ⚔️'+wpn.dmg:'Sem arma equipada'}" style="width:44px;height:44px;border-radius:6px;background:linear-gradient(160deg,#081810,#04100a);border:2px solid ${wpn?DNG_RCOL[wpn.rarity]:'rgba(80,150,105,0.4)'};display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:inset 0 2px 6px rgba(0,0,0,0.8);">${wpn?wpn.icon:'⚔️'}</div>
              <button id="deq-wpn" style="background:rgba(30,8,50,0.9);border:2px solid rgba(140,80,220,0.6);border-radius:5px;padding:8px 10px;cursor:pointer;font-family:Courier New,monospace;font-size:12px;color:#cc88ff;letter-spacing:1px;font-weight:bold;">🛠 ARMAS</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;justify-content:center;">
            ${slotBox('ring1','💍 ANEL I')}
            ${slotBox('ring2','💍 ANEL II')}
            <div style="width:58px;height:58px;"></div>
          </div>
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:center;margin-bottom:10px;">
          ${chips.map(([ic,lb,vl])=>`<span style="font-size:12.5px;background:rgba(5,18,10,0.9);border:1px solid rgba(120,220,150,0.3);color:#e8cf90;padding:4px 10px;border-radius:10px;">${ic} ${lb}: <b>${vl}</b></span>`).join('')}
        </div>
        <div style="font-size:11.5px;color:#7fae8c;letter-spacing:1px;margin-bottom:6px;">🎒 MOCHILA (${self.gearBag.length}/12) — clique para selecionar</div>
        <div id="deq-bag" style="display:grid;grid-template-columns:repeat(6,1fr);gap:7px;margin-bottom:8px;"></div>
        <div id="deq-detail" style="min-height:44px;background:rgba(14,8,2,0.6);border:2px solid rgba(70,170,105,0.4);border-radius:7px;padding:7px 10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;"></div>
        <div style="font-size:11.5px;color:#4f8a5e;text-align:center;letter-spacing:2px;margin-top:8px;">Itens caem de BAÚS e BOSSES · I fecha o menu</div>`;
      document.getElementById('deq-close').onclick=()=>self._toggleMenu();
      document.getElementById('deq-wpn').onclick=()=>{self._menuTab='armas';self._renderMenu();};
      // Boneco
      const cv=document.getElementById('dng-doll-canvas');
      if(cv&&typeof getHeroVisual==='function'){
        const c=cv.getContext('2d');c.imageSmoothingEnabled=false;
        const glow=c.createRadialGradient(60,96,4,60,96,42);
        glow.addColorStop(0,'rgba(200,168,75,0.22)');glow.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=glow;c.fillRect(10,54,100,78);
        c.fillStyle='rgba(0,0,0,0.5)';c.beginPath();c.ellipse(60,118,30,7,0,0,Math.PI*2);c.fill();
        const classId=self.pClassId||(typeof selectedClass!=='undefined'?selectedClass.p1:'mage');
        drawHeroOnCanvas(cv,{classId,direction:'down',frameIndex:0,pixelSize:7,clear:false});
      }
      // Slots equipados → desequipar
      panel.querySelectorAll('.deq-slot').forEach(d=>{
        d.onclick=()=>{
          const key=d.dataset.slot;const it=self.gear[key];if(!it)return;
          if(self.gearBag.length>=12){self._msg('🎒 Mochila cheia!',1600);return;}
          self.gear[key]=null;self.gearBag.push(it);self._recalcGear();selBag=-1;rebuild();
        };
      });
      // Mochila
      const bag=document.getElementById('deq-bag');
      for(let i=0;i<12;i++){
        const it=self.gearBag[i];const cell=document.createElement('div');
        const col=it?DNG_RCOL[it.rarity]:'rgba(90,62,24,0.35)';
        cell.style.cssText=`height:50px;border-radius:6px;background:linear-gradient(160deg,#081810,#04100a);border:2px ${it?'solid':'dashed'} ${col};display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:${it?'pointer':'default'};box-shadow:inset 0 2px 5px rgba(0,0,0,0.75)${i===selBag?`,0 0 10px ${col}`:''};${it?'':'opacity:0.45;'}`;
        if(it){
          cell.title=`${it.name} [${DNG_RNAME[it.rarity]}]\n`+dngGearStatLines(it).join('\n');
          cell.innerHTML=`<div style="font-size:20px;">${it.icon}</div><div style="font-size:8.5px;color:${col};letter-spacing:0.5px;">${DNG_RNAME[it.rarity].toUpperCase()}</div>`;
          cell.onclick=()=>{selBag=(selBag===i?-1:i);rebuild();};
        }
        bag.appendChild(cell);
      }
      // Detalhe do item selecionado
      const det=document.getElementById('deq-detail');
      if(selBag>=0&&self.gearBag[selBag]){
        const it=self.gearBag[selBag];const col=DNG_RCOL[it.rarity];
        const v=(DNG_GEAR_VAL[it.rarity]||4)+self.floor;
        det.innerHTML=`
          <div style="font-size:22px;">${it.icon}</div>
          <div style="flex:1;min-width:150px;">
            <div style="font-size:13.5px;color:#f0d080;font-weight:bold;">${it.name} <span style="color:${col};font-size:9px;">[${DNG_RNAME[it.rarity].toUpperCase()}]</span></div>
            <div style="font-size:11.5px;color:#9fc8a8;">${dngGearStatLines(it).join(' · ')}</div>
          </div>
          <button id="deq-do-eq" style="background:rgba(20,60,30,0.9);border:2px solid #3fce6a;border-radius:5px;padding:7px 14px;cursor:pointer;font-family:Courier New,monospace;font-size:10px;color:#c8ffd8;letter-spacing:1px;font-weight:bold;">✓ EQUIPAR</button>
          <button id="deq-do-sell" style="background:rgba(60,40,8,0.9);border:2px solid #c8a84b;border-radius:5px;padding:7px 12px;cursor:pointer;font-family:Courier New,monospace;font-size:10px;color:#f0d080;letter-spacing:1px;">💰 VENDER 🪙${v}</button>`;
        document.getElementById('deq-do-eq').onclick=()=>{
          const item=self.gearBag.splice(selBag,1)[0];let key;
          if(item.kind==='ring'){ key=!self.gear.ring1?'ring1':(!self.gear.ring2?'ring2':'ring1'); }
          else key=item.slot;
          if(self.gear[key])self.gearBag.push(self.gear[key]);
          self.gear[key]=item;self._recalcGear();selBag=-1;rebuild();
        };
        document.getElementById('deq-do-sell').onclick=()=>{
          self.gearBag.splice(selBag,1);self.pCoins+=v;self._updateHUD();selBag=-1;rebuild();
        };
      } else {
        det.innerHTML='<div style="font-size:11.5px;color:#5a9a6e;letter-spacing:1px;">Selecione um item da mochila para equipar ou vender.</div>';
      }
    };
    rebuild();
  },
  _toggleInventory(){ this._toggleMenu('armas'); },
  _renderInv(container){
    const self=this;
    const panel=container;
    const rebuild=()=>{
      panel.innerHTML=`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-size:clamp(15px,2vw,19px);color:#f0d080;letter-spacing:3px;font-weight:bold;">📦 ARMAS</div>
            <div style="font-size:clamp(10px,1.4vw,12px);color:#7fae8c;margin-top:2px;">Piso ${self.floor} · ❤️${Math.floor(self.pHp)}/${self.pMaxHp} · 🪙${self.pCoins} · ⚔️${self.pDmg}</div>
          </div>
          <button id="dng-inv-close" style="background:rgba(30,20,8,0.9);border:1px solid rgba(100,70,20,0.5);border-radius:3px;padding:5px 12px;cursor:pointer;font-family:Courier New,monospace;font-size:23px;color:#8a7040;letter-spacing:2px;white-space:nowrap;">✖ [I]</button>
        </div>
        <div style="font-size:clamp(10px,1.4vw,12px);color:#7fae8c;letter-spacing:1px;margin-bottom:9px;">ARMAS (${self.inv.length}/6) — Equipar · ⬆ Upar 2 iguais · ✕ Descartar</div>
        <div id="dng-inv-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:12px;"></div>
        <div style="font-size:12px;color:#4f8a5e;text-align:center;letter-spacing:2px;">I fecha o menu · Abas: C Personagem · T Crafting</div>`;
      document.getElementById('dng-inv-close').onclick=()=>self._toggleMenu();
      const grid=document.getElementById('dng-inv-grid');
      for(let i=0;i<6;i++){
        const card=document.createElement('div');const w=self.inv[i];const eq=(i===self.equippedIdx);
        const col=w?DNG_RCOL[w.rarity]:'#163524';
        card.style.cssText=`background:rgba(4,14,9,0.96);border:2px solid ${eq?col:'rgba(50,120,80,0.35)'};border-radius:5px;padding:clamp(8px,1.5vw,12px);min-height:90px;position:relative;transition:border .15s;${w?'':'border-style:dashed;opacity:0.4;'}`;
        if(w){
          const canUp=self.inv.some((x,xi)=>xi!==i&&x&&x.defId===w.defId&&x.rarity===w.rarity)&&w.rarity!=='legendary';
          const wDef=DNG_WPN_DEFS.find(d=>d.id===w.defId);
          card.innerHTML=`
            ${eq?`<div style="position:absolute;top:3px;right:4px;font-size:clamp(6px,1vw,7px);color:${col};font-weight:bold;">✓ EQ</div>`:''}
            <div style="font-size:clamp(18px,3vw,24px);margin-bottom:2px;">${w.icon}</div>
            <div style="font-size:clamp(12px,1.7vw,14px);font-weight:bold;color:#f0d080;">${w.name}</div>
            <div style="font-size:clamp(9px,1.2vw,10px);font-weight:bold;color:${col};letter-spacing:1px;margin-bottom:2px;">${DNG_RNAME[w.rarity].toUpperCase()}</div>
            <div style="font-size:clamp(11px,1.6vw,13px);color:#c8a84b;">⚔️ ${w.dmg}</div>
            <div style="font-size:clamp(9px,1.2vw,10px);color:#6fa080;margin-top:1px;">${wDef?wDef.desc:''}</div>
            ${w.upgrades?`<div style="font-size:19px;color:#ffcc44;">+${w.upgrades} up</div>`:''}
            <div style="display:flex;gap:3px;margin-top:7px;flex-wrap:wrap;">
              <button class="di-eq" data-i="${i}" style="flex:1;min-width:50px;background:rgba(40,25,8,0.9);border:1px solid rgba(${eq?'200,168,75,0.7':'60,44,16,0.5'});border-radius:2px;padding:3px;cursor:pointer;font-family:Courier New,monospace;font-size:clamp(6px,1vw,7px);color:${eq?'#f0d080':'#8a7040'};letter-spacing:1px;">${eq?'✓ EQ':'EQUIP'}</button>
              ${canUp?`<button class="di-up" data-i="${i}" style="flex:1;min-width:40px;background:rgba(30,8,50,0.9);border:1px solid rgba(140,80,220,0.6);border-radius:2px;padding:3px;cursor:pointer;font-family:Courier New,monospace;font-size:clamp(6px,1vw,7px);color:#cc88ff;">⬆ UP</button>`:''}
              <button class="di-rm" data-i="${i}" style="flex:0 0 22px;background:rgba(30,6,6,0.9);border:1px solid rgba(100,20,20,0.5);border-radius:2px;padding:3px;cursor:pointer;font-family:Courier New,monospace;font-size:19px;color:#8a3030;">✕</button>
            </div>`;
          card.onmouseenter=()=>{if(!eq)card.style.borderColor=col+'88';};
          card.onmouseleave=()=>{if(!eq)card.style.borderColor='rgba(50,36,12,0.5)';};
        } else {
          card.innerHTML=`<div style="font-size:23px;opacity:0.2;margin-top:14px;">➕</div><div style="font-size:19px;color:#2a1a08;margin-top:5px;">VAZIO</div>`;
        }
        grid.appendChild(card);
      }
      grid.querySelectorAll('.di-eq').forEach(b=>b.onclick=e=>{e.stopPropagation();self.equippedIdx=parseInt(b.dataset.i);self._updateHUD();rebuild();});
      grid.querySelectorAll('.di-up').forEach(b=>b.onclick=e=>{e.stopPropagation();self._upgradeWeapon(parseInt(b.dataset.i));rebuild();});
      grid.querySelectorAll('.di-rm').forEach(b=>b.onclick=e=>{e.stopPropagation();const idx=parseInt(b.dataset.i);self.inv.splice(idx,1);if(self.equippedIdx>=self.inv.length)self.equippedIdx=self.inv.length-1;self._updateHUD();rebuild();});
    };
    rebuild();
  },
  _upgradeWeapon(idx){
    const w=this.inv[idx];if(!w||w.rarity==='legendary')return;
    const di=this.inv.findIndex((x,i)=>i!==idx&&x&&x.defId===w.defId&&x.rarity===w.rarity);if(di<0)return;
    const om=DNG_RMULT[w.rarity];w.rarity=nextDngRarity(w.rarity);w.dmg=Math.round(w.dmg*(DNG_RMULT[w.rarity]/om));w.upgrades=(w.upgrades||0)+1;
    this.inv.splice(di,1);if(this.equippedIdx>=this.inv.length)this.equippedIdx=this.inv.length-1;
    this._ft(this.px,this.py-40,`⬆ ${w.name} → ${DNG_RNAME[w.rarity]}!`,DNG_RCOL[w.rarity]);
    this._parts(this.px,this.py,DNG_RCOL[w.rarity],14,60);this._updateHUD();
  },
  _giveWeapon(weapon){
    if(this.inv.length<6){
      this.inv.push(weapon);if(this.equippedIdx<0)this.equippedIdx=0;
      this._ft(this.px,this.py-40,`${weapon.icon} ${DNG_RNAME[weapon.rarity]}!`,DNG_RCOL[weapon.rarity]);
      this._parts(this.px,this.py,DNG_RCOL[weapon.rarity],10,50);this._updateHUD();
    } else {this._showSwap(weapon);}
  },
  _showSwap(nw){
    document.getElementById('dng-swap-overlay')?.remove();
    const el=document.createElement('div');el.id='dng-swap-overlay';
    el.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:65;background:rgba(0,0,0,0.8);font-family:Courier New,monospace;padding:16px;box-sizing:border-box;';
    const nc=DNG_RCOL[nw.rarity];
    el.innerHTML=`<div style="background:linear-gradient(160deg,#07050f,#0e0a1a);border:2px solid ${nc}88;border-radius:6px;padding:clamp(14px,2.5vw,22px) clamp(16px,3vw,26px);width:min(420px,100%);">
      <div style="font-size:clamp(12px,2vw,15px);color:#f0d080;letter-spacing:3px;margin-bottom:4px;">⚠ INVENTÁRIO CHEIO</div>
      <div style="font-size:clamp(7px,1.2vw,9px);color:#5a4020;margin-bottom:12px;">Escolha uma arma para trocar</div>
      <div style="background:rgba(0,0,0,0.3);border:1px solid ${nc}55;border-radius:4px;padding:8px;margin-bottom:12px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:clamp(20px,3vw,26px);">${nw.icon}</span>
        <div><div style="font-size:clamp(10px,1.8vw,13px);font-weight:bold;color:#f0d080;">${nw.name}</div><div style="font-size:clamp(8px,1.3vw,10px);color:${nc};font-weight:bold;">${DNG_RNAME[nw.rarity].toUpperCase()} · ⚔️${nw.dmg}</div></div>
        <div style="margin-left:auto;font-size:14px;color:#44aa44;white-space:nowrap;">NOVA</div>
      </div>
      <div id="dng-swap-list" style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px;max-height:40vh;overflow-y:auto;"></div>
      <button id="dng-swap-skip" style="width:100%;background:rgba(30,6,6,0.9);border:1px solid rgba(100,20,20,0.5);border-radius:3px;padding:8px;cursor:pointer;font-family:Courier New,monospace;font-size:clamp(9px,1.5vw,11px);color:#8a3030;letter-spacing:2px;">✕ DESCARTAR NOVA</button>
    </div>`;
    document.body.appendChild(el);
    const resume=()=>{el.remove();this.running=true;this.lastTs=0;if(this.raf)cancelAnimationFrame(this.raf);this.raf=requestAnimationFrame(ts=>this._loop(ts));};
    document.getElementById('dng-swap-skip').onclick=resume;
    const list=document.getElementById('dng-swap-list');
    this.inv.forEach((w,i)=>{
      const c=DNG_RCOL[w.rarity];const btn=document.createElement('button');
      btn.style.cssText=`display:flex;align-items:center;gap:8px;width:100%;background:rgba(8,5,18,0.97);border:1px solid ${c}44;border-radius:4px;padding:clamp(5px,1vw,8px) 10px;cursor:pointer;font-family:Courier New,monospace;text-align:left;transition:border .15s;`;
      btn.innerHTML=`<span style="font-size:clamp(16px,2.5vw,20px);">${w.icon}</span><div><div style="font-size:clamp(9px,1.5vw,11px);color:#f0d080;">${w.name}</div><div style="font-size:clamp(7px,1.2vw,9px);color:${c};">${DNG_RNAME[w.rarity].toUpperCase()} · ⚔️${w.dmg}</div></div><div style="margin-left:auto;font-size:12px;color:#cc4444;white-space:nowrap;">TROCAR</div>`;
      btn.onmouseenter=()=>btn.style.borderColor=c+'99';btn.onmouseleave=()=>btn.style.borderColor=c+'44';
      btn.onclick=()=>{this.inv[i]=nw;if(this.equippedIdx===i||this.equippedIdx<0)this.equippedIdx=i;this._updateHUD();this._ft(this.px,this.py-40,`${nw.icon} ${DNG_RNAME[nw.rarity]}!`,nc);resume();};
      list.appendChild(btn);
    });
  },

  _openShop(){
    this.running=false;
    const consumables=[
      {pixelKey:'potion',name:'Poção de Cura',   desc:'Restaura 40% da vida.',   price:6,  apply:d=>{d.pHp=Math.min(d.pMaxHp,d.pHp+Math.floor(d.pMaxHp*0.4));d._updateHUD();}},
      {pixelKey:'heart',name:'Poção Grande',    desc:'Cura completa.',          price:12, apply:d=>{d.pHp=d.pMaxHp;d._updateHUD();}},
      {pixelKey:'sword',name:'Pedra de Afiar',  desc:'+15% dano permanente.',   price:16, apply:d=>{d.pDmg=Math.floor(d.pDmg*1.15);}},
      {pixelKey:'fire',name:'Elixir de Força', desc:'+12 dano, +20 HP máx.',   price:18, apply:d=>{d.pDmg+=12;d.pMaxHp+=20;d.pHp=Math.min(d.pHp+20,d.pMaxHp);d._updateHUD();}},
      {pixelKey:'boots',name:'Pó Veloz',        desc:'+15% velocidade.',        price:10, apply:d=>{d.pSpeed*=1.15;}},
      {pixelKey:'ice',name:'Orbe de Gelo',    desc:'Alcance +50px e -10% CD.',price:12, apply:d=>{d._rangeBonus=(d._rangeBonus||0)+50; d.pAttackCd=Math.max(200,Math.round((d.pAttackCd||350)*0.90));}},
      {pixelKey:'heart',name:'Frasco Vital',    desc:'+30 HP máx permanente.',  price:8,  apply:d=>{d.pMaxHp+=30;d.pHp=Math.min(d.pHp+15,d.pMaxHp);d._updateHUD();}},
    ];
    const self=this;
    const rollItems=()=>{
      const avRel=DNG_RELICS.filter(r=>!self.ownedRelics.has(r.id));
      const pool=[...consumables,...avRel];
      for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
      // BALANCE v6: preços do Ferreiro escalam +12% por piso
      return pool.slice(0,4).map(it=>({...it, price:Math.round(it.price*(1+0.12*(self.floor-1)))}));
    };
    let items=rollItems();
    const rerollCost=()=>4+Math.floor(self.floor*1.5);
    const el=document.createElement('div');el.id='dng-shop-overlay';
    el.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:55;background:rgba(0,0,0,0.75);font-family:Courier New,monospace;padding:16px;box-sizing:border-box;';
    const panel=document.createElement('div');
    panel.style.cssText='background:linear-gradient(160deg,#07050f,#0e0a1a);border:2px solid rgba(200,168,75,0.5);border-radius:6px;padding:clamp(14px,2.5vw,22px) clamp(16px,3vw,28px);width:min(520px,100%);max-height:90vh;overflow-y:auto;';
    el.appendChild(panel);document.body.appendChild(el);
    const renderShop=()=>{
      panel.innerHTML=`
        <div style="text-align:center;margin-bottom:12px;">
          <div style="margin-bottom:4px;display:flex;justify-content:center;">${gamePixelIconHtml('hammer',28)}</div>
          <div style="font-size:clamp(13px,2vw,16px);color:#f0d080;letter-spacing:4px;font-weight:bold;">FERREIRO</div>
          <div style="font-size:clamp(7px,1.2vw,9px);color:#5a4020;margin-top:2px;">PISO ${self.floor}</div>
          <div class="pixel-inline" style="justify-content:center;margin-top:5px;font-size:clamp(9px,1.5vw,11px);color:#c8a84b;">${gamePixelIconHtml('coin',14)} <span id="dng-shop-coins">${self.pCoins}</span> · ${gamePixelIconHtml('heart',14)} ${Math.floor(self.pHp)}/${self.pMaxHp}</div>
        </div>
        <div id="dng-shop-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:12px;"></div>
        <div style="display:flex;gap:8px;">
          <button id="dng-shop-reroll" style="flex:1;background:linear-gradient(135deg,rgba(30,15,55,0.98),rgba(18,8,36,0.98));border:2px solid rgba(140,80,220,${self.pCoins>=rerollCost()?0.8:0.3});border-radius:4px;padding:clamp(8px,1.5vw,11px);cursor:${self.pCoins>=rerollCost()?'pointer':'not-allowed'};font-family:Courier New,monospace;font-size:clamp(11px,1.8vw,14px);color:${self.pCoins>=rerollCost()?'#cc88ff':'#4a3060'};letter-spacing:2px;text-transform:uppercase;"><span class="pixel-btn-content">${gamePixelIconHtml('dice',16)} ATUALIZAR · ${gamePixelIconHtml('coin',14)}${rerollCost()}</span></button>
          <button id="dng-shop-go" style="flex:1;background:linear-gradient(135deg,rgba(80,50,10,0.98),rgba(55,32,6,0.98));border:2px solid rgba(200,168,75,0.8);border-radius:4px;padding:clamp(8px,1.5vw,11px);cursor:pointer;font-family:Courier New,monospace;font-size:clamp(11px,1.8vw,14px);color:#f0d080;letter-spacing:2px;text-transform:uppercase;"><span class="pixel-btn-content">${gamePixelIconHtml('cross',15)} FECHAR</span></button>
        </div>`;
      document.getElementById('dng-shop-go').onclick=()=>{el.remove();self.running=true;self.lastTs=0;if(self.raf)cancelAnimationFrame(self.raf);self.raf=requestAnimationFrame(ts=>self._loop(ts));};
      document.getElementById('dng-shop-reroll').onclick=()=>{
        const rc2=rerollCost();
        if(self.pCoins<rc2) return;
        self.pCoins-=rc2; items=rollItems(); self._updateHUD(); renderShop();
      };
      const grid=document.getElementById('dng-shop-grid');
      items.forEach(item=>{
        const card=document.createElement('div');const ca=self.pCoins>=item.price;
        const relicArt=item.id?CODEX_RELIC_ART[`dng_relic_${item.id}`]:null;
        const itemArt=relicArt?codexArtIconHtml(relicArt,46,'dng-shop-relic-art','#63d8d1'):gamePixelIconHtml(dngStorePixelKind(item),30);
        card.style.cssText=`background:rgba(8,5,18,0.97);border:1px solid rgba(${ca?'200,168,75':'60,44,16'},0.4);border-radius:5px;padding:clamp(8px,1.5vw,12px);cursor:${ca?'pointer':'not-allowed'};opacity:${ca?1:0.45};transition:all .15s;`;
        card.innerHTML=`<div style="margin-bottom:5px;min-height:46px;display:flex;align-items:center;justify-content:center;">${itemArt}</div><div style="font-size:clamp(10px,1.5vw,12px);font-weight:bold;color:#f0d080;margin-bottom:2px;">${item.name}</div><div style="font-size:clamp(7px,1.2vw,9px);color:#7a6030;line-height:1.5;margin-bottom:5px;">${item.desc}</div><div class="pixel-inline" style="font-size:clamp(10px,1.6vw,12px);color:#c8a84b;font-weight:bold;">${gamePixelIconHtml('coin',13)} ${item.price}</div>`;
        if(ca){
          card.onmouseenter=()=>card.style.borderColor='rgba(200,168,75,0.8)';
          card.onmouseleave=()=>card.style.borderColor='rgba(200,168,75,0.4)';
          card.onclick=()=>{
            if(self.pCoins<item.price)return;
            self.pCoins-=item.price;item.apply(self);
            if(item.id)self.ownedRelics.add(item.id);
            self._updateHUD();
            const sc=document.getElementById('dng-shop-coins');if(sc)sc.textContent=self.pCoins;
            card.style.opacity='0.3';card.style.pointerEvents='none';
            card.innerHTML+=`<div style="margin-top:3px;display:flex;justify-content:center;">${gamePixelIconHtml('spark',15)}</div>`;
          };
        }
        grid.appendChild(card);
      });
    };
    renderShop();
  },

  _hasManualTarget(){
    const equip=this.inv[this.equippedIdx];
    const wId=equip?equip.defId:'sword';
    const isRanged=wId==='bow'||wId==='staff';
    const attackRange=isRanged
      ? 280+(this._rangeBonus||0)
      : (wId==='hammer'?70:wId==='axe'?65:wId==='dagger'?50:54)+(this._rangeBonus||0);
    if(this.entities.some(e=>!e.dead&&Math.hypot(e.x-this.px,e.y-this.py)<attackRange)) return true;
    return !!(this.resNodes&&this.resNodes.some(n=>Math.hypot(n.x-this.px,n.y-this.py)<58));
  },

  _loop(ts){
    if(!this.running)return;
    this.raf=requestAnimationFrame(t=>this._loop(t));
    if(!this.lastTs)this.clock.reset(ts);
    const dt=this.clock.step(ts).milliseconds;this.lastTs=ts;
    this._update(dt,ts);this._render(ts);
  },

  _update(dt,ts){
    // ── Freeze frame ──
    if(this._freeze>0){ this._freeze-=dt; return; } // halt all updates during freeze
    // ── Screen shake update ──
    if(this._shake.t>0){
      this._shake.t-=dt;
      const p=Math.max(0,this._shake.t/220);
      this._shake.x=(Math.random()-0.5)*this._shake.mag*p*2;
      this._shake.y=(Math.random()-0.5)*this._shake.mag*p*2;
    }
    // ── Blood particles update ──
    for(let i=this._bloodParts.length-1;i>=0;i--){
      const b=this._bloodParts[i];
      if(!b.ring){b.x+=b.vx*(dt/16.67);b.y+=b.vy*(dt/16.67);b.vy+=b.grav*(dt/16.67);b.vx*=0.92;}
      b.life-=dt;if(b.life<=0)this._bloodParts.splice(i,1);
    }
    let dx=0,dy=0;
    if(typeof GameSettings!=='undefined'){
      if(GameSettings.isActionDown('moveUp',this.keys)||this.keys['arrowup']) dy=-1;
      if(GameSettings.isActionDown('moveDown',this.keys)||this.keys['arrowdown']) dy=+1;
      if(GameSettings.isActionDown('moveLeft',this.keys)||this.keys['arrowleft']) dx=-1;
      if(GameSettings.isActionDown('moveRight',this.keys)||this.keys['arrowright']) dx=+1;
    }else{
      if(this.keys['w']||this.keys['arrowup']) dy=-1;
      if(this.keys['s']||this.keys['arrowdown']) dy=+1;
      if(this.keys['a']||this.keys['arrowleft']) dx=-1;
      if(this.keys['d']||this.keys['arrowright']) dx=+1;
    }
    const moving=!!(dx||dy);
    if(dx&&dy){dx*=0.707;dy*=0.707;}
    if(dy<0)this.pDir='up';else if(dy>0)this.pDir='down';
    else if(dx<0)this.pDir='left';else if(dx>0)this.pDir='right';
    if(dx||dy)this.pFacing=Math.atan2(dy,dx);
    this._pMoving=moving;
    if(moving){this.pFrameTick+=dt;if(this.pFrameTick>180){this.pFrameTick=0;this.pFrameIdx=(this.pFrameIdx+1)%3;}}
    else this.pFrameIdx=0;
    // Attack animation timer
    if(this.pAttackAnim>0)this.pAttackAnim-=dt;
    // Web slow
    if(this._webTimer>0)this._webTimer-=dt;
    const effSpeed=this.pSpeed*(this._webTimer>0?0.35:1)*(1+(this._speedBuff||0));
    const spd=effSpeed*(dt/16.67),r2=8;
    const nx=this.px+dx*spd,ny=this.py+dy*spd;
    // Check 4 corners — X axis first
    const xOk=this._tw(Math.floor((nx-r2)/DTS),Math.floor((this.py-r2)/DTS))
            &&this._tw(Math.floor((nx+r2)/DTS),Math.floor((this.py-r2)/DTS))
            &&this._tw(Math.floor((nx-r2)/DTS),Math.floor((this.py+r2)/DTS))
            &&this._tw(Math.floor((nx+r2)/DTS),Math.floor((this.py+r2)/DTS));
    if(xOk) this.px=nx;
    // Y axis using updated px
    const yOk=this._tw(Math.floor((this.px-r2)/DTS),Math.floor((ny-r2)/DTS))
            &&this._tw(Math.floor((this.px+r2)/DTS),Math.floor((ny-r2)/DTS))
            &&this._tw(Math.floor((this.px-r2)/DTS),Math.floor((ny+r2)/DTS))
            &&this._tw(Math.floor((this.px+r2)/DTS),Math.floor((ny+r2)/DTS));
    if(yOk) this.py=ny;
    // Clamp inside map bounds
    this.px=Math.max(r2,Math.min(MW*DTS-r2,this.px));
    this.py=Math.max(r2,Math.min(MH*DTS-r2,this.py));
    const vr=6,ptx=Math.floor(this.px/DTS),pty=Math.floor(this.py/DTS);
    for(let ey=pty-vr;ey<=pty+vr;ey++)for(let ex=ptx-vr;ex<=ptx+vr;ex++)
      if(ex>=0&&ex<MW&&ey>=0&&ey<MH&&Math.hypot(ex-ptx,ey-pty)<=vr)this.explored[ey*MW+ex]=1;
    if(this.pAttackCd>0)this.pAttackCd-=dt;
    if(this.pInvTimer>0)this.pInvTimer-=dt;
    if(this._regenT!==undefined){this._regenT-=dt;if(this._regenT<=0){this._regenT=3000;this.pHp=Math.min(this.pMaxHp,this.pHp+1);this._updateHUD();}}
    if(this._shCd!==undefined&&!this._shActive){this._shCd-=dt;if(this._shCd<=0)this._shActive=true;}

    const dngAutoAttack=typeof GameSettings==='undefined'||GameSettings.autoAttack;
    const dngManualPending=!dngAutoAttack&&GameSettings.hasManualAttack('dungeon');
    const dngManualAim=dngManualPending?GameSettings.consumeManualAttack('dungeon'):null;
    const dngAttackAllowed=dngAutoAttack||!!dngManualAim;
    if(this.pAttackCd<=0&&dngAttackAllowed){
      const equip=this.inv[this.equippedIdx];
      const wId=equip?equip.defId:(this.pClassId==='necromancer'?'staff':'sword');
      // Alcance por tipo de arma
      const isRanged = wId==='bow'||wId==='staff';
      const isFastMelee = wId==='dagger';
      const attackRange = isRanged ? 280 + (this._rangeBonus||0) : (wId==='hammer'?70:wId==='axe'?65:isFastMelee?50:54) + (this._rangeBonus||0);

      const manualAngle=dngManualAim?Math.atan2(dngManualAim.y-this.py,dngManualAim.x-this.px):null;
      let best=null,bd=attackRange;
      for(const e of this.entities){
        if(e.dead)continue;
        const d=Math.hypot(e.x-this.px,e.y-this.py);
        if(d>=bd)continue;
        if(dngManualAim&&!isRanged){
          const ea=Math.atan2(e.y-this.py,e.x-this.px);
          let diff=ea-manualAngle;while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
          if(Math.abs(diff)>Math.PI*0.42)continue;
        }
        bd=d;best=e;
      }
      if(best||dngManualAim){
        // Cooldown por tipo
        const baseCd = wId==='dagger'?180:wId==='bow'?500:wId==='staff'?650:wId==='hammer'?700:350;
        this.pAttackCd=Math.round(baseCd*(this._gearCdMult||1));
        this.pFacing=dngManualAim?manualAngle:Math.atan2(best.y-this.py,best.x-this.px);
        this.pAttackAnim=this.pAttackAnimMax;
        const isMelee=!isRanged;
        let dmg=(equip?equip.dmg:this.pDmg)+Math.floor(Math.random()*8);
        dmg=Math.round(dmg*(1+0.1*(MVP.upg.ferreiro||0)));   // Fio da Lamina Arcana
        if(this._dmgBuff>0) dmg=Math.round(dmg*(1+this._dmgBuff));
        const isCrit=((this._crit||0)+(this._critBuff||0))>0&&Math.random()<((this._crit||0)+(this._critBuff||0));
        if(isCrit){dmg*=2;if(best&&!dngManualAim)this._ft(best.x,best.y-28,'💥CRÍTICO!','#ffcc00');}

        if(isRanged){
          // ── RANGED: dispara projétil que voa até o alvo ──
          const ang=this.pFacing;
          const projSpd = wId==='bow'?8.5:6.0;
          const skinAttack=typeof getHeroSkinAttackColors==='function'?getHeroSkinAttackColors():null;
          const projCol = skinAttack?.primary||(wId==='bow'?'#88cc44':'#dd44ff');
          const projR   = wId==='bow'?5:8;
          const projLife = wId==='bow'?900:1100;
          // Projétil com referência ao alvo para aplicar dano ao chegar
          const _targetRef=dngManualAim?null:(best||null), _dmgFinal=dmg, _isCrit=isCrit, _self2=this;
          const proj={
            x:this.px+Math.cos(ang)*18, y:this.py+Math.sin(ang)*18,
            vx:Math.cos(ang)*projSpd, vy:Math.sin(ang)*projSpd,
            dmg:_dmgFinal, r:projR, life:projLife, col:projCol,
            secondaryCol:skinAttack?.secondary||'#ffffff',
            _rangedWpn:true, _targetRef, _isCrit,
          };
          this.projectiles.push(proj);
          // Feedback de disparo (sem aplicar dano ainda — o dano é na colisão)
          this._freeze=isCrit?40:20;
          this._shake={x:0,y:0,t:100,mag:1.5};
          if(wId==='staff'){
            this._parts(this.px,this.py,skinAttack?.secondary||'#dd44ff',6,25);
          }
        } else if(best) {
          // ── MELEE: hit instantâneo ──
          const beforeHp=best.hp;best.hp-=dmg;best.flash=300;this._necroBossDamage(best,beforeHp,best.hp);
          const impAng=Math.atan2(best.y-this.py,best.x-this.px);
          if(!best._shadowBound){
            const kbF=isCrit?80:50;
            const kbDx=Math.cos(impAng)*kbF*(dt/16.67+1),kbDy=Math.sin(impAng)*kbF*(dt/16.67+1);
            const er2=Math.max(best.r||8,8);
            const kbNx=best.x+kbDx;
            if(this._tw(Math.floor((kbNx-er2*0.5)/DTS),Math.floor((best.y-er2*0.5)/DTS))&&this._tw(Math.floor((kbNx+er2*0.5)/DTS),Math.floor((best.y+er2*0.5)/DTS)))best.x=kbNx;else best.x=best.x-kbDx*0.15;
            const kbNy=best.y+kbDy;
            if(this._tw(Math.floor((best.x-er2*0.5)/DTS),Math.floor((kbNy-er2*0.5)/DTS))&&this._tw(Math.floor((best.x+er2*0.5)/DTS),Math.floor((kbNy+er2*0.5)/DTS)))best.y=kbNy;else best.y=best.y-kbDy*0.15;
          }
          this._freeze=isMelee?(isCrit?90:55):(isCrit?40:20);
          const shakeMag=isMelee?(isCrit?6:3.5):(isCrit?4:2);
          this._shake={x:0,y:0,t:isMelee?220:130,mag:shakeMag};
          const bloodCol=best.type==='boss'?'#dd00ff':'#cc2200';
          const splatCol=isCrit?'#ff6600':'#ff4444';
          for(let b=0;b<(isCrit?14:8);b++){const ba=impAng+(-0.6+Math.random()*1.2),bs=1.5+Math.random()*3.5;this._bloodParts.push({x:best.x,y:best.y,vx:Math.cos(ba)*bs,vy:Math.sin(ba)*bs-0.5,col:Math.random()<0.6?bloodCol:splatCol,r:1+Math.random()*3,life:300+Math.random()*400,maxLife:700,grav:0.12});}
          this._bloodParts.push({x:best.x,y:best.y,vx:0,vy:0,col:isCrit?'#ffcc00':'#ffffff',r:isCrit?22:14,life:120,maxLife:120,ring:true,grav:0});
          this._ft(best.x,best.y-18,`${dmg}`,'#ffcc44');
          if(this._vamp){const heal=Math.ceil(dmg*this._vamp);this.pHp=Math.min(this.pMaxHp,this.pHp+heal);if(heal>0)this._ft(this.px,this.py-28,`+${heal}❤️`,'#44ff88');}
          this._applyKill(best,equip,dmg);
        }
        const meleeSkinAttack=typeof getHeroSkinAttackColors==='function'?getHeroSkinAttackColors():null;
        this.meleeSwings.push({x:this.px,y:this.py,ang:this.pFacing,life:200,max:200,col:meleeSkinAttack?.primary,secondaryCol:meleeSkinAttack?.secondary});this._updateHUD();
      } else if(this.resNodes&&this.resNodes.length){
        // sem inimigo por perto → minera o nó de recurso mais próximo
        let bn=null,bnd=58; for(const n of this.resNodes){ const d=Math.hypot(n.x-this.px,n.y-this.py); if(d<bnd){ bnd=d; bn=n; } }
        if(bn){
          this.pAttackCd=Math.round(340*(this._gearCdMult||1)); this.pFacing=Math.atan2(bn.y-this.py,bn.x-this.px); this.pAttackAnim=this.pAttackAnimMax; this._mineNode(bn); const skinAttack=typeof getHeroSkinAttackColors==='function'?getHeroSkinAttackColors():null; this.meleeSwings.push({x:this.px,y:this.py,ang:this.pFacing,life:200,max:200,col:skinAttack?.primary,secondaryCol:skinAttack?.secondary});
        }else if(dngManualPending){
          GameSettings.clearManualAttack('dungeon');
        }
      }else if(dngManualPending){
        GameSettings.clearManualAttack('dungeon');
      }
    }
    for(const e of this.entities){
      if(e.dead)continue;
      // Shadow-bound bosses: freeze AI completely — static until extracted
      if(e._shadowBound){
        e.flash=0; e.alert=0; e.at=e.ac; // reset attack timer so they don't attack on revival
        e.frameTick=(e.frameTick||0)+dt;if(e.frameTick>400){e.frameTick=0;e.frameIdx=(e.frameIdx+1)%3;}
        continue;
      }
      const necroAggro=this._necroAggroTarget(e);
      const targetX=necroAggro?.x??this.px,targetY=necroAggro?.y??this.py;
      const dist=Math.hypot(e.x-targetX,e.y-targetY);
      if(e.type==='boss'&&dist<260&&!e._bossThemeStarted&&typeof Audio!=='undefined'){
        e._bossThemeStarted=true;
        const dngBossTheme=e._hyper?'brute':e.biome==='ice'?'frost':e.biome==='fire'?'balrog':e.biome==='swamp'?'sandworm':'default';
        Audio.playBossMusic(dngBossTheme);
        Audio.playBossSpawn();
      }
      if(dist<190)e.alert=3000;
      if(e.alert>0){
        e.alert-=dt;
        const ang=Math.atan2(targetY-e.y,targetX-e.x),mv=e.spd*(dt/16.67);
        const exn=e.x+Math.cos(ang)*mv,eyn=e.y+Math.sin(ang)*mv;
        // Usa raio real do inimigo (não metade) para colisão com paredes
        const er=Math.max(e.r||8, 8)*0.62;
        const exOk=this._tw(Math.floor((exn-er)/DTS),Math.floor((e.y-er)/DTS))
                 &&this._tw(Math.floor((exn+er)/DTS),Math.floor((e.y-er)/DTS))
                 &&this._tw(Math.floor((exn-er)/DTS),Math.floor((e.y+er)/DTS))
                 &&this._tw(Math.floor((exn+er)/DTS),Math.floor((e.y+er)/DTS));
        if(exOk)e.x=exn;
        const eyOk=this._tw(Math.floor((e.x-er)/DTS),Math.floor((eyn-er)/DTS))
                 &&this._tw(Math.floor((e.x+er)/DTS),Math.floor((eyn-er)/DTS))
                 &&this._tw(Math.floor((e.x-er)/DTS),Math.floor((eyn+er)/DTS))
                 &&this._tw(Math.floor((e.x+er)/DTS),Math.floor((eyn+er)/DTS));
        if(eyOk)e.y=eyn;
        const adx=targetX-e.x,ady=targetY-e.y;
        if(Math.abs(adx)>Math.abs(ady))e.dir=adx>0?'right':'left';else e.dir=ady>0?'down':'up';
        e.frameTick=(e.frameTick||0)+dt;if(e.frameTick>200){e.frameTick=0;e.frameIdx=(e.frameIdx+1)%3;}
      }
      if(e.flash>0)e.flash-=dt;
      if(e.spdBuff>0){e.spdBuff-=dt;if(e.spdBuff<=0){e.spd/=1.6;e.spdBuff=0;}}
      if(e.at>0)e.at-=dt;
      if(e.at<=0&&dist<e.ar){
        e.at=e.ac;
        if(e.ranged){const ang=Math.atan2(this.py-e.y,this.px-e.x);this.projectiles.push({x:e.x,y:e.y,vx:Math.cos(ang)*5.5,vy:Math.sin(ang)*5.5,dmg:e.dmg,r:5,life:1400,col:'#886600'});}
        else if(necroAggro){
          if(necroAggro.hitTimer<=0){necroAggro.hp-=Math.max(1,e.dmg*.55);necroAggro.hitTimer=700;this._parts(necroAggro.x,necroAggro.y,'#9ac6a0',3,18);}
        }else if(this.pInvTimer<=0){this._takeDmg(e.dmg);}
      }
      if(e.sk&&e.alert>0){e.skTimer-=dt;if(e.skTimer<=0){e.skTimer=e.skCd;this._enemySkill(e,dist);}}
      // Processa nuvem de veneno do Boss Bruxo
      if(e._poisonCloud){
        e._poisonCloud.forEach(c=>{ c.life-=dt; });
        e._poisonCloud=e._poisonCloud.filter(c=>c.life>0);
        for(const c of e._poisonCloud){
          if(Math.hypot(this.px-c.x,this.py-c.y)<c.r&&this.pInvTimer<=0&&Math.random()<0.04){
            this._takeDmg(e.dmg*0.25);this._ft(this.px,this.py-22,'☠️','#44ff44');
          }
        }
      }
    }
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i];
      p.x+=p.vx*(dt/16.67);p.y+=p.vy*(dt/16.67);p.life-=dt;
      // Trilha visual por tipo
      if(p._rangedWpn){
        // Projétil do jogador — trilha mais brilhante
        this._projTrails.push({x:p.x,y:p.y,col:p.col,r:p.r*0.85,life:200});
      } else if(p._fire&&Math.random()<0.5)this._projTrails.push({x:p.x,y:p.y,col:'#ff6600',r:p.r*0.8,life:200});
      else if(p._freeze&&Math.random()<0.5)this._projTrails.push({x:p.x,y:p.y,col:'#88ddff',r:p.r*0.6,life:180});
      else if(p._poison&&Math.random()<0.5)this._projTrails.push({x:p.x,y:p.y,col:'#44ff44',r:p.r*0.7,life:160});
      else if(Math.random()<0.6)this._projTrails.push({x:p.x,y:p.y,col:p.col,r:p.r*0.7,life:180});
      if(p.life<=0||!this._tw(Math.floor(p.x/DTS),Math.floor(p.y/DTS))){this._parts(p.x,p.y,p.col,3,20);this.projectiles.splice(i,1);continue;}

      if(p._rangedWpn){
        // Projétil do JOGADOR — colide com inimigos
        let hit=false;
        for(const e of this.entities){
          if(e.dead||e._shadowBound) continue;
          if(Math.hypot(p.x-e.x,p.y-e.y)<(e.r||12)+p.r){
            // Aplica dano
            const beforeHp=e.hp;e.hp-=p.dmg; e.flash=300;this._necroBossDamage(e,beforeHp,e.hp);
            // Efeito impacto
            this._parts(e.x,e.y,p.col,8,45);
            const impAng=Math.atan2(e.y-this.py,e.x-this.px);
            this._bloodParts.push({x:e.x,y:e.y,vx:0,vy:0,col:p._isCrit?'#ffcc00':'#ffffff',r:p._isCrit?18:12,life:100,maxLife:100,ring:true,grav:0});
            this._ft(e.x,e.y-18,`${p.dmg}`,'#ffcc44');
            if(this._vamp){const heal=Math.ceil(p.dmg*this._vamp);this.pHp=Math.min(this.pMaxHp,this.pHp+heal);if(heal>0)this._ft(this.px,this.py-28,`+${heal}❤️`,'#44ff88');}
            const equip2=this.inv[this.equippedIdx];
            this._applyKill(e,equip2,p.dmg);
            hit=true; break;
          }
        }
        if(hit){this.projectiles.splice(i,1);}
      } else if(this.pInvTimer<=0&&Math.hypot(p.x-this.px,p.y-this.py)<14){
        // Projétil INIMIGO — colide com jogador
        this._takeDmg(p.dmg);
        if(p._freeze){this._webTimer=Math.max(this._webTimer||0,1600);this._ft(this.px,this.py-36,'❄️ CONGELADO!','#88ddff');}
        if(p._poison&&Math.random()<0.5){this._takeDmg(p.dmg*0.4);this._ft(this.px,this.py-36,'☠️ VENENO!','#44ff44');}
        if(p._fire){this._parts(this.px,this.py,'#ff6600',8,35);}
        this.projectiles.splice(i,1);
      }
    }
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.x+=p.vx*(dt/16.67);p.y+=p.vy*(dt/16.67);p.vy+=0.08*(dt/16.67);p.life-=dt;if(p.life<=0)this.particles.splice(i,1);}
    for(let i=this._projTrails.length-1;i>=0;i--){this._projTrails[i].life-=dt;if(this._projTrails[i].life<=0)this._projTrails.splice(i,1);}
    for(let i=this.floatingTexts.length-1;i>=0;i--){const f=this.floatingTexts[i];f.y-=0.9*(dt/16.67);f.life-=dt;if(f.life<=0)this.floatingTexts.splice(i,1);}
    for(let i=this.meleeSwings.length-1;i>=0;i--){this.meleeSwings[i].life-=dt;if(this.meleeSwings[i].life<=0)this.meleeSwings.splice(i,1);}
    this._necroUpdate(dt);
    this._updateResources(dt);
    const itx=Math.floor(this.px/DTS),ity=Math.floor(this.py/DTS),tile=this._ta(itx,ity);
    if(tile===T_STAIRS&&!this._sc){this._sc=true;this._msg(`🪜 Descendo para o Piso ${this.floor+1}...`,1800);setTimeout(()=>{this._nextFloor();this._sc=false;},700);}
    if(tile===T_CHEST&&!this._chestCd){
      this._chestCd=true;setTimeout(()=>this._chestCd=false,500);
      const gm=this._goldMult||1;const g=Math.ceil((4+Math.floor(Math.random()*6)+this.floor*2)*gm); // BALANCE v6
      this.pCoins+=g;const h=Math.floor(this.pMaxHp*0.14);this.pHp=Math.min(this.pMaxHp,this.pHp+h);
      this._parts(this.px,this.py,'#f0d080',14,50);this.map[ity*MW+itx]=T_FLOOR;
      this._ft(this.px,this.py-30,`+${g}🪙 +${h}❤️`,'#f0d080');
      if(Math.random()<0.45){ this._giveGear(rollDngGear(this.floor)); }
      this._updateHUD();
      // Drop weapon (50%) or fruit (50%)
      const fruitKeys = Object.keys(DUNGEON_ITEMS).filter(k=>DUNGEON_ITEMS[k].type==='fruit');
      const roll = Math.random();
      if(roll<0.50){
        const def2=DNG_WPN_DEFS[Math.floor(Math.random()*DNG_WPN_DEFS.length)];
        const rar=rollDngRarity(this.floor);const wpn=makeDngWeapon(def2.id,rar,this.floor);
        this._ft(this.px,this.py-52,`${wpn.icon} ARMA ENCONTRADA!`,DNG_RCOL[rar]);
        this._parts(this.px,this.py,DNG_RCOL[rar],10,55);
        setTimeout(()=>this._giveWeapon(wpn),350);
      } else {
        const fk = fruitKeys[Math.floor(Math.random()*fruitKeys.length)];
        const fd = DUNGEON_ITEMS[fk];
        craftingInv[fk] = (craftingInv[fk]||0) + 1;
        this._ft(this.px,this.py-52,`${fd.icon} ${fd.name}!`,'#ff88cc');
        this._parts(this.px,this.py,'#ff88cc',8,40);
      }
      // Mineral drop from epic+ biomes
      if(this._biome===BIOMES.swamp||this._biome===BIOMES.fire){
        if(Math.random()<0.25){
          craftingInv['mineral_sombra']=(craftingInv['mineral_sombra']||0)+1;
          this._ft(this.px,this.py-68,'💎 Mineral Sombrio!','#cc88ff');
        }
      }
    }
    if(tile===T_BARREL&&!this._barrelCd){
      this._barrelCd=true;setTimeout(()=>this._barrelCd=false,500);
      if(Math.random()<0.55){const h=8+Math.floor(Math.random()*12);this.pHp=Math.min(this.pMaxHp,this.pHp+h);this._ft(this.px,this.py-30,`+${h}❤️`,'#44ff88');}
      this._parts(this.px,this.py,'#884422',6,30);this.map[ity*MW+itx]=T_FLOOR;this._updateHUD();
    }
    if(tile===T_MERCHANT&&!this._merchantCd){
      this._merchantCd=true;setTimeout(()=>this._merchantCd=false,800);
      this._openMerchant();
    }
    if(tile===T_PORTAL&&!this._portalCd){ this._portalCd=true; this._enterBosque(); }
    if(tile===T_RETURN&&!this._portalCd){ this._portalCd=true; this._exitBosque(); }
    if(MVP_NODES[tile]&&!this._nodeCd){ this._nodeCd=true; setTimeout(()=>{this._nodeCd=false;},220); this._collectNode(itx,ity,tile); }
    if(tile!==T_NPCF&&tile!==T_NPCC&&tile!==T_NPCM){ this._npcCd=false; }
    if(tile===T_NPCF&&!this._npcCd){ this._npcCd=true; this._openNpc('ferreiro'); }
    if(tile===T_NPCC&&!this._npcCd){ this._npcCd=true; this._openNpc('curandeira'); }
    if(tile===T_NPCM&&!this._npcCd){ this._npcCd=true; this._openNpc('mestre'); }
    if(tile!==T_STORAGE){ this._storageCd=false; }
    if(tile===T_STORAGE&&!this._storageCd){ this._storageCd=true; this._openStorage(); }
    this.torchFlicker=0.88+Math.sin(ts*0.007)*0.07+Math.sin(ts*0.017)*0.05;
    this.camX=Math.max(0,Math.min(MW*DTS-W,this.px-W/2));
    this.camY=Math.max(0,Math.min(MH*DTS-H,this.py-H/2));

    // ── Buff timers ──
    if(this._speedBuffTimer>0){ this._speedBuffTimer-=dt; if(this._speedBuffTimer<=0){this._speedBuff=0;this._ft(this.px,this.py-40,'Buff velocidade expirou','#aaaaaa');} }
    if(this._dmgBuffTimer>0){ this._dmgBuffTimer-=dt; if(this._dmgBuffTimer<=0){this._dmgBuff=0;this._critBuff=0;} }
    if(this._regenActive&&this._regenActiveTimer>0){ this._regenActiveTimer-=dt; this._regenT=(this._regenT||0)-dt; if(this._regenT<=0){this._regenT=1000;const ra=this._regenAmt||1;this.pHp=Math.min(this.pMaxHp,this.pHp+ra);this._ft(this.px,this.py-28,`+${ra}❤️`,'#44ff88');this._updateHUD();} if(this._regenActiveTimer<=0)this._regenActive=false; }
    if(this._gearRegen>0&&this.pHp<this.pMaxHp){ this._grT=(this._grT||0)-dt; if(this._grT<=0){ this._grT=2200; this.pHp=Math.min(this.pMaxHp,this.pHp+this._gearRegen); this._ft(this.px,this.py-28,`+${this._gearRegen}❤️`,'#88ffcc'); this._updateHUD(); } }
    if(this._aoeTimer>0){ this._aoeTimer-=dt; if(this._aoeTimer<=0)this._aoe=false; }

    // ── Biome: Swamp poison tick ──
    if(this._biome===BIOMES.swamp){
      this._poisonTimer=(this._poisonTimer||0)-dt;
      if(this._poisonTimer<=0){ this._poisonTimer=2200; if(this.pInvTimer<=0){this._takeDmg(this._biome.poisonDmg);this._ft(this.px,this.py-28,'☠ veneno','#44ff44');} }
    }
    // ── Biome: Ice slow enemies (apply once) ──
    if(this._biome===BIOMES.ice){
      for(const e of this.entities){
        if(!e.dead&&!e._iceSlowed){ e.spd=(e.spd||e.speed)*0.65; e._iceSlowed=true; }
      }
    } else {
      // Reset ice slow when leaving ice biome
      for(const e of this.entities){
        if(!e.dead&&e._iceSlowed){ e.spd=(e.spd||e.speed)/0.65; e._iceSlowed=false; }
      }
    }

    // ── Shadow allies tick ──
    for(const s of shadowAllies){ if(!s.dead && s.update) s.update(dt, {x:this.px,y:this.py}, this.entities); }
    shadowAllies = shadowAllies.filter(s=>!s.dead);
    updateShadowHUD();

    // ── Extraction tick ──
    tickExtraction(dt, this.px, this.py);
    // ── Dash tick ──
    if(typeof DNG._dngDashTick==='function') DNG._dngDashTick(dt);
  },

  _applyKill(best, equip, dmg, source='direct'){
    if(best.hp>0||best.dead) return;
    best.dead=true; this.pKills++;
    this._necroOnKill(best,source);
    if(best.type==='boss') mvpOnKill('boss'); else mvpOnKill('enemy');   // progresso de missoes
    const bloodCol=best.type==='boss'?'#dd00ff':'#cc2200';
    for(let b=0;b<16;b++){const ba=Math.random()*Math.PI*2,bs=2+Math.random()*4;this._bloodParts.push({x:best.x,y:best.y,vx:Math.cos(ba)*bs,vy:Math.sin(ba)*bs-1,col:bloodCol,r:2+Math.random()*3,life:500+Math.random()*500,maxLife:1000,grav:0.1});}
    this._shake={x:0,y:0,t:300,mag:best.type==='boss'?10:5};
    this._freeze=best.type==='boss'?150:80;
    if(this._aoe){for(const e2 of this.entities){if(e2.dead)continue;if(Math.hypot(e2.x-best.x,e2.y-best.y)<60){e2.hp-=Math.floor((equip?equip.dmg:this.pDmg)*0.5);e2.flash=150;if(e2.hp<=0){e2.dead=true;this.pKills++;}}}}
    const gn=best.coin?Math.ceil(best.coin*(this._goldMult||1)):0;
    if(gn>0){this.pCoins+=gn;this._ft(best.x,best.y-32,`+${gn}🪙`,'#f0d080');this._updateHUD();}
    if(best.type==='boss'){
      if(typeof GameSettings!=='undefined'&&typeof GameSettings.recordDungeonBoss==='function') GameSettings.recordDungeonBoss(!!best._hyper);
      if(typeof Audio!=='undefined'){
        Audio.playBossDefeat();
        setTimeout(()=>{if(typeof DNG!=='undefined'&&DNG.running)Audio.playCombatMusic('dungeon');},650);
      }
      const bonusCoins=best._hyper?Math.round(120+this.floor*16):Math.round(18+this.floor*8); // hiper paga ~6×
      this.pCoins+=bonusCoins;
      this._ft(best.x,best.y-50,`+${bonusCoins}🪙 ${best._hyper?'HIPER BOSS!':'BOSS!'}`,best._hyper?'#ff9a20':'#ffcc00');
      this._updateHUD();
      const bossRar=best.bossRar||BOSS_RARITY_TABLE[0];
      this._parts(best.x,best.y,best._hyper?'#ff9a20':'#cc44ff',35,100);
      this._parts(best.x,best.y,best._hyper?'#ffd870':'#8800ff',20,80);
      const newShadow=new ShadowAlly(best,bossRar);
      newShadow._respawnOnDeath=true; newShadow._runRef=this;
      shadowAllies.push(newShadow); updateShadowHUD();
      this._msg(`🌑 ${best.name} [${bossRar.name}] ressuscitado como Sombra Aliada!`,3500);
      if(best._hyper){
        // 🏆 recompensa do hiper boss: armadura LENDÁRIA + anel épico/lendário garantidos + cura 50%
        const slots=['helmet','chest','boots'];
        this._giveGear(makeDngArmor(slots[Math.floor(Math.random()*slots.length)],'legendary',this.floor+2));
        this._giveGear(makeDngRing(Math.random()<0.5?'epic':'legendary',this.floor+2));
        this.pHp=Math.min(this.pMaxHp,this.pHp+Math.round(this.pMaxHp*0.5));
        this._updateHUD();
        setTimeout(()=>this._msg('🏆 HORROR RÚNICO derrotado! Equipamento lendário + cura vital!',4200),1200);
      } else if(Math.random()<0.6){ this._giveGear(rollDngGear(this.floor+1)); }
      setTimeout(()=>this._nextFloor(),2000);
    }
  },

  _takeDmg(dmg){
    if(this._shActive){this._shActive=false;this._shCd=10000;
      this._shake={x:0,y:0,t:150,mag:3};
      this._ft(this.px,this.py-28,'🛡️ BLOQUEADO','#88aaff');return;}
    // Dodge check
    if(this._dodge>0 && Math.random()<this._dodge){
      this._ft(this.px,this.py-28,'✨ ESQUIVOU!','#88ffcc'); return; }
    // Armor damage reduction
    const reduced = Math.max(1, dmg - (this._armor||0));
    this.pHp -= reduced; this.pInvTimer=500;
    // Player hit feedback
    this._shake={x:0,y:0,t:200,mag:4};
    this._freeze=25; // tiny freeze on player hit
    for(let b=0;b<8;b++){
      const ba=Math.random()*Math.PI*2,bs=1.5+Math.random()*2.5;
      this._bloodParts.push({x:this.px,y:this.py,vx:Math.cos(ba)*bs,vy:Math.sin(ba)*bs-0.5,
        col:'#ff4444',r:2+Math.random()*2,life:250+Math.random()*250,maxLife:500,grav:0.1});
    }
    this._ft(this.px,this.py-22,`-${reduced}`,'#ff5555');
    if(this._armor>0) this._ft(this.px,this.py-36,`🛡-${dmg-reduced}`,'#8888ff');
    if(this.pHp<=0){
      if((this._revivesLeft||0)>0){
        this._revivesLeft--;
        this.pHp=Math.max(1,Math.round(this.pMaxHp*0.35));
        this.pInvTimer=2500;
        this._parts(this.px,this.py,'#77ffbb',28,85);
        this._ft(this.px,this.py-38,`FIO DO DESTINO · ${this._revivesLeft}`,'#77ffbb');
        this._updateHUD();
      }else this._die();
    }else this._updateHUD();
  },

  _enemySkill(e,dist){
    switch(e.sk){
      case 'dash': if(dist<160){const a=Math.atan2(this.py-e.y,this.px-e.x);e.x+=Math.cos(a)*55;e.y+=Math.sin(a)*55;this._parts(e.x,e.y,'#33cc33',5,35);} break;
      case 'bone': if(dist<200){const a=Math.atan2(this.py-e.y,this.px-e.x);this.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*5.5,vy:Math.sin(a)*5.5,dmg:e.dmg*1.5,r:6,life:1100,col:'#eee8cc'});} break;
      case 'slam': if(dist<80){this._parts(e.x,e.y,'#885533',12,50);this._ft(e.x,e.y-20,'💢 SLAM!','#ff4400');if(this.pInvTimer<=0)this._takeDmg(e.dmg*1.8);} break;
      case 'roar': e.spd*=1.6;e.spdBuff=3000;this._parts(e.x,e.y,'#aa6600',8,40);this._ft(e.x,e.y-20,'RUGIDO!','#ffaa00'); break;
      case 'web': if(dist<180){this._webTimer=2200;this._ft(this.px,this.py-28,'🕸️ PRESO!','#aaa860');} break;
      case 'summon': for(let i=0;i<2;i++){const a=Math.random()*Math.PI*2;this._spawnEnemy(e.x+Math.cos(a)*60,e.y+Math.sin(a)*60,this.floor);}this._ft(e.x,e.y-e.r-10,'💀 INVOCAR!','#eee8cc');this._parts(e.x,e.y,'#eee8cc',8,35); break;
      case 'charge': if(dist<300){const a=Math.atan2(this.py-e.y,this.px-e.x);e.x+=Math.cos(a)*110;e.y+=Math.sin(a)*110;this._parts(e.x,e.y,'#885533',12,60);this._ft(e.x,e.y-e.r-10,'⚡ CARGA!','#ff5500');if(dist<55&&this.pInvTimer<=0)this._takeDmg(e.dmg*2);} break;
      case 'shockwave': this._parts(e.x,e.y,'#bb8855',18,80);this._ft(e.x,e.y-e.r-10,'🌊 SHOCKWAVE!','#ffaa44');if(dist<180&&this.pInvTimer<=0)this._takeDmg(e.dmg*1.5); break;
      case 'clubslam': {
        // ── Ogro: pancada de clava — dano pesado + empurrão + atordoa velocidade ──
        this._parts(e.x,e.y,'#c8ccd0',14,70);this._parts(e.x,e.y,'#8a6430',10,55);
        this._ft(e.x,e.y-e.r-10,'🏏 CLAVADA!','#c8ccd0');
        this._shake={x:0,y:0,t:280,mag:8};
        if(dist<150&&this.pInvTimer<=0){
          this._takeDmg(e.dmg*1.8);
          const ka=Math.atan2(this.py-e.y,this.px-e.x);
          this.px+=Math.cos(ka)*46; this.py+=Math.sin(ka)*46;   // empurrão
          this._speedBuff=-0.35; this._speedBuffTimer=1400;      // pernas bambas
          this._ft(this.px,this.py-36,'💫 ATORDOADO','#ffcc66');
        }
        break; }
      case 'spiderlings': for(let i=0;i<3;i++){const a=(i/3)*Math.PI*2;this._spawnEnemy(e.x+Math.cos(a)*50,e.y+Math.sin(a)*50,this.floor);}if(dist<220){this._webTimer=3000;this._ft(this.px,this.py-28,'🕸️ TEIA!','#aaa860');}this._parts(e.x,e.y,'#884422',10,40); break;
      case 'boulder': {
        // ── Troll das Cavernas: arremessa pedregulho pesado; se perto, varrida de clava ──
        const ba2=Math.atan2(this.py-e.y,this.px-e.x);
        this.projectiles.push({x:e.x+Math.cos(ba2)*e.r,y:e.y+Math.sin(ba2)*e.r,vx:Math.cos(ba2)*3.4,vy:Math.sin(ba2)*3.4,dmg:e.dmg*1.6,r:12,life:2000,col:'#8a8a96'});
        this._parts(e.x,e.y-e.r*0.5,'#8a8a96',12,55);
        this._ft(e.x,e.y-e.r-12,'🪨 PEDREGULHO!','#aab0bc');
        this._shake={x:0,y:0,t:220,mag:6};
        if(dist<130&&this.pInvTimer<=0){
          this._takeDmg(e.dmg*1.5);
          const ka2=Math.atan2(this.py-e.y,this.px-e.x);
          this.px+=Math.cos(ka2)*40; this.py+=Math.sin(ka2)*40;   // varrida empurra
          this._ft(this.px,this.py-36,'🏏 VARRIDA!','#8fb4e0');
        }
        break; }
      case 'hyper': {
        // ── HORROR RÚNICO (hiper boss): 4 ataques em rotação; +denso abaixo de 50% HP ──
        e._hyperPhase=((e._hyperPhase||0)+1)%4;
        const fase2=e.hp<e.maxHp*0.5;
        const hAng=Math.atan2(this.py-e.y,this.px-e.x);
        switch(e._hyperPhase){
          case 0: { // 🕸 anel de projéteis rúnicos + teia que prende
            const n=fase2?14:10;
            for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2;this.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*3.6,vy:Math.sin(a)*3.6,dmg:e.dmg*0.9,r:7,life:1600,col:'#c8a0ff'});}
            if(dist<230){this._webTimer=1800;this._ft(this.px,this.py-28,'🕸️ TEIA RÚNICA!','#c8a0ff');}
            this._parts(e.x,e.y,'#c8a0ff',18,80);this._ft(e.x,e.y-e.r-14,'🕸 ANEL RÚNICO!','#c8a0ff'); break; }
          case 1: { // 🏮 rajada focada da lanterna (projéteis rápidos que queimam)
            const n=fase2?5:3;
            for(let i=0;i<n;i++){const fa=hAng+(i-(n-1)/2)*0.16;this.projectiles.push({x:e.x+Math.cos(fa)*e.r,y:e.y+Math.sin(fa)*e.r,vx:Math.cos(fa)*6.2,vy:Math.sin(fa)*6.2,dmg:e.dmg*1.3,r:8,life:1400,col:'#ffd870',_fire:true});}
            this._parts(e.x,e.y,'#ffd870',14,60);this._ft(e.x,e.y-e.r-14,'🏮 LANTERNA SOMBRIA!','#ffd870'); break; }
          case 2: { // 💀 invoca ninhada de crias
            const n=fase2?4:3;
            for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2;this._spawnEnemy(e.x+Math.cos(a)*60,e.y+Math.sin(a)*60,this.floor);}
            this._parts(e.x,e.y,'#8a6ab0',14,60);this._ft(e.x,e.y-e.r-14,'💀 NINHADA!','#b090e0'); break; }
          case 3: { // ⚡ investida com mordida + empurrão
            if(dist<340){
              e.x+=Math.cos(hAng)*150;e.y+=Math.sin(hAng)*150;
              const nd=Math.hypot(this.px-e.x,this.py-e.y);
              this._parts(e.x,e.y,'#54e868',20,80);this._ft(e.x,e.y-e.r-14,'⚡ INVESTIDA!','#54e868');
              this._shake={x:0,y:0,t:260,mag:9};
              if(nd<95&&this.pInvTimer<=0){this._takeDmg(e.dmg*2.2);const ka3=Math.atan2(this.py-e.y,this.px-e.x);this.px+=Math.cos(ka3)*44;this.py+=Math.sin(ka3)*44;this._ft(this.px,this.py-36,'🩸 MORDIDA!','#ff5555');}
            } break; }
        }
        break; }

      // ── ICE BOSSES ──
      case 'blizzard':
        // Dispara 8 projéteis de gelo em todas as direções + congela o jogador se perto
        for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2+Math.random()*0.3;this.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*4.2,vy:Math.sin(a)*4.2,dmg:e.dmg*0.9,r:7,life:1400,col:'#88ddff',_freeze:true});}
        if(dist<160){this._webTimer=1800;this._ft(this.px,this.py-28,'❄️ CONGELADO!','#88ddff');}
        this._parts(e.x,e.y,'#aaddff',20,70);this._ft(e.x,e.y-e.r-12,'❄️ BLIZZARD!','#88ddff'); break;
      case 'ice_slam':
        // Salta no jogador causando dano em área e deixa campo de gelo que retarda
        if(dist<260){
          const a=Math.atan2(this.py-e.y,this.px-e.x);
          e.x+=Math.cos(a)*130;e.y+=Math.sin(a)*130;
          const nd=Math.hypot(this.px-e.x,this.py-e.y);
          this._parts(e.x,e.y,'#55aaff',25,90);this._ft(e.x,e.y-e.r-12,'💥 QUEDA GLACIAL!','#55aaff');
          if(nd<90&&this.pInvTimer<=0){this._takeDmg(e.dmg*2.2);this._webTimer=2500;this._ft(this.px,this.py-36,'❄️ ESMAGADO!','#88ddff');}
          // Cria 3 projéteis de fragmento de gelo
          for(let i=0;i<3;i++){const ia=a+(-1+i)*(Math.PI/4);this.projectiles.push({x:e.x,y:e.y,vx:Math.cos(ia)*5,vy:Math.sin(ia)*5,dmg:e.dmg*0.7,r:6,life:900,col:'#66bbff'});}
        } break;

      // ── SWAMP BOSSES ──
      case 'poison_cloud':
        // Cria nuvem de veneno persistente ao redor do boss e projéteis de ácido
        if(!e._poisonCloud) e._poisonCloud=[];
        for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2;const ox=Math.cos(a)*70,oy=Math.sin(a)*70;e._poisonCloud.push({x:e.x+ox,y:e.y+oy,life:4000,r:32});}
        for(let i=0;i<3;i++){const a=Math.atan2(this.py-e.y,this.px-e.x)+(i-1)*0.4;this.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*3.8,vy:Math.sin(a)*3.8,dmg:e.dmg,r:9,life:1600,col:'#44ff44',_poison:true});}
        this._parts(e.x,e.y,'#33cc33',18,80);this._ft(e.x,e.y-e.r-12,'☠️ NUVEM TÓXICA!','#44ff44');
        // Aplica veneno imediato se perto
        if(dist<130&&this.pInvTimer<=0){this._takeDmg(e.dmg*0.5);this._ft(this.px,this.py-28,'☠️ ENVENENADO!','#44ff44');}
        break;
      case 'hydra_heads':
        // Invoca 2 minions, cuspe 6 projéteis de veneno em leque e aplica veneno na área
        for(let i=0;i<2;i++){const a=Math.random()*Math.PI*2;this._spawnEnemy(e.x+Math.cos(a)*55,e.y+Math.sin(a)*55,this.floor);}
        const ha=Math.atan2(this.py-e.y,this.px-e.x);
        for(let i=0;i<6;i++){const fa=ha+(-2.5+i)*(Math.PI/7);this.projectiles.push({x:e.x,y:e.y,vx:Math.cos(fa)*4.5,vy:Math.sin(fa)*4.5,dmg:e.dmg*1.1,r:8,life:1300,col:'#22ff44',_poison:true});}
        this._parts(e.x,e.y,'#22aa22',22,85);this._ft(e.x,e.y-e.r-12,'🐍 CABEÇAS DA HIDRA!','#22ff44');
        if(dist<150&&this.pInvTimer<=0){this._takeDmg(e.dmg*0.7);}
        break;

      // ── FIRE BOSSES ──
      case 'meteor': {
        // Chova de meteoros: 5 projéteis que caem em direção ao jogador
        this._ft(e.x,e.y-e.r-12,'☄️ CHUVA DE METEOROS!','#ff6600');
        this._parts(e.x,e.y,'#ff4400',18,80);
        const _self=this, _ex=e.x, _ey=e.y, _edmg=e.dmg;
        for(let i=0;i<5;i++){
          const delay=i*280;
          const _tx=this.px+(Math.random()-0.5)*130, _ty=this.py+(Math.random()-0.5)*130;
          const _ox=_tx-_ex, _oy=_ty-_ey, _od=Math.max(1,Math.hypot(_ox,_oy));
          const _spd=5+Math.random()*2;
          setTimeout(()=>{
            if(!_self.running&&!_self.paused)return;
            if(!_self.projectiles)return;
            _self.projectiles.push({x:_ex+Math.cos(Math.atan2(_oy,_ox)-Math.PI)*90,y:_ey+Math.sin(Math.atan2(_oy,_ox)-Math.PI)*90,vx:(_ox/_od)*_spd,vy:(_oy/_od)*_spd,dmg:_edmg*1.6,r:10,life:1800,col:'#ff5500',_fire:true});
            _self._parts(_tx,_ty,'#ff8800',8,40);
          },delay);
        }
        if(dist<100&&this.pInvTimer<=0){this._takeDmg(e.dmg);if(!this._aoe){this._aoe=true;this._aoeTimer=3000;}}
        break;
      }
      case 'dragon_breath': {
        // Sopro de fogo em cone — projéteis em leque + vampirismo no boss
        const da=Math.atan2(this.py-e.y,this.px-e.x);
        for(let i=0;i<9;i++){const fa2=da+(-4+i)*(Math.PI/12);const spd2=4+Math.random()*2;this.projectiles.push({x:e.x+Math.cos(fa2)*e.r,y:e.y+Math.sin(fa2)*e.r,vx:Math.cos(fa2)*spd2,vy:Math.sin(fa2)*spd2,dmg:e.dmg*1.3,r:8,life:900,col:'#ff4400',_fire:true});}
        this._parts(e.x,e.y,'#ff6600',25,90);this._ft(e.x,e.y-e.r-12,'🔥 SOPRO DO DRAGÃO!','#ff6600');
        if(dist<120&&this.pInvTimer<=0){this._takeDmg(e.dmg*2.5);this._ft(this.px,this.py-36,'🔥 QUEIMADO!','#ff4400');}
        const healAmt=Math.round(e.maxHp*0.04); e.hp=Math.min(e.maxHp,e.hp+healAmt);
        this._parts(e.x,e.y,'#44ff88',6,25);
        break;
      }
    }

    // Fase 2 — enraivecimento a 50% HP (todos os bosses)
    if(e.type==='boss'&&e.hp<e.maxHp*0.5&&!e._enragedShown){
      e._enragedShown=true;e._phase2=true;
      e.spd*=1.35; e.skCd=Math.round(e.skCd*0.6); // habilidades mais rápidas
      this._msg(`☠ ${e.name} ENRAIVECIDO — FASE 2!`,2500);
      this._parts(e.x,e.y,'#ff0000',30,100);this._parts(e.x,e.y,'#ff8800',20,80);
      // Burst de projéteis no enraivecimento
      const burstCol=e.biome==='ice'?'#88ddff':e.biome==='swamp'?'#44ff44':e.biome==='fire'?'#ff5500':'#cc44ff';
      for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2;this.projectiles.push({x:e.x,y:e.y,vx:Math.cos(a)*4.5,vy:Math.sin(a)*4.5,dmg:e.dmg*0.8,r:7,life:1200,col:burstCol});}
    }
  },

  _openMerchant(){
    this.running=false;
    const existing=document.getElementById('dng-merchant-overlay');if(existing)existing.remove();
    const self=this;
    const rarCol={common:'#aaaaaa',uncommon:'#22cc44',rare:'#4488ff',epic:'#cc44ff',legendary:'#ffcc00'};
    const rollOffers=()=>{
      const offers=[];
      for(let i=0;i<3;i++){
        const def=DNG_WPN_DEFS[Math.floor(Math.random()*DNG_WPN_DEFS.length)];
        const rar=rollDngRarity(self.floor);
        const wpn=makeDngWeapon(def.id,rar,self.floor);
        const price=Math.round(8+self.floor*4+(rar==='uncommon'?6:rar==='rare'?14:rar==='epic'?28:rar==='legendary'?55:0));
        offers.push({wpn,price,sold:false});
      }
      return offers;
    };
    let offers=rollOffers();
    const rerollCost=()=>5+Math.floor(self.floor*1.5);
    const el=document.createElement('div');el.id='dng-merchant-overlay';
    el.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:70;background:rgba(2,6,3,0.82);font-family:Courier New,monospace;padding:16px;box-sizing:border-box;';
    const panel=document.createElement('div');
    panel.style.cssText='background:linear-gradient(165deg,#061008,#04140a 55%,#030c06);border:1px solid rgba(40,200,90,0.55);border-radius:10px;padding:clamp(14px,4vw,26px) clamp(12px,5vw,30px);max-width:640px;width:100%;box-shadow:0 0 0 4px rgba(2,10,4,0.9),0 0 0 5px rgba(40,200,90,0.2),0 0 70px rgba(0,0,0,0.95),0 0 40px rgba(30,180,60,0.12);max-height:calc(100dvh - 20px);overflow-y:auto;box-sizing:border-box;';
    el.appendChild(panel);document.body.appendChild(el);
    const render=()=>{
      const cards=offers.map((o,i)=>{
        const rc=rarCol[o.wpn.rarity];
        return `
        <div id="dng-merch-card-${i}" style="position:relative;background:linear-gradient(170deg,rgba(10,22,12,0.97),rgba(5,12,8,0.98));border:1px solid ${rc}66;border-radius:8px;padding:16px 14px 12px;min-width:150px;flex:1;text-align:center;cursor:${o.sold?'default':'pointer'};transition:transform .14s, box-shadow .14s;${o.sold?'opacity:0.25;':''}">
          <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${rc},transparent);border-radius:8px 8px 0 0;"></div>
          <div style="width:58px;height:58px;border-radius:50%;margin:2px auto 8px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 36% 30%,rgba(255,255,255,0.12),rgba(0,0,0,0.55) 72%);border:2px solid ${rc};box-shadow:inset 0 0 10px rgba(0,0,0,0.6),0 0 14px -4px ${rc};">${gamePixelIconHtml(dngWeaponPixelKind(o.wpn),38)}</div>
          <div style="font-size:18px;font-weight:bold;color:#e8f2e0;letter-spacing:1px;">${o.wpn.name}</div>
          <div style="font-size:11px;color:${rc};margin:2px 0 8px;text-transform:uppercase;letter-spacing:2px;">${o.wpn.rarity}</div>
          <div style="display:flex;justify-content:center;gap:10px;font-size:14px;margin-bottom:10px;">
            <span class="pixel-inline" style="color:#ffb060;">${gamePixelIconHtml('sword',14)} ${o.wpn.dmg}</span>
            <span style="color:#7aa88a;">${o.wpn.tags?o.wpn.tags.join(' '):''}</span>
          </div>
          <button ${o.sold?'disabled':''} onclick="window._dngMerchBuy(${i})" style="width:100%;background:linear-gradient(180deg,rgba(40,120,60,0.35),rgba(15,50,25,0.5));border:1px solid ${self.pCoins>=o.price&&!o.sold?'#3fce6a':'#1d4a2a'};border-radius:5px;color:${self.pCoins>=o.price&&!o.sold?'#c8ffd8':'#3a6a48'};font-size:16px;padding:7px 10px;cursor:${o.sold?'default':'pointer'};font-family:Courier New,monospace;letter-spacing:1px;font-weight:bold;"><span class="pixel-btn-content">${gamePixelIconHtml(o.sold?'spark':'coin',15)} ${o.sold?'VENDIDO':o.price}</span></button>
        </div>`;
      }).join('');
      panel.innerHTML=`
        <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:2px;">
          <span style="filter:drop-shadow(0 0 10px rgba(40,220,90,0.6));">${gamePixelIconHtml('wizard',30)}</span>
          <span style="font-size:clamp(19px,6vw,26px);font-weight:900;letter-spacing:clamp(2px,1vw,6px);overflow-wrap:anywhere;background:linear-gradient(180deg,#d8ffdc,#3fae5a 60%,#0e5a28);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 14px rgba(40,200,80,0.35));">COMERCIANTE</span>
        </div>
        <div style="text-align:center;font-size:12px;color:#2f6a3e;letter-spacing:4px;margin-bottom:14px;text-transform:uppercase;">— ✦ mercadorias das profundezas ✦ —</div>
        <div style="display:flex;justify-content:center;margin-bottom:16px;">
          <span class="pixel-inline" style="background:rgba(4,16,8,0.9);border:1px solid rgba(200,168,75,0.45);border-radius:20px;padding:5px 18px;font-size:16px;color:#f0d080;">${gamePixelIconHtml('coin',16)} <b id="dng-merch-coins">${self.pCoins}</b> moedas</span>
        </div>
        <div style="display:flex;gap:12px;justify-content:center;margin-bottom:18px;flex-wrap:wrap;">${cards}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button id="dng-merch-reroll" style="flex:1;background:linear-gradient(135deg,rgba(20,60,30,0.9),rgba(8,30,14,0.95));border:2px solid rgba(60,200,100,${self.pCoins>=rerollCost()?0.7:0.25});border-radius:5px;padding:10px;cursor:${self.pCoins>=rerollCost()?'pointer':'not-allowed'};font-family:Courier New,monospace;font-size:15px;color:${self.pCoins>=rerollCost()?'#8ae8a8':'#2a5a38'};letter-spacing:2px;text-transform:uppercase;"><span class="pixel-btn-content">${gamePixelIconHtml('dice',16)} ATUALIZAR · ${gamePixelIconHtml('coin',14)}${rerollCost()}</span></button>
          <button id="dng-merch-close" style="flex:1;background:rgba(8,5,18,0.95);border:2px solid rgba(120,90,30,0.5);border-radius:5px;padding:10px;cursor:pointer;font-family:Courier New,monospace;font-size:15px;color:#c8a84b;letter-spacing:2px;text-transform:uppercase;"><span class="pixel-btn-content">${gamePixelIconHtml('cross',15)} FECHAR</span></button>
        </div>`;
      offers.forEach((o,i)=>{
        const card=document.getElementById('dng-merch-card-'+i);
        if(card&&!o.sold){
          card.onmouseenter=()=>{card.style.transform='translateY(-4px)';card.style.boxShadow=`0 8px 22px rgba(0,0,0,0.6),0 0 18px -4px ${rarCol[o.wpn.rarity]}`;};
          card.onmouseleave=()=>{card.style.transform='';card.style.boxShadow='';};
        }
      });
      document.getElementById('dng-merch-reroll').onclick=()=>{
        const rc2=rerollCost();
        if(self.pCoins<rc2)return;
        self.pCoins-=rc2; offers=rollOffers(); self._updateHUD(); render();
      };
      document.getElementById('dng-merch-close').onclick=()=>window._dngMerchClose();
    };
    window._dngMerchBuy=(i)=>{
      const o=offers[i];if(!o||o.sold)return;
      if(self.pCoins<o.price){self._msg('🪙 Moedas insuficientes!',1500);return;}
      self.pCoins-=o.price; o.sold=true;
      self._updateHUD();
      self._giveWeapon(o.wpn);
      self._ft(self.px,self.py-30,`${o.wpn.icon} COMPRADO!`,rarCol[o.wpn.rarity]);
      render();
    };
    window._dngMerchClose=()=>{
      el.remove();
      self.running=true;self.lastTs=0;
      if(self.raf)cancelAnimationFrame(self.raf);
      self.raf=requestAnimationFrame(ts=>self._loop(ts));
    };
    render();
  },
  _nextFloor(){
    this.floor++;this.pHp=Math.min(this.pMaxHp,this.pHp+Math.floor(this.pMaxHp*0.30)); // BALANCE: cura 30%
    this.pMaxHp+=8; this.pDmg=Math.floor(this.pDmg*1.08);
    // Biome transition every 5 floors
    const newBiome = getBiomeForFloor(this.floor);
    if(newBiome !== this._biome){
      this._biome = newBiome;
      this._msg(`${newBiome.icon} BIOMA: ${newBiome.name}`,3500);
    }
    this._necroClearFloor(true);this.generateMap(this.floor);this._updateHUD();
    this._msg(`✨ Piso ${this.floor} — ${this._biome.icon} ${this._biome.name}`,2400);
    if(this.floor%2===0)setTimeout(()=>this._openShop(),500);
  },
  _die(){
    this.running=false;
    this.pHp=0;
    this._updateHUD();
    // Particles burst
    this._parts(this.px,this.py,'#ff4444',20,80);
    this._parts(this.px,this.py,'#ff8800',15,60);
    // Render one last frame then show game over after brief delay
    setTimeout(()=>this._showGameOver(), 1200);
  },

  _showGameOver(){
    document.getElementById('dng-pause-overlay')?.remove();
    document.getElementById('dng-inv-overlay')?.remove();
    document.getElementById('dng-swap-overlay')?.remove();
    document.getElementById('dng-shop-overlay')?.remove();
    document.getElementById('dng-gameover-overlay')?.remove();

    const el=document.createElement('div');
    el.id='dng-gameover-overlay';
    el.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:70;font-family:Courier New,monospace;background:rgba(0,0,0,0);transition:background 0.8s;';
    document.body.appendChild(el);
    // Fade in background
    requestAnimationFrame(()=>{ el.style.background='rgba(0,0,0,0.88)'; });

    // Build equipped weapon summary
    const equip=this.inv[this.equippedIdx];
    const wpnLine=equip
      ? `<div class="pixel-inline" style="font-size:clamp(10px,1.6vw,12px);color:${DNG_RCOL[equip.rarity]};margin-bottom:6px;">${gamePixelIconHtml(gameItemPixelKind(equip.defId||equip.name),20)} ${equip.name} <span style="color:${DNG_RCOL[equip.rarity]};font-weight:bold;">${DNG_RNAME[equip.rarity].toUpperCase()}</span> · ${gamePixelIconHtml('sword',15)}${equip.dmg}</div>`
      : `<div style="font-size:17px;color:#5a4020;margin-bottom:6px;">Sem arma equipada</div>`;

    // Relic summary
    const relicKinds={vamp:'root',crit:'target',shield:'shield',speed:'boots',aoe:'orb',gold:'coin',regen:'heart',maxhp:'potion'};
    const relicIcons=[...this.ownedRelics].map(id=>{
      const r=DNG_RELICS.find(x=>x.id===id);return r?gamePixelIconHtml(relicKinds[id]||'ring',18):'';
    }).filter(Boolean).join(' ');

    const panel=document.createElement('div');
    panel.style.cssText='opacity:0;transform:scale(0.88) translateY(20px);transition:opacity 0.5s 0.3s, transform 0.5s 0.3s;background:linear-gradient(160deg,#08050e,#120810,#0a060e);border:2px solid rgba(180,30,30,0.7);border-radius:8px;padding:clamp(20px,4vw,36px) clamp(24px,5vw,44px);text-align:center;min-width:min(340px,90vw);max-width:min(480px,94vw);box-shadow:0 0 80px rgba(180,20,20,0.4),0 0 160px rgba(100,0,0,0.2);';
    panel.innerHTML=`
      <!-- Skull -->
      <div style="margin-bottom:8px;animation:dngSkullPulse 1.5s ease-in-out infinite;">${gamePixelIconHtml('skull',62,{W:'#f4e8e4',S:'#a72828'})}</div>

      <!-- Title -->
      <div style="font-size:clamp(20px,4vw,30px);font-weight:900;color:#cc2222;letter-spacing:clamp(4px,1vw,8px);text-transform:uppercase;text-shadow:0 0 30px rgba(220,30,30,0.8);margin-bottom:4px;">VOCÊ MORREU</div>
      <div style="font-size:clamp(8px,1.3vw,10px);color:#5a2020;letter-spacing:4px;text-transform:uppercase;margin-bottom:20px;">— A dungeon consumiu sua alma —</div>

      <!-- Divider -->
      <div style="width:100%;height:1px;background:linear-gradient(90deg,transparent,rgba(200,50,50,0.5),transparent);margin-bottom:16px;"></div>

      <!-- Stats grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:16px;text-align:left;">
        <div>
          <div style="font-size:clamp(7px,1.1vw,8px);color:#6a3020;letter-spacing:2px;text-transform:uppercase;">PISO ALCANÇADO</div>
          <div style="font-size:clamp(18px,3vw,24px);font-weight:bold;color:#f0d080;">${this.floor}</div>
        </div>
        <div>
          <div style="font-size:clamp(7px,1.1vw,8px);color:#6a3020;letter-spacing:2px;text-transform:uppercase;">INIMIGOS MORTOS</div>
          <div style="font-size:clamp(18px,3vw,24px);font-weight:bold;color:#ff6644;">${this.pKills}</div>
        </div>
        <div>
          <div style="font-size:clamp(7px,1.1vw,8px);color:#6a3020;letter-spacing:2px;text-transform:uppercase;">MOEDAS</div>
          <div class="pixel-inline" style="font-size:clamp(18px,3vw,24px);font-weight:bold;color:#c8a84b;">${gamePixelIconHtml('coin',26)} ${this.pCoins}</div>
        </div>
        <div>
          <div style="font-size:clamp(7px,1.1vw,8px);color:#6a3020;letter-spacing:2px;text-transform:uppercase;">HP MÁXIMO</div>
          <div style="font-size:clamp(18px,3vw,24px);font-weight:bold;color:#44cc66;">${this.pMaxHp}</div>
        </div>
      </div>

      <!-- Divider -->
      <div style="width:100%;height:1px;background:linear-gradient(90deg,transparent,rgba(200,50,50,0.3),transparent);margin-bottom:12px;"></div>

      <!-- Weapon + relics -->
      <div style="margin-bottom:14px;">
        ${wpnLine}
        ${relicIcons?`<div style="font-size:clamp(13px,2vw,16px);letter-spacing:4px;margin-top:4px;">${relicIcons}</div>`:''}
        ${this.inv.length>0?`<div class="pixel-inline" style="font-size:clamp(8px,1.3vw,10px);color:#4a3020;margin-top:6px;">${this.inv.map(w=>gamePixelIconHtml(gameItemPixelKind(w.defId||w.name),16)).join(' ')} no inventário</div>`:''}
      </div>

      <!-- Buttons -->
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button id="dng-go-retry" style="background:linear-gradient(135deg,rgba(80,15,15,0.98),rgba(50,8,8,0.98));border:2px solid rgba(200,50,50,0.8);border-radius:4px;padding:clamp(10px,1.8vw,13px);cursor:pointer;font-family:Courier New,monospace;font-size:clamp(11px,1.8vw,14px);color:#ff6644;letter-spacing:3px;text-transform:uppercase;transition:all .2s;"><span class="pixel-btn-content">${gamePixelIconHtml('sword',20)} TENTAR NOVAMENTE</span></button>
        <button id="dng-go-menu" style="background:rgba(12,8,20,0.98);border:1px solid rgba(80,50,20,0.5);border-radius:4px;padding:clamp(8px,1.5vw,11px);cursor:pointer;font-family:Courier New,monospace;font-size:clamp(10px,1.5vw,12px);color:#7a6030;letter-spacing:2px;text-transform:uppercase;transition:all .2s;">MENU PRINCIPAL</button>
      </div>
    `;
    el.appendChild(panel);

    // Add CSS animation for skull
    if(!document.getElementById('dng-go-style')){
      const s=document.createElement('style');s.id='dng-go-style';
      s.textContent='@keyframes dngSkullPulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 8px rgba(220,30,30,0.5))}50%{transform:scale(1.08);filter:drop-shadow(0 0 20px rgba(255,50,50,0.9))}}';
      document.head.appendChild(s);
    }

    // Animate in
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      panel.style.opacity='1';panel.style.transform='scale(1) translateY(0)';
    }));

    // Button events
    document.getElementById('dng-go-retry').onmouseenter=function(){this.style.borderColor='#ff4444';this.style.color='#ff8866';this.style.boxShadow='0 0 20px rgba(220,50,50,0.3)';};
    document.getElementById('dng-go-retry').onmouseleave=function(){this.style.borderColor='rgba(200,50,50,0.8)';this.style.color='#ff6644';this.style.boxShadow='';};
    document.getElementById('dng-go-retry').onclick=()=>{
      el.style.opacity='0';el.style.transition='opacity 0.3s';
      setTimeout(()=>{el.remove();startDungeonMode();},300);
    };
    document.getElementById('dng-go-menu').onmouseenter=function(){this.style.borderColor='rgba(200,168,75,0.5)';this.style.color='#c8a84b';};
    document.getElementById('dng-go-menu').onmouseleave=function(){this.style.borderColor='rgba(80,50,20,0.5)';this.style.color='#7a6030';};
    document.getElementById('dng-go-menu').onclick=()=>{
      el.remove();this.stop();showScreen('main-menu');
    };
  },

  _render(ts){
    ctx.save();
    if(this._shake.t>0) ctx.translate(this._shake.x,this._shake.y);
    ctx.fillStyle='#08060f';ctx.fillRect(-8,-8,W+16,H+16);
    const tx0=Math.floor(this.camX/DTS)-1,ty0=Math.floor(this.camY/DTS)-1;
    const txN=tx0+Math.ceil(W/DTS)+3,tyN=ty0+Math.ceil(H/DTS)+3;
    for(let ty=ty0;ty<tyN;ty++){for(let tx=tx0;tx<txN;tx++){
      if(tx<0||tx>=MW||ty<0||ty>=MH||!this.explored[ty*MW+tx])continue;
      const t2=this._ta(tx,ty);if(t2===T_VOID)continue;
      const sx=Math.floor(tx*DTS-this.camX),sy=Math.floor(ty*DTS-this.camY);
      const dist=Math.hypot(tx*DTS+DTS/2-this.px,ty*DTS+DTS/2-this.py);
      let lf=Math.max(0,Math.min(1,1-(dist/(185+this.torchFlicker*20))));
      for(let ety=ty-3;ety<=ty+3;ety++)for(let etx=tx-3;etx<=tx+3;etx++){
        if(etx<0||etx>=MW||ety<0||ety>=MH)continue;
        if(this._ta(etx,ety)===T_TORCH&&this.explored[ety*MW+etx]){lf=Math.min(1,lf+Math.max(0,1-Math.hypot(etx-tx,ety-ty)/3)*0.6*this.torchFlicker);}
      }
      if(lf<0.04)lf=0.04;
      drawDngTile(ctx,t2,sx,sy,tx,ty,lf,this.torchFlicker,ts,this._biome);
    }}
    // ── Ambient overlay por bioma ──
    const _bm = this._biome;
    if(_bm && _bm.ambientColor){
      ctx.save();ctx.globalAlpha=0.10;ctx.fillStyle=_bm.ambientColor;ctx.fillRect(0,0,W,H);ctx.restore();
    }
    if(_bm===BIOMES.ice){
      ctx.save();ctx.globalAlpha=0.4;ctx.fillStyle='rgba(200,230,255,0.85)';
      for(let _i=0;_i<25;_i++){const _sx=((_i*137+ts*0.02*(1+_i%3*0.3))%(W+20))-10,_sy=((_i*89+ts*0.016*(0.8+_i%4*0.2))%(H+20))-10;ctx.fillRect(Math.round(_sx),Math.round(_sy),_i%5===0?2:1,1);}
      ctx.restore();
    }
    if(_bm===BIOMES.swamp){
      for(let _fi=0;_fi<3;_fi++){const _fx=((ts*0.011*(1+_fi*0.3)+_fi*180)%(W+200))-100;ctx.save();ctx.globalAlpha=0.07+_fi*0.016;const _fg=ctx.createRadialGradient(_fx,H*0.65,0,_fx,H*0.65,110);_fg.addColorStop(0,'rgba(30,160,20,0.5)');_fg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=_fg;ctx.fillRect(_fx-110,H*0.4,220,200);ctx.restore();}
    }
    if(_bm===BIOMES.fire){
      ctx.save();ctx.globalAlpha=0.55;
      for(let _ei=0;_ei<18;_ei++){const _ex=((ts*0.023*(1+_ei%3*0.2)+_ei*173)%(W+20))-10,_ey=H*0.95-((_ei*97+ts*0.019*(0.6+_ei%5*0.15))%(H*0.9));ctx.fillStyle=_ei%2?'rgba(255,90,0,0.8)':'rgba(255,200,40,0.65)';ctx.fillRect(Math.round(_ex),Math.round(_ey),_ei%3===0?2:1,_ei%3===0?3:2);}
      ctx.restore();
    }
    for(const p of this.projectiles){
      const sx=p.x-this.camX,sy=p.y-this.camY;
      if(!isFinite(sx)||!isFinite(sy)||!isFinite(p.r)||p.r<=0) continue;
      const pg=ctx.createRadialGradient(sx,sy,0,sx,sy,p.r*2.5);pg.addColorStop(0,p.col+'cc');pg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=pg;ctx.beginPath();ctx.arc(sx,sy,p.r*2.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(sx,sy,p.r,0,Math.PI*2);ctx.fill();
      if(p._rangedWpn&&p.secondaryCol){ctx.fillStyle=p.secondaryCol;ctx.beginPath();ctx.arc(sx,sy,Math.max(1,p.r*0.42),0,Math.PI*2);ctx.fill();}
    }
    // ── Renderizar nuvem de veneno dos bosses de pântano ──
    for(const e of this.entities){
      if(e.dead||!e._poisonCloud) continue;
      for(const c of e._poisonCloud){
        const cx=c.x-this.camX, cy=c.y-this.camY;
        const alpha=(c.life/4000)*0.28;
        ctx.save(); ctx.globalAlpha=alpha;
        const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,c.r);
        cg.addColorStop(0,'rgba(40,220,30,0.9)'); cg.addColorStop(1,'rgba(10,80,5,0)');
        ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,c.r,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=alpha*0.5; ctx.strokeStyle='#22ff22'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(cx,cy,c.r*0.6,0,Math.PI*2); ctx.stroke();
        ctx.restore();
      }
    }
    this._drawResNodes(ctx); this._drawDrops(ctx);
    [...this.entities].filter(e=>!e.dead||e._shadowBound).sort((a,b)=>a.y-b.y).forEach(e=>{
      const esx=Math.floor(e.x-this.camX),esy=Math.floor(e.y-this.camY);
      if(esx<-60||esx>W+60||esy<-60||esy>H+60)return;
      const dist=Math.hypot(e.x-this.px,e.y-this.py);
      const lf=Math.max(0,Math.min(1,1-dist/220))*this.torchFlicker;if(lf<0.04&&!e._shadowBound)return;
      ctx.save();

      // ── Shadow-bound state ──
      if(e._shadowBound){
        const pulse=0.5+0.5*Math.sin(ts*0.008);
        const sbr = (e.r||20)*(e.sc||1)*2.5;
        if(isFinite(esx)&&isFinite(esy)&&isFinite(sbr)&&sbr>0){
        // Dark purple haze
        const sg=ctx.createRadialGradient(esx,esy,0,esx,esy,sbr);
        sg.addColorStop(0,'rgba(100,0,200,0.55)');sg.addColorStop(0.5,'rgba(60,0,140,0.3)');sg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=sg;ctx.beginPath();ctx.arc(esx,esy,sbr,0,Math.PI*2);ctx.fill();
        }
        // Pulsing ring
        ctx.globalAlpha=(0.4+0.4*pulse);
        ctx.strokeStyle='#8800ff';ctx.lineWidth=3;
        ctx.beginPath();ctx.arc(esx,esy,(e.r||20)*(e.sc||1)+10+pulse*8,0,Math.PI*2);ctx.stroke();
        // Dim sprite
        ctx.globalAlpha=0.4*(0.6+0.4*pulse);
        const spr2=e.sprFn(),fi2=e.frameIdx||0,sprArr2=spr2[fi2%spr2.length]||spr2[0];
        const shadowPal2={};for(const k in e.palFn())shadowPal2[k]='#6600cc';
        drawSpriteAt(sprArr2,shadowPal2,esx,esy+e.r,e.dir==='right',e.sc);
        ctx.restore();
        // "ESPAÇO" extraction hint
        if(dist<80){
          ctx.save();ctx.font='bold 8px Courier New';ctx.fillStyle='#cc88ff';ctx.textAlign='center';
          ctx.globalAlpha=0.7+0.3*pulse;
          ctx.fillText('👤 [ESPAÇO] EXTRAIR',esx,esy-(e.r||20)*(e.sc||1)-28);ctx.textAlign='left';ctx.restore();
        }
        return;
      }

      ctx.globalAlpha=0.12+lf*0.88;
      ctx.fillStyle='rgba(0,0,0,0.25)';ctx.beginPath();ctx.ellipse(esx,esy+e.r*0.75,e.r*1.1,e.r*0.35,0,0,Math.PI*2);ctx.fill();
      const spr=e.sprFn(),fi=e.frameIdx||0,sprArr=spr[fi%spr.length]||spr[0];
      if(e.flash>0){const wp={};for(const k in e.palFn())wp[k]='#ffffff';drawSpriteAt(sprArr,wp,esx,esy+e.r,e.dir==='right',e.sc);}
      // ── Aura visual melhorada por bioma ──
      if(e.type==='boss'){
        const brar=e.bossRar||BOSS_RARITY_TABLE[0];
        const pulse=0.6+0.4*Math.sin(ts*0.005+Math.PI);
        const pulse2=0.5+0.5*Math.sin(ts*0.008);
        const auraR=(e.r||20)*(e.sc||1);
        // Aura de raridade base
        if(brar.id!=='common'){
          const rc=brar.color;
          const rr=auraR*2.4;
          if(isFinite(rr)&&rr>0){
            ctx.save(); ctx.globalAlpha=0.20*pulse;
            const rg=ctx.createRadialGradient(esx,esy,0,esx,esy,rr);
            rg.addColorStop(0,rc+'aa');rg.addColorStop(1,'rgba(0,0,0,0)');
            ctx.fillStyle=rg;ctx.beginPath();ctx.arc(esx,esy,rr,0,Math.PI*2);ctx.fill();
            ctx.restore();
          }
        }
        // Aura bioma-específica
        const bm=e.biome||'dungeon';
        const biomeAuraCol = e._hyper?['#ff9a20','#ff5500'] : bm==='ice'?['#88ddff','#4499cc'] : bm==='swamp'?['#44ff44','#228822'] : bm==='fire'?['#ff6600','#ff2200'] : ['#cc44ff','#8800cc'];
        const biomeGlowR=auraR*3.2;
        if(isFinite(biomeGlowR)&&biomeGlowR>0){
          ctx.save(); ctx.globalAlpha=0.14*(0.7+0.3*pulse2);
          const bg=ctx.createRadialGradient(esx,esy,auraR*0.4,esx,esy,biomeGlowR);
          bg.addColorStop(0,biomeAuraCol[0]+'66'); bg.addColorStop(0.5,biomeAuraCol[1]+'33'); bg.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(esx,esy,biomeGlowR,0,Math.PI*2); ctx.fill();
          ctx.restore();
        }
        // Anel pulsante bioma
        ctx.save(); ctx.globalAlpha=0.55*pulse;
        ctx.strokeStyle=biomeAuraCol[0]; ctx.lineWidth=2.5+pulse2*1.5;
        ctx.beginPath(); ctx.arc(esx,esy,auraR+8+pulse2*6,0,Math.PI*2); ctx.stroke();
        // Segundo anel mais suave
        ctx.globalAlpha=0.25*pulse2; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(esx,esy,auraR+16+pulse*8,0,Math.PI*2); ctx.stroke();
        ctx.restore();
        // Partículas orbitais (pontos girando ao redor)
        const orbCount = bm==='ice'?6 : bm==='swamp'?4 : bm==='fire'?8 : 5;
        ctx.save(); ctx.globalAlpha=0.75;
        for(let oi=0;oi<orbCount;oi++){
          const oa=(oi/orbCount)*Math.PI*2 + ts*0.002*(bm==='fire'?1.6:1.0);
          const or=auraR+12;
          const ox2=esx+Math.cos(oa)*or, oy2=esy+Math.sin(oa)*or*0.6;
          const orbSize = bm==='ice'?2.5 : bm==='fire'?3.5 : 2;
          ctx.fillStyle=biomeAuraCol[0];
          ctx.beginPath(); ctx.arc(ox2,oy2,orbSize,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
        // Fase 2 — chamas/efeitos intensificados
        if(e._phase2){
          ctx.save(); ctx.globalAlpha=0.35*pulse;
          ctx.strokeStyle=bm==='ice'?'#ffffff':bm==='swamp'?'#00ff44':bm==='fire'?'#ffcc00':'#ff44ff';
          ctx.lineWidth=3; ctx.setLineDash([6,4]);
          ctx.beginPath(); ctx.arc(esx,esy,auraR+22+pulse2*10,0,Math.PI*2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
          // "FASE 2" label
          ctx.save(); ctx.font='bold 7px Courier New'; ctx.textAlign='center';
          ctx.fillStyle=bm==='ice'?'#88ddff':bm==='fire'?'#ff6600':'#ff4444';
          ctx.globalAlpha=0.8+0.2*pulse;
          ctx.fillText('⚠ FASE 2',esx,esy-auraR-28); ctx.textAlign='left';
          ctx.restore();
        }
      } else if(e.bossRar&&e.bossRar.id!=='common'){
        // Aura de raridade para inimigos normais com raridade
        const rc=e.bossRar.color;
        const rr=(e.r||20)*(e.sc||1)*2.2;
        if(isFinite(esx)&&isFinite(esy)&&isFinite(rr)&&rr>0){
          ctx.globalAlpha=0.18*(0.7+0.3*Math.sin(ts*0.006));
          const rg=ctx.createRadialGradient(esx,esy,0,esx,esy,rr);
          rg.addColorStop(0,rc+'88');rg.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=rg;ctx.beginPath();ctx.arc(esx,esy,rr,0,Math.PI*2);ctx.fill();
        }
      }
      ctx.globalAlpha=0.12+lf*0.88;
      drawSpriteAt(sprArr,e.palFn(),esx,esy+e.r,e.dir==='right',e.sc);
      ctx.restore();
      if(lf>0.15){
        drawHPBar(esx,esy-e.r*e.sc-14,e.hp/e.maxHp,Math.round(30*e.sc));
        if(e.type==='boss'){
          const brar2=e.bossRar||BOSS_RARITY_TABLE[0];
          const bm2=e.biome||'dungeon';
          const biomeIcon2=bm2==='ice'?'❄️':bm2==='swamp'?'☠️':bm2==='fire'?'🔥':'💀';
          ctx.font='bold 7px Courier New';ctx.textAlign='center';
          ctx.fillStyle=brar2.color;
          ctx.fillText(`${biomeIcon2} ${brar2.name.toUpperCase()} ${e.name.toUpperCase()}`,esx,esy-e.r*e.sc-22);
          if(e._phase2){
            ctx.fillStyle='#ff4444'; ctx.font='bold 6px Courier New';
            ctx.fillText('⚠ FASE 2',esx,esy-e.r*e.sc-32);
          }
          ctx.textAlign='left';
        }
      }
      if(e.type==='boss'&&e.hp<e.maxHp*0.5&&lf>0.2){
        const bc=e.bossRar?e.bossRar.color:'#ff2200';
        ctx.save();ctx.globalAlpha=0.4+0.2*Math.sin(ts*0.006);ctx.strokeStyle=bc;ctx.lineWidth=2;ctx.beginPath();ctx.arc(esx,esy,e.r*e.sc+8,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
    });
    // ── Draw shadow allies ──
    for(const s of shadowAllies){ if(!s.dead && s.draw) s.draw(ctx, this.camX, this.camY, ts); }
    this._drawNecro(ctx,ts);
    // ── Per-weapon unique swing animations ──
    for(const sw of this.meleeSwings){
      const pr=1-(sw.life/sw.max);
      const cxs=sw.x-this.camX, cys=sw.y-this.camY;
      const sweep=Math.PI*1.05, R=46+pr*10;
      const a0=sw.ang-sweep/2+pr*sweep*0.7, a1=a0+sweep*0.45;
      ctx.save(); ctx.globalAlpha=Math.max(0,1-pr*1.15);
      // rastro em camadas (cauda -> ponta)
      ctx.lineCap='round';
      const swingColor=sw.col||'#96beff',swingAccent=sw.secondaryCol||'#ffffff';
      ctx.globalAlpha=Math.max(0,1-pr*1.15)*0.22;ctx.strokeStyle=swingColor; ctx.lineWidth=17*(1-pr*0.5);
      ctx.beginPath(); ctx.arc(cxs,cys,R,a0,a1); ctx.stroke();
      ctx.globalAlpha=Math.max(0,1-pr*1.15)*0.65;ctx.strokeStyle=swingColor; ctx.lineWidth=9*(1-pr*0.5);
      ctx.beginPath(); ctx.arc(cxs,cys,R,a0+sweep*0.08,a1); ctx.stroke();
      ctx.globalAlpha=Math.max(0,1-pr*1.15);ctx.strokeStyle=swingAccent; ctx.lineWidth=3.2*(1-pr*0.4);
      ctx.shadowBlur=14; ctx.shadowColor=swingColor;
      ctx.beginPath(); ctx.arc(cxs,cys,R,a0+sweep*0.2,a1); ctx.stroke();
      ctx.shadowBlur=0;
      // fagulha na ponta
      const tipA=a1, tx2=cxs+Math.cos(tipA)*R, ty2=cys+Math.sin(tipA)*R;
      ctx.fillStyle=swingAccent; ctx.fillRect(tx2-1.6,ty2-1.6,3.2,3.2);
      ctx.restore();
    }
    // ── Player — paleta muda por arma, frames de ataque ──
    const psx=Math.floor(this.px-this.camX),psy=Math.floor(this.py-this.camY);

    // ── Dash after-images ──
    if(typeof _dngDashAfterImages!=='undefined'){
      for(const ai of _dngDashAfterImages){
        const aisx=Math.floor(ai.x-this.camX), aisy=Math.floor(ai.y-this.camY);
        ctx.save(); ctx.globalAlpha=ai.alpha*0.7;
        const classId=this.pClassId||(typeof selectedClass!=='undefined'?selectedClass.p1:'mage');
        const aiVisual=getHeroVisual(classId,'down',0);
        const aiPal={}; for(const k in aiVisual.pal) aiPal[k]='#4466ff';
        drawSpriteAt(aiVisual.sprite,aiPal,aisx,aisy+14,false,1);
        ctx.restore();
      }
    }

    if(!(this.pInvTimer>0&&Math.floor(this.pInvTimer/80)%2===0)){
      ctx.fillStyle='rgba(0,0,0,0.25)';ctx.beginPath();ctx.ellipse(psx,psy+14,16,5,0,0,Math.PI*2);ctx.fill();

      const equip=this.inv[this.equippedIdx];
      const classId=this.pClassId||(typeof selectedClass!=='undefined'?selectedClass.p1:'mage');
      // O Necromante sem equipamento usa a paleta espectral da propria classe.
      // O fallback antigo devolvia PAL_WIZARD e o deixava roxo na Masmorra.
      const heroPal=classId==='necromancer'&&!equip?null:getDngHeroPal(equip?equip.defId:null);

      // Determine sprite direction set
      let direction='down',flipX=false;
      if(this.pDir==='up')direction='up';
      else if(this.pDir==='left')direction='side';
      else if(this.pDir==='right'){direction='side';flipX=true;}

      // Determine frame: attack animation uses cast frames (3,4), walk uses 0-2
      let frameIdx, heroState='idle', heroArg=0;
      if(this.pAttackAnim>0){
        const animProg=this.pAttackAnim/this.pAttackAnimMax;
        frameIdx=animProg>0.5?3:4; // cast1 then cast2
        heroState='atk'; heroArg=1-animProg;   // 0..1 = inicio -> fim do golpe
      } else {
        frameIdx=Math.min(this.pFrameIdx,2);
        if(this.pFrameIdx>0||this._pMoving) heroState='walk';
      }
      const heroVisual=getHeroVisual(classId,direction,frameIdx,heroPal,null,heroState,heroArg);
      if(!drawHeroVisual(heroVisual,psx,psy+14,flipX))
        drawSpriteAt(heroVisual.sprite,heroVisual.pal,psx,psy+14,flipX,1);
      if(this.pAttackAnim>0&&typeof drawHeroSkinAttackEffect==='function'){
        const skinAttackProgress=1-this.pAttackAnim/this.pAttackAnimMax;
        drawHeroSkinAttackEffect(ctx,psx,psy,{progress:skinAttackProgress,direction:this.pDir,scale:1});
      }

      // Draw weapon overlay — preso na mão do personagem
      if(equip){
        const wAngle=this.pFacing;
        // Offset da mão baseado na direção do sprite (pixels ajustados por direção)
        const handOffsets={
          down:  {ox: 7, oy: 2},
          up:    {ox: 6, oy:-4},
          left:  {ox:-8, oy: 0},
          right: {ox: 8, oy: 0},
        };
        const ho=handOffsets[this.pDir]||handOffsets.down;
        // Rotação da arma: aponta para o ângulo de mira mas parte da mão
        const hx=Math.round(psx+ho.ox);
        const hy=Math.round(psy+ho.oy+2);
        ctx.save();
        ctx.translate(hx,hy);
        // A rotação fica entre a direção do sprite e o ângulo de mira
        // para não parecer "solta" — limitamos o giro ao eixo de ataque
        const baseAngle={down:Math.PI*0.5,up:-Math.PI*0.5,left:Math.PI,right:0}[this.pDir]||0;
        const swingBlend=this.pAttackAnim>0?this.pAttackAnim/this.pAttackAnimMax:0;
        const finalAngle=baseAngle*(1-swingBlend*0.5)+wAngle*swingBlend*0.5;
        ctx.rotate(finalAngle+Math.PI/4);
        // Weapon icon in small font above hand, colour-tinted
        const wc=DNG_RCOL[equip.rarity];
        // Draw weapon glow
        const wg=ctx.createRadialGradient(0,0,0,0,0,12);
        wg.addColorStop(0,wc+'55');wg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=wg;ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();
        // Weapon shape pixel-style
        ctx.fillStyle=equip.color||'#c8d8ff';
        switch(equip.defId){
          case 'sword':
            ctx.fillRect(-1,-10,2,18);ctx.fillRect(-5,-8,10,2); // blade+guard
            ctx.fillStyle=DNG_RCOL[equip.rarity];ctx.fillRect(-1,-12,2,4); // tip
            break;
          case 'bow':
            ctx.strokeStyle=equip.color||'#88cc44';ctx.lineWidth=1.5;
            ctx.beginPath();ctx.arc(0,0,10,Math.PI*0.3,Math.PI*1.7);ctx.stroke();
            ctx.strokeStyle='#cc9933';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(0,10);ctx.stroke();
            break;
          case 'axe':
            ctx.fillRect(-2,-10,4,18);
            ctx.fillRect(-8,-10,16,7);ctx.fillRect(-6,-13,12,5);
            break;
          case 'dagger':
            ctx.fillRect(-1,-8,2,14);ctx.fillRect(-4,-6,8,2);
            break;
          case 'staff':
            ctx.fillStyle='#986030';ctx.fillRect(-1,-12,2,22);
            const sg2=ctx.createRadialGradient(0,-12,0,0,-12,7);sg2.addColorStop(0,wc+'ee');sg2.addColorStop(1,'rgba(0,0,0,0)');
            ctx.fillStyle=sg2;ctx.beginPath();ctx.arc(0,-12,7,0,Math.PI*2);ctx.fill();
            ctx.fillStyle=wc;ctx.beginPath();ctx.arc(0,-12,3.5,0,Math.PI*2);ctx.fill();
            break;
          case 'hammer':
            ctx.fillStyle='#986030';ctx.fillRect(-1,-12,2,16);
            ctx.fillStyle=equip.color||'#ffcc44';ctx.fillRect(-6,-13,12,7);
            break;
        }
        ctx.restore();
        // Rarity + weapon-specific glow on attack
        if(this.pAttackAnim>0){
          const ap=this.pAttackAnim/this.pAttackAnimMax;
          const wId2=equip.defId;
          // Weapon-specific attack flash color
          const skinAttack=typeof getHeroSkinAttackColors==='function'?getHeroSkinAttackColors():null;
          const flashCol = skinAttack?.primary||(wId2==='axe'?'#ff8800':wId2==='bow'?'#88ff44':wId2==='staff'?'#cc44ff':wId2==='hammer'?'#ff6600':wc);
          // Glow bubble
          ctx.save();
          ctx.globalAlpha=ap*0.5;
          ctx.shadowBlur=20; ctx.shadowColor=flashCol;
          const ag=ctx.createRadialGradient(hx,hy,0,hx,hy,32*ap);
          ag.addColorStop(0,flashCol+'88');ag.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle=ag;ctx.beginPath();ctx.arc(hx,hy,32*ap,0,Math.PI*2);ctx.fill();
          ctx.shadowBlur=0;
          // Axe: dust puff
          if(wId2==='axe'&&ap<0.4){
            for(let i=0;i<3;i++){
              const da=this.pFacing+(-0.5+i*0.5);
              ctx.globalAlpha=ap*0.4;
              ctx.fillStyle='rgba(200,160,80,0.5)';
              ctx.beginPath(); ctx.arc(hx+Math.cos(da)*22,hy+Math.sin(da)*22,5+i*2,0,Math.PI*2); ctx.fill();
            }
          }
          // Staff: orbiting rune
          if(wId2==='staff'){
            const rAngle=ts*0.015;
            ctx.globalAlpha=ap*0.8;
            ctx.fillStyle=wc; ctx.font='bold 10px serif'; ctx.textAlign='center';
            ctx.fillText('✦',hx+Math.cos(rAngle)*22,hy+Math.sin(rAngle)*22);
            ctx.textAlign='left';
          }
          ctx.restore();
        }
      }
    }
    if(this._webTimer>0){
      ctx.save();ctx.globalAlpha=0.35*(this._webTimer/2200);ctx.strokeStyle='#aaa860';ctx.lineWidth=2;
      for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2;ctx.beginPath();ctx.moveTo(psx,psy);ctx.lineTo(psx+Math.cos(a)*22,psy+Math.sin(a)*22);ctx.stroke();}
      ctx.restore();
    }
    const dashPct=typeof _dngDashCd==='undefined'||_dngDashCd<=0
      ?1
      :Math.max(0,1-_dngDashCd/_dngDashMaxCd);
    if(typeof drawDashCooldownBar==='function') drawDashCooldownBar(psx,psy-43,dashPct,44);
    drawHPBar(psx,psy-36,this.pHp/this.pMaxHp,44);
    if(this._shActive){ctx.save();ctx.globalAlpha=0.5+0.2*Math.sin(ts*0.008);ctx.strokeStyle='#88aaff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(psx,psy,22,0,Math.PI*2);ctx.stroke();ctx.restore();}
    for(const p of this.particles){ctx.globalAlpha=(p.life/650)*0.88;ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x-this.camX,p.y-this.camY,p.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;

    // ── Projectile trails ──
    for(const t of this._projTrails){
      const a=t.life/180;ctx.globalAlpha=a*0.55;
      ctx.fillStyle=t.col;ctx.beginPath();ctx.arc(t.x-this.camX,t.y-this.camY,t.r,0,Math.PI*2);ctx.fill();
    }ctx.globalAlpha=1;

    // ── Blood / impact particles ──
    for(const b of this._bloodParts){
      const a=b.life/b.maxLife;
      if(b.ring){
        // Impact ring that expands and fades
        const prog=1-a;
        ctx.save();ctx.globalAlpha=a*0.7;
        ctx.strokeStyle=b.col;ctx.lineWidth=2+prog*3;
        ctx.beginPath();ctx.arc(b.x-this.camX,b.y-this.camY,b.r*prog,0,Math.PI*2);ctx.stroke();
        ctx.restore();
      } else {
        ctx.globalAlpha=Math.min(1,a+0.1)*0.85;
        ctx.fillStyle=b.col;
        ctx.beginPath();ctx.arc(b.x-this.camX,b.y-this.camY,b.r,0,Math.PI*2);ctx.fill();
      }
    }ctx.globalAlpha=1;

    ctx.font='bold 13px Courier New';ctx.textAlign='center';
    for(const f of this.floatingTexts){ctx.globalAlpha=Math.min(1,f.life/400);ctx.fillStyle=f.col;ctx.fillText(f.txt,f.x-this.camX,f.y-this.camY);}
    ctx.globalAlpha=1;ctx.textAlign='left';
    // (barra do boss desenhada APÓS a fog — ver bloco adiante — para não ficar escurecida)
    // ── MINIMAPA — variáveis calculadas aqui, desenho feito APÓS fog overlay ──
    const mm={x:W-126,y:60,w:116,h:116}; // coluna compacta: moeda (topo) → mapa → abates (base)
    const sc2=mm.w/(MW*0.55),ox=mm.x+mm.w/2-(this.px/DTS)*sc2,oy=mm.y+mm.h/2-(this.py/DTS)*sc2;

    const tmpCv=document.createElement('canvas');tmpCv.width=W;tmpCv.height=H;
    const tc=tmpCv.getContext('2d');tc.fillStyle='rgba(0,0,0,0.86)';tc.fillRect(0,0,W,H);
    tc.globalCompositeOperation='destination-out';
    const plg=tc.createRadialGradient(psx,psy,8,psx,psy,150+this.torchFlicker*18);
    plg.addColorStop(0,'rgba(0,0,0,1)');plg.addColorStop(0.6,'rgba(0,0,0,0.85)');plg.addColorStop(1,'rgba(0,0,0,0)');
    tc.fillStyle=plg;tc.fillRect(0,0,W,H);
    for(let ty=ty0;ty<tyN;ty++)for(let tx=tx0;tx<txN;tx++){
      if(tx<0||tx>=MW||ty<0||ty>=MH)continue;
      if(this._ta(tx,ty)===T_TORCH&&this.explored[ty*MW+tx]){
        const tsx2=tx*DTS-this.camX+DTS/2,tsy2=ty*DTS-this.camY+DTS/2;
        const tlg=tc.createRadialGradient(tsx2,tsy2,4,tsx2,tsy2,80*this.torchFlicker);
        tlg.addColorStop(0,'rgba(0,0,0,0.88)');tlg.addColorStop(0.5,'rgba(0,0,0,0.6)');tlg.addColorStop(1,'rgba(0,0,0,0)');
        tc.fillStyle=tlg;tc.fillRect(0,0,W,H);
      }
    }
    ctx.drawImage(tmpCv,0,0);
    const vg=ctx.createRadialGradient(W/2,H/2,H*0.28,W/2,H/2,H*0.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.5)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
    this._drawBosqueRes(ctx); this._drawMissionMarker(ctx); this._drawNotes(ctx);

    // ══════════════════════════════════════════════════════
    // ── MINIMAPA — desenhado APÓS fog overlay para ficar visível ──
    // ══════════════════════════════════════════════════════
    {
      // Background panel
      ctx.save();
      ctx.shadowBlur=16; ctx.shadowColor='rgba(60,200,110,0.45)';
      ctx.fillStyle='rgba(2,8,4,0.97)';
      ctx.beginPath();if(ctx.roundRect)ctx.roundRect(mm.x-5,mm.y-19,mm.w+10,mm.h+54,7);else ctx.rect(mm.x-5,mm.y-19,mm.w+10,mm.h+54);ctx.fill();
      ctx.shadowBlur=0;
      // Faixa de título esmeralda
      const mmTbG=ctx.createLinearGradient(mm.x-5,mm.y-19,mm.x+mm.w+5,mm.y-19);
      mmTbG.addColorStop(0,'rgba(8,40,20,0.98)');mmTbG.addColorStop(0.5,'rgba(18,80,40,0.98)');mmTbG.addColorStop(1,'rgba(8,40,20,0.98)');
      ctx.fillStyle=mmTbG;
      ctx.beginPath();if(ctx.roundRect)ctx.roundRect(mm.x-5,mm.y-19,mm.w+10,16,{topLeft:7,topRight:7});else ctx.rect(mm.x-5,mm.y-19,mm.w+10,16);ctx.fill();
      // Moldura dupla (esmeralda + ouro interno)
      ctx.strokeStyle='rgba(80,220,130,0.85)';ctx.lineWidth=1.6;
      ctx.beginPath();if(ctx.roundRect)ctx.roundRect(mm.x-5,mm.y-19,mm.w+10,mm.h+54,7);else ctx.rect(mm.x-5,mm.y-19,mm.w+10,mm.h+54);ctx.stroke();
      ctx.strokeStyle='rgba(200,168,75,0.35)';ctx.lineWidth=1;
      ctx.beginPath();if(ctx.roundRect)ctx.roundRect(mm.x-2.5,mm.y-16.5,mm.w+5,mm.h+49,5);else ctx.rect(mm.x-2.5,mm.y-16.5,mm.w+5,mm.h+49);ctx.stroke();
      // cantos ✦
      ctx.font='7px Courier New';ctx.fillStyle='rgba(200,168,75,0.7)';ctx.textAlign='left';
      ctx.fillText('✦',mm.x-2,mm.y+mm.h+31);ctx.textAlign='right';ctx.fillText('✦',mm.x+mm.w+2,mm.y-9);
      ctx.restore();
      // Título maior
      ctx.font='bold 9px Courier New';ctx.fillStyle='#a8f0be';ctx.textAlign='center';
      ctx.fillText('◈ MAPA · M ◈',mm.x+mm.w/2,mm.y-7);

      // Clip to minimap area
      ctx.save();ctx.beginPath();ctx.rect(mm.x,mm.y,mm.w,mm.h);ctx.clip();

      // ── Tile grid ──
      for(let mty=0;mty<MH;mty++)for(let mtx=0;mtx<MW;mtx++){
        const exp=this.explored[mty*MW+mtx];
        const t3=this._ta(mtx,mty);if(t3===T_VOID)continue;
        const mx2=ox+mtx*sc2,my2=oy+mty*sc2,ms2=Math.ceil(sc2)+0.5;
        if(!exp){
          // Unexplored — very dark but slightly visible structure hint
          ctx.fillStyle='rgba(8,4,18,0.95)';ctx.fillRect(mx2,my2,ms2,ms2);
          continue;
        }
        // Explored — bright, saturated colors
        if(t3===T_WALL)        ctx.fillStyle='#6e66a0';  // light purple-grey wall
        else if(t3===T_STAIRS) ctx.fillStyle='#ffe840';  // bright gold stairs
        else if(t3===T_CHEST)  ctx.fillStyle='#ddaa22';  // amber chest
        else if(t3===T_TORCH)  ctx.fillStyle='#ff9a20';  // vivid orange torch
        else if(t3===T_BARREL) ctx.fillStyle='#9a6028';  // warm brown barrel
        else if(t3===T_MERCHANT) ctx.fillStyle='#22aa44'; // green merchant
        else                   ctx.fillStyle='#4a3e2e';  // warm dark floor
        ctx.fillRect(mx2,my2,ms2,ms2);
      }

      // ── POI markers ──
      ctx.font='8px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      // Stairs
      const mmSR=this.rooms[this.rooms.length-1];
      if(mmSR){
        const stx2=mmSR.x+Math.floor(mmSR.w/2),sty2=mmSR.y+Math.floor(mmSR.h/2);
        if(this.explored[sty2*MW+stx2]){
          const smx2=ox+stx2*sc2+sc2/2,smy2=oy+sty2*sc2+sc2/2;
          ctx.fillText('🪜',smx2,smy2);
        }
      }
      // Chests
      for(let mty=0;mty<MH;mty++)for(let mtx=0;mtx<MW;mtx++){
        if(!this.explored[mty*MW+mtx]||this._ta(mtx,mty)!==T_CHEST)continue;
        ctx.font='6px serif';
        ctx.fillText('📦',ox+mtx*sc2+sc2/2,oy+mty*sc2+sc2/2);
        ctx.font='8px serif';
      }
      // Merchant
      for(let mty=0;mty<MH;mty++)for(let mtx=0;mtx<MW;mtx++){
        if(!this.explored[mty*MW+mtx]||this._ta(mtx,mty)!==T_MERCHANT)continue;
        ctx.font='6px serif';
        ctx.fillText('🛒',ox+mtx*sc2+sc2/2,oy+mty*sc2+sc2/2);
        ctx.font='8px serif';
      }
      // Enemies — red dots
      for(const e of this.entities){
        if(e.dead||e.type==='boss')continue;
        const etx2=Math.floor(e.x/DTS),ety2=Math.floor(e.y/DTS);
        if(!this.explored[ety2*MW+etx2])continue;
        const emx2=ox+(e.x/DTS)*sc2,emy2=oy+(e.y/DTS)*sc2;
        ctx.fillStyle='#ff5555';ctx.beginPath();ctx.arc(emx2,emy2,2.5,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=0.4;ctx.fillStyle='#ff9999';ctx.beginPath();ctx.arc(emx2,emy2,4.5,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;
      }
      // Boss — pulsing purple skull
      const mmBoss=this.entities.find(e=>e.type==='boss'&&!e.dead);
      if(mmBoss){
        const bex2=ox+(mmBoss.x/DTS)*sc2,bey2=oy+(mmBoss.y/DTS)*sc2;
        const bp2=0.55+0.45*Math.sin(ts*0.01);
        // Hiper boss = LARANJA (perigo); boss normal = roxo
        ctx.globalAlpha=0.5+0.4*bp2;ctx.fillStyle=mmBoss._hyper?'rgba(255,140,0,0.95)':'rgba(200,40,255,0.9)';
        ctx.beginPath();ctx.arc(bex2,bey2,(mmBoss._hyper?7:5)+bp2*3,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;ctx.font='9px serif';
        ctx.fillText('☠',bex2,bey2);
      }
      // Missão pronta — pino vermelho pulsante sobre o NPC-destino
      { const mk=this._missionMarkerTile();
        if(mk){ const rmx=ox+(mk.tx+0.5)*sc2, rmy=oy+(mk.ty+0.5)*sc2, rp=0.55+0.45*Math.sin(ts*0.007);
          ctx.globalAlpha=0.4*rp; ctx.fillStyle='#ff3b30'; ctx.beginPath(); ctx.arc(rmx,rmy,6+rp*2,0,Math.PI*2); ctx.fill();
          ctx.globalAlpha=1; ctx.fillStyle='#ff3b30'; ctx.beginPath(); ctx.arc(rmx,rmy,3,0,Math.PI*2); ctx.fill();
          ctx.fillStyle='#fff2f0'; ctx.font='bold 7px Courier New'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('!',rmx,rmy); ctx.textBaseline='alphabetic';
        } }
      // Player dot — bright white with pulse + direction arrow
      const ppx2=ox+(this.px/DTS)*sc2,ppy2=oy+(this.py/DTS)*sc2;
      const pp2=0.5+0.5*Math.sin(ts*0.008);
      ctx.globalAlpha=pp2*0.65;ctx.fillStyle='rgba(190,130,255,0.9)';
      ctx.beginPath();ctx.arc(ppx2,ppy2,8,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
      ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(ppx2,ppy2,3.5,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.translate(ppx2,ppy2);ctx.rotate(this.pFacing);
      ctx.fillStyle='rgba(255,255,255,0.95)';
      ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-3,-2.5);ctx.lineTo(-3,2.5);ctx.closePath();ctx.fill();
      ctx.restore();

      ctx.restore(); // end clip
      ctx.textBaseline='alphabetic';

      // Player: ponto pulsante com anel (por cima de tudo do mapa)
      {
        const ppx=mm.x+mm.w/2, ppy=mm.y+mm.h/2;
        const pp=0.5+0.5*Math.sin(ts*0.006);
        ctx.strokeStyle=`rgba(140,240,170,${0.5+0.4*pp})`;ctx.lineWidth=1.4;
        ctx.beginPath();ctx.arc(ppx,ppy,4+pp*3,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle='#eafff0';ctx.beginPath();ctx.arc(ppx,ppy,2.4,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#3fce6a';ctx.beginPath();ctx.arc(ppx,ppy,1.2,0,Math.PI*2);ctx.fill();
      }
      // Legend — 2 col under minimap
      ctx.font='7.5px Courier New';ctx.textAlign='left';
      const mmLeg=[['#ffe840','🪜'],['#ff5555','•'],['#ddaa22','📦'],['#cc44ff','☠']];
      const mmLegL=['Escada','Inimigo','Baú','Boss'];
      const legBaseX=mm.x, legBaseY=mm.y+mm.h+10;
      mmLeg.forEach((item,i)=>{
        const lx=i<2?legBaseX:legBaseX+mm.w/2+2;
        const ly=legBaseY+(i%2)*11;
        ctx.fillStyle=item[0];ctx.fillText(item[1]+' '+mmLegL[i],lx,ly);
      });

      // ── MOEDA (topo, acima do mapa) ──
      {
        const cw=mm.w+10, cx=mm.x-5, cyT=12, chH=28;
        ctx.save();
        ctx.shadowBlur=13; ctx.shadowColor='rgba(200,168,75,0.4)';
        const cg=ctx.createLinearGradient(cx,cyT,cx,cyT+chH);
        cg.addColorStop(0,'rgba(24,16,6,0.97)'); cg.addColorStop(1,'rgba(10,7,2,0.97)');
        ctx.fillStyle=cg;
        ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(cx,cyT,cw,chH,7); else ctx.rect(cx,cyT,cw,chH); ctx.fill();
        ctx.shadowBlur=0;
        ctx.strokeStyle='rgba(200,168,75,0.65)'; ctx.lineWidth=1.6;
        ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(cx,cyT,cw,chH,7); else ctx.rect(cx,cyT,cw,chH); ctx.stroke();
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.font='13px serif'; ctx.fillText('🪙', cx+19, cyT+chH/2+0.5);
        ctx.font='bold 15px Courier New'; ctx.fillStyle='#f6dc90';
        ctx.shadowBlur=8; ctx.shadowColor='rgba(200,168,75,0.5)';
        ctx.fillText(''+(this.pCoins||0), cx+cw/2+10, cyT+chH/2+1);
        ctx.restore();
      }
      // ── ABATES (base, abaixo do mapa) ──
      {
        const kw=mm.w+10, kx=mm.x-5, kyT=mm.y+mm.h+30, khH=26;
        ctx.save();
        ctx.shadowBlur=11; ctx.shadowColor='rgba(140,90,200,0.35)';
        const kg=ctx.createLinearGradient(kx,kyT,kx,kyT+khH);
        kg.addColorStop(0,'rgba(14,8,26,0.96)'); kg.addColorStop(1,'rgba(7,4,14,0.97)');
        ctx.fillStyle=kg;
        ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(kx,kyT,kw,khH,6); else ctx.rect(kx,kyT,kw,khH); ctx.fill();
        ctx.shadowBlur=0;
        ctx.strokeStyle='rgba(150,110,200,0.55)'; ctx.lineWidth=1.4;
        ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(kx,kyT,kw,khH,6); else ctx.rect(kx,kyT,kw,khH); ctx.stroke();
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.font='11px serif'; ctx.fillText('💀', kx+17, kyT+khH/2+0.5);
        ctx.font='bold 12px Courier New'; ctx.fillStyle='#c3a6e8';
        ctx.fillText((this.pKills||0)+' abates', kx+kw/2+8, kyT+khH/2+1);
        ctx.restore();
      }
      ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    }

    // ══ BARRA DE VIDA DO BOSS — desenhada APÓS a fog para nunca ficar escurecida ══
    {
      const boss=this.entities.find(e=>e.type==='boss'&&!e.dead);
      if(boss){
        const hyB=!!boss._hyper;                    // hiper boss: LARANJA de perigo, barra maior
        const bw=hyB?Math.min(460,W-60):360, bh=hyB?16:12, bx=(W-bw)/2, by=H-46;
        const pct=Math.max(0,Math.min(1,boss.hp/boss.maxHp));
        const enraged=boss.hp<boss.maxHp*0.5;
        ctx.save();
        ctx.fillStyle='rgba(5,2,12,0.92)';ctx.fillRect(bx-8,by-20,bw+16,bh+28);
        ctx.strokeStyle=hyB?'rgba(255,150,30,0.75)':'rgba(180,50,255,0.5)';
        ctx.lineWidth=hyB?2:1;ctx.strokeRect(bx-8,by-20,bw+16,bh+28);
        if(hyB){ // moldura de perigo pulsante
          ctx.globalAlpha=0.35+0.25*Math.sin(ts*0.006);
          ctx.strokeStyle='rgba(255,190,80,0.9)';ctx.lineWidth=1;
          ctx.strokeRect(bx-11,by-23,bw+22,bh+34);
          ctx.globalAlpha=1;
        }
        ctx.font=hyB?'bold 10px Courier New':'9px Courier New';
        ctx.fillStyle=hyB?'#ffa030':'#aa55dd';ctx.textAlign='center';
        ctx.fillText(`${hyB?'🟠☠ HIPER BOSS · ':'☠ '}${boss.name.toUpperCase()}${enraged?' ⚡ENRAIVECIDO':''}`,W/2,by-7);
        ctx.fillStyle='rgba(18,4,38,0.95)';ctx.fillRect(bx,by,bw,bh);
        const grd=ctx.createLinearGradient(bx,by,bx+bw,by);
        if(hyB){grd.addColorStop(0,'#7a3000');grd.addColorStop(0.5,'#ff8c00');grd.addColorStop(1,'#ffd870');}
        else {grd.addColorStop(0,'#440077');grd.addColorStop(0.5,'#cc44ff');grd.addColorStop(1,'#ff88ff');}
        ctx.fillStyle=grd;ctx.fillRect(bx,by,bw*pct,bh);
        ctx.fillStyle='rgba(255,255,255,0.18)';ctx.fillRect(bx,by+1,bw*pct,Math.max(2,bh*0.28));
        ctx.font='8px Courier New';ctx.fillStyle='rgba(255,255,255,0.9)';
        ctx.fillText(`${Math.floor(boss.hp)} / ${boss.maxHp}`,W/2,by+bh-2);
        ctx.textAlign='left';
        ctx.restore();
      }
    }

    ctx.restore(); // end screen shake transform
  },
};

DNG._onKey = e=>{
  const actionPressed=(action,fallback)=>typeof GameSettings!=='undefined'?GameSettings.matchesAction(action,e):fallback;
  if(document.getElementById('dng-gameover-overlay')) return;
  if(e.key==='Escape'&&DNG.mapOpen){ DNG._toggleMap(); e.preventDefault(); return; }
  if(e.key==='Escape'&&DNG.menuOpen){ DNG._toggleMenu(null); e.preventDefault(); return; }
  if(actionPressed('pause',e.key==='Escape')&&(DNG.running||DNG.paused)){
    const su=document.getElementById('shd-upg-overlay');
    if(su&&su.classList.contains('open')){ closeShadowUpgradeUI(); return; }
    const cp=document.getElementById('crafting-panel');
    if(cp&&cp.classList.contains('open')){ closeCraftingPanel(); return; }
    DNG._togglePause();
  }
  else if(actionPressed('inventory',e.key==='i'||e.key==='I')&&(DNG.running||DNG.menuOpen)) DNG._toggleMenu(null);
  else if((e.key==='c'||e.key==='C')&&(DNG.running||DNG.menuOpen)) DNG._toggleMenu('personagem');
  else if(actionPressed('crafting',e.key==='t'||e.key==='T')&&(DNG.running||DNG.menuOpen)) DNG._toggleMenu('craft');
  else if(actionPressed('map',e.key==='m'||e.key==='M')&&(DNG.running||DNG.mapOpen)) DNG._toggleMap();
  // E — abrir/fechar painel de Upgrade/Fusão das Sombras
  else if((e.key==='e'||e.key==='E')&&(DNG.running||DNG.paused)){
    const su=document.getElementById('shd-upg-overlay');
    if(su&&su.classList.contains('open')) closeShadowUpgradeUI();
    else if(DNG.running) openShadowUpgradeUI();
  }
  // Shift — Dash no dungeon
  if(actionPressed('dash',e.key==='Shift')&&DNG.running){
    e.preventDefault();
    _dngTriggerDash();
  }
  // SPACE — extração OU convocar sombras
  if(e.key===' '&&extractionState&&extractionState.active){
    extractionState.holding=true;
    e.preventDefault();
  } else if(e.key===' '&&!extractionState&&DNG.running){
    const alive=(typeof shadowAllies!=='undefined'?shadowAllies:[]).filter(s=>!s.dead);
    if(alive.length>0 && typeof DNG.px!=='undefined'){
      alive.forEach((s,i)=>{
        const ang=(i/alive.length)*Math.PI*2;
        s.x=DNG.px+Math.cos(ang)*55;
        s.y=DNG.py+Math.sin(ang)*55;
      });
      DNG._msg('🌑 Sombras convocadas!',1200);
      DNG._parts(DNG.px,DNG.py,'#cc44ff',18,60);
      e.preventDefault();
    }
  }
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
};
DNG._offKey = e=>{
  // Crafting panel closed: resume
  if((typeof GameSettings!=='undefined'?GameSettings.matchesAction('crafting',e):(e.key==='t'||e.key==='T'))){
    const cp=document.getElementById('crafting-panel');
    if(cp&&!cp.classList.contains('open')&&!DNG.running&&!DNG.paused){
      DNG.running=true; DNG.lastTs=0;
      if(DNG.raf)cancelAnimationFrame(DNG.raf);
      DNG.raf=requestAnimationFrame(ts=>DNG._loop(ts));
    }
  }
  // SPACE released: stop holding extraction
  if(e.key===' '&&extractionState&&extractionState.active){
    extractionState.holding=false;
    // Partial hold: only fail if significant progress accumulated AND released prematurely
    if(extractionState.progress>20&&extractionState.progress<100){
      // Give 300ms grace window before penalizing (prevents lag false-negatives)
      clearTimeout(extractionState._releaseTimeout);
      extractionState._releaseTimeout=setTimeout(()=>{
        if(extractionState&&extractionState.active&&!extractionState.holding&&extractionState.progress<100&&extractionState.progress>20){
          finishExtraction(false);
        }
      },300);
    }
  }
};

// FIX: expõe DNG globalmente — systems.js/game.js usam guards `typeof DNG!=='undefined'`
// (receitas de crafting, redução de armadura, avanço de piso após extração falha,
// retomada do loop ao fechar o crafting). Sem isso, todos esses caminhos eram inertes.
InputManager.registerScope('dungeon',{
  state:DNG.keys,
  priority:20,
  exclusive:true,
  isActive:()=>DNG.running||DNG.paused||DNG.invOpen||DNG.menuOpen||DNG.mapOpen,
  onKeyDown:DNG._onKey,
  onKeyUp:DNG._offKey
});
GameRuntime.onSuspend(()=>{
  DNG.lastTs=0;
  if(DNG.running){
    DNG.running=false;
    DNG.paused=true;
    DNG._renderPause();
  }
});

window.DNG = DNG;

window.startDungeonMode = function(){
  hideAllScreens();
  document.body.classList.remove('campaign-hud-active');
  document.getElementById('ui-top').style.display='none';
  const hb=document.getElementById('hud-bottom'); if(hb) hb.style.display='none';
  document.getElementById('canvas').style.display='block';
  const dh=document.getElementById('dungeon-hud');if(dh)dh.style.display='flex';
  const dc=document.getElementById('dungeon-canvas');if(dc)dc.style.display='none';
  document.getElementById('dungeon-screen').style.display='flex';
  if(typeof Audio!=='undefined')try{
    Audio.stopMusic(0.4);
    setTimeout(()=>{ try{ Audio.playCombatMusic('dungeon'); }catch(e2){} }, 600);
  }catch(e2){}
  DNG.start();
};

// ── Dash no Dungeon ──
let _dngDashCd=0, _dngDashMaxCd=2800, _dngDashActive=false, _dngDashTimer=0;
let _dngDashVx=0, _dngDashVy=0, _dngDashAfterImages=[];

function _dngTriggerDash(){
  if(_dngDashActive||_dngDashCd>0||!DNG.running) return;
  let dx=0,dy=0;
  const k=DNG.keys;
  if(typeof GameSettings!=='undefined'){
    if(GameSettings.isActionDown('moveLeft',k)||k['arrowleft']) dx=-1;
    if(GameSettings.isActionDown('moveRight',k)||k['arrowright']) dx+=1;
    if(GameSettings.isActionDown('moveUp',k)||k['arrowup']) dy=-1;
    if(GameSettings.isActionDown('moveDown',k)||k['arrowdown']) dy+=1;
  }else{
    if(k['a']||k['arrowleft']) dx=-1;
    if(k['d']||k['arrowright']) dx+=1;
    if(k['w']||k['arrowup']) dy=-1;
    if(k['s']||k['arrowdown']) dy+=1;
  }
  // Sem input: dash para onde o jogador está virado
  if(dx===0&&dy===0){
    dx=Math.cos(DNG.pFacing)||0; dy=Math.sin(DNG.pFacing)||0;
  }
  if(dx!==0&&dy!==0){dx*=0.707;dy*=0.707;}
  const DASH_SPD=320, DASH_DUR=140;
  _dngDashActive=true; _dngDashTimer=DASH_DUR;
  _dngDashVx=dx*DASH_SPD; _dngDashVy=dy*DASH_SPD;
  _dngDashCd=_dngDashMaxCd; _dngDashAfterImages=[];
  DNG._parts(DNG.px,DNG.py,'#4466ff',10,55);
  DNG._shake={x:0,y:0,t:100,mag:2};
}

// Tick do dash no dungeon — chamado a cada frame pelo _loop
DNG._dngDashTick=function(dt){
  if(_dngDashCd>0) _dngDashCd=Math.max(0,_dngDashCd-dt);
  if(_dngDashActive){
    _dngDashTimer-=dt;
    const nx=DNG.px+_dngDashVx*(dt/1000);
    const ny=DNG.py+_dngDashVy*(dt/1000);
    const r2=8;
    if(DNG._tw(Math.floor((nx-r2)/DTS),Math.floor((DNG.py-r2)/DTS))&&DNG._tw(Math.floor((nx+r2)/DTS),Math.floor((DNG.py+r2)/DTS))) DNG.px=nx;
    if(DNG._tw(Math.floor((DNG.px-r2)/DTS),Math.floor((ny-r2)/DTS))&&DNG._tw(Math.floor((DNG.px+r2)/DTS),Math.floor((ny+r2)/DTS))) DNG.py=ny;
    DNG.pInvTimer=Math.max(DNG.pInvTimer,_dngDashTimer); // invencível
    if(Math.random()<0.8) _dngDashAfterImages.push({x:DNG.px,y:DNG.py,alpha:0.5,life:200});
    if(_dngDashTimer<=0){
      _dngDashActive=false;
      DNG._parts(DNG.px,DNG.py,'#6688ff',8,40);
    }
  }
  for(const ai of _dngDashAfterImages){ ai.life-=dt; ai.alpha=Math.max(0,ai.alpha*(1-dt/200)); }
  _dngDashAfterImages=_dngDashAfterImages.filter(ai=>ai.life>0);
  // Atualiza barra de dash do dungeon
  _dngUpdateDashBar();
};

function _dngUpdateDashBar(){
  const wrap=document.getElementById('dash-bar-wrap');
  const fill=document.getElementById('dash-bar-fill');
  const lbl=document.getElementById('dash-bar-label');
  if(!wrap||!fill) return;
  // Mostra barra apenas no dungeon
  const inDng=document.getElementById('dungeon-screen')?.style.display==='flex';
  if(inDng){ wrap.classList.add('visible'); }
  const pct=_dngDashCd<=0?1:Math.max(0,1-_dngDashCd/_dngDashMaxCd);
  fill.style.width=(pct*100)+'%';
  if(pct>=1){ fill.classList.add('ready'); if(lbl)lbl.textContent='PRONTO'; }
  else { fill.classList.remove('ready'); if(lbl)lbl.textContent=((_dngDashCd/1000).toFixed(1))+'s'; }
}

})();


// ═══════════════════════════════════════════════════════
