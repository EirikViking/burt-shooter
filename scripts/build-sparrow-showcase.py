"""Nova Sparrow close-up showcase. Original local geometry and baked image maps.
Blender 4.5: blender -b --python scripts/build-sparrow-showcase.py
Only writes docs/sparrow-showcase; NEVER renders or installs combat sprites.
Author axes +Y forward, +Z dorsal; approximately 5 metres per author unit.
"""
import bpy, math, os, json
import numpy as np
from mathutils import Vector
from pathlib import Path
ROOT=Path('docs/sparrow-showcase').resolve(); OUT=ROOT/'export'; TEX=OUT/'textures'
for p in [OUT,TEX,ROOT/'renders']:p.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=48;s.cycles.use_denoising=True
try:
 pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices()
 for d in pref.devices:d.use=d.type!='CPU'
 if any(d.use for d in pref.devices):s.cycles.device='GPU'
except Exception:pass
s.world=bpy.data.worlds.new('Neutral inspection world');s.world.use_nodes=True
s.world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.35,.39,1)
s.world.node_tree.nodes['Background'].inputs[1].default_value=.4
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
s.render.resolution_x=1440;s.render.resolution_y=1080;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
def material(name,color,metal,rough):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
 p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 return m
white=material('Off-white aerospace polyurethane',(.68,.70,.69),.04,.47)
blue=material('Cobalt blue painted alloy',(.018,.070,.21),.04,.43)
dark=material('Graphite structural composite',(.028,.035,.044),.25,.63)
rubber=material('Seals and cabin upholstery',(.012,.017,.020),0,.83)
metal=material('Brushed titanium fittings',(.26,.29,.31),.82,.39)
heat=material('Heat-oxidised exhaust alloy',(.18,.135,.10),.84,.48)
inner=material('Sooted nozzle liner',(.035,.030,.026),.55,.74)
glass=material('Laminated cockpit glazing',(.018,.035,.041),0,.085)
g=glass.node_tree.nodes['Principled BSDF'];g.inputs['Alpha'].default_value=.24;g.inputs['Coat Weight'].default_value=.5;g.inputs['IOR'].default_value=1.46
glass.surface_render_method='DITHERED';glass.diffuse_color=(.018,.035,.041,.24)
light=material('Dim ion throat and instrument phosphor',(.07,.24,.33),.1,.45)
p=light.node_tree.nodes['Principled BSDF'];p.inputs['Emission Color'].default_value=(.04,.22,.33,1);p.inputs['Emission Strength'].default_value=.65
clay=material('Neutral inspection clay',(.38,.38,.38),0,.75)

# Material maps are lighting-free. Physical panel gaps are geometry; the maps
# provide finish grain, local roughness variation and shallow manufacturing marks.
N=2048;rng=np.random.default_rng(731);u,v=np.meshgrid(np.arange(N)/N,np.arange(N)/N)
grain=rng.normal(0,1,(N,N)).astype(np.float32)
variation=.009*np.sin(u*53+v*17)+.008*np.sin(u*111-v*31)+grain*.002
X=u*4-2;Y=v*4-2;seams=np.zeros_like(u);dirt=np.zeros_like(u)
def line(ax,ay,bx,by,width=.0023):
 global seams,dirt
 dx=bx-ax;dy=by-ay;t=np.clip(((X-ax)*dx+(Y-ay)*dy)/(dx*dx+dy*dy),0,1)
 dist=np.sqrt((X-ax-t*dx)**2+(Y-ay-t*dy)**2)
 seams=np.maximum(seams,np.clip((width-dist)/.0012,0,1))
 dirt=np.maximum(dirt,np.exp(-dist*dist/.00012)*.10)
for side in [-1,1]:
 for xa,xb,ya,yb in [(.65,.87,-.76,-.48),(1.08,1.32,-.91,-.70),(.12,.24,.85,1.12),(.72,.87,-1.10,-.92)]:
  points=[(xa,ya+.025),(xa+.025,ya),(xb-.025,ya),(xb,ya+.025),(xb,yb-.025),(xb-.025,yb),(xa+.025,yb),(xa,yb-.025),(xa,ya+.025)]
  for a,b in zip(points,points[1:]):line(side*a[0],a[1],side*b[0],b[1])
  for x in [xa+.027,xb-.027]:
   for y in [ya+.032,yb-.032]:
    dist=np.sqrt((X-side*x)**2+(Y-y)**2);seams=np.maximum(seams,np.clip((.004-dist)/.0015,0,1)*.7)
def image(name,rgb,space):
 im=bpy.data.images.new(name,width=N,height=N,alpha=True);im.colorspace_settings.name=space
 im.pixels.foreach_set(np.dstack([rgb,np.ones((N,N))]).astype(np.float32).ravel());im.filepath_raw=str(TEX/(name+'.png'));im.file_format='PNG';im.save();return im
rough=np.clip(.49+variation*4+grain*.018+dirt*.8+seams*.15,.30,.75)
orm=image('paint-orm',np.dstack([np.ones_like(u),rough,np.full_like(u,.04)]),'Non-Color')
# Fine normal detail is subtle and nondirectional, never a painted highlight.
dy,dx=np.gradient(-seams*.0007,4/N)
norm=np.dstack([-dx+grain*.005,-dy+np.roll(grain,1,0)*.005,np.ones_like(u)]);norm/=np.linalg.norm(norm,axis=2)[...,None]
normal=image('finish-normal',norm*.5+.5,'Non-Color')
for mat,col in [(white,(.78,.795,.785)),(blue,(.085,.225,.43))]:
 rgb=np.clip((np.array(col)[None,None,:]+variation[...,None])*(1-dirt[...,None]-seams[...,None]*.35),0,1)
 base=image('white-basecolor' if mat==white else 'cobalt-basecolor',rgb,'sRGB')
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=nodes['Principled BSDF']
 tex=nodes.new('ShaderNodeTexImage');tex.image=base;links.new(tex.outputs['Color'],p.inputs['Base Color'])
 tex=nodes.new('ShaderNodeTexImage');tex.image=orm;sep=nodes.new('ShaderNodeSeparateColor');links.new(tex.outputs['Color'],sep.inputs['Color']);links.new(sep.outputs['Green'],p.inputs['Roughness']);links.new(sep.outputs['Blue'],p.inputs['Metallic'])
 tex=nodes.new('ShaderNodeTexImage');tex.image=normal;nm=nodes.new('ShaderNodeNormalMap');links.new(tex.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],p.inputs['Normal'])
# Oxidation is a material colour change, never a baked specular highlight.
heatRGB=np.dstack([.27+.025*np.sin(u*75),.22+.035*np.sin(v*43+u*4),.18+.045*np.sin(v*29)])+grain[...,None]*.006
hot=image('nozzle-oxidation',np.clip(heatRGB,0,1),'sRGB')
tex=heat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=hot;heat.node_tree.links.new(tex.outputs['Color'],heat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])

def mesh(name,verts,faces,mat,bevel=0,smooth=False):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(mat)
 for f in me.polygons:f.use_smooth=smooth
 uv=me.uv_layers.new(name='Manufacturing surface UV')
 for f in me.polygons:
  for li in f.loop_indices:
   p=me.vertices[me.loops[li].vertex_index].co
   a,b=(p.x,p.y) if abs(f.normal.z)>.45 else ((p.y,p.z) if abs(f.normal.x)>.45 else (p.x,p.z))
   uv.data[li].uv=((a+2)/4,(b+2)/4)
 if bevel:
  b=o.modifiers.new('Manufactured edge radius','BEVEL');b.width=bevel;b.segments=3
  n=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');n.keep_sharp=True
 return o
def solid(o,t=.008):
 m=o.modifiers.new('Shell thickness','SOLIDIFY');m.thickness=t;m.offset=-1
 m.use_quality_normals=True
 b=o.modifiers.new('Small edge radius','BEVEL');b.width=.0008;b.segments=2
 b.harden_normals=True
 n=o.modifiers.new('Preserve fair skin normals','WEIGHTED_NORMAL');n.keep_sharp=True;n.weight=40
 return o
def patch(name,fn,a,b,c,d,mat,nu=10,nv=12,thickness=.006):
 verts=[fn(x,y) for x in np.linspace(a,b,nu+1) for y in np.linspace(c,d,nv+1)]
 faces=[(i*(nv+1)+j,(i+1)*(nv+1)+j,(i+1)*(nv+1)+j+1,i*(nv+1)+j+1) for i in range(nu) for j in range(nv)]
 o=mesh(name,verts,faces,mat,smooth=True)
 if thickness:solid(o,thickness)
 return o
def interp(y,sections,k):
 # Cubic smooth interpolation avoids faceted section transitions.
 ys=[p[0] for p in sections];i=max(0,min(len(ys)-2,np.searchsorted(ys,y)-1));t=np.clip((y-ys[i])/(ys[i+1]-ys[i]),0,1)
 p0=sections[max(0,i-1)][k];p1=sections[i][k];p2=sections[i+1][k];p3=sections[min(len(ys)-1,i+2)][k]
 return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)
def shape(sections,x=0,exponent=.80,offset=0):
 def fn(y,a):
  w=interp(y,sections,1);z=interp(y,sections,2);h=interp(y,sections,3)
  ca,sa=math.cos(a),math.sin(a)
  return (x+(w+offset)*math.copysign(abs(ca)**exponent,ca),y,z+(h+offset)*math.copysign(abs(sa)**exponent,sa))
 return fn
def cap(name,fn,y,mat):
 verts=[fn(y,a) for a in np.linspace(0,math.tau,64,endpoint=False)]
 return mesh(name,verts,[tuple(range(64))],mat,.001)
def tube(name,points,r,mat):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2
 q=c.splines.new('POLY');q.points.add(len(points)-1)
 for p,co in zip(q.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);c.materials.append(mat);return o
def box(name,loc,scale,mat,bevel=.005):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:b=o.modifiers.new('Machined edge radius','BEVEL');b.width=bevel;b.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def bolt(name,point,axis=(0,0,1),r=.006):
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=.003,location=point);o=bpy.context.object;o.name=name;o.rotation_euler=Vector(axis).to_track_quat('Z','Y').to_euler();o.data.materials.append(metal)
 return o
def plate(name,xy,z,t,mat):
 n=len(xy);return mesh(name,[(x,y,z) for x,y in xy]+[(x,y,z+t) for x,y in xy],[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)],mat,.003)

body_sections=[(-1.35,.16,-.02,.14),(-1.15,.31,-.025,.22),(-.65,.39,-.02,.265),(-.15,.39,-.01,.275),(.38,.30,-.01,.245),(.85,.235,-.02,.18),(1.30,.14,-.03,.11),(1.70,.018,-.05,.025)]
body=shape(body_sections);hull=[]
hull.append(patch('Pressure hull substrate',body,-1.35,1.70,0,math.tau,dark,70,64,.009))
cap('Aft pressure bulkhead',body,-1.35,white);cap('Sealed nose radome',body,1.70,white)
# A recessed avionics connector panel sits inside the painted pressure closure.
box('Aft avionics recess',(0,-1.352,-.02),(.16,.004,.13),dark,.012)
for x in [-.049,0,.049]:
 box('Sealed avionics connector',(x,-1.358,-.02),(.029,.006,.062),metal,.005)
 for z in [-.036,-.017,.002]:box('Connector protected contact',(x,-1.362,z),(.014,.002,.003),rubber,.001)
for x in [-.125,.125]:
 for z in [-.075,.035]:bolt('Bulkhead captive fastener',(x,-1.355,z),(0,-1,0),.004)
ys=[-1.35,-.96,-.54,-.12,.40,.86,1.30,1.70]
for k,(a,b) in enumerate(zip(ys,ys[1:])):
 for j in range(8):
  ang=j*math.tau/8;fn=shape(body_sections,offset=.008)
  hull.append(patch(f'Fuselage fitted skin {k:02d}.{j}',fn,a+.0015,b-.0015,ang+.003,ang+math.tau/8-.003,white,9,9))
# The canopy opens into a real cabin, not the original closed opaque hull.
cutter=box('Cockpit opening tool',(0,.19,.39),(.405,.83,.62),dark,.035)
bpy.context.view_layer.objects.active=cutter
for m in list(cutter.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
for o in hull:
 if any(-.25<v.co.y<.65 and v.co.z>.1 for v in o.data.vertices):
  bpy.context.view_layer.objects.active=o
  for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
  m=o.modifiers.new('Open pressure cabin','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=cutter;bpy.ops.object.modifier_apply(modifier=m.name)
bpy.data.objects.remove(cutter,do_unlink=True)
# Recessed aft heat-exchanger wells. Their louvers sit below the hull skin.
for side in [-1,1]:
 cutter=box('Heat exchanger aperture tool',(side*.205,-.93,.265),(.085,.34,.19),dark,.006)
 bpy.context.view_layer.objects.active=cutter
 for m in list(cutter.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
 for o in hull:
  if any(-1.15<v.co.y<-.70 and v.co.z>.15 for v in o.data.vertices):
   bpy.context.view_layer.objects.active=o
   for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
   m=o.modifiers.new('Recessed exchanger opening','BOOLEAN');m.operation='DIFFERENCE';m.object=cutter;bpy.ops.object.modifier_apply(modifier=m.name)
 bpy.data.objects.remove(cutter,do_unlink=True)
 box('Exchanger recessed floor',(side*.205,-.93,.174),(.08,.333,.012),dark,.003)
 for k in range(7):
  l=box('Subsurface exchanger louver',(side*.205,-1.07+k*.046,.191),(.083,.012,.009),metal,.001);l.rotation_euler.x=.32

# Continuous wing spars carry separate close-fitting airfoil skins and flaps.
span=[(.32,.42,-1.13,.005,.145),(.68,.27,-1.28,.015,.13),(1.07,-.08,-1.26,.035,.092),(1.46,-.45,-1.09,.055,.057),(1.78,-.70,-.89,.075,.026)]
def wingfn(side,upper=True,offset=0):
 def fn(x,t):
  le=interp(x,span,1);tr=interp(x,span,2);z=interp(x,span,3);h=interp(x,span,4)
  curve=(math.sin(math.pi*t)**.65)*(1-.45*t)
  return (side*x,le+(tr-le)*t,z+(h*curve+offset)*(1 if upper else -.70))
 return fn
for side in [-1,1]:
 for upper in [True,False]:
  fn=wingfn(side,upper);patch('Continuous tapered wing structure',fn,.32,1.78,0,1,dark,38,24,.011)
  for a,b in zip([.33,.66,1.04,1.33,1.56],[.66,1.04,1.33,1.56,1.78]):
   for c,d in [(0,.11),(.115,.70),(.708,.98)]:
    col=blue if a==1.33 else (metal if c>.7 else white)
    patch('Conforming wing skin' if c<.7 else 'Inset trailing control surface',wingfn(side,upper,.009),a+.0015,b-.0015,c+.002,d-.002,col,9,12)
  if upper:
   for x in [.72,1.1,1.50]:
    for t in [.16,.64]:
     q=Vector(wingfn(side,True,.012)(x,t));bolt('Flush wing access fastener',q)
 # Reinforced root fairing joins the wing, pressure hull and engine bay.
 root=[(-1.27,.16,-.05,.14),(-.8,.24,-.045,.22),(-.22,.24,-.045,.21),(.35,.10,-.045,.11),(.68,.012,-.045,.025)]
 patch('Blended root load path',shape(root,side*.47),-1.27,.68,0,math.tau,white,42,32,.014)
 cap('Aft root service bulkhead',shape(root,side*.47),-1.27,white)
 box('Root service access recess',(side*.47,-1.273,-.044),(.16,.004,.125),dark,.013)
 box('Root service inset lid',(side*.47,-1.276,-.044),(.14,.004,.105),metal,.009)
 box('Root latch recess',(side*.47,-1.281,-.033),(.045,.003,.015),rubber,.004)
 cap('Closed root nose fairing',shape(root,side*.47),.68,white)
 nac=[(-1.42,.198,.04,.197),(-1.22,.25,.055,.235),(-.68,.27,.055,.252),(-.10,.235,.055,.215),(.28,.177,.04,.16),(.43,.151,.04,.129)]
 fn=shape(nac,side*.79,.72)
 patch('Engine bay structural shell',fn,-1.42,.43,0,math.tau,dark,44,48,.015)
 for a,b in [(-1.37,-.95),(-.944,-.42),(-.414,.17),(.176,.43)]:
  for j in range(8):
   aa=j*math.tau/8;col=blue if j in [1,2] else white
   patch('Removable nacelle cowl',shape(nac,side*.79,.72,.012),a+.0015,b-.0015,aa+.004,aa+math.tau/8-.004,col,10,10,.012)
 # Rolled intake lip, recessed duct, splitter and swept compressor blades.
 duct=[(.23,.117,.04,.097),(.35,.126,.04,.107),(.442,.146,.04,.125),(.449,.153,.04,.132)]
 patch('Machined intake lip and duct',shape(duct,side*.79,.72),.23,.449,0,math.tau,metal,16,48,.007)
 plate('Deep intake terminus',[(side*.79-.13,-.02),(side*.79+.13,-.02),(side*.79+.13,.12),(side*.79-.13,.12)],.04,.006,dark).hide_render=True
 for j in range(11):
  a=j*math.tau/11
  v=[]
  for r,shift in [(.025,0),(.105,.28)]:
   for da in [-.09,.09]:v.append((side*.79+r*math.cos(a+shift+da),.245,.04+r*.84*math.sin(a+shift+da)))
  solid(mesh('Swept inlet guide vane',v,[(0,1,3,2)],inner),.004)
 # Exhaust sections: outer hot structure, twelve individually formed petals,
 # cooling gaps, internal ribs, dark throat and a small unblown ion core.
 exhaust=[(-1.82,.214,.04,.214),(-1.70,.180,.04,.180),(-1.48,.197,.04,.197),(-1.40,.195,.04,.195)]
 patch('Exhaust backing shroud',shape(exhaust,side*.79,1),-1.82,-1.40,0,math.tau,inner,18,64,.006)
 for j in range(12):
  a=j*math.tau/12
  patch('Formed heat alloy nozzle petal',shape(exhaust,side*.79,1,.005),-1.815,-1.44,a+.019,a+math.tau/12-.019,heat,12,6,.004)
  for y in [-1.49,-1.65]:
   r=interp(y,exhaust,1)+.008;q=(side*.79+r*math.cos(a+.26),y,.04+r*math.sin(a+.26));bolt('Nozzle pivot pin',q,(math.cos(a+.26),0,math.sin(a+.26)),.006)
 liner=[(-1.815,.207,.04,.207),(-1.66,.147,.04,.147),(-1.48,.095,.04,.095),(-1.40,.080,.04,.080)]
 patch('Recessed convergent nozzle liner',shape(liner,side*.79,1),-1.815,-1.40,0,math.tau,inner,18,48,.004)
 for j in range(12):
  a=j*math.tau/12;tube('Internal cooling rib',[shape(liner,side*.79,1,-.003)(y,a) for y in np.linspace(-1.78,-1.43,12)],.003,heat)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.07,location=(side*.79,-1.405,.04));bpy.context.object.name='Small recessed ion core';bpy.context.object.scale=(1,.15,1);bpy.context.object.data.materials.append(light)
 # Functional plumbing is contained in the aft wing-root service channel.
 for k in range(2):tube('Recessed aft coolant line',[(side*(.46+k*.04),y,-.09) for y in np.linspace(-.68,-1.35,14)],.009,metal)
 # Wing-root gun: a faired attachment, single recessed barrel, no stacked rings.
 gun=[(-.66,.08,.03,.075),(-.30,.095,.035,.085),(.03,.063,.035,.059),(.22,.037,.035,.035)]
 patch('Wing-root cannon fairing',shape(gun,side*1.10,.75),-.66,.22,0,math.tau,dark,24,32,.008)
 bore=[(.18,.021,.035,.021),(.285,.021,.035,.021)]
 patch('Recessed cannon bore',shape(bore,side*1.10,1),.18,.285,0,math.tau,metal,4,24,.005)
 # Recessed belly maintenance skins follow the real underside curvature.
 for a,b in [(-.98,-.60),(-.56,-.23),(.72,1.10)]:
  patch('Ventral access hatch',shape(body_sections,offset=.013),a,b,math.pi*1.30,math.pi*1.70,metal,10,12,.004)

# Cabin box and seat remain visible through a thin glazing shell.
box('Cockpit pressure well',(0,.16,.13),(.34,.72,.12),rubber,.018)
seat=box('Pilot seat cushion',(0,.03,.212),(.17,.20,.045),rubber,.02)
back=box('Pilot seat back',(0,-.095,.273),(.18,.046,.19),dark,.02);back.rotation_euler.x=-.12
box('Head restraint',(0,-.10,.355),(.10,.05,.055),rubber,.016)
box('Instrument console',(0,.43,.244),(.29,.105,.075),dark,.01)
for x in [-.084,0,.084]:box('Inset flight display',(x,.409,.286),(.055,.04,.001),light,.002)
for side in [-1,1]:
 box('Cabin side console',(side*.139,.17,.223),(.035,.34,.045),dark,.006)
 tube('Canopy pressure gasket',[(side*.195,-.22,.26),(side*.199,.17,.26),(side*.184,.45,.248),(side*.142,.59,.226)],.010,rubber)
 # A few cockpit controls imply scale; they are inside the vehicle.
 for k in range(4):bolt('Console switch',(side*.14,.05+k*.055,.248),r=.003)
canopy=[(-.24,.175,.253,.020),(-.17,.191,.258,.10),(.04,.193,.259,.146),(.28,.18,.255,.14),(.47,.151,.244,.09),(.61,.108,.222,.008)]
cf=shape(canopy,exponent=1)
for side in [-1,1]:
 def rim(y,t):
  inner=Vector(cf(y,0 if side>0 else math.pi));outer=Vector((side*.216,y,inner.z-.007))
  return inner.lerp(outer,t)
 patch('Fitted canopy coaming',rim,-.24,.61,0,1,white,32,3,.007)
box('Rear cockpit pressure closure',(0,-.236,.238),(.418,.027,.04),white,.005)
plate('Front canopy coaming',[(-.217,.607),(-.11,.60),(.11,.60),(.217,.607),(.21,.64),(-.21,.64)],.215,.012,white)
patch('Thin laminated canopy glazing',cf,-.235,.606,0,math.pi,glass,36,40,.002)
for y in [-.17,.41]:tube('Canopy load-bearing bow',[cf(y,a) for a in np.linspace(0,math.pi,40)],.009,white)
for a in [0,math.pi]:tube('Canopy sill extrusion',[cf(y,a) for y in np.linspace(-.235,.606,40)],.009,metal)
tube('Windscreen central mullion',[cf(y,math.pi/2) for y in np.linspace(.41,.606,14)],.005,metal)

# Service panels and a heat exchanger are integrated into the rear deck.
for side in [-1,1]:
 # Conformal, nearly flush lettering gives a full-size maintenance scale.
 for text,x,y,size in [('NS-01',1.18,-.63,.044),('NO STEP',1.20,-.96,.018),('SERVICE',.50,-.75,.017)]:
  bpy.ops.object.text_add(location=(side*x,y,.1));t=bpy.context.object;t.name='Maintenance stencil '+text;t.data.body=text;t.data.size=size;t.data.extrude=.0001;t.data.align_x='CENTER';t.data.materials.append(dark)
  bpy.ops.object.convert(target='MESH');t=bpy.context.object
  for vert in t.data.vertices:
   p=t.matrix_world@vert.co;le=interp(abs(p.x),span,1);tr=interp(abs(p.x),span,2);q=wingfn(side,True,.012)(abs(p.x),np.clip((p.y-le)/(tr-le),0,1));vert.co.z=q[2]-t.location.z
 # Flush paired attitude-control ports at the wingtip, with recessed throats.
 for k in [-1,1]:
  pos=Vector(wingfn(side,True,.012)(1.66,.5+k*.1))
  verts=[(pos.x+r*math.cos(a),pos.y+r*math.sin(a),pos.z+z) for r,z in [(.012,0),(.008,-.002),(.006,-.014)] for a in np.linspace(0,math.tau,20,endpoint=False)]
  faces=[(i*20+j,i*20+(j+1)%20,(i+1)*20+(j+1)%20,(i+1)*20+j) for i in range(2) for j in range(20)]
  mesh('Recessed attitude thruster',verts,faces,inner,smooth=True)
 # Sparse access fasteners placed on the skin, not floating studs.
 for y in [-1.08,-.71,.89,1.23]:
  a=.98 if side>0 else math.pi-.98;q=Vector(shape(body_sections,offset=.014)(y,a));bolt('Captive fuselage screw',q,(math.cos(a),0,math.sin(a)),.0045)
 # Rear bulkhead fasteners and a small sealed equipment plate.
 for a in [0,math.pi/2,math.pi,math.pi*1.5]:bolt('Root service-panel fastener',shape(root,side*.47)(-1.274,a),(0,-1,0),.0045)

def area(name,loc,power,size,color):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color
 o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
area('Neutral large key',(-3,4,7),650,5,(1,1,1));area('Neutral broad fill',(4,-3,4),400,5,(1,1,1))
bpy.ops.object.camera_add(location=(4.5,7,6));cam=bpy.context.object;cam.data.type='ORTHO';s.camera=cam
def camera(loc,scale=4.8):cam.location=loc;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
def render(name,loc,override=False):
 camera(loc);s.view_layers[0].material_override=clay if override else None;s.render.filepath=str(ROOT/'renders'/name);bpy.ops.render.render(write_still=True);s.view_layers[0].material_override=None
# Preserve author objects/modifiers and relative image paths before flattening.
for im in bpy.data.images:
 if im.filepath:im.filepath=bpy.path.relpath(im.filepath,start=str(ROOT))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'nova-sparrow-showcase.blend'),relative_remap=False)
render('clay.png',(4.5,7,6),True);render('underside-clay.png',(3,-6,-4),True);render('surfaced.png',(4.5,7,6));render('rear.png',(3,-6,2));render('side.png',(5,0,1))
bpy.ops.object.select_all(action='DESELECT')
for o in s.objects:
 if o.type in {'MESH','CURVE','FONT'} and not o.hide_render:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in s.objects if o.select_get())
bpy.ops.object.convert(target='MESH');bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# Apply normals consistently without merging glazing into opaque surfaces.
import bmesh
for o in bpy.context.selected_objects:
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
bpy.ops.export_scene.gltf(filepath=str(OUT/'sparrow-showcase.glb'),export_format='GLB',use_selection=True,export_yup=True,export_cameras=False,export_lights=False,export_tangents=True)
print('SHOWCASE_EXPORT_COMPLETE',str(OUT/'sparrow-showcase.glb'),flush=True)
