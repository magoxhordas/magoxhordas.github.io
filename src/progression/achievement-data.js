(function(global){
  'use strict';

  const CATEGORIES=Object.freeze({
    journey:'Jornada',classes:'Classes',combat:'Combate',bosses:'Chefes',
    build:'Build',modes:'Modos',camp:'Acampamento'
  });

  const raw=[
    ['first_steps','Primeiros Passos','Complete a primeira onda de uma run.','journey','flag',1,'✦'],
    ['warming_up','Aquecendo','Chegue à onda 5.','journey','max',5,'🔥'],
    ['no_turning_back','Sem Voltar Atrás','Chegue à onda 10.','journey','max',10,'⚔'],
    ['halfway_there','Metade do Caminho','Chegue à onda 15.','journey','max',15,'◐'],
    ['gates_of_inferno','Às Portas do Inferno','Chegue à onda 20.','journey','max',20,'♨'],
    ['end_of_the_horde','O Fim da Horda','Conclua a Campanha pela primeira vez.','journey','flag',1,'♛'],
    ['nothing_normal','Nada Normal Aqui','Conclua a Campanha na dificuldade Difícil.','journey','flag',1,'☠'],
    ['veteran','Veterano','Conquiste 10 vitórias em runs.','journey','counter',10,'★'],

    ['mage_master','Mestre Arcano','Conclua a Campanha com o Mago.','classes','flag',1,'✧'],
    ['mage_1000_kills','Mil Feitiços Depois','Derrote 1.000 inimigos jogando de Mago.','classes','counter',1000,'✦'],
    ['archer_master','Olho de Águia','Conclua a Campanha com o Arqueiro.','classes','flag',1,'➶'],
    ['archer_1000_kills','Chuva de Flechas','Derrote 1.000 inimigos jogando de Arqueiro.','classes','counter',1000,'➹'],
    ['viking_master','Filho de Midgard','Conclua a Campanha com o Viking.','classes','flag',1,'ᚱ'],
    ['viking_1000_kills','Valhalla Espera','Derrote 1.000 inimigos jogando de Viking.','classes','counter',1000,'ᛉ'],
    ['warrior_master','Lâmina Inquebrável','Conclua a Campanha com o Guerreiro.','classes','flag',1,'⚔'],
    ['warrior_1000_kills','Exército de um Homem','Derrote 1.000 inimigos jogando de Guerreiro.','classes','counter',1000,'🛡'],
    ['necromancer_master','Senhor dos Mortos','Conclua a Campanha com o Necromante.','classes','flag',1,'☠'],
    ['necromancer_1000_kills','Não Existe Descanso','Derrote 1.000 inimigos jogando de Necromante.','classes','counter',1000,'◈'],

    ['100_kills_run','Exterminador','Derrote 100 inimigos em uma única run.','combat','run',100,'⚔'],
    ['250_kills_run','Massacre','Derrote 250 inimigos em uma única run.','combat','run',250,'☠'],
    ['500_kills_run','Uma Horda Inteira','Derrote 500 inimigos em uma única run.','combat','run',500,'♨'],
    ['flawless_wave','Sem um Arranhão','Complete uma onda sem receber dano.','combat','run',1,'◇'],
    ['three_flawless_waves','Intocável','Complete 3 ondas consecutivas sem receber dano.','combat','run',3,'◆'],
    ['25_crits_run','Precisão Mortal','Acerte 25 golpes críticos em uma única run.','combat','run',25,'✣'],
    ['100_crits_run','Chuva de Críticos','Acerte 100 golpes críticos em uma única run.','combat','run',100,'✺'],
    ['damage_100k','Destruição Total','Cause 100.000 de dano efetivo em uma única run.','combat','run',100000,'✹'],
    ['multi_kill_attack','Um Golpe, Muitos Caídos','Derrote 8 inimigos através do mesmo ciclo de ataque.','combat','run',8,'✸'],
    ['near_death_survivor','Por um Fio','Chegue a 10% de vida ou menos e sobreviva por pelo menos 30 segundos.','combat','run',30,'♥',true],
    ['elite_hunter','Caçador de Elites','Derrote 5 elites em uma única run.','combat','run',5,'♜'],
    ['combat_pressure','Sem Descanso','Mantenha pressão de combate durante 60 segundos sem receber dano.','combat','run',60,'⚡',true],

    ['defeat_skeleton_king','O Rei Caiu','Derrote o Rei Cadáver.','bosses','flag',1,'♛'],
    ['defeat_arachne','Sem Mais Teias','Derrote Aracne.','bosses','flag',1,'🕷'],
    ['defeat_ice_giant','Quebra-Gelo','Derrote o Gigante de Gelo.','bosses','flag',1,'❄'],
    ['defeat_worm','Não Era Indestrutível','Derrote o Verme Devorador.','bosses','flag',1,'◉'],
    ['defeat_balrog','A Sombra Caiu','Derrote o Balrog.','bosses','flag',1,'♨'],
    ['defeat_brutamontes','Mais Bruto que Ele','Derrote o Brutamontes.','bosses','flag',1,'♟'],
    ['all_campaign_bosses_run','Matador de Chefes','Derrote os cinco chefes principais da Campanha em uma única run.','bosses','run',5,'♚'],
    ['boss_under_60','Contra o Relógio','Derrote um chefão em menos de 60 segundos.','bosses','run',60,'⌛'],
    ['flawless_boss','Você Não Me Tocou','Derrote um chefão sem receber dano durante a batalha.','bosses','flag',1,'◈',true],
    ['50_boss_kills','Colecionador de Cabeças','Derrote 50 chefes ao longo de todas as runs.','bosses','counter',50,'☠'],

    ['first_legendary_weapon','Primeira Lenda','Obtenha uma arma Lendária.','build','flag',1,'★'],
    ['three_legendary_weapons','Arsenal Lendário','Obtenha 3 armas Lendárias durante a mesma run.','build','run',3,'★★'],
    ['first_blessing','Favor Divino','Receba sua primeira bênção.','build','flag',1,'✦'],
    ['three_same_deity','Devoto','Tenha 3 bênçãos normais da mesma divindade em uma run.','build','run',3,'☼'],
    ['five_deities_run','O Panteão Te Observa','Receba bênçãos de 5 divindades diferentes em uma única run.','build','run',5,'♁'],
    ['ten_blessings_run','Escolhido dos Deuses','Obtenha 10 bênçãos normais em uma única run.','build','run',10,'✺'],
    ['six_weapons_run','Arsenaleiro','Obtenha 6 armas diferentes durante uma única run.','build','run',6,'⚔'],
    ['all_weapon_rarities_run','De Todas as Cores','Obtenha uma arma de cada raridade durante a mesma run.','build','run',5,'◆'],

    ['boss_rush_first','Primeiro na Lista','Derrote seu primeiro chefão no Modo Chefão.','modes','flag',1,'Ⅰ'],
    ['boss_rush_complete','Senhor dos Chefes','Conclua todo o Modo Chefão.','modes','flag',1,'♚'],
    ['enter_dungeon','O Abismo Chama','Entre na Dungeon pela primeira vez.','modes','flag',1,'▼'],
    ['first_dungeon_boss','Algo Vivia Aqui','Derrote seu primeiro chefe da Dungeon.','modes','flag',1,'☠'],
    ['20_dungeon_bosses','Morador da Dungeon','Derrote 20 chefes da Dungeon.','modes','counter',20,'▦'],
    ['hyper_boss','O Pino Laranja','Derrote o chefe especial marcado pelo pino laranja na Dungeon.','modes','flag',1,'⬙',true],
    ['coop_victory','Melhor em Dupla','Conclua uma run no modo cooperativo.','modes','flag',1,'Ⅱ'],

    ['first_pet','Novo Companheiro','Capture seu primeiro pet.','camp','flag',1,'🐾'],
    ['all_pets','Tem Espaço para Todos','Capture todos os pets disponíveis.','camp','dynamic',1,'♧'],
    ['25_fish','Paciência de Pescador','Capture 25 peixes.','camp','counter',25,'◒'],
    ['farm_15','Colheita Completa','Colha 15 plantações.','camp','counter',15,'♣',true],
    ['excellent_meal','Chef de Guerra','Prepare uma comida com resultado EXCELENTE.','camp','flag',1,'♨',true]
  ];

  const ACHIEVEMENTS=Object.freeze(raw.map((entry,index)=>Object.freeze({
    order:index+1,id:entry[0],name:entry[1],description:entry[2],category:entry[3],
    progressType:entry[4],target:entry[5],icon:entry[6],hidden:entry[7]===true
  })));
  if(ACHIEVEMENTS.length!==60) throw new Error(`Catálogo de conquistas inválido: ${ACHIEVEMENTS.length}/60`);
  if(new Set(ACHIEVEMENTS.map(item=>item.id)).size!==60) throw new Error('IDs de conquistas duplicados.');

  global.AchievementData=Object.freeze({VERSION:1,CATEGORIES,ACHIEVEMENTS});
})(typeof window!=='undefined'?window:globalThis);
