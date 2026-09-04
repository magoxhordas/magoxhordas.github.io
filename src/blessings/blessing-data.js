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
  /* O catálogo v4 usa somente acontecimentos que existem no combate automático. */
  const H=(...hooks)=>({hooks});
  const NEW_DEITY_BOONS={
    zeus:[
      N('zeus_celestial_chain','Corrente Celeste','⚡','chainLightning',V(.35,.45,.58,.72),'Acertos carregam um raio; o disparo seguinte salta entre inimigos próximos.','DESCARGA',{hits:[6,6,5,4,3],targets:[1,1,2,3,4],...H('attack','hit')}),
      N('zeus_static_charge','Carga Estática','ϟ','staticCharge',V(.45,.55,.70,.90),'Acertos repetidos eletrificam o alvo até ele explodir em área.','ELETRICIDADE',{hits:[7,7,6,5,4],radius:[70,75,85,95,110],...H('hit')}),
      N('zeus_thunder_step','Passo Trovejante','☈','thunderStep',V(.55,.65,.80,1),'O dash carrega o próximo ataque automático com um raio em área.','DASH',{duration:[2.5,2.8,3.1,3.5,4],radius:[55,60,70,80,95],...H('dash','hit')}),
      N('zeus_storm_mark','Marca da Tempestade','✦','stormMark',V(.45,.55,.70,.90),'Críticos marcam o alvo; o próximo acerto consome a marca em uma descarga.','CRÍTICO',{targets:[0,0,1,2,3],...H('hit')}),
      N('zeus_last_storm','Última Tempestade','☇','lastStorm',V(.40,.50,.65,.80),'Abaixo de 35% de vida, ataques carregam trovões automáticos.','RISCO',{hits:[7,7,6,5,4],...H('attack','update')}),
    ],
    ares:[
      N('ares_blood_mark','Marca de Sangue','🩸','bloodMark',V(.45,.55,.70,.90),'Acertos no mesmo alvo abrem Feridas; no limite, elas explodem em área.','SANGRAMENTO',{hits:[7,7,6,5,4],radius:[65,70,80,95,110],...H('hit')}),
      N('ares_condemnation','Condenação','☠','condemnation',V(.80,1,1.25,1.55),'Cada acerto preenche uma sentença; no limite, ela causa dano atrasado.','EXECUÇÃO',{hits:[8,8,7,6,5],delay:[.65,.6,.55,.5,.4],...H('hit','update')}),
      N('ares_war_frenzy','Frenesi de Guerra','🔥','warFrenzy',V(.16,.20,.25,.32),'Eliminações rápidas acumulam Fúria e despertam Frenesi.','FRENESI',{kills:[5,5,4,4,3],duration:[3,3.5,4,4.5,5],...H('kill','update')}),
      N('ares_no_mercy','Sem Misericórdia','🗡','noMercy',V(.18,.22,.28,.35),'Inimigos comuns feridos entram em execução; chefes sofrem um golpe especial na vida crítica.','EXECUÇÃO',{threshold:[.15,.17,.2,.23,.27],...H('attack','hit')}),
      N('ares_pain_feeds_pain','Dor Alimenta Dor','⚔','retaliation',V(.30,.38,.48,.60),'Receber dano prepara cargas de Retaliação para os próximos ataques.','RETALIAÇÃO',{charges:[3,3,3,4,5],...H('damage','attack')}),
    ],
    hecate:[
      N('hecate_crossroads_curse','Maldição da Encruzilhada','🔮','curse',V(.55,.65,.80,1),'Ataques amaldiçoam o alvo; sua morte espalha uma explosão arcana.','MALDIÇÃO',{hits:[7,7,6,5,4],radius:[70,75,85,100,115],...H('hit','kill')}),
      N('hecate_arcane_echo','Eco Arcano','◈','arcaneEcho',V(.45,.52,.62,.75),'Depois de vários ataques, uma sombra repete automaticamente o último golpe.','ECO',{hits:[6,6,5,4,3],...H('attack','hit')}),
      N('hecate_witch_fire','Fogo das Bruxas','🔥','witchFire',V(.12,.15,.19,.24),'Críticos deixam uma chama violeta que fere inimigos próximos periodicamente.','RITUAL',{duration:[3,3.5,4,4.5,5],radius:[42,46,52,58,66],...H('hit','update')}),
      N('hecate_ritual_circle','Círculo Ritual','◌','ritualCircle',V(.35,.42,.52,.65),'Círculos surgem perto do herói; dentro deles, ataques criam projéteis arcanos extras.','RITUAL',{duration:[4,4.5,5,5.5,6],hits:[5,5,4,4,3],...H('attack','update')}),
      N('hecate_forbidden_knowledge','Conhecimento Proibido','☾','forbiddenKnowledge',V(.55,.65,.78,.92),'Sacrifica vida máxima para invocar uma sombra que repete ataques automaticamente.','RISCO',{hpPenalty:[.08,.08,.09,.10,.12],hits:[7,7,6,5,4],shadows:[1,1,1,1,2],...H('apply','attack','hit')}),
    ],
    selene:[
      N('selene_lunar_cycle','Ciclo Lunar','🌙','lunarCycle',V(.10,.13,.16,.20),'Alterna automaticamente entre Crescente, Cheia e Minguante, cada qual com uma regra.','FASES',{duration:[9,8.5,8,7.5,7],...H('update')}),
      N('selene_moonbeam','Raio de Luar','☄','moonbeam',V(.55,.68,.85,1.05),'Periodicamente, um raio lunar busca chefe, elite ou o inimigo mais forte.','LUAR',{cooldown:[6,5.5,5,4.5,4],...H('update')}),
      N('selene_moon_step','Passo Lunar','☽','moonStep',V(.35,.42,.52,.65),'O dash libera uma onda lunar que fere e empurra inimigos próximos.','DASH',{radius:[75,82,92,104,118],...H('dash')}),
      N('selene_eclipse','Eclipse','◒','eclipse',V(.18,.22,.28,.35),'Abaixo de 35% de vida, ativa pulsos lunares e proteção até a recuperação.','RISCO',{threshold:[.35,.36,.38,.40,.42],...H('update')}),
      N('selene_moon_harvest','Colheita da Lua','●','moonHarvest',V(.012,.015,.019,.024),'Na Lua Cheia, eliminações curam e apressam o próximo Raio de Luar.','SUSTENTAÇÃO',{cooldownCut:[.5,.65,.8,1,1.25],...H('kill')}),
    ],
    moros:[
      N('moros_predestined_strike','Golpe Predestinado','✴','predestinedStrike',V(.35,.42,.52,.65),'Ataques carregam o destino; o próximo golpe no limite é crítico garantido.','DESTINO',{hits:[7,7,6,5,4],...H('attack')}),
      N('moros_inevitable','Inevitável','◇','inevitable',V(.025,.032,.040,.050),'Ataques não críticos aumentam a chance do seguinte; um crítico zera o acúmulo.','CRÍTICO',{max:[.18,.22,.26,.30,.36],...H('attack','hit')}),
      N('moros_delayed_fate','Destino Adiado','⌛','delayedFate',V(.05,.06,.07,.10),'Uma vez por onda, dano fatal quebra o destino e devolve parte da vida.','SOBREVIVÊNCIA',{invuln:[.4,.55,.7,1,1.4],...H('lethal','wave')}),
      N('moros_fate_thread','Fio do Destino','⌁','fateThread',V(.60,.72,.88,1.08),'Acertos repetidos criam um fio no alvo; ao romper, causam dano especial.','DESTINO',{hits:[7,7,6,5,4],...H('hit')}),
      N('moros_omen','Presságio','▣','omen',V(.03,.05,.08,.12),'Melhora futuras ofertas; Lendária garante uma opção Rara ou superior.','PROGRESSÃO',{...H('offer','apply')}),
    ],
    atena:[
      N('atena_counterattack','Contra-Ataque','🛡','counterattack',V(.45,.55,.70,.90),'Após o dash, o próximo ataque automático se torna um Contra-Ataque.','CONTRA-ATAQUE',{duration:[2.5,2.8,3.1,3.5,4],...H('dash','attack')}),
      N('atena_living_aegis','Égide Viva','◩','livingAegis',V(.30,.38,.48,.60),'Após ficar ileso, a Égide reduz o próximo golpe e libera uma onda defensiva.','DEFESA',{cooldown:[7,6.5,6,5.5,5],...H('damage','update')}),
      N('atena_perfect_stance','Postura Perfeita','♜','perfectStance',V(.018,.022,.028,.035),'Tempo sem dano acumula até cinco cargas de Postura, removidas ao ser atingido.','PRECISÃO',{interval:[3,2.8,2.5,2.2,2],...H('damage','update')}),
      N('atena_tactical_breach','Brecha Tática','⌖','tacticalBreach',V(.55,.68,.85,1.05),'Acertos repetidos revelam uma Brecha; o ataque seguinte a consome.','TÁTICA',{hits:[7,7,6,5,4],...H('hit','attack')}),
      N('atena_last_defense','Última Defesa','⚖','lastDefense',V(.65,.78,.95,1.15),'Um golpe pesado prepara Retaliação e uma breve proteção contra mortes em cadeia.','DEFESA',{threshold:[.28,.26,.24,.22,.20],...H('damage','attack')}),
    ],
    hermes:[
      N('hermes_momentum','Momentum','🪽','momentum',V(.12,.15,.19,.24),'Mover-se continuamente enche Momentum; parar o dissipa.','MOVIMENTO',{...H('update')}),
      N('hermes_lightning_attack','Ataque Relâmpago','≋','lightningAttack',V(.40,.50,.65,.82),'O dash prepara dano adicional para o próximo ataque automático.','DASH',{duration:[2.5,2.8,3.1,3.5,4],...H('dash','attack')}),
      N('hermes_living_mercury','Mercúrio Vivo','➟','livingMercury',V(.025,.032,.04,.05),'Acertos reduzem a recarga atual do dash, respeitando um limite por segundo.','RITMO',{cap:[.15,.18,.22,.27,.33],...H('hit')}),
      N('hermes_afterimage','Pós-Imagem','»','afterimage',V(.42,.50,.62,.75),'Dash cria uma cópia espectral que repete o próximo ataque.','ECO',{images:[1,1,1,2,2],...H('dash','hit')}),
      N('hermes_divine_flow','Fluxo Divino','➶','divineFlow',V(.08,.10,.13,.16),'Sequências automáticas de dash e ataque acumulam Fluxo, melhorando movimento e dash.','RITMO',{max:[3,3,4,4,5],...H('dash','attack','update')}),
    ],
    dionisio:[
      N('dionisio_hangover','Ressaca','🍷','hangover',V(.48,.58,.72,.90),'Ataques acumulam Ressaca visível no inimigo até ela explodir.','RESSACA',{hits:[7,7,6,5,4],radius:[60,68,78,90,105],...H('hit')}),
      N('dionisio_euphoria','Euforia','☺','euphoria',V(.10,.13,.17,.22),'Eliminações podem conceder dano, ataque ou movimento temporariamente.','CAOS',{duration:[3,3.5,4,4.5,5],...H('kill','update')}),
      N('dionisio_double_toast','Brinde Duplo','🥂','doubleToast',V(.18,.25,.35,.48),'Efeitos temporários de Dionísio duram mais e podem coexistir.','BUFF',{...H('apply','update')}),
      N('dionisio_blackout','Apagão','◉','blackout',V(.75,.90,1.10,1.35),'Três buffs diferentes preparam uma explosão violenta na próxima eliminação.','EXPLOSÃO',{radius:[85,95,108,122,140],...H('kill','update')}),
      N('dionisio_last_round','Última Rodada','♫','lastRound',V(.012,.015,.019,.024),'Com vida baixa, sequências curtas de eliminações curam e concedem Euforia.','RISCO',{kills:[4,4,3,3,2],...H('kill')}),
    ],
    hefesto:[
      N('hefesto_anvil_strike','Golpe da Bigorna','🔨','anvilStrike',V(.60,.72,.90,1.12),'Ataques carregam uma bigorna espectral que cai no alvo e explode em área.','IMPACTO',{hits:[7,7,6,5,4],radius:[65,72,82,95,110],...H('attack','hit')}),
      N('hefesto_overheat','Superaquecimento','♨','overheat',V(.48,.58,.72,.90),'Cada arma aquece com seus próprios ataques; no máximo, seu próximo golpe explode.','CALOR',{hits:[8,8,7,6,5],...H('attack','hit')}),
      N('hefesto_forge_shards','Estilhaços da Forja','✦','forgeShards',V(.28,.35,.44,.55),'Críticos letais lançam fragmentos metálicos contra inimigos próximos.','METAL',{targets:[1,1,2,3,4],...H('kill')}),
      N('hefesto_masterpiece','Obra-Prima','◆','masterpiece',V(.50,.62,.78,.98),'A arma equipada de maior raridade recebe um ataque metálico especial periódico.','ARMA',{hits:[8,8,7,6,5],...H('attack','hit')}),
      N('hefesto_forged_core','Núcleo Forjado','⛨','forgedCore',V(.35,.42,.52,.65),'Ataques carregam uma placa de Armadura Forjada que absorve o próximo impacto.','DEFESA',{hits:[10,10,9,8,7],charges:[1,1,1,2,2],...H('attack','damage')}),
    ],
    artemis:[
      N('artemis_hunt_mark','Marca da Caçada','🏹','huntMark',V(.08,.10,.13,.16),'Marca automaticamente chefe, elite ou inimigo mais forte; acertos carregam um crítico.','PRESA',{hits:[6,6,5,4,3],...H('attack','hit','kill','update')}),
      N('artemis_ricochet_arrow','Flecha Ricochete','➶','ricochetArrow',V(.35,.42,.52,.65),'Críticos ricocheteiam automaticamente em inimigos próximos.','CRÍTICO',{targets:[1,1,2,3,4],...H('hit')}),
      N('artemis_deadly_distance','Distância Mortal','⌖','deadlyDistance',V(.12,.16,.22,.30),'Golpes distantes atravessam faixas crescentes de potência e feedback visual.','DISTÂNCIA',{...H('attack')}),
      N('artemis_weak_point','Ponto Fraco','◉','weakPoint',V(.55,.68,.85,1.05),'Acertos repetidos acumulam vulnerabilidade; no máximo, a marca estoura.','PRECISÃO',{hits:[7,7,6,5,4],...H('hit')}),
      N('artemis_arrow_rain','Chuva de Flechas','☄','arrowRain',V(.30,.38,.48,.60),'Uma sequência de críticos dispara uma saraivada espectral contra inimigos próximos.','CRÍTICO',{hits:[5,5,4,4,3],targets:[3,3,4,5,6],...H('hit')}),
    ],
    poseidon:[
      N('poseidon_impact_wave','Onda de Impacto','🌊','impactWave',V(.42,.52,.65,.82),'Ataques carregam uma onda no alvo que causa dano e empurra a horda.','ONDA',{hits:[7,7,6,5,4],radius:[70,78,88,100,115],...H('attack','hit')}),
      N('poseidon_combat_current','Correnteza de Combate','≋','combatCurrent',V(.30,.38,.48,.60),'O dash libera uma onda ao redor do herói e afasta inimigos.','EMPURRÃO',{radius:[75,82,92,104,118],...H('dash')}),
      N('poseidon_rising_tide','Maré Crescente','↑','risingTide',V(.10,.13,.17,.22),'Acertos contínuos enchem uma Maré visível que fortalece efeitos aquáticos.','MARÉ',{decay:[2,2.3,2.6,3,3.5],...H('hit','update')}),
      N('poseidon_abyssal_pressure','Pressão Abissal','◉','abyssalPressure',V(.50,.62,.78,.98),'Inimigos empurrados acumulam Pressão até sofrer um esmagamento aquático.','PRESSÃO',{hits:[4,4,3,3,2],...H('hit')}),
      N('poseidon_rough_sea','Mar Revolto','≈','roughSea',V(.35,.42,.52,.65),'Com vários inimigos próximos, ondas circulares periódicas protegem o jogador.','HORDA',{near:[6,6,5,5,4],cooldown:[6,5.5,5,4.5,4],...H('update')}),
    ],
    hercules:[
      N('hercules_labors','Trabalhos de Hércules','💪','labors',V(.05,.065,.08,.10),'Eliminações durante a onda concluem Trabalhos e fortalecem feitos heroicos.','TRABALHOS',{kills:[12,11,10,9,8],max:[3,3,4,4,5],...H('kill','wave')}),
      N('hercules_titanic_strike','Golpe Titânico','✊','titanicStrike',V(.55,.68,.85,1.05),'Ataques carregam uma grande onda de impacto ao redor do alvo.','FORÇA',{hits:[7,7,6,5,4],radius:[70,78,90,104,120],...H('attack','hit')}),
      N('hercules_monster_trophy','Troféu de Monstro','♜','monsterTrophy',V(.12,.16,.21,.27),'Eliminar elite ou chefe concede um troféu temporário claramente visível.','MONSTRO',{duration:[5,6,7,8,10],...H('kill','update')}),
      N('hercules_lion_skin','Pele do Leão','♌','lionSkin',V(.22,.28,.35,.44),'Abaixo de 30% de vida, ativa proteção e reforça Golpes Titânicos.','RISCO',{...H('update')}),
      N('hercules_rising_strength','Força Crescente','★','risingStrength',V(.60,.72,.88,1.08),'Eliminações rápidas acumulam Força; no máximo, a próxima morte gera uma onda.','COMBO',{kills:[5,5,4,4,3],...H('kill')}),
    ],
    sauron:[
      N('sauron_corrupting_power','Poder Corruptor','👁','corruption',V(.12,.16,.21,.27),'Sacrifica vida máxima; eliminações enchem Corrupção e o poder vem do medidor.','CORRUPÇÃO',{hpPenalty:[.06,.07,.08,.10,.12],...H('apply','kill','update')}),
      N('sauron_watchful_eye','Olho Vigilante','◉','watchfulEye',V(.60,.72,.88,1.08),'Acertos repetidos fazem o Olho focar e explodir o alvo.','DOMINAÇÃO',{hits:[7,7,6,5,4],...H('hit')}),
      N('sauron_domination','Dominação','♛','domination',V(.28,.35,.44,.55),'Eliminações consecutivas acumulam Dominação; no máximo, mortes geram ondas sombrias.','DOMINAÇÃO',{kills:[5,5,4,4,3],...H('kill')}),
      N('sauron_one_ring','O Anel','◉','oneRing',V(.16,.20,.25,.32),'Amplifica apenas as bênçãos de Sauron e também as penalidades delas.','RISCO',{...H('apply')}),
      N('sauron_mordor_terror','Terror de Mordor','◼','mordorTerror',V(.38,.48,.60,.75),'Abaixo de 50% de vida, ataques periódicos liberam ondas de Terror.','TERROR',{hits:[7,7,6,5,4],...H('attack','update')}),
    ],
    nazgul:[
      N('nazgul_spectral_form','Forma Espectral','♟','spectralForm',V(.035,.05,.075,.11),'Pode ignorar dano, tornar o herói espectral e liberar um corte sombrio.','ESQUIVA',{...H('dodge')}),
      N('nazgul_phantom_strike','Golpe Fantasma','🗡','phantomStrike',V(.45,.55,.70,.90),'O dash prepara um corte sombrio no próximo ataque automático.','ASSASSINATO',{duration:[2.5,2.8,3.1,3.5,4],...H('dash','attack')}),
      N('nazgul_rising_terror','Terror Crescente','☠','risingTerror',V(.05,.065,.08,.10),'Cada cinco eliminações sem dano concede Terror; dano remove uma carga.','TERROR',{max:[3,3,4,4,5],...H('kill','damage','update')}),
      N('nazgul_phantom_blade','Lâmina Fantasma','✦','phantomBlade',V(.025,.035,.05,.07),'Críticos concedem chance espectral e reduzem a recarga do dash.','CRÍTICO',{duration:[2.5,3,3.5,4,5],...H('hit')}),
      N('nazgul_relentless_hunt','Caçada Implacável','➟','relentlessHunt',V(.28,.35,.44,.55),'Inimigos abaixo de 35% sofrem dano sombrio; mortes reduzem o dash.','EXECUÇÃO',{threshold:[.32,.34,.36,.38,.40],...H('attack','kill')}),
    ],
    ents:[
      N('ents_growing_bark','Casca Crescente','🌳','growingBark',V(.012,.016,.021,.027),'Cada onda concluída engrossa a Casca e aumenta a proteção até o limite.','CRESCIMENTO',{max:[.07,.08,.10,.12,.15],...H('wave')}),
      N('ents_deep_roots','Raízes Profundas','♣','deepRoots',V(.18,.22,.28,.35),'Sem usar dash, o herói enraíza, resiste e raízes atacam inimigos próximos.','RAÍZES',{delay:[3.5,3.3,3,2.7,2.4],...H('dash','update')}),
      N('ents_ancestral_seed','Semente Ancestral','🌱','ancestralSeed',V(.025,.032,.04,.05),'Eliminações cultivam Sementes que aumentam temporariamente a vida na onda.','CRESCIMENTO',{kills:[12,11,10,9,8],max:[3,3,4,4,5],...H('kill','wave')}),
      N('ents_resilience','Resiliência','❧','resilience',V(.24,.30,.38,.48),'Perder muita vida em poucos segundos ativa redução de dano com recarga própria.','DEFESA',{duration:[3,3.5,4,4.5,5],...H('damage','update')}),
      N('ents_forest_heart','Coração da Floresta','♥','forestHeart',V(.035,.045,.055,.07),'Tempo sem dano carrega o Coração; quando pronto, o bosque pulsa e cura.','SUSTENTAÇÃO',{charge:[12,11,10,9,8],...H('damage','update')}),
    ],
  };

  const PROGRESSION={
    zeus:{resonance:['Tempestade Crescente','Descargas deixam eletricidade residual e aceleram as próximas ativações.'],ascensions:[['avatar','Avatar da Tempestade','Efeitos elétricos ganham salto, área e carga residual.'],['judgment','Julgamento do Olimpo','Eliminações invocam uma tempestade distribuída pela arena.']],apotheosis:['Senhor da Tempestade','Eliminações iniciam uma Tempestade Total com raios periódicos.']},
    ares:{resonance:['Guerra sem Fim','Explosões de Sangue e Condenação espalham Feridas.'],ascensions:[['war_god','Deus da Guerra','Frenesi exige menos cargas e Retaliação ganha carga extra.'],['blood_feast','Banquete de Sangue','Explosões maiores espalham Feridas e restauram vida.']],apotheosis:['Guerra Encarnada','Frenesi máximo desperta execuções, explosões e Retaliação renovável.']},
    hecate:{resonance:['Encantamento Profundo','Maldições e Ecos se alimentam dentro dos Círculos.'],ascensions:[['triple_goddess','Deusa Tríplice','Alterna Jovem, Mãe e Anciã, mudando Ecos, Círculos e Maldições.'],['endless_night','Noite sem Fim','Maldições se espalham e sombras atacam em sequência.']],apotheosis:['Noite das Encruzilhadas','Três Hécates espectrais conjuram Eco, Maldição e Fogo.']},
    selene:{resonance:['Maré Lunar','Toda mudança de fase libera um pulso lunar correspondente.'],ascensions:[['blood_moon','Lua de Sangue','Lua Cheia cria explosões e acelera o Raio de Luar.'],['eternal_eclipse','Eclipse Eterno','A fase anterior persiste e o Eclipse começa mais cedo.']],apotheosis:['Convergência Lunar','Três ciclos completos ativam todas as fases parcialmente.']},
    moros:{resonance:['Destino Entrelaçado','Críticos Predestinados e Fios rompidos carregam um ao outro.'],ascensions:[['sealed_fate','Destino Selado','Golpes Predestinados provocam uma segunda ruptura.'],['rewrite_fate','Reescrever o Destino','Destino Adiado prepara três críticos garantidos.']],apotheosis:['Última Página','Vida crítica acelera Inevitável, Predestinação e fragmentos dos Fios.']},
    atena:{resonance:['Clareza de Batalha','Brechas e Contra-Ataques concedem Postura temporária.'],ascensions:[['absolute_aegis','Égide Absoluta','Égide e Contra-Ataque liberam ondas maiores e proteção no dash.'],['strategist','Estratega','Eliminações ilesas concedem Medalhas que fortalecem Atena.']],apotheosis:['Batalha Perfeita','Postura ou Medalhas máximas preparam uma grande onda tática no dash.']},
    hermes:{resonance:['Não Pare','Momentum elevado amplia a redução de recarga por acertos.'],ascensions:[['divine_speed','Velocidade Divina','Fluxo máximo acelera violentamente o dash.'],['afterimage_army','Exército de Pós-Imagens','Cada dash cria duas cópias que buscam alvos.']],apotheosis:['Mensageiro Impossível','Fluxo máximo cria pós-imagens automáticas e rastros de dash.']},
    dionisio:{resonance:['A Festa Começou','Explosões de Ressaca podem conceder Euforia.'],ascensions:[['endless_party','Festa sem Fim','Buffs podem renovar e juntos ativam um estado especial.'],['collective_delirium','Delírio Coletivo','Ressaca se espalha e Apagão ganha alcance.']],apotheosis:['Grande Banquete','Eliminações iniciam Festa Total com buffs, Ressaca e explosões.']},
    hefesto:{resonance:['Forja Acesa','Bigorna e Superaquecimento também lançam Estilhaços.'],ascensions:[['living_forge','Forja Viva','Todas as armas recebem seu próprio efeito de Obra-Prima.'],['volcano_hammer','Martelo de Vulcano','Bigorna e Calor atingem novamente com área maior.']],apotheosis:['Forja Divina','Eliminações sobrecarregam todas as armas para efeitos especiais.']},
    artemis:{resonance:['Instinto da Caçadora','A Marca salta para a próxima presa já parcialmente carregada.'],ascensions:[['wild_hunt','Caçada Selvagem','Ricochetes atingem mais alvos e Presas se renovam.'],['moon_arrow','Flecha da Lua','Cada quarto acerto na Presa atravessa inimigos.']],apotheosis:['Grande Caçada','Eliminações marcam três Presas e aceleram todo o ciclo de caça.']},
    poseidon:{resonance:['Corrente Dominante','Ondas aplicam Pressão e a Maré demora mais para cair.'],ascensions:[['tsunami','Tsunami','Ondas enormes empurram e esmagam mais rápido.'],['raging_seas','Mares Revoltos','Maré máxima fica estável e todo dash cria Onda de Impacto.']],apotheosis:['Dilúvio','Maré máxima invoca ondas que atravessam toda a arena.']},
    hercules:{resonance:['Novo Trabalho','Completar Trabalho dispara um Golpe Titânico gratuito.'],ascensions:[['demigod','Semideus','Golpe Titânico exige menos ataques e Troféus duram mais.'],['thirteenth_labor','Décimo Terceiro Trabalho','Feitos especiais geram até doze Marcas Heroicas.']],apotheosis:['Herói do Olimpo','Concluir todos os Trabalhos ativa Estado Heroico.']},
    sauron:{resonance:['A Sombra Cresce','Eliminar alvo do Olho concede Dominação.'],ascensions:[['ring_lord','Senhor do Anel','O Anel amplifica Sauron com sacrifício adicional de vida.'],['dark_lord','Senhor Sombrio','Dominação máxima transforma mortes em explosões.']],apotheosis:['Mordor Ascendente','Dominação máxima ativa Terror, ondas, Olho automático e Corrupção.']},
    nazgul:{resonance:['Predador Espectral','Forma Espectral prepara Golpe Fantasma.'],ascensions:[['the_nine','Os Nove','Cada nove eliminações convoca nove sombras agressoras.'],['witch_king','Rei Bruxo','Esquiva garante crítico e Golpe Fantasma ganha área.']],apotheosis:['Cavaleiros Negros','Terror máximo faz cada dash invocar um Cavaleiro Espectral.']},
    ents:{resonance:['Solo Fértil','Enraizado, o Coração da Floresta carrega mais rápido.'],ascensions:[['awakened_forest','Floresta Desperta','Coração causa dano e Raízes atacam mais.'],['last_shepherd','Último Pastor','Casca e Sementes preservam parte do crescimento.']],apotheosis:['Marcha dos Ents','Tempo ileso invoca três Ents espectrais que atacam automaticamente.']},
  };
  for(const deity of DEITIES){deity.boons=NEW_DEITY_BOONS[deity.id]||deity.boons;deity.progression=PROGRESSION[deity.id];}


  global.MagoBlessingData=Object.freeze({
    DEITIES:Object.freeze(DEITIES),
    RARITY_ORDER:Object.freeze([...RARITY_ORDER]),
    RARITY_META:Object.freeze({...RARITY_META}),
    PROGRESSION:Object.freeze(PROGRESSION)
  });
})(window);
