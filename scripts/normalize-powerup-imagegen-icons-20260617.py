from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "art" / "generated" / "nova-swarm" / "powerups"
SOURCE_DIR = OUT_DIR / "imagegen-source-20260617"
CONTACT_SHEET = OUT_DIR / "nova-powerups-contact-sheet-20260617-new-batch.png"
SIZE = 192
INNER_SIZE = 166
KEEP_LARGEST_COMPONENT = {"stasis_net", "target_paint"}

POWERUPS = [
    "prism_splitter",
    "rail_surge",
    "chrono_anchor",
    "blink_drive",
    "nano_patch",
    "score_fever",
    "gravity_well",
    "drone_carousel",
    "plasma_lance",
    "stasis_net",
    "aegis_burst",
    "jackpot_lens",
    "ion_dash",
    "saw_matrix",
    "mirror_shots",
    "mercy_protocol",
    "target_paint",
    "void_crown",
    "swarm_contract",
    "pulse_refund",
]


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a <= 8:
        return True
    if g > 170 and r < 90 and b < 120:
        return True
    brightness = max(r, g, b)
    spread = max(r, g, b) - min(r, g, b)
    return brightness < 86 and spread < 34


def remove_edge_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    seen: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= width or y >= height or (x, y) in seen:
            continue
        if not is_background(pixels[x, y]):
            continue
        seen.add((x, y))
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    for x, y in seen:
        pixels[x, y] = (0, 0, 0, 0)
    return rgba


def trim_and_pad(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    cropped = image.crop(bbox)
    cropped.thumbnail((INNER_SIZE, INNER_SIZE), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    x = (SIZE - cropped.width) // 2
    y = (SIZE - cropped.height) // 2
    glow.alpha_composite(cropped, (x, y))
    glow_alpha = glow.getchannel("A").filter(ImageFilter.GaussianBlur(5))
    glow_layer = Image.new("RGBA", (SIZE, SIZE), (90, 238, 255, 0))
    glow_layer.putalpha(glow_alpha.point(lambda value: min(72, value // 3)))
    canvas.alpha_composite(glow_layer)
    canvas.alpha_composite(cropped, (x, y))
    return canvas


def keep_largest_alpha_component(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    alpha = rgba.getchannel("A")
    pixels = alpha.load()
    seen: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []

    for y in range(height):
        for x in range(width):
            if (x, y) in seen or pixels[x, y] <= 12:
                continue
            component: list[tuple[int, int]] = []
            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen.add((x, y))
            while queue:
                cx, cy = queue.popleft()
                component.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height or (nx, ny) in seen:
                        continue
                    if pixels[nx, ny] <= 12:
                        continue
                    seen.add((nx, ny))
                    queue.append((nx, ny))
            components.append(component)

    if not components:
        return rgba

    keep = set(max(components, key=len))
    data = rgba.load()
    for y in range(height):
        for x in range(width):
            if pixels[x, y] > 0 and (x, y) not in keep:
                data[x, y] = (0, 0, 0, 0)
    return rgba


def normalize_icon(powerup_id: str) -> Image.Image:
    source = SOURCE_DIR / f"{powerup_id}.png"
    if not source.exists():
        raise FileNotFoundError(f"Missing source icon: {source}")
    image = Image.open(source)
    cleaned = remove_edge_background(image)
    if powerup_id in KEEP_LARGEST_COMPONENT:
        cleaned = keep_largest_alpha_component(cleaned)
    return trim_and_pad(cleaned)


def make_contact_sheet(icons: list[tuple[str, Image.Image]]) -> Image.Image:
    cols = 5
    rows = 4
    margin = 18
    label_h = 22
    cell_w = SIZE + margin * 2
    cell_h = SIZE + margin * 2 + label_h
    sheet = Image.new("RGBA", (cols * cell_w, rows * cell_h), (3, 8, 16, 255))
    draw = ImageDraw.Draw(sheet)
    for index, (powerup_id, icon) in enumerate(icons):
        col = index % cols
        row = index // cols
        x = col * cell_w + margin
        y = row * cell_h + margin
        sheet.alpha_composite(icon, (x, y))
        draw.text((x, y + SIZE + 2), powerup_id.replace("_", " "), fill=(174, 241, 255, 255))
    return sheet


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    icons = []
    for powerup_id in POWERUPS:
        icon = normalize_icon(powerup_id)
        target = OUT_DIR / f"nova-powerup-{powerup_id}-20260613.png"
        icon.save(target, optimize=True)
        icons.append((powerup_id, icon))
    make_contact_sheet(icons).save(CONTACT_SHEET, optimize=True)
    print(f"wrote {len(icons)} imagegen-normalized icons and {CONTACT_SHEET}")


if __name__ == "__main__":
    main()
