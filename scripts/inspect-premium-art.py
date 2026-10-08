"""Read generated alpha and cell bounds; retain provider pixels unchanged."""
from pathlib import Path
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[1]/'public/art/encounter-premium'
sets={'dreadnought.png':(1,1,['dreadnought']),
 'machinery.png':(4,3,['battery','relay','reactorClosed','reactorOpen','moltPlate','moltHead','moltSpine','moltTail','weaverClaw','weaverGun','fighterA','fighterB']),
 'combat-detail.png':(4,2,['wreckA','wreckB','moltArmour','moltExposedHead','captureCradle','muzzle','rupture','ionPlume']),
 'orbit-breaker.png':(1,1,['orbitBreaker'])}
receipt={'sheets':{},'frames':{}}
for name,(cols,rows,ids) in sets.items():
 im=Image.open(root/name)
 assert im.mode=='RGBA',f'{name}: real alpha required'
 alpha=im.getchannel('A');assert alpha.getextrema()[0]==0 and alpha.getextrema()[1]==255
 receipt['sheets'][name]={'width':im.width,'height':im.height,'sha256':hashlib.sha256((root/name).read_bytes()).hexdigest(),'alpha':True}
 for i,key in enumerate(ids):
  x0=(i%cols)*im.width//cols;y0=(i//cols)*im.height//rows
  x1=(i%cols+1)*im.width//cols;y1=(i//cols+1)*im.height//rows
  bbox=alpha.crop((x0,y0,x1,y1)).point(lambda p:255 if p>12 else 0).getbbox()
  assert bbox,f'{key}: empty cell'
  x,y,r,b=bbox;receipt['frames'][key]={'sheet':name,'x':x0+x,'y':y0+y,'w':r-x,'h':b-y}
(root/'frames.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'passed','sheets':receipt['sheets'],'frames':len(receipt['frames'])}))
