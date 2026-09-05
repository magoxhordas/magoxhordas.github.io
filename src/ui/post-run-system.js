(function(global){
  'use strict';
  let current=null;
  let activeTab='summary';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const num=value=>Number.isFinite(Number(value))?Number(value):0;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatNumber=value=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(Math.round(num(value)));
  function formatTime(ms){const seconds=Math.max(0,Math.round(num(ms)/1000)),m=Math.floor(seconds/60),s=seconds%60;return`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
  const className=id=>({mage:'Mago',archer:'Arqueiro',viking:'Viking',warrior:'Guerreiro',necromancer:'Necromante'}[id]||String(id||'Herói'));
  const skinName=id=>global.HERO_SKINS?.find?.(item=>item.id===id)?.name||String(id||'Clássica').replaceAll('_',' ');
  const modeName=id=>({campaign:'Campanha',bossrush:'Modo Chefão',dungeon:'Dungeon'}[id]||String(id||'Run'));
  const difficultyName=id=>({easy:'Fácil',medium:'Normal',hard:'Difícil'}[id]||String(id||''));
  function stat(label,value,detail=''){return`<article class="pr-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong>${detail?`<small>${esc(detail)}</small>`:''}</article>`;}
  function headline(){
    const result=current.result||'abandoned';const data={victory:['VITÓRIA','A lenda continua'],defeat:['FIM DA JORNADA','A horda prevaleceu'],abandoned:['RUN ENCERRADA','A expedição foi abandonada']}[result];
    const players=current.players||[];const classes=players.map(item=>className(item.classId)).join(' + ');
    const portraits=players.map((item,index)=>`<span class="pr-portrait"><canvas width="84" height="84" data-player-index="${index}" role="img" aria-label="P${index+1}: ${esc(className(item.classId))}, skin ${esc(item.skinId||'classic')}"></canvas><small>P${index+1}</small></span>`).join('');
    const progress=current.mode==='campaign'?`${formatNumber(current.maxWave)} ondas`:current.mode==='bossrush'?`${formatNumber(current.team?.bosses)} chefes`:`andar ${formatNumber(current.maxWave)}`;
    return`<header class="pr-head"><div class="pr-hero-visuals">${portraits}<span class="pr-result-mark" aria-hidden="true">${result==='victory'?'♛':result==='defeat'?'☠':'⌁'}</span></div><div><p>${esc(data[1])}</p><h1>${esc(data[0])}</h1><strong>${esc(classes)} · ${esc(modeName(current.mode))}${current.difficulty?' · '+esc(difficultyName(current.difficulty)):''} · ${esc(progress)}${current.threatLevel?` · Ameaça ${formatNumber(current.threatLevel)}`:''}</strong><small class="pr-skin-line">Skin: ${players.map(item=>esc(skinName(item.skinId))).join(' / ')}</small></div><time>${formatTime(current.elapsedMs)}</time></header>`;
  }
  function drawPlayerPortraits(root){
    if(typeof global.drawHeroOnCanvas!=='function')return;
    root.querySelectorAll('.pr-portrait canvas').forEach(canvas=>{const player=current.players?.[num(canvas.dataset.playerIndex)];if(!player)return;global.drawHeroOnCanvas(canvas,{classId:player.classId,skinId:player.skinId||'classic',direction:'down',frameIndex:0,pixelSize:5});});
  }
  function highlights(){
    const weapon=[...(current.weapons||[])].sort((a,b)=>num(b.damage)-num(a.damage))[0];const boss=[...(current.bossFights||[])].filter(item=>item.victory).sort((a,b)=>a.durationMs-b.durationMs)[0];
    const list=[];if(weapon)list.push({k:'ARMA DA RUN',v:weapon.name,d:`${formatNumber(weapon.damage)} de dano`});
    if(boss)list.push({k:'CHEFE MAIS RÁPIDO',v:boss.name,d:formatTime(boss.durationMs)});
    if(current.team?.longestKillStreak)list.push({k:'MAIOR SEQUÊNCIA',v:`${formatNumber(current.team.longestKillStreak)} abates`,d:'sem perder vida'});
    if(list.length<3)list.push({k:'SOBREVIVÊNCIA',v:`${formatNumber(current.team?.damageTaken)} dano recebido`,d:`${formatNumber(current.team?.healing)} de cura efetiva`});
    return list.slice(0,3).map(item=>`<article><span>${esc(item.k)}</span><strong>${esc(item.v)}</strong><small>${esc(item.d)}</small></article>`).join('');
  }
  function summaryTab(){
    const t=current.team||{};const p2=(current.players||[]).length>1?`<section class="pr-coop"><h3>DESEMPENHO DA DUPLA</h3>${current.players.map((item,index)=>`<article><b>P${index+1} · ${esc(className(item.classId))}</b><span>${formatNumber(item.kills)} abates</span><span>${formatNumber(item.damageDealt)} dano</span><span>${formatNumber(item.damageTaken)} recebido</span></article>`).join('')}</section>`:'';
    return`<section class="pr-stat-grid">${stat('Inimigos',formatNumber(t.kills))}${stat('Dano efetivo',formatNumber(t.damageDealt))}${stat('Chefes',formatNumber(t.bosses))}${stat('Nível',formatNumber(current.level))}${stat('Maior sequência',formatNumber(t.longestKillStreak))}${stat('Dano recebido',formatNumber(t.damageTaken))}</section><h2>DESTAQUES DA RUN</h2><section class="pr-highlights">${highlights()}</section>${records()}${p2}`;
  }
  function records(){if(!current.records?.length)return'';return`<section class="pr-records"><h3>NOVOS RECORDES PESSOAIS</h3>${current.records.slice(0,4).map(item=>{const timed=item.key.startsWith('boss:')||item.key.includes('fastest'),value=timed?formatTime(item.value):formatNumber(item.value),previous=item.previous?(timed?formatTime(item.previous):formatNumber(item.previous)):'';return`<span><b>${esc((item.label||item.key).replace(/([A-Z])/g,' $1').toUpperCase())}</b>${value}${previous?`<small>anterior: ${previous}</small>`:''}</span>`;}).join('')}</section>`;}
  function buildTab(){
    const total=Math.max(1,num(current.team?.damageDealt));const weapons=[...(current.weapons||[])].sort((a,b)=>num(b.damage)-num(a.damage));
    const weaponHtml=weapons.length?weapons.map(item=>{const pct=Math.round(num(item.damage)/total*100);return`<article class="pr-source"><header><div><b>${esc(item.name)}</b><small>${esc(item.rarity)} · P${num(item.playerIndex)+1}</small></div><strong>${formatNumber(item.damage)} <small>${pct}%</small></strong></header><div><i style="width:${Math.min(100,pct)}%"></i></div><footer>${formatNumber(item.kills)} abates</footer></article>`;}).join(''):'<p class="pr-empty">Nenhuma arma teve dano atribuído com segurança.</p>';
    const groups=new Map();for(const boon of current.blessings||[]){if(!groups.has(boon.deity))groups.set(boon.deity,[]);groups.get(boon.deity).push(boon);}
    const boonHtml=groups.size?[...groups].map(([god,items])=>`<article class="pr-boon-group"><h3>${esc(god)}</h3>${items.map(item=>`<span><b>${item.ascension?'✦ ASCENSÃO · ':''}${esc(item.name)}</b><small>${esc(item.rarity)}${item.description?` · ${esc(item.description)}`:''}</small></span>`).join('')}</article>`).join(''):'<p class="pr-empty">Nenhuma bênção registrada nesta run.</p>';
    const petDamage=current.pet?num(current.damageBySource?.[current.pet.name]||current.damageBySource?.Pet):0;
    return`<div class="pr-two-col"><section><h2>ARMAS POR CONTRIBUIÇÃO</h2>${weaponHtml}</section><section><h2>BÊNÇÃOS POR DIVINDADE</h2><div class="pr-boons">${boonHtml}</div>${current.pet?`<article class="pr-pet"><span>COMPANHEIRO</span><strong>${esc(current.pet.name)}</strong>${petDamage?`<small>${formatNumber(petDamage)} de dano efetivo</small>`:''}</article>`:''}</section></div>`;
  }
  function combatTab(){
    const t=current.team||{};const sourceTotal=Math.max(1,Object.values(current.damageBySource||{}).reduce((sum,value)=>sum+num(value),0));
    const sources=Object.entries(current.damageBySource||{}).sort((a,b)=>b[1]-a[1]).map(([name,value])=>`<article class="pr-break"><span>${esc(name)}</span><div><i style="width:${Math.round(num(value)/sourceTotal*100)}%"></i></div><strong>${formatNumber(value)}</strong></article>`).join('')||'<p class="pr-empty">Sem dano atribuível.</p>';
    const fights=(current.bossFights||[]).map(item=>`<article class="pr-boss-fight ${item.victory?'won':'lost'}"><span>${item.victory?'✓':'☠'}</span><div><b>${esc(item.name)}</b><small>${item.victory?formatTime(item.durationMs):'DERROTA'} · ${formatNumber(item.damageTaken)} dano recebido</small></div></article>`).join('')||'<p class="pr-empty">Nenhuma batalha de chefe registrada.</p>';
    const lowest=Math.min(100,...(current.players||[]).map(item=>num(item.lowestHpPercent)||100));
    return`<section class="pr-stat-grid compact">${stat('Dano causado',formatNumber(t.damageDealt))}${stat('Dano recebido',formatNumber(t.damageTaken))}${stat('Cura efetiva',formatNumber(t.healing))}${stat('Abates',formatNumber(t.kills))}${stat('Críticos',formatNumber(t.criticals))}${stat('Esquivas',formatNumber(t.dashes))}${stat('Elites',formatNumber(t.elites))}${stat('Minibosses',formatNumber(t.minibosses))}${stat('Chefes',formatNumber(t.bosses))}${stat('Tempo em combate',formatTime(current.combatMs))}${stat('Menor vida',`${formatNumber(lowest)}%`)}${stat('Maior sequência',formatNumber(t.longestKillStreak))}${stat('Maior multikill',formatNumber(current.maxMultiKill))}${stat('XP recebido',formatNumber(t.xpEarned))}${stat('Moedas obtidas',formatNumber(t.coinsEarned))}${stat('Moedas gastas',formatNumber(t.coinsSpent))}</section><div class="pr-two-col"><section><h2>ORIGEM DO DANO</h2>${sources}</section><section><h2>BATALHAS DE CHEFE</h2>${fights}${current.defeatedBy?`<p class="pr-defeat">DERROTADO POR · ${esc(current.defeatedBy)}</p>`:''}</section></div>`;
  }
  function progressTab(){
    const unlocked=current.achievementsUnlocked||[];const achSummary=global.AchievementSystem?.getSummary?.()||{unlocked:0,total:60,percent:0};
    return`<section class="pr-progress-summary">${stat('Conquistas',`${achSummary.unlocked} / ${achSummary.total}`,`${achSummary.percent}% concluído`)}${stat('Pets',current.progress?.pets?`+${current.progress.pets}`:'—','novos nesta run')}${stat('Códex',current.progress?.codex?`+${current.progress.codex}`:'—','entradas nesta run')}${stat('Recordes',`+${current.records?.length||0}`,'novos pessoais')}</section><h2>CONQUISTAS DESBLOQUEADAS NESTA RUN</h2><section class="pr-unlocks">${unlocked.length?unlocked.slice(0,3).map(item=>`<article><span>${item.icon}</span><div><small>CONQUISTA DESBLOQUEADA</small><b>${esc(item.name)}</b><p>${esc(item.description)}</p><time>${esc(new Intl.DateTimeFormat('pt-BR').format(new Date(item.unlockedAt)))}</time></div></article>`).join(''):'<p class="pr-empty">Nenhuma conquista nova nesta run. Veja a lista em Configurações para escolher o próximo objetivo.</p>'}</section>${unlocked.length>3?`<button class="pr-inline-btn" onclick="PostRunScreen.showAllAchievements()">VER TODAS (${unlocked.length})</button>`:''}`;
  }
  function content(){return{summary:summaryTab,build:buildTab,combat:combatTab,progress:progressTab}[activeTab]();}
  function render(){
    const root=document.getElementById('post-run-screen');if(!root||!current)return;root.dataset.result=current.result;root.innerHTML=`<div class="pr-shell">${headline()}<nav class="pr-tabs" aria-label="Detalhes da run">${[['summary','Resumo'],['build','Build'],['combat','Combate'],['progress','Progresso']].map(([id,label])=>`<button class="${activeTab===id?'active':''}" onclick="PostRunScreen.setTab('${id}')">${label}</button>`).join('')}</nav><main class="pr-body">${content()}</main><footer class="pr-actions"><button class="primary" onclick="PostRunScreen.replay()">Jogar novamente</button><button onclick="PostRunScreen.newRun()">Nova run</button><button onclick="PostRunScreen.menu()">Menu principal</button></footer></div>`;drawPlayerPortraits(root);
  }
  function open(snapshot){if(!snapshot)return false;current=clone(snapshot);activeTab='summary';document.getElementById('gameover')?.style.setProperty('display','none');document.getElementById('victory-screen')?.classList.remove('open');const root=document.getElementById('post-run-screen');if(!root)return false;root.classList.add('open');root.setAttribute('aria-hidden','false');render();return true;}
  function close(){const root=document.getElementById('post-run-screen');root?.classList.remove('open');root?.setAttribute('aria-hidden','true');}
  function finishAndOpen(result,meta={}){const snapshot=global.RunStats?.finish?.(result,meta);return snapshot?open(snapshot):false;}
  function setTab(id){if(!['summary','build','combat','progress'].includes(id))return;activeTab=id;render();}
  function replay(){const mode=current?.mode;close();if(mode==='bossrush'&&typeof global.startBossRush==='function'){global.startBossRush();return;}if(mode==='dungeon'&&typeof global.startDungeonMode==='function'){global.startDungeonMode();return;}if(typeof global.beginGame==='function')global.beginGame();}
  function newRun(){close();if(typeof global.showScreen==='function')global.showScreen('play-menu');}
  function menu(){close();if(typeof global.goMainMenu==='function')global.goMainMenu();}
  function showAllAchievements(){close();if(global.GameSettings?.open){global.GameSettings.open();global.GameSettings.setTab('achievements');}}
  function debugOpenMock(overrides={}){
    const mock={
      schemaVersion:1,id:'debug-post-run',startedAt:new Date(Date.now()-1902000).toISOString(),finishedAt:new Date().toISOString(),
      result:'victory',mode:'campaign',difficulty:'hard',threatLevel:3,coop:true,elapsedMs:1902000,combatMs:1514000,wave:25,maxWave:25,level:34,
      players:[
        {index:0,classId:'viking',skinId:'imperial_time',kills:267,damageDealt:103400,damageTaken:302,healing:81,criticals:42,dashes:31,longestKillStreak:91,lowestHpPercent:4},
        {index:1,classId:'mage',skinId:'classic',kills:220,damageDealt:79030,damageTaken:340,healing:44,criticals:58,dashes:24,longestKillStreak:73,lowestHpPercent:18}
      ],
      team:{kills:487,elites:12,minibosses:2,bosses:5,damageDealt:182430,damageTaken:642,healing:125,criticals:100,dashes:55,xpEarned:4380,coinsEarned:412,coinsSpent:214,longestKillStreak:127},
      weapons:[{id:'viking_colossal',name:'Machado Colossal',rarity:'legendary',playerIndex:0,damage:54820,kills:141},{id:'mage_staff',name:'Cajado Arcano',rarity:'epic',playerIndex:1,damage:48200,kills:116},{id:'other',name:'Lâminas Gêmeas',rarity:'rare',playerIndex:0,damage:34410,kills:90}],
      blessings:[{id:'a',name:'Fúria Sagrada',description:'+18% de dano em combate.',deity:'Ares',rarity:'epic',ascension:false},{id:'b',name:'Sangue da Guerra',description:'Roubo de vida após golpes críticos.',deity:'Ares',rarity:'rare',ascension:false},{id:'c',name:'Apoteose da Guerra',description:'Amplifica a afinidade de Ares.',deity:'Ares',rarity:'legendary',ascension:true}],
      pet:{id:'aegis',name:'Aegis'},
      bossFights:[{id:'ice_giant',name:'Gigante de Gelo',durationMs:101000,victory:true,damageTaken:92},{id:'worm',name:'Verme Devorador',durationMs:87000,victory:true,damageTaken:133},{id:'balrog',name:'Balrog',durationMs:124000,victory:true,damageTaken:206}],
      damageBySource:{'Machado Colossal':54820,'Cajado Arcano':48200,'Lâminas Gêmeas':34410,'Bênçãos':24400,Aegis:100,'Outros':20500},maxMultiKill:11,
      records:[{key:'mostKills',value:487,previous:420},{key:'boss:worm',value:87000,previous:94000,label:'Verme Devorador'}],
      achievementsUnlocked:(global.AchievementSystem?.getEntries?.()||[]).slice(0,3).map((item,index)=>({...item,unlockedAt:new Date(Date.now()-index*1000).toISOString()})),progress:{pets:1,codex:3}
    };
    return open({...mock,...overrides});
  }

  function openRequestedDebugPreview(){
    if(typeof document==='undefined'||typeof global.URLSearchParams!=='function')return;
    try{
      const params=new global.URLSearchParams(global.location?.search||'');if(!params.has('debugPostRun'))return;
      const result=params.get('debugPostRun');const overrides=result==='defeat'?{result:'defeat',wave:18,maxWave:18,level:24,defeatedBy:'Gigante de Gelo',records:[],bossFights:[{id:'ice_giant',name:'Gigante de Gelo',durationMs:94000,victory:false,damageTaken:241}]}:result==='abandoned'?{result:'abandoned',wave:8,maxWave:8,level:11,records:[],bossFights:[]}:{};
      global.setTimeout(()=>debugOpenMock(overrides),0);
    }catch(_){}
  }

  global.PostRunScreen=Object.freeze({open,close,finishAndOpen,setTab,replay,newRun,menu,showAllAchievements,debugOpenMock,getCurrent:()=>current&&clone(current)});
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',openRequestedDebugPreview,{once:true});
    else openRequestedDebugPreview();
  }
})(typeof window!=='undefined'?window:globalThis);
