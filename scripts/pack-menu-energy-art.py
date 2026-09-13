"""Normalize original imagegen outputs only: alpha-preserving crop and Lanczos resize."""
from pathlib import Path
from PIL import Image
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/menu-energy-art/source'
OUT = ROOT / 'public/art/menu-energy'
SOURCE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
GENERATED = Path('C:/Users/cromk/.codex/generated_images/01a08651-8a75-7912-b016-bdc7cf3e9ea0')

def pack(name, filename, box, size):
    source = SOURCE / (name + '.png')
    if not source.exists():
        shutil.copy2(GENERATED / filename, source)
    im = Image.open(source).convert('RGBA').crop(box)
    im = im.resize(size, Image.Resampling.LANCZOS)
    im.save(OUT / (name + '.webp'), quality=94, method=6)

pack('wordmark', 'exec-3137b44d-0337-4aa8-852c-e19a81f27c3b.png', (32,76,1909,709), (1536,518))
pack('launch-control', 'exec-f6576ec0-02d4-449b-9b5d-67938ddc08e6.png', (16,94,2005,637), (1480,404))

# Fixed-cell extraction, alpha guard and padding are export normalization, not
# painted detail. The checkerboard draft was rejected and is never shipped.
atlas_source = SOURCE / 'energy-atlas.png'
if not atlas_source.exists():
    shutil.copy2(GENERATED / 'exec-f56ea17d-56ab-48aa-9e5f-44357a1462c2.png', atlas_source)
atlas = Image.open(atlas_source).convert('RGBA')
for i,name in enumerate(['membrane','rift','pressure','corona']):
    cell = atlas.crop(((i%2)*627,(i//2)*627,(i%2+1)*627,(i//2+1)*627))
    bounds = cell.getchannel('A').point(lambda x:255 if x>24 else 0).getbbox()
    bounds = (max(0,bounds[0]-10),max(0,bounds[1]-10),min(627,bounds[2]+10),min(627,bounds[3]+10))
    cell = cell.crop(bounds)
    # Fade only the outside four texels to prevent atlas-neighbor seams.
    alpha = cell.getchannel('A');pixels=alpha.load()
    for y in range(cell.height):
        for x in range(cell.width):
            guard=min(1,x/4,y/4,(cell.width-1-x)/4,(cell.height-1-y)/4)
            pixels[x,y]=round(pixels[x,y]*guard)
    cell.putalpha(alpha)
    cell = cell.resize((480,480),Image.Resampling.LANCZOS)
    out = Image.new('RGBA',(512,512));out.paste(cell,(16,16))
    out.save(OUT/(name+'.webp'),quality=94,method=6)
