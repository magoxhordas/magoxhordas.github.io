/* ════════════════════════════════════════════════════
   FEEDBACK DE COMBATE ("juice") — sistema central de impacto.

   A regra que orienta tudo aqui: CADA ACAO IMPORTANTE DEVE PARECER
   IMPORTANTE. O objetivo nao e' "mais efeitos"; e' contraste. Se tudo for
   grande, nada parece grande.

   E a regra que ele nunca pode quebrar: JUICE E' FEEDBACK, NAO PODER.
   Nada aqui toca dano, cooldown, critico, alcance, vida, velocidade,
   hitbox ou IA. O modulo so' OBSERVA o combate e desenha por cima.

   ── Por que este arquivo reaproveita tanta coisa ──
   O jogo ja' tinha, antes deste sistema:
     - spawnParts() com object pool e teto de 600;
     - triggerScreenShake();
     - RunStats.createAttackEvent() -> um id por CICLO de ataque, ja'
       propagado ate' os projeteis em _runAttackEventId;
     - InimigosNormais.tingir() + _ultimoQuadro, que tingem exatamente o
       quadro que o inimigo acabou de desenhar;
     - audio procedural, onde variar o pitch e' multiplicar a frequencia.
   Nada disso foi refeito. O id de ataque, em especial, e' o que faz um
   golpe que acerta 10 inimigos gerar UM impacto, e nao dez.

   Script classico, como o resto do projeto.
   ════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  /* ── Configuracao. Todo numero de ajuste mora aqui. ── */
  const CONFIG={
    /* Perfis de forca. A diferenca entre eles E' o sistema: nao adianta
       dar particula para todo mundo se o Arco Curto e o Machado Colossal
       terminarem parecidos. */
    PERFIS:{
      light:   {particulas:3,  shake:0,   anelRaio:0,  pausaVisual:0,  flash:0.35, som:'leve'},
      medium:  {particulas:5,  shake:1.2, anelRaio:0,  pausaVisual:0,  flash:0.55, som:'medio'},
      heavy:   {particulas:9,  shake:3,   anelRaio:26, pausaVisual:35, flash:0.85, som:'pesado'},
      massive: {particulas:16, shake:6,   anelRaio:46, pausaVisual:60, flash:1.00, som:'massivo'},
    },

    /* Cooldown que separa "arma rapida" de "arma lenta". Sai do catalogo
       real: 520ms (Arco Curto) ate' 1650ms (Machado Colossal). */
    CD_LEVE:640,      // ate' aqui = light
    CD_PESADO:1150,   // a partir daqui = heavy

    /* Throttles. Sem eles uma arma de 520ms vira estroboscopio. */
    FLASH_COOLDOWN_MS:70,        // por inimigo
    FLASH_COOLDOWN_CHEFE_MS:110, // chefe apanha muito: ritmo proprio
    SHAKE_COOLDOWN_MS:90,
    SOM_COOLDOWN_MS:{leve:70,medio:70,pesado:0,massivo:0},

    /* Duracao do flash. Curto de proposito: e' reacao, nao pintura. */
    FLASH_MS:{light:45,medium:60,heavy:80,massive:95},

    /* Tetos. O jogo nao pode perder quadro porque dez inimigos pegaram
       veneno ao mesmo tempo. */
    MAX_NUMEROS:34,
    MAX_ANEIS:12,
    /* O teto de particulas quem manda e' o spawnParts (600, com pool).
       Aqui so' limito quantas EU peco por quadro. */
    MAX_PARTICULAS_POR_QUADRO:60,

    /* Numeros de dano. Tamanho por CLASSE, nunca proporcional ao valor:
       10000 de dano nao pode virar fonte 140. */
    NUMEROS:{
      normal:   {fonte:9,  cor:'#e8e2d4', subida:0.55, vida:620},
      pesado:   {fonte:12, cor:'#ffd8a0', subida:0.62, vida:720},
      critico:  {fonte:15, cor:'#ffd23f', subida:0.75, vida:840},
      dot:      {fonte:7,  cor:'#9fd48a', subida:0.35, vida:520},
      cura:     {fonte:10, cor:'#7fe3a0', subida:0.60, vida:700},
    },
    /* Agrupamento: uma arma muito rapida nao pode virar nuvem ilegivel. */
    MERGE_JANELA_MS:280,
    MERGE_RAIO:26,

    /* Pseudo-hitstop. NAO congela o jogo: enfatiza o quadro. O jogo tem
       56 setTimeout em relogio de parede (multi-hit da Espada Longa, das
       Laminas Gemeas, dos Machados Gemeos, os ticks do Cajado Solar), e
       um freeze real deixaria esses golpes caindo durante a pausa. */
    PAUSA_MAX_MS:80,

    /* Intensidade por preferencia do jogador (item 60). */
    INTENSIDADE:{baixa:0.6,normal:1,alta:1.35},
  };

  /* Paletas de particula por elemento. Curtas e legiveis — nada de
     nuvem que esconde o inimigo ou o telegrafo do chefe. */
  const ELEMENTOS={
    physical:{cores:['#e8e2d4','#b9b2a2'],espalha:1.0},
    fire:    {cores:['#ff8a22','#ff3b30','#ffd06a'],espalha:1.1},
    ice:     {cores:['#d9f5ff','#45a9ff'],espalha:0.9},
    electric:{cores:['#fff7a8','#ffd83d'],espalha:1.25},
    poison:  {cores:['#8fce4a','#52d63b'],espalha:0.8},
    shadow:  {cores:['#7a5cc0','#3a2a5a'],espalha:0.85},
    arcane:  {cores:['#c79bff','#8a4cff'],espalha:1.0},
    solar:   {cores:['#ffe9a8','#ffd24a'],espalha:1.05},
    wind:    {cores:['#d6f6ff','#80e9ff'],espalha:1.2},
    blood:   {cores:['#c74343','#7d1f1f'],espalha:0.9},
  };

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const num=v=>(typeof v==='number'&&isFinite(v)?v:0);

  let deps={};
  let depurando=false;
  let ultimoDebug=null;

  /* Estado proprio do modulo. Nada de gameplay mora aqui. */
  const numeros=[];        // numeros de dano flutuantes
  const aneis=[];          // aneis de impacto
  const eventos=new Map(); // attackEventId -> agregado do ciclo
  let pausaAte=0;          // pseudo-hitstop: ate' quando enfatizar
  let pausaForca=0;
  let ultimoShakeEm=-1e9;
  let particulasNesteQuadro=0;
  let quadroAbertoEm=0;
  const somUltimo={};      // familia de som -> instante

  const agora=()=>(typeof performance!=='undefined'?performance.now():Date.now());

  /* ── Preferencias do jogador (itens 30/31/60) ──
     ATENCAO: GameSettings e' declarado com `const` no topo de um script
     classico, e const de topo cria BINDING LEXICO, nao propriedade de
     window. Ler global.GameSettings devolvia undefined e o sistema
     ignorava a configuracao inteira em silencio — tremor continuava em
     100% com o slider em zero. Por isso quem entrega as preferencias e'
     a injecao de dependencia, como todo o resto deste modulo. */
  function prefs(){
    const p=(typeof deps.getPreferencias==='function')?deps.getPreferencias():null;
    return {
      intensidade:CONFIG.INTENSIDADE[p?.intensidade||'normal']||1,
      shake:clamp(p?.shake===undefined?1:p.shake,0,1),
      reduzirMovimento:!!p?.reduzirMovimento,
      reduzirFlashes:!!p?.reduzirFlashes,
    };
  }

  // ═══════════════════════════════════════════════════════
  // FORCA DO IMPACTO
  // ═══════════════════════════════════════════════════════

  /* Nao usa dano bruto: dano muda com raridade, bencao, buff, dificuldade
     e vida do alvo, entao seria uma medida instavel. A base e' o CICLO —
     quanto tempo a arma leva para bater de novo — com override
     declarativo por arma quando a identidade pedir. */
  function forcaDoAtaque(info){
    if(info.perfilForcado&&CONFIG.PERFIS[info.perfilForcado])return info.perfilForcado;
    const cd=num(info.cooldown);
    let base;
    if(cd<=0)            base='medium';
    else if(cd<=CONFIG.CD_LEVE)   base='light';
    else if(cd>=CONFIG.CD_PESADO) base='heavy';
    else                 base='medium';
    // Summons e pets ficam SEMPRE abaixo do jogador: dez esqueletos nao
    // podem balancar a tela nem encher de anel.
    if(info.origem==='summon')return base==='heavy'?'medium':'light';
    if(info.origem==='pet')return 'light';
    // DOT nunca sobe de patamar: sem shake, sem anel, sem pausa.
    if(info.origem==='dot')return 'light';
    return base;
  }

  /* Sobe um degrau. Usado por critico e por morte de elite/chefe — e' o
     que faz "critico do Machado Colossal" ser diferente de "critico do
     Arco Curto": os dois sobem um degrau, mas partem de lugares
     diferentes. */
  const ORDEM=['light','medium','heavy','massive'];
  function subir(perfil,degraus){
    const i=ORDEM.indexOf(perfil);
    return ORDEM[clamp(i+(degraus||1),0,ORDEM.length-1)];
  }

  // ═══════════════════════════════════════════════════════
  // AGREGACAO POR CICLO DE ATAQUE
  // ═══════════════════════════════════════════════════════

  /* O coracao do item 52/53: um golpe que acerta 10 inimigos, uma rajada
     de 4 flechas ou um raio que salta por 4 alvos sao UM ciclo. O
     primeiro alvo recebe o feedback "caro" (shake, anel, pausa, som
     pesado); os demais recebem so' o local (flash e particula). */
  function agregado(id){
    if(!id)return null;
    let a=eventos.get(id);
    if(!a){
      a={alvos:0,gastouCaro:false,em:agora()};
      eventos.set(id,a);
      if(eventos.size>120){
        const limite=agora()-6000;
        for(const [k,v] of eventos) if(v.em<limite) eventos.delete(k);
      }
    }
    return a;
  }

  // ═══════════════════════════════════════════════════════
  // PRIMITIVAS (item 56)
  // ═══════════════════════════════════════════════════════

  /* O orcamento por quadro se zera sozinho pelo relogio. Antes ele so'
     zerava em atualizar(), que roda apenas com o jogo em combate: fora
     dali o contador estourava e as particulas paravam de nascer para
     sempre, sem erro nenhum. */
  function abrirQuadroSeNecessario(){
    const t=agora();
    if(t-quadroAbertoEm>=14){ quadroAbertoEm=t; particulasNesteQuadro=0; }
  }

  function particulas(x,y,elemento,quantidade,forca){
    abrirQuadroSeNecessario();
    const p=prefs();
    let n=Math.round(quantidade*p.intensidade);
    if(n<=0)return;
    // fora da tela nao vale o custo (item 46)
    if(typeof deps.visivel==='function'&&!deps.visivel(x,y))return;
    n=Math.min(n,CONFIG.MAX_PARTICULAS_POR_QUADRO-particulasNesteQuadro);
    if(n<=0)return;
    particulasNesteQuadro+=n;
    const el=ELEMENTOS[elemento]||ELEMENTOS.physical;
    const vel=(28+forca*16)*el.espalha;
    // Reaproveita o spawnParts do jogo (que ja' tem pool e teto), em vez
    // de criar um segundo sistema de particulas.
    if(typeof deps.spawnParts==='function'){
      const meio=Math.max(1,Math.round(n/el.cores.length));
      el.cores.forEach((cor,i)=>deps.spawnParts(x,y,cor,i===0?n-meio*(el.cores.length-1):meio,vel));
    }
  }

  function anel(x,y,raio,cor,forca){
    const p=prefs();
    if(p.reduzirMovimento&&forca<3)return;
    if(aneis.length>=CONFIG.MAX_ANEIS)aneis.shift();
    aneis.push({x,y,r:6,rMax:raio*p.intensidade,cor:cor||'#ffffff',vida:1,nasceu:agora()});
  }

  /* Shake graduado com teto. O triggerScreenShake original SOBRESCREVIA o
     estado, entao um hit fraco cancelava um shake forte em andamento; e
     dez eventos juntos nunca podem somar ate' virar terremoto. Aqui o
     resultado e' o MAIOR entre o atual e o pedido, com um empurraozinho
     quando os dois sao fortes. */
  function shake(forca,duracao){
    const p=prefs();
    const alvo=forca*p.shake*Math.min(1.15,p.intensidade);
    if(alvo<=0.05)return;
    if(p.reduzirMovimento&&alvo<2.5)return;
    const t=agora();
    if(t-ultimoShakeEm<CONFIG.SHAKE_COOLDOWN_MS&&alvo<3)return;
    ultimoShakeEm=t;
    if(typeof deps.aplicarShake==='function')deps.aplicarShake(alvo,duracao||180);
  }

  /* Pseudo-hitstop: NAO para a logica. Marca uma janela curta em que o
     desenho enfatiza o quadro. Ver o comentario do PAUSA_MAX_MS. */
  function enfase(ms,forca){
    const p=prefs();
    let d=Math.min(CONFIG.PAUSA_MAX_MS,num(ms));
    if(p.reduzirMovimento)d*=0.4;
    if(d<=0)return;
    const t=agora();
    if(t+d>pausaAte){ pausaAte=t+d; pausaForca=forca||1; }
  }

  function flashAlvo(alvo,perfil,elemento,critico){
    if(!alvo)return;
    const p=prefs();
    const chefe=!!(typeof deps.ehChefe==='function'&&deps.ehChefe(alvo));
    const cooldown=chefe?CONFIG.FLASH_COOLDOWN_CHEFE_MS:CONFIG.FLASH_COOLDOWN_MS;
    const t=agora();
    if(t-num(alvo._juiceFlashEm)<cooldown)return;
    alvo._juiceFlashEm=t;
    let forca=CONFIG.PERFIS[perfil].flash*(critico?1.25:1)*p.intensidade;
    if(chefe)forca*=0.55;                 // chefe apanha muito: nunca fica branco
    if(p.reduzirFlashes)forca*=0.45;
    alvo._juiceFlash={ate:t+CONFIG.FLASH_MS[perfil]*(chefe?0.7:1),forca:clamp(forca,0,1),
                      elemento:elemento||'physical',critico:!!critico};
  }

  /* Numero de dano. Agrupa acertos proximos no tempo e no espaco para
     armas rapidas nao virarem nuvem ilegivel. */
  function numero(x,y,valor,classe){
    const v=Math.round(num(valor));
    if(v<=0)return;
    const t=agora();
    for(const n of numeros){
      if(n.classe!==classe)continue;
      if(t-n.nasceu>CONFIG.MERGE_JANELA_MS)continue;
      if(Math.hypot(n.x-x,n.y-y)>CONFIG.MERGE_RAIO)continue;
      n.valor+=v; n.acertos++; n.nasceu=t; n.vida=1;
      return;
    }
    if(numeros.length>=CONFIG.MAX_NUMEROS)numeros.shift();
    const cfg=CONFIG.NUMEROS[classe]||CONFIG.NUMEROS.normal;
    numeros.push({x:x+(Math.random()-0.5)*10,y,valor:v,acertos:1,classe,
                  vida:1,nasceu:t,duracao:cfg.vida,vy:-cfg.subida});
  }

  function som(familia,perfil,critico){
    if(typeof deps.tocarImpacto!=='function')return;
    const t=agora();
    const limite=CONFIG.SOM_COOLDOWN_MS[CONFIG.PERFIS[perfil].som]||0;
    const chave=CONFIG.PERFIS[perfil].som;
    if(limite&&t-num(somUltimo[chave])<limite)return;
    somUltimo[chave]=t;
    // variacao de pitch: o audio e' procedural, entao e' so' multiplicar
    deps.tocarImpacto({familia,perfil,critico:!!critico,pitch:0.95+Math.random()*0.10});
  }

  // ═══════════════════════════════════════════════════════
  // EVENTO DE IMPACTO — a entrada unica
  // ═══════════════════════════════════════════════════════

  /* CombatImpactEvent. O chamador descreve O QUE ACONTECEU; quem decide
     QUAL feedback sai e' este modulo. E' isso que evita espalhar dezenas
     de chamadas diferentes pelas armas. */
  function impacto(info){
    if(!info)return;
    const p=prefs();
    const x=num(info.x), y=num(info.y);
    const elemento=info.elemento||'physical';
    const critico=!!info.critico;
    const origem=info.origem||'player_weapon';

    let perfil=forcaDoAtaque(info);
    if(critico&&origem!=='dot')perfil=subir(perfil,1);

    const ag=agregado(info.attackEventId);
    const primeiro=!ag||!ag.gastouCaro;
    if(ag){ ag.alvos++; }

    // ── feedback LOCAL: sempre, por alvo ──
    flashAlvo(info.alvo,perfil,elemento,critico);
    particulas(x,y,elemento,CONFIG.PERFIS[perfil].particulas,ORDEM.indexOf(perfil));
    if(info.dano>0){
      const classe=origem==='dot'?'dot':(critico?'critico':(perfil==='heavy'||perfil==='massive'?'pesado':'normal'));
      numero(x,y-14,info.dano,classe);
    }

    /* ── feedback CARO: uma vez por ciclo ──
       DOT nunca chega aqui: sem shake, sem anel, sem pausa (item 54). */
    if(primeiro&&origem!=='dot'&&origem!=='pet'){
      if(ag)ag.gastouCaro=true;
      const cfg=CONFIG.PERFIS[perfil];
      if(cfg.shake>0)shake(cfg.shake,perfil==='massive'?240:180);
      if(cfg.anelRaio>0&&!p.reduzirMovimento)anel(x,y,cfg.anelRaio,corDoElemento(elemento),ORDEM.indexOf(perfil));
      if(cfg.pausaVisual>0)enfase(cfg.pausaVisual,ORDEM.indexOf(perfil));
      som(info.familiaSom||'impacto',perfil,critico);
    }

    if(depurando){
      ultimoDebug={impacto:perfil.toUpperCase(),origem:info.arma||origem,
        shake:CONFIG.PERFIS[perfil].shake,particulas:CONFIG.PERFIS[perfil].particulas,
        critico,matou:!!info.matou,alvosNoCiclo:ag?ag.alvos:1,evento:info.attackEventId||'—'};
    }
  }

  function corDoElemento(el){
    const e=ELEMENTOS[el]||ELEMENTOS.physical;
    return e.cores[0];
  }

  // ═══════════════════════════════════════════════════════
  // ATUALIZACAO E DESENHO
  // ═══════════════════════════════════════════════════════

  function atualizar(dt){
    particulasNesteQuadro=0; quadroAbertoEm=agora();
    const ms=num(dt)*1000;
    const t=agora();
    for(let i=numeros.length-1;i>=0;i--){
      const n=numeros[i];
      n.y+=n.vy*(ms/16.67); n.vy*=0.94;
      n.vida=1-(t-n.nasceu)/n.duracao;
      if(n.vida<=0)numeros.splice(i,1);
    }
    for(let i=aneis.length-1;i>=0;i--){
      const a=aneis[i];
      const prog=(t-a.nasceu)/220;
      a.r=6+(a.rMax-6)*Math.min(1,prog);
      a.vida=1-prog;
      if(a.vida<=0)aneis.splice(i,1);
    }
  }

  /* Quanto o quadro deve ser enfatizado agora (0..1). O renderer usa isto
     para o micro zoom e para reforcar o clarao. Nao para o jogo. */
  function enfaseAtual(){
    const t=agora();
    if(t>=pausaAte)return 0;
    const p=prefs();
    if(p.reduzirMovimento)return 0;
    return clamp((pausaAte-t)/CONFIG.PAUSA_MAX_MS,0,1)*clamp(pausaForca/3,0.3,1);
  }

  /* Tintura do alvo que acabou de apanhar. Reaproveita o mesmo caminho
     dos efeitos elementais: source-atop no quadro que a entidade acabou
     de desenhar, entao a cor cai so' onde ha pixel e o contorno continua
     nitido. Nada de retangulo por cima. */
  function desenharFlash(ctx,alvo){
    if(!alvo||!alvo._juiceFlash)return false;
    const f=alvo._juiceFlash;
    const t=agora();
    if(t>=f.ate){ alvo._juiceFlash=null; return false; }
    const resta=(f.ate-t)/CONFIG.FLASH_MS.medium;
    const forca=clamp(f.forca*Math.min(1,resta),0,1);
    if(forca<=0.02)return false;
    const cor=f.critico?'#fff2c0':(f.elemento==='physical'?'#ffffff':corDoElemento(f.elemento));
    if(typeof deps.tingirAlvo==='function')return deps.tingirAlvo(ctx,alvo,cor,forca);
    return false;
  }

  function desenhar(ctx){
    if(!ctx)return;
    // aneis primeiro: ficam ATRAS dos numeros
    for(const a of aneis){
      ctx.save();
      ctx.globalAlpha=Math.max(0,a.vida)*0.75;
      ctx.strokeStyle=a.cor;
      ctx.lineWidth=Math.max(1,2.5*a.vida);
      ctx.beginPath(); ctx.arc(a.x,a.y,a.r,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    for(const n of numeros){
      const cfg=CONFIG.NUMEROS[n.classe]||CONFIG.NUMEROS.normal;
      ctx.save();
      ctx.globalAlpha=clamp(n.vida*1.6,0,1);
      ctx.font=`bold ${cfg.fonte}px "Press Start 2P", monospace`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      const texto=n.acertos>1?`${n.valor}`:`${n.valor}`;
      // contorno em vez de shadowBlur: shadowBlur e' a operacao mais cara
      // do canvas e isto aqui desenha dezenas de vezes por quadro
      ctx.fillStyle='#000000';
      ctx.fillText(texto,n.x+1,n.y+1);
      ctx.fillStyle=cfg.cor;
      ctx.fillText(texto,n.x,n.y);
      ctx.restore();
    }
  }

  // ═══════════════════════════════════════════════════════
  // CICLO DE VIDA
  // ═══════════════════════════════════════════════════════

  function limpar(){
    numeros.length=0;
    aneis.length=0;
    eventos.clear();
    pausaAte=0; pausaForca=0;
    ultimoShakeEm=-1e9;
    for(const k of Object.keys(somUltimo))delete somUltimo[k];
  }

  function configurar(novas){ deps=novas||{}; }

  // ── Depuracao (item 58). Fora da UI normal. ──
  function definirDepuracao(v){ depurando=!!v; }
  function estadoDepuracao(){ return ultimoDebug; }
  function depurar(tipo){
    const x=num(deps.getW?deps.getW()/2:320), y=num(deps.getH?deps.getH()/2:240);
    const mapa={
      'light':{cooldown:520},'medium':{cooldown:900},'heavy':{cooldown:1650},
      'critical-heavy':{cooldown:1650,critico:true},
      'massive':{perfilForcado:'massive'},
    };
    impacto(Object.assign({x,y,elemento:'physical',dano:120,attackEventId:'debug-'+agora()},mapa[tipo]||mapa.medium));
  }

  global.CombatJuiceSystem=Object.freeze({
    CONFIG,ELEMENTOS,
    configurar,impacto,
    particulas,anel,shake,enfase,numero,som,
    atualizar,desenhar,desenharFlash,enfaseAtual,
    limpar,
    definirDepuracao,estadoDepuracao,depurar,
    _forcaDoAtaque:forcaDoAtaque,_subir:subir,
  });
})(typeof window!=='undefined'?window:globalThis);
