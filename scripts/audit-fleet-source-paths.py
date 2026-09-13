"""Read editable Blender sources and verify their texture dependencies stay local."""
import bpy,os,json
from pathlib import Path
rows=[]
for i in range(2,31):
 root=Path(f'docs/fleet-art-v2/ships/{i:02d}').resolve()
 bpy.ops.wm.open_mainfile(filepath=str(root/'source.blend'))
 paths=[]
 for image in bpy.data.images:
  if image.source!='FILE':continue
  path=Path(bpy.path.abspath(image.filepath)).resolve()
  assert path.parent==root/'export'/'textures',(i,image.name,str(path))
  assert path.is_file(),str(path)
  paths.append(str(path))
 assert len(paths)==4,(i,paths)
 rows.append({'id':i,'source':str(root/'source.blend'),'texturePaths':paths,'meshObjects':sum(o.type=='MESH' for o in bpy.context.scene.objects),'curveObjects':sum(o.type=='CURVE' for o in bpy.context.scene.objects)})
Path('docs/fleet-art-v2/source-path-audit.json').write_text(json.dumps({'status':'passed','rows':rows},indent=2))
print('PASS_ALL_EDITABLE_SOURCE_PATHS',len(rows),flush=True)
