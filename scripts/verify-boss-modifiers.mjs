/* Verificador do NÍVEL DE AMEAÇA.

   Cobre o que dá para provar sem navegador: catálogo, limites por
   dificuldade, regras do sorteio, recompensa e limpeza. O que depende de
   canvas (telegraphs, desenho) fica para o teste manual. */
import fs from 'node:fs';
import path from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

/* Mesmo padrão dos outros verificadores: com espaço no caminho, a URL vem
   codificada (%20) e readFileSync não acha o arquivo. */
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = f => fs.readFileSync(path.join(raiz, f), 'utf8').replace(/\r\n/g, '\n');
let falhas = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { falhas++; console.error('  FALHOU: ' + msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (esperado ${b}, veio ${a})`); }

// ── carrega os dois módulos num contexto sem DOM ──────────────────────
const ctx = createContext({ console, performance: { now: () => Date.now() }, Math, Object, Array, Number, Set, Date });
ctx.window = ctx;
for (const f of ['src/campaign/boss-modifier-data.js', 'src/campaign/boss-modifiers.js']) {
  runInContext(ler(f), ctx);
}
const D = ctx.BossModifierData, S = ctx.BossModifierSystem;
ok(!!D && !!S, 'os dois módulos carregam sem DOM');

// ── catálogo ──────────────────────────────────────────────────────────
eq(D.MODIFICADORES.length, 20, 'catálogo tem 20 modificadores');
eq(new Set(D.MODIFICADORES.map(m => m.id)).size, 20, 'ids são únicos');
for (const m of D.MODIFICADORES) {
  ok(!!m.nome, `${m.id} tem nome`);
  ok(!!m.descricao, `${m.id} tem descrição`);
  ok(!!m.icone, `${m.id} tem ícone`);
  ok(Object.values(D.CATEGORIAS).includes(m.categoria), `${m.id} tem categoria válida`);
  ok(typeof m.peso === 'number' && m.peso > 0 && m.peso <= 1, `${m.id} tem peso entre 0 e 1`);
  ok(m.params && typeof m.params === 'object', `${m.id} tem parâmetros`);
}

// ── limites por dificuldade ───────────────────────────────────────────
eq(S.limitePara('medium'), 4, 'Normal aceita até 4');
eq(S.limitePara('hard'), 6, 'Difícil aceita até 6');
eq(S.limitePara('easy'), 0, 'Aprendiz não tem ameaça');
ok(!S.dificuldadePermite('easy'), 'Aprendiz não permite');
ok(!S.dificuldadePermite('tutorial'), 'dificuldade desconhecida não permite');
ok(S.dificuldadePermite('medium') && S.dificuldadePermite('hard'), 'Normal e Difícil permitem');

// ── corte automático ao trocar de dificuldade ─────────────────────────
eq(S.ajustarNivel(6, 'hard'), 6, 'Difícil mantém 6');
eq(S.ajustarNivel(6, 'medium'), 4, 'ao voltar para Normal, 6 vira 4');
eq(S.ajustarNivel(6, 'easy'), 0, 'em Aprendiz, qualquer valor vira 0');
eq(S.ajustarNivel(-3, 'hard'), 0, 'nunca fica negativo');

// ── AMEAÇA 0 é bandeira desligada ─────────────────────────────────────
S.iniciarRun(0, 'medium');
ok(!S.ativo(), 'ameaça 0 deixa o sistema inativo');
eq(S.multiplicadorRecompensa(), 1, 'ameaça 0 não muda recompensa');
S.aoNascerChefe({ constructor: { name: 'BossSkeletonKing' }, maxHp: 100, hp: 100, x: 0, y: 0 });
eq(S.modsAtivos().length, 0, 'ameaça 0 não sorteia nada');
S.iniciarRun(3, 'easy');
ok(!S.ativo(), 'Aprendiz nunca ativa, mesmo pedindo 3');

// ── recompensa ────────────────────────────────────────────────────────
const esperado = [1, 1.15, 1.30, 1.50, 1.70, 1.95, 2.20];
for (let n = 0; n <= 6; n++) {
  S.iniciarRun(n, 'hard');
  ok(Math.abs(S.multiplicadorRecompensa() - esperado[n]) < 1e-9, `ameaça ${n} multiplica por ${esperado[n]}`);
}
// paga uma vez só
S.iniciarRun(4, 'hard');
S.aoNascerChefe({ constructor: { name: 'BossBalrog' }, maxHp: 100, hp: 100, x: 0, y: 0 });
const primeira = S.cobrarRecompensa();
const segunda = S.cobrarRecompensa();
ok(Math.abs(primeira - 1.70) < 1e-9, 'primeira cobrança traz o bônus');
eq(segunda, 1, 'segunda cobrança não paga de novo');

// ── sorteio ───────────────────────────────────────────────────────────
const chefes = Object.keys(D.POR_CHEFE);
eq(chefes.length, 6, 'os seis chefes têm tabela de compatibilidade');
for (const nome of chefes) {
  const compat = D.POR_CHEFE[nome];
  ok(compat.length >= 6, `${nome} tem pelo menos 6 compatíveis (para a ameaça máxima)`);
  for (const id of compat) ok(!!D.POR_ID[id], `${nome} referencia id existente: ${id}`);
}
// 400 sorteios por chefe, no nível máximo
for (const nome of chefes) {
  for (let i = 0; i < 400; i++) {
    const mods = S.sortear(nome, 6);
    const ids = mods.map(m => m.id);
    eq(new Set(ids).size, ids.length, `${nome}: sorteio sem repetição`);
    for (const id of ids) ok(D.POR_CHEFE[nome].includes(id), `${nome}: só sorteia compatível (${id})`);
    for (const [a, b] of D.INCOMPATIVEIS)
      ok(!(ids.includes(a) && ids.includes(b)), `${nome}: não junta ${a} com ${b}`);
    for (const [cat, teto] of Object.entries(D.CONFIG.TETO_POR_CATEGORIA)) {
      const n = mods.filter(m => m.categoria === cat).length;
      ok(n <= teto, `${nome}: no máximo ${teto} de ${cat} (veio ${n})`);
    }
  }
}
// quantidade correta quando há folga
for (const nome of chefes) {
  eq(S.sortear(nome, 3).length, 3, `${nome}: sorteia exatamente 3`);
  eq(S.sortear(nome, 0).length, 0, `${nome}: pedir 0 devolve 0`);
}
// pedir mais do que cabe não trava nem repete
for (const nome of chefes) {
  const mods = S.sortear(nome, 99);
  eq(new Set(mods.map(m => m.id)).size, mods.length, `${nome}: pedido exagerado ainda não repete`);
  ok(mods.length <= D.POR_CHEFE[nome].length, `${nome}: pedido exagerado não inventa modificador`);
}

// ── sorteio uma vez por encontro ──────────────────────────────────────
S.iniciarRun(4, 'hard');
const chefe = { constructor: { name: 'BossSkeletonKing' }, maxHp: 100, hp: 100, x: 0, y: 0 };
S.aoNascerChefe(chefe);
const conjunto1 = S.modsAtivos().map(m => m.id).join(',');
S.aoNascerChefe(chefe);                      // re-entrada no spawn
const conjunto2 = S.modsAtivos().map(m => m.id).join(',');
eq(conjunto2, conjunto1, 'o mesmo chefe não re-sorteia no meio da luta');
eq(S.modsAtivos().length, 4, 'sorteou a quantidade do nível');

// ── limpeza ───────────────────────────────────────────────────────────
S.limpar('teste');
eq(S.modsAtivos().length, 0, 'limpar zera os modificadores');
const e = S._estado();
for (const chave of ['fogo', 'gelo', 'raios', 'minas', 'corrupcao', 'abismos', 'runas', 'orbitais', 'ecos', 'ondas', 'rituais'])
  eq(e[chave].length, 0, `limpar esvazia ${chave}`);
eq(e.chefe, null, 'limpar solta a referência do chefe');

// ── forçar (só para desenvolvimento) ──────────────────────────────────
S.iniciarRun(2, 'hard');
S.forcarModificadores(['volcanic', 'echoing'], { constructor: { name: 'BossBalrog' }, maxHp: 100, hp: 100, x: 0, y: 0 });
eq(S.modsAtivos().map(m => m.id).join(','), 'volcanic,echoing', 'forcarModificadores aplica o conjunto pedido');

if (falhas) { console.error(`\nERRO: ${falhas} de ${checks} verificações falharam.`); process.exit(1); }
console.log(`OK: Nível de Ameaça — catálogo, limites, sorteio, recompensa e limpeza validados (${checks} verificações).`);
