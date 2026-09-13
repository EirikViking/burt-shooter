# SPDX-License-Identifier: GPL-3.0-or-later
# Original articulated maintenance tug for the animated main-menu drydock.
import importlib.util,os,math
from mathutils import Vector
spec=importlib.util.spec_from_file_location('mesh',os.path.join(os.getcwd(),'scripts/render-astra-v2.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
bpy=m.bpy;s=m.s;m.clear()
out=os.path.abspath('docs/astra-v5-models/renders/dock-tug');os.makedirs(out,exist_ok=True)
s.render.resolution_x=s.render.resolution_y=384;s.cycles.samples=32
paint=m.mat('Rescue ivory',(.56,.60,.54),.5,.33,micro=True)
m.box('Suspended cargo keel',(0,0,.13),(1.9,2.1,.34),m.black,.15)
m.box('Armored service capsule',(0,0,.40),(1.14,1.55,.60),paint,.22)
m.box('Deep avionics trench',(0,.1,.73),(.56,1.14,.035),m.black,.045)
for j in range(8):
 m.box('Avionics cooling fin',(0,-.34+j*.13,.79),(.46,.055,.08),m.steel,.01)
 m.box('Diagnostic lamp',(0,-.34+j*.13,.84),(.09,.026,.014),m.ice,.002)
for side in [-1,1]:
 x=side*.9
 m.cyl('Vented lift thruster',(x,-.15,.28),.33,1.48,m.steel,'Y',48)
 for j in range(5):m.cyl('Heat exchanger',(x,-.67+j*.24,.28),.345,.055,m.copper,'Y',32)
 m.cyl('Engine aperture',(x,-.92,.28),.28,.036,m.black,'Y',32)
 m.cyl('Engine plasma',(x,-.944,.28),.19,.015,m.ice,'Y',32)
 m.box('Removable nacelle armor',(x,-.03,.57),(.47,1.08,.18),paint,.07)
 for j in range(4):m.box('Warning stripe',(x,-.37+j*.21,.67),(.39,.045,.014),m.copper,.003)
 m.cyl('Manipulator shoulder',(side*.48,.65,.34),.19,.17,m.silver,vertices=32)
 m.box('Tool arm',(side*.62,1.06,.35),(.19,.72,.19),m.steel,.04)
 m.cyl('Hydraulic arm joint',(side*.7,1.39,.36),.13,.19,m.copper,vertices=32)
 m.box('Articulated grapple',(side*.57,1.58,.35),(.4,.19,.15),m.black,.04)
 m.box('Grapple jaw',(side*.4,1.77,.35),(.13,.36,.11),m.silver,.018)
 m.tube('Hydraulic line',[(side*.5,.38,.57),(side*.74,.85,.53),(side*.75,1.3,.50)],.032,m.black)
 for j in range(4):m.cyl('Service fastener',(side*.43,-.53+j*.33,.69),.035,.035,m.copper,vertices=12)
m.sphere('Sensor socket',(0,.87,.55),(.30,.30,.24),m.black)
m.sphere('Blue navigation optic',(0,1.045,.65),(.14,.11,.1),m.ice)
rig=bpy.data.objects.new('Tug turntable',None);bpy.context.collection.objects.link(rig)
for ob in list(bpy.data.objects):
 if ob.type in ['MESH','CURVE']:ob.parent=rig
m.cam.location=(4,-6,10);m.cam.rotation_euler=(Vector((0,.2,.2))-m.cam.location).to_track_quat('-Z','Y').to_euler();m.cam.data.ortho_scale=4.6
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('docs/astra-v5-models/dock-tug.blend'))
for f in range(32):
 rig.rotation_euler.z=math.tau*f/32;s.render.filepath=os.path.join(out,f'{f:02d}.png');bpy.ops.render.render(write_still=True)
 print('DOCK_TUG',f,flush=True)
