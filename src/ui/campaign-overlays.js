// ═══════════════════════════════════════════════════════
// WAVE ANNOUNCE overlay
// ═══════════════════════════════════════════════════════
let waveAnnounce=0;
function drawWaveAnnounce(t){
  if(waveAnnounce<=0) return;
  waveAnnounce-=16;
  const a=Math.min(1,waveAnnounce/500);
  ctx.save();ctx.globalAlpha=a;
  ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(W/2-120,H/2-26,240,52);
  ctx.fillStyle='#f0d080';ctx.font='bold 22px Courier New';ctx.textAlign='center';
  const bossLabels={5:'💀 ONDA 5 — REI CADÁVER!',10:'🕷 ONDA 10 — ARACNE ANCESTRAL!',15:'❄ ONDA 15 — GIGANTE DE GELO!',20:'🪱 ONDA 20 — VERME DEVORADOR!',25:'🔥 ONDA 25 — BALROG!'};
  const bossColors={5:'#aabbff',10:'#888840',15:'#88ddff',20:'#c8a840',25:'#ff4400'};
  const isBossWave=wave%5===0&&wave>=5;
  const label=isBossWave?(bossLabels[wave]||`⚠ ONDA ${wave} — BOSS!`):
    wave===6?`🌲 ONDA ${wave} — FLORESTA ASSOMBRADA!`:wave===11?`❄ ONDA ${wave} — FORTALEZA CONGELADA!`:wave===16?`🏜 ONDA ${wave} — RUÍNAS FÓSSEIS!`:wave===21?`🌋 ONDA ${wave} — PROFUNDEZAS VULCÂNICAS!`:`⚔ ONDA ${wave} ⚔`;
  ctx.fillStyle=isBossWave?(bossColors[wave]||'#ff4400'):wave===6?'#88cc44':wave===11?'#a8d4f0':wave===16?'#c8a050':wave===21?'#ff6622':'#f0d080';
  ctx.fillText(label,W/2,H/2+8);
  ctx.restore();
  ctx.textAlign='left';
}

function drawBossWarning(t){
  if(bossWarning<=0)return;
  bossWarning-=16;
  const a=Math.min(1,bossWarning/600);
  const bwTexts={5:'💀 REI CADÁVER SE APROXIMA!',10:'🕷 ARACNE ANCESTRAL SE APROXIMA!',15:'❄ GIGANTE DE GELO SE APROXIMA!',20:'🪱 VERME DEVORADOR EMERGE!',25:'🔥 BALROG, O ARAUTO DESPERTA!'};
  const bwColors={5:'#aabbff',10:'#888840',15:'#88ddff',20:'#c8a840',25:'#ff4400'};
  const bwLabel=bwTexts[wave]||'⚠ BOSS CHEGANDO!';
  const bwColor=bwColors[wave]||'#ff4400';
  ctx.save(); ctx.globalAlpha=a;
  ctx.fillStyle='rgba(40,0,0,0.7)'; ctx.fillRect(W/2-200,H/2+40,400,44);
  ctx.fillStyle=bwColor; ctx.font='bold 14px Courier New'; ctx.textAlign='center';
  ctx.fillText(bwLabel,W/2,H/2+68);
  ctx.restore(); ctx.textAlign='left';
}

// ─── Blizzard snow particle overlay ───
const snowParticles = Array.from({length:42},(_,i)=>({
  x:Math.random()*W, y:Math.random()*H,
  speed:12+Math.random()*23,
  drift:3+Math.random()*9,
  size:i%11===0?2:1,
  phase:Math.random()*Math.PI*2,
}));
function drawBlizzard(t){
  ctx.save(); ctx.globalAlpha=.46;
  for(const p of snowParticles){
    p.y+=(p.speed*0.016);
    p.x+=(p.drift*0.016)+Math.sin(t*.0012+p.phase)*.22;
    if(p.y>H+4){ p.y=-4; p.x=Math.random()*W; }
    if(p.x>W+4) p.x=-4;
    ctx.fillStyle='rgba(225,245,255,.78)';
    ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);
  }
  ctx.restore();
}
// ═══════════════════════════════════════════════════════
