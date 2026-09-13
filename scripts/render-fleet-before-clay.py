"""Offline neutral geometry comparison from immutable baseline GLB bytes."""
import bpy,math,os,json
from pathlib import Path
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene
s.world=bpy.data.worlds.new('World');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.25,.25,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.35
s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True
try:
 p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='OPTIX';p.get_devices()
 for d in p.devices:d.use=d.type!='CPU'
 s.cycles.device='GPU'
except Exception:pass
s.render.resolution_x=900;s.render.resolution_y=720;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
m=bpy.data.materials.new('Neutral clay');m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.32,.32,.32,1);p.inputs['Roughness'].default_value=.65;s.view_layers[0].material_override=m
for loc,power in [((-3,4,7),650),((4,-2,4),350)]:
 d=bpy.data.lights.new('Neutral area','AREA');d.energy=power;d.shape='DISK';d.size=5;o=bpy.data.objects.new('Neutral area',d);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(4.5,7,6));cam=bpy.context.object;cam.data.type='ORTHO';cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();s.camera=cam
for i in range(2,31):
 for o in list(s.objects):
  if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.import_scene.gltf(filepath=os.path.abspath(f'output/playwright/fleet-art-v2/baseline/{i:02d}.glb'))
 design=json.loads(Path(f'docs/fleet-art-v2/ships/{i:02d}/design.json').read_text())
 cam.data.ortho_scale=max(4.9,design['design'][1]*2.3)
 s.render.filepath=os.path.abspath(f'docs/fleet-art-v2/ships/{i:02d}/before-clay.png');bpy.ops.render.render(write_still=True)
 print('BEFORE_CLAY',i,flush=True)
