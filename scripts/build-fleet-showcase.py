"""Showcase-only continuation of the approved Sparrow construction tools.
Blender -b --python scripts/build-fleet-showcase.py -- --ids 1,2,...
No combat sprite generation or legacy asset writes exist in this pipeline.
"""
import ast,sys,math,json,textwrap
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
IDS=[int(i) for i in args[args.index('--ids')+1].split(',')] if '--ids' in args else list(range(1,31))
approved=Path('scripts/build-sparrow-showcase.py').read_text()
legacy=Path('scripts/build-fleet-art-v2.py').read_text()
def literal(text,name):
 return next(ast.literal_eval(n.value) for n in ast.parse(text).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in n.targets))
DESIGNS=literal(legacy,'designs');PALETTES=literal(Path('scripts/render-fleet-identity.py').read_text(),'palettes')
DESIGNS[1]=('Nova Sparrow',1.7,1,.79,1,'sparrow',[(.32,.42,-1.13,.145),(.68,.27,-1.28,.13),(1.07,-.08,-1.26,.092),(1.46,-.45,-1.09,.057),(1.78,-.70,-.89,.026)])
for ID in IDS:
 NAME,NOSE,WIDTH,ENGINE_SPAN,ENGINE_SCALE,KIND,RINGS=DESIGNS[ID]
 HEAVY=KIND in ['guard','siege','carrier','viking','jaw','hammer','railbreaker','aegis']
 LIGHT=KIND in ['needle','quartz','spectral','feint','skater','spike']
 ROOT_PATH=f'docs/fleet-showcase/ships/{ID:02d}'
 PAINT=[tuple(int(h[k:k+2],16)/255*.91 for k in (0,2,4)) for h in PALETTES[ID-1][:2]]
 if ID==1:PAINT=[(.78,.795,.785),(.085,.225,.43)]
 setup=approved.split('body_sections=')[0]
 setup=setup.replace("Path('docs/sparrow-showcase')",f"Path('{ROOT_PATH}')")
 setup=setup.replace('N=2048;','N=1536;' if HEAVY or ID==1 else 'N=1024;')
 setup=setup.replace("[(white,(.78,.795,.785)),(blue,(.085,.225,.43))]",f'[(white,{PAINT[0]}),(blue,{PAINT[1]})]')
 setup=setup.replace("default_value=.24;g.inputs['Coat Weight'].default_value=.5", "default_value=.42;g.inputs['Coat Weight'].default_value=.85")
 setup=setup.replace("(.018,.035,.041),0,.085", "(.025,.045,.055),.06,.12")
 setup=setup.replace("(.018,.035,.041,.24)","(.025,.045,.055,.42)")
 setup=setup.replace('s.cycles.samples=48','s.cycles.samples=16').replace('resolution_x=1440','resolution_x=960').replace('resolution_y=1080','resolution_y=720')
 # Low-frequency finish variation and localized service staining, not random scratches.
 setup=setup.replace('rough=np.clip(','''vent_stain=np.exp(-((abs(X)-.205)**2/.006+(Y+.96)**2/.14))*.18
 aft_stain=np.exp(-((abs(X)-.79)**2/.07+(Y+1.32)**2/.035))*.12
 dirt=np.clip(dirt+vent_stain+aft_stain,0,.24)
 edge_wear=np.clip(np.exp(-seams*seams/.11)-np.exp(-seams*seams/.05),0,1)*.018
 rough=np.clip('''.replace('\n ','\n'))
 setup=setup.replace('variation[...,None])*(1-dirt','variation[...,None]+edge_wear[...,None])*(1-dirt')
 setup=setup.replace('variation*4+grain*.018','variation*5+grain*.009')
 # Set tessellation where surfaces are authored; never decimate finished silhouettes.
 setup=setup.replace(' verts=[fn(x,y)', ' nu=max(3,round(nu*DETAIL));nv=max(4,round(nv*DETAIL))\n verts=[fn(x,y)')
 DETAIL=1 if ID==1 else (.68 if LIGHT else .78)
 exec(compile(setup,'sparrow-showcase-tools','exec'))
 if ID==1:
  # Keep Sparrow's approved construction; this is only its shared finish pass.
  rest='body_sections='+approved.split('body_sections=',1)[1]
  rest=rest.replace("ROOT/'nova-sparrow-showcase.blend'","ROOT/'source.blend'").replace("OUT/'sparrow-showcase.glb'","OUT/'model.glb'")
  exec(compile(rest,'approved-sparrow-finish','exec'))
  (ROOT/'design.json').write_text(json.dumps({'id':ID,'name':NAME,'architecture':KIND,'palette':PALETTES[0],'textureSize':N,'spriteGeneration':False},indent=2))
  print('FLEET_SHOWCASE_COMPLETE',ID,NAME,flush=True)
  continue
 glow=light
 # Rebuild the pressure cabin using approved openings and interior construction.
 body_code='body_sections='+approved.split('body_sections=',1)[1].split('# Continuous wing spars')[0]
 exec(compile(body_code,'pressure-cabin','exec'))
 cockpit=approved.split('# Cabin box and seat',1)[1].split('# Service panels and a heat exchanger')[0]
 exec(compile('# Cabin box and seat'+cockpit,'framed-cockpit','exec'))
 for a,b in [(-.98,-.60),(-.56,-.23),(.72,1.10)]:patch('Ventral access hatch',shape(body_sections,offset=.013),a,b,math.pi*1.30,math.pi*1.70,metal,8,10,.004)
 for o in list(s.objects):
  o.scale.x*=WIDTH;o.scale.y*=NOSE/1.7;o.scale.z*=1.20 if HEAVY else (.88 if LIGHT else 1)
  o.location.x*=WIDTH;o.location.y*=NOSE/1.7;o.location.z*=1.20 if HEAVY else (.88 if LIGHT else 1)
 # Each existing hull plan has its own span/chord sections, not a Sparrow wing.
 span=[(x,le,tr,.025+(x/RINGS[-1][0])*.025,t) for x,le,tr,t in RINGS]
 exec(compile('def wingfn'+approved.split('def wingfn',1)[1].split('for side in [-1,1]:',1)[0],'airfoil-surface','exec'))
 def wing(side,sections=None,zoffset=0):
  global span
  saved=span
  if sections is not None:span=[(x,le,tr,zoffset,t) for x,le,tr,t in sections]
  xs=[q[0] for q in span]
  for upper in [True,False]:
   patch('Continuous lifting structure',wingfn(side,upper),xs[0],xs[-1],0,1,dark,26,20,.012)
   for k,(a,b) in enumerate(zip(xs,xs[1:])):
    for c,d in [(0,.13),(.139,.68),(.689,.995)]:
     col=blue if k==max(0,len(xs)-3) else (metal if c>.68 else white)
     patch('Fitted lifting skin',wingfn(side,upper,.009),a+.002,b-.002,c+.002,d-.002,col,8,9,.006)
   if upper:
    for x in xs[1:-1]:
     for t in [.20,.63]:bolt('Flush wing captive screw',wingfn(side,True,.012)(x,t),r=.004)
  span=saved
 def fairing(side,x,front,back,width,mat=blue,z=.08):
  sec=[(back,width*.53,z,width*.48),(back+.13,width,z,width*.77),((front+back)/2,width,z,width*.78),(front-.10,width*.42,z,width*.38),(front,.015,z,.019)]
  fn=shape(sec,side*x,.72)
  patch('Load-bearing shoulder fairing',fn,back,front,0,math.tau,mat,28,28,.01);cap('Sealed fairing aft',fn,back,mat)
  if width>.14:
   for a,b in [(back+.17,(back+front)/2-.015),((back+front)/2+.015,front-.17)]:
    patch('Fairing removable cover',shape(sec,side*x,.72,.007),a,b,.70,2.44,mat,7,10,.003)
  return fn
 def recessed_equipment(side,x,y,z,w=.18,h=.22):
  # Housing surrounds an actual deep recess; louver blades are below the rim.
  targets=[]
  for obj in s.objects:
   if obj.type=='MESH' and obj.name.startswith(('Load-bearing shoulder fairing','Fairing removable cover')):
    pts=[obj.matrix_world@Vector(v) for v in obj.bound_box]
    if min(v.x for v in pts)<side*x<max(v.x for v in pts) and min(v.y for v in pts)<y<max(v.y for v in pts):targets.append(obj)
  cut=box('Equipment recess cutter',(side*x,y,z), (w*.93,h*.94,.16),dark,.008)
  bpy.context.view_layer.objects.active=cut
  for m in list(cut.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
  for obj in targets:
   bpy.context.view_layer.objects.active=obj
   for m in list(obj.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
   m=obj.modifiers.new('Actual inset equipment recess','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=cut;bpy.ops.object.modifier_apply(modifier=m.name)
  bpy.data.objects.remove(cut,do_unlink=True)
  box('Equipment well backing',(side*x,y,z-.035),(w,h,.045),dark,.012)
  for dx in [-w/2,w/2]:box('Equipment well sidewall',(side*x+dx,y,z),(.011,h,.045),white,.003)
  for dy in [-h/2,h/2]:box('Equipment well endwall',(side*x,y+dy,z),(w,.010,.045),white,.003)
  for k in range(5):box('Recessed equipment vane',(side*x,y-h*.37+k*h*.18,z-.014),(w*.85,.009,.015),metal,.002)
 def crescent(side,aegis=False):
  # Variable-section structural arc, subdivided in section space with inset skins.
  pts=[(0,.53,-.75,.19),(.2,.97,-.60,.23),(.4,1.34,-.19,.23),(.6,1.37,.34,.21),(.8,1.10,.87,.17),(1,.75,1.23,.07)]
  def fn(t,a,off=0):
   x=interp(t,pts,1);y=interp(t,pts,2);w=interp(t,pts,3);lo=max(0,t-.005);hi=min(1,t+.005)
   d=Vector((interp(hi,pts,1)-interp(lo,pts,1),interp(hi,pts,2)-interp(lo,pts,2))).normalized();n=Vector((-d.y,d.x))
   return(side*(x+n.x*(w+off)*math.cos(a)),y+n.y*(w+off)*math.cos(a),.025+(.20 if aegis else .16)*math.sin(a)+off)
  patch('Continuous crescent shield spar',fn,0,1,0,math.tau,dark,50,32,.01)
  for k in range(7):
   for j in range(4):patch('Curved shield armor',lambda t,a:fn(t,a,.008),k/7+.004,(k+1)/7-.004,j*math.pi/2+.007,(j+1)*math.pi/2-.007,blue if j==0 else white,9,8,.007)
  for t in [0,1]:mesh('Closed shield termination',[fn(t,a) for a in np.linspace(0,math.tau,40,endpoint=False)],[tuple(range(40))],white)
 for side in [-1,1]:
  wing(side)
  # Three propulsion families: circular fighter petals, compact vector slots,
  # and flattened heavy chambers. Different throats and cowls, same depth rules.
  engine=textwrap.dedent(' nac='+approved.split(' nac=',1)[1].split(' # Functional plumbing')[0])
  prior=set(s.objects)
  if KIND in ['orbit','aegis','hammer','siege','carrier','guard']:
   engine=engine.replace('side*.79,1','side*.79,.48').replace('math.tau/12','math.tau/8').replace('range(12)','range(8)')
  elif LIGHT:
   engine=engine.replace('math.tau/12','math.tau/6').replace('range(12)','range(6)')
  exec(compile(engine,'deep-propulsion','exec'))
  for o in set(s.objects)-prior:
   xs=ENGINE_SCALE*(1.15 if HEAVY else 1);zs=ENGINE_SCALE*(.80 if HEAVY else .88 if LIGHT else 1)
   o.scale.x*=xs;o.scale.z*=zs;o.scale.y*=.88 if LIGHT else 1
   o.location.x=o.location.x*xs+side*ENGINE_SPAN-side*.79*xs;o.location.z*=zs
  fairing(side,(ENGINE_SPAN+.25*WIDTH)/2,.65,-1.25,.20 if HEAVY else .13,white,-.03)
  if KIND=='courier':
   before=set(s.objects);wing(side,[(.04,-.51,-1.17,.065),(.42,-.72,-1.11,.04),(.68,-.97,-1.09,.012)])
   for o in set(s.objects)-before:o.rotation_euler.y=side*-.98;o.location.x=side*.83;o.location.z=.19
  if KIND in ['needle','scope','spike','quartz','rail','railbreaker']:
   x={'needle':.30,'scope':.62,'spike':.51,'quartz':.27,'rail':.55,'railbreaker':.48}[KIND]
   for k in range(2 if KIND=='railbreaker' else 1):
    front=NOSE+.12 if KIND in ['rail','railbreaker'] else NOSE*.78
    fn=fairing(side,x+k*.29,front,-.91,.085 if KIND!='spike' else .14,blue,.08)
    if KIND in ['rail','railbreaker']:
     tube('Inset accelerator ceramic rail',[(side*(x+k*.29),y,.149) for y in np.linspace(-.42,front-.20,24)],.006,metal)
  if KIND in ['orbit','aegis']:crescent(side,KIND=='aegis')
  if KIND=='jaw':fairing(side,.97,1.66,-1.22,.30,white,.15)
  if KIND in ['fan','arc','plasma','burst']:
   x={'fan':1.46,'arc':1.32,'plasma':1.22,'burst':1.17}[KIND];fairing(side,x,.52 if KIND!='burst' else -.05,-.79,.07,dark,.10)
  if KIND=='hammer':fairing(side,1.12,.98,-.56,.25,blue,.08)
  if KIND in ['circuit','core','overdrive']:
   fairing(side,ENGINE_SPAN,.34,-.85,.13,blue,.22);recessed_equipment(side,ENGINE_SPAN,-.25,.326,.13,.35)
  if KIND=='fork':fairing(side,.71,1.65,-.72,.095,blue,.04)
  if KIND=='flow':fairing(side,.82,.73,-.75,.19,blue,.13)
  if KIND=='ram':fairing(side,.94,1.58,-.8,.19,blue,.08)
  if KIND=='seraph':
   for k in range(3):wing(side,[(.43,.39-k*.15,-.94-k*.13,.105),(1.05+k*.28,1.2-k*.39,.14-k*.57,.075),(1.42+k*.24,1.3-k*.41,.84-k*.61,.022)],.04+k*.024)
  if KIND=='viking':
   fn=fairing(side,.56,2.02,-.68,.16,blue,.12)
   # Shield motifs follow the actual transformed nacelle surface, not an
   # independent constant-radius shell floating above the tapered housing.
   def shieldfn(y,a):
    p=Vector(shape(nac,side*.79,.72,.016)(y,a));p.x=p.x*ENGINE_SCALE*1.15+side*ENGINE_SPAN-side*.79*ENGINE_SCALE*1.15;p.z*=ENGINE_SCALE*.80;return p
   for k in range(4):
    y=.21-k*.36;patch('Integrated longship shield armor',shieldfn,y-.13,y+.12,.55,2.60,blue,6,10,.004)
    tube('Longship armor center seam',[shieldfn(yy,math.pi/2) for yy in np.linspace(y-.10,y+.08,10)],.0015,dark)
  if KIND in ['siege','guard']:fairing(side,1.12,1.04,-.79,.19,blue,.18);recessed_equipment(side,1.12,-.37,.325,.18,.24)
  if KIND=='carrier':
   for k in range(3):
    x=.70+k*.31;y=.61-k*.15;fairing(side,x,y,-.95,.11,white,.19)
    box('Launch tunnel shadow recess',(side*x,y-.022,.235),(.12,.05,.075),dark,.01)
    for dx in [-.068,.068]:box('Launch bay structural jamb',(side*x+dx,y-.025,.235),(.012,.06,.09),metal,.003)
    box('Launch bay top lintel',(side*x,y-.025,.28),(.15,.06,.012),white,.003)
  # Conformal serial stencil: scale cue without an oversized raised nameplate.
  x=(RINGS[-2][0]+RINGS[-1][0])/2;y=sum(wingfn(side)(x,.45)[1:2])
  bpy.ops.object.text_add(location=(side*x,y,0));o=bpy.context.object;o.name='Flush maintenance stencil';o.data.body=f'NS-{ID:02d}';o.data.size=.040;o.data.align_x='CENTER';o.data.materials.append(dark);bpy.ops.object.convert(target='MESH')
  for vtx in o.data.vertices:
   p=o.matrix_world@vtx.co;le=interp(abs(p.x),span,1);tr=interp(abs(p.x),span,2);vtx.co.z=wingfn(side,True,.012)(abs(p.x),float(np.clip((p.y-le)/(tr-le),.02,.98)))[2]
 # Save editable mesh/modifier source with correct local image paths.
 tail='def area'+approved.split('def area',1)[1]
 tail=tail.replace("ROOT/'nova-sparrow-showcase.blend'","ROOT/'source.blend'").replace("OUT/'sparrow-showcase.glb'","OUT/'model.glb'")
 scale=max(4.8,NOSE+2.75,RINGS[-1][0]*2.65,5.6 if KIND in ['seraph','orbit','aegis'] else 0)
 tail=tail.replace('scale=4.8',f'scale={scale}')
 tail=tail.replace("bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh", "bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.calc_area()<1e-12],context='FACES');bm.to_mesh")
 exec(compile(tail,'showcase-export','exec'))
 (ROOT/'design.json').write_text(json.dumps({'id':ID,'name':NAME,'architecture':KIND,'baselineDesign':DESIGNS[ID],'palette':PALETTES[ID-1],'textureSize':N,'authoringDetail':DETAIL,'spriteGeneration':False},indent=2))
 print('FLEET_SHOWCASE_COMPLETE',ID,NAME,flush=True)
