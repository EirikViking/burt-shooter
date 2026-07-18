from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/art/generated/nova-swarm/augments/imagegen-source-20260711/tactical-augment-atlas-alpha.png"
OUTPUT = ROOT / "public/art/generated/nova-swarm/augments"
NAMES = [
    "phase_reactor",
    "focus_lens",
    "inertial_dampers",
    "phase_wake",
    "slipstream_coils",
    "emergency_bulkhead",
    "impact_foam",
    "graze_plating",
    "last_light",
    "combo_anchor",
    "salvage_clock",
    "power_saver",
    "drone_link",
]


def content_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    return bounds or (0, 0, image.width, image.height)


def normalize_cell(cell: Image.Image) -> Image.Image:
    bounds = content_bounds(cell)
    subject = cell.crop(bounds)
    max_edge = 164
    subject.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (192, 192), (0, 0, 0, 0))
    output.alpha_composite(subject, ((192 - subject.width) // 2, (192 - subject.height) // 2))
    return output


def main() -> None:
    atlas = Image.open(SOURCE).convert("RGBA")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for index, name in enumerate(NAMES):
        column = index % 4
        row = index // 4
        left = round(column * atlas.width / 4)
        top = round(row * atlas.height / 4)
        right = round((column + 1) * atlas.width / 4)
        bottom = round((row + 1) * atlas.height / 4)
        cell = atlas.crop((left, top, right, bottom))
        target = OUTPUT / f"nova-augment-{name}-20260711.png"
        normalize_cell(cell).save(target, optimize=True)
        print(f"wrote {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
