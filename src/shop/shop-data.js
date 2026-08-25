// SHOP SYSTEM — Ferreiro da Fortaleza
// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// SMART SHOP — items filtered by player class
// ═══════════════════════════════════════════════════════

(function(global){
'use strict';

const CAMPAIGN_CLASS_BUFFS={
  mage:[
    {id:'mage_arcane_core',name:'Núcleo Arcano',pixelIcon:'orb',effect:'magicDamage',values:[.06,.08,.10,.15,.20]},
    {id:'mage_spellbook',name:'Livro dos Feitiços',pixelIcon:'book',effect:'attackSpeed',values:[.05,.07,.09,.14,.18]},
    {id:'mage_elemental_orb',name:'Orbe Elemental',pixelIcon:'double_orb',effect:'elementDuration',values:[.10,.14,.18,.25,.30]},
    {id:'mage_arcane_hourglass',name:'Ampulheta Arcana',pixelIcon:'clock',effect:'cooldownReduction',values:[.04,.055,.07,.10,.14]},
    {id:'mage_astral_cloak',name:'Manto Astral',pixelIcon:'shadow',effect:'astralDefense',values:[.03,.04,.05,.07,.09]},
    {id:'mage_mana_fragment',name:'Fragmento de Mana',pixelIcon:'spark',effect:'spellDuplicate',values:[.03,.04,.05,.07,.09]},
    {id:'mage_arcane_eye',name:'Olho Arcano',pixelIcon:'eye',effect:'magicCrit',values:[.04,.055,.07,.10,.13]},
    {id:'mage_rune_circle',name:'Círculo Rúnico',pixelIcon:'ring',effect:'runeMax',values:[4,5,6,8,10]},
  ],
  warrior:[
    {id:'warrior_reinforced_plate',name:'Placa Reforçada',pixelIcon:'armor',effect:'armor',values:[.04,.055,.07,.10,.13]},
    {id:'warrior_whetstone',name:'Pedra de Afiar',pixelIcon:'stone',effect:'meleeDamage',values:[.06,.08,.10,.15,.20]},
    {id:'warrior_gauntlet',name:'Manopla de Guerra',pixelIcon:'training',effect:'attackSpeed',values:[.05,.065,.08,.12,.16]},
    {id:'warrior_guardian_medallion',name:'Medalhão do Guardião',pixelIcon:'shield',effect:'maxHpFlat',values:[8,11,14,22,30]},
    {id:'warrior_broken_shield',name:'Escudo Quebrado',pixelIcon:'shield',effect:'revengeDamage',values:[.05,.065,.08,.12,.15]},
    {id:'warrior_heavy_boots',name:'Botas Pesadas',pixelIcon:'boots',effect:'knockbackResist',values:[.20,.275,.35,.50,.70]},
    {id:'warrior_iron_emblem',name:'Emblema de Ferro',pixelIcon:'armor',effect:'ironDefense',values:[.02,.025,.03,.04,.05]},
    {id:'warrior_titan_heart',name:'Coração do Titã',pixelIcon:'heart',effect:'highHpDamage',values:[.05,.065,.08,.12,.15]},
  ],
  archer:[
    {id:'archer_shooter_glove',name:'Luva do Atirador',pixelIcon:'training',effect:'attackSpeed',values:[.06,.08,.10,.15,.20]},
    {id:'archer_eagle_eye',name:'Olho de Águia',pixelIcon:'target',effect:'critChance',values:[.05,.065,.08,.12,.15]},
    {id:'archer_reinforced_quiver',name:'Aljava Reforçada',pixelIcon:'backpack',effect:'extraArrow',values:[.03,.04,.05,.07,.10]},
    {id:'archer_wind_feather',name:'Pena do Vento',pixelIcon:'leaf',effect:'moveSpeed',values:[.04,.055,.07,.10,.13]},
    {id:'archer_hunter_sight',name:'Mira de Caçador',pixelIcon:'eye',effect:'distanceDamage',values:[.06,.08,.10,.14,.18]},
    {id:'archer_serrated_tip',name:'Ponta Serrilhada',pixelIcon:'bow',effect:'critBleed',values:[.10,.12,.14,.18,.22]},
    {id:'archer_precision_medallion',name:'Medalhão da Precisão',pixelIcon:'target',effect:'safeCrit',values:[.03,.04,.05,.07,.10]},
    {id:'archer_hunter_steps',name:'Passos do Caçador',pixelIcon:'boots',effect:'movingAttackSpeed',values:[.03,.04,.05,.08,.10]},
  ],
  viking:[
    {id:'viking_war_horn',name:'Chifre de Guerra',pixelIcon:'axe',effect:'meleeDamage',values:[.06,.08,.10,.15,.20]},
    {id:'viking_mead_mug',name:'Caneca de Hidromel',pixelIcon:'cup',effect:'vikingRegenInterval',values:[8000,7000,6000,4000,3000]},
    {id:'viking_blood_rune',name:'Runa de Sangue',pixelIcon:'root',effect:'lifeStealPct',values:[.01,.015,.02,.03,.04]},
    {id:'viking_odin_eye',name:'Olho de Odin',pixelIcon:'eye',effect:'critChance',values:[.04,.055,.07,.10,.13]},
    {id:'viking_berserker_fury',name:'Fúria Berserker',pixelIcon:'fire',effect:'lowHpAttackSpeed',values:[.08,.10,.12,.18,.25]},
    {id:'viking_thor_totem',name:'Totem de Thor',pixelIcon:'lightning',effect:'thorEvery',values:[12,11,10,8,7]},
    {id:'viking_frozen_beard',name:'Barba Congelada',pixelIcon:'ice',effect:'slowAura',values:[.05,.065,.08,.12,.15]},
    {id:'viking_valhalla_heart',name:'Coração de Valhalla',pixelIcon:'heart',effect:'killHealChance',values:[.01,.0125,.015,.02,.025]},
  ],
  necromancer:global.NecromancerData?.SHOP_BUFFS||[],
};

const CAMPAIGN_UNIVERSAL_ITEMS=[
  {id:'universal_light_boots',name:'Botas Ligeiras',pixelIcon:'boots',effect:'moveSpeed',values:[.04,.055,.07,.10,.13]},
  {id:'universal_red_heart',name:'Coração Rubro',pixelIcon:'heart',effect:'maxHpFlat',values:[6,9,12,20,30]},
  {id:'universal_combat_ration',name:'Ração de Combate',pixelIcon:'stew',effect:'universalRegenInterval',values:[10000,8500,7000,5000,4000]},
  {id:'universal_agile_gloves',name:'Luvas Ágeis',pixelIcon:'training',effect:'attackSpeed',values:[.04,.055,.07,.11,.15]},
  {id:'universal_luck_amulet',name:'Amuleto da Sorte',pixelIcon:'ring',effect:'shopLuck',values:[.05,.075,.10,.15,.22]},
  {id:'universal_merchant_bag',name:'Bolsa do Mercador',pixelIcon:'backpack',effect:'goldBonus',values:[.03,.045,.06,.10,.15]},
  {id:'universal_runic_magnet',name:'Ímã Rúnico',pixelIcon:'vortex',effect:'pickupRadius',values:[15,22,30,50,75]},
  {id:'universal_golden_clover',name:'Trevo Dourado',pixelIcon:'leaf',effect:'dropBonus',values:[.04,.055,.07,.10,.14]},
];

// ── POÇÕES DE CURA — consumiveis: curam na hora e podem ser compradas de novo
// (os demais itens da loja sao buffs permanentes e unicos).
const CAMPAIGN_POTIONS=[
  {id:'potion_heal',      name:'Poção de Cura',    pixelIcon:'potion', heal:.35, price:7,
   desc:'Restaura 35% da vida máxima na hora.'},
  {id:'potion_heal_big',  name:'Poção Maior',      pixelIcon:'potion', heal:.70, price:13,
   desc:'Restaura 70% da vida máxima na hora.'},
  {id:'potion_full',      name:'Elixir Completo',  pixelIcon:'heart',  heal:1.0, price:22,
   desc:'Restaura toda a vida.'},
];
global.MagoShopData=Object.freeze({
  CAMPAIGN_CLASS_BUFFS,
  CAMPAIGN_UNIVERSAL_ITEMS,
  CAMPAIGN_POTIONS
});
})(window);
