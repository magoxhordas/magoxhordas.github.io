/* Verificador do ALIADO DA TEMPESTADE, dos BALOES DE FALA, da TELA DO
 * MERCADOR e do EFEITO ELETRICO em corpos grandes.
 *
 * Nao e' busca de texto: o bloco de combate do aliado e' RECORTADO do modulo
 * e EXECUTADO aqui com inimigos de mentira, entao o que se confere e' para
 * onde ele anda, em quem ele bate e quanto ele apanha.
 *
 * Existe por causa de quatro coisas que o jogador reclamou e que voltariam
 * sem alguem olhando:
 *   1. o aliado seguia o HEROI e dava um soco generico igual para todas as
 *      classes — parecia enfeite, nao companheiro;
 *   2. ele era invulneravel, entao a briga dele nao tinha consequencia;
 *   3. o efeito eletrico desenhava raios do tamanho do CORPO: num chefe
 *      viravam um X gigante que escondia o chefe;
 *   4. na tela do mercador o preco vinha grudado no nome, e a regra que
 *      separava os dois falhava calada — deixando os tres cartoes empilhados.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=a=>fs.readFileSync(path.join(root,a),'utf8').replace(/\r\n/g,'\n');
const objetivos=ler('src/campaign/campaign-objectives.js');
const events=ler('src/campaign/campaign-events.js');
const ui=ler('src/campaign/campaign-ui.js');
const runtime=ler('src/campaign/campaign-runtime.js');
const html=ler('index.html');

let checagens=0;
const exigir=(c,m)=>{ if(!c) throw new Error('FALHA: '+m); checagens++; };

/* ── 1. O bloco de combate do aliado, executado ── */
const inicio=objetivos.indexOf('const ALIADO_PERFIL=Object.freeze({');
exigir(inicio>0,'ALIADO_PERFIL sumiu');
const fimMarca=objetivos.indexOf('function damageSurvivor(',inicio);
exigir(fimMarca>inicio,'nao achei o fim do bloco do aliado');
const fonte=objetivos.slice(inicio,fimMarca);
for(const nome of ['perfilAliado','golpeDoAliado','danificarAliado','updateHeroAlly'])
  exigir(fonte.includes('function '+nome)||fonte.includes(nome+'='),nome+' saiu do bloco do aliado');

let projeteis=[], avisos=[], particulas=[];
const ctx={
  Math,
  distance:(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0)),
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  enemies:()=>ctx.__inimigos,
  runtime:{parts:(...a)=>particulas.push(a)},
  deps:{ getWave:()=>18, now:()=>Date.now(),
         spawnNotice:(x,y,t)=>avisos.push(t),
         spawnAllyProjectile:(x,y,ang,dano,cor)=>{projeteis.push({x,y,ang,dano,cor});return true;} },
  __inimigos:[],
  // As falas moram fora do bloco recortado; aqui elas so' precisam existir
  // para o codigo rodar, e o registro serve para conferir QUANDO ele fala.
  __ditas:[],
  falarDe:(alvo,grupo)=>ctx.__ditas.push(grupo),
  falar:()=>{},
};
vm.createContext(ctx);
vm.runInContext(fonte+';this.updateHeroAlly=updateHeroAlly;this.golpeDoAliado=golpeDoAliado;'
  +'this.danificarAliado=danificarAliado;this.perfilAliado=perfilAliado;this.ALIADO_PERFIL=ALIADO_PERFIL;',ctx);

const novoAliado=(classe,x=320,y=330)=>({kind:'hero_ally',heroi:{id:classe,nome:'Aliado'},label:'Aliado',
  x,y,radius:14,hp:246,maxHp:246,golpeT:0,atacando:0,passo:0,olhando:'down',dead:false,flashTimer:0});
const inimigo=(x,y,extra={})=>({x,y,radius:11,dead:false,damage:12,hp:500,
  takeDmg(d){this.hp-=d;this.recebeu=(this.recebeu||0)+d;},...extra});

// a) O ALVO E' O INIMIGO, NAO O HEROI. Heroi de um lado, inimigo do outro:
//    andar na direcao do heroi era exatamente a reclamacao.
{
  ctx.__inimigos=[inimigo(500,330)];
  const a=novoAliado('warrior',320,330);
  const antes=a.x;
  for(let i=0;i<20;i++) ctx.updateHeroAlly(a,1/60);
  exigir(a.x>antes+10,`o aliado nao foi atras do inimigo (x ${antes} -> ${a.x.toFixed(1)})`);
}
// b) Sem inimigo vivo ele nao sai andando sozinho
{
  ctx.__inimigos=[];
  const a=novoAliado('warrior',320,330);
  for(let i=0;i<20;i++) ctx.updateHeroAlly(a,1/60);
  exigir(Math.abs(a.x-320)<0.01&&Math.abs(a.y-330)<0.01,'sem inimigo o aliado andou sozinho');
  exigir(a.andando===false,'sem inimigo o aliado ficou em animacao de andar');
}
// c) Atirador nao briga colado: com o inimigo em cima, ele RECUA
{
  ctx.__inimigos=[inimigo(320+30,330)];
  const a=novoAliado('archer',320,330);
  for(let i=0;i<20;i++) ctx.updateHeroAlly(a,1/60);
  exigir(a.x<320-2,`o arqueiro nao recuou do corpo a corpo (x ${a.x.toFixed(1)})`);
}
// d) Corpo a corpo faz o contrario: fecha a distancia
{
  ctx.__inimigos=[inimigo(520,330)];
  const a=novoAliado('viking',320,330);
  for(let i=0;i<30;i++) ctx.updateHeroAlly(a,1/60);
  exigir(a.x>330,`o viking nao fechou a distancia (x ${a.x.toFixed(1)})`);
}
// e) CADA CLASSE COM O SEU GOLPE: o arqueiro solta DOIS projeteis
{
  projeteis=[];
  const a=novoAliado('archer',320,330);
  const alvo=inimigo(420,330);
  ctx.golpeDoAliado(a,ctx.perfilAliado(a),alvo,[alvo]);
  exigir(projeteis.length===2,`o arqueiro soltou ${projeteis.length} projeteis em vez de 2`);
  exigir(projeteis[0].ang!==projeteis[1].ang,'as duas flechas sairam no mesmo angulo');
  exigir(projeteis.every(p=>p.dano>0),'projetil do aliado saiu sem dano');
}
// f) ...e o mago, um so'
{
  projeteis=[];
  const a=novoAliado('mage',320,330);
  const alvo=inimigo(420,330);
  ctx.golpeDoAliado(a,ctx.perfilAliado(a),alvo,[alvo]);
  exigir(projeteis.length===1,`o mago soltou ${projeteis.length} projeteis em vez de 1`);
}
// g) O giro do viking pega TODA a volta; o arco do guerreiro so' a frente
{
  const a=novoAliado('viking',320,330);
  const frente=inimigo(360,330), atras=inimigo(280,330);
  ctx.golpeDoAliado(a,ctx.perfilAliado(a),frente,[frente,atras]);
  exigir(frente.recebeu>0&&atras.recebeu>0,'o giro do viking deixou de pegar quem estava atras');
}
{
  const a=novoAliado('warrior',320,330);
  const frente=inimigo(360,330), atras=inimigo(280,330);
  ctx.golpeDoAliado(a,ctx.perfilAliado(a),frente,[frente,atras]);
  exigir(frente.recebeu>0,'o arco do guerreiro nao acertou quem estava na frente');
  exigir(!atras.recebeu,'o arco do guerreiro acertou quem estava ATRAS dele');
}
// h) Sem projetil disponivel o atirador nao pode virar enfeite
{
  const semTiro={...ctx.deps,spawnAllyProjectile:()=>false};
  const guardado=ctx.deps; ctx.deps=semTiro;
  const a=novoAliado('mage',320,330);
  const alvo=inimigo(420,330);
  ctx.golpeDoAliado(a,ctx.perfilAliado(a),alvo,[alvo]);
  ctx.deps=guardado;
  exigir(alvo.recebeu>0,'sem projetil o mago aliado ficou so fazendo pose');
}
// i) ELE APANHA, e a vida nao passa de zero nem some de uma vez
{
  const a=novoAliado('warrior');
  const inicial=a.hp;
  const levou=ctx.danificarAliado(a,40);
  exigir(levou>0&&a.hp<inicial,'o aliado nao levou dano');
  exigir(levou<=14,`um golpe tirou ${levou} de vida — o teto de 14 sumiu e ele morre em poucos toques`);
  exigir(!a.dead,'o aliado morreu com um golpe so');
  for(let i=0;i<200&&!a.dead;i++) ctx.danificarAliado(a,40);
  exigir(a.dead&&a.hp===0,'o aliado nao morre nunca, ou a vida passou de zero');
  exigir(avisos.some(t=>/CAIU/.test(t)),'a queda do aliado nao avisa ninguem');
}
// j) Morto, ele para de agir
{
  ctx.__inimigos=[inimigo(500,330)];
  const a=novoAliado('warrior',320,330); a.dead=true;
  ctx.updateHeroAlly(a,1/60);
  exigir(a.x===320,'o aliado morto continuou andando');
}
// k) Toda classe jogavel tem perfil, e o padrao nunca e' undefined
{
  for(const c of ['mage','archer','warrior','viking','necromancer'])
    exigir(!!ctx.ALIADO_PERFIL[c],'a classe '+c+' ficou sem perfil de combate');
  const desconhecido=ctx.perfilAliado({heroi:{id:'nao_existe'}});
  exigir(!!desconhecido&&desconhecido.alcance>0,'classe desconhecida deixou o aliado sem perfil');
  for(const [id,p] of Object.entries(ctx.ALIADO_PERFIL)){
    exigir(p.alcance>0&&p.cadencia>0&&p.dano>0,id+' com perfil invalido');
    if(p.recuo)exigir(p.recuo<p.alcance,id+': o recuo ficou maior que o alcance, ele oscilaria no lugar');
  }
}

/* ── 2. Barra de vida e balao ── */
exigir(/O ALIADO DA TEMPESTADE/.test(objetivos),'o comentario que explica o aliado sumiu');
exigir(!/if\(!aliado\)\{\n\s*const vida=clamp\(target\.hp/.test(objetivos),
  'a barra de vida voltou a ser so do sobrevivente — o aliado apanha e precisa mostrar quanto');
exigir(/desenharBalao\(ctx,target,x,y-56\)/.test(objetivos),'o balao sumiu do sobrevivente/aliado');
exigir(/desenharObjeto\(ctx,'casulo_sobrevivente'[^)]*\)\)\{desenharBalao/.test(objetivos),
  'o casulo voltou a sair do desenho antes do balao — o pedido de socorro nunca apareceria');
exigir(/falarDe\(preso,'preso'/.test(objetivos),'o sobrevivente preso parou de pedir socorro');
exigir(/falarDe\(target,'solto'/.test(objetivos),'o sobrevivente parou de agradecer ao ser solto');
exigir(/falarDe\(current\.data\.aliado,'chegada'/.test(objetivos),'o aliado parou de avisar que chegou');
exigir(/Math\.random\(\)<\.12/.test(objetivos),'o aliado voltou a falar a cada golpe — vira balao piscando');
{
  const m=objetivos.match(/const FALAS=Object\.freeze\(\{([\s\S]*?)\}\);/);
  exigir(!!m,'o catalogo de falas sumiu');
  for(const g of ['preso','solto','chegada','apanha'])
    exigir(new RegExp(g+':\\s*\\[').test(m[1]),'o grupo de falas "'+g+'" sumiu');
}

/* ── 3. A tela do mercador ── */
{
  const m=ui.match(/const corte=bruto\.match\((\/.*?\/)\);/);
  exigir(!!m,'a regra que separa o preco do nome sumiu');
  const re=new RegExp(m[1].slice(1,m[1].lastIndexOf('/')));
  /* A ARMADILHA: o titulo termina com a MOEDA, nao com o numero. Exigir digito
     no fim fazia a separacao falhar em toda oferta e, sem preco, todo cartao
     caia na classe neutra, que ocupa a linha inteira. */
  for(const [texto,nome,preco] of [
      ['Ração de Campo · 7🪙','Ração de Campo','7'],
      ['Pedra de Amolar · 11🪙','Pedra de Amolar','11'],
      ['Talismã do Vento · 9🪙','Talismã do Vento','9']]){
    const c=texto.match(re);
    exigir(!!c,'o preco de "'+texto+'" nao foi separado — os cartoes viram uma pilha');
    exigir(c[1]===nome,'nome errado: '+c[1]);
    exigir(c[2]===preco,'preco errado: '+c[2]);
  }
  exigir(!'Seguir viagem'.match(re),'"Seguir viagem" foi tratada como oferta com preco');
}
exigir(/#campaign-choice-ornamento/.test(ui),'o ornamento de losango sumiu da tela de escolha');
exigir(/campaign-choice-option-price/.test(ui),'a etiqueta de preco sumiu');
exigir(/\.campaign-choice-option\.neutra\{[^}]*grid-column:1\/-1/.test(ui),
  '"Seguir viagem" deixou de ocupar a linha inteira');
exigir(/const neutra=option\.neutral===true/.test(ui),
  'opcoes gratuitas voltaram a ser confundidas com a acao neutra do mercador');
exigir(/id:'leave',title:'Seguir viagem'[^\n]*neutral:true/.test(events),
  '"Seguir viagem" perdeu a marcacao neutra explicita');
exigir(/#campaign-choice-title\{[^}]*letter-spacing/.test(ui),'o titulo perdeu a tipografia dos menus');

/* ── 4. O efeito eletrico em corpo grande ── */
{
  const i=html.indexOf("if(active('electric')){");
  exigir(i>0,'o bloco eletrico sumiu');
  const bloco=html.slice(i,i+2600);
  exigir(/const grande=r>=30;/.test(bloco),'o efeito eletrico voltou a tratar chefe e inimigo igual');
  exigir(/const alcance=Math\.min\(r\*\.42,24\);/.test(bloco),
    'o comprimento da faisca voltou a acompanhar o tamanho do corpo — num chefe vira um X gigante');
  exigir(/const quantas=Math\.min\(7,3\+Math\.round\(r\/18\)\);/.test(bloco),
    'o corpo grande deixou de ganhar MAIS faiscas; so encolher deixa o chefe sem efeito nenhum');
  exigir(/const lavagem=grande\?\.35:1;/.test(bloco),
    'a lavagem branca voltou a ser cheia no chefe — era ela que apagava o corpo');
  // o inimigo pequeno tem de continuar exatamente como era
  exigir(/\}else\{[\s\S]{0,700}?ctx\.moveTo\(cx\+Math\.cos\(a\)\*r\*\.95, cy\+Math\.sin\(a\)\*r\*\.95\);/.test(bloco),
    'o desenho antigo (dos inimigos pequenos) foi perdido junto');
  // conferencia numerica do que muda entre um inimigo e um chefe
  const alcance=r=>Math.min(r*.42,24), quantas=r=>Math.min(7,3+Math.round(r/18));
  exigir(alcance(58)<=24,'a faisca do chefe passa de 24px');
  exigir(alcance(58)<58*.95*2,'a faisca do chefe ainda cruza o corpo inteiro');
  exigir(quantas(58)>quantas(30),'o corpo maior nao ganha mais faiscas');
}

/* ── 5. O projetil do aliado existe de verdade ── */
exigir(/spawnAllyProjectile:\(x,y,ang,dano,cor\)=>\{/.test(runtime),'spawnAllyProjectile sumiu do runtime');
exigir(/p\.isFriendly=true;/.test(runtime),'o projetil do aliado deixou de ser amigo — acertaria o proprio heroi');
exigir(/checkPetProjCollisions/.test(html),'a colisao de projetil amigo sumiu do jogo');

console.log('OK: aliado, falas, mercador e efeito eletrico verificados ('+checagens+' verificacoes). '
  +'O aliado caca inimigos com o golpe da classe, apanha e pode cair.');
