// Static CampV2 layout data. No rendering or gameplay state lives here.
(function(global){
  'use strict';

  const HORTA=Object.freeze({
    fx:.3020, fy:.1080, fw:.2500, fh:.2520, cols:5, linhas:3
  });

  // Mesmos pontos de luz usados pelo desenho do acampamento.
  const LUZES_ACAMPAMENTO = [
    [141,468,'#ffc04a',22,0],[181,470,'#ffb43a',34,.8],[304,467,'#ffc04a',22,1.7],
    [122,830,'#ffad32',24,.4],[261,820,'#ff9b28',18,2.2],
    [1050,457,'#b66cff',22,.2],[1097,463,'#a44cff',17,1.2],
    [1164,525,'#c175ff',19,2.4],[1351,526,'#bd68ff',21,.7],
    [1105,901,'#45ff9b',24,.3],[1354,901,'#45ff9b',24,1.4],
    [650,943,'#58cfff',22,.9],[873,943,'#58cfff',22,2.1],
  ];

  // Posicao visual/interativa do arqueiro. Mantida exatamente como no CampV2.
  const ARQ = {fx:.452, fy:.560};

  global.CampLayoutData=Object.freeze({HORTA,LUZES_ACAMPAMENTO,ARQ});
})(window);
