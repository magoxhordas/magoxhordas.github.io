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
  /* Relogio CONTROLAVEL. Com Date.now() real o tempo nao anda dentro de um
     laco sincrono, e sequencias temporais (morte de chefe, throttles)
     nunca disparariam — o teste passaria por engano. */
  let relogio=1000;
  const ctx={console,performance:{now:()=>relogio}};
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
  return {J,registro,total:()=>registro.shakes.reduce((s,v)=>s+v,0),
          avancar:ms=>{relogio+=ms;}, agora:()=>relogio};
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
  // 25 acertos em 250ms de relogio (10ms entre eles): uma arma de 520ms
  // nunca faria isso, mas e' o pior caso e e' o que o throttle precisa segurar
  for(let i=0;i<25;i++){
    b.avancar(10);
    b.J.impacto({x:1,y:1,cooldown:520,dano:9,alvo:bicho,attackEventId:'f'+i});
    if(bicho._juiceFlash&&bicho._juiceFlash!==ultimo){renovacoes++;ultimo=bicho._juiceFlash;}
  }
  exigir(renovacoes<=4,`25 acertos em 250ms nao podem gerar ${renovacoes} flashes (lampada)`);
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
  exigir(/CombatJuiceSystem\.enfaseAtual\(\)/.test(html)&&/ctx\.scale\(zoom,zoom\)/.test(html),
    'a enfase visual precisa chegar ao renderer sem pausar a logica');
}

// ═══════════════════════════════════════════════════════
// FASE 2 — morte, critico e chefe
// ═══════════════════════════════════════════════════════

// ── 14. Escala das mortes: comum < critica < elite < minichefe ──
{
  const medir=fn=>{const b=bancada();fn(b.J);return {p:b.registro.particulas,s:b.total()};};
  const comum=medir(J=>J.morte({x:1,y:1,dano:20,hpRestante:10}));
  const crit =medir(J=>J.morte({x:1,y:1,critico:true,dano:60,hpRestante:10}));
  const elite=medir(J=>J.morte({x:1,y:1,elite:true,dano:60,hpRestante:40}));
  const mini =medir(J=>J.morte({x:1,y:1,minichefe:true,dano:90,hpRestante:60}));
  exigir(comum.p<crit.p,'morte critica precisa ser maior que a comum');
  exigir(crit.p<elite.p,'morte de elite precisa ser maior que a critica');
  exigir(elite.p<mini.p,'morte de minichefe precisa ser maior que a de elite');
  exigir(comum.s===0,'morte comum nao pode tremer a tela');
  exigir(elite.s>0&&mini.s>elite.s,'elite treme pouco; minichefe treme mais');
}

// ── 15. Overkill reforca, mas com teto ──
{
  const medir=(dano)=>{const b=bancada();b.J.morte({x:1,y:1,dano,hpRestante:10});return b.registro.particulas;};
  const normal=medir(12), dez=medir(100), absurdo=medir(100000);
  exigir(dez>normal,'overkill precisa reforcar a morte');
  const b=bancada();
  exigir(absurdo<=Math.ceil(normal*b.J.CONFIG.OVERKILL_MAX)+1,
    `overkill precisa ter teto: 100000 de dano deu ${absurdo} contra ${normal} do normal`);
}

// ── 16. Morte de chefe: sequencia visual que NAO segura o gameplay ──
{
  const b=bancada();
  b.J.morteDeChefe({x:100,y:100});
  for(let i=0;i<70;i++){ b.avancar(16); b.J.atualizar(0.016); }
  exigir(b.registro.particulas>0,'a morte de chefe precisa gerar bursts');
  exigir(b.total()>0,'a morte de chefe precisa tremer');
  // e o modulo nao pode manter o chefe "vivo" de nenhuma forma
  exigir(!/\.dead\s*=\s*false/.test(modulo),'o juice nao pode reviver nem segurar entidade');
  const bossSrc=ler('src/campaign/boss-system.js');
  exigir((bossSrc.match(/CombatJuiceSystem\.morteDeChefe/g)||[]).length>=6,
    'todos os seis chefes da campanha precisam disparar a sequencia');
  // o gatilho fica no _dropLoot, que roda com o chefe JA' marcado como morto
  const numaLinha=bossSrc.replace(/\s+/g,' ');
  exigir(numaLinha.includes('this.dead=true; this._dropLoot()'),
    'a sequencia visual precisa comecar depois de o chefe ja estar morto para o gameplay');
}

// ── 17. Impacto acumulado no chefe (nada de tremor por projetil) ──
{
  const rapido=bancada(), forte=bancada();
  const chefe={x:1,y:1};
  for(let i=0;i<25;i++) rapido.J.danoNoChefe(chefe,1,1000);   // 2,5% da vida
  forte.J.danoNoChefe({x:1,y:1},60,1000);                      // 6% de uma vez
  exigir(rapido.total()===0,'tiros fracos no chefe nao podem tremer a tela');
  exigir(forte.total()>0,'uma fatia significativa da vida do chefe precisa gerar impacto pesado');
}

// ── 18. Multikill agrega em vez de repetir ──
{
  const b=bancada();
  for(let i=0;i<12;i++) b.J.morte({x:1,y:1,dano:20,hpRestante:10});
  exigir(b.J.multikillAtual()===12,'o agregador precisa contar as mortes da janela');
  exigir(b.registro.sons<=CONFIG_MARCOS(b),'multikill nao pode tocar um som por morte');
  function CONFIG_MARCOS(bb){ return bb.J.CONFIG.MULTIKILL_MARCOS.length+1; }
}

// ── 19. Damage lag na barra do chefe (leitura, nao alteracao de vida) ──
{
  const hud=ler('src/ui/boss-hud.js');
  exigir(/atraso/.test(hud)&&/e\.atraso\s*>\s*vida/.test(hud),
    'a barra do chefe precisa preservar o rastro de dano existente');
  exigir(!/\.hp\s*=/.test(hud),'a HUD nao pode escrever vida');
  exigir(/CombatJuiceSystem\.danoNoChefe/.test(html),
    'o dano efetivo da campanha precisa alimentar o acumulador dos chefes');
}

// ═══════════════════════════════════════════════════════
// FASES 3-5 — identidade por arma, jogador e acessibilidade
// ═══════════════════════════════════════════════════════

// ── 20. Toda arma do catalogo cai numa familia, e as familias diferem ──
{
  const b=bancada();
  const dados=ler('src/weapons/weapon-data.js');
  const ids=[...dados.matchAll(/\['([a-z_]+)','[^']+'/g)].map(m=>m[1]);
  exigir(ids.length>=32,`o catalogo deveria expor ao menos 32 armas, achei ${ids.length}`);
  const semFamilia=ids.filter(id=>b.J._categoriaDaArma(id)==='generico');
  exigir(semFamilia.length===0,`toda arma precisa de familia (sem: ${semFamilia.slice(0,4)})`);

  // chainblade tem "chain" E "blade": a ordem das regras precisa resolver
  exigir(b.J._categoriaDaArma('warrior_chainblade')==='corrente',
    'a Corrente com Lamina precisa cair em corrente, nao em espada');

  // e as assinaturas nao podem ser todas iguais
  const A=b.J.ASSINATURAS;
  exigir(A.espada.marca==='corte'&&A.martelo.marca==='poeira'&&A.lanca.marca==='linha',
    'cada familia precisa de uma marca visual propria');
  exigir(A.machado.arco>A.espada.arco,'o machado corta mais largo que a espada');
  exigir(A.machado.fragmentos>A.arco.fragmentos,'o machado espalha mais fragmentos que o arco');
}

// ── 21. Dash e' movimento, nao impacto ──
{
  const d=bancada(), h=bancada();
  d.J.dash({x:1,y:1,classe:'viking'});
  h.J.impacto({x:1,y:1,cooldown:1650,dano:90,attackEventId:'h'});
  exigir(d.total()<h.total(),'o dash nao pode tremer tanto quanto um golpe pesado');
  exigir(d.total()>0,'o dash ainda precisa de alguma resposta');
  const b=bancada();
  const cores=b.J.CONFIG.DASH.cores;
  exigir(new Set([cores.mage,cores.archer,cores.viking,cores.warrior]).size===4,
    'cada classe precisa da propria cor de dash');
}

// ── 22. Dano no jogador e' o feedback mais claro ──
{
  const leve=bancada(), pesado=bancada(), golpe=bancada();
  leve.J.danoNoJogador({x:1,y:1,quantidade:5,vidaMaxima:100});
  pesado.J.danoNoJogador({x:1,y:1,quantidade:30,vidaMaxima:100});
  golpe.J.impacto({x:1,y:1,cooldown:1650,dano:90,attackEventId:'g'});
  exigir(pesado.total()>leve.total(),'golpe pesado no jogador precisa doer mais que um arranhao');
  exigir(leve.total()>=golpe.total()*0.6,
    'apanhar precisa ser tao ou mais perceptivel que acertar');
}

// ── 23. Vida critica avisa UMA vez, e rearma so apos recuperar ──
{
  const b=bancada();
  const p={};
  exigir(b.J.checarVidaCritica(p,20,100)===true,'precisa avisar ao cruzar para baixo');
  exigir(b.J.checarVidaCritica(p,18,100)===false,'nao pode repetir o aviso a cada quadro');
  b.J.checarVidaCritica(p,40,100);
  exigir(b.J.checarVidaCritica(p,20,100)===true,'precisa rearmar depois de o jogador se recuperar');
}

// Cura mostra apenas o valor efetivamente recuperado.
exigir(/healed>0&&typeof CombatJuiceSystem!==['"]undefined['"]\)CombatJuiceSystem\.cura/.test(html),
  'a cura real da campanha precisa alimentar o feedback visual');

// ── 24. Cura mostra valor real; overheal nao inventa numero ──
{
  const b=bancada();
  b.J.cura(1,1,0);
  exigir(b.registro.particulas===0,'cura de zero (overheal) nao pode gerar feedback');
  b.J.cura(1,1,18);
  exigir(b.registro.particulas>0,'cura real precisa aparecer');
}

// ── 25. Galeria de depuracao funciona sem uma run ──
{
  const b=bancada();
  exigir(Array.isArray(b.J.GALERIA)&&b.J.GALERIA.length>=8,'a galeria precisa cobrir os casos principais');
  for(const tipo of b.J.GALERIA) b.J.depurar(tipo);   // nao pode lancar
  exigir(!html.includes('GALERIA'),'a galeria de depuracao nao pode aparecer na UI do jogador');
}

// ── 26. Configuracoes tem UI de verdade, no painel existente ──
{
  for(const id of ['settings-fx-intensity','settings-fx-shake','settings-fx-motion','settings-fx-flash'])
    exigir(html.includes(id),`falta o controle ${id} na tela de configuracoes`);
  exigir(/data-settings-panel="video"/.test(html),'os controles precisam morar num painel existente');
  for(const fn of ['cycleCombatFxIntensity','setCombatFxShake','toggleCombatFxMotion','toggleCombatFxFlashes'])
    exigir(settings.includes(fn),`GameSettings precisa expor ${fn}`);
}

// ── 27. O juice nao pode esconder telegrafo nem quebrar fora de run ──
{
  exigir(html.includes("typeof parts==='undefined'"),
    'o spawnParts do juice precisa de guarda: `parts` so existe dentro de uma run');
  // a vinheta e' de BORDA: nao pode ser um retangulo cheio opaco
  exigir(/createRadialGradient/.test(modulo),'a vinheta precisa ser gradiente de borda, nao tela cheia');
  exigir(!/fillRect\(0,0,W,H\);?\s*\/\/\s*tela cheia/.test(modulo),'nada de cobrir a tela');
}

console.log(`OK: feedback de combate verificado (${checagens} checagens).`);
