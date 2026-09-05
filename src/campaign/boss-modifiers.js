/* Nivel de Ameaca: modificadores opcionais para os chefes da campanha. */
(function(global){
  'use strict';

  const D=global.BossModifierData;
  if(!D)return;
  const {CONFIG,POR_CHEFE,POR_ID,INCOMPATIVEIS}=D;
  let deps={};
  let relogioMs=0;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const agora=()=>relogioMs;
  const distancia=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.y||0)-(b?.y||0));
  const jogadores=()=>((deps.getPlayers&&deps.getPlayers())||[]).filter(p=>p&&!p.dead);
  const inimigos=()=>((deps.getEnemies&&deps.getEnemies())||[]).filter(Boolean);
  const partes=(...args)=>deps.spawnParts&&deps.spawnParts(...args);
  const aviso=(x,y,texto)=>deps.spawnNotice&&deps.spawnNotice(x,y,texto,0);

  function novoEstado(){
    return {
      chefe:null,ids:[],mods:[],cd:{},
      fogo:[],gelo:[],raios:[],minas:[],corrupcao:[],abismos:[],
      runas:[],orbitais:[],ecos:[],ondas:[],rituais:[],invocacoesPendentes:[],
      inimigosBuffados:new Set(),marcosVistos:{},curaGasta:0,
      furiaAte:0,furiaUsada:false,cacadaAte:0,investida:null,sumico:0,
      regenAte:0,bonusRitualAte:0,revelacaoAte:0,recompensaPaga:false,
      multVelAplicado:1,multCdAplicado:1,orbVisivel:true,orbTroca:0,
    };
  }
  let est=novoEstado();
  let nivelDaRun=0;
  let dificuldadeDaRun=null;

  function configurar(novasDeps){deps=novasDeps||{};}
  function limitePara(dificuldade){return CONFIG.LIMITE_POR_DIFICULDADE[dificuldade]||0;}
  function dificuldadePermite(dificuldade){return limitePara(dificuldade)>0;}
  function ajustarNivel(nivel,dificuldade){return clamp(Math.round(Number(nivel)||0),0,limitePara(dificuldade));}
  function nivelAtual(){return dificuldadePermite(dificuldadeDaRun)?nivelDaRun:0;}
  function ativo(){return nivelAtual()>0;}
  function multiplicadorRecompensa(){
    const bonus=CONFIG.BONUS_RECOMPENSA[Math.min(nivelAtual(),CONFIG.BONUS_RECOMPENSA.length-1)]||0;
    return 1+bonus;
  }
  function iniciarRun(nivel,dificuldade){
    dificuldadeDaRun=dificuldade;
    nivelDaRun=ajustarNivel(nivel,dificuldade);
    limpar('run-start');
  }

  function catalogoDoChefe(nomeClasse){return (POR_CHEFE[nomeClasse]||[]).map(id=>POR_ID[id]).filter(Boolean);}
  function conflita(id,ids){return INCOMPATIVEIS.some(par=>(par[0]===id&&ids.includes(par[1]))||(par[1]===id&&ids.includes(par[0])));}
  function estouraCategoria(mod,escolhidos){
    const teto=CONFIG.TETO_POR_CATEGORIA[mod.categoria];
    return Boolean(teto&&escolhidos.filter(item=>item.categoria===mod.categoria).length>=teto);
  }
  function sortear(nomeClasse,quantidade,aleatorio){
    const rnd=aleatorio||Math.random;
    const disponiveis=catalogoDoChefe(nomeClasse).slice();
    const escolhidos=[];
    const ids=[];
    while(escolhidos.length<quantidade&&disponiveis.length){
      const validos=disponiveis.filter(m=>!ids.includes(m.id)&&!conflita(m.id,ids)&&!estouraCategoria(m,escolhidos));
      if(!validos.length)break;
      const total=validos.reduce((s,m)=>s+(m.peso||1),0);
      let ponto=rnd()*total;
      let escolhido=validos[validos.length-1];
      for(const mod of validos){ponto-=mod.peso||1;if(ponto<=0){escolhido=mod;break;}}
      escolhidos.push(escolhido);ids.push(escolhido.id);
      disponiveis.splice(disponiveis.indexOf(escolhido),1);
    }
    return escolhidos;
  }

  function tem(id){return est.ids.includes(id);}
  function parametro(id,chave){return POR_ID[id]?.params?.[chave];}
  function pronto(id,ms){
    if(!Number.isFinite(est.cd[id])){est.cd[id]=agora()+ms;return false;}
    if(est.cd[id]>agora())return false;
    est.cd[id]=agora()+ms;
    return true;
  }
  function prepararCooldowns(){
    for(const mod of est.mods){
      const ms=mod.params?.cooldownMs;
      if(Number.isFinite(ms)&&ms>0)est.cd[mod.id]=agora()+ms;
    }
  }

  function restaurarBuffDoInimigo(e){
    const buff=e&&e._ameacaBuff;
    if(!buff||typeof buff!=='object')return;
    if(Number.isFinite(e.damage)&&buff.dano)e.damage/=buff.dano;
    if(Number.isFinite(e.speed)&&buff.vel)e.speed/=buff.vel;
    delete e._ameacaBuff;
    est.inimigosBuffados.delete(e);
  }
  function restaurarMultiplicadores(){
    const chefe=est.chefe;
    if(!chefe)return;
    const vel=est.multVelAplicado||1;
    if(vel!==1&&Number.isFinite(chefe.speed))chefe.speed/=vel;
    const cd=est.multCdAplicado||1;
    if(cd!==1){
      for(const chave of Object.keys(chefe)){
        if(/Cd$/.test(chave)&&Number.isFinite(chefe[chave])&&chefe[chave]>0)chefe[chave]/=cd;
      }
    }
    est.multVelAplicado=1;est.multCdAplicado=1;
  }
  function limpar(){
    restaurarMultiplicadores();
    for(const e of Array.from(est.inimigosBuffados))restaurarBuffDoInimigo(e);
    if(est.chefe)delete est.chefe._ameacaIds;
    est=novoEstado();
    relogioMs=0;
  }

  function dentroDaArena(x,y,margem=0){
    const b=deps.getArenaBounds?deps.getArenaBounds():null;
    if(!b)return{x,y};
    const W=deps.getW?deps.getW():640,H=deps.getH?deps.getH():480;
    return{x:clamp(x,(b.left||0)+margem,W-(b.right||0)-margem),y:clamp(y,(b.top||0)+margem,H-(b.bottom||0)-margem)};
  }
  function criarAlvo(base,vida,raio,cor){
    const alvo=Object.assign(base,{hp:vida,maxHp:vida,radius:raio,dead:false,type:'boss_modifier_object'});
    alvo.takeDmg=function(dano){
      if(this.dead)return 0;
      const aplicado=Math.max(0,Number(dano)||0);
      this.hp-=aplicado;
      partes(this.x,this.y,cor,4,28);
      if(this.hp<=0){this.hp=0;this.dead=true;if('viva'in this)this.viva=false;partes(this.x,this.y,cor,14,60);}
      return aplicado;
    };
    return alvo;
  }
  function criarRunas(chefe){
    const quantidade=Math.min(CONFIG.MAX_RUNAS,parametro('runic_shield','quantidade'));
    for(let i=0;i<quantidade;i++){
      const ang=i/quantidade*Math.PI*2;
      const alvo=criarAlvo({ang,viva:true,x:chefe.x,y:chefe.y},parametro('runic_shield','vidaRuna'),12,'#9fd8ff');
      est.runas.push(alvo);
    }
    atualizarRunas(chefe,0);
  }
  function criarOrbitais(chefe){
    const quantidade=parametro('orbitals','quantidade');
    for(let i=0;i<quantidade;i++)est.orbitais.push({ang:i/quantidade*Math.PI*2,x:chefe.x,y:chefe.y});
    est.orbVisivel=true;est.orbTroca=agora()+parametro('orbitals','visivelMs');
  }
  function instalarModificadores(chefe,mods){
    limpar('boss-switch');
    est.chefe=chefe;est.mods=mods;est.ids=mods.map(m=>m.id);
    est.revelacaoAte=agora()+CONFIG.REVELACAO_MS;
    chefe._ameacaIds=est.ids.slice();
    prepararCooldowns();
    if(tem('runic_shield'))criarRunas(chefe);
    if(tem('orbitals'))criarOrbitais(chefe);
  }
  function aoNascerChefe(chefe){
    if(!chefe||!ativo())return;
    if(est.chefe===chefe&&est.ids.length)return;
    instalarModificadores(chefe,sortear(chefe.constructor?.name,nivelAtual()));
  }
  function forcarModificadores(ids,chefe){
    const alvo=chefe||est.chefe;
    if(!alvo)return false;
    instalarModificadores(alvo,(ids||[]).map(id=>POR_ID[id]).filter(Boolean));
    return true;
  }

  function revelando(){return ativo()&&Boolean(est.chefe)&&agora()<est.revelacaoAte;}
  function chefeOculto(chefe){return ativo()&&est.chefe===chefe&&est.sumico>agora();}

  function golpeForte(chefe,x,y,dano){
    if(!ativo()||est.chefe!==chefe||revelando())return;
    const px=Number.isFinite(x)?x:chefe.x,py=Number.isFinite(y)?y:chefe.y;
    if(tem('volcanic')&&est.fogo.length<CONFIG.MAX_AREAS_FOGO){
      const p=dentroDaArena(px,py,20),intervalo=parametro('volcanic','intervaloDanoMs');
      est.fogo.push({...p,ate:agora()+parametro('volcanic','duracaoMs'),tick:agora()+intervalo});
    }
    if(tem('glacial')&&est.gelo.length<CONFIG.MAX_AREAS_GELO){
      const p=dentroDaArena(px,py,20),intervalo=parametro('glacial','intervaloDanoMs');
      est.gelo.push({...p,ate:agora()+parametro('glacial','duracaoMs'),tick:agora()+intervalo});
    }
    if(tem('echoing'))est.ecos.push({x:px,y:py,quando:agora()+parametro('echoing','atrasoMs'),dano:Math.max(1,(dano||10)*parametro('echoing','fracaoDano'))});
    if(tem('stormbound')&&pronto('stormbound',parametro('stormbound','cooldownMs'))){
      const pls=jogadores(),q=Math.min(parametro('stormbound','quantidade'),CONFIG.MAX_RAIOS-est.raios.length);
      for(let i=0;i<q;i++){
        const alvo=pls[i%Math.max(1,pls.length)]||chefe;
        const p=dentroDaArena(alvo.x+(Math.random()-.5)*70,alvo.y+(Math.random()-.5)*70,18);
        est.raios.push({...p,cai:agora()+parametro('stormbound','avisoMs')});
      }
    }
  }

  function multiplicadorDano(chefe){
    return ativo()&&est.chefe===chefe&&est.bonusRitualAte>agora()?parametro('ritualist','bonusDano'):1;
  }
  function acertouJogador(chefe,jogador,danoReal){
    if(!ativo()||est.chefe!==chefe||!tem('vampiric')||!(danoReal>0))return 0;
    const teto=chefe.maxHp*parametro('vampiric','tetoPorBatalha');
    const cura=Math.min(danoReal*parametro('vampiric','fracao'),Math.max(0,teto-est.curaGasta));
    if(cura<=0)return 0;
    est.curaGasta+=cura;chefe.hp=Math.min(chefe.maxHp,chefe.hp+cura);
    if(jogador)partes(jogador.x,jogador.y,'#cc2244',4,40);
    return cura;
  }
  function causarDano(chefe,jogador,dano,continuo){
    if(!jogador||typeof jogador.takeDmg!=='function')return 0;
    const antes=Number(jogador.hp);
    const resultado=jogador.takeDmg((Number(dano)||0)*multiplicadorDano(chefe),continuo);
    const depois=Number(jogador.hp);
    const real=Number.isFinite(resultado)?Math.max(0,resultado):(Number.isFinite(antes)&&Number.isFinite(depois)?Math.max(0,antes-depois):0);
    acertouJogador(chefe,jogador,real);
    return real;
  }
  function levouDano(chefe,dano){
    if(!ativo()||est.chefe!==chefe)return dano;
    let final=Number(dano)||0;
    if(est.runas.some(r=>r.viva&&!r.dead))final*=1-parametro('runic_shield','reducaoDano');
    if(est.regenAte>agora()){est.regenAte=0;aviso(chefe.x,chefe.y-40,'RITUAL INTERROMPIDO');}
    return final;
  }

  function fatorCd(chefe,t){
    let fator=1;
    if(tem('bloodthirsty')){
      const frac=chefe.maxHp>0?chefe.hp/chefe.maxHp:1;
      const marcos=parametro('bloodthirsty','marcos'),reducoes=parametro('bloodthirsty','reducaoCd');
      for(let i=0;i<marcos.length;i++){
        if(frac<=marcos[i]){
          fator=reducoes[i];
          if(!est.marcosVistos[i]){est.marcosVistos[i]=true;aviso(chefe.x,chefe.y-46,'MAIS AGRESSIVO');}
        }
      }
    }
    if(est.furiaAte>t)fator*=parametro('berserker','reducaoCd');
    return fator;
  }
  function recomporMultiplicadores(chefe,t){
    const desejadoVel=(est.cacadaAte>t?parametro('hunter','bonusVel'):1)*(est.furiaAte>t?parametro('berserker','bonusVel'):1);
    const velAnterior=est.multVelAplicado||1;
    if(Number.isFinite(chefe.speed))chefe.speed=chefe.speed/velAnterior*desejadoVel;
    est.multVelAplicado=desejadoVel;
    const desejadoCd=fatorCd(chefe,t),cdAnterior=est.multCdAplicado||1;
    if(desejadoCd!==cdAnterior){
      for(const chave of Object.keys(chefe)){
        if(/Cd$/.test(chave)&&Number.isFinite(chefe[chave])&&chefe[chave]>0)chefe[chave]=chefe[chave]/cdAnterior*desejadoCd;
      }
      est.multCdAplicado=desejadoCd;
    }
  }
  function atualizarFuria(chefe,t){
    if(tem('berserker')&&!est.furiaUsada&&chefe.maxHp>0&&chefe.hp/chefe.maxHp<=parametro('berserker','gatilhoHp')){
      est.furiaUsada=true;est.furiaAte=t+parametro('berserker','duracaoMs');aviso(chefe.x,chefe.y-50,'FURIA');
    }
    if(est.furiaAte&&t>=est.furiaAte)est.furiaAte=0;
  }
  function atualizarMobilidade(chefe,dt,t,alvo){
    if(tem('hunter')&&!est.cacadaAte&&pronto('hunter',parametro('hunter','cooldownMs'))){
      est.cacadaAte=t+parametro('hunter','duracaoMs');aviso(chefe.x,chefe.y-44,'CACADA');
    }
    if(est.cacadaAte&&t>=est.cacadaAte)est.cacadaAte=0;
    if(tem('teleporter')&&!est.sumico&&pronto('teleporter',parametro('teleporter','cooldownMs'))){
      est.sumico=t+parametro('teleporter','sumicoMs');partes(chefe.x,chefe.y,'#9b6bff',14,60);
    }
    if(est.sumico&&t>=est.sumico){
      est.sumico=0;
      const ang=Math.random()*Math.PI*2;
      const d=parametro('teleporter','distanciaMin')+Math.random()*(parametro('teleporter','distanciaMax')-parametro('teleporter','distanciaMin'));
      const base=alvo||chefe,p=dentroDaArena(base.x+Math.cos(ang)*d,base.y+Math.sin(ang)*d,(chefe.radius||30)+8);
      chefe.x=p.x;chefe.y=p.y;partes(chefe.x,chefe.y,'#c9a4ff',16,70);
    }
    if(tem('charger')){
      if(!est.investida&&alvo&&pronto('charger',parametro('charger','cooldownMs'))){
        est.investida={ang:Math.atan2(alvo.y-chefe.y,alvo.x-chefe.x),avisoAte:t+parametro('charger','avisoMs'),fimAte:0,acertou:new Set()};
      }
      const inv=est.investida;
      if(inv){
        if(!inv.fimAte&&t>=inv.avisoAte)inv.fimAte=t+parametro('charger','duracaoMs');
        if(inv.fimAte){
          if(t>=inv.fimAte)est.investida=null;
          else{
            const passo=parametro('charger','velocidade')*dt;
            chefe.x+=Math.cos(inv.ang)*passo;chefe.y+=Math.sin(inv.ang)*passo;
            if(deps.clampEntity)deps.clampEntity(chefe,chefe.radius||30);
            for(const pl of jogadores())if(!inv.acertou.has(pl)&&distancia(pl,chefe)<(chefe.radius||30)+(pl.radius||16)){
              inv.acertou.add(pl);causarDano(chefe,pl,parametro('charger','dano'),false);
            }
          }
        }
      }
    }
    if(tem('repulsor')&&pronto('repulsor',parametro('repulsor','cooldownMs')))est.ondas.push({x:chefe.x,y:chefe.y,dispara:t+parametro('repulsor','avisoMs'),feito:false});
    for(let i=est.ondas.length-1;i>=0;i--){
      const onda=est.ondas[i];
      if(t>=onda.dispara&&!onda.feito){
        onda.feito=true;
        for(const pl of jogadores()){
          const d=distancia(pl,onda);if(d>=parametro('repulsor','raio'))continue;
          const ang=Math.atan2(pl.y-onda.y,pl.x-onda.x);
          pl.x+=Math.cos(ang)*parametro('repulsor','empurrao');pl.y+=Math.sin(ang)*parametro('repulsor','empurrao');
          if(deps.clampEntity)deps.clampEntity(pl);causarDano(chefe,pl,parametro('repulsor','dano'),false);
        }
        partes(onda.x,onda.y,'#a8d8ff',18,90);
      }
      if(t>=onda.dispara+260)est.ondas.splice(i,1);
    }
  }

  function atualizarExercito(chefe,t){
    if(tem('summoner')&&pronto('summoner',parametro('summoner','cooldownMs'))){
      const teto=deps.getSpawnCap?deps.getSpawnCap():14;
      const livres=Math.max(0,Math.min(parametro('summoner','quantidade'),teto-inimigos().filter(e=>!e.dead).length-est.invocacoesPendentes.length,CONFIG.MAX_INVOCADOS-est.invocacoesPendentes.length));
      for(let i=0;i<livres;i++){
        const ang=Math.random()*Math.PI*2,p=dentroDaArena(chefe.x+Math.cos(ang)*70,chefe.y+Math.sin(ang)*70,24);
        est.invocacoesPendentes.push({...p,quando:t+parametro('summoner','avisoMs')});
      }
      if(livres)aviso(chefe.x,chefe.y-48,'REFORCOS A CAMINHO');
    }
    for(let i=est.invocacoesPendentes.length-1;i>=0;i--){
      const pendente=est.invocacoesPendentes[i];if(t<pendente.quando)continue;
      const teto=deps.getSpawnCap?deps.getSpawnCap():14;
      if(inimigos().filter(e=>!e.dead).length<teto){deps.spawnEnemy&&deps.spawnEnemy(null,pendente.x,pendente.y,'ameaca');partes(pendente.x,pendente.y,'#8ad6a0',8,45);}
      est.invocacoesPendentes.splice(i,1);
    }
    if(tem('commander')){
      const raio=parametro('commander','raio');
      for(const e of inimigos()){
        if(e.dead){restaurarBuffDoInimigo(e);continue;}
        const perto=distancia(e,chefe)<raio;
        if(perto&&!e._ameacaBuff){
          const buff={dano:parametro('commander','bonusDano'),vel:parametro('commander','bonusVel')};
          e.damage=(e.damage||0)*buff.dano;e.speed=(e.speed||0)*buff.vel;e._ameacaBuff=buff;est.inimigosBuffados.add(e);
        }else if(!perto&&e._ameacaBuff)restaurarBuffDoInimigo(e);
      }
    }
    if(tem('ritualist')&&pronto('ritualist',parametro('ritualist','cooldownMs'))){
      for(let i=0;i<parametro('ritualist','quantidade');i++){
        const ang=Math.random()*Math.PI*2,p=dentroDaArena(chefe.x+Math.cos(ang)*120,chefe.y+Math.sin(ang)*90,22);
        est.rituais.push(criarAlvo({...p,completa:t+parametro('ritualist','canalizaMs')},parametro('ritualist','vidaRuna'),14,'#ffd76a'));
      }
      aviso(chefe.x,chefe.y-52,'RITUAL');
    }
    for(let i=est.rituais.length-1;i>=0;i--){
      const ritual=est.rituais[i];
      if(ritual.dead){est.rituais.splice(i,1);continue;}
      if(t>=ritual.completa){ritual.dead=true;est.rituais.splice(i,1);est.bonusRitualAte=Math.max(est.bonusRitualAte,t+parametro('ritualist','duracaoBonusMs'));aviso(chefe.x,chefe.y-52,'RITUAL COMPLETO');}
    }
  }

  function atualizarSobrevivencia(chefe,t){
    if(!tem('regenerator'))return;
    const teto=chefe.maxHp*parametro('regenerator','tetoPorBatalha');
    if(est.curaGasta>=teto)return;
    if(!est.regenAte&&pronto('regenerator',parametro('regenerator','cooldownMs'))){est.regenAte=t+parametro('regenerator','canalizaMs');aviso(chefe.x,chefe.y-44,'REGENERANDO');}
    if(est.regenAte&&t>=est.regenAte){
      est.regenAte=0;
      const cura=Math.min(chefe.maxHp*parametro('regenerator','curaFracao'),teto-est.curaGasta);
      est.curaGasta+=cura;chefe.hp=Math.min(chefe.maxHp,chefe.hp+cura);partes(chefe.x,chefe.y,'#7ee08a',14,55);
    }
  }

  function atualizarAreas(chefe,dt,t,pls){
    for(let i=est.fogo.length-1;i>=0;i--){
      const area=est.fogo[i];if(t>=area.ate){est.fogo.splice(i,1);continue;}
      if(t>=area.tick){area.tick=t+parametro('volcanic','intervaloDanoMs');for(const pl of pls)if(distancia(pl,area)<parametro('volcanic','raio'))pl.takeDmg&&pl.takeDmg(parametro('volcanic','dano'),true);}
    }
    for(let i=est.gelo.length-1;i>=0;i--){
      const area=est.gelo[i];if(t>=area.ate){est.gelo.splice(i,1);continue;}
      const aplicarDano=t>=area.tick;if(aplicarDano)area.tick=t+parametro('glacial','intervaloDanoMs');
      for(const pl of pls)if(distancia(pl,area)<parametro('glacial','raio')){pl._ameacaLentidao=parametro('glacial','lentidao');if(aplicarDano&&pl.takeDmg)pl.takeDmg(parametro('glacial','dano'),true);}
    }
    for(let i=est.raios.length-1;i>=0;i--){
      const raio=est.raios[i];if(t<raio.cai)continue;
      for(const pl of pls)if(distancia(pl,raio)<parametro('stormbound','raio'))pl.takeDmg&&pl.takeDmg(parametro('stormbound','dano'));
      partes(raio.x,raio.y,'#fff59a',16,90);est.raios.splice(i,1);
    }
    if(tem('mine_layer')&&est.minas.length<CONFIG.MAX_MINAS&&pronto('mine_layer',parametro('mine_layer','cooldownMs'))){
      for(let i=0;i<parametro('mine_layer','quantidade')&&est.minas.length<CONFIG.MAX_MINAS;i++){
        const ang=Math.random()*Math.PI*2,p=dentroDaArena(chefe.x+Math.cos(ang)*(90+Math.random()*90),chefe.y+Math.sin(ang)*(70+Math.random()*70),20);
        est.minas.push({...p,armada:t+parametro('mine_layer','armarMs'),morre:t+parametro('mine_layer','vidaMs')});
      }
    }
    for(let i=est.minas.length-1;i>=0;i--){
      const mina=est.minas[i];let explodir=t>=mina.morre;
      if(t>=mina.armada&&!explodir)explodir=pls.some(pl=>distancia(pl,mina)<parametro('mine_layer','raioGatilho'));
      if(explodir){for(const pl of pls)if(distancia(pl,mina)<parametro('mine_layer','raioExplosao'))pl.takeDmg&&pl.takeDmg(parametro('mine_layer','dano'));partes(mina.x,mina.y,'#ffaa44',18,95);est.minas.splice(i,1);}
    }
    if(tem('corruptor')&&pronto('corruptor',parametro('corruptor','cooldownMs'))){
      const alvo=pls[0]||chefe,p=dentroDaArena(alvo.x+(Math.random()-.5)*120,alvo.y+(Math.random()-.5)*100,30);
      est.corrupcao.push({...p,ate:t+parametro('corruptor','duracaoMs'),tick:t+parametro('corruptor','intervaloDanoMs')});
    }
    for(let i=est.corrupcao.length-1;i>=0;i--){
      const area=est.corrupcao[i];if(t>=area.ate){est.corrupcao.splice(i,1);continue;}
      if(t>=area.tick){area.tick=t+parametro('corruptor','intervaloDanoMs');for(const pl of pls)if(distancia(pl,area)<parametro('corruptor','raio'))pl.takeDmg&&pl.takeDmg(parametro('corruptor','dano'),true);}
    }
    if(tem('gravity_well')&&pronto('gravity_well',parametro('gravity_well','cooldownMs'))){
      const alvo=pls[0]||chefe,p=dentroDaArena(alvo.x+(Math.random()-.5)*90,alvo.y+(Math.random()-.5)*80,40);
      est.abismos.push({...p,puxaEm:t+parametro('gravity_well','avisoMs'),ate:t+parametro('gravity_well','avisoMs')+parametro('gravity_well','duracaoMs')});
    }
    for(let i=est.abismos.length-1;i>=0;i--){
      const poco=est.abismos[i];if(t>=poco.ate){est.abismos.splice(i,1);continue;}
      if(t>=poco.puxaEm)for(const pl of pls){
        const d=distancia(pl,poco);if(d<=4||d>=parametro('gravity_well','raio'))continue;
        const ang=Math.atan2(poco.y-pl.y,poco.x-pl.x),forca=parametro('gravity_well','forca')*dt*(1-d/parametro('gravity_well','raio'));
        pl.x+=Math.cos(ang)*forca;pl.y+=Math.sin(ang)*forca;if(deps.clampEntity)deps.clampEntity(pl);
      }
    }
    for(let i=est.ecos.length-1;i>=0;i--){
      const eco=est.ecos[i];if(t<eco.quando)continue;
      for(const pl of pls)if(distancia(pl,eco)<parametro('echoing','raio'))pl.takeDmg&&pl.takeDmg(eco.dano);
      partes(eco.x,eco.y,'#c8b0ff',14,70);est.ecos.splice(i,1);
    }
  }

  function atualizarOrbitais(chefe,dt,t,pls){
    if(!tem('orbitals')||!est.orbitais.length)return;
    if(parametro('orbitals','ciclos')&&t>=est.orbTroca){est.orbVisivel=!est.orbVisivel;est.orbTroca=t+(est.orbVisivel?parametro('orbitals','visivelMs'):parametro('orbitals','ocultoMs'));}
    for(const orb of est.orbitais){
      orb.ang+=parametro('orbitals','velocidade')*dt*1000;orb.x=chefe.x+Math.cos(orb.ang)*parametro('orbitals','raio');orb.y=chefe.y+Math.sin(orb.ang)*parametro('orbitals','raio')*.72;
      if(est.orbVisivel)for(const pl of pls)if(distancia(pl,orb)<14+(pl.radius||16)*.5)pl.takeDmg&&pl.takeDmg(parametro('orbitals','dano'),true);
    }
  }
  function atualizarRunas(chefe,dt){
    for(const runa of est.runas){if(!runa.viva||runa.dead)continue;runa.ang+=parametro('runic_shield','velOrbita')*dt*1000;runa.x=chefe.x+Math.cos(runa.ang)*parametro('runic_shield','raioOrbita');runa.y=chefe.y+Math.sin(runa.ang)*parametro('runic_shield','raioOrbita')*.7;}
  }

  function update(dt){
    if(!ativo()||!est.chefe)return;
    relogioMs+=clamp(Number(dt)||0,0,.1)*1000;
    const chefe=est.chefe;if(chefe.dead){limpar('boss-death');return;}
    const t=agora(),pls=jogadores(),alvo=pls[0]||null;
    atualizarFuria(chefe,t);atualizarMobilidade(chefe,dt,t,alvo);recomporMultiplicadores(chefe,t);
    atualizarExercito(chefe,t);atualizarSobrevivencia(chefe,t);atualizarAreas(chefe,dt,t,pls);atualizarOrbitais(chefe,dt,t,pls);atualizarRunas(chefe,dt,t);
  }

  function alvosAtivos(){return [...est.runas.filter(r=>r.viva&&!r.dead),...est.rituais.filter(r=>!r.dead)];}
  function acertarObjetos(x,y,raio,dano){
    if(!ativo())return false;
    const alvo=alvosAtivos().find(item=>Math.hypot(x-item.x,y-item.y)<raio+item.radius);
    if(!alvo)return false;alvo.takeDmg(dano);return true;
  }

  function glifo(ctx,id,x,y,px=1){
    const grade=D.GLIFOS[id],cores=D.CORES_GLIFO[id];if(!grade||!cores)return false;
    for(let l=0;l<9;l++)for(let c=0;c<9;c++){const ch=grade[l][c];if(ch==='.')continue;ctx.fillStyle=ch==='b'?cores[1]:cores[0];ctx.fillRect(Math.round(x+c*px),Math.round(y+l*px),px,px);}
    return true;
  }
  function desenharArea(ctx,item,raio,cor1,cor2,t,duracao){
    const vida=clamp((item.ate-t)/duracao,0,1);ctx.globalAlpha=.32*vida;ctx.fillStyle=cor1;ctx.beginPath();ctx.ellipse(item.x,item.y,raio,raio*.5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.7*vida;ctx.strokeStyle=cor2;ctx.lineWidth=1.5;ctx.stroke();
  }
  function desenharRevelacao(ctx){
    if(!revelando())return;
    const restante=est.revelacaoAte-agora(),alfa=clamp(restante/600,0,1)*clamp((CONFIG.REVELACAO_MS-restante)/400,0,1);
    const centro=(deps.getW?deps.getW():640)/2,largura=306,altura=36+est.mods.length*28,x=centro-largura/2,y=92;
    ctx.save();ctx.globalAlpha=.9*alfa;ctx.fillStyle='#0b0810';ctx.fillRect(x,y,largura,altura);ctx.globalAlpha=alfa;ctx.strokeStyle='#c8702a';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,largura-2,altura-2);ctx.textAlign='center';ctx.font='bold 11px monospace';ctx.fillStyle='#ff9a4a';ctx.fillText('NIVEL DE AMEACA '+nivelAtual(),centro,y+18);ctx.textAlign='left';
    est.mods.forEach((mod,i)=>{const linha=y+32+i*28;glifo(ctx,mod.id,x+10,linha,2);ctx.font='bold 10px monospace';ctx.fillStyle='#efe0c0';ctx.fillText(mod.nome,x+34,linha+8);ctx.font='9px monospace';ctx.fillStyle='#9a8a72';ctx.fillText(mod.descricao,x+34,linha+19);});ctx.restore();
  }
  function desenharIcones(ctx,chefe){
    if(!est.mods.length||revelando())return;
    const y=(Number.isFinite(chefe._hudAncoraY)?chefe._hudAncoraY:chefe.y-50)-38,passo=13,largura=est.mods.length*passo;let x=Math.round(chefe.x-largura/2);
    ctx.save();ctx.globalAlpha=.62;ctx.fillStyle='#0b0810';ctx.fillRect(x-3,y-3,largura+6,15);ctx.globalAlpha=1;for(const mod of est.mods){glifo(ctx,mod.id,x+2,y,1);x+=passo;}ctx.restore();
  }
  function draw(ctx){
    if(!ativo()||!est.chefe||!ctx)return;
    const t=agora(),chefe=est.chefe;ctx.save();ctx.imageSmoothingEnabled=false;
    for(const area of est.fogo)desenharArea(ctx,area,parametro('volcanic','raio'),'#7a1c05','#ffb040',t,parametro('volcanic','duracaoMs'));
    for(const area of est.gelo)desenharArea(ctx,area,parametro('glacial','raio'),'#4a9ec8','#dff4ff',t,parametro('glacial','duracaoMs'));
    for(const area of est.corrupcao)desenharArea(ctx,area,parametro('corruptor','raio'),'#180530','#8a3ad0',t,parametro('corruptor','duracaoMs'));
    for(const poco of est.abismos){const armado=t>=poco.puxaEm,progresso=armado?1:clamp(1-(poco.puxaEm-t)/parametro('gravity_well','avisoMs'),0,1),R=parametro('gravity_well','raio')*progresso;ctx.globalAlpha=.35;ctx.fillStyle='#150826';ctx.beginPath();ctx.ellipse(poco.x,poco.y,R,R*.5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.75;ctx.strokeStyle='#7a4ab8';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(poco.x,poco.y,R*(.35+i*.22),t*.003+i, t*.003+i+4);ctx.stroke();}}
    for(const raio of est.raios){const falta=clamp((raio.cai-t)/parametro('stormbound','avisoMs'),0,1),R=parametro('stormbound','raio');ctx.globalAlpha=.35;ctx.fillStyle='#4a4210';ctx.beginPath();ctx.ellipse(raio.x,raio.y,R,R*.5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.95;ctx.strokeStyle='#fff59a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(raio.x,raio.y,R*(.25+falta*.75),R*(.25+falta*.75)*.5,0,0,Math.PI*2);ctx.stroke();}
    for(const mina of est.minas){const armada=t>=mina.armada;ctx.globalAlpha=.9;ctx.fillStyle='#3a2a18';ctx.beginPath();ctx.arc(mina.x,mina.y,7,0,Math.PI*2);ctx.fill();ctx.fillStyle=armada?'#ff5522':'#886644';ctx.fillRect(mina.x-2,mina.y-2,4,4);}
    for(const onda of est.ondas){const progresso=clamp(1-(onda.dispara-t)/parametro('repulsor','avisoMs'),0,1),R=parametro('repulsor','raio')*progresso;ctx.globalAlpha=.55;ctx.strokeStyle='#bfe6ff';ctx.lineWidth=2+progresso*2;ctx.beginPath();ctx.ellipse(onda.x,onda.y,R,R*.5,0,0,Math.PI*2);ctx.stroke();}
    for(const eco of est.ecos){const falta=clamp((eco.quando-t)/parametro('echoing','atrasoMs'),0,1),R=parametro('echoing','raio');ctx.globalAlpha=.35;ctx.strokeStyle='#c8b0ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(eco.x,eco.y,R*(.5+falta*.6),R*(.5+falta*.6)*.5,0,0,Math.PI*2);ctx.stroke();}
    if(est.investida&&!est.investida.fimAte){const inv=est.investida,progresso=clamp(1-(inv.avisoAte-t)/parametro('charger','avisoMs'),0,1);ctx.save();ctx.translate(chefe.x,chefe.y);ctx.rotate(inv.ang);ctx.globalAlpha=.16+.16*progresso;ctx.fillStyle='#ff9a50';ctx.fillRect(0,-16,280,32);ctx.globalAlpha=.8;ctx.fillStyle='#ffd0a0';ctx.fillRect(0,-1,280*progresso,2);ctx.restore();}
    for(const pendente of est.invocacoesPendentes){const progresso=clamp(1-(pendente.quando-t)/parametro('summoner','avisoMs'),0,1);ctx.globalAlpha=.35+.35*progresso;ctx.strokeStyle='#8ad6a0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(pendente.x,pendente.y,20*(1-progresso*.45),10*(1-progresso*.45),0,0,Math.PI*2);ctx.stroke();glifo(ctx,'summoner',pendente.x-4,pendente.y-5,1);}
    for(const ritual of est.rituais){const progresso=clamp(1-(ritual.completa-t)/parametro('ritualist','canalizaMs'),0,1);ctx.globalAlpha=.7;ctx.fillStyle='#7a5a10';ctx.fillRect(ritual.x-3,ritual.y-6,6,18);ctx.fillStyle='#ffd76a';ctx.fillRect(ritual.x-12,ritual.y+16,Math.round(24*progresso),3);ctx.fillStyle='#fff3c0';ctx.fillRect(ritual.x-2,ritual.y-12,4,6);}
    for(const runa of est.runas){if(!runa.viva||runa.dead)continue;ctx.globalAlpha=.25;ctx.fillStyle='#9fd8ff';ctx.beginPath();ctx.arc(runa.x,runa.y,11,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.save();ctx.translate(runa.x,runa.y);ctx.rotate(t*.0018);ctx.fillStyle='#dff2ff';ctx.fillRect(-1,-6,2,12);ctx.fillRect(-6,-1,12,2);ctx.restore();}
    if(est.orbVisivel)for(const orb of est.orbitais){ctx.globalAlpha=.9;ctx.fillStyle='#8a6410';ctx.beginPath();ctx.arc(orb.x,orb.y,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffd06a';ctx.beginPath();ctx.arc(orb.x,orb.y,4.5,0,Math.PI*2);ctx.fill();}
    if(est.furiaAte>t){ctx.globalAlpha=.5;ctx.strokeStyle='#ff5533';ctx.lineWidth=3;ctx.beginPath();ctx.arc(chefe.x,chefe.y,(chefe.radius||30)+12+Math.sin(t*.01)*3,0,Math.PI*2);ctx.stroke();}
    if(est.bonusRitualAte>t){ctx.globalAlpha=.45;ctx.strokeStyle='#ffd76a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(chefe.x,chefe.y,(chefe.radius||30)+18,0,Math.PI*2);ctx.stroke();}
    if(est.sumico){const p=clamp((est.sumico-t)/parametro('teleporter','sumicoMs'),0,1);ctx.globalAlpha=.7*p;ctx.strokeStyle='#c9a4ff';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(chefe.x,chefe.y,(chefe.radius||30)*p*(.5+i*.35),t*.01+i*2,t*.01+i*2+2.2);ctx.stroke();}}
    ctx.restore();desenharRevelacao(ctx);desenharIcones(ctx,chefe);
  }

  function cobrarRecompensa(){if(!ativo()||est.recompensaPaga)return 1;est.recompensaPaga=true;return multiplicadorRecompensa();}
  function pagarBonus(xpTotal,x,y){
    if(!ativo()||est.recompensaPaga)return 0;est.recompensaPaga=true;
    const extra=multiplicadorRecompensa()-1;if(extra<=0)return 0;
    const moedas=deps.creditarBonus?deps.creditarBonus((xpTotal||0)*extra):0;
    if(moedas>0&&deps.spawnNotice)deps.spawnNotice(x,(y||0)-60,'AMEACA '+nivelAtual()+' · +'+moedas+' MOEDAS',0);
    return moedas;
  }
  function iconesAtivos(){return est.mods.map(m=>m.icone).join(' ');}
  function modsAtivos(){return est.mods.slice();}

  global.BossModifierSystem=Object.freeze({
    configurar,iniciarRun,ajustarNivel,limitePara,dificuldadePermite,nivelAtual,ativo,
    multiplicadorRecompensa,cobrarRecompensa,pagarBonus,sortear,catalogoDoChefe,
    aoNascerChefe,forcarModificadores,golpeForte,acertouJogador,causarDano,
    multiplicadorDano,levouDano,acertarObjetos,alvosAtivos,chefeOculto,
    update,draw,limpar,iconesAtivos,modsAtivos,revelando,_estado:()=>est,_agora:()=>agora(),
  });
})(typeof window!=='undefined'?window:globalThis);
