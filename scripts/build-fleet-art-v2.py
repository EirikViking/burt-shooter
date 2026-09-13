"""Locally authored fleet continuation of approved Sparrow. Blender -- --ids 2,3,...
Editable meshes + four supported maps + GLB + centered sprite from the same model.
Indices here are asset IDs (1-based), not progression order. Sparrow is immutable.
"""
import os,sys,ast,json,math
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
ids=[int(v) for v in args[args.index('--ids')+1].split(',')] if '--ids' in args else list(range(2,31))
# Reuse the approved low-level modeling, camera and paint-map tools, not its ship.
library=Path('scripts/build-sparrow-v2.py').read_text(encoding='utf-8').split("if MODE=='studies':")[0]
library=library.replace("ROOT=os.path.abspath('docs/ship-art-v2')", "ROOT=os.path.abspath('docs/fleet-art-v2/work')")
library=library.replace("[(white,(.80,.825,.84)),(blue,(.10,.32,.60))]", "[(white,PAINT_RGB),(blue,TRIM_RGB)]")
library=library.replace("rgb[livery]=(.10,.32,.60)","rgb[livery]=TRIM_RGB")
library=library.replace('rng=np.random.default_rng(207)', "if CURRENT_ID==27:\n  for side in [-1,1]:\n   for k in range(4):\n    y=.32-k*.35;x=side*.79\n    path([(x-.12,y-.11),(x+.12,y-.11),(x+.13,y+.02),(x,y+.13),(x-.13,y+.02),(x-.12,y-.11)])\n rng=np.random.default_rng(207)")
exec(compile(library,'approved-sparrow-modeling-tools','exec'))
import bmesh
from bpy_extras.object_utils import world_to_camera_view
tree=ast.parse(Path('scripts/render-fleet-identity.py').read_text(encoding='utf-8'))
palettes=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='palettes' for t in n.targets))

# nose, body width ratio, engine span, nacelle radius ratio, architecture,
# span sections: (x, leading Y, trailing Y, thickness). Purpose-built silhouettes.
designs={
2:('Comet Courier',1.9,.95,.85,1.0,'courier',[(.2,.5,-1.12,.14),(.65,.66,-1.22,.17),(1.14,.34,-1.13,.10),(1.27,-.43,-1.0,.025)]),
3:('Pixel Needle',2.35,.72,.45,.73,'needle',[(.16,.30,-1.3,.09),(.46,-.2,-1.37,.10),(.85,-.76,-1.24,.023)]),
4:('Mint Skater',1.25,.78,.96,.74,'skater',[(.15,.43,-.95,.10),(.65,.65,-.63,.12),(1.36,1.03,-.24,.07),(1.68,1.0,.29,.018)]),
5:('Crimson Bite',1.5,1.22,.98,1.38,'jaw',[(.29,.78,-1.17,.20),(.72,1.13,-1.30,.24),(1.20,1.30,-1.02,.20),(1.52,.64,-.7,.055)]),
6:('Iron Orbit',1.35,1.30,.72,1.10,'orbit',[(.25,.2,-1.22,.18),(.7,-.30,-1.32,.18),(1.1,-.65,-1.14,.08)]),
7:('Quasar Fan',1.5,.95,.86,1.03,'fan',[(.2,.35,-1.1,.15),(.8,.35,-1.15,.14),(1.50,.31,-.99,.08),(1.96,.15,-.71,.028)]),
8:('Glacier Scope',2.10,.83,.69,.92,'scope',[(.18,.70,-1.20,.13),(.62,1.25,-1.31,.13),(.90,1.55,-.99,.07),(1.06,.84,-.79,.026)]),
9:('Arc Striker',1.35,.95,.71,1.03,'arc',[(.2,.53,-1.10,.15),(.73,.76,-.63,.17),(1.36,1.1,-.06,.08),(1.83,1.06,.37,.025)]),
10:('Solar Hammer',1.15,1.27,.58,1.18,'hammer',[(.25,.72,-.98,.22),(.82,.96,-.65,.26),(1.49,.94,-.15,.16),(1.65,.66,-.08,.06)]),
11:('Circuit Tap',1.55,.94,.74,.98,'circuit',[(.21,.55,-1.15,.15),(.79,.37,-1.23,.17),(1.29,.12,-1.01,.06),(1.41,-.35,-.86,.023)]),
12:('Violet Feint',1.8,.76,.62,.86,'feint',[(.17,.45,-1.2,.10),(.66,.72,-.97,.12),(1.30,1.11,.08,.055),(1.52,1.12,.50,.018)]),
13:('Auric Core',1.65,1.0,.67,1.07,'core',[(.2,.84,-1.2,.17),(.7,.69,-1.22,.21),(1.25,.36,-.79,.12),(1.4,-.1,-.51,.04)]),
14:('Plasma Skate',1.30,.83,1.21,.82,'plasma',[(.16,.5,-.91,.11),(.67,.90,-1.15,.14),(1.26,1.41,-1.1,.11),(1.77,1.31,-.68,.028)]),
15:('Ruby Spike',2.2,.77,.48,.93,'spike',[(.17,.20,-1.32,.11),(.5,-.22,-1.36,.13),(.98,-.6,-1.12,.028)]),
16:('Spectral Slip',2.0,.72,.57,.79,'spectral',[(.16,.72,-1.28,.09),(.57,1.03,-1.12,.11),(1.14,1.73,.21,.06),(1.31,1.83,.80,.018)]),
17:('Cobalt Guard',1.3,1.30,.96,1.28,'guard',[(.27,.89,-1.3,.24),(.85,.84,-1.36,.24),(1.33,.63,-1.13,.16),(1.50,.24,-.94,.055)]),
18:('Ember Burst',1.6,1.08,.87,1.03,'burst',[(.2,.64,-1.22,.17),(.87,.28,-1.16,.19),(1.46,-.07,-.91,.09),(1.64,-.47,-.75,.023)]),
19:('Neon Stutter',1.45,.80,.65,.86,'fork',[(.17,.41,-1.11,.11),(.70,.57,-1.11,.14),(1.27,.91,-.49,.075),(1.51,.95,.11,.022)]),
20:('Quartz Needle',2.4,.67,.44,.78,'quartz',[(.15,.50,-1.3,.10),(.49,1.03,-1.36,.11),(.77,.66,-1.13,.045),(.87,-.24,-.91,.019)]),
21:('Chrome Rail',2.35,.83,.66,1.02,'rail',[(.2,.25,-1.4,.14),(.63,-.23,-1.42,.15),(1.05,-.59,-1.17,.06),(1.21,-.86,-1.02,.021)]),
22:('Verdant Flow',1.45,.97,.79,.97,'flow',[(.20,.68,-1.21,.15),(.75,.88,-1.09,.17),(1.36,1.0,-.57,.10),(1.79,.84,-.13,.027)]),
23:('Hazard Ram',1.8,1.16,.76,1.05,'ram',[(.22,.72,-1.22,.18),(.72,1.21,-1.12,.22),(1.17,1.55,-.74,.13),(1.55,.27,-.60,.045)]),
24:('Nova Overdrive',1.6,.98,.83,1.06,'overdrive',[(.2,.60,-1.29,.14),(.79,.27,-1.30,.19),(1.38,-.1,-1.05,.11),(1.7,-.52,-.94,.023)]),
25:('Arcade Legend',1.2,1.34,1.03,1.32,'siege',[(.29,.78,-1.29,.24),(.8,1.01,-1.34,.26),(1.42,.92,-1.20,.17),(1.66,.54,-.82,.055)]),
26:('Phase Seraph',1.6,.84,.61,.94,'seraph',[(.19,.63,-1.25,.13),(.60,.78,-1.14,.16),(.99,1.0,-.62,.07)]),
27:('Eirik the Viking',2.1,1.17,.77,1.16,'viking',[(.24,1.08,-1.36,.19),(.76,.99,-1.43,.23),(1.16,.64,-1.28,.16),(1.28,.1,-1.05,.046)]),
28:('Aegis Comet',1.35,1.17,.70,1.15,'aegis',[(.24,.18,-1.22,.17),(.70,-.36,-1.35,.19),(1.17,-.68,-1.10,.065)]),
29:('Railbreaker',2.5,1.10,.80,1.20,'railbreaker',[(.23,.27,-1.46,.17),(.8,-.31,-1.56,.20),(1.3,-.59,-1.33,.06),(1.4,-.98,-1.15,.022)]),
30:('Drone Sovereign',1.65,1.36,1.0,1.28,'carrier',[(.28,1.02,-1.4,.21),(.86,.89,-1.48,.25),(1.47,.53,-1.35,.19),(1.72,.16,-1.01,.046)])}

def paintcolor(h):return tuple(int(h[k:k+2],16)/255 for k in (0,2,4))
def wing_volume(name,side,rings,material=white,z=.0):
 profile=[(0,0),(.09,.68),(.31,1),(.70,.63),(1,0),(.7,-.45),(.31,-.65),(.09,-.45)]
 v=[(side*x,lead+(trail-lead)*u,z+t*h) for x,lead,trail,t in rings for u,h in profile];n=8
 f=[tuple(reversed(range(n))),tuple(range((len(rings)-1)*n,len(rings)*n))]+[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(rings)-1) for j in range(n)]
 o=mesh(name,v,f,material,.010);o.data.materials.append(blue)
 for p in o.data.polygons:
  if p.index>=2 and (p.index-2)//n==max(0,len(rings)-3):p.material_index=1
 return o

def crescent(side,aegis=False):
 # Open horseshoe shield, a closed variable-section armor shell rather than discs.
 pts=[(.53,-.75,.19),(.97,-.60,.23),(1.34,-.19,.23),(1.37,.34,.21),(1.10,.87,.17),(.75,1.23,.07)]
 v=[];n=12
 for k,(x,y,w) in enumerate(pts):
  prev=Vector(pts[max(0,k-1)][:2]);nxt=Vector(pts[min(len(pts)-1,k+1)][:2]);d=(nxt-prev).normalized();normal=Vector((-d.y,d.x))
  for j in range(n):
   a=j*math.tau/n;v.append((side*(x+normal.x*w*math.cos(a)),y+normal.y*w*math.cos(a),.03+(.17 if aegis else .14)*math.sin(a)))
 f=[tuple(reversed(range(n))),tuple(range((len(pts)-1)*n,len(pts)*n))]+[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(pts)-1) for j in range(n)]
 o=mesh('Continuous shield crescent',v,f,white,.012);o.data.materials.append(blue)
 for p in o.data.polygons:
  if p.center.z>.10:p.material_index=1
 for x,y,w in pts[1:-1]:
  tube('Recessed shield field slit',[(side*(x-.06),y,.183),(side*(x+.06),y-.08,.183)],.007,glow)

def nacelle(x,scale=1,front=.38):
 prior=set(s.objects)
 o=loft('Integrated propulsion nacelle',[(-1.35,.18,.055,.18),(-1.21,.25,.08,.23),(-.68,.265,.08,.24),(-.13,.22,.055,.20),(front-.13,.12,.03,.12),(front,.09,.03,.08)],white,0,n=12,sub=0)
 o.data.materials.append(blue)
 for p in o.data.polygons:
  if p.center.z>.23:p.material_index=1
  p.use_smooth=True
 bm=bmesh.new();bm.from_mesh(o.data);bm.faces.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.faces[0],bm.faces[1]],context='FACES');bm.to_mesh(o.data);bm.free()
 o.data.set_sharp_from_angle(angle=.45);o.modifiers['Area weighted normals'].keep_sharp=True
 nozzle(0)
 nr=24;rr=[(front-.001,.081,.071),(front-.08,.073,.060),(front-.17,.058,.047)]
 v=[(w*math.cos(j*math.tau/nr),y,.03+h*math.sin(j*math.tau/nr)) for y,w,h in rr for j in range(nr)]
 f=[(i*nr+j,i*nr+(j+1)%nr,(i+1)*nr+(j+1)%nr,(i+1)*nr+j) for i in range(2) for j in range(nr)]+[tuple(range(2*nr,3*nr))]
 mesh('Deep intake duct',v,f,dark,smooth=True)
 for obj in set(s.objects)-prior:obj.scale=(scale,1,scale);obj.location.x=x
 return (x,-1.53,.09*scale)

def fairing(side,x,front,back,width,material=blue,z=.08):
 return loft('Blended structural fairing',[(back,width*.5,z,width*.45),(back+.15,width,z,width*.8),((front+back)/2,width,z,width*.78),(front-.12,width*.46,z,width*.38),(front,.018,z,.019)],material,side*x,n=12,sub=1)

def architecture(d):
 name,nose,width,span,eng,kind,rings=d
 build(0,True)
 keep=('Continuous pressure fuselage','Cockpit integrated coaming','Pressure canopy glazing','Canopy lower frame','Canopy pressure bow')
 for o in list(s.objects):
  if o.type in {'MESH','CURVE'}:
   if not o.name.startswith(keep):bpy.data.objects.remove(o,do_unlink=True)
   else:o.scale=(width,nose/1.64,1.05 if kind in ['guard','siege','carrier','viking','jaw'] else .92)
 lamps=[]
 for side in [-1,1]:
  wing_volume('Integrated lifting hull',side,rings)
  lamps.append(nacelle(side*span,eng,front=.65 if kind in ['courier','jaw','guard','siege','viking'] else .38))
  # Fine ventral construction, recessed heat slots and weapon mounting surfaces.
  if kind in ['courier','guard','siege','carrier']:
   fairing(side,span,.84,-1.25,.23 if kind!='carrier' else .27,white,.19)
  if kind=='courier':
   # Canted stabilizer, continuous rooted airfoil instead of upright rectangular fin.
   o=wing_volume('Canted cargo stabilizer',side,[(.04,-.51,-1.17,.065),(.42,-.72,-1.11,.04),(.68,-.97,-1.09,.012)],blue)
   o.rotation_euler.y=side*-.98;o.location.x=side*.83;o.location.z=.19
  if kind in ['needle','scope','spike','quartz','rail','railbreaker']:
   railx={'needle':.30,'scope':.62,'spike':.51,'quartz':.27,'rail':.55,'railbreaker':.48}[kind]
   for k in range(2 if kind=='railbreaker' else 1):
    x=railx+k*.29;front=nose+.12 if kind in ['rail','railbreaker'] else nose*.78
    fairing(side,x,front,-.91,.085 if kind!='spike' else .14,blue,.08)
    if kind in ['rail','railbreaker']:
     tube('Recessed accelerator channel',[(side*x,-.42,.145),(side*x,front-.20,.145)],.009,glow)
  if kind in ['orbit','aegis']:crescent(side,kind=='aegis')
  if kind=='jaw':fairing(side,.97,1.66,-1.22,.30,white,.15)
  if kind in ['fan','arc','plasma','burst']:
   x={'fan':1.46,'arc':1.32,'plasma':1.22,'burst':1.17}[kind]
   fairing(side,x,.52 if kind!='burst' else -.05,-.79,.07,dark,.10)
  if kind=='hammer':fairing(side,1.12,.98,-.56,.25,blue,.08)
  if kind in ['circuit','core','overdrive']:
   # Induction armor is flush with the shoulder, not a shiny raised ring.
   fairing(side,span,.34,-.85,.13,blue,.22)
   tube('Recessed induction aperture',[(side*(span-.06),-.53,.30),(side*(span-.06),-.11,.30)],.012,glow)
  if kind=='fork':fairing(side,.71,1.65,-.72,.095,blue,.04)
  if kind=='flow':
   fairing(side,.82,.73,-.75,.19,blue,.13)
  if kind=='ram':fairing(side,.94,1.58,-.8,.19,blue,.08)
  if kind=='burst':lamps.append(nacelle(side*1.25,.63,front=-.36))
  if kind=='seraph':
   for k in range(3):
    wing_volume('Articulated feather lifting vane',side,[(.43,.39-k*.15,-.94-k*.13,.105),(1.05+k*.28,1.2-k*.39,.14-k*.57,.075),(1.42+k*.24,1.3-k*.41,.84-k*.61,.022)],white,z=.04+k*.024)
  if kind=='viking':
   # Long tapered gold prow rails grow from the red pressure hull, no horns.
   fairing(side,.56,2.02,-.68,.16,blue,.12)
   # Shield facets are recessed normal/albedo boundaries conforming to the shoulder.
  if kind=='siege':
   fairing(side,1.12,1.04,-.79,.19,blue,.18)
  if kind=='carrier':
   # Three integrated launch recesses per side, set into a continuous hangar shoulder.
   for k in range(3):
    x=.70+k*.31;y=.61-k*.15
    fairing(side,x,y,-.95,.11,white,.19)
    shell('Launch bay aperture',[(side*(x-.066),y-.03),(side*(x+.066),y-.03),(side*(x+.066),y+.015),(side*(x-.066),y+.015)],.23,.08,dark)
    tube('Launch guide',[(side*(x-.044),y+.019,.294),(side*(x+.044),y+.019,.294)],.004,glow)
 return lamps

for ident in ids:
 CURRENT_ID=ident
 if ident==1:raise ValueError('Approved Sparrow must remain byte-identical')
 d=designs[ident];ROOT=os.path.abspath(f'docs/fleet-art-v2/ships/{ident:02d}');OUT=ROOT+'/export'
 for folder in [ROOT,OUT,OUT+'/textures']:os.makedirs(folder,exist_ok=True)
 if '--refine' in args or '--relink' in args:
  bpy.ops.wm.open_mainfile(filepath=ROOT+'/source.blend');s=bpy.context.scene;cam=s.camera
  clay=bpy.data.materials.get('Neutral grey clay') or mat('Neutral grey clay',(.32,.32,.32),0,.65)
  for obj in list(s.objects):
   if obj.name.startswith(('Flush cooling slot','Ventral access door')):bpy.data.objects.remove(obj,do_unlink=True)
  prior=json.loads(Path(ROOT+'/design.json').read_text());anchors=prior['anchors'];PAINT_RGB,TRIM_RGB,GLOW_RGB=prior['palette']
  for image in bpy.data.images:
   if image.source=='FILE':
    filename=os.path.basename(image.filepath.replace('\\','/'))
    if filename not in ['white-basecolor.png','cobalt-basecolor.png','paint-orm.png','panel-normal.png']:raise ValueError(filename)
    image.filepath=OUT+'/textures/'+filename;image.reload()
 else:
  # Remove old map users on reusable materials before authoring the next ship.
  for material in [white,blue]:
   nodes=material.node_tree.nodes
   for node in list(nodes):
    if node.type not in ['BSDF_PRINCIPLED','OUTPUT_MATERIAL']:nodes.remove(node)
  PAINT_RGB=paintcolor(palettes[ident-1][0]);TRIM_RGB=paintcolor(palettes[ident-1][1]);GLOW_RGB=paintcolor(palettes[ident-1][2])
  if ident==27:PAINT_RGB=(.38,.065,.046);TRIM_RGB=(.72,.49,.16)
  for material,col in [(white,PAINT_RGB),(blue,TRIM_RGB)]:
   material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*(c**2.2 for c in col),1)
   material.diffuse_color=(*(c**2.2 for c in col),1)
  glow.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(*GLOW_RGB,1)
  glow.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=1.6
  anchors=architecture(d);surface_maps()
 s.render.resolution_x=900;s.render.resolution_y=720;s.render.film_transparent=False;s.cycles.samples=24
 if '--relink' not in args:
  camera((4.5,7,6),max(4.9,d[1]*2.3));render(ROOT+'/clay.png',True)
  camera((3,-6,-4),max(4.9,d[1]*2.3));render(ROOT+'/underside-clay.png',True)
 camera((4.5,7,6),max(4.9,d[1]*2.3));render(ROOT+'/surfaced.png')
 for im in bpy.data.images:
  if im.filepath and not im.filepath.startswith('//'):im.filepath=bpy.path.relpath(im.filepath,start=ROOT)
 bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/source.blend',relative_remap=False)
 bpy.ops.object.select_all(action='DESELECT')
 for o in s.objects:
  if o.type in {'MESH','CURVE'}:o.select_set(True)
 bpy.context.view_layer.objects.active=next(o for o in s.objects if o.type=='MESH')
 bpy.ops.object.convert(target='MESH');bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);bpy.ops.object.join();model=bpy.context.object;model.name=d[0].replace(' ','')+'V2'
 bm=bmesh.new();bm.from_mesh(model.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(model.data);bm.free()
 bpy.ops.export_scene.gltf(filepath=OUT+'/model.glb',export_format='GLB',use_selection=True,export_yup=True,export_cameras=False,export_lights=False)
 points=[model.matrix_world@Vector(v) for v in model.bound_box];low=Vector([min(v[k] for v in points) for k in range(3)]);high=Vector([max(v[k] for v in points) for k in range(3)]);center=(low+high)/2
 s.render.film_transparent=True;s.render.resolution_x=s.render.resolution_y=1024
 cam.data.ortho_scale=max(high.x-low.x,high.y-low.y)*1.23;cam.location=center+Vector((0,-4.5,12));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();render(OUT+'/showroom.png')
 emitters=[]
 for a in anchors:
  uv=world_to_camera_view(s,cam,Vector(a));emitters.append({'x':uv.x-.5,'y':.5-uv.y,'visible':True,'scale':1})
 Path(OUT+'/showroom.json').write_text(json.dumps({'emitters':emitters}))
 s.render.resolution_x=s.render.resolution_y=512;cam.location=center+Vector((0,-.15,14));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();render(OUT+'/player.png')
 Path(ROOT+'/design.json').write_text(json.dumps({'id':ident,'name':d[0],'design':d,'palette':[PAINT_RGB,TRIM_RGB,GLOW_RGB],'center':list(center),'dimensions':list(high-low),'spriteOrtho':cam.data.ortho_scale,'anchors':anchors,'author':'Original local Blender geometry and authored maps; approved Sparrow construction vocabulary; no external assets'},indent=2))
 print('FLEET_V2_COMPLETE',ident,d[0],flush=True)
