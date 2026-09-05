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
    MAX_MARCAS:16,
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

    /* ── MORTE ──
       Morrer nao pode parecer "perder vida". A morte tem sequencia curta
       propria: clarao final, encolhida, fade e fragmentos. Sem sprite
       novo: o fantasma reusa o ULTIMO QUADRO que a entidade desenhou. */
    MORTE:{
      comum:    {dur:170, particulas:8,  anel:0,  shake:0,   escala:0.82},
      critica:  {dur:210, particulas:13, anel:0,  shake:0,   escala:0.74},
      elite:    {dur:300, particulas:20, anel:34, shake:2,   escala:0.70},
      minichefe:{dur:380, particulas:26, anel:44, shake:3.5, escala:0.66},
    },
    MAX_FANTASMAS:14,
    /* Teto do overkill: um bicho de 10 de vida levando 300 ganha uma morte
       um pouco maior, nunca uma explosao nuclear. */
    OVERKILL_MAX:1.6,

    /* Multikill: uma explosao que mata 12 nao pode tocar 12 sons nem
       gerar 12 sequencias. A janela agrega. */
    MULTIKILL_JANELA_MS:400,
    MULTIKILL_MARCOS:[2,5,10],

    /* ── MORTE DE CHEFE ──
       Marcos em ms desde o instante em que a vida chegou a zero. IMPORTANTE:
       para o gameplay o chefe ja' morreu no quadro zero; isto e' so' visual. */
    CHEFE_MORTE:{
      clarao:150, pausa:150, bursts:[180,300,420,540], burstParticulas:14,
      shakeEm:300, shakeForca:7, anelEm:400, anelRaio:120, fim:900,
    },
    /* ── JOGADOR ── */
    JOGADOR:{
      danoLeve:{shake:2.5, vinheta:0.16, dur:180},
      danoPesado:{shake:5, vinheta:0.34, dur:320},
      fracaoPesado:0.22,          // >=22% da vida maxima = golpe pesado
      vidaCriticaEm:0.25,         // avisa uma vez ao cruzar para baixo
      vidaCriticaVolta:0.32,      // e' rearmado so' ao subir de novo
      curaParticulas:7,
    },
    /* Cor do dash por classe. Discreta: identidade, nao fantasia. */
    DASH:{
      shake:1.2, particulas:9,
      cores:{mage:'#b46bff',archer:'#6fe08a',viking:'#ffb347',warrior:'#ff7d6b',
             necromancer:'#7ad9a0',padrao:'#8fb6ff'},
    },

    /* Impacto acumulado no chefe: ataques rapidos so' fazem micro flash;
       quando uma fatia significativa da vida cai numa janela curta, sai um
       impacto pesado. E' o que faz build forte ser PERCEBIDA sem um shake
       por projetil. */
    CHEFE_ACUMULO:{janelaMs:500, fracaoHp:0.04, anelRaio:52, shake:2.5},
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

  /* ── IDENTIDADE POR CATEGORIA ──
     Trinta e duas armas nao podem virar trinta e duas implementacoes. O que
     as separa e' a FAMILIA do golpe, e ela e' declarada aqui, fora do
     desenho: espada corta, machado esmaga largo, martelo levanta poeira,
     lanca perfura em linha, arco risca fino, besta crava, cajado descarrega
     energia, necromante e' espectral.

     A regra e' de padrao no ID, e nao uma lista de 32 nomes: arma nova da
     mesma familia entra sozinha. */
  const CATEGORIAS=[
    /* A ordem importa: a primeira regra que casar vence. `chainblade` tem
       "chain" E "blade" — e' uma corrente (golpe semicircular), entao a
       regra da corrente precisa vir ANTES da regra de lamina. */
    [/chain/,                            'corrente'],
    [/sword|blade|longsword|greatsword/, 'espada'],
    [/axe/,                              'machado'],
    [/hammer|mace/,                      'martelo'],
    [/spear|lance/,                      'lanca'],
    [/crossbow/,                         'besta'],
    [/bow/,                              'arco'],
    [/staff/,                            'cajado'],
    [/shield/,                           'escudo'],
    [/necromancer|profane|soul|bone/,    'necro'],
  ];
  /* Assinatura visual de cada familia. "marca" e' a forma curta desenhada
     no ponto de contato; nada aqui muda area, alcance ou dano. */
  const ASSINATURAS={
    espada:  {marca:'corte',   arco:0.85, comprimento:26, espessura:2,   fragmentos:0.7},
    machado: {marca:'corte',   arco:1.35, comprimento:30, espessura:3.5, fragmentos:1.4},
    martelo: {marca:'poeira',  arco:0,    comprimento:0,  espessura:0,   fragmentos:1.2},
    lanca:   {marca:'linha',   arco:0,    comprimento:34, espessura:2,   fragmentos:0.6},
    arco:    {marca:'risco',   arco:0,    comprimento:16, espessura:1,   fragmentos:0.5},
    besta:   {marca:'crava',   arco:0,    comprimento:20, espessura:2.5, fragmentos:1.1},
    cajado:  {marca:'energia', arco:0,    comprimento:0,  espessura:0,   fragmentos:1.0},
    escudo:  {marca:'poeira',  arco:0,    comprimento:0,  espessura:0,   fragmentos:0.8},
    corrente:{marca:'corte',   arco:1.6,  comprimento:28, espessura:2,   fragmentos:0.9},
    necro:   {marca:'espectro',arco:0,    comprimento:0,  espessura:0,   fragmentos:1.0},
    generico:{marca:'',        arco:0,    comprimento:0,  espessura:0,   fragmentos:1.0},
  };
  function categoriaDaArma(id){
    const s=String(id||'');
    for(const [re,cat] of CATEGORIAS) if(re.test(s)) return cat;
    return 'generico';
  }

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const num=v=>(typeof v==='number'&&isFinite(v)?v:0);

  let deps={};
  let depurando=false;
  let ultimoDebug=null;

  /* Estado proprio do modulo. Nada de gameplay mora aqui. */
  const numeros=[];        // numeros de dano flutuantes
  const aneis=[];          // aneis de impacto
  const marcas=[];         // assinatura visual da familia da arma
  const eventos=new Map(); // attackEventId -> agregado do ciclo
  const fantasmas=[];      // mortes visuais (nunca entidades de gameplay)
  const chefesMortos=[];   // sequencias de morte de chefe em andamento
  const acumuloChefe=new Map(); // chefe -> dano recente, para o impacto pesado
  let multikill={contagem:0,ate:0,x:0,y:0};
  const vinheta={forca:0,ate:0,dir:null};
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
    /* Assinatura da familia da arma. E' o que faz espada, machado, martelo
       e arco nao parecerem a mesma coisa com cor diferente. */
    if(origem!=='dot'&&origem!=='pet'){
      marcaDeArma(x,y,info.categoria||categoriaDaArma(info.arma),
        num(info.angulo),ORDEM.indexOf(perfil),corDoElemento(elemento));
    }
    {
      const assin=ASSINATURAS[info.categoria||categoriaDaArma(info.arma)]||ASSINATURAS.generico;
      particulas(x,y,elemento,Math.round(CONFIG.PERFIS[perfil].particulas*assin.fragmentos),ORDEM.indexOf(perfil));
    }
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

  /* Marca da familia no ponto de contato. Curta (140-190ms) e sempre
     ATRAS dos numeros e da HUD: assinatura, nao poluicao. */
  function marcaDeArma(x,y,categoria,angulo,forca,cor){
    const p=prefs();
    const a=ASSINATURAS[categoria]||ASSINATURAS.generico;
    if(!a.marca)return;
    if(marcas.length>=CONFIG.MAX_MARCAS)marcas.shift();
    marcas.push({tipo:a.marca,x,y,ang:num(angulo),
      arco:a.arco,comp:a.comprimento*(0.8+forca*0.12)*p.intensidade,
      esp:a.espessura,cor:cor||'#ffffff',nasceu:agora(),
      dur:a.marca==='poeira'?190:150});
  }

  function corDoElemento(el){
    const e=ELEMENTOS[el]||ELEMENTOS.physical;
    return e.cores[0];
  }

  // ═══════════════════════════════════════════════════════
  // MORTE
  // ═══════════════════════════════════════════════════════

  /* Morte de inimigo. O gameplay ja' considerou o bicho morto — isto e'
     puramente visual, e por isso o "fantasma" nunca entra em nenhuma
     lista de entidade. Ele guarda uma COPIA do ultimo quadro desenhado,
     entao encolhe e some sem exigir sprite de morte. */
  function morte(info){
    if(!info)return;
    const p=prefs();
    const alvo=info.alvo;
    let tipo='comum';
    if(info.minichefe)tipo='minichefe';
    else if(info.elite)tipo='elite';
    else if(info.critico)tipo='critica';
    const cfg=CONFIG.MORTE[tipo];
    const x=num(info.x||alvo?.x), y=num(info.y||alvo?.y);
    const elemento=info.elemento||'physical';

    /* Overkill: dano muito acima da vida restante engrossa um pouco a
       morte, com teto. Sem o teto, qualquer bicho fraco viraria explosao. */
    const excesso=num(info.dano)/Math.max(1,num(info.hpRestante)||1);
    const reforco=clamp(1+(excesso>2?Math.log10(excesso)*0.5:0),1,CONFIG.OVERKILL_MAX);

    particulas(x,y,elemento,Math.round(cfg.particulas*reforco),tipo==='comum'?1:2);
    if(cfg.anel>0&&!p.reduzirMovimento)anel(x,y,cfg.anel*reforco,corDoElemento(elemento),2);
    if(cfg.shake>0)shake(cfg.shake,200);

    // fantasma: copia do ultimo quadro, so' para o fade
    if(alvo&&alvo._ultimoQuadro&&fantasmas.length<CONFIG.MAX_FANTASMAS){
      fantasmas.push({quadro:Object.assign({},alvo._ultimoQuadro),
        nasceu:agora(),dur:cfg.dur,escalaFim:cfg.escala,
        cor:info.critico?'#fff2c0':corDoElemento(elemento)});
    }
    registrarMultikill(x,y);
    if(depurando)ultimoDebug=Object.assign({},ultimoDebug,{morte:tipo,overkill:+reforco.toFixed(2)});
  }

  /* Varias mortes quase juntas viram UM feedback, e nao quinze sons.
     Se o sistema de combo existir, ele ja' comunica boa parte disso —
     aqui fica so' o reforco sonoro/visual dos marcos. */
  function registrarMultikill(x,y){
    const t=agora();
    if(t>multikill.ate)multikill={contagem:0,ate:t+CONFIG.MULTIKILL_JANELA_MS,x,y};
    multikill.contagem++;
    multikill.ate=t+CONFIG.MULTIKILL_JANELA_MS;
    multikill.x=x; multikill.y=y;
    if(CONFIG.MULTIKILL_MARCOS.includes(multikill.contagem)){
      const forca=CONFIG.MULTIKILL_MARCOS.indexOf(multikill.contagem);
      particulas(x,y,'physical',6+forca*4,1+forca);
      if(forca>=1)anel(x,y,26+forca*14,'#ffd23f',1+forca);
      if(forca>=2)shake(2,180);
      som('multikill',forca>=2?'heavy':'medium',false);
    }
  }

  function multikillAtual(){
    return agora()<=multikill.ate?multikill.contagem:0;
  }

  /* Sequencia de morte de chefe. Para o GAMEPLAY o chefe morreu no quadro
     zero — nada aqui segura o estado dele. E' so' apresentacao. */
  function morteDeChefe(info){
    const alvo=info&&info.alvo;
    const x=num(info?.x||alvo?.x), y=num(info?.y||alvo?.y);
    chefesMortos.push({x,y,nasceu:agora(),passo:0,
      quadro:alvo&&alvo._ultimoQuadro?Object.assign({},alvo._ultimoQuadro):null,
      elemento:info?.elemento||'physical'});
    if(chefesMortos.length>3)chefesMortos.shift();
  }

  function avancarMortesDeChefe(){
    const p=prefs();
    const C=CONFIG.CHEFE_MORTE;
    for(let i=chefesMortos.length-1;i>=0;i--){
      const m=chefesMortos[i];
      const dt=agora()-m.nasceu;
      // cada marco dispara uma vez so'
      if(m.passo===0&&dt>=0){ m.passo=1; if(!p.reduzirFlashes)enfase(C.pausa,3); }
      for(let b=0;b<C.bursts.length;b++){
        const marca=2+b;
        if(m.passo<marca&&dt>=C.bursts[b]){
          m.passo=marca;
          const ang=Math.random()*Math.PI*2, r=18+Math.random()*22;
          particulas(m.x+Math.cos(ang)*r,m.y+Math.sin(ang)*r,m.elemento,C.burstParticulas,3);
        }
      }
      if(m.passo<90&&dt>=C.shakeEm){ m.passo=90; shake(C.shakeForca,320); }
      if(m.passo<91&&dt>=C.anelEm){ m.passo=91; anel(m.x,m.y,C.anelRaio,'#ffd6a0',3); }
      if(dt>=C.fim)chefesMortos.splice(i,1);
    }
  }

  /* Impacto acumulado no chefe (item 13). Ataques rapidos fazem micro
     flash; quando uma fatia significativa da vida cai numa janela curta,
     sai UM impacto pesado. Sem isso a alternativa seria tremer a cada
     projetil, que e' exatamente o que a spec proibe. */
  function danoNoChefe(chefe,quanto,maxHp){
    if(!chefe)return false;
    const t=agora();
    let a=acumuloChefe.get(chefe);
    if(!a||t-a.desde>CONFIG.CHEFE_ACUMULO.janelaMs){ a={desde:t,soma:0}; acumuloChefe.set(chefe,a); }
    a.soma+=num(quanto);
    const limite=Math.max(1,num(maxHp))*CONFIG.CHEFE_ACUMULO.fracaoHp;
    if(a.soma>=limite){
      a.desde=t; a.soma=0;
      anel(chefe.x,chefe.y,CONFIG.CHEFE_ACUMULO.anelRaio,'#ffd6a0',2);
      shake(CONFIG.CHEFE_ACUMULO.shake,190);
      som('impacto','heavy',false);
      return true;
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════
  // JOGADOR
  // ═══════════════════════════════════════════════════════

  /* Dano no jogador. Precisa ser o feedback mais claro do jogo: quem
     apanha tem de saber na hora, e de onde veio. Mas NAO cobrindo a tela
     de vermelho — vinheta curta nas bordas, nunca um filtro cheio. */
  function danoNoJogador(info){
    if(!info)return;
    const p=prefs();
    const max=Math.max(1,num(info.vidaMaxima));
    const pesado=num(info.quantidade)/max>=CONFIG.JOGADOR.fracaoPesado;
    const cfg=pesado?CONFIG.JOGADOR.danoPesado:CONFIG.JOGADOR.danoLeve;
    shake(cfg.shake,cfg.dur);
    if(!p.reduzirFlashes){
      vinheta.forca=Math.max(vinheta.forca,cfg.vinheta*p.intensidade);
      vinheta.ate=agora()+cfg.dur;
      // direcao de onde veio o golpe, quando o chamador souber
      vinheta.dir=(typeof info.angulo==='number')?info.angulo:null;
    }
    particulas(num(info.x),num(info.y),'blood',pesado?9:5,pesado?2:1);
    som('dano',pesado?'heavy':'medium',false);
    if(pesado)enfase(45,2);
  }

  /* Vida critica: avisa UMA vez ao cruzar para baixo, e so' rearma quando
     o jogador se recupera. Nada de pulsar para sempre. */
  function checarVidaCritica(jogador,hp,maxHp){
    if(!jogador)return false;
    const frac=num(hp)/Math.max(1,num(maxHp));
    if(frac<=CONFIG.JOGADOR.vidaCriticaEm&&!jogador._juiceVidaBaixa){
      jogador._juiceVidaBaixa=true;
      vinheta.forca=Math.max(vinheta.forca,0.28);
      vinheta.ate=agora()+520;
      vinheta.dir=null;
      som('vida_critica','heavy',false);
      return true;
    }
    if(frac>=CONFIG.JOGADOR.vidaCriticaVolta)jogador._juiceVidaBaixa=false;
    return false;
  }

  /* Cura REAL. Overheal nao mostra numero falso: quem chama passa o
     efetivo, e zero nao desenha nada. */
  function cura(x,y,quantidade){
    const v=Math.round(num(quantidade));
    if(v<=0)return;
    particulas(x,y,'poison',CONFIG.JOGADOR.curaParticulas,1);
    numero(x,y-16,v,'cura');
  }

  /* Dash. Rapido e preciso, nao pesado: tremor pequeno e cor da classe.
     Nao mexe em hitbox, velocidade nem invulnerabilidade. */
  function dash(info){
    const cor=CONFIG.DASH.cores[info?.classe]||CONFIG.DASH.cores.padrao;
    particulas(num(info?.x),num(info?.y),'physical',CONFIG.DASH.particulas,1);
    if(typeof deps.spawnParts==='function')deps.spawnParts(num(info?.x),num(info?.y),cor,CONFIG.DASH.particulas,52);
    shake(CONFIG.DASH.shake,110);
    som('dash','light',false);
  }

  /* Vinheta: so' as bordas. Desenhada por cima do mundo e por baixo da
     HUD. Se o golpe teve direcao, a borda daquele lado fica mais forte. */
  function desenharVinheta(ctx,W,H){
    const t=agora();
    if(t>=vinheta.ate||vinheta.forca<=0.01)return;
    const resta=clamp((vinheta.ate-t)/320,0,1);
    const a=vinheta.forca*resta;
    ctx.save();
    const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.32,W/2,H/2,Math.max(W,H)*0.62);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1,`rgba(150,20,20,${a.toFixed(3)})`);
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H);
    if(vinheta.dir!==null&&typeof vinheta.dir==='number'){
      // reforco do lado de onde veio o golpe
      const dx=Math.cos(vinheta.dir), dy=Math.sin(vinheta.dir);
      const gx=W/2+dx*W*0.5, gy=H/2+dy*H*0.5;
      const g2=ctx.createRadialGradient(gx,gy,0,gx,gy,Math.max(W,H)*0.45);
      g2.addColorStop(0,`rgba(190,40,40,${(a*0.8).toFixed(3)})`);
      g2.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g2; ctx.fillRect(0,0,W,H);
    }
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════════
  // ATUALIZACAO E DESENHO
  // ═══════════════════════════════════════════════════════

  function atualizar(dt){
    particulasNesteQuadro=0; quadroAbertoEm=agora();
    avancarMortesDeChefe();
    const tf=agora();
    for(let i=fantasmas.length-1;i>=0;i--) if(tf-fantasmas[i].nasceu>=fantasmas[i].dur) fantasmas.splice(i,1);
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

  /* Fantasmas de morte. Desenhados NO MEIO do mundo (junto das entidades),
     nao por cima da HUD, entao vao numa funcao propria que o laco chama no
     ponto certo da ordem de desenho. */
  function desenharFantasmas(ctx){
    if(!ctx||!fantasmas.length)return;
    const t=agora();
    for(const f of fantasmas){
      const prog=clamp((t-f.nasceu)/f.dur,0,1);
      const alpha=1-prog;
      if(alpha<=0.02)continue;
      // encolhe um pouco e sobe de leve: le' como "desfez", nao como "sumiu"
      const esc=1-(1-f.escalaFim)*prog;
      const q=f.quadro;
      const original={x:q.x,pesY:q.pesY,escala:q.escala};
      q.pesY=original.pesY-prog*5;
      if(typeof q.escala==='number')q.escala=original.escala*esc;
      ctx.save();
      ctx.globalAlpha=alpha;
      if(typeof deps.desenharQuadro==='function')deps.desenharQuadro(ctx,q,alpha);
      // clarao final: a mesma tintura do hit flash, sumindo junto
      if(typeof deps.tingirQuadro==='function')deps.tingirQuadro(ctx,q,f.cor,alpha*0.85);
      ctx.restore();
      q.x=original.x; q.pesY=original.pesY; q.escala=original.escala;
    }
  }

  function desenhar(ctx){
    if(!ctx)return;
    // marcas de arma primeiro, bem atras de tudo
    const tm=agora();
    for(let i=marcas.length-1;i>=0;i--){
      const m=marcas[i];
      const prog=(tm-m.nasceu)/m.dur;
      if(prog>=1){ marcas.splice(i,1); continue; }
      const a=1-prog;
      ctx.save();
      ctx.globalAlpha=a*0.8;
      ctx.strokeStyle=m.cor; ctx.fillStyle=m.cor;
      ctx.lineWidth=Math.max(1,m.esp*a);
      ctx.translate(m.x,m.y); ctx.rotate(m.ang);
      if(m.tipo==='corte'){
        // arco de corte que se abre: espada fino, machado largo
        ctx.beginPath();
        ctx.arc(0,0,m.comp*(0.55+prog*0.45),-m.arco/2,m.arco/2);
        ctx.stroke();
      }else if(m.tipo==='linha'||m.tipo==='crava'){
        // perfuracao: risco reto no eixo do golpe
        ctx.beginPath();
        ctx.moveTo(-m.comp*0.3,0); ctx.lineTo(m.comp*(0.4+prog*0.6),0);
        ctx.stroke();
      }else if(m.tipo==='risco'){
        ctx.beginPath();
        ctx.moveTo(-m.comp*0.5,0); ctx.lineTo(m.comp*0.5,0);
        ctx.stroke();
      }else if(m.tipo==='poeira'){
        // martelo: poeira baixa se abrindo no chao
        ctx.globalAlpha=a*0.45;
        ctx.beginPath();
        ctx.ellipse(0,4,10+prog*20,3+prog*6,0,0,Math.PI*2);
        ctx.stroke();
      }else if(m.tipo==='energia'){
        ctx.globalAlpha=a*0.7;
        for(let k=0;k<3;k++){
          const ang=prog*3+k*2.1;
          ctx.fillRect(Math.cos(ang)*(6+prog*12)-1,Math.sin(ang)*(6+prog*12)-1,2,2);
        }
      }else if(m.tipo==='espectro'){
        ctx.globalAlpha=a*0.55;
        ctx.beginPath();
        ctx.arc(0,-prog*8,7+prog*9,0,Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // aneis depois, ainda atras dos numeros
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
    marcas.length=0;
    fantasmas.length=0;
    chefesMortos.length=0;
    acumuloChefe.clear();
    multikill={contagem:0,ate:0,x:0,y:0};
    vinheta.forca=0; vinheta.ate=0; vinheta.dir=null;
    eventos.clear();
    pausaAte=0; pausaForca=0;
    ultimoShakeEm=-1e9;
    for(const k of Object.keys(somUltimo))delete somUltimo[k];
  }

  function configurar(novas){ deps=novas||{}; }

  // ── Depuracao (item 58). Fora da UI normal. ──
  function definirDepuracao(v){ depurando=!!v; }
  function estadoDepuracao(){ return ultimoDebug; }
  /* Galeria de impactos: dispara qualquer feedback sem precisar jogar uma
     run inteira. E' a ferramenta de balanceamento — nao aparece na UI. */
  function depurar(tipo){
    const x=num(deps.getW?deps.getW()/2:320), y=num(deps.getH?deps.getH()/2:240);
    const alvo={x,y,_ultimoQuadro:null};
    switch(String(tipo||'medium')){
      case 'light':          return impacto({x,y,alvo,cooldown:520,arma:'archer_shortbow',dano:15,elemento:'physical',attackEventId:'dbg'+agora()});
      case 'medium':         return impacto({x,y,alvo,cooldown:900,arma:'warrior_spear',dano:40,elemento:'physical',attackEventId:'dbg'+agora()});
      case 'heavy':          return impacto({x,y,alvo,cooldown:1650,arma:'viking_colossalaxe',dano:120,elemento:'physical',attackEventId:'dbg'+agora()});
      case 'critical-heavy': return impacto({x,y,alvo,cooldown:1650,arma:'viking_colossalaxe',dano:300,critico:true,elemento:'physical',attackEventId:'dbg'+agora()});
      case 'massive':        return impacto({x,y,alvo,perfilForcado:'massive',dano:500,elemento:'fire',attackEventId:'dbg'+agora()});
      case 'death':          return morte({x,y,alvo,dano:40,hpRestante:10});
      case 'elite-death':    return morte({x,y,alvo,elite:true,dano:90,hpRestante:60});
      case 'boss-death':     return morteDeChefe({x,y,alvo});
      case 'player-hit':     return danoNoJogador({x,y,quantidade:8,vidaMaxima:100});
      case 'player-heavy':   return danoNoJogador({x,y,quantidade:40,vidaMaxima:100,angulo:Math.PI});
      case 'dash':           return dash({x,y,classe:'viking'});
      case 'heal':           return cura(x,y,18);
      default:               return impacto({x,y,alvo,cooldown:900,dano:40,attackEventId:'dbg'+agora()});
    }
  }
  const GALERIA=['light','medium','heavy','critical-heavy','massive','death','elite-death',
                 'boss-death','player-hit','player-heavy','dash','heal'];

  global.CombatJuiceSystem=Object.freeze({
    CONFIG,ELEMENTOS,
    configurar,impacto,morte,morteDeChefe,danoNoChefe,multikillAtual,desenharFantasmas,
    danoNoJogador,checarVidaCritica,cura,dash,desenharVinheta,
    particulas,anel,shake,enfase,numero,som,
    atualizar,desenhar,desenharFlash,enfaseAtual,
    limpar,
    definirDepuracao,estadoDepuracao,depurar,GALERIA,
    _forcaDoAtaque:forcaDoAtaque,_subir:subir,_categoriaDaArma:categoriaDaArma,ASSINATURAS,
  });
})(typeof window!=='undefined'?window:globalThis);
