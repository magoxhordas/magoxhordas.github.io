import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const source=read('src/campaign/campaign-objectives.js');
let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const equal=(actual,expected,message)=>{assert.equal(actual,expected,message);checks++;};
const close=(actual,expected,message)=>ok(Math.abs(actual-expected)<1e-7,`${message}: ${actual} != ${expected}`);
function harness(options={}){
  const hits=[],notices=[],spriteCalls=[];
  const players=[0,1].map(idx=>({idx,x:idx?330:350,y:310,radius:16,hp:100,maxHp:100,dead:false}));
  let wave=9,bossRush=false,dungeon=false;
  const ctx={console,InimigosNormais:{desenhar(...args){spriteCalls.push(args);return true;}}};ctx.window=ctx;
  vm.createContext(ctx);vm.runInContext(source,ctx);
  let damage=null;
  if(options.realDamage){
    vm.runInContext(read('src/combat/damage-system.js'),ctx);
    damage=ctx.CampaignDamageSystem.create({getDifficulty:()=>({playerArmorCap:.5})});
    players.forEach(pl=>{pl.dmgReduce=options.armor||0;pl.inv=false;});
  }
  const system=ctx.CampaignObjectives.create({
    getPlayers:()=>players,getWave:()=>wave,getObjectiveHpScale:()=>1,
    isBossRush:()=>bossRush,isDungeon:()=>dungeon,
    damagePlayer:(player,amount)=>{hits.push({idx:player.idx,amount});damage?.damagePlayer(player,amount);},spawnNotice:(x,y,text)=>notices.push(text),
  });
  system.startWave(9);const spider=system.getCombatTargets()[0];
  spider.x=120;spider.y=310;spider.phaseTimer=Infinity;spider.chargeTimer=Infinity;spider.silkTimer=Infinity;spider.attackTimer=Infinity;
  return {system,spider,players,hits,notices,spriteCalls,
    setWave(value){wave=value;},setBossRush(value){bossRush=value;},setDungeon(value){dungeon=value;}};
}
function startCharge(h){h.spider.chargeTimer=0;h.system.update(0);}
function armSilk(h){h.spider.silkTimer=0;h.system.update(0);h.system.update(.65);}

// Marca o percurso antes de atacar, sem movimento/dano durante os 800 ms de aviso.
let h=harness();startCharge(h);
equal(h.spider.maxHp,2400,'Vida-base solicitada deve permanecer');
equal(h.spider.combatState,'charge_wind','Investida precisa de preparação');
const destination={...h.spider.charge.end};
h.players.forEach(pl=>{pl.x=200;pl.y=430;});
h.system.update(.799);
equal(h.spider.x,120,'Não andar durante o aviso');equal(h.hits.length,0,'Aviso não causa dano');
equal(h.spider.combatState,'charge_wind','Aviso não pode terminar antes de 800 ms');
h.system.update(.001);equal(h.spider.combatState,'charge_dash','Investida deve iniciar após o aviso');
equal(h.spider.charge.end.x,destination.x,'Destino não pode seguir o jogador');
equal(h.spider.charge.end.y,destination.y,'Direção não pode seguir o jogador');
h.system.update(1);
equal(h.spider.x,destination.x,'Investida deve terminar no destino marcado');
equal(h.spider.y,destination.y,'Investida deve preservar trajetória reta');
equal(h.hits.length,0,'Jogador fora do corredor deve conseguir esquivar');
equal(h.spider.combatState,'charge_recover','Investida deve abrir contra-ataque');
h.spider.takeDmg(100);equal(h.spider.hp,2300,'Aranha continua vulnerável durante a recuperação');
h.system.update(.999);equal(h.spider.combatState,'charge_recover','Recuperação deve durar um segundo');
equal(h.spider.x,destination.x,'Aranha deve ficar parada na recuperação');
h.system.update(.001);equal(h.spider.combatState,'hunt','Retorna à perseguição após recuperar');

// Colisão contínua: atravessar dois heróis em um frame lento acerta ambos, só uma vez.
h=harness();h.players[0].x=220;h.players[1].x=255;h.players[1].maxHp=200;
startCharge(h);h.system.update(.8);h.system.update(.25);h.system.update(.25);
equal(h.hits.filter(hit=>hit.idx===0).length,1,'P1 deve receber um único acerto por investida');
equal(h.hits.filter(hit=>hit.idx===1).length,1,'P2 deve receber um único acerto por investida');
close(h.hits.find(hit=>hit.idx===0).amount,32,'Dano deve respeitar limite de 32%');
close(h.hits.find(hit=>hit.idx===1).amount,48,'Dano deve respeitar teto de 48');
h.system.update(.1);equal(h.hits.length,2,'Contato após a investida não pode repetir dano');

// Integra os três ataques com a vida real do herói, armadura e invulnerabilidade.
function hitWith(h,kind){
  h.players[1].dead=true;h.players[0].x=145;h.players[0].y=310;
  if(kind==='bite'){h.spider.attackTimer=0;h.system.update(0);}
  else if(kind==='phase'){h.spider.phaseTimer=0;h.system.update(0);h.system.update(.68);h.system.update(0);}
  else {startCharge(h);h.system.update(.8);h.system.update(.5);}
}
for(const [kind,base,cap] of [['bite',30,.22],['phase',40,.28],['charge',48,.32]]){
  for(const maxHp of [80,100,250])for(const armor of [0,.5]){
    h=harness({realDamage:true,armor});Object.assign(h.players[0],{hp:maxHp,maxHp});
    hitWith(h,kind);
    const raw=Math.min(base,maxHp*cap);
    equal(h.hits.length,1,`${kind}: apenas um acerto`);
    close(h.hits[0].amount,raw,`${kind}: dano e teto percentual`);
    close(h.players[0].hp,maxHp-raw*(1-armor),`${kind}: armadura preservada`);
    ok(h.players[0].inv&&h.players[0].invT===600,`${kind}: proteção após dano preservada`);
    equal(h.spider.maxHp,2400,`${kind}: vida da aranha não pode mudar`);
    if(kind==='bite')equal(h.spider.attackTimer,950,'Aumento de dano não pode acelerar mordidas');
  }
  h=harness({realDamage:true});Object.assign(h.players[0],{inv:true,_dashActive:true});
  hitWith(h,kind);equal(h.players[0].hp,100,`${kind}: dash deve continuar evitando dano`);
}

// Destinos válidos nos cantos; sem NaN quando alvo e chefe compartilham a posição.
for(const [x,y,px,py] of [[40,210,10,10],[600,456,640,500],[40,456,590,220],[320,300,320,300]]){
  h=harness();Object.assign(h.spider,{x,y});h.players.forEach(pl=>Object.assign(pl,{x:px,y:py}));
  startCharge(h);h.system.update(.8);h.system.update(1);
  ok(Number.isFinite(h.spider.x)&&Number.isFinite(h.spider.y),'Posição deve ser finita');
  ok(h.spider.x>=40&&h.spider.x<=600&&h.spider.y>=210&&h.spider.y<=456,'Investida não pode sair da arena');
  ok(!h.spider.charge||h.spider.charge.length<=270.000001,'Investida não pode ultrapassar alcance máximo');
}

// Teias possuem preparação, duração e área próprias; não são alvos/estruturas extras.
h=harness();h.spider.silkTimer=0;h.system.update(0);
equal(h.spider.combatState,'silk_wind','Aranha deve animar a tecelagem');
equal(h.spider.silkTraps.length,3,'Máximo de três armadilhas por leva');
equal(h.system.getCombatTargets().length,1,'Teias não devem roubar mira nem gerar recompensas');
const trap=h.spider.silkTraps[0];
h.players.forEach(pl=>Object.assign(pl,{x:trap.x,y:trap.y}));
h.system.update(.649);close(h.system.movementMultiplier(h.players[0]),1,'Aviso da teia não deve desacelerar');
h.system.update(.001);
close(trap.lifeMs,6000,'Vida ativa da teia deve ser de seis segundos');
for(const pl of h.players)close(h.system.movementMultiplier(pl),.7,'Teia deve reduzir velocidade em 30%, inclusive P2');
equal(h.hits.length,0,'Teias não devem causar dano');
h.players[0]._campaignWebSlow=.15;h.players[0].campaignWebTimer=900;
close(h.system.movementMultiplier(h.players[0]),.7,'Lentidões de teia não devem multiplicar entre si');
delete h.players[0]._campaignWebSlow;h.players[0].campaignWebTimer=0;
h.spider.silkTimer=0;h.system.update(.01);
equal(h.spider.silkTraps.length,3,'Uma nova leva não pode acumular sobre a anterior');
Object.assign(h.players[0],{x:0,y:470});h.system.update(.01);
close(h.system.movementMultiplier(h.players[0]),1,'Lentidão deve acabar ao sair da teia');
close(h.system.movementMultiplier(h.players[1]),.7,'P2 deve continuar lento enquanto está na teia');
h.spider.silkTimer=Infinity;h.system.update((trap.lifeMs+1)/1000);
equal(h.spider.silkTraps.length,0,'Teias devem expirar');
close(h.system.movementMultiplier(h.players[1]),1,'Expiração deve retirar lentidão');

// Todas as saídas apagam efeitos, inclusive a flag de um P2 que morreu sobre a teia.
for(const finish of ['death','wave-end','wave-change','chapter','run-end','boss-rush','dungeon']){
  h=harness();armSilk(h);const t=h.spider.silkTraps[0];
  h.players.forEach(pl=>Object.assign(pl,{x:t.x,y:t.y}));h.system.update(.01);
  h.players[1].dead=true;
  if(finish==='death')h.spider.takeDmg(h.spider.hp);
  else if(finish==='wave-end')h.system.onWaveEnd(9);
  else if(finish==='wave-change'){h.setWave(10);h.system.startWave(10);}
  else if(finish==='boss-rush'){h.setBossRush(true);h.system.startWave(9);}
  else if(finish==='dungeon'){h.setDungeon(true);h.system.startWave(9);}
  else h.system.cleanup(finish);
  equal(h.spider.silkTraps.length,0,`${finish}: sem teias residuais`);
  equal(h.spider.charge,null,`${finish}: sem trajetória residual`);
  for(const pl of h.players)ok(pl._campaignSilkSlow===undefined,`${finish}: sem lentidão residual em P${pl.idx+1}`);
  const before=h.hits.length;h.system.update(2);equal(h.hits.length,before,`${finish}: sem dano tardio`);
}
h=harness();startCharge(h);h.spider.takeDmg(9999);h.system.update(1);
equal(h.hits.length,0,'Morte durante a preparação deve cancelar a investida');
ok(h.system.canEndWave(9),'Novos golpes não podem impedir encerramento da onda');

// Renderer real: corredor, fios, animações existentes e pilha do canvas balanceada.
const calls=[];let depth=0;
const drawing={save(){depth++;},restore(){depth--;ok(depth>=0,'restore extra no canvas');}};
for(const method of ['beginPath','ellipse','fill','moveTo','lineTo','stroke','fillRect','setLineDash','closePath','arc','translate','scale']){
  drawing[method]=(...args)=>{calls.push([method,...args]);for(const arg of args)if(typeof arg==='number')ok(Number.isFinite(arg),`Coordenada inválida: ${method}`);};
}
h=harness();startCharge(h);h.system.draw(drawing,1000);
ok(calls.some(([name,dash])=>name==='setLineDash'&&dash.length===2),'Corredor de aviso deve estar desenhado');
equal(h.spriteCalls.at(-1)[5],'idle','Aranha prepara investida com sprite de repouso');
ok(calls.some(([name,x,y])=>name==='scale'&&x===1&&y===.84),'Preparação deve mostrar corpo abaixado');
equal(depth,0,'Canvas deve restaurar transformações após o desenho');
h.system.update(.8);h.system.update(.05);h.system.draw(drawing,1800);
equal(h.spriteCalls.at(-1)[5],'walk','Investida deve usar animação de caminhada acelerada');
h=harness();h.spider.silkTimer=0;h.system.update(0);h.system.draw(drawing,2000);
equal(h.spriteCalls.at(-1)[5],'hit','Tecelagem deve usar animação de ataque');
equal(depth,0,'Desenho de teias não deve vazar transparência/transformações');

// Quatro minutos de combate simulado: todas as habilidades aparecem sem crescer arrays.
h=harness();Object.assign(h.spider,{phaseTimer:3000,chargeTimer:4800,silkTimer:1600,attackTimer:850});
const states=new Set();
for(let frame=0;frame<14400;frame++){
  const t=frame/60;
  h.players.forEach((pl,i)=>{pl.x=320+Math.cos(t*.8+i)*180;pl.y=330+Math.sin(t*.6+i)*90;});
  h.system.update(1/60);states.add(h.spider.combatState);
  if(frame%30===0){
    ok(h.spider.silkTraps.length<=3,'Combate longo não pode acumular mais de três teias');
    ok(h.spider.silkTraps.every(t=>t.lifeMs>0&&Number.isFinite(t.x+t.y)),'Teias devem ter estado válido');
    ok(Number.isFinite(h.spider.x+h.spider.y),'Aranha deve manter posição válida');
    ok(!h.spider.charge||h.spider.charge.hit.size<=2,'Investida não pode acumular referências a jogadores');
  }
}
for(const state of ['hunt','phase_wind','phase_strike','charge_wind','charge_dash','charge_recover','silk_wind']){
  ok(states.has(state),`Habilidade bloqueada pela sequência: ${state}`);
}
h.system.cleanup('run-end');equal(h.spider.silkTraps.length,0,'Simulação deve terminar sem teias');
const html=read('index.html');
const loop=html.slice(html.indexOf('function loop(ts){'),html.indexOf('campaignObjectives.update(dt);'));
ok(loop.includes("state==='paused'")&&loop.includes('return;'),'Pausa deve retornar antes de avançar objetivos');
const codex=read('src/ui/menu-codex-system.js');
ok(codex.includes("['Investida da Caçadora'")&&codex.includes("['Armadilhas de Seda'"),'Códex deve explicar os dois golpes');
console.log(`OK: Aranha Caçadora validou aviso, esquiva, colisão contínua, coop, seda, limpeza, animações e quatro minutos simulados (${checks} verificações).`);
