import assert from 'node:assert/strict';
import {existsSync, readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(path.join(root,'index.html'),'utf8');

const chapters=[
  {wave:1,number:1,arena:'crypt',file:'chapter-1.jpg'},
  {wave:6,number:2,arena:'forest',file:'chapter-2.jpg'},
  {wave:11,number:3,arena:'snow',file:'chapter-3.jpg'},
  {wave:16,number:4,arena:'desert',file:'chapter-4.jpg'},
  {wave:21,number:5,arena:'volcano',file:'chapter-5.jpg'}
];

assert.match(html,/const CAMPAIGN_CHAPTER_DURATION=6000;/,'A abertura deve durar exatamente 6 segundos.');
assert.match(html,/0%\{opacity:0\} 13\.333%\{opacity:1\} 86\.667%\{opacity:1\} 100%\{opacity:0\}/,'O fade deve usar 0,8s de entrada e 0,8s de saída.');
assert.match(html,/0%,13\.333%\{opacity:1\} 30%,100%\{opacity:0\}/,'O título deve ser revelado entre 0,8s e 1,8s.');
assert.match(html,/state==='playing'&&maybeStartCampaignChapter\(wave\)/,'O loop deve interceptar o início do combate para exibir o capítulo.');
assert.match(html,/state==='chapter'/,'O estado de capítulo deve pausar o loop da campanha.');
assert.match(html,/body\.campaign-chapter-active #ui-top/,'A HUD superior deve ser ocultada durante o capítulo.');
assert.match(html,/body\.campaign-chapter-active #hud-bottom/,'A HUD inferior deve ser ocultada durante o capítulo.');
assert.match(html,/body\.campaign-chapter-active #mobile-controls/,'Os controles móveis devem ser ocultados durante o capítulo.');
assert.match(html,/function playChapterIntro\(chapterNumber=1\)/,'A assinatura sonora dos capítulos deve existir.');
assert.match(html,/playDeityArrival, playChapterIntro/,'A assinatura sonora deve estar disponível no módulo de áudio.');
assert.match(html,/finishCampaignChapter[\s\S]*Audio\.playCombatMusic\(chapter\.arena\)/,'A música do bioma deve começar após a abertura.');

for(const chapter of chapters){
  const asset=path.join(root,'assets','chapters',chapter.file);
  assert.ok(existsSync(asset),`Imagem ausente: ${chapter.file}`);
  assert.ok(statSync(asset).size>500_000,`Imagem parece incompleta: ${chapter.file}`);
  const configPattern=new RegExp(`${chapter.wave}:\\{number:${chapter.number},arena:'${chapter.arena}',image:'assets/chapters/${chapter.file.replace('.','\\.')}'`);
  assert.match(html,configPattern,`Configuração ausente para a onda ${chapter.wave}.`);
}

for(const effect of ['ash','green-spark','dark-dust','stone','web-thread','spore','red-dust','eye','snow','crystal','ice-fragment','sand','gold-dust','rolling-stone','ember','black-ash','orange-spark','smoke']){
  assert.ok(html.includes(`'${effect}'`),`Efeito temático ausente: ${effect}`);
}

console.log('OK: 5 capítulos, imagens, transições, HUD oculta, partículas e áudio validados.');
