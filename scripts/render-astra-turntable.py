# SPDX-License-Identifier: GPL-3.0-or-later
# Original display models. Camera orbit produces genuine changing perspectives;
# the shipped runtime is still Pixi sprites and never runs a 3D engine.
import importlib.util, os, sys, math, json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
spec=importlib.util.spec_from_file_location('showroom',os.path.join(os.getcwd(),'scripts/render-astra-showroom.py'))
d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
m=d.m;bpy=m.bpy;s=m.s
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['turntable','1','0']
count=int(args[1]);start=int(args[2]) if len(args)>2 else 0
frames=int(args[3]) if len(args)>3 else 24
root=os.path.abspath('docs/astra-v3-models');os.makedirs(root,exist_ok=True)

def surface(mat,color,rough,metal):
 p=mat.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal

surface(m.armor,(.105,.145,.18),.32,.72)
surface(m.steel,(.055,.081,.105),.3,.86)
surface(m.silver,(.31,.37,.4),.24,.88)
surface(m.copper,(.34,.15,.065),.32,.8)
surface(m.glass,(.007,.035,.049),.12,.72)
for ob in bpy.data.objects:
 if ob.type=='LIGHT':
  if ob.name=='Cold key':ob.data.energy=550;ob.data.color=(.75,.87,1);ob.data.size=4
  elif ob.name=='Warm grazing rim':ob.data.energy=650;ob.data.color=(1,.73,.46);ob.data.size=3
  else:ob.data.energy=220;ob.data.color=(.36,.67,1);ob.data.size=4
m.area('Dock overhead strip',(1,1,7),280,(.88,.93,1),5)
m.area('Port inspection softbox',(-4,-2,2),180,(.29,.59,1),3)
s.world.node_tree.nodes['Background'].inputs[1].default_value=.22
s.view_settings.exposure=-.25
s.cycles.samples=32
s.render.use_persistent_data=True

skin=bpy.data.images.load(os.path.abspath('docs/astra-v3-models/source/hull-skin.png'))
skin.pack()
def skin_material(material,tint=(2.0,2.2,2.4)):
 n=material.node_tree.nodes;l=material.node_tree.links;p=n['Principled BSDF']
 geo=n.new('ShaderNodeNewGeometry');scale=n.new('ShaderNodeVectorMath');scale.operation='SCALE';scale.inputs[3].default_value=.72;l.new(geo.outputs['Position'],scale.inputs[0])
 image=n.new('ShaderNodeTexImage');image.image=skin;image.projection='BOX';image.projection_blend=.12;l.new(scale.outputs['Vector'],image.inputs['Vector'])
 mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*tint,1);l.new(image.outputs['Color'],mix.inputs[1]);l.new(mix.outputs[0],p.inputs['Base Color'])
 bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.23;bump.inputs['Distance'].default_value=.008;l.new(image.outputs['Color'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
 p.inputs['Roughness'].default_value=.37;p.inputs['Metallic'].default_value=.64
skin_material(m.armor);skin_material(m.steel,(1.5,1.65,1.8))

def painted_material(material):
 # Orthographic projection of original authored surface art onto actual geometry.
 # The reference's measured bounds are registered to the identical model render.
 n=material.node_tree.nodes;l=material.node_tree.links;p=n['Principled BSDF']
 old=p.inputs['Base Color'].links[0].from_socket if p.inputs['Base Color'].is_linked else None
 geo=n.new('ShaderNodeNewGeometry');sep=n.new('ShaderNodeSeparateXYZ');l.new(geo.outputs['Position'],sep.inputs[0])
 uv=n.new('ShaderNodeCombineXYZ')
 for axis,scale,offset in [('X',1536/5.4/962*928/1254,(163+(768-287)/962*928)/1254),('Y',1536/5.4/1051*1040/1254,1-(58+(768-187)/1051*1040)/1254)]:
  a=n.new('ShaderNodeMath');a.operation='MULTIPLY_ADD';a.inputs[1].default_value=scale;a.inputs[2].default_value=offset;l.new(sep.outputs[axis],a.inputs[0]);l.new(a.outputs[0],uv.inputs[axis])
 image=n.new('ShaderNodeTexImage');image.image=paint;image.extension='CLIP';l.new(uv.outputs[0],image.inputs['Vector'])
 normal=n.new('ShaderNodeSeparateXYZ');l.new(geo.outputs['Normal'],normal.inputs[0])
 mask=n.new('ShaderNodeMapRange');mask.inputs['From Min'].default_value=.30;mask.inputs['From Max'].default_value=.78;l.new(normal.outputs['Z'],mask.inputs['Value'])
 # The projection is used solely as a hull material, never as an alpha cutout.
 # The source background is excluded from material coverage by luminance.
 bright=n.new('ShaderNodeRGBToBW');l.new(image.outputs['Color'],bright.inputs[0]);valid=n.new('ShaderNodeMath');valid.operation='LESS_THAN';valid.inputs[1].default_value=.78;l.new(bright.outputs[0],valid.inputs[0]);weight=n.new('ShaderNodeMath');weight.operation='MULTIPLY';l.new(mask.outputs[0],weight.inputs[0]);l.new(valid.outputs[0],weight.inputs[1])
 mix=n.new('ShaderNodeMixRGB');l.new(weight.outputs[0],mix.inputs[0]);l.new(image.outputs['Color'],mix.inputs[2]);l.new(old,mix.inputs[1]) if old else None;l.new(mix.outputs[0],p.inputs['Base Color']);p.inputs['Metallic'].default_value=.42;p.inputs['Roughness'].default_value=.42

paint=None
if not os.environ.get('ASTRA_NO_PAINT'):
 paint=bpy.data.images.load(os.path.abspath('docs/astra-v3-models/source/player-paint-01.png'));paint.pack()
 painted_material(m.steel);painted_material(m.armor)

for i in range(start,start+count):
 d.build_showroom(i)
 for material in list(bpy.data.materials):
  if material.name.startswith("Fleet enamel") and not any(n.type=="TEX_IMAGE" for n in material.node_tree.nodes):
   color=material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value
   skin_material(material,tuple(.8+c*4 for c in color[:3]))
   if paint and i%6==0:painted_material(material)
 v=i%6;span=[1.7,1.4,1.75,1.2,1.8,1.55][v]
 enamel=m.mat('Flight enamel accents',[(.03,.19,.28),(.12,.18,.29),(.35,.052,.021),(.34,.23,.055),(.17,.062,.26),(.022,.25,.16)][v],.62,.28,micro=True)
 for side in [-1,1]:
  # Recessed modular flanks, white tactical identification and inset fasteners.
  m.poly('Tactical wing stripe',[(side*.45,.47),(side*(span-.30),-.13),(side*(span-.37),-.24),(side*.49,.34)],.378,.006,m.white,.002)
  m.poly('Ceramic forward shoulder',[(side*.26,.92),(side*.39,.60),(side*.40,.26),(side*.25,.47)],.41,.06,enamel,.018)
  m.box('Belly equipment tray',(side*.50,-.38,-.04),(.35,1.15,.18),m.black,.045)
  for j in range(5):
   m.box('Vented belly cooling foil',(side*.50,-.76+j*.16,-.13),(.38,.032,.085),m.steel,.008)
  # Small markings sit flush with armor; their scale implies a full-size hull.
  for j in range(5):
   m.box('Painted wing identification',(side*(.78+j*.045),-.56,.402),(.025,.065,.002),m.white,0)
  m.box('Warning stripe',(side*.47,-.80,.558),(.09,.025,.002),enamel,0)
 # Legible hull registry, modeled as geometry, is part of the original artwork.
 font=bpy.data.curves.new('Hull registry','FONT');font.body='NS / %02d'%(i+1);font.size=.10;font.extrude=0;font.align_x='CENTER'
 ob=bpy.data.objects.new('Hull registry',font);bpy.context.collection.objects.link(ob);ob.location=(0,.95,.34);ob.data.materials.append(m.white)
 for ob in bpy.data.objects:
  for modifier in ob.modifiers:
   if modifier.type=='BEVEL':modifier.width*=.55
 if i==6:
  # Quasar Fan: a broad tri-cannon starter with a distinct swept crescent plan.
  # This showroom variant is presentation only; gameplay registration is fixed.
  plum=m.mat('Quasar violet titanium',(.19,.025,.26),.68,.28,micro=True)
  skin_material(plum,(1.2,.42,1.7))
  violet=m.mat('Quasar contained plasma',(.62,.045,1),.18,.2,3.5)
  for side in [-1,1]:
   m.poly('Quasar crescent armor',[(side*.5,-.62),(side*1.96,-.42),(side*1.68,.58),(side*1.30,1.22),(side*1.18,.55),(side*.66,.04)],.43,.095,plum,.026)
   m.poly('Quasar ceramic leading edge',[(side*1.96,-.42),(side*1.68,.58),(side*1.30,1.22),(side*1.36,.83),(side*1.81,-.35)],.536,.014,m.white,.008)
   m.poly('Quasar inset wing shield',[(side*.76,-.33),(side*1.28,-.22),(side*1.12,.29),(side*.82,.10)],.542,.019,m.steel,.009)
   m.tube('Quasar engraved service seam',[(side*.87,-.30,.565),(side*1.14,-.16,.565),(side*1.04,.14,.565)],.007,m.copper)
   for j in range(6):
    m.box('Quasar inset radiator slot',(side*(1.49+j*.045),-.29,.544),(.022,.14,.009),m.black,.003)
    m.box('Quasar radiator lip',(side*(1.49+j*.045),-.21,.553),(.024,.012,.006),m.silver,.002)
   for j in range(3):m.cyl('Quasar wing captive fastener',(side*(.91+j*.18),-.46,.545),.019,.012,m.silver,vertices=12)
   m.box('Quasar wing cannon breech',(side*1.40,.38,.56),(.25,.66,.22),m.steel,.042)
   m.cyl('Quasar forward barrel',(side*1.40,.91,.56),.079,.48,m.black,'Y',24)
   m.cyl('Quasar focusing collar',(side*1.40,1.13,.56),.105,.085,m.silver,'Y',24)
   m.cyl('Quasar muzzle',(side*1.40,1.18,.56),.055,.012,violet,'Y',24)
   for j in range(5):m.box('Quasar heat extractor',(side*1.4,.15+j*.085,.69),(.23,.028,.045),m.silver,.006)
   m.tube('Quasar energised rail',[(side*.62,-.55,.55),(side*1.10,-.38,.55),(side*1.52,-.28,.55)],.012,violet)
  m.cyl('Quasar axial cannon',(0,1.24,.35),.105,.56,m.steel,'Y',32)
  m.cyl('Quasar axial muzzle',(0,1.53,.35),.062,.018,violet,'Y',24)
  bodies=[ob for ob in bpy.data.objects if ob.type in {'MESH','CURVE','FONT'}]
  root_ob=bpy.data.objects.new('Quasar wide tri-cannon airframe',None);bpy.context.collection.objects.link(root_ob)
  for ob in bodies:ob.parent=root_ob
  root_ob.scale=(1.10,.91,1)
 size=720 if frames<12 else (1024 if i==0 else 448)
 s.render.resolution_x=s.render.resolution_y=size
 m.cam.data.ortho_scale=5.4 if i<25 else 6.4
 out=os.path.join(root,'renders','paint-prototype' if frames<12 else 'turntable','%02d'%(i+1));os.makedirs(out,exist_ok=True)
 metadata={'size':size,'count':frames,'views':[]}
 for f in range(frames):
  a=math.atan2(-7,5)+math.tau*f/frames
  m.cam.location=(math.cos(a)*8.6,math.sin(a)*8.6,8.2)
  m.cam.rotation_euler=(Vector((0,0,.25))-m.cam.location).to_track_quat('-Z','Y').to_euler()
  bpy.context.view_layer.update()
  emitters=[]
  for side in [-1,1]:
   uv=world_to_camera_view(s,m.cam,Vector((side*(.64 if v!=3 else .49)*(1.10 if i==6 else 1),-1.60*(.91 if i==6 else 1),.29)))
   emitters.append({'x':uv.x,'y':1-uv.y,'visible':math.sin(a)<-.22})
  metadata['views'].append({'emitters':emitters})
  s.render.filepath=os.path.join(out,'%02d.png'%f)
  if i==start and f==0:bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'quasar-master.blend' if i==6 else 'paint-prototype.blend' if frames<12 else 'turntable-master.blend'))
  bpy.ops.render.render(write_still=True)
  print('ASTRA_TURNTABLE',i+1,f+1,flush=True)
 with open(os.path.join(out,'views.json'),'w')as fp:json.dump(metadata,fp)
