import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const uiSource=fs.readFileSync(new URL('../src/ui/menu-codex-system.js',import.meta.url),'utf8');
assert.match(uiSource,/ITENS UNIVERSAIS DA LOJA/,'O Códex deve listar os itens universais da campanha.');
const necromancerDataSource=fs.readFileSync(new URL('../src/classes/necromancer/necromancer-data.js',import.meta.url),'utf8');
const shopDataSource=fs.readFileSync(new URL('../src/shop/shop-data.js',import.meta.url),'utf8');
const shopSystemSource=fs.readFileSync(new URL('../src/shop/shop-system.js',import.meta.url),'utf8');
assert.match(shopDataSource,/const CAMPAIGN_CLASS_BUFFS=/,'Os dados da loja da campanha não foram encontrados.');
assert.match(shopSystemSource,/function buildShopPool\(/,'O sistema da loja da campanha não foi encontrado.');

const rarities=['common','uncommon','rare','epic','legendary'];
const weaponDefs={};
for(const classId of ['mage','warrior','archer','viking']){
  for(let index=0;index<3;index++){
    const id=`${classId}_test_weapon_${index}`;
    weaponDefs[id]={id,classId,name:`Arma ${classId} ${index}`,desc:rarity=>`Arma ${rarity}`,pixelIcon:'sword',baseDmg:10,range:100,cd:800,type:classId==='mage'?'magic':classId==='archer'?'ranged':'melee'};
  }
}

const context={
  console,Math,performance,setTimeout,clearTimeout,
  window:{},
  RARITIES:rarities,
  RARITY_NAMES:{common:'Comum',uncommon:'Incomum',rare:'Raro',epic:'Épico',legendary:'Lendário'},
  RARITY_COLORS:{common:'#aaa',uncommon:'#2d6',rare:'#4af',epic:'#c6f',legendary:'#fc0'},
  WEAPON_DEFS:weaponDefs,
  CLASS_DEFS:{mage:{name:'Mago'},warrior:{name:'Guerreiro'},archer:{name:'Arqueiro'},viking:{name:'Viking'},necromancer:{name:'Necromante'}},
  selectedClass:{p1:'mage',p2:'warrior'},gameMode:1,wave:1,difficulty:'medium',
  DIFF:{medium:{shopCap:3,shopBase:1,shopWave:.02,shopBiome:.05,rerollBase:2,rerollWave:.2}},
  player:{idx:0,classId:'mage',hp:100,maxHp:100,speed:100,dmgReduce:0,shopEffects:{}},player2:null,
  enemies:[],bossOrc:null,bossSkel:null,bossSpider:null,bossMajor:null,petBoss:null,
  projs:[],state:'playing',totalCoins:999,
  ArrowProj:class{},CampaignWeaponProj:class{},
  spawnParts(){},spawnLevelUpNotice(){},healCampaignPlayer(){return 0;},
  allTargets(){return[];},nearestWeaponTargets(){return[];},
  campaignWeaponDamage(){return 10;},campaignWeaponCooldown(){return 800;},
  addWeapon(){},canAddWeapon(){return true;},getSlots(){return[];},
  gamePixelIconHtml(){return'';},renderShopInventory(){},buildFuseUI(){},hideAllScreens(){},showScreen(){},advWave(){},
  document:{getElementById(){return null;},querySelectorAll(){return[];},querySelector(){return null;},createElement(){return {classList:{add(){},toggle(){}},style:{setProperty(){}},dataset:{}};}},
};
vm.createContext(context);
context.window=context;
vm.runInContext(necromancerDataSource,context,{filename:'necromancer-data.js'});
vm.runInContext(shopDataSource,context,{filename:'shop-data.js'});
vm.runInContext(shopSystemSource,context,{filename:'shop-system.js'});

const counts=vm.runInContext(`({classes:Object.fromEntries(Object.entries(CAMPAIGN_CLASS_BUFFS).map(([id,list])=>[id,list.length])),universals:CAMPAIGN_UNIVERSAL_ITEMS.length,allFive:Object.values(CAMPAIGN_CLASS_BUFFS).flat().concat(CAMPAIGN_UNIVERSAL_ITEMS).every(item=>item.values.length===5)})`,context);
assert.deepEqual({...counts.classes},{mage:8,warrior:8,archer:8,viking:8,necromancer:8});
assert.equal(counts.universals,8);
assert.equal(counts.allFive,true,'Todo item precisa ter Comum, Incomum, Raro, Épico e Lendário.');

vm.runInContext(`buildShopPool()`,context);
const categories=vm.runInContext(`shopPool.map(item=>item&&item.category)`,context);
assert.deepEqual([...categories],['weapon','classBuff','universal'],'A loja solo deve mostrar arma, buff de classe e universal.');

const uniqueResult=vm.runInContext(`(()=>{const bought=shopPool.find(item=>item?.isClassBuff);const key=shopItemKey(bought);shopPurchasedUnique.add(key);shopLocked=[false,false,false];shopRerollsThisVisit++;buildShopPool();return {key,repeated:shopPool.some(item=>item&&shopItemKey(item)===key)};})()`,context);
assert.equal(uniqueResult.repeated,false,'Buff comprado reapareceu em um reroll.');

const applied=vm.runInContext(`(()=>{const spec=CAMPAIGN_CLASS_BUFFS.mage.find(item=>item.id==='mage_arcane_core');applyCampaignShopItem(player,spec,'uncommon');const universal=CAMPAIGN_UNIVERSAL_ITEMS.find(item=>item.id==='universal_red_heart');applyCampaignShopItem(player,universal,'rare');applyCampaignShopItem(player,CAMPAIGN_CLASS_BUFFS.mage.find(item=>item.id==='mage_spellbook'),'common');applyCampaignShopItem(player,CAMPAIGN_UNIVERSAL_ITEMS.find(item=>item.id==='universal_agile_gloves'),'common');return {magicDamage:player.shopEffects.magicDamage,attackSpeed:player.shopEffects.attackSpeed,maxHp:player.maxHp,hp:player.hp};})()`,context);
assert.equal(applied.magicDamage,.08,'O valor Incomum do Núcleo Arcano está incorreto.');
assert.equal(applied.maxHp,112,'O Coração Rubro raro deve conceder 12 de vida máxima.');
assert.equal(applied.hp,112,'O aumento de vida máxima deve curar o mesmo valor.');
assert.equal(applied.attackSpeed,.09,'Velocidade de ataque de classe e universal deve acumular.');
assert.equal(vm.runInContext(`getCampaignShopDamageBonus(player,null)`,context),.08,'O bônus de dano mágico não entrou no cálculo de combate.');
assert.equal(vm.runInContext(`getCampaignShopAttackSpeedBonus(player)`,context),.09,'O bônus de velocidade não entrou no cooldown de combate.');

const warriorEffects=vm.runInContext(`(()=>{const warrior={idx:0,classId:'warrior',hp:20,maxHp:100,speed:100,dmgReduce:0,shopEffects:{}};applyCampaignShopItem(warrior,CAMPAIGN_CLASS_BUFFS.warrior.find(item=>item.id==='warrior_guardian_medallion'),'legendary');warrior.hp=20;const first=campaignShopIncomingDamageMultiplier(warrior);const second=campaignShopIncomingDamageMultiplier(warrior);return {first,second,maxHp:warrior.maxHp};})()`,context);
assert.equal(warriorEffects.maxHp,130);
assert.equal(warriorEffects.first,.9,'A defesa emergencial do Medalhão lendário não ativou.');
assert.equal(warriorEffects.second,.9,'A defesa emergencial precisa durar quatro segundos.');

context.gameMode=2;
context.player2={idx:1,classId:'warrior',hp:100,maxHp:100,speed:100,dmgReduce:0,shopEffects:{}};
vm.runInContext(`shopLocked=[false,false,false];shopPool=[];shopRerollsThisVisit=0;buildShopPool()`,context);
const coop=vm.runInContext(`shopPool.map(item=>({category:item?.category,pidx:item?.pidx,classId:item?.classId}))`,context);
assert.equal(coop.filter(item=>item.category==='universal').length,1);
assert.ok(coop.filter(item=>item.category!=='universal').every(item=>item.pidx===0||item.pidx===1),'Ofertas de classe no cooperativo precisam indicar P1 ou P2.');

console.log('OK: 40 buffs de classe, 8 universais, 5 raridades, composição da loja e não repetição validados.');
