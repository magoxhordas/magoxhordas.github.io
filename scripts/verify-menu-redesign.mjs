import {existsSync, readFileSync, statSync} from 'node:fs';
import {Script} from 'node:vm';

const read=path=>readFileSync(path,'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const html=read('index.html');
const particles=read('src/ui/menu-particles.js');
const bossRush=read('src/campaign/boss-rush-system.js');
const dungeon=read('src/dungeon/dungeon-system.js');
const achievements=read('src/progression/achievement-system.js');
const achievementData=read('src/progression/achievement-data.js');
const codex=read('src/ui/menu-codex-system.js');
const settings=read('src/ui/settings-system.js');

const assets=[
  'assets/menu/logo.png','assets/menu/bg-principal.jpg','assets/menu/bg-modo-jogo.jpg',
  'assets/menu/bg-dif-easy.jpg','assets/menu/bg-dif-medium.jpg','assets/menu/bg-dif-hard.jpg',
  'assets/menu/bg-chefao.jpg','assets/heroes/bg-mage.jpg','assets/heroes/bg-warrior.jpg',
  'assets/heroes/bg-archer.jpg','assets/heroes/bg-viking.jpg','assets/heroes/bg-necromancer.jpg'
];
for(const asset of assets){
  assert(existsSync(asset),`asset ausente: ${asset}`);
  assert(statSync(asset).size>10000,`asset vazio ou truncado: ${asset}`);
}

// casa o CONTEUDO da chave, nao a linha inteira: outros recursos podem
// entrar na mesma declaracao sem derrubar esta checagem
assert(/window\.RECURSOS\s*=\s*\{[^}]*dungeon:false/.test(html),'flag central da Dungeon ausente');
assert(html.includes("{rotulo:'Dungeon',        icone:'portal',     acao:()=>startDungeonMode(), recurso:'dungeon'}"),'menu nao vincula Dungeon a flag');
assert(html.includes("MP_TODOS.filter(it=>!it.recurso||window.recursoLigado(it.recurso))"),'menu nao filtra recursos desligados');
assert(html.includes('id="mode-menu"')&&html.includes('id="play-menu"'),'fluxo modo/dificuldade nao foi separado');
assert(html.includes("background:url('assets/menu/bg-principal.jpg')"),'fundo principal nao foi integrado');
assert(html.includes('const url=`assets/heroes/bg-${classe}.jpg`;'),'selecao de herois nao usa os fundos por classe');
assert(html.includes('src/ui/menu-particles.js?v=20260905-menu1'),'particulas sem versao de cache');

assert(bossRush.includes("gameMode=1; difficulty='medium';"),'Boss Rush nao garante modo solo');
assert(dungeon.includes("!window.recursoLigado('dungeon')"),'entrada direta da Dungeon nao esta bloqueada');
assert(achievementData.includes('RECURSO_POR_ID'),'conquistas nao mapeiam recursos opcionais');
assert(achievements.includes("Object.entries(raw.achievements||{})")&&achievements.includes("if(!base.achievements[id]"),'progresso oculto de conquistas nao e preservado');
assert(codex.includes("window.recursoLigado('dungeon')"),'Codex nao respeita a flag da Dungeon');
// Skins: mesma chave, mesma regra — some da tela, continua nos dados
assert(/window\.RECURSOS\s*=\s*\{[^}]*skins:false/.test(html),'flag das skins ausente');
assert(settings.includes("recursoLigado('skins')"),'Configuracoes nao respeitam a flag das skins');
assert(settings.includes('aplicarRecursos'),'a aba Skins nao e escondida pela chave');
assert(/if\(tab==='skins'&&!recursoLigado\('skins'\)\)/.test(settings),'da para cair na aba Skins mesmo desligada');
assert(html.includes('data-settings-panel="skins"'),'o painel de Skins foi APAGADO — devia so ficar escondido');
assert(html.includes('const HERO_SKINS='),'HERO_SKINS foi apagado — devia continuar intacto');
assert(settings.includes('skinsSoDungeon')&&settings.includes('soDungeon'),'Configuracoes nao ocultam itens exclusivos da Dungeon');

assert(particles.includes('MAX:110'),'limite de particulas alterado');
assert(particles.includes('prefers-reduced-motion'),'particulas ignoram movimento reduzido');
assert(particles.includes('canvas.offsetParent===null'),'particulas continuam rodando em tela oculta');
new Script(particles,{filename:'menu-particles.js'});

console.log('OK: menu redesenhado, recursos opcionais e Boss Rush verificados.');
