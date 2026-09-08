# SPDX-License-Identifier: GPL-3.0-or-later
"""Reconstruct original player artwork as sculpted, textured 3D relief hulls.
Silhouette cutouts, thickness, curved armor and original panel painting share UVs.
The showroom camera always views the upper hemisphere. Not a flat billboard.
"""
import bpy, math, os, sys, json, numpy as np, importlib.util
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
spec=importlib.util.spec_from_file_location('mesh',os.path.abspath('scripts/render-astra-v2.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['player','1','15']
count=int(args[1]);start=int(args[2]) if len(args)>2 else 0
root=os.path.abspath('docs/fleet-identity-20260908');os.makedirs(root,exist_ok=True)
s=m.s;s.render.use_persistent_data=True;s.cycles.samples=16
if s.cycles.device=='GPU':s.cycles.denoiser='OPTIX'
s.view_settings.view_transform='Standard';s.view_settings.look='None';s.view_settings.exposure=-.35
for o in bpy.data.objects:
 if o.type=='LIGHT':o.data.energy*=.40
files=[f'nova-player-ship-{j+1:02d}.png' for j in range(25)]+['nova-player-ship-phase-seraph-20260801.png','nova-player-ship-eirik-viking-20260801-v2.png','nova-player-ship-aegis-comet-20260801.png','nova-player-ship-railbreaker-20260801.png','nova-player-ship-drone-sovereign-20260801.png']
def make_hull(i):
 m.clear();img=bpy.data.images.load(os.path.abspath('public/art/generated/nova-swarm/ships/'+files[i]),check_existing=True)
 iw,ih=img.size;raw=np.array(img.pixels[:],dtype=np.float32).reshape(ih,iw,4)
 ys,xs=np.nonzero(raw[:,:,3]>.2);l,r=xs.min(),xs.max();b,t=ys.min(),ys.max()
 ratio=(r-l+1)/(t-b+1);height=4.15;width=height*ratio
 # Retain the delivered Railbreaker readability fix: shorter/wider rails avoid
 # squeezing the hull into an almost invisible needle under the gameplay cap.
 if i==28:width*=1.45;height*=.88
 if width>3.85:height*=3.85/width;width=3.85
 nx=max(64,round(220*width/max(width,height)));ny=max(64,round(220*height/max(width,height)))
 xx=np.linspace(l,r,nx).astype(int);yy=np.linspace(b,t,ny).astype(int);pixels=raw[yy[:,None],xx[None,:]]
 mask=pixels[:,:,3]>.35;inside=mask.copy();distance=np.zeros(mask.shape)
 for j in range(22):
  inside=inside & np.roll(inside,1,0)&np.roll(inside,-1,0)&np.roll(inside,1,1)&np.roll(inside,-1,1)
  inside[0]=False;inside[-1]=False;inside[:,0]=False;inside[:,-1]=False;distance+=inside
 luminance=pixels[:,:,:3].mean(2)
 for j in range(4):luminance=(luminance+np.roll(luminance,1,0)+np.roll(luminance,-1,0)+np.roll(luminance,1,1)+np.roll(luminance,-1,1))/5
 vertices=[];uvs=[]
 for y in range(ny):
  for x in range(nx):
   px=(x/(nx-1)-.5)*width;py=(y/(ny-1)-.5)*height
   # Raised pressure hull and engine nacelles, thinning continuously at blade edges.
   ridge=.23*math.exp(-(px/.38)**2)*math.exp(-((py+.02)/1.55)**4)
   engines=.10*(math.exp(-((px-.68)/.23)**2)+math.exp(-((px+.68)/.23)**2))*math.exp(-((py+1.1)/.55)**2)
   z=.015+(min(.18,distance[y,x]*.011)+ridge+engines+luminance[y,x]*.035)*min(1,distance[y,x]/4)
   vertices.append((px,py,z));uvs.append((xx[x]/(iw-1),yy[y]/(ih-1)))
 faces=[];edges={}
 for y in range(ny-1):
  for x in range(nx-1):
   if not(mask[y,x] and mask[y+1,x] and mask[y,x+1] and mask[y+1,x+1]):continue
   a=y*nx+x;face=(a,a+1,a+nx+1,a+nx);faces.append(face)
   for e in [(face[j],face[(j+1)%4]) for j in range(4)]:
    key=tuple(sorted(e));edges[key]=None if key in edges else e
 top_faces=len(faces);offset=len(vertices);vertices += [(x,y,-.015) for x,y,z in vertices];uvs+=uvs[:]
 for face in faces[:]:faces.append(tuple(v+offset for v in reversed(face)))
 for edge in edges.values():
  if edge:faces.append((edge[1],edge[0],edge[0]+offset,edge[1]+offset))
 mesh=bpy.data.meshes.new('Sculpted reference hull');mesh.from_pydata(vertices,[],faces);mesh.update()
 ob=bpy.data.objects.new('Original silhouette with curved armor',mesh);bpy.context.collection.objects.link(ob)
 mat=m.mat('Original painted panels',(1,1,1),.12,.52);nodes=mat.node_tree.nodes;links=mat.node_tree.links;shader=nodes['Principled BSDF']
 tex=nodes.new('ShaderNodeTexImage');tex.image=img;links.new(tex.outputs['Color'],shader.inputs['Base Color']);links.new(tex.outputs['Color'],shader.inputs['Emission Color']);shader.inputs['Emission Strength'].default_value=.16
 side=m.mat('Exposed dark titanium edge',(.025,.038,.05),.7,.34)
 mesh.materials.append(mat);mesh.materials.append(side);uv=mesh.uv_layers.new(name='Original panel painting')
 for polygon in mesh.polygons:
  polygon.material_index=0 if polygon.index<top_faces else 1;polygon.use_smooth=polygon.index<top_faces
  for loop in polygon.loop_indices:uv.data[loop].uv=uvs[mesh.loops[loop].vertex_index]
 smooth=ob.modifiers.new('Smooth silhouette edges','SMOOTH');smooth.factor=.65;smooth.iterations=4;smooth.use_z=False
 # Glowing engine positions follow original painted thrusters; no hitbox edits.
 return [(side*min(.68,width*.23),-height*.39,.15) for side in [-1,1]]
for i in range(start,start+count):
 anchors=make_hull(i);out=os.path.join(root,'renders',f'{i+1:02d}');os.makedirs(out,exist_ok=True)
 s.render.resolution_x=s.render.resolution_y=1024;m.cam.data.ortho_scale=5.5
 m.cam.location=(0,0,12);m.cam.rotation_euler=(Vector((0,0,0))-m.cam.location).to_track_quat('-Z','Y').to_euler()
 s.render.filepath=os.path.join(out,'player.png');bpy.ops.render.render(write_still=True)
 views=[];count_frames=48
 for f in range(count_frames):
  a=math.atan2(-7,5)+math.tau*f/count_frames;m.cam.location=(math.cos(a)*8.6,math.sin(a)*8.6,8.2)
  m.cam.rotation_euler=(Vector((0,0,.15))-m.cam.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update()
  emitters=[]
  for p in anchors:
   uv=world_to_camera_view(s,m.cam,Vector(p));emitters.append({'x':uv.x,'y':1-uv.y,'visible':m.cam.location.y<0})
  views.append({'emitters':emitters});s.render.filepath=os.path.join(out,f'{f:02d}.png');bpy.ops.render.render(write_still=True)
 with open(os.path.join(out,'views.json'),'w') as file:json.dump({'size':1024,'count':count_frames,'views':views},file)
 if i==start:bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'fleet-relief-master.blend'))
 print('FLEET_IDENTITY_COMPLETE',i+1,flush=True)
