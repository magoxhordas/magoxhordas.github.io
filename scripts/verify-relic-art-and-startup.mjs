import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const shopSource=fs.readFileSync(path.join(root,'src','shop','shop-system.js'),'utf8');
const dungeonSource=fs.readFileSync(path.join(root,'src','dungeon','dungeon-system.js'),'utf8');
const integrationSource=`${html}\n${shopSource}\n${dungeonSource}`;
const relicDir=path.join(root,'assets','codex','relics');
const relicFiles=fs.readdirSync(relicDir).filter(name=>name.endsWith('.png')).sort();

assert.equal(relicFiles.length,55,'O Códex precisa ter 55 artes de relíquia: 32 de classe, 8 universais, 8 da Dungeon e 7 anéis.');
for(const name of relicFiles){
  const data=fs.readFileSync(path.join(relicDir,name));
  assert.equal(data.toString('ascii',1,4),'PNG',`${name} não é um PNG válido.`);
  assert.equal(data.readUInt32BE(16),192,`${name} não mede 192px de largura.`);
  assert.equal(data.readUInt32BE(20),192,`${name} não mede 192px de altura.`);
  const id=name.replace(/\.png$/,'');
  assert.ok(html.includes(`${id}:'assets/codex/relics/${name}'`),`${name} não está ligado ao CODEX_RELIC_ART.`);
}

assert.match(html,/#settings-screen\{\s*display:none;/,'A tela de Configurações ainda pode aparecer no primeiro quadro.');
assert.match(html,/\.codex-art-image\s*\{[\s\S]*?object-fit:contain;/,'As artes do Códex precisam ser centralizadas sem recorte.');
assert.match(integrationSource,/artPath:CODEX_RELIC_ART\[spec\.id\]|const artPath=typeof CODEX_RELIC_ART/,'Os itens da campanha não receberam a arte de relíquia.');
assert.match(integrationSource,/item\.artPath\s*\?\s*codexArtIconHtml\(item\.artPath,84/,'A loja da campanha não usa os novos ícones.');
assert.match(integrationSource,/CODEX_RELIC_ART\[`dng_relic_\$\{item\.id\}`\]/,'O Ferreiro da Dungeon não usa os novos ícones.');
assert.match(integrationSource,/window\.DNG_RELICS=DNG_RELICS;/,'As relíquias da Dungeon não estão expostas ao Códex.');
assert.match(integrationSource,/window\.DNG_RING_TYPES=DNG_RING_TYPES;/,'Os anéis da Dungeon não estão expostos ao Códex.');

console.log(`OK: ${relicFiles.length} artes de relíquia, lojas conectadas e tela inicial sem lampejo de Configurações.`);
