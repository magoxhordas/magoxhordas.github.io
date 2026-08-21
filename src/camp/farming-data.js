// Pure farming labels/catalog data extracted from CampV2.
// No inventory mutation, drawing, save handling or farming action lives here.
(function(global){
  'use strict';

  const SEMENTES = ['semente_trigo','semente_tomate','semente_erva',
                    'semente_cogumelo_lua','semente_raiz_sangue'];

  const NOME_SEM = {semente_trigo:'Trigo',semente_tomate:'Tomate',semente_erva:'Folhas',
                    semente_cogumelo_lua:'Cogumelo',semente_raiz_sangue:'Beterraba'};

  const ICONE_SEM = {semente_trigo:'🌾',semente_tomate:'🍅',semente_erva:'🥬',
                     semente_cogumelo_lua:'🍄',semente_raiz_sangue:'🫜'};

  const ACAO = {empty:'Arar', plowed:'Plantar', planted:'Regar',
                watered:'Crescendo...', ready:'Colher'};

  global.CampFarmingData=Object.freeze({SEMENTES,NOME_SEM,ICONE_SEM,ACAO});
})(window);
