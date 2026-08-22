import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile=fileURLToPath(import.meta.url);
const scriptsDir=dirname(currentFile);
const currentName=basename(currentFile);
const verifiers=readdirSync(scriptsDir)
  .filter(name=>/^verify-.*\.mjs$/u.test(name)&&name!==currentName)
  .sort((a,b)=>a.localeCompare(b,'en'));

if(!verifiers.length){
  console.error('ERRO: nenhum verificador especializado foi encontrado.');
  process.exit(1);
}

console.log(`Executando ${verifiers.length} verificadores especializados...`);

for(const verifier of verifiers){
  console.log(`\n=== ${verifier} ===`);
  const result=spawnSync(process.execPath,[join(scriptsDir,verifier)],{
    cwd:dirname(scriptsDir),
    encoding:'utf8',
    stdio:'inherit'
  });

  if(result.error){
    console.error(`ERRO ao iniciar ${verifier}: ${result.error.message}`);
    process.exit(1);
  }

  if(result.status!==0){
    console.error(`ERRO: ${verifier} terminou com código ${result.status}.`);
    process.exit(result.status||1);
  }
}

console.log(`\nOK: ${verifiers.length} verificadores especializados concluídos sem falhas.`);
