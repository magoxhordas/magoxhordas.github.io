// Static interaction geometry/text for CampV2.
// The actual actions stay injected by CampV2 so this module does not own gameplay.
(function(global){
  'use strict';

  const DEFINICOES = [
    {id:'fazenda', fx:.328, fy:.418, raio:74, rotulo:'Entrar na Fazenda',   cor:'#8fe07a'},
    {id:'cozinha', fx:.186, fy:.522, raio:76, rotulo:'Cozinhar',            cor:'#ff9a5a'},
    {id:'merlin',  fx:.835, fy:.590, raio:82, rotulo:'Falar com Merlin',    cor:'#c08cff'},
    {id:'oficina', fx:.218, fy:.900, raio:82, rotulo:'Melhorar na Oficina', cor:'#f0d080'},
    {id:'santuario',fx:.690,fy:.760, raio:86, rotulo:'Santuario dos Pets',  cor:'#7de89a'},
    {id:'fogueira',fx:.525, fy:.548, raio:70, rotulo:'Descansar (Codex)',   cor:'#ffb347'},
    {id:'portal',  fx:.497, fy:.825, raio:90, rotulo:'Iniciar Expedicao',   cor:'#6ad8f0'},
    {id:'lago',    fx:.678, fy:.248, raio:62, rotulo:'Pescar',              cor:'#7ab8ff'},
    {id:'arqueiro',fx:.452, fy:.560, raio:58, rotulo:'Falar com o Arqueiro', cor:'#9fe08a'},
  ];

  function create(actions){
    if(!actions||typeof actions!=='object')
      throw new TypeError('CampInteractionData.create exige as acoes do CampV2.');
    return DEFINICOES.map(def=>{
      const abrir=actions[def.id];
      if(typeof abrir!=='function')
        throw new TypeError(`Acao ausente para o ponto de interacao: ${def.id}`);
      return {...def,abrir};
    });
  }

  global.CampInteractionData=Object.freeze({create});
})(window);
