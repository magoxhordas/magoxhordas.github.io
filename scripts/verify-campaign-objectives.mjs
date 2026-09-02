import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const source=read('src/campaign/campaign-objectives.js');
const html=read('index.html');
const campaign=read('src/campaign/campaign-system.js');
const runtime=read('src/campaign/campaign-runtime.js');
const necromancer=read('src/classes/necromancer/necromancer-system.js');
let checks=0;
const ok=(condition,message)=>{assert.ok(condition,message);checks++;};
const close=(value,expected,epsilon=.0001,message='valor inesperado')=>{assert.ok(Math.abs(value-expected)<=epsilon,`${message}: ${value} != ${expected}`);checks++;};

const sandbox={console,Math,Date,performance:{now:()=>1000}};sandbox.window=sandbox;sandbox.globalThis=sandbox;
vm.createContext(sandbox);vm.runInContext(source,sandbox,{filename:'campaign-objectives.js'});
const {CampaignObjectives}=sandbox;
ok(CampaignObjectives,'módulo CampaignObjectives não foi publicado');
// A onda 14 saiu do mapa quando o Portao Congelado foi removido do jogo.
ok(Object.keys(CampaignObjectives.OBJECTIVE_WAVES).join(',')==='2,3,4,7,8,9,12,13,17,18,19,22,23,24','mapa canônico de objetivos foi alterado');
for(const wave of [2,3,4,7,9,13,17,22,24])ok(CampaignObjectives.OBJECTIVE_WAVES[wave].required,`onda ${wave} deveria bloquear conclusão`);
for(const wave of [8,12,18,19,23])ok(!CampaignObjectives.OBJECTIVE_WAVES[wave].required,`onda ${wave} deveria permanecer opcional/ambiental`);

function harness(){
  let currentWave=1,choice=null,hud=null,action=null,waveTimer=0,requestedEnds=0,coins=0,xp=0;
  const enemies=[];
  const players=[0,1].map(idx=>({idx,x:idx?370:270,y:360,radius:16,hp:100,maxHp:100,dead:false,speed:100,gained:0,
    gainXP(value){this.gained+=value;xp+=value;},takeDmg(value){this.hp=Math.max(0,this.hp-value);}}));
  const spawned=[];
  const deps={
    getPlayers:()=>players,getEnemies:()=>enemies,getWave:()=>currentWave,getArena:()=>currentWave>=21?'volcano':currentWave>=16?'desert':currentWave>=11?'snow':currentWave>=6?'forest':'crypt',
    isBossRush:()=>false,isDungeon:()=>false,isCampaignActive:()=>true,getObjectiveHpScale:()=>1,
    spawnEnemy(type,x,y,origin){const enemy={type,x,y,origin,hp:100,maxHp:100,speed:50,damage:10,radius:12,dead:false,takeDmg(amount){this.hp-=amount;if(this.hp<=0)this.dead=true;}};enemies.push(enemy);spawned.push(enemy);return enemy;},
    spawnParts(){},spawnNotice(){},damagePlayer:(player,amount)=>player.takeDmg(amount),
    addCoins:value=>{coins+=value;},addXp:value=>players.forEach(player=>player.gainXP(value)),addCampResource(){},
    setWaveTimer:value=>{waveTimer=value;},requestWaveEnd:()=>{requestedEnds++;},
    showChoice:value=>{choice=value;},hideChoice:()=>{choice=null;},setHud:value=>{hud=value;},setAction:value=>{action=value;},now:()=>1000,
  };
  // O mini-chefe da onda 4 agora e' o Brutamontes de verdade, que vive fora
  // do modulo (bossMajor, no index.html). Aqui ele e' um boneco: o que se
  // verifica e' que o objetivo o cria com a vida certa e so' libera a onda
  // quando ele morre.
  let miniboss=null;
  deps.spawnMiniboss=(vida,dano)=>{
    miniboss={hp:vida,maxHp:vida,damage:dano,dead:false,
              takeDmg(a){this.hp-=a;if(this.hp<=0)this.dead=true;}};
    return miniboss;
  };
  deps.getMiniboss=()=>miniboss;
  const system=CampaignObjectives.create(deps);
  return {system,players,enemies,spawned,setWave:value=>{currentWave=value;},get choice(){return choice;},get hud(){return hud;},get action(){return action;},get waveTimer(){return waveTimer;},get requestedEnds(){return requestedEnds;},get coins(){return coins;},get xp(){return xp;},getMiniboss:()=>miniboss};
}

const h=harness();
h.setWave(2);ok(h.system.startWave(2),'onda 2 não iniciou');
let targets=h.system.getCombatTargets();
ok(targets.length===3,'onda 2 deve criar três altares');
ok(targets.every(target=>target.objectiveTarget&&target.noNecroRewards),'estruturas devem bloquear almas/cadáveres');
ok(targets.every(target=>target.hp===150&&target.maxHp===150),'cada altar deve começar com sua própria vida completa');
targets[0].takeDmg(40);
close(targets[0].hp,110,.001,'dano não reduziu a vida individual do primeiro altar');
ok(targets.slice(1).every(target=>target.hp===150),'dano em um altar vazou para os demais');
close(h.system.enemySpeedMultiplier(),1.10,.0001,'altares não aplicaram velocidade compartilhada');
ok(!h.system.canEndWave(2),'onda 2 terminou antes dos altares');
targets.forEach(target=>target.takeDmg(99999));
ok(h.system.canEndWave(2),'onda 2 continuou bloqueada após os altares');
close(h.system.enemySpeedMultiplier(),1,.0001,'velocidade inimiga não voltou ao normal');

h.setWave(3);h.system.startWave(3);h.system.update(8.1);
h.players[0].x=320;h.players[0].y=270;
ok(h.system.handleActionDown(0),'altar sombrio não aceitou interação');
ok(h.choice?.options?.length===2,'decisão sombria não ofereceu duas rotas');
h.choice.options.find(option=>option.id==='absorb').onChoose();
close(h.players[0].maxHp,90,.001,'absorção não reduziu vida máxima');
close(h.system.modifyOutgoingDamage(h.players[0],{},100),115,.001,'absorção não aumentou dano');
ok(h.system.canEndWave(3),'escolha sombria não concluiu objetivo');

h.setWave(4);h.system.startWave(4);
const bruto=h.getMiniboss();
ok(bruto&&!bruto.dead,'onda 4 não criou o Brutamontes');
close(bruto.maxHp,1500,.001,'Brutamontes não veio com a vida reforçada da onda 4');
ok(h.system.getCombatTargets().length===0,'Brutamontes não deve virar alvo de objetivo: ele é o chefe do jogo');
h.system.update(.1);
ok(!h.system.canEndWave(4),'onda 4 liberou antes de o Brutamontes morrer');
bruto.takeDmg(99999);h.system.update(.1);
ok(h.system.canEndWave(4),'Brutamontes morto não liberou a onda');

h.setWave(7);h.system.startWave(7);targets=h.system.getCombatTargets();
ok(targets.length===4,'onda 7 deve criar quatro ninhos');targets.forEach(target=>target.takeDmg(99999));
close(h.system.debugSnapshot().buffs.aracneHpMult,.95,.0001,'vantagem contra Aracne não foi concedida');

h.setWave(8);h.system.startWave(8);targets=h.system.getCombatTargets();
ok(targets.length===1&&targets[0].kind==='survivor_web','onda 8 não criou o casulo opcional');
const survivor=targets[0];survivor.takeDmg(99999);ok(h.system.debugSnapshot().data.stage==='defend','casulo destruído não iniciou defesa');
const npcAttacker={type:'runner_goblin',x:survivor.x,y:survivor.y,radius:12,damage:10,speed:50,dead:false};h.enemies.push(npcAttacker);
h.system.update(.1);ok(survivor.hp<survivor.maxHp&&survivor.flashTimer>0,'sobrevivente não recebeu/mostrou dano de contato');
const stableAggro=npcAttacker._campaignNpcAggro;npcAttacker.x+=37;npcAttacker.y+=19;h.system.update(.1);
ok(stableAggro===survivor&&npcAttacker._campaignNpcAggro===stableAggro,'inimigo trocou de alvo pela própria posição');
const npcHp=survivor.hp;
const friendlyShot={x:survivor.x,y:survivor.y,radius:5,dmg:20,isFriendly:true};
ok(!h.system.hitSurvivorWithProjectile(friendlyShot)&&survivor.hp===npcHp,'pet causou fogo amigo no sobrevivente');
const distantShot={x:0,y:0,radius:5,dmg:20};
ok(!h.system.hitSurvivorWithProjectile(distantShot),'projétil distante acertou sobrevivente');
const hostileShot={x:survivor.x,y:survivor.y,radius:5,dmg:20};
ok(h.system.hitSurvivorWithProjectile(hostileShot)&&hostileShot.dead,'projétil hostil não foi consumido ao acertar NPC');
close(survivor.hp,npcHp-6.4,.001,'dano à distância não reduziu vida do sobrevivente');
ok(survivor.flashTimer>0,'dano à distância não disparou reação visual');
ok(!h.system.hitSurvivorWithProjectile(hostileShot),'mesmo projétil acertou duas vezes');
h.enemies.length=0;h.system.update(22.1);ok(h.system.debugSnapshot().complete,'defesa do sobrevivente não concluiu');
ok(!h.system.hitSurvivorWithProjectile({...hostileShot,dead:false}),'sobrevivente resgatado continuou recebendo dano');

const failedRescue=harness();failedRescue.setWave(8);failedRescue.system.startWave(8);
const doomed=failedRescue.system.getCombatTargets()[0];doomed.takeDmg(9999);
for(let i=0;i<12;i++)failedRescue.system.hitSurvivorWithProjectile({x:doomed.x,y:doomed.y,radius:5,dmg:100});
ok(doomed.dead&&doomed.hp===0&&failedRescue.system.debugSnapshot().data.stage==='failed','sobrevivente não caiu ao perder toda a vida');
ok(failedRescue.system.canEndWave(8),'morte do sobrevivente bloqueou onda opcional');

h.setWave(9);h.system.startWave(9);targets=h.system.getCombatTargets();
ok(targets.length===1&&targets[0].kind==='hunter_spider','onda 9 não criou Aranha Caçadora');targets[0].takeDmg(99999);
close(h.system.debugSnapshot().buffs.aracneCooldownMult,1.06,.0001,'elite não enfraqueceu recargas da Aracne');

h.setWave(12);h.system.startWave(12);h.players[0].x=320;h.players[0].y=220;h.system.update(22);
close(h.system.movementMultiplier(h.players[0]),.8,.0001,'frio máximo não reduziu movimento em 20%');
close(h.system.cooldownDurationMultiplier(h.players[0]),1.1,.0001,'frio máximo não aumentou recarga em 10%');
ok(h.hud.meters.length===2&&h.hud.meters[0].label==='P1 FRIO'&&h.hud.meters[1].label==='P2 FRIO','HUD de frio não separou P1/P2');
h.players[0].x=145;h.players[0].y=286;h.system.update(2);close(h.system.movementMultiplier(h.players[0]),1,.0001,'fogueira não removeu penalidade ao reduzir o medidor');
h.system.onWaveEnd(12);

h.setWave(13);h.system.startWave(13);
for(const [x,y] of CampaignObjectives.POSITIONS.frostFires){h.players[0].x=x;h.players[0].y=y;ok(h.system.handleActionDown(0),'fogueira não iniciou ação segurada');h.system.update(1.8);h.system.handleActionUp(0);}
ok(h.system.canEndWave(13),'três fogueiras não concluíram a onda 13');
close(h.system.movementMultiplier(h.players[0]),1.08,.0001,'Bênção do Fogo não aumentou velocidade');
close(h.system.modifyOutgoingDamage(h.players[0],{frozen:true},100),126.5,.001,'Bênção do Fogo não combinou com o bônus da run');

// O Portao Congelado foi removido do jogo: a onda 14 nao tem mais objetivo.
h.setWave(14);h.system.startWave(14);
ok(h.system.canEndWave(14),'onda 14 deveria estar livre depois da remocao do Portao');

h.setWave(17);h.system.startWave(17);
for(const [x,y] of CampaignObjectives.POSITIONS.obelisks){h.players[0].x=x;h.players[0].y=y;ok(h.system.handleActionDown(0),'obelisco não ativou');}
h.players[0].x=320;h.players[0].y=268;ok(h.system.handleActionDown(0),'baú ancestral não abriu');
ok(h.system.canEndWave(17),'baú ancestral não concluiu o objetivo');

h.setWave(18);h.system.startWave(18);const emerging={speed:70,dead:false};h.enemies.push(emerging);h.system.onEnemySpawn(emerging);h.system.applyEnemySpeed(emerging);close(emerging.speed,0,.0001,'inimigo emergiu sem telegraph');
h.system.update(.8);h.system.applyEnemySpeed(emerging);close(emerging.speed,70,.0001,'inimigo permaneceu travado após telegraph');

h.setWave(22);h.system.startWave(22);targets=h.system.getCombatTargets();ok(targets.length===3,'onda 22 deve criar três fissuras');targets.forEach(target=>target.takeDmg(99999));ok(h.system.canEndWave(22),'fissuras seladas não liberaram a onda');

h.setWave(23);h.system.startWave(23);h.players[0].x=320;h.players[0].y=265;h.players[0].hp=100;h.players[1].hp=80;
ok(h.system.handleActionDown(0),'altar demoníaco não abriu escolha');h.choice.options.find(option=>option.id==='use').onChoose();
close(h.players[0].hp,75,.001,'pacto não cobrou 25% da vida atual P1');close(h.players[1].hp,60,.001,'pacto não cobrou 25% da vida atual P2');
close(h.system.modifyOutgoingDamage(h.players[0],{},100),138,.001,'pacto não adicionou 20% ao dano da run');

h.enemies.length=0;h.setWave(24);h.system.startWave(24);h.system.update(60.01);h.system.update(.01);
ok(h.system.canEndWave(24),'sobrevivência de 60s não concluiu');ok(h.requestedEnds===1,'onda 24 não solicitou conclusão segura');close(h.waveTimer,0,.001,'timer da onda 24 não chegou a zero');

h.system.cleanup('death');
close(h.system.modifyOutgoingDamage(h.players[0],{frozen:true},100),100,.001,'buffs temporários vazaram após morte');
ok(h.system.debugSnapshot().targetCount===0,'alvos vazaram após cleanup');

for(const file of ['src/campaign/campaign-ui.js','src/campaign/campaign-objectives.js','src/campaign/campaign-events.js','src/campaign/campaign-runtime.js']){
  ok(html.includes(`<script src="${file}"></script>`),`index.html não carrega ${file}`);
  new vm.Script(read(file),{filename:file});
}
const uiSource=read('src/campaign/campaign-ui.js');
for(const contract of ['@media (max-width:800px)','#campaign-action-button','pointerdown','pointerup','campaign-objective-meters'])ok(uiSource.includes(contract),`HUD móvel perdeu contrato: ${contract}`);
for(const contract of ['#${ROOT_ID}.suspended','function setSuspended(value)','root.classList.toggle(\'suspended\',suspended)','setActionHandlers,setSuspended'])ok(uiSource.includes(contract),`pausa não protege o HUD de missão: ${contract}`);
for(const contract of ['function drawTargetHealth(','`${atual}/${maximo}`','const altarY=y+14','const altarY=y+16','globalCompositeOperation=\'lighter\'','ctx.ellipse(x,y+9,17,5'])ok(source.includes(contract),`visual/vida estável dos altares perdeu contrato: ${contract}`);
ok(!source.includes('const altarBob='),'altares voltaram a oscilar verticalmente');
for(const contract of ["global.InimigosNormais?.desenhar?.(ctx,'spitting_spider'","global.InimigosNormais?.desenhar?.(ctx,'sand_worm_small'",'enemy._campaignNpcObjectiveId!==target.id','target.flashTimer=180'])ok(source.includes(contract),`polimento de objetivo ausente: ${contract}`);
ok(html.indexOf('src/campaign/campaign-objectives.js')<html.indexOf('src/campaign/campaign-runtime.js'),'runtime carrega antes dos objetivos');
for(const contract of [
  "...(typeof campaignObjectiveTargets==='function'?campaignObjectiveTargets():[])",
  'hitCampaignObjectiveWithProjectile(p,target)',
  'campaignObjectives.applyEnemySpeed(e)',
  'campaignObjectives.enemyAggroTarget(e)',
  'campaignObjectives.hitSurvivorWithProjectile(p)',
  'campaignObjectives.drawOverlay(ctx,t,W,H)',
  'campaignHandleActionDown(playerIndex)',
])ok(html.includes(contract)||runtime.includes(contract),`integração ausente: ${contract}`);
ok(campaign.includes('!campaignObjectives.canEndWave(wave)'),'fim de onda ignora objetivo obrigatório');
ok(campaign.includes('campaignObjectives.onBossSpawn(bossMajor,wave)'),'vantagens de capítulo não chegam aos chefes');
ok(necromancer.includes('if(deps.modifyDamage)damage=deps.modifyDamage(owner,target,damage,meta);'),'invocações do Necromante não usam modificadores da campanha');
ok(runtime.includes('getTargets:()=>allTargets(enemies)')||html.includes('getTargets:()=>allTargets(enemies)'),'Necromante não enxerga estruturas de objetivo');
ok((necromancer.match(/!enemy\.noNecroRewards/g)||[]).length>=3,'Foice do Necromante ainda gera almas em estruturas');
ok(!source.includes('incrementKills')&&!source.includes('onEnemyDeath('),'objetivos alteram kills/almas diretamente');

console.log(`OK: objetivos das ondas, coop, dano estrutural, recompensas, timers e limpeza validados (${checks} verificações).`);
