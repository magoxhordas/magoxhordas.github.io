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
const V=(common,rare,epic,legendary,digits=4)=>[
common,Number(((common+rare)/2).toFixed(digits)),rare,epic,legendary
];
const D=(id,name,title,image,icon,dialogues,boons)=>({id,name,title,image,icon,dialogues,boons});
const B=(id,name,icon,type,values,desc,role='DANO',extra={})=>({id,name,icon,type,values,desc,role,...extra});
const A=(id,name,icon,desc,role='ASCENSÃO',extra={})=>({id,name,icon,desc,role,isAscension:true,...extra});
const DEITIES=[
D('zeus','ZEUS','DEUS DO TROVÃO','assets/deities/zeus.png','⚡',[
'Erga sua arma. Quero ver se há algo de divino em você.',
'Os céus observam sua batalha. Não os decepcione.',
'Uma tempestade não pede licença. Você também não deveria.',
'Faça cada golpe anunciar o próximo trovão.',
'Se vai carregar meu poder, faça o campo inteiro ouvi-lo.'
],[
B('zeus_chain_lightning','Corrente Celeste','⚡','chain',V(.35,.50,.65,.80),'Uma sequência de acertos descarrega um raio que salta para inimigos próximos.','TEMPESTADE',{hits:[5,5,4,4,3],chains:[1,1,2,2,3],radius:[145,155,165,180,195]}),
B('zeus_static_charge','Carga Estática','ϟ','static',V(.45,.60,.80,1.05),'Acertar o mesmo alvo acumula eletricidade; no limite, a carga explode ao redor dele.','TEMPESTADE',{hits:[5,5,4,4,3],radius:[80,90,100,115,130]}),
B('zeus_thunder_dash','Passo Trovejante','➟','dashProc',V(.45,.60,.80,1.05),'Depois do dash, seu próximo golpe chama um trovão no ponto de impacto.','RITMO',{radius:[70,80,90,105,120]}),
B('zeus_storm_mark','Marca da Tempestade','✦','critMark',V(.40,.55,.75,1.00),'Críticos marcam o alvo; o próximo golpe consome a marca em uma descarga brutal.','CRÍTICO',{radius:[60,70,80,95,110]}),
B('zeus_last_storm','Última Tempestade','☈','lowHpProc',V(.40,.55,.75,1.00),'Abaixo de 35% de vida, golpes carregam um trovão automático com muito mais frequência.','RISCO',{hits:[5,5,4,4,3],threshold:.35,radius:[75,85,95,110,125]})
]),
D('ares','ARES','DEUS DA GUERRA','assets/deities/ares.png','⚔',[
'Finalmente. Alguém disposto a sujar as mãos.',
'Pare de contar golpes. Faça cada um deixar uma cicatriz.',
'Toda batalha termina quando alguém decide que já sangrou o bastante.',
'Eles ainda respiram? Então você ainda não terminou.',
'A guerra recompensa quem transforma dor em impulso.'
],[
B('ares_blood_mark','Marca de Sangue','🩸','blood',V(.025,.035,.045,.06),'Acertos no mesmo alvo abrem feridas. Cada marca aumenta o dano e, no limite, causa uma explosão de sangue.','SANGRAMENTO',{max:[5,5,5,5,5],burst:V(.55,.70,.90,1.15),radius:[65,75,85,100,115]}),
B('ares_doom','Condenação','☠','doom',V(.75,1.00,1.30,1.70),'O alvo acumula presságios de morte. Ao completar a sequência, a Condenação detona de uma vez.','EXECUÇÃO',{hits:[6,6,5,5,4]}),
B('ares_rampage','Frenesi de Guerra','🔥','rampage',V(.10,.14,.18,.24),'Abates rápidos acumulam Fúria. No limite, você entra em Frenesi e precisa continuar matando para mantê-lo.','COMBO',{stacks:[5,5,5,4,4],duration:[5000,5200,5500,6000,6500],attack:V(.10,.14,.20,.28)}),
B('ares_execution','Sem Misericórdia','🗡','execution',V(.12,.18,.25,.35),'Inimigos feridos entram em zona de execução. Alvos comuns podem ser finalizados instantaneamente.','EXECUÇÃO',{threshold:[.12,.14,.16,.18,.20],bossBonus:V(.12,.18,.25,.35)}),
B('ares_retaliation','Dor Alimenta Dor','⚔','retaliation',V(.20,.28,.38,.52),'Sofrer dano carrega três golpes de Retaliação. Cada golpe devolve a dor com força aumentada.','RISCO',{charges:[3,3,3,3,4]})
]),
D('hecate','HÉCATE','DEUSA DA MAGIA','assets/deities/hecate.png','🔮',[
'Magia não é força. É entender qual regra merece ser quebrada.',
'Troque o caminho, altere o padrão e verá o impossível responder.',
'Uma maldição bem colocada vale mais que dez golpes apressados.',
'A noite guarda ecos de tudo que foi lançado nela.',
'Há poder em repetir aquilo que o mundo jurou que aconteceria apenas uma vez.'
],[
B('hecate_hex','Selo da Encruzilhada','☾','hex',V(.55,.75,1.00,1.35),'Trocar de arma ao atacar um alvo selado detona uma maldição arcana.','MAGIA',{marks:[2,2,2,1,1],radius:[70,80,90,105,120]}),
B('hecate_arcane_echo','Eco Arcano','🔮','echo',V(.35,.50,.70,.95),'Uma sequência de ataques faz o último golpe acontecer novamente como um eco mágico.','MAGIA',{hits:[6,6,5,5,4]}),
B('hecate_triple_path','Tríplice Caminho','△','triple',V(.18,.24,.32,.42),'Usar três fontes de ataque diferentes desperta Tríplice Poder por alguns segundos.','COMBO',{sources:[3,3,3,3,3],duration:[3500,4000,4500,5000,5500]}),
B('hecate_witchfire','Fogo das Bruxas','✧','critSplash',V(.35,.50,.70,.95),'Críticos abrem uma chama violeta que atinge inimigos ao redor do alvo.','CRÍTICO',{radius:[85,95,105,120,135],targets:[2,2,3,3,4]}),
B('hecate_forbidden','Conhecimento Proibido','◈','forbidden',V(.55,.75,1.00,1.35),'Sacrifica vida máxima. Em troca, ataques periódicos são repetidos por uma sombra arcana.','RISCO',{hpPenalty:V(.05,.07,.10,.12),hits:[7,7,6,5,4]})
]),
D('selene','SELENE','DEUSA DA LUA','assets/deities/selene.png','☾',[
'A lua não fica mais forte. Ela apenas revela forças diferentes.',
'Aprenda a lutar com o ciclo, não contra ele.',
'Há momentos de correr, de atacar e de resistir.',
'A noite sempre encontra uma maneira de voltar.',
'Quando a luz desaparecer, descubra o que o eclipse desperta em você.'
],[
B('selene_lunar_cycle','Ciclo Lunar','◐','phases',V(.10,.14,.19,.25),'Crescente concede movimento, Cheia concede dano e Minguante concede defesa. As fases mudam sozinhas.','FASES',{duration:[8500,8200,7800,7400,7000]}),
B('selene_moonbeam','Raio de Luar','☾','periodic',V(.55,.75,1.00,1.35),'Periodicamente, a lua atinge automaticamente o inimigo mais próximo.','LUAR',{cooldown:[6500,6000,5500,5000,4400],range:[220,240,260,285,310]}),
B('selene_lunar_step','Passo Lunar','☽','dashPulse',V(.40,.55,.75,1.00),'O dash libera uma onda de luar ao redor do herói.','MOVIMENTO',{radius:[80,90,100,115,130]}),
B('selene_eclipse','Eclipse','◒','eclipse',V(.16,.22,.30,.40),'Abaixo de 35% de vida, ativa Eclipse: dano e defesa aumentam e pulsos lunares passam a ferir inimigos próximos.','RISCO',{defense:V(.10,.14,.19,.25),pulse:V(.25,.35,.50,.70),cooldown:[4500,4200,3900,3500,3000],threshold:.35}),
B('selene_moon_harvest','Colheita da Lua','🌙','moonHarvest',V(.008,.012,.018,.025),'Abates durante Lua Cheia curam e aceleram o próximo Raio de Luar.','SUSTENTAÇÃO',{cooldownCut:[500,650,800,1000,1200]})
]),
D('moros','MOROS','DEUS DO DESTINO','assets/deities/moros.png','⌛',[
'Seu próximo golpe já aconteceu. Você apenas ainda não chegou até ele.',
'O acaso é confortável para quem não consegue enxergar o padrão.',
'Alguns fins podem ser adiados. Outros apenas ficam mais caros.',
'Cada erro escreve uma linha. Cada acerto fecha um capítulo.',
'Vamos descobrir quanto tempo consegue lutar contra a última página.'
],[
B('moros_fated_crit','Golpe Predestinado','◇','fatedCrit',V(.30,.40,.55,.75),'Um ataque periódico é crítico garantido e recebe dano crítico adicional.','DESTINO',{hits:[8,8,7,6,5]}),
B('moros_inevitable','Inevitável','✴','critPity',V(.025,.035,.05,.07),'Cada ataque que não é crítico aumenta a chance do próximo. Um crítico zera a sequência.','CRÍTICO',{cap:[.20,.24,.27,.30,.35]}),
B('moros_delayed_fate','Destino Adiado','⌛','revive',V(.08,.10,.12,.16),'Uma vez por onda, dano fatal deixa você vivo e invulnerável por um instante.','SOBREVIVÊNCIA',{invuln:[500,650,850,1100,1500]}),
B('moros_thread','Fio do Destino','⌁','fateThread',V(.55,.75,1.00,1.35),'Acertar repetidamente o mesmo alvo estica o fio do destino até ele se romper em dano adicional.','DESTINO',{hits:[6,6,5,5,4]}),
B('moros_omen','Presságio','▣','rarity',V(.03,.05,.08,.12),'As ofertas futuras inclinam o destino para raridades maiores; no Lendário, a próxima oferta garante ao menos uma Rara.','PROGRESSÃO')
]),
D('atena','ATENA','DEUSA DA SABEDORIA','assets/deities/atena.png','🛡',[
'Vencer não significa atacar mais. Significa escolher melhor o instante.',
'O golpe evitado também faz parte do seu ataque.',
'Defesa sem resposta é apenas atraso.',
'Observe, desvie e devolva.',
'Uma batalha perfeita é construída em pequenas decisões corretas.'
],[
B('atena_counter_dash','Contra-Ataque','🛡','dashCounter',V(.45,.60,.85,1.15),'Depois do dash, o próximo ataque fica carregado. Se o dash realmente evitou dano, o contra-ataque fica ainda mais forte.','TÉCNICA',{perfect:V(.25,.35,.50,.70)}),
B('atena_aegis','Égide Viva','◩','aegis',V(.25,.35,.48,.65),'Após alguns segundos sem sofrer dano, o próximo golpe recebido é reduzido e libera uma resposta ao redor do herói.','DEFESA',{ready:[6500,6200,5800,5400,5000],pulse:V(.35,.50,.70,.95),radius:[85,95,105,120,135]}),
B('atena_perfect_stance','Postura Perfeita','♜','stance',V(.025,.035,.05,.07),'Ficar ileso acumula Postura. As cargas aumentam defesa e precisão; sofrer dano remove parte delas.','TÉCNICA',{max:[4,4,5,5,5],damage:V(.01,.015,.02,.03)}),
B('atena_tactical_mark','Brecha Tática','⌖','tactical',V(.55,.75,1.00,1.35),'Acertos repetidos revelam uma brecha. Trocar a fonte do ataque consome a marca em um golpe calculado.','TÉCNICA',{hits:[6,6,5,5,4]}),
B('atena_last_parry','Última Defesa','⚖','parry',V(.45,.60,.85,1.15),'Receber um golpe pesado prepara uma Retaliação imediata e concede uma janela curta de invulnerabilidade.','RISCO',{threshold:[.20,.18,.16,.14,.12],invuln:[200,250,300,350,450]})
]),
D('hermes','HERMES','DEUS DOS VIAJANTES','assets/deities/hermes.png','🪽',[
'Tudo fica mais simples quando o inimigo ainda está procurando onde você estava.',
'Ataque, mova, ataque de novo. Parece fácil quando se faz direito.',
'O segredo não é correr. É nunca perder o ritmo.',
'Um dash parado é desperdício de velocidade.',
'Vamos transformar movimento em arma.'
],[
B('hermes_momentum','Momentum','🪽','momentum',V(.12,.16,.22,.30),'Mover-se continuamente acumula velocidade. Parar faz o Momentum desaparecer.','MOVIMENTO',{build:[.035,.04,.045,.05,.06]}),
B('hermes_dash_strike','Ataque Relâmpago','➟','dashStrike',V(.45,.60,.85,1.15),'Depois do dash, o próximo ataque recebe um grande impulso de dano.','RITMO',{window:[1400,1500,1600,1800,2000]}),
B('hermes_quicksilver','Mercúrio Vivo','≋','dashReduce',V(.035,.05,.07,.10),'Acertos cortam a recarga atual do dash. O efeito possui limite por segundo para não travar o tempo.','UTILIDADE',{perSecond:[180,210,240,280,340]}),
B('hermes_afterimage','Pós-Imagem','»','afterimage',V(.35,.50,.70,.95),'O dash cria uma pós-imagem. Seu próximo ataque é repetido por ela com parte do dano.','MOVIMENTO',{charges:[1,1,1,2,2]}),
B('hermes_flow','Fluxo Divino','➶','flow',V(.08,.11,.15,.20),'Alternar ataque e dash acumula Fluxo. No máximo, movimento e ataque aceleram até o ritmo ser quebrado.','COMBO',{max:[5,5,5,5,4],duration:[3000,3300,3600,4000,4500],attack:V(.10,.14,.20,.28)})
]),
D('dionisio','DIONÍSIO','DEUS DO VINHO','assets/deities/dionisio.png','🍷',[
'Se vai entrar numa confusão, pelo menos faça a confusão trabalhar por você.',
'Cinco doses no mesmo inimigo e até ele começa a enxergar dobrado.',
'Os outros chamam de falta de controle. Eu chamo de variedade.',
'Uma festa boa melhora quando ninguém sabe exatamente o que vem depois.',
'Relaxe. O caos também sabe lutar.'
],[
B('dionisio_hangover','Ressaca','🍷','hangover',V(.45,.60,.80,1.05),'Acertos acumulam Ressaca no alvo. No limite, a bebida cobra a conta em uma explosão.','RESSACA',{stacks:[5,5,5,4,4],radius:[70,80,90,105,120]}),
B('dionisio_party','Euforia','🎉','randomBuff',V(.16,.22,.30,.40),'Abates podem conceder aleatoriamente dano, ataque ou movimento por alguns segundos.','CAOS',{power:V(.08,.10,.13,.17),duration:[3500,3800,4200,4600,5200]}),
B('dionisio_double_toast','Brinde Duplo','🥂','buffDuration',V(.20,.30,.45,.65),'Todos os bônus temporários de Dionísio duram mais e podem se sobrepor.','CAOS'),
B('dionisio_blackout','Apagão','♬','buffBurst',V(.55,.75,1.00,1.35),'Quando três efeitos temporários estão ativos, o próximo abate transforma a festa em uma explosão ao redor da vítima.','CAOS',{needed:[3,3,3,3,2],radius:[100,115,130,150,170]}),
B('dionisio_last_call','Última Rodada','♨','lastCall',V(.015,.022,.032,.045),'Abaixo de 40% de vida, uma pequena sequência de abates cura e concede uma rodada extra de Euforia.','SUSTENTAÇÃO',{kills:[6,6,5,5,4],threshold:.40})
]),
D('hefesto','HEFESTO','DEUS DA FORJA','assets/deities/hefesto.png','🔨',[
'Uma arma boa deixa marcas até quando erra o alvo principal.',
'Se o metal está quente, use o calor.',
'Não troque de ferramenta sem saber o que está perdendo.',
'Cada arma conta uma história diferente quando chega ao limite.',
'Obra-prima não é um número maior. É uma arma que começa a fazer coisas novas.'
],[
B('hefesto_anvil','Golpe da Bigorna','🔨','anvil',V(.55,.75,1.00,1.35),'Uma sequência de golpes faz uma bigorna espectral cair sobre o alvo e atingir a área.','FORJA',{hits:[7,7,6,5,4],radius:[85,95,105,120,135]}),
B('hefesto_overheat','Superaquecimento','🔥','overheat',V(.65,.85,1.10,1.45),'Usar a mesma arma acumula Calor. No limite, a arma descarrega uma explosão e esfria.','FORJA',{hits:[9,9,8,7,6],radius:[95,105,120,135,155]}),
B('hefesto_temper','Têmpera de Combate','⚒','reinforce',V(.12,.16,.22,.30),'A arma que mais matou na onda anterior começa a próxima temperada, causando mais dano.','ARMA',{attack:V(.06,.08,.11,.15)}),
B('hefesto_shrapnel','Estilhaços da Forja','✦','shrapnel',V(.35,.50,.70,.95),'Abates críticos lançam estilhaços contra inimigos próximos.','CRÍTICO',{targets:[2,2,3,3,4],radius:[150,160,175,190,210]}),
B('hefesto_masterpiece','Obra-Prima','◆','masterpiece',V(.50,.70,.95,1.25),'A arma de maior raridade ganha um golpe especial periódico.','ARMA',{hits:[6,6,5,5,4],radius:[65,75,85,100,115]})
]),
D('artemis','ARTEMIS','DEUSA DA CAÇA','assets/deities/artemis.png','🏹',[
'Escolha uma presa. O resto do campo vira ruído.',
'Um crítico bem colocado pode encontrar um segundo alvo sozinho.',
'Distância não é covardia. É vantagem.',
'Todo monstro revela um ponto fraco quando apanha do mesmo jeito vezes suficientes.',
'A caçada termina quando a flecha para de precisar de ajuda.'
],[
B('artemis_mark_prey','Marca da Caçada','◉','markPrey',V(.04,.055,.075,.10),'O primeiro inimigo atingido vira sua Presa. Acertos consecutivos nele acumulam Precisão e o limite garante crítico.','CAÇA',{hits:[6,6,5,5,4],cap:V(.12,.16,.22,.30)}),
B('artemis_ricochet','Flecha Ricochete','➶','critRicochet',V(.40,.55,.75,1.00),'Críticos ricocheteiam para outro inimigo próximo.','CRÍTICO',{targets:[1,1,1,2,2],radius:[180,195,210,230,250]}),
B('artemis_predator','Distância Mortal','♞','distance',V(.18,.24,.32,.42),'Quanto mais longe estiver a presa, maior o dano do golpe.','PRECISÃO',{ideal:[180,180,175,170,165]}),
B('artemis_weakpoint','Ponto Fraco','⌖','weakpoint',V(.045,.06,.08,.11),'Acertos repetidos no mesmo alvo acumulam vulnerabilidade. No limite, a marca estoura e reinicia.','CHEFE',{hits:[7,7,6,6,5],burst:V(.45,.60,.80,1.05)}),
B('artemis_volley','Chuva de Flechas','✧','critVolley',V(.35,.50,.70,.95),'Depois de alguns críticos, dispara automaticamente uma pequena saraivada contra outros inimigos.','CRÍTICO',{crits:[4,4,3,3,2],targets:[2,2,3,3,4],radius:[230,245,260,280,310]})
]),
D('poseidon','POSEIDON','DEUS DOS MARES','assets/deities/poseidon.png','🌊',[
'Não empurre um inimigo. Mova o campo inteiro.',
'A maré não pede que saiam do caminho.',
'Quanto mais você insiste, maior fica a onda.',
'Pressão suficiente transforma qualquer armadura em problema.',
'Se estiver cercado, melhor ainda. O oceano gosta de espaço cheio.'
],[
B('poseidon_wave','Onda de Impacto','🌊','wave',V(.45,.60,.80,1.05),'Uma sequência de acertos cria uma onda que causa dano e empurra inimigos ao redor.','MARÉ',{hits:[6,6,5,5,4],radius:[95,105,120,135,155],push:[35,40,45,55,65]}),
B('poseidon_riptide','Correnteza de Combate','↕','dashWave',V(.35,.50,.70,.95),'O dash libera uma corrente que afasta os inimigos próximos e os deixa preparados para serem esmagados.','MOVIMENTO',{radius:[100,115,130,150,170],push:[40,50,60,70,85]}),
B('poseidon_tide','Maré Crescente','↑','tide',V(.02,.025,.035,.05),'Acertos em sequência fazem a Maré subir. Cada nível aumenta o dano até o limite.','COMBO',{max:V(.14,.18,.24,.32),decay:[2200,2400,2600,2900,3300]}),
B('poseidon_crush','Pressão Abissal','◉','crush',V(.55,.75,1.00,1.35),'Inimigos empurrados repetidamente acumulam Pressão. No limite, sofrem um esmagamento adicional.','MARÉ',{hits:[3,3,3,3,2]}),
B('poseidon_surge','Mar Revolto','≈','surrounded',V(.45,.60,.80,1.05),'Quando três ou mais inimigos estão próximos, seus ataques podem liberar uma maré circular com recarga própria.','MARÉ',{near:[4,4,3,3,3],cooldown:[5200,4800,4400,3900,3300],radius:[125,140,155,175,195]})
]),
D('hercules','HÉRCULES','HERÓI DO OLIMPO','assets/deities/hercules.png','💪',[
'Força fica mais interessante quando você precisa conquistá-la no meio da luta.',
'Conte os trabalhos, não os números.',
'Um golpe forte demais para um alvo serve para vários.',
'Monstros grandes rendem troféus melhores.',
'Se estiver quase caindo, talvez seja a hora de descobrir quanto ainda consegue levantar.'
],[
B('hercules_labors','Trabalhos de Hércules','★','labors',V(.025,.035,.05,.07),'A cada grupo de eliminações na onda você conclui um Trabalho e fica mais forte até o fim dela.','PROVAÇÃO',{kills:[18,17,16,15,14],max:[4,4,4,5,5]}),
B('hercules_slam','Golpe Titânico','💪','slam',V(.55,.75,1.00,1.35),'Ataques periódicos viram golpes titânicos que atingem todos os inimigos próximos do alvo.','FORÇA',{hits:[8,8,7,6,5],radius:[90,100,115,130,150]}),
B('hercules_trophy','Troféu de Monstro','♜','trophy',V(.14,.19,.26,.35),'Derrotar elite ou chefe concede Força Heroica temporária. Chefes renovam e ampliam o efeito.','PROVAÇÃO',{duration:[6000,6500,7000,8000,9000],defense:V(.06,.08,.11,.15)}),
B('hercules_berserk','Pele do Leão','♌','berserk',V(.18,.24,.32,.42),'Abaixo de 30% de vida, ganha dano e redução de dano enquanto permanecer em perigo.','RISCO',{defense:V(.12,.16,.22,.30),threshold:.30}),
B('hercules_kill_chain','Força Crescente','✊','killChain',V(.025,.035,.05,.07),'Abates rápidos acumulam força. No limite, o próximo abate causa uma onda de choque.','COMBO',{stacks:[5,5,5,5,4],window:[2200,2300,2400,2600,2800],burst:V(.60,.80,1.05,1.40),radius:[100,115,130,150,175]})
]),
D('sauron','SAURON','SENHOR SOMBRIO','assets/deities/sauron.png','👁',[
'Poder verdadeiro sempre cobra alguma coisa.',
'Escolha um alvo e deixe o Olho terminar de entendê-lo.',
'Dominação começa com uma morte e termina quando o campo inteiro aceita sua presença.',
'Amplificar poder também amplifica preço.',
'Quanto menos esperança restar, mais fácil será transformá-la em medo.'
],[
B('sauron_corruption','Poder Corruptor','👁','corruption',V(.18,.24,.32,.42),'Sacrifica vida máxima para obter dano. Eliminações alimentam lentamente a Corrupção até um limite.','CORRUPÇÃO',{hpPenalty:V(.06,.08,.10,.13),growth:V(.005,.007,.01,.014),kills:[12,11,10,9,8],cap:V(.06,.09,.13,.18)}),
B('sauron_eye','Olho Vigilante','◉','eye',V(.05,.065,.085,.115),'Acertar repetidamente o mesmo alvo faz o Olho fixá-lo. No limite, uma explosão sombria pune a presa.','DOMINAÇÃO',{hits:[7,7,6,5,4],burst:V(.50,.70,.95,1.25)}),
B('sauron_domination','Dominação','♛','domination',V(.035,.05,.07,.095),'Abates em sequência acumulam Dominação. No máximo, cada novo abate libera uma onda sombria.','COMBO',{max:[5,5,5,4,4],window:[4500,4800,5200,5600,6200],burst:V(.40,.55,.75,1.00),radius:[90,105,120,140,160]}),
B('sauron_ring','O Anel','◉','ring',V(.12,.16,.22,.30),'Amplifica os efeitos numéricos de todas as suas outras bênçãos — e também as penalidades que elas cobram.','RISCO',{penalty:V(.06,.08,.11,.15)}),
B('sauron_dread','Terror de Mordor','◼','dread',V(.45,.60,.80,1.05),'Abaixo de 50% de vida, ataques periódicos liberam uma onda de terror que causa dano e afasta inimigos.','RISCO',{hits:[7,7,6,5,4],threshold:.50,radius:[100,115,130,150,170],push:[30,35,45,55,70]})
]),
D('nazgul','NAZGÛL','ESPECTRO DO ANEL','assets/deities/nazgul.png','🗡',[
'Desapareça antes do golpe. Volte antes que percebam.',
'Medo é velocidade que o inimigo oferece de graça.',
'Uma lâmina espectral prefere o instante depois do dash.',
'Cada esquiva pode ser uma promessa de violência.',
'A caça acaba quando correr deixa de ajudar sua presa.'
],[
B('nazgul_spectral','Forma Espectral','♟','dodge',V(.04,.06,.085,.12),'Concede chance de ignorar completamente o dano. Esquivar libera um corte sombrio ao redor.','ESQUIVA',{pulse:V(.30,.42,.58,.80),radius:[70,80,90,105,120]}),
B('nazgul_shadow_dash','Golpe Fantasma','🗡','shadowDash',V(.55,.75,1.00,1.35),'Depois do dash, o próximo ataque recebe dano sombrio e causa um pequeno corte em área.','ASSASSINATO',{radius:[60,70,80,95,110]}),
B('nazgul_terror','Terror Crescente','☠','terror',V(.05,.07,.095,.13),'Cada cinco abates sem sofrer dano concede uma carga de Terror que aumenta movimento. Sofrer dano remove uma carga.','COMBO',{max:[3,3,3,4,4]}),
B('nazgul_phantom_blade','Lâmina Fantasma','✦','phantom',V(.035,.05,.07,.10),'Críticos concedem uma breve chance extra de esquiva e podem reduzir a recarga do dash.','CRÍTICO',{duration:[1800,2000,2200,2500,3000],dashCut:[120,150,190,240,320]}),
B('nazgul_hunt','Caçada Implacável','➟','hunt',V(.20,.28,.38,.52),'Alvos abaixo de 35% de vida recebem dano sombrio adicional. Abates nessas condições cortam a recarga do dash.','ASSASSINATO',{threshold:.35,dashCut:[300,400,550,750,1000]})
]),
D('ents','ENTS','GUARDIÕES DA FLORESTA','assets/deities/ents.png','🌳',[
'Cresça durante a batalha. Essa é a parte que os apressados nunca entendem.',
'Raízes fortes transformam tempo em defesa.',
'Uma semente parece pequena até sobreviver à onda inteira.',
'A floresta não evita toda ferida. Ela aprende a suportá-las.',
'Fique de pé por tempo suficiente e o campo começa a lutar ao seu lado.'
],[
B('ents_bark','Casca Crescente','🌳','bark',V(.012,.018,.025,.035),'Cada onda concluída engrossa sua Casca e aumenta a defesa durante a run, até um limite.','CRESCIMENTO',{cap:V(.07,.10,.14,.20)}),
B('ents_roots','Raízes Profundas','♣','roots',V(.12,.17,.23,.31),'Ficar alguns segundos sem usar dash cria Raízes: você recebe defesa e ataques periódicos chicoteiam inimigos próximos.','DEFESA',{ready:[3500,3300,3100,2800,2500],lash:V(.30,.42,.58,.80),hits:[7,7,6,5,4],radius:[85,95,105,120,135]}),
B('ents_seed','Semente Ancestral','🌱','seed',V(.025,.035,.05,.07),'Cada grupo de abates faz uma semente crescer e aumenta temporariamente a vida máxima durante a onda.','CRESCIMENTO',{kills:[22,21,20,18,16],max:[4,4,5,5,5]}),
B('ents_resilience','Resiliência','❧','resilience',V(.18,.24,.32,.42),'Perder muita vida em pouco tempo faz a Casca reagir, concedendo defesa temporária.','DEFESA',{threshold:[.24,.23,.22,.21,.20],duration:[3000,3300,3600,4000,4500],cooldown:[11000,10500,10000,9500,9000]}),
B('ents_grove','Coração da Floresta','♚','grove',V(.025,.035,.05,.07),'Após alguns segundos sem sofrer dano, o bosque pulsa e restaura uma parcela da vida.','SUSTENTAÇÃO',{ready:[8500,8000,7500,7000,6200],cooldown:[8500,8000,7500,7000,6200]})
])
];
const ASCENSIONS={
zeus:[
A('zeus_asc_storm_avatar','Avatar da Tempestade','⚡','Toda descarga de Zeus ganha um salto extra, área maior e 35% mais dano secundário. Ao descarregar, parte da carga permanece.','ASCENSÃO · TEMPESTADE'),
A('zeus_asc_olympian_judgment','Julgamento do Olimpo','☈','A cada 20 eliminações, Zeus atinge vários inimigos ao mesmo tempo com uma tempestade baseada no último golpe causado.','ASCENSÃO · EXECUÇÃO',{kills:20,targets:8,mult:1.8})
],
ares:[
A('ares_asc_god_of_war','Deus da Guerra','⚔','Frenesi exige uma carga a menos, abates prolongam sua duração e Retaliação recebe uma carga extra.','ASCENSÃO · FRENESI'),
A('ares_asc_blood_banquet','Banquete de Sangue','🩸','Explosões de Sangue e Condenação espalham marcas para inimigos próximos e recuperam uma pequena parcela da vida.','ASCENSÃO · SANGRAMENTO')
],
hecate:[
A('hecate_asc_triple_goddess','Deusa Tríplice','△','Tríplice Caminho passa a exigir apenas duas fontes; Ecos e Fogo das Bruxas recebem uma repetição adicional reduzida.','ASCENSÃO · MAGIA'),
A('hecate_asc_endless_night','Noite Sem Fim','☾','Detonações do Selo da Encruzilhada espalham a maldição para inimigos próximos e Conhecimento Proibido repete o golpe duas vezes.','ASCENSÃO · MALDIÇÃO')
],
selene:[
A('selene_asc_blood_moon','Lua de Sangue','🌕','Durante Lua Cheia, ataques causam dano lunar em área e o Raio de Luar recarrega duas vezes mais rápido.','ASCENSÃO · LUA CHEIA'),
A('selene_asc_eternal_eclipse','Eclipse Eterno','◒','O bônus da fase anterior nunca desaparece por completo e Eclipse desperta já abaixo de 50% de vida.','ASCENSÃO · FASES')
],
moros:[
A('moros_asc_sealed_fate','Destino Selado','✴','Críticos garantidos de Moros causam uma segunda ruptura do destino e reiniciam a sequência de Inevitável.','ASCENSÃO · DESTINO'),
A('moros_asc_rewrite_fate','Reescrever o Destino','⌛','Quando Destino Adiado salva sua vida, os próximos três ataques são críticos e recebem grande bônus de dano. Chefes restauram a salvação.','ASCENSÃO · SOBREVIVÊNCIA')
],
atena:[
A('atena_asc_absolute_aegis','Égide Absoluta','🛡','Contra-Ataques perfeitos e a Égide liberam ondas maiores; um dash perfeito concede uma breve invulnerabilidade adicional.','ASCENSÃO · DEFESA'),
A('atena_asc_strategos','Estrategista','♜','A cada 10 abates sem sofrer dano ganha uma Medalha. Medalhas fortalecem Postura e liberam uma resposta tática ao serem conquistadas.','ASCENSÃO · TÉCNICA')
],
hermes:[
A('hermes_asc_divine_speed','Velocidade Divina','🪽','No Fluxo máximo, acertos cortam violentamente a recarga do dash e cada dash prolonga o estado.','ASCENSÃO · FLUXO'),
A('hermes_asc_afterimage_army','Exército de Pós-Imagens','»','Cada dash gera duas pós-imagens extras. Ataques repetidos pelas imagens causam mais dano e podem acertar um segundo alvo.','ASCENSÃO · MOVIMENTO')
],
dionisio:[
A('dionisio_asc_endless_party','Festa Sem Fim','🎉','Cada bônus temporário renova uma vez. Ter dano, ataque e movimento simultaneamente concede um quarto bônus de poder geral.','ASCENSÃO · CAOS'),
A('dionisio_asc_delirium','Delírio Coletivo','🍷','Explosões de Ressaca espalham cargas para até três inimigos e Apagão ganha área e dano adicionais.','ASCENSÃO · RESSACA')
],
hefesto:[
A('hefesto_asc_living_forge','Forja Viva','◆','Toda arma equipada passa a poder ativar Obra-Prima; a arma temperada mantém metade do bônus mesmo quando outra assume a liderança.','ASCENSÃO · ARSENAL'),
A('hefesto_asc_vulcan_hammer','Martelo de Vulcano','🔨','Bigorna e Superaquecimento atingem uma segunda vez com 55% do dano e suas áreas ficam muito maiores.','ASCENSÃO · IMPACTO')
],
artemis:[
A('artemis_asc_wild_hunt','Caçada Selvagem','🏹','Ricochetes críticos atingem mais dois alvos e, quando sua Presa morre, a Marca salta para o inimigo mais próximo.','ASCENSÃO · CAÇA'),
A('artemis_asc_moon_arrow','Flecha da Lua','✧','A cada quarto acerto na Presa, uma flecha espectral atravessa vários inimigos próximos.','ASCENSÃO · PRECISÃO',{hits:4,targets:4,mult:.65})
],
poseidon:[
A('poseidon_asc_tsunami','Tsunami','🌊','Todas as ondas de Poseidon ganham área enorme, empurrão maior e causam uma segunda quebra de Pressão nos inimigos atingidos.','ASCENSÃO · MARÉ'),
A('poseidon_asc_raging_seas','Mares Revoltos','≈','Ao atingir o máximo da Maré, ela deixa de decair. Enquanto estiver cheia, todo dash libera uma Onda de Impacto.','ASCENSÃO · COMBO')
],
hercules:[
A('hercules_asc_demigod','Semideus','💪','Golpe Titânico ativa quase duas vezes mais rápido e Troféu de Monstro tem duração e força ampliadas.','ASCENSÃO · FORÇA'),
A('hercules_asc_thirteenth_labor','Décimo Terceiro Trabalho','★','Elites, chefes e ondas perfeitas concedem Marcas Heroicas permanentes na run. Ao chegar a 12, golpes titânicos passam a surgir com frequência brutal.','ASCENSÃO · PROVAÇÃO',{max:12,damage:.03,hp:.01})
],
sauron:[
A('sauron_asc_one_ring','Um Anel para Todos','👁','O Anel passa a amplificar ainda mais todas as bênçãos, mas sacrifica imediatamente 15% da vida máxima restante.','ASCENSÃO · CORRUPÇÃO',{hpPenalty:.15}),
A('sauron_asc_dark_lord','Senhor Sombrio','♛','Dominação máxima transforma cada novo abate em uma Nova Sombria e a Corrupção cresce mais rápido com mortes.','ASCENSÃO · DOMINAÇÃO')
],
nazgul:[
A('nazgul_asc_nine','Os Nove','☠','A cada 9 eliminações, sombras dos Nazgûl atacam vários inimigos espalhados pelo campo.','ASCENSÃO · TERROR',{kills:9,targets:9,mult:.70}),
A('nazgul_asc_witch_king','Rei Bruxo','🗡','Esquivar garante crítico no próximo ataque; críticos cortam a recarga do dash e Golpe Fantasma ganha uma explosão maior.','ASCENSÃO · ASSASSINATO')
],
ents:[
A('ents_asc_awakened_forest','Floresta Desperta','🌳','Coração da Floresta também causa dano aos inimigos próximos e pulsa com muito mais frequência.','ASCENSÃO · BOSQUE'),
A('ents_asc_last_shepherd','Último Pastor','♚','Casca Crescente ganha o dobro por onda e metade da vida temporária das Sementes é preservada ao terminar a onda.','ASCENSÃO · CRESCIMENTO')
]
};
for(const deity of DEITIES){
deity.boons.forEach(boon=>{boon.deityId=deity.id;});
(ASCENSIONS[deity.id]||[]).forEach(asc=>{asc.deityId=deity.id;});
}
global.MagoBlessingData=Object.freeze({
DEITIES:Object.freeze(DEITIES),
ASCENSIONS:Object.freeze(ASCENSIONS),
RARITY_ORDER:Object.freeze([...RARITY_ORDER]),
RARITY_META:Object.freeze({...RARITY_META})
});
})(window);
