"""Normalize generated RGBA game sprites without repainting or altering their colors."""
from pathlib import Path
from PIL import Image
import json, shutil, hashlib
root=Path('docs/tractor-fleet');out=Path('public/art/tractor-fleet')
sources=root/'sprite-originals';sources.mkdir(exist_ok=True);out.mkdir(parents=True,exist_ok=True)
rows=json.loads((root/'sprite-generation.json').read_text(encoding='utf-8'))['rows']
receipt=[]
for row in rows:
 original=sources/(row['id']+'.png')
 if not original.exists():shutil.copy2(row['source'],original)
 im=Image.open(original).convert('RGBA')
 assert im.getchannel('A').getextrema()[0]==0, row['id']+' requires genuine transparent alpha'
 im.thumbnail((512,512),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',(512,512));canvas.paste(im,((512-im.width)//2,(512-im.height)//2))
 dest=out/(row['id']+'.png');canvas.save(dest,optimize=True)
 receipt.append({'id':row['id'],'source':str(original),'runtime':str(dest),'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
(root/'sprite-install.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
print('Installed',len(receipt),'RGBA sprites;',sum(r['bytes'] for r in receipt),'bytes')
