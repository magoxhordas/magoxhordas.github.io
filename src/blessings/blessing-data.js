// BÊNÇÃOS DOS FORNECEDORES — catálogo e execução preservados da versão monolítica.
// Cada encontro sorteia primeiro um fornecedor e depois 3 poderes diferentes dele,
// com raridades independentes. O sistema preserva as mecânicas de combate existentes.
(function(global){
  'use strict';
  const RARITY_ORDER=['comum','incomum','rara','epica','lendaria'];
  const RARITY_META={
    comum:{label:'COMUM',color:'#79e89a'},
    incomum:{label:'INCOMUM',color:'#43d477'},
    rara:{label:'RARA',color:'#58a8ff'},
    epica:{label:'ÉPICA',color:'#c86cff'},
    lendaria:{label:'LENDÁRIA',color:'#ffd35a'}
  };

  const D=(id,name,title,image,icon,dialogues,boons)=>({id,name,title,image,icon,dialogues,boons});
  const B=(id,name,icon,type,values,desc,role='DANO',extra={})=>({id,name,icon,type,values,desc,role,...extra});

  const DEITIES=[
    D('zeus','ZEUS','DEUS DO TROVÃO','assets/deities/zeus.png','⚡',[
      'Erga sua arma. Quero ver se há algo de divino em você.',
      'Os céus observam sua batalha. Não os decepcione.',
      'Poder não é concedido aos fracos. Mostre-me que merece o meu.',
      'Continue avançando. Até uma tempestade começa com uma única faísca.',
      'Carregue minha força consigo. Faça seus inimigos temerem o trovão.'
    ],[
      B('zeus_poder','Poder Olímpico','⚡','damage',[.08,.13,.20,.30],'Amplifica todo o dano causado.'),
      B('zeus_reflexos','Reflexos do Trovão','ϟ','attackSpeed',[.07,.12,.18,.27],'Acelera seus ataques.','UTILIDADE'),
      B('zeus_carga','Carga Divina','✦','consecutive',[.10,.15,.22,.32],'Acertos consecutivos acumulam dano até o limite.'),
      B('zeus_autoridade','Autoridade de Zeus','♛','bossDamage',[.10,.16,.24,.35],'Aumenta o dano contra elites e chefes.'),
      B('zeus_filho','Filho da Tempestade','☈','lowHpDamageSpeed',[.08,.13,.20,.30],'Abaixo de 40% de vida, concede dano e velocidade de ataque.','RISCO')
    ]),
    D('ares','ARES','DEUS DA GUERRA','assets/deities/ares.png','⚔',[
      'Finalmente. Alguém disposto a sujar as mãos.','Pare de pensar tanto. Ataque.',
      'Toda batalha termina do mesmo jeito. Alguém permanece de pé.',
      'Eles ainda respiram? Então você ainda não terminou.',
      'Quero ouvir armas quebrando antes que nos encontremos novamente.'
    ],[
      B('ares_sede','Sede de Sangue','🗡','meleeDamage',[.10,.16,.24,.36],'Amplifica ataques corpo a corpo.'),
      B('ares_frenesi','Frenesi','🔥','killAtk',[.02,.03,.04,.06],'Cada eliminação concede velocidade de ataque temporária, até 5 acúmulos.','UTILIDADE'),
      B('ares_misericordia','Sem Misericórdia','☠','lowEnemy',[.12,.20,.30,.45],'Causa mais dano a inimigos abaixo de 40% de vida.'),
      B('ares_instinto','Instinto de Guerra','⚔','missingHpDamage',[.15,.22,.32,.48],'Quanto menor sua vida, maior o dano.','RISCO'),
      B('ares_veterano','Veterano','🛡','afterDamageDefense',[.08,.13,.20,.30],'Após receber dano, ganha resistência temporária.','SUPORTE')
    ]),
    D('hecate','HÉCATE','DEUSA DA MAGIA','assets/deities/hecate.png','🔮',[
      'Existem caminhos que apenas aqueles dispostos a se perder conseguem encontrar.',
      'Magia não é força. É compreender aquilo que os outros não conseguem ver.',
      'Você procura poder. Espero que esteja preparado para entendê-lo.',
      'Nem toda escuridão deseja consumi-lo.','Aproxime-se. Há segredos que prefiro não repetir duas vezes.'
    ],[
      B('hecate_conhecimento','Conhecimento Arcano','✧','specialDamage',[.10,.16,.25,.38],'Amplifica o dano das habilidades especiais.'),
      B('hecate_fluxo','Fluxo Místico','◌','abilityCd',[.07,.12,.18,.27],'Reduz a recarga das habilidades.','UTILIDADE'),
      B('hecate_concentracao','Concentração','◈','safeDamage',[.10,.16,.24,.36],'Após 3s sem sofrer dano, aumenta o dano.'),
      B('hecate_amplificacao','Amplificação','✦','buffDuration',[.10,.18,.28,.42],'Estende a duração de bônus temporários.','UTILIDADE'),
      B('hecate_oculto','Poder Oculto','☾','specialNormal',[.12,.20,.30,.45],'Habilidades fortalecem ataques normais temporariamente.')
    ]),
    D('selene','SELENE','DEUSA DA LUA','assets/deities/selene.png','☾',[
      'A noite não precisa ser temida. Ela pode guiá-lo.',
      'Mesmo quando tudo parece escuro, a lua permanece acima de você.',
      'Não tenha pressa. O céu nunca se apressa para mudar.',
      'Há força naqueles que sabem esperar o momento certo.','Leve consigo um pouco da minha luz.'
    ],[
      B('selene_luz','Luz Lunar','☾','maxHp',[.08,.13,.20,.30],'Aumenta sua vida máxima.','SUPORTE'),
      B('selene_serenidade','Serenidade','✧','defense',[.06,.10,.15,.23],'Reduz o dano recebido.','SUPORTE'),
      B('selene_ciclo','Ciclo Lunar','◐','killHealPct',[.003,.005,.008,.012],'Eliminações recuperam uma parcela da vida máxima.','SUSTENTAÇÃO'),
      B('selene_crescente','Lua Crescente','☽','safeSpeed',[.08,.13,.20,.30],'Após 3s sem sofrer dano, aumenta a velocidade.','UTILIDADE'),
      B('selene_cheia','Lua Cheia','●','highHp80Damage',[.10,.17,.26,.40],'Acima de 80% de vida, aumenta o dano.')
    ]),
    D('moros','MOROS','DEUS DO DESTINO','assets/deities/moros.png','⌛',[
      'Curioso. Este não era o momento em que esperava encontrá-lo.',
      'Seu caminho já possui um fim. Apenas ainda não sabe qual.',
      'Você chama suas escolhas de liberdade. Eu as chamo de destino.',
      'Alguns acontecimentos podem ser adiados. Nenhum pode ser evitado para sempre.',
      'Continue. Quero descobrir se você é capaz de contrariar aquilo que vi.'
    ],[
      B('moros_destino','Destino Favorável','◇','crit',[.05,.08,.12,.18],'Aumenta a chance de acerto crítico.'),
      B('moros_inevitavel','Inevitável','✴','critDmg',[.20,.32,.48,.70],'Aumenta o dano dos acertos críticos.'),
      B('moros_fio','Fio da Vida','⌁','low30Defense',[.10,.17,.26,.40],'Abaixo de 30% de vida, ganha defesa.','SUPORTE'),
      B('moros_pressagio','Presságio','⌛','rarityBoost',[.03,.05,.08,.12],'Melhora a chance de encontrar raridades superiores.','UTILIDADE'),
      B('moros_pagina','Última Página','▣','lowHpCrit',[.08,.13,.20,.30],'Quanto mais perto da morte, maior sua chance crítica.','RISCO')
    ]),
    D('atena','ATENA','DEUSA DA SABEDORIA','assets/deities/atena.png','🛡',[
      'Vencer não significa atacar mais. Significa atacar melhor.',
      'Observe seu adversário. Ele lhe mostrará como derrotá-lo.',
      'A força termina onde começa a estratégia.','Uma batalha mal planejada já começou perdida.',
      'Use minha bênção com inteligência. Seria decepcionante vê-la desperdiçada.'
    ],[
      B('atena_egide','Égide','🛡','defense',[.05,.08,.12,.18],'Reduz todo dano recebido.','SUPORTE'),
      B('atena_disciplina','Disciplina','♜','highHp70Damage',[.08,.14,.22,.34],'Acima de 70% de vida, aumenta o dano.'),
      B('atena_preparacao','Preparação','⌛','abilityCd',[.06,.10,.15,.23],'Reduz a recarga das habilidades.','UTILIDADE'),
      B('atena_postura','Postura Defensiva','◩','dashDefense',[.10,.16,.25,.38],'Após o dash, reduz o dano por 1,5s.','SUPORTE'),
      B('atena_combate','Combate Calculado','⚖','damageDefense',[.04,.07,.11,.17],'Aumenta simultaneamente dano e defesa.','SUPORTE')
    ]),
    D('hermes','HERMES','DEUS DOS VIAJANTES','assets/deities/hermes.png','🪽',[
      'Você anda desse jeito sempre ou estava me esperando?',
      'Bom trabalho! Teria sido melhor se tivesse feito mais rápido.',
      'Acredite em mim, tudo fica mais fácil quando ninguém consegue alcançá-lo.',
      'Não fique parado. Eu fico nervoso só de olhar.',
      'Tenho muitos lugares para estar hoje. Vamos resolver isso rápido.'
    ],[
      B('hermes_sandalias','Sandálias Aladas','🪽','move',[.08,.13,.20,.30],'Aumenta a velocidade de movimento.','UTILIDADE'),
      B('hermes_reflexos','Reflexos Divinos','≋','attackSpeed',[.07,.12,.18,.28],'Aumenta a velocidade de ataque.','UTILIDADE'),
      B('hermes_passo','Passo Veloz','➟','dashCd',[.10,.16,.24,.35],'Reduz a recarga do dash.','UTILIDADE'),
      B('hermes_embalo','Embalo','»','movingDamage',[.08,.13,.20,.30],'Enquanto se movimenta, aumenta o dano gradualmente.'),
      B('hermes_mensageiro','Mensageiro','➶','projectile',[.10,.17,.25,.38],'Projéteis ganham velocidade e alcance.','UTILIDADE')
    ]),
    D('dionisio','DIONÍSIO','DEUS DO VINHO','assets/deities/dionisio.png','🍷',[
      'Você parece tenso. Péssimo para a saúde, sabia?',
      'Se vai arriscar a vida, pelo menos tente se divertir.',
      'Ganhar, perder… no fim alguém abre outra garrafa.',
      'Não lembro se já lhe dei uma bênção. Melhor dar outra por garantia.',
      'Os outros deuses levam tudo tão a sério. Exaustivo.','Espere… nós já conversamos hoje?'
    ],[
      B('dionisio_humor','Bom Humor','☺','maxHp',[.08,.14,.21,.32],'Aumenta sua vida máxima.','SUPORTE'),
      B('dionisio_coragem','Coragem Líquida','🍷','lowHpDefense',[.10,.17,.26,.40],'Quanto menor sua vida, maior sua defesa.','SUPORTE'),
      B('dionisio_brinde','Brinde','♨','healing',[.12,.20,.30,.45],'Amplifica toda cura recebida.','SUSTENTAÇÃO'),
      B('dionisio_euforia','Euforia','✺','killSpeed',[.08,.13,.20,.30],'Após uma eliminação, recebe velocidade temporária.','UTILIDADE'),
      B('dionisio_festa','Festa Sem Fim','♬','killDamage',[.02,.03,.04,.06],'Eliminações consecutivas acumulam dano, até 5 vezes.')
    ]),
    D('hefesto','HEFESTO','DEUS DA FORJA','assets/deities/hefesto.png','🔨',[
      'Essa arma ainda está inteira? Então ainda pode melhorar.','Metal ruim quebra. Guerreiro ruim também.',
      'Não preciso que seja bonito. Preciso que funcione.','Mostre-me sua arma. Hm… já vi coisas piores.',
      'Volte vivo. Odeio quando meu trabalho é desperdiçado.'
    ],[
      B('hefesto_arma','Arma Temperada','🔨','damage',[.09,.15,.23,.35],'Aumenta o dano-base.'),
      B('hefesto_armadura','Armadura Reforçada','⛨','defense',[.07,.11,.17,.26],'Reduz o dano recebido.','SUPORTE'),
      B('hefesto_fio','Fio Perfeito','✦','critDmg',[.18,.30,.45,.68],'Amplifica o dano crítico.'),
      B('hefesto_trabalho','Trabalho Preciso','⌖','highEnemy',[.10,.17,.25,.38],'Causa mais dano a inimigos acima de 70% de vida.'),
      B('hefesto_obra','Obra-Prima','◆','damageMaxHp',[.05,.08,.13,.20],'Aumenta dano e vida máxima.','SUPORTE')
    ]),
    D('artemis','ARTEMIS','DEUSA DA CAÇA','assets/deities/artemis.png','🏹',[
      'Você faz muito barulho para alguém tentando sobreviver.',
      'Não mire onde sua presa está. Mire onde ela estará.','Todo inimigo possui um ponto fraco.',
      'Uma flecha. Uma oportunidade. Isso deveria bastar.',
      'A floresta ensina algo importante: quem hesita vira presa.'
    ],[
      B('artemis_olho','Olho da Caçadora','◉','crit',[.06,.10,.15,.23],'Aumenta a chance de acerto crítico.'),
      B('artemis_tiro','Tiro Preciso','➶','critDmg',[.20,.34,.52,.78],'Amplifica o dano crítico.'),
      B('artemis_instinto','Instinto Predador','♞','bossDamage',[.10,.16,.25,.38],'Aumenta o dano contra elites e chefes.'),
      B('artemis_implacavel','Caçadora Implacável','🏹','critAtk',[.08,.13,.20,.30],'Acertos críticos concedem velocidade de ataque temporária.','UTILIDADE'),
      B('artemis_mira','Mira Perfeita','⌖','projectile',[.12,.20,.30,.45],'Projéteis ganham velocidade e alcance.','UTILIDADE')
    ]),
    D('poseidon','POSEIDON','DEUS DOS MARES','assets/deities/poseidon.png','🌊',[
      'HA! Finalmente alguém interessante aparece por aqui!',
      'As montanhas parecem fortes até o oceano decidir movê-las.',
      'Não lute contra a corrente. Seja a corrente!',
      'Mostre a eles a força de uma tempestade em alto-mar!',
      'Até Zeus sabe que não se desafia o oceano. Na maior parte do tempo.'
    ],[
      B('poseidon_forca','Força das Marés','🌊','damage',[.08,.14,.21,.32],'Aumenta todo o dano.'),
      B('poseidon_correnteza','Correnteza','≋','move',[.07,.12,.18,.27],'Aumenta a velocidade de movimento.','UTILIDADE'),
      B('poseidon_corpo','Corpo do Oceano','◉','maxHp',[.09,.15,.23,.35],'Aumenta sua vida máxima.','SUPORTE'),
      B('poseidon_alta','Maré Alta','↑','highHpAtk',[.08,.14,.21,.32],'Acima de 70% de vida, aumenta a velocidade de ataque.','UTILIDADE'),
      B('poseidon_baixa','Maré Baixa','↓','lowHpDefense',[.10,.17,.26,.40],'Abaixo de 40% de vida, ganha defesa.','SUPORTE')
    ]),
    D('hercules','HÉRCULES','HERÓI DO OLIMPO','assets/deities/hercules.png','💪',[
      'Você parece forte. Gosto disso.','Quando algo parece impossível, normalmente significa que vai ser divertido.',
      'Já tentei resolver problemas conversando. Prefiro o outro método.',
      'Não conte quantas vezes caiu. Conte quantas conseguiu levantar.',
      'Força não resolve tudo. Mas resolve uma quantidade surpreendente de coisas.'
    ],[
      B('hercules_forca','Força Hercúlea','💪','damage',[.10,.16,.25,.38],'Aumenta todo o dano.'),
      B('hercules_constituicao','Constituição Heroica','♥','maxHp',[.10,.17,.26,.40],'Aumenta sua vida máxima.','SUPORTE'),
      B('hercules_pele','Pele do Leão','♌','defense',[.07,.12,.18,.28],'Reduz o dano recebido.','SUPORTE'),
      B('hercules_matador','Matador de Monstros','♜','bossDamage',[.12,.20,.30,.45],'Aumenta o dano contra chefes.'),
      B('hercules_trabalho','Trabalho Inacabado','✊','afterDamage',[.10,.16,.25,.38],'Após sofrer dano, aumenta seu dano durante 4s.')
    ]),
    D('sauron','SAURON','SENHOR SOMBRIO','assets/deities/sauron.png','👁',[
      'Poder não é conquistado por aqueles que hesitam.',
      'Você deseja força. Eu posso lhe mostrar o verdadeiro significado dessa palavra.',
      'Seus inimigos ainda acreditam possuir esperança. Tire isso deles.',
      'Quanto mais resistem, mais satisfatória será a vitória.',
      'Não procure ser lembrado. Faça com que seja impossível esquecê-lo.',
      'Há poder em você. Resta descobrir se possui coragem para usá-lo.',
      'Continue avançando. A vontade dos fracos sempre acaba cedendo.'
    ],[
      B('sauron_poder','Poder do Senhor Sombrio','👁','damage',[.10,.16,.25,.38],'Aumenta todo o dano.'),
      B('sauron_vontade','Vontade Dominadora','♛','missingHpDamage',[.15,.23,.35,.52],'Quanto menor sua vida, maior seu dano.','RISCO'),
      B('sauron_armadura','Armadura Negra','◼','defense',[.07,.12,.19,.29],'Reduz o dano recebido.','SUPORTE'),
      B('sauron_olho','Olho Vigilante','◉','critBoth',[.03,.05,.08,.12],'Aumenta chance e dano crítico.', 'DANO',{secondary:[.12,.20,.32,.50]}),
      B('sauron_dominacao','Dominação','♜','killDamage',[.02,.03,.04,.06],'Eliminações acumulam dano temporário, até 5 vezes.')
    ]),
    D('nazgul','NAZGÛL','ESPECTRO DO ANEL','assets/deities/nazgul.png','🗡',[
      'Você ainda carrega medo consigo. Aprenda a fazer dele uma arma.',
      'Eles ouvirão seus passos tarde demais.','Aqueles que fogem apenas prolongam o inevitável.',
      'Não permita que vejam seu próximo movimento.','Entre a sombra e a lâmina existe apenas um instante.',
      'Não procure uma luta justa. Procure uma luta que consiga vencer.',
      'Torne-se aquilo que seus inimigos temem encontrar na escuridão.'
    ],[
      B('nazgul_passos','Passos do Espectro','♟','move',[.10,.16,.24,.36],'Aumenta a velocidade de movimento.','UTILIDADE'),
      B('nazgul_lamina','Lâmina Sombria','🗡','crit',[.06,.10,.15,.23],'Aumenta a chance de acerto crítico.'),
      B('nazgul_golpe','Golpe Fantasma','✦','critDmg',[.20,.32,.50,.75],'Amplifica o dano crítico.'),
      B('nazgul_forma','Forma Espectral','◌','dodge',[.03,.05,.08,.12],'Concede chance de ignorar completamente um ataque.','SUPORTE'),
      B('nazgul_cacada','Caçada Implacável','➟','afterDashBoth',[.06,.10,.16,.25],'Após o dash, aumenta dano e velocidade de ataque por 2s.')
    ]),
    D('ents','ENTS','GUARDIÕES DA FLORESTA','assets/deities/ents.png','🌳',[
      'Você se move com muita pressa para alguém que ainda possui tanto caminho pela frente.',
      'As árvores conhecem uma verdade esquecida pelos homens: sobreviver também é vencer.',
      'Uma raiz profunda não teme a tempestade.','Não confunda lentidão com fraqueza.',
      'A floresta cresceu durante eras. Você também pode aprender a resistir.',
      'Há força em permanecer de pé quando todos esperavam sua queda.','Cresça devagar. Mas cresça forte.'
    ],[
      B('ents_casca','Casca Ancestral','🌳','defense',[.08,.13,.20,.30],'Reduz o dano recebido.','SUPORTE'),
      B('ents_coracao','Coração da Floresta','♥','maxHp',[.12,.19,.29,.44],'Aumenta muito sua vida máxima.','SUPORTE'),
      B('ents_seiva','Seiva Vital','❧','healing',[.15,.24,.36,.55],'Amplifica toda cura recebida.','SUSTENTAÇÃO'),
      B('ents_raizes','Raízes Profundas','♣','rootsDefense',[.08,.13,.20,.30],'Após 3s sem sofrer dano, recebe redução de dano.','SUPORTE'),
      B('ents_crescimento','Crescimento Ancestral','🌱','growthHp',[.005,.008,.012,.018],'A cada 10 eliminações aumenta a vida máxima, até 10 vezes.','SUSTENTAÇÃO')
    ])
  ];

  // Catálogo v3: cinco bênçãos exclusivas por divindade e cinco raridades.
  // Incomum usa o ponto intermediário entre Comum e Rara, preservando a
  // progressão solicitada sem remover a raridade já usada pela campanha.
  const V=(common,rare,epic,legendary,digits=4)=>[
    common,Number(((common+rare)/2).toFixed(digits)),rare,epic,legendary
  ];
  const N=(id,name,icon,type,values,desc,role='DANO',extra={})=>B(id,name,icon,type,values,desc,role,extra);
  const NEW_DEITY_BOONS={
    zeus:[
      N('zeus_overload','Sobrecarga Divina','⚡','zeusOverload',V(.40,.50,.65,.80),'Acertos carregam a tempestade; ao atingir o limite, o próximo ataque causa dano adicional.','COMBO',{hits:[6,6,5,5,4]}),
      N('zeus_conductor','Condutor Olímpico','ϟ','zeusConductor',V(.01,.015,.02,.02),'Acertar sem pausas maiores que 1,2s acumula velocidade de ataque.','COMBO',{max:V(.10,.15,.20,.24)}),
      N('zeus_critical_thunder','Trovão Crítico','✦','zeusCritical',V(.20,.30,.45,.60),'Um crítico energiza o próximo ataque.','CRÍTICO',{nextSpeed:[0,0,0,.15,0]}),
      N('zeus_authority','Autoridade dos Céus','♛','zeusAuthority',V(.10,.16,.24,.32),'Aumenta o dano contra elites e chefes.','CHEFE',{boss:V(.06,.10,.16,.25)}),
      N('zeus_storm_child','Filho da Tempestade','☈','zeusStorm',V(.10,.10,.15,.20),'Abaixo de 40% de vida, concede velocidade e poder ofensivo.','RISCO',{damage:[0,.04,.08,.15,.20]}),
    ],
    ares:[
      N('ares_war_thirst','Sede de Guerra','🗡','aresFury',V(.03,.04,.05,.06),'Eliminações concedem Fúria por 4s e renovam a duração.','COMBO',{max:[3,4,4,5,5]}),
      N('ares_open_wound','Ferida Aberta','🩸','aresWound',V(.02,.03,.04,.05),'Golpes consecutivos no mesmo alvo aumentam o dano contra ele.','CHEFE',{max:V(.12,.18,.24,.30)}),
      N('ares_executioner','Carrasco','☠','aresExecute',V(.10,.15,.22,.30),'Abaixo de 50% de vida o alvo sofre mais dano; abaixo de 20%, o bônus dobra.','EXECUÇÃO'),
      N('ares_pain_feeds_pain','Dor Alimenta Dor','⚔','aresRetaliation',V(.10,.15,.22,.30),'Depois de receber dano, entra em Retaliação por 3s.','RISCO',{speed:[0,0,0,.10,.20]}),
      N('ares_last_war','Última Guerra','🔥','aresMissingHp',V(.15,.22,.32,.45),'Entre 50% e 10% de vida, o dano cresce continuamente.','RISCO',{speed:[0,0,0,0,.15]}),
    ],
    hecate:[
      N('hecate_arcane_echo','Eco Arcano','🔮','hecateEcho',V(.50,.50,.60,.50),'Após várias ativações, fortalece ou repete a próxima habilidade.','MAGIA',{hits:[6,6,5,4,4]}),
      N('hecate_rising_ritual','Ritual Crescente','◌','hecateRitual',V(.05,.06,.08,.10),'Alternar armas ou habilidades diferentes acumula dano ritual.','COMBO',{max:3}),
      N('hecate_forbidden_knowledge','Conhecimento Proibido','☾','hecateForbidden',V(.08,.12,.18,.25),'Sacrifica vida máxima para reduzir recargas.','RISCO',{hpPenalty:V(.05,.07,.10,.12),skillDamage:[0,0,0,0,.12]}),
      N('hecate_hidden_focus','Concentração Oculta','◈','hecateFocus',V(.10,.15,.22,.30),'Após 4s sem sofrer dano, aumenta o poder mágico.','MAGIA',{cooldown:[0,0,0,0,.10]}),
      N('hecate_triple_path','Tríplice Caminho','△','hecateTriple',V(.12,.16,.22,.30),'Atacar com três armas diferentes concede Tríplice Poder por 3s.','COMBO',{speed:[0,0,0,.10,.15],cooldown:[0,0,0,0,.10]}),
    ],
    selene:[
      N('selene_lunar_cycle','Ciclo Lunar','🌙','seleneCycle',V(.08,.12,.18,.25),'Alterna automaticamente entre Crescente, Cheia e Minguante.','FASES'),
      N('selene_waxing_moon','Lua Crescente','☽','seleneMoving',V(.08,.12,.18,.25),'Movimentar-se acumula velocidade; parar começa a dissipá-la.','MOVIMENTO'),
      N('selene_full_moon','Lua Cheia','●','seleneHighHp',V(.10,.15,.22,.30),'Acima de 80% da vida, aumenta o dano.','DANO',{crit:[0,0,0,0,.10]}),
      N('selene_waning_moon','Lua Minguante','◐','seleneAfterHit',V(.10,.15,.22,.30),'Após receber dano, ganha resistência por 3s.','DEFESA',{speed:[0,0,0,0,.15]}),
      N('selene_eclipse','Eclipse','◒','seleneEclipse',V(.12,.18,.25,.35),'Abaixo de 30% de vida desperta dano, defesa e velocidade.','RISCO',{defense:[0,0,.08,.12,.18],speed:[0,0,0,0,.15]}),
    ],
    moros:[
      N('moros_inevitable','Inevitável','◇','morosInevitable',V(.02,.03,.04,.05),'Cada ataque não crítico aumenta temporariamente a chance crítica, até 30%.','CRÍTICO'),
      N('moros_marked_fate','Destino Marcado','✴','morosMarked',V(.08,.07,.06,.05),'Um ataque periódico é crítico garantido.','DESTINO',{hits:[8,8,7,6,5]}),
      N('moros_last_page','Última Página','▣','morosLowHpCrit',V(.08,.12,.18,.25),'Quanto menor a vida, maior a chance crítica.','RISCO',{critDamage:[0,0,0,0,.30]}),
      N('moros_delayed_fate','Destino Adiado','⌛','morosRevive',V(.01,.01,.05,.10),'Uma vez por onda, dano fatal não mata.','SOBREVIVÊNCIA',{invuln:[0,.3,.6,1,1.5]}),
      N('moros_omen','Presságio','⌛','morosOmen',V(.03,.05,.08,.12),'Melhora relativamente as chances de raridades superiores.','PROGRESSÃO'),
    ],
    atena:[
      N('atena_counter','Contra-Ataque','🛡','atenaCounter',V(.30,.45,.65,1),'Evitar dano durante o dash fortalece o próximo ataque por 2s.','TÉCNICA',{crit:[0,0,0,.15,1]}),
      N('atena_perfect_stance','Postura Perfeita','♜','atenaStance',V(.02,.02,.03,.04),'A cada 2s sem dano ganha uma carga defensiva, até 5.','DEFESA',{damage:[0,0,.01,.02,.03]}),
      N('atena_aegis','Égide','◩','atenaAegis',V(.25,.35,.50,.70),'Após 6s ileso, reduz o primeiro ataque recebido.','DEFESA'),
      N('atena_discipline','Disciplina','⚖','atenaDiscipline',V(.10,.15,.20,.25),'A cada 5 acertos sem sofrer dano, aumenta o dano até o limite.','TÉCNICA',{crit:[0,0,0,0,.10]}),
      N('atena_perfect_battle','Batalha Perfeita','🏅','atenaMedals',V(.02,.03,.04,.05),'Cada 10 abates sem receber dano concede uma medalha, até 3.','TÉCNICA',{defense:[0,0,0,0,.02]}),
    ],
    hermes:[
      N('hermes_momentum','Momentum','🪽','hermesMomentum',V(.10,.15,.20,.25),'Movimentar-se continuamente acumula velocidade.','MOVIMENTO'),
      N('hermes_lightning_attack','Ataque Relâmpago','≋','hermesAfterDash',V(.15,.20,.28,.35),'Depois do dash, aumenta a velocidade de ataque por 1,5s.','RITMO',{damage:[0,0,0,0,.15]}),
      N('hermes_impossible_step','Passo Impossível','➟','hermesDashReduce',V(.03,.04,.06,.08),'Acertos reduzem a recarga do dash, com limite por segundo.','UTILIDADE'),
      N('hermes_never_stop','Sem Parar','»','hermesSpeedDamage',V(.08,.12,.18,.25),'Converte a velocidade de movimento atual em dano.','MOVIMENTO'),
      N('hermes_divine_speed','Velocidade Divina','➶','hermesCycle',V(.10,.15,.20,.25),'Dash e ataques alimentam o ritmo um do outro.','COMBO'),
    ],
    dionisio:[
      N('dionisio_divine_drunkenness','Embriaguez Divina','🍷','dionRandomBuff',V(.12,.16,.20,.25),'Eliminações podem conceder dano, movimento ou ataque por 4s.','CAOS',{power:V(.08,.10,.12,.15)}),
      N('dionisio_double_toast','Brinde Duplo','🥂','dionDuration',V(.15,.25,.40,.60),'Buffs temporários duram mais.','UTILIDADE'),
      N('dionisio_more_the_merrier','Quanto Mais, Melhor','🎉','dionBuffDamage',V(.03,.04,.05,.06),'Cada buff temporário ativo aumenta o dano.','CAOS',{max:V(.09,.12,.20,.30)}),
      N('dionisio_hangover','Ressaca','♨','dionHangover',V(.05,.08,.10,.15),'Quando um buff termina, recebe um último impulso.','CAOS'),
      N('dionisio_endless_party','Festa Sem Fim','♫','dionRenew',V(.08,.12,.18,.28),'Buffs podem renovar uma vez ao terminar.','CAOS'),
    ],
    hefesto:[
      N('hefesto_tempering','Têmpera','🔨','hefestoTemper',V(.10,.15,.20,.25),'Usar continuamente a mesma arma acumula velocidade.','ARMA',{damage:[0,0,0,0,.10]}),
      N('hefesto_specialist','Especialista da Forja','⚒','hefestoSpecialist',V(.03,.04,.05,.06),'Armas adicionais da mesma família fortalecem essa família.','ARMA',{speed:[0,0,0,0,.02]}),
      N('hefesto_perfect_alloy','Liga Perfeita','◆','hefestoDiversity',V(.08,.12,.18,.25),'Três famílias diferentes equipadas fortalecem o arsenal.','ARMA',{speed:[0,0,0,0,.10]}),
      N('hefesto_reinforcement','Reforço','⛏','hefestoReinforce',V(.08,.12,.18,.25),'A arma com mais eliminações começa a próxima onda fortalecida.','ARMA',{speed:[0,0,0,0,.10]}),
      N('hefesto_masterpiece','Obra-Prima','✦','hefestoMasterpiece',V(.10,.15,.20,.30),'A arma de maior raridade recebe dano e velocidade especiais.','ARMA',{speed:[0,0,.05,.10,.10]}),
    ],
    artemis:[
      N('artemis_rising_aim','Mira Crescente','◉','artemisAim',V(.08,.10,.14,.18),'A cada três acertos consecutivos acumula chance crítica.','PRECISÃO'),
      N('artemis_perfect_hunt','Caçada Perfeita','🏹','artemisCritSpeed',V(.08,.12,.18,.25),'Críticos aumentam a velocidade de ataque por 2s.','CRÍTICO'),
      N('artemis_predator','Predador','♞','artemisDistance',V(.10,.16,.24,.35),'Quanto mais distante o alvo, maior o dano.','PRECISÃO'),
      N('artemis_weak_point','Ponto Fraco','⌖','artemisWeakPoint',V(.10,.15,.22,.30),'Acertos repetidos no mesmo alvo aumentam o dano recebido por ele.','CHEFE'),
      N('artemis_supreme_hunter','Caçadora Suprema','✧','artemisSupreme',V(.15,.25,.35,.50),'Críticos fortalecem o próximo ataque.','CRÍTICO'),
    ],
    poseidon:[
      N('poseidon_rising_tide','Maré Crescente','🌊','poseidonTide',V(.08,.12,.18,.25),'Acertos consecutivos acumulam dano de Maré.','COMBO'),
      N('poseidon_against_current','Contra a Corrente','↕','poseidonDirection',V(.08,.12,.18,.25),'Avançar concede dano; recuar concede velocidade.','MOVIMENTO'),
      N('poseidon_ocean_pressure','Pressão Oceânica','◉','poseidonPressure',V(.02,.03,.04,.05),'Cada três inimigos próximos concede resistência, até cinco níveis.','DEFESA'),
      N('poseidon_high_tide','Maré Alta','↑','poseidonHighHp',V(.10,.15,.22,.30),'Acima de 70% de vida, aumenta a velocidade de ataque.','RITMO',{speed:[0,0,0,0,.10]}),
      N('poseidon_relentless_tide','Maré Implacável','≈','poseidonRelentless',V(1,2,3,4),'No máximo da Maré, atrasa sua queda e pode conceder velocidade.','COMBO',{speed:[0,0,0,.08,.15]}),
    ],
    hercules:[
      N('hercules_first_labor','Primeiro Trabalho','💪','herculesKills',V(.02,.03,.04,.05),'Cada 15 eliminações na onda concede Força.','PROVAÇÃO',{max:[3,3,3,3,4]}),
      N('hercules_trial','Provação','♜','herculesElite',V(.12,.18,.25,.35),'Derrotar um elite fortalece o herói por 8s.','PROVAÇÃO',{defense:[0,0,0,.10,.15],speed:[0,0,0,0,.15]}),
      N('hercules_lion_skin','Pele do Leão','♌','herculesLowHp',V(.12,.18,.25,.35),'Abaixo de 25% de vida, aumenta a defesa.','DEFESA',{attack:[0,0,0,0,.15]}),
      N('hercules_rising_strength','Força Crescente','✊','herculesKillChain',V(.02,.03,.04,.05),'Abates separados por até 2s acumulam dano, até 5.','COMBO'),
      N('hercules_twelve_labors','Doze Trabalhos','★','herculesFeats',V(.01,.015,.02,.02),'Feitos durante a run concedem marcas permanentes, até 12.','PROGRESSÃO',{hp:[0,0,0,0,.01]}),
    ],
    sauron:[
      N('sauron_corrupting_power','Poder Corruptor','👁','sauronCorruption',V(.12,.18,.27,.40),'Sacrifica vida máxima para obter dano.','CORRUPÇÃO',{hpPenalty:V(.05,.07,.10,.12)}),
      N('sauron_domination','Dominação','♛','sauronDomination',V(.03,.04,.05,.06),'Eliminações consecutivas acumulam poder temporário.','COMBO',{max:[3,4,4,5,5]}),
      N('sauron_watchful_eye','Olho Vigilante','◉','sauronTarget',V(.12,.18,.26,.38),'Atacar repetidamente o mesmo alvo aumenta o dano contra ele.','CHEFE'),
      N('sauron_dark_will','Vontade Sombria','◼','sauronLowHp',V(.15,.22,.32,.45),'Quanto menor a vida, maior o dano.','RISCO',{defense:[0,0,0,0,.20]}),
      N('sauron_one_ring','Um Anel','◉','sauronRing',V(.08,.12,.18,.25),'Amplifica bônus de bênçãos, mas também suas penalidades.','RISCO',{penalty:V(.04,.05,.07,.10)}),
    ],
    nazgul:[
      N('nazgul_spectral_form','Forma Espectral','♟','nazgulDodge',V(.03,.05,.08,.12),'Concede chance de ignorar dano por completo.','ESQUIVA'),
      N('nazgul_dark_hunt','Caçada Sombria','🗡','nazgulAfterDash',V(.25,.40,.60,.90),'Depois do dash, fortalece o próximo ataque por 1,5s.','ASSASSINATO',{crit:[0,0,0,0,.25]}),
      N('nazgul_rising_terror','Terror Crescente','☠','nazgulKillSpeed',V(.04,.06,.08,.10),'Cada sequência de cinco abates sem dano concede velocidade, até 3 cargas.','COMBO'),
      N('nazgul_phantom_blade','Lâmina Fantasma','✦','nazgulCritDodge',V(.02,.03,.05,.08),'Críticos aumentam a esquiva por 2s.','CRÍTICO'),
      N('nazgul_relentless_specter','Espectro Implacável','◌','nazgulCycle',V(.20,.30,.45,.70),'Esquiva fortalece ataque; crítico fortalece esquiva.','COMBO',{dodge:[0,0,0,.03,.06]}),
    ],
    ents:[
      N('ents_growing_bark','Casca Crescente','🌳','entsWaveDefense',V(.01,.015,.02,.025),'Cada onda concluída aumenta permanentemente a defesa da run.','CRESCIMENTO',{max:V(.05,.075,.10,.15)}),
      N('ents_deep_roots','Raízes Profundas','♣','entsNoDash',V(.08,.12,.18,.25),'Após 3s sem dash, aumenta a defesa.','DEFESA',{damage:[0,0,0,0,.10]}),
      N('ents_ancestral_growth','Crescimento Ancestral','🌱','entsTempHp',V(.02,.03,.04,.05),'Cada 20 abates na onda aumenta temporariamente a vida máxima, até 5.','CRESCIMENTO'),
      N('ents_resilience','Resiliência','❧','entsResilience',V(.15,.22,.30,.40),'Perder mais de 20% da vida em 3s concede defesa por 3s.','DEFESA',{speed:[0,0,0,0,.15]}),
      N('ents_forest_elder','Ancião da Floresta','♚','entsElder',V(.10,.15,.20,.30),'Preserva uma parte do crescimento temporário obtido durante a onda.','CRESCIMENTO'),
    ],
  };
  for(const deity of DEITIES)deity.boons=NEW_DEITY_BOONS[deity.id]||deity.boons;


  global.MagoBlessingData=Object.freeze({
    DEITIES:Object.freeze(DEITIES),
    RARITY_ORDER:Object.freeze([...RARITY_ORDER]),
    RARITY_META:Object.freeze({...RARITY_META})
  });
})(window);
