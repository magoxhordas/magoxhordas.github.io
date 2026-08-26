// Integrated Camp meta progression: ingredients, fish recipes, boss artifacts
// and equipped Echoes. The module keeps the existing global inventories and
// Merlin/Cooking contracts; dependencies are injected by index.html.
(function(global){
  'use strict';

  const SAVE_KEY='mvh_camp_progression_v1';
  const COMMON_RECIPE_INGREDIENTS=new Set(['trigo','tomate','erva']);
  const ELITE_ENEMY_TYPES=new Set(['shield_orc','corrupt_ent','crystal_golem','demon_knight','troll','ice_golem']);

  const ARTIFACT_DEFS=Object.freeze({
    coroa_quebrada:{id:'coroa_quebrada',name:'Coroa Quebrada',origin:'Rei Cadáver',wave:5,pixelKind:'crown',color:'#d7c36a'},
    olho_aracne:{id:'olho_aracne',name:'Olho de Aracne',origin:'Aracne Ancestral',wave:10,pixelKind:'eye',color:'#c05cff'},
    coracao_congelado:{id:'coracao_congelado',name:'Coração Congelado',origin:'Gigante de Gelo',wave:15,pixelKind:'ice',color:'#7de8ff'},
    presa_fossil:{id:'presa_fossil',name:'Presa Fóssil',origin:'Verme Devorador',wave:20,pixelKind:'fang',color:'#e8d39a'},
    nucleo_infernal:{id:'nucleo_infernal',name:'Núcleo Infernal',origin:'Balrog',wave:25,pixelKind:'fire',color:'#ff5b2d'},
  });

  const FISH_NAMES=Object.freeze({
    truta:'Truta Arco-Íris',carpa:'Carpa Dourada',perca:'Perca Listrada',enguia:'Enguia Elétrica',
    bagre:'Bagre-Sombra',lampreia:'Lampreia Antiga',lanterna:'Peixe-Lanterna',fantasma:'Peixe-Fantasma',
    dragao:'Peixe-Dragão',celestial:'Peixe Celestial',
  });

  const FISH_RECIPES=Object.freeze([
    {id:'truta_ervas',pixelIcon:'fish',name:'Truta com Ervas',rarity:'comum',duration:'1 expedição',
      desc:'Restaura 40 HP na largada e regenera 5% da vida por onda.',
      cost:{truta:1,erva:2,tomate:1},effect:{hp_restore:40,regen_per_wave:.05}},
    {id:'carpa_assada',pixelIcon:'fish',name:'Carpa Dourada Assada',rarity:'comum',duration:'1 expedição',
      desc:'+10% de velocidade e +20 HP ao iniciar.',
      cost:{carpa:1,trigo:2,tomate:1},effect:{speed_mult:1.10,hp_restore:20}},
    {id:'caldeirada_perca',pixelIcon:'fish',name:'Caldeirada de Perca',rarity:'comum',duration:'1 expedição',
      desc:'+10% de XP durante toda a expedição.',
      cost:{perca:1,tomate:2,trigo:1},effect:{xp_mult:1.10}},
    {id:'enguia_eletrificada',pixelIcon:'electric',name:'Enguia Eletrificada',rarity:'rara',duration:'1 expedição',
      desc:'+15% de dano e +5% de velocidade.',
      cost:{enguia:1,erva:2,trigo:1},effect:{dmg_mult:1.15,speed_mult:1.05}},
    {id:'ensopado_bagre',pixelIcon:'shadow',name:'Ensopado de Bagre-Sombra',rarity:'rara',duration:'1 expedição',
      desc:'+12% de dano e 6% de redução de dano recebido.',
      cost:{bagre:1,erva:2,cogumelo_lua:1},effect:{dmg_mult:1.12,damage_reduction:.06}},
    {id:'caldo_lampreia',pixelIcon:'bowl',name:'Caldo de Lampreia Antiga',rarity:'rara',duration:'1 expedição',
      desc:'Recupera 2 HP por abate, no máximo uma vez a cada 1,5s.',
      cost:{lampreia:1,tomate:2,erva:1},effect:{kill_heal_flat:2,kill_heal_cd:1500}},
    {id:'lanterna_lunar',pixelIcon:'moon',name:'Peixe-Lanterna ao Molho Lunar',rarity:'rara',duration:'1 expedição',
      desc:'+15% de dano, +10% de velocidade e 4% de regeneração por onda.',
      cost:{lanterna:1,cogumelo_lua:1,erva:2},effect:{dmg_mult:1.15,speed_mult:1.10,regen_per_wave:.04}},
    {id:'fantasma_defumado',pixelIcon:'shadow',name:'Peixe-Fantasma Defumado',rarity:'rara',duration:'1 expedição',
      desc:'+18% de velocidade e 8% de redução de dano recebido.',
      cost:{fantasma:1,cogumelo_lua:1,trigo:2},effect:{speed_mult:1.18,damage_reduction:.08}},
    {id:'banquete_dragao',pixelIcon:'fire',name:'Banquete do Peixe-Dragão',rarity:'mistica',duration:'1 expedição',requires:'gastro_profundezas',
      desc:'+25% de dano e +30 de vida máxima nesta expedição.',
      cost:{dragao:1,raiz_sangue:1,tomate:2,erva:2},effect:{dmg_mult:1.25,max_hp_flat:30}},
    {id:'banquete_celestial',pixelIcon:'spark',name:'Banquete Celestial',rarity:'mistica',duration:'1 expedição',requires:'gastro_profundezas',
      desc:'+20% dano, +15% velocidade, +10% vida máxima e 8% de regeneração por onda.',
      cost:{celestial:1,cogumelo_lua:1,raiz_sangue:1,tomate:2,erva:2},
      effect:{dmg_mult:1.20,speed_mult:1.15,max_hp_mult:1.10,regen_per_wave:.08}},
  ]);

  const EXCELLENT_BONUSES=Object.freeze({
    ensopado_trigo:{regen_per_wave:.06},
    sopa_tomate:{regen_per_wave:.05},
    pocao_erva:{damage_reduction:.05},
    cha_cogumelo:{dmg_mult_bonus:.08},
    extrato_raiz:{kill_heal_flat:1},
    banquete_mago:{max_hp_flat:10},
    truta_ervas:{regen_per_wave:.03},
    carpa_assada:{damage_reduction:.03},
    caldeirada_perca:{xp_mult_bonus:.05},
    enguia_eletrificada:{speed_mult_bonus:.05},
    ensopado_bagre:{elite_kill_heal_ratio:.02,elite_kill_heal_cd:8000},
    caldo_lampreia:{kill_heal_flat:1,kill_heal_cd_override:1200},
    lanterna_lunar:{dmg_mult_bonus:.05},
    fantasma_defumado:{damage_reduction:.05},
    banquete_dragao:{max_hp_flat:10},
    banquete_celestial:{regen_per_wave:.05},
  });

  const GASTRONOMY_UPGRADES=Object.freeze([
    {id:'gastro_maestria',tree:'gastronomia',pixelKind:'bowl',name:'Maestria Culinária',
      desc:'Aumenta em 5% por nível a eficácia dos bônus positivos das comidas.',maxLevel:3,
      cost:lv=>[
        {trigo:6,tomate:5,erva:3},
        {trigo:9,tomate:7,erva:5,truta:1},
        {trigo:12,tomate:10,erva:8,perca:1,cogumelo_lua:1},
      ][lv]},
    {id:'gastro_precisao',tree:'gastronomia',pixelKind:'target',name:'Precisão do Arquimago',
      desc:'Amplia a faixa Excelente do preparo: 8% → 9,5% → 11% → 12,5%.',maxLevel:3,
      cost:lv=>[
        {madeira:6,pedra:5,truta:1},
        {madeira:9,pedra:8,carpa:1,erva:5},
        {madeira:12,pedra:10,enguia:1,cogumelo_lua:1},
      ][lv]},
    {id:'gastro_mesa',tree:'gastronomia',pixelKind:'feast',name:'Mesa do Arquimago',
      desc:'Desbloqueia o quarto espaço de comida preparada.',maxLevel:1,
      cost:()=>({madeira:18,pedra:16,cogumelo_lua:3,raiz_sangue:2,dragao:1})},
    {id:'gastro_mares',tree:'gastronomia',pixelKind:'fishing',name:'Sabedoria das Marés',
      desc:'Melhora moderadamente a chance de peixes incomuns, raros e épicos sem banalizar o Celestial.',maxLevel:3,
      cost:lv=>[
        {truta:2,carpa:1,madeira:5},
        {perca:2,lampreia:1,erva:5,pedra:6},
        {enguia:1,bagre:1,lanterna:1,cogumelo_lua:1,pedra:8},
      ][lv]},
    {id:'gastro_profundezas',tree:'gastronomia',pixelKind:'abyss',name:'Receitas das Profundezas',
      desc:'Desbloqueia os banquetes do Peixe-Dragão e do Peixe Celestial.',maxLevel:1,
      cost:()=>({lanterna:1,fantasma:1,raiz_sangue:2,cogumelo_lua:2,pedra:10})},
    {id:'gastro_conservacao',tree:'gastronomia',pixelKind:'chest',name:'Conservação Arcana',
      desc:'Economiza até 1 ingrediente comum por nível em cada receita, nunca abaixo de 1.',maxLevel:2,
      cost:lv=>[
        {trigo:8,tomate:8,erva:5,madeira:5},
        {trigo:12,tomate:12,erva:8,cogumelo_lua:1,carpa:1},
      ][lv]},
  ]);

  function echo(id,artifact,name,desc,cost){
    return Object.freeze({id,artifact,name,origin:ARTIFACT_DEFS[artifact].origin,desc,cost:Object.freeze(cost)});
  }
  const ECHO_DEFS=Object.freeze([
    echo('rei_carrasco','coroa_quebrada','Carrasco','Inimigos abaixo de 25% de HP recebem +10% de dano.',{coroa_quebrada:1,trigo:4,pedra:3}),
    echo('rei_devorador','coroa_quebrada','Devorador de Almas','Matar um Elite cura 4% da vida máxima; recarga de 8s.',{coroa_quebrada:2,tomate:6,erva:4}),
    echo('rei_ossos','coroa_quebrada','Ossos do Rei','+8% de vida máxima durante a expedição.',{coroa_quebrada:3,cogumelo_lua:2,pedra:8}),
    echo('aracne_instinto','olho_aracne','Instinto da Caçadora','Após 5s sem sofrer dano, causa +10% de dano.',{olho_aracne:1,erva:5,madeira:4}),
    echo('aracne_passos','olho_aracne','Passos na Teia','+8% de velocidade de movimento.',{olho_aracne:2,trigo:6,madeira:6}),
    echo('aracne_carapaca','olho_aracne','Carapaça de Seda','Reduz em 6% o dano recebido, respeitando o limite global.',{olho_aracne:3,cogumelo_lua:2,madeira:8}),
    echo('gelo_ultimo','coracao_congelado','Último Fôlego','Abaixo de 30% de HP, recebe 15% de redução de dano.',{coracao_congelado:1,tomate:6,pedra:4}),
    echo('gelo_coracao','coracao_congelado','Coração do Inverno','Ao iniciar cada luta de chefe, recupera 8% da vida máxima.',{coracao_congelado:2,carpa:1,erva:6,pedra:6}),
    echo('gelo_constituicao','coracao_congelado','Constituição Glacial','+10% de vida máxima durante a expedição.',{coracao_congelado:3,cogumelo_lua:2,pedra:10}),
    echo('verme_predador','presa_fossil','Predador Ancestral','+12% de dano contra Elites.',{presa_fossil:1,erva:5,pedra:4}),
    echo('verme_titas','presa_fossil','Caçador de Titãs','+8% de dano contra Chefes.',{presa_fossil:2,perca:1,madeira:7,pedra:7}),
    echo('verme_fome','presa_fossil','Fome do Deserto','Matar um Elite concede +10% de velocidade por 8s.',{presa_fossil:3,raiz_sangue:1,trigo:8}),
    echo('balrog_furia','nucleo_infernal','Fúria das Profundezas','Abaixo de 25% de HP: +15% dano e +10% velocidade por 6s; recarga de 35s.',{nucleo_infernal:1,raiz_sangue:1,pedra:8}),
    echo('balrog_sangue','nucleo_infernal','Sangue Infernal','Na primeira queda abaixo de 35% de HP por onda, recupera 6% da vida máxima.',{nucleo_infernal:2,raiz_sangue:2,cogumelo_lua:2}),
    echo('balrog_chama','nucleo_infernal','Chama Eterna','Uma vez por expedição, impede dano fatal: permanece com 1 HP e 2s de proteção.',{nucleo_infernal:3,raiz_sangue:3,cogumelo_lua:3,pedra:15}),
  ]);

  function defaultState(){
    return {
      version:1,
      artifacts:Object.fromEntries(Object.keys(ARTIFACT_DEFS).map(id=>[id,0])),
      echoesUnlocked:{},equippedEchoes:[],preparedMeals:[],seenArtifacts:{},
    };
  }

  function nonNegativeInt(value){ return Math.max(0,Math.floor(Number(value)||0)); }
  function migrateState(raw){
    const base=defaultState();
    if(!raw||typeof raw!=='object'||Array.isArray(raw)) return base;
    for(const id of Object.keys(base.artifacts)) base.artifacts[id]=nonNegativeInt(raw.artifacts?.[id]);
    for(const def of ECHO_DEFS) if(raw.echoesUnlocked?.[def.id]) base.echoesUnlocked[def.id]=true;
    const valid=new Set(ECHO_DEFS.map(item=>item.id));
    base.equippedEchoes=Array.from(new Set(Array.isArray(raw.equippedEchoes)?raw.equippedEchoes:[]))
      .filter(id=>valid.has(id)&&base.echoesUnlocked[id]).slice(0,3);
    base.preparedMeals=Array.isArray(raw.preparedMeals)?raw.preparedMeals.filter(meal=>meal&&typeof meal.id==='string').slice(0,4):[];
    for(const id of Object.keys(base.artifacts)) if(raw.seenArtifacts?.[id]) base.seenArtifacts[id]=true;
    return base;
  }

  function scaleBonusValue(key,value,mult){
    if(typeof value!=='number') return value;
    if(key==='kill_heal_cd'||key==='elite_kill_heal_cd'||key==='kill_heal_cd_override') return value;
    if(/_mult$/.test(key)) return Math.round((1+(value-1)*mult)*10000)/10000;
    return value>=1?Math.round(value*mult):Math.round(value*mult*10000)/10000;
  }

  function mergeExcellent(effect,extra){
    const result={...effect};
    for(const [key,value] of Object.entries(extra||{})){
      if(key.endsWith('_mult_bonus')){
        const real=key.replace('_bonus','');
        result[real]=Math.round(((result[real]||1)+value)*10000)/10000;
      }else if(key==='kill_heal_cd_override') result.kill_heal_cd=value;
      else result[key]=Math.round(((result[key]||0)+value)*10000)/10000;
    }
    return result;
  }

  function create(deps){
    const d=deps||{};
    const saveSystem=d.saveSystem;
    if(!saveSystem) throw new TypeError('CampProgressionCore.create requer SaveSystem.');
    const getGlobal=d.getGlobalInventory||(()=>({}));
    const getFish=d.getFishInventory||(()=>({}));
    const getMeta=d.getMetaUpgrades||(()=>({}));
    const saveGlobal=d.saveGlobal||(()=>{});
    const saveFish=d.saveFish||(()=>{});
    const notify=d.notify||(()=>{});
    const announce=d.announce||(()=>{});
    const getIsBossRush=d.getIsBossRush||(()=>false);
    const getWave=d.getWave||(()=>0);
    const isBoss=d.isBoss||(()=>false);
    const isElite=d.isElite||((target)=>!isBoss(target)&&(target?.isElite===true||ELITE_ENEMY_TYPES.has(target?.type)));
    let state=migrateState(saveSystem.readJSON(SAVE_KEY,null));

    function save(){ state.version=1; saveSystem.writeJSON(SAVE_KEY,state); }
    function exportState(){ return JSON.parse(JSON.stringify(state)); }

    function ingredientSource(id){
      if(Object.hasOwn(ARTIFACT_DEFS,id)) return 'artifact';
      if(Object.hasOwn(FISH_NAMES,id)) return 'fish';
      return 'global';
    }
    function quantity(id){
      const src=ingredientSource(id);
      return nonNegativeInt(src==='artifact'?state.artifacts[id]:src==='fish'?getFish()[id]:getGlobal()[id]);
    }
    function ingredientName(id){
      return ARTIFACT_DEFS[id]?.name||FISH_NAMES[id]||d.itemName?.(id)||id;
    }
    function ingredientPixelKind(id){
      return ARTIFACT_DEFS[id]?.pixelKind||(Object.hasOwn(FISH_NAMES,id)?'fish':d.itemPixelKind?.(id)||'spark');
    }
    function canAfford(cost){ return Object.entries(cost||{}).every(([id,amount])=>quantity(id)>=nonNegativeInt(amount)); }
    function consume(cost){
      if(!canAfford(cost)) return false;
      let touchedGlobal=false,touchedFish=false,touchedArtifact=false;
      for(const [id,raw] of Object.entries(cost||{})){
        const amount=nonNegativeInt(raw),src=ingredientSource(id);
        if(src==='artifact'){state.artifacts[id]=Math.max(0,quantity(id)-amount);touchedArtifact=true;}
        else if(src==='fish'){const inv=getFish();inv[id]=Math.max(0,quantity(id)-amount);touchedFish=true;}
        else{const inv=getGlobal();inv[id]=Math.max(0,quantity(id)-amount);touchedGlobal=true;}
      }
      if(touchedGlobal) saveGlobal(true);
      if(touchedFish) saveFish();
      if(touchedArtifact) save();
      return true;
    }

    function recipeCost(recipe){
      const cost={...(recipe?.cost||{})};
      let savings=Math.min(2,nonNegativeInt(getMeta().gastro_conservacao));
      const common=Object.keys(cost).filter(id=>COMMON_RECIPE_INGREDIENTS.has(id)&&cost[id]>1)
        .sort((a,b)=>cost[b]-cost[a]||a.localeCompare(b));
      while(savings>0&&common.length){
        let changed=false;
        for(const id of common){
          if(savings<=0) break;
          if(cost[id]>1){cost[id]--;savings--;changed=true;}
        }
        if(!changed) break;
      }
      return cost;
    }
    function recipeUnlocked(recipe){ return !recipe?.requires||Boolean(getMeta()[recipe.requires]); }
    function mealLimit(){ return getMeta().gastro_mesa?4:3; }
    function excellentThreshold(){ return Math.round((.08+.015*Math.min(3,nonNegativeInt(getMeta().gastro_precisao)))*1000)/1000; }
    function qualityBands(){ return [
      {q:'EXCELENTE',ate:excellentThreshold(),mult:1.60,cor:'#ffd23a',bonus:true},
      {q:'BOM',ate:.30,mult:1.25,cor:'#7de89a',bonus:false},
      {q:'COMUM',ate:1,mult:1,cor:'#9ab0a2',bonus:false},
    ]; }
    function buildMealEffect(recipe,quality){
      const band=typeof quality==='string'?qualityBands().find(item=>item.q===quality):quality;
      const selected=band||qualityBands()[2];
      let result={};
      for(const [key,value] of Object.entries(recipe?.effect||{})) result[key]=scaleBonusValue(key,value,selected.mult);
      if(selected.bonus) result=mergeExcellent(result,EXCELLENT_BONUSES[recipe.id]);
      const mastery=1+.05*Math.min(3,nonNegativeInt(getMeta().gastro_maestria));
      if(mastery>1){
        const mastered={};
        for(const [key,value] of Object.entries(result)) mastered[key]=scaleBonusValue(key,value,mastery);
        result=mastered;
      }
      return result;
    }
    function setPreparedMeals(meals){ state.preparedMeals=JSON.parse(JSON.stringify(meals||[])).slice(0,mealLimit());save(); }
    function preparedMeals(){ return JSON.parse(JSON.stringify(state.preparedMeals)); }

    function fishWeight(rarity,base){
      const lv=Math.min(3,nonNegativeInt(getMeta().gastro_mares));
      const factors={comum:1-.08*lv,incomum:1+.10*lv,raro:1+.12*lv,épico:1+.08*lv,lendário:1};
      return Math.max(.01,(Number(base)||1)*(factors[rarity]||1));
    }
    function recordFishCatch(id,rawQuantity=1){
      if(!Object.hasOwn(FISH_NAMES,id))return false;
      const amount=Math.max(1,Math.min(2,nonNegativeInt(rawQuantity)||1));
      const inventory=getFish();inventory[id]=quantity(id)+amount;saveFish();return inventory[id];
    }
    function applyMealsToPlayer(player,meals,heal){
      if(!player)return player;
      const list=Array.isArray(meals)?meals:[],restore=heal||((pl,amount)=>{pl.hp=Math.min(pl.maxHp,pl.hp+amount);});
      const baseDamage=player.dmg,baseSpeed=player.speed;
      for(const meal of list){
        const effect=meal?.effect||{};
        if(effect.hp_restore)restore(player,effect.hp_restore);
        if(effect.dmg_mult)player.dmg*=effect.dmg_mult;
        if(effect.speed_mult)player.speed*=effect.speed_mult;
        if(effect.dodge_bonus)player._campFoodDodge=Math.min(.35,(player._campFoodDodge||0)+effect.dodge_bonus);
        if(effect.damage_reduction)player._campFoodDamageReduction=(player._campFoodDamageReduction||0)+effect.damage_reduction;
        if(effect.xp_mult)player.xpGainMult=(player.xpGainMult||1)*effect.xp_mult;
        if(effect.max_hp_flat){player.maxHp+=effect.max_hp_flat;player.hp+=effect.max_hp_flat;}
        if(effect.max_hp_mult){const extra=Math.round(player.maxHp*(effect.max_hp_mult-1));player.maxHp+=extra;player.hp+=extra;}
      }
      player.dmg=Math.min(player.dmg,baseDamage*1.75);
      player.speed=Math.min(player.speed,baseSpeed*1.50);
      player._campFoodSpeedMultiplier=player.speed/baseSpeed;
      return player;
    }
    function applyMealWaveRegen(player,meals,heal){
      if(!player)return 0;
      const ratio=Math.min(.25,(Array.isArray(meals)?meals:[]).reduce((sum,meal)=>sum+(meal?.effect?.regen_per_wave||0),0));
      if(ratio)(heal||((pl,amount)=>{pl.hp=Math.min(pl.maxHp,pl.hp+amount);}))(player,player.maxHp*ratio);
      return ratio;
    }
    function applyMealKillEffects(player,target,meals,heal,at){
      if(!player)return 0;
      const restore=heal||((pl,amount)=>{pl.hp=Math.min(pl.maxHp,pl.hp+amount);}),now=Number(at)||performance.now();
      player._campMealTimers=player._campMealTimers||{};let healed=0;
      for(const meal of Array.isArray(meals)?meals:[]){
        const effect=meal?.effect||{},id=meal.id||'meal';
        if(effect.lifesteal&&now>=(player._campMealTimers[id+'-legacy']||0)){
          player._campMealTimers[id+'-legacy']=now+500;restore(player,effect.lifesteal);healed+=effect.lifesteal;
        }
        if(effect.kill_heal_flat&&now>=(player._campMealTimers[id]||0)){
          player._campMealTimers[id]=now+(effect.kill_heal_cd||1500);restore(player,effect.kill_heal_flat);healed+=effect.kill_heal_flat;
        }
        if(effect.elite_kill_heal_ratio&&isElite(target)&&now>=(player._campMealTimers[id+'-elite']||0)){
          player._campMealTimers[id+'-elite']=now+(effect.elite_kill_heal_cd||8000);
          const amount=player.maxHp*effect.elite_kill_heal_ratio;restore(player,amount);healed+=amount;
        }
      }
      return healed;
    }

    function awardCampaignArtifact(id,boss){
      const def=ARTIFACT_DEFS[id];
      if(!def||!boss||boss._campArtifactGranted||getIsBossRush()||getWave()!==def.wave) return false;
      boss._campArtifactGranted=true;
      state.artifacts[id]=quantity(id)+1;
      save();
      notify(`ARTEFATO OBTIDO · ${def.name}`);
      announce(boss.x,boss.y-62,`ARTEFATO OBTIDO · ${def.name}`);
      return true;
    }
    function hasNewDiscoveries(){
      return Object.keys(ARTIFACT_DEFS).some(id=>quantity(id)>0&&!state.seenArtifacts[id]);
    }
    function markDiscoveriesSeen(){
      for(const id of Object.keys(ARTIFACT_DEFS)) if(quantity(id)>0) state.seenArtifacts[id]=true;
      save();
    }

    function unlockEcho(id){
      const def=ECHO_DEFS.find(item=>item.id===id);
      if(!def||state.echoesUnlocked[id]||!canAfford(def.cost)) return false;
      if(!consume(def.cost)) return false;
      state.echoesUnlocked[id]=true;save();notify(`ECO DESPERTADO · ${def.name}`);return true;
    }
    function toggleEcho(id){
      if(!state.echoesUnlocked[id]) return {ok:false,reason:'locked'};
      const index=state.equippedEchoes.indexOf(id);
      if(index>=0){state.equippedEchoes.splice(index,1);save();return {ok:true,equipped:false};}
      if(state.equippedEchoes.length>=3) return {ok:false,reason:'limit'};
      state.equippedEchoes.push(id);save();return {ok:true,equipped:true};
    }
    function isEchoEquipped(player,id){ return Boolean(player?._campEchoes?.has(id)); }
    function beginRun(players){
      for(const player of players.filter(Boolean)){
        player._campEchoes=new Set(state.equippedEchoes.filter(id=>state.echoesUnlocked[id]));
        player._campEchoState={lastDamageAt:performance.now(),eliteHealReadyAt:0,hungerUntil:0,
          furyUntil:0,furyReadyAt:0,bloodWaveUsed:null,eternalFlameReady:true,bossHealed:new WeakSet()};
        let hpMult=1;
        if(isEchoEquipped(player,'rei_ossos')) hpMult*=1.08;
        if(isEchoEquipped(player,'gelo_constituicao')) hpMult*=1.10;
        if(hpMult!==1){player.maxHp=Math.round(player.maxHp*hpMult);player.hp=player.maxHp;}
      }
    }
    function endRun(players){
      for(const player of players.filter(Boolean)){delete player._campEchoes;delete player._campEchoState;}
    }
    function updatePlayer(player,now){
      const s=player?._campEchoState;if(!s)return;
      const time=Number(now)||performance.now();
      if(s.furyUntil&&time>=s.furyUntil)s.furyUntil=0;
      if(s.hungerUntil&&time>=s.hungerUntil)s.hungerUntil=0;
    }
    function onPlayerDamaged(player){
      const s=player?._campEchoState;if(!s)return;
      const now=performance.now();s.lastDamageAt=now;
      if(player.hp<=0)return;
      const ratio=player.maxHp>0?player.hp/player.maxHp:0;
      if(isEchoEquipped(player,'balrog_sangue')&&ratio<.35&&s.bloodWaveUsed!==getWave()){
        s.bloodWaveUsed=getWave();player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.06);
        announce(player.x,player.y-28,'SANGUE INFERNAL');
      }
      if(isEchoEquipped(player,'balrog_furia')&&ratio<.25&&now>=s.furyReadyAt){
        s.furyUntil=now+6000;s.furyReadyAt=now+35000;announce(player.x,player.y-28,'FÚRIA DAS PROFUNDEZAS');
      }
    }
    function onWaveStarted(players,waveNumber){
      for(const player of players.filter(Boolean)) if(player._campEchoState) player._campEchoState.bloodWaveUsed=null;
      return waveNumber;
    }
    function onBossStarted(players,boss){
      for(const player of players.filter(Boolean)){
        const s=player._campEchoState;
        if(!s||!isEchoEquipped(player,'gelo_coracao')||s.bossHealed.has(boss))continue;
        s.bossHealed.add(boss);player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.08);
        announce(player.x,player.y-26,'CORAÇÃO DO INVERNO');
      }
    }
    function onEnemyKilled(player,target){
      const s=player?._campEchoState;if(!s||!isElite(target))return;
      const now=performance.now();
      if(isEchoEquipped(player,'rei_devorador')&&now>=s.eliteHealReadyAt){
        s.eliteHealReadyAt=now+8000;player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.04);
      }
      if(isEchoEquipped(player,'verme_fome'))s.hungerUntil=now+8000;
    }
    function damageBonus(player,target){
      if(!player?._campEchoState)return 0;
      const s=player._campEchoState,now=performance.now();let bonus=0;
      if(isEchoEquipped(player,'rei_carrasco')&&target?.maxHp>0&&target.hp/target.maxHp<.25)bonus+=.10;
      if(isEchoEquipped(player,'aracne_instinto')&&now-s.lastDamageAt>=5000)bonus+=.10;
      if(isEchoEquipped(player,'verme_predador')&&isElite(target))bonus+=.12;
      if(isEchoEquipped(player,'verme_titas')&&isBoss(target))bonus+=.08;
      if(isEchoEquipped(player,'balrog_furia')&&now<s.furyUntil)bonus+=.15;
      return bonus;
    }
    function movementMultiplier(player){
      if(!player?._campEchoState)return 1;
      const s=player._campEchoState,now=performance.now();let mult=1;
      if(isEchoEquipped(player,'aracne_passos'))mult+=.08;
      if(isEchoEquipped(player,'verme_fome')&&now<s.hungerUntil)mult+=.10;
      if(isEchoEquipped(player,'balrog_furia')&&now<s.furyUntil)mult+=.10;
      const foodMult=Math.max(1,Number(player._campFoodSpeedMultiplier)||1);
      return Math.max(1,Math.min(1.30,mult,1.65/foodMult));
    }
    function damageReduction(player){
      if(!player)return 0;let reduction=Math.max(0,Number(player._campFoodDamageReduction)||0);
      if(isEchoEquipped(player,'aracne_carapaca'))reduction+=.06;
      if(isEchoEquipped(player,'gelo_ultimo')&&player.maxHp>0&&player.hp/player.maxHp<.30)reduction+=.15;
      return Math.min(.25,reduction);
    }
    function shouldPreventFatalDamage(player){
      const s=player?._campEchoState;
      if(!s||!s.eternalFlameReady||!isEchoEquipped(player,'balrog_chama'))return false;
      s.eternalFlameReady=false;player.hp=1;player.inv=true;player.invT=Math.max(player.invT||0,2000);
      announce(player.x,player.y-34,'CHAMA ETERNA');return true;
    }

    function drawArtifact(c,x,y,t,kind,color,scale){
      const pulse=.76+.18*Math.sin(t*.004+x*.01),s=scale||1;
      c.save();c.translate(Math.round(x),Math.round(y));c.globalAlpha=pulse;c.fillStyle=color;c.strokeStyle='#18120c';c.lineWidth=2;
      if(kind==='crown'){
        c.fillRect(-8*s,-2*s,16*s,5*s);c.fillRect(-8*s,-8*s,3*s,7*s);c.fillRect(-2*s,-11*s,4*s,10*s);c.fillRect(5*s,-8*s,3*s,7*s);
      }else if(kind==='eye'){
        c.beginPath();c.moveTo(-10*s,0);c.quadraticCurveTo(0,-8*s,10*s,0);c.quadraticCurveTo(0,8*s,-10*s,0);c.fill();c.fillStyle='#f5e8ff';c.fillRect(-2*s,-2*s,4*s,4*s);
      }else if(kind==='ice'){
        c.beginPath();c.moveTo(0,-11*s);c.lineTo(9*s,-1*s);c.lineTo(5*s,9*s);c.lineTo(-5*s,9*s);c.lineTo(-9*s,-1*s);c.closePath();c.fill();
      }else if(kind==='fang'){
        c.beginPath();c.moveTo(-7*s,-9*s);c.quadraticCurveTo(9*s,-5*s,3*s,11*s);c.lineTo(-2*s,3*s);c.closePath();c.fill();
      }else{
        c.shadowColor=color;c.shadowBlur=12*s;c.beginPath();c.arc(0,0,8*s,0,Math.PI*2);c.fill();c.fillStyle='#ffd166';c.fillRect(-2*s,-3*s,4*s,6*s);
      }
      c.restore();
    }
    function drawArtifacts(c,x,y,t,camX=0,camY=0){
      const found=Object.values(ARTIFACT_DEFS).filter(def=>quantity(def.id)>0);if(!found.length)return;
      c.save();c.translate(-camX,-camY);
      const gap=found.length>3?25:31,start=x-gap*(found.length-1)/2;
      found.forEach((def,index)=>{
        const px=start+gap*index,py=y+40+Math.sin(t*.003+index)*3;
        c.fillStyle='#19150f';c.fillRect(px-10,py+10,20,4);c.fillStyle='#6b5530';c.fillRect(px-8,py+7,16,3);
        drawArtifact(c,px,py,t,def.pixelKind,def.color,.8);
      });
      if(hasNewDiscoveries()){c.fillStyle='#ffe45c';c.font='bold 18px Courier New';c.textAlign='center';c.fillText('!',x,y-44);}
      c.restore();
    }

    return Object.freeze({
      SAVE_KEY,ARTIFACT_DEFS,ECHO_DEFS,FISH_RECIPES,GASTRONOMY_UPGRADES,EXCELLENT_BONUSES,
      exportState,save,quantity,ingredientSource,ingredientName,ingredientPixelKind,canAfford,consume,
      recipeCost,recipeUnlocked,mealLimit,excellentThreshold,qualityBands,buildMealEffect,setPreparedMeals,preparedMeals,
      fishWeight,recordFishCatch,applyMealsToPlayer,applyMealWaveRegen,applyMealKillEffects,
      awardCampaignArtifact,hasNewDiscoveries,markDiscoveriesSeen,unlockEcho,toggleEcho,
      beginRun,endRun,updatePlayer,onPlayerDamaged,onWaveStarted,onBossStarted,onEnemyKilled,
      damageBonus,movementMultiplier,damageReduction,shouldPreventFatalDamage,drawArtifacts,isElite,isBoss,
    });
  }

  global.CampProgressionCore=Object.freeze({
    create,ARTIFACT_DEFS,ECHO_DEFS,FISH_RECIPES,GASTRONOMY_UPGRADES,EXCELLENT_BONUSES,
    scaleBonusValue,migrateState,defaultState,
  });
})(window);
