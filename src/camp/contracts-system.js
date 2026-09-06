/* ══════════════════════════════════════════════════════
   QUADRO DE CONTRATOS — SISTEMA

   Guarda o quadro, aceita e abandona contratos, mede o progresso na run e
   paga a recompensa. Nada de desenho aqui; a interface le' este modulo.

   POR QUE NAO INSTRUMENTEI NADA NOVO NO COMBATE
   O RunStats ja' mede tudo o que os contratos pedem — abates, dano,
   criticos, elites, chefes, combo, onda, bencaos, armas, vida minima. Em
   vez de espalhar contadores pelo jogo, este modulo LE' o retrato da run
   (RunStats.getSnapshot) e deriva cada metrica dali. Consequencia boa: o
   progresso ao vivo e o resultado final saem da MESMA conta, entao nunca
   divergem.

   INJECAO DE DEPENDENCIA
   `totalCoins` e `globalInventory` sao `let` de topo no index.html — e
   `let` de topo NAO vira propriedade de window. Tentar ler
   `window.totalCoins` daqui devolveria undefined em silencio e o contrato
   pagaria no vazio. Por isso quem paga e' uma funcao injetada em
   configurar().
   ══════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  const CHAVE='mago_x_hordas_contracts_v1';
  const VERSAO=1;
  const OFERTA=2;          // duas ofertas deixam o quadro mais legivel e arejado
  const MAX_ATIVOS=2;      // quantos podem ir juntos para a expedicao
  const REROLLS_POR_VISITA=1;

  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const dados=()=>global.ContractsData;
  const porId=id=>dados()?.CONTRATOS.find(c=>c.id===id)||null;

  /* ── Metricas: cada uma le' o retrato da run e devolve UM numero ──
     Toda metrica citada no catalogo precisa existir aqui; o verificador
     confere os dois lados. */
  const METRICAS={
    kills:            s=>num(s.team?.kills),
    dano:             s=>num(s.team?.damageDealt),
    criticos:         s=>num(s.team?.criticals),
    elites:           s=>num(s.team?.elites),
    chefes:           s=>num(s.team?.bosses),
    combo:            s=>num(s.team?.maxCombo),
    onda:             s=>num(s.maxWave),
    ondasSemDano:     s=>num(s.longestFlawlessStreak),
    bencaos:          s=>(s.blessings||[]).length,
    ascensoes:        s=>(s.blessings||[]).filter(b=>b&&b.ascension).length,
    armasLendarias:   s=>(s.weapons||[]).filter(w=>String(w?.rarity||'').toLowerCase()==='legendary').length,
    chefesSemDano:    s=>(s.bossFights||[]).filter(f=>f&&f.victory&&num(f.damageTaken)===0).length,
    moedasSobrando:   s=>Math.max(0,num(s.team?.coinsEarned)-num(s.team?.coinsSpent)),
    bencaosMesmoDeus: s=>{
      const contagem=new Map();
      for(const b of s.blessings||[]) contagem.set(b?.deity,(contagem.get(b?.deity)||0)+1);
      return contagem.size?Math.max(...contagem.values()):0;
    },
    deusesDistintos:  s=>new Set((s.blessings||[]).map(b=>b?.deity).filter(Boolean)).size,
    vidaMinima:       s=>{
      const vidas=(s.players||[]).map(p=>num(p.lowestHpPercent));
      return vidas.length?Math.min(...vidas):100;
    },
  };

  let estado=vazio();
  let deps={
    adicionarMoedas:null, adicionarItem:null, notificar:null, salvar:null,
  };

  function vazio(){
    return {versao:VERSAO,oferta:[],ativos:[],concluidos:[],rerolls:REROLLS_POR_VISITA,cumpridos:0};
  }

  /* ── Persistencia ── */
  function carregar(){
    try{
      const bruto=global.SaveSystem?.readJSON?.(CHAVE,null);
      if(!bruto||typeof bruto!=='object') return vazio();
      const limpo=vazio();
      limpo.oferta=(bruto.oferta||[]).filter(id=>porId(id)).slice(0,OFERTA);
      limpo.ativos=(bruto.ativos||[]).filter(a=>a&&porId(a.id)).slice(0,MAX_ATIVOS)
        .map(a=>({id:a.id,aceitoEm:a.aceitoEm||null}));
      limpo.concluidos=(bruto.concluidos||[]).filter(c=>c&&porId(c.id))
        .map(c=>({id:c.id,concluidoEm:c.concluidoEm||null}));
      limpo.rerolls=Math.max(0,num(bruto.rerolls));
      limpo.cumpridos=Math.max(0,num(bruto.cumpridos));
      return limpo;
    }catch(_){ return vazio(); }
  }
  function persistir(){
    try{ global.SaveSystem?.writeJSON?.(CHAVE,estado); }catch(_){}
  }

  /* ── Sorteio da oferta ──
     Peso do tier menos o que ja' esta' na mao do jogador: contrato ativo ou
     concluido aguardando coleta nao volta ao quadro. */
  function sortear(excluir){
    const fora=new Set(excluir);
    const pool=dados().CONTRATOS.filter(c=>!fora.has(c.id));
    if(!pool.length) return null;
    /* `s+peso||s` parecia funcionar so' porque todo peso atual e' positivo:
       um tier com peso 0 zeraria a soma e o `||` devolveria o acumulado
       anterior, embaralhando a conta. Peso explicito resolve. */
    const peso=c=>Math.max(0,num(dados().TIERS[c.tier]?.peso));
    const total=pool.reduce((soma,c)=>soma+peso(c),0);
    if(total<=0) return pool[Math.floor(Math.random()*pool.length)].id;
    let n=Math.random()*total;
    for(const c of pool){
      n-=peso(c);
      if(n<=0) return c.id;
    }
    return pool[pool.length-1].id;
  }
  function gerarOferta(){
    const usados=[...estado.ativos.map(a=>a.id),...estado.concluidos.map(c=>c.id)];
    const nova=[];
    while(nova.length<OFERTA){
      const id=sortear([...usados,...nova]);
      if(!id) break;
      nova.push(id);
    }
    estado.oferta=nova;
    persistir();
    return [...estado.oferta];
  }
  function garantirOferta(){
    if(estado.oferta.length<OFERTA) gerarOferta();
    return [...estado.oferta];
  }

  /* ── Avaliacao ──
     `exige` sao condicoes de CONTEXTO: nao contam progresso, mas sem elas
     o contrato nao fecha. Assim "vença com o Guerreiro" nao conclui numa
     run de Mago mesmo com a metrica batida. */
  function contextoOk(contrato,s){
    const e=contrato.exige; if(!e) return true;
    if(e.vitoria&&s.result!=='victory') return false;
    if(e.dificuldade&&String(s.difficulty)!==e.dificuldade) return false;
    if(e.ameacaMin&&num(s.threatLevel)<e.ameacaMin) return false;
    if(e.classe&&!(s.players||[]).some(p=>String(p?.classId)===e.classe)) return false;
    return true;
  }
  function avaliarContrato(contrato,s){
    const ler=METRICAS[contrato.metrica];
    const valor=ler?ler(s):0;
    const menor=contrato.comparar==='menor';
    let bateu = menor ? valor<=contrato.alvo : valor>=contrato.alvo;
    // guarda contra alvo trivial: "no maximo 2 deuses" nao vale com zero bencao
    if(bateu&&contrato.exigeProgresso){
      for(const [chave,minimo] of Object.entries(contrato.exigeProgresso)){
        const f=METRICAS[chave];
        if(!f||f(s)<minimo){ bateu=false; break; }
      }
    }
    const progresso = menor
      ? (bateu?1:0)
      : Math.max(0,Math.min(1,contrato.alvo>0?valor/contrato.alvo:0));
    return {id:contrato.id,valor,alvo:contrato.alvo,progresso,
            contexto:contextoOk(contrato,s),concluido:bateu&&contextoOk(contrato,s)};
  }
  function avaliar(snapshot){
    const s=snapshot||global.RunStats?.getSnapshot?.();
    if(!s) return [];
    return estado.ativos.map(a=>{
      const c=porId(a.id);
      return c?{...avaliarContrato(c,s),contrato:c}:null;
    }).filter(Boolean);
  }

  /* ── Acoes do jogador ── */
  function aceitar(id){
    const c=porId(id); if(!c) return {ok:false,motivo:'contrato desconhecido'};
    if(estado.ativos.some(a=>a.id===id)) return {ok:false,motivo:'já está ativo'};
    if(estado.ativos.length>=MAX_ATIVOS) return {ok:false,motivo:`limite de ${MAX_ATIVOS} contratos ativos`};
    estado.ativos.push({id,aceitoEm:Date.now()});
    estado.oferta=estado.oferta.filter(o=>o!==id);
    garantirOferta(); persistir();
    aviso(`Contrato aceito: ${c.nome}`);
    return {ok:true};
  }
  function abandonar(id){
    const antes=estado.ativos.length;
    estado.ativos=estado.ativos.filter(a=>a.id!==id);
    if(estado.ativos.length===antes) return {ok:false,motivo:'contrato não estava ativo'};
    persistir();
    return {ok:true};
  }
  function atualizarOferta(){
    if(estado.rerolls<=0) return {ok:false,motivo:'sem atualizações nesta visita'};
    estado.rerolls--;
    gerarOferta();
    return {ok:true,restantes:estado.rerolls};
  }
  function coletar(id){
    const idx=estado.concluidos.findIndex(c=>c.id===id);
    if(idx<0) return {ok:false,motivo:'nada a coletar'};
    const c=porId(id);
    estado.concluidos.splice(idx,1);
    estado.cumpridos++;
    persistir();
    const r=c?.recompensa||{};
    if(r.moedas&&typeof deps.adicionarMoedas==='function') deps.adicionarMoedas(r.moedas);
    if(r.itens&&typeof deps.adicionarItem==='function')
      for(const [item,qtd] of Object.entries(r.itens)) deps.adicionarItem(item,qtd);
    if(typeof deps.salvar==='function') deps.salvar();
    aviso(`Recompensa obtida: ${c?.nome||id}`);
    return {ok:true,recompensa:r};
  }
  function coletarTudo(){
    const ids=estado.concluidos.map(c=>c.id);
    return ids.map(id=>({id,...coletar(id)}));
  }

  /* ── Ciclo da run ── */
  function aoTerminarRun(snapshot){
    const s=snapshot||global.RunStats?.getSnapshot?.();
    if(!s) return [];
    const resultado=[];
    const restantes=[];
    for(const ativo of estado.ativos){
      const c=porId(ativo.id); if(!c) continue;
      const av=avaliarContrato(c,s);
      resultado.push({...av,contrato:c});
      if(av.concluido) estado.concluidos.push({id:c.id,concluidoEm:Date.now()});
      else restantes.push(ativo);   // nao concluiu: continua ativo para a proxima
    }
    estado.ativos=restantes;
    gerarOferta();                  // quadro renovado a cada run
    persistir();
    return resultado;
  }
  function aoEntrarNoAcampamento(){
    estado.rerolls=REROLLS_POR_VISITA;
    garantirOferta();
    persistir();
  }

  function aviso(texto){
    if(typeof deps.notificar==='function'){ try{ deps.notificar(texto); }catch(_){} }
  }

  /* ── Ligacao com o resto do jogo ──
     Chamado uma vez pelo index.html; sem isso o sistema le' e mostra
     contratos normalmente, so' nao consegue PAGAR. */
  function configurar(novasDeps){
    deps={...deps,...(novasDeps||{})};
    estado=carregar();
    garantirOferta();
    if(global.RunStats?.on) global.RunStats.on('runFinished',ev=>{
      try{ aoTerminarRun(ev?.snapshot); }catch(e){ console.warn('[Contratos] falha ao fechar a run',e); }
    });
    return true;
  }

  function ofertaDetalhada(){ return garantirOferta().map(porId).filter(Boolean); }
  function ativosDetalhados(){ return estado.ativos.map(a=>porId(a.id)).filter(Boolean); }
  function concluidosDetalhados(){ return estado.concluidos.map(c=>porId(c.id)).filter(Boolean); }

  global.ContractsSystem=Object.freeze({
    CHAVE,OFERTA,MAX_ATIVOS,METRICAS,
    configurar,carregar:()=>{estado=carregar();return estado;},
    estado:()=>JSON.parse(JSON.stringify(estado)),
    gerarOferta,garantirOferta,ofertaDetalhada,ativosDetalhados,concluidosDetalhados,
    aceitar,abandonar,atualizarOferta,coletar,coletarTudo,
    avaliar,avaliarContrato,aoTerminarRun,aoEntrarNoAcampamento,
    _resetParaTestes:()=>{estado=vazio();persistir();},
  });
})(typeof window!=='undefined'?window:globalThis);
