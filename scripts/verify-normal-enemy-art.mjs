import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const modulePath = path.join(root, 'src', 'enemies', 'normais-sprites.js');
const moduleSource = fs.readFileSync(modulePath, 'utf8');
const codexSource = fs.readFileSync(path.join(root, 'src', 'ui', 'menu-codex-system.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pngDimensions(file) {
  const data = fs.readFileSync(file);
  assert(data.length >= 24, `PNG vazio ou truncado: ${path.relative(root, file)}`);
  assert(data.subarray(1, 4).toString('ascii') === 'PNG', `Assinatura PNG invalida: ${path.relative(root, file)}`);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

class LoadedImage {
  complete = true;
  naturalWidth = 1;
  set src(value) { this._src = value; }
  get src() { return this._src; }
}

const window = {};
vm.runInNewContext(moduleSource, { window, Image: LoadedImage, console }, { filename: modulePath });
const api = window.InimigosNormais;
assert(api && api.DEFS, 'O modulo nao publicou window.InimigosNormais.DEFS');

const expected = {
  runner_goblin:       ['goblin',       40, 6, 9, 0],
  archer_skeleton:     ['skelarcher',   40, 6, 9, 0],
  shield_orc:          ['shieldorc',    40, 6, 9, 0],
  spitting_spider:     ['spider2',      48, 9, 9, 0],
  shroom:              ['shroom',       48, 9, 9, 0],
  corrupt_ent:         ['ent',          48, 9, 9, 0],
  hungry_wolf:         ['wolf',         48, 6, 9, 0],
  ice_zombie:          ['icezombie',    48, 6, 6, 0],
  crystal_golem:       ['crystalgolem', 48, 9, 9, 0],
  wind_specter:        ['windspecter',  48, 9, 0, 0],
  sand_worm_small:     ['sandworm2',    48, 1, 9, 9],
  cultist:             ['cultist',      48, 6, 6, 0],
  obsidian_scorpion:   ['scorpion',     48, 9, 0, 0],
  fire_imp:            ['fireimp',      48, 9, 9, 0],
  demon_knight:        ['demonknight',  48, 9, 9, 0],
  lava_bat:            ['lavabat',      48, 9, 9, 0],
};

assert(Object.keys(api.DEFS).length === Object.keys(expected).length,
  `Quantidade inesperada de inimigos no modulo: ${Object.keys(api.DEFS).length}`);

let checkedPngs = 0;
for (const [type, [folder, frameSize, walkCount, hitCount, surgeCount]] of Object.entries(expected)) {
  const def = api.DEFS[type];
  assert(def, `Definicao ausente: ${type}`);
  assert(def.pasta === folder, `Pasta incorreta para ${type}: ${def.pasta}`);
  assert(def.quadro === frameSize, `Tamanho de quadro incorreto para ${type}: ${def.quadro}`);
  assert(def.nWalk === walkCount && def.nHit === hitCount && (def.nSurge || 0) === surgeCount,
    `Contagem de quadros incorreta para ${type}`);

  const base = path.join(root, 'assets', 'enemies', folder);
  const files = ['codex.png'];
  for (const dir of ['south', 'north', 'side']) {
    files.push(`idle_${dir}.png`);
    for (let i = 0; i < walkCount; i++) files.push(`walk_${dir}_${i}.png`);
    for (let i = 0; i < hitCount; i++) files.push(`hit_${dir}_${i}.png`);
    for (let i = 0; i < surgeCount; i++) files.push(`surge_${dir}_${i}.png`);
  }

  for (const name of files) {
    const file = path.join(base, name);
    assert(fs.existsSync(file), `Asset ausente: ${path.relative(root, file)}`);
    const dims = pngDimensions(file);
    if (name !== 'codex.png') {
      assert(dims.width === frameSize && dims.height === frameSize,
        `Dimensao inesperada em ${path.relative(root, file)}: ${dims.width}x${dims.height}`);
    } else {
      assert(dims.width > 0 && dims.height > 0, `Retrato invalido: ${path.relative(root, file)}`);
      assert(codexSource.includes(`assets/enemies/${folder}/codex.png`), `Retrato nao ligado ao Codex: ${type}`);
    }
    checkedPngs++;
  }

  assert(api.suporta(type), `API nao reconhece ${type}`);
}

const enemyScript = '<script src="src/enemies/normais-sprites.js"></script>';
const bossScript = '<script src="src/campaign/boss-system.js"></script>';
assert(index.includes(enemyScript), 'index.html nao carrega o modulo de inimigos normais');
assert(index.indexOf(enemyScript) < index.indexOf(bossScript), 'Modulo de inimigos deve carregar antes do boss-system');
assert(index.includes('const I=window.InimigosNormais') && index.includes('I.desenhar(ctx,this.type'),
  'Renderizador principal nao usa a arte real dos inimigos');
assert(index.includes('window.statsInimigo=statsInimigo'), 'Stats compartilhados entre jogo e Codex nao foram publicados');

console.log(`OK: ${Object.keys(expected).length} inimigos normais, ${checkedPngs} PNGs, animacoes e retratos do Codex validados.`);
