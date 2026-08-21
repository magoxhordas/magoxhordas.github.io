// Collision map data extracted from CampV2.
// This file intentionally contains no rendering or gameplay state.
// F/E are injected by CampV2 so collider objects keep exactly the same shape
// and semantics they had before this refactor.
(function(global){
  'use strict';

  function create(F,E){
    if(typeof F!=='function'||typeof E!=='function')
      throw new TypeError('CampCollisionMap.create exige as fabricas F e E do CampV2.');

    const BLOQUEIOS = [
    // ── mata que fecha o mapa ──
    F(0,    0,    1,    .075),   // norte
    F(0,    .945, 1,    .055),   // sul (cerca)
    F(0,    0,    .070, 1),      // oeste
    F(.958, 0,    .042, 1),      // leste

    // ── canto noroeste: cabana ──
    // A colisao cobre a silhueta inteira. Uma caixa so na base permitia que o
    // heroi entrasse pelo norte e parecesse estar andando sobre o telhado.
    F(.040, .200, .252, .322),   // cabana completa, telhado, paredes e escada
    F(.065, .413, .025, .060),   // lanterna de poste
    F(.266, .376, .025, .080),   // caixas ao lado
    F(.250, .306, .026, .056),   // cerca de madeira

    // ── horta ──
    // ── centro ──
    // o Arqueiro. Alto o bastante p/ pegar o teste de pe do jogador,
    // que acontece 6px ABAIXO da posicao dele (ver livre()).
    F(.4430,.5511,.0180,.0258),

    // ── nordeste: lago e pier ──
    F(.612, .070, .312, .042),   // lago: faixa norte
    F(.585, .105, .372, .142),   // lago: corpo central
    F(.604, .240, .322, .072),   // lago: margem sul
    F(.612, .330, .034, .046),   // pedra na margem

    // ── leste: tenda do Merlin ──
    F(.765, .248, .230, .326),   // tenda completa, teto, mesa e bancada
    F(.699, .378, .036, .056),   // braseiro a esquerda
    F(.948, .410, .020, .086),   // estandarte
    F(.900, .548, .056, .046),   // flores roxas

    // ── sudoeste: oficina ──
    F(.058, .595, .255, .286),   // oficina completa, lona, postes e bancada
    F(.086, .690, .032, .072),   // lanterna de poste
    F(.272, .746, .030, .056),   // caixa ao lado

    // ── sudeste: santuario de pedra ──
    F(.705, .620, .285, .285),   // santuario completo; patamar frontal fica acessivel

    // ── sul: portal ──
    F(.375, .775, .275, .202),   // conjunto completo: portal, arco e pilares
  ];

    const BLOQUEIOS_CIRCULARES = [
    E(.528,.512,.050,.044),       // fogueira e aro de pedras
    E(.321,.470,.031,.027),       // toco abaixo da cabana
    // O antigo toco em .472/.190 foi absorvido pela nova area cultivavel.
    E(.605,.386,.031,.025),       // toco na margem do lago
    E(.082,.580,.026,.020),       // rocha oeste
    E(.411,.683,.020,.016),       // rocha junto da oficina
    E(.652,.635,.022,.017),       // rocha no caminho leste
    E(.674,.845,.026,.020),       // rocha diante do santuario
  ];

    const PASSAGENS = [
    F(.6476, .2050, .0601, .1130),   // pier do lago (passa da margem, senao trava na borda)
  ];

    return {BLOQUEIOS,BLOQUEIOS_CIRCULARES,PASSAGENS};
  }

  const FOOTPRINT=Object.freeze([
    Object.freeze([-8,-3]), Object.freeze([0,-3]), Object.freeze([8,-3]),
    Object.freeze([-8,4]), Object.freeze([0,5]), Object.freeze([8,4])
  ]);

  global.CampCollisionMap=Object.freeze({create,FOOTPRINT});
})(window);
