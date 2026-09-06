# Objetos da campanha

Os ninhos/casulos da onda 7 usam `ninho_east.png` à esquerda da arena e
`ninho_west.png` à direita, voltados para o centro. São cópias sem alteração
dos arquivos `rotations/east.png` e `rotations/west.png` do pacote
`Create_a_small_corrupted_egg_n` fornecido pelo usuário.

Os PNGs originais medem 48×48. O renderer ignora a margem transparente usando
o retângulo `(1, 12, 47, 27)` e mantém 48 pixels de largura visível, ancorada
na base do objeto. Posições, raio de colisão, vida e regras da onda não mudam.
`ninho.png` permanece como fallback durante o carregamento.

Os objetivos posteriores usam artes dedicadas, também ancoradas sem alterar
posição, colisão ou regras: `altar_demoniaco.png`, `bau_antigo.png`,
`obelisco_deserto_off.png`, `obelisco_deserto_on.png` e
`fissura_infernal.png`. A fissura é centralizada como decalque de chão; as
demais artes ficam imóveis e recebem apenas brilho, sem pulsação de escala.

## Espírito Errante, Mercador Perdido e Casulo do Sobrevivente

Três artes entregues pelo usuário em `Downloads/objetos/fotos`, tratadas assim:

- **Fundo.** O casulo veio em chroma key verde e os outros dois em branco. A
  remoção é por preenchimento a partir das BORDAS, não por "apague toda cor X":
  assim os olhos brancos do fantasma e o interior claro do casulo continuam
  inteiros. No casulo ainda passa uma limpeza da franja verde.
- **Redução com alfa pré-multiplicado.** É precaução, não conserto: medido
  nestes três arquivos, o resultado com e sem pré-multiplicação difere em 6
  pixels, todos totalmente transparentes. Não havia halo porque o recorte
  deixa o alfa binário (0 ou 255). O passo fica porque uma arte futura com
  borda suave produziria, aí sim, contorno escuro sem ele.
- **Tamanho igual ao de desenho.** `desenharObjeto` desenha com
  `imageSmoothingEnabled=false`, então reduzir na tela comeria os fios da teia.
  Cada PNG já sai na medida em que é desenhado: fantasma 36, mercador 44,
  casulo 30 px de largura.
- **Sombra.** O fantasma veio com sombra assada; `drawNode` já desenha a dele,
  e duas sombras ficariam sujas. A sombra da arte foi cortada.

O `espirito_errante` só entra fora do capítulo 5: no vulcão e a partir da onda
21 a aparição continua sendo o necromante, que é proposital. Em todos os casos
o desenho a mão permanece como reserva para o quadro em que a imagem ainda não
carregou — `arteObjeto` devolve nulo até a primeira carga terminar.

## Tesouro Profano

`tesouro_profano.png` (48×32) sai do mesmo tratamento das três anteriores, com
uma diferença: a arte veio com **sombra cinza assada** além do fundo branco, e
a sombra não sai por preenchimento de borda — a tolerância que a alcançava
vazava para dentro da arca. Ela é removida por cor, pela regra "cinza
dessaturado e claro": a arca é saturada (laranja) ou muito escura, então
nenhum pixel dela cai na regra. `drawNode` já desenha a própria sombra; manter
a assada deixaria duas.

A arte vale **só** para o Tesouro Profano. O Baú Amaldiçoado divide o mesmo
ramo de desenho e continua à mão: usar a mesma imagem nos dois apagaria a
diferença entre um evento bom e um ruim.

