import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/camp/layout-data.js'),'utf8');

for(const id of ['arma_sword','arma_bow','arma_axe','farm_parcelas']){
  assert.match(source,new RegExp(`HIDDEN_MERLIN_UPGRADE_IDS[^\\n]*${id}`),`${id} precisa ser removido da loja do Merlin`);
}
assert.match(source,/MutationObserver\(hideLegacyCards\)/,'fallback visual da loja precisa observar novos cards');
assert.match(source,/\.echo-summary\{[\s\S]*width:min\(900px/,'HUD de Ecos precisa ter largura compacta');
assert.match(source,/\.artifact-count\{padding:2px 5px;font-size:10px/,'itens de artefato precisam usar tipografia compacta');

console.log('OK: loja do Merlin sem upgrades antigos e resumo de Ecos compactado.');
