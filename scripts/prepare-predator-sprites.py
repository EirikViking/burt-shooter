from PIL import Image
from pathlib import Path
import json,hashlib
source=Path('C:/Users/cromk/.codex/generated_images/01a07c7f-68cf-7f50-a0f4-45ce84e71f3a/exec-5bd6f683-c9a9-47ec-aaa5-2c58683faee1.png')
im=Image.open(source).convert('RGBA'); out=Path('public/art/predator-20260908');out.mkdir(parents=True,exist_ok=True)
rows=[0,288,576,865,1153,1536];records=[]
for i in range(10):
 r,c=divmod(i,2);tile=im.crop((c*512,rows[r],(c+1)*512,rows[r+1]));bbox=tile.getchannel('A').point(lambda a:255 if a>100 else 0).getbbox();assert bbox
 tile=tile.crop(bbox);tile.thumbnail((240,240),Image.Resampling.LANCZOS);canvas=Image.new('RGBA',(256,256));canvas.alpha_composite(tile,((256-tile.width)//2,(256-tile.height)//2));p=out/f'snake-{i+5}.png';canvas.save(p);records.append({'path':str(p),'crop':[c*512,rows[r],(c+1)*512,rows[r+1]],'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
preview=Image.new('RGBA',(1280,512),(4,13,23,255))
for i in range(10):preview.alpha_composite(Image.open(out/f'snake-{i+5}.png'),((i%5)*256,(i//5)*256))
preview.save('test-results/predator-snake-roster.png')
Path('docs/predator-art-20260908').mkdir(exist_ok=True);Path('docs/predator-art-20260908/receipt.json').write_text(json.dumps({'provider':'OpenAI imagegen','source':str(source),'process':'Extracted atlas cells, alpha-bounded crop, aspect-preserving resize and transparent padding. No repainting.','files':records},indent=2))
