import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const html=read('index.html'),menu=read('src/ui/menu-codex-system.js');
let checks=0;
function assert(ok,message){if(!ok)throw new Error(message);checks++;}
function between(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert(a>=0&&b>a,`Bloco não encontrado: ${start}`);
  return source.slice(a,b);
}
const detail={innerHTML:'',className:''};
const grid={cards:[],appendChild(card){if(card.onClick)this.cards.push(card);}};
const ctx={
  W:800,H:600,console,
  RARITIES:['common','uncommon','rare','epic','legendary'],
  RARITY_COLORS:{common:'#aaa',uncommon:'#2c5',rare:'#27e',epic:'#93c',legendary:'#da0'},
  RARITY_NAMES:{common:'Comum',uncommon:'Incomum',rare:'Raro',epic:'Épico',legendary:'Lendário'},
  SaveSystem:{readNumber:()=>25,readText:()=> '1'},
  document:{getElementById:()=>detail,createElement:()=>({style:{}})},
  collCard:(icon,name,hint,locked,onClick)=>({icon,name,locked,onClick,appendChild(){}}),
  collItemIcon:spec=>({artPath:spec.id}),
  collIconHtml:icon=>`<img src="${icon.artPath}">`,
  collStatBar:(name,value)=>`${name}: ${value}`,
  capturedPets:{},
  PET_IMG_SETS:Object.fromEntries(['ignis','zefiro','aurora','umbra','aegis'].map(id=>[id,true])),
};
ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(read('src/classes/necromancer/necromancer-data.js'),ctx);
vm.runInContext(read('src/shop/shop-data.js'),ctx);
Object.assign(ctx,ctx.MagoShopData);
vm.runInContext(between(read('src/shop/shop-system.js'),'function campaignShopPct','function getCampaignShopEffect'),ctx);
vm.runInContext(between(menu,'function renderCollItems(grid){','// ── BESTIÁRIO ──'),ctx);
ctx.renderCollItems(grid);
const specs=[...Object.values(ctx.CAMPAIGN_CLASS_BUFFS).flat(),...ctx.CAMPAIGN_UNIVERSAL_ITEMS];
assert(grid.cards.length===48,'As 48 relíquias da campanha devem estar disponíveis');
for(const spec of specs){
  const card=grid.cards.find(card=>card.name===spec.name);assert(card,`Relíquia ausente: ${spec.name}`);
  card.onClick();
  assert((detail.innerHTML.match(/class="coll-weapon-tier"/g)||[]).length===5,`${spec.name}: faltam raridades em blocos verticais`);
  assert(!detail.innerHTML.includes('coll-boon-rarity-grid'),`${spec.name}: voltou a usar cinco colunas estreitas`);
  for(const rarity of ctx.RARITIES){
    assert(detail.innerHTML.includes(ctx.campaignShopBuffDescription(spec,rarity)),`${spec.name}: descrição ${rarity} diverge da loja`);
  }
}

vm.runInContext(between(menu,'function renderCollBosses(grid){','// ── PETS ──'),ctx);
grid.cards=[];ctx.renderCollBosses(grid);
assert(grid.cards.length===7,'Senhores deve conter os sete chefes da campanha');
const stories=new Set();
for(const card of grid.cards){
  card.onClick();
  const story=detail.innerHTML.match(/<p class="coll-det-copy">([^<]+)<\/p>/)?.[1]||'';
  assert(story.length>150,`${card.name}: história ausente ou incompleta`);stories.add(story);
  assert(detail.innerHTML.indexOf('HISTÓRIA')<detail.innerHTML.indexOf('PODERES E ATAQUES'),`${card.name}: poderes devem vir depois da história`);
  assert((detail.innerHTML.match(/<li>/g)||[]).length>=3,`${card.name}: poderes não foram separados`);
  assert(detail.innerHTML.includes('ATRIBUTOS BASE'),`${card.name}: identificar valores antes dos modificadores`);
}
assert(stories.size===7,'Cada chefe precisa de uma história própria');
// Executa apenas os construtores reais, sem iniciar combate ou alterar balanceamento.
const bossSource=read('src/campaign/boss-system.js');
for(const [name,type,wave] of [
  ['Rei Cadáver','BossSkeletonKing',5],['Aracne Ancestral','BossAracne',10],
  ['Gigante de Gelo','BossFrostBehemoth',15],['Verme Devorador','BossSandworm',20],['Balrog','BossBalrog',25],
]){
  const constructor=between(bossSource,`class ${type} {`,'\n  update(');
  const boss=vm.runInContext(`new (${constructor}})(${wave})`,ctx);
  grid.cards.find(card=>card.name===name).onClick();
  assert(detail.innerHTML.includes(`Vida: ${boss.maxHp}`),`${name}: vida base desatualizada`);
  assert(detail.innerHTML.includes(`Dano: ${boss.damage}`),`${name}: dano base desatualizado`);
  if(type==='BossSandworm')assert(detail.innerHTML.includes(`${boss.diveCd/1000} segundos`),'Recarga do mergulho desatualizada');
}

vm.runInContext(between(html,'const PET_DEFS = {','// Pet state')+'\nwindow.PET_DEFS=PET_DEFS;',ctx);
vm.runInContext(between(menu,'function gamePetBossIconHtml(','function hydrateGamePixelIcons('),ctx);
vm.runInContext(between(menu,'function renderCollPets(grid){','// ── BÊNÇÃOS ──'),ctx);
grid.cards=[];ctx.renderCollPets(grid);
assert(grid.cards.length===5,'Companheiros deve conter os cinco pets');
for(const def of Object.values(ctx.PET_DEFS)){
  grid.cards.find(card=>card.name===def.name).onClick();
  const sheetPath=`assets/pets/animated-v2/${def.id}.png`;
  assert(detail.innerHTML.includes(sheetPath),`${def.name}: forma selvagem usa arte antiga`);
  assert(detail.innerHTML.includes(`assets/pets/${def.id}/icon.png`),`${def.name}: preservar a forma companheira`);
  assert(detail.innerHTML.includes(`aria-label="${def.bossName}"`),`${def.name}: falta nome acessível da forma selvagem`);
  const bytes=fs.readFileSync(path.join(root,sheetPath));
  assert(bytes.readUInt32BE(16)/4===bytes.readUInt32BE(20)/3,`${def.name}: folha não tem quadros quadrados 4 × 3`);
}
assert(ctx.gamePetBossIconHtml('inexistente')==='','Pet desconhecido não deve gerar URL quebrada');
const petStyle=html.match(/\.pet-wild-art\s*\{([^}]+)\}/)?.[1]||'';
assert(petStyle.includes('background-size:400% 300%')&&petStyle.includes('background-position:0 0'),'Prévia deve mostrar somente um quadro de repouso');
assert(petStyle.includes('max-width:100%')&&petStyle.includes('aspect-ratio:1'),'Arte selvagem deve se ajustar sem deformar');
assert(/\.coll-detail > \*\s*\{[^}]*flex-shrink:0/.test(html),'Detalhes longos não podem esmagar blocos e textos');
assert(/\.coll-weapon-tier-head\s*\{[^}]*flex-wrap:wrap/.test(html),'Cabeçalhos de raridade devem quebrar linha em telas estreitas');
console.log(`OK: detalhes do Códex validaram 48 relíquias, 7 histórias/poderes, atributos reais e 5 formas selvagens (${checks} verificações).`);
