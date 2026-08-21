import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
const campStart=html.indexOf('window.CampV2 = (function(){');
const campEnd=html.indexOf('// [/CAMP-V2]',campStart);
if(campStart<0||campEnd<0) throw new Error('CampV2 nao encontrado');
const camp=html.slice(campStart,campEnd);

function assert(condition,message){if(!condition) throw new Error(message);}

function declaration(name){
  const token=`const ${name}`;
  const start=camp.indexOf(token);
  assert(start>=0,`${name} nao encontrado`);
  const eq=camp.indexOf('=',start+token.length);
  assert(eq>=0,`${name} sem inicializador`);
  let quote=null,escaped=false,line=false,block=false,round=0,square=0,curly=0;
  for(let i=eq+1;i<camp.length;i++){
    const ch=camp[i],next=camp[i+1];
    if(line){if(ch==='\n')line=false;continue;}
    if(block){if(ch==='*'&&next==='/'){block=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote=null;continue;}
    if(ch==='/'&&next==='/'){line=true;i++;continue;}
    if(ch==='/'&&next==='*'){block=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='(')round++; else if(ch===')')round--;
    else if(ch==='[')square++; else if(ch===']')square--;
    else if(ch==='{')curly++; else if(ch==='}')curly--;
    else if(ch===';'&&round===0&&square===0&&curly===0) return camp.slice(start,i+1);
  }
  throw new Error(`${name} sem fim`);
}

function fn(name){
  const token=`function ${name}(`;
  const start=camp.indexOf(token);
  assert(start>=0,`${name} nao encontrada`);
  const open=camp.indexOf('{',start);
  let quote=null,escaped=false,line=false,block=false,depth=0;
  for(let i=open;i<camp.length;i++){
    const ch=camp[i],next=camp[i+1];
    if(line){if(ch==='\n')line=false;continue;}
    if(block){if(ch==='*'&&next==='/'){block=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote=null;continue;}
    if(ch==='/'&&next==='/'){line=true;i++;continue;}
    if(ch==='/'&&next==='*'){block=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'&&--depth===0) return camp.slice(start,i+1);
  }
  throw new Error(`${name} sem fim`);
}

const names=['brilho','desenharAgua','desenharFogueira','desenharAmbiente','desenhar'];
let out='# CampV2 environment renderer snapshot\n\n';
out+=`===== LUZES_ACAMPAMENTO =====\n${declaration('LUZES_ACAMPAMENTO')}\n\n`;
out+=`===== VAGALUMES =====\n${declaration('VAGALUMES')}\n\n`;
for(const name of names) out+=`===== ${name} =====\n${fn(name)}\n\n`;
fs.mkdirSync(path.join(root,'src','camp'),{recursive:true});
fs.writeFileSync(path.join(root,'src','camp','_environment-snippet.txt'),out,'utf8');
console.log('OK: environment renderer snapshot extracted');
