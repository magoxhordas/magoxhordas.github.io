import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(file,'utf8');
const html=read('index.html');
const objectives=read('src/campaign/campaign-objectives.js');
const enemies=read('src/enemies/normais-sprites.js');
const necromancer=read('src/classes/necromancer/necromancer-system.js');
const bosses=read('src/campaign/boss-system.js');
const dungeon=read('src/dungeon/dungeon-system.js');
let checks=0;
const ok=(condition,message)=>{assert.ok(condition,message);checks++;};
const includesAll=(source,needles,scope)=>needles.forEach(needle=>ok(source.includes(needle),`${scope}: ausente ${needle}`));

for(const [name,source] of Object.entries({objectives,enemies,necromancer,bosses,dungeon}))new vm.Script(source,{filename:name});

includesAll(objectives,[
  'function tingirObjeto(ctx,reg,cor,forca)',
  'if(recorte)auxObjCtx.drawImage(im,recorte.x,recorte.y,recorte.w,recorte.h,0,0,w,h);',
  'function getTodosAlvos(){return alive(current.targets);}',
  'getCombatTargets,getSolidTargets,getTodosAlvos,getCurrentDefinition',
  'POSITIONS,desenharObjeto,tingirObjeto',
], 'objetivos tingidos');
ok((objectives.match(/desenharObjeto\([^\n]+,target\)/g)||[]).length>=4,'altares, ninhos e fogueiras devem registrar a arte desenhada');

includesAll(enemies,[
  'function tingir(ctx2, p, cor, forca)',
  "auxCtx.globalCompositeOperation = 'source-atop';",
  'desenhar, tingir, quadro, quadroGolpe',
], 'sprites normais tingidos');

includesAll(necromancer,[
  'const brilhos=new Map();',
  'function porBrilho(ctx,cor,raio,desfoque,x,y)',
  "porBrilho(ctx,'#64ffc0',4.2,10,orb.x,orb.y)",
  "if(comFiltro)ctx.filter='none';",
], 'otimizacao do Necromante');

ok(!bosses.includes('if(window.OrcSprites&&this.flashTimer<=0)'),'Brutamontes nao pode trocar para arte antiga durante o flash');
includesAll(bosses,['if(window.OrcSprites){','if(usouArte){','Math.min(1,this.flashTimer/100)*.5'], 'flash do Brutamontes');

includesAll(dungeon,[
  "_CORES_EL:{fire:'#ff3a10',poison:'#3ac24d',ice:'#7fd4ff'",
  '_marcarEl(alvo,el,ms)',
  '_paletaEl(pal,cor,forca)',
  "this._marcarEl(this,'poison',1800)",
  "this._marcarEl(this,'fire',1100)",
  'const elE=this._elAtivo(e);',
  'const elP=this._elAtivo(this);',
], 'efeitos da Masmorra');

includesAll(html,[
  'function txtSeMudou(el,valor)',
  "txtSeMudou(document.getElementById('wav'),wave);",
  'function marcarElemento(alvo,elemento,dur=700)',
  'function tingirHeroi(ctx2,q,cor,forca)',
  'function drawLegacyEnemyStatusFx(e,t)',
  'function drawEnemyStatusFx(e,t)',
  'this._ultimoQuadroHeroi={img:heroVisual.img',
  'this._ultimoQuadro={tipo:this.type',
  "marcarElemento(pl,'poison',1400)",
  "marcarElemento(pl,'fire',900)",
  'for(const alvo of campaignObjectives.getTodosAlvos())drawEnemyStatusFx(alvo,t);',
  "src/blessings/blessing-affinity-system.js?v=20260903-affinity",
  'getGlobalAttackSpeedBonus:owner=>getCampaignShopAttackSpeedBonus(owner)+(typeof getBlessingAttackSpeedBonus',
  'class="paired-action-row"',
], 'integracao sem regressoes');

// Exercita os dois caminhos de source-atop com imagens prontas e canvas falso.
class FakeImage{
  constructor(){this.complete=true;this.naturalWidth=48;this.naturalHeight=48;this.src='';}
}
function fakeContext(){
  return {draws:[],globalAlpha:1,globalCompositeOperation:'source-over',imageSmoothingEnabled:true,
    save(){},restore(){},translate(){},scale(){},clearRect(){},fillRect(){},
    drawImage(...args){this.draws.push(args);}};
}
const document={createElement(){const context=fakeContext();return {width:0,height:0,_context:context,getContext(){return context;}};}};

const objectiveContext={console,Image:FakeImage,document};objectiveContext.window=objectiveContext;
vm.createContext(objectiveContext);vm.runInContext(objectives,objectiveContext);
const owner={};const renderedCtx=fakeContext();
ok(objectiveContext.CampaignObjectives.desenharObjeto(renderedCtx,'ninho_east',100,80,48,owner),'recorte do casulo deve desenhar');
ok(owner._ultimoObjeto?.nome==='ninho_east','objeto deve registrar o recorte usado');
ok(objectiveContext.CampaignObjectives.tingirObjeto(renderedCtx,owner._ultimoObjeto,'#00ff00',.4),'recorte do casulo deve aceitar tintura');

const enemyContext={console,Image:FakeImage,document};enemyContext.window=enemyContext;
vm.createContext(enemyContext);vm.runInContext(enemies,enemyContext);
const tipo=Object.keys(enemyContext.InimigosNormais.DEFS)[0];
const def=enemyContext.InimigosNormais.DEFS[tipo];
ok(enemyContext.InimigosNormais.tingir(fakeContext(),{tipo,x:100,pesY:80,dir:'south',estado:'idle',idx:0,flip:false,escala:def.escBase},'#ff0000',.5),'sprite normal deve aceitar tintura');

console.log(`OK: efeitos importados do Claude, desempenho e protecoes contra regressao validados (${checks} verificacoes).`);
