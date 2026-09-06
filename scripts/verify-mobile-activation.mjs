/* Verificador da ATIVACAO DOS CONTROLES DE CELULAR e do DASH COM O DEDO PARADO.
 *
 * Nao e' busca de texto: o vigia de estado e' RECORTADO do index.html e
 * EXECUTADO aqui, com requestAnimationFrame falso e estado controlado, para
 * conferir que ele liga os controles quando a partida comeca de verdade.
 *
 * Existe por causa de dois defeitos encontrados testando no celular:
 *
 *   1. updateMobileControls tinha uma LISTA de gatilhos (trocar de tela, girar,
 *      redimensionar, abrir a mochila, e um MutationObserver nos filhos diretos
 *      de <body>). A abertura do capitulo termina DENTRO do laco do jogo:
 *      'chapter' vira 'playing' sem passar por nenhum deles. Resultado medido
 *      no navegador: partida rodando, joystick desligado, botoes escondidos —
 *      um arrasto inteiro na tela dava vetor ZERO. O heroi nao andava.
 *
 *   2. triggerDash tem um ramo para "apertar Dash sem soltar o movimento", mas
 *      perguntava por hasAnalogMovement(), que responde "ha' vetor", nao "ha'
 *      dedo": dentro da zona morta a fonte e' removida e o ramo nunca rodava —
 *      justamente no caso para o qual foi escrito.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=a=>fs.readFileSync(path.join(root,a),'utf8').replace(/\r\n/g,'\n');
const html=ler('index.html');

let checagens=0;
const exigir=(c,m)=>{ if(!c) throw new Error(`FALHA: ${m}`); checagens++; };

/* ── 1. Recorta o vigia e roda com rAF falso ── */
const marca='(function vigiarEstadoDoJogo(){';
const inicio=html.indexOf(marca);
exigir(inicio>0,'o vigia de estado sumiu do index.html');
let i=html.indexOf('{',inicio+marca.length-1), nivel=0, fim=-1;
for(i=inicio+marca.length-1;i<html.length;i++){
  if(html[i]==='{')nivel++;
  else if(html[i]==='}'&&--nivel===0){ fim=i+1; break; }
}
exigir(fim>0,'nao consegui fechar o corpo do vigia');
// e' uma IIFE: depois do } da funcao ainda vem o )() que a executa
exigir(html.slice(fim,fim+4)===')();','o vigia deixou de ser uma IIFE — o recorte nao fecha');
const fonte=html.slice(inicio,fim+4);

function rodarVigia({coarse=true, estados=[], dng='-'}={}){
  const fila=[];
  const chamadas=[];
  let estado=estados[0];
  const ctx={
    requestAnimationFrame:f=>{ fila.push(f); return fila.length; },
    getResponsiveViewport:()=>({coarse}),
    updateMobileControls:()=>chamadas.push(estado),
    get state(){ return estado; },
    DNG:undefined,
  };
  const corpo=`with(ctx){ ${fonte} }`;
  // 'with' deixa o trecho ler state/DNG/rAF do contexto sem reescrever o codigo
  new Function('ctx',corpo)(ctx);
  // avanca um quadro por estado da lista
  for(const e of estados){
    estado=e;
    const proximo=fila.shift();
    if(proximo) proximo();
  }
  return {chamadas, quadrosAgendados:fila.length};
}

// a) instala e reage a' PRIMEIRA leitura
const so=rodarVigia({estados:['chapter']});
exigir(so.chamadas.length===1,`o vigia deveria ligar os controles no primeiro quadro (ligou ${so.chamadas.length}x)`);

// b) O DEFEITO: capitulo -> jogando tem de acordar os controles
const corrida=rodarVigia({estados:['chapter','chapter','chapter','playing','playing']});
exigir(corrida.chamadas.includes('playing'),
  'a virada de capitulo para "playing" nao ligou os controles — e este e o bug: no celular a partida comeca sem joystick e sem botoes');

// c) ...mas so' quando MUDA: quadro parado nao pode mexer no DOM 60x por segundo
exigir(corrida.chamadas.length===2,
  `o vigia tocou o DOM ${corrida.chamadas.length}x em 5 quadros com 2 estados — deveria tocar so' nas mudancas`);
exigir(corrida.chamadas[0]==='chapter'&&corrida.chamadas[1]==='playing',
  `ordem errada das mudancas: ${corrida.chamadas.join(' -> ')}`);

// d) toda transicao conta, nao so' a do comeco (pausa, nivel, fim de jogo)
const volta=rodarVigia({estados:['playing','paused','paused','playing','dead']});
exigir(volta.chamadas.join(',')==='playing,paused,playing,dead',
  `transicoes perdidas: ${volta.chamadas.join(',')}`);

// e) no desktop nao se instala nada: seria um rAF eterno sem nada para ligar
const desktop=rodarVigia({coarse:false, estados:['chapter','playing']});
exigir(desktop.chamadas.length===0,'o vigia se instalou no desktop, onde nao ha controles de toque');
exigir(desktop.quadrosAgendados===0,'o vigia deixou um requestAnimationFrame rodando no desktop');

// f) o laco se realimenta: um quadro tem de agendar o proximo
exigir(so.quadrosAgendados>=1,'o vigia parou de agendar o proximo quadro — vigiaria uma vez so');

/* ── 2. O dash com o dedo parado no joystick ── */
exigir(/hasAnalogMovement\?\.\(\)\|\|window\.MobileTouchSensor\?\.isMoving\?\.\(\)/.test(html),
  'o dash voltou a perguntar so por hasAnalogMovement — com o polegar parado na zona morta a fonte ja foi removida e o ramo morre');
exigir(/const v=InputManager\.getMovementVector\(\);\n\s*if\(v\.magnitude>0\.25\)/.test(html),
  'o dash deixou de usar o vetor analogico quando ele tem forca');

/* ── 3. Capturar o ponteiro nao pode derrubar o botao ── */
exigir(/try\{ button\.setPointerCapture\?\.\(e\.pointerId\); \}catch\(_\)\{\}/.test(html),
  'setPointerCapture voltou a ficar desprotegido: quando ele lanca (ponteiro ja solto), o resto do handler — inclusive o Dash — nunca roda');

console.log(`OK: ativacao dos controles no celular verificada (${checagens} verificacoes). `
  +`O vigia liga na virada de capitulo, so' age na mudanca e nao se instala no desktop.`);
