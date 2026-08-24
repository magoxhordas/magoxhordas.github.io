import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const html=read('index.html').replace(/\r\n/g,'\n');
const source=read('src/core/audio-system.js').replace(/\r\n/g,'\n').trimEnd();
const integrationSource=[
  html,
  read('src/blessings/blessing-system.js'),
  read('src/campaign/boss-rush-system.js'),
  read('src/campaign/campaign-system.js')
].join('\n').replace(/\r\n/g,'\n');
let checks=0;

function assert(condition,message){
  if(!condition) throw new Error(`FALHA: ${message}`);
  checks++;
}

function includesAll(haystack,needles,context){
  needles.forEach(needle=>assert(haystack.includes(needle),`${context}: ausente ${needle}`));
}

new vm.Script(source,{filename:'src/core/audio-system.js'});
assert(!/new Audio\s*\(/.test(source),'o sistema procedural nao deve ganhar assets Audio externos');
assert((source.match(/new \(window\.AudioContext \|\| window\.webkitAudioContext\)\(\)/g)||[]).length===1,'deve existir uma unica criacao de AudioContext');
assert((source.match(/currentTrack=_addTimeout\(/g)||[]).length===9,'os nove loops procedurais foram alterados');

const scheduled=[];
const cleared=[];
let nextTimer=1;
const allNodes=[];
const gains=[];

class FakeParam{
  constructor(value=0){this.value=value;this.calls=[];}
  setValueAtTime(value,time){this.value=value;this.calls.push(['set',value,time]);}
  linearRampToValueAtTime(value,time){this.value=value;this.calls.push(['linear',value,time]);}
  exponentialRampToValueAtTime(value,time){this.value=value;this.calls.push(['exponential',value,time]);}
  cancelScheduledValues(time){this.calls.push(['cancel',time]);}
}

class FakeNode{
  constructor(kind){
    this.kind=kind;
    this.connections=[];
    this.starts=[];
    this.stops=[];
    this.gain=new FakeParam();
    this.frequency=new FakeParam();
    this.Q=new FakeParam();
    this.delayTime=new FakeParam();
    this.threshold=new FakeParam();
    this.knee=new FakeParam();
    this.ratio=new FakeParam();
    this.attack=new FakeParam();
    this.release=new FakeParam();
    allNodes.push(this);
  }
  connect(destination){this.connections.push(destination);return destination;}
  disconnect(){this.disconnected=true;}
  start(time){this.starts.push(time);}
  stop(time){this.stops.push(time);}
}

class FakeAudioContext{
  constructor(){
    this.currentTime=10;
    this.sampleRate=120;
    this.state='running';
    this.destination=new FakeNode('destination');
  }
  createGain(){const node=new FakeNode('gain');gains.push(node);return node;}
  createBiquadFilter(){return new FakeNode('biquad');}
  createBuffer(channels,length){
    const data=Array.from({length:channels},()=>new Float32Array(length));
    return {getChannelData(channel){return data[channel];}};
  }
  createBufferSource(){return new FakeNode('buffer-source');}
  createOscillator(){return new FakeNode('oscillator');}
  createConvolver(){return new FakeNode('convolver');}
  createDelay(){return new FakeNode('delay');}
  createWaveShaper(){return new FakeNode('wave-shaper');}
  createDynamicsCompressor(){return new FakeNode('compressor');}
  resume(){this.state='running';return Promise.resolve();}
}

const document={documentElement:{dataset:{}}};
const sandbox={
  console,
  document,
  AudioContext:FakeAudioContext,
  webkitAudioContext:FakeAudioContext,
  setTimeout(fn,ms){const id=nextTimer++;scheduled.push({id,fn,ms});return id;},
  clearTimeout(id){cleared.push(id);},
  Math,
  Float32Array
};
sandbox.window=sandbox;
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'src/core/audio-system.js'});
const audio=vm.runInContext('Audio',sandbox);

assert(Object.keys(audio).join(',')==='init,stopMusic,playMenuMusic,playCryptMusic,playHauntedForestMusic,playFrozenMusic,playFossilDesertMusic,playAncientVolcanoMusic,playCombatMusic,playBossMusic,playCampMusic,playDeathStinger,playBossDefeat,playBossSpawn,playDeityArrival,playChapterIntro,sfxSword,sfxBow,sfxAxe,sfxHit,sfxPlayerHit,sfxCoin,sfxEnemyDeath,sfxLevelUp,sfxWaveClear,sfxMenuClick,sfxShopBuy,sfxPetCapture,setMusicVol,setSfxVol,setAttackVol,setAttackEnabled,toggle,enabled,attackEnabled,activeMusicTheme','API publica do Audio foi alterada');
assert(audio.enabled===true&&audio.attackEnabled===true&&audio.activeMusicTheme==='none','estado inicial do Audio foi alterado');

audio.init();
assert(gains.length===4,'init deve criar exatamente master, musica, SFX e ataque antes de tocar faixas');
assert(gains[0].gain.value===1,'volume master padrao foi alterado');
assert(gains[1].gain.value===0.48,'volume padrao de musica foi alterado');
assert(gains[2].gain.value===0.65,'volume padrao de SFX foi alterado');
assert(gains[3].gain.value===0.65,'volume padrao de ataque foi alterado');

audio.setMusicVol(.21);
audio.setSfxVol(.31);
audio.setAttackVol(.41);
assert(gains[1].gain.value===.21&&gains[2].gain.value===.31&&gains[3].gain.value===.41,'setters de volume nao preservam os respectivos canais');
audio.setAttackEnabled(false);
assert(audio.attackEnabled===false&&gains[3].gain.value===0,'mute de ataque deixou de zerar o canal');
audio.setAttackEnabled(true);
assert(audio.attackEnabled===true&&gains[3].gain.value===.41,'reativar ataque nao restaura o volume configurado');

audio.playMenuMusic();
assert(audio.activeMusicTheme==='menu'&&document.documentElement.dataset.musicTheme==='menu','musica do menu nao registra o tema atual');
const zeroStopsBefore=allNodes.reduce((total,node)=>total+node.stops.filter(value=>value===0).length,0);
audio.playCombatMusic('forest');
const zeroStopsAfter=allNodes.reduce((total,node)=>total+node.stops.filter(value=>value===0).length,0);
assert(audio.activeMusicTheme==='haunted-forest','mapeamento da campanha para a floresta foi alterado');
assert(zeroStopsAfter>zeroStopsBefore&&cleared.length>0,'trocar de musica nao encerrou nos/timeouts da faixa anterior');

assert(audio.toggle()===false&&audio.enabled===false&&audio.activeMusicTheme==='none','mute global nao interrompe a musica atual');
assert(audio.toggle()===true&&audio.enabled===true,'reativar audio deixou de restaurar o estado enabled');

includesAll(source,[
  'let musicVol = 0.48, sfxVol = 0.65, attackVol = 0.65;',
  "let activeMusicTheme = 'none';",
  "castle:{root:293.66,bpm:96",
  "forest:{root:261.63,bpm:100",
  "snow:{root:220,bpm:92",
  "desert:{root:196,bpm:104",
  "volcano:{root:164.81,bpm:110",
  "dungeon:{root:246.94,bpm:102",
  "skeleton_king:{root:246.94,bpm:106",
  "aracne:{root:261.63,bpm:122",
  "frost:{root:220,bpm:94",
  "sandworm:{root:196,bpm:112",
  "balrog:{root:164.81,bpm:126",
  "brute:{root:174.61,bpm:114",
  "pet:{root:233.08,bpm:116",
  "markMusicTheme(`chapter:${chapterNumber}`)",
  'switch(Number(chapterNumber)||1)',
  'function playDeityArrival(deityId=\'\')',
  'function stopMusic(fade=1.0)',
  '_allTimeouts.forEach(id=>clearTimeout(id)); _allTimeouts=[];',
  "if(!enabled) stopMusic(0.2)"
],'registro e controle de audio');

const scriptTag='<script src="src/core/audio-system.js"></script>';
const scriptIndex=html.indexOf(scriptTag);
assert(scriptIndex>=0,'index.html nao carrega o modulo de audio');
assert(scriptIndex<html.indexOf('const GameSettings = (function(){'),'Audio deve carregar antes das configuracoes que o consomem');
assert(!html.includes('const Audio = (function(){'),'implementacao de Audio ainda ficou duplicada no index.html');

includesAll(integrationSource,[
  'function _audioStart(){\n  Audio.init();',
  "document.addEventListener('click',_audioStart);",
  "document.addEventListener('keydown',_audioStart);",
  "document.removeEventListener('click',_audioStart);",
  "document.removeEventListener('keydown',_audioStart);",
  'Audio.playMenuMusic();',
  'Audio.playCombatMusic(chapter.arena);',
  'Audio.playChapterIntro(chapter.number);',
  'Audio.playBossMusic(bossTheme);',
  'Audio.playCampMusic()',
  'Audio.playDeityArrival(deityId)',
  'Audio.sfxSword()',
  'Audio.sfxBow()',
  'Audio.sfxAxe()',
  'Audio.sfxPlayerHit()',
  'Audio.sfxLevelUp()',
  'Audio.sfxCoin()',
  'Audio.sfxWaveClear()',
  'Audio.sfxShopBuy()',
  'Audio.sfxPetCapture()',
  'musicVolume:0.48',
  'attackSoundVolume:0.65',
  'Audio.setMusicVol(data.musicEnabled?data.musicVolume:0)',
  'Audio.setAttackEnabled(data.attackSoundEnabled)'
],'eventos, autoplay e configuracoes');

console.log(`OK: core audio preservou API, volumes, temas, loops, troca exclusiva, mute, autoplay e eventos (${checks} verificacoes).`);
