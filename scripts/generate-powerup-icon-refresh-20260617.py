from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "art" / "generated" / "nova-swarm" / "powerups"
CONTACT_SHEET = OUT_DIR / "nova-powerups-contact-sheet-20260617-new-batch.png"
SIZE = 192
SCALE = 4
W = SIZE * SCALE
C = W // 2
R = int(76 * SCALE)


POWERUPS = [
    ("prism_splitter", (255, 119, 255)),
    ("rail_surge", (102, 224, 255)),
    ("chrono_anchor", (99, 255, 232)),
    ("blink_drive", (125, 249, 255)),
    ("nano_patch", (141, 255, 141)),
    ("score_fever", (255, 234, 51)),
    ("gravity_well", (176, 124, 255)),
    ("drone_carousel", (64, 214, 255)),
    ("plasma_lance", (255, 75, 75)),
    ("stasis_net", (138, 239, 255)),
    ("aegis_burst", (51, 255, 238)),
    ("jackpot_lens", (255, 216, 77)),
    ("ion_dash", (88, 255, 157)),
    ("saw_matrix", (255, 140, 34)),
    ("mirror_shots", (158, 232, 255)),
    ("mercy_protocol", (126, 255, 168)),
    ("target_paint", (255, 95, 191)),
    ("void_crown", (189, 100, 255)),
    ("swarm_contract", (198, 255, 61)),
    ("pulse_refund", (77, 255, 207)),
]


def rgba(color: tuple[int, int, int], alpha: int) -> tuple[int, int, int, int]:
    return (*color, alpha)


def pt(x: float, y: float) -> tuple[int, int]:
    return (int(C + x * SCALE), int(C + y * SCALE))


def box(cx: float, cy: float, radius: float) -> tuple[int, int, int, int]:
    x, y = pt(cx, cy)
    rr = int(radius * SCALE)
    return (x - rr, y - rr, x + rr, y + rr)


def regular_polygon(cx: float, cy: float, radius: float, count: int, rotation: float = 0) -> list[tuple[int, int]]:
    return [
        pt(
            cx + math.cos(rotation + i * math.tau / count) * radius,
            cy + math.sin(rotation + i * math.tau / count) * radius,
        )
        for i in range(count)
    ]


def line(layer: Image.Image, points: list[tuple[int, int]], color: tuple[int, int, int], width: float, alpha: int = 235) -> None:
    glow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.line(points, fill=rgba(color, 125), width=int(width * SCALE * 3.1), joint="curve")
    layer.alpha_composite(glow.filter(ImageFilter.GaussianBlur(int(3.4 * SCALE))))
    ImageDraw.Draw(layer).line(points, fill=rgba(color, alpha), width=max(1, int(width * SCALE)), joint="curve")


def circle(layer: Image.Image, cx: float, cy: float, radius: float, color: tuple[int, int, int], alpha: int = 230, fill: bool = False) -> None:
    glow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(box(cx, cy, radius), outline=rgba(color, 115), width=int(4 * SCALE))
    layer.alpha_composite(glow.filter(ImageFilter.GaussianBlur(int(3 * SCALE))))
    draw = ImageDraw.Draw(layer)
    if fill:
        draw.ellipse(box(cx, cy, radius), fill=rgba(color, alpha))
    else:
        draw.ellipse(box(cx, cy, radius), outline=rgba(color, alpha), width=int(2.2 * SCALE))


def arc(layer: Image.Image, cx: float, cy: float, radius: float, start: float, end: float, color: tuple[int, int, int], width: float = 3, alpha: int = 230) -> None:
    draw = ImageDraw.Draw(layer)
    draw.arc(box(cx, cy, radius), start=start, end=end, fill=rgba(color, alpha), width=max(1, int(width * SCALE)))


def badge(accent: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))

    glow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(box(0, 0, 84), fill=rgba(accent, 58))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(int(9 * SCALE))))

    draw = ImageDraw.Draw(img)
    draw.ellipse(box(0, 0, 82), fill=(2, 12, 22, 226))
    draw.ellipse(box(0, 0, 78), outline=rgba(accent, 215), width=int(2.4 * SCALE))
    draw.ellipse(box(0, 0, 62), outline=(113, 246, 255, 44), width=int(1.2 * SCALE))

    for angle in (20, 110, 200, 290):
        a = math.radians(angle)
        line(
            img,
            [pt(math.cos(a) * 61, math.sin(a) * 61), pt(math.cos(a) * 73, math.sin(a) * 73)],
            accent,
            1.5,
            165,
        )
    return img


def draw_prism(layer: Image.Image, color: tuple[int, int, int]) -> None:
    cyan = (97, 244, 255)
    tri = [pt(-12, -34), pt(30, 0), pt(-13, 34)]
    ImageDraw.Draw(layer).polygon(tri, fill=(34, 20, 46, 180), outline=rgba(color, 240))
    line(layer, [pt(-8, -28), pt(8, 0), pt(-8, 28)], cyan, 2.2)
    for target in [(-58, -36), (-62, 0), (58, -26), (62, 24)]:
        line(layer, [pt(18, 0), pt(*target)], color if target[0] < 0 else cyan, 3.0, 230)
    circle(layer, 18, 0, 7, (255, 244, 99), 240, True)


def draw_rail(layer: Image.Image, color: tuple[int, int, int]) -> None:
    line(layer, [pt(-60, 18), pt(64, -22)], color, 6.0)
    line(layer, [pt(-45, 30), pt(48, 0)], (255, 255, 255), 1.8, 210)
    for x, y in [(-36, 10), (0, -2), (36, -14)]:
        circle(layer, x, y, 16, color, 210)
    ImageDraw.Draw(layer).polygon([pt(55, -26), pt(72, -23), pt(58, -10)], fill=rgba((255, 255, 255), 230))


def draw_chrono(layer: Image.Image, color: tuple[int, int, int]) -> None:
    circle(layer, 0, 0, 48, color)
    for i in range(12):
        a = i * math.tau / 12 - math.pi / 2
        line(layer, [pt(math.cos(a) * 39, math.sin(a) * 39), pt(math.cos(a) * 47, math.sin(a) * 47)], color, 1.4, 180)
    line(layer, [pt(0, -28), pt(0, 8), pt(-15, 25)], (255, 255, 255), 3.2)
    line(layer, [pt(0, 8), pt(17, -12)], color, 2.5)
    arc(layer, 0, 10, 24, 22, 158, color, 3.6)


def draw_blink(layer: Image.Image, color: tuple[int, int, int]) -> None:
    arc(layer, 0, 0, 55, 28, 158, color, 5.4)
    arc(layer, 0, 0, 55, 208, 338, color, 5.4)
    arc(layer, 0, 0, 34, 292, 96, (255, 255, 255), 2.0)
    ImageDraw.Draw(layer).polygon([pt(-20, -10), pt(12, 0), pt(-20, 10), pt(-8, 0)], fill=rgba(color, 230))
    for x in [18, 34, 48]:
        line(layer, [pt(x, -14), pt(x + 12, 0), pt(x, 14)], color, 2.3, 210)


def draw_nano(layer: Image.Image, color: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(layer)
    draw.polygon(regular_polygon(0, 0, 39, 6, math.radians(30)), fill=(9, 45, 33, 205), outline=rgba(color, 230))
    line(layer, [pt(-19, 0), pt(19, 0)], (245, 255, 245), 5.5)
    line(layer, [pt(0, -19), pt(0, 19)], (245, 255, 245), 5.5)
    for a in [35, 145, 240, 315]:
        x = math.cos(math.radians(a)) * 56
        y = math.sin(math.radians(a)) * 47
        circle(layer, x, y, 5, color, 215, True)
        line(layer, [pt(x * 0.7, y * 0.7), pt(x, y)], color, 1.3, 150)


def draw_score(layer: Image.Image, color: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(layer)
    spikes = []
    for i in range(16):
        r = 50 if i % 2 == 0 else 26
        a = -math.pi / 2 + i * math.tau / 16
        spikes.append(pt(math.cos(a) * r, math.sin(a) * r))
    draw.polygon(spikes, fill=rgba(color, 210), outline=rgba((255, 255, 255), 220))
    for a in [20, 80, 150, 225, 300]:
        circle(layer, math.cos(math.radians(a)) * 59, math.sin(math.radians(a)) * 48, 5, color, 230, True)


def draw_gravity(layer: Image.Image, color: tuple[int, int, int]) -> None:
    circle(layer, 0, 0, 12, (6, 4, 13), 255, True)
    for r, off in [(22, 20), (34, 72), (46, 138), (56, 210)]:
        arc(layer, 0, 0, r, off, off + 238, color, 3.1, 225)
    for a in [40, 165, 282]:
        line(layer, [pt(math.cos(math.radians(a)) * 62, math.sin(math.radians(a)) * 62), pt(math.cos(math.radians(a + 30)) * 30, math.sin(math.radians(a + 30)) * 30)], color, 1.7, 150)


def draw_drones(layer: Image.Image, color: tuple[int, int, int]) -> None:
    circle(layer, 0, 0, 43, color, 175)
    for a in [45, 135, 225, 315]:
        x = math.cos(math.radians(a)) * 42
        y = math.sin(math.radians(a)) * 42
        draw = ImageDraw.Draw(layer)
        draw.polygon([pt(x, y - 9), pt(x + 13, y), pt(x, y + 9), pt(x - 13, y)], fill=rgba(color, 225), outline=rgba((255, 255, 255), 190))
    circle(layer, 0, 0, 9, (255, 255, 255), 210, True)


def draw_lance(layer: Image.Image, color: tuple[int, int, int]) -> None:
    line(layer, [pt(-60, 34), pt(55, -38)], color, 7.5)
    ImageDraw.Draw(layer).polygon([pt(50, -43), pt(72, -47), pt(59, -24)], fill=rgba((255, 235, 205), 235))
    for t in [(-37, 18), (-12, 3), (13, -12)]:
        circle(layer, *t, 8, color, 170)


def draw_stasis(layer: Image.Image, color: tuple[int, int, int]) -> None:
    verts = regular_polygon(0, 0, 52, 6, math.radians(30))
    draw = ImageDraw.Draw(layer)
    draw.polygon(verts, outline=rgba(color, 230))
    for i, v in enumerate(verts):
        line(layer, [pt(0, 0), v], color, 1.7, 150)
        line(layer, [v, verts[(i + 1) % 6]], color, 2.1, 230)
    for r in [22, 38]:
        draw.polygon(regular_polygon(0, 0, r, 6, math.radians(30)), outline=rgba((255, 255, 255), 130))


def draw_aegis(layer: Image.Image, color: tuple[int, int, int]) -> None:
    shield = [pt(0, -53), pt(41, -34), pt(32, 20), pt(0, 58), pt(-32, 20), pt(-41, -34)]
    ImageDraw.Draw(layer).polygon(shield, fill=(5, 48, 54, 165), outline=rgba(color, 240))
    arc(layer, 0, -4, 37, 205, 335, (255, 255, 255), 3.0, 190)
    for a in [235, 270, 305]:
        line(layer, [pt(math.cos(math.radians(a)) * 22, 16 + math.sin(math.radians(a)) * 10), pt(math.cos(math.radians(a)) * 52, 20 + math.sin(math.radians(a)) * 20)], color, 2.2, 190)


def draw_jackpot(layer: Image.Image, color: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(layer)
    draw.ellipse((pt(-43, -30), pt(43, 30)), fill=(66, 42, 4, 188), outline=rgba(color, 240), width=int(2.4 * SCALE))
    circle(layer, 0, 0, 20, (255, 255, 255), 150)
    line(layer, [pt(-24, -16), pt(28, 14)], color, 2.2)
    for a in [20, 90, 160, 235, 310]:
        circle(layer, math.cos(math.radians(a)) * 58, math.sin(math.radians(a)) * 44, 6, color, 220, True)


def draw_ion(layer: Image.Image, color: tuple[int, int, int]) -> None:
    for y, w in [(-24, 4.4), (0, 5.4), (24, 4.4)]:
        line(layer, [pt(-62, y), pt(24, y - 5), pt(59, y - 19)], color, w, 235)
    ImageDraw.Draw(layer).polygon([pt(18, -42), pt(69, -19), pt(32, 2)], fill=rgba((255, 255, 255), 205))
    arc(layer, -12, 1, 36, 220, 316, color, 4.2)


def draw_saw(layer: Image.Image, color: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(layer)
    for cx, cy, rr in [(-22, -12, 25), (23, 10, 27), (0, 36, 18)]:
        pts = []
        for i in range(24):
            r = rr if i % 2 == 0 else rr * 0.72
            a = i * math.tau / 24
            pts.append(pt(cx + math.cos(a) * r, cy + math.sin(a) * r))
        draw.polygon(pts, fill=rgba(color, 205), outline=rgba((255, 238, 180), 185))
        circle(layer, cx, cy, rr * 0.25, (18, 10, 6), 255, True)


def draw_mirror(layer: Image.Image, color: tuple[int, int, int]) -> None:
    for sx in [-1, 1]:
        line(layer, [pt(sx * 12, 38), pt(sx * 20, 2), pt(sx * 42, -34)], color, 4.2)
        ImageDraw.Draw(layer).ellipse(box(sx * 44, -38, 8), fill=rgba((255, 255, 255), 230))
    line(layer, [pt(0, -52), pt(0, 52)], (255, 255, 255), 1.5, 155)
    arc(layer, 0, 0, 48, 60, 122, color, 2.5)
    arc(layer, 0, 0, 48, 238, 300, color, 2.5)


def draw_mercy(layer: Image.Image, color: tuple[int, int, int]) -> None:
    shield = [pt(0, -52), pt(36, -32), pt(30, 19), pt(0, 55), pt(-30, 19), pt(-36, -32)]
    ImageDraw.Draw(layer).polygon(shield, fill=(8, 48, 27, 170), outline=rgba(color, 235))
    line(layer, [pt(-17, 0), pt(17, 0)], (245, 255, 245), 5.0)
    line(layer, [pt(0, -17), pt(0, 17)], (245, 255, 245), 5.0)
    circle(layer, 0, 0, 39, color, 170)


def draw_target(layer: Image.Image, color: tuple[int, int, int]) -> None:
    for r in [25, 45]:
        circle(layer, 0, 0, r, color, 230)
    line(layer, [pt(-64, 0), pt(-35, 0)], color, 3.0)
    line(layer, [pt(35, 0), pt(64, 0)], color, 3.0)
    line(layer, [pt(0, -64), pt(0, -35)], color, 3.0)
    line(layer, [pt(0, 35), pt(0, 64)], color, 3.0)
    circle(layer, 0, 0, 7, (255, 255, 255), 235, True)


def draw_void(layer: Image.Image, color: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(layer)
    draw.ellipse(box(0, 11, 26), fill=(7, 2, 14, 245))
    crown = [pt(-45, -3), pt(-28, -39), pt(-10, -8), pt(0, -47), pt(13, -8), pt(32, -39), pt(45, -3), pt(35, 18), pt(-35, 18)]
    draw.polygon(crown, fill=rgba(color, 210), outline=rgba((255, 230, 255), 165))
    for a in [18, 88, 162, 236, 306]:
        circle(layer, math.cos(math.radians(a)) * 57, math.sin(math.radians(a)) * 49, 4, color, 200, True)


def draw_swarm(layer: Image.Image, color: tuple[int, int, int]) -> None:
    positions = [(0, -42), (39, -13), (28, 34), (-28, 34), (-39, -13), (0, 0)]
    for a, b in zip(positions, positions[1:] + positions[:1]):
        line(layer, [pt(*a), pt(*b)], color, 1.8, 150)
    for x, y in positions:
        ImageDraw.Draw(layer).polygon([pt(x, y - 9), pt(x + 11, y), pt(x, y + 9), pt(x - 11, y)], fill=rgba(color, 220), outline=rgba((255, 255, 255), 130))
    arc(layer, 0, 0, 58, 195, 335, color, 3.0, 180)


def draw_refund(layer: Image.Image, color: tuple[int, int, int]) -> None:
    for r in [24, 42, 59]:
        circle(layer, 0, 0, r, color, 170)
    for a in [18, 70, 124, 198, 260, 318]:
        x = math.cos(math.radians(a)) * 54
        y = math.sin(math.radians(a)) * 43
        circle(layer, x, y, 5, (255, 217, 82), 230, True)
        line(layer, [pt(x * 0.55, y * 0.55), pt(x, y)], color, 1.4, 150)
    line(layer, [pt(-21, 0), pt(0, 17), pt(25, -13)], (255, 255, 255), 3.0, 215)


DRAWERS = {
    "prism_splitter": draw_prism,
    "rail_surge": draw_rail,
    "chrono_anchor": draw_chrono,
    "blink_drive": draw_blink,
    "nano_patch": draw_nano,
    "score_fever": draw_score,
    "gravity_well": draw_gravity,
    "drone_carousel": draw_drones,
    "plasma_lance": draw_lance,
    "stasis_net": draw_stasis,
    "aegis_burst": draw_aegis,
    "jackpot_lens": draw_jackpot,
    "ion_dash": draw_ion,
    "saw_matrix": draw_saw,
    "mirror_shots": draw_mirror,
    "mercy_protocol": draw_mercy,
    "target_paint": draw_target,
    "void_crown": draw_void,
    "swarm_contract": draw_swarm,
    "pulse_refund": draw_refund,
}


def make_icon(powerup_id: str, color: tuple[int, int, int]) -> Image.Image:
    icon = badge(color)
    DRAWERS[powerup_id](icon, color)

    mask = Image.new("L", (W, W), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse(box(0, 0, 88), fill=255)
    icon.putalpha(Image.composite(icon.getchannel("A"), mask, mask))
    return icon.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


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
    for powerup_id, color in POWERUPS:
        icon = make_icon(powerup_id, color)
        target = OUT_DIR / f"nova-powerup-{powerup_id}-20260613.png"
        icon.save(target, optimize=True)
        icons.append((powerup_id, icon))
    make_contact_sheet(icons).save(CONTACT_SHEET, optimize=True)
    print(f"wrote {len(icons)} icons and {CONTACT_SHEET}")


if __name__ == "__main__":
    main()
