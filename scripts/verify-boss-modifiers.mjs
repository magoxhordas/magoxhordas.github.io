import fs from 'node:fs';
import path from 'node:path';
import {createContext,runInContext} from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
let checks=0,failures=0;
function ok(condition,message){checks++;if(!condition){failures++;console.error('  FALHOU: '+message);}}
function equal(actual,expected,message){ok(actual===expected,`${message} (esperado ${expected}, veio ${actual})`);}
function near(actual,expected,message,epsilon=1e-6){ok(Math.abs(actual-expected)<=epsilon,`${message} (esperado ${expected}, veio ${actual})`);}

const context=createContext({console,Math,Object,Array,Number,Set,Date});
context.window=context;
for(const file of ['src/campaign/boss-modifier-data.js','src/campaign/boss-modifiers.js'])runInContext(read(file),context);
const D=context.BossModifierData,S=context.BossModifierSystem;
ok(Boolean(D&&S),'módulos carregam sem DOM');

equal(D.MODIFICADORES.length,20,'catálogo tem 20 modificadores');
equal(new Set(D.MODIFICADORES.map(mod=>mod.id)).size,20,'ids são únicos');
for(const mod of D.MODIFICADORES){
  ok(Boolean(mod.nome&&mod.descricao),'modificador tem texto: '+mod.id);
  ok(Object.values(D.CATEGORIAS).includes(mod.categoria),'categoria válida: '+mod.id);
  ok(mod.peso>0&&mod.peso<=1,'peso válido: '+mod.id);
  ok(Boolean(D.GLIFOS[mod.id]&&D.GLIFOS[mod.id].length===9),'glifo 9x9: '+mod.id);
}

equal(S.limitePara('easy'),0,'Aprendiz não tem ameaça');
equal(S.limitePara('medium'),4,'Guerreiro aceita quatro');
equal(S.limitePara('hard'),6,'Lendário aceita seis');
equal(S.ajustarNivel(9,'hard'),6,'nível é limitado');
equal(S.ajustarNivel(-2,'medium'),0,'nível nunca é negativo');

for(const nome of Object.keys(D.POR_CHEFE)){
  for(let i=0;i<160;i++){
    const mods=S.sortear(nome,6),ids=mods.map(mod=>mod.id);
    equal(new Set(ids).size,ids.length,nome+' não repete');
    for(const id of ids)ok(D.POR_CHEFE[nome].includes(id),nome+' só recebe compatível: '+id);
    for(const [a,b] of D.INCOMPATIVEIS)ok(!(ids.includes(a)&&ids.includes(b)),nome+' respeita incompatibilidade '+a+'/'+b);
    for(const [categoria,teto] of Object.entries(D.CONFIG.TETO_POR_CATEGORIA))ok(mods.filter(mod=>mod.categoria===categoria).length<=teto,nome+' respeita teto '+categoria);
  }
}

let players=[],enemies=[],spawned=0,credited=0;
S.configurar({
  getPlayers:()=>players,
  getEnemies:()=>enemies,
  getW:()=>640,getH:()=>480,
  getArenaBounds:()=>({left:0,right:0,top:180,bottom:0}),
  clampEntity:entity=>{entity.x=Math.max(0,Math.min(640,entity.x));entity.y=Math.max(180,Math.min(480,entity.y));},
  spawnParts:()=>{},spawnNotice:()=>{},getSpawnCap:()=>14,
  spawnEnemy:(type,x,y)=>{spawned++;enemies.push({type,x,y,damage:10,speed:20,dead:false});},
  creditarBonus:value=>{credited+=Math.round(value);return Math.round(value);},
});
const makeBoss=(name='BossBalrog')=>({constructor:{name},x:320,y:280,radius:40,maxHp:100,hp:100,speed:40,attackCd:1000,dead:false});
const makePlayer=(x=320,y=280)=>({x,y,radius:16,hp:100,dead:false,_damageCalls:0,takeDmg(amount){this._damageCalls++;this.hp-=amount;return amount;}});
const advance=seconds=>{for(let remaining=seconds;remaining>1e-8;remaining-=.1)S.update(Math.min(.1,remaining));};

S.iniciarRun(0,'medium');
ok(!S.ativo(),'ameaça zero desliga o runtime');
near(S.multiplicadorRecompensa(),1,'ameaça zero não muda recompensa');
S.iniciarRun(6,'hard');
near(S.multiplicadorRecompensa(),2.2,'ameaça seis concede bônus de 120%');

// A revelação não deixa nenhum perigo periódico disparar imediatamente.
let boss=makeBoss();players=[makePlayer()];enemies=[];spawned=0;
S.forcarModificadores(['summoner','mine_layer','corruptor','gravity_well','teleporter'],boss);
S.golpeForte(boss,boss.x,boss.y,20);
advance(2.9);
let state=S._estado();
equal(state.fogo.length+state.gelo.length+state.raios.length+state.minas.length+state.corrupcao.length+state.abismos.length,0,'revelação começa sem perigos');
equal(spawned,0,'revelação começa sem reforços');

// O relógio só avança no update; pausar não envelhece teleporte nem perigos.
boss=makeBoss('BossSkeletonKing');players=[makePlayer(100,260)];
S.forcarModificadores(['teleporter'],boss);advance(8);
ok(S.chefeOculto(boss),'Errante realmente esconde o chefe');
const hiddenUntil=S._estado().sumico,clockBefore=S._agora(),xBefore=boss.x,yBefore=boss.y;
ok(S.chefeOculto(boss)&&S._agora()===clockBefore&&S._estado().sumico===hiddenUntil,'tempo parado preserva o desaparecimento');
advance(.5);
ok(!S.chefeOculto(boss),'chefe reaparece depois do tempo de jogo');
ok(boss.x!==xBefore||boss.y!==yBefore,'chefe reaparece em outra posição');

// Glacial causa o mesmo pulso nos dois jogadores do cooperativo.
boss=makeBoss('BossFrostBehemoth');players=[makePlayer(),makePlayer()];
S.forcarModificadores(['glacial'],boss);advance(2.9);S.golpeForte(boss,320,280,20);advance(.7);
equal(players[0]._damageCalls,1,'Glacial atinge P1');
equal(players[1]._damageCalls,1,'Glacial atinge P2 no mesmo pulso');
near(players[0]._ameacaLentidao,.45,'Glacial marca lentidão');

// Invocador respeita o aviso antes de criar unidades.
boss=makeBoss('BossSkeletonKing');players=[makePlayer()];enemies=[];spawned=0;
S.forcarModificadores(['summoner'],boss);advance(9);
equal(spawned,0,'Invocador ainda não criou reforço no início do aviso');
equal(S._estado().invocacoesPendentes.length,2,'dois reforços ficam telegrafados');
advance(.6);equal(spawned,0,'reforços continuam aguardando o aviso');
advance(.1);equal(spawned,2,'reforços surgem após o aviso');

// Runas e rituais são alvos reais, inclusive para ataques de área/corpo a corpo.
boss=makeBoss('BossBalrog');players=[makePlayer()];
S.forcarModificadores(['runic_shield'],boss);advance(.1);
equal(S.alvosAtivos().length,3,'três runas entram na lista de alvos');
const rune=S.alvosAtivos()[0];
ok(S.acertarObjetos(rune.x,rune.y,3,60),'projétil acerta uma runa');
equal(S.alvosAtivos().length,2,'runa destruída sai dos alvos');

// Ritual concluído realmente fortalece o dano do chefe.
boss=makeBoss('BossSkeletonKing');players=[makePlayer()];
S.forcarModificadores(['ritualist'],boss);advance(12);
equal(S.alvosAtivos().length,2,'rituais aparecem como alvos após o cooldown');
advance(5);
near(S.multiplicadorDano(boss),1.25,'ritual concluído ativa bônus de dano');
const beforeHp=players[0].hp;
near(S.causarDano(boss,players[0],10,false),12.5,'dano ritualizado usa o multiplicador');
near(beforeHp-players[0].hp,12.5,'jogador recebe o dano ritualizado');

// Vampírico usa dano aplicado, não tentativa bloqueada.
boss=makeBoss('BossBalrog');boss.hp=50;
players=[{x:0,y:0,hp:100,dead:false,takeDmg:()=>0}];
S.forcarModificadores(['vampiric'],boss);
equal(S.causarDano(boss,players[0],20,false),0,'bloqueio devolve dano real zero');
near(boss.hp,50,'Vampírico não cura em bloqueio');
players[0].takeDmg=amount=>Math.min(10,amount);
equal(S.causarDano(boss,players[0],20,false),10,'pipeline devolve dano realmente aplicado');
near(boss.hp,55.5,'Vampírico cura fração do dano real');

// Caçador e Berserker se compõem sem deixar velocidade corrompida.
boss=makeBoss('BossBalrog');players=[makePlayer()];
S.forcarModificadores(['hunter','berserker'],boss);advance(10);boss.hp=20;advance(.1);
near(boss.speed,40*1.55*1.28,'Caçador e Berserker se multiplicam juntos');
boss.speed*=2;advance(.1);
near(boss.speed,80*1.55*1.28,'mudança própria do chefe é preservada durante bônus');
advance(3.5);near(boss.speed,80*1.28,'fim da Caçada preserva Berserker');
advance(3.6);near(boss.speed,80,'fim da fúria restaura só o modificador');
S.limpar('teste');near(boss.speed,80,'limpeza não desfaz mudança própria do chefe');

// Cadência usa a mesma composição e restauração.
boss=makeBoss('BossBrute');players=[makePlayer()];
S.iniciarRun(2,'hard');S.forcarModificadores(['bloodthirsty','berserker'],boss);boss.hp=20;advance(.1);
near(boss.attackCd,1000*.74*.62,'Sanguinário e Berserker compõem cooldown');
boss.attackCd*=.5;advance(.1);
near(boss.attackCd,500*.74*.62,'mudança própria de cooldown é preservada');
advance(7.1);near(boss.attackCd,500*.74,'fim de Berserker preserva Sanguinário');
S.limpar('teste');near(boss.attackCd,500,'limpeza restaura apenas a camada de ameaça');

// Comandante não deixa atributos presos após a luta.
boss=makeBoss('BossSkeletonKing');players=[makePlayer()];enemies=[{x:320,y:280,damage:10,speed:20,dead:false}];
S.iniciarRun(1,'hard');S.forcarModificadores(['commander'],boss);advance(.1);
near(enemies[0].damage,13,'Comandante aumenta dano próximo');near(enemies[0].speed,23.6,'Comandante aumenta velocidade próxima');
S.limpar('boss-death');near(enemies[0].damage,10,'limpeza restaura dano');near(enemies[0].speed,20,'limpeza restaura velocidade');

// Recompensa é paga uma única vez.
credited=0;boss=makeBoss('BossBalrog');S.iniciarRun(4,'hard');S.aoNascerChefe(boss);
equal(S.pagarBonus(100,10,10),70,'ameaça quatro credita 70% extra');
equal(S.pagarBonus(100,10,10),0,'bônus é idempotente');equal(credited,70,'crédito total não duplica');

const index=read('index.html'),bossSource=read('src/campaign/boss-system.js'),damageSource=read('src/combat/damage-system.js');
ok(index.indexOf('boss-modifier-data.js')<index.indexOf('boss-modifiers.js'),'dados carregam antes do runtime');
ok(index.includes('BossModifierSystem.iniciarRun(bossRushMode?0:_selThreat,difficulty)'),'Boss Rush força ameaça zero');
ok(index.includes('BossModifierSystem.alvosAtivos()'),'objetos entram no alvo comum de armas e invocações');
ok(index.includes('BossModifierSystem.chefeOculto(bossMajor)'),'colisão respeita chefe oculto');
ok((bossSource.match(/BossModifierSystem\.golpeForte\(/g)||[]).length===6,'os seis chefes possuem gancho de golpe forte');
ok((bossSource.match(/BossModifierSystem\.levouDano\(/g)||[]).length===6,'os seis chefes passam pela defesa de ameaça');
ok(bossSource.includes('BossModifierSystem.causarDano'),'ataques de chefe passam pelo dano real');
ok(damageSource.includes('return damageDealt'),'pipeline de dano informa o valor aplicado');

if(failures){console.error(`\nERRO: ${failures} de ${checks} verificações falharam.`);process.exit(1);}
console.log(`OK: Nível de Ameaça validou catálogo, sorteio, pausa, coop, telegraphs, alvos, dano, buffs, limpeza e recompensa (${checks} verificações).`);
