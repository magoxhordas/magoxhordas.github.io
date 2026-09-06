/* Verificador do DUPLO CLIQUE = CONTINUAR nas telas de escolha.
 *
 * Nao e' busca de texto: a funcao duploConfirmar e' RECORTADA do index.html e
 * EXECUTADA aqui, com um relogio virtual, para conferir o comportamento real —
 * um clique so' escolhe, dois no mesmo cartao confirmam, e nada mais confirma.
 *
 * Existe por causa de tres armadilhas concretas:
 *   1. no celular o 'dblclick' nao vem quando a pagina pode ser ampliada (o
 *      toque duplo vira zoom), entao os cartoes precisam de touch-action;
 *   2. a tela seguinte nasce debaixo do cursor — sem trava, o terceiro clique
 *      do mesmo impulso confirmaria de novo, pulando uma tela inteira;
 *   3. se o teclado passasse pelo mesmo caminho, segurar Enter (que repete)
 *      comecaria a partida sozinho.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');

let checagens=0;
const exigir=(c,m)=>{ if(!c) throw new Error(`FALHA: ${m}`); checagens++; };

/* ── 1. Recorta o codigo que roda de verdade ── */
const inicio=html.indexOf('const DUPLO_MS=');
exigir(inicio>0,'const DUPLO_MS sumiu do index.html');
const abre=html.indexOf('function duploConfirmar(',inicio);
exigir(abre>inicio,'function duploConfirmar sumiu do index.html');
let i=html.indexOf('{',abre), nivel=0, fim=-1;
for(;i<html.length;i++){
  if(html[i]==='{')nivel++;
  else if(html[i]==='}'&&--nivel===0){ fim=i+1; break; }
}
exigir(fim>0,'nao consegui fechar o corpo de duploConfirmar');
const fonte=html.slice(inicio,fim);

/* ── 2. Executa com relogio virtual (nada de tempo real) ── */
let agora=0;
const duploConfirmar=new Function('performance',`${fonte}; return duploConfirmar;`)({now:()=>agora});

const CARTAO_A={}, CARTAO_B={};
let escolhas=0, confirmacoes=0;
const clicar=(cartao,quando)=>{ agora=quando; duploConfirmar(cartao,()=>escolhas++,()=>confirmacoes++); };
const zerar=()=>{ escolhas=0; confirmacoes=0; };
// cada cenario comeca de um estado limpo: o tempo anda muito alem da janela
const separar=()=>{ agora+=10000; duploConfirmar({},()=>{},()=>{ throw new Error('confirmou no separador'); }); agora+=10000; };

// a) um clique so' escolhe — quem quer ler a ficha nao pode ser jogado no jogo
zerar(); clicar(CARTAO_A,1000);
exigir(escolhas===1&&confirmacoes===0,`um clique deveria so' escolher (escolhas ${escolhas}, confirmacoes ${confirmacoes})`);

// b) dois cliques rapidos no MESMO cartao confirmam uma unica vez
separar(); zerar(); clicar(CARTAO_A,20000); clicar(CARTAO_A,20150);
exigir(confirmacoes===1,`clique duplo deveria confirmar uma vez (confirmou ${confirmacoes}x)`);
exigir(escolhas===2,'o cartao tem de ficar escolhido antes de confirmar');

// c) o clique duplo escolhe ANTES de confirmar, nunca o contrario:
//    confirmar primeiro comecaria a partida com o heroi errado
separar(); zerar();
let ordem=[];
agora=30000; duploConfirmar(CARTAO_A,()=>ordem.push('escolher'),()=>ordem.push('confirmar'));
agora=30150; duploConfirmar(CARTAO_A,()=>ordem.push('escolher'),()=>ordem.push('confirmar'));
exigir(ordem.join('>')==='escolher>escolher>confirmar',`ordem errada: ${ordem.join('>')}`);

// d) dois cartoes DIFERENTES nao sao uma dupla — e' so' trocar de ideia depressa
separar(); zerar(); clicar(CARTAO_A,40000); clicar(CARTAO_B,40100);
exigir(confirmacoes===0,'trocar de cartao depressa nao pode confirmar');

// e) dois cliques distantes sao dois cliques — nao pode confirmar por acaso
separar(); zerar(); clicar(CARTAO_A,50000); clicar(CARTAO_A,50900);
exigir(confirmacoes===0,'dois cliques lentos nao formam uma dupla');

// f) o limite da janela existe e e' o mesmo dos dois lados
const DUPLO_MS=Number(html.match(/const DUPLO_MS=(\d+)/)[1]);
exigir(DUPLO_MS>=250&&DUPLO_MS<=600,`janela do duplo clique fora do razoavel: ${DUPLO_MS}ms`);
separar(); zerar(); clicar(CARTAO_A,60000); clicar(CARTAO_A,60000+DUPLO_MS);
exigir(confirmacoes===1,'no limite exato da janela ainda e uma dupla');
separar(); zerar(); clicar(CARTAO_A,70000); clicar(CARTAO_A,70000+DUPLO_MS+1);
exigir(confirmacoes===0,'um milissegundo depois da janela ja nao e uma dupla');

// g) ARMADILHA 2: tres cliques do mesmo impulso confirmam UMA vez.
//    O terceiro cai na tela seguinte, que ja' nasceu debaixo do cursor.
separar(); zerar();
clicar(CARTAO_A,80000); clicar(CARTAO_A,80120); clicar(CARTAO_B,80240); clicar(CARTAO_B,80360);
exigir(confirmacoes===1,`impulso de quatro cliques confirmou ${confirmacoes}x — deveria confirmar so a primeira tela`);

// g2) e tres cliques no MESMO cartao tambem confirmam uma vez so'
separar(); zerar(); clicar(CARTAO_A,85000); clicar(CARTAO_A,85120); clicar(CARTAO_A,85240);
exigir(confirmacoes===1,`tres cliques no mesmo cartao confirmaram ${confirmacoes}x`);

// h) mas passada a trava, a tela seguinte aceita o duplo clique normalmente
separar(); zerar(); clicar(CARTAO_A,90000); clicar(CARTAO_A,90100);
clicar(CARTAO_B,90800); clicar(CARTAO_B,90900);
exigir(confirmacoes===2,'depois da trava o duplo clique tem de voltar a funcionar');

/* ── 3. As tres telas estao ligadas, cada uma no seu CONTINUAR ── */
const ligacao=[
  ['heroi',       /cartao\.addEventListener\('click',\(\)=>duploConfirmar\(cartao,\(\)=>csEscolher\(cid\),confirmCharSelect\)\)/],
  ['modo de jogo',/c\.addEventListener\('click',\(\)=>duploConfirmar\(c,escolher,confirmarModo\)\)/],
  ['dificuldade', /c\.addEventListener\('click',\(\)=>duploConfirmar\(c,escolher,goCharSelect\)\)/],
];
for(const [tela,re] of ligacao)
  exigir(re.test(html),`a tela de ${tela} nao chama duploConfirmar com o seu proprio CONTINUAR`);

// e cada funcao de confirmar citada existe mesmo
for(const fn of ['confirmCharSelect','confirmarModo','goCharSelect'])
  exigir(html.includes(`function ${fn}(`),`${fn} nao existe mais — o duplo clique aponta para o vazio`);

/* ── 4. ARMADILHA 1: sem isto o celular transforma o toque duplo em zoom ── */
for(const seletor of ['.mn-cartao','.cs-heroi']){
  const j=html.indexOf(`\n${seletor}{`);
  exigir(j>0,`regra CSS ${seletor} nao encontrada`);
  exigir(/touch-action:manipulation/.test(html.slice(j,html.indexOf('}',j))),
    `${seletor} sem touch-action:manipulation — no celular o toque duplo vira zoom e a dupla nunca chega`);
}

/* ── 5. ARMADILHA 3: o teclado NAO passa pelo duplo clique ──
   Enter repete quando segurado; ligar o teclado aqui comecaria a partida. */
for(const trecho of [/keydown',e=>\{ if\(e\.key==='Enter'\|\|e\.key===' '\)\{e\.preventDefault\(\);escolher\(\);\} \}/,
                     /if\(e\.key==='Enter'\|\|e\.key===' '\)\{ e\.preventDefault\(\); csEscolher\(cid\); \}/])
  exigir(trecho.test(html),'o atalho de teclado mudou — ele tem de so ESCOLHER, nunca confirmar (Enter repete quando segurado)');
exigir(!/keydown[^\n]*duploConfirmar/.test(html),'o teclado foi ligado ao duplo clique: segurar Enter comecaria a partida sozinho');

console.log(`OK: duplo clique = continuar verificado (${checagens} verificacoes, janela de ${DUPLO_MS}ms, `
  +`nas 3 telas de escolha).`);
