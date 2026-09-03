(function(global){
'use strict';
const data=global.MagoBlessingData;
if(!data)throw new Error('MagoBlessingData deve ser carregado antes do sistema de bênçãos.');
const {DEITIES,ASCENSIONS,RARITY_ORDER,RARITY_META}=data;
const DEITY_MAP=Object.fromEntries(DEITIES.map(d=>[d.id,d]));
let selectedCardOffer=null;
let selectedCardElement=null;
let pendingAscensionDeity=null;
const legacyBlessingWaveRegen=typeof applyCardWaveRegen==='function'?applyCardWaveRegen:()=>{};
const now=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
const pct=value=>`${Math.round((Number(value)||0)*100)}%`;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const distance=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));
const hpRatio=entity=>entity&&entity.maxHp?clamp((entity.hp||0)/entity.maxHp,0,1):1;
const rarityAt=(card,key,fallback=0)=>{
if(!card)return fallback;
const raw=key==='value'?card.value:card[key];
if(Array.isArray(raw))return raw[card.rarityIndex]??fallback;
return raw??fallback;
};
const randomItem=items=>items[Math.floor(Math.random()*items.length)];
const activeCards=()=>{try{return activeCardBlessings;}catch(_){global.activeCardBlessings=global.activeCardBlessings||[];return global.activeCardBlessings;}};
const replaceActiveCards=value=>{try{activeCardBlessings=value;}catch(_){global.activeCardBlessings=value;}};
const waveNumber=()=>{try{return Number(wave)||1;}catch(_){return Number(global.wave)||1;}};
const gamePlayers=()=>{
const list=[];
try{if(typeof player!=='undefined'&&player)list.push(player);}catch(_){}
try{if(typeof gameMode!=='undefined'&&gameMode===2&&typeof player2!=='undefined'&&player2)list.push(player2);}catch(_){}
return list.filter(pl=>pl&&!pl.dead);
};
const particles=(x,y,color,count=8,spread=48)=>{try{if(typeof spawnParts==='function')spawnParts(x,y,color,count,spread);}catch(_){} };
const notice=(pl,text)=>{try{if(typeof spawnLevelUpNotice==='function')spawnLevelUpNotice(pl?.x||320,(pl?.y||220)-30,text,pl?.idx||0);}catch(_){} };
const effect=pl=>pl.cardEffects||(pl.cardEffects={});
const boon=(pl,id)=>pl?.cardEffects?.boons?.[id]||null;
const ascension=(pl,id)=>pl?.cardEffects?.ascensions?.[id]||null;
const hasAsc=(pl,id)=>!!ascension(pl,id);
const bv=(card,key='value',fallback=0)=>rarityAt(card,key,fallback);
function changeMaxHp(pl,delta,heal=true){
if(!pl||!Number.isFinite(delta)||!delta)return 0;
const old=pl.maxHp||1;pl.maxHp=Math.max(1,old+delta);
if(heal&&delta>0)pl.hp=Math.min(pl.maxHp,(pl.hp||0)+delta);
else pl.hp=Math.min(pl.maxHp,Math.max(1,pl.hp||1));
return pl.maxHp-old;
}
function sourceKey(pl,weapon){return weapon?.type||`${pl?.classId||'hero'}_base`;}
function slotsFor(pl){
try{if(typeof getSlots==='function')return getSlots(pl.idx)||[];}catch(_){}
try{if(typeof weaponSlots!=='undefined')return pl.idx===1?(typeof weaponSlots2!=='undefined'?weaponSlots2:[]):weaponSlots;}catch(_){}
return [];
}
function rarityRank(rarity){return ({common:0,uncommon:1,rare:2,epic:3,legendary:4})[rarity]??0;}
function isBossTarget(target){
if(!target)return false;
try{if(typeof bossOrc!=='undefined'&&target===bossOrc)return true;}catch(_){}
try{if(typeof bossSkel!=='undefined'&&target===bossSkel)return true;}catch(_){}
try{if(typeof bossSpider!=='undefined'&&target===bossSpider)return true;}catch(_){}
try{if(typeof bossMajor!=='undefined'&&target===bossMajor)return true;}catch(_){}
try{if(typeof petBoss!=='undefined'&&target===petBoss)return true;}catch(_){}
return !!(target.isBoss||target.boss);
}
function isEliteTarget(target){return !!target&&!isBossTarget(target)&&!!(target.elite||target.isElite||(target.maxHp||0)>=300);}
function targetState(pl,target){
const e=effect(pl);e.targetStates=e.targetStates||new WeakMap();
let state=e.targetStates.get(target);if(!state){state={};e.targetStates.set(target,state);}return state;
}
function livingTargets(){
let list=[];
try{if(typeof allTargets==='function'&&typeof enemies!=='undefined')list=allTargets(enemies)||[];else if(typeof enemies!=='undefined')list=enemies||[];}catch(_){}
return list.filter(target=>target&&!target.dead&&target.hp!==0);
}
function nearestTargets(x,y,radius,exclude=null,limit=Infinity){
return livingTargets().filter(target=>target!==exclude&&Math.hypot((target.x||0)-x,(target.y||0)-y)<=radius)
.sort((a,b)=>Math.hypot((a.x||0)-x,(a.y||0)-y)-Math.hypot((b.x||0)-x,(b.y||0)-y)).slice(0,limit);
}
function secondaryDamage(pl,target,amount,color='#b9d7ff',label='secondary'){
if(!target||target.dead||!(amount>0))return 0;
target._lastDamageOwner=pl;target._blessingSecondary=label;
const before=Number(target.hp)||0;
try{if(typeof target.takeDmg==='function')target.takeDmg(amount);else target.hp=Math.max(0,before-amount);}catch(_){target.hp=Math.max(0,before-amount);}
particles(target.x||pl.x,target.y||pl.y,color,6,40);
if((target.hp||0)<=0||target.dead){target.dead=true;if(global.notifyBlessingKill)global.notifyBlessingKill(pl,target,null);}
return Math.max(0,before-(Number(target.hp)||0));
}
function areaDamage(pl,x,y,radius,amount,color,exclude=null,limit=Infinity,label='area'){
const targets=nearestTargets(x,y,radius,exclude,limit);for(const target of targets)secondaryDamage(pl,target,amount,color,label);return targets;
}
function pushTarget(target,x,y,force){
if(!target||target.dead||!(force>0))return;
const dx=(target.x||0)-x,dy=(target.y||0)-y,len=Math.hypot(dx,dy)||1;
target.x=(target.x||0)+dx/len*force;target.y=(target.y||0)+dy/len*force;
}
function ringScale(pl){
const ring=boon(pl,'sauron_ring');if(!ring)return 1;
return 1+bv(ring)*(hasAsc(pl,'sauron_asc_one_ring')?2:1);
}
function blessingAmp(pl,value){return value*ringScale(pl);}
function penaltyAmp(pl,value){
const ring=boon(pl,'sauron_ring');if(!ring)return value;
return value*(1+bv(ring,'penalty')*(hasAsc(pl,'sauron_asc_one_ring')?2:1));
}
function scaledSecondary(pl,value){return blessingAmp(pl,value);}
function heal(pl,amount,x=pl.x,y=pl.y){
if(!pl||!(amount>0))return;
try{if(typeof healCampaignPlayer==='function'){healCampaignPlayer(pl,amount,x,y);return;}}catch(_){}
pl.hp=Math.min(pl.maxHp,(pl.hp||0)+amount);particles(x,y,'#79e89a',5,34);
}
function markPoseidonPressure(pl,target,amount=1){
const card=boon(pl,'poseidon_crush');if(!card||!target||target.dead)return;
const ts=targetState(pl,target);ts.poseidonPressure=(ts.poseidonPressure||0)+amount;
if(ts.poseidonPressure>=bv(card,'hits')){ts.poseidonPressure=0;secondaryDamage(pl,target,(effect(pl).lastHitDamage||pl.dmg||10)*scaledSecondary(pl,bv(card)),'#66c8ff','poseidon-crush');}
}
function knockWave(pl,x,y,radius,damage,push,color='#62cfff',exclude=null){
const tsunami=hasAsc(pl,'poseidon_asc_tsunami');const r=radius*(tsunami?1.5:1),f=push*(tsunami?1.5:1);
const targets=nearestTargets(x,y,r,exclude);for(const target of targets){secondaryDamage(pl,target,damage,color,'poseidon-wave');pushTarget(target,x,y,f);markPoseidonPressure(pl,target,tsunami?2:1);}return targets;
}
function cardValueText(card){
if(card.isAscension)return 'TRANSFORMAÇÃO DE BUILD · escolha definitiva para esta run';
const v=card.value,t=card.type,at=key=>bv(card,key);
if(t==='chain')return `a cada ${at('hits')} acertos · ${pct(v)} do dano · ${at('chains')} salto(s)`;
if(t==='static'||t==='doom'||t==='fateThread'||t==='anvil'||t==='overheat'||t==='masterpiece'||t==='slam')return `ativa em ${at('hits')} acertos · impacto ${pct(v)}`;
if(t==='blood')return `+${pct(v)} por marca · explosão ${pct(at('burst'))}`;
if(t==='dashProc'||t==='dashPulse'||t==='dashStrike'||t==='shadowDash'||t==='dashWave'||t==='dashCounter')return `${pct(v)} de potência após o dash`;
if(t==='critMark'||t==='critSplash'||t==='critRicochet'||t==='critVolley')return `${pct(v)} de potência em gatilhos críticos`;
if(t==='lowHpProc'||t==='eclipse'||t==='berserk'||t==='dread')return `desperta em vida baixa · potência ${pct(v)}`;
if(t==='rampage')return `${at('stacks')} cargas para Frenesi · +${pct(v)} dano`;
if(t==='execution')return `execução começa em ${Math.round(at('threshold')*100)}% de vida`;
if(t==='retaliation')return `${at('charges')} golpes de Retaliação · +${pct(v)} dano`;
if(t==='hex'||t==='forbidden'||t==='echo'||t==='triple')return `${pct(v)} de poder arcano`;
if(t==='phases')return `${pct(v)} de bônus conforme a fase lunar`;
if(t==='periodic')return `golpe lunar a cada ${(at('cooldown')/1000).toFixed(1).replace('.',',')}s · ${pct(v)} dano`;
if(t==='moonHarvest'||t==='lastCall'||t==='grove')return `recupera ${pct(v)} da vida máxima`;
if(t==='fatedCrit')return `crítico garantido a cada ${at('hits')} ataques · +${pct(v)} crítico`;
if(t==='critPity')return `+${pct(v)} chance a cada não-crítico`;
if(t==='revive')return `1 vez/onda · retorna com ${pct(v)} da vida`;
if(t==='rarity')return `+${pct(v)} inclinação para raridades superiores`;
if(t==='aegis'||t==='stance'||t==='parry'||t==='resilience'||t==='roots'||t==='bark')return `${pct(v)} de proteção/efeito defensivo`;
if(t==='momentum')return `até +${pct(v)} movimento enquanto mantém o ritmo`;
if(t==='dashReduce')return `−${pct(v)} da recarga atual por acerto`;
if(t==='afterimage')return `pós-imagem repete ${pct(v)} do dano`;
if(t==='flow')return `+${pct(v)} movimento no Fluxo máximo`;
if(t==='hangover'||t==='buffBurst'||t==='wave'||t==='surrounded'||t==='killChain'||t==='eye'||t==='domination')return `explosão/impacto de ${pct(v)} do dano`;
if(t==='randomBuff')return `${pct(v)} chance por abate · bônus de ${pct(at('power'))}`;
if(t==='buffDuration')return `+${pct(v)} duração de bônus temporários`;
if(t==='reinforce'||t==='distance'||t==='hunt'||t==='corruption')return `até +${pct(v)} de dano no gatilho`;
if(t==='shrapnel')return `estilhaços causam ${pct(v)} do dano do golpe`;
if(t==='markPrey'||t==='weakpoint'||t==='tide'||t==='labors'||t==='terror')return `crescimento por sequência · ${pct(v)} por estágio`;
if(t==='crush')return `esmagamento causa ${pct(v)} do dano após pressão`;
if(t==='ring')return `+${pct(v)} potência para outras bênçãos`;
if(t==='dodge')return `${pct(v)} chance de forma espectral`;
if(t==='seed')return `+${pct(v)} vida máxima temporária por semente`;
return `${pct(v)} de potência`;
}
function materialize(deity,boon,rarity){
const rarityIndex=RARITY_ORDER.indexOf(rarity),value=boon.values[rarityIndex];
const card={...boon,deityId:deity.id,god:`${deity.icon} ${deity.name}`,rarity,rarityIndex,value,uniqueGroup:boon.id};
card.valueText=cardValueText(card);return card;
}
function materializeAscension(deity,raw){
const card={...raw,deityId:deity.id,god:`${deity.icon} ${deity.name}`,rarity:'lendaria',rarityIndex:4,value:0,uniqueGroup:raw.id,isAscension:true};
card.valueText=cardValueText(card);return card;
}
function ownedIds(){return new Set(activeCards().map(card=>card.id));}
function deityOwnedCount(deityId){return activeCards().filter(card=>!card.isAscension&&card.deityId===deityId).length;}
function deityHasAscension(deityId){return activeCards().some(card=>card.isAscension&&card.deityId===deityId);}
function ascensionReadyDeity(){return DEITIES.find(deity=>deityOwnedCount(deity.id)>=3&&!deityHasAscension(deity.id))?.id||null;}
function eligibleDeities(){
const owned=ownedIds();return DEITIES.filter(deity=>deityOwnedCount(deity.id)<3&&deity.boons.filter(boon=>!owned.has(boon.id)).length>=3);
}
function weightedDeityPick(deities){
const weighted=deities.map(deity=>({deity,weight:[1,2.35,4.75][Math.min(2,deityOwnedCount(deity.id))]}));
let roll=Math.random()*weighted.reduce((sum,item)=>sum+item.weight,0);
for(const item of weighted){roll-=item.weight;if(roll<=0)return item.deity;}return weighted[weighted.length-1]?.deity||null;
}
rollCardRarity=function(){
const omen=Math.max(0,...gamePlayers().map(p=>p.cardEffects?.rarityBoost||0),0),w=waveNumber();
const late=w>20?3:w>10?1.5:0,weights={comum:48,incomum:25,rara:18+late*1.2,epica:7+late*.6,lendaria:2+(w>15?1:0)};
const shift=Math.min(18,omen*100);weights.comum=Math.max(24,weights.comum-shift);weights.incomum+=shift*.20;weights.rara+=shift*.42;weights.epica+=shift*.25;weights.lendaria+=shift*.13;
let roll=Math.random()*Object.values(weights).reduce((a,b)=>a+b,0);for(const rarity of RARITY_ORDER){roll-=weights[rarity];if(roll<=0)return rarity;}return 'comum';
};
rollCardOffer=function(count=3){
const deities=eligibleDeities();if(!deities.length)return [];
const deity=weightedDeityPick(deities),owned=ownedIds();let pool=deity.boons.filter(boon=>!owned.has(boon.id)),offers=[];
while(offers.length<Math.min(3,count,pool.length)){const index=Math.floor(Math.random()*pool.length),raw=pool.splice(index,1)[0];offers.push(materialize(deity,raw,rollCardRarity()));}
const guarantee=gamePlayers().find(pl=>(pl.cardEffects?.omenGuarantee||0)>0);
if(guarantee&&offers.length&&!offers.some(card=>card.rarityIndex>=2)){offers[0]=materialize(deity,deity.boons.find(boon=>boon.id===offers[0].id),randomItem(['rara','epica','lendaria']));guarantee.cardEffects.omenGuarantee--;}
offers.deityId=deity.id;offers.isAscension=false;return offers;
};
global.rollAscensionOffer=function(deityId){
const deity=DEITY_MAP[deityId],defs=ASCENSIONS[deityId]||[];if(!deity||defs.length!==2||deityHasAscension(deityId))return [];
const offers=defs.map(raw=>materializeAscension(deity,raw));offers.deityId=deityId;offers.isAscension=true;return offers;
};
openDeityIntro=function(deityId,offers){
const screen=typeof document!=='undefined'?document.getElementById('deity-intro-screen'):null,deity=DEITY_MAP[deityId];
if(!screen||!deity){revealCardOffers(offers);return;}
try{pendingCardOffers=offers;}catch(_){global.pendingCardOffers=offers;}
try{activeDeityPresentation=deityId;}catch(_){global.activeDeityPresentation=deityId;}
try{deityIntroTransitioning=false;}catch(_){global.deityIntroTransitioning=false;}
try{clearTimeout(deityIntroTimer);}catch(_){}
const art=document.getElementById('deity-intro-art');if(art){art.src=deity.image;art.alt=`${deity.name} — ${deity.title}`;}
const n=document.getElementById('deity-intro-name'),t=document.getElementById('deity-intro-title'),d=document.getElementById('deity-intro-dialogue');
if(n)n.textContent=offers?.isAscension?`ASCENSÃO DE ${deity.name}`:deity.name;if(t)t.textContent=offers?.isAscension?'TRÊS BÊNÇÃOS REUNIDAS · ESCOLHA SEU DESTINO':deity.title;
if(d)d.textContent=offers?.isAscension?'“Você já carrega parte do meu poder. Agora escolha no que ele vai se transformar.”':`“${randomItem(deity.dialogues)}”`;
screen.dataset.deity=deityId;screen.setAttribute('aria-hidden','false');screen.classList.remove('open','leaving');void screen.offsetWidth;screen.classList.add('open');
try{if(typeof Audio!=='undefined'&&Audio.playDeityArrival)Audio.playDeityArrival(deityId);}catch(_){}
const button=screen.querySelector('.deity-dialogue-continue');if(button){button.disabled=false;setTimeout(()=>button.focus({preventScroll:true}),250);}
};
revealCardOffers=function(offers){
if(!offers||![2,3].includes(offers.length)){try{closeCardOffer();}catch(_){}return;}
const deity=DEITY_MAP[offers.deityId||offers[0].deityId];
const label=document?.getElementById?.('card-deity-label');if(label&&deity)label.textContent=offers.isAscension?`ASCENSÃO DE ${deity.name}`:`${deity.name} — ${deity.title}`;
selectedCardOffer=null;selectedCardElement=null;
const confirm=document?.getElementById?.('card-confirm-btn');if(confirm){confirm.disabled=true;confirm.textContent='CONFIRMAR ›';}
const skip=document?.querySelector?.('#card-screen .card-skip-btn');if(skip){skip.textContent=offers.isAscension?'ASCENSÃO OBRIGATÓRIA':'‹ VOLTAR';skip.disabled=!!offers.isAscension;}
const waveLabel=document?.getElementById?.('card-wave-label');if(waveLabel)waveLabel.textContent=offers.isAscension?'3 bênçãos reunidas · escolha 1 Ascensão':`Onda ${waveNumber()} concluída`;
renderCardOffers(offers);document?.getElementById?.('card-screen')?.classList.add('open');
};
openCardOffer=function(){
try{cardOfferOpen=true;state='shop';}catch(_){}try{if(typeof hideAllScreens==='function')hideAllScreens();}catch(_){}
const ready=ascensionReadyDeity();if(ready){const offers=global.rollAscensionOffer(ready);if(offers.length){openDeityIntro(ready,offers);return;}}
const offers=rollCardOffer(3);if(offers.length!==3){try{closeCardOffer();}catch(_){}return;}openDeityIntro(offers.deityId,offers);
};
renderCardOffers=function(offers){
const row=document?.getElementById?.('cards-row');if(!row)return;row.innerHTML='';row.classList.toggle('ascension-offer',!!offers.isAscension);
const preview=document.getElementById('card-active-preview');if(preview)preview.innerHTML=activeCards().map(b=>`<span class="card-active-pip r-${b.rarity}" title="${b.name}">${b.icon}</span>`).join('');
offers.forEach((card,index)=>{
const rarity=card.isAscension?{label:'ASCENSÃO'}:RARITY_META[card.rarity],el=document.createElement('button');el.type='button';el.className=`bless-card r-${card.rarity}${card.isAscension?' ascension-card':''}`;el.style.animationDelay=`${index*.11}s`;
el.setAttribute('aria-label',`${rarity.label}: ${card.name}. ${card.valueText}`);
el.innerHTML=`<div class="bless-card-header"><span class="bless-card-icon" aria-hidden="true">${card.icon}</span><div class="bless-card-heading"><div class="bless-card-name">${card.name}</div><div class="bless-card-rarity">${rarity.label}</div></div></div><div class="bless-card-body"><div class="bless-card-role">${card.role}</div><div class="bless-card-desc">${card.desc}</div><div class="bless-card-divider"><span></span></div><div class="bless-card-value">${card.valueText}</div></div>`;
el.onclick=()=>pickCard(card,el);row.appendChild(el);
});
};
pickCard=function(card,el){
if(!card||activeCards().some(owned=>owned.id===card.id))return;selectedCardOffer=card;selectedCardElement=el;
document?.querySelectorAll?.('#cards-row .bless-card')?.forEach(node=>node.classList.toggle('selected',node===el));
const confirm=document?.getElementById?.('card-confirm-btn');if(confirm){confirm.disabled=false;confirm.textContent=`CONFIRMAR ${card.name.toUpperCase()} ›`;confirm.focus({preventScroll:true});}
};
global.confirmCardOffer=function(){
const card=selectedCardOffer;if(!card||activeCards().some(owned=>owned.id===card.id))return;
for(const pl of gamePlayers())applyDeityBoon(pl,card);activeCards().push(card);try{if(typeof updateBlessingsHUD==='function')updateBlessingsHUD();}catch(_){}
const x=typeof W!=='undefined'?W/2:320,y=typeof H!=='undefined'?H/2-50:190;try{if(typeof spawnLevelUpNotice==='function')spawnLevelUpNotice(x,y,card.isAscension?`${card.icon} ASCENSÃO: ${card.name}!`:`${card.icon} ${card.name}!`,0);}catch(_){}
particles(x,y,card.isAscension?'#fff1a8':RARITY_META[card.rarity]?.color||'#ffd35a',card.isAscension?42:24,card.isAscension?130:95);
if(selectedCardElement)selectedCardElement.classList.add('confirmed');selectedCardOffer=null;selectedCardElement=null;
if(!card.isAscension&&deityOwnedCount(card.deityId)>=3&&!deityHasAscension(card.deityId))pendingAscensionDeity=card.deityId;
setTimeout(()=>{
if(pendingAscensionDeity){const deityId=pendingAscensionDeity;pendingAscensionDeity=null;document?.getElementById?.('card-screen')?.classList.remove('open');const offers=global.rollAscensionOffer(deityId);if(offers.length){openDeityIntro(deityId,offers);return;}}
try{closeCardOffer();}catch(_){}
},260);
};
applyDeityBoon=function(pl,card){
if(!pl||!card)return;const e=effect(pl);e.boons=e.boons||{};e.ascensions=e.ascensions||{};e.lastDamageAt=e.lastDamageAt||now();e.lastDashAt=e.lastDashAt||0;e.waveDamageTaken=e.waveDamageTaken||0;
if(card.isAscension){e.ascensions[card.id]=card;if(card.id==='sauron_asc_one_ring')changeMaxHp(pl,-pl.maxHp*(card.hpPenalty||.15),false);return;}
e.boons[card.id]=card;
if(card.id==='hecate_forbidden'||card.id==='sauron_corruption')changeMaxHp(pl,-pl.maxHp*penaltyAmp(pl,bv(card,'hpPenalty')),false);
if(card.id==='moros_omen'){e.rarityBoost=(e.rarityBoost||0)+bv(card);if(card.rarityIndex===4)e.omenGuarantee=(e.omenGuarantee||0)+1;}
if(card.id==='moros_delayed_fate')e.morosFatalReady=true;
};
global.applyDeityBoon=applyDeityBoon;
function addTempBuff(pl,type,value,ms){
const e=effect(pl);e.tempBuffs=e.tempBuffs||[];const duration=ms*(1+bv(boon(pl,'dionisio_double_toast')));e.tempBuffs.push({type,value,baseMs:ms,until:now()+duration,renewed:false});
}
function activeTempBuffs(pl){const t=now();return (effect(pl).tempBuffs||[]).filter(buff=>buff.until>t);}
function addHeroicMark(pl,label){
if(!hasAsc(pl,'hercules_asc_thirteenth_labor'))return;const e=effect(pl),asc=ascension(pl,'hercules_asc_thirteenth_labor'),max=asc.max||12;if((e.heroicMarks||0)>=max)return;
e.heroicMarks=(e.heroicMarks||0)+1;changeMaxHp(pl,pl.maxHp*(asc.hp||.01),true);notice(pl,`★ TRABALHO ${e.heroicMarks}/${max}: ${label}`);
}
function attackSpeedBonus(pl,weapon){
const e=effect(pl),t=now(),hp=hpRatio(pl);let bonus=0;
const rampage=boon(pl,'ares_rampage');if(rampage&&t<(e.aresRampageUntil||0))bonus+=bv(rampage,'attack');
const flow=boon(pl,'hermes_flow');if(flow&&t<(e.hermesFlowUntil||0))bonus+=bv(flow,'attack');
const tide=boon(pl,'poseidon_tide');if(tide&&e.poseidonTide>=bv(tide,'max'))bonus+=.12+(tide.rarityIndex*.025);
const berserk=boon(pl,'hercules_berserk');if(berserk&&hp<(berserk.threshold||.30))bonus+=bv(berserk)*.45;
if(hasAsc(pl,'dionisio_asc_endless_party')){const types=new Set(activeTempBuffs(pl).map(buff=>buff.type));if(types.has('attack')&&types.has('damage')&&types.has('speed'))bonus+=.15;}
for(const buff of activeTempBuffs(pl))if(buff.type==='attack')bonus+=buff.value;
const reinforce=boon(pl,'hefesto_temper');if(reinforce&&weapon&&e.reinforcedWeapon===weapon.type)bonus+=bv(reinforce,'attack');
return blessingAmp(pl,bonus);
}
function dynamicDamageBonusV4(pl,target,weapon){
const e=effect(pl),t=now(),hp=hpRatio(pl),thp=hpRatio(target),ts=target?targetState(pl,target):{};let bonus=e.attackBonus||0;
const blood=boon(pl,'ares_blood_mark');if(blood&&target)bonus+=(ts.aresBlood||0)*bv(blood);
const rampage=boon(pl,'ares_rampage');if(rampage&&t<(e.aresRampageUntil||0))bonus+=bv(rampage);
const execute=boon(pl,'ares_execution');if(execute&&target&&thp<.30)bonus+=isBossTarget(target)?bv(execute,'bossBonus'):bv(execute)*.5;
const triple=boon(pl,'hecate_triple_path');if(triple&&t<(e.hecateTripleUntil||0))bonus+=bv(triple);
const cycle=boon(pl,'selene_lunar_cycle');if(cycle){if(e.selenePhase===1)bonus+=bv(cycle);if(hasAsc(pl,'selene_asc_eternal_eclipse')&&e.selenePreviousPhase===1)bonus+=bv(cycle)*.5;}
const eclipse=boon(pl,'selene_eclipse');if(eclipse&&e.seleneEclipse)bonus+=bv(eclipse);
const stance=boon(pl,'atena_perfect_stance');if(stance)bonus+=(e.atenaStance||0)*bv(stance,'damage');
const tactical=boon(pl,'atena_tactical_mark');if(tactical&&ts.athenaBreached&&e.currentSource!==ts.athenaBreachSource)bonus+=bv(tactical);
if(hasAsc(pl,'atena_asc_strategos'))bonus+=(e.athenaMedals||0)*.03;
const flow=boon(pl,'hermes_flow');if(flow&&t<(e.hermesFlowUntil||0))bonus+=bv(flow)*.65;
for(const buff of activeTempBuffs(pl))if(buff.type==='damage')bonus+=buff.value;
if(hasAsc(pl,'dionisio_asc_endless_party')){const types=new Set(activeTempBuffs(pl).map(buff=>buff.type));if(types.has('attack')&&types.has('damage')&&types.has('speed'))bonus+=.25;}
const reinforce=boon(pl,'hefesto_temper');if(reinforce&&weapon){if(e.reinforcedWeapon===weapon.type)bonus+=bv(reinforce);else if(hasAsc(pl,'hefesto_asc_living_forge')&&e.previousReinforcedWeapon===weapon.type)bonus+=bv(reinforce)*.5;}
const prey=boon(pl,'artemis_mark_prey');if(prey&&target===e.artemisPrey)bonus+=Math.min(bv(prey,'cap'),(e.artemisPreyHits||0)*bv(prey));
const dist=boon(pl,'artemis_predator');if(dist&&target){const ideal=bv(dist,'ideal')||180;bonus+=bv(dist)*Math.min(1,distance(pl,target)/ideal);}
const weak=boon(pl,'artemis_weakpoint');if(weak&&target)bonus+=(ts.artemisWeak||0)*bv(weak);
const tide=boon(pl,'poseidon_tide');if(tide)bonus+=e.poseidonTide||0;
const labors=boon(pl,'hercules_labors');if(labors)bonus+=(e.herculesLabors||0)*bv(labors);
const trophy=boon(pl,'hercules_trophy');if(trophy&&t<(e.herculesTrophyUntil||0))bonus+=bv(trophy)*(hasAsc(pl,'hercules_asc_demigod')?1.5:1);
const berserk=boon(pl,'hercules_berserk');if(berserk&&hp<(berserk.threshold||.30))bonus+=bv(berserk);
const chain=boon(pl,'hercules_kill_chain');if(chain)bonus+=(e.herculesKillChain||0)*bv(chain);
if(e.heroicMarks)bonus+=e.heroicMarks*(ascension(pl,'hercules_asc_thirteenth_labor')?.damage||.03);
const corrupt=boon(pl,'sauron_corruption');if(corrupt)bonus+=bv(corrupt)+(e.sauronCorruptionGrowth||0);
const eye=boon(pl,'sauron_eye');if(eye&&target)bonus+=(ts.sauronEye||0)*bv(eye);
const dom=boon(pl,'sauron_domination');if(dom&&t-(e.sauronLastKill||0)<bv(dom,'window'))bonus+=(e.sauronDomination||0)*bv(dom);
const hunt=boon(pl,'nazgul_hunt');if(hunt&&target&&thp<(hunt.threshold||.35))bonus+=bv(hunt);
const fatebreak=e.morosFatebreakHits>0;if(fatebreak)bonus+=.50;
return blessingAmp(pl,bonus);
}
notifyBlessingAttack=function(pl,target,sourceDamage,weapon=null){
if(!pl)return 1;const e=effect(pl),t=now(),source=sourceKey(pl,weapon);e.currentTarget=target;e.currentWeapon=weapon;e.currentSource=source;e.attackBonus=0;e.attackCritBonus=0;e.forceCrit=false;e._usingMorosFated=false;e._usingAthenaCounter=false;e._usingHermesDash=false;e._usingNazgulDash=false;
if(target)target._blessingHpRatioBefore=hpRatio(target);
const retaliation=boon(pl,'ares_retaliation');if(retaliation&&(e.aresRetaliationCharges||0)>0){e.attackBonus+=bv(retaliation);e.aresRetaliationCharges--;}
const fated=boon(pl,'moros_fated_crit');if(fated){e.morosAttackCount=(e.morosAttackCount||0)+1;if(e.morosAttackCount>=bv(fated,'hits')){e.morosAttackCount=0;e.forceCrit=true;e._usingMorosFated=true;}}
if(e.morosFatebreakHits>0){e.forceCrit=true;e._usingFatebreak=true;}else e._usingFatebreak=false;
const counter=boon(pl,'atena_counter_dash');if(counter&&e.athenaCounterReady&&t<(e.athenaCounterUntil||0)){e.attackBonus+=e.athenaCounterReady;e._usingAthenaCounter=true;e.athenaCounterReady=0;}
const parry=boon(pl,'atena_last_parry');if(parry&&e.athenaParryReady){e.attackBonus+=e.athenaParryReady;e.athenaParryReady=0;}
const hDash=boon(pl,'hermes_dash_strike');if(hDash&&e.hermesDashReady&&t<(e.hermesDashReadyUntil||0)){e.attackBonus+=e.hermesDashReady;e.hermesDashReady=0;e._usingHermesDash=true;}
const nDash=boon(pl,'nazgul_shadow_dash');if(nDash&&e.nazgulDashReady&&t<(e.nazgulDashReadyUntil||0)){e.attackBonus+=e.nazgulDashReady;e.nazgulDashReady=0;e._usingNazgulDash=true;}
if(e.nazgulWitchCritReady){e.forceCrit=true;e.nazgulWitchCritReady=false;}
const triple=boon(pl,'hecate_triple_path');if(triple){const needed=hasAsc(pl,'hecate_asc_triple_goddess')?2:bv(triple,'sources');if(!e.hecateTripleSources||t-(e.hecateTripleSourceAt||0)>6000)e.hecateTripleSources=[];if(!e.hecateTripleSources.includes(source))e.hecateTripleSources.push(source);e.hecateTripleSourceAt=t;if(e.hecateTripleSources.length>=needed){e.hecateTripleSources=[];e.hecateTripleUntil=t+bv(triple,'duration');notice(pl,'△ TRÍPLICE PODER');}}
const forbidden=boon(pl,'hecate_forbidden');if(forbidden){e.hecateForbiddenHits=(e.hecateForbiddenHits||0)+1;if(e.hecateForbiddenHits>=bv(forbidden,'hits')){e.hecateForbiddenHits=0;e.hecateForbiddenReady=true;}}
const prey=boon(pl,'artemis_mark_prey');if(prey&&target===e.artemisPrey&&(e.artemisPreyHits||0)>=bv(prey,'hits')){e.forceCrit=true;e.artemisPreyHits=0;e._usingArtemisPreyCrit=true;}else e._usingArtemisPreyCrit=false;
const flow=boon(pl,'hermes_flow');if(flow&&e.lastFlowAction==='dash'&&t-(e.lastFlowAt||0)<1800){e.hermesFlow=Math.min(bv(flow,'max'),(e.hermesFlow||0)+1);if(e.hermesFlow>=bv(flow,'max'))e.hermesFlowUntil=t+bv(flow,'duration');}e.lastFlowAction='attack';e.lastFlowAt=t;
return 1/(1+Math.max(0,attackSpeedBonus(pl,weapon)));
};
global.notifyBlessingAttack=notifyBlessingAttack;
applyCardCrit=function(pl,baseDmg,target,weapon=null){
if(!pl)return baseDmg;const e=effect(pl);let damage=baseDmg*(1+dynamicDamageBonusV4(pl,target,weapon));
try{if(typeof getCampaignShopDamageBonus==='function')damage*=1+getCampaignShopDamageBonus(pl,target);}catch(_){}
try{if(typeof CampProgressionSystem!=='undefined'&&CampProgressionSystem?.damageBonus)damage*=1+CampProgressionSystem.damageBonus(pl,target);}catch(_){}
let chance=e.morosPity||0;try{if(typeof getCampaignShopCritBonus==='function')chance+=getCampaignShopCritBonus(pl);}catch(_){}
const didCrit=!!e.forceCrit||Math.random()<Math.max(0,chance);if(didCrit){let mult=2.5;const fated=boon(pl,'moros_fated_crit');if(e._usingMorosFated&&fated)mult+=bv(fated);damage*=mult;e.morosPity=0;if(e._usingMorosFated&&hasAsc(pl,'moros_asc_sealed_fate'))e.morosSealedProc=true;if(e._usingFatebreak)e.morosFatebreakHits=Math.max(0,(e.morosFatebreakHits||0)-1);const phantom=boon(pl,'nazgul_phantom_blade');if(phantom){e.nazgulPhantomChance=bv(phantom);e.nazgulPhantomUntil=now()+bv(phantom,'duration');pl._dashCd=Math.max(0,(pl._dashCd||0)-bv(phantom,'dashCut'));}particles(pl.x,pl.y-10,'#ffd35a',7,48);}else{const inevitable=boon(pl,'moros_inevitable');if(inevitable)e.morosPity=Math.min(bv(inevitable,'cap'),(e.morosPity||0)+bv(inevitable));}
e.forceCrit=false;e._usingMorosFated=false;e._usingFatebreak=false;pl._lastAttackWasCrit=didCrit;if(target){target._lastDamageOwner=pl;target._lastHitCrit=didCrit;}
try{if(typeof campaignModifyOutgoingDamage==='function')damage=campaignModifyOutgoingDamage(pl,target,damage);}catch(_){}
return damage;
};
function zeusProcSettings(pl,card){const avatar=hasAsc(pl,'zeus_asc_storm_avatar');return {scale:avatar?1.35:1,extra:avatar?1:0,radius:avatar?1.15:1};}
function spreadAresBlood(pl,origin){
if(!hasAsc(pl,'ares_asc_blood_banquet'))return;for(const enemy of nearestTargets(origin.x,origin.y,130,origin,3)){const st=targetState(pl,enemy);st.aresBlood=Math.min(5,(st.aresBlood||0)+2);}heal(pl,pl.maxHp*.01,origin.x,origin.y);
}
global.notifyBlessingHit=function(pl,target,damage,weapon=null){
if(!pl||!target)return;const e=effect(pl),t=now(),ts=targetState(pl,target),source=sourceKey(pl,weapon);e.lastHitDamage=damage;e.lastHitAt=t;
const chain=boon(pl,'zeus_chain_lightning');if(chain){e.zeusChainHits=(e.zeusChainHits||0)+1;if(e.zeusChainHits>=bv(chain,'hits')){const z=zeusProcSettings(pl,chain);e.zeusChainHits=hasAsc(pl,'zeus_asc_storm_avatar')?1:0;const targets=nearestTargets(target.x,target.y,bv(chain,'radius')*z.radius,target,bv(chain,'chains')+z.extra);for(const other of targets)secondaryDamage(pl,other,damage*scaledSecondary(pl,bv(chain))*z.scale,'#8fdcff','zeus-chain');particles(target.x,target.y,'#cceeff',12,75);}}
const stat=boon(pl,'zeus_static_charge');if(stat){ts.zeusStatic=(ts.zeusStatic||0)+1;if(ts.zeusStatic>=bv(stat,'hits')){ts.zeusStatic=hasAsc(pl,'zeus_asc_storm_avatar')?1:0;const z=zeusProcSettings(pl,stat);areaDamage(pl,target.x,target.y,bv(stat,'radius')*z.radius,damage*scaledSecondary(pl,bv(stat))*z.scale,'#9ddcff',null,Infinity,'zeus-static');}}
const zDash=boon(pl,'zeus_thunder_dash');if(zDash&&e.zeusDashReady){e.zeusDashReady=false;const z=zeusProcSettings(pl,zDash);areaDamage(pl,target.x,target.y,bv(zDash,'radius')*z.radius,damage*scaledSecondary(pl,bv(zDash))*z.scale,'#bfeaff',null,Infinity,'zeus-dash');}
const zMark=boon(pl,'zeus_storm_mark');if(zMark){if(pl._lastAttackWasCrit){ts.zeusStormMarked=true;}else if(ts.zeusStormMarked){ts.zeusStormMarked=false;const z=zeusProcSettings(pl,zMark);areaDamage(pl,target.x,target.y,bv(zMark,'radius')*z.radius,damage*scaledSecondary(pl,bv(zMark))*z.scale,'#d8f3ff',null,Infinity,'zeus-mark');}}
const zLow=boon(pl,'zeus_last_storm');if(zLow&&hpRatio(pl)<(zLow.threshold||.35)){e.zeusLowHits=(e.zeusLowHits||0)+1;if(e.zeusLowHits>=bv(zLow,'hits')){e.zeusLowHits=0;const z=zeusProcSettings(pl,zLow);areaDamage(pl,target.x,target.y,bv(zLow,'radius')*z.radius,damage*scaledSecondary(pl,bv(zLow))*z.scale,'#e6f7ff',null,Infinity,'zeus-last');}}
const blood=boon(pl,'ares_blood_mark');if(blood){ts.aresBlood=Math.min(bv(blood,'max'),(ts.aresBlood||0)+1);if(ts.aresBlood>=bv(blood,'max')){ts.aresBlood=0;areaDamage(pl,target.x,target.y,bv(blood,'radius'),damage*scaledSecondary(pl,bv(blood,'burst')),'#dc3848',null,Infinity,'ares-blood');spreadAresBlood(pl,target);}}
const doom=boon(pl,'ares_doom');if(doom){ts.aresDoom=(ts.aresDoom||0)+1;if(ts.aresDoom>=bv(doom,'hits')){ts.aresDoom=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(doom)),'#a8182d','ares-doom');spreadAresBlood(pl,target);}}
const execute=boon(pl,'ares_execution');if(execute&&!target.dead&&!isBossTarget(target)&&hpRatio(target)<bv(execute,'threshold')&&Math.random()<bv(execute)){secondaryDamage(pl,target,(target.hp||1)+1,'#ff475d','ares-execute');notice(pl,'☠ EXECUÇÃO');}
const hex=boon(pl,'hecate_hex');if(hex){if(ts.hecateSource&&ts.hecateSource!==source){if((ts.hecateMarks||0)>=bv(hex,'marks')){ts.hecateMarks=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(hex)),'#bd72ff','hecate-hex');const around=nearestTargets(target.x,target.y,bv(hex,'radius'),target,hasAsc(pl,'hecate_asc_endless_night')?2:0);for(const other of around){targetState(pl,other).hecateMarks=1;}}else ts.hecateMarks=(ts.hecateMarks||0)+1;}else ts.hecateMarks=Math.min(3,(ts.hecateMarks||0)+1);ts.hecateSource=source;}
const echo=boon(pl,'hecate_arcane_echo');if(echo){e.hecateEchoHits=(e.hecateEchoHits||0)+1;if(e.hecateEchoHits>=bv(echo,'hits')){e.hecateEchoHits=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(echo)),'#c98bff','hecate-echo');if(hasAsc(pl,'hecate_asc_triple_goddess'))secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(echo))*.45,'#e1b8ff','hecate-echo-2');}}
const witch=boon(pl,'hecate_witchfire');if(witch&&pl._lastAttackWasCrit){const extra=hasAsc(pl,'hecate_asc_triple_goddess')?1:0;areaDamage(pl,target.x,target.y,bv(witch,'radius'),damage*scaledSecondary(pl,bv(witch)),'#a650df',target,bv(witch,'targets')+extra,'hecate-witchfire');}
const forbidden=boon(pl,'hecate_forbidden');if(forbidden&&e.hecateForbiddenReady){e.hecateForbiddenReady=false;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(forbidden)),'#7e35a8','hecate-forbidden');if(hasAsc(pl,'hecate_asc_endless_night'))secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(forbidden))*.55,'#b063db','hecate-forbidden-2');}
const cycle=boon(pl,'selene_lunar_cycle');if(cycle&&e.selenePhase===1&&hasAsc(pl,'selene_asc_blood_moon'))areaDamage(pl,target.x,target.y,85,damage*scaledSecondary(pl,.28),'#d7ddff',target,3,'selene-blood-moon');
const thread=boon(pl,'moros_thread');if(thread){ts.morosThread=(ts.morosThread||0)+1;if(ts.morosThread>=bv(thread,'hits')){ts.morosThread=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(thread)),'#b9a5df','moros-thread');}}
if(e.morosSealedProc){e.morosSealedProc=false;e.morosPity=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,1),'#d7c8ff','moros-sealed');}
const tactical=boon(pl,'atena_tactical_mark');if(tactical){if(ts.athenaBreached&&source!==ts.athenaBreachSource){ts.athenaBreached=false;ts.athenaHits=0;particles(target.x,target.y,'#a9d5ff',10,65);}else{ts.athenaHits=(ts.athenaHits||0)+1;if(ts.athenaHits>=bv(tactical,'hits')){ts.athenaBreached=true;ts.athenaBreachSource=source;}}}
if(e._usingAthenaCounter&&hasAsc(pl,'atena_asc_absolute_aegis'))areaDamage(pl,target.x,target.y,105,damage*scaledSecondary(pl,.55),'#d6efff',target,4,'athena-counter');
const quick=boon(pl,'hermes_quicksilver');if(quick){if(t-(e.hermesDashBucketAt||0)>1000){e.hermesDashBucketAt=t;e.hermesDashBucket=0;}const max=bv(quick,'perSecond'),cut=Math.min((pl._dashMaxCd||1000)*bv(quick),Math.max(0,max-(e.hermesDashBucket||0)));pl._dashCd=Math.max(0,(pl._dashCd||0)-cut);e.hermesDashBucket=(e.hermesDashBucket||0)+cut;}
const after=boon(pl,'hermes_afterimage');if(after&&(e.hermesAfterimages||0)>0){e.hermesAfterimages--;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(after)),'#d4f7ff','hermes-afterimage');if(hasAsc(pl,'hermes_asc_afterimage_army')){const other=nearestTargets(target.x,target.y,150,target,1)[0];if(other)secondaryDamage(pl,other,damage*scaledSecondary(pl,bv(after))*.65,'#e8fbff','hermes-afterimage-chain');}}
const flowCard=boon(pl,'hermes_flow');if(flowCard&&hasAsc(pl,'hermes_asc_divine_speed')&&t<(e.hermesFlowUntil||0))pl._dashCd=Math.max(0,(pl._dashCd||0)-180);
const hang=boon(pl,'dionisio_hangover');if(hang){ts.dionHangover=(ts.dionHangover||0)+1;if(ts.dionHangover>=bv(hang,'stacks')){ts.dionHangover=0;areaDamage(pl,target.x,target.y,bv(hang,'radius'),damage*scaledSecondary(pl,bv(hang)),'#c167d8',null,Infinity,'dion-hangover');if(hasAsc(pl,'dionisio_asc_delirium'))for(const other of nearestTargets(target.x,target.y,150,target,3))targetState(pl,other).dionHangover=Math.max(targetState(pl,other).dionHangover||0,2);}}
const anvil=boon(pl,'hefesto_anvil');if(anvil){e.hefestoAnvilHits=(e.hefestoAnvilHits||0)+1;if(e.hefestoAnvilHits>=bv(anvil,'hits')){e.hefestoAnvilHits=0;areaDamage(pl,target.x,target.y,bv(anvil,'radius')*(hasAsc(pl,'hefesto_asc_vulcan_hammer')?1.3:1),damage*scaledSecondary(pl,bv(anvil)),'#ffb84f',null,Infinity,'hefesto-anvil');if(hasAsc(pl,'hefesto_asc_vulcan_hammer'))areaDamage(pl,target.x,target.y,bv(anvil,'radius')*1.45,damage*scaledSecondary(pl,bv(anvil))*.55,'#ffd28a',null,Infinity,'hefesto-anvil-2');}}
const over=boon(pl,'hefesto_overheat');if(over){if(e.hefestoHeatSource===source)e.hefestoHeat=(e.hefestoHeat||0)+1;else{e.hefestoHeatSource=source;e.hefestoHeat=1;}if(e.hefestoHeat>=bv(over,'hits')){e.hefestoHeat=0;areaDamage(pl,target.x,target.y,bv(over,'radius')*(hasAsc(pl,'hefesto_asc_vulcan_hammer')?1.3:1),damage*scaledSecondary(pl,bv(over)),'#ff7348',null,Infinity,'hefesto-overheat');if(hasAsc(pl,'hefesto_asc_vulcan_hammer'))areaDamage(pl,target.x,target.y,bv(over,'radius')*1.45,damage*scaledSecondary(pl,bv(over))*.55,'#ffad66',null,Infinity,'hefesto-overheat-2');}}
const master=boon(pl,'hefesto_masterpiece');if(master&&weapon){const slots=slotsFor(pl).filter(Boolean),best=slots.slice().sort((a,b)=>rarityRank(b.rarity)-rarityRank(a.rarity))[0],eligible=hasAsc(pl,'hefesto_asc_living_forge')||weapon===best;if(eligible){e.masterHits=e.masterHits||{};e.masterHits[source]=(e.masterHits[source]||0)+1;if(e.masterHits[source]>=bv(master,'hits')){e.masterHits[source]=0;areaDamage(pl,target.x,target.y,bv(master,'radius'),damage*scaledSecondary(pl,bv(master)),'#ffc85c',null,Infinity,'hefesto-masterpiece');}}}
const prey=boon(pl,'artemis_mark_prey');if(prey){if(!e.artemisPrey||e.artemisPrey.dead){e.artemisPrey=target;e.artemisPreyHits=0;}if(target===e.artemisPrey)e.artemisPreyHits=(e.artemisPreyHits||0)+1;}
const ric=boon(pl,'artemis_ricochet');if(ric&&pl._lastAttackWasCrit){const extra=hasAsc(pl,'artemis_asc_wild_hunt')?2:0;for(const other of nearestTargets(target.x,target.y,bv(ric,'radius'),target,bv(ric,'targets')+extra))secondaryDamage(pl,other,damage*scaledSecondary(pl,bv(ric)),'#b8ef9b','artemis-ricochet');}
const weak=boon(pl,'artemis_weakpoint');if(weak){ts.artemisWeak=(ts.artemisWeak||0)+1;if(ts.artemisWeak>=bv(weak,'hits')){ts.artemisWeak=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(weak,'burst')),'#d7f7b0','artemis-weakpoint');}}
const volley=boon(pl,'artemis_volley');if(volley&&pl._lastAttackWasCrit){e.artemisCrits=(e.artemisCrits||0)+1;if(e.artemisCrits>=bv(volley,'crits')){e.artemisCrits=0;for(const other of nearestTargets(target.x,target.y,bv(volley,'radius'),target,bv(volley,'targets')))secondaryDamage(pl,other,damage*scaledSecondary(pl,bv(volley)),'#cdeea4','artemis-volley');}}
if(hasAsc(pl,'artemis_asc_moon_arrow')&&target===e.artemisPrey){e.artemisMoonHits=(e.artemisMoonHits||0)+1;const asc=ascension(pl,'artemis_asc_moon_arrow');if(e.artemisMoonHits>=asc.hits){e.artemisMoonHits=0;for(const other of nearestTargets(target.x,target.y,280,target,asc.targets))secondaryDamage(pl,other,damage*scaledSecondary(pl,asc.mult),'#e8f4ff','artemis-moon-arrow');}}
const waveCard=boon(pl,'poseidon_wave');if(waveCard){e.poseidonWaveHits=(e.poseidonWaveHits||0)+1;if(e.poseidonWaveHits>=bv(waveCard,'hits')){e.poseidonWaveHits=0;knockWave(pl,target.x,target.y,bv(waveCard,'radius'),damage*scaledSecondary(pl,bv(waveCard)),bv(waveCard,'push'),'#63cfff',null);}}
const tideCard=boon(pl,'poseidon_tide');if(tideCard){e.poseidonTide=Math.min(bv(tideCard,'max'),(e.poseidonTide||0)+bv(tideCard));e.poseidonTideLast=t;}
const surge=boon(pl,'poseidon_surge');if(surge&&t>=(e.poseidonSurgeReadyAt||0)){const near=nearestTargets(pl.x,pl.y,160,null,20).length;if(near>=bv(surge,'near')){e.poseidonSurgeReadyAt=t+bv(surge,'cooldown');knockWave(pl,pl.x,pl.y,bv(surge,'radius'),damage*scaledSecondary(pl,bv(surge)),45,'#7ed8ff',null);}}
const slam=boon(pl,'hercules_slam');if(slam){e.herculesSlamHits=(e.herculesSlamHits||0)+1;let need=bv(slam,'hits');if(hasAsc(pl,'hercules_asc_demigod'))need=Math.max(3,Math.ceil(need*.6));if((e.heroicMarks||0)>=12)need=Math.min(need,3);if(e.herculesSlamHits>=need){e.herculesSlamHits=0;areaDamage(pl,target.x,target.y,bv(slam,'radius'),damage*scaledSecondary(pl,bv(slam)),'#f2d06b',null,Infinity,'hercules-slam');}}
const eye=boon(pl,'sauron_eye');if(eye){ts.sauronEye=(ts.sauronEye||0)+1;if(ts.sauronEye>=bv(eye,'hits')){ts.sauronEye=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(eye,'burst')),'#a53838','sauron-eye');}}
const dread=boon(pl,'sauron_dread');if(dread&&hpRatio(pl)<(dread.threshold||.5)){e.sauronDreadHits=(e.sauronDreadHits||0)+1;if(e.sauronDreadHits>=bv(dread,'hits')){e.sauronDreadHits=0;const targets=areaDamage(pl,target.x,target.y,bv(dread,'radius'),damage*scaledSecondary(pl,bv(dread)),'#832f42',null,Infinity,'sauron-dread');for(const other of targets)pushTarget(other,target.x,target.y,bv(dread,'push'));}}
const nDash=boon(pl,'nazgul_shadow_dash');if(nDash&&e._usingNazgulDash){const radius=bv(nDash,'radius')*(hasAsc(pl,'nazgul_asc_witch_king')?1.45:1);areaDamage(pl,target.x,target.y,radius,damage*scaledSecondary(pl,bv(nDash))*.45,'#78608e',target,Infinity,'nazgul-shadow');}
const roots=boon(pl,'ents_roots');if(roots&&t-(e.lastDashAt||0)>=bv(roots,'ready')){e.entRootHits=(e.entRootHits||0)+1;if(e.entRootHits>=bv(roots,'hits')){e.entRootHits=0;areaDamage(pl,target.x,target.y,bv(roots,'radius'),damage*scaledSecondary(pl,bv(roots,'lash')),'#75a95d',target,4,'ents-roots');}}
if(target.dead||(target.hp||0)<=0)global.notifyBlessingKill(pl,target,weapon);
e._usingAthenaCounter=false;e._usingHermesDash=false;e._usingNazgulDash=false;
};
global.notifyBlessingKill=function(pl,target,weapon=null){
if(!pl||!target||target._blessingKillNotified)return;target._blessingKillNotified=true;const e=effect(pl),t=now(),elite=isEliteTarget(target),boss=isBossTarget(target),base=e.lastHitDamage||pl.dmg||10;
const rampage=boon(pl,'ares_rampage');if(rampage){if(t<(e.aresRampageUntil||0)){e.aresRampageUntil+=hasAsc(pl,'ares_asc_god_of_war')?1200:450;}else{e.aresRage=(e.aresRage||0)+1;let need=bv(rampage,'stacks')-(hasAsc(pl,'ares_asc_god_of_war')?1:0);if(e.aresRage>=Math.max(3,need)){e.aresRage=0;e.aresRampageUntil=t+bv(rampage,'duration');notice(pl,'🔥 FRENESI DE GUERRA');}}}
const party=boon(pl,'dionisio_party');if(party&&Math.random()<bv(party))addTempBuff(pl,randomItem(['damage','attack','speed']),bv(party,'power'),bv(party,'duration'));
const blackout=boon(pl,'dionisio_blackout');if(blackout&&activeTempBuffs(pl).length>=bv(blackout,'needed')&&t>=(e.dionBlackoutReadyAt||0)){e.dionBlackoutReadyAt=t+2500;const mult=hasAsc(pl,'dionisio_asc_delirium')?1.35:1;areaDamage(pl,target.x,target.y,bv(blackout,'radius')*mult,base*scaledSecondary(pl,bv(blackout))*mult,'#cf78df',target,Infinity,'dion-blackout');}
const lastCall=boon(pl,'dionisio_last_call');if(lastCall&&hpRatio(pl)<(lastCall.threshold||.4)){e.dionLowKills=(e.dionLowKills||0)+1;if(e.dionLowKills>=bv(lastCall,'kills')){e.dionLowKills=0;heal(pl,pl.maxHp*bv(lastCall),target.x,target.y);addTempBuff(pl,randomItem(['damage','attack','speed']),.12,3500);notice(pl,'🍷 ÚLTIMA RODADA');}}
const used=weapon||e.currentWeapon;if(used){e.hefestoKills=e.hefestoKills||{};e.hefestoKills[used.type]=(e.hefestoKills[used.type]||0)+1;}
const shrapnel=boon(pl,'hefesto_shrapnel');if(shrapnel&&pl._lastAttackWasCrit){for(const other of nearestTargets(target.x,target.y,bv(shrapnel,'radius'),target,bv(shrapnel,'targets')))secondaryDamage(pl,other,base*scaledSecondary(pl,bv(shrapnel)),'#ffc36a','hefesto-shrapnel');}
if(e.artemisPrey===target){if(hasAsc(pl,'artemis_asc_wild_hunt')){e.artemisPrey=nearestTargets(target.x,target.y,260,target,1)[0]||null;e.artemisPreyHits=e.artemisPrey?1:0;}else{e.artemisPrey=null;e.artemisPreyHits=0;}}
const labors=boon(pl,'hercules_labors');if(labors){e.herculesWaveKills=(e.herculesWaveKills||0)+1;if(e.herculesWaveKills%bv(labors,'kills')===0)e.herculesLabors=Math.min(bv(labors,'max'),(e.herculesLabors||0)+1);}
const trophy=boon(pl,'hercules_trophy');if(trophy&&(elite||boss))e.herculesTrophyUntil=t+bv(trophy,'duration')*(boss?1.35:1)*(hasAsc(pl,'hercules_asc_demigod')?1.35:1);
if((elite||boss)&&hasAsc(pl,'hercules_asc_thirteenth_labor'))addHeroicMark(pl,boss?'CHEFE':'ELITE');
const chain=boon(pl,'hercules_kill_chain');if(chain){e.herculesKillChain=t-(e.herculesLastKill||0)<=bv(chain,'window')?Math.min(bv(chain,'stacks'),(e.herculesKillChain||0)+1):1;e.herculesLastKill=t;if(e.herculesKillChain>=bv(chain,'stacks')){areaDamage(pl,target.x,target.y,bv(chain,'radius'),base*scaledSecondary(pl,bv(chain,'burst')),'#eed477',target,Infinity,'hercules-chain');e.herculesKillChain=0;}}
const corruption=boon(pl,'sauron_corruption');if(corruption){e.sauronCorruptionKills=(e.sauronCorruptionKills||0)+1;if(e.sauronCorruptionKills>=bv(corruption,'kills')){e.sauronCorruptionKills=0;const growth=bv(corruption,'growth')*(hasAsc(pl,'sauron_asc_dark_lord')?2:1);e.sauronCorruptionGrowth=Math.min(bv(corruption,'cap'),(e.sauronCorruptionGrowth||0)+growth);}}
const domination=boon(pl,'sauron_domination');if(domination){e.sauronDomination=t-(e.sauronLastKill||0)<bv(domination,'window')?Math.min(bv(domination,'max'),(e.sauronDomination||0)+1):1;e.sauronLastKill=t;if(e.sauronDomination>=bv(domination,'max')&&hasAsc(pl,'sauron_asc_dark_lord'))areaDamage(pl,target.x,target.y,bv(domination,'radius'),base*scaledSecondary(pl,bv(domination,'burst'))*1.35,'#731f34',target,Infinity,'sauron-dark-lord');}
const terror=boon(pl,'nazgul_terror');if(terror){e.nazgulCleanKills=(e.nazgulCleanKills||0)+1;if(e.nazgulCleanKills%5===0)e.nazgulTerror=Math.min(bv(terror,'max'),(e.nazgulTerror||0)+1);}
const hunt=boon(pl,'nazgul_hunt');if(hunt&&(target._blessingHpRatioBefore??1)<(hunt.threshold||.35))pl._dashCd=Math.max(0,(pl._dashCd||0)-bv(hunt,'dashCut'));
if(hasAsc(pl,'nazgul_asc_nine')){e.nazgulNineKills=(e.nazgulNineKills||0)+1;const a=ascension(pl,'nazgul_asc_nine');if(e.nazgulNineKills>=a.kills){e.nazgulNineKills=0;for(const other of nearestTargets(pl.x,pl.y,9999,target,a.targets))secondaryDamage(pl,other,base*scaledSecondary(pl,a.mult),'#5c4a70','nazgul-nine');notice(pl,'☠ OS NOVE');}}
const seed=boon(pl,'ents_seed');if(seed){e.entSeedKills=(e.entSeedKills||0)+1;if(e.entSeedKills%bv(seed,'kills')===0&&(e.entSeedStacks||0)<bv(seed,'max')){e.entSeedStacks=(e.entSeedStacks||0)+1;const delta=changeMaxHp(pl,pl.maxHp*blessingAmp(pl,bv(seed)),true);e.entTempHp=(e.entTempHp||0)+delta;}}
if(hasAsc(pl,'zeus_asc_olympian_judgment')){e.zeusJudgmentKills=(e.zeusJudgmentKills||0)+1;const a=ascension(pl,'zeus_asc_olympian_judgment');if(e.zeusJudgmentKills>=a.kills){e.zeusJudgmentKills=0;for(const other of nearestTargets(pl.x,pl.y,9999,target,a.targets))secondaryDamage(pl,other,base*scaledSecondary(pl,a.mult),'#d9f4ff','zeus-judgment');notice(pl,'☈ JULGAMENTO DO OLIMPO');}}
if(hasAsc(pl,'atena_asc_strategos')){e.athenaCleanKills=(e.athenaCleanKills||0)+1;if(e.athenaCleanKills>=10){e.athenaCleanKills=0;e.athenaMedals=Math.min(3,(e.athenaMedals||0)+1);areaDamage(pl,target.x,target.y,120,base*scaledSecondary(pl,.45),'#cae6ff',target,4,'athena-medal');notice(pl,`♜ MEDALHA ${e.athenaMedals}/3`);}}
const harvest=boon(pl,'selene_moon_harvest');if(harvest&&e.selenePhase===1){heal(pl,pl.maxHp*bv(harvest),target.x,target.y);e.seleneBeamAt=Math.max(0,(e.seleneBeamAt||0)-bv(harvest,'cooldownCut')*(hasAsc(pl,'selene_asc_blood_moon')?1.5:1));}
if(boss&&hasAsc(pl,'moros_asc_rewrite_fate'))e.morosFatalReady=true;
};
applyCardLifesteal=function(pl,x,y){
if(!pl)return;const e=effect(pl);if(e.lifeSteal)heal(pl,e.lifeSteal,x,y);
let killed=null;try{if(typeof allTargets==='function'&&typeof enemies!=='undefined')killed=allTargets(enemies).find(target=>target&&target.dead&&target.x===x&&target.y===y);}catch(_){}
if(killed){try{if(typeof notifyCampaignShopTargetKilled==='function')notifyCampaignShopTargetKilled(pl,killed);}catch(_){}global.notifyBlessingKill(pl,killed,null);}
};
global.notifyBlessingDash=function(pl){
if(!pl)return;const e=effect(pl),t=now();e.lastDashAt=t;
const z=boon(pl,'zeus_thunder_dash');if(z)e.zeusDashReady=true;
const lunar=boon(pl,'selene_lunar_step');if(lunar)areaDamage(pl,pl.x,pl.y,bv(lunar,'radius'),(pl.dmg||10)*scaledSecondary(pl,bv(lunar)),'#d4dcff',null,Infinity,'selene-dash');
const ath=boon(pl,'atena_counter_dash');if(ath){e.athenaCounterReady=bv(ath);e.athenaCounterUntil=t+2000;}
const h=boon(pl,'hermes_dash_strike');if(h){e.hermesDashReady=bv(h);e.hermesDashReadyUntil=t+bv(h,'window');}
const after=boon(pl,'hermes_afterimage');if(after)e.hermesAfterimages=(e.hermesAfterimages||0)+bv(after,'charges')+(hasAsc(pl,'hermes_asc_afterimage_army')?2:0);
const flow=boon(pl,'hermes_flow');if(flow){if(e.lastFlowAction==='attack'&&t-(e.lastFlowAt||0)<1800){e.hermesFlow=Math.min(bv(flow,'max'),(e.hermesFlow||0)+1);if(e.hermesFlow>=bv(flow,'max'))e.hermesFlowUntil=t+bv(flow,'duration');}e.lastFlowAction='dash';e.lastFlowAt=t;if(hasAsc(pl,'hermes_asc_divine_speed')&&t<(e.hermesFlowUntil||0))e.hermesFlowUntil+=700;}
const p=boon(pl,'poseidon_riptide');if(p)knockWave(pl,pl.x,pl.y,bv(p,'radius'),(pl.dmg||10)*scaledSecondary(pl,bv(p)),bv(p,'push'),'#78d8ff',null);
const tide=boon(pl,'poseidon_tide');if(hasAsc(pl,'poseidon_asc_raging_seas')&&tide&&e.poseidonTide>=bv(tide,'max')){const waveCard=boon(pl,'poseidon_wave'),radius=waveCard?bv(waveCard,'radius'):130,push=waveCard?bv(waveCard,'push'):60;knockWave(pl,pl.x,pl.y,radius,(pl.dmg||10)*scaledSecondary(pl,.65),push,'#9ae7ff',null);}
const n=boon(pl,'nazgul_shadow_dash');if(n){e.nazgulDashReady=bv(n);e.nazgulDashReadyUntil=t+1700;}
};
global.notifyBlessingDashAvoid=function(pl){
if(!pl)return;const card=boon(pl,'atena_counter_dash');if(card){const e=effect(pl);e.athenaCounterReady=bv(card)+bv(card,'perfect');e.athenaCounterUntil=now()+2200;if(hasAsc(pl,'atena_asc_absolute_aegis')){pl.inv=true;pl.invT=Math.max(pl.invT||0,500);}}
};
global.notifyBlessingSpecial=function(){};
global.notifyBlessingDamageTaken=function(pl,amount=0){
if(!pl)return;const e=effect(pl),t=now();e.lastDamageAt=t;e.waveDamageTaken=(e.waveDamageTaken||0)+(Number(amount)||0);e.athenaCleanKills=0;e.nazgulCleanKills=0;e.nazgulTerror=Math.max(0,(e.nazgulTerror||0)-1);e.atenaStance=Math.max(0,(e.atenaStance||0)-2);
const ret=boon(pl,'ares_retaliation');if(ret)e.aresRetaliationCharges=bv(ret,'charges')+(hasAsc(pl,'ares_asc_god_of_war')?1:0);
const parry=boon(pl,'atena_last_parry');if(parry&&(Number(amount)||0)>=pl.maxHp*bv(parry,'threshold')){e.athenaParryReady=bv(parry);pl.inv=true;pl.invT=Math.max(pl.invT||0,bv(parry,'invul'));}
const res=boon(pl,'ents_resilience');if(res){if(t-(e.entDamageWindowAt||0)>3000){e.entDamageWindowAt=t;e.entDamageWindow=0;}e.entDamageWindow=(e.entDamageWindow||0)+(Number(amount)||0);if(e.entDamageWindow>=pl.maxHp*bv(res,'threshold')&&t>=(e.entResilienceReadyAt||0)){e.entResilienceUntil=t+bv(res,'duration');e.entResilienceReadyAt=t+bv(res,'cooldown');e.entDamageWindow=0;notice(pl,'❧ RESILIÊNCIA');}}
};
global.shouldBlessingDodge=function(pl){
if(!pl)return false;const card=boon(pl,'nazgul_spectral');if(!card)return false;const e=effect(pl),t=now();let chance=bv(card);const phantom=boon(pl,'nazgul_phantom_blade');if(phantom&&t<(e.nazgulPhantomUntil||0))chance+=e.nazgulPhantomChance||0;
if(Math.random()>=chance)return false;pl.inv=true;pl.invT=Math.max(pl.invT||0,220);particles(pl.x,pl.y,'#8c78a8',10,55);areaDamage(pl,pl.x,pl.y,bv(card,'radius'),(pl.dmg||10)*scaledSecondary(pl,bv(card,'pulse')),'#77628c',null,Infinity,'nazgul-dodge');if(hasAsc(pl,'nazgul_asc_witch_king'))e.nazgulWitchCritReady=true;return true;
};
global.shouldBlessingPreventDeath=function(pl){
if(!pl)return false;const card=boon(pl,'moros_delayed_fate'),e=effect(pl);if(!card||!e.morosFatalReady)return false;e.morosFatalReady=false;pl.hp=Math.max(1,Math.round(pl.maxHp*bv(card)));pl.inv=true;pl.invT=Math.max(pl.invT||0,bv(card,'invuln'));if(hasAsc(pl,'moros_asc_rewrite_fate')){e.morosFatebreakHits=3;notice(pl,'⌛ DESTINO REESCRITO');}else notice(pl,'⌛ DESTINO ADIADO');return true;
};
global.getBlessingIncomingDamageMultiplier=function(pl){
if(!pl)return 1;const e=effect(pl),t=now(),hp=hpRatio(pl);let reduction=0;
const cycle=boon(pl,'selene_lunar_cycle');if(cycle){if(e.selenePhase===2)reduction+=bv(cycle);if(hasAsc(pl,'selene_asc_eternal_eclipse')&&e.selenePreviousPhase===2)reduction+=bv(cycle)*.5;}
const eclipse=boon(pl,'selene_eclipse');if(eclipse&&e.seleneEclipse)reduction+=bv(eclipse,'defense');
const stance=boon(pl,'atena_perfect_stance');if(stance)reduction+=(e.atenaStance||0)*bv(stance);
if(hasAsc(pl,'atena_asc_strategos'))reduction+=(e.athenaMedals||0)*.025;
const trophy=boon(pl,'hercules_trophy');if(trophy&&t<(e.herculesTrophyUntil||0))reduction+=bv(trophy,'defense')*(hasAsc(pl,'hercules_asc_demigod')?1.5:1);
const aegis=boon(pl,'atena_aegis');if(aegis&&t-(e.lastDamageAt||0)>=bv(aegis,'ready')&&!e.aegisConsuming){e.aegisConsuming=true;reduction+=bv(aegis);const scale=hasAsc(pl,'atena_asc_absolute_aegis')?1.45:1;areaDamage(pl,pl.x,pl.y,bv(aegis,'radius')*scale,(pl.dmg||10)*scaledSecondary(pl,bv(aegis,'pulse'))*scale,'#d7edff',null,Infinity,'athena-aegis');setTimeout(()=>{e.aegisConsuming=false;},0);}
const berserk=boon(pl,'hercules_berserk');if(berserk&&hp<(berserk.threshold||.30))reduction+=bv(berserk,'defense');
const bark=boon(pl,'ents_bark');if(bark)reduction+=e.entBark||0;
const roots=boon(pl,'ents_roots');if(roots&&t-(e.lastDashAt||0)>=bv(roots,'ready'))reduction+=bv(roots);
const res=boon(pl,'ents_resilience');if(res&&t<(e.entResilienceUntil||0))reduction+=bv(res);
return 1-Math.min(.75,blessingAmp(pl,reduction));
};
global.updateBlessingEffects=function(pl,dt){
if(!pl)return;const e=effect(pl),t=now();
const cycle=boon(pl,'selene_lunar_cycle');if(cycle){if(e.selenePhase==null){e.selenePhase=0;e.seleneCycleAt=t;e.selenePreviousPhase=-1;}if(t-(e.seleneCycleAt||t)>=bv(cycle,'duration')){e.selenePreviousPhase=e.selenePhase;e.selenePhase=(e.selenePhase+1)%3;e.seleneCycleAt=t;if(!hasAsc(pl,'selene_asc_eternal_eclipse'))e.selenePreviousUntil=t+1800;notice(pl,['☽ LUA CRESCENTE','● LUA CHEIA','◐ LUA MINGUANTE'][e.selenePhase]);}if(!hasAsc(pl,'selene_asc_eternal_eclipse')&&t>(e.selenePreviousUntil||0))e.selenePreviousPhase=-1;}
const eclipse=boon(pl,'selene_eclipse');if(eclipse){const threshold=hasAsc(pl,'selene_asc_eternal_eclipse') ? .50 : (eclipse.threshold||.35);if(hpRatio(pl)<threshold)e.seleneEclipse=true;else if(hpRatio(pl)>threshold+.10)e.seleneEclipse=false;if(e.seleneEclipse&&t>=(e.seleneEclipsePulseAt||0)){e.seleneEclipsePulseAt=t+bv(eclipse,'cooldown');areaDamage(pl,pl.x,pl.y,120,(pl.dmg||10)*scaledSecondary(pl,bv(eclipse,'pulse')),'#8f83d8',null,Infinity,'selene-eclipse');}}
const beam=boon(pl,'selene_moonbeam');if(beam){let cd=bv(beam,'cooldown');if(hasAsc(pl,'selene_asc_blood_moon'))cd*=.5;if(t>=(e.seleneBeamAt||0)){const target=nearestTargets(pl.x,pl.y,bv(beam,'range'),null,1)[0];if(target){e.seleneBeamAt=t+cd;secondaryDamage(pl,target,(pl.dmg||10)*scaledSecondary(pl,bv(beam)),'#dce7ff','selene-beam');}}}
const stance=boon(pl,'atena_perfect_stance');if(stance&&t-(e.lastDamageAt||0)>=2000){const earned=Math.min(bv(stance,'max'),Math.floor((t-(e.lastDamageAt||t))/2000));e.atenaStance=Math.max(e.atenaStance||0,earned);}
const momentum=boon(pl,'hermes_momentum');if(momentum){if(pl.isMoving)e.hermesMomentum=Math.min(bv(momentum),(e.hermesMomentum||0)+dt*bv(momentum,'build'));else e.hermesMomentum=Math.max(0,(e.hermesMomentum||0)-dt*.18);}
if(e.hermesFlowUntil&&t>=e.hermesFlowUntil)e.hermesFlow=Math.max(0,(e.hermesFlow||0)-1);
const tide=boon(pl,'poseidon_tide');if(tide&&e.poseidonTide&&!hasAsc(pl,'poseidon_asc_raging_seas')&&t-(e.poseidonTideLast||0)>bv(tide,'decay'))e.poseidonTide=Math.max(0,e.poseidonTide-dt*.05);
e.tempBuffs=e.tempBuffs||[];for(let i=e.tempBuffs.length-1;i>=0;i--){const buff=e.tempBuffs[i];if(buff.until>t)continue;if(hasAsc(pl,'dionisio_asc_endless_party')&&!buff.renewed){buff.renewed=true;buff.until=t+buff.baseMs*(1+bv(boon(pl,'dionisio_double_toast')));continue;}e.tempBuffs.splice(i,1);}
const grove=boon(pl,'ents_grove');if(grove&&t-(e.lastDamageAt||0)>=bv(grove,'ready')&&t>=(e.entGroveAt||0)){let cd=bv(grove,'cooldown');if(hasAsc(pl,'ents_asc_awakened_forest'))cd*=.55;e.entGroveAt=t+cd;heal(pl,pl.maxHp*bv(grove));particles(pl.x,pl.y,'#7fcf78',12,80);if(hasAsc(pl,'ents_asc_awakened_forest'))areaDamage(pl,pl.x,pl.y,150,(pl.dmg||10)*scaledSecondary(pl,.65),'#82bd68',null,Infinity,'ents-grove');}
let move=e.hermesMomentum||0;const lunar=boon(pl,'selene_lunar_cycle');if(lunar){if(e.selenePhase===0)move+=bv(lunar);if(hasAsc(pl,'selene_asc_eternal_eclipse')&&e.selenePreviousPhase===0)move+=bv(lunar)*.5;}
const terror=boon(pl,'nazgul_terror');if(terror)move+=(e.nazgulTerror||0)*bv(terror);for(const buff of activeTempBuffs(pl))if(buff.type==='speed')move+=buff.value;if(hasAsc(pl,'dionisio_asc_endless_party')){const types=new Set(activeTempBuffs(pl).map(buff=>buff.type));if(types.has('attack')&&types.has('damage')&&types.has('speed'))move+=.15;}
const factor=1+blessingAmp(pl,move);pl.speed=pl.speed/(e._blessingSpeedFactor||1)*factor;e._blessingSpeedFactor=factor;
};
applyCardWaveRegen=function(){
legacyBlessingWaveRegen();for(const pl of gamePlayers()){const e=effect(pl);
const bark=boon(pl,'ents_bark');if(bark){const gain=bv(bark)*(hasAsc(pl,'ents_asc_last_shepherd')?2:1);e.entBark=Math.min(bv(bark,'cap'),(e.entBark||0)+gain);}
if(e.entTempHp){const keep=hasAsc(pl,'ents_asc_last_shepherd')?e.entTempHp*.5:0;changeMaxHp(pl,-e.entTempHp,false);if(keep>0)changeMaxHp(pl,keep,true);e.entTempHp=0;e.entSeedStacks=0;}
const temper=boon(pl,'hefesto_temper');if(temper&&e.hefestoKills){e.previousReinforcedWeapon=e.reinforcedWeapon;e.reinforcedWeapon=Object.entries(e.hefestoKills).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;}e.hefestoKills={};
if(hasAsc(pl,'hercules_asc_thirteenth_labor')&&(e.waveDamageTaken||0)===0)addHeroicMark(pl,'ONDA PERFEITA');
e.waveDamageTaken=0;e.herculesWaveKills=0;e.herculesLabors=0;e.entSeedKills=0;e.morosFatalReady=true;e.aresRage=0;e.aresRampageUntil=0;
}
};
resetCardBlessings=function(){
replaceActiveCards([]);selectedCardOffer=null;selectedCardElement=null;pendingAscensionDeity=null;for(const pl of gamePlayers())pl.cardEffects={};try{if(typeof updateBlessingsHUD==='function')updateBlessingsHUD();}catch(_){}
};
global.DEITY_BLESSINGS_V2=Object.freeze(DEITIES);
global.DEITY_BLESSING_ASCENSIONS=Object.freeze(ASCENSIONS);
global.DEITY_BLESSING_RARITIES=Object.freeze(RARITY_ORDER.map(id=>Object.freeze({id,...RARITY_META[id]})));
global.formatDeityBlessingValue=cardValueText;
global.__DEITY_BLESSING_DEBUG__={boon,ascension,bv,dynamicDamageBonusV4,attackSpeedBonus,deityOwnedCount,ascensionReadyDeity,livingTargets};
})(window);
