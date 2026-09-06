/* ══════════════════════════════════════════════════════
   QUADRO DE CONTRATOS — INTERFACE

   Redesenhada na LINGUAGEM DA CONVERSA DO ARQUEIRO, que e' o padrao de NPC
   do acampamento: painel ancorado embaixo, retrato quadrado do heroi a
   esquerda, nome grande na cor do personagem, fala em corpo alto, e opcoes
   como botoes de linha inteira com "▸". Fecha no ESC ou clicando fora, e
   entra deslizando de baixo.

   A versao anterior inventava um estilo proprio (mural marrom, cartoes de
   papel, botoes pequenos no rodape). Funcionava, mas destoava: o jogador
   aprende a conversar com NPC de um jeito so' e o Guerreiro falava outro
   idioma. Aqui os dois falam igual — muda a COR (ambar do Guerreiro no
   lugar do verde do Arqueiro) e o conteudo.

   Duas telas, o mesmo molde:
     falar()  — conversa curta, com as opcoes "Ver o quadro" e "Sair";
     abrir()  — o quadro em si, com os contratos como cartoes dentro do
                mesmo painel.
   ══════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  const ID='contracts-overlay';
  const ID_FALA='warrior-talk';
  const COR='#e0b060';                 // ambar do Guerreiro (o Arqueiro usa verde)
  const NOME='Guerreiro';
  const PAPEL='Veterano dos contratos';
  const RETRATO='assets/heroes/warrior/idle_south.png';

  const FALAS=[
    'Disciplina vence a força bruta.',
    'Aceite um contrato. Prove seu valor.',
    'Não basta sobreviver. É preciso superar.',
    'Todo guerreiro precisa de propósito antes da batalha.',
    'Papel não sangra. Você, sim. Escolha bem.',
  ];

  /* Falas do Guerreiro quando abordado direto.
     Nao e' dialogo ramificado — a especificacao pediu o contrario, e o
     Arqueiro ja' ocupa esse papel. E' uma fala curta que OLHA O ESTADO:
     sem contrato, com contrato aceito ou com recompensa parada no quadro. */
  const CONVERSA={
    semContrato:[
      'Sem contrato, você é só mais um que atravessa o portal.',
      'Escolha um alvo antes de escolher uma arma.',
      'O quadro está ali. Ler não custa vida.',
    ],
    comContrato:[
      'Você já deu sua palavra. Agora cumpra.',
      'Firmou um contrato. Lembre-se dele quando o sangue esquentar.',
      'Palavra dada no acampamento vale lá fora também.',
    ],
    premioPronto:[
      'Cumpriu o que prometeu. Vá buscar o que é seu.',
      'Tem pagamento parado no quadro. Não é caridade, é o que você ganhou.',
      'Fez o serviço. Agora receba por ele.',
    ],
    ocioso:[
      'Disciplina vence a força bruta.',
      'Não basta sobreviver. É preciso superar.',
      'Descanse. Depois trabalhe. Nessa ordem.',
    ],
  };

  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const sis=()=>global.ContractsSystem;
  const dad=()=>global.ContractsData;
  const sorteio=lista=>lista[Math.floor(Math.random()*lista.length)];

  /* Escolhe o que ele diz a partir do estado atual do quadro. */
  function falaDoMomento(){
    const S=sis();
    try{
      if(S.concluidosDetalhados().length) return sorteio(CONVERSA.premioPronto);
      const ativos=S.ativosDetalhados();
      if(ativos.length) return sorteio(CONVERSA.comContrato).replace(/\.$/,`. “${ativos[0].nome}”.`);
      return sorteio(Math.random()<0.35?CONVERSA.ocioso:CONVERSA.semContrato);
    }catch(_){ return sorteio(CONVERSA.ocioso); }
  }

  function estilo(){
    if(document.getElementById('contracts-style'))return;
    const st=document.createElement('style'); st.id='contracts-style';
    st.textContent=`
/* ── Casca comum as duas telas, copiada da conversa do Arqueiro ──

   O painel vive DENTRO de #camp2-palco (a moldura do acampamento), nao
   colado no viewport. Preso ao viewport ele passava por fora da moldura:
   numa janela larga a caixa ficava mais larga e mais alta que a propria
   tela do jogo, e sobrava painel para fora do cenario.

   Como o palco muda de tamanho com a janela, os corpos de texto saem de
   --gr-k, uma escala que o JS calcula a partir da largura dele. Usar vw/vh
   aqui daria letra gigante num palco pequeno dentro de um monitor grande. */
.gr-fundo{position:absolute;inset:0;font-family:'Courier New',monospace;display:flex;
  align-items:flex-end;justify-content:center;pointer-events:auto;
  border-radius:8px;overflow:hidden;line-height:normal;
  background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(6,4,2,.6) 100%);}
.gr-fundo.solto{position:fixed;border-radius:0;}
.gr-caixa{--gr-k:1;width:min(1040px,96%);max-height:94%;margin:0 0 calc(14px * var(--gr-k));
  box-sizing:border-box;display:flex;flex-direction:column;line-height:normal;
  background:linear-gradient(165deg,#1e1409,#140c05 55%,#0a0603);
  border:2px solid ${COR}aa;border-radius:calc(14px * var(--gr-k));
  box-shadow:0 0 0 3px #100902,0 -6px 48px rgba(0,0,0,.75),0 0 32px ${COR}44;
  padding:calc(22px * var(--gr-k));
  transform:translateY(120%);opacity:0;
  transition:transform .30s cubic-bezier(.2,.9,.3,1),opacity .30s;}
.gr-caixa.dentro{transform:translateY(0);opacity:1;}
.gr-cabeca{display:flex;align-items:flex-start;gap:calc(18px * var(--gr-k));flex-shrink:0;}
.gr-retrato{flex-shrink:0;width:calc(104px * var(--gr-k));height:calc(104px * var(--gr-k));
  border-radius:calc(12px * var(--gr-k));
  background:radial-gradient(circle at 50% 40%,${COR}55,rgba(0,0,0,.7));border:2px solid ${COR};
  box-shadow:inset 0 0 18px rgba(0,0,0,.6),0 0 20px ${COR}44;
  display:flex;align-items:center;justify-content:center;overflow:hidden;}
.gr-retrato img{width:86%;height:86%;object-fit:contain;image-rendering:pixelated;}
.gr-quem{display:flex;align-items:baseline;flex-wrap:wrap;gap:calc(9px * var(--gr-k));}
.gr-nome{font-size:calc(27px * var(--gr-k));font-weight:900;color:${COR};text-shadow:0 2px 0 rgba(0,0,0,.5);}
.gr-papel{font-size:calc(11px * var(--gr-k));color:#a88c62;letter-spacing:2px;text-transform:uppercase;}
.gr-fala{font-size:calc(20px * var(--gr-k));color:#f4ece0;line-height:1.75;
  margin:calc(10px * var(--gr-k)) 0 calc(4px * var(--gr-k));min-height:calc(56px * var(--gr-k));}
.gr-op{display:block;width:100%;text-align:left;margin-top:calc(8px * var(--gr-k));
  background:rgba(26,16,8,.85);border:2px solid ${COR}8c;border-radius:calc(8px * var(--gr-k));
  padding:calc(13px * var(--gr-k)) calc(17px * var(--gr-k));cursor:pointer;
  font-family:'Courier New',monospace;font-size:calc(16px * var(--gr-k));color:#f0e4cc;letter-spacing:.4px;
  transition:all .12s;}
.gr-op:hover:not(:disabled){background:rgba(58,36,16,.9);border-color:${COR};transform:translateX(3px);}
.gr-op:disabled{opacity:.45;cursor:not-allowed;}
.gr-op.sair{border-color:rgba(168,140,98,.5);color:#bfa07a;}
.gr-dica{text-align:right;font-size:calc(10px * var(--gr-k));color:#8a6a45;
  margin-top:calc(7px * var(--gr-k));letter-spacing:1px;flex-shrink:0;}

/* ── Quadro: mesma casca, com a lista de contratos no meio ──
   O miolo e' quem cede: flex:1 com rolagem propria, para o painel inteiro
   nunca passar dos 94% do palco por mais contratos que existam. */
.gr-titulo{font-size:calc(25px * var(--gr-k));font-weight:900;color:${COR};letter-spacing:2px;
  text-transform:uppercase;text-shadow:0 2px 0 rgba(0,0,0,.5);}
.gr-corpo{margin-top:calc(13px * var(--gr-k));flex:1 1 auto;min-height:0;overflow-y:auto;
  padding-right:4px;display:grid;gap:calc(17px * var(--gr-k));align-content:start;}
.gr-secao > h3{margin:0 0 calc(10px * var(--gr-k));font-size:calc(12px * var(--gr-k));letter-spacing:3px;
  color:#c9a86a;text-transform:uppercase;display:flex;align-items:center;gap:9px;}
.gr-secao > h3::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,${COR}55,transparent);}
.gr-lista{display:grid;gap:calc(14px * var(--gr-k));
  grid-template-columns:repeat(auto-fit,minmax(calc(280px * var(--gr-k)),1fr));}
.gr-card{position:relative;display:flex;flex-direction:column;gap:calc(9px * var(--gr-k));
  background:rgba(26,16,8,.85);border:2px solid var(--cc,${COR}66);border-radius:calc(8px * var(--gr-k));
  padding:calc(11px * var(--gr-k)) calc(14px * var(--gr-k)) calc(12px * var(--gr-k));
  transition:border-color .15s,transform .12s;}
.gr-card:hover{transform:translateY(-2px);}
.gr-card.pronto{border-color:#6fd08a;background:rgba(18,34,20,.88);}
.gr-chips{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.gr-cat{font-size:calc(10px * var(--gr-k));letter-spacing:2px;font-weight:bold;
  padding:2px calc(7px * var(--gr-k));border-radius:4px;color:#120c05;text-transform:uppercase;}
.gr-tier{font-size:calc(10px * var(--gr-k));letter-spacing:2px;padding:2px calc(6px * var(--gr-k));
  border:1px solid currentColor;border-radius:4px;text-transform:uppercase;}
.gr-cnome{font-size:calc(18px * var(--gr-k));font-weight:bold;color:#f4ece0;letter-spacing:.5px;}
.gr-cdesc{margin:0;font-size:calc(14px * var(--gr-k));line-height:1.65;color:#c4b294;}
.gr-barra{height:calc(6px * var(--gr-k));background:rgba(0,0,0,.45);border-radius:4px;
  overflow:hidden;border:1px solid rgba(224,176,96,.25);}
.gr-barra i{display:block;height:100%;background:linear-gradient(90deg,#8a6a2a,${COR});}
.gr-prog{font-size:calc(11px * var(--gr-k));letter-spacing:1px;color:#a88c62;}
.gr-premio{font-size:calc(12px * var(--gr-k));line-height:1.5;letter-spacing:1px;color:#d8b25a;}
.gr-selo{position:absolute;top:calc(9px * var(--gr-k));right:calc(11px * var(--gr-k));
  font-size:calc(9px * var(--gr-k));letter-spacing:2px;font-weight:bold;
  color:#8ff0a8;border:1px solid #6fd08a;border-radius:4px;padding:2px 7px;transform:rotate(-5deg);
  background:rgba(10,30,16,.8);}
.gr-vazio{margin:0;font-size:calc(12px * var(--gr-k));color:#8a7350;letter-spacing:.5px;font-style:italic;}
.gr-rodape{display:flex;gap:calc(9px * var(--gr-k));flex-wrap:wrap;
  margin-top:calc(10px * var(--gr-k));flex-shrink:0;}
.gr-rodape .gr-op{margin-top:0;width:auto;flex:1 1 200px;}
@media (max-width:620px){ .gr-lista{grid-template-columns:1fr;} }`;
    document.head.appendChild(st);
  }

  /* Escala do painel: sai da LARGURA DO PALCO, nao do viewport.
     1040px de palco = escala 1. Limitada nas pontas para o texto nunca
     virar ilegivel numa janela pequena nem gigante numa grande. */
  function escalaDoPalco(palco){
    const l=palco?palco.getBoundingClientRect().width:0;
    if(!l) return 1;
    return Math.max(0.68,Math.min(1.12,l/1040));
  }

  /* ── Casca compartilhada: monta, anima a entrada, e liga ESC/clique fora ──
     Vai DENTRO de #camp2-palco sempre que ele existir, para o painel ficar
     contido na moldura do acampamento em vez de vazar por fora dela. */
  function abrirCasca(id,montar){
    estilo();
    document.getElementById(id)?.remove();
    const palco=document.getElementById('camp2-palco');
    const el=document.createElement('div');
    el.id=id; el.className='gr-fundo'+(palco?'':' solto');
    el.style.zIndex = id===ID ? '66' : '65';
    (palco||document.body).appendChild(el);
    const caixa=document.createElement('div');
    caixa.className='gr-caixa';
    caixa.style.setProperty('--gr-k',escalaDoPalco(palco).toFixed(3));
    caixa.setAttribute('role','dialog');
    caixa.setAttribute('aria-label',id===ID?'Quadro de Contratos':NOME);
    el.appendChild(caixa);
    /* Entrada: quadro seguinte OU 50ms, o que vier primeiro. So' o rAF (que
       e' o que a conversa do Arqueiro usa) deixa o painel preso em
       opacity:0 quando o navegador estrangula os quadros — aba em segundo
       plano, aparelho lento. Adicionar a classe duas vezes nao custa nada. */
    const entrar=()=>caixa.classList.add('dentro');
    requestAnimationFrame(entrar);
    setTimeout(entrar,50);

    // o palco encolhe e cresce com a janela; a escala acompanha
    const redimensionar=()=>caixa.style.setProperty('--gr-k',escalaDoPalco(palco).toFixed(3));
    global.addEventListener('resize',redimensionar);

    const fechar=()=>{
      caixa.classList.remove('dentro');
      document.removeEventListener('keydown',tecla,true);
      global.removeEventListener('resize',redimensionar);
      setTimeout(()=>el.remove(),300);
    };
    const tecla=e=>{ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); fechar(); } };
    document.addEventListener('keydown',tecla,true);
    el.addEventListener('mousedown',e=>{ if(e.target===el) fechar(); });
    montar(caixa,fechar);
    return {el,caixa,fechar};
  }

  const cabeca=(titulo,texto)=>
    `<div class="gr-cabeca">
       <div class="gr-retrato"><img src="${RETRATO}" alt="" aria-hidden="true"></div>
       <div style="flex:1;min-width:0;">
         <div class="gr-quem">
           <span class="${titulo?'gr-titulo':'gr-nome'}">${esc(titulo||NOME)}</span>
           <span class="gr-papel">${esc(titulo?NOME:PAPEL)}</span>
         </div>
         <div class="gr-fala">${esc(texto)}</div>
       </div>
     </div>`;

  const opcao=(rotulo,acao,extra='')=>
    `<button class="gr-op${extra.includes('sair')?' sair':''}" ${extra.includes('off')?'disabled':''} onclick="${acao}">▸ ${esc(rotulo)}</button>`;

  /* ── CONVERSA ── */
  let fecharFalaAtual=null;
  function falar(){
    if(!sis())return false;
    const {fechar}=abrirCasca(ID_FALA,(caixa)=>{
      caixa.innerHTML=cabeca(null,falaDoMomento())
        + opcao('Ver o quadro de contratos','ContractsUI.doGuerreiroParaOQuadro()')
        + opcao('Sair','ContractsUI.fecharFala()','sair')
        + '<div class="gr-dica">ESC / clique fora para sair</div>';
    });
    fecharFalaAtual=fechar;
    som('abrir');
    return true;
  }
  function fecharFala(){ if(fecharFalaAtual){ fecharFalaAtual(); fecharFalaAtual=null; }
                         else document.getElementById(ID_FALA)?.remove(); }
  function doGuerreiroParaOQuadro(){ fecharFala(); abrir(); }

  /* ── QUADRO ── */
  let fecharQuadroAtual=null;
  function cartao(c,opts){
    const D=dad();
    const cat=D.CATEGORIAS[c.categoria]||{nome:c.categoria,cor:COR};
    const tier=D.TIERS[c.tier]||{nome:c.tier,cor:COR};
    const premio=[];
    if(c.recompensa?.moedas) premio.push(`${c.recompensa.moedas} moedas`);
    for(const [item,q] of Object.entries(c.recompensa?.itens||{})) premio.push(`${q}× ${item.replace(/_/g,' ')}`);
    const av=opts.avaliacao;
    const barra = av ? `<div class="gr-barra"><i style="width:${Math.round(av.progresso*100)}%"></i></div>
      <span class="gr-prog">${Math.min(num(av.valor),c.alvo).toLocaleString('pt-BR')} / ${c.alvo.toLocaleString('pt-BR')}</span>` : '';
    return `<article class="gr-card${opts.pronto?' pronto':''}" style="--cc:${cat.cor}99">
      ${opts.pronto?'<span class="gr-selo">CONCLUÍDO</span>':''}
      <div class="gr-chips">
        <span class="gr-cat" style="background:${cat.cor}">${esc(cat.nome)}</span>
        <span class="gr-tier" style="color:${tier.cor}">${esc(tier.nome)}</span>
      </div>
      <span class="gr-cnome">${esc(c.nome)}</span>
      <p class="gr-cdesc">${esc(c.desc)}</p>
      ${barra}
      <span class="gr-premio">RECOMPENSA · ${esc(premio.join(' + ')||'—')}</span>
      ${opts.botao||''}
    </article>`;
  }

  function render(){
    const caixa=document.querySelector('#'+ID+' .gr-caixa');
    if(!caixa)return;
    const S=sis();
    const est=S.estado();
    const disponiveis=S.ofertaDetalhada();
    const ativos=S.ativosDetalhados();
    const prontos=S.concluidosDetalhados();
    const avaliacoes=new Map(S.avaliar().map(a=>[a.id,a]));
    const cheio=ativos.length>=S.MAX_ATIVOS;

    const secao=(titulo,html)=>`<section class="gr-secao"><h3>${titulo}</h3>${html}</section>`;
    const lista=html=>`<div class="gr-lista">${html}</div>`;

    const secPremio=prontos.length?secao('Prontos para coletar',lista(
      prontos.map(c=>cartao(c,{pronto:true,
        botao:opcao('Coletar recompensa',`ContractsUI.coletar('${c.id}')`)})).join(''))):'';

    const secAtivos=secao(`Contratos ativos (${ativos.length}/${S.MAX_ATIVOS})`, ativos.length
      ? lista(ativos.map(c=>cartao(c,{avaliacao:avaliacoes.get(c.id),
          botao:opcao('Abandonar',`ContractsUI.abandonar('${c.id}')`,'sair')})).join(''))
      : '<p class="gr-vazio">Nenhum contrato aceito. Escolha um antes da próxima expedição.</p>');

    const secDisp=secao('Disponíveis no quadro', disponiveis.length
      ? lista(disponiveis.map(c=>cartao(c,{
          botao:opcao(cheio?'Limite atingido':'Aceitar',`ContractsUI.aceitar('${c.id}')`,cheio?'off':'')})).join(''))
      : '<p class="gr-vazio">O quadro está vazio por enquanto.</p>');

    caixa.innerHTML=cabeca('Quadro de Contratos', caixa.dataset.fala||falaDoMomento())
      + `<div class="gr-corpo">${secPremio}${secAtivos}${secDisp}</div>`
      + `<div class="gr-rodape">`
      + opcao(est.rerolls>0?`Atualizar contratos (${est.rerolls})`:'Sem atualizações nesta visita',
              'ContractsUI.atualizar()', est.rerolls>0?'':'off')
      + opcao('Voltar','ContractsUI.fechar()','sair')
      + `</div><div class="gr-dica">ESC / clique fora para sair</div>`;
  }

  function abrir(){
    if(!sis()||!dad())return false;
    const {caixa,fechar}=abrirCasca(ID,(cx)=>{ cx.dataset.fala=falaDoMomento(); });
    fecharQuadroAtual=fechar;
    render();
    som('abrir');
    return !!caixa;
  }
  function fechar(){ if(fecharQuadroAtual){ fecharQuadroAtual(); fecharQuadroAtual=null; }
                     else document.getElementById(ID)?.remove(); }

  function som(tipo){
    try{
      const A=global.Audio;
      if(A&&typeof A.playSfx==='function') A.playSfx(tipo==='concluir'?'coin':'click');
      else if(A&&typeof A.play==='function') A.play(tipo==='concluir'?'coin':'click');
    }catch(_){}
  }
  function nota(texto){ if(typeof global.showInvNotif==='function') global.showInvNotif(texto); }

  function aceitar(id){ const r=sis().aceitar(id); if(r.ok)som('aceitar'); else nota(r.motivo); render(); }
  function abandonar(id){ sis().abandonar(id); render(); }
  function atualizar(){ const r=sis().atualizarOferta(); if(!r.ok)nota(r.motivo); render(); }
  function coletar(id){ const r=sis().coletar(id); if(r.ok)som('concluir'); render(); }

  global.ContractsUI=Object.freeze({abrir,fechar,render,aceitar,abandonar,atualizar,coletar,
    falar,fecharFala,doGuerreiroParaOQuadro,falaDoMomento,FALAS,CONVERSA});
})(typeof window!=='undefined'?window:globalThis);
