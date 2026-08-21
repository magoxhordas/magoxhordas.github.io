import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
const start=html.indexOf('window.CampV2 = (function(){');
const end=html.indexOf('// [/CAMP-V2]',start);
if(start<0||end<0) throw new Error('CampV2 nao encontrado');
const before=html.slice(0,start);
const firstLine=before.split('\n').length;
const camp=html.slice(start,end);
const lines=camp.split('\n');
const out=[];
out.push('# CampV2 top-level inventory');
out.push(`# source start line: ${firstLine}`);
out.push('');
for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(!/^  (?:const|let|var|function)\s+/.test(line)) continue;
  const trimmed=line.trim().replace(/\s+/g,' ');
  out.push(`${firstLine+i}: ${trimmed.slice(0,260)}`);
}
fs.writeFileSync(path.join(root,'src','camp','_inventory.txt'),out.join('\n')+'\n','utf8');
console.log(`OK: ${out.length-3} declaracoes top-level catalogadas.`);
