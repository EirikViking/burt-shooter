"""Original Blender enemy hulls. Writes only docs/tractor-fleet and public/art/tractor-fleet.
Blender -b --python scripts/build-tractor-fleet.py. Generated PBR surfaces are rendered into combat sprites.
"""
import bpy, math, json
from mathutils import Vector
from pathlib import Path
ROOT=Path('docs/tractor-fleet');OUT=ROOT/'blockout-renders';OUT.mkdir(parents=True,exist_ok=True)
profiles=json.loads((ROOT/'design.json').read_text())
outlines={
'lance':[(-.35,-3),(-.7,-1),(-.55,2.5),(0,3),(.55,2.5),(.7,-1),(.35,-3),(0,-1.7)],
'manta':[(-3,-.1),(-2,-1.5),(-.7,-1),(0,-1.6),(.7,-1),(2,-1.5),(3,-.1),(1.2,1.5),(0,2),(-1.2,1.5)],
'hammer':[(-2.6,-1.8),(-2.6,-.6),(-.65,-.3),(-.65,2.7),(.65,2.7),(.65,-.3),(2.6,-.6),(2.6,-1.8),(1,-2.3),(-1,-2.3)],
'catamaran':[(-2,-2.5),(-2.4,-1.6),(-2.1,2),(2.1,2),(2.4,-1.6),(2,-2.5),(1.2,-2),(1.2,1),(-1.2,1),(-1.2,-2)],
'helix':[(-2.4,-2),(-1.2,-2.5),(.3,-1.7),(.1,-.4),(1.8,.2),(2.2,2),(1.1,2.5),(.5,1.2),(-1.5,.6),(-1.8,-.8)],
'citadel':[(-2,-1.8),(-2.7,0),(-2,2),(0,2.7),(2,2),(2.7,0),(2,-1.8),(.8,-2.4),(-.8,-2.4)],
'crescent':[(-3,-1.5),(-2.5,1),(-1,2.3),(1,2.3),(2.5,1),(3,-1.5),(1.7,-.1),(0,.6),(-1.7,-.1)],
'anchor':[(-2.7,-2),(-2.3,-.2),(-.55,.3),(-.5,2.5),(.5,2.5),(.55,.3),(2.3,-.2),(2.7,-2),(1.2,-1.1),(0,-1.6),(-1.2,-1.1)],
'barge':[(-1.8,-2.7),(-2.2,-1.3),(-2.1,2.5),(-.9,2.7),(-.7,2),(.7,2),(.9,2.7),(2.1,2.5),(2.2,-1.3),(1.8,-2.7)],
'winch':[(-1.4,-2),(-2.4,-.7),(-2.1,1.8),(-.5,2.3),(.5,2.3),(2.1,1.8),(2.4,-.7),(1.4,-2),(0,-1.4)],
'trident':[(-2.4,-2.6),(-2.5,1.5),(-1.2,2.2),(1.2,2.2),(2.5,1.5),(2.4,-2.6),(1.55,-2),(1.4,.3),(.5,.2),(.25,-3),(-.25,-3),(-.5,.2),(-1.4,.3),(-1.55,-2)],
'asymmetric':[(-2.6,-.5),(-2.1,2.2),(-.7,2.4),(0,1),(2.9,.9),(2.5,-.5),(.4,-.9),(0,-2.7),(-.65,-2.5),(-.9,-.9)],
'pincer':[(-2,-2.7),(-2.8,-.6),(-2.2,1.8),(0,2.6),(2.2,1.8),(2.8,-.6),(2,-2.7),(1.2,-1.7),(1.55,-.1),(.6,.8),(-.6,.8),(-1.55,-.1),(-1.2,-1.7)],
'chalice':[(-1.2,-2.5),(-2.3,-1.5),(-2.5,1.7),(-1.5,2.4),(0,1.6),(1.5,2.4),(2.5,1.7),(2.3,-1.5),(1.2,-2.5),(1.2,-.1),(0,.7),(-1.2,-.1)],
'scorpion':[(-2,-2),(-2.5,-.2),(-1.3,1.2),(-.5,1.4),(-.2,3),(1.2,3),(1.8,2.3),(.55,2),(.4,1.2),(2.3,-.4),(1.6,-2.4),(.7,-1.2),(-.6,-1.2)]}
def material(name,color,metal,rough,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 else:
  tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=48;tex.inputs['Detail'].default_value=2
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.11;bump.inputs['Distance'].default_value=.016;m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
 return m
def rgb(v):return tuple(((v>>n)&255)/255 for n in (16,8,0))
def hull(name,points,mat,z=0,height=.5):
 # A shaped pressure shell: keel, shoulder and inset crown, not stacked plates.
 n=len(points);cx=sum(v[0] for v in points)/n;cy=sum(v[1] for v in points)/n
 verts=[(cx+(x-cx)*scale,cy+(y-cy)*scale,z+h) for scale,h in [(.78,-.18),(.99,.05),(.95,height*.68),(.73,height)] for x,y in points]
 faces=[tuple(range(n-1,-1,-1))]
 for j in range(3):
  for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
 faces.append(tuple(range(n*3,n*4)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 bevel=o.modifiers.new('Machined edge radii','BEVEL');bevel.width=.045;bevel.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
def cylinder(name,loc,r,depth,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(mat);b=o.modifiers.new('Edge radii','BEVEL');b.width=.028;b.segments=3;o.modifiers.new('Normals','WEIGHTED_NORMAL');return o
def tube(name,pts,r,mat):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('POLY');s.points.add(len(pts)-1)
 for p,xyz in zip(s.points,pts):p.co=(*xyz,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o
for p in profiles:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
 try:
  pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices()
  for d in pref.devices:d.use=d.type!='CPU'
  if any(d.use for d in pref.devices):scene.cycles.device='GPU'
 except:pass
 paint=material('Maintained painted armor',tuple(c*.20 for c in rgb(p['paint'])),.48,.42);trim=material('Ceramic identification panels',tuple(c*.42 for c in rgb(p['accent'])),.35,.39);steel=material('Titanium machinery',(.055,.075,.095),.82,.35);dark=material('Recessed machinery',(.012,.021,.03),.4,.58);glow=material('Graviton optic',rgb(p['color']),.25,.2,2)
 pts=outlines[p['hull']];body=hull(p['name'],pts,paint,height=.40)
 # Recessed central projector. Catamarans/claws mount theirs on the rear bridge.
 emitterY=.85 if p['hull'] in ['catamaran','crescent','trident','pincer','chalice'] else -.8
 cylinder('Recessed projector seat',(0,emitterY,.41),.61,.10,dark)
 cylinder('Optical cavity',(0,emitterY,.44),.44,.06,steel)
 cylinder('Deep focusing lens',(0,emitterY,.48),.30,.055,glow)
 for i in range(8):
  a=i*math.tau/8;hull('Radial iris segment',[(math.cos(a+d)*r,emitterY+math.sin(a+d)*r) for r,d in [(.34,-.12),(.54,-.10),(.54,.09),(.34,.12)]],steel,z=.47,height=.075)
 # Fit individual armor fields to each perimeter sector; the scale stays mechanical.
 for i,(x,y) in enumerate(pts):
  if i%2==0:
   cx=x*.62;cy=y*.62
   hull('Inset service armor',[(cx-.18,cy-.22),(cx+.18,cy-.22),(cx+.15,cy+.25),(cx-.15,cy+.25)],trim,z=.41,height=.06)
  if i%3==0:
   tube('Recessed coolant trunk',[(x*.86,y*.86,.26),(x*.69,y*.69,.36)],.065,steel)
 # Fitted armor seams follow the pressure-shell perimeter; transverse strips are heat exchangers.
 for scale,z in [(.72,.417),(.82,.32)]:
  tube('Recessed hull seam',[(x*scale,y*scale,z) for x,y in pts]+[(pts[0][0]*scale,pts[0][1]*scale,z)],.014,dark)
 if p['hull'] in ['citadel','barge','winch','manta','hammer']:
  for side in [-1,1]:
   hull('Raised shielded power conduit',[(side*.75,-1.6),(side*1.25,-1.15),(side*1.25,1.6),(side*.75,1.3)],steel,z=.43,height=.17)
   for k in range(7):tube('Inset cooling vane',[(side*.79,-.8+k*.19,.62),(side*1.16,-.8+k*.19,.62)],.03,dark)
 # Separate aft propulsion housings integrated with each hull's actual shoulder.
 for side in ([-1,0,1] if p['hull'] in ['citadel','barge','trident'] else [0] if p['hull'] in ['lance','anchor','scorpion'] else [-1,1]):
  x=side*(1.35 if p['hull'] in ['catamaran','manta','barge','trident'] else .62)
  hull('Propulsion fairing',[(x-.22,1),(x-.30,1.9),(x-.22,2.35),(x+.22,2.35),(x+.3,1.9),(x+.22,1)],steel,z=.42,height=.35)
  for k in range(4):tube('Heat exchanger',[(x-.19,1.3+k*.13,.80),(x+.19,1.3+k*.13,.80)],.026,dark)
  cylinder('Ion outlet',(x,2.15,.80),.12,.03,glow)
 scene.world=bpy.data.worlds.new('Space fill');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.4,.5,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.18
 for name,loc,power,color,size in [('Warm key',(-4,-4,7),450,(1,.83,.65),5),('Cool fill',(4,1,5),280,(.52,.75,1),4),('Rim',(0,5,4),550,(.72,.83,1),3)]:
  light=bpy.data.lights.new(name,'AREA');light.energy=power;light.color=color;light.shape='DISK';light.size=size;o=bpy.data.objects.new(name,light);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
 cam=bpy.data.cameras.new('Combat camera');o=bpy.data.objects.new('Combat camera',cam);bpy.context.collection.objects.link(o);o.location=(0,-3.4,11);o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler();cam.type='ORTHO';cam.ortho_scale=7.3;scene.camera=o
 scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='AgX'
 folder=ROOT/'ships'/p['id'];folder.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str((folder/'source.blend').resolve()))
 scene.render.filepath=str((OUT/(p['id']+'.png')).resolve());bpy.ops.render.render(write_still=True);print('TRACTOR_HULL_COMPLETE',p['id'],flush=True)
