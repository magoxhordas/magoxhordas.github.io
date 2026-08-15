"""Prepare transparent, centered Códex icons from the supplied pixel-art atlases.

The source atlases are intentionally kept outside the game. This script extracts only
the requested cells, removes the near-black backdrop and writes compact PNG assets.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


RESAMPLE = Image.Resampling.NEAREST


def _foreground_alpha(image: Image.Image, low: int = 10, high: int = 34) -> Image.Image:
    rgba = image.convert("RGBA")
    out = Image.new("RGBA", rgba.size)
    src = rgba.load()
    dst = out.load()
    span = max(1, high - low)
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, source_alpha = src[x, y]
            strength = max(r, g, b)
            alpha = max(0, min(255, round((strength - low) * 255 / span)))
            dst[x, y] = (r, g, b, min(source_alpha, alpha))
    return out


def _center_icon(image: Image.Image, canvas_size: int, content_size: int) -> Image.Image:
    cleaned = _foreground_alpha(image)
    bbox = cleaned.getchannel("A").point(lambda value: 255 if value > 18 else 0).getbbox()
    if not bbox:
        raise ValueError("No visible icon content found in source crop")
    cropped = cleaned.crop(bbox)
    scale = min(content_size / cropped.width, content_size / cropped.height)
    width = max(1, round(cropped.width * scale))
    height = max(1, round(cropped.height * scale))
    cropped = cropped.resize((width, height), RESAMPLE)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.alpha_composite(cropped, ((canvas_size - width) // 2, (canvas_size - height) // 2))
    return canvas


def _grid_crop(image: Image.Image, column: int, row: int) -> Image.Image:
    cell_width = image.width / 8
    x0 = round(column * cell_width)
    x1 = round((column + 1) * cell_width)
    y0 = 0 if row == 0 else image.height // 2
    y1 = image.height // 2 if row == 0 else image.height
    return image.crop((x0, y0, x1, y1))


def _relic_crop(image: Image.Image, column: int, row: int) -> Image.Image:
    if row == 0:
        width = image.width / 4
        return image.crop((round(column * width), 0, round((column + 1) * width), image.height // 2))
    windows = ((260, 690), (610, 1060), (980, 1430))
    x0, x1 = windows[column]
    return image.crop((x0, image.height // 2, x1, image.height))


def _save_icon(source: Image.Image, cell: tuple[int, int], target: Path, relic_grid: bool = False) -> None:
    crop = _relic_crop(source, *cell) if relic_grid else _grid_crop(source, *cell)
    target.parent.mkdir(parents=True, exist_ok=True)
    _center_icon(crop, 192, 154).save(target, optimize=True)


def normalize_blessings(folder: Path) -> None:
    for path in sorted(folder.glob("*.png")):
        source = Image.open(path).convert("RGBA")
        normalized = _center_icon(source, 320, 224)
        normalized.save(path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mage", required=True, type=Path)
    parser.add_argument("--archer", required=True, type=Path)
    parser.add_argument("--warrior", required=True, type=Path)
    parser.add_argument("--viking", required=True, type=Path)
    parser.add_argument("--universal", required=True, type=Path)
    parser.add_argument("--relics", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--blessings", required=True, type=Path)
    args = parser.parse_args()

    sources = {
        "mage": Image.open(args.mage).convert("RGB"),
        "archer": Image.open(args.archer).convert("RGB"),
        "warrior": Image.open(args.warrior).convert("RGB"),
        "viking": Image.open(args.viking).convert("RGB"),
        "universal": Image.open(args.universal).convert("RGB"),
        "relics": Image.open(args.relics).convert("RGB"),
    }

    # Current campaign class buffs, matched to the supplied visual references.
    mapping: dict[str, tuple[str, tuple[int, int]]] = {
        "mage_arcane_core": ("mage", (4, 0)),
        "mage_spellbook": ("mage", (2, 0)),
        "mage_elemental_orb": ("mage", (1, 0)),
        "mage_arcane_hourglass": ("mage", (5, 1)),
        "mage_astral_cloak": ("mage", (7, 1)),
        "mage_mana_fragment": ("mage", (4, 1)),
        "mage_arcane_eye": ("mage", (2, 1)),
        "mage_rune_circle": ("mage", (6, 1)),
        "warrior_reinforced_plate": ("warrior", (7, 0)),
        "warrior_whetstone": ("warrior", (2, 1)),
        "warrior_gauntlet": ("warrior", (2, 0)),
        "warrior_guardian_medallion": ("warrior", (4, 0)),
        "warrior_broken_shield": ("warrior", (6, 0)),
        "warrior_heavy_boots": ("archer", (5, 0)),
        "warrior_iron_emblem": ("warrior", (0, 0)),
        "warrior_titan_heart": ("warrior", (1, 0)),
        "archer_shooter_glove": ("archer", (2, 1)),
        "archer_eagle_eye": ("archer", (4, 0)),
        "archer_reinforced_quiver": ("archer", (1, 1)),
        "archer_wind_feather": ("archer", (6, 0)),
        "archer_hunter_sight": ("archer", (1, 0)),
        "archer_serrated_tip": ("archer", (3, 0)),
        "archer_precision_medallion": ("archer", (5, 1)),
        "archer_hunter_steps": ("archer", (5, 0)),
        "viking_war_horn": ("viking", (6, 0)),
        "viking_mead_mug": ("viking", (7, 0)),
        "viking_blood_rune": ("viking", (2, 0)),
        "viking_odin_eye": ("viking", (5, 1)),
        "viking_berserker_fury": ("viking", (0, 1)),
        "viking_thor_totem": ("viking", (5, 0)),
        "viking_frozen_beard": ("viking", (1, 1)),
        "viking_valhalla_heart": ("viking", (2, 1)),
        "universal_light_boots": ("archer", (5, 0)),
        "universal_red_heart": ("warrior", (1, 0)),
        "universal_combat_ration": ("universal", (3, 0)),
        "universal_agile_gloves": ("warrior", (2, 0)),
        "universal_luck_amulet": ("universal", (2, 0)),
        "universal_merchant_bag": ("universal", (2, 1)),
        "universal_runic_magnet": ("universal", (4, 0)),
        "universal_golden_clover": ("universal", (1, 0)),
        "dng_relic_vamp": ("relics", (0, 1)),
        "dng_relic_crit": ("relics", (1, 0)),
        "dng_relic_shield": ("universal", (7, 0)),
        "dng_relic_speed": ("relics", (1, 1)),
        "dng_relic_aoe": ("relics", (0, 0)),
        "dng_relic_gold": ("relics", (2, 1)),
        "dng_relic_regen": ("relics", (2, 0)),
        "dng_relic_maxhp": ("relics", (2, 0)),
        "dng_ring_furia": ("relics", (3, 0)),
        "dng_ring_vampirico": ("relics", (0, 1)),
        "dng_ring_critico": ("relics", (1, 0)),
        "dng_ring_ganancia": ("relics", (2, 1)),
        "dng_ring_vitalidade": ("relics", (2, 0)),
        "dng_ring_pressa": ("relics", (1, 1)),
        "dng_ring_regen": ("relics", (0, 0)),
    }

    for icon_id, (source_id, cell) in mapping.items():
        _save_icon(
            sources[source_id],
            cell,
            args.output / f"{icon_id}.png",
            relic_grid=source_id == "relics",
        )

    normalize_blessings(args.blessings)


if __name__ == "__main__":
    main()
