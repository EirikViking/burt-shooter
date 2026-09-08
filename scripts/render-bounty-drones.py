# SPDX-License-Identifier: GPL-3.0-or-later
"""Fifteen original shootable bounty machines. Blender 4.5, no external meshes."""
import importlib.util,os,math
from mathutils import Vector
spec=importlib.util.spec_from_file_location('mesh',os.path.abspath('scripts/render-astra-v2.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
out=os.path.abspath('docs/fleet-identity-20260908/drones');os.makedirs(out,exist_ok=True)
m.s.render.resolution_x=m.s.render.resolution_y=768;m.s.cycles.samples=24
m.cam.location=(0,-3,12);m.cam.rotation_euler=(Vector((0,0,0))-m.cam.location).to_track_quat('-Z','Y').to_euler();m.cam.data.ortho_scale=4.8
colors=['ffb62d','ff663d','c598ff','f4d18a','ff4260','87d7ed','f08e38','dcdc55','80c879','e477b7','dd9859','afa9ec','da7348','d5c873','fcbfd0']
def plate(name,points,z,paint):return m.poly(name,points,z,.20,paint,.065)
for i,h in enumerate(colors):
 m.clear();rgb=tuple((int(h[j:j+2],16)/255)**2 for j in (0,2,4));paint=m.mat('Bounty enamel '+h,rgb,.58,.32,micro=True)
 optic=m.mat('Amber targeting optic',(1,.18,.025),.2,.24,2)
 # Shape vocabulary is mechanical and angular, distinct from collectible crystals.
 if i==0:
  for side in [-1,1]:plate('Forked vault wing',[(side*.16,-1),(side*1.3,-.5),(side*1.55,1.4),(side*.58,.65)],.15,paint)
 elif i==1:
  for side in [-1,1]:plate('Clamping jaw',[(side*.25,-.8),(side*1.4,-.7),(side*1.6,.9),(side*.55,1.3),(side*.85,.4)],.1,paint)
 elif i==2:
  for j in range(3):
   a=j*math.tau/3;p=[(.14,-.2),(.45,-.1),(.58,1.7),(-.12,1.25)]
   plate('Rotor blade',[(x*math.cos(a)-y*math.sin(a),x*math.sin(a)+y*math.cos(a)) for x,y in p],.15,paint)
 elif i==3:
  for side in [-1,1]:
   for j in range(2):m.box('Bullion cargo block',(side*.7,-.55+j*1.05,.25),(.85,.87,.55),paint,.10)
 elif i==4:
  for side in [-1,1]:plate('Scissor blade',[(side*.1,-1.35),(side*.42,-1.4),(side*1.55,1.35),(side*.65,.8)],.2,paint)
 elif i==5:
  plate('Delivery shuttle',[(-.6,-1.35),(.6,-1.35),(.8,.35),(0,1.55),(-.8,.35)],.1,paint)
  for side in [-1,1]:m.box('Parcel outrigger',(side*1.04,-.5,.2),(.4,1.5,.42),m.steel,.08)
 elif i==6:
  for side in [-1,1]:m.loft('Treasury pod',[(-1.4,.3,.2,.2),(-.8,.48,.3,.3),(.6,.48,.3,.3),(1.3,.2,.2,.2)],paint).location.x=side*.85
  m.box('Linkage',(0,0,.2),(1.5,.3,.25),m.silver,.03)
 elif i==7:
  plate('Customs crown',[(-1.5,-.9),(1.5,-.9),(1.4,1.25),(.6,.35),(0,1.5),(-.6,.35),(-1.4,1.25)],.1,paint)
 elif i==8:
  for j in range(5):
   y=-1.4+j*.64;m.box('Armored cash box',(0,y,.18),(.65,.50,.35),paint,.09)
   for side in [-1,1]:m.box('Stabilizing leg',(side*.65,y,.12),(.75,.13,.16),m.copper,.025)
 elif i==9:
  m.box('Signal receiver',(0,-.4,.15),(1.1,1.2,.4),paint,.1)
  for side in [-1,1]:
   m.box('Long signal boom',(side*.8,.55,.2),(.10,2.7,.10),m.silver,.02)
   for j in range(4):m.box('Antenna crossbar',(side*.8,.2+j*.4,.25),(.6-j*.08,.09,.09),paint,.018)
 elif i==10:
  for j in [-1,0,1]:plate('Trident prong',[(j*.8-.22,-1),(j*.8+.22,-1),(j*.8+.14,.8),(j*.8,1.6),(j*.8-.14,.8)],.1,paint)
 elif i==11:
  m.loft('Drill body',[(-1.3,.5,.2,.25),(-.2,.65,.2,.35),(.7,.40,.2,.2),(1.75,.015,.2,.01)],paint)
  for j in range(5):m.cyl('Drill collar',(0,.3+j*.23,.2),.47-j*.083,.12,m.silver,'Y',16)
 elif i==12:
  for side in [-1,1]:
   for j in range(3):plate('Crab claw',[(side*.3,-.8+j*.6),(side*1.5,-1+j*.6),(side*1.6,-.5+j*.6),(side*.75,-.4+j*.6)],.1,paint)
 elif i==13:
  for j in range(12):
   a=j*math.tau/12;pts=[(.85,-.2),(1.6,-.1),(1.25,.35)]
   plate('Recovery saw tooth',[(x*math.cos(a)-y*math.sin(a),x*math.sin(a)+y*math.cos(a)) for x,y in pts],.1,paint)
  m.cyl('Saw hub',(0,0,.22),.8,.27,m.steel,vertices=24)
 else:
  plate('Vault frame',[(-1,-1.1),(1,-1.1),(1.3,0),(.8,1.4),(-.8,1.4),(-1.3,0)],.1,paint)
  for side in [-1,1]:m.box('Vault clasp',(side*.75,0,.45),(.23,1.5,.17),m.silver,.04)
 # Readable machine centre, deep eye and broad black/gold hazard bars.
 m.box('Central armored vault',(0,-.08,.35),(.67,.85,.38),m.black,.1)
 m.box('Vault face',(0,-.09,.565),(.54,.62,.08),paint,.045)
 m.box('Recessed targeting visor',(0,.05,.62),(.42,.17,.04),m.black,.02)
 m.box('Hostile amber sensor',(0,.05,.649),(.30,.07,.018),optic,.008)
 for j in range(3):m.box('Vault caution bar',(-.14+j*.14,-.27,.616),(.065,.12,.014),m.silver,.008)
 for side in [-1,1]:
  m.cyl('Thruster casing',(side*.33,-.86,.14),.16,.38,m.steel,'Y',24)
  m.cyl('Exhaust aperture',(side*.33,-1.06,.14),.12,.025,optic,'Y',24)
 m.s.render.filepath=os.path.join(out,f'{i+1:02d}.png');m.bpy.ops.render.render(write_still=True)
 if i==0:m.bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'bounty-master.blend'))
 print('BOUNTY_DRONE_RENDERED',i+1,flush=True)
