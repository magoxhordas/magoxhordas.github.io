/* Verificador do QUADRO DE CONTRATOS.
 *
 * A maior parte nao e' busca de texto: os modulos sao carregados de verdade
 * num contexto isolado, com um SaveSystem e um RunStats de mentira, e o
 * comportamento e' SIMULADO. "A constante existe no arquivo" nao prova que
 * aceitar, medir, concluir e pagar funcionam na ordem certa.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=a=>fs.readFileSync(path.join(root,a),'utf8').replace(/\r\n/g,'\n');
const html=ler('index.html');
const dados=ler('src/camp/contracts-data.js');
const sistema=ler('src/camp/contracts-system.js');
const ui=ler('src/camp/contracts-ui.js');
const quadro=ler('src/camp/contract-board-renderer.js');
const interacao=ler('src/camp/interaction-data.js');
const layout=ler('src/camp/layout-data.js');
const colisao=ler('src/camp/collision-map.js');
const posRun=ler('src/ui/post-run-system.js');

let checagens=0;
function exigir(condicao,mensagem){
  if(!condicao) throw new Error(`FALHA: ${mensagem}`);
  checagens++;
}

/* ── Ambiente isolado: save em memoria, RunStats controlavel ── */
function carregar(){
  const guardado=new Map();
  const ctx={
    console,
    SaveSystem:{
      readJSON:(k,padrao)=>guardado.has(k)?JSON.parse(guardado.get(k)):padrao,
      writeJSON:(k,v)=>guardado.set(k,JSON.stringify(v)),
    },
    RunStats:{_snap:null,getSnapshot(){return this._snap;},on(){}},
  };
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(dados,ctx);
  vm.runInContext(sistema,ctx);
  return {ctx,guardado};
}
const retrato=(extra={})=>({
  result:'defeat',difficulty:'medium',threatLevel:0,maxWave:1,
  team:{kills:0,damageDealt:0,criticals:0,elites:0,bosses:0,maxCombo:0,coinsEarned:0,coinsSpent:0},
  players:[{classId:'mage',lowestHpPercent:100}],
  blessings:[],weapons:[],bossFights:[],longestFlawlessStreak:0,
  ...extra,
});

// ── 1. CATALOGO ──
{
  const {ctx}=carregar();
  const D=ctx.ContractsData, S=ctx.ContractsSystem;
  exigir(Array.isArray(D.CONTRATOS)&&D.CONTRATOS.length>=18,
    `catalogo precisa de ao menos 18 contratos (tem ${D.CONTRATOS.length})`);
  exigir(D.CONTRATOS.length<=40,'catalogo grande demais para a primeira versao');
  const ids=D.CONTRATOS.map(c=>c.id);
  exigir(new Set(ids).size===ids.length,'ha ids de contrato duplicados');
  for(const c of D.CONTRATOS){
    exigir(!!c.nome&&!!c.desc,`contrato sem nome ou descricao: ${c.id}`);
    exigir(!!D.CATEGORIAS[c.categoria],`categoria invalida em ${c.id}`);
    exigir(!!D.TIERS[c.tier],`tier invalido em ${c.id}`);
    exigir(c.alvo>0,`alvo invalido em ${c.id}`);
    exigir(typeof S.METRICAS[c.metrica]==='function',
      `contrato ${c.id} usa a metrica "${c.metrica}", que o sistema nao sabe medir`);
    const r=c.recompensa||{};
    exigir((r.moedas>0)||(r.itens&&Object.keys(r.itens).length>0),`contrato sem recompensa: ${c.id}`);
    exigir(r.dano===undefined&&r.vida===undefined&&r.buff===undefined,
      `recompensa de ${c.id} mexe em forca de run — contratos pagam so' meta progressao`);
  }
  const categorias=new Set(D.CONTRATOS.map(c=>c.categoria));
  for(const esperada of ['combate','progressao','build','classe','risco'])
    exigir(categorias.has(esperada),`nenhum contrato na categoria ${esperada}`);
  // contrato mais dificil precisa pagar melhor: media por tier tem de subir
  const media=t=>{
    const lista=D.CONTRATOS.filter(c=>c.tier===t);
    return lista.reduce((s,c)=>s+(c.recompensa.moedas||0),0)/Math.max(1,lista.length);
  };
  exigir(media('comum')<media('veterano'),'Veterano nao paga mais que Comum');
  exigir(media('veterano')<media('epico'),'Epico nao paga mais que Veterano');
  exigir(media('epico')<media('lendario'),'Lendario nao paga mais que Epico');
}

// ── 2. OFERTA ──
{
  const {ctx}=carregar();
  const S=ctx.ContractsSystem;
  S.configurar({});
  exigir(S.OFERTA===2,'o quadro deve exibir exatamente duas ofertas');
  const oferta=S.garantirOferta();
  exigir(oferta.length===S.OFERTA,`o quadro deve mostrar ${S.OFERTA} contratos (mostrou ${oferta.length})`);
  exigir(new Set(oferta).size===oferta.length,'o quadro repetiu contratos na mesma oferta');
  // 200 sorteios: nenhum id fora do catalogo, e a variedade nao pode travar
  const vistos=new Set();
  for(let i=0;i<200;i++){ S.gerarOferta(); for(const id of S.garantirOferta()) vistos.add(id); }
  exigir(vistos.size>=10,`sorteio pouco variado: so ${vistos.size} contratos diferentes em 200 ofertas`);
  for(const id of vistos) exigir(!!ctx.ContractsData.CONTRATOS.find(c=>c.id===id),`oferta trouxe id desconhecido: ${id}`);
}

// ── 3. ACEITAR, LIMITE E ABANDONAR ──
{
  const {ctx}=carregar();
  const S=ctx.ContractsSystem;
  S.configurar({});
  const oferta=S.garantirOferta();
  exigir(S.aceitar(oferta[0]).ok,'nao aceitou o primeiro contrato');
  exigir(!S.aceitar(oferta[0]).ok,'aceitou o mesmo contrato duas vezes');
  exigir(S.estado().oferta.indexOf(oferta[0])<0,'contrato aceito continuou no quadro');
  exigir(S.estado().oferta.length===S.OFERTA,'o quadro nao repos a vaga do contrato aceito');
  let aceitos=1;
  for(const id of S.garantirOferta()) if(S.aceitar(id).ok) aceitos++;
  exigir(aceitos===S.MAX_ATIVOS,`limite de ativos ignorado: aceitou ${aceitos}, maximo ${S.MAX_ATIVOS}`);
  const ativo=S.estado().ativos[0].id;
  exigir(S.abandonar(ativo).ok,'nao abandonou um contrato ativo');
  exigir(!S.abandonar(ativo).ok,'abandonou duas vezes o mesmo contrato');
  exigir(S.estado().ativos.length===S.MAX_ATIVOS-1,'abandono nao liberou a vaga');
}

// ── 4. REROLL ──
{
  const {ctx}=carregar();
  const S=ctx.ContractsSystem;
  S.configurar({});
  S.aoEntrarNoAcampamento();
  exigir(S.estado().rerolls>0,'a visita ao acampamento nao devolveu atualizacao');
  exigir(S.atualizarOferta().ok,'a primeira atualizacao deveria ser gratuita');
  exigir(!S.atualizarOferta().ok,'atualizacao ilimitada — o reroll precisa ter limite por visita');
  S.aoEntrarNoAcampamento();
  exigir(S.estado().rerolls>0,'voltar ao acampamento nao renovou a atualizacao');
}

// ── 5. PROGRESSO E CONCLUSAO ──
{
  const {ctx}=carregar();
  const S=ctx.ContractsSystem, D=ctx.ContractsData;
  S.configurar({});
  const mata80=D.CONTRATOS.find(c=>c.id==='exterminador');
  const meio=S.avaliarContrato(mata80,retrato({team:{...retrato().team,kills:40}}));
  exigir(Math.abs(meio.progresso-0.5)<1e-6,`progresso parcial errado: ${meio.progresso}`);
  exigir(!meio.concluido,'concluiu com metade do objetivo');
  const cheio=S.avaliarContrato(mata80,retrato({team:{...retrato().team,kills:80}}));
  exigir(cheio.concluido,'nao concluiu ao bater o alvo exato');
  const passou=S.avaliarContrato(mata80,retrato({team:{...retrato().team,kills:500}}));
  exigir(passou.progresso===1,'progresso passou de 100%');

  // contexto: classe errada nao conclui mesmo com a metrica batida
  const doMago=D.CONTRATOS.find(c=>c.id==='sabedoria_arcana');
  const comViking=S.avaliarContrato(doMago,retrato({team:{...retrato().team,kills:999},players:[{classId:'viking',lowestHpPercent:100}]}));
  exigir(!comViking.concluido,'contrato de classe concluiu com a classe errada');
  const comMago=S.avaliarContrato(doMago,retrato({team:{...retrato().team,kills:999},players:[{classId:'mage',lowestHpPercent:100}]}));
  exigir(comMago.concluido,'contrato de classe nao concluiu com a classe certa');

  // comparacao invertida: terminar com POUCA vida
  const folego=D.CONTRATOS.find(c=>c.id==='ultimo_folego');
  exigir(S.avaliarContrato(folego,retrato({players:[{classId:'mage',lowestHpPercent:12}]})).concluido,
    'contrato de vida baixa nao concluiu com 12% de vida');
  exigir(!S.avaliarContrato(folego,retrato({players:[{classId:'mage',lowestHpPercent:80}]})).concluido,
    'contrato de vida baixa concluiu com 80% de vida');

  // guarda contra alvo trivial
  const disciplina=D.CONTRATOS.find(c=>c.id==='disciplina');
  exigir(!S.avaliarContrato(disciplina,retrato()).concluido,
    '"no maximo 2 divindades" concluiu sem nenhuma bencao — falta a guarda de progresso minimo');
  const tresBencaos=retrato({blessings:[{deity:'A'},{deity:'A'},{deity:'B'}]});
  exigir(S.avaliarContrato(disciplina,tresBencaos).concluido,'"no maximo 2 divindades" nao concluiu com 2 divindades');

  // exige vitoria
  const campanha=D.CONTRATOS.find(c=>c.id==='tempestade');
  exigir(!S.avaliarContrato(campanha,retrato({team:{...retrato().team,bosses:9}})).concluido,
    'contrato de vitoria concluiu numa derrota');
  exigir(S.avaliarContrato(campanha,retrato({result:'victory',team:{...retrato().team,bosses:9}})).concluido,
    'contrato de vitoria nao concluiu numa vitoria');
}

// ── 6. FIM DE RUN: conclui, guarda para coleta e mantem o que faltou ──
{
  const {ctx}=carregar();
  const S=ctx.ContractsSystem;
  S.configurar({});
  S.aceitar('exterminador'); S.aceitar('rumo_abismo');
  const resultado=S.aoTerminarRun(retrato({team:{...retrato().team,kills:120},maxWave:3}));
  exigir(resultado.length===2,'o fim da run nao avaliou os dois contratos ativos');
  const est=S.estado();
  exigir(est.concluidos.some(c=>c.id==='exterminador'),'contrato cumprido nao foi para a coleta');
  exigir(est.ativos.some(a=>a.id==='rumo_abismo'),'contrato nao cumprido deveria continuar ativo');
  exigir(!est.ativos.some(a=>a.id==='exterminador'),'contrato cumprido continuou ativo');
  exigir(est.oferta.length===S.OFERTA,'o quadro nao renovou depois da run');
}

// ── 7. COLETA PAGA UMA VEZ SO ──
{
  const {ctx}=carregar();
  const S=ctx.ContractsSystem;
  const pago={moedas:0,itens:{}};
  let salvou=0;
  S.configurar({
    adicionarMoedas:v=>{pago.moedas+=v;},
    adicionarItem:(i,q)=>{pago.itens[i]=(pago.itens[i]||0)+q;},
    salvar:()=>{salvou++;},
  });
  S.aceitar('exterminador');
  S.aoTerminarRun(retrato({team:{...retrato().team,kills:200}}));
  const premio=ctx.ContractsData.CONTRATOS.find(c=>c.id==='exterminador').recompensa;
  exigir(S.coletar('exterminador').ok,'nao coletou um contrato concluido');
  exigir(pago.moedas===premio.moedas,`pagou ${pago.moedas} moedas, esperado ${premio.moedas}`);
  for(const [item,q] of Object.entries(premio.itens||{}))
    exigir(pago.itens[item]===q,`item ${item} pago errado`);
  exigir(salvou>0,'coleta nao pediu para salvar');
  exigir(!S.coletar('exterminador').ok,'coletou a MESMA recompensa duas vezes');
  exigir(pago.moedas===premio.moedas,'a segunda coleta pagou de novo');
  exigir(S.estado().cumpridos===1,'contador de contratos cumpridos nao subiu');
}

// ── 8. PERSISTENCIA: sobrevive ao recarregar a pagina ──
{
  const {ctx,guardado}=carregar();
  const S=ctx.ContractsSystem;
  S.configurar({});
  S.aceitar('exterminador');
  S.aoTerminarRun(retrato({team:{...retrato().team,kills:99}}));
  const antes=S.estado();
  exigir(guardado.has(S.CHAVE),`nada foi gravado na chave ${S.CHAVE}`);

  // recarrega do zero, com o mesmo armazenamento
  const ctx2={console,SaveSystem:{
    readJSON:(k,p)=>guardado.has(k)?JSON.parse(guardado.get(k)):p,
    writeJSON:(k,v)=>guardado.set(k,JSON.stringify(v)),
  },RunStats:{getSnapshot:()=>null,on(){}}};
  ctx2.window=ctx2; ctx2.globalThis=ctx2;
  vm.createContext(ctx2);
  vm.runInContext(dados,ctx2); vm.runInContext(sistema,ctx2);
  ctx2.ContractsSystem.configurar({});
  const depois=ctx2.ContractsSystem.estado();
  exigir(depois.concluidos.length===antes.concluidos.length,'os concluidos nao sobreviveram ao reload');
  exigir(depois.concluidos[0]?.id===antes.concluidos[0]?.id,'o concluido salvo mudou de identidade');
  exigir(depois.oferta.length===ctx2.ContractsSystem.OFERTA,'a oferta nao sobreviveu ao reload');

  // save corrompido nao pode derrubar o sistema
  guardado.set(S.CHAVE,'{"oferta":["nao_existe"],"ativos":[{"id":"tambem_nao"}],"concluidos":null}');
  const ctx3={console,SaveSystem:ctx2.SaveSystem,RunStats:{getSnapshot:()=>null,on(){}}};
  ctx3.window=ctx3; ctx3.globalThis=ctx3;
  vm.createContext(ctx3);
  vm.runInContext(dados,ctx3); vm.runInContext(sistema,ctx3);
  ctx3.ContractsSystem.configurar({});
  const limpo=ctx3.ContractsSystem.estado();
  exigir(limpo.oferta.every(id=>!!ctx3.ContractsData.CONTRATOS.find(c=>c.id===id)),
    'save corrompido deixou id invalido na oferta');
  exigir(limpo.ativos.length===0,'save corrompido deixou contrato invalido ativo');
}

// ── 9. ACAMPAMENTO: ponto, arte e profundidade ──
{
  exigir(interacao.includes("id:'contratos'"),'o ponto de interacao do quadro nao existe');
  exigir(/id:'contratos'[^}]*rotulo:'Quadro de Contratos'/.test(interacao),'o ponto do quadro esta sem rotulo proprio');
  exigir(layout.includes('const QUADRO')&&layout.includes('const GUERREIRO'),'faltam as coordenadas do quadro e do Guerreiro');
  exigir(/QUADRO,GUERREIRO/.test(layout),'coordenadas novas nao foram exportadas em CampLayoutData');
  exigir(html.includes('contratos:()=>window.ContractsUI.abrir()'),'CampV2 nao liga o ponto do quadro a interface');
  exigir(html.includes('window.CampContractBoard.create('),'CampV2 nao cria o desenhista do quadro');
  exigir(html.includes('if(QUADRO.fy*MH <= S.y) desenharQuadro(c,t);')&&
         html.includes('if(QUADRO.fy*MH > S.y) desenharQuadro(c,t);'),
    'o quadro nao respeita a profundidade por Y');
  exigir(html.includes('if(GUERREIRO.fy*MH <= S.y) desenharGuerreiro(c,t);')&&
         html.includes('if(GUERREIRO.fy*MH > S.y) desenharGuerreiro(c,t);'),
    'o Guerreiro nao respeita a profundidade por Y');
  exigir(html.includes("'#contracts-overlay'"),'o acampamento nao pausa com o quadro aberto');
  exigir(colisao.includes('Quadro de Contratos'),'o quadro nao tem colisao');
  exigir(quadro.includes("heroImage('warrior'"),'o NPC do quadro nao usa a sprite do Guerreiro');
  exigir(/ellipse\(x,y,11,4/.test(quadro),'o Guerreiro esta sem sombra no chao');
  exigir(quadro.includes('Math.sin(t*.0016)'),'o Guerreiro esta sem a leve respiracao');

  // o quadro precisa ficar PERTO da pescaria e FORA dos bloqueios existentes
  const pega=(re,fonte)=>{const m=fonte.match(re);return m?Number(m[1]):NaN;};
  const qx=pega(/const QUADRO\s*=\s*\{fx:([\d.]+)/,layout);
  const qy=pega(/const QUADRO\s*=\s*\{fx:[\d.]+,\s*fy:([\d.]+)/,layout);
  const lagoX=pega(/id:'lago',\s*fx:([\d.]+)/,interacao);
  const lagoY=pega(/id:'lago',\s*fx:[\d.]+,\s*fy:([\d.]+)/,interacao);
  /* O jogador escolheu a faixa ENTRE A PLANTACAO E A LAGOA. As checagens
     antigas cobravam proximidade da pescaria, que era o pedido da
     especificacao original — se ficassem, reprovariam o que ele pediu. */
  const hortaDir=0.436;   // fx + fw da HORTA
  const lagoaEsq=0.585;   // borda esquerda do lago
  exigir(qx>hortaDir&&qx<lagoaEsq,
    `o quadro saiu da faixa entre a plantacao (${hortaDir}) e a lagoa (${lagoaEsq}): fx=${qx}`);
  exigir(qy>0.10&&qy<0.40,'o quadro saiu da altura da faixa entre plantacao e lagoa');
  // e nao pode sentar em cima do caminho central que liga a fogueira ao pier
  exigir(qx<0.500||qx>0.558,'o quadro sentou em cima do caminho central');

  /* O GUERREIRO PRECISA PISAR EM CHAO LIVRE.
     Faltava esta checagem e por isso ele passou despercebido DENTRO do
     colisor do braseiro que fica ao lado da tenda do Merlin: dava para
     conversar, mas ele pisava num objeto e a area de aproximacao ficava
     espremida. Aqui os bloqueios reais sao carregados e a posicao dele e' a
     do proprio jogo, com a mesma sola de 16x10. */
  {
    const ctx={console}; ctx.window=ctx; ctx.globalThis=ctx;
    vm.createContext(ctx);
    vm.runInContext(colisao,ctx);
    const F=(fx,fy,fw,fh)=>({fx,fy,fw,fh});
    const E=(fx,fy,frx,fry=frx)=>({fx,fy,frx,fry});
    const mapa=ctx.CampCollisionMap.create(F,E);
    const MW=1447, MH=1087;
    const emRet=(x,y,b)=>x>=b.fx*MW&&x<=(b.fx+b.fw)*MW&&y>=b.fy*MH&&y<=(b.fy+b.fh)*MH;
    const emEli=(x,y,e)=>{const rx=e.frx*MW,ry=e.fry*MH;if(rx<=0||ry<=0)return false;
      const dx=(x-e.fx*MW)/rx,dy=(y-e.fy*MH)/ry;return dx*dx+dy*dy<=1;};
    const bloqueado=(x,y)=>mapa.PASSAGENS.some(p=>emRet(x,y,p))?false:
      (mapa.BLOQUEIOS.some(b=>emRet(x,y,b))||mapa.BLOQUEIOS_CIRCULARES.some(e=>emEli(x,y,e)));
    const sola=[[-8,-5],[8,-5],[-8,5],[8,5],[0,0]];
    const livre=(x,y)=>sola.every(([ox,oy])=>!bloqueado(x+ox,y+8+oy));
    const gx=pega(/const GUERREIRO\s*=\s*\{fx:([\d.]+)/,layout);
    const gy=pega(/const GUERREIRO\s*=\s*\{fx:[\d.]+,\s*fy:([\d.]+)/,layout);
    exigir(livre(gx*MW,gy*MH),'o Guerreiro esta em cima de um colisor do acampamento');
    // e o quadro nao pode tapar o caminho para a pescaria
    /* O corredor do caminho central (fx .505 a .553), da altura do quadro
       ate' acima da fogueira, tem de continuar 100% andavel. Um ponto so'
       nao provava nada: o colisor do mural podia encostar na beira e o
       teste passar mesmo assim. */
    let corredor=0,totalCorredor=0;
    for(let fx=.505; fx<=.553; fx+=.004) for(let fy=.16; fy<=.44; fy+=.01){
      totalCorredor++; if(livre(fx*MW,fy*MH)) corredor++;
    }
    exigir(corredor===totalCorredor,
      `o quadro invadiu o caminho central (${totalCorredor-corredor} pontos bloqueados)`);

    // area andavel onde a conversa dele vence o ponto do quadro
    const pI=id=>{
      const linha=interacao.split(/\r?\n/).find(l=>l.includes("id:'"+id+"'"))||'';
      const n=r=>{const m=linha.match(r);return m?Number(m[1]):NaN;};
      return {x:n(/fx:([0-9.]+)/), y:n(/fy:([0-9.]+)/), r:n(/raio:([0-9]+)/)};
    };
    const g=pI('guerreiro'), c=pI('contratos');
    let area=0;
    for(let x=g.x*MW-80;x<=g.x*MW+80;x+=3) for(let y=g.y*MH-80;y<=g.y*MH+80;y+=3){
      if(!livre(x,y)) continue;
      const dg=Math.hypot(x-g.x*MW,y-g.y*MH), dc=Math.hypot(x-c.x*MW,y-c.y*MH);
      if(dg<g.r&&(dc>=c.r||dg<dc)) area++;
    }
    exigir(area>=200,`a conversa do Guerreiro tem pouca area ANDAVEL (${area} pontos)`);
  }
}

// ── 10. INTERFACE E POS-RUN ──
{
  exigir(ui.includes('ContractsUI'),'a interface nao expoe ContractsUI');
  for(const acao of ['aceitar','abandonar','atualizar','coletar','fechar'])
    exigir(ui.includes(`function ${acao}(`),`a interface nao tem a acao ${acao}`);
  exigir(ui.includes('CONCLUÍDO'),'a interface nao marca contrato concluido');
  exigir(ui.includes('.gr-cnome{font-size:calc(18px * var(--gr-k))'),'o nome do contrato voltou a usar fonte pequena');
  exigir(ui.includes('.gr-cdesc{margin:0;font-size:calc(14px * var(--gr-k))'),'a descricao do contrato voltou a usar fonte pequena');

  /* A interface segue o MOLDE DA CONVERSA DO ARQUEIRO — foi pedido assim.
     Estes itens sao o que define aquele molde; se sumirem, o Guerreiro
     volta a falar um idioma proprio. */
  exigir(ui.includes("assets/heroes/warrior/idle_south.png"),'a conversa nao mostra o retrato do Guerreiro');
  exigir(/translateY\(120%\)/.test(ui),'o painel nao entra deslizando de baixo, como o do Arqueiro');
  exigir(ui.includes("e.key==='Escape'"),'ESC nao fecha o painel');
  exigir(/e\.target===el/.test(ui),'clique fora nao fecha o painel');
  exigir(ui.includes('ESC / clique fora para sair'),'falta a dica de saida do molde do Arqueiro');
  exigir(/'▸ '/.test(ui)||ui.includes('▸ '),'as opcoes nao usam o marcador ▸ do Arqueiro');
  exigir(ui.includes('align-items:flex-end'),'o painel nao esta ancorado embaixo');

  /* O PAINEL TEM DE CABER NA MOLDURA DO ACAMPAMENTO.
     Preso ao viewport (position:fixed + vw/vh) ele passava por fora do
     palco: numa janela larga a caixa ficava mais larga e mais alta que a
     propria tela do jogo. Agora mora dentro de #camp2-palco e as medidas
     saem de --gr-k, uma escala calculada da largura dele. */
  exigir(ui.includes("getElementById('camp2-palco')"),'o painel nao se ancora na moldura do acampamento');
  exigir(/\.gr-fundo\{position:absolute;inset:0/.test(ui),'o painel voltou a se prender ao viewport');
  exigir(ui.includes('--gr-k'),'as medidas do painel nao acompanham o tamanho do palco');
  exigir(ui.includes('escalaDoPalco'),'falta o calculo de escala a partir do palco');
  exigir(/max-height:94%/.test(ui),'a caixa nao esta limitada a altura do palco');
  exigir(/addEventListener\('resize'/.test(ui),'a escala nao acompanha o redimensionamento da janela');
  {
    // nenhuma medida do painel pode depender do viewport
    const bloco=ui.slice(ui.indexOf('.gr-fundo{'),ui.indexOf('`;',ui.indexOf('.gr-fundo{')));
    const viewport=bloco.match(/\d+(\.\d+)?v[wh]\b/g)||[];
    exigir(viewport.length===0,
      `o CSS do painel ainda usa medidas de viewport (${viewport.slice(0,4).join(', ')}) — elas ignoram o tamanho do palco`);
  }
  exigir(/gr-retrato/.test(ui)&&/gr-nome/.test(ui)&&/gr-fala/.test(ui),
    'a conversa perdeu a estrutura retrato + nome + fala');

  // ── fala do Guerreiro ──
  exigir(ui.includes('function falar('),'o Guerreiro nao tem fala propria');
  exigir(ui.includes('function falaDoMomento('),'a fala do Guerreiro nao olha o estado do quadro');
  for(const caso of ['semContrato','comContrato','premioPronto','ocioso'])
    exigir(ui.includes(`${caso}:[`),`falta o conjunto de falas "${caso}"`);
  exigir(ui.includes("id:'guerreiro'")||interacao.includes("id:'guerreiro'"),'o Guerreiro nao tem ponto de interacao');
  exigir(interacao.includes("rotulo:'Falar com o Guerreiro'"),'o ponto do Guerreiro esta sem rotulo proprio');
  exigir(html.includes('guerreiro:()=>window.ContractsUI.falar()'),'CampV2 nao liga o Guerreiro a fala');
  exigir(html.includes("'#warrior-talk'"),'o acampamento nao pausa com a caixa de fala aberta');
  exigir(ui.includes('doGuerreiroParaOQuadro'),'a fala nao leva ao quadro');
  /* A primeira versao deste teste comparava a distancia entre os dois
     pontos com o raio do Guerreiro — e reprovou um layout que funciona.
     Errado: o CampV2 nao escolhe por raio, escolhe o MAIS PROXIMO dentro
     do raio. Entao o teste certo e' simular essa regra numa grade e exigir
     que exista uma regiao andavel onde a conversa ganha. */
  {
    const linhas=interacao.split(/\r?\n/);
    const ponto=id=>{
      const linha=linhas.find(l=>l.includes("id:'"+id+"'"))||'';
      const n=r=>{const m=linha.match(r);return m?Number(m[1]):NaN;};
      return {x:n(/fx:([0-9.]+)/), y:n(/fy:([0-9.]+)/), r:n(/raio:([0-9]+)/)};
    };
    const g=ponto('guerreiro'), q=ponto('contratos');
    const MW=1447, MH=1087;
    let venceG=0, venceQ=0;
    for(let x=g.x*MW-90;x<=g.x*MW+90;x+=3){
      for(let y=g.y*MH-90;y<=g.y*MH+90;y+=3){
        const dg=Math.hypot(x-g.x*MW,y-g.y*MH), dq=Math.hypot(x-q.x*MW,y-q.y*MH);
        const alcanceG=dg<g.r, alcanceQ=dq<q.r;
        if(alcanceG&&(!alcanceQ||dg<dq)) venceG++;
        else if(alcanceQ) venceQ++;
      }
    }
    exigir(venceG>400,`a conversa do Guerreiro quase nao tem area propria (${venceG} pontos)`);
    exigir(venceQ>0,'o quadro perdeu toda a area para o Guerreiro');
    const dist=Math.hypot((g.x-q.x)*MW,(g.y-q.y)*MH);
    exigir(dist>18,'Guerreiro e quadro praticamente no mesmo ponto');
    exigir(dist<160,'o Guerreiro ficou longe demais do proprio quadro');
  }

  // ── interface e pos-run (restaurados junto com a checagem de geometria) ──
  exigir(/FALAS\s*=\s*\[/.test(ui),'faltam as falas do Guerreiro no topo do mural');
  exigir((ui.match(/'[^']*\.'/g)||[]).length>=4,'poucas falas de ambientacao');
  exigir(posRun.includes('contractsSection'),'o pos-run nao mostra contratos');
  exigir(posRun.includes('global.ContractsSystem'),'o pos-run le contratos sem acoplamento fraco');
  exigir(/if\(!sistema\|\|typeof sistema\.estado!=='function'\)return''/.test(posRun),
    'o pos-run quebra se o modulo de contratos nao estiver carregado');
  exigir(html.includes('ContractsSystem.configurar('),'o pagamento das recompensas nunca e ligado');
  exigir(/adicionarMoedas:\(v\)=>\{[\s\S]*totalCoins\+=/.test(html),
    'a recompensa em moedas nao chega em totalCoins');
  exigir(html.includes("if(novaVisita && typeof ContractsSystem!=='undefined') ContractsSystem.aoEntrarNoAcampamento();"),
    'a visita ao acampamento nao renova o reroll de contratos');
  exigir(html.includes("S.voltarAoFechar=false; abrir(false);"),
    'retornar de um painel ainda e tratado como uma nova visita ao acampamento');
  exigir(!/function abrir\(\)[\s\S]{0,260}sis\(\)\.aoEntrarNoAcampamento\(\)/.test(ui),
    'reabrir o quadro renova o reroll sem uma nova visita ao acampamento');
}

// ── 11. O MODULO CARREGA SOZINHO, SEM DOM ──
new vm.Script(dados,{filename:'contracts-data.js'});
new vm.Script(sistema,{filename:'contracts-system.js'});
new vm.Script(ui,{filename:'contracts-ui.js'});
new vm.Script(quadro,{filename:'contract-board-renderer.js'});

console.log(`OK: Quadro de Contratos verificado (${checagens} verificacoes).`);
