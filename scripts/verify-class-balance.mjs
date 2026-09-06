/* Verificador de BALANCEAMENTO DAS CLASSES.
 *
 * Nao e' busca de texto: o DPS efetivo de cada classe e' calculado com as
 * MESMAS formulas do attack() do jogo (dano por alvo, cooldown e a area de
 * cada classe), e o resultado tem de respeitar o papel de cada uma.
 *
 * Existe porque o Arqueiro ficou muito tempo pior que todos em TODOS os
 * cenarios — inclusive alvo unico, que e' a especialidade dele — enquanto
 * tinha a menor vida do jogo. Nada apontava isso: o numero "crítico 85" na
 * ficha dele era so' enfeite, sem nenhum efeito no codigo.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ler=a=>fs.readFileSync(path.join(root,a),'utf8').replace(/\r\n/g,'\n');
const html=ler('index.html');
const blessings=ler('src/blessings/blessing-system.js');

let checagens=0;
const exigir=(c,m)=>{ if(!c) throw new Error(`FALHA: ${m}`); checagens++; };

/* ── Le os numeros direto do CLASS_DEFS, sem copiar nada ── */
function classe(id){
  const i=html.indexOf(`    id:'${id}',`);
  exigir(i>0,`classe ${id} nao encontrada em CLASS_DEFS`);
  const trecho=html.slice(i,i+4000);
  const n=re=>{const m=trecho.match(re);return m?Number(m[1]):null;};
  return {
    id,
    hp:n(/baseHp:(\d+)/), dmg:n(/baseDmg:(\d+)/), cd:n(/baseAtk:(\d+)/)/1000,
    multi:n(/baseMulti:(\d+)/),
    crit:n(/baseCrit:([\d.]+)/)||0,
    cadeia:n(/basePlasmaChain:(\d+)/)||1,
  };
}
const C={mage:classe('mage'),warrior:classe('warrior'),archer:classe('archer'),viking:classe('viking')};
for(const c of Object.values(C)){
  exigir(c.hp>0&&c.dmg>0&&c.cd>0,`numeros base invalidos em ${c.id}`);
}

/* ── DPS efetivo, pelas formulas do attack() ──
   guerreiro: arco frontal de 110px (ate' ~4 alvos) + poca de fogo 18%
   viking:    giro de 360deg em 95px (ate' ~6 alvos)
   mago:      um projetil, alvo unico
   arqueiro:  2 flechas homing + cadeia de plasma a 60% do dano BASE
              (a cadeia usa proj.dmg, nao o valor ja' critado) */
const CRIT_MULT=2.5;
function dps(c,n){
  if(c.id==='archer'){
    const tiros=1+(c.multi||0);
    const enc=Math.min(n-1,c.cadeia);
    const direto=tiros*c.dmg*(1+c.crit*(CRIT_MULT-1));
    const ligado=tiros*enc*c.dmg*0.6;
    return (direto+ligado)/c.cd;
  }
  const alvos=c.id==='warrior'?Math.min(n,4):c.id==='viking'?Math.min(n,6):1;
  const extra=c.id==='warrior'?0.18:0;
  return (c.dmg*alvos)/c.cd*(1+extra);
}
const melhor=n=>Math.max(...Object.values(C).map(c=>dps(c,n)));

// 1. O Arqueiro LIDERA contra alvo unico — e' um atirador, chefes sao o campo dele
exigir(dps(C.archer,1)>=melhor(1)-0.01,
  `Arqueiro nao lidera contra alvo unico (${Math.round(dps(C.archer,1))} vs melhor ${Math.round(melhor(1))})`);

// 2. Mas nao pode dominar a horda: e' de alvo unico, tem de ficar atras dos corpo a corpo
exigir(dps(C.archer,6)<dps(C.viking,6),'Arqueiro passou o Viking em horda — ele e de alvo unico');
exigir(dps(C.archer,6)<dps(C.warrior,6),'Arqueiro passou o Guerreiro em horda');

// 3. ...nem ser irrelevante nela. Abaixo de 40% do melhor a classe vira punicao.
const fatia=dps(C.archer,6)/melhor(6);
exigir(fatia>=0.40,`Arqueiro fraco demais em horda: ${Math.round(fatia*100)}% do melhor (minimo 40%)`);
exigir(fatia<=0.75,`Arqueiro forte demais em horda: ${Math.round(fatia*100)}% do melhor (maximo 75%)`);

// 4. A fragilidade E' a classe: ele continua com a menor vida
const menorVida=Math.min(...Object.values(C).map(c=>c.hp));
exigir(C.archer.hp===menorVida,'o Arqueiro deixou de ser o mais fragil — a troca dele e dano por vida');

// 5. Nenhuma outra classe ganhou critico inato de carona
for(const c of ['mage','warrior','viking'])
  exigir(C[c].crit===0,`${c} ganhou critico inato sem querer`);

/* 6. A ARMADILHA QUE ESTE ARQUIVO EXISTE PARA PEGAR
   blessing-system.js SUBSTITUI applyCardCrit inteiro. Mexer so' na versao
   do index.html nao muda nada no jogo — o critico inato precisa ser somado
   NA VERSAO QUE ROda. */
exigir(/applyCardCrit\s*=\s*function/.test(blessings),
  'blessing-system deixou de substituir applyCardCrit — reveja onde o critico e somado');
exigir(/chance=\(pl\.baseCrit\|\|0\)/.test(blessings),
  'o critico inato da classe nao entra no applyCardCrit que realmente roda (o do blessing-system)');
exigir(html.includes('(player.baseCrit||0)'),
  'a versao do index.html ficou sem o critico inato (ela e o fallback)');
exigir(html.includes('this.baseCrit=cd.baseCrit||0;'),'o Player nao recebe o critico inato da classe');
exigir(html.includes('this.plasmaChain=cd.basePlasmaChain||1;'),'a cadeia de plasma nao vem mais da classe');

console.log(`OK: balanceamento das classes verificado (${checagens} verificacoes). `
  +`Arqueiro: ${Math.round(dps(C.archer,1))} dps em alvo unico, `
  +`${Math.round(fatia*100)}% do melhor em horda, ${C.archer.hp} de vida.`);
