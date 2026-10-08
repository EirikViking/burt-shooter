"""Render centered 2D delivery assets from the editable benchmark .blend."""
import bpy,os,json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
root=os.path.abspath('docs/ship-art-v2');out=root+'/export'
bpy.ops.wm.open_mainfile(filepath=root+'/nova-sparrow-v2.blend')
s=bpy.context.scene;cam=s.camera
bpy.ops.object.select_all(action='DESELECT')
for o in s.objects:
 if o.type in {'MESH','CURVE'}:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in s.objects if o.type=='MESH')
bpy.ops.object.convert(target='MESH');bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
bpy.ops.object.join()
deps=bpy.context.evaluated_depsgraph_get()
points=[o.matrix_world@Vector(v) for source in s.objects if source.type in {'MESH','CURVE'} for o in [source.evaluated_get(deps)] for v in o.bound_box]
low=Vector([min(p[k] for p in points) for k in range(3)]);high=Vector([max(p[k] for p in points) for k in range(3)]);center=(low+high)/2
s.view_layers[0].material_override=None;s.render.film_transparent=True
s.render.resolution_x=s.render.resolution_y=1024
cam.data.ortho_scale=3.3716378211975098*1.23;cam.location=center+Vector((0,-4.5,12));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
s.render.filepath=out+'/showroom.png';bpy.ops.render.render(write_still=True)
emitters=[]
for x in [-.79,.79]:
 uv=world_to_camera_view(s,cam,Vector((x,-1.53,.09)));emitters.append({'x':uv.x-.5,'y':.5-uv.y,'visible':True,'scale':1})
open(out+'/showroom.json','w').write(json.dumps({'emitters':emitters}))
s.render.resolution_x=s.render.resolution_y=512;cam.location=center+Vector((0,-.15,14));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
s.render.filepath=out+'/player.png';bpy.ops.render.render(write_still=True)
open(root+'/sprite-projection.json','w').write(json.dumps({'center':list(center),'low':list(low),'high':list(high),'orthographicScale':cam.data.ortho_scale,'pixels':512,'orientation':'+Y forward, +Z dorsal, camera offset (0,-.15,14)'},indent=2))
