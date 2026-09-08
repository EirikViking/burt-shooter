# SPDX-License-Identifier: GPL-3.0-or-later
"""Authored solid hulls. Blender background, -- player COUNT START.
No image displacement, billboard planes or raster hull textures. GLB and sprites
are exported from the same beveled, closed three-dimensional machinery.
"""
import importlib.util, os, sys, math, json, ast
from mathutils import Vector
spec=importlib.util.spec_from_file_location('mesh',os.path.abspath('scripts/render-astra-v2.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
bpy=m.bpy;s=m.s
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['player','1','4']
count=int(args[1]);start=int(args[2])
root=os.path.abspath('public/art/solid-fleet-20260908');os.makedirs(root,exist_ok=True)
masters=os.path.abspath('docs/solid-fleet-20260908');os.makedirs(masters,exist_ok=True)
tree=ast.parse(open('scripts/render-fleet-identity.py',encoding='utf-8').read())
palettes=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='palettes' for t in n.targets))
def rgb(h):return tuple((int(h[k:k+2],16)/255)**2 for k in (0,2,4))
def ring(name,pos,r,t,mat,axis='Z'):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=48,minor_segments=12,location=pos)
 o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 if axis=='Y':o.rotation_euler.x=math.pi/2
 for p in o.data.polygons:p.use_smooth=True
 return o
def engine(x,y,z,r=.22):
 m.cyl('Recessed turbine casing',(x,y,z),r, .78,m.black,'Y',48)
 m.cyl('Armored engine sleeve',(x,y+.13,z),r*1.13,.46,paint,'Y',48)
 for j in range(3):ring('Exhaust cooling collar',(x,y-.20-j*.1,z),r,.028,m.silver,'Y')
 m.cyl('Ion chamber',(x,y-.407,z),r*.73,.025,light,'Y',48)
 ring('Nozzle lip',(x,y-.44,z),r*.83,.045,m.copper,'Y')
 for a in range(12):
  t=a*math.tau/12
  fin=m.box('Turbine vane',(x+math.cos(t)*r*.43,y-.435,z+math.sin(t)*r*.43),(.025,.04,r*.56),m.black,.003);fin.rotation_euler.y=-t+math.pi/2
 for side in [-1,1]:
  m.tube('Engine external bypass',[(x+side*r*.81,y-.24,z+r*.58),(x+side*r*1.2,y+.03,z+r*.72),(x+side*r*.95,y+.37,z+r*.55)],.022,m.copper)
  for k in range(3):m.box('Engine jacket clamp',(x+side*r*.8,y-.1+k*.15,z+r*.69),(.085,.045,.055),m.silver,.008)
 emitters.append((x,y-.46,z))
def cannon(x,y,z,length=1.0):
 m.box('Weapon cradle',(x,y-.2,z),(.22,.55,.22),m.black,.045)
 m.cyl('Accelerator barrel',(x,y+length*.2,z),.085,length,m.silver,'Y',24)
 for k in range(4):m.cyl('Barrel heat sink',(x,y+length*.05+k*.12,z),.116,.04,m.black,'Y')
 m.cyl('Muzzle aperture',(x,y+length*.71,z),.058,.035,light,'Y')
def bastion(name,pos,size,material):
 x,y,z=pos;w,l,h=size
 m.box(name,pos,size,m.black,.045)
 for j in range(3):
  py=y-l*.31+j*l*.31
  m.box('Bastion armor cassette',(x,py,z+h*.5+.025),(w*.90,l*.28,.075),material,.02)
  for side in [-1,1]:m.cyl('Bastion lock',(x+side*w*.32,py,z+h*.5+.07),.019,.012,m.silver,vertices=12)
 m.box('Bastion illuminated seam',(x,y,z+h*.5+.071),(.045,l*.82,.022),light,.005)
def wing(side,points,z=.04,h=.20):
 pts=[(side*x,y) for x,y in points]
 m.poly('Structural wing',pts,z-.10,h-.02,m.black,.04)
 m.poly('Colored armor shell',[(x*.97,y*.97) for x,y in pts],z,h,paint,.035)
 cx=sum(x for x,y in pts)/len(pts);cy=sum(y for x,y in pts)/len(pts)
 inner=[(cx+(x-cx)*.76,cy+(y-cy)*.76) for x,y in pts]
 m.poly('Recessed wing equipment bed',inner,z+h+.012,.025,m.black,.014)
 m.poly('Ventral maintenance armor',inner,z-.14,.032,m.steel,.014)
 for j in range(len(inner)):
  ax,ay=inner[j];bx,by=inner[(j+1)%len(inner)]
  m.tube('Ventral structural spar',[(cx,cy,z-.17),(ax*.96,ay*.96,z-.17)],.024,m.silver)
  m.cyl('Ventral wing anchor',(ax,ay,z-.15),.027,.028,trim,vertices=12)
 m.box('Ventral actuator housing',(cx,cy,z-.21),(.19,.46,.15),trim,.018)
 m.cyl('Landing strut pivot',(cx,cy,z-.30),.065,.16,m.silver,'Y')
 # Radially split armor tiles expose purposeful dark seams and rich paint.
 for j in range(len(inner)):
  a=inner[j];b=inner[(j+1)%len(inner)]
  panel=[(cx+(a[0]-cx)*.96,cy+(a[1]-cy)*.96),(cx+(b[0]-cx)*.96,cy+(b[1]-cy)*.96),(cx+(b[0]-cx)*.25,cy+(b[1]-cy)*.25),(cx+(a[0]-cx)*.25,cy+(a[1]-cy)*.25)]
  m.poly('Individual wing armor tile',panel,z+h+.046,.035,trim if j==1 else paint,.008)
  px=cx+(a[0]-cx)*.78;py=cy+(a[1]-cy)*.78
  m.cyl('Wing flush fastener',(px,py,z+h+.087),.018,.012,m.silver,vertices=12)
 m.box('Wing equipment recess',(cx,cy,z+h+.076),(.17,.40,.055),m.black,.018)
 for j in range(5):m.box('Wing heat exchanger',(cx,cy-.15+j*.075,z+h+.114),(.14,.027,.035),m.silver,.004)
 # A broad inset livery stripe follows the longest external sweep.
 a,b=pts[1],pts[2]
 m.tube('Wing edge inlay',[(a[0]*.96,a[1]*.96,z+h+.018),(b[0]*.96,b[1]*.96,z+h+.018)],.027,trim)
def hull(length=1.7,width=.40,height=.30):
 m.loft('Deep structural fuselage',[(-1.25,width*.68,-.12,height),(-.7,width,-.06,height*1.25),(.35,width*.85,0,height),(length,.018,-.01,.04)],paint)
 for j in range(6):
  y=-1.05+j*.29;w=width*(.68 if j<4 else .55-(j-4)*.12);z=.34 if j<4 else .28-(j-4)*.055
  m.poly('Separated dorsal armor panel',[(-w,y-.12),(w,y-.12),(w*.83,y+.12),(-w*.83,y+.12)],z,.065,trim if j==0 else paint,.018)
  for side in [-1,1]:m.cyl('Captive panel fastener',(side*w*.7,y-.065,z+.074),.022,.018,m.silver,vertices=12)
 # A separate, machined keel plate avoids intersecting curved hull shells.
 m.poly('Armored ventral keel',[(-width*.40,-1.0),(width*.40,-1.0),(width*.30,.65),(0,length*.70),(-width*.30,.65)],-.49,.045,trim,.012)
 for y in [-.7,.2]:m.box('Keel structural mount',(0,y,-.32),(width*.48,.16,.28),m.black,.015)
def cockpit(y=.22,w=.22):
 m.loft('Canopy armored rim',[(y-.5,w*.8,.34,.10),(y-.15,w*1.25,.39,.18),(y+.48,.035,.24,.035)],m.black)
 m.loft('Faceted smoked canopy',[(y-.44,w*.72,.44,.08),(y-.14,w*1.08,.49,.19),(y+.42,.026,.32,.025)],m.glass)
 m.tube('Canopy spine',[(0,y-.42,.50),(0,y-.14,.67),(0,y+.41,.305)],.015,trim)
def details(index):
 # Large readable equipment islands, followed by restrained machining detail.
 for side in [-1,1]:
  m.box('Raised reactor shoulder',(side*.34,-.55,.30),(.22,.67,.23),paint,.045)
  for k in range(6):m.box('Reactor grille',(side*.34,-.77+k*.078,.431),(.17,.032,.024),m.black,.004)
  m.tube('Ventral fuel feed',[(side*.2,.55,-.34),(side*.28,-.3,-.4),(side*.3,-1,-.22)],.03,m.copper)
  for k in range(5):m.box('Service panel',(side*.22,.58+k*.13,.25-k*.024),(.14,.075,.03),trim if k==0 else m.silver,.006)
  m.box('Navigation light',(side*.44,-.74,.42),(.08,.13,.035),light,.012)
  m.box('Avionics armored enclosure',(side*.39,-.15,.38),(.16,.27,.12),m.black,.018)
  m.box('Avionics polished lid',(side*.39,-.15,.447),(.12,.23,.016),m.silver,.006)
  for j in range(3):m.box('Avionics status lens',(side*.39,-.22+j*.07,.46),(.06,.018,.012),light,.003)
  m.tube('Dorsal hydraulic line',[(side*.44,-.8,.32),(side*.5,-.3,.32),(side*.41,.2,.24)],.019,m.copper)
  m.box('Ventral skid',(side*.25,-.6,-.41),(.10,.78,.12),m.black,.025)
  for j in range(4):m.box('Keel cooling plate',(side*.2,-.45+j*.23,-.43),(.13,.14,.035),m.silver,.006)
 # Rear reactor stack is visible from behind and below, not a flat cut end.
 m.cyl('Central reactor housing',(0,-1.29,-.08),.25,.23,m.black,'Y',48)
 ring('Reactor armored rim',(0,-1.42,-.08),.22,.038,m.silver,'Y')
 m.cyl('Reactor recessed emitter',(0,-1.417,-.08),.15,.02,light,'Y',48)
 # Actual extruded marking, never an enlarged bitmap.
 bpy.ops.object.text_add(location=(.14,-.95,.45));o=bpy.context.object;o.name='Raised hull registration';o.data.body=f'{index+1:02d}';o.data.size=.17;o.data.extrude=.002;o.data.materials.append(m.white)
def build(i):
 global paint,trim,light,emitters
 m.clear();emitters=[]
 paint=m.mat('Hull enamel '+str(i),rgb(palettes[i][0]),.48,.27)
 trim=m.mat('Livery contrast '+str(i),rgb(palettes[i][1]),.58,.26)
 light=m.mat('Reactor emission '+str(i),rgb(palettes[i][2]),.12,.23,2.6)
 # Each architecture has a separate outline and spatial structure.
 length=[1.65,1.9,2.35,1.25,1.5,1.35,1.5,2.1,1.35,1.15,1.55,1.8,1.65,1.3,2.2,2.0,1.3,1.6,1.45,2.4,2.35,1.45,1.8,1.6,1.2,1.6,2.1,1.35,2.5,1.65][i]
 hull(length,.50 if i in [4,5,9,16,24,27,29] else .34,.37 if i in [4,5,9,16,24,27,29] else .25)
 for side in [-1,1]:
  if i==0: # Sparrow: swept gull wings, elevated nacelles.
   wing(side,[(.25,.5),(1.7,-.65),(1.35,-1.25),(.4,-.9)]);engine(side*.9,-1.0,.14,.25);cannon(side*1.3,.05,.25)
  elif i==1: # Courier: twin long cargo outriggers and upright dorsal fins.
   wing(side,[(.2,.2),(1.1,.75),(1.15,-1.1),(.3,-.85)])
   m.loft('Courier pod',[(-1.3,.24,.1,.26),(.55,.24,.13,.27),(1.1,.045,.12,.08)],trim).location.x=side*.85
   engine(side*.85,-1.25,.1);m.poly('Vertical tail',[(side*.78,-.8),(side*.95,-1.25),(side*.88,-.25)],.2,.7,paint)
  elif i==2:wing(side,[(.2,.35),(.8,-.65),(.66,-1.4),(.23,-.9)]);engine(side*.45,-1.2,.05,.18);cannon(side*.32,.75,.12,1.7)
  elif i==3:wing(side,[(.2,.4),(1.7,.95),(1.45,-.2),(.3,-.9)]);engine(side*1.15,-.4,.07,.19)
  elif i==4: # Bite: massive jaw nacelles with armored fangs and cheek plates.
   wing(side,[(.28,.75),(1.30,1.35),(1.52,-.72),(.35,-1.1)],.03,.28)
   m.loft('Bite muscular jaw',[(-1.2,.35,.05,.38),(-.1,.39,.1,.4),(1.65,.05,.07,.09)],paint).location.x=side*.99
   for j in range(6):
    y=-.86+j*.31;z=.46 if j<3 else .46-(j-2)*.075;w=.26 if j<3 else .26-(j-2)*.05
    m.poly('Jaw armor cassette',[(side*.99-w,y-.125),(side*.99+w,y-.125),(side*.99+w*.83,y+.125),(side*.99-w*.83,y+.125)],z,.075,trim if j%3==0 else paint,.018)
    for k in [-1,1]:m.cyl('Jaw captive bolt',(side*.99+k*w*.65,y-.07,z+.085),.022,.02,m.silver,vertices=12)
   for j in range(8):m.box('Jaw radiator louvre',(side*1.28,-.85+j*.13,.28),(.13,.055,.12),m.black,.01)
   m.tube('Exposed hydraulic feed',[(side*1.31,-.8,.08),(side*1.36,-.1,.08),(side*1.15,.8,.1)],.035,m.copper)
   engine(side*.99,-1.3,.04,.31);cannon(side*.61,.52,.03,1.15)
  elif i==5: # Orbit: armored half ring around a deep block core.
   m.tube('Orbit structural crescent',[(side*.35,-.6,-.1),(side*1.1,-.75,-.1),(side*1.3,-.2,-.1),(side*1.1,.45,-.1),(side*.72,.8,-.1)],.13,m.silver)
   for j in range(5):
    a=.18+j*.48;x=side*(.63+.65*math.sin(a));y=.85*math.cos(a)-.1
    bastion('Orbit armor bastion',(x,y,.05),(.44,.47,.43),paint)
   engine(side*.8,-1.13,.04,.3)
  elif i==6:wing(side,[(.22,.2),(1.95,.25),(1.72,-.9),(.32,-1.05)]);cannon(side*1.5,.15,.19,.8);cannon(side*.9,.5,.19,.9);engine(side*.85,-1.1,.05)
  elif i==7:wing(side,[(.2,.8),(.82,1.5),(1.05,-1.2),(.23,-.85)]);cannon(side*.67,.8,.19,1.65);engine(side*.72,-1.3,.05,.21)
  elif i==8:wing(side,[(.2,.6),(1.85,1.12),(1.62,.35),(.35,-1)]);engine(side*.72,-.85,.1,.26);cannon(side*1.5,.64,.2,.68)
  elif i==9:wing(side,[(.3,.75),(1.55,.88),(1.62,-.13),(.33,-.55)],.06,.36);bastion('Hammer head',(side*1.1,.5,.2),(.65,.85,.55),trim);engine(side*.58,-1.22,.04,.32)
  elif i==10:wing(side,[(.2,.65),(1.3,.1),(1.1,-1.3),(.25,-.75)]);ring('Circuit induction coil',(side*.8,-.27,.25),.35,.09,trim);engine(side*.77,-1.25,.05,.21)
  elif i==11:wing(side,[(.2,.25),(1.55,1.05),(.95,.18),(.45,-1.2)]);engine(side*.63,-1.3,.04,.21)
  elif i==12:wing(side,[(.2,.85),(1.2,.5),(1.4,-.4),(.3,-1)]);m.cyl('Auric reactor',(side*.67,-.2,.3),.35,.28,trim);ring('Reactor halo',(side*.67,-.2,.46),.26,.035,light);engine(side*.65,-1.1,.03,.26)
  elif i==13:wing(side,[(.2,.4),(1.8,1.4),(1.55,-1.1),(.3,-.75)]);engine(side*1.35,-1.2,.08,.19);cannon(side*1.3,.5,.22,1.1)
  elif i==14:wing(side,[(.15,.2),(1.1,-.4),(.68,-1.4),(.23,-.9)]);m.loft('Lance cheek',[(-.9,.2,.1,.2),(.6,.15,.15,.15),(1.8,.025,.04,.025)],trim).location.x=side*.54;engine(side*.47,-1.25,.04,.24)
  elif i==15:wing(side,[(.15,.8),(1.3,1.8),(1.0,.2),(.35,-1.4)]);engine(side*.58,-1.4,.08,.19)
  elif i==16:wing(side,[(.3,.9),(1.42,.65),(1.5,-1.05),(.3,-1.2)],.03,.34);bastion('Guard heavy shoulder',(side*.96,-.1,.32),(.57,1.3,.25),trim);engine(side*.94,-1.32,.08,.31)
  elif i==17:wing(side,[(.2,.65),(1.45,.1),(1.6,-.85),(.3,-.65)]);engine(side*.9,-1.05,.15,.29);engine(side*1.3,-.85,-.12,.16);cannon(side*.75,.55,.3,1.1)
  elif i==18:wing(side,[(.22,.25),(1.5,.95),(1.2,-.6),(.35,-.85)]);m.box('Stutter forward prong',(side*.78,.65,.15),(.22,1.6,.22),trim,.04);engine(side*.7,-1.1,.02,.21)
  elif i==19:wing(side,[(.15,.45),(.65,1.0),(.85,-1.3),(.2,-.95)]);engine(side*.45,-1.3,.02,.2);cannon(side*.25,1,.2,1.8)
  elif i==20:wing(side,[(.2,.3),(1.2,-.55),(.96,-1.3),(.22,-.9)]);cannon(side*.58,1.0,.2,2.5);engine(side*.68,-1.3,.05,.26)
  elif i==21:wing(side,[(.18,.8),(1.8,.95),(1.45,-.55),(.2,-1.15)]);m.tube('Flow arch',[(side*.3,.7,.3),(side*.85,.15,.65),(side*1.1,-.6,.3)],.10,trim);engine(side*.82,-.95,.05,.23)
  elif i==22:wing(side,[(.2,.6),(1.15,1.55),(1.6,-.6),(.2,-1.1)]);m.poly('Crystal blade',[(side*.6,.55),(side*1.25,1.4),(side*1.05,-.45)],.24,.35,trim);engine(side*.76,-1.1,.06,.24)
  elif i==23:wing(side,[(.2,.65),(1.7,-.15),(1.4,-1.2),(.25,-.85)]);ring('Vector hoop',(side*.98,-.3,.17),.38,.065,trim);engine(side*.85,-1.22,.05,.25)
  elif i==24:wing(side,[(.3,.6),(1.6,1.1),(1.65,-1.0),(.35,-1.2)],.02,.3);bastion('Siege weapons block',(side*1.12,.1,.32),(.6,1.4,.3),trim);cannon(side*1.12,.9,.4,1.2);engine(side*1.1,-1.35,.06,.34)
  elif i==25: # Seraph: separate three-dimensional feather vanes.
   for j in range(4):wing(side,[(.28,-.7+j*.15),(1.05+j*.23,.15+j*.38),(1.27+j*.20,-.12+j*.22),(.32,-1+j*.12)],.08+j*.09,.14)
   engine(side*.62,-1.2,.05,.22)
  elif i==26: # Viking: longship keel, curved tusks and shield banks.
   wing(side,[(.3,1.2),(1.23,.8),(1.04,-1.35),(.3,-1.1)],.0,.28)
   m.tube('Dragon prow tusk',[(side*.5,.7,.3),(side*.84,1.15,.48),(side*.7,1.8,.72),(side*.4,2.1,.84)],.10,trim)
   for j in range(4):m.cyl('Viking shield',(side*.92,.55-j*.47,.37),.22,.10,trim);ring('Shield rim',(side*.92,.55-j*.47,.43),.19,.025,m.silver)
   engine(side*.74,-1.4,.04,.29)
  elif i==27: # Aegis: segmented shield face surrounding exposed center.
   m.tube('Aegis shield support arc',[(side*.35,-.6,-.04),(side*1.22,-.53,-.04),(side*1.3,.1,-.04),(side*1.0,.8,-.04),(side*.65,1.1,-.04)],.14,m.silver)
   for j in range(4):
    a=.18+j*.48;x=side*(.55+.75*math.sin(a));y=1.25*math.cos(a)-.2
    m.poly('Aegis shield segment',[(x-.2,y-.34),(x+.23,y-.28),(x+.27,y+.3),(x-.17,y+.38)],.13,.3,paint,.06)
    m.box('Aegis light bar',(x,y,.45),(.09,.38,.03),light,.012)
    for k in [-1,1]:
     m.box('Aegis segmented shield inset',(x+k*.13,y,.452),(.10,.45,.026),trim,.01)
     for v in [-1,1]:m.cyl('Shield anchor',(x+k*.15,y+v*.23,.46),.024,.025,m.silver,vertices=12)
   engine(side*.72,-1.38,.02,.3)
  elif i==28: # Railbreaker: four raised open accelerator rails, deep rear reactor.
   wing(side,[(.2,.1),(1.35,-.55),(1.1,-1.5),(.2,-1.1)],.03,.26)
   for j in range(2):
    x=side*(.47+j*.34);m.box('Railbreaker rail',(x,.82,.22),(.20,3.6,.25),trim,.035);m.box('Live accelerator inset',(x,.86,.36),(.06,3.3,.035),light,.007)
    for k in range(7):m.box('Accelerator brace',(x,-.4+k*.42,.20),(.29,.11,.34),m.silver,.016)
   engine(side*.8,-1.5,.03,.3)
  elif i==29: # Sovereign: carrier decks with six separated launch pods.
   wing(side,[(.28,1.05),(1.6,.6),(1.6,-1.3),(.28,-1.2)],.01,.25)
   for j in range(3):
    x=side*(.68+j*.39);y=.42-j*.31
    bastion('Drone hangar pod',(x,y,.35),(.31,1.12,.43),paint);m.box('Open bay mouth',(x,y+.568,.35),(.22,.025,.23),m.black,.02);m.box('Bay guidance light',(x,y+.585,.48),(.2,.02,.035),light,.005)
   engine(side*1.0,-1.5,.03,.33)
 cockpit(.2,.26 if i in [4,5,16,24,29] else .2);details(i)
 # Convert/apply once, then merge by material for bounded realtime draw calls.
 bpy.ops.object.select_all(action='DESELECT')
 objects=[o for o in s.objects if o.type in {'MESH','CURVE','FONT'}]
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.convert(target='MESH')
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bpy.ops.object.join();model=bpy.context.object;model.name=f'SolidHull_{i+1:02d}'
 import bmesh
 bm=bmesh.new();bm.from_mesh(model.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(model.data);bm.free()
 # Center and normalize dimensions without flattening the depth.
 points=[model.matrix_world@Vector(c) for c in model.bound_box];lo=Vector(tuple(min(p[k] for p in points) for k in range(3)));hi=Vector(tuple(max(p[k] for p in points) for k in range(3)));center=(lo+hi)/2
 model.location-=center
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 s.render.engine='CYCLES';s.cycles.samples=48;s.view_settings.exposure=.4
 label=f'{i+1:02d}'
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(masters,label+'.blend'))
 bpy.ops.export_scene.gltf(filepath=os.path.join(root,label+'.glb'),export_format='GLB',use_selection=True,export_cameras=False,export_lights=False,export_materials='EXPORT',export_yup=True)
 for folder in ['player','showroom']:os.makedirs(os.path.join(root,folder),exist_ok=True)
 m.cam.location=(0,-4.5,12);m.cam.rotation_euler=(Vector((0,0,0))-m.cam.location).to_track_quat('-Z','Y').to_euler();m.cam.data.ortho_scale=max(hi.x-lo.x,hi.y-lo.y)*1.23
 s.render.resolution_x=s.render.resolution_y=1024;s.render.filepath=os.path.join(root,'showroom',label+'.png');bpy.ops.render.render(write_still=True)
 from bpy_extras.object_utils import world_to_camera_view
 lamps=[]
 for p in emitters:
  uv=world_to_camera_view(s,m.cam,Vector(p)-center);lamps.append({'x':uv.x-.5,'y':.5-uv.y,'visible':True,'scale':1})
 open(os.path.join(root,'showroom',label+'.json'),'w').write(json.dumps({'emitters':lamps}))
 m.cam.location=(0,-.15,14);m.cam.rotation_euler=(Vector((0,0,0))-m.cam.location).to_track_quat('-Z','Y').to_euler();s.render.resolution_x=s.render.resolution_y=512;s.render.filepath=os.path.join(root,'player',label+'.png');bpy.ops.render.render(write_still=True)
 print('SOLID_FLEET_COMPLETE',label,len(model.data.vertices),len(model.data.polygons),flush=True)
for i in range(start,start+count):build(i)
