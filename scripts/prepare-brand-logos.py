"""Prepare transparent brand logo assets for web from the uploaded logos folder."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "logos"
OUT_DIRS = [
    ROOT / "client" / "app" / "public" / "brand",
    ROOT / "client" / "marketing" / "public" / "brand",
]


def remove_solid_bg(img: Image.Image, mode: str) -> Image.Image:
    rgba = img.convert("RGBA")
    arr = np.array(rgba)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    lum = (0.2126 * r + 0.7152 * g + 0.0722 * b).astype(np.float32)
    is_orange = (r > 180) & (g > 60) & (g < 180) & (b < 120) & (r > g) & (r > b + 40)
    if mode == "black":
        bg = (lum < 28) & ~is_orange
    elif mode == "white":
        bg = (
            (lum > 245)
            & ~is_orange
            & (np.abs(r.astype(int) - g.astype(int)) < 12)
            & (np.abs(g.astype(int) - b.astype(int)) < 12)
        )
    else:
        raise ValueError(mode)
    arr[:, :, 3] = np.where(bg, 0, a)
    return Image.fromarray(arr)


def content_bbox(img: Image.Image, pad: int = 8) -> Image.Image:
    alpha = np.array(img.split()[-1])
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        return img
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width - 1, x1 + pad)
    y1 = min(img.height - 1, y1 + pad)
    return img.crop((x0, y0, x1 + 1, y1 + 1))


def save_web(img: Image.Image, path: Path, max_w: int = 1600) -> None:
    out = img
    if out.width > max_w:
        h = int(out.height * max_w / out.width)
        out = out.resize((max_w, h), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, "PNG", optimize=True)
    print(f"wrote {path.relative_to(ROOT)} {out.size}")


def invert_light_to_dark(img: Image.Image) -> Image.Image:
    """Turn white/light logo marks into near-black for light backgrounds."""
    arr = np.array(img.convert("RGBA"))
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a = arr[:, :, 3]
    is_orange = (r > 180) & (g > 60) & (g < 180) & (b < 120) & (r > g) & (r > b + 40)
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    is_light = (lum > 180) & (a > 8) & ~is_orange
    arr[:, :, 0] = np.where(is_light, 26, r).astype(np.uint8)
    arr[:, :, 1] = np.where(is_light, 26, g).astype(np.uint8)
    arr[:, :, 2] = np.where(is_light, 26, b).astype(np.uint8)
    return Image.fromarray(arr)


def extract_mark(vertical: Image.Image) -> Image.Image:
    """Crop the car mark above the wordmark (skip tiny gaps inside the car)."""
    alpha = np.array(vertical.split()[-1])
    ys, xs = np.where(alpha > 8)
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    content_h = y1 - y0 + 1
    band = alpha[y0 : y1 + 1, x0 : x1 + 1]
    row_density = (band > 8).mean(axis=1)

    gaps: list[tuple[int, int, int]] = []
    in_gap = False
    gap_start = 0
    for i, d in enumerate(row_density):
        if d < 0.01:
            if not in_gap:
                in_gap = True
                gap_start = i
        elif in_gap:
            gaps.append((gap_start, i, i - gap_start))
            in_gap = False

    # Prefer the first sizable gap after the car starts (ignores roof-sign micro-gaps).
    cut = None
    for start, _end, length in gaps:
        if start > content_h * 0.25 and length >= 40:
            cut = start
            break
    if cut is None:
        cut = int(content_h * 0.48)

    mark = vertical.crop((x0, y0, x1 + 1, y0 + cut))
    return content_bbox(mark, pad=4)


def main() -> None:
    jobs = [
        ("English/White Background-01.png", "white", "en", "horizontal-on-light.png"),
        ("English/Black Horizontal-01.png", "black", "en", "horizontal-on-dark.png"),
        ("English/White-01.png", "white", "en", "vertical-on-light.png"),
        ("English/Black Background-01.png", "black", "en", "vertical-on-dark.png"),
        ("Armenian/Black-01.png", "black", "am", "horizontal-on-dark.png"),
        ("Armenian/White Background-01.png", "white", "am", "vertical-on-light.png"),
        ("Armenian/Black Background-01.png", "black", "am", "vertical-on-dark.png"),
    ]

    processed: dict[tuple[str, str], Image.Image] = {}
    for src, mode, lang, name in jobs:
        clean = content_bbox(remove_solid_bg(Image.open(SRC / src), mode))
        processed[(lang, name)] = clean
        for out in OUT_DIRS:
            save_web(clean, out / lang / name)

    light_am_h = invert_light_to_dark(processed[("am", "horizontal-on-dark.png")])
    processed[("am", "horizontal-on-light.png")] = light_am_h
    for out in OUT_DIRS:
        save_web(light_am_h, out / "am" / "horizontal-on-light.png")

    for lang in ("en", "am"):
        for tone, fname in (
            ("on-light", "vertical-on-light.png"),
            ("on-dark", "vertical-on-dark.png"),
        ):
            mark = extract_mark(processed[(lang, fname)])
            for out in OUT_DIRS:
                save_web(mark, out / lang / f"mark-{tone}.png", max_w=512)

    # Default favicon / fallback mark (English on-light car mark)
    mark = Image.open(OUT_DIRS[0] / "en" / "mark-on-light.png")
    for out in OUT_DIRS:
        save_web(mark, out.parent / "logo-mark.png", max_w=256)
        # Keep /logo.svg consumers working: also write a PNG fallback used via BrandLogo.
        # Update classic logo.svg consumers later; write a default horizontal for SEO.
        save_web(
            processed[("en", "horizontal-on-light.png")],
            out.parent / "logo.png",
            max_w=800,
        )


if __name__ == "__main__":
    main()
