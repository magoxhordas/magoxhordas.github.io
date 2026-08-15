import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
let errors=0;
scripts.forEach((source,index)=>{
  try{new Function(source);}
  catch(error){errors++;console.error(`SCRIPT ${index+1}: ${error.message}`);}
});
if(errors)process.exitCode=1;
else console.log(`OK: ${scripts.length} scripts inline possuem sintaxe JavaScript válida.`);
