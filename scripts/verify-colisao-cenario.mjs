/* Verificador da COLISAO DO CENARIO e das LUZES do mercador e do espirito.
 *
 * Nao e' busca de texto: empurrarParaForaDe e' RECORTADA do index.html e
 * EXECUTADA aqui, e o modulo de eventos roda num vm de verdade — o que se
 * confere e' comportamento.
 *
 * Existe por causa de tres coisas que so' aparecem quando alguem mexe:
 *   1. heroi e inimigos precisam enxergar A MESMA lista de solidos. Se
 *      divergirem, o inimigo empurra o heroi para dentro de um objeto que
 *      so' ele atravessa;
 *   2. a fissura infernal e' uma RACHADURA no chao. Barrar quem passa por
 *      cima dela seria mentira — ela tem de ficar fora dos solidos;
 *   3. a colisao nao pode engolir a interacao: o objeto para o heroi a
 *      raio+raio, e a conversa acontece a raio+64.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=a=>fs.readFileSync(path.join(root,a),'utf8').replace(/\r\n/g,'\n');
const html=ler('index.html');
const eventos=ler('src/campaign/campaign-events.js');
const objetivos=ler('src/campaign/campaign-objectives.js');

let checagens=0;
const exigir=(c,m)=>{ if(!c) throw new Error('FALHA: '+m); checagens++; };

function recortarFuncao(fonte,assinatura){
  const i=fonte.indexOf(assinatura);
  exigir(i>0,assinatura+' sumiu');
  let nivel=0, fim=-1;
  for(let j=fonte.indexOf('{',i);j<fonte.length;j++){
    if(fonte[j]==='{')nivel++;
    else if(fonte[j]==='}'&&--nivel===0){ fim=j+1; break; }
  }
  exigir(fim>0,'nao consegui fechar '+assinatura);
  return fonte.slice(i,fim);
}

/* ── 1. O empurrao, executado ── */
const fonteEmpurrao=recortarFuncao(html,'function empurrarParaForaDe(ent,corpo)');
const ARENA={x0:0,y0:0,x1:640,y1:480};
const ctx={ _pontoSeparacao:{x:0,y:0,radius:0},
  clampCampaignEntity:e=>{ const r=Number(e.radius)||0;
    e.x=Math.max(ARENA.x0+r,Math.min(ARENA.x1-r,e.x));
    e.y=Math.max(ARENA.y0+r,Math.min(ARENA.y1-r,e.y)); return e; } };
vm.createContext(ctx);
vm.runInContext(fonteEmpurrao+';this.empurrar=empurrarParaForaDe;',ctx);
const empurrar=ctx.empurrar;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// a) sobreposto: sai encostado, nem dentro nem longe demais
{
  const corpo={x:320,y:270,radius:24,dead:false};
  const ent={x:325,y:272,radius:11,dead:false};
  exigir(empurrar(ent,corpo)===true,'entidade sobreposta nao foi empurrada');
  exigir(Math.abs(dist(ent,corpo)-35)<0.01,
    'saiu a '+dist(ent,corpo).toFixed(2)+'px em vez de 35 (24+11)');
}
// b) exatamente no centro: sem direcao, mas nao pode travar nem virar NaN
{
  const corpo={x:320,y:270,radius:24,dead:false};
  const ent={x:320,y:270,radius:11,dead:false};
  empurrar(ent,corpo);
  exigir(Number.isFinite(ent.x)&&Number.isFinite(ent.y),'centro exato produziu posicao invalida');
  exigir(Math.abs(dist(ent,corpo)-35)<0.01,'centro exato nao saiu para a borda');
}
// c) longe: nao mexe em quem nao esta encostando
{
  const corpo={x:320,y:270,radius:24,dead:false};
  const ent={x:500,y:270,radius:11,dead:false};
  exigir(empurrar(ent,corpo)===false,'mexeu numa entidade que nem estava encostando');
  exigir(ent.x===500,'a posicao de quem estava longe foi alterada');
  // e logo DEPOIS do contato tambem nao: 1px alem do minimo ja' e' livre
  const raspao={x:320+36,y:270,radius:11,dead:false};
  exigir(empurrar(raspao,corpo)===false,'empurrou quem ja estava fora por 1px — a folga esta grande demais');
  exigir(raspao.x===356,'a posicao de quem estava livre foi alterada');
}
// d) morto, sem raio ou ele mesmo nao valem como corpo
{
  const ent={x:320,y:270,radius:11,dead:false};
  exigir(empurrar(ent,{x:320,y:270,radius:24,dead:true})===false,'corpo morto continuou barrando');
  exigir(empurrar(ent,{x:320,y:270,radius:0,dead:false})===false,'corpo sem raio barrou');
  exigir(empurrar(ent,ent)===false,'a entidade foi empurrada de si mesma');
}
// e) ARMADILHA DA PAREDE: preso entre o objeto e o canto, a saida tem de
//    caber na arena — a saida reta cairia fora e o limite devolveria a
//    entidade para DENTRO do objeto.
{
  const corpo={x:12,y:12,radius:24,dead:false};
  const ent={x:14,y:14,radius:11,dead:false};
  empurrar(ent,corpo);
  exigir(dist(ent,corpo)>=35-0.5,
    'preso no canto acabou dentro do objeto ('+dist(ent,corpo).toFixed(2)+'px de 35)');
  exigir(ent.x>=11&&ent.y>=11,'a saida no canto ficou fora da arena');
}
// e2) O CASO QUE A BUSCA EM ARCO EXISTE PARA RESOLVER: a entidade esta' do
//     lado de FORA do objeto em relacao a' arena, entao a saida reta cai
//     atras da parede. Sem conferir se o ponto cabe, o limite devolve a
//     entidade para dentro do objeto e ela fica presa la'.
{
  const corpo={x:30,y:240,radius:24,dead:false};
  const ent={x:25,y:240,radius:11,dead:false};   // encostado pelo lado da parede
  empurrar(ent,corpo);
  exigir(dist(ent,corpo)>=35-0.5,
    'a saida reta caiu fora da arena e o limite devolveu a entidade para DENTRO do objeto ('
    +dist(ent,corpo).toFixed(2)+'px de 35)');
  exigir(ent.x>=11-0.01,'a entidade acabou fora da arena');
}

/* ── 2. Uma lista so' para heroi e inimigo ── */
{
  // Executada, nao apenas procurada: o que importa e' que ela ENTREGUE os
  // dois lados. Procurar o texto 'getSolidBodies' deixava passar uma versao
  // que calculava a lista do evento e devolvia so' a do objetivo.
  const fonte=recortarFuncao(html,'function corposDeCenario()');
  const c2={ campaignObjectives:{getSolidTargets:()=>[{kind:'obelisk'}]},
             campaignEvents:{getSolidBodies:()=>[{kind:'merchant'}]} };
  vm.createContext(c2);
  vm.runInContext(fonte+';this.f=corposDeCenario;',c2);
  const juntos=c2.f().map(b=>b.kind);
  exigir(juntos.includes('obelisk'),'corposDeCenario perdeu os objetos do objetivo');
  exigir(juntos.includes('merchant'),'corposDeCenario perdeu o objeto do evento ativo');
  exigir(juntos.length===2,'corposDeCenario devolveu '+juntos.length+' corpos em vez de 2');
  // e aguenta os modulos ausentes sem explodir (o acampamento nao os carrega)
  const c3={}; vm.createContext(c3); vm.runInContext(fonte+';this.f=corposDeCenario;',c3);
  exigir(Array.isArray(c3.f())&&c3.f().length===0,'corposDeCenario quebra quando os modulos nao existem');
}
exigir(/function separarDosCorpos\(\)\{[\s\S]*?corposDeCenario\(\)/.test(html),
  'o heroi nao usa mais corposDeCenario');
exigir(/function separarInimigosDoCenario\(\)\{[\s\S]*?corposDeCenario\(\)/.test(html),
  'os inimigos nao usam corposDeCenario — as duas listas divergiram');
exigir(/empurrarParaForaDe\(pl,corpo\)/.test(html)&&/empurrarParaForaDe\(e,corpo\)/.test(html),
  'heroi e inimigo deixaram de usar o mesmo empurrao');
exigir(/e\.update\(dt,aggro\.x,aggro\.y\); clampCampaignEntity\(e\);\n\s*\}\n[\s\S]{0,240}?separarInimigosDoCenario\(\);/.test(html),
  'separarInimigosDoCenario saiu de depois do laco de movimento dos inimigos');

/* ── 3. O que e' solido, e o que NAO e' ── */
const linhaSolidos=objetivos.match(/const SOLIDOS=Object\.freeze\(\[([^\]]*)\]\)/);
exigir(!!linhaSolidos,'a lista SOLIDOS sumiu do modulo de objetivos');
const solidos=linhaSolidos[1].split(',').map(s=>s.trim().replace(/'/g,''));
for(const k of ['bone_altar','dark_altar','demon_altar','obelisk','fire','spider_nest','ancient_chest','survivor_web'])
  exigir(solidos.includes(k),k+' deixou de ser solido');
exigir(!solidos.includes('infernal_fissure'),
  'a fissura infernal virou solida — ela e uma rachadura no CHAO, barrar quem passa por cima e mentira');
exigir(!solidos.includes('hero_ally')&&!solidos.includes('survivor'),
  'o sobrevivente/aliado virou parede — ele anda com o heroi, nao pode barrar');

/* ── 4. O modulo de eventos, rodando ── */
const sandbox={Math,JSON,Date,console};
sandbox.window=sandbox; sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(eventos,sandbox,{filename:'campaign-events.js'});
const CE=sandbox.CampaignEvents;
exigir(!!CE,'CampaignEvents nao carregou');
const inst=CE.create({random:()=>0.5,getPlayers:()=>[],getWave:()=>3,getArena:()=>'castle'});
exigir(typeof inst.getSolidBodies==='function','getSolidBodies nao foi exportado');
exigir(inst.getSolidBodies().length===0,'sem evento ativo ainda apareceu corpo solido');
for(const def of CE.EVENT_DEFS){
  inst.cleanup();
  inst.forceStart(def.id);
  const corpos=inst.getSolidBodies();
  exigir(corpos.length===1,'o evento '+def.id+' nao produziu corpo solido ('+corpos.length+')');
  exigir(corpos[0].radius>0,'o corpo de '+def.id+' esta sem raio');
  // a colisao para o heroi a raio+16; a conversa alcanca raio+64
  exigir(corpos[0].radius+16 < corpos[0].radius+64,
    def.id+': a colisao passou a alcancar mais que a interacao');
}
inst.cleanup();
exigir(inst.getSolidBodies().length===0,'o corpo solido sobreviveu ao fim do evento');
exigir(/distance\(player,active\.node\)>active\.node\.radius\+64/.test(eventos),
  'o alcance de interacao mudou — com a colisao parando o heroi a raio+16, encolhe-lo trava o evento');

/* ── 5. As luzes ANIMAM (nao sao um valor fixo) ── */
const linhaTremor=eventos.match(/const tremor=([^;]+);/);
exigir(!!linhaTremor,'o tremor da lanterna sumiu');
const tremor=new Function('time','return '+linhaTremor[1]+';');
const amostras=[0,120,260,410,700,1300,2600].map(tremor);
exigir(amostras.every(v=>Number.isFinite(v)&&v>0.2&&v<1.15),
  'o tremor da lanterna saiu da faixa util: '+amostras.map(v=>v.toFixed(2)).join(', '));
exigir(Math.max(...amostras)-Math.min(...amostras)>0.08,
  'o tremor da lanterna virou praticamente constante — a chama parou de tremer');
exigir(/globalCompositeOperation='lighter'/.test(eventos),'as luzes deixaram de ser aditivas');
exigir(/createRadialGradient\(lx,ly/.test(eventos),'o halo da lanterna sumiu');
exigir(/createRadialGradient\(ax,ay/.test(eventos),'a aura do espirito sumiu');
exigir(/for\(let i=0;i<7;i\+\+\)\{[\s\S]{0,400}?Math\.sin\(t\*Math\.PI\)/.test(eventos),
  'as motas do espirito sumiram ou pararam de nascer/sumir suavemente');
// A fase entra na conta DAS MOTAS, nao em qualquer lugar do arquivo: sem ela
// dois espiritos seguidos comecariam com as motas exatamente nas mesmas
// posicoes, e a aparicao ficaria com cara de repeticao.
exigir(/const t=\(\(time\*[.\d]+\)\+i\/7\+node\.phase\*[.\d]+\)%1;/.test(eventos),
  'as motas deixaram de usar a fase do proprio no — dois espiritos seguidos sairiam identicos');

console.log('OK: colisao de cenario e luzes verificadas ('+checagens+' verificacoes). '
  +'Heroi e inimigos usam a mesma lista, a fissura segue atravessavel, '
  +'e lanterna e espirito animam.');
