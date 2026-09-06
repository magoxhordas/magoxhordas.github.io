/* Verificador do INPUT MOBILE ANALOGICO.
 *
 * O modulo e' carregado de verdade num DOM de mentira, com relogio
 * controlavel, e os toques sao SIMULADOS: pointerdown/move/up/cancel,
 * dois dedos ao mesmo tempo, perda de foco, troca de tela. "A constante
 * existe no arquivo" nao prova que soltar o dedo para o personagem.
 *
 * Existe porque o mobile era um simulador de W/A/S/D: 8 direcoes, uma
 * velocidade so', e um multiplicador de 1.85x colado por cima do Player e
 * da Dungeon para disfarcar a rigidez.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=a=>fs.readFileSync(path.join(root,a),'utf8').replace(/\r\n/g,'\n');
const fonte=ler('src/core/input-system.js');
const html=ler('index.html');
const dungeon=ler('src/dungeon/dungeon-system.js');
const settings=ler('src/ui/settings-system.js');

let checagens=0;
const exigir=(c,m)=>{ if(!c) throw new Error(`FALHA: ${m}`); checagens++; };
const perto=(a,b,tol=1e-6)=>Math.abs(a-b)<=tol;

/* ── Bancada: DOM minimo, relogio controlavel, listeners capturados ── */
function montar({touch=true,largura=800}={}){
  const listeners=new Map();
  const criado=[];
  const elemento=()=>({style:{setProperty(){},removeProperty(){}},classList:{_s:new Set(),
      add(c){this._s.add(c);},remove(c){this._s.delete(c);},contains(c){return this._s.has(c);}},
    setAttribute(){},appendChild(){},querySelector:()=>null,remove(){}});
  const corpo=elemento(); corpo.classList.add('mobile-gameplay-active');
  const doc={
    body:corpo,
    head:{appendChild(){}},
    documentElement:{style:{setProperty(){}}},
    createElement(){const e=elemento();criado.push(e);return e;},
    getElementById:()=>null,
    addEventListener(tipo,fn){ if(!listeners.has(tipo))listeners.set(tipo,[]); listeners.get(tipo).push(fn); },
    readyState:'complete',
    hidden:false,
  };
  let relogio=0;
  const janelaListeners=new Map();
  const sb={
    console, document:doc, innerWidth:largura,
    performance:{now:()=>relogio},
    navigator:{maxTouchPoints:touch?5:0},
    matchMedia:()=>({matches:touch}),
    GameEvents:{emit(){}},
    GameSettings:{autoAttack:false},
    addEventListener(tipo,fn){ if(!janelaListeners.has(tipo))janelaListeners.set(tipo,[]); janelaListeners.get(tipo).push(fn); },
  };
  sb.window=sb; sb.globalThis=sb;
  vm.createContext(sb);
  vm.runInContext(fonte,sb,{filename:'input-system.js'});
  const disparar=(tipo,ev)=>(listeners.get(tipo)||[]).forEach(fn=>fn(ev));
  const dispararJanela=(tipo,ev)=>(janelaListeners.get(tipo)||[]).forEach(fn=>fn(ev));
  const avancar=ms=>{ relogio+=ms; sb.InputManager.getMovementVector(); };
  const assentar=(ms=400)=>{ for(let t=0;t<ms;t+=16) avancar(16); };
  const toque=(id,x,y,extra={})=>({pointerId:id,pointerType:'touch',target:{closest:()=>null},
    clientX:x,clientY:y,preventDefault(){},...extra});
  return {sb,doc,disparar,dispararJanela,avancar,assentar,toque,listeners,
    get vetor(){return sb.InputManager.getMovementVector();}};
}

// ── 1 a 5. VETOR, MAGNITUDE, ZONA MORTA, DIAGONAIS ──
{
  const B=montar();
  const S=B.sb.MobileTouchSensor, R=100;
  const v=(x,y)=>S.vetorDoDelta(x,y,R);

  // 360 graus: varios angulos saem no mesmo angulo
  for(const grau of [0,23,45,67,90,137,180,215,270,349]){
    const a=grau*Math.PI/180;
    const r=v(Math.cos(a)*R,Math.sin(a)*R);
    exigir(Math.abs(Math.atan2(r.y,r.x)-Math.atan2(Math.sin(a),Math.cos(a)))<1e-6,
      `angulo ${grau} nao foi preservado`);
  }
  // magnitude: borda cheia, meio curso parcial, centro zero
  exigir(perto(v(R,0).magnitude,1,1e-9),'borda nao da velocidade cheia');
  const meio=v(R*0.5,0).magnitude;
  exigir(meio>0.3&&meio<0.75,`meio curso deu ${meio}; esperado entre 0.3 e 0.75`);
  exigir(v(0,0).magnitude===0,'centro deveria ser zero');
  // zona morta RADIAL: mesmo limiar em qualquer direcao
  const zm=S.ajuste.ZONA_MORTA;
  for(const grau of [0,45,90,135,180,270]){
    const a=grau*Math.PI/180, d=R*zm*0.6;
    exigir(v(Math.cos(a)*d,Math.sin(a)*d).magnitude===0,`zona morta falhou em ${grau} graus`);
  }
  exigir(zm>=0.05&&zm<=0.15,`zona morta ${zm} fora da faixa util`);
  // diagonal nao corre mais que cardinal
  const diag=v(R*Math.SQRT1_2,R*Math.SQRT1_2);
  exigir(perto(Math.hypot(diag.x,diag.y),v(R,0).magnitude,1e-9),'diagonal mais rapida que cardinal');
  exigir(perto(diag.x,diag.y,1e-12),'diagonal assimetrica');
  // magnitude nunca passa de 1, nem com o dedo muito alem do raio
  exigir(v(R*5,R*5).magnitude<=1+1e-9,'magnitude passou de 1 fora do raio');
}

// ── 6 a 9. POINTERDOWN / MOVE / UP / CANCEL ──
{
  const B=montar();
  exigir(B.vetor.active===false,'comecou com movimento ativo');
  B.disparar('pointerdown',B.toque(1,100,300));
  exigir(B.sb.MobileTouchSensor.isMoving(),'pointerdown nao assumiu o joystick');
  exigir(B.vetor.magnitude===0,'pointerdown sozinho ja gerou movimento');
  B.disparar('pointermove',B.toque(1,160,300));
  B.assentar();
  exigir(B.vetor.magnitude>0.4&&B.vetor.x>0,`arrasto nao gerou vetor: ${JSON.stringify(B.vetor)}`);
  B.disparar('pointerup',B.toque(1,160,300));
  B.assentar();
  exigir(B.vetor.active===false,'pointerup nao parou o movimento');
  exigir(B.sb.InputManager.hasAnalogMovement()===false,'pointerup deixou fonte analogica presa');

  // pointercancel (o navegador rouba o toque) tem de limpar igual
  B.disparar('pointerdown',B.toque(2,100,300));
  B.disparar('pointermove',B.toque(2,170,300));
  B.assentar(100);
  exigir(B.vetor.magnitude>0,'segundo arrasto nao gerou vetor');
  B.disparar('pointercancel',B.toque(2,170,300));
  B.assentar();
  exigir(B.vetor.active===false,'pointercancel deixou o personagem andando sozinho');
}

// ── 10 e 11. BLUR E VISIBILITYCHANGE ──
{
  const B=montar();
  B.disparar('pointerdown',B.toque(1,100,300));
  B.disparar('pointermove',B.toque(1,180,300));
  B.assentar(100);
  exigir(B.vetor.magnitude>0,'arrasto nao gerou vetor antes do blur');
  B.dispararJanela('blur');
  B.assentar();
  exigir(B.vetor.active===false,'perder o foco deixou input preso');

  B.disparar('pointerdown',B.toque(3,100,300));
  B.disparar('pointermove',B.toque(3,180,300));
  B.assentar(100);
  B.doc.hidden=true;
  B.disparar('visibilitychange',{});
  B.assentar();
  exigir(B.vetor.active===false,'esconder a aba deixou input preso');
}

// ── 12 e 13. MULTITOUCH: JOYSTICK + DASH ──
{
  const B=montar();
  // dedo 1 no joystick
  B.disparar('pointerdown',B.toque(1,100,300));
  B.disparar('pointermove',B.toque(1,170,300));
  B.assentar(120);
  const antes=B.vetor.magnitude;
  exigir(antes>0,'joystick nao iniciou');
  // dedo 2 num BOTAO (o Dash) — nao pode roubar nem cancelar o movimento
  const noBotao=B.toque(2,700,500,{target:{closest:sel=>sel.includes('button')?{}:null}});
  exigir(B.sb.MobileTouchSensor.shouldCapture(noBotao)===false,'o toque no botao virou movimento');
  B.disparar('pointerdown',noBotao);
  B.disparar('pointerup',noBotao);
  B.assentar(60);
  exigir(B.vetor.magnitude>0,'apertar o Dash cancelou o movimento');
  // e o dedo 1 continua mandando
  B.disparar('pointermove',B.toque(1,100,240));
  B.assentar(300);
  exigir(B.vetor.y<0,'o joystick parou de responder depois do segundo dedo');
  // o segundo dedo nao pode virar um segundo joystick
  B.disparar('pointerdown',B.toque(4,120,300));
  exigir(B.sb.MobileTouchSensor.shouldCapture(B.toque(4,120,300))===false,
    'um segundo dedo na zona virou outro joystick');
}

// ── 14 e 15. ZONAS BLOQUEADAS E MENUS ──
{
  const B=montar({largura:800});
  // metade direita e' do Dash/Pausa: nao nasce joystick la'
  exigir(B.sb.MobileTouchSensor.dentroDaZona(B.toque(1,100,300))===true,'zona de movimento rejeitou a esquerda');
  exigir(B.sb.MobileTouchSensor.dentroDaZona(B.toque(1,700,300))===false,'zona de movimento aceitou a direita');
  exigir(B.sb.MobileTouchSensor.shouldCapture(B.toque(1,700,300))===false,'toque na direita virou movimento');
  // elementos de interface nunca iniciam movimento
  for(const sel of ['button','#pause-menu','#settings-screen','#inventory-panel','#hud-bottom']){
    const ev=B.toque(1,100,300,{target:{closest:q=>q.includes(sel.replace('#',''))?{}:null}});
    exigir(B.sb.MobileTouchSensor.shouldCapture(ev)===false,`toque em ${sel} virou movimento`);
  }
  // fora do gameplay nao ha joystick
  B.doc.body.classList.remove('mobile-gameplay-active');
  exigir(B.sb.MobileTouchSensor.shouldCapture(B.toque(1,100,300))===false,'joystick nasceu fora do gameplay');
}

// ── 16 e 17. DESKTOP INTACTO ──
{
  const B=montar({touch:false});
  exigir(B.sb.MobileTouchSensor.isCoarseDevice()===false,'desktop foi tratado como touch');
  exigir(B.sb.MobileTouchSensor.shouldCapture(B.toque(1,100,300))===false,'desktop capturou toque de movimento');
  const mouse=B.toque(1,100,300,{pointerType:'mouse'});
  exigir(B.sb.MobileTouchSensor.shouldCapture(mouse)===false,'ponteiro de mouse virou joystick');
  // teclado segue funcionando e nao e' contaminado pelo analogico
  const estado={};
  B.sb.InputManager.registerScope('t',{state:estado});
  B.sb.InputManager.pressVirtual('x','d');
  exigir(estado['d']===true,'teclado virtual parou de funcionar');
  B.sb.InputManager.releaseVirtual('x','d');
  exigir(estado['d']===false,'soltar tecla virtual parou de funcionar');
  const so=B.sb.InputManager.combinarMovimento(1,0);
  exigir(so.dx===1&&so.dy===0,'teclado sozinho foi alterado pelo analogico');
}

/* ── HIBRIDO: aparelho com touch usado no MOUSE ──
   Notebook com tela sensivel existe. O ponteiro de mouse nao pode virar
   joystick so' porque o aparelho aceita toque. */
{
  const B=montar({touch:true});
  exigir(B.sb.MobileTouchSensor.isCoarseDevice()===true,'aparelho hibrido nao foi reconhecido como touch');
  const mouse=B.toque(1,100,300,{pointerType:'mouse'});
  exigir(B.sb.MobileTouchSensor.shouldCapture(mouse)===false,
    'ponteiro de mouse virou joystick em aparelho com tela sensivel');
  exigir(B.sb.MobileTouchSensor.shouldCapture(B.toque(1,100,300))===true,
    'o dedo deixou de funcionar no mesmo aparelho');
}

/* ── DUAS FONTES ANALOGICAS SOMADAS ──
   O vetor final nunca pode passar de 1, senao a diagonal anda mais rapido
   que o cardinal — que e' o bug classico de movimento em 8 direcoes. */
{
  const B=montar();
  B.sb.InputManager.setAnalogMovement('a',1,0);
  B.sb.InputManager.setAnalogMovement('b',0,1);
  B.assentar(400);
  exigir(B.vetor.magnitude<=1+1e-6,
    `duas fontes somadas passaram de 1 (${B.vetor.magnitude}) — diagonal correria mais`);
  exigir(B.vetor.x>0.5&&B.vetor.y>0.5,'as duas fontes deveriam somar em diagonal');
}

// ── 18 a 20. RESET E NADA PRESO ──
{
  const B=montar();
  B.disparar('pointerdown',B.toque(1,100,300));
  B.disparar('pointermove',B.toque(1,180,300));
  B.assentar(120);
  exigir(B.vetor.magnitude>0,'arrasto nao gerou vetor');
  B.sb.InputManager.releaseAll('pausa');           // e' o que a Pausa chama
  B.assentar();
  exigir(B.vetor.active===false,'releaseAll (Pausa) nao zerou o analogico');
  B.sb.InputManager.setAnalogMovement('touch',1,0);
  B.assentar(200);
  exigir(B.vetor.magnitude>0,'nao voltou a andar depois do reset');
  B.sb.InputManager.resetAnalog();                  // e' o que a troca de tela chama
  B.assentar();
  exigir(B.vetor.active===false,'resetAnalog nao zerou o analogico');
  exigir(B.sb.InputManager.hasAnalogMovement()===false,'sobrou fonte analogica depois do reset');
}

// ── SUAVIZACAO: rapida, e independente de quadros ──
{
  const B=montar();
  B.sb.InputManager.setAnalogMovement('touch',1,0);
  let ms=0; while(B.vetor.magnitude<0.9&&ms<1000){ B.avancar(16); ms+=16; }
  exigir(ms<=200,`demorou ${ms}ms para chegar a 90% da velocidade — devia ser quase imediato`);
  B.sb.InputManager.clearAnalogMovement('touch');
  let parada=0; while(B.vetor.magnitude>0.05&&parada<1000){ B.avancar(16); parada+=16; }
  exigir(parada<=200,`demorou ${parada}ms para parar`);

  // mesmo alvo, taxas de quadro diferentes -> mesmo resultado
  const medir=(passo)=>{
    const C=montar();
    C.sb.InputManager.setAnalogMovement('touch',1,0);
    for(let t=0;t<160;t+=passo) C.avancar(passo);
    return C.vetor.magnitude;
  };
  const a30=medir(33), a60=medir(16), a120=medir(8);
  exigir(Math.abs(a30-a60)<0.05&&Math.abs(a60-a120)<0.05,
    `suavizacao depende da taxa de quadros: 30fps=${a30.toFixed(3)} 60fps=${a60.toFixed(3)} 120fps=${a120.toFixed(3)}`);
}

// ── INVERSAO DE DIRECAO: virar tem de ser mais rapido que acelerar ──
{
  const B=montar();
  B.sb.InputManager.setAnalogMovement('touch',1,0);
  B.assentar(400);
  exigir(B.vetor.x>0.9,'nao chegou a velocidade cheia antes da inversao');
  B.sb.InputManager.setAnalogMovement('touch',-1,0);
  let ms=0; while(B.vetor.x>-0.5&&ms<1000){ B.avancar(16); ms+=16; }
  exigir(ms<=200,`giro de 180 levou ${ms}ms — o pedido e' que seja quase imediato`);
}

// ── O CODIGO ANTIGO NAO PODE VOLTAR ──
{
  exigir(!/MOVEMENT_BOOST/.test(fonte),'o multiplicador artificial de 1.85x voltou');
  exigir(!/Player\.prototype\.update=wrapped/.test(fonte),'o input voltou a patchar o Player');
  exigir(!/dng\._update=wrapped/.test(fonte),'o input voltou a patchar a Dungeon');
  exigir(!/pressVirtual\(SOURCE/.test(fonte),'o movimento voltou a virar W/A/S/D virtual');
  exigir(!/toggleAutoAttack\(\)/.test(fonte),'o input voltou a reescrever a preferencia salva de auto-ataque');
  exigir(/mobileAutoAttackOverride/.test(fonte)&&/mobileAutoAttackOverride/.test(settings),
    'o auto-ataque do touch precisa ser override de runtime, nao preferencia salva');

  // os tres modos consomem O MESMO vetor — sem regra duplicada
  const usos=(html.match(/InputManager\.combinarMovimento/g)||[]).length;
  exigir(usos>=2,`campanha e acampamento precisam consumir o vetor (achei ${usos} usos)`);
  exigir(/InputManager\.combinarMovimento/.test(dungeon),'a Dungeon nao consome o vetor analogico');
  exigir(!/pSpeed\s*\*\s*1\.85/.test(dungeon),'a Dungeon voltou a ter multiplicador de touch');

  // direcao visual separada da fisica
  exigir(/direcaoVisual/.test(fonte)&&/direcaoVisual/.test(html)&&/direcaoVisual/.test(dungeon),
    'a direcao do sprite nao esta separada da fisica de 360 graus');

  // safe areas e gestos do navegador
  exigir(/safe-top/.test(fonte)&&/safe-right/.test(fonte)&&/safe-bottom/.test(fonte),
    'os controles nao respeitam as areas seguras');
  exigir(/overscroll-behavior:none/.test(fonte),'o gameplay nao bloqueia o puxar-para-atualizar');
  exigir(/touch-action:none/.test(fonte),'o gameplay nao bloqueia gestos do navegador sobre o canvas');

  // o acampamento resolve os eixos separadamente (desliza na parede)
  exigir(/livre\(S\.x\+dx\*vel,S\.y\)/.test(html)&&/livre\(S\.x,S\.y\+dy\*vel\)/.test(html),
    'o acampamento perdeu o deslizamento por eixo');
}

console.log(`OK: input mobile analogico verificado (${checagens} verificacoes).`);
