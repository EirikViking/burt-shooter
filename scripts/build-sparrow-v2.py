"""Original Nova Sparrow art; Blender 4.5. Run from repo root.
blender -b --python scripts/build-sparrow-v2.py -- studies|final
No external assets. +Y forward, +Z dorsal, center pivot. glTF converts to Y-up.
"""
import bpy, math, os, sys, json
import numpy as np
from mathutils import Vector
ROOT=os.path.abspath('docs/ship-art-v2'); OUT=ROOT+'/export'
for p in [ROOT,OUT,ROOT+'/studies',ROOT+'/renders',OUT+'/textures']:os.makedirs(p,exist_ok=True)
MODE=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'studies'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
s=bpy.context.scene;s.world=bpy.data.worlds.new('World');s.world.use_nodes=True
s.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.25,.25,1)
s.world.node_tree.nodes['Background'].inputs[1].default_value=.35
s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True
try:
 pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices()
 for d in pref.devices:d.use=d.type!='CPU'
 if any(d.use for d in pref.devices):s.cycles.device='GPU'
except Exception:pass
s.render.resolution_x=1000;s.render.resolution_y=800;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=False
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
def mat(name,c,metal=0,rough=.45):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 return m
white=mat('Ceramic white painted alloy',(.63,.68,.71),.05,.43)
blue=mat('Sparrow cobalt enamel',(.016,.095,.31),.08,.39)
dark=mat('Recessed graphite structure',(.018,.026,.036),.35,.56)
metal=mat('Satin titanium',(.22,.27,.31),.82,.36)
glass=mat('Smoked blue laminated canopy',(.012,.055,.079),.15,.16)
glass.node_tree.nodes['Principled BSDF'].inputs['Coat Weight'].default_value=.5
glow=mat('Recessed ion ceramic',(.028,.30,.65),.05,.3)
glow.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(.025,.34,.8,1)
glow.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=2.2
clay=mat('Neutral grey clay',(.32,.32,.32),0,.65)
def mesh(name,verts,faces,material,bevel=0,smooth=False):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(material)
 for p in me.polygons:p.use_smooth=smooth
 if bevel:
  b=o.modifiers.new('Controlled edge radius','BEVEL');b.width=bevel;b.segments=3
  o.modifiers.new('Area weighted normals','WEIGHTED_NORMAL')
 return o
def loft(name,rings,material,x=0,n=24,sub=1):
 # elliptical sections design the volume continuously; no stacked plate shells
 v=[(x+w*math.cos(j*math.tau/n),y,z+h*math.sin(j*math.tau/n)) for y,w,z,h in rings for j in range(n)]
 f=[tuple(reversed(range(n))),tuple(range((len(rings)-1)*n,len(rings)*n))]
 f += [(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(rings)-1) for j in range(n)]
 o=mesh(name,v,f,material,bevel=.012 if sub==0 else 0,smooth=sub>0)
 if sub:b=o.modifiers.new('Fair hull curvature','SUBSURF');b.levels=sub
 return o
def wing(side,variant=0):
 # Spanwise sections: leading edge, trailing edge, center height, thickness.
 sets=[[(.18,.50,-1.15,0,.13),(.48,.42,-1.22,.015,.16),(.86,.03,-1.28,.025,.15),(1.28,-.36,-1.16,.045,.09),(1.69,-.68,-1.06,.095,.026)],
       [(.21,.65,-1.15,0,.23),(.60,.61,-1.2,.015,.18),(1.20,.21,-1.02,.035,.10),(1.65,-.05,-.63,.10,.03)],
       [(.22,.5,-1.2,0,.24),(.6,.28,-1.15,0,.17),(1.1,.62,-.9,.04,.09),(1.68,.83,-.55,.12,.03)]]
 rings=sets[variant];v=[]
 # Closed airfoil chord, rounded leading edge, fine trailing edge.
 profile=[(0,0),(.08,.65),(.30,1),(.68,.67),(1,0),(.68,-.46),(.30,-.64),(.08,-.45)]
 for x,lead,trail,z,t in rings:
  v += [(side*x,lead+(trail-lead)*u,z+t*h) for u,h in profile]
 n=len(profile);f=[tuple(reversed(range(n))),tuple(range((len(rings)-1)*n,len(rings)*n))]
 f += [(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(rings)-1) for j in range(n)]
 o=mesh('Port blended lifting body' if side<0 else 'Starboard blended lifting body',v,f,white,bevel=.012)
 o.data.materials.append(blue)
 for p in o.data.polygons:
  if p.index>=2 and (p.index-2)//n==2:p.material_index=1
 return o
def tube(name,points,r,material):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2
 p=c.splines.new('POLY');p.points.add(len(points)-1)
 for a,co in zip(p.points,points):a.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);c.materials.append(material);return o
def shell(name,xy,z,t,material):
 n=len(xy);return mesh(name,[(x,y,z) for x,y in xy]+[(x,y,z+t) for x,y in xy],[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)],material,.005)
def nozzle(x):
 # A single contoured nozzle with an actual interior; no decorative collars.
 sections=[(-1.12,.185),(-1.36,.206),(-1.52,.18),(-1.53,.15),(-1.38,.136),(-1.20,.105)]
 n=32;v=[(x+r*math.cos(j*math.tau/n),y,.09+r*math.sin(j*math.tau/n)) for y,r in sections for j in range(n)]
 f=[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(sections)-1) for j in range(n)]
 mesh('Contoured expansion nozzle',v,f,metal,smooth=True)
 for j in range(12):
  a=j*math.tau/12;tube('Nozzle petal seam',[(x+r*math.cos(a),y,.09+r*math.sin(a)) for y,r in sections[1:3]],.004,dark)
 loft('Deep ion throat',[(-1.205,.104,.09,.104),(-1.19,.10,.09,.10)],glow,x,n=32,sub=0)
def build(variant=0,detail=False):
 for o in list(s.objects):
  if o.type in {'MESH','CURVE','FONT'}:bpy.data.objects.remove(o,do_unlink=True)
 loft('Continuous pressure fuselage',[(-1.30,.17,-.015,.15),(-1.26,.25,-.005,.21),(-.85,.39,0,.255),(-.3,.43,.015,.29),(.30,.35,.025,.255),(.76,.25,.005,.19),(1.26,.14,-.015,.11),(1.62,.015,-.045,.025),(1.64,.008,-.045,.012)],white,sub=2)
 for side in [-1,1]:
  wing(side,variant)
  # Deep chines grow from fuselage into each nacelle, integrating attachment.
  nacelle=loft('Integrated nacelle shoulder',[(-1.34,.18,.055,.18),(-1.22,.25,.08,.23),(-.70,.265,.08,.24),(-.22,.23,.07,.205),(.14,.18,.045,.155),(.35,.105,.03,.10),(.39,.09,.03,.08)],white,side*.79,n=12,sub=0)
  nacelle.data.materials.append(blue)
  for p in nacelle.data.polygons:
   if p.center.z>.24:p.material_index=1
   p.use_smooth=True
  # Open the inlet face; a recessed duct has actual depth behind its rim.
  import bmesh
  bm=bmesh.new();bm.from_mesh(nacelle.data);bm.faces.ensure_lookup_table();bmesh.ops.delete(bm,geom=[bm.faces[0],bm.faces[1]],context='FACES');bm.to_mesh(nacelle.data);bm.free()
  nacelle.data.set_sharp_from_angle(angle=.45)
  nacelle.modifiers['Area weighted normals'].keep_sharp=True
  if detail:
   nozzle(side*.79)
   # Hollow intake liner extends rearward from the inlet, terminating inside.
   nr=24;rings=[(.387,.081,.071),(.30,.072,.063),(.23,.061,.051)]
   vv=[(side*.79+w*math.cos(j*math.tau/nr),y,.03+h*math.sin(j*math.tau/nr)) for y,w,h in rings for j in range(nr)]
   ff=[(i*nr+j,i*nr+(j+1)%nr,(i+1)*nr+(j+1)%nr,(i+1)*nr+j) for i in range(2) for j in range(nr)]+[tuple(range(2*nr,3*nr))]
   mesh('Recessed intake duct',vv,ff,dark,smooth=True)
   tube('Inlet separator vane',[(side*.79,.27,-.01),(side*.79,.29,.067)],.006,metal)
   # Aft heat panel is shaped to the shoulder, not a raised box.
   loft('Integrated wing cannon fairing',[(-.69,.06,.09,.055),(-.58,.095,.09,.085),(-.15,.085,.09,.07),(.10,.045,.09,.045),(.19,.037,.09,.037)],dark,side*1.23,sub=1)
   loft('Recessed muzzle',[(.19,.026,.09,.026),(.208,.026,.09,.026)],metal,side*1.23,sub=0)
   loft('Muzzle bore',[(.210,.017,.09,.017),(.211,.017,.09,.017)],dark,side*1.23,sub=0)
   # Flush underside landing-door outlines and actual conforming belly chine.
   shell('Ventral access door',[(side*.13,-.81),(side*.29,-.72),(side*.28,-.29),(side*.15,-.24)],-.246,.009,metal)
   tube('Keel separation seam',[(side*.09,1.18,-.104),(side*.17,.60,-.175),(side*.23,-.06,-.250),(side*.16,-.91,-.203)],.004,dark)
   for k in range(4):
    y=-.92+k*.08
    tube('Aft flush radiator slot',[(side*.31,y,.186),(side*.42,y-.015,.177)],.008,dark)
   # tiny navigation lenses, scale disciplined
   loft('Wing navigation lens',[(-.90,.015,.12,.013),(-.86,.015,.12,.013)],glow,side*1.56,n=12,sub=0)
 # Canopy is a low elongated glazing volume buried into a designed coaming.
 loft('Cockpit integrated coaming',[(-.36,.16,.245,.045),(-.28,.22,.26,.09),(.02,.225,.27,.12),(.46,.17,.235,.10),(.80,.05,.162,.04),(.84,.026,.15,.02)],dark,sub=2)
 loft('Pressure canopy glazing',[(-.30,.145,.294,.024),(-.20,.183,.306,.097),(.06,.185,.308,.12),(.43,.138,.271,.097),(.73,.038,.195,.028),(.76,.024,.181,.016)],glass,sub=2)
 if detail:
  for side in [-1,1]:tube('Canopy lower frame',[(side*.12,-.28,.316),(side*.18,-.13,.34),(side*.18,.09,.348),(side*.132,.44,.301),(side*.034,.745,.199)],.009,metal)
  tube('Canopy pressure bow',[(-.172,-.12,.342),(-.125,-.12,.392),(0,-.12,.414),(.125,-.12,.392),(.172,-.12,.342)],.010,white)
  # Low dorsal spine joins cockpit to aft machinery.
  loft('Ventral auxiliary exhaust',[(-1.285,.10,-.025,.08),(-1.29,.10,-.025,.08)],dark,n=24,sub=0)
def surface_maps():
 # Authored panel atlas, no illumination or specular painted into base color.
 # Fine detail lives in maps. No remote imagery or downloaded textures.
 n=1024;axis=(np.arange(n)+.5)/n*3.6-1.8;X,Y=np.meshgrid(axis,axis)
 seam=np.zeros((n,n),dtype=np.float32)
 def line(a,b,width=.006):
  nonlocal seam
  ax,ay=a;bx,by=b;dx=bx-ax;dy=by-ay
  t=np.clip(((X-ax)*dx+(Y-ay)*dy)/(dx*dx+dy*dy),0,1)
  dist=np.sqrt((X-ax-t*dx)**2+(Y-ay-t*dy)**2)
  seam=np.maximum(seam,np.clip((width-dist)/.003,0,1))
 def path(points):
  for a,b in zip(points,points[1:]):line(a,b)
 for side in [-1,1]:
  def mirror(points):return [(side*x,y) for x,y in points]
  path(mirror([(.48,.25),(.66,.08),(.61,-.45),(.46,-.71),(.48,.25)]))
  path(mirror([(.98,-.19),(1.52,-.68),(1.52,-.99),(1.11,-1.04),(.98,-.19)]))
  path(mirror([(1.22,-.80),(1.56,-.85)]))
  path(mirror([(.67,-.92),(.91,-.92),(.93,-.49),(.66,-.49),(.67,-.92)]))
  path(mirror([(.15,.66),(.08,1.20),(0,1.37)]))
  path(mirror([(.16,-1.06),(.25,-.91),(.24,-.48)]))
  # Discreet access fastener heads; 8mm-scale against a ~14m vehicle.
  for x,y in mirror([(.68,-.86),(.89,-.86),(1.44,-.87),(1.12,-.37)]):
   d=np.sqrt((X-x)**2+(Y-y)**2);seam=np.maximum(seam,np.clip((.007-d)/.002,0,1)*.55)
 rng=np.random.default_rng(207);noise=rng.normal(0,.006,(n,n)).astype(np.float32)
 # Broad subtle finish variation plus very fine grain. Fully isotropic lighting-free.
 rough=np.clip(.44+.018*np.sin(X*13+Y*7)+noise+seam*.16,.34,.66)
 height=-seam*.002
 dy,dx=np.gradient(height,3.6/n);norm=np.dstack((-dx,-dy,np.ones_like(dx)));norm/=np.linalg.norm(norm,axis=2)[...,None]
 def save(name,rgb,space):
  im=bpy.data.images.new(name,width=n,height=n,alpha=True);im.colorspace_settings.name=space
  rgba=np.dstack((rgb,np.ones((n,n)))).astype(np.float32);im.pixels.foreach_set(rgba.ravel());im.filepath_raw=OUT+'/textures/'+name+'.png';im.file_format='PNG';im.save();return im
 normal=save('panel-normal',norm*.5+.5,'Non-Color')
 orm=save('paint-orm',np.dstack((np.ones_like(X),rough,np.full_like(X,.06))),'Non-Color')
 for material,col in [(white,(.80,.825,.84)),(blue,(.10,.32,.60))]:
  rgb=np.ones((n,n,3))*np.array(col);rgb*=1-seam[...,None]*.44
  if material==white:
   livery=(np.abs(X)<.10)&(Y<-.37)&(Y>-1.12)
   rgb[livery]=(.10,.32,.60)
  # Tiny registration bars on aft shoulders; these are albedo marks, not light.
  mark=(np.abs(X-.80)<.043)&(Y>-.79)&(Y<-.65)&((Y*95)%1<.52)
  rgb[mark]=(.72,.79,.81) if material==blue else (.19,.26,.32)
  base=save('white-basecolor' if material==white else 'cobalt-basecolor',rgb,'sRGB')
  nodes=material.node_tree.nodes;links=material.node_tree.links;p=nodes['Principled BSDF']
  tex=nodes.new('ShaderNodeTexImage');tex.image=base;links.new(tex.outputs['Color'],p.inputs['Base Color'])
  tex=nodes.new('ShaderNodeTexImage');tex.image=orm;sep=nodes.new('ShaderNodeSeparateColor');links.new(tex.outputs['Color'],sep.inputs['Color']);links.new(sep.outputs['Green'],p.inputs['Roughness']);links.new(sep.outputs['Blue'],p.inputs['Metallic'])
  tex=nodes.new('ShaderNodeTexImage');tex.image=normal;nm=nodes.new('ShaderNodeNormalMap');links.new(tex.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],p.inputs['Normal'])
 # UVs reflect physical hull coordinates; side faces use a nondegenerate plane.
 for o in list(s.objects):
  if o.type!='MESH':continue
  uv=o.data.uv_layers.new(name='HullAtlas')
  for poly in o.data.polygons:
   for li in poly.loop_indices:
    v=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
    if abs(poly.normal.z)>.25:a,b=v.x,v.y
    elif abs(poly.normal.x)>.5:a,b=v.y,v.z-1.35
    else:a,b=v.x,v.z-1.35
    uv.data[li].uv=((a+1.8)/3.6,(b+1.8)/3.6)
def area(name,loc,energy,size,color=(1,1,1)):
 d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size;d.color=color
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
area('Broad neutral key',(-3,4,7),650,5);area('Neutral fill',(4,-2,4),350,5)
bpy.ops.object.camera_add(location=(4.5,7,6));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=4.9;s.camera=cam
def camera(loc,scale=4.9):cam.location=loc;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
def render(path,clay_view=False):
 s.view_layers[0].material_override=clay if clay_view else None;s.render.filepath=path;bpy.ops.render.render(write_still=True);s.view_layers[0].material_override=None
if MODE=='studies':
 for i,name in enumerate(['01-swept-interceptor','02-cranked-arrow','03-forward-sweep']):
  build(i);camera((0,-.001,8),4.5);render(ROOT+'/studies/'+name+'-top.png',True)
  camera((4.5,7,6));render(ROOT+'/studies/'+name+'-clay.png',True)
 # Reuse exact source bytes to compare clay under the same neutral scene.
 for o in list(s.objects):
  if o.type in {'MESH','CURVE','FONT'}:bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.import_scene.gltf(filepath=os.path.abspath('public/art/solid-fleet-20260908/01.glb'))
 camera((4.5,7,6));render(ROOT+'/renders/before-clay.png',True)
else:
 build(0,True)
 camera((4.5,7,6));render(ROOT+'/renders/after-clay.png',True)
 camera((5,0,1));render(ROOT+'/renders/side-clay.png',True)
 camera((3,-6,-4));render(ROOT+'/renders/underside-clay.png',True)
 surface_maps()
 # Save editable collection before non-destructive export copies are flattened.
 for im in bpy.data.images:
  if im.filepath:im.filepath=bpy.path.relpath(im.filepath,start=ROOT)
 bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/nova-sparrow-v2.blend')
 bpy.ops.object.select_all(action='DESELECT')
 for o in s.objects:
  if o.type in {'MESH','CURVE'}:o.select_set(True)
 bpy.context.view_layer.objects.active=next(o for o in s.objects if o.type=='MESH')
 bpy.ops.object.convert(target='MESH');bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 bpy.ops.object.join();model=bpy.context.object;model.name='NovaSparrowV2'
 import bmesh
 bm=bmesh.new();bm.from_mesh(model.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(model.data);bm.free()
 bpy.ops.export_scene.gltf(filepath=OUT+'/nova-sparrow.glb',export_format='GLB',use_selection=True,export_yup=True,export_cameras=False,export_lights=False)
 s.render.film_transparent=True;s.render.resolution_x=s.render.resolution_y=1024
 camera((0,-4.5,12),3.3716378211975098*1.23);render(OUT+'/showroom.png')
 s.render.resolution_x=s.render.resolution_y=512;camera((0,-.15,14),3.3716378211975098*1.23);render(OUT+'/player.png')
 camera((4.5,7,6));s.render.resolution_x=1200;s.render.resolution_y=900;s.render.film_transparent=False;render(ROOT+'/renders/surfaced.png')
 print('SPARROW_EXPORT_COMPLETE',len(model.data.vertices),len(model.data.polygons))
