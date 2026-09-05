// Sistema de COMBO da campanha e da Dungeon.
//
// O combo NAO responde "quantas vezes algo tomou dano?". Ele responde
// "por quanto tempo o jogador manteve uma sequencia eficiente de combate?".
// Por isso a unidade nao e' o acerto: e' o CICLO DE ATAQUE (comboEvent).
//
// Um ciclo vale mais quanto mais lenta for a arma, na proporcao exata do
// cooldown efetivo. Assim o Arco Curto (520ms) e o Machado Colossal (1650ms)
// sobem o combo na MESMA velocidade media, sem bonus arbitrario por classe.
//
// O modulo nao conhece o jogo: tudo entra por configurar(). Ele tambem nao
// cria estado paralelo de gameplay — so' guarda o proprio combo por jogador.
(function(global){
  'use strict';

  // ── Configuracao. Todo numero de balanceamento mora aqui, nenhum espalhado
  //    pelo codigo. Trocar um valor aqui muda o jogo inteiro. ──
  const CONFIG={
    // Cooldown de referencia: uma arma com este cooldown vale exatamente 1.00
    // por ciclo. 900ms foi o valor pedido e e' o centro do catalogo atual.
    REFERENCIA_COOLDOWN:900,

    /* Limites do valor de um ciclo.
       ATENCAO: a normalizacao so' e' EXATA dentro do clamp. Fora dele ela
       quebra, porque ganho/s = clamp(cd/REF)*(1000/cd) deixa de ser constante.
       A spec sugeriu [0.50, 1.85]; medido contra o catalogo real, o piso de
       0.50 corta abaixo de 450ms e distorce justamente as armas rapidas:
         adaga da Dungeon (180ms) ....... +150%  (com gear, 99ms: +355%)
         Laminas Gemeas lendarias
           + berserk + loja (269ms) ..... +67%
       Com [0.10, 2.50] nenhuma arma real dos dois modos encosta no limite, e
       a dispersao entre as 32 armas da campanha fica em 0.0%. O clamp segue
       existindo como rede contra uma arma futura patologica. */
    GANHO_MIN:0.10,
    GANHO_MAX:2.50,

    // Tempo sem ataque valido antes de comecar a perder combo. O grace tambem
    // e' dinamico: nenhuma arma normal pode perder combo ENTRE DOIS ATAQUES.
    GRACA_MS:2500,
    GRACA_FATOR_ARMA:1.6,
    GRACA_MAX_MS:6000,

    // Decaimento depois do grace: fracao do combo perdida por segundo.
    // Proporcional ao valor atual, entao combo alto cai de forma mais visivel.
    DECAIMENTO_POR_SEGUNDO:0.10,

    // Dano recebido corta uma fracao do combo. Nunca zera: em jogo de horda,
    // perder tudo por um toque e' punitivo demais.
    PENALIDADE_DANO:0.20,
    PENALIDADE_DANO_PESADO:0.35,
    LIMIAR_DANO_PESADO:0.22,          // fracao da vida maxima
    PENALIDADE_COOLDOWN_MS:500,       // impede varias penalidades no mesmo golpe

    // Bonus por eliminacao. Deixa horda satisfatoria sem virar a fonte principal.
    ABATE_COMUM:0.35,
    ABATE_FORTE:0.75,
    ABATE_ELITE:2.0,
    ABATE_MINICHEFE:4.0,
    ABATE_CHEFE:0,                    // chefe alimenta pelo combate continuo

    /* Teto de bonus de abate por segundo. Sem isto uma explosao que mata 20
       bichos saltaria o combo de 10 para 100. Elites e minichefes tem folga
       propria porque sao eventos raros e telegrafados. */
    TETO_ABATE_POR_SEGUNDO:4,
    TETO_ABATE_ELITE_POR_SEGUNDO:8,

    // Critico: bonus pequeno POR CICLO, nao por acerto critico.
    CRITICO_BONUS:0.15,

    /* Summons do Necromante. Analisada a arquitetura real: os summons batem
       por target.takeDmg() direto, fora do funil weaponDamage, entao nao
       geram ciclo nenhum por construcao. Este multiplicador existe para o
       caso de alguem querer dar contribuicao parcial no futuro; em 0 o
       Necromante mantem combo pelas proprias armas, que era a prioridade. */
    SUMMON_MULTIPLICADOR:0,

    // Quanto do combo sobrevive ao fim de uma onda.
    CARRY_ONDA:0.50,

    /* Marcos. O ultimo nivel de poder e' 100: acima disso o contador continua
       subindo (recorde), mas os bonus NAO. Combo e' recompensa por execucao,
       nao substituto de arma, raridade, bencao ou build. */
    TIERS:[
      {min:0,   id:'nenhum',      nome:'',            mov:0,    atk:0,    dano:0   },
      {min:20,  id:'aquecendo',   nome:'AQUECENDO',   mov:0.02, atk:0,    dano:0   },
      {min:40,  id:'ritmo',       nome:'EM RITMO',    mov:0.02, atk:0.03, dano:0   },
      {min:70,  id:'implacavel',  nome:'IMPLACÁVEL',  mov:0.03, atk:0.04, dano:0.03},
      {min:100, id:'lendario',    nome:'LENDÁRIO',    mov:0.04, atk:0.05, dano:0.05},
    ],

    // Bonus de recompensa da onda, por FAIXA e com teto. Nunca proporcional ao
    // combo, senao manter um bicho fraco vivo viraria farm.
    RECOMPENSA:[
      {min:100,bonus:0.08},
      {min:70, bonus:0.06},
      {min:40, bonus:0.04},
      {min:20, bonus:0.02},
    ],
  };

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const num=v=>(typeof v==='number'&&isFinite(v)?v:0);

  let deps={};
  let proximoEventoId=1;
  let depuracao=false;
  const estados=new Map();      // jogador -> estado do combo
  const eventos=new Map();      // id do ciclo -> registro do ciclo

  function agora(){
    return typeof performance!=='undefined'?performance.now():Date.now();
  }

  function estadoDe(jogador){
    if(!jogador)return null;
    let e=estados.get(jogador);
    if(!e){
      e={
        pontos:0,              // float por dentro; a HUD arredonda
        tierIdx:0,
        ultimoAtaque:0,        // relogio interno, so' anda em combate
        relogio:0,             // acumulado de dt: base de tempo pausavel
        gracaMs:CONFIG.GRACA_MS,
        penalidadeAte:0,
        abatesJanela:[],       // [{t,valor,elite}] para o teto por segundo
        maiorNaOnda:0,
        /* -Infinity, e nao 0: com 0 a conta (relogio - ultimaPenalidade)
           comeca em 0, menor que o cooldown de penalidade, e a PRIMEIRA vez
           que o jogador levasse dano na run nao custaria combo nenhum. */
        ultimaPenalidade:-Infinity,
        tremor:0,              // feedback visual de perda
        brilhoTier:0,
        ultimoEvento:null,     // para o painel de depuracao
      };
      estados.set(jogador,e);
    }
    return e;
  }

  // ── Tier ──
  function tierPorPontos(p){
    let idx=0;
    for(let i=0;i<CONFIG.TIERS.length;i++) if(p>=CONFIG.TIERS[i].min) idx=i;
    return idx;
  }

  // ═══════════════════════════════════════════════════════
  // CICLO DE ATAQUE
  // ═══════════════════════════════════════════════════════

  /* Abre um ciclo. Chamado UMA vez quando a arma dispara, nao por projetil e
     nao por acerto. Devolve o id que todos os danos daquele ciclo carregam.

     cooldownEfetivo tem de ser o cooldown REAL usado para reagendar a arma
     (com raridade, loja, cartas, berserk e o proprio bonus de combo). E' isso
     que neutraliza a realimentacao: mais velocidade de ataque deixa cada
     ciclo proporcionalmente mais barato. */
  function abrirEvento(jogador,arma,cooldownEfetivo,origem){
    if(!jogador||!ativoPara(jogador))return 0;
    const cd=num(cooldownEfetivo);
    if(cd<=0)return 0;
    const id=proximoEventoId++;
    const ganho=clamp(cd/CONFIG.REFERENCIA_COOLDOWN,CONFIG.GANHO_MIN,CONFIG.GANHO_MAX);
    eventos.set(id,{
      jogador,arma:arma||null,cd,ganho,
      origem:origem||'player_weapon',
      validado:false,critico:false,criadoEm:agora(),
    });
    /* Guarda o ciclo corrente em dois lugares, porque ha' dois caminhos de
       ataque e eles nao compartilham objeto:
         - na ARMA, para o funil de dano corpo a corpo achar o id;
         - no JOGADOR, para o ataque BASICO da classe (que nao tem objeto de
           arma) e para os projeteis, que copiam o id ao nascer. */
    if(arma)arma._comboEventId=id;
    jogador._comboEventoAtual=id;
    limparEventosVelhos();
    return id;
  }

  // Ciclos que nunca acertaram nada nao podem vazar memoria.
  function limparEventosVelhos(){
    if(eventos.size<160)return;
    const limite=agora()-8000;
    for(const [id,ev] of eventos) if(ev.criadoEm<limite) eventos.delete(id);
  }

  /* Valida o ciclo. Chamado toda vez que um dano daquele ciclo realmente
     pousa em um inimigo. So' o PRIMEIRO concede pontos — e' isto que faz
     multi-hit, multiplos projeteis, ricochete, perfuracao, explosao e raio
     em cadeia valerem UM evento, e nao um por alvo. */
  function validarEvento(id,info){
    const ev=eventos.get(id);
    if(!ev)return false;
    if(info&&info.critico)ev.critico=true;
    if(ev.validado)return false;
    const st=estadoDe(ev.jogador);
    if(!st||!ativoPara(ev.jogador))return false;
    ev.validado=true;

    let ganho=ev.ganho;
    if(ev.origem==='summon')ganho*=CONFIG.SUMMON_MULTIPLICADOR;
    if(ganho<=0)return false;
    if(ev.critico)ganho+=CONFIG.CRITICO_BONUS;

    st.pontos+=ganho;
    st.ultimoAtaque=st.relogio;
    st.ultimoEvento={id,cd:Math.round(ev.cd),ganho:+ganho.toFixed(3),
                     arma:ev.arma?.type||'—',origem:ev.origem,validado:true};
    atualizarTier(st);
    return true;
  }

  // Marca o ciclo como critico antes/depois de validar (a ordem nao importa:
  // se ja' validou, o bonus entra no proximo; se nao, entra neste).
  function marcarCritico(id){
    const ev=eventos.get(id);
    if(ev)ev.critico=true;
  }

  // ═══════════════════════════════════════════════════════
  // ABATES
  // ═══════════════════════════════════════════════════════

  function valorDoAbate(alvo){
    if(!alvo)return {valor:0,elite:false};
    if(deps.ehChefe&&deps.ehChefe(alvo))return {valor:CONFIG.ABATE_CHEFE,elite:true};
    if(deps.ehMinichefe&&deps.ehMinichefe(alvo))return {valor:CONFIG.ABATE_MINICHEFE,elite:true};
    if(deps.ehElite&&deps.ehElite(alvo))return {valor:CONFIG.ABATE_ELITE,elite:true};
    if(num(alvo.maxHp)>=120)return {valor:CONFIG.ABATE_FORTE,elite:false};
    return {valor:CONFIG.ABATE_COMUM,elite:false};
  }

  /* Bonus de eliminacao, com teto por janela de 1s. O teto e' o que impede
     uma explosao que mata 20 inimigos de saltar o combo de 10 para 100. */
  function notificarAbate(jogador,alvo,origem){
    if(!jogador||!ativoPara(jogador))return 0;
    if(origem==='pet'||origem==='dot'||origem==='environment')return 0;
    const st=estadoDe(jogador);
    if(!st)return 0;
    const {valor,elite}=valorDoAbate(alvo);
    if(valor<=0)return 0;

    const t=st.relogio;
    st.abatesJanela=st.abatesJanela.filter(a=>t-a.t<1000);
    const usadoComum=st.abatesJanela.reduce((s,a)=>s+(a.elite?0:a.valor),0);
    const usadoElite=st.abatesJanela.reduce((s,a)=>s+(a.elite?a.valor:0),0);
    const teto=elite?CONFIG.TETO_ABATE_ELITE_POR_SEGUNDO:CONFIG.TETO_ABATE_POR_SEGUNDO;
    const usado=elite?usadoElite:usadoComum;
    const permitido=Math.max(0,Math.min(valor,teto-usado));
    if(permitido<=0)return 0;

    st.abatesJanela.push({t,valor:permitido,elite});
    st.pontos+=permitido;
    atualizarTier(st);
    return permitido;
  }

  // ═══════════════════════════════════════════════════════
  // DANO RECEBIDO
  // ═══════════════════════════════════════════════════════

  function notificarDanoRecebido(jogador,quantidade,vidaMaxima){
    if(!jogador||!ativoPara(jogador))return 0;
    const st=estadoDe(jogador);
    if(!st||st.pontos<=0)return 0;
    // Um ataque multi-hit do inimigo nao pode destruir o combo varias vezes
    // no mesmo instante.
    if(st.relogio-st.ultimaPenalidade<CONFIG.PENALIDADE_COOLDOWN_MS)return 0;
    st.ultimaPenalidade=st.relogio;

    const max=num(vidaMaxima);
    const pesado=max>0&&num(quantidade)/max>=CONFIG.LIMIAR_DANO_PESADO;
    const fracao=pesado?CONFIG.PENALIDADE_DANO_PESADO:CONFIG.PENALIDADE_DANO;
    const perdido=st.pontos*fracao;
    st.pontos=Math.max(0,st.pontos-perdido);
    st.tremor=pesado?340:220;
    atualizarTier(st);
    return perdido;
  }

  function notificarMorte(jogador){
    const st=estadoDe(jogador);
    if(!st)return;
    st.pontos=0;
    st.abatesJanela.length=0;
    atualizarTier(st);
  }

  // ═══════════════════════════════════════════════════════
  // ATUALIZACAO
  // ═══════════════════════════════════════════════════════

  /* dt em segundos. O CHAMADOR so' chama isto quando ha' combate de verdade;
     e' assim que grace, decaimento e timers ficam pausados em loja, escolha
     de bencao, dialogo, cutscene e introducao de chefe — sem timer paralelo. */
  function atualizar(dt){
    const ms=num(dt)*1000;
    if(ms<=0)return;
    /* A pausa mora AQUI, e nao so' no chamador. Depender de "o laco nao me
       chama fora de combate" e' fragil: a Dungeon, por exemplo, continua
       rodando _update com o inventario aberto. Com a guarda no modulo, grace,
       decaimento e o relogio interno param juntos em qualquer transicao. */
    if(typeof deps.emCombate==='function'&&!deps.emCombate())return;
    for(const jogador of listaJogadores()){
      const st=estadoDe(jogador);
      if(!st)continue;
      st.relogio+=ms;
      if(st.tremor>0)st.tremor=Math.max(0,st.tremor-ms);
      if(st.brilhoTier>0)st.brilhoTier=Math.max(0,st.brilhoTier-ms);
      st.gracaMs=gracaDe(jogador);
      if(st.pontos<=0)continue;
      const parado=st.relogio-st.ultimoAtaque;
      if(parado>st.gracaMs){
        const perda=st.pontos*CONFIG.DECAIMENTO_POR_SEGUNDO*(ms/1000);
        st.pontos=Math.max(0,st.pontos-perda);
        atualizarTier(st);
      }
    }
  }

  /* Grace dinamico: nenhuma arma normal pode perder combo entre dois ataques.
     Calculado pela arma MAIS LENTA equipada, entao continua correto se um dia
     entrar uma arma ainda mais lenta que o Machado Colossal. */
  function gracaDe(jogador){
    let maisLento=0;
    if(typeof deps.cooldownMaisLento==='function'){
      maisLento=num(deps.cooldownMaisLento(jogador));
    }
    return clamp(Math.max(CONFIG.GRACA_MS,maisLento*CONFIG.GRACA_FATOR_ARMA),
                 CONFIG.GRACA_MS,CONFIG.GRACA_MAX_MS);
  }

  function atualizarTier(st){
    const antes=st.tierIdx;
    st.tierIdx=tierPorPontos(st.pontos);
    if(st.tierIdx>antes){
      st.brilhoTier=st.tierIdx>=CONFIG.TIERS.length-1?1400:700;
      if(typeof deps.aoMudarTier==='function'){
        deps.aoMudarTier(st.tierIdx,CONFIG.TIERS[st.tierIdx],st.tierIdx>antes);
      }
    }
    if(st.pontos>st.maiorNaOnda)st.maiorNaOnda=st.pontos;
  }

  // ═══════════════════════════════════════════════════════
  // CONSULTA
  // ═══════════════════════════════════════════════════════

  function listaJogadores(){
    return (typeof deps.getJogadores==='function'?deps.getJogadores():[])||[];
  }

  function ativoPara(jogador){
    if(!jogador)return false;
    if(typeof deps.emCombate==='function'&&!deps.emCombate())return false;
    return true;
  }

  function pontuacao(jogador){ const st=estados.get(jogador); return st?st.pontos:0; }
  function pontuacaoExibida(jogador){ return Math.floor(pontuacao(jogador)); }
  function tier(jogador){ const st=estados.get(jogador); return st?st.tierIdx:0; }
  function tierInfo(jogador){ return CONFIG.TIERS[tier(jogador)]; }

  // Bonus de atributo. Teto no LENDARIO: nao cresce alem de 100.
  function bonus(jogador){
    const t=CONFIG.TIERS[tier(jogador)];
    return {movimento:t.mov,ataque:t.atk,dano:t.dano};
  }
  function bonusVelocidadeAtaque(jogador){ return bonus(jogador).ataque; }
  function bonusDano(jogador){ return bonus(jogador).dano; }
  function bonusMovimento(jogador){ return bonus(jogador).movimento; }

  // Fracao do grace ainda disponivel: e' a barra da HUD. O jogador precisa
  // enxergar "preciso voltar a acertar alguma coisa".
  function fracaoDeGraca(jogador){
    const st=estados.get(jogador);
    if(!st||st.pontos<=0)return 0;
    const parado=st.relogio-st.ultimoAtaque;
    return clamp(1-parado/Math.max(1,st.gracaMs),0,1);
  }

  function decaindo(jogador){
    const st=estados.get(jogador);
    if(!st||st.pontos<=0)return false;
    return (st.relogio-st.ultimoAtaque)>st.gracaMs;
  }

  function tremor(jogador){ const st=estados.get(jogador); return st?st.tremor:0; }
  function brilho(jogador){ const st=estados.get(jogador); return st?st.brilhoTier:0; }

  // ═══════════════════════════════════════════════════════
  // ONDAS E RECOMPENSA
  // ═══════════════════════════════════════════════════════

  // Bonus de recompensa por FAIXA, com teto. Aplicar so' sobre recompensa
  // repetivel — nunca sobre desbloqueio, item unico, historia ou conquista.
  function bonusRecompensa(jogador){
    const maior=Math.floor((estados.get(jogador)?.maiorNaOnda)||0);
    for(const faixa of CONFIG.RECOMPENSA) if(maior>=faixa.min) return faixa.bonus;
    return 0;
  }

  function maiorComboDaOnda(jogador){
    return Math.floor((estados.get(jogador)?.maiorNaOnda)||0);
  }

  // Fim de onda: preserva parte do combo e zera o recorde da onda.
  function concluirOnda(){
    for(const jogador of listaJogadores()){
      const st=estadoDe(jogador);
      if(!st)continue;
      st.pontos*=CONFIG.CARRY_ONDA;
      st.maiorNaOnda=st.pontos;
      st.abatesJanela.length=0;
      st.ultimoAtaque=st.relogio;
      atualizarTier(st);
    }
  }

  // ═══════════════════════════════════════════════════════
  // CICLO DE VIDA
  // ═══════════════════════════════════════════════════════

  function reiniciar(jogador){
    if(jogador){estados.delete(jogador);return;}
    estados.clear();
  }

  function limpar(){
    estados.clear();
    eventos.clear();
    proximoEventoId=1;
  }

  function configurar(novasDeps){
    deps=novasDeps||{};
  }

  // ── Depuracao. Fora da UI normal. ──
  function definirDepuracao(v){ depuracao=!!v; }
  function depurando(){ return depuracao; }
  function estadoDepuracao(jogador){
    const st=estados.get(jogador);
    if(!st)return null;
    return {
      pontos:+st.pontos.toFixed(3),
      exibido:Math.floor(st.pontos),
      tier:CONFIG.TIERS[st.tierIdx].id,
      graca:Math.round(st.gracaMs),
      restanteDaGraca:+fracaoDeGraca(jogador).toFixed(3),
      decaindo:decaindo(jogador),
      ultimoEvento:st.ultimoEvento,
    };
  }
  function definirCombo(jogador,valor){
    const st=estadoDe(jogador);
    if(!st)return;
    st.pontos=Math.max(0,num(valor));
    st.ultimoAtaque=st.relogio;
    atualizarTier(st);
  }

  global.ComboSystem=Object.freeze({
    CONFIG,
    configurar,
    abrirEvento,validarEvento,marcarCritico,
    notificarAbate,notificarDanoRecebido,notificarMorte,
    atualizar,concluirOnda,
    pontuacao,pontuacaoExibida,tier,tierInfo,
    bonus,bonusVelocidadeAtaque,bonusDano,bonusMovimento,
    fracaoDeGraca,decaindo,tremor,brilho,
    bonusRecompensa,maiorComboDaOnda,
    reiniciar,limpar,
    definirDepuracao,depurando,estadoDepuracao,definirCombo,
    _estados:estados,
  });
})(window);
