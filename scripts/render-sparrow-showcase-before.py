"""Same neutral scene and camera; legacy geometry remains byte-for-byte intact."""
import bpy
from pathlib import Path
root=Path.cwd()
bpy.ops.wm.open_mainfile(filepath=str(root/'docs/sparrow-showcase/nova-sparrow-showcase.blend'))
s=bpy.context.scene
for o in list(s.objects):
 if o.type in {'MESH','CURVE','FONT'}:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(root/'public/art/solid-fleet-20260908/01.glb'))
c=s.camera;c.location=(4.5,7,6);c.rotation_euler=(-c.location).to_track_quat('-Z','Y').to_euler();c.data.ortho_scale=4.8
m=bpy.data.materials.new('Neutral inspection clay');m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(.38,.38,.38,1);p.inputs['Metallic'].default_value=0;p.inputs['Roughness'].default_value=.75
s.view_layers[0].material_override=m
s.render.filepath=str(root/'docs/sparrow-showcase/renders/before-clay.png')
bpy.ops.render.render(write_still=True)
