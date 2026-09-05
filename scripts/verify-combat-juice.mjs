/* Verificador do FEEDBACK DE COMBATE.
 *
 * Cobre a Fase 1 (impacto base). As fases seguintes acrescentam checagens
 * a este mesmo arquivo.
 *
 * Quase tudo aqui e' SIMULACAO, nao busca de texto: "existe a palavra
 * shake no arquivo" nao prova que o Arco Curto para de tremer a tela.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const raiz=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=f=>fs.readFileSync(path.join(raiz,f),'utf8').replace(/\r\n/g,'\n');
const html=ler('index.html');
const modulo=ler('src/combat/combat-juice-system.js');
const settings=ler('src/ui/settings-system.js');

let checagens=0;
function exigir(cond,msg){ if(!cond) throw new Error(`FALHA: ${msg}`); checagens++; }

/* Carrega o modulo isolado e devolve um banco de provas: quem pediu
   tremor, quantas particulas, quais aneis. */
function bancada(preferencias){
  const ctx={console,performance:{now:()=>Date.now()}};
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(modulo,ctx);
  const J=ctx.CombatJuiceSystem;
  const registro={shakes:[],particulas:0,sons:0,tintas:0};
  J.configurar({
    getPreferencias:()=>preferencias||{intensidade:'normal',shake:1,reduzirMovimento:false,reduzirFlashes:false},
    spawnParts:(x,y,c,n)=>{registro.particulas+=n;},
    aplicarShake:(f)=>{registro.shakes.push(f);},
    getW:()=>640,getH:()=>480,
    visivel:()=>true,
    ehChefe:a=>!!a&&!!a.__chefe,
    tingirAlvo:()=>{registro.tintas++;return true;},
    tocarImpacto:()=>{registro.sons++;},
  });
  return {J,registro,total:()=>registro.shakes.reduce((s,v)=>s+v,0)};
}

// ── 1. LIGHT nao gera tremor forte ──
{
  const b=bancada();
  for(let i=0;i<20;i++) b.J.impacto({x:1,y:1,cooldown:520,dano:12,attackEventId:'r'+i});
  exigir(b.total()===0,`20 ataques de arma rapida nao podem tremer a tela (veio ${b.total()})`);
  exigir(b.registro.particulas>0,'arma rapida ainda precisa de particula (feedback pequeno, nao ausente)');
}

// ── 2. HEAVY gera feedback maior que LIGHT ──
{
  const leve=bancada(), pesado=bancada();
  leve.J.impacto({x:1,y:1,cooldown:520,dano:12,attackEventId:'a'});
  pesado.J.impacto({x:1,y:1,cooldown:1650,dano:90,attackEventId:'b'});
  exigir(pesado.total()>leve.total(),'arma lenta precisa tremer mais que a rapida');
  exigir(pesado.registro.particulas>leve.registro.particulas,'arma lenta precisa de mais particulas');
  const P=leve.J.CONFIG.PERFIS;
  exigir(P.heavy.anelRaio>0&&P.light.anelRaio===0,'anel de impacto e do HEAVY, nunca do LIGHT');
  exigir(P.heavy.pausaVisual>0&&P.light.pausaVisual===0&&P.medium.pausaVisual===0,
    'pausa visual so a partir do HEAVY');
}

// ── 3/4. DOT nao gera tremor nem pausa ──
{
  const b=bancada();
  for(let i=0;i<30;i++) b.J.impacto({x:1,y:1,cooldown:0,dano:3,origem:'dot',attackEventId:'d'+i,elemento:'poison'});
  exigir(b.total()===0,'dano continuo nao pode tremer a tela');
  exigir(b.J.enfaseAtual()===0,'dano continuo nao pode gerar pausa visual');
}

// ── 5/6. Multi-hit e AoE nao multiplicam o tremor ──
{
  const um=bancada(), dez=bancada();
  um.J.impacto({x:1,y:1,cooldown:1650,dano:90,attackEventId:'ciclo'});
  for(let i=0;i<10;i++) dez.J.impacto({x:i*9,y:1,cooldown:1650,dano:90,attackEventId:'ciclo'});
  exigir(dez.registro.shakes.length===1,
    `um golpe em 10 alvos deve pedir UM tremor, veio ${dez.registro.shakes.length}`);
  exigir(Math.abs(dez.total()-um.total())<0.001,'o tremor de 10 alvos deve ser igual ao de 1');
  exigir(dez.registro.particulas>um.registro.particulas,
    'cada alvo ainda deve receber as proprias particulas');
}

// ── 7. Critico aumenta o feedback, partindo de patamares diferentes ──
{
  const a=bancada(),b=bancada(),c=bancada(),d=bancada();
  a.J.impacto({x:1,y:1,cooldown:520,dano:12,attackEventId:'1'});
  b.J.impacto({x:1,y:1,cooldown:520,dano:30,critico:true,attackEventId:'2'});
  c.J.impacto({x:1,y:1,cooldown:1650,dano:90,attackEventId:'3'});
  d.J.impacto({x:1,y:1,cooldown:1650,dano:220,critico:true,attackEventId:'4'});
  exigir(b.total()>a.total(),'critico precisa aumentar o feedback da arma rapida');
  exigir(d.total()>c.total(),'critico precisa aumentar o feedback da arma lenta');
  exigir(d.total()>b.total(),
    'critico do Machado Colossal tem de ser bem maior que o do Arco Curto');
}

// ── 8. Chefe possui throttle proprio de flash ──
{
  const b=bancada();
  exigir(b.J.CONFIG.FLASH_COOLDOWN_CHEFE_MS>b.J.CONFIG.FLASH_COOLDOWN_MS,
    'o chefe apanha muito: precisa de intervalo de flash maior que o inimigo comum');
  const chefe={__chefe:true};
  for(let i=0;i<25;i++) b.J.impacto({x:1,y:1,cooldown:520,dano:9,alvo:chefe,attackEventId:'c'+i});
  exigir(!!chefe._juiceFlash,'o chefe ainda precisa reagir');
  exigir(chefe._juiceFlash.forca<=b.J.CONFIG.PERFIS.light.flash,
    'o flash do chefe precisa ser mais fraco que o do inimigo comum');
}

// ── 9. Armas rapidas respeitam throttle de flash ──
{
  const b=bancada();
  const bicho={};
  let renovacoes=0,ultimo=null;
  for(let i=0;i<25;i++){
    b.J.impacto({x:1,y:1,cooldown:520,dano:9,alvo:bicho,attackEventId:'f'+i});
    if(bicho._juiceFlash&&bicho._juiceFlash!==ultimo){renovacoes++;ultimo=bicho._juiceFlash;}
  }
  exigir(renovacoes<=2,`25 acertos instantaneos nao podem gerar ${renovacoes} flashes (lampada)`);
}

// ── 10/11/12. Configuracao do jogador e acessibilidade ──
{
  const zero=bancada({intensidade:'normal',shake:0,reduzirMovimento:false,reduzirFlashes:false});
  zero.J.impacto({x:1,y:1,cooldown:1650,dano:90,attackEventId:'z'});
  exigir(zero.total()===0,'tremor em 0% precisa zerar o tremor');
  exigir(zero.registro.particulas>0,'tremor em 0% nao pode remover informacao (particulas ficam)');

  const meio=bancada({intensidade:'normal',shake:0.5,reduzirMovimento:false,reduzirFlashes:false});
  const cheio=bancada({intensidade:'normal',shake:1,reduzirMovimento:false,reduzirFlashes:false});
  meio.J.impacto({x:1,y:1,cooldown:1650,dano:90,attackEventId:'m'});
  cheio.J.impacto({x:1,y:1,cooldown:1650,dano:90,attackEventId:'c'});
  exigir(Math.abs(meio.total()-cheio.total()/2)<0.01,'o slider precisa ser proporcional');

  const rm=bancada({intensidade:'normal',shake:1,reduzirMovimento:true,reduzirFlashes:false});
  rm.J.impacto({x:1,y:1,cooldown:1650,dano:90,attackEventId:'rm'});
  exigir(rm.J.enfaseAtual()===0,'reduzir movimento precisa desligar a enfase/zoom');
  exigir(rm.registro.particulas>0,'reduzir movimento nao pode apagar o feedback inteiro');

  const rf=bancada({intensidade:'normal',shake:1,reduzirMovimento:false,reduzirFlashes:true});
  const normal=bancada();
  const alvoA={},alvoB={};
  rf.J.impacto({x:1,y:1,cooldown:1650,dano:90,alvo:alvoA,attackEventId:'rf'});
  normal.J.impacto({x:1,y:1,cooldown:1650,dano:90,alvo:alvoB,attackEventId:'nf'});
  exigir(alvoA._juiceFlash.forca<alvoB._juiceFlash.forca,'reduzir flashes precisa baixar a intensidade do flash');

  const baixa=bancada({intensidade:'baixa',shake:1,reduzirMovimento:false,reduzirFlashes:false});
  const alta=bancada({intensidade:'alta',shake:1,reduzirMovimento:false,reduzirFlashes:false});
  baixa.J.impacto({x:1,y:1,cooldown:1650,dano:90,attackEventId:'b'});
  alta.J.impacto({x:1,y:1,cooldown:1650,dano:90,attackEventId:'a'});
  exigir(alta.registro.particulas>baixa.registro.particulas,'intensidade ALTA precisa dar mais particulas que BAIXA');

  // e a configuracao precisa existir de verdade, no mesmo storage do resto
  for(const chave of ['combatFxIntensity','combatFxShake','combatFxReduceMotion','combatFxReduceFlashes'])
    exigir(settings.includes(chave),`GameSettings precisa persistir ${chave}`);
  exigir(!/localStorage\.setItem\(['"]combat/i.test(settings),'nao pode haver storage paralelo para o juice');
  exigir(html.includes('getPreferencias:'),
    'as preferencias precisam chegar por injecao (GameSettings e const de topo, nao propriedade de window)');
}

// ── 13. Tetos ──
{
  const b=bancada();
  for(let i=0;i<200;i++) b.J.impacto({x:1,y:1,cooldown:900,dano:10,attackEventId:'n'+i});
  exigir(b.J.CONFIG.MAX_NUMEROS<=60,'precisa existir teto de numeros de dano');
  exigir(b.J.CONFIG.MAX_ANEIS<=30,'precisa existir teto de aneis');
  exigir(b.J.CONFIG.MAX_PARTICULAS_POR_QUADRO<=120,'precisa existir teto de particulas por quadro');
}

// ── 17/18. Summons e pets tem feedback reduzido ──
{
  const b=bancada();
  exigir(b.J._forcaDoAtaque({cooldown:1650,origem:'summon'})!=='heavy',
    'summon nao pode alcancar o mesmo patamar da arma do jogador');
  exigir(b.J._forcaDoAtaque({cooldown:1650,origem:'pet'})==='light','pet e sempre feedback minimo');
  const s=bancada(), p=bancada();
  for(let i=0;i<10;i++) s.J.impacto({x:1,y:1,cooldown:900,dano:10,origem:'summon',attackEventId:'s'+i});
  for(let i=0;i<10;i++) p.J.impacto({x:1,y:1,cooldown:900,dano:10,origem:'pet',attackEventId:'p'+i});
  exigir(s.total()===0,'dez summons nao podem balancar a tela');
  exigir(p.total()===0,'pet nunca treme a tela');
}

// ── 19. Reset limpa os efeitos ──
{
  const b=bancada();
  b.J.impacto({x:1,y:1,cooldown:1650,dano:90,attackEventId:'x',critico:true});
  b.J.limpar();
  exigir(b.J.enfaseAtual()===0,'limpar() precisa encerrar a enfase');
  exigir(html.includes('CombatJuiceSystem.limpar()'),'a nova run precisa limpar os efeitos');
}

// ── Regra inegociavel: juice nao toca balanceamento ──
{
  /* Procura ESCRITA em campo de gameplay de alguma entidade — nunca
     identificador solto. A primeira versao deste guard batia em
     `const cooldown=...`, uma variavel local do throttle de flash, e
     falhava sem haver problema nenhum. */
  const escritaProibida=/\.\s*(hp|maxHp|dmg|damage|cd|atkCd|cooldown|speed|radius|critChance|critMult|range)\s*(=[^=]|\+=|-=|\*=|\/=)/;
  const achado=modulo.match(escritaProibida);
  exigir(!achado,`o modulo de juice nao pode escrever em campo de gameplay (achei "${achado&&achado[0]}")`);
  exigir(!/takeDmg\s*\(/.test(modulo),'o juice nao aplica dano');
  exigir(!/\bkills\s*\+\+/.test(modulo),'o juice nao contabiliza abate');
  exigir(!/Math\.random\(\)\s*<\s*critChance/i.test(modulo),'o juice nao decide critico, so o representa');
}

// ── Hitstop: precisa ser o pseudo, nao o real ──
{
  exigir(/PAUSA_MAX_MS/.test(modulo),'precisa existir teto de pausa visual');
  const b=bancada();
  exigir(b.J.CONFIG.PAUSA_MAX_MS<=120,'a pausa visual nunca pode durar centenas de ms');
  exigir(!/timeScale|clearInterval\(gameLoop|cancelAnimationFrame/.test(modulo),
    'o juice nao pode congelar o laco: o jogo tem 56 setTimeout em relogio de parede');
}

// ── Shake do jogo: combinacao com teto, nao soma nem sobrescrita ──
{
  exigir(/Math\.max\(atual,pedido\)/.test(html),
    'o tremor precisa combinar pelo MAIOR, nunca sobrescrever nem somar');
  exigir(/screenShake\.t\/\(screenShake\.dur/.test(html),
    'o decaimento do tremor precisa usar a duracao real, nao 180 fixo');
}

console.log(`OK: feedback de combate verificado (${checagens} checagens).`);
