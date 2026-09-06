/* ══════════════════════════════════════════════════════
   QUADRO DE CONTRATOS — CATALOGO

   Contratos sao metas OPCIONAIS de curto prazo, escolhidas no acampamento
   e cumpridas na proxima expedicao. Este arquivo e' so' dado declarativo:
   nenhuma regra de jogo mora aqui, so' o que cada contrato pede e o que
   paga. Quem mede, aceita e conclui e' o contracts-system.

   COMO UM CONTRATO E' MEDIDO
   Cada um aponta para UMA metrica que a telemetria de run (RunStats) ja'
   coleta — nada foi instrumentado a mais para isto funcionar. A lista de
   metricas suportadas vive no sistema, em METRICAS; se um contrato citar
   uma metrica que nao existe la', o verificador reprova.

   `exige` sao condicoes de contexto (classe, dificuldade, ameaca,
   vitoria). Elas nao contam progresso: se nao forem satisfeitas ao fim da
   run, o contrato simplesmente nao conclui.

   RECOMPENSAS
   So' moedas e materiais do acampamento — meta progressao. Nada que altere
   forca dentro da run, para o contrato nunca virar obrigacao. A ideia e'
   "vale a pena fazer", nunca "sou obrigado toda run".
   ══════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  const CATEGORIAS=Object.freeze({
    combate:   {nome:'COMBATE',    cor:'#ff7a5c', icone:'espada'},
    progressao:{nome:'PROGRESSÃO', cor:'#7cc4ff', icone:'bandeira'},
    build:     {nome:'BUILD',      cor:'#c8a84b', icone:'orbe'},
    classe:    {nome:'CLASSE',     cor:'#9fe08a', icone:'elmo'},
    risco:     {nome:'RISCO',      cor:'#e05a7a', icone:'cranio'},
  });

  /* Peso = chance relativa de aparecer no quadro. Contrato lendario e' raro
     de proposito: ver um no quadro precisa ser um pequeno evento. */
  const TIERS=Object.freeze({
    comum:    {nome:'Comum',    cor:'#9aa8b4', peso:100},
    veterano: {nome:'Veterano', cor:'#7cc4ff', peso:58},
    epico:    {nome:'Épico',    cor:'#c07cff', peso:26},
    lendario: {nome:'Lendário', cor:'#f0b03c', peso:9},
  });

  const C=(id,nome,desc,categoria,tier,metrica,alvo,recompensa,extra)=>
    Object.freeze({id,nome,desc,categoria,tier,metrica,alvo,recompensa:Object.freeze(recompensa),...(extra||{})});

  const CONTRATOS=Object.freeze([
    /* ── COMBATE ── */
    C('exterminador','Exterminador Local','Derrote 80 inimigos em uma run.','combate','comum','kills',80,{moedas:60,itens:{madeira:2}}),
    C('maos_firmes','Mãos Firmes','Complete 2 ondas seguidas sem receber dano.','combate','veterano','ondasSemDano',2,{moedas:110,itens:{pedra:2}}),
    C('pressao','Pressão Constante','Alcance combo 40 em uma run.','combate','veterano','combo',40,{moedas:100,itens:{madeira:3}}),
    C('golpe_preciso','Golpe Preciso','Acerte 25 golpes críticos em uma run.','combate','comum','criticos',25,{moedas:65,itens:{erva:2}}),
    C('predador_elite','Predador de Elite','Derrote 3 elites na mesma run.','combate','veterano','elites',3,{moedas:120,itens:{pedra:3}}),
    C('marca_ferro','Marca de Ferro','Cause 40.000 de dano efetivo em uma run.','combate','epico','dano',40000,{moedas:190,itens:{madeira:4,pedra:2}}),

    /* ── PROGRESSÃO ── */
    C('quinta_onda','Além da Quinta Onda','Chegue à onda 5.','progressao','comum','onda',5,{moedas:45,itens:{semente_trigo:1}}),
    C('sem_voltar','Sem Voltar Atrás','Chegue à onda 10.','progressao','comum','onda',10,{moedas:80,itens:{semente_tomate:1}}),
    C('rumo_abismo','Rumo ao Abismo','Chegue à onda 15.','progressao','veterano','onda',15,{moedas:140,itens:{semente_erva:2}}),
    C('cacador_chefes','Caçador de Chefes','Derrote 1 chefe em uma run.','progressao','comum','chefes',1,{moedas:70,itens:{pedra:2}}),
    C('tempestade','Vitória na Tempestade','Conclua a campanha.','progressao','epico','chefes',1,{moedas:240,itens:{madeira:5,pedra:5}},{exige:{vitoria:true}}),

    /* ── BUILD ── */
    C('favor_divino','Favor Divino','Obtenha 5 bênçãos em uma run.','build','comum','bencaos',5,{moedas:70,itens:{erva:2}}),
    C('devoto','Devoto','Obtenha 3 bênçãos da mesma divindade.','build','veterano','bencaosMesmoDeus',3,{moedas:120,itens:{cogumelo_lua:1}}),
    C('escolhido','Escolhido','Obtenha 1 Ascensão em uma run.','build','epico','ascensoes',1,{moedas:200,itens:{raiz_sangue:1}}),
    C('colecionador','Colecionador de Poder','Obtenha 1 arma lendária em uma run.','build','epico','armasLendarias',1,{moedas:210,itens:{pedra:4}}),
    C('disciplina','Disciplina Arcana','Termine a run com no máximo 2 divindades diferentes.','build','veterano','deusesDistintos',2,{moedas:130,itens:{erva:3}},{comparar:'menor',exigeProgresso:{bencaos:3}}),
    C('cofre_cheio','Cofre Cheio','Termine a run com 150 moedas ou mais sobrando.','build','comum','moedasSobrando',150,{moedas:90,itens:{madeira:2}}),

    /* ── CLASSE ── */
    C('juramento_guerreiro','Juramento do Guerreiro','Vença uma run com o Guerreiro.','classe','epico','chefes',1,{moedas:220,itens:{pedra:4}},{exige:{classe:'warrior',vitoria:true}}),
    C('trilha_arqueiro','Trilha do Arqueiro','Alcance combo 50 com o Arqueiro.','classe','veterano','combo',50,{moedas:150,itens:{madeira:3}},{exige:{classe:'archer'}}),
    C('furia_nordica','Fúria Nórdica','Cause 30.000 de dano com o Viking.','classe','veterano','dano',30000,{moedas:150,itens:{pedra:3}},{exige:{classe:'viking'}}),
    C('sabedoria_arcana','Sabedoria Arcana','Derrote 120 inimigos com o Mago.','classe','veterano','kills',120,{moedas:150,itens:{erva:3}},{exige:{classe:'mage'}}),
    C('senhor_sombras','Senhor das Sombras','Derrote 100 inimigos com o Necromante.','classe','veterano','kills',100,{moedas:150,itens:{cogumelo_lua:1}},{exige:{classe:'necromancer'}}),

    /* ── RISCO ── */
    C('sob_pressao','Sob Pressão','Vença uma run com Ameaça 2 ou mais.','risco','epico','chefes',1,{moedas:260,itens:{raiz_sangue:1,pedra:3}},{exige:{ameacaMin:2,vitoria:true}}),
    C('ferro_sangue','Ferro e Sangue','Derrote um chefe sem receber dano na luta.','risco','lendario','chefesSemDano',1,{moedas:400,itens:{raiz_sangue:2,cogumelo_lua:2}}),
    C('ultimo_folego','Último Fôlego','Termine a run com menos de 30% da vida.','risco','veterano','vidaMinima',30,{moedas:160,itens:{erva:3}},{comparar:'menor'}),
    C('sem_recuar','Sem Recuar','Vença uma run no Difícil.','risco','lendario','chefes',1,{moedas:420,itens:{madeira:6,pedra:6}},{exige:{dificuldade:'hard',vitoria:true}}),
  ]);

  /* Uma falha aqui e' erro de programacao, nao de dado do jogador: melhor
     estourar no carregamento do que servir um quadro quebrado. */
  const ids=new Set();
  for(const c of CONTRATOS){
    if(ids.has(c.id)) throw new Error(`Contrato duplicado: ${c.id}`);
    ids.add(c.id);
    if(!CATEGORIAS[c.categoria]) throw new Error(`Categoria invalida em ${c.id}: ${c.categoria}`);
    if(!TIERS[c.tier]) throw new Error(`Tier invalido em ${c.id}: ${c.tier}`);
    if(!(c.alvo>0)) throw new Error(`Alvo invalido em ${c.id}`);
  }

  global.ContractsData=Object.freeze({CATEGORIAS,TIERS,CONTRATOS});
})(typeof window!=='undefined'?window:globalThis);

