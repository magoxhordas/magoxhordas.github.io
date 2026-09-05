(function(global){
'use strict';
const data=global.MagoBlessingData;
if(!data)throw new Error('MagoBlessingData deve ser carregado antes do sistema de bênçãos.');
const {DEITIES,ASCENSIONS,RARITY_ORDER,RARITY_META}=data;
const DEITY_MAP=Object.fromEntries(DEITIES.map(d=>[d.id,d]));
let selectedCardOffer=null;
let selectedCardElement=null;
let pendingAscensionDeity=null;
let currentOfferIsAscension=false;
const legacyBlessingWaveRegen=typeof applyCardWaveRegen==='function'?applyCardWaveRegen:()=>{};
const legacyBlessingsHud=typeof updateBlessingsHUD==='function'?updateBlessingsHUD:()=>{};
const legacySkipCardOffer=typeof skipCardOffer==='function'?skipCardOffer:()=>{};
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
const allGamePlayers=()=>{
const list=[];
try{if(typeof player!=='undefined'&&player)list.push(player);}catch(_){}
try{if(typeof gameMode!=='undefined'&&gameMode===2&&typeof player2!=='undefined'&&player2)list.push(player2);}catch(_){}
return list.filter(Boolean);
};
const gamePlayers=()=>allGamePlayers().filter(pl=>!pl.dead);
const particles=(x,y,color,count=8,spread=48)=>{try{if(typeof spawnParts==='function')spawnParts(x,y,color,count,spread);}catch(_){} };
const notice=(pl,text)=>{try{if(typeof spawnLevelUpNotice==='function')spawnLevelUpNotice(pl?.x||320,(pl?.y||220)-30,text,pl?.idx||0);}catch(_){} };
const effect=pl=>pl.cardEffects||(pl.cardEffects={});
const boon=(pl,id)=>pl?.cardEffects?.boons?.[id]||null;
const ascension=(pl,id)=>pl?.cardEffects?.ascensions?.[id]||null;
const hasAsc=(pl,id)=>!!ascension(pl,id);
const bv=(card,key='value',fallback=0)=>rarityAt(card,key,fallback);
function changeMaxHp(pl,delta,heal=true){
if(!pl||!Number.isFinite(delta)||!delta)return 0;
const old=pl.maxHp||1,wasDead=!!pl.dead||pl.hp<=0;pl.maxHp=Math.max(1,old+delta);
if(wasDead){pl.hp=0;return pl.maxHp-old;}
if(heal&&delta>0)pl.hp=Math.min(pl.maxHp,(pl.hp||0)+delta);
else pl.hp=Math.min(pl.maxHp,Math.max(1,pl.hp||1));
return pl.maxHp-old;
}
function sourceKey(pl,weapon){
const type=weapon?.type||'';
if(type.includes('summon'))return 'summon';
if(type)return 'arsenal';
return 'basic';
}
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
return !!(target.isBoss||target.boss||target.type?.startsWith?.('boss')||target.constructor?.name?.includes?.('Boss'));
}
const ELITE_TYPES=new Set(['shield_orc','corrupt_ent','crystal_golem','demon_knight','troll','ice_golem']);
function isEliteTarget(target){return !!target&&!isBossTarget(target)&&!!(target.elite||target.isElite||target.isMiniboss||target.miniBoss||target.type?.includes?.('elite')||target.type?.includes?.('miniboss')||ELITE_TYPES.has(target.type));}
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
target._lastDamageSource='blessing';target._lastRunBlessing=label;target._runStatsAttackEventId=pl?._runAttackEventId||null;
const before=Number(target.hp)||0;
try{if(typeof target.takeDmg==='function')target.takeDmg(amount);else target.hp=Math.max(0,before-amount);}catch(_){target.hp=Math.max(0,before-amount);}
particles(target.x||pl.x,target.y||pl.y,color,6,40);
if(global.RunStats)global.RunStats.recordDamage({playerIndex:pl?.idx||0,hpBefore:before,hpAfter:Number(target.hp)||0,amount,sourceType:'blessing',sourceId:label,sourceName:'Bênçãos',targetType:isBossTarget(target)?'boss':target.type||'enemy',attackEventId:pl?._runAttackEventId||null});
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
const ring=boon(pl,'sauron_ring'),one=ascension(pl,'sauron_asc_one_ring');
return 1+(one?.amp||0)+(ring?bv(ring)*(one?1.5:1):0);
}
function blessingAmp(pl,value){return value*ringScale(pl);}
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
if(card.isAscension){
const owned=ownedIds(),synergies=(card.synergies||[]).filter(id=>owned.has(id)).length,total=(card.synergies||[]).length;
return total?`EFEITO-BASE ATIVO · sinergias atuais ${synergies}/${total}`:'EFEITO-BASE ATIVO · escolha definitiva para esta run';
}
const v=card.value,t=card.type,at=key=>bv(card,key);
if(t==='chain')return `a cada ${at('hits')} acertos · ${pct(v)} do dano · ${at('chains')} salto(s)`;
if(t==='static'||t==='doom'||t==='fateThread'||t==='anvil'||t==='overheat'||t==='masterpiece'||t==='slam')return `ativa em ${at('hits')} acertos · impacto ${pct(v)}`;
if(t==='blood')return `+${pct(v)} por marca · explosão ${pct(at('burst'))}`;
if(t==='dashProc'||t==='dashPulse'||t==='dashStrike'||t==='shadowDash'||t==='dashWave'||t==='dashCounter')return `${pct(v)} de potência após o dash`;
if(t==='critMark'||t==='critSplash'||t==='critRicochet'||t==='critVolley'||t==='shrapnel'||t==='phantom')return `+${pct(at('critChance'))} crítico · ${pct(v)} de potência no gatilho`;
if(t==='lowHpProc'||t==='eclipse'||t==='berserk'||t==='dread')return `desperta em vida baixa · potência ${pct(v)}`;
if(t==='rampage')return `${at('stacks')} cargas para Frenesi · +${pct(v)} dano`;
if(t==='execution')return `executa comuns em ${pct(at('threshold'))} · elites +${pct(at('eliteBonus'))} · chefes +${pct(at('bossBonus'))}`;
if(t==='retaliation')return `${at('charges')} golpes de Retaliação · +${pct(v)} dano`;
if(t==='forbidden')return `−${pct(at('hpPenalty'))} vida máxima · eco a cada ${at('hits')} ataques · ${pct(v)} dano`;
if(t==='hex')return `${at('marks')} marcas antes da troca · detonação ${pct(v)}`;
if(t==='echo')return `eco a cada ${at('hits')} ataques · ${pct(v)} dano`;
if(t==='triple')return `${at('sources')} fontes, incluindo dash/invocação · +${pct(v)} por ${(at('duration')/1000).toFixed(1).replace('.',',')}s`;
if(t==='phases')return `${pct(v)} de bônus conforme a fase lunar`;
if(t==='periodic')return `golpe lunar a cada ${(at('cooldown')/1000).toFixed(1).replace('.',',')}s · ${pct(v)} dano`;
if(t==='moonHarvest')return `${at('kills')*2} cargas de abate · Lua Cheia vale 2 · cura ${pct(v)}`;
if(t==='lastCall')return `abaixo de ${pct(card.threshold||.4)} · ${at('kills')} abates · cura ${pct(v)}`;
if(t==='grove')return `após ${(at('ready')/1000).toFixed(1).replace('.',',')}s ileso · cura ${pct(v)}`;
if(t==='fatedCrit')return `crítico garantido a cada ${at('hits')} ataques · +${pct(v)} crítico`;
if(t==='critPity')return `+${pct(v)} chance a cada não-crítico`;
if(t==='revive')return `1 vez/onda · retorna com ${pct(v)} da vida`;
if(t==='rarity')return `+${pct(v)} inclinação para raridades superiores`;
if(t==='aegis'||t==='stance'||t==='parry'||t==='resilience'||t==='roots'||t==='bark')return `${pct(v)} de proteção/efeito defensivo`;
if(t==='momentum')return `até +${pct(v)} movimento enquanto mantém o ritmo`;
if(t==='dashReduce')return `−${pct(v)} da recarga atual por acerto`;
if(t==='afterimage')return `pós-imagem repete ${pct(v)} do dano`;
if(t==='flow')return `+${pct(v)} movimento no Fluxo máximo`;
if(t==='buffBurst')return `${at('needed')} bônus ou ${at('fallbackKills')} abates · explosão ${pct(v)}`;
if(t==='hangover'||t==='wave'||t==='surrounded'||t==='killChain'||t==='eye'||t==='domination')return `explosão/impacto de ${pct(v)} do dano`;
if(t==='randomBuff')return `${pct(v)} chance por abate · bônus de ${pct(at('power'))}`;
if(t==='buffDuration')return `+${pct(v)} duração · brinde de ${pct(at('toastPower'))} por onda`;
if(t==='corruption')return `+${pct(v)} dano · −${pct(at('hpPenalty'))} vida · crescimento até ${pct(at('cap'))}`;
if(t==='reinforce'||t==='distance'||t==='hunt')return `até +${pct(v)} de dano no gatilho`;
if(t==='tide')return `+${pct(at('gain'))} por acerto · máximo ${pct(v)}`;
if(t==='markPrey'||t==='weakpoint'||t==='labors'||t==='terror')return `crescimento por sequência · ${pct(v)} por estágio`;
if(t==='crush')return `${at('hits')} cargas de Pressão · esmagamento ${pct(v)}`;
if(t==='ring')return `+${pct(v)} potência selecionada · −${pct(at('hpPenalty'))} vida máxima`;
if(t==='dodge')return `${pct(v)} chance de forma espectral`;
if(t==='seed')return `${at('kills')} abates por semente · +${pct(v)} vida máxima temporária`;
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
function ownedAscensionCount(){return activeCards().filter(card=>card.isAscension).length;}
function eligibleDeities(){
const owned=ownedIds();return DEITIES.filter(deity=>deityOwnedCount(deity.id)<3&&deity.boons.filter(boon=>!owned.has(boon.id)).length>=3);
}
function affinityFocusPool(deities){
const normalCount=activeCards().filter(card=>!card.isAscension).length;if(ownedAscensionCount()||normalCount<8)return [];
return deities.filter(deity=>deityOwnedCount(deity.id)===2);
}
function weightedDeityPick(deities){
const focus=affinityFocusPool(deities),pool=focus.length?focus:deities;
const weighted=pool.map(deity=>({deity,weight:[1,1.6,2.8][Math.min(2,deityOwnedCount(deity.id))]}));
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
const focused=affinityFocusPool(deities),deity=weightedDeityPick(deities),owned=ownedIds();let pool=deity.boons.filter(boon=>!owned.has(boon.id)),offers=[];
while(offers.length<Math.min(3,count,pool.length)){const index=Math.floor(Math.random()*pool.length),raw=pool.splice(index,1)[0];offers.push(materialize(deity,raw,rollCardRarity()));}
const guarantees=gamePlayers().filter(pl=>(pl.cardEffects?.omenGuarantee||0)>0);
if(guarantees.length&&offers.length&&!offers.some(card=>card.rarityIndex>=2)){offers[0]=materialize(deity,deity.boons.find(boon=>boon.id===offers[0].id),randomItem(['rara','epica','lendaria']));for(const pl of guarantees)pl.cardEffects.omenGuarantee=Math.max(0,pl.cardEffects.omenGuarantee-1);}
offers.deityId=deity.id;offers.isAscension=false;offers.affinityFocus=focused.includes(deity);return offers;
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
currentOfferIsAscension=!!offers.isAscension;
const deity=DEITY_MAP[offers.deityId||offers[0].deityId];
const label=document?.getElementById?.('card-deity-label');if(label&&deity)label.textContent=offers.isAscension?`ASCENSÃO DE ${deity.name}`:`${offers.affinityFocus?'CHAMADO DIVINO · ':''}${deity.name} — AFINIDADE ${deityOwnedCount(deity.id)}/3`;
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
skipCardOffer=function(){if(currentOfferIsAscension)return false;legacySkipCardOffer();return true;};
global.confirmCardOffer=function(){
const card=selectedCardOffer;if(!card||activeCards().some(owned=>owned.id===card.id))return;
for(const pl of allGamePlayers())applyDeityBoon(pl,card);activeCards().push(card);try{if(typeof updateBlessingsHUD==='function')updateBlessingsHUD();}catch(_){}
if(global.RunStats)global.RunStats.recordBlessing({id:card.id,name:card.name,description:card.desc,deity:card.deityId||card.god,rarity:card.rarity,ascension:!!card.isAscension,playerIndex:0});
const x=typeof W!=='undefined'?W/2:320,y=typeof H!=='undefined'?H/2-50:190;try{if(typeof spawnLevelUpNotice==='function')spawnLevelUpNotice(x,y,card.isAscension?`${card.icon} ASCENSÃO: ${card.name}!`:`${card.icon} ${card.name}!`,0);}catch(_){}
particles(x,y,card.isAscension?'#fff1a8':RARITY_META[card.rarity]?.color||'#ffd35a',card.isAscension?42:24,card.isAscension?130:95);
if(selectedCardElement)selectedCardElement.classList.add('confirmed');selectedCardOffer=null;selectedCardElement=null;
if(!card.isAscension&&deityOwnedCount(card.deityId)>=3&&!deityHasAscension(card.deityId))pendingAscensionDeity=card.deityId;
setTimeout(()=>{
if(pendingAscensionDeity){const deityId=pendingAscensionDeity;pendingAscensionDeity=null;document?.getElementById?.('card-screen')?.classList.remove('open');const offers=global.rollAscensionOffer(deityId);if(offers.length){openDeityIntro(deityId,offers);return;}}
try{closeCardOffer();}catch(_){}
},260);
};
function applyDeityBoon(pl,card){
if(!pl||!card)return false;const e=effect(pl);e.boons=e.boons||{};e.ascensions=e.ascensions||{};e.lastDamageAt=e.lastDamageAt||now();e.lastDashAt=e.lastDashAt||0;e.waveDamageTaken=e.waveDamageTaken||0;
if(card.isAscension){if(e.ascensions[card.id])return false;e.ascensions[card.id]=card;if(card.id==='sauron_asc_one_ring')changeMaxHp(pl,-pl.maxHp*(card.hpPenalty||.15),false);if(card.id==='moros_asc_rewrite_fate')e.morosFatalReady=true;return true;}
if(e.boons[card.id])return false;
e.boons[card.id]=card;
if(card.critChance)e.critChance=(e.critChance||0)+bv(card,'critChance');
if(card.id==='hecate_forbidden'||card.id==='sauron_corruption')changeMaxHp(pl,-pl.maxHp*bv(card,'hpPenalty'),false);
if(card.id==='sauron_ring')changeMaxHp(pl,-pl.maxHp*bv(card,'hpPenalty'),false);
if(card.id==='moros_omen'){e.rarityBoost=(e.rarityBoost||0)+bv(card);if(card.rarityIndex===4)e.omenGuarantee=(e.omenGuarantee||0)+1;}
if(card.id==='moros_delayed_fate')e.morosFatalReady=true;
return true;
}
global.applyDeityBoon=applyDeityBoon;
global.syncDeityBlessings=function(pl){if(!pl)return false;for(const card of activeCards())applyDeityBoon(pl,card);return true;};
function addTempBuff(pl,type,value,ms){
const e=effect(pl);e.tempBuffs=e.tempBuffs||[];const duration=ms*(1+bv(boon(pl,'dionisio_double_toast')));e.tempBuffs.push({type,value,baseMs:ms,until:now()+duration,renewed:false});
}
function activeTempBuffs(pl){const t=now();return (effect(pl).tempBuffs||[]).filter(buff=>buff.until>t);}
function advanceMoonHarvest(pl,target,credits=1){
const harvest=boon(pl,'selene_moon_harvest');if(!harvest)return false;const e=effect(pl),fullMoon=!!boon(pl,'selene_lunar_cycle')&&e.selenePhase===1;e.seleneHarvestKills=(e.seleneHarvestKills||0)+credits*(fullMoon?2:1);const needed=bv(harvest,'kills')*2;if(e.seleneHarvestKills<needed)return false;e.seleneHarvestKills-=needed;heal(pl,pl.maxHp*bv(harvest),target?.x??pl.x,target?.y??pl.y);e.seleneBeamAt=Math.max(0,(e.seleneBeamAt||0)-bv(harvest,'cooldownCut')*(hasAsc(pl,'selene_asc_blood_moon')?1.5:1));return true;
}
function tryDionBlackout(pl,target,base,credits=1,bossProgress=false){
const blackout=boon(pl,'dionisio_blackout');if(!blackout)return false;const e=effect(pl),t=now(),buffReady=activeTempBuffs(pl).length>=bv(blackout,'needed');if(!buffReady)e.dionBlackoutBuffSpent=false;e.dionBlackoutKills=(e.dionBlackoutKills||0)+credits;const fallbackReady=e.dionBlackoutKills>=bv(blackout,'fallbackKills'),primed=(buffReady&&!e.dionBlackoutBuffSpent)||fallbackReady;if(!primed||t<(e.dionBlackoutReadyAt||0))return false;e.dionBlackoutKills=0;e.dionBlackoutBuffSpent=buffReady;e.dionBlackoutReadyAt=t+2500;const mult=hasAsc(pl,'dionisio_asc_delirium')?1.35:1,damage=base*scaledSecondary(pl,bv(blackout))*mult;if(bossProgress&&!target.dead)secondaryDamage(pl,target,damage,'#cf78df','dion-blackout');areaDamage(pl,target.x,target.y,bv(blackout,'radius')*mult,damage,'#cf78df',target,Infinity,'dion-blackout');return true;
}
function addHeroicMark(pl,label){
if(!hasAsc(pl,'hercules_asc_thirteenth_labor'))return;const e=effect(pl),asc=ascension(pl,'hercules_asc_thirteenth_labor'),max=asc.max||12;if((e.heroicMarks||0)>=max)return;
e.heroicMarks=(e.heroicMarks||0)+1;changeMaxHp(pl,pl.maxHp*(asc.hp||.01),true);notice(pl,`★ TRABALHO ${e.heroicMarks}/${max}: ${label}`);
}
function attackSpeedBonus(pl,weapon){
const e=effect(pl),t=now(),hp=hpRatio(pl);let bonus=0;
const rampage=boon(pl,'ares_rampage');if(rampage&&t<(e.aresRampageUntil||0))bonus+=bv(rampage,'attack');
const warGod=ascension(pl,'ares_asc_god_of_war');if(warGod&&t<(e.aresAscUntil||0))bonus+=warGod.attack||.12;
const flow=boon(pl,'hermes_flow');if(flow&&t<(e.hermesFlowUntil||0))bonus+=bv(flow,'attack');
const divineSpeed=ascension(pl,'hermes_asc_divine_speed');if(divineSpeed&&t<(e.hermesAscFlowUntil||0))bonus+=divineSpeed.attack||.15;
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
const warGod=ascension(pl,'ares_asc_god_of_war');if(warGod&&t<(e.aresAscUntil||0))bonus+=warGod.damage||.12;
const execute=boon(pl,'ares_execution');if(execute&&target&&thp<=bv(execute,'threshold'))bonus+=isBossTarget(target)?bv(execute,'bossBonus'):isEliteTarget(target)?bv(execute,'eliteBonus'):bv(execute);
const triple=boon(pl,'hecate_triple_path');if(triple&&t<(e.hecateTripleUntil||0))bonus+=bv(triple);
const tripleAsc=ascension(pl,'hecate_asc_triple_goddess');if(tripleAsc&&t<(e.hecateAscTripleUntil||0))bonus+=tripleAsc.damage||.20;
const cycle=boon(pl,'selene_lunar_cycle');if(cycle){if(e.selenePhase===1)bonus+=bv(cycle);if(hasAsc(pl,'selene_asc_eternal_eclipse')&&e.selenePreviousPhase===1)bonus+=bv(cycle)*.5;}
const eclipse=boon(pl,'selene_eclipse');if(eclipse&&e.seleneEclipse)bonus+=bv(eclipse);
const eternal=ascension(pl,'selene_asc_eternal_eclipse');if(eternal&&hp<(eternal.threshold||.50))bonus+=eternal.damage||.15;
const stance=boon(pl,'atena_perfect_stance');if(stance)bonus+=(e.atenaStance||0)*bv(stance,'damage');
const tactical=boon(pl,'atena_tactical_mark');if(tactical&&ts.athenaBreached&&e.currentSource==='dash')bonus+=bv(tactical);
const strategist=ascension(pl,'atena_asc_strategos');if(strategist)bonus+=(e.athenaMedals||0)*(strategist.damage||.03);
const flow=boon(pl,'hermes_flow');if(flow&&t<(e.hermesFlowUntil||0))bonus+=bv(flow)*.65;
const divineSpeed=ascension(pl,'hermes_asc_divine_speed');if(divineSpeed&&t<(e.hermesAscFlowUntil||0))bonus+=divineSpeed.damage||.10;
for(const buff of activeTempBuffs(pl))if(buff.type==='damage')bonus+=buff.value;
if(hasAsc(pl,'dionisio_asc_endless_party')){const types=new Set(activeTempBuffs(pl).map(buff=>buff.type));if(types.has('attack')&&types.has('damage')&&types.has('speed'))bonus+=.25;}
const reinforce=boon(pl,'hefesto_temper');if(reinforce&&weapon){if(e.reinforcedWeapon===weapon.type)bonus+=bv(reinforce);else if(hasAsc(pl,'hefesto_asc_living_forge')&&e.previousReinforcedWeapon===weapon.type)bonus+=bv(reinforce)*.5;}
const prey=boon(pl,'artemis_mark_prey');if(prey&&target===e.artemisPrey)bonus+=Math.min(bv(prey,'cap'),(e.artemisPreyHits||0)*bv(prey));
const dist=boon(pl,'artemis_predator');if(dist&&target){const ideal=bv(dist,'ideal')||180;bonus+=bv(dist)*Math.min(1,distance(pl,target)/ideal);}
const weak=boon(pl,'artemis_weakpoint');if(weak&&target)bonus+=(ts.artemisWeak||0)*bv(weak);
const tide=boon(pl,'poseidon_tide');if(tide)bonus+=e.poseidonTide||0;
const raging=ascension(pl,'poseidon_asc_raging_seas');if(raging&&!tide)bonus+=e.poseidonAscTide||0;
const labors=boon(pl,'hercules_labors');if(labors)bonus+=(e.herculesLabors||0)*bv(labors);
const trophy=boon(pl,'hercules_trophy');if(trophy&&t<(e.herculesTrophyUntil||0))bonus+=bv(trophy)*(hasAsc(pl,'hercules_asc_demigod')?1.5:1);
const berserk=boon(pl,'hercules_berserk');if(berserk&&hp<(berserk.threshold||.30))bonus+=bv(berserk);
const chain=boon(pl,'hercules_kill_chain');if(chain&&t-(e.herculesLastKill||0)<=bv(chain,'window'))bonus+=(e.herculesKillChain||0)*bv(chain);
if(e.heroicMarks)bonus+=e.heroicMarks*(ascension(pl,'hercules_asc_thirteenth_labor')?.damage||.03);
const corrupt=boon(pl,'sauron_corruption');if(corrupt)bonus+=bv(corrupt)+(e.sauronCorruptionGrowth||0);
const eye=boon(pl,'sauron_eye');if(eye&&target)bonus+=(ts.sauronEye||0)*bv(eye);
const dom=boon(pl,'sauron_domination');if(dom&&t-(e.sauronLastKill||0)<bv(dom,'window'))bonus+=(e.sauronDomination||0)*bv(dom);
if(hasAsc(pl,'sauron_asc_dark_lord'))bonus+=e.sauronDarkGrowth||0;
const hunt=boon(pl,'nazgul_hunt');if(hunt&&target&&thp<(hunt.threshold||.35))bonus+=bv(hunt);
const fatebreak=e.morosFatebreakHits>0;if(fatebreak)bonus+=ascension(pl,'moros_asc_rewrite_fate')?.damage||.50;
return blessingAmp(pl,bonus);
}
function trackHecateSource(pl,source,t=now()){
const hasCatalyst=sources=>sources.includes('dash')||sources.includes('summon');
const e=effect(pl),triple=boon(pl,'hecate_triple_path');if(triple){
if(t<(e.hecateTripleUntil||0)){e.hecateTripleActiveSources=e.hecateTripleActiveSources||[];if(!e.hecateTripleActiveSources.includes(source)&&e.hecateTripleActiveSources.length<3){e.hecateTripleActiveSources.push(source);if(e.hecateTripleActiveSources.length===3)e.hecateTripleUntil+=1200;}}
else{const needed=bv(triple,'sources');if(!e.hecateTripleSources||t-(e.hecateTripleSourceAt||0)>6000)e.hecateTripleSources=[];if(!e.hecateTripleSources.includes(source))e.hecateTripleSources.push(source);e.hecateTripleSourceAt=t;if(e.hecateTripleSources.length>=needed&&hasCatalyst(e.hecateTripleSources)){e.hecateTripleActiveSources=[...e.hecateTripleSources];e.hecateTripleSources=[];e.hecateTripleUntil=t+bv(triple,'duration');notice(pl,'△ CAMINHOS CRUZADOS');}}}
const tripleAsc=ascension(pl,'hecate_asc_triple_goddess');if(tripleAsc&&t>=(e.hecateAscTripleUntil||0)){if(!e.hecateAscSources||t-(e.hecateAscSourceAt||0)>6000)e.hecateAscSources=[];if(!e.hecateAscSources.includes(source))e.hecateAscSources.push(source);e.hecateAscSourceAt=t;if(e.hecateAscSources.length>=tripleAsc.sources&&hasCatalyst(e.hecateAscSources)){e.hecateAscSources=[];e.hecateAscTripleUntil=t+tripleAsc.duration;notice(pl,'△ DEUSA TRÍPLICE');}}
}
function queueAttackPayload(pl,target,payload){
if(!target)return false;if(target._manualAim){const e=effect(pl);e.manualAttackPayloads=(e.manualAttackPayloads||[]).filter(item=>payload.at-item.at<=3000);e.manualAttackPayloads.push(payload);if(e.manualAttackPayloads.length>8)e.manualAttackPayloads.shift();return true;}const ts=targetState(pl,target);ts.attackPayloads=(ts.attackPayloads||[]).filter(item=>payload.at-item.at<=3000);ts.attackPayloads.push(payload);if(ts.attackPayloads.length>8)ts.attackPayloads.shift();return true;
}
function takeAttackPayload(pl,target){
if(!target)return null;const t=now(),targetQueue=targetState(pl,target).attackPayloads;if(targetQueue?.length){while(targetQueue.length&&t-targetQueue[0].at>3000)targetQueue.shift();if(targetQueue.length)return targetQueue.shift();}const manualQueue=effect(pl).manualAttackPayloads;if(!manualQueue?.length)return null;while(manualQueue.length&&t-manualQueue[0].at>3000)manualQueue.shift();return manualQueue.shift()||null;
}
function notifyBlessingAttack(pl,target,sourceDamage,weapon=null){
if(!pl)return 1;global.syncDeityBlessings?.(pl);const e=effect(pl),t=now();let source=sourceKey(pl,weapon);e.currentTarget=target;e.currentWeapon=weapon;e.currentSource=source;e.attackBonus=0;e.attackCritBonus=0;e.forceCrit=false;e._usingMorosFated=false;e._usingMorosSealed=false;e._usingAthenaCounter=false;e._usingHermesDash=false;e._usingNazgulDash=false;
if(target)target._blessingHpRatioBefore=hpRatio(target);
const retaliation=boon(pl,'ares_retaliation');if(retaliation&&(e.aresRetaliationCharges||0)>0){e.attackBonus+=bv(retaliation);e.aresRetaliationCharges--;}
const fated=boon(pl,'moros_fated_crit');if(fated){e.morosAttackCount=(e.morosAttackCount||0)+1;if(e.morosAttackCount>=bv(fated,'hits')){e.morosAttackCount=0;e.forceCrit=true;e._usingMorosFated=true;}}
const sealed=ascension(pl,'moros_asc_sealed_fate');if(sealed&&!e._usingMorosFated){e.morosSealedCount=(e.morosSealedCount||0)+1;if(e.morosSealedCount>=sealed.hits){e.morosSealedCount=0;e.forceCrit=true;e._usingMorosSealed=true;}}
if(e.morosFatebreakHits>0){e.forceCrit=true;e._usingFatebreak=true;}else e._usingFatebreak=false;
const counter=boon(pl,'atena_counter_dash');if(counter&&e.athenaCounterReady&&t<(e.athenaCounterUntil||0)){e.attackBonus+=e.athenaCounterReady;e._usingAthenaCounter=true;e.athenaCounterReady=0;}
const aegisAsc=ascension(pl,'atena_asc_absolute_aegis');if(aegisAsc&&!counter&&e.athenaCounterReady&&t<(e.athenaCounterUntil||0)){e.attackBonus+=e.athenaCounterReady;e._usingAthenaCounter=true;e.athenaCounterReady=0;}
const parry=boon(pl,'atena_last_parry');if(parry&&e.athenaParryReady){e.attackBonus+=e.athenaParryReady;e.athenaParryReady=0;}
const hDash=boon(pl,'hermes_dash_strike');if(hDash&&e.hermesDashReady&&t<(e.hermesDashReadyUntil||0)){e.attackBonus+=e.hermesDashReady;e.hermesDashReady=0;e._usingHermesDash=true;}
const nDash=boon(pl,'nazgul_shadow_dash');if(nDash&&e.nazgulDashReady&&t<(e.nazgulDashReadyUntil||0)){e.attackBonus+=e.nazgulDashReady;e.nazgulDashReady=0;e._usingNazgulDash=true;}
if(e.nazgulWitchCritReady){e.forceCrit=true;e.nazgulWitchCritReady=false;}
const usingZeusDash=!!e.zeusDashReady;if(e._usingAthenaCounter||e._usingHermesDash||e._usingNazgulDash||usingZeusDash||(e.dashActionReady&&t<(e.dashActionReadyUntil||0))){source='dash';e.dashActionReady=false;}if(usingZeusDash)e.zeusDashReady=false;e._usingZeusDash=usingZeusDash;e.currentSource=source;trackHecateSource(pl,source,t);
const forbidden=boon(pl,'hecate_forbidden');if(forbidden){e.hecateForbiddenHits=(e.hecateForbiddenHits||0)+1;if(e.hecateForbiddenHits>=bv(forbidden,'hits')){e.hecateForbiddenHits=0;e.hecateForbiddenReady=true;}}
const prey=boon(pl,'artemis_mark_prey'),wild=ascension(pl,'artemis_asc_wild_hunt');if((prey||wild)&&target===e.artemisPrey&&(e.artemisPreyHits||0)+1>=(prey?bv(prey,'hits'):wild.hits)){e.forceCrit=true;e.artemisPreyHits=0;e._usingArtemisPreyCrit=true;}else e._usingArtemisPreyCrit=false;
const demigod=ascension(pl,'hercules_asc_demigod');if(demigod&&!e.herculesDemigodReady){e.herculesDemigodAttacks=(e.herculesDemigodAttacks||0)+1;if(e.herculesDemigodAttacks>=demigod.hits){e.herculesDemigodAttacks-=demigod.hits;e.herculesDemigodReady=true;}}
const flow=boon(pl,'hermes_flow');if(flow&&e.lastFlowAction==='dash'&&t-(e.lastFlowAt||0)<1800){e.hermesFlow=Math.min(bv(flow,'max'),(e.hermesFlow||0)+1);if(e.hermesFlow>=bv(flow,'max'))e.hermesFlowUntil=t+bv(flow,'duration');}e.lastFlowAction='attack';e.lastFlowAt=t;
const divineSpeed=ascension(pl,'hermes_asc_divine_speed');if(divineSpeed&&e.lastHermesAscAction==='dash'&&t-(e.lastHermesAscAt||0)<2000){e.hermesAscFlow=Math.min(divineSpeed.max,(e.hermesAscFlow||0)+1);if(e.hermesAscFlow>=divineSpeed.max)e.hermesAscFlowUntil=t+divineSpeed.duration;}if(divineSpeed){e.lastHermesAscAction='attack';e.lastHermesAscAt=t;}
const queued=queueAttackPayload(pl,target,{at:t,source,attackBonus:e.attackBonus||0,forceCrit:!!e.forceCrit,morosFated:!!e._usingMorosFated,morosSealed:!!e._usingMorosSealed,fatebreak:!!e._usingFatebreak,athenaCounter:!!e._usingAthenaCounter,hermesDash:!!e._usingHermesDash,nazgulDash:!!e._usingNazgulDash,zeusDash:!!e._usingZeusDash,artemisPreyCrit:!!e._usingArtemisPreyCrit});
if(queued){e.attackBonus=0;e.forceCrit=false;e._usingMorosFated=false;e._usingMorosSealed=false;e._usingFatebreak=false;e._usingAthenaCounter=false;e._usingHermesDash=false;e._usingNazgulDash=false;e._usingZeusDash=false;e._usingArtemisPreyCrit=false;}
return 1/(1+Math.max(0,attackSpeedBonus(pl,weapon)));
}
global.notifyBlessingAttack=notifyBlessingAttack;
applyCardCrit=function(pl,baseDmg,target,weapon=null){
if(!pl)return baseDmg;const e=effect(pl),payload=takeAttackPayload(pl,target);if(payload){e.currentSource=payload.source;e.attackBonus=payload.attackBonus;e.forceCrit=payload.forceCrit;e._usingMorosFated=payload.morosFated;e._usingMorosSealed=payload.morosSealed;e._usingFatebreak=payload.fatebreak;e._usingAthenaCounter=payload.athenaCounter;e._usingHermesDash=payload.hermesDash;e._usingNazgulDash=payload.nazgulDash;e._usingZeusDash=payload.zeusDash;e._usingArtemisPreyCrit=payload.artemisPreyCrit;}let damage=baseDmg*(1+dynamicDamageBonusV4(pl,target,weapon));
try{if(typeof getCampaignShopDamageBonus==='function')damage*=1+getCampaignShopDamageBonus(pl,target);}catch(_){}
try{if(typeof CampProgressionSystem!=='undefined'&&CampProgressionSystem?.damageBonus)damage*=1+CampProgressionSystem.damageBonus(pl,target);}catch(_){}
let chance=(e.critChance||0)+(e.morosPity||0);try{if(typeof getCampaignShopCritBonus==='function')chance+=getCampaignShopCritBonus(pl);}catch(_){}
const didCrit=!!e.forceCrit||Math.random()<clamp(chance,0,.95);if(didCrit){let mult=Math.max(2.5,e.critMult||0)+(e.critMultBonus||0);const fated=boon(pl,'moros_fated_crit'),sealed=ascension(pl,'moros_asc_sealed_fate');if(e._usingMorosFated&&fated)mult+=bv(fated);if(sealed&&(e._usingMorosFated||e._usingMorosSealed)){mult+=sealed.critBonus||.50;e.morosSealedProc=true;}damage*=mult;e.morosPity=0;if(e._usingFatebreak)e.morosFatebreakHits=Math.max(0,(e.morosFatebreakHits||0)-1);const phantom=boon(pl,'nazgul_phantom_blade');if(phantom){e.nazgulPhantomChance=bv(phantom);e.nazgulPhantomUntil=now()+bv(phantom,'duration');pl._dashCd=Math.max(0,(pl._dashCd||0)-bv(phantom,'dashCut'));}const witch=ascension(pl,'nazgul_asc_witch_king');if(witch)pl._dashCd=Math.max(0,(pl._dashCd||0)-(witch.dashCut||250));particles(pl.x,pl.y-10,'#ffd35a',7,48);}else{const inevitable=boon(pl,'moros_inevitable');if(inevitable)e.morosPity=Math.min(bv(inevitable,'cap'),(e.morosPity||0)+bv(inevitable));}
if(didCrit&&global.RunStats)global.RunStats.recordCritical({playerIndex:pl.idx||0,attackEventId:pl._runAttackEventId||null});
e.attackBonus=0;e.forceCrit=false;e._usingMorosFated=false;e._usingMorosSealed=false;e._usingFatebreak=false;pl._lastAttackWasCrit=didCrit;if(target){target._lastDamageOwner=pl;target._lastHitCrit=didCrit;}
try{if(typeof campaignModifyOutgoingDamage==='function')damage=campaignModifyOutgoingDamage(pl,target,damage);}catch(_){}
return damage;
};
function zeusProcSettings(pl,card){const avatar=hasAsc(pl,'zeus_asc_storm_avatar');return {scale:avatar?1.35:1,extra:avatar?1:0,radius:avatar?1.15:1};}
function spreadAresBlood(pl,origin){
if(!hasAsc(pl,'ares_asc_blood_banquet'))return;for(const enemy of nearestTargets(origin.x,origin.y,130,origin,3)){const st=targetState(pl,enemy);st.aresBlood=Math.min(5,(st.aresBlood||0)+2);}heal(pl,pl.maxHp*.01,origin.x,origin.y);
}
global.notifyBlessingHit=function(pl,target,damage,weapon=null){
if(!pl||!target)return;const e=effect(pl),t=now(),ts=targetState(pl,target),rawSource=sourceKey(pl,weapon),source=rawSource==='summon'?'summon':(e.currentSource||rawSource);e.lastHitDamage=damage;e.lastHitAt=t;
if(source==='summon')trackHecateSource(pl,source,t);
const avatar=ascension(pl,'zeus_asc_storm_avatar');if(avatar){e.zeusAscHits=(e.zeusAscHits||0)+1;if(e.zeusAscHits>=avatar.hits){e.zeusAscHits=0;for(const other of nearestTargets(target.x,target.y,avatar.radius,target,avatar.targets))secondaryDamage(pl,other,damage*scaledSecondary(pl,avatar.mult),'#bfeaff','zeus-avatar');}}
const chain=boon(pl,'zeus_chain_lightning');if(chain){e.zeusChainHits=(e.zeusChainHits||0)+1;if(e.zeusChainHits>=bv(chain,'hits')){const z=zeusProcSettings(pl,chain);e.zeusChainHits=hasAsc(pl,'zeus_asc_storm_avatar')?1:0;const targets=nearestTargets(target.x,target.y,bv(chain,'radius')*z.radius,target,bv(chain,'chains')+z.extra);for(const other of targets)secondaryDamage(pl,other,damage*scaledSecondary(pl,bv(chain))*z.scale,'#8fdcff','zeus-chain');particles(target.x,target.y,'#cceeff',12,75);}}
const stat=boon(pl,'zeus_static_charge');if(stat){ts.zeusStatic=(ts.zeusStatic||0)+1;if(ts.zeusStatic>=bv(stat,'hits')){ts.zeusStatic=hasAsc(pl,'zeus_asc_storm_avatar')?1:0;const z=zeusProcSettings(pl,stat);areaDamage(pl,target.x,target.y,bv(stat,'radius')*z.radius,damage*scaledSecondary(pl,bv(stat))*z.scale,'#9ddcff',null,Infinity,'zeus-static');}}
const zDash=boon(pl,'zeus_thunder_dash');if(zDash&&e._usingZeusDash){const z=zeusProcSettings(pl,zDash);areaDamage(pl,target.x,target.y,bv(zDash,'radius')*z.radius,damage*scaledSecondary(pl,bv(zDash))*z.scale,'#bfeaff',null,Infinity,'zeus-dash');}
const zMark=boon(pl,'zeus_storm_mark');if(zMark){if(pl._lastAttackWasCrit){ts.zeusStormMarked=true;}else if(ts.zeusStormMarked){ts.zeusStormMarked=false;const z=zeusProcSettings(pl,zMark);areaDamage(pl,target.x,target.y,bv(zMark,'radius')*z.radius,damage*scaledSecondary(pl,bv(zMark))*z.scale,'#d8f3ff',null,Infinity,'zeus-mark');}}
const zLow=boon(pl,'zeus_last_storm');if(zLow&&hpRatio(pl)<(zLow.threshold||.35)){e.zeusLowHits=(e.zeusLowHits||0)+1;if(e.zeusLowHits>=bv(zLow,'hits')){e.zeusLowHits=0;const z=zeusProcSettings(pl,zLow);areaDamage(pl,target.x,target.y,bv(zLow,'radius')*z.radius,damage*scaledSecondary(pl,bv(zLow))*z.scale,'#e6f7ff',null,Infinity,'zeus-last');}}
const blood=boon(pl,'ares_blood_mark');if(blood){ts.aresBlood=Math.min(bv(blood,'max'),(ts.aresBlood||0)+1);if(ts.aresBlood>=bv(blood,'max')){ts.aresBlood=0;areaDamage(pl,target.x,target.y,bv(blood,'radius'),damage*scaledSecondary(pl,bv(blood,'burst')),'#dc3848',null,Infinity,'ares-blood');spreadAresBlood(pl,target);}}
const banquet=ascension(pl,'ares_asc_blood_banquet');if(banquet){ts.aresBanquet=(ts.aresBanquet||0)+1;if(ts.aresBanquet>=banquet.hits){ts.aresBanquet=0;areaDamage(pl,target.x,target.y,banquet.radius,damage*scaledSecondary(pl,banquet.mult),'#e05262',null,Infinity,'ares-banquet');heal(pl,pl.maxHp*banquet.heal,target.x,target.y);}}
const doom=boon(pl,'ares_doom');if(doom){ts.aresDoom=(ts.aresDoom||0)+1;if(ts.aresDoom>=bv(doom,'hits')){ts.aresDoom=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(doom)),'#a8182d','ares-doom');spreadAresBlood(pl,target);}}
const execute=boon(pl,'ares_execution');if(execute&&!target.dead&&!isBossTarget(target)&&!isEliteTarget(target)&&hpRatio(target)<=bv(execute,'threshold')){secondaryDamage(pl,target,(target.hp||1)+1,'#ff475d','ares-execute');notice(pl,'☠ EXECUÇÃO');}
const hex=boon(pl,'hecate_hex');if(hex){if(ts.hecateSource&&ts.hecateSource!==source){if((ts.hecateMarks||0)>=bv(hex,'marks')){ts.hecateMarks=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(hex)),'#bd72ff','hecate-hex');const around=nearestTargets(target.x,target.y,bv(hex,'radius'),target,hasAsc(pl,'hecate_asc_endless_night')?2:0);for(const other of around){targetState(pl,other).hecateMarks=1;}}else ts.hecateMarks=(ts.hecateMarks||0)+1;}else ts.hecateMarks=Math.min(3,(ts.hecateMarks||0)+1);ts.hecateSource=source;}
const echo=boon(pl,'hecate_arcane_echo');if(echo){e.hecateEchoHits=(e.hecateEchoHits||0)+1;if(e.hecateEchoHits>=bv(echo,'hits')){e.hecateEchoHits=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(echo)),'#c98bff','hecate-echo');if(hasAsc(pl,'hecate_asc_triple_goddess'))secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(echo))*.45,'#e1b8ff','hecate-echo-2');}}
const witch=boon(pl,'hecate_witchfire');if(witch&&pl._lastAttackWasCrit){const extra=hasAsc(pl,'hecate_asc_triple_goddess')?1:0;areaDamage(pl,target.x,target.y,bv(witch,'radius'),damage*scaledSecondary(pl,bv(witch)),'#a650df',target,bv(witch,'targets')+extra,'hecate-witchfire');}
const forbidden=boon(pl,'hecate_forbidden');if(forbidden&&e.hecateForbiddenReady){e.hecateForbiddenReady=false;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(forbidden)),'#7e35a8','hecate-forbidden');if(hasAsc(pl,'hecate_asc_endless_night'))secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(forbidden))*.55,'#b063db','hecate-forbidden-2');}
const endlessNight=ascension(pl,'hecate_asc_endless_night');if(endlessNight){e.hecateNightHits=(e.hecateNightHits||0)+1;if(e.hecateNightHits>=endlessNight.hits){e.hecateNightHits=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,endlessNight.mult),'#9d58cb','hecate-endless-night');}}
const cycle=boon(pl,'selene_lunar_cycle');if(cycle&&e.selenePhase===1&&hasAsc(pl,'selene_asc_blood_moon'))areaDamage(pl,target.x,target.y,85,damage*scaledSecondary(pl,.28),'#d7ddff',target,3,'selene-blood-moon');
const thread=boon(pl,'moros_thread');if(thread){ts.morosThread=(ts.morosThread||0)+1;if(ts.morosThread>=bv(thread,'hits')){ts.morosThread=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(thread)),'#b9a5df','moros-thread');}}
if(e.morosSealedProc){const sealed=ascension(pl,'moros_asc_sealed_fate');e.morosSealedProc=false;e.morosPity=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,sealed?.rupture||1),'#d7c8ff','moros-sealed');}
const tactical=boon(pl,'atena_tactical_mark');if(tactical){if(ts.athenaBreached&&source==='dash'){ts.athenaBreached=false;ts.athenaHits=0;particles(target.x,target.y,'#a9d5ff',10,65);}else if(!ts.athenaBreached){ts.athenaHits=(ts.athenaHits||0)+1;if(ts.athenaHits>=bv(tactical,'hits'))ts.athenaBreached=true;}}
if(e._usingAthenaCounter&&hasAsc(pl,'atena_asc_absolute_aegis'))areaDamage(pl,target.x,target.y,105,damage*scaledSecondary(pl,.55),'#d6efff',target,4,'athena-counter');
const quick=boon(pl,'hermes_quicksilver');if(quick){if(t-(e.hermesDashBucketAt||0)>1000){e.hermesDashBucketAt=t;e.hermesDashBucket=0;}const max=bv(quick,'perSecond'),cut=Math.min((pl._dashCd||0)*bv(quick),Math.max(0,max-(e.hermesDashBucket||0)));pl._dashCd=Math.max(0,(pl._dashCd||0)-cut);e.hermesDashBucket=(e.hermesDashBucket||0)+cut;}
const after=boon(pl,'hermes_afterimage');if(after&&(e.hermesAfterimages||0)>0){e.hermesAfterimages--;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(after)),'#d4f7ff','hermes-afterimage');if(hasAsc(pl,'hermes_asc_afterimage_army')){const other=nearestTargets(target.x,target.y,150,target,1)[0];if(other)secondaryDamage(pl,other,damage*scaledSecondary(pl,bv(after))*.65,'#e8fbff','hermes-afterimage-chain');}}
const afterArmy=ascension(pl,'hermes_asc_afterimage_army');if(afterArmy&&!after&&(e.hermesAfterimages||0)>0){e.hermesAfterimages--;secondaryDamage(pl,target,damage*scaledSecondary(pl,afterArmy.mult),'#d4f7ff','hermes-afterimage-army');}
const divineSpeed=ascension(pl,'hermes_asc_divine_speed');if(divineSpeed&&t<(e.hermesAscFlowUntil||0))pl._dashCd=Math.max(0,(pl._dashCd||0)-divineSpeed.dashCut);
const hang=boon(pl,'dionisio_hangover');if(hang){ts.dionHangover=(ts.dionHangover||0)+1;if(ts.dionHangover>=bv(hang,'stacks')){ts.dionHangover=0;areaDamage(pl,target.x,target.y,bv(hang,'radius'),damage*scaledSecondary(pl,bv(hang)),'#c167d8',null,Infinity,'dion-hangover');if(hasAsc(pl,'dionisio_asc_delirium'))for(const other of nearestTargets(target.x,target.y,150,target,3))targetState(pl,other).dionHangover=Math.max(targetState(pl,other).dionHangover||0,2);}}
const delirium=ascension(pl,'dionisio_asc_delirium');if(delirium){ts.dionDelirium=(ts.dionDelirium||0)+1;if(ts.dionDelirium>=delirium.hits){ts.dionDelirium=0;areaDamage(pl,target.x,target.y,delirium.radius,damage*scaledSecondary(pl,delirium.mult),'#d783e7',null,Infinity,'dion-delirium');}}
const anvil=boon(pl,'hefesto_anvil');if(anvil){e.hefestoAnvilHits=(e.hefestoAnvilHits||0)+1;if(e.hefestoAnvilHits>=bv(anvil,'hits')){e.hefestoAnvilHits=0;areaDamage(pl,target.x,target.y,bv(anvil,'radius')*(hasAsc(pl,'hefesto_asc_vulcan_hammer')?1.3:1),damage*scaledSecondary(pl,bv(anvil)),'#ffb84f',null,Infinity,'hefesto-anvil');if(hasAsc(pl,'hefesto_asc_vulcan_hammer'))areaDamage(pl,target.x,target.y,bv(anvil,'radius')*1.45,damage*scaledSecondary(pl,bv(anvil))*.55,'#ffd28a',null,Infinity,'hefesto-anvil-2');}}
const weaponKey=weapon?.type||source;
const over=boon(pl,'hefesto_overheat');if(over){if(e.hefestoHeatSource===weaponKey)e.hefestoHeat=(e.hefestoHeat||0)+1;else{e.hefestoHeatSource=weaponKey;e.hefestoHeat=1;}if(e.hefestoHeat>=bv(over,'hits')){e.hefestoHeat=0;areaDamage(pl,target.x,target.y,bv(over,'radius')*(hasAsc(pl,'hefesto_asc_vulcan_hammer')?1.3:1),damage*scaledSecondary(pl,bv(over)),'#ff7348',null,Infinity,'hefesto-overheat');if(hasAsc(pl,'hefesto_asc_vulcan_hammer'))areaDamage(pl,target.x,target.y,bv(over,'radius')*1.45,damage*scaledSecondary(pl,bv(over))*.55,'#ffad66',null,Infinity,'hefesto-overheat-2');}}
const master=boon(pl,'hefesto_masterpiece');if(master&&weapon){const slots=slotsFor(pl).filter(Boolean),best=slots.slice().sort((a,b)=>rarityRank(b.rarity)-rarityRank(a.rarity))[0],eligible=hasAsc(pl,'hefesto_asc_living_forge')||weapon===best;if(eligible){e.masterHits=e.masterHits||{};e.masterHits[weaponKey]=(e.masterHits[weaponKey]||0)+1;if(e.masterHits[weaponKey]>=bv(master,'hits')){e.masterHits[weaponKey]=0;areaDamage(pl,target.x,target.y,bv(master,'radius'),damage*scaledSecondary(pl,bv(master)),'#ffc85c',null,Infinity,'hefesto-masterpiece');}}}
const livingForge=ascension(pl,'hefesto_asc_living_forge');if(livingForge){e.hefestoLivingHits=e.hefestoLivingHits||{};e.hefestoLivingHits[weaponKey]=(e.hefestoLivingHits[weaponKey]||0)+1;if(e.hefestoLivingHits[weaponKey]>=livingForge.hits){e.hefestoLivingHits[weaponKey]=0;areaDamage(pl,target.x,target.y,livingForge.radius,damage*scaledSecondary(pl,livingForge.mult),'#ffcf72',null,Infinity,'hefesto-living-forge');}}
const vulcan=ascension(pl,'hefesto_asc_vulcan_hammer');if(vulcan){e.hefestoVulcanHeat=(e.hefestoVulcanHeat||0)+Math.max(0,damage)/(pl.dmg||10);if(e.hefestoVulcanHeat>=vulcan.heat){e.hefestoVulcanHeat-=vulcan.heat;areaDamage(pl,target.x,target.y,vulcan.radius,(pl.dmg||10)*scaledSecondary(pl,vulcan.mult),'#ff9a52',null,Infinity,'hefesto-vulcan');}}
const prey=boon(pl,'artemis_mark_prey'),wild=ascension(pl,'artemis_asc_wild_hunt'),moonArrow=ascension(pl,'artemis_asc_moon_arrow');if(prey||wild||moonArrow){if(!e.artemisPrey||e.artemisPrey.dead){e.artemisPrey=target;e.artemisPreyHits=0;}if(target===e.artemisPrey&&!e._usingArtemisPreyCrit)e.artemisPreyHits=(e.artemisPreyHits||0)+1;}
const ric=boon(pl,'artemis_ricochet');if(ric&&pl._lastAttackWasCrit){const extra=hasAsc(pl,'artemis_asc_wild_hunt')?2:0;for(const other of nearestTargets(target.x,target.y,bv(ric,'radius'),target,bv(ric,'targets')+extra))secondaryDamage(pl,other,damage*scaledSecondary(pl,bv(ric)),'#b8ef9b','artemis-ricochet');}
const weak=boon(pl,'artemis_weakpoint');if(weak){ts.artemisWeak=(ts.artemisWeak||0)+1;if(ts.artemisWeak>=bv(weak,'hits')){ts.artemisWeak=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(weak,'burst')),'#d7f7b0','artemis-weakpoint');}}
const volley=boon(pl,'artemis_volley');if(volley&&pl._lastAttackWasCrit){e.artemisCrits=(e.artemisCrits||0)+1;if(e.artemisCrits>=bv(volley,'crits')){e.artemisCrits=0;for(const other of nearestTargets(target.x,target.y,bv(volley,'radius'),target,bv(volley,'targets')))secondaryDamage(pl,other,damage*scaledSecondary(pl,bv(volley)),'#cdeea4','artemis-volley');}}
if(hasAsc(pl,'artemis_asc_moon_arrow')&&target===e.artemisPrey){e.artemisMoonHits=(e.artemisMoonHits||0)+1;const asc=ascension(pl,'artemis_asc_moon_arrow');if(e.artemisMoonHits>=asc.hits){e.artemisMoonHits=0;for(const other of nearestTargets(target.x,target.y,280,target,asc.targets))secondaryDamage(pl,other,damage*scaledSecondary(pl,asc.mult),'#e8f4ff','artemis-moon-arrow');}}
const waveCard=boon(pl,'poseidon_wave');if(waveCard){e.poseidonWaveHits=(e.poseidonWaveHits||0)+1;if(e.poseidonWaveHits>=bv(waveCard,'hits')){e.poseidonWaveHits=0;knockWave(pl,target.x,target.y,bv(waveCard,'radius'),damage*scaledSecondary(pl,bv(waveCard)),bv(waveCard,'push'),'#63cfff',null);}}
const tsunami=ascension(pl,'poseidon_asc_tsunami');if(tsunami){e.poseidonTsunamiHits=(e.poseidonTsunamiHits||0)+1;if(e.poseidonTsunamiHits>=tsunami.hits){e.poseidonTsunamiHits=0;knockWave(pl,target.x,target.y,tsunami.radius,damage*scaledSecondary(pl,tsunami.mult),tsunami.push,'#8be3ff',null);}}
const tideCard=boon(pl,'poseidon_tide');if(tideCard){e.poseidonTide=Math.min(bv(tideCard),(e.poseidonTide||0)+bv(tideCard,'gain'));e.poseidonTideLast=t;}
const raging=ascension(pl,'poseidon_asc_raging_seas');if(raging&&!tideCard){e.poseidonAscTide=Math.min(raging.max,(e.poseidonAscTide||0)+raging.gain);e.poseidonTideLast=t;}
markPoseidonPressure(pl,target,1);
const surge=boon(pl,'poseidon_surge');if(surge&&t>=(e.poseidonSurgeReadyAt||0)){const near=nearestTargets(pl.x,pl.y,160,null,20).length;if(near>=bv(surge,'near')){e.poseidonSurgeReadyAt=t+bv(surge,'cooldown');knockWave(pl,pl.x,pl.y,bv(surge,'radius'),damage*scaledSecondary(pl,bv(surge)),45,'#7ed8ff',null);}}
const slam=boon(pl,'hercules_slam');if(slam){e.herculesSlamHits=(e.herculesSlamHits||0)+1;let need=bv(slam,'hits');if(hasAsc(pl,'hercules_asc_demigod'))need=Math.max(3,Math.ceil(need*.6));if((e.heroicMarks||0)>=12)need=Math.min(need,3);if(e.herculesSlamHits>=need){e.herculesSlamHits=0;areaDamage(pl,target.x,target.y,bv(slam,'radius'),damage*scaledSecondary(pl,bv(slam)),'#f2d06b',null,Infinity,'hercules-slam');}}
const demigod=ascension(pl,'hercules_asc_demigod');if(demigod&&e.herculesDemigodReady){e.herculesDemigodReady=false;areaDamage(pl,target.x,target.y,demigod.radius,damage*scaledSecondary(pl,demigod.mult),'#ffe083',null,Infinity,'hercules-demigod');}
const eye=boon(pl,'sauron_eye');if(eye){ts.sauronEye=(ts.sauronEye||0)+1;if(ts.sauronEye>=bv(eye,'hits')){ts.sauronEye=0;secondaryDamage(pl,target,damage*scaledSecondary(pl,bv(eye,'burst')),'#a53838','sauron-eye');}}
const dread=boon(pl,'sauron_dread');if(dread&&hpRatio(pl)<(dread.threshold||.5)){e.sauronDreadHits=(e.sauronDreadHits||0)+1;if(e.sauronDreadHits>=bv(dread,'hits')){e.sauronDreadHits=0;const targets=areaDamage(pl,target.x,target.y,bv(dread,'radius'),damage*scaledSecondary(pl,bv(dread)),'#832f42',null,Infinity,'sauron-dread');for(const other of targets)pushTarget(other,target.x,target.y,bv(dread,'push'));}}
const nDash=boon(pl,'nazgul_shadow_dash');if(nDash&&e._usingNazgulDash){const radius=bv(nDash,'radius')*(hasAsc(pl,'nazgul_asc_witch_king')?1.45:1);areaDamage(pl,target.x,target.y,radius,damage*scaledSecondary(pl,bv(nDash))*.45,'#78608e',target,Infinity,'nazgul-shadow');}
const roots=boon(pl,'ents_roots');if(roots&&t-(e.lastDashAt||0)>=bv(roots,'ready')){e.entRootHits=(e.entRootHits||0)+1;if(e.entRootHits>=bv(roots,'hits')){e.entRootHits=0;areaDamage(pl,target.x,target.y,bv(roots,'radius'),damage*scaledSecondary(pl,bv(roots,'lash')),'#75a95d',target,4,'ents-roots');}}
if(rawSource!=='summon'&&isBossTarget(target)&&target.maxHp>0){const effective=Math.min(Math.max(0,damage),target.maxHp*(target._blessingHpRatioBefore??1));ts.bossBlessingProgress=(ts.bossBlessingProgress||0)+effective/target.maxHp;const chunks=Math.floor(ts.bossBlessingProgress/.10);if(chunks>0){ts.bossBlessingProgress-=chunks*.10;advanceBossCombatProgress(pl,target,weapon,chunks*2);}}
if(target.dead||(target.hp||0)<=0)global.notifyBlessingKill(pl,target,weapon);
e._usingAthenaCounter=false;e._usingHermesDash=false;e._usingNazgulDash=false;e._usingZeusDash=false;e._usingArtemisPreyCrit=false;
};
function counterReady(e,key,amount,need){e[key]=(e[key]||0)+amount;if(e[key]<need)return false;e[key]-=need;return true;}
function advanceAscensionKillEffects(pl,target,base,amount=1,bossProgress=false){
const e=effect(pl),t=now();
const warGod=ascension(pl,'ares_asc_god_of_war');if(warGod&&counterReady(e,'aresAscKills',amount,warGod.kills)){e.aresAscUntil=t+warGod.duration;notice(pl,'⚔ DEUS DA GUERRA');}
const party=ascension(pl,'dionisio_asc_endless_party');if(party&&counterReady(e,'dionAscKills',amount,party.kills))addTempBuff(pl,randomItem(['damage','attack','speed']),party.power,party.duration);
const dark=ascension(pl,'sauron_asc_dark_lord');if(dark){e.sauronDarkGrowth=Math.min(dark.cap,(e.sauronDarkGrowth||0)+dark.growth*amount/dark.kills);if(counterReady(e,'sauronDarkKills',amount,dark.kills)){if(bossProgress&&!target.dead)secondaryDamage(pl,target,base*scaledSecondary(pl,dark.mult),'#8c263b','sauron-dark-lord');areaDamage(pl,target.x,target.y,dark.radius,base*scaledSecondary(pl,dark.mult),'#731f34',target,Infinity,'sauron-dark-lord');}}
const nine=ascension(pl,'nazgul_asc_nine');if(nine&&counterReady(e,'nazgulNineKills',amount,nine.kills)){if(bossProgress&&!target.dead)secondaryDamage(pl,target,base*scaledSecondary(pl,nine.mult),'#5c4a70','nazgul-nine');for(const other of nearestTargets(pl.x,pl.y,9999,target,nine.targets))secondaryDamage(pl,other,base*scaledSecondary(pl,nine.mult),'#5c4a70','nazgul-nine');notice(pl,'☠ OS NOVE');}
const judgment=ascension(pl,'zeus_asc_olympian_judgment');if(judgment&&counterReady(e,'zeusJudgmentKills',amount,judgment.kills)){if(bossProgress&&!target.dead)secondaryDamage(pl,target,base*scaledSecondary(pl,judgment.mult),'#d9f4ff','zeus-judgment');for(const other of nearestTargets(pl.x,pl.y,9999,target,judgment.targets))secondaryDamage(pl,other,base*scaledSecondary(pl,judgment.mult),'#d9f4ff','zeus-judgment');notice(pl,'☈ JULGAMENTO DO OLIMPO');}
const strategist=ascension(pl,'atena_asc_strategos');if(strategist&&counterReady(e,'athenaCleanKills',amount,strategist.kills)){e.athenaMedals=Math.min(strategist.max,(e.athenaMedals||0)+1);if(bossProgress&&!target.dead)secondaryDamage(pl,target,base*scaledSecondary(pl,.35),'#cae6ff','athena-medal');areaDamage(pl,target.x,target.y,120,base*scaledSecondary(pl,.45),'#cae6ff',target,4,'athena-medal');notice(pl,`♜ MEDALHA ${e.athenaMedals}/${strategist.max}`);}
}
function advanceBossCombatProgress(pl,target,weapon,amount){
const e=effect(pl),t=now(),base=e.lastHitDamage||pl.dmg||10;
advanceAscensionKillEffects(pl,target,base,amount,true);
const rampage=boon(pl,'ares_rampage');if(rampage){if(t<(e.aresRampageUntil||0))e.aresRampageUntil+=amount*300;else if(counterReady(e,'aresRage',amount,Math.max(3,bv(rampage,'stacks')-(hasAsc(pl,'ares_asc_god_of_war')?1:0)))){e.aresRampageUntil=t+bv(rampage,'duration');notice(pl,'🔥 FRENESI DE GUERRA');}}
const party=boon(pl,'dionisio_party');if(party)for(let i=0;i<amount;i++)if(Math.random()<bv(party)*.5)addTempBuff(pl,randomItem(['damage','attack','speed']),bv(party,'power'),bv(party,'duration'));
tryDionBlackout(pl,target,base,amount,true);
const lastCall=boon(pl,'dionisio_last_call');if(lastCall&&hpRatio(pl)<(lastCall.threshold||.4)&&counterReady(e,'dionLowKills',amount,bv(lastCall,'kills'))){heal(pl,pl.maxHp*bv(lastCall),target.x,target.y);addTempBuff(pl,randomItem(['damage','attack','speed']),.12,3500);notice(pl,'🍷 ÚLTIMA RODADA');}
advanceMoonHarvest(pl,target,amount);
const used=weapon||e.currentWeapon;if(used){e.hefestoKills=e.hefestoKills||{};e.hefestoKills[used.type]=(e.hefestoKills[used.type]||0)+amount;}
const labors=boon(pl,'hercules_labors');if(labors){e.herculesWaveKills=(e.herculesWaveKills||0)+amount;while(e.herculesWaveKills>=bv(labors,'kills')){e.herculesWaveKills-=bv(labors,'kills');e.herculesLabors=Math.min(bv(labors,'max'),(e.herculesLabors||0)+1);}}
const trophy=boon(pl,'hercules_trophy');if(trophy){e.herculesTrophyUntil=t+bv(trophy,'duration')*1.35*(hasAsc(pl,'hercules_asc_demigod')?1.35:1);}
const corruption=boon(pl,'sauron_corruption');if(corruption){e.sauronCorruptionKills=(e.sauronCorruptionKills||0)+amount;while(e.sauronCorruptionKills>=bv(corruption,'kills')){e.sauronCorruptionKills-=bv(corruption,'kills');const growth=bv(corruption,'growth')*(hasAsc(pl,'sauron_asc_dark_lord')?2:1);e.sauronCorruptionGrowth=Math.min(bv(corruption,'cap'),(e.sauronCorruptionGrowth||0)+growth);}}
const chain=boon(pl,'hercules_kill_chain');if(chain){if(t-(e.herculesLastKill||0)>bv(chain,'window'))e.herculesKillChain=0;e.herculesKillChain=Math.min(bv(chain,'stacks'),(e.herculesKillChain||0)+amount);e.herculesLastKill=t;if(e.herculesKillChain>=bv(chain,'stacks')){secondaryDamage(pl,target,base*scaledSecondary(pl,bv(chain,'burst')),'#eed477','hercules-chain');areaDamage(pl,target.x,target.y,bv(chain,'radius'),base*scaledSecondary(pl,bv(chain,'burst')),'#eed477',target,Infinity,'hercules-chain');e.herculesKillChain=0;}}
const domination=boon(pl,'sauron_domination');if(domination){if(t-(e.sauronLastKill||0)>=bv(domination,'window'))e.sauronDomination=0;e.sauronDomination=Math.min(bv(domination,'max'),(e.sauronDomination||0)+amount);e.sauronLastKill=t;if(e.sauronDomination>=bv(domination,'max')&&hasAsc(pl,'sauron_asc_dark_lord')){secondaryDamage(pl,target,base*scaledSecondary(pl,bv(domination,'burst'))*1.35,'#731f34','sauron-dark-lord');areaDamage(pl,target.x,target.y,bv(domination,'radius'),base*scaledSecondary(pl,bv(domination,'burst'))*1.35,'#731f34',target,Infinity,'sauron-dark-lord');}}
const terror=boon(pl,'nazgul_terror');if(terror){e.nazgulCleanKills=(e.nazgulCleanKills||0)+amount;e.nazgulTerror=Math.min(bv(terror,'max'),Math.floor(e.nazgulCleanKills/5));}
const hunt=boon(pl,'nazgul_hunt');if(hunt&&hpRatio(target)<(hunt.threshold||.35))pl._dashCd=Math.max(0,(pl._dashCd||0)-bv(hunt,'dashCut')*.25*amount);
const seed=boon(pl,'ents_seed');if(seed){e.entSeedKills=(e.entSeedKills||0)+amount;while(e.entSeedKills>=bv(seed,'kills')&&(e.entSeedStacks||0)<bv(seed,'max')){e.entSeedKills-=bv(seed,'kills');e.entSeedStacks=(e.entSeedStacks||0)+1;const delta=changeMaxHp(pl,pl.maxHp*blessingAmp(pl,bv(seed)),true);e.entTempHp=(e.entTempHp||0)+delta;}}
}
global.notifyBlessingKill=function(pl,target,weapon=null){
if(!pl||!target||target._blessingKillNotified)return;target._blessingKillNotified=true;const e=effect(pl),t=now(),elite=isEliteTarget(target),boss=isBossTarget(target),base=e.lastHitDamage||pl.dmg||10;
advanceAscensionKillEffects(pl,target,base,1,false);
const rampage=boon(pl,'ares_rampage');if(rampage){if(t<(e.aresRampageUntil||0)){e.aresRampageUntil+=hasAsc(pl,'ares_asc_god_of_war')?1200:450;}else{e.aresRage=(e.aresRage||0)+1;let need=bv(rampage,'stacks')-(hasAsc(pl,'ares_asc_god_of_war')?1:0);if(e.aresRage>=Math.max(3,need)){e.aresRage=0;e.aresRampageUntil=t+bv(rampage,'duration');notice(pl,'🔥 FRENESI DE GUERRA');}}}
const party=boon(pl,'dionisio_party');if(party&&Math.random()<bv(party))addTempBuff(pl,randomItem(['damage','attack','speed']),bv(party,'power'),bv(party,'duration'));
tryDionBlackout(pl,target,base,1,false);
const lastCall=boon(pl,'dionisio_last_call');if(lastCall&&hpRatio(pl)<(lastCall.threshold||.4)){e.dionLowKills=(e.dionLowKills||0)+1;if(e.dionLowKills>=bv(lastCall,'kills')){e.dionLowKills=0;heal(pl,pl.maxHp*bv(lastCall),target.x,target.y);addTempBuff(pl,randomItem(['damage','attack','speed']),.12,3500);notice(pl,'🍷 ÚLTIMA RODADA');}}
const used=weapon||e.currentWeapon;if(used){e.hefestoKills=e.hefestoKills||{};e.hefestoKills[used.type]=(e.hefestoKills[used.type]||0)+1;}
const shrapnel=boon(pl,'hefesto_shrapnel');if(shrapnel&&target._lastHitCrit){for(const other of nearestTargets(target.x,target.y,bv(shrapnel,'radius'),target,bv(shrapnel,'targets')))secondaryDamage(pl,other,base*scaledSecondary(pl,bv(shrapnel)),'#ffc36a','hefesto-shrapnel');}
if(e.artemisPrey===target){if(hasAsc(pl,'artemis_asc_wild_hunt')){e.artemisPrey=nearestTargets(target.x,target.y,260,target,1)[0]||null;e.artemisPreyHits=e.artemisPrey?1:0;}else{e.artemisPrey=null;e.artemisPreyHits=0;}}
const labors=boon(pl,'hercules_labors');if(labors){e.herculesWaveKills=(e.herculesWaveKills||0)+1;if(e.herculesWaveKills>=bv(labors,'kills')){e.herculesWaveKills-=bv(labors,'kills');e.herculesLabors=Math.min(bv(labors,'max'),(e.herculesLabors||0)+1);}}
const trophy=boon(pl,'hercules_trophy');if(trophy&&(elite||boss))e.herculesTrophyUntil=t+bv(trophy,'duration')*(boss?1.35:1)*(hasAsc(pl,'hercules_asc_demigod')?1.35:1);
if((elite||boss)&&hasAsc(pl,'hercules_asc_thirteenth_labor'))addHeroicMark(pl,boss?'CHEFE':'ELITE');
const chain=boon(pl,'hercules_kill_chain');if(chain){e.herculesKillChain=t-(e.herculesLastKill||0)<=bv(chain,'window')?Math.min(bv(chain,'stacks'),(e.herculesKillChain||0)+1):1;e.herculesLastKill=t;if(e.herculesKillChain>=bv(chain,'stacks')){areaDamage(pl,target.x,target.y,bv(chain,'radius'),base*scaledSecondary(pl,bv(chain,'burst')),'#eed477',target,Infinity,'hercules-chain');e.herculesKillChain=0;}}
const corruption=boon(pl,'sauron_corruption');if(corruption){e.sauronCorruptionKills=(e.sauronCorruptionKills||0)+1;if(e.sauronCorruptionKills>=bv(corruption,'kills')){e.sauronCorruptionKills=0;const growth=bv(corruption,'growth')*(hasAsc(pl,'sauron_asc_dark_lord')?2:1);e.sauronCorruptionGrowth=Math.min(bv(corruption,'cap'),(e.sauronCorruptionGrowth||0)+growth);}}
const domination=boon(pl,'sauron_domination');if(domination){e.sauronDomination=t-(e.sauronLastKill||0)<bv(domination,'window')?Math.min(bv(domination,'max'),(e.sauronDomination||0)+1):1;e.sauronLastKill=t;if(e.sauronDomination>=bv(domination,'max')&&hasAsc(pl,'sauron_asc_dark_lord'))areaDamage(pl,target.x,target.y,bv(domination,'radius'),base*scaledSecondary(pl,bv(domination,'burst'))*1.35,'#731f34',target,Infinity,'sauron-dark-lord');}
const terror=boon(pl,'nazgul_terror');if(terror){e.nazgulCleanKills=(e.nazgulCleanKills||0)+1;if(e.nazgulCleanKills%5===0)e.nazgulTerror=Math.min(bv(terror,'max'),(e.nazgulTerror||0)+1);}
const hunt=boon(pl,'nazgul_hunt');if(hunt&&(target._blessingHpRatioBefore??1)<(hunt.threshold||.35))pl._dashCd=Math.max(0,(pl._dashCd||0)-bv(hunt,'dashCut'));
const seed=boon(pl,'ents_seed');if(seed){e.entSeedKills=(e.entSeedKills||0)+1;if(e.entSeedKills>=bv(seed,'kills')&&(e.entSeedStacks||0)<bv(seed,'max')){e.entSeedKills-=bv(seed,'kills');e.entSeedStacks=(e.entSeedStacks||0)+1;const delta=changeMaxHp(pl,pl.maxHp*blessingAmp(pl,bv(seed)),true);e.entTempHp=(e.entTempHp||0)+delta;}}
advanceMoonHarvest(pl,target,1);
if(boss&&hasAsc(pl,'moros_asc_rewrite_fate'))e.morosFatalReady=true;
};
applyCardLifesteal=function(pl,x,y){
if(!pl)return;const e=effect(pl);if(e.lifeSteal)heal(pl,e.lifeSteal,x,y);
let killed=null;try{if(typeof allTargets==='function'&&typeof enemies!=='undefined')killed=allTargets(enemies).find(target=>target&&target.dead&&target.x===x&&target.y===y);}catch(_){}
if(killed){try{if(typeof notifyCampaignShopTargetKilled==='function')notifyCampaignShopTargetKilled(pl,killed);}catch(_){}global.notifyBlessingKill(pl,killed,null);}
};
global.notifyBlessingDash=function(pl){
if(!pl)return;const e=effect(pl),t=now();e.lastDashAt=t;e.dashActionReady=true;e.dashActionReadyUntil=t+1600;
const z=boon(pl,'zeus_thunder_dash');if(z)e.zeusDashReady=true;
const lunar=boon(pl,'selene_lunar_step');if(lunar)areaDamage(pl,pl.x,pl.y,bv(lunar,'radius'),(pl.dmg||10)*scaledSecondary(pl,bv(lunar)),'#d4dcff',null,Infinity,'selene-dash');
const ath=boon(pl,'atena_counter_dash'),aegisAsc=ascension(pl,'atena_asc_absolute_aegis');if(ath||aegisAsc){e.athenaCounterReady=Math.max(ath?bv(ath):0,aegisAsc?.counter||0);e.athenaCounterUntil=t+(aegisAsc?.window||2000);}
const h=boon(pl,'hermes_dash_strike');if(h){e.hermesDashReady=bv(h);e.hermesDashReadyUntil=t+bv(h,'window');}
const after=boon(pl,'hermes_afterimage'),afterArmy=ascension(pl,'hermes_asc_afterimage_army');if(after||afterArmy)e.hermesAfterimages=Math.min(6,(e.hermesAfterimages||0)+(after?bv(after,'charges'):0)+(afterArmy?.charges||0));
const flow=boon(pl,'hermes_flow');if(flow){if(e.lastFlowAction==='attack'&&t-(e.lastFlowAt||0)<1800){e.hermesFlow=Math.min(bv(flow,'max'),(e.hermesFlow||0)+1);if(e.hermesFlow>=bv(flow,'max'))e.hermesFlowUntil=t+bv(flow,'duration');}e.lastFlowAction='dash';e.lastFlowAt=t;if(hasAsc(pl,'hermes_asc_divine_speed')&&t<(e.hermesFlowUntil||0))e.hermesFlowUntil+=700;}
const divineSpeed=ascension(pl,'hermes_asc_divine_speed');if(divineSpeed){if(e.lastHermesAscAction==='attack'&&t-(e.lastHermesAscAt||0)<2000){e.hermesAscFlow=Math.min(divineSpeed.max,(e.hermesAscFlow||0)+1);if(e.hermesAscFlow>=divineSpeed.max)e.hermesAscFlowUntil=t+divineSpeed.duration;}e.lastHermesAscAction='dash';e.lastHermesAscAt=t;if(t<(e.hermesAscFlowUntil||0))e.hermesAscFlowUntil+=700;}
const p=boon(pl,'poseidon_riptide');if(p)knockWave(pl,pl.x,pl.y,bv(p,'radius'),(pl.dmg||10)*scaledSecondary(pl,bv(p)),bv(p,'push'),'#78d8ff',null);
const tide=boon(pl,'poseidon_tide'),raging=ascension(pl,'poseidon_asc_raging_seas');if(raging&&((tide&&e.poseidonTide>=bv(tide))||(!tide&&e.poseidonAscTide>=raging.max))){const waveCard=boon(pl,'poseidon_wave'),radius=waveCard?bv(waveCard,'radius'):130,push=waveCard?bv(waveCard,'push'):60;knockWave(pl,pl.x,pl.y,radius,(pl.dmg||10)*scaledSecondary(pl,raging.mult),push,'#9ae7ff',null);}
const n=boon(pl,'nazgul_shadow_dash');if(n){e.nazgulDashReady=bv(n);e.nazgulDashReadyUntil=t+1700;}
if(hasAsc(pl,'nazgul_asc_witch_king'))e.nazgulWitchCritReady=true;
};
global.notifyBlessingDashAvoid=function(pl){
if(!pl)return;const card=boon(pl,'atena_counter_dash'),aegisAsc=ascension(pl,'atena_asc_absolute_aegis');if(card||aegisAsc){const e=effect(pl);e.athenaCounterReady=(card?bv(card)+bv(card,'perfect'):aegisAsc.counter);e.athenaCounterUntil=now()+(aegisAsc?.window||2200);if(aegisAsc){pl.inv=true;pl.invT=Math.max(pl.invT||0,aegisAsc.invul||500);}}
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
if(!pl)return false;const card=boon(pl,'moros_delayed_fate'),rewrite=ascension(pl,'moros_asc_rewrite_fate'),e=effect(pl);if((!card&&!rewrite)||!e.morosFatalReady)return false;e.morosFatalReady=false;pl.hp=Math.max(1,Math.round(pl.maxHp*(card?bv(card):(rewrite.heal||.12))));pl.inv=true;pl.invT=Math.max(pl.invT||0,card?bv(card,'invuln'):900);if(rewrite){e.morosFatebreakHits=rewrite.critHits||3;notice(pl,'⌛ DESTINO REESCRITO');}else notice(pl,'⌛ DESTINO ADIADO');return true;
};
global.getBlessingIncomingDamageMultiplier=function(pl){
if(!pl)return 1;const e=effect(pl),t=now(),hp=hpRatio(pl),reductions=[],add=value=>{if(value>0)reductions.push(clamp(blessingAmp(pl,value),0,.80));};
const cycle=boon(pl,'selene_lunar_cycle');if(cycle){if(e.selenePhase===2)add(bv(cycle));if(hasAsc(pl,'selene_asc_eternal_eclipse')&&e.selenePreviousPhase===2)add(bv(cycle)*.5);}
const eclipse=boon(pl,'selene_eclipse');if(eclipse&&e.seleneEclipse)add(bv(eclipse,'defense'));
const eternal=ascension(pl,'selene_asc_eternal_eclipse');if(eternal&&hp<(eternal.threshold||.50))add(eternal.defense||.12);
const stance=boon(pl,'atena_perfect_stance');if(stance)add((e.atenaStance||0)*bv(stance));
const strategist=ascension(pl,'atena_asc_strategos');if(strategist)add((e.athenaMedals||0)*(strategist.defense||.025));
const trophy=boon(pl,'hercules_trophy');if(trophy&&t<(e.herculesTrophyUntil||0))add(bv(trophy,'defense')*(hasAsc(pl,'hercules_asc_demigod')?1.5:1));
const aegis=boon(pl,'atena_aegis');if(aegis&&t-(e.lastDamageAt||0)>=bv(aegis,'ready')&&!e.aegisConsuming){e.aegisConsuming=true;add(bv(aegis));const scale=hasAsc(pl,'atena_asc_absolute_aegis')?1.45:1;areaDamage(pl,pl.x,pl.y,bv(aegis,'radius')*scale,(pl.dmg||10)*scaledSecondary(pl,bv(aegis,'pulse'))*scale,'#d7edff',null,Infinity,'athena-aegis');setTimeout(()=>{e.aegisConsuming=false;},0);}
const berserk=boon(pl,'hercules_berserk');if(berserk&&hp<(berserk.threshold||.30))add(bv(berserk,'defense'));
const bark=boon(pl,'ents_bark');if(bark)add(e.entBark||0);
const roots=boon(pl,'ents_roots');if(roots&&t-(e.lastDashAt||0)>=bv(roots,'ready'))add(bv(roots));
const res=boon(pl,'ents_resilience');if(res&&t<(e.entResilienceUntil||0))add(bv(res));
add(e.entShepherdDefense||0);
return Math.max(.25,reductions.reduce((mult,reduction)=>mult*(1-reduction),1));
};
global.updateBlessingEffects=function(pl,dt){
if(!pl)return;global.syncDeityBlessings?.(pl);const e=effect(pl),t=now();
const toast=boon(pl,'dionisio_double_toast');if(toast&&e.dionToastPending){e.dionToastPending=false;addTempBuff(pl,randomItem(['damage','attack','speed']),bv(toast,'toastPower'),bv(toast,'toastDuration'));notice(pl,'🥂 BRINDE DUPLO');}
const cycle=boon(pl,'selene_lunar_cycle');if(cycle){if(e.selenePhase==null){e.selenePhase=0;e.seleneCycleAt=t;e.selenePreviousPhase=-1;}if(t-(e.seleneCycleAt||t)>=bv(cycle,'duration')){e.selenePreviousPhase=e.selenePhase;e.selenePhase=(e.selenePhase+1)%3;e.seleneCycleAt=t;if(!hasAsc(pl,'selene_asc_eternal_eclipse'))e.selenePreviousUntil=t+1800;notice(pl,['☽ LUA CRESCENTE','● LUA CHEIA','◐ LUA MINGUANTE'][e.selenePhase]);}if(!hasAsc(pl,'selene_asc_eternal_eclipse')&&t>(e.selenePreviousUntil||0))e.selenePreviousPhase=-1;}
const eclipse=boon(pl,'selene_eclipse');if(eclipse){const threshold=hasAsc(pl,'selene_asc_eternal_eclipse') ? .50 : (eclipse.threshold||.35);if(hpRatio(pl)<threshold)e.seleneEclipse=true;else if(hpRatio(pl)>threshold+.10)e.seleneEclipse=false;if(e.seleneEclipse&&t>=(e.seleneEclipsePulseAt||0)){e.seleneEclipsePulseAt=t+bv(eclipse,'cooldown');areaDamage(pl,pl.x,pl.y,120,(pl.dmg||10)*scaledSecondary(pl,bv(eclipse,'pulse')),'#8f83d8',null,Infinity,'selene-eclipse');}}
const beam=boon(pl,'selene_moonbeam');if(beam){let cd=bv(beam,'cooldown');if(hasAsc(pl,'selene_asc_blood_moon'))cd*=.5;if(t>=(e.seleneBeamAt||0)){const target=nearestTargets(pl.x,pl.y,bv(beam,'range'),null,1)[0];if(target){e.seleneBeamAt=t+cd;secondaryDamage(pl,target,(pl.dmg||10)*scaledSecondary(pl,bv(beam)),'#dce7ff','selene-beam');}}}
const bloodMoon=ascension(pl,'selene_asc_blood_moon');if(bloodMoon&&!beam&&t>=(e.seleneBloodMoonAt||0)){const target=nearestTargets(pl.x,pl.y,bloodMoon.range,null,1)[0];if(target){e.seleneBloodMoonAt=t+bloodMoon.cooldown;secondaryDamage(pl,target,(pl.dmg||10)*scaledSecondary(pl,bloodMoon.mult),'#f0c7d8','selene-blood-moon');}}
const stance=boon(pl,'atena_perfect_stance');if(stance&&t-(e.lastDamageAt||0)>=2000){const earned=Math.min(bv(stance,'max'),Math.floor((t-(e.lastDamageAt||t))/2000));e.atenaStance=Math.max(e.atenaStance||0,earned);}
const momentum=boon(pl,'hermes_momentum');if(momentum){if(pl.isMoving)e.hermesMomentum=Math.min(bv(momentum),(e.hermesMomentum||0)+dt*bv(momentum,'build'));else e.hermesMomentum=Math.max(0,(e.hermesMomentum||0)-dt*.18);}
if(e.hermesFlowUntil&&t>=e.hermesFlowUntil){e.hermesFlow=Math.max(0,(e.hermesFlow||0)-dt*2);if(e.hermesFlow<=0)e.hermesFlowUntil=0;}
if(e.hermesAscFlowUntil&&t>=e.hermesAscFlowUntil){e.hermesAscFlow=Math.max(0,(e.hermesAscFlow||0)-dt*2);if(e.hermesAscFlow<=0)e.hermesAscFlowUntil=0;}
const tide=boon(pl,'poseidon_tide');if(tide&&e.poseidonTide&&t-(e.poseidonTideLast||0)>bv(tide,'decay')){const ragingFull=hasAsc(pl,'poseidon_asc_raging_seas')&&e.poseidonTide>=bv(tide);if(!ragingFull)e.poseidonTide=Math.max(0,e.poseidonTide-dt*.05);}
const raging=ascension(pl,'poseidon_asc_raging_seas');if(raging&&!tide&&e.poseidonAscTide<raging.max&&t-(e.poseidonTideLast||0)>2500)e.poseidonAscTide=Math.max(0,(e.poseidonAscTide||0)-dt*.04);
e.tempBuffs=e.tempBuffs||[];for(let i=e.tempBuffs.length-1;i>=0;i--){const buff=e.tempBuffs[i];if(buff.until>t)continue;if(hasAsc(pl,'dionisio_asc_endless_party')&&!buff.renewed){buff.renewed=true;buff.until=t+buff.baseMs*(1+bv(boon(pl,'dionisio_double_toast')));continue;}e.tempBuffs.splice(i,1);}
const grove=boon(pl,'ents_grove');if(grove&&t-(e.lastDamageAt||0)>=bv(grove,'ready')&&t>=(e.entGroveAt||0)){let cd=bv(grove,'cooldown');if(hasAsc(pl,'ents_asc_awakened_forest'))cd*=.55;e.entGroveAt=t+cd;heal(pl,pl.maxHp*bv(grove));particles(pl.x,pl.y,'#7fcf78',12,80);if(hasAsc(pl,'ents_asc_awakened_forest'))areaDamage(pl,pl.x,pl.y,150,(pl.dmg||10)*scaledSecondary(pl,.65),'#82bd68',null,Infinity,'ents-grove');}
const forest=ascension(pl,'ents_asc_awakened_forest');if(forest&&!grove&&t>=(e.entForestAt||0)){e.entForestAt=t+forest.cooldown;heal(pl,pl.maxHp*forest.heal);areaDamage(pl,pl.x,pl.y,forest.radius,(pl.dmg||10)*scaledSecondary(pl,forest.mult),'#82bd68',null,Infinity,'ents-awakened-forest');particles(pl.x,pl.y,'#7fcf78',12,80);}
let move=e.hermesMomentum||0;const lunar=boon(pl,'selene_lunar_cycle');if(lunar){if(e.selenePhase===0)move+=bv(lunar);if(hasAsc(pl,'selene_asc_eternal_eclipse')&&e.selenePreviousPhase===0)move+=bv(lunar)*.5;}
const flow=boon(pl,'hermes_flow');if(flow&&t<(e.hermesFlowUntil||0))move+=bv(flow);
const divineSpeed=ascension(pl,'hermes_asc_divine_speed');if(divineSpeed&&t<(e.hermesAscFlowUntil||0))move+=divineSpeed.move||.12;
const terror=boon(pl,'nazgul_terror');if(terror)move+=(e.nazgulTerror||0)*bv(terror);for(const buff of activeTempBuffs(pl))if(buff.type==='speed')move+=buff.value;if(hasAsc(pl,'dionisio_asc_endless_party')){const types=new Set(activeTempBuffs(pl).map(buff=>buff.type));if(types.has('attack')&&types.has('damage')&&types.has('speed'))move+=.15;}
const factor=1+blessingAmp(pl,move);pl.speed=pl.speed/(e._blessingSpeedFactor||1)*factor;e._blessingSpeedFactor=factor;
};
applyCardWaveRegen=function(){
legacyBlessingWaveRegen();for(const pl of allGamePlayers()){const e=effect(pl);
const bark=boon(pl,'ents_bark');if(bark){const gain=bv(bark)*(hasAsc(pl,'ents_asc_last_shepherd')?2:1);e.entBark=Math.min(bv(bark,'cap'),(e.entBark||0)+gain);}
if(e.entTempHp){const keep=hasAsc(pl,'ents_asc_last_shepherd')?e.entTempHp*.5:0;changeMaxHp(pl,-e.entTempHp,false);if(keep>0)changeMaxHp(pl,keep,true);e.entTempHp=0;e.entSeedStacks=0;}
const shepherd=ascension(pl,'ents_asc_last_shepherd');if(shepherd&&(e.entShepherdStacks||0)*shepherd.defense<shepherd.cap){e.entShepherdStacks=(e.entShepherdStacks||0)+1;e.entShepherdDefense=Math.min(shepherd.cap,e.entShepherdStacks*shepherd.defense);changeMaxHp(pl,pl.maxHp*shepherd.waveHp,true);}
if(boon(pl,'dionisio_double_toast'))e.dionToastPending=true;
const temper=boon(pl,'hefesto_temper');if(temper&&e.hefestoKills){e.previousReinforcedWeapon=e.reinforcedWeapon;e.reinforcedWeapon=Object.entries(e.hefestoKills).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;}e.hefestoKills={};
if(!pl.dead&&hasAsc(pl,'hercules_asc_thirteenth_labor')&&(e.waveDamageTaken||0)===0)addHeroicMark(pl,'ONDA PERFEITA');
e.waveDamageTaken=0;e.herculesWaveKills=0;e.herculesLabors=0;e.entSeedKills=0;e.morosFatalReady=!!(boon(pl,'moros_delayed_fate')||hasAsc(pl,'moros_asc_rewrite_fate'));e.aresRage=0;e.aresRampageUntil=0;
}
};
resetCardBlessings=function(){
replaceActiveCards([]);selectedCardOffer=null;selectedCardElement=null;pendingAscensionDeity=null;currentOfferIsAscension=false;for(const pl of allGamePlayers()){const factor=pl.cardEffects?._blessingSpeedFactor||1;if(factor!==1)pl.speed/=factor;pl.cardEffects={};}try{if(typeof updateBlessingsHUD==='function')updateBlessingsHUD();}catch(_){}
};
global.getBlessingAttackSpeedBonus=(pl,weapon=null)=>pl?attackSpeedBonus(pl,weapon):0;
global.getBlessingCritChance=pl=>pl?clamp((effect(pl).critChance||0)+(effect(pl).morosPity||0),0,.95):0;
global.applyBlessingSummonDamage=function(pl,target,damage,meta={}){
if(!pl||!(damage>0))return damage;global.syncDeityBlessings?.(pl);const e=effect(pl),weapon={type:`summon_${meta.weaponType||meta.type||'minion'}`};e.currentSource='summon';e.currentWeapon=weapon;e.currentTarget=target;e.attackBonus=0;e._lastAttackWasCrit=!!meta.didCrit;if(target){target._lastDamageOwner=pl;target._lastHitCrit=!!meta.didCrit;}return damage*(1+dynamicDamageBonusV4(pl,target,weapon));
};
global.notifyBlessingSummonDamageResolved=function(pl,target,damage,meta={}){
if(!pl||!target||!(damage>0))return;const weapon={type:`summon_${meta.weaponType||meta.type||'minion'}`};if(isBossTarget(target)&&target.maxHp>0){const ts=targetState(pl,target);ts.bossBlessingProgress=(ts.bossBlessingProgress||0)+Math.min(damage,target.maxHp)/target.maxHp;const chunks=Math.floor(ts.bossBlessingProgress/.10);if(chunks>0){ts.bossBlessingProgress-=chunks*.10;advanceBossCombatProgress(pl,target,weapon,chunks*2);}}if(target.dead||(target.hp||0)<=0)global.notifyBlessingKill(pl,target,weapon);
};
global.updateBlessingsHUD=function(){legacyBlessingsHud();if(typeof document==='undefined')return;const host=document.getElementById('blessings-hud');if(!host)return;[...host.children].forEach((node,index)=>{const card=activeCards()[index];if(!card)return;const count=deityOwnedCount(card.deityId),asc=activeCards().find(owned=>owned.isAscension&&owned.deityId===card.deityId),badge=document.createElement('small');badge.className='blessing-affinity-badge';badge.textContent=card.isAscension?'★':`${count}/3`;node.classList.toggle('ascension-pip',!!card.isAscension);node.title=`${card.name} — ${card.desc} · ${asc?`Ascensão: ${asc.name}`:`Afinidade ${count}/3`}`;node.appendChild(badge);});}
global.DEITY_BLESSINGS_V4=Object.freeze(DEITIES);
global.DEITY_BLESSINGS_V2=global.DEITY_BLESSINGS_V4;
global.DEITY_BLESSING_ASCENSIONS=Object.freeze(ASCENSIONS);
global.DEITY_BLESSING_RARITIES=Object.freeze(RARITY_ORDER.map(id=>Object.freeze({id,...RARITY_META[id]})));
global.formatDeityBlessingValue=(card,_value,index=card?.rarityIndex??0)=>cardValueText({...card,rarityIndex:index,value:Array.isArray(card?.values)?card.values[index]:card?.value});
global.__DEITY_BLESSING_DEBUG__={boon,ascension,bv,dynamicDamageBonusV4,attackSpeedBonus,deityOwnedCount,ascensionReadyDeity,livingTargets};
})(window);
