import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const optionalFiles=['src/weapons/weapon-data.js','src/weapons/weapon-system.js','src/weapons/projectile-system.js'];
const sources=[read('index.html'),...optionalFiles.filter(file=>fs.existsSync(path.join(root,file))).map(read)];
const source=sources.join('\n');
let checks=0;

function assert(condition,message){
  if(!condition)throw new Error(`FALHA: ${message}`);
  checks++;
}

function extractObjectLiteral(name){
  const marker=`const ${name}=`;
  const start=source.indexOf(marker);
  assert(start>=0,`${name} nao foi encontrado`);
  const brace=source.indexOf('{',start+marker.length);
  assert(brace>=0,`${name} nao possui objeto literal`);
  let depth=0,string='',escaped=false;
  for(let index=brace;index<source.length;index++){
    const char=source[index];
    if(string){
      if(escaped)escaped=false;
      else if(char==='\\')escaped=true;
      else if(char===string)string='';
      continue;
    }
    if(char==='\''||char==='"'||char==='`'){string=char;continue;}
    if(char==='{')depth++;
    if(char==='}'&&--depth===0)return source.slice(brace,index+1);
  }
  throw new Error(`FALHA: ${name} ficou sem fechamento`);
}

const expected={
  mage:[
    ['mage_fire_staff','Cajado de Fogo',24,310,980],
    ['mage_lightning_staff','Cajado de Raio',22,320,920],
    ['mage_ice_staff','Cajado de Gelo',21,305,900],
    ['mage_arcane_staff','Cajado Arcano',23,330,840],
    ['mage_poison_staff','Cajado Venenoso',20,300,940],
    ['mage_shadow_staff','Cajado das Sombras',25,340,1050],
    ['mage_solar_staff','Cajado Solar',27,350,1250],
    ['mage_wind_staff','Cajado do Vento',19,250,820],
  ],
  warrior:[
    ['warrior_longsword','Espada Longa',27,112,780],
    ['warrior_greatsword','Espadao',38,128,1320],
    ['warrior_spear','Lanca',29,180,900],
    ['warrior_warhammer','Martelo de Guerra',34,95,1180],
    ['warrior_warshield','Escudo de Guerra',20,88,760],
    ['warrior_twinblades','Laminas Gemeas',18,92,520],
    ['warrior_chainblade','Corrente com Lamina',25,145,930],
    ['warrior_spikedmace','Maca Espinhosa',31,90,980],
  ],
  archer:[
    ['archer_shortbow','Arco Curto',15,290,520],
    ['archer_longbow','Arco Longo',28,390,1050],
    ['archer_crossbow','Besta Pesada',36,370,1450],
    ['archer_poisonbow','Arco Venenoso',17,320,760],
    ['archer_explosivebow','Arco Explosivo',23,320,980],
    ['archer_ricochetbow','Arco Ricochete',19,325,820],
    ['archer_frostbow','Arco Gelido',18,325,800],
    ['archer_thunderbow','Arco Trovejante',21,335,870],
  ],
  viking:[
    ['viking_waraxe','Machado de Guerra',32,105,880],
    ['viking_twinaxes','Machados Gemeos',22,92,590],
    ['viking_throwingaxe','Machado de Arremesso',25,300,930],
    ['viking_stormhammer','Martelo da Tempestade',31,105,1020],
    ['viking_bloodaxe','Machado de Sangue',28,100,820],
    ['viking_frostaxe','Machado Congelado',30,104,920],
    ['viking_nordicspear','Lanca Nordica',29,185,900],
    ['viking_colossalaxe','Machado Colossal',46,130,1650],
  ],
};

const specs=vm.runInNewContext(`(${extractObjectLiteral('CAMPAIGN_WEAPON_SPECS')})`);
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
assert(Object.keys(specs).join(',')==='mage,warrior,archer,viking','ordem ou classes das armas mudou');
for(const [classId,items] of Object.entries(expected)){
  assert(specs[classId].length===8,`${classId} deixou de ter exatamente oito armas`);
  items.forEach(([id,name,baseDmg,range,cd],index)=>{
    const actual=specs[classId][index];
    assert(actual[0]===id,`${classId}[${index}] mudou id (${actual[0]})`);
    assert(normalize(actual[1])===name,`${id} mudou nome (${actual[1]})`);
    assert(actual[2]===id,`${id} deixou de usar o proprio id como icone`);
    assert(actual[4]===baseDmg&&actual[5]===range&&actual[6]===cd,`${id} mudou dano, alcance ou cooldown`);
    assert(Array.isArray(actual[7])&&actual[7].length===5,`${id} deixou de ter cinco estagios de raridade`);
  });
}

const power=vm.runInNewContext(`(${extractObjectLiteral('CAMPAIGN_WEAPON_POWER')})`);
const speed=vm.runInNewContext(`(${extractObjectLiteral('CAMPAIGN_WEAPON_SPEED')})`);
assert(JSON.stringify(power)===JSON.stringify({common:1,uncommon:1.12,rare:1.25,epic:1.42,legendary:1.62}),'multiplicadores de dano por raridade mudaram');
assert(JSON.stringify(speed)===JSON.stringify({common:1,uncommon:1.04,rare:1.08,epic:1.12,legendary:1.16}),'multiplicadores de velocidade por raridade mudaram');

for(const snippet of [
  'def.baseDmg*(CAMPAIGN_WEAPON_POWER[rarity]||1)',
  'def.cd/(CAMPAIGN_WEAPON_SPEED[rarity]||1)',
  'cd/=1+getCampaignShopAttackSpeedBonus(player)',
  'cd*=def.id===\'viking_twinaxes\'?.75:.80',
  "def.id==='viking_bloodaxe'&&rarity==='legendary'",
  'player.hp/player.maxHp<.35)cd*=.80',
])assert(source.includes(snippet),`formula de dano/cooldown ausente: ${snippet}`);

const elements={
  fire:['fire','explosive'],ice:['ice','frost','frozen'],electric:['lightning','thunder','storm'],
  poison:['poison'],shadow:['shadow'],arcane:['arcane'],solar:['solar'],wind:['wind'],blood:['blood'],
};
for(const [element,needles] of Object.entries(elements)){
  for(const needle of needles)assert(source.includes(`type.includes('${needle}')`),`mapeamento ${needle} -> ${element} desapareceu`);
}
assert(source.includes("return 'physical'"),'fallback elemental fisico desapareceu');

for(const [classId,items] of Object.entries(expected)){
  for(const [id] of items)assert(source.includes(`type==='${id}'`),`${id} perdeu seu ramo de ataque`);
}
for(const snippet of [
  'new CampaignWeaponProj(player.x,player.y,a,dmg,player,weapon,shotOpts)',
  'this.life=2200*(opts.rangeMult||1)',
  'this.speed=420*(opts.speed||1)',
  'this.homing=!!opts.homing',
  'this.pierce=opts.pierce||0',
  'this.angle+=diff*.16',
  '>160*(this.opts.rangeMult||1)',
  'this.hitTargets.clear()',
  'this.opts.fireTrail&&Math.random()<.35',
  'this.speed=520*(1+(owner?.cardEffects?.projectileSpeed||0))',
  'this.angle+=diff*0.22',
  'this.life=2000',
])assert(source.includes(snippet),`fisica/comportamento de projetil ausente: ${snippet}`);

for(const snippet of [
  'p.opts.explode','p.opts.burn','p.opts.poison','p.opts.slow','p.opts.iceHits','glacial:tier>=4',
  'this.opts.echo','p.opts.ricochet','p.opts.frozenCrit','p.opts.bossBonus','this.opts.boomerang','this.opts.returnSpin',
])assert(source.includes(snippet),`efeito de projetil deixou de existir: ${snippet}`);

console.log(`OK: 32 armas, raridades, dano, cooldowns, elementos, ataques e fisica de projeteis protegidos (${checks} verificacoes).`);
