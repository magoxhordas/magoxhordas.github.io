# Objetos da campanha

Os ninhos/casulos da onda 7 usam `ninho_east.png` à esquerda da arena e
`ninho_west.png` à direita, voltados para o centro. São cópias sem alteração
dos arquivos `rotations/east.png` e `rotations/west.png` do pacote
`Create_a_small_corrupted_egg_n` fornecido pelo usuário.

Os PNGs originais medem 48×48. O renderer ignora a margem transparente usando
o retângulo `(1, 12, 47, 27)` e mantém 48 pixels de largura visível, ancorada
na base do objeto. Posições, raio de colisão, vida e regras da onda não mudam.
`ninho.png` permanece como fallback durante o carregamento.
