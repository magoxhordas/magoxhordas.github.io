import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
const start=html.indexOf('window.CampV2 = (function(){');
const end=html.indexOf('// [/CAMP-V2]',start);
if(start<0||end<0) throw new Error('CampV2 nao encontrado');
const camp=html.slice(start,end);

function declaration(name){
  const token=`const ${name}`;
  const at=camp.indexOf(token);
  if(at<0) throw new Error(`${name} nao encontrado`);
  const eq=camp.indexOf('=',at+token.length);
  if(eq<0) throw new Error(`${name} sem inicializador`);
  let quote=null, escaped=false, lineComment=false, blockComment=false;
  let round=0,square=0,curly=0;
  let finish=-1;
  for(let i=eq+1;i<camp.length;i++){
    const ch=camp[i],next=camp[i+1];
    if(lineComment){if(ch==='\n') lineComment=false;continue;}
    if(blockComment){if(ch==='*'&&next==='/'){blockComment=false;i++;}continue;}
    if(quote){
      if(escaped){escaped=false;continue;}
      if(ch==='\\'){escaped=true;continue;}
      if(ch===quote) quote=null;
      continue;
    }
    if(ch==='/'&&next==='/'){lineComment=true;i++;continue;}
    if(ch==='/'&&next==='*'){blockComment=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='(') round++; else if(ch===')') round--;
    else if(ch==='[') square++; else if(ch===']') square--;
    else if(ch==='{') curly++; else if(ch==='}') curly--;
    else if(ch===';'&&round===0&&square===0&&curly===0){finish=i+1;break;}
  }
  if(finish<0) throw new Error(`${name} sem ponto e virgula final`);
  return camp.slice(at,finish);
}

const names=['PONTOS','SEMENTES','NOME_SEM','ICONE_SEM','LUZES_ACAMPAMENTO','ARQ','ACAO'];
const text=names.map(name=>`===== ${name} =====\n${declaration(name)}\n`).join('\n');
fs.writeFileSync(path.join(root,'src','camp','_candidate-snippets.txt'),text,'utf8');
console.log('OK: candidatos extraidos para inspecao.');
