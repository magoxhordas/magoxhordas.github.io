/* ════════════════════════════════════════════════════
   HUD DO COMBO — elemento pequeno, canto inferior direito.

   O que ela precisa comunicar, em ordem de importancia:
     1. o numero (recorde, satisfacao);
     2. QUANTO TEMPO FALTA antes de comecar a perder — e' o que faz o
        jogador decidir "preciso voltar a acertar alguma coisa";
     3. o marco atual, quando existe.

   Sem decimais: por dentro o combo e' float (0.58 por ciclo do Arco
   Curto), mas mostrar "34.7281" nao diz nada a ninguem. A HUD arredonda
   para baixo.

   A cor sobe junto do marco, na paleta do jogo — nada de copiar outro
   jogo. Em coop cada jogador tem a sua linha, empilhada e curta.

   Script classico, como o resto do projeto.
   ════════════════════════════════════════════════════ */
(function(global){
  'use strict';

  // Paleta por marco. Neutra ate' 20, depois esquenta.
  const CORES=[
    {corpo:'#8b95a3',borda:'#5a626d',texto:'#c8cfd8'},   // sem marco
    {corpo:'#f2e6c0',borda:'#8a7c56',texto:'#fff6da'},   // AQUECENDO
    {corpo:'#f0c64a',borda:'#8a6c20',texto:'#ffe89a'},   // EM RITMO
    {corpo:'#ef8b34',borda:'#8a4718',texto:'#ffc489'},   // IMPLACAVEL
    {corpo:'#e8503c',borda:'#7d2118',texto:'#ffd06a'},   // LENDARIO
  ];

  const LARGURA=62, ALTURA_BARRA=3;

  function texto(ctx,s,x,y,cor,tamanho,alinhamento){
    ctx.font=tamanho+'px "Press Start 2P", monospace';
    ctx.textAlign=alinhamento||'right';
    ctx.textBaseline='top';
    ctx.fillStyle='#000000';
    ctx.fillText(s,x+1,y+1);
    ctx.fillStyle=cor;
    ctx.fillText(s,x,y);
  }

  /* Desenha a linha de UM jogador e devolve a altura ocupada, para o
     chamador empilhar o segundo em coop sem calcular nada. */
  function linha(ctx,C,jogador,x,y,rotulo){
    const pontos=C.pontuacaoExibida(jogador);
    if(pontos<=0)return 0;

    const idx=C.tier(jogador);
    const cor=CORES[Math.min(idx,CORES.length-1)];
    const info=C.tierInfo(jogador);
    const restante=C.fracaoDeGraca(jogador);
    const caindo=C.decaindo(jogador);

    // Tremor curto ao levar dano: avisa a perda sem texto gigante.
    const tremor=C.tremor(jogador);
    const dx=tremor>0?(Math.random()-0.5)*2.4*(tremor/340):0;

    // Pulso ao subir de marco. Nao repete a cada ponto — so' na mudanca.
    const brilho=C.brilho(jogador);
    const pulso=brilho>0?1+0.18*(brilho/1400):1;

    ctx.save();
    ctx.translate(x+dx,y);
    ctx.scale(pulso,pulso);

    const dir=0;   // tudo alinhado a' direita a partir da ancora

    // COMBO xNN
    texto(ctx,'COMBO',dir-30,0,'#9aa3ad',5,'right');
    texto(ctx,'x'+pontos,dir,-2,caindo?'#b06a60':cor.texto,9,'right');

    // Barra do tempo que falta antes do decaimento. Vazia = perdendo.
    const by=11, bx=dir-LARGURA;
    ctx.fillStyle='#0d1014';
    ctx.fillRect(bx-1,by-1,LARGURA+2,ALTURA_BARRA+2);
    ctx.fillStyle=cor.borda;
    ctx.fillRect(bx,by,LARGURA,ALTURA_BARRA);
    if(restante>0){
      ctx.fillStyle=cor.corpo;
      ctx.fillRect(bx,by,Math.max(1,Math.round(LARGURA*restante)),ALTURA_BARRA);
    }

    let altura=by+ALTURA_BARRA+4;
    if(info&&info.nome){
      texto(ctx,info.nome,dir,altura,cor.corpo,5,'right');
      altura+=9;
    }
    if(rotulo){
      texto(ctx,rotulo,dir-LARGURA-4,0,'#7d8894',5,'right');
    }
    ctx.restore();
    return altura+4;
  }

  /* Painel de depuracao. Fora da UI normal — so' aparece com
     ComboSystem.definirDepuracao(true). Mostra o que o balanceamento
     precisa: arma, cooldown efetivo, valor do ciclo, id e se validou. */
  function depuracao(ctx,C,jogador,x,y){
    const d=C.estadoDepuracao(jogador);
    if(!d)return;
    const linhas=['COMBO DEBUG',
      'pontos '+d.pontos+'  ('+d.exibido+')',
      'tier '+d.tier+(d.decaindo?'  DECAINDO':''),
      'graca '+d.graca+'ms  resta '+Math.round(d.restanteDaGraca*100)+'%'];
    if(d.ultimoEvento){
      const e=d.ultimoEvento;
      linhas.push('arma '+e.arma);
      linhas.push('CD '+e.cd+'ms  ganho '+e.ganho);
      linhas.push('evento #'+e.id+'  '+(e.validado?'VALID':'—')+'  '+e.origem);
    }
    ctx.save();
    ctx.globalAlpha=0.82;
    ctx.fillStyle='#05070a';
    ctx.fillRect(x-4,y-4,150,linhas.length*9+8);
    ctx.globalAlpha=1;
    linhas.forEach((l,i)=>texto(ctx,l,x,y+i*9,i===0?'#f0c64a':'#c8cfd8',5,'left'));
    ctx.restore();
  }

  /* Ponto de entrada. Recebe a lista de jogadores para nao precisar
     conhecer player/player2 nem o modo de jogo. */
  function desenhar(ctx,jogadores,W,H){
    const C=global.ComboSystem;
    if(!C||!ctx||!jogadores||!jogadores.length)return;
    const coop=jogadores.length>1;
    let y=H-46;
    for(let i=0;i<jogadores.length;i++){
      const alt=linha(ctx,C,jogadores[i],W-12,y,coop?('P'+(i+1)):'');
      if(alt>0)y-=alt+2;
    }
    if(C.depurando())depuracao(ctx,C,jogadores[0],10,60);
  }

  global.ComboHUD={desenhar,CORES};
})(typeof window!=='undefined'?window:globalThis);
