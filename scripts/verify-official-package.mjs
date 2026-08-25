import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const jsSources=[];
function collectJs(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) collectJs(full);
    else if(entry.name.endsWith('.js')) jsSources.push(fs.readFileSync(full,'utf8'));
  }
}
collectJs(path.join(root,'src'));
const packageSource=[html,...jsSources].join('\n');

function assert(ok,message){
  if(!ok) throw new Error(message);
}

function required(relativePath){
  const absolutePath=path.join(root,...relativePath.split('/'));
  assert(fs.existsSync(absolutePath),`Arquivo ausente: ${relativePath}`);
  assert(fs.statSync(absolutePath).isFile(),`Esperado arquivo: ${relativePath}`);
}

assert(fs.existsSync(path.join(root,'.nojekyll')),'.nojekyll ausente');
assert(!fs.existsSync(path.join(root,'_backups-mago')),'Backups históricos não devem entrar no pacote oficial');
assert(!/[A-Za-z]:\\Users\\|file:\/\/\//i.test(html),'index.html contém caminho local absoluto');

const literalAssets=new Set(
  [...packageSource.matchAll(/['"`](assets\/[A-Za-z0-9_.\/-]+\.(?:png|jpe?g|gif|webp|mp3|ogg|wav))['"`]/gi)]
    .map(match=>match[1])
);
for(const asset of literalAssets) required(asset);

const heroes={mage:[6,6],warrior:[6,9],archer:[6,9],viking:[6,9],necromancer:[6,9]};
for(const [hero,[walkFrames,attackFrames]] of Object.entries(heroes)){
  required(`assets/heroes/${hero}/icon.png`);
  for(const direction of ['north','side','south']){
    required(`assets/heroes/${hero}/idle_${direction}.png`);
    for(let frame=0;frame<walkFrames;frame++) required(`assets/heroes/${hero}/walk_${direction}_${frame}.png`);
    for(let frame=0;frame<attackFrames;frame++) required(`assets/heroes/${hero}/atk_${direction}_${frame}.png`);
  }
}

const pets={ignis:8,aurora:8,umbra:8,aegis:8,zefiro:9};
for(const [pet,walkFrames] of Object.entries(pets)){
  required(`assets/pets/${pet}/icon.png`);
  required(`assets/pets/animated-v2/${pet}.png`);
  for(const direction of ['north','side','south']){
    required(`assets/pets/${pet}/idle_${direction}.png`);
    for(let frame=0;frame<walkFrames;frame++) required(`assets/pets/${pet}/walk_${direction}_${frame}.png`);
  }
}

required('assets/camp/camp_bg.png');
required('assets/pets/pet-bosses-sheet.png');

assert(html.includes("BG.src = 'assets/camp/camp_bg.png'"),'Acampamento não usa sua arte oficial');
assert(packageSource.includes('const HERO_IMG_SETS ='),'Sistema de sprites dos heróis ausente');
assert(packageSource.includes('const PET_IMG_SETS ='),'Sistema de sprites dos pets ausente');
assert(html.includes('window.CampV2 ='),'Acampamento jogável ausente');

const allFiles=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(full);
    else allFiles.push(full);
  }
}
walk(path.join(root,'assets'));

console.log(`OK: pacote oficial íntegro, ${literalAssets.size} referências literais e ${allFiles.length} assets presentes.`);
