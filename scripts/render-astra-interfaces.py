# SPDX-License-Identifier: GPL-3.0-or-later
# Original orbital hangar / archive interiors; efficient rendered menu plates.
import importlib.util,os,math,sys
from mathutils import Vector
spec=importlib.util.spec_from_file_location('astra_mesh',os.path.join(os.getcwd(),'scripts/render-astra-v2.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
bpy=m.bpy;s=m.s;s.render.resolution_x=2048;s.render.resolution_y=1152;s.cycles.samples=64;s.render.film_transparent=False
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['interface','3'];count=int(args[1]) if len(args)>1 else 3;start=int(args[2]) if len(args)>2 else 0
out=os.path.abspath('docs/astra-v2-models/renders/interface');os.makedirs(out,exist_ok=True)
for i in range(start,start+count):
 m.clear()
 for ob in list(bpy.data.objects):
  if ob.type=='LIGHT':bpy.data.objects.remove(ob,do_unlink=True)
 m.cam.data.type='PERSP';m.cam.data.lens=25
 m.cam.location=(0,-16,6.4);m.cam.rotation_euler=(Vector((0,10,3.8))-m.cam.location).to_track_quat('-Z','Y').to_euler()
 floor=m.mat('Hangar gunmetal',(.025,.044,.06),.65,.39, micro=True)
 trim=m.mat('Brushed silver structural rail',(.15,.21,.25),.78,.28)
 paint=m.mat('Archive wall enamel',(.037,.07,.095),.58,.35)
 glow=m.mat('Service illumination',[(.10,.65,.85),(.80,.44,.11),(.30,.54,.76)][i%3],.15,.25,2.1)
 m.box('Station foundation',(0,1,-.35),(31,35,.6),floor,.1)
 # Tessellated pressure deck with engraved joints and utility strips.
 for x in range(-7,8):
  for y in range(-5,9):
   m.box('Deck armor panel',(x*1.6,y*1.6,0),(1.57,1.57,.09),floor,.018)
   if (x+y)%5==0:
    for k in range(5):m.box('Vent slot',(x*1.6-.24+k*.12,y*1.6+.57,.054),(.045,.23,.012),m.black,0)
 for side in [-1,1]:
  for j in range(9):
   y=-7+j*2.6;x=side*(9.4+.18*(j%2))
   m.box('Load bearing station rib',(x,y,2.8),(1.0,.8,6.2),floor,.13)
   m.box('Machined rib cap',(x-side*.50,y,3.0),(.13,.7,5.4),trim,.035)
   m.box('Rib illumination',(x-side*.59,y,3.2),(.045,.10,3.1),glow,.01)
   m.tube('Wall power conduit',[(x-side*.2,y-.5,.4),(x-side*.2,y-.5,4.4),(x-side*.2,y+.3,5.2)],.085,m.copper)
   for k in range(5):m.box('Service rib crossmember',(x-side*.61,y,1.0+k*.74),(.15,.85,.095),m.steel,.022)
   m.box('Recessed maintenance bay',(x-side*.1,y+1.15,1.1),(.8,1.25,1.3),paint,.09)
   for k in range(4):m.box('Maintenance vent',(x-side*.52,y+.85+k*.18,1.2),(.028,.07,.68),m.black,.008)
  m.box('Deck guide rail',(side*7.8,2,.10),(.10,28,.04),trim,.008)
  for j in range(16):m.box('Dock guide lamp',(side*7.55,-9+j*1.6,.15),(.09,.58,.025),glow,.01)
  m.box('Ceiling girder',(side*7.6,2,6.7),(.7,32,.7),floor,.10)
 # Deep open portal; a quiet luminous atmosphere beyond the station.
 for j in range(5):
  y=11+j*1.7
  m.box('Portal lintel',(0,y,6.5-j*.16),(19,.35,.45),trim,.075)
  m.box('Portal pressure sill',(0,y,.24),(19,.25,.18),m.steel,.035)
  for side in [-1,1]:m.box('Portal chamfer',(side*9,y,3.1),(.32,.34,6.4),trim,.06)
 # Original planetary render supplies the detailed distant vista.
 distant=m.mat('Planet beyond orbital dock',(.015,.058,.11),.08,.7)
 n=distant.node_tree.nodes;l=distant.node_tree.links;bs=n.get('Principled BSDF')
 tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(os.path.abspath('docs/astra-v2-models/renders/world/01.png'),check_existing=True)
 l.new(tex.outputs['Color'],bs.inputs['Base Color']);l.new(tex.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=.7
 mesh=bpy.data.meshes.new('Orbital vista quad');mesh.from_pydata([(-29,32,-4),(29,32,-4),(29,32,28.625),(-29,32,28.625)],[],[(0,1,2,3)]);mesh.uv_layers.new()
 for k,uv in enumerate([(0,0),(1,0),(1,1),(0,1)]):mesh.uv_layers.active.data[k].uv=uv
 sky=bpy.data.objects.new('Orbital vista through hangar portal',mesh);bpy.context.collection.objects.link(sky);sky.data.materials.append(distant)
 m.box('Armored vaulted roof',(0,0,9.25),(26,30,.65),floor,.12)
 for j in range(9):
  y=-12+j*3.0
  m.box('Ceiling crossbeam',(0,y,8.75),(22,.38,.42),trim,.06)
  for side in [-1,1]:
   m.box('Ceiling recessed light',(side*5.8,y,8.49),(3.6,.14,.055),glow,.015)
   m.tube('Vault shoulder support',[(side*9.4,y,5.6),(side*8.8,y,7.4),(side*6.8,y,8.75)],.14,m.steel)
 # The display dais is geometry, not text. The live ship / codex art sits above.
 if i==0:
  bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=4.0,depth=.20,location=(0,1,.15));m.finish(bpy.context.object,m.black,.08)
  bpy.ops.mesh.primitive_torus_add(major_radius=3.8,minor_radius=.035,major_segments=128,minor_segments=8,location=(0,1,.28));m.finish(bpy.context.object,glow)
  for j in range(20):
   a=j*math.tau/20;o=m.box('Docking dais locator',(math.cos(a)*3.55,1+math.sin(a)*3.55,.27),(.10,.32,.03),m.copper,.008);o.rotation_euler.z=a
 else:
  for side in [-1,1]:
   for j in range(5):
    x=side*(3.5+j*.85);y=4+j*.6
    m.box('Archive data tower',(x,y,1.6),(.58,.58,3.3),paint,.06)
    for k in range(12):m.box('Archive drive status',(x,y-.304,.4+k*.21),(.36,.022,.04),glow,.005)
 m.area('Soft overhead vault',(0,-3,8.3),2400,(.42,.70,1),8)
 m.area('Portal daylight',(-5,13,10),4500,(.65,.84,1),7)
 m.area('Warm hangar service bounce',(9,-3,4),1700,(1,.46,.16),6)
 s.view_settings.exposure=.25
 bpy.ops.file.pack_all()
 s.render.filepath=os.path.join(out,'%02d.png'%(i+1));bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('docs/astra-v2-models/interface-%02d.blend'%(i+1)));bpy.ops.render.render(write_still=True);print('ASTRA_INTERFACE_RENDERED',i+1,flush=True)
