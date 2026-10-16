"""Native icons preserve the approved application emblem across exports."""
from pathlib import Path

import pytest
from PIL import Image

from scripts.make_app_icon import LOGO_PNG, emblem, render_tile

ROOT = Path(__file__).resolve().parents[1]


def test_icon_source_is_the_approved_prts_emblem() -> None:
    assert LOGO_PNG == ROOT / "jarvis/ui/web/frontend/public/prts-mark.png"
    with Image.open(LOGO_PNG) as mark:
        assert mark.width >= 180 and mark.height >= 180
        assert mark.convert("RGBA").getextrema()[3][0] == 0


@pytest.mark.parametrize("size", [16, 32, 256])
def test_every_size_renders_a_filled_tile(size: int) -> None:
    """A rendered tile is opaque in the middle and cut away in the corner.

    The corner is not asserted at exactly zero: the squircle is antialiased by
    supersampling, so at 16 px a trace of edge coverage lands in that pixel.
    """
    tile = render_tile(size)
    assert tile.size == (size, size)
    assert tile.getpixel((size // 2, size // 2))[3] == 255
    assert tile.getpixel((0, 0))[3] < 16


def test_committed_icons_are_the_current_render() -> None:
    """Re-run ``python scripts/make_app_icon.py`` after editing the emblem."""
    committed = Image.open(ROOT / "jarvis" / "assets" / "icons" / "jarvis.png").convert("RGBA")
    assert committed.tobytes() == render_tile(256).tobytes()


def test_large_exports_keep_the_emblem_proportions() -> None:
    """A larger native container must not leave the source at its original size."""
    small = emblem(256).getbbox()
    large = emblem(1024).getbbox()
    assert small is not None and large is not None
    small_span = (small[2] - small[0]) / 256
    large_span = (large[2] - large[0]) / 1024
    assert abs(small_span - large_span) < 0.03
