# SPDX-License-Identifier: GPL-3.0-or-later
# Original Nova Swarm hull construction. No imported geometry or textures.
# Blender --background --python scripts/render-astra-fleet-v5.py -- fleet COUNT START
import importlib.util, os, sys, math, json
from mathutils import Vector
spec=importlib.util.spec_from_file_location('machinery',os.path.join(os.getcwd(),'scripts/render-astra-v2.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
bpy=m.bpy;s=m.s
args=sys.argv[sys.argv.index('--')+1:]
family=args[0];count=int(args[1]);start=int(args[2]) if len(args)>2 else 0
out=os.path.abspath('docs/astra-v5-models/renders/'+family);os.makedirs(out,exist_ok=True)
s.render.resolution_x=s.render.resolution_y=512;s.cycles.samples=24;s.render.use_persistent_data=True
s.view_settings.exposure=-.3
# Twelve distinct structural plans, with separate nacelle, armor and weapon fits.
plans=[
 [(0.25,-.65),(.6,-.95),(1.65,-.6),(1.82,.1),(.95,.42),(.3,.18)],
 [(.28,-.7),(.75,-1.2),(1.45,-.8),(1.15,1.15),(.9,1.65),(.75,.1)],
 [(.2,-.3),(.45,-1.35),(1.3,-1.5),(1.6,-.75),(1.4,.85),(.75,.5)],
 [(.25,-.65),(1.6,-.45),(1.9,.12),(1.15,.4),(.68,1.3),(.35,.75)],
 [(.28,-.5),(.8,-1.25),(1.0,-1.0),(1.1,1.25),(.7,1.55),(.45,.1)],
 [(.3,-.3),(.6,-1.1),(1.5,-1.25),(1.7,-.5),(1.1,-.15),(.55,.7)],
 [(.35,-.8),(1.5,-1.0),(1.75,-.1),(1.25,.15),(.9,1.45),(.55,1.05)],
 [(.25,-.7),(.7,-.9),(1.2,-.15),(1.7,.35),(1.85,1.2),(1.0,.8)],
 [(.3,-1.0),(1.4,-.9),(1.55,-.2),(1.45,.75),(.8,1.0),(.35,.4)],
 [(.25,-.3),(.9,-.8),(1.7,-.2),(1.65,.55),(1.25,.9),(.55,.6)],
 [(.3,-.8),(.95,-1.4),(1.25,-1.25),(1.5,1.3),(1.1,1.65),(.8,.1)],
 [(.25,-1.1),(1.25,-1.15),(1.9,.4),(1.75,.85),(.9,.25),(.3,.8)]
]
palettes=[(.12,.30,.36),(.45,.20,.07),(.27,.13,.36),(.07,.31,.22),(.43,.12,.15),(.26,.34,.44),(.43,.35,.16),(.13,.21,.43)]

def build(i,drone=False):
 m.clear();v=i%12;fit=i//12;span=.86+(fit%5)*.07
 paint=m.mat('Hull enamel',palettes[(i*5+fit)%8],.58,.3,micro=True)
 energy=m.mat('Contained emitter',[(.2,.83,1),(1,.35,.1),(.65,.3,1),(.25,1,.66)][i%4],.2,.24,2)
 # Spherical survey hulls, split catamarans, needle interceptors and broad ships.
 if v in [2,8,9]:
  m.sphere('Forged pressure dome',(0,-.12,.28),(.66,1.02,.40),paint)
  for j in range(5):m.box('Dome armored rib',(0,-.74+j*.3,.57),(.8,.055,.08),m.silver,.01)
 elif v in [4,10]:
  for side in [-1,1]:m.loft('Twin pressure hull',[(y,w,z,h) for y,w,z,h in [(-1.3,.18,.2,.13),(-.4,.25,.28,.23),(.6,.20,.2,.15),(1.55,.035,.13,.05)]],paint).location.x=side*.46
  m.box('Catamaran transverse drive',(0,-.45,.29),(1.15,.36,.2),m.steel,.055)
 else:
  m.loft('Central armored keel',[(-1.4,.26,.18,.16),(-.65,.44,.26,.28),(.1,.44,.25,.31),(.8,.25,.18,.18),(1.52+(fit%3)*.1,.055,.10,.04)],m.steel)
  for j in range(5):
   y=-.95+j*.4;w=.35 if j<3 else .28-(j-3)*.1
   m.poly('Overlapping ceramic plate',[(-w,y-.16),(w,y-.16),(w*.83,y+.14),(-w*.83,y+.14)],.52-j*.022,.07,paint,.02)
 m.loft('Optical command blister',[(-.48,.18,.59,.07),(-.1,.24,.65,.17),(.46,.11,.5,.10)],m.black)
 m.loft('Recessed faceted sensor',[(-.41,.115,.66,.045),(-.08,.17,.71,.09),(.39,.06,.57,.035)],energy)
 for side in [-1,1]:
  points=[(side*x*span,y*(.9+(fit%3)*.1)) for x,y in plans[v]]
  m.poly('Structural wing',points,.09,.15,m.black,.025)
  m.poly('Beveled armor shell',[(x*.96,y*.95) for x,y in points],.25,.085,paint,.026)
  cx=sum(x for x,y in points)/len(points);cy=sum(y for x,y in points)/len(points)
  inner=[(cx+(x-cx)*.76,cy+(y-cy)*.74) for x,y in points]
  m.poly('Recessed equipment island',inner,.339,.032,m.black,.02)
  m.poly('Raised floating armor',[(cx+(x-cx)*.91,cy+(y-cy)*.86) for x,y in inner],.376,.11,paint,.032)
  for j,(x,y) in enumerate(inner):
   m.cyl('Armor lock',(x,y,.40),.035,.025,m.silver,vertices=12)
  # Nested leading rails catch grazing light; alternating cutouts expose machinery.
  m.tube('Machined leading rail',[(x,y,.34) for x,y in points[2:5]],.024,m.silver)
  for j in range(5):
   y=cy-.25+j*.115
   m.box('Vented armor slot',(cx,y,.49),(.26,.047,.027),m.black,.005)
   m.box('Heat fin',(cx-side*.035,y,.513),(.12,.027,.011),m.copper,.003)
  # Alternate swept reinforcement rails and prominent shoulder radiators.
  for j in range(4+fit%4):
   x=side*(.68+j*.115)*span;y=-.58+j*.045
   m.box('Radiator recess',(x,y,.35),(.082,.29,.032),m.black,.006)
   m.box('Copper heat exchanger',(x,y-.04,.382),(.038,.18,.024),m.copper,.004)
  engines=1+(fit%3==1)
  for k in range(engines):
   x=side*(.78+k*.36)*span;y=-.78-(fit%2)*.16
   m.cyl('Drive shroud',(x,y,.31),.18,.65,m.steel,'Y',24)
   m.cyl('Drive exit',(x,y-.34,.31),.155,.025,m.black,'Y',24)
   m.cyl('Drive plasma',(x,y-.357,.31),.095,.01,energy,'Y',20)
   for j in range(3):m.cyl('Drive collar',(x,y-.23+j*.16,.31),.19,.027,m.copper,'Y',24)
  if fit%4 in [0,2]:
   x=side*(.75+v%3*.14)*span
   m.box('Weapon breech',(x,.32,.40),(.29,.43,.23),m.steel,.03)
   for j in range(1+fit%2):
    xx=x+(j-.5*(fit%2))*.105
    m.cyl('Accelerator',(xx,.76,.43),.06,.66,m.silver,'Y',20)
    m.cyl('Muzzle aperture',(xx,1.10,.43),.067,.028,m.black,'Y',20)
    m.cyl('Muzzle charge',(xx,1.117,.43),.032,.006,energy,'Y',16)
  else:
   for j in range(2+fit%3):
    x=side*(.64+j*.19)*span
    m.box('Missile cassette',(x,.25,.43),(.145,.52,.16),m.steel,.02)
    m.box('Missile cap',(x,.50,.48),(.10,.06,.1),m.copper,.008)
  m.tube('Power conduit',[(side*.36,-.65,.44),(side*.61,-.54,.42),(side*.84,.22,.38)],.022,m.copper)
  for j in range(4):m.box('Squadron identification slash',(side*(1.02+j*.075)*span,-.09+j*.025,.35),(.036,.23,.009),m.white,.003)
  for j in range(8):m.cyl('Captive fastener',(side*(.52+j*.11)*span,-.73+j*.037,.352),.017,.016,m.silver,vertices=10)
 if fit%3==2:
  m.cyl('Reactor housing',(0,-.79,.61),.22,.09,m.black,vertices=32)
  m.cyl('Reactor lens',(0,-.79,.66),.13,.027,energy,vertices=32)
 # All final registrations are packed to the exact previous alpha envelope.
 m.cam.location=(0,-3,14);m.cam.rotation_euler=(Vector((0,0,.2))-m.cam.location).to_track_quat('-Z','Y').to_euler();m.cam.data.ortho_scale=4.9

for i in range(start,start+count):
 build(i,family=='drone')
 if i==start:bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('docs/astra-v5-models/'+family+'-master.blend'))
 s.render.filepath=os.path.join(out,f'{i+1:03d}.png');bpy.ops.render.render(write_still=True)
 print('ASTRA_FLEET_V5',i+1,flush=True)
