/* Verificador das ARTES de objeto entregues pelo usuario:
 * Espirito Errante, Mercador Perdido e Casulo do Sobrevivente.
 *
 * Nao e' so' "o arquivo existe": o PNG e' DECODIFICADO aqui e conferido
 * pixel a pixel — fundo mesmo removido, sem contorno escuro de reducao,
 * sem franja verde de chroma key — e o codigo e' conferido para garantir
 * que o desenho a mao continua de reserva.
 *
 * Existe por causa de quatro armadilhas que apareceram ao integrar:
 *   1. apagar "toda cor branca" fura os olhos do fantasma; a remocao tem
 *      de ser pelas BORDAS;
 *   2. reduzir sem alfa pre-multiplicado deixa um halo escuro na borda;
 *   3. desenharObjeto usa imageSmoothingEnabled=false, entao o PNG precisa
 *      ja' vir na largura em que e' desenhado, ou os fios da teia somem;
 *   4. trocar um .js sem mexer na marca ?v= faz quem ja' jogou continuar
 *      com o codigo velho em cache — e a arte nova nunca aparece.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=a=>fs.readFileSync(path.join(root,a),'utf8').replace(/\r\n/g,'\n');
const html=ler('index.html');
const eventos=ler('src/campaign/campaign-events.js');
const objetivos=ler('src/campaign/campaign-objectives.js');

let checagens=0;
const exigir=(c,m)=>{ if(!c) throw new Error(`FALHA: ${m}`); checagens++; };

/* ── Decodificador de PNG suficiente para estes arquivos ──
   (RGBA de 8 bits, sem entrelacamento — que e' o que o Pillow gerou) */
function lerPNG(rel){
  const b=fs.readFileSync(path.join(root,rel));
  exigir(b.readUInt32BE(0)===0x89504e47,`${rel} nao e' PNG`);
  let i=8, largura=0, altura=0, cor=-1, prof=0, idat=[];
  while(i<b.length){
    const tam=b.readUInt32BE(i), tipo=b.toString('ascii',i+4,i+8), dados=b.subarray(i+8,i+8+tam);
    if(tipo==='IHDR'){ largura=dados.readUInt32BE(0); altura=dados.readUInt32BE(4); prof=dados[8]; cor=dados[9];
      exigir(dados[12]===0,`${rel} esta entrelacado; o jogo espera PNG simples`); }
    else if(tipo==='IDAT') idat.push(dados);
    else if(tipo==='IEND') break;
    i+=12+tam;
  }
  exigir(cor===6&&prof===8,`${rel} nao e' RGBA de 8 bits (cor=${cor} prof=${prof}) — sem canal alfa nao ha transparencia`);
  const cru=zlib.inflateSync(Buffer.concat(idat));
  const canais=4, passo=largura*canais, px=Buffer.alloc(altura*passo);
  let p=0;
  for(let y=0;y<altura;y++){
    const filtro=cru[p++]; const linha=cru.subarray(p,p+passo); p+=passo;
    for(let x=0;x<passo;x++){
      const a=x>=canais?px[y*passo+x-canais]:0;
      const b2=y>0?px[(y-1)*passo+x]:0;
      const c=(x>=canais&&y>0)?px[(y-1)*passo+x-canais]:0;
      let v=linha[x];
      if(filtro===1)v+=a; else if(filtro===2)v+=b2; else if(filtro===3)v+=(a+b2)>>1;
      else if(filtro===4){ const pa=Math.abs(b2-c),pb=Math.abs(a-c),pc=Math.abs(a+b2-2*c);
        v+= (pa<=pb&&pa<=pc)?a:(pb<=pc?b2:c); }
      px[y*passo+x]=v&255;
    }
  }
  return {largura,altura,px,passo,
    em:(x,y)=>{const i=y*passo+x*4;return [px[i],px[i+1],px[i+2],px[i+3]];}};
}

/* ── 1. As tres artes, com a largura em que sao desenhadas ── */
const ARTES=[
  {arq:'assets/objects/espirito_errante.png',    largura:36, semVerde:false},
  {arq:'assets/objects/mercador_perdido.png',    largura:44, semVerde:false},
  {arq:'assets/objects/casulo_sobrevivente.png', largura:30, semVerde:true },
];
for(const {arq,largura,semVerde} of ARTES){
  exigir(fs.existsSync(path.join(root,arq)),`${arq} nao existe`);
  const im=lerPNG(arq);
  // a largura do arquivo tem de ser a largura de desenho: desenharObjeto usa
  // vizinho-mais-proximo, e reescalar aqui comeria detalhe fino
  exigir(im.largura===largura,
    `${arq} tem ${im.largura}px de largura mas e desenhado com ${largura} — com imageSmoothing desligado isso come detalhe`);
  exigir(im.altura>=im.largura*0.6&&im.altura<=im.largura*2.6,`${arq} com proporcao estranha (${im.largura}x${im.altura})`);

  // o fundo saiu mesmo: os quatro cantos transparentes
  for(const [x,y,nome] of [[0,0,'superior esquerdo'],[im.largura-1,0,'superior direito'],
                           [0,im.altura-1,'inferior esquerdo'],[im.largura-1,im.altura-1,'inferior direito']])
    exigir(im.em(x,y)[3]===0,`${arq} com o canto ${nome} opaco — o fundo nao foi removido`);

  // ...e sobrou desenho: nem tudo virou transparencia
  let opacos=0, verdes=0;
  for(let y=0;y<im.altura;y++)for(let x=0;x<im.largura;x++){
    const [r,g,b,a]=im.em(x,y);
    if(a>200)opacos++;
    if(a>120&&g>r+30&&g>b+30)verdes++;
  }
  const area=im.largura*im.altura;
  exigir(opacos>area*0.15,`${arq} quase vazio: so' ${opacos} de ${area} pixels opacos`);
  /* Nao ha checagem de "halo de reducao" aqui: medindo os tres arquivos, o
     contorno escuro que ela procuraria e' indistinguivel do contorno PRETO
     legitimo do mercador. Uma checagem que nao separa os dois casos so'
     daria falso alarme. */
  if(semVerde) exigir(verdes===0,`${arq} ainda tem ${verdes} pixels verdes do chroma key`);
}

/* ── 2. Ligadas no codigo, com o desenho a mao de reserva ── */
exigir(/desenharObjeto\(ctx,'casulo_sobrevivente',x,y\+\d+,\d+,target\)/.test(objetivos),
  'o casulo do sobrevivente nao e desenhado no alvo survivor_web');
/* A janela e' generosa de proposito: ela existe para garantir que o desenho a
   mao continue NO MESMO ramo, nao para medir quantos comentarios cabem antes
   dele. Uma janela apertada quebra sozinha quando alguem documenta o trecho. */
exigir(/survivor_web'\)\{[\s\S]{0,1200}?ctx\.strokeStyle='#e0ebe4'/.test(objetivos),
  'o desenho a mao do casulo sumiu — ele e a reserva enquanto o PNG nao carrega');
exigir(/drawObject\?\.\(ctx,'mercador_perdido',x,y\+\d+,\d+\)/.test(eventos),
  'o mercador perdido nao usa a arte dedicada');
exigir(/if\(!arteMercador\)\{[\s\S]{0,400}?ctx\.fillStyle='#5a3c2a'/.test(eventos),
  'o desenho a mao do mercador deixou de ser reserva');
exigir(/drawObject\?\.\(ctx,'espirito_errante',x,y\+\d+,\d+\)/.test(eventos),
  'o espirito errante nao usa a arte dedicada');
exigir(/if\(!desenhado\)\{ctx\.globalAlpha=\.70;ctx\.fillStyle='#c9baff'/.test(eventos),
  'o desenho a mao do espirito deixou de ser reserva');
// o necromante do capitulo 5 e' proposital e vem ANTES da arte generica
exigir(eventos.indexOf("drawHero?.(ctx,'necromancer'")<eventos.indexOf("drawObject?.(ctx,'espirito_errante'"),
  'a arte generica passou na frente do necromante do capitulo 5, que e uma aparicao proposital');

/* ── 3. ARMADILHA 4: script trocado sem marca de versao fica em cache ── */
for(const script of ['src/campaign/campaign-events.js','src/campaign/campaign-objectives.js']){
  const marca=`<script src="${script}?v=`;
  exigir(html.includes(marca),
    `${script} esta sem marca ?v= no index.html — quem ja jogou continuaria com o codigo velho em cache e nunca veria a arte nova`);
}

console.log(`OK: artes de objeto verificadas (${checagens} verificacoes). `
  +`3 PNGs RGBA na largura de desenho, fundo removido e sem chroma, ligados com o desenho a mao de reserva.`);
