# SPDX-License-Identifier: GPL-3.0-or-later
# Original high-resolution display variants of the actual playable hulls.
import importlib.util,os,sys,math,json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
spec=importlib.util.spec_from_file_location('astra_mesh',os.path.join(os.getcwd(),'scripts/render-astra-v2.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
bpy=m.bpy;s=m.s
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['showroom','1']
kind=args[0];count=int(args[1]);start=int(args[2]) if len(args)>2 else 0
out=os.path.abspath('docs/astra-v2-models/renders/'+kind);os.makedirs(out,exist_ok=True)
for i in range(start,start+count):
 m.ship(i)
 v=i%6;span=[1.7,1.4,1.75,1.2,1.8,1.55][v]
 ceramic=m.mat('Layered charcoal ceramic',(.042,.067,.087),.68,.31,micro=True)
 plasma=m.mat('Contained electric arc',(.15,.65,1),.2,.2,5)
 # Deep detachable shoulder assemblies, interlocking armor and exposed
 # compression cylinders. This is showroom detail, never a collision change.
 for side in [-1,1]:
  for j in range(5):
   y=-.96+j*.28;x=side*(.36+.10*math.sin(j*.6));z=.46
   m.poly('Interlocking shoulder armor',[(x-side*.09,y-.1),(x+side*.14,y-.13),(x+side*.17,y+.09),(x-side*.06,y+.12)],z,.075,ceramic,.018)
   m.box('Shoulder machined lip',(x+side*.14,y,.548),(.02,.13,.025),m.silver,.003)
   m.cyl('Recessed quarter-turn latch',(x,y-.055,.551),.026,.012,m.black,vertices=16)
   m.box('Latch crosshead',(x,y-.055,.56),(.028,.008,.005),m.copper,0)
  for j in range(3):
   x=side*(.83+j*.20);y=-.92+j*.04
   m.cyl('Exposed compression cylinder',(x,y,.40),.058,.25,m.black,'Y',24)
   m.cyl('Hydraulic piston',(x,y+.15,.40),.027,.12,m.silver,'Y',16)
   m.tube('Braided hydraulic return',[(x,y-.1,.43),(x+side*.06,y-.05,.47),(x+side*.08,y+.08,.43)],.011,m.copper)
  # Recessed avionics lanes and distinct illuminated deck traces.
  for j in range(7):
   x=side*(.58+j*.11);y=-.24-j*.02
   m.box('Avionics connector',(x,y,.367),(.070,.045,.022),m.black,.004)
   for k in range(3):m.box('Connector contact',(x-.018+k*.018,y,.382),(.005,.024,.006),m.copper,0)
  m.tube('Recessed superconducting trace',[(side*.48,-.83,.37),(side*.93,-.99,.37),(side*(span-.29),-.63,.36)],.010,m.ice)
  px=side*(.64 if v!=3 else .49)
  for j in range(16):
   a=j*math.tau/16
   x=px+math.cos(a)*.198;z=.29+math.sin(a)*.198
   m.tube('Vectoring exhaust iris',[(x,-1.596,z),(px+math.cos(a+.13)*.172,-1.609,.29+math.sin(a+.13)*.172)],.011,m.silver)
  m.tube('Engine ignition filament',[(px-.13,-1.616,.34),(px-.067,-1.622,.29),(px-.02,-1.618,.34),(px+.033,-1.62,.28),(px+.115,-1.617,.32)],.006,plasma)
  for j in range(3):
   y=.75+j*.2
   m.box('Nose inspection gasket',(side*.085,y,.37-j*.066),(.08,.12,.018),m.black,.009)
   m.box('Nose inspection plate',(side*.085,y,.382-j*.066),(.052,.095,.015),m.steel,.008)
  m.tube('Canopy gold seal',[(side*.13,-.42,.79),(side*.17,-.15,.84),(side*.13,.24,.79)],.008,m.copper)
 m.cyl('Reactor service cage',(0,-1.18,.69),.12,.025,m.black,vertices=32)
 for j in range(12):
  a=j*math.tau/12
  m.box('Reactor cage tooth',(math.cos(a)*.108,-1.18+math.sin(a)*.108,.721),(.018,.028,.021),m.silver,.003)
 m.cyl('Visible reactor plasma',(0,-1.18,.723),.067,.01,plasma,vertices=32)
 m.cam.location=(5,-7,9);m.cam.rotation_euler=(Vector((0,0,.25))-m.cam.location).to_track_quat('-Z','Y').to_euler();m.cam.data.ortho_scale=5.5 if i<25 else 6.3
 s.render.resolution_x=s.render.resolution_y=1536 if kind=='hero' else 1024;s.cycles.samples=112 if kind=='hero' else 72
 s.view_settings.exposure=-.15
 bpy.context.view_layer.update()
 emitters=[]
 for side in [-1,1]:
  uv=world_to_camera_view(s,m.cam,Vector((side*(.64 if v!=3 else .49),-1.60,.29)))
  emitters.append({'x':uv.x,'y':1-uv.y})
 with open(os.path.join(out,'%02d.json'%(i+1)),'w')as f:json.dump({'emitters':emitters},f)
 s.render.filepath=os.path.join(out,'%02d.png'%(i+1))
 if i==start:bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('docs/astra-v2-models/'+kind+'-master.blend'))
 bpy.ops.render.render(write_still=True);print('ASTRA_SHOWROOM_RENDERED',kind,i+1,flush=True)
