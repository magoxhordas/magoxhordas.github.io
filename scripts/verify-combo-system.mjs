/* Verificador do SISTEMA DE COMBO.
 *
 * Cobre os 18 pontos exigidos na especificacao. A maior parte nao e' teste
 * de texto: o modulo e' carregado de verdade num contexto isolado e o
 * comportamento e' SIMULADO, porque "existe a constante X no arquivo" nao
 * prova que arma rapida e arma lenta sobem igual.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=arquivo=>fs.readFileSync(path.join(root,arquivo),'utf8').replace(/\r\n/g,'\n');
const html=ler('index.html');
const moduloCombo=ler('src/combat/combo-system.js');
const hudCombo=ler('src/ui/combo-hud.js');
const dungeon=ler('src/dungeon/dungeon-system.js');
const campanha=ler('src/campaign/campaign-system.js');
const projeteis=ler('src/weapons/projectile-system.js');
const dadosArmas=ler('src/weapons/weapon-data.js');

let checagens=0;
function exigir(condicao,mensagem){
  if(!condicao) throw new Error(`FALHA: ${mensagem}`);
  checagens++;
}
const perto=(a,b,tol)=>Math.abs(a-b)<=tol;

// ── Carrega o modulo isolado, com um relogio controlado ──
function carregar(){
  const contexto={console,performance:{now:()=>contexto.__agora},__agora:0};
  contexto.window=contexto;
  vm.createContext(contexto);
  vm.runInContext(moduloCombo,contexto);
  return contexto;
}

/* Simula N segundos de ataques com um cooldown fixo, sem mortes e sem
   critico. Devolve os pontos acumulados. E' a simulacao que a spec pede. */
function simular(C,jogador,cooldown,segundos,opcoes={}){
  const passo=cooldown;
  const total=segundos*1000;
  let t=0;
  while(t<total){
    const id=C.abrirEvento(jogador,opcoes.arma||null,cooldown,opcoes.origem||'player_weapon');
    // varios acertos do MESMO ciclo: multi-hit, AoE, ricochete, perfuracao
    for(let i=0;i<(opcoes.acertos||1);i++) C.validarEvento(id,{critico:!!opcoes.critico});
    t+=passo;
  }
  return C.pontuacao(jogador);
}

// ═══════════════════════════════════════════════════════
// 1. Cooldown de referencia definido centralmente
// ═══════════════════════════════════════════════════════
{
  const ctx=carregar();
  const C=ctx.ComboSystem;
  exigir(typeof C==='object','modulo nao exportou ComboSystem');
  exigir(typeof C.CONFIG.REFERENCIA_COOLDOWN==='number'&&C.CONFIG.REFERENCIA_COOLDOWN>0,
    'REFERENCIA_COOLDOWN deve existir e ser positivo');
  for(const chave of ['GANHO_MIN','GANHO_MAX','GRACA_MS','DECAIMENTO_POR_SEGUNDO','PENALIDADE_DANO',
                      'PENALIDADE_DANO_PESADO','TETO_ABATE_POR_SEGUNDO','CARRY_ONDA','CRITICO_BONUS',
                      'SUMMON_MULTIPLICADOR','TIERS','RECOMPENSA']){
    exigir(chave in C.CONFIG,`CONFIG deve centralizar ${chave}`);
  }
  // nenhum numero de balanceamento solto no index
  exigir(!/COMBO_REFERENCE_COOLDOWN\s*=\s*\d/.test(html),
    'o cooldown de referencia nao pode estar duplicado no index.html');
}

// ═══════════════════════════════════════════════════════
// 2/3. Arma rapida vale MENOS por evento; arma lenta vale MAIS
// ═══════════════════════════════════════════════════════
{
  const ctx=carregar();
  const C=ctx.ComboSystem;
  const p={};
  C.configurar({getJogadores:()=>[p],emCombate:()=>true});
  const rapida=C.abrirEvento(p,null,520,'player_weapon');
  C.validarEvento(rapida,{});
  const ganhoRapida=C.pontuacao(p);
  C.limpar();
  C.configurar({getJogadores:()=>[p],emCombate:()=>true});
  const lenta=C.abrirEvento(p,null,1650,'player_weapon');
  C.validarEvento(lenta,{});
  const ganhoLenta=C.pontuacao(p);
  exigir(ganhoRapida<ganhoLenta,'arma rapida deve valer menos por evento que a lenta');
  exigir(perto(ganhoRapida,520/900,0.01),`Arco Curto deveria valer ~0.58 por ciclo, veio ${ganhoRapida}`);
  exigir(perto(ganhoLenta,1650/900,0.01),`Machado Colossal deveria valer ~1.83 por ciclo, veio ${ganhoLenta}`);
}

// ═══════════════════════════════════════════════════════
// 4. Crescimento por segundo semelhante entre os extremos (±10%)
// ═══════════════════════════════════════════════════════
{
  const cooldowns=[520,760,900,1200,1450,1650];
  const taxas=[];
  for(const cd of cooldowns){
    const ctx=carregar();
    const C=ctx.ComboSystem;
    const p={};
    C.configurar({getJogadores:()=>[p],emCombate:()=>true});
    taxas.push(simular(C,p,cd,30)/30);
  }
  const maior=Math.max(...taxas), menor=Math.min(...taxas);
  const dispersao=(maior/menor-1)*100;
  exigir(dispersao<=10,
    `dispersao entre cooldowns extremos deve ficar em ate 10%, veio ${dispersao.toFixed(1)}% (${taxas.map(t=>t.toFixed(3)).join(', ')})`);

  // e o catalogo REAL das armas, nao so' numeros escolhidos a dedo
  const re=/\['([a-z_]+)','([^']+)','[^']*','#[0-9a-fA-F]+',(\d+),(\d+),(\d+),/g;
  const cds=[]; let m;
  while((m=re.exec(dadosArmas))) cds.push(Number(m[5]));
  exigir(cds.length>=32,`o catalogo deveria ter ao menos 32 armas, achei ${cds.length}`);
  const taxasReais=cds.map(cd=>{
    const ctx=carregar(); const C=ctx.ComboSystem; const p={};
    C.configurar({getJogadores:()=>[p],emCombate:()=>true});
    return simular(C,p,cd,30)/30;
  });
  const disp2=(Math.max(...taxasReais)/Math.min(...taxasReais)-1)*100;
  exigir(disp2<=10,`dispersao no catalogo real deve ficar em ate 10%, veio ${disp2.toFixed(1)}%`);
}

// ═══════════════════════════════════════════════════════
// 5/6/7. Multi-hit, ricochete e AoE NAO multiplicam o evento
// ═══════════════════════════════════════════════════════
{
  for(const [nome,acertos] of [['multi-hit',3],['ricochete',4],['AoE',10]]){
    const a=carregar(), b=carregar();
    const pa={}, pb={};
    a.ComboSystem.configurar({getJogadores:()=>[pa],emCombate:()=>true});
    b.ComboSystem.configurar({getJogadores:()=>[pb],emCombate:()=>true});
    const um=simular(a.ComboSystem,pa,900,10,{acertos:1});
    const varios=simular(b.ComboSystem,pb,900,10,{acertos});
    exigir(perto(um,varios,0.001),
      `${nome}: ${acertos} acertos no mesmo ciclo deveriam valer igual a 1 (${um} vs ${varios})`);
  }
  // e a integracao real precisa deduplicar por id
  exigir(moduloCombo.includes('if(ev.validado)return false'),
    'o evento so pode conceder pontos na PRIMEIRA validacao');
  exigir(projeteis.includes('comboEventId'),
    'os projeteis precisam carregar o id do ciclo que os criou');
}

// ═══════════════════════════════════════════════════════
// 8. DOT nao gera ciclos extras
// ═══════════════════════════════════════════════════════
{
  const ctx=carregar();
  const C=ctx.ComboSystem;
  const p={};
  C.configurar({getJogadores:()=>[p],emCombate:()=>true});
  const id=C.abrirEvento(p,null,900,'player_weapon');
  C.validarEvento(id,{});
  const depoisDoAtaque=C.pontuacao(p);
  for(let i=0;i<20;i++) C.validarEvento(id,{});          // 20 ticks de veneno
  exigir(perto(C.pontuacao(p),depoisDoAtaque,0.0001),
    'ticks de dano continuo nao podem gerar pontos novos');
  // e uma fonte 'dot' nem sequer concede abate
  exigir(C.notificarAbate(p,{maxHp:30},'dot')===0,'abate por DOT nao pode dar bonus');
}

// ═══════════════════════════════════════════════════════
// 9. Pets nao constroem combo
// ═══════════════════════════════════════════════════════
{
  const ctx=carregar();
  const C=ctx.ComboSystem;
  const p={};
  C.configurar({getJogadores:()=>[p],emCombate:()=>true});
  exigir(C.notificarAbate(p,{maxHp:30},'pet')===0,'abate de pet nao pode aumentar o combo');
  // o pet companheiro nao tem caminho de dano contra inimigos na campanha
  exigir(!/currentPet[^\n]{0,120}takeDmg/.test(html),
    'o pet companheiro nao pode ter caminho de dano que alimente combo');
}

// ═══════════════════════════════════════════════════════
// 10. Summons respeitam regra propria
// ═══════════════════════════════════════════════════════
{
  const ctx=carregar();
  const C=ctx.ComboSystem;
  const p={};
  C.configurar({getJogadores:()=>[p],emCombate:()=>true});
  const mult=C.CONFIG.SUMMON_MULTIPLICADOR;
  exigir(mult>=0&&mult<=0.5,`SUMMON_MULTIPLICADOR deve ser pequeno, veio ${mult}`);
  const id=C.abrirEvento(p,null,900,'summon');
  C.validarEvento(id,{});
  exigir(perto(C.pontuacao(p),mult*1,0.001),
    'ciclo de summon deve render apenas o multiplicador configurado');
  // o Necromante mantem combo pelas PROPRIAS armas
  const ctx2=carregar();
  const p2={};
  ctx2.ComboSystem.configurar({getJogadores:()=>[p2],emCombate:()=>true});
  exigir(simular(ctx2.ComboSystem,p2,900,10)>0,
    'o Necromante precisa conseguir combo pelas proprias armas');
}

// ═══════════════════════════════════════════════════════
// 11. Velocidade de ataque EFETIVA e considerada (sem realimentacao)
// ═══════════════════════════════════════════════════════
{
  // mesma arma, tres velocidades: combo/s deve ficar parecido
  const taxas=[];
  for(const mult of [1,1.25,1.5]){
    const ctx=carregar(); const C=ctx.ComboSystem; const p={};
    C.configurar({getJogadores:()=>[p],emCombate:()=>true});
    taxas.push(simular(C,p,900/mult,30)/30);
  }
  const disp=(Math.max(...taxas)/Math.min(...taxas)-1)*100;
  exigir(disp<=10,`+25% e +50% de velocidade nao podem inflar o combo/s (veio ${disp.toFixed(1)}%)`);

  // e o bonus do proprio combo tem de entrar no cooldown efetivo
  exigir(/cd\/=1\+ComboSystem\.bonusVelocidadeAtaque\(player\)/.test(html.replace(/\s+/g,'')) ||
         html.includes('ComboSystem.bonusVelocidadeAtaque(player)'),
    'o bonus de velocidade do combo precisa entrar em campaignWeaponCooldown');
  exigir(html.includes('cd*proc,')||html.includes("abrirEvento(this,w,cd*proc"),
    'o evento deve usar o intervalo real entre ataques (cd*proc)');
}

// ═══════════════════════════════════════════════════════
// 12. Teto de bonus: os buffs param no ultimo marco
// ═══════════════════════════════════════════════════════
{
  const ctx=carregar();
  const C=ctx.ComboSystem;
  const p={};
  C.configurar({getJogadores:()=>[p],emCombate:()=>true});
  C.definirCombo(p,100);
  const noMarco=C.bonus(p);
  C.definirCombo(p,500);
  const muitoAcima=C.bonus(p);
  exigir(JSON.stringify(noMarco)===JSON.stringify(muitoAcima),
    'os bonus nao podem crescer depois do marco LENDARIO');
  exigir(muitoAcima.dano<=0.10&&muitoAcima.ataque<=0.10&&muitoAcima.movimento<=0.10,
    'os bonus maximos precisam continuar pequenos');
  exigir(C.pontuacaoExibida(p)===500,'o contador deve continuar subindo acima de 100');
  // teto de abate por segundo
  const ctx2=carregar(); const C2=ctx2.ComboSystem; const q={};
  C2.configurar({getJogadores:()=>[q],emCombate:()=>true});
  let concedido=0;
  for(let i=0;i<40;i++) concedido+=C2.notificarAbate(q,{maxHp:30},'player_weapon');
  exigir(concedido<=C2.CONFIG.TETO_ABATE_POR_SEGUNDO+0.001,
    `40 abates simultaneos nao podem passar do teto (${concedido})`);
}

// ═══════════════════════════════════════════════════════
// 13. Dano nao zera o combo
// ═══════════════════════════════════════════════════════
{
  const ctx=carregar();
  const C=ctx.ComboSystem;
  const p={};
  C.configurar({getJogadores:()=>[p],emCombate:()=>true});
  C.definirCombo(p,100);
  C.notificarDanoRecebido(p,5,100);                 // golpe leve
  const depois=C.pontuacao(p);
  exigir(depois>0,'dano nao pode zerar o combo');
  exigir(perto(depois,80,1),`golpe normal deve tirar ~20% (100 -> ~80), veio ${depois.toFixed(1)}`);
  // varios acertos no mesmo instante: uma penalidade so'
  const antes=C.pontuacao(p);
  for(let i=0;i<5;i++) C.notificarDanoRecebido(p,5,100);
  exigir(perto(C.pontuacao(p),antes,0.001),
    'ataque multi-hit do inimigo nao pode aplicar a penalidade varias vezes');
  // golpe pesado tira mais
  const ctx2=carregar(); const C2=ctx2.ComboSystem; const q={};
  C2.configurar({getJogadores:()=>[q],emCombate:()=>true});
  C2.definirCombo(q,100);
  C2.notificarDanoRecebido(q,30,100);
  exigir(perto(C2.pontuacao(q),65,1),`golpe pesado deve tirar ~35%, veio ${C2.pontuacao(q).toFixed(1)}`);
  // morte zera
  C2.notificarMorte(q);
  exigir(C2.pontuacao(q)===0,'morte deve zerar o combo');
}

// ═══════════════════════════════════════════════════════
// 14. Transicoes pausam grace e decaimento
// ═══════════════════════════════════════════════════════
{
  const ctx=carregar();
  const C=ctx.ComboSystem;
  const p={};
  let emCombate=true;
  C.configurar({getJogadores:()=>[p],emCombate:()=>emCombate});
  C.definirCombo(p,70);
  emCombate=false;                                   // tela de bencao
  for(let i=0;i<600;i++) C.atualizar(1/60);          // 10 segundos parado
  exigir(perto(C.pontuacao(p),70,0.001),
    `combo deve sobreviver a 10s de tela de bencao, veio ${C.pontuacao(p).toFixed(2)}`);
  // e o jogo so' chama atualizar em combate
  exigir(html.includes("emCombate:()=>{")&&html.includes("state==='playing'"),
    'a dependencia emCombate precisa existir e olhar o estado do jogo');
  exigir(dungeon.includes('ComboSystem.atualizar(dt/1000)'),
    'a Dungeon precisa converter o dt dela (ms) para segundos');

  // decaimento acontece DEPOIS do grace, e nao antes
  const ctx2=carregar(); const C2=ctx2.ComboSystem; const q={};
  C2.configurar({getJogadores:()=>[q],emCombate:()=>true});
  C2.definirCombo(q,100);
  for(let i=0;i<120;i++) C2.atualizar(1/60);         // 2s: ainda dentro do grace
  exigir(perto(C2.pontuacao(q),100,0.001),'nao pode decair dentro do tempo de graca');
  for(let i=0;i<300;i++) C2.atualizar(1/60);         // +5s: fora do grace
  exigir(C2.pontuacao(q)<100&&C2.pontuacao(q)>40,
    `decaimento deve ser gradual, nao instantaneo (veio ${C2.pontuacao(q).toFixed(1)})`);
}

// ═══════════════════════════════════════════════════════
// 15. Coop mantem estados separados
// ═══════════════════════════════════════════════════════
{
  const ctx=carregar();
  const C=ctx.ComboSystem;
  const p1={}, p2={};
  C.configurar({getJogadores:()=>[p1,p2],emCombate:()=>true});
  simular(C,p1,900,10);
  exigir(C.pontuacao(p1)>0,'P1 deveria ter combo');
  exigir(C.pontuacao(p2)===0,'ataque de P1 nao pode aumentar o combo de P2');
  C.definirCombo(p1,100); C.definirCombo(p2,15);
  exigir(C.bonus(p1).dano>0,'P1 no marco alto recebe bonus');
  exigir(C.bonus(p2).dano===0,'P2 com combo baixo NAO recebe bonus');
  C.notificarDanoRecebido(p1,50,100);
  exigir(C.pontuacao(p2)===15,'so o jogador atingido perde combo');
  exigir(html.includes('gameMode===2?player2:null'),
    'a HUD e as dependencias precisam tratar o segundo jogador');
}

// ═══════════════════════════════════════════════════════
// 16. Reset limpa o estado
// ═══════════════════════════════════════════════════════
{
  const ctx=carregar();
  const C=ctx.ComboSystem;
  const p={};
  C.configurar({getJogadores:()=>[p],emCombate:()=>true});
  C.definirCombo(p,80);
  C.limpar();
  exigir(C.pontuacao(p)===0,'limpar() deve zerar tudo');
  exigir(html.includes('ComboSystem.limpar()'),'nova run e game over precisam limpar o combo');
  const ocorrencias=(html.match(/ComboSystem\.limpar\(\)/g)||[]).length;
  exigir(ocorrencias>=2,`limpar() deveria ser chamado no inicio da run E no game over (achei ${ocorrencias})`);
}

// ═══════════════════════════════════════════════════════
// 17. Recompensas tem teto e sao por FAIXA
// ═══════════════════════════════════════════════════════
{
  const ctx=carregar();
  const C=ctx.ComboSystem;
  const p={};
  C.configurar({getJogadores:()=>[p],emCombate:()=>true});
  const faixa=valor=>{C.reiniciar(p);C.definirCombo(p,valor);return C.bonusRecompensa(p);};
  exigir(faixa(10)===0,'abaixo de 20 nao ha bonus de recompensa');
  exigir(faixa(25)>0&&faixa(25)<=0.02,'faixa 20-39 deve dar ~2%');
  exigir(faixa(50)<=0.04,'faixa 40-69 deve dar ~4%');
  exigir(faixa(80)<=0.06,'faixa 70-99 deve dar ~6%');
  const teto=faixa(100), enorme=faixa(5000);
  exigir(teto<=0.08,'o teto de recompensa deve ser ~8%');
  exigir(teto===enorme,'combo 5000 nao pode render mais que combo 100 (evita farm)');

  // carry entre ondas
  const ctx2=carregar(); const C2=ctx2.ComboSystem; const q={};
  C2.configurar({getJogadores:()=>[q],emCombate:()=>true});
  C2.definirCombo(q,80);
  C2.concluirOnda();
  exigir(perto(C2.pontuacao(q),80*C2.CONFIG.CARRY_ONDA,0.001),
    `com carry de ${C2.CONFIG.CARRY_ONDA} a onda seguinte deveria comecar em 40, veio ${C2.pontuacao(q)}`);
  exigir(campanha.includes('ComboSystem.concluirOnda()'),
    'a transicao de onda precisa aplicar o carry');
}

// ═══════════════════════════════════════════════════════
// 18. Ataque que nao acerta nao gera pontos
// ═══════════════════════════════════════════════════════
{
  const ctx=carregar();
  const C=ctx.ComboSystem;
  const p={};
  C.configurar({getJogadores:()=>[p],emCombate:()=>true});
  for(let i=0;i<20;i++) C.abrirEvento(p,null,900,'player_weapon');   // 20 tiros no vazio
  exigir(C.pontuacao(p)===0,'abrir ciclos sem acertar nada nao pode dar combo');
  const id=C.abrirEvento(p,null,900,'player_weapon');
  C.validarEvento(id,{});
  exigir(C.pontuacao(p)>0,'o ciclo que acerta precisa valer');
  // id invalido nao concede
  const antes=C.pontuacao(p);
  C.validarEvento(999999,{});
  exigir(C.pontuacao(p)===antes,'id inexistente nao pode conceder pontos');
}

// ═══════════════════════════════════════════════════════
// Extras exigidos pela spec
// ═══════════════════════════════════════════════════════
{
  // nomenclatura: nunca "hitCounter"
  for(const [nome,fonte] of [['combo-system',moduloCombo],['combo-hud',hudCombo]]){
    exigir(!/hitCounter/i.test(fonte),`${nome}: o sistema nao pode se chamar hitCounter`);
  }
  // HUD nao mostra decimais
  exigir(moduloCombo.includes('Math.floor(pontuacao(jogador))'),
    'a HUD precisa arredondar; o combo interno continua float');
  exigir(/pontuacaoExibida/.test(hudCombo),'a HUD deve usar a pontuacao arredondada');
  // marcos exigidos
  const ctx=carregar();
  const marcos=ctx.ComboSystem.CONFIG.TIERS.map(t=>t.min);
  for(const m of [20,40,70,100]) exigir(marcos.includes(m),`falta o marco ${m}`);
  // som por marco, nunca por ponto
  exigir(html.includes('aoMudarTier'),'o som deve sair do gancho de mudanca de marco');
  // depuracao existe e fica fora da UI normal
  exigir(typeof ctx.ComboSystem.definirDepuracao==='function','faltam as ferramentas de depuracao');
  exigir(hudCombo.includes('C.depurando()'),'o painel de depuracao so pode aparecer com debug ligado');
  // modos: Dungeon integrada nos mesmos tres pontos
  for(const trecho of ['ComboSystem.abrirEvento(this,null,this.pAttackCd',
                       'ComboSystem.validarEvento(this._comboEvento',
                       'ComboSystem.notificarAbate(this,best,source)']){
    exigir(dungeon.includes(trecho),`a Dungeon precisa integrar: ${trecho}`);
  }
  // Camp/menus nao ativam combo
  exigir(html.includes("state==='playing'"),'o combo so pode rodar em estado de combate');
}

console.log(`OK: sistema de combo verificado (${checagens} checagens).`);
