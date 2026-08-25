// Catalogo imutavel das 32 armas da campanha. Os consumidores recebem novas
// definicoes, mas os valores, a ordem e os cinco estagios continuam canonicos.
(function(global){
  'use strict';

  const CAMPAIGN_WEAPON_POWER=Object.freeze({common:1,uncommon:1.12,rare:1.25,epic:1.42,legendary:1.62});
  const CAMPAIGN_WEAPON_SPEED=Object.freeze({common:1,uncommon:1.04,rare:1.08,epic:1.12,legendary:1.16});
  const CAMPAIGN_WEAPON_SPECS={
    mage:[
      ['mage_fire_staff','Cajado de Fogo','mage_fire_staff','#ff3b30',24,310,980,['Bola de Fogo: 100% de dano e pequena explosão.','Brasa Arcana: explosão 20% maior.','Chamas Duplas: 2 bolas de 65%.','Fogo Vivo: 2 bolas de 75% e queimadura por 3s.','Caminho das Chamas: 3 bolas de 65% e rastros de fogo.']],
      ['mage_lightning_staff','Cajado de Raio','mage_lightning_staff','#ffd83d',22,320,920,['Descarga: raio de 100%.','Condutor: +15% de alcance da descarga.','Corrente Elétrica: salta para um segundo alvo.','Alta Voltagem: atinge 3 alvos e pode interromper.','Tempestade: a cada 4 ataques, atinge 4 inimigos.']],
      ['mage_ice_staff','Cajado de Gelo','mage_ice_staff','#45a9ff',21,305,900,['Estilhaço: 90% de dano e lentidão.','Geada Densa: lentidão dura mais.','Estilhaços Duplos: 2 projéteis de 60%.','Congelamento: 3 acertos congelam o alvo.','Ruptura Glacial: congelados explodem ao morrer.']],
      ['mage_arcane_staff','Cajado Arcano','mage_arcane_staff','#b866ff',23,330,840,['Míssil Arcano: projétil perseguidor.','Foco Arcano: teleguiamento e alcance maiores.','Mísseis Gêmeos: 2 projéteis de 60%.','Barragem: 3 projéteis de 50% que perfuram.','Sobrecarga: a cada 5 ataques dispara 6 mísseis.']],
      ['mage_poison_staff','Cajado Venenoso','mage_poison_staff','#52d63b',20,300,940,['Orbe Tóxico: 80% e veneno por 4s.','Toxina Concentrada: veneno mais intenso.','Esporos: 2 projéteis e 2 cargas.','Contaminação: veneno acumula 3 cargas.','Epidemia: a morte transmite veneno a 2 alvos.']],
      ['mage_shadow_staff','Cajado das Sombras','mage_shadow_staff','#5a39a9',25,340,1050,['Orbe Sombrio: 100% e perfura 1 alvo.','Véu Escuro: +10% de dano.','Penumbra: perfura 2 alvos.','Eco Sombrio: repete 55% após 0,35s.','Eclipse: eco de 70% também viaja para trás.']],
      ['mage_solar_staff','Cajado Solar','mage_solar_staff','#ffd24a',27,350,1250,['Raio Solar: feixe de 3 ticks.','Clarão: +12% de alcance.','Luz Concentrada: 4 ticks e alcance maior.','Superaquecimento: último tick recebe +50%.','Sol Absoluto: o feixe atinge 2 alvos laterais.']],
      ['mage_wind_staff','Cajado do Vento','mage_wind_staff','#80e9ff',19,250,820,['Rajada: cone de 70% com empurrão.','Corrente Forte: empurrão ampliado.','Vendaval: cone 30% maior e 90% de dano.','Dupla Rajada: segunda rajada de 55%.','Tornado: a cada 4 ataques, múltiplos hits e empurrão.']],
    ],
    warrior:[
      ['warrior_longsword','Espada Longa','warrior_longsword','#d8e2ef',27,112,780,['Corte frontal de 100%.','Corte Treinado: arco 12% maior.','Combo: 80% + 60%.','Tríplice Corte: 80% + 60% + 70%.','Lâmina de Impacto: terceiro ataque cria onda frontal.']],
      ['warrior_greatsword','Espadão','warrior_greatsword','#b9c4d0',38,128,1320,['Golpe Pesado de 145%.','Peso Forjado: +10% de área.','Corte Amplo: +30% de área e 160%.','Quebra-Defesa: alvo recebe +10% de dano.','Ruptura: golpe cria fissura frontal.']],
      ['warrior_spear','Lança','warrior_spear','#e0c58c',29,180,900,['Estocada de 120% em linha.','Haste Longa: +15% de alcance.','Perfura até 2 inimigos.','Alcance Mortal: +35% e perfura 4.','Falange: a cada 3 ataques, 3 estocadas em leque.']],
      ['warrior_warhammer','Martelo de Guerra','warrior_warhammer','#aab0b8',34,95,1180,['Golpe de 130% em pequena área.','Cabeça Reforçada: +12% de área.','Área aumentada em 25%.','Todo terceiro golpe atordoa inimigos comuns.','Terremoto: terceiro golpe cria onda circular.']],
      ['warrior_warshield','Escudo de Guerra','warrior_warshield','#71899d',20,88,760,['Escudada de 80%, empurrão e +3% defesa.','Guarda Firme: +4% defesa.','Escudo raro: +5% defesa.','Contra-Ataque: 20% de chance ao receber dano.','Fortaleza: contra-ataque gera onda frontal.']],
      ['warrior_twinblades','Lâminas Gêmeas','warrior_twinblades','#f0d0c8',18,92,520,['2 cortes rápidos de 55%.','Fio Duplo: +8% velocidade de ataque.','3 cortes de 45%.','Terceiro ataque causa sangramento.','Frenesi: 8 acertos concedem +20% velocidade.']],
      ['warrior_chainblade','Corrente com Lâmina','warrior_chainblade','#bfc4c9',25,145,930,['Ataque semicircular de 90%.','Elo Reforçado: +18% de alcance.','Alcance aumentado em 35%.','Gancho: puxa inimigos pequenos.','Redemoinho: quarto ataque gira 360° com 125%.']],
      ['warrior_spikedmace','Maça Espinhosa','warrior_spikedmace','#9fa3a8',31,90,980,['Golpe de 110%.','Cravos Longos: +8% de dano.','130% e pequeno stagger.','Armadura Quebrada: alvo recebe +8% dano.','Esmagamento: alvos quebrados explodem.']],
    ],
    archer:[
      ['archer_shortbow','Arco Curto','archer_shortbow','#70d36d',15,290,520,['Flecha rápida de 85%.','Corda Leve: +12% velocidade de ataque.','+25% velocidade de ataque.','Terceiro ataque dispara 2 flechas.','Chuva Rápida: quinto ataque dispara 4 flechas.']],
      ['archer_longbow','Arco Longo','archer_longbow','#9acb67',28,390,1050,['Flecha lenta de 140%.','Mira Longa: +12% de alcance.','Perfura 1 inimigo.','+25% crítico e perfura 2.','Tiro Perfeito: quinto ataque causa 200% e perfura 5.']],
      ['archer_crossbow','Besta Pesada','archer_crossbow','#c7a56b',36,370,1450,['Virote lento de 175%.','Mecanismo Reforçado: +10% de dano.','Disparo de 200%.','+40% de dano contra elites e chefes.','Balista: terceiro tiro causa 250% e perfura 3.']],
      ['archer_poisonbow','Arco Venenoso','archer_poisonbow','#52d63b',17,320,760,['80% de dano e veneno.','Toxina: veneno causa mais dano.','Veneno dura 5s.','Acumula até 3 cargas.','Veneno Propagado: morte transfere carga.']],
      ['archer_explosivebow','Arco Explosivo','archer_explosivebow','#ff3b30',23,320,980,['100% e pequena explosão de 40%.','Pó Reforçado: explosão +15%.','Explosão aumenta 30%.','Explosão causa 70%.','Flecha Bomba: quarto tiro explode por 130%.']],
      ['archer_ricochetbow','Arco Ricochete','archer_ricochetbow','#e6d46e',19,325,820,['Flecha de 100%.','Quina Perfeita: alcance +10%.','1 ricochete de 55%.','2 ricochetes: 100% → 65% → 40%.','Pinball: até 4 alvos.']],
      ['archer_frostbow','Arco Gélido','archer_frostbow','#45a9ff',18,325,800,['90% e 20% de slow.','Ponta Gelada: slow dura mais.','Slow de 30%.','3 acertos congelam por 0,7s.','Flecha Glacial: congelados recebem +30% crítico.']],
      ['archer_thunderbow','Arco Trovejante','archer_thunderbow','#ffd83d',21,335,870,['Flecha elétrica de 100%.','Carga Estática: +12% de alcance.','Raio salta para outro alvo com 40%.','2 saltos: 100% → 50% → 30%.','Tempestade: quinto ataque cria 3 raios.']],
    ],
    viking:[
      ['viking_waraxe','Machado de Guerra','viking_waraxe','#e1a05b',32,105,880,['Corte semicircular de 120%.','Fio Nórdico: +8% de área.','140% e área +15%.','Centro do golpe causa +30%.','Decapita inimigos comuns abaixo de 15% de vida.']],
      ['viking_twinaxes','Machados Gêmeos','viking_twinaxes','#f0b86c',22,92,590,['2 ataques de 60%.','Punhos Rápidos: +10% de velocidade.','2 ataques de 70%.','Terceiro combo realiza giro de 100%.','Berserker: 10 acertos concedem +25% velocidade.']],
      ['viking_throwingaxe','Machado de Arremesso','viking_throwingaxe','#d4b079',25,300,930,['Vai e volta, causando 70% por passagem.','Lançamento Longo: +15% de alcance.','80% e maior distância.','Atinge até 4 inimigos por trajeto.','Bumerangue: ao voltar, gira ao redor do Viking.']],
      ['viking_stormhammer','Martelo da Tempestade','viking_stormhammer','#ffd83d',31,105,1020,['Golpe de 120%.','Carga Rúnica: +10% de dano.','Raio atinge outro inimigo por 40%.','Raio atinge 2 inimigos.','Ira da Tempestade: quarto golpe invoca 3 raios.']],
      ['viking_bloodaxe','Machado de Sangue','viking_bloodaxe','#c74343',28,100,820,['100% e 2% de roubo de vida.','Sangue Quente: 2,5% de roubo de vida.','110% e 3% de roubo de vida.','Vida baixa concede até +25% de dano.','Sede de Sangue: abaixo de 35%, velocidade e roubo aumentam.']],
      ['viking_frostaxe','Machado Congelado','viking_frostaxe','#45a9ff',30,104,920,['110% e slow de 15%.','Gume Frio: slow dura mais.','Slow de 25%.','Quarto ataque congela por 0,6s.','Ruptura: alvo congelado lança 3 estilhaços.']],
      ['viking_nordicspear','Lança Nórdica','viking_nordicspear','#d8c590',29,185,900,['Estocada longa de 110%.','Haste de Freixo: +15% alcance.','Perfura 2 inimigos.','No alcance máximo causa +40%.','Investida de Odin: terceiro ataque espectral de 150%.']],
      ['viking_colossalaxe','Machado Colossal','viking_colossalaxe','#9f795d',46,130,1650,['Ataque lentíssimo de 180%.','Peso Colossal: +10% de área.','Golpe de 210%.','Impacto Brutal: onda curta de 80%.','Ragnarok: terceiro ataque causa 250% em 360° e onda externa.']],
    ],
  };

  // A quinta classe e anexada pelo modulo proprio para manter o catalogo
  // original das quatro classes intacto e facilmente auditavel.
  if(global.NecromancerData?.WEAPON_SPECS){
    CAMPAIGN_WEAPON_SPECS.necromancer=global.NecromancerData.WEAPON_SPECS;
  }

  for(const list of Object.values(CAMPAIGN_WEAPON_SPECS)){
    for(const spec of list){
      Object.freeze(spec[7]);
      Object.freeze(spec);
    }
    Object.freeze(list);
  }
  Object.freeze(CAMPAIGN_WEAPON_SPECS);

  function createDefinitions(rarities,attack){
    const definitions={};
    for(const [classId,list] of Object.entries(CAMPAIGN_WEAPON_SPECS)){
      for(const [id,name,pixelIcon,color,baseDmg,range,cd,stages] of list){
        definitions[id]={
          id,classId,name,pixelIcon,icon:pixelIcon,
          type:classId==='archer'?'ranged':((classId==='mage'||classId==='necromancer')?'magic':'melee'),
          color,baseDmg,range,cd,stages,
          desc:rarity=>stages[Math.max(0,rarities.indexOf(rarity))]||stages[0],
          attack(player,enemies,rarity,target,weapon){return attack(player,enemies,rarity,target,weapon,id);},
        };
      }
    }
    return definitions;
  }

  global.CampaignWeaponData=Object.freeze({
    POWER:CAMPAIGN_WEAPON_POWER,
    SPEED:CAMPAIGN_WEAPON_SPEED,
    SPECS:CAMPAIGN_WEAPON_SPECS,
    createDefinitions,
  });
})(window);
