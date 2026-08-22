import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const html=read('index.html');
const combatFiles=['src/combat/status-effects.js','src/combat/damage-system.js','src/combat/combat-system.js'];
const moduleSources=combatFiles.filter(file=>fs.existsSync(path.join(root,file))).map(read);
const combatSource=[html,...moduleSources].join('\n');
let checks=0;

function assert(condition,message){
  if(!condition) throw new Error(`FALHA: ${message}`);
  checks++;
}

function includesAll(source,needles,context){
  for(const needle of needles) assert(source.includes(needle),`${context}: ausente ${needle}`);
}

// Contratos centrais da campanha antes de qualquer extracao.
includesAll(combatSource,[
  'class Player',
  'class Enemy',
  'takeDmg(a)',
  'this.hp-=reduced',
  'this.inv=true; this.invT=600',
  'Math.round(this.maxHp*0.35)',
  "gameMode===1||(player.dead&&(!player2||player2.dead))",
  'if(this.isSpecter && this.phased) return',
  'if(this.hasShield) a*=0.5',
  'if(this.weaponVulnerable)a*=1+this.weaponVulnerable',
  'this.dead=true; kills++',
],'dano, vida e morte');

// Critico atual: a implementacao V3 sobrescreve o helper inicial e deve manter
// chance, multiplicador base, estado do ultimo golpe e retorno do dano calculado.
includesAll(combatSource,[
  'const didCrit=force||Math.random()<Math.max(0,chance)',
  'let critMult=2.5',
  'pl._lastAttackWasCrit=didCrit',
  'return damage',
],'critico');

// Status e seus numeros atuais. Estes valores sao contratos de gameplay, nao
// oportunidades de balanceamento durante a modularizacao.
includesAll(combatSource,[
  'fire:1500,ice:1600,electric:900,poison:1700,shadow:1250',
  'arcane:1050,solar:950,wind:850,blood:1300,physical:280',
  'this._weaponBurnTick>=500',
  'this._weaponPoisonTick>=500',
  'Math.max(.3,1-this.weaponSlow):0.35',
  'this.frozenTimer-=dt*1000',
],'status existentes');

// P1/P2, chefes e Dungeon continuam com seus pontos de entrada reais.
includesAll(combatSource,[
  'gameMode===2&&player2',
  'class BossSkeletonKing',
  'class BossAracne',
  'class BossFrostBehemoth',
  'class BossSandworm',
  'class BossBalrog',
  '_takeDmg(dmg)',
],'P1, P2, chefes e Dungeon');

// O roubo de vida do Viking e os dois caminhos atuais (berserk e Machado de
// Sangue) ficam protegidos porque dependem diretamente do dano aplicado.
includesAll(combatSource,[
  "} else if(cid==='viking')",
  'if(owner.berserkActive)',
  'proj.dmg*owner.lifeSteal',
  "proj.weapon?.type==='viking_bloodaxe'",
  'healCampaignPlayer(owner,proj.dmg*steal',
],'roubo de vida do Viking');

for(const source of moduleSources) new vm.Script(source);

console.log(`OK: baseline de combate protege dano, critico, vida, morte, cooldown/status, P1/P2, chefes, Dungeon e Viking (${checks} verificacoes).`);
