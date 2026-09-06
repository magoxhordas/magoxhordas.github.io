// HUD e escolhas compartilhados pelos objetivos e eventos da campanha.
(function(global){
  'use strict';

  const STYLE_ID='campaign-objective-ui-style';
  const ROOT_ID='campaign-objective-ui';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function installStyle(doc){
    if(doc.getElementById(STYLE_ID))return;
    const style=doc.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${ROOT_ID}{position:fixed;inset:0;z-index:85;pointer-events:none;font-family:"Courier New",monospace;color:#f7edcf}
      #${ROOT_ID}.suspended{display:none!important}
      /* Canto superior DIREITO, alinhado com a borda direita do #ui-top e logo
         abaixo dele. Antes ficava centralizado no topo, por cima da barra de
         vida/onda/tempo. Como virou coluna e nao faixa, e' mais estreito. */
      #campaign-objective-panel{position:absolute;right:max(22px,calc((100vw - 1120px)/2));top:108px;width:min(268px,calc(100vw - 24px));padding:8px 11px 9px;background:linear-gradient(180deg,rgba(17,13,24,.94),rgba(8,7,13,.9));border:2px solid #8e7544;box-shadow:0 0 0 2px #21182a,0 7px 24px rgba(0,0,0,.55);display:none}
      #campaign-objective-panel.visible{display:block}
      #campaign-objective-kicker{font-size:9px;letter-spacing:2.2px;color:#d8ad55;text-transform:uppercase}
      #campaign-objective-title{margin-top:2px;font-size:15px;font-weight:900;letter-spacing:.5px;text-shadow:0 2px #000}
      #campaign-objective-detail{margin-top:3px;color:#c9c0aa;font-size:10px;line-height:1.35}
      #campaign-objective-track{height:8px;margin-top:7px;padding:1px;background:#08070a;border:1px solid #4d4438;display:none}
      #campaign-objective-track.visible{display:block}
      #campaign-objective-fill{display:block;height:100%;width:0;background:linear-gradient(90deg,#aa3f2e,#e7b94f);box-shadow:0 0 8px rgba(234,161,59,.55);transition:width .16s linear}
      #campaign-objective-meters{display:flex;gap:7px;margin-top:6px}
      .campaign-objective-meter{flex:1;min-width:0}
      .campaign-objective-meter-label{display:flex;justify-content:space-between;gap:5px;font-size:8px;color:#b8dff0}
      .campaign-objective-meter-track{height:5px;margin-top:2px;background:#071018;border:1px solid #345063}
      .campaign-objective-meter-fill{display:block;height:100%;background:linear-gradient(90deg,#67c7e8,#d9f7ff);transition:width .12s linear}
      .campaign-objective-meter.danger .campaign-objective-meter-fill{background:linear-gradient(90deg,#7cccf0,#fff)}
      #campaign-interact-prompt{position:absolute;left:50%;bottom:98px;transform:translateX(-50%);display:none;align-items:center;gap:8px;padding:6px 11px;background:rgba(8,7,13,.9);border:1px solid #b9944b;box-shadow:0 4px 16px rgba(0,0,0,.5);font-size:11px;font-weight:bold;white-space:nowrap}
      #campaign-interact-prompt.visible{display:flex}
      #campaign-interact-key{padding:2px 5px;color:#1b1410;background:#e7c36f;border:1px solid #fff0b0;box-shadow:inset 0 -2px rgba(70,44,14,.3)}
      #campaign-action-button{position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(112px,calc(env(safe-area-inset-bottom) + 96px));width:76px;height:76px;border-radius:50%;display:none;place-items:center;padding:8px;background:radial-gradient(circle at 38% 30%,#f7d77f,#ae6e2f 62%,#42281e);border:3px solid #f6e1a3;box-shadow:0 0 0 3px rgba(36,20,18,.8),0 6px 20px rgba(0,0,0,.5);color:#21140f;font:900 11px/1.05 "Courier New",monospace;text-align:center;pointer-events:auto;touch-action:none;user-select:none}
      #campaign-action-button.visible{display:grid}
      #campaign-action-button.pressed{transform:scale(.92);filter:brightness(1.18)}
      #campaign-choice-layer{position:absolute;inset:0;display:none;place-items:center;padding:18px;background:rgba(3,2,7,.77);pointer-events:auto;z-index:2}
      #campaign-choice-layer.visible{display:grid}
      /* A tela de escolha usa a MESMA linguagem dos menus do jogo: ornamento de
         losango, legenda entre filetes, cartoes de borda dourada e o veu roxo
         escuro. Antes era um dialogo generico de navegador no meio de um jogo
         pixel art — destoava de tudo o que esta' em volta. */
      #campaign-choice-card{position:relative;width:min(660px,calc(100vw - 28px));max-height:calc(100vh - 34px);overflow:auto;
        padding:22px 22px 20px;background:linear-gradient(160deg,#151024 0%,#0b0813 55%,#07060d 100%);
        border:1px solid rgba(200,168,75,.42);
        box-shadow:0 0 0 1px rgba(8,6,15,.9),0 0 34px rgba(200,168,75,.10),0 22px 70px rgba(0,0,0,.85);
        text-align:center}
      /* filete interno: o mesmo truque de moldura dupla das telas de menu */
      #campaign-choice-card::before{content:'';position:absolute;inset:5px;border:1px solid rgba(200,168,75,.16);pointer-events:none}
      #campaign-choice-ornamento{display:flex;align-items:center;justify-content:center;gap:9px;margin-bottom:9px}
      #campaign-choice-ornamento i{display:block;height:1px;width:52px;background:linear-gradient(90deg,transparent,rgba(200,168,75,.75),transparent)}
      #campaign-choice-ornamento b{display:block;width:6px;height:6px;background:#c8a84b;transform:rotate(45deg);box-shadow:0 0 9px rgba(200,168,75,.55)}
      #campaign-choice-kicker{font-size:9px;letter-spacing:3.4px;color:#c8a84b;text-transform:uppercase;opacity:.92}
      #campaign-choice-title{margin:7px 0 8px;font-size:25px;font-weight:bold;letter-spacing:2.5px;color:#f4e6bd;
        text-shadow:0 2px 20px rgba(0,0,0,.92),0 0 30px rgba(200,168,75,.26)}
      #campaign-choice-body{margin:0 auto 17px;max-width:530px;color:#9a8fae;font-size:11px;letter-spacing:.6px;line-height:1.6}
      #campaign-choice-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(186px,1fr));gap:11px}
      .campaign-choice-option{position:relative;min-height:96px;padding:13px 11px 12px;cursor:pointer;
        display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:6px;
        color:#f4e8c7;font-family:inherit;text-align:center;
        background:linear-gradient(180deg,rgba(26,20,42,.92),rgba(11,8,19,.96));
        border:1px solid rgba(120,104,150,.30);border-radius:3px;
        transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease}
      /* fio dourado no pe do cartao, como nos cartoes de modo/dificuldade */
      .campaign-choice-option::after{content:'';position:absolute;left:14%;right:14%;bottom:0;height:1px;
        background:linear-gradient(90deg,transparent,rgba(200,168,75,.0),transparent);transition:background .18s ease}
      .campaign-choice-option:hover,.campaign-choice-option:focus-visible{outline:none;transform:translateY(-2px);
        border-color:rgba(240,208,128,.72);box-shadow:0 0 22px rgba(200,168,75,.18),inset 0 0 22px rgba(200,168,75,.05)}
      .campaign-choice-option:hover::after,.campaign-choice-option:focus-visible::after{
        background:linear-gradient(90deg,transparent,rgba(240,208,128,.85),transparent)}
      .campaign-choice-option-title{display:block;font-size:13px;font-weight:bold;letter-spacing:1.1px;color:#f0d080;
        text-shadow:0 1px 0 #000}
      .campaign-choice-option-detail{display:block;font-size:9.5px;letter-spacing:.5px;line-height:1.5;color:#9a8fae}
      /* Preco e' informacao de decisao: fica separado e legivel, nao enfiado
         no meio do nome como estava. */
      .campaign-choice-option-price{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;
        font-size:10px;letter-spacing:1px;color:#ffd77b;background:rgba(200,168,75,.10);
        border:1px solid rgba(200,168,75,.34);border-radius:2px}
      .campaign-choice-option.costly .campaign-choice-option-price{color:#ffc9a3;border-color:rgba(239,156,115,.42);background:rgba(239,156,115,.10)}
      /* "Seguir viagem" nao e' uma oferta: fica sobrio, para nao competir com
         as tres que custam moeda. */
      .campaign-choice-option.neutra{grid-column:1/-1;min-height:0;padding:9px;background:rgba(8,6,14,.7);
        border-color:rgba(120,104,150,.20)}
      .campaign-choice-option.neutra .campaign-choice-option-title{font-size:11px;color:#c0b7d0;letter-spacing:2px}
      @media (pointer:fine) and (min-width:801px){#campaign-action-button{display:none!important}}
      @media (max-width:800px){#campaign-objective-panel{right:max(8px,var(--safe-right,0px));top:74px;width:min(212px,calc(100vw - 16px));padding:6px 8px}#campaign-objective-title{font-size:12px}#campaign-objective-detail{font-size:9px}#campaign-interact-prompt{bottom:82px;font-size:9px}#campaign-choice-title{font-size:18px}#campaign-choice-card{padding:14px}.campaign-choice-option{min-height:72px}}
      body.campaign-chapter-active #${ROOT_ID},body:not(.campaign-hud-active) #${ROOT_ID}{display:none!important}
    `;
    doc.head.appendChild(style);
  }

  function create(options={}){
    const doc=options.document||global.document;
    let root=null,panel=null,kicker=null,title=null,detail=null,track=null,fill=null,meters=null;
    let prompt=null,promptKey=null,promptText=null,actionButton=null,choiceLayer=null;
    let actionStart=options.onActionStart||(()=>{}),actionEnd=options.onActionEnd||(()=>{});
    let choiceToken=0;
    let suspended=false;

    function ensure(){
      if(!doc||!doc.body)return false;
      if(root)return true;
      installStyle(doc);
      root=doc.createElement('div');root.id=ROOT_ID;root.setAttribute('aria-live','polite');
      root.innerHTML=`
        <section id="campaign-objective-panel" aria-hidden="true">
          <div id="campaign-objective-kicker"></div><div id="campaign-objective-title"></div>
          <div id="campaign-objective-detail"></div>
          <div id="campaign-objective-track"><span id="campaign-objective-fill"></span></div>
          <div id="campaign-objective-meters"></div>
        </section>
        <div id="campaign-interact-prompt"><span id="campaign-interact-key">E</span><span id="campaign-interact-text"></span></div>
        <button id="campaign-action-button" type="button" aria-label="Interagir">INTERAGIR</button>
        <div id="campaign-choice-layer" role="dialog" aria-modal="true" aria-labelledby="campaign-choice-title">
          <div id="campaign-choice-card"><div id="campaign-choice-ornamento" aria-hidden="true"><i></i><b></b><i></i></div><div id="campaign-choice-kicker">DECISÃO COMPARTILHADA</div><h2 id="campaign-choice-title"></h2><p id="campaign-choice-body"></p><div id="campaign-choice-options"></div></div>
        </div>`;
      doc.body.appendChild(root);
      root.classList.toggle('suspended',suspended);
      root.setAttribute('aria-hidden',suspended?'true':'false');
      panel=root.querySelector('#campaign-objective-panel');kicker=root.querySelector('#campaign-objective-kicker');
      title=root.querySelector('#campaign-objective-title');detail=root.querySelector('#campaign-objective-detail');
      track=root.querySelector('#campaign-objective-track');fill=root.querySelector('#campaign-objective-fill');
      meters=root.querySelector('#campaign-objective-meters');prompt=root.querySelector('#campaign-interact-prompt');
      promptKey=root.querySelector('#campaign-interact-key');promptText=root.querySelector('#campaign-interact-text');
      actionButton=root.querySelector('#campaign-action-button');choiceLayer=root.querySelector('#campaign-choice-layer');
      const press=event=>{event.preventDefault();actionButton.classList.add('pressed');actionStart(0);};
      const release=event=>{event.preventDefault();actionButton.classList.remove('pressed');actionEnd(0);};
      actionButton.addEventListener('pointerdown',press);
      actionButton.addEventListener('pointerup',release);
      actionButton.addEventListener('pointercancel',release);
      actionButton.addEventListener('pointerleave',event=>{if(actionButton.classList.contains('pressed'))release(event);});
      return true;
    }

    function setActionHandlers(start,end){actionStart=start||(()=>{});actionEnd=end||(()=>{});}

    /* A pausa e' uma tela de navegacao, nao parte da arena. O estado do HUD
       continua sendo atualizado por baixo para voltar correto ao retomar,
       mas nenhum painel, prompt ou botao da missao pode atravessar a pausa. */
    function setSuspended(value){
      suspended=!!value;
      if(!ensure())return;
      root.classList.toggle('suspended',suspended);
      root.setAttribute('aria-hidden',suspended?'true':'false');
      if(suspended)actionButton.classList.remove('pressed');
    }

    function setHud(view){
      if(!ensure())return;
      if(!view){panel.classList.remove('visible');panel.setAttribute('aria-hidden','true');meters.replaceChildren();return;}
      panel.classList.add('visible');panel.setAttribute('aria-hidden','false');
      kicker.textContent=view.kicker||'OBJETIVO DA ONDA';title.textContent=view.title||'';detail.textContent=view.detail||'';
      const progress=Number(view.progress);
      track.classList.toggle('visible',Number.isFinite(progress));
      if(Number.isFinite(progress))fill.style.width=`${Math.round(clamp(progress,0,1)*100)}%`;
      meters.replaceChildren();
      for(const meter of view.meters||[]){
        const item=doc.createElement('div');item.className=`campaign-objective-meter${meter.danger?' danger':''}`;
        const value=clamp(Number(meter.value)||0,0,1);
        item.innerHTML=`<div class="campaign-objective-meter-label"><span></span><b></b></div><div class="campaign-objective-meter-track"><span class="campaign-objective-meter-fill"></span></div>`;
        item.querySelector('span').textContent=meter.label||'';item.querySelector('b').textContent=meter.text||`${Math.round(value*100)}%`;
        item.querySelector('.campaign-objective-meter-fill').style.width=`${Math.round(value*100)}%`;meters.appendChild(item);
      }
    }

    function setAction(view){
      if(!ensure())return;
      const visible=!!view;
      prompt.classList.toggle('visible',visible);actionButton.classList.toggle('visible',visible);
      if(!visible){actionButton.classList.remove('pressed');return;}
      promptKey.textContent=view.key||'E';promptText.textContent=view.text||'Interagir';
      actionButton.textContent=view.mobileLabel||view.text||'INTERAGIR';
      actionButton.setAttribute('aria-label',view.text||'Interagir');
    }

    function showChoice(config={}){
      if(!ensure())return;
      const token=++choiceToken;
      root.querySelector('#campaign-choice-kicker').textContent=config.kicker||'DECISÃO COMPARTILHADA';
      root.querySelector('#campaign-choice-title').textContent=config.title||'Escolha';
      root.querySelector('#campaign-choice-body').textContent=config.body||'';
      const list=root.querySelector('#campaign-choice-options');list.replaceChildren();
      for(const option of config.options||[]){
        const button=doc.createElement('button');button.type='button';
        /* O preco vinha grudado no nome ("Ração de Campo · 7"), o que fazia o
           jogador ler duas informacoes diferentes na mesma linha. Aqui ele e'
           separado numa etiqueta propria; o nome fica so' o nome. */
        const bruto=String(option.title||option.id||'');
        /* O titulo chega como "Ração de Campo · 7🪙": o numero NAO e' o fim da
           string, vem a moeda depois. Exigir digito no fim fazia a separacao
           falhar em todas as ofertas — e, sem preco, todas caiam na classe
           neutra, que ocupa a linha inteira: os tres cartoes viravam uma pilha. */
        const corte=bruto.match(/^(.*?)\s*[·\-]\s*(\d+)\s*\D*$/);
        const nome=corte?corte[1]:bruto;
        const preco=corte?corte[2]:null;
        const neutra=!preco&&!option.costly;
        button.className=`campaign-choice-option${option.costly?' costly':''}${neutra?' neutra':''}`;
        const optionTitle=doc.createElement('span');optionTitle.className='campaign-choice-option-title';optionTitle.textContent=nome;
        button.append(optionTitle);
        if(preco){
          const etiqueta=doc.createElement('span');etiqueta.className='campaign-choice-option-price';
          etiqueta.textContent=`${preco} 🪙`;
          button.append(etiqueta);
        }
        const optionDetail=doc.createElement('span');optionDetail.className='campaign-choice-option-detail';optionDetail.textContent=option.detail||'';
        button.append(optionDetail);
        button.onclick=()=>{if(token!==choiceToken)return;hideChoice();option.onChoose?.(option.id);};
        list.appendChild(button);
      }
      choiceLayer.classList.add('visible');choiceLayer.setAttribute('aria-hidden','false');
      list.querySelector('button')?.focus({preventScroll:true});
    }

    function hideChoice(){
      if(!ensure())return;
      choiceToken++;choiceLayer.classList.remove('visible');choiceLayer.setAttribute('aria-hidden','true');
    }

    function reset(){if(!ensure())return;setHud(null);setAction(null);hideChoice();setSuspended(false);}

    return Object.freeze({setHud,setAction,showChoice,hideChoice,reset,setActionHandlers,setSuspended});
  }

  global.CampaignObjectiveUI=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
