# Original Nova Swarm assets. Blender source; no third-party meshes or textures.
# Run from repository root with Blender --background --python this-file.
import importlib.util, os, math, sys
spec=importlib.util.spec_from_file_location('machinery',os.path.abspath('scripts/render-astra-v2.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
bpy=m.bpy
from mathutils import Vector
root=os.path.abspath('docs/core-serpent-models-20260907');os.makedirs(root,exist_ok=True)
out=os.path.abspath('public/art/core-serpent');os.makedirs(out,exist_ok=True)
s=m.s;s.render.resolution_x=512;s.render.resolution_y=512;s.cycles.samples=48
m.cam.location=(0,-2,14);m.cam.rotation_euler=(Vector((0,0,.2))-m.cam.location).to_track_quat('-Z','Y').to_euler();m.cam.data.ortho_scale=5.8
colors=[(.12,.85,1),(1,.22,.06),(.32,1,.4),(.85,.2,1),(1,.8,.15),(.12,.5,1),(1,.3,.55),(.7,1,1),(.8,.55,1),(1,.95,.45)]
def ring(r,z,mat,minor=.075,tilt=0):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=minor,major_segments=64,minor_segments=10,location=(0,0,z));o=bpy.context.object;o.rotation_euler.x=tilt;m.finish(o,mat);return o
def gem(pos,scale,mat):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=pos);o=bpy.context.object;o.scale=scale;m.finish(o,mat);return o
def save(name):
 s.render.filepath=os.path.join(out,name+'.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,name+'.blend'));bpy.ops.render.render(write_still=True);print('ASSET',name,flush=True)
def clean():
 for ob in list(bpy.data.objects):
  if ob.type in ['MESH','CURVE','FONT']:bpy.data.objects.remove(ob,do_unlink=True)
for i,c in enumerate(colors):
 clean();glow=m.mat('Core plasma '+str(i),c,.3,.22,2.5);enamel=m.mat('Colored ceramic '+str(i),tuple(v*.33 for v in c),.7,.24)
 # Ten different containment mechanisms, all with exposed luminous treasure.
 if i==0: # Shield: armored kite around a sapphire heart.
  m.box('Shield rim',(0,0,0),(2.1,2.6,.34),m.silver,.3);m.box('Shield armor',(0,0,.21),(1.85,2.3,.28),enamel,.22)
  gem((0,0,.6),(.65,.92,.45),glow)
 elif i==1: # Rapid: three cylindrical hot fuel chambers.
  for x in [-.85,0,.85]:
   m.cyl('Reactor cell',(x,0,0),.44,1.05,m.black,vertices=12);m.cyl('Burning cap',(x,0,.59),.31,.23,glow,vertices=12)
   for y in [-.85,.85]:m.box('Clamp',(x,y,.05),(.62,.28,.32),m.copper,.06)
 elif i==2: # Double: open tuning fork.
  for x in [-.82,.82]:
   m.box('Fork rail',(x,0,0),(.48,2.8,.4),m.silver,.09);gem((x,.6,.45),(.3,.7,.4),glow)
  m.box('Bridge',(0,-1.1,0),(2.1,.5,.4),enamel,.12)
 elif i==3: # Damage: four crystalline claws.
  for a in range(4):
   t=a*math.pi/2;g=gem((math.cos(t)*1.05,math.sin(t)*1.05,.2),(.8,.38,.38),enamel);g.rotation_euler.z=t
  gem((0,0,.6),(.95,.95,.8),glow)
 elif i==4: # Vector: swept wings.
  for side in [-1,1]:
   o=m.box('Swept vane',(side*.9,0,.1),(.5,2.6,.3),m.copper,.08);o.rotation_euler.z=side*-.55
  gem((0,.3,.5),(.5,1.2,.45),glow)
 elif i==5: # Pierce: long lance with rail brackets.
  gem((0,0,.3),(.34,2.05,.48),glow)
  for x in [-.58,.58]:m.box('Rail',(x,-.15,.1),(.22,2.8,.45),m.silver,.04)
  ring(.72,.15,enamel,.16)
 elif i==6: # Time: split hourglass.
  for y in [-.9,.9]:gem((0,y,.25),(1.0,.8,.5),enamel);gem((0,y,.65),(.55,.5,.24),glow)
  m.box('Time neck',(0,0,.4),(.42,.7,.35),m.silver,.08)
 elif i==7: # Magnet: horseshoe with exposed poles.
  for x in [-.95,.95]:m.box('Magnetic pole',(x,.1,0),(.6,2.0,.4),enamel,.1);m.box('Pole light',(x,1.2,.2),(.64,.4,.35),glow,.08)
  m.box('Yoke',(0,-.95,0),(2.5,.65,.5),m.silver,.17)
 elif i==8: # Drones: satellite nest.
  ring(.72,0,m.silver,.17)
  for j in range(3):
   a=j*math.tau/3;gem((math.cos(a)*1.3,math.sin(a)*1.3,.25),(.55,.55,.35),enamel);gem((math.cos(a)*1.3,math.sin(a)*1.3,.6),(.25,.25,.2),glow)
  gem((0,0,.4),(.45,.45,.55),glow)
 else: # Score: gilded mechanical sun.
  for j in range(8):
   a=j*math.tau/8;o=m.box('Sun tooth',(math.cos(a)*1.15,math.sin(a)*1.15,0),(.7,.26,.28),m.copper,.04);o.rotation_euler.z=a
  ring(.9,.2,m.silver,.12);gem((0,0,.35),(.75,.75,.6),glow)
 save('core-%02d'%(i+1))
for v in range(4):
 glow=m.mat('Serpent organs '+str(v),[ (1,.19,.055),(.3,.9,.08),(.6,.15,1),(.04,.6,1)][v],.25,.23,2.7)
 armor=m.mat('Serpent carapace '+str(v),[(.22,.07,.035),(.11,.19,.055),(.12,.07,.23),(.05,.14,.2)][v],.85,.27, micro=True)
 for part in ['head','body','tail']:
  clean()
  if part=='head':
   gem((0,0,.1),(1.1,1.25,.48),armor)
   for side in [-1,1]:
    o=gem((side*.87,.87,.15),(.34,1.2,.4),m.silver);o.rotation_euler.z=side*-.4
    gem((side*.48,.4,.65),(.24,.46,.13),glow)
    for j in range(3):gem((side*(.65+j*.2),-.5-j*.3,.2),(.25,.55,.25),armor)
   gem((0,-.25,.5),(.24,.8,.3),glow)
  elif part=='body':
   ring(.8,0,m.black,.23)
   for j in range(3):
    y=(j-1)*.57;o=m.box('Overlapping vertebral plate',(0,y,.2+j*.07),(1.6-abs(j-1)*.25,.67,.35),armor,.16)
    gem((0,y,.65+j*.07),(.16,.36,.14),glow)
   for side in [-1,1]:
    for j in range(2+v):
     y=-.6+j*(1.2/(1+v));o=gem((side*1.02,y,.1),(.62,.25,.18),m.silver);o.rotation_euler.z=side*.55
  else:
   gem((0,-.3,.1),(.6,1.7,.32),armor);gem((0,-1.2,.32),(.16,.8,.15),glow)
   for side in [-1,1]:gem((side*.65,.45,.1),(.4,.8,.22),m.silver)
  save('snake-%d-%s'%(v+1,part))
