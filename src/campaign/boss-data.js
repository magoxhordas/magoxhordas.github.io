(function(global){
'use strict';
const BOSS_RUSH_LIST=[
  {id:'skeleton_king',wave:5, icon:'💀',name:'Rei Cadáver',      cls:'BossSkeletonKing', unlockWave:5, arena:'crypt'},
  {id:'aracne',        wave:10,icon:'🕷️',name:'Aracne Ancestral', cls:'BossAracne',       unlockWave:10,arena:'forest'},
  {id:'frost',         wave:15,icon:'❄️',name:'Gigante de Gelo',  cls:'BossFrostBehemoth',unlockWave:15,arena:'snow'},
  {id:'sandworm',      wave:20,icon:'🪱',name:'Verme Devorador',  cls:'BossSandworm',     unlockWave:20,arena:'desert'},
  {id:'balrog',        wave:25,icon:'🔥',name:'Balrog',           cls:'BossBalrog',       unlockWave:25,arena:'volcano'},
  {id:'brute',         wave:12,icon:'🗿',name:'Brutamontes',      cls:'BossBrute',        unlockWave:8,arena:'snow'},
];

const PET_BOSS_RUSH_LIST=[
  {id:'pet_ignis',  petId:'ignis',  icon:'🔥',name:'Ignis Selvagem',  wave:8, arena:'volcano'},
  {id:'pet_zefiro', petId:'zefiro', icon:'⚡',name:'Zéfiro Selvagem', wave:10,arena:'desert'},
  {id:'pet_aurora', petId:'aurora', icon:'❄️',name:'Aurora Selvagem', wave:12,arena:'snow'},
  {id:'pet_umbra',  petId:'umbra',  icon:'🌑',name:'Umbra Selvagem',  wave:14,arena:'crypt'},
  {id:'pet_aegis',  petId:'aegis',  icon:'🦁',name:'Aegis Selvagem',  wave:16,arena:'forest'},
];

const BOSS_RUSH_ARENA_NAMES={
  crypt:'CASTELO DOS MORTOS',
  forest:'BOSQUE ANCESTRAL',
  snow:'FORTALEZA GLACIAL',
  desert:'DESERTO DEVORADOR',
  volcano:'FORJA INFERNAL'
};

global.MagoCampaignBossData=Object.freeze({
  BOSS_RUSH_LIST,
  PET_BOSS_RUSH_LIST,
  BOSS_RUSH_ARENA_NAMES
});
})(window);
