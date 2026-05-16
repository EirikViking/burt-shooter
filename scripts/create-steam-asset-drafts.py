from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


TITLE = "BURT SHOOTER"
FONT_CANDIDATES = [
    Path("C:/Windows/Fonts/impact.ttf"),
    Path("C:/Windows/Fonts/bahnschrift.ttf"),
    Path("C:/Windows/Fonts/arialbd.ttf"),
]


ASSETS = [
    ("store_header_capsule_920x430.jpg", (920, 430), True, (0.50, 0.55), 0.17),
    ("store_small_capsule_462x174.jpg", (462, 174), True, (0.50, 0.50), 0.23),
    ("store_main_capsule_1232x706.jpg", (1232, 706), True, (0.50, 0.54), 0.15),
    ("store_vertical_capsule_748x896.jpg", (748, 896), True, (0.50, 0.55), 0.12),
    ("store_page_background_1438x810.jpg", (1438, 810), False, (0.50, 0.50), 0.0),
    ("library_capsule_600x900.png", (600, 900), True, (0.50, 0.55), 0.12),
    ("library_header_capsule_920x430.png", (920, 430), True, (0.50, 0.55), 0.17),
    ("library_hero_3840x1240.png", (3840, 1240), False, (0.50, 0.52), 0.0),
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size)


def crop_cover(source: Image.Image, size: tuple[int, int], center: tuple[float, float]) -> Image.Image:
    src_w, src_h = source.size
    target_w, target_h = size
    target_ratio = target_w / target_h
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        crop_h = src_h
        crop_w = int(crop_h * target_ratio)
    else:
        crop_w = src_w
        crop_h = int(crop_w / target_ratio)

    cx = int(src_w * center[0])
    cy = int(src_h * center[1])
    left = max(0, min(src_w - crop_w, cx - crop_w // 2))
    top = max(0, min(src_h - crop_h, cy - crop_h // 2))
    cropped = source.crop((left, top, left + crop_w, top + crop_h))
    return cropped.resize(size, Image.Resampling.LANCZOS)


def add_vignette(image: Image.Image, strength: int = 145) -> Image.Image:
    image = image.convert("RGBA")
    w, h = image.size
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    margin_x = int(w * 0.04)
    margin_y = int(h * 0.04)
    draw.ellipse((-w * 0.2, -h * 0.15, w * 1.2, h * 1.15), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(max(24, min(w, h) // 10)))
    edge = Image.eval(mask, lambda p: max(0, strength - p * strength // 255))
    overlay = Image.new("RGBA", (w, h), (0, 5, 16, 0))
    overlay.putalpha(edge)
    image.alpha_composite(overlay)

    letterbox = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    box = ImageDraw.Draw(letterbox)
    box.rectangle((0, 0, w, margin_y), fill=(0, 0, 0, 60))
    box.rectangle((0, h - margin_y, w, h), fill=(0, 0, 0, 80))
    box.rectangle((0, 0, margin_x, h), fill=(0, 0, 0, 45))
    box.rectangle((w - margin_x, 0, w, h), fill=(0, 0, 0, 45))
    image.alpha_composite(letterbox)
    return image


def fit_font(draw: ImageDraw.ImageDraw, text: str, max_width: int, start_size: int) -> ImageFont.FreeTypeFont:
    size = start_size
    while size >= 18:
      font = load_font(size)
      bbox = draw.textbbox((0, 0), text, font=font, stroke_width=max(2, size // 18))
      if bbox[2] - bbox[0] <= max_width:
          return font
      size -= 4
    return load_font(size)


def add_logo(image: Image.Image, scale: float) -> Image.Image:
    image = image.convert("RGBA")
    w, h = image.size
    draw = ImageDraw.Draw(image)
    font = fit_font(draw, TITLE, int(w * 0.78), max(30, int(h * scale)))
    stroke = max(2, int(font.size * 0.08))
    bbox = draw.textbbox((0, 0), TITLE, font=font, stroke_width=stroke)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (w - text_w) // 2
    y = max(int(h * 0.07), int(h * 0.13) - text_h // 2)

    pad_x = int(text_w * 0.08)
    pad_y = int(text_h * 0.35)
    logo_back = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    back_draw = ImageDraw.Draw(logo_back)
    back_draw.rounded_rectangle(
        (x - pad_x, y - pad_y, x + text_w + pad_x, y + text_h + pad_y),
        radius=max(8, int(h * 0.03)),
        fill=(0, 12, 25, 128),
        outline=(0, 220, 255, 110),
        width=max(1, int(h * 0.004)),
    )
    logo_back = logo_back.filter(ImageFilter.GaussianBlur(max(1, int(h * 0.004))))
    image.alpha_composite(logo_back)

    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.text((x, y), TITLE, font=font, fill=(0, 230, 255, 190), stroke_width=stroke, stroke_fill=(0, 45, 70, 220))
    glow = glow.filter(ImageFilter.GaussianBlur(max(3, int(font.size * 0.08))))
    image.alpha_composite(glow)
    draw = ImageDraw.Draw(image)
    draw.text((x, y), TITLE, font=font, fill=(240, 255, 255, 255), stroke_width=stroke, stroke_fill=(0, 45, 70, 255))
    draw.text((x, y - max(1, font.size // 28)), TITLE, font=font, fill=(0, 230, 255, 185), stroke_width=max(1, stroke // 2), stroke_fill=(0, 75, 95, 180))
    return image


def create_logo(out_dir: Path) -> None:
    w, h = 1280, 720
    image = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    font = fit_font(draw, TITLE, int(w * 0.9), 178)
    stroke = 12
    bbox = draw.textbbox((0, 0), TITLE, font=font, stroke_width=stroke)
    x = (w - (bbox[2] - bbox[0])) // 2
    y = (h - (bbox[3] - bbox[1])) // 2 - 20

    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.text((x, y), TITLE, font=font, fill=(0, 230, 255, 220), stroke_width=stroke, stroke_fill=(0, 50, 75, 240))
    glow = glow.filter(ImageFilter.GaussianBlur(12))
    image.alpha_composite(glow)
    draw = ImageDraw.Draw(image)
    draw.text((x, y), TITLE, font=font, fill=(245, 255, 255, 255), stroke_width=stroke, stroke_fill=(0, 50, 75, 255))
    draw.text((x, y - 4), TITLE, font=font, fill=(0, 230, 255, 190), stroke_width=4, stroke_fill=(0, 95, 115, 170))
    image.save(out_dir / "library_logo_1280x720.png")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create Steam asset drafts from generated key art.")
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    source = Image.open(args.source).convert("RGB")
    source.save(args.out_dir / "key_art_source.png")

    for filename, size, with_logo, center, logo_scale in ASSETS:
        image = crop_cover(source, size, center)
        image = add_vignette(image)
        if not with_logo:
            image = image.convert("RGBA")
            shade = Image.new("RGBA", image.size, (0, 6, 18, 48))
            image.alpha_composite(shade)
        if with_logo:
            image = add_logo(image, logo_scale)

        out_path = args.out_dir / filename
        if out_path.suffix.lower() in {".jpg", ".jpeg"}:
            image.convert("RGB").save(out_path, quality=92, optimize=True)
        else:
            image.save(out_path, optimize=True)

    create_logo(args.out_dir)


if __name__ == "__main__":
    main()
