# SPDX-License-Identifier: GPL-3.0-or-later
"""Original Nova Swarm fleet, authored from the original 2D silhouette/livery references.
Blender --background --python scripts/render-fleet-identity.py -- player 1 0
Same mesh supplies gameplay, showroom and every turntable frame. No collision data.
"""
import importlib.util, os, sys, math, json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
spec=importlib.util.spec_from_file_location('mesh',os.path.abspath('scripts/render-astra-v2.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
bpy=m.bpy;s=m.s
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['player','1','0']
kind=args[0];count=int(args[1]);start=int(args[2]) if len(args)>2 else 0
root=os.path.abspath('docs/fleet-identity-20260908');os.makedirs(root,exist_ok=True)
s.render.engine='CYCLES';s.cycles.samples=12;s.view_settings.exposure=.25
s.render.use_persistent_data=True
if s.cycles.device=='GPU':s.cycles.denoiser='OPTIX'
# Large, deliberate livery areas, matched to texture index, not the pilot rank name.
palettes=[
 ('dce8eb','1762b0','ffc126'),('eee1bd','922a1e','ff4121'),('078bbc','f6b43a','23eaff'),('788b26','dae4ad','c8ff19'),('f47c12','333b44','ffb417'),
 ('dde9f0','17446a','28e8ff'),('b41614','e2dbbd','ff331a'),('756392','e4e5e9','b626ff'),('075f98','ffce2e','ffe126'),('582174','9a4ec3','df38ff'),
 ('cbdcdb','193d3d','6be8dd'),('d51713','392b27','ff3e16'),('e2e7e6','1c598c','148fff'),('dfd6ae','655044','ffad19'),('456821','a2b381','86ff1f'),
 ('ecf4ee','137ec0','138aff'),('334328','82c82b','adff21'),('e8e9ed','60518b','a451ff'),('102e3a','258cad','00dfff'),('ebe7c5','d59b1e','ffc31d'),
 ('dce9ed','d6a031','159aff'),('49255c','b453bc','e51cff'),('e9ce70','eae6b9','ffcc16'),('152c3c','31a5b9','03d5ff'),('322e29','bd211b','ff2713'),
 ('dddce9','966edf','87e9ff'),('572a21','d4a24d','29ceff'),('e4e8cc','ba923d','4ffff0'),('601c1b','cd4631','ff3021'),('183840','a28645','02c9ff')]
def rgb(h):return tuple((int(h[j:j+2],16)/255)**2.0 for j in (0,2,4))
def materials(i):
 a,b,c=palettes[i]
 return m.mat('Hull enamel '+a,rgb(a),.58,.31,micro=True),m.mat('Bold livery '+b,rgb(b),.68,.27,micro=True),m.mat('Signature plasma '+c,rgb(c),.28,.2,.8)
def engine(x,y,z,r,paint,light):
 m.cyl('Engine nacelle',(x,y+.28,z),r,.65,paint,'Y',32)
 m.cyl('Dark exhaust throat',(x,y-.06,z),r*.87,.06,m.black,'Y',32)
 m.cyl('Ceramic exhaust rim',(x,y-.1,z),r*.91,.06,m.silver,'Y',32)
 m.cyl('Recessed plasma lens',(x,y-.14,z),r*.69,.018,light,'Y',32)
 return (x,y-.155,z)
def player(i):
 m.clear();paint,trim,light=materials(i);anchors=[]
 if i<15:
  # Retain the proven high-detail machinery. New enamel is broad enough to read
  # in combat; original vents/fasteners supply material richness in the showroom.
  m.ship(i)
  for ob in list(bpy.data.objects):
   if ob.type not in ['MESH','CURVE']:continue
   for slot in ob.material_slots:
    mat=slot.material
    if mat==m.armor:slot.material=paint
    elif mat and mat.name.startswith('Fleet enamel'):slot.material=trim
    elif mat==m.glass:slot.material=light
   if i in [1,4,10,11,12,13,14]:ob.scale.x*=1.08
  span=[1.7,1.4,1.75,1.2,1.8,1.55][i%6]
  for side in [-1,1]:
   m.poly('Bold identity wing panel',[(side*.55,.18),(side*(span-.16),-.04),(side*(span-.24),-.44),(side*.61,-.26)],.43,.025,paint,.016)
   m.poly('Contrasting squadron slash',[(side*.56,.16),(side*(span-.18),-.06),(side*(span-.22),-.17),(side*.57,.04)],.465,.014,trim,.008)
   px=side*(.64 if i%6!=3 else .49)*(1.08 if i in [1,4,10,11,12,13,14] else 1)
   anchors.append((px,-1.6,.29))
   if i>=10:
    x=side*1.24
    m.box('Heavy cargo shoulder',(x,-.62,.48),(.49,1.2,.30),paint,.075)
    m.box('Heavy shoulder stripe',(x,-.62,.65),(.18,.98,.035),trim,.016)
    anchors.append(engine(x,-1.33,.23,.20,trim,m.ice))
  return anchors
 heavy=10<=i<15;organic=15<=i<28 or i==29;rail=i==28
 width=([.39,.32,.30,.38,.42,.32,.35,.33,.31,.30][i%10] if not heavy else .61)
 nose=2.05 if not rail else 2.35
 m.loft('Sculpted primary hull',[(-1.52,width*.7,.19,.16),(-.9,width*1.2,.27,.30),(0,width,.32,.34),(.85,width*.65,.23,.22),(nose,.02,.08,.025)],paint)
 m.loft('Contrasting dorsal racing spear',[(-1.0,width*.35,.56,.04),(0,width*.44,.64,.05),(.95,width*.30,.43,.04),(nose-.12,.015,.12,.012)],trim)
 if organic:
  m.cyl('Reactor socket',(0,-.08,.66),.35,.08,m.black,vertices=48)
  m.cyl('Reactor bezel',(0,-.08,.71),.29,.065,trim,vertices=48)
  m.sphere('Luminous heart',(0,-.08,.78),(.22,.25,.12),light)
 else:
  m.loft('Armored canopy cradle',[(-.55,.22,.59,.07),(.05,.24,.59,.19),(.7,.11,.42,.12)],m.black)
  m.loft('Signature cockpit',[(-.46,.165,.64,.06),(.07,.19,.66,.16),(.64,.07,.49,.08)],light)
 span=1.35+(i%5)*.11
 if heavy:span=1.43+(i%3)*.09
 if rail:span=.86
 for side in [-1,1]:
  # Broad replaceable armor, recessed intakes and exposed metal at assembly joins.
  for j in range(3):
   y=-.86+j*.47;x=side*(width+.04)
   m.box('Shoulder dark gasket',(x,y,.40),(.22,.39,.10),m.black,.035)
   m.box('Raised ceramic shoulder',(x,y-.025,.465),(.19,.30,.085),paint,.035)
   m.box('Shoulder edge inlay',(x,y+.07,.512),(.14,.06,.013),trim,.008)
  if organic:
   # Swept scythes with broad negative space; varied hook and split-tail profiles.
   reach=1.35+(i%4)*.21;tip=1.25+(i%3)*.3
   points=[(.32,.35),(.63,.75),(reach*.84,tip),(reach,tip+.2),(reach*.91,.22),(reach+.12,-.68),(reach*.88,-1.45),(.91,-.96),(.48,-1.3)]
   m.poly('Swept crescent armor',[(side*x,y) for x,y in points],.15,.19,paint,.055)
   m.poly('Broad blade inlay',[(side*x,y) for x,y in [(reach*.84,tip-.12),(reach*.90,.14),(reach+.03,-.63),(reach*.88,-1.17),(reach*.80,-.49),(reach*.72,.2)]],.35,.038,trim,.018)
   m.tube('Continuous blade light',[(side*reach*.88,tip-.1,.39),(side*reach*.84,.19,.4),(side*(reach+.045),-.67,.4)],.035,light)
   if i in [16,18,20,21,23,24,29]:
    m.poly('Crown prong',[(side*.19,.55),(side*.54,1.45),(side*.7,2.02),(side*.63,.65)],.24,.13,trim,.03)
   anchors.append(engine(side*.66,-1.35,.24,.2,trim,light))
   if i%2==0:anchors.append(engine(side*1.1,-1.05,.22,.13,paint,light))
  elif heavy:
   x=side*(.91+(i%3)*.06)
   m.loft('Broad armored side pod',[(-1.4,.30,.2,.20),(-.8,.35,.3,.34),(.42,.30,.3,.32),(1.0,.2,.24,.20),(1.4,.08,.15,.06)],trim).location.x=x
   m.box('Heavy pod enamel',(x,-.05,.60),(.40,1.30,.12),paint,.075)
   m.box('Pod identification stripe',(x,.0,.675),(.13,1.10,.025),trim,.02)
   anchors.append(engine(x,-1.48,.22,.27,paint,light))
   anchors.append(engine(side*.42,-1.6,.19,.19,trim,light))
  else:
   lead=[.18,.8,.05,.4,.66,-.2,.55,.38,.1,.7][i%10]
   points=[(.28,.85),(span,lead),(span*.92,-.72),(.63,-1.27),(.30,-.91)]
   m.poly('Cast wing',[(side*x,y) for x,y in points],.1,.18,trim,.05)
   points=[(.38,.67),(span-.13,lead-.04),(span*.84,-.53),(.67,-1.03),(.42,-.8)]
   m.poly('Main wing colour',[(side*x,y) for x,y in points],.28,.07,paint,.025)
   m.poly('Broad squadron slash',[(side*.48,.40),(side*(span-.19),lead-.2),(side*(span-.28),lead-.38),(side*.48,.16)],.36,.018,trim,.01)
   for j in range(2):
    x=side*(.78+j*.29);y=-.42-j*.10
    m.box('Wing intake recess',(x,y,.365),(.22,.36,.045),m.black,.025)
    for k in range(3):m.box('Large intake vane',(x,y-.11+k*.10,.40),(.18,.045,.045),m.silver,.009)
   m.poly('Tail armor panel',[(side*.36,-.77),(side*.63,-.96),(side*.94,-.64),(side*.85,-.48)],.37,.04,trim,.012)
   m.tube('Exposed wing power conduit',[(side*.44,-.93,.43),(side*.87,-.94,.43),(side*(span-.3),-.53,.42)],.038,m.copper)
   gx=side*(span-.12)
   m.box('Weapon housing',(gx,-.20,.28),(.17,.6,.18),trim,.035)
   m.cyl('Barrel',(gx,.36,.3),.045,.8,m.silver,'Y',20)
   anchors.append(engine(side*.59,-1.36,.22,.23,trim,light))
   m.box('Navigation beacon',(side*(span-.16),lead-.25,.37),(.08,.19,.035),light,.01)
  if rail:
   m.box('Long accelerator',(side*.4,.59,.39),(.14,3.2,.15),m.black,.025)
   m.box('Visible rail channel',(side*.4,.64,.485),(.055,3.02,.035),light,.006)
 if i==0:anchors.append(engine(0,-1.57,.17,.19,paint,light))
 if i==27:
  for side in [-1,1]:m.tube('Aegis shield crescent',[(side*(1.57+.28*math.sin(k*math.pi/24)),1.65-k*.135,.2) for k in range(25)],.06,light)
 if i==25:
  m.poly('Seraph radiant spear',[(-.11,-1.2),(.11,-1.2),(.13,.9),(0,2.03),(-.13,.9)],.72,.035,light,.015)
 if i==26:
  for side in [-1,1]:
   x=side*1.24;y=-.42
   m.cyl('Eirik shield backing',(x,y,.44),.56,.14,m.black,vertices=48)
   m.cyl('Eirik bronze shield rim',(x,y,.53),.53,.075,trim,vertices=48)
   m.cyl('Eirik red shield face',(x,y,.58),.46,.04,paint,vertices=48)
   m.cyl('Eirik shield boss',(x,y,.63),.16,.10,trim,vertices=32)
   for j in range(8):
    a=j*math.tau/8
    m.tube('Shield compass engraving',[(x+math.cos(a)*.20,y+math.sin(a)*.20,.635),(x+math.cos(a)*.38,y+math.sin(a)*.38,.635)],.023,light)
   m.tube('Viking prow horn',[(side*.22,1.04,.46),(side*.57,1.44,.6),(side*.51,1.99,.67)],.085,trim)
 if i==29:
  for side in [-1,1]:
   for j in range(3):m.box('Sovereign launch bay',(side*(.7+j*.31),-.56+j*.14,.44),(.22,.53,.15),trim,.035)
 return anchors
def render(path):
 s.render.filepath=path;bpy.ops.render.render(write_still=True)
for i in range(start,start+count):
 anchors=player(i);out=os.path.join(root,'renders',f'{i+1:02d}');os.makedirs(out,exist_ok=True)
 s.render.resolution_x=s.render.resolution_y=1024;m.cam.data.ortho_scale=5.5
 m.cam.location=(0,0,12);m.cam.rotation_euler=(Vector((0,0,0))-m.cam.location).to_track_quat('-Z','Y').to_euler()
 render(os.path.join(out,'player.png'))
 views=[];frames=48
 for f in range(frames):
  a=math.atan2(-7,5)+math.tau*f/frames;m.cam.location=(math.cos(a)*8.6,math.sin(a)*8.6,8.2)
  m.cam.rotation_euler=(Vector((0,0,.25))-m.cam.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update()
  emit=[]
  for p in anchors:
   uv=world_to_camera_view(s,m.cam,Vector(p));emit.append({'x':uv.x,'y':1-uv.y,'visible':m.cam.location.y<0})
  views.append({'emitters':emit});render(os.path.join(out,f'{f:02d}.png'))
 with open(os.path.join(out,'views.json'),'w') as file:json.dump({'size':1024,'count':frames,'views':views},file)
 if i==start:bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'fleet-master.blend'))
 print('FLEET_IDENTITY_COMPLETE',i+1,flush=True)
