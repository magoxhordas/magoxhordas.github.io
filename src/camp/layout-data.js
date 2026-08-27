// Static CampV2 layout data. No rendering or gameplay state lives here.
(function(global){
  'use strict';

  const HORTA=Object.freeze({
    fx:.3020, fy:.1080, fw:.2500, fh:.2520, cols:5, linhas:3
  });

  // Mesmos pontos de luz usados pelo desenho do acampamento.
  const LUZES_ACAMPAMENTO = [
    [141,468,'#ffc04a',22,0],[181,470,'#ffb43a',34,.8],[304,467,'#ffc04a',22,1.7],
    [122,830,'#ffad32',24,.4],[261,820,'#ff9b28',18,2.2],
    [1050,457,'#b66cff',22,.2],[1097,463,'#a44cff',17,1.2],
    [1164,525,'#c175ff',19,2.4],[1351,526,'#bd68ff',21,.7],
    [1105,901,'#45ff9b',24,.3],[1354,901,'#45ff9b',24,1.4],
    [650,943,'#58cfff',22,.9],[873,943,'#58cfff',22,2.1],
  ];

  // Posicao visual/interativa do arqueiro. Mantida exatamente como no CampV2.
  const ARQ = {fx:.452, fy:.560};

  // Limpeza visual da loja do Merlin: estes upgrades antigos nao possuem efeito
  // de runtime e nao devem mais ocupar espaco na interface.
  const HIDDEN_MERLIN_UPGRADE_IDS=new Set(['arma_sword','arma_bow','arma_axe','farm_parcelas']);
  const HIDDEN_MERLIN_UPGRADE_NAMES=new Set(['Desbloquear Espada','Desbloquear Arco','Desbloquear Machado','Nova Parcela']);

  function installMerlinUiCleanup(){
    // Remove as definicoes da lista renderizada quando o binding global estiver disponivel.
    try{
      if(typeof META_UPGRADE_DEFS!=='undefined'&&Array.isArray(META_UPGRADE_DEFS)){
        for(let index=META_UPGRADE_DEFS.length-1;index>=0;index--){
          if(HIDDEN_MERLIN_UPGRADE_IDS.has(META_UPGRADE_DEFS[index]?.id))META_UPGRADE_DEFS.splice(index,1);
        }
      }
    }catch(_error){}

    if(typeof document==='undefined')return;

    // Fallback visual: garante que os cards nao reaparecam caso a lista seja recriada.
    const hideLegacyCards=()=>{
      document.querySelectorAll('#meta-grid .meta-card').forEach(card=>{
        const name=card.querySelector('.meta-card-name')?.textContent?.trim();
        if(name&&HIDDEN_MERLIN_UPGRADE_NAMES.has(name))card.remove();
      });
    };
    const grid=document.getElementById('meta-grid');
    if(grid){
      hideLegacyCards();
      new MutationObserver(hideLegacyCards).observe(grid,{childList:true});
    }

    // Compacta somente o resumo de Ecos/artefatos mostrado no topo da aba Ecos.
    if(!document.getElementById('merlin-compact-echo-hud-style')){
      const style=document.createElement('style');
      style.id='merlin-compact-echo-hud-style';
      style.textContent=`
        .echo-summary{
          width:min(900px,calc(100% - 24px));
          justify-self:center;
          box-sizing:border-box;
          padding:5px 8px;
          font-size:11px;
          line-height:1.1;
        }
        .echo-summary strong{font-size:14px;letter-spacing:1px;}
        .echo-artifacts{gap:4px;margin-top:4px;}
        .artifact-count{padding:2px 5px;font-size:10px;line-height:1.1;}
        #necromancer-resource-hud .necro-resource-guide{display:none!important;}
        @media(max-width:700px){
          .echo-summary{width:100%;padding:4px 6px;font-size:10px;}
          .echo-summary strong{font-size:12px;}
          .artifact-count{font-size:9px;padding:2px 4px;}
        }
      `;
      document.head.appendChild(style);
    }
  }

  // A Sombra/Espirito e pixel art. O renderer original ativa shadowBlur=10 antes
  // de chamar drawSpriteAt, fazendo o navegador aplicar blur em cada fillRect do
  // sprite. Em vez disso, desligamos o blur apenas enquanto os pixels do sprite
  // sao rasterizados e o restauramos logo depois, preservando aura e efeitos.
  // O feixe longo do ataque continua substituido por um risco curto sem blur.
  function installNecromancerShadowPerformanceFix(){
    let activeSpiritRenderCtx=null;

    const patchSpriteRenderer=()=>{
      const originalSprite=global.drawSpriteAt;
      if(typeof originalSprite!=='function')return false;
      if(originalSprite.__necroSpiritPixelBlurFix)return true;

      function optimizedSpriteRenderer(...args){
        if(!activeSpiritRenderCtx)return originalSprite(...args);
        const previousBlur=activeSpiritRenderCtx.shadowBlur;
        activeSpiritRenderCtx.shadowBlur=0;
        try{
          return originalSprite(...args);
        }finally{
          activeSpiritRenderCtx.shadowBlur=previousBlur;
        }
      }

      optimizedSpriteRenderer.__necroSpiritPixelBlurFix=true;
      optimizedSpriteRenderer.__original=originalSprite;
      global.drawSpriteAt=optimizedSpriteRenderer;
      return true;
    };

    const patch=()=>{
      patchSpriteRenderer();
      const original=global.drawNecromancerSummon;
      if(typeof original!=='function')return false;
      if(original.__necroShadowPerfFixV2)return true;

      function optimizedNecromancerSummonRenderer(renderCtx,summon,time){
        if(!summon||summon.type!=='spirit')return original(renderCtx,summon,time);

        const attackAnim=summon.attackAnim||0;
        const attacking=attackAnim>0;
        if(attacking)summon.attackAnim=0;

        let rendered=false;
        activeSpiritRenderCtx=renderCtx||null;
        try{
          rendered=original(renderCtx,summon,time);
        }finally{
          activeSpiritRenderCtx=null;
          if(attacking)summon.attackAnim=attackAnim;
        }

        const target=summon.target;
        if(attacking&&rendered===true&&renderCtx&&target&&!target.dead){
          const dx=target.x-summon.x,dy=target.y-summon.y;
          const distance=Math.hypot(dx,dy);
          if(distance>1){
            const beamLength=Math.min(distance,72);
            renderCtx.save();
            renderCtx.globalAlpha=.52;
            renderCtx.filter='none';
            renderCtx.shadowBlur=0;
            renderCtx.strokeStyle='#8dffba';
            renderCtx.lineWidth=1;
            renderCtx.beginPath();
            renderCtx.moveTo(summon.x,summon.y-4);
            renderCtx.lineTo(summon.x+dx/distance*beamLength,summon.y-4+dy/distance*beamLength);
            renderCtx.stroke();
            renderCtx.restore();
          }
        }
        return rendered;
      }

      optimizedNecromancerSummonRenderer.__necroShadowPerfFix=true;
      optimizedNecromancerSummonRenderer.__necroShadowPerfFixV2=true;
      optimizedNecromancerSummonRenderer.__original=original;
      global.drawNecromancerSummon=optimizedNecromancerSummonRenderer;
      return true;
    };

    if(patch())return;
    if(typeof global.addEventListener==='function')global.addEventListener('load',patch,{once:true});
  }

  installMerlinUiCleanup();
  installNecromancerShadowPerformanceFix();

  global.CampLayoutData=Object.freeze({HORTA,LUZES_ACAMPAMENTO,ARQ});
})(window);
