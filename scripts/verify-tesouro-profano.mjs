/* Verificador do TESOURO PROFANO: a arte da arca e as recompensas que agora
 * sao as MOEDAS do jogo, nao bolinhas de luz proprias.
 *
 * Nao e' busca de texto: o modulo de eventos roda num vm, o evento e' iniciado
 * de verdade e o que se confere e' que a recompensa nasce com uma moeda, que a
 * moeda cai, que a COLETA acompanha a queda e que o desenho e' delegado a ela.
 *
 * Existe por causa de tres armadilhas:
 *   1. se a moeda fosse empurrada para o array `coins` do jogo, a coleta
 *      padrao e a do evento pegariam a MESMA moeda e o jogador receberia
 *      duas vezes;
 *   2. se a posicao da recompensa nao seguisse a moeda, o jogador coletaria
 *      no ar, onde ela nasceu, e nao onde ela esta';
 *   3. o bau amaldicoado e o tesouro profano dividem o mesmo ramo de desenho:
 *      usar a arte nos dois apagaria a diferenca entre um evento bom e um ruim.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=a=>fs.readFileSync(path.join(root,a),'utf8').replace(/\r\n/g,'\n');
const eventos=ler('src/campaign/campaign-events.js');
const runtime=ler('src/campaign/campaign-runtime.js');
const html=ler('index.html');

let checagens=0;
const exigir=(c,m)=>{ if(!c) throw new Error('FALHA: '+m); checagens++; };

/* ── 1. A arte da arca ── */
function lerPNG(rel){
  const b=fs.readFileSync(path.join(root,rel));
  exigir(b.readUInt32BE(0)===0x89504e47,rel+" nao e' PNG");
  let i=8,largura=0,altura=0,cor=-1,prof=0,idat=[];
  while(i<b.length){
    const tam=b.readUInt32BE(i),tipo=b.toString('ascii',i+4,i+8),dados=b.subarray(i+8,i+8+tam);
    if(tipo==='IHDR'){largura=dados.readUInt32BE(0);altura=dados.readUInt32BE(4);prof=dados[8];cor=dados[9];}
    else if(tipo==='IDAT')idat.push(dados);
    else if(tipo==='IEND')break;
    i+=12+tam;
  }
  exigir(cor===6&&prof===8,rel+' nao e RGBA de 8 bits');
  const cru=zlib.inflateSync(Buffer.concat(idat));
  const passo=largura*4,px=Buffer.alloc(altura*passo);let p=0;
  for(let y=0;y<altura;y++){
    const filtro=cru[p++],linha=cru.subarray(p,p+passo);p+=passo;
    for(let x=0;x<passo;x++){
      const a=x>=4?px[y*passo+x-4]:0,b2=y>0?px[(y-1)*passo+x]:0,c=(x>=4&&y>0)?px[(y-1)*passo+x-4]:0;
      let v=linha[x];
      if(filtro===1)v+=a;else if(filtro===2)v+=b2;else if(filtro===3)v+=(a+b2)>>1;
      else if(filtro===4){const pa=Math.abs(b2-c),pb=Math.abs(a-c),pc=Math.abs(a+b2-2*c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?b2:c);}
      px[y*passo+x]=v&255;
    }
  }
  return {largura,altura,em:(x,y)=>{const i=y*passo+x*4;return [px[i],px[i+1],px[i+2],px[i+3]];}};
}
{
  const arq='assets/objects/tesouro_profano.png';
  exigir(fs.existsSync(path.join(root,arq)),arq+' nao existe');
  const im=lerPNG(arq);
  exigir(im.largura===48,'a arca tem '+im.largura+'px mas e desenhada com 48 — o desenho usa vizinho-mais-proximo');
  /* Aqui NAO se exige canto totalmente transparente, como nos sprites de forma
     organica: a arca e' um retangulo que preenche a propria caixa, e a base
     escura chega aos cantos de baixo. O que prova que o fundo saiu e' nao
     sobrar nenhum pixel BRANCO opaco. Os cantos so' precisam estar
     invisiveis — a reducao deixa residuos de alfa 1, que nao aparecem. */
  for(const [x,y] of [[0,0],[im.largura-1,0],[0,im.altura-1],[im.largura-1,im.altura-1]])
    exigir(im.em(x,y)[3]<12,arq+' com canto visivel — o fundo branco nao saiu');
  let opacos=0,sombra=0,laranja=0,brancos=0;
  for(let y=0;y<im.altura;y++)for(let x=0;x<im.largura;x++){
    const [r,g,b,a]=im.em(x,y);
    if(a>200){
      opacos++;
      const brilho=(r+g+b)/3;
      // a sombra assada era cinza dessaturado e CLARO; a arca e' saturada ou escura
      if(Math.max(r,g,b)-Math.min(r,g,b)<28&&brilho>110&&brilho<245)sombra++;
      if(r>200&&g<170&&b<130)laranja++;
      if(Math.min(r,g,b)>225)brancos++;
    }
  }
  exigir(brancos===0,'sobraram '+brancos+' pixels brancos opacos — o fundo do arquivo original ficou');
  exigir(opacos>im.largura*im.altura*0.25,'a arca ficou quase vazia');
  exigir(sombra===0,'sobraram '+sombra+' pixels da sombra assada — drawNode ja desenha a sombra dele, ficariam duas');
  exigir(laranja>40,'o brilho alaranjado da arca sumiu ('+laranja+' pixels)');
}

/* ── 2. Arte so' no tesouro, nunca no bau amaldicoado ── */
exigir(/const arteArca=node\.kind==='profaned_treasure'&&deps\.drawObject\?\.\(ctx,'tesouro_profano',x,y\+18,48\)/.test(eventos),
  'a arca perdeu a arte, ou ela vazou para o bau amaldicoado');
exigir(/if\(!arteArca\)\{[\s\S]{0,600}?ctx\.fillStyle='#32192f'/.test(eventos),
  'o desenho a mao deixou de ser reserva da arca');

/* ── 3. O modulo rodando: recompensa E' moeda ── */
const sandbox={Math,JSON,Date,console};
sandbox.window=sandbox; sandbox.globalThis=sandbox;
vm.createContext(sandbox);
vm.runInContext(eventos,sandbox,{filename:'campaign-events.js'});
const CE=sandbox.CampaignEvents;
exigir(!!CE,'CampaignEvents nao carregou');

/* Canvas de mentira: drawNode desenha sombra, gradiente e formas antes de
   chegar nas recompensas. Um stub com meia duzia de metodos quebrava no
   primeiro que faltasse, entao aqui QUALQUER metodo existe e nao faz nada. */
function canvasFalso(aoDesenharArco){
  const alvo={createRadialGradient:()=>({addColorStop(){}}),
              createLinearGradient:()=>({addColorStop(){}}),
              measureText:()=>({width:10}),
              arc:(...a)=>{ aoDesenharArco?.(...a); }};
  return new Proxy(alvo,{
    get(o,k){ if(k in o)return o[k]; return ()=>{}; },
    set(){ return true; },
  });
}

function moedaFalsa(x,y,valor){
  return {x,y,valor,quedas:0,desenhos:0,assentada:false,
    update(){ this.quedas++; if(this.quedas>3){this.y+=4;this.assentada=true;} },
    draw(){ this.desenhos++; }};
}
const jogador={x:320,y:300,radius:14,idx:0};
const criadas=[];
const inst=CE.create({
  random:()=>0.5, getPlayers:()=>[jogador], getWave:()=>7, getArena:()=>'castle',
  criarMoeda:(x,y,v)=>{ const m=moedaFalsa(x,y,v); criadas.push(m); return m; },
  spawnNotice:()=>{}, spawnParts:()=>{}, addCoins:()=>{}, addXp:()=>{},
  spawnEnemy:()=>null, getEnemies:()=>[],
});
inst.forceStart('profaned_treasure');
exigir(inst.debugSnapshot().phase==='waiting','o tesouro nao comeca esperando o jogador');
exigir(inst.handleActionDown(0)===true,'nao deu para iniciar a coleta com o jogador ao lado');
exigir(inst.debugSnapshot().phase==='collect','a coleta nao comecou');

// o jogador sai de perto para nao coletar tudo enquanto medimos
jogador.x=60; jogador.y=460;
for(let i=0;i<12;i++) inst.update(0.1);
exigir(criadas.length>0,'nenhuma moeda foi criada — a recompensa voltou a ser bolinha de luz');
exigir(criadas.every(m=>m.quedas>0),'a moeda foi criada mas nunca caiu (update nao e chamado)');

// ARMADILHA 2: a coleta tem de seguir a moeda, nao ficar onde ela nasceu
{
  const antes=criadas.map(m=>m.y);
  for(let i=0;i<6;i++) inst.update(0.1);
  exigir(criadas.some((m,i)=>m.y!==antes[i]),'a moeda parou de cair');
  const desenhosAntes=criadas.map(m=>m.desenhos);
  inst.draw(canvasFalso(),1000);
  exigir(criadas.some((m,i)=>m.desenhos>desenhosAntes[i]),
    'o desenho nao foi delegado a moeda — a bolinha antiga voltou a aparecer');
}
exigir(/if\(reward\.moeda\)\{ reward\.moeda\.update\(\); reward\.x=reward\.moeda\.x; reward\.y=reward\.moeda\.y; \}/.test(eventos),
  'a posicao da recompensa deixou de seguir a moeda — o jogador coletaria no ar');

// ARMADILHA 1: sem a fabrica, a bolinha antiga volta em vez de sumir tudo
{
  const semMoeda=CE.create({random:()=>0.5,getPlayers:()=>[{x:320,y:300,radius:14,idx:0}],
    getWave:()=>7,getArena:()=>'castle',spawnNotice:()=>{},spawnParts:()=>{},
    addCoins:()=>{},addXp:()=>{},spawnEnemy:()=>null,getEnemies:()=>[]});
  semMoeda.forceStart('profaned_treasure');
  semMoeda.handleActionDown(0);
  for(let i=0;i<12;i++) semMoeda.update(0.1);
  let arcos=0;
  semMoeda.draw(canvasFalso(()=>{arcos++;}),1000);
  const desenhou=arcos>0;
  exigir(desenhou,'sem a fabrica de moeda a recompensa ficou invisivel — a reserva sumiu');
}

/* ── 4. A fabrica nao pode entregar a moeda ao jogo ── */
exigir(/criarMoeda:\(x,y,valor\)=>\{/.test(runtime),'criarMoeda sumiu do runtime');
{
  const i=runtime.indexOf('criarMoeda:(x,y,valor)=>{');
  const corpo=runtime.slice(i,i+260);
  exigir(/new Coin\(x,y,valor\)/.test(corpo),'criarMoeda deixou de usar a Coin do jogo');
  exigir(!/coins\.push/.test(corpo),
    'criarMoeda passou a empurrar a moeda para o array do jogo — a coleta padrao e a do evento pegariam a mesma moeda e pagariam duas vezes');
}
exigir(/class Coin \{/.test(html),'a classe Coin sumiu do jogo');

console.log('OK: tesouro profano verificado ('+checagens+' verificacoes). '
  +'Arca com arte propria e recompensas que sao a moeda do jogo, caindo e coletadas onde caem.');
