import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const weaponIds={
  mage:['mage_fire_staff','mage_lightning_staff','mage_ice_staff','mage_arcane_staff','mage_poison_staff','mage_shadow_staff','mage_solar_staff','mage_wind_staff'],
  warrior:['warrior_longsword','warrior_greatsword','warrior_spear','warrior_warhammer','warrior_warshield','warrior_twinblades','warrior_chainblade','warrior_spikedmace'],
  archer:['archer_shortbow','archer_longbow','archer_crossbow','archer_poisonbow','archer_explosivebow','archer_ricochetbow','archer_frostbow','archer_thunderbow'],
  viking:['viking_waraxe','viking_twinaxes','viking_throwingaxe','viking_stormhammer','viking_bloodaxe','viking_frostaxe','viking_nordicspear','viking_colossalaxe']
};

function assert(ok,message){if(!ok)throw new Error(message);}
function pngSize(file){
  const data=fs.readFileSync(file);
  assert(data.subarray(1,4).toString()==='PNG',`PNG inválido: ${path.basename(file)}`);
  return [data.readUInt32BE(16),data.readUInt32BE(20),data.length];
}

const ids=Object.values(weaponIds).flat();
assert(ids.length===32&&new Set(ids).size===32,'A lista deve conter 32 armas únicas.');
for(const id of ids){
  assert(html.includes(`['${id}'`)||html.includes(`"${id}"`),`Arma ausente das definições: ${id}`);
  const file=path.join(root,'assets','weapons',`${id}.png`);
  assert(fs.existsSync(file),`Ícone ausente: ${id}.png`);
  const [width,height,bytes]=pngSize(file);
  assert(width===320&&height===320,`Dimensão incorreta em ${id}.png: ${width}x${height}`);
  assert(bytes>10_000,`Ícone parece vazio ou excessivamente comprimido: ${id}.png`);
}

const requiredSnippets=[
  'function campaignWeaponIconHtml(',
  "const icon={weaponType:def.id};",
  "collIconHtml({weaponType:w.id},54)",
  "campaignWeaponIconHtml(def.id,52,'campaign-weapon-art-hud')",
  'function markEnemyWeaponStatus(',
  "markEnemyWeaponStatus(target,weapon);",
  "markEnemyWeaponStatus(target,'ice',duration);",
  "markEnemyWeaponStatus(target,'poison',duration);",
  "markEnemyWeaponStatus(target,'fire',duration);",
  "markEnemyWeaponStatus(le,'electric');",
  'drawEnemyStatusFx(bossOrc,t)',
  'drawEnemyStatusFx(bossSkel,t)',
  'drawEnemyStatusFx(bossSpider,t)',
  'drawEnemyStatusFx(bossMajor,t)',
  'drawEnemyStatusFx(petBoss,t)'
];
for(const snippet of requiredSnippets)assert(html.includes(snippet),`Integração ausente: ${snippet}`);
for(const element of ['fire','ice','electric','poison','shadow','arcane','solar','wind','blood','physical']){
  assert(html.includes(`active('${element}')`)||html.includes(`const ${element}=`),`Feedback visual ausente: ${element}`);
}

console.log(`OK: ${ids.length} ícones 320x320 e feedback elemental no HUD, Códex, inimigos e chefes.`);
