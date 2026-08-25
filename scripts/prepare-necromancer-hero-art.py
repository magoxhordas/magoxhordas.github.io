"""Prepara os sprites oficiais do Necromante para o renderer de herois.

Uso:
  python scripts/prepare-necromancer-hero-art.py <pasta ANIMACAO/NECROMANCER>

Os arquivos de origem nao sao alterados. A versao atual usa os seis GIFs
direcionais fornecidos (tres caminhadas e tres ataques). Todos os quadros
resultantes usam uma tela transparente de 64x64 e a mesma linha de apoio
(y=52), evitando saltos ao alternar entre parado, caminhada e ataque.
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


def require_frames(frames: list[Image.Image], expected: int, label: str) -> list[Image.Image]:
    if len(frames) != expected:
        raise SystemExit(f"{label}: esperados {expected} quadros, recebidos {len(frames)}.")
    return frames


def save(image: Image.Image, name: str) -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    image.save(TARGET / name, format="PNG", optimize=False)


def main(source_dir: Path) -> None:
    state = source_dir / "Create_a_small_dark_fant-Idle" / "Idle"
    rotations = state / "rotations"
    idle_sources = {"south": "south", "north": "north", "side": "west"}
    walk_sources = {
        "south": (source_dir / "Idle_walk_south.gif", False),
        "north": (source_dir / "Idle_walk_north.gif", False),
        # O renderer usa o quadro lateral voltado para a esquerda e o espelha
        # automaticamente ao caminhar para a direita.
        "side": (source_dir / "Idle_walk_west.gif", False),
    }
    attack_sources = {
        "south": (source_dir / "Idle_custom-The_necromancer_performs_a_dar_south.gif", False),
        "north": (source_dir / "Idle_custom-The_necromancer_performs_a_dar_north.gif", False),
        # O ataque de origem olha para leste; espelhamos uma unica vez para
        # obedecer ao mesmo contrato lateral dos outros herois.
        "side": (source_dir / "Idle_custom-The_necromancer_performs_a_dar_east.gif", True),
    }

    for target_direction, source_direction in idle_sources.items():
        save(anchored(Image.open(rotations / f"{source_direction}.png")), f"idle_{target_direction}.png")

    for direction, (source, mirror) in walk_sources.items():
        frames = require_frames(gif_frames(source, mirror=mirror), 6, f"Caminhada {direction}")
        for index, image in enumerate(frames):
            save(image, f"walk_{direction}_{index}.png")

    for direction, (source, mirror) in attack_sources.items():
        frames = require_frames(gif_frames(source, mirror=mirror), 9, f"Ataque {direction}")
        for index, image in enumerate(frames):
            save(image, f"atk_{direction}_{index}.png")

    save(anchored(Image.open(rotations / "south.png")), "icon.png")
    print(f"OK: {len(list(TARGET.glob('*.png')))} sprites preparados em {TARGET}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Informe a pasta ANIMACAO/NECROMANCER.")
    main(Path(sys.argv[1]).resolve())
