from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/art/generated/nova-swarm/powerups"
SOURCE = OUT / "design-source-20260713-spectacle-expansion"
SIZE = 768

POWERUPS = [
    ("helix_array", (68, 235, 255), "helix"),
    ("reactor_redline", (255, 66, 88), "gauge"),
    ("static_bloom", (207, 100, 255), "bloom"),
    ("sanctuary_field", (90, 255, 207), "sanctuary"),
    ("comet_drill", (255, 157, 58), "drill"),
    ("lucky_reactor", (255, 228, 70), "reactor"),
    ("packet_storm", (114, 255, 142), "network"),
    ("graviton_crown", (169, 111, 255), "crown"),
    ("needle_rain", (150, 232, 255), "needles"),
    ("phase_dividend", (213, 244, 255), "phase"),
    ("hull_hymn", (125, 255, 214), "hymn"),
    ("scrap_vacuum", (146, 255, 188), "vacuum"),
    ("black_ice", (86, 139, 255), "ice"),
    ("boss_breaker", (255, 99, 73), "crosshair"),
    ("nova_bloom", (255, 88, 169), "nova"),
    ("second_wind", (108, 255, 184), "wind"),
    ("mirror_palace", (125, 207, 255), "mirrors"),
    ("chrono_jackpot", (255, 217, 88), "clock"),
    ("afterburner_choir", (255, 164, 66), "burners"),
    ("dead_sun_dividend", (255, 124, 65), "eclipse"),
]


def rgba(rgb, alpha=255):
    return (*rgb, alpha)


def polar(cx, cy, radius, angle):
    return (cx + math.cos(angle) * radius, cy + math.sin(angle) * radius)


def make_icon(color, symbol):
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    base = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    cx = cy = SIZE // 2

    draw.ellipse((68, 68, 700, 700), fill=(4, 10, 26, 238), outline=rgba(color, 95), width=9)
    draw.ellipse((105, 105, 663, 663), outline=rgba(color, 60), width=4)
    for radius, alpha in [(292, 45), (248, 34), (205, 28)]:
        draw.arc((cx-radius, cy-radius, cx+radius, cy+radius), 202, 334, fill=rgba(color, alpha), width=5)
        draw.arc((cx-radius, cy-radius, cx+radius, cy+radius), 22, 154, fill=rgba(color, alpha), width=5)

    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    white = (235, 252, 255)

    def line(points, width=22, fill=color, alpha=245):
        g.line(points, fill=rgba(fill, alpha), width=width, joint="curve")

    def ellipse(box, width=18, fill=color, alpha=245):
        g.ellipse(box, outline=rgba(fill, alpha), width=width)

    def polygon(points, fill=None, outline=color, width=18):
        if fill:
            g.polygon(points, fill=rgba(fill, 110))
        g.line([*points, points[0]], fill=rgba(outline, 245), width=width, joint="curve")

    if symbol == "helix":
        left, right = [], []
        for i in range(33):
            y = 190 + i * 12
            left.append((cx + math.sin(i * 0.52) * 118, y))
            right.append((cx - math.sin(i * 0.52) * 118, y))
            if i % 4 == 0:
                line([left[-1], right[-1]], 10, white, 170)
        line(left, 22); line(right, 22, (202, 104, 255))
    elif symbol == "gauge":
        ellipse((210, 210, 558, 558), 28)
        for angle in range(205, 341, 22):
            line([polar(cx, cy, 128, math.radians(angle)), polar(cx, cy, 170, math.radians(angle))], 13)
        line([(cx, cy), polar(cx, cy, 155, math.radians(322))], 28, white)
        polygon([(306, 506), (384, 410), (365, 509), (462, 385), (413, 540)], fill=color)
    elif symbol == "bloom":
        for angle in range(0, 360, 45):
            a = math.radians(angle)
            tip = polar(cx, cy, 195, a)
            elbow = polar(cx, cy, 96, a + 0.18)
            line([(cx, cy), elbow, tip], 18)
            ellipse((tip[0]-24, tip[1]-24, tip[0]+24, tip[1]+24), 12, white)
        ellipse((318, 318, 450, 450), 26, (255, 118, 215))
    elif symbol == "sanctuary":
        polygon([(384, 176), (565, 246), (530, 500), (384, 592), (238, 500), (203, 246)], fill=color, width=26)
        ellipse((284, 284, 484, 484), 22, white)
        line([(384, 315), (384, 454)], 20); line([(315, 384), (453, 384)], 20)
    elif symbol == "drill":
        polygon([(175, 420), (520, 228), (597, 385), (232, 518)], fill=color, width=24)
        for t in (0.28, 0.48, 0.68):
            x = 175 + (597-175)*t
            line([(x-30, 310 + 120*t), (x+30, 450 + 60*t)], 14, white, 175)
        line([(122, 492), (233, 455)], 25, (255, 87, 53))
    elif symbol == "reactor":
        for radius in (72, 132, 198): ellipse((cx-radius, cy-radius, cx+radius, cy+radius), 18)
        for angle in range(0, 360, 60): line([polar(cx, cy, 88, math.radians(angle)), polar(cx, cy, 218, math.radians(angle))], 15)
        g.ellipse((335, 335, 433, 433), fill=rgba(white, 235))
    elif symbol == "network":
        nodes = [polar(cx, cy, 190, math.radians(a)) for a in (15, 85, 155, 225, 295)]
        for node in nodes: line([(cx, cy), node], 13)
        for a, b in zip(nodes, nodes[1:] + nodes[:1]): line([a, b], 9, white, 130)
        for x, y in [(cx, cy), *nodes]: g.ellipse((x-30, y-30, x+30, y+30), fill=rgba(color, 240), outline=rgba(white, 230), width=9)
    elif symbol == "crown":
        polygon([(208, 474), (184, 270), (320, 376), (384, 196), (452, 376), (584, 270), (558, 474)], fill=color, width=25)
        ellipse((244, 244, 524, 524), 13, white, 150)
        g.ellipse((350, 438, 418, 506), fill=rgba(white, 230))
    elif symbol == "needles":
        for i, x in enumerate((240, 312, 384, 456, 528)):
            y = 170 + (i % 2) * 55
            line([(x, y), (x-35, y+330)], 16, white if i == 2 else color)
            polygon([(x-52, y+315), (x-35, y+382), (x-9, y+321)], fill=color, width=8)
    elif symbol == "phase":
        polygon([(384, 160), (560, 384), (384, 608), (208, 384)], fill=color, width=25)
        line([(384, 160), (384, 608)], 18, white)
        line([(338, 226), (304, 542)], 14, (99, 210, 255)); line([(430, 226), (466, 542)], 14, (225, 105, 255))
    elif symbol == "hymn":
        polygon([(384, 206), (526, 288), (492, 494), (384, 568), (276, 494), (242, 288)], fill=color, width=24)
        for radius in (190, 238): g.arc((cx-radius, cy-radius, cx+radius, cy+radius), 205, 335, fill=rgba(white, 190), width=15)
        line([(315, 385), (453, 385)], 18); line([(384, 316), (384, 454)], 18)
    elif symbol == "vacuum":
        polygon([(204, 216), (564, 216), (454, 430), (454, 566), (314, 566), (314, 430)], fill=color, width=22)
        for x in (234, 534): ellipse((x-35, 485, x+35, 555), 14, white)
        for y in (275, 335, 395): line([(250, y), (518, y)], 11, white, 150)
    elif symbol == "ice":
        line([(384, 165), (384, 603)], 24, white)
        for y, side in ((252, 1), (330, -1), (414, 1), (492, -1)):
            line([(384, y), (384 + side*132, y-78)], 20)
            line([(384, y), (384 - side*98, y+66)], 15, (119, 181, 255))
        ellipse((188, 188, 580, 580), 12, color, 150)
    elif symbol == "crosshair":
        for radius in (95, 182): ellipse((cx-radius, cy-radius, cx+radius, cy+radius), 18)
        for angle in (0, 90, 180, 270): line([polar(cx, cy, 120, math.radians(angle)), polar(cx, cy, 238, math.radians(angle))], 20)
        polygon([(384, 270), (474, 384), (384, 498), (294, 384)], fill=color, width=20)
    elif symbol == "nova":
        points = []
        for i in range(24): points.append(polar(cx, cy, 220 if i % 2 == 0 else 92, i * math.pi / 12))
        polygon(points, fill=color, width=14)
        ellipse((306, 306, 462, 462), 26, white)
    elif symbol == "wind":
        for offset, width in ((-92, 24), (0, 19), (92, 15)):
            g.arc((172, 220+offset, 582, 510+offset), 185, 355, fill=rgba(color, 245), width=width)
            g.arc((408, 316+offset, 566, 474+offset), 4, 285, fill=rgba(white, 190), width=12)
    elif symbol == "mirrors":
        for x, y, radius in ((384, 384, 150), (230, 330, 92), (538, 330, 92), (290, 510, 75), (478, 510, 75)):
            polygon([(x, y-radius), (x+radius*.65, y), (x, y+radius), (x-radius*.65, y)], fill=color, width=13)
        line([(384, 234), (384, 534)], 10, white, 140)
    elif symbol == "clock":
        ellipse((184, 184, 584, 584), 28)
        for angle in range(0, 360, 30): line([polar(cx, cy, 166, math.radians(angle)), polar(cx, cy, 190, math.radians(angle))], 10, white)
        line([(384, 384), (384, 258)], 24); line([(384, 384), (488, 432)], 24)
        g.ellipse((342, 342, 426, 426), fill=rgba(white, 230))
    elif symbol == "burners":
        for x in (270, 384, 498):
            polygon([(x-48, 250), (x+48, 250), (x+30, 416), (x-30, 416)], fill=color, width=16)
            polygon([(x-30, 420), (x+30, 420), (x, 598)], fill=(255, 99, 44), width=12)
        line([(230, 214), (538, 214)], 20, white)
    elif symbol == "eclipse":
        g.ellipse((178, 178, 590, 590), fill=rgba((255, 115, 52), 215))
        g.ellipse((250, 145, 620, 515), fill=(3, 7, 20, 255), outline=rgba(white, 110), width=9)
        for angle in range(0, 360, 45): line([polar(cx, cy, 226, math.radians(angle)), polar(cx, cy, 270, math.radians(angle))], 13)

    broad = glow.filter(ImageFilter.GaussianBlur(38))
    tight = glow.filter(ImageFilter.GaussianBlur(12))
    image = Image.alpha_composite(image, base)
    image = Image.alpha_composite(image, broad)
    image = Image.alpha_composite(image, tight)
    image = Image.alpha_composite(image, glow)
    return image


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    SOURCE.mkdir(parents=True, exist_ok=True)
    thumbs = []
    for slug, color, symbol in POWERUPS:
        source = make_icon(color, symbol)
        source.save(SOURCE / f"{slug}.png")
        icon = source.resize((192, 192), Image.Resampling.LANCZOS)
        icon.save(OUT / f"nova-powerup-{slug}-20260713.png", optimize=True)
        thumbs.append(icon)

    sheet = Image.new("RGB", (5 * 224, 4 * 224), (3, 7, 18))
    for index, icon in enumerate(thumbs):
        x = (index % 5) * 224 + 16
        y = (index // 5) * 224 + 16
        sheet.paste(icon, (x, y), icon)
    sheet.save(OUT / "nova-powerups-contact-sheet-20260713-spectacle-expansion.jpg", quality=94)


if __name__ == "__main__":
    main()
