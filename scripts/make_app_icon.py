"""Render native and compatibility app icons from the approved PRTS emblem.

Run ``python scripts/make_app_icon.py``, then
``python packaging/macos/make_icns.py`` for the macOS container.
The in-app Priestess mascot is maintained separately from the app emblem.
"""
from __future__ import annotations

import base64
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "jarvis" / "ui" / "web" / "frontend"
LOGO_PNG = FRONTEND / "public" / "prts-mark.png"

SQUIRCLE_N = 5.0  # superellipse exponent; 5 is the shape platforms settled on
SUPERSAMPLE = 4
PAPER = (23, 23, 23)
DEV_AMBER = (241, 180, 103)  # the interface's "degraded" amber (#F1B467)
DEV_INK = (20, 20, 20)
#: The figure's box as a fraction of the tile — bigger where the tile is smaller.
SPAN_LARGE = 0.90
SPAN_SMALL = 0.96
SPAN_FULL_AT = 64
SPAN_SMALL_AT = 16

MASTER = 1024
ICO_SIZES = (16, 20, 24, 32, 40, 48, 64, 128, 256)


def emblem(size: int, span: float = 1.0) -> Image.Image:
    """Fit the approved transparent emblem inside a square without distortion."""
    with Image.open(LOGO_PNG) as source:
        mark = source.convert("RGBA")
    side = max(1, round(size * span))
    mark.thumbnail((side, side), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size))
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas


def squircle_mask(size: int) -> Image.Image:
    """A superellipse the width of ``size``, antialiased by supersampling."""
    big = size * SUPERSAMPLE
    mask = Image.new("L", (big, big), 0)
    radius = big / 2.0
    exponent = 2.0 / SQUIRCLE_N
    points = []
    for i in range(720):
        theta = 2.0 * math.pi * i / 720
        cos_t, sin_t = math.cos(theta), math.sin(theta)
        x = radius * (abs(cos_t) ** exponent) * (1 if cos_t >= 0 else -1)
        y = radius * (abs(sin_t) ** exponent) * (1 if sin_t >= 0 else -1)
        points.append((radius + x, radius + y))
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask.resize((size, size), Image.Resampling.LANCZOS)


def mark_span(size: int) -> float:
    """Interpolate the figure size, so no two neighbouring sizes jump."""
    t = min(1.0, max(0.0, (size - SPAN_SMALL_AT) / (SPAN_FULL_AT - SPAN_SMALL_AT)))
    return SPAN_SMALL + (SPAN_LARGE - SPAN_SMALL) * t


def render_tile(size: int) -> Image.Image:
    """Render the emblem on a dark rounded tile at the requested native size."""
    tile = Image.new("RGBA", (size, size), (*PAPER, 255))
    tile.alpha_composite(emblem(size, mark_span(size)))
    tile.putalpha(squircle_mask(size))
    return tile


def _dev_ribbon(size: int) -> Image.Image:
    """The amber DEV label the dev instance wears in its lower-right corner.

    Below 32 px the word cannot be read, so the label collapses to a plain
    amber block that still says "this is the other one" at a glance.
    """
    ribbon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(ribbon)
    width = size * 0.5
    height = size * 0.2
    margin = size * 0.05
    x1 = size - margin
    y1 = size - margin
    x0 = x1 - width
    y0 = y1 - height
    draw.rounded_rectangle((x0, y0, x1, y1), radius=height * 0.28, fill=(*DEV_AMBER, 255))
    if size >= 32:
        font = ImageFont.load_default(size=int(height * 0.78))
        left, top, right, bottom = draw.textbbox((0, 0), "DEV", font=font)
        tx = x0 + (width - (right - left)) / 2 - left
        ty = y0 + (height - (bottom - top)) / 2 - top
        draw.text((tx, ty), "DEV", font=font, fill=(*DEV_INK, 255))
    return ribbon


def render_dev_tile(size: int) -> Image.Image:
    """The dev instance's icon: the same tile, wearing the DEV ribbon."""
    tile = render_tile(size)
    tile.alpha_composite(_dev_ribbon(size))
    return tile


def render_mark(size: int) -> Image.Image:
    """The original transparent emblem for surfaces with their own frame."""
    return emblem(size)


def write_png(path: Path, image: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG")


def write_ico(path: Path, members: list[Image.Image]) -> None:
    """Write every ICO member from its own render, largest first."""
    path.parent.mkdir(parents=True, exist_ok=True)
    largest, *rest = members
    largest.save(path, format="ICO", sizes=[m.size for m in members], append_images=rest)


def main() -> None:
    # Keep legacy asset names for callers while replacing their artwork.
    source = LOGO_PNG.read_bytes()
    (ROOT / "assets/brand/dodaios-logo.png").write_bytes(source)
    encoded = base64.b64encode(source).decode("ascii")
    (ROOT / "assets/brand/dodaios-logo.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">'
        f'<image href="data:image/png;base64,{encoded}" width="180" height="180"/>'
        '</svg>\n', encoding="utf-8",
    )
    tile_256 = render_tile(256)
    members = [render_tile(s) for s in sorted(ICO_SIZES, reverse=True)]
    public = FRONTEND / "public"

    write_png(ROOT / "assets" / "icons" / "jarvis-1024.png", render_tile(MASTER))
    for path in (
        ROOT / "jarvis" / "assets" / "icons" / "jarvis.png",
        ROOT / "assets" / "icons" / "jarvis-gigi-256.png",
        public / "jarvis-gigi-256.png",
        public / "jarvis-logo.png",
        FRONTEND / "src" / "assets" / "jarvis-mark.png",
        ROOT / "video" / "public" / "jarvis-gigi.png",
        ROOT / "video" / "public" / "jarvis-mark.png",
        ROOT / "videos" / "agent-mode-launch" / "assets" / "gigi.png",
    ):
        write_png(path, tile_256)
    write_png(public / "jarvis-mark-256.png", render_mark(256))
    for path in (
        ROOT / "jarvis" / "assets" / "icons" / "jarvis.ico",
        ROOT / "assets" / "icons" / "jarvis.ico",
        public / "jarvis.ico",
        public / "jarvis-gigi.ico",
    ):
        write_ico(path, members)
    # The dev instance (``--instance dev``) shows its own DEV-badged copy on the
    # taskbar and in its shortcut, rendered from the same emblem.
    dev_members = [render_dev_tile(s) for s in sorted(ICO_SIZES, reverse=True)]
    dev_png = render_dev_tile(256)
    write_png(ROOT / "assets" / "icons" / "jarvis-dev.png", dev_png)
    write_png(ROOT / "jarvis" / "assets" / "icons" / "jarvis-dev.png", dev_png)
    for path in (
        ROOT / "jarvis" / "assets" / "icons" / "jarvis-dev.ico",
        ROOT / "assets" / "icons" / "jarvis-dev.ico",
    ):
        write_ico(path, dev_members)
    print(f"wrote the app icon at {MASTER} px, 256 px, {len(ICO_SIZES)} ICO members, and DEV")


if __name__ == "__main__":
    main()
