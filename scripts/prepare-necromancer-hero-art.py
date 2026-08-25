"""Prepara os sprites oficiais do Necromante para o renderer de herois.

Uso:
  python scripts/prepare-necromancer-hero-art.py <pasta ANIMACAO/NECROMANCER>

Os arquivos de origem nao sao alterados. Todos os quadros resultantes usam uma
tela transparente de 64x64 e a mesma linha de apoio (y=52), evitando saltos ao
alternar entre parado, caminhada e ataque.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


FRAME_SIZE = 64
FEET_Y = 52
ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "assets" / "heroes" / "necromancer"


def transparent_frame() -> Image.Image:
    return Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))


def anchored(source: Image.Image, *, mirror: bool = False) -> Image.Image:
    frame = source.convert("RGBA")
    if mirror:
        frame = frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    box = frame.getbbox()
    if not box:
        return transparent_frame()
    left, _top, right, bottom = box
    x = (FRAME_SIZE - (right - left)) // 2 - left
    y = FEET_Y - (bottom - 1)
    output = transparent_frame()
    output.alpha_composite(frame, (x, y))
    return output


def gif_frames(path: Path, *, mirror: bool = False) -> list[Image.Image]:
    animation = Image.open(path)
    frames: list[Image.Image] = []
    for index in range(animation.n_frames):
        animation.seek(index)
        frames.append(anchored(animation.convert("RGBA").copy(), mirror=mirror))
    return frames


def save(image: Image.Image, name: str) -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    image.save(TARGET / name, format="PNG", optimize=False)


def main(source_dir: Path) -> None:
    state = source_dir / "Create_a_small_dark_fant-Idle" / "Idle"
    rotations = state / "rotations"
    walk_root = state / "animations" / "Walk"

    direction_sources = {
        "south": "south",
        "north": "north",
        # O renderer usa o quadro lateral voltado para a esquerda e o espelha
        # automaticamente ao caminhar para a direita.
        "side": "west",
    }

    for target_direction, source_direction in direction_sources.items():
        save(anchored(Image.open(rotations / f"{source_direction}.png")), f"idle_{target_direction}.png")
        for index in range(6):
            source = walk_root / source_direction / f"frame_{index:03d}.png"
            save(anchored(Image.open(source)), f"walk_{target_direction}_{index}.png")

    down_attack = gif_frames(source_dir / "Idle_custom-The_necromancer_performs_a_dar_south.gif")
    side_attack = gif_frames(
        source_dir / "Idle_custom-The_necromancer_performs_a_dar_east.gif",
        mirror=True,
    )
    for index, image in enumerate(down_attack):
        save(image, f"atk_south_{index}.png")
    for index, image in enumerate(side_attack):
        save(image, f"atk_side_{index}.png")

    # A pasta fornecida nao possui ataque voltado para o norte. Mantemos a
    # orientacao correta reaproveitando os quadros de caminhada norte em uma
    # sequencia curta de conjuracao.
    north_sequence = (0, 1, 2, 3, 4, 5, 4, 2, 0)
    for target_index, source_index in enumerate(north_sequence):
        source = walk_root / "north" / f"frame_{source_index:03d}.png"
        save(anchored(Image.open(source)), f"atk_north_{target_index}.png")

    save(anchored(Image.open(rotations / "south.png")), "icon.png")
    print(f"OK: {len(list(TARGET.glob('*.png')))} sprites preparados em {TARGET}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Informe a pasta ANIMACAO/NECROMANCER.")
    main(Path(sys.argv[1]).resolve())
