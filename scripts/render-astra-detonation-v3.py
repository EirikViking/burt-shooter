# SPDX-License-Identifier: GPL-3.0-or-later
# Original volumetric combustion flipbook, rendered offline with Blender 4.5.
import bpy, math, os, sys, random
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
count=int(args[0]) if args else 24
start=int(args[1]) if len(args)>1 else 0
out=os.path.abspath('docs/astra-v3-models/renders/detonation');os.makedirs(out,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=64;s.cycles.use_denoising=True;s.render.use_persistent_data=True
pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices()
for d in pref.devices:d.use=d.type!='CPU'
s.cycles.device='GPU';s.cycles.volume_step_rate=.7
s.render.resolution_x=448;s.render.resolution_y=448;s.render.resolution_percentage=100
s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast';s.view_settings.exposure=-.15
s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.18,.26,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.32
bpy.ops.object.camera_add(location=(0,-9,1.8));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,.3))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=6.4;s.camera=camera
for name,pos,power,color,size in [('Cold rim',(-3,1,4),1700,(.38,.63,1),4),('Fire bounce',(1,-3,3),2200,(1,.42,.13),3)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
rng=random.Random(93261);lobes=[]
for i in range(11):
 # Irregular connected fire pockets, with narrow pressure jets behind them.
 # Fixed offline seed; this never touches the game's random stream.
 angle=i*2.399963+(.22 if i%2 else 0);direction=Vector((math.cos(angle),rng.uniform(-.3,.3),math.sin(angle)*.85)) if i else Vector((0,0,0))
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16);o=bpy.context.object;o.name='Combustion lobe %02d'%i
 texture=bpy.data.textures.new('Turbulent pressure front %02d'%i,type='CLOUDS');texture.noise_scale=.24;texture.noise_depth=2
 modifier=o.modifiers.new('Disrupted gas front','DISPLACE');modifier.texture=texture;modifier.strength=.38;modifier.texture_coords='GLOBAL'
 mat=bpy.data.materials.new(o.name);mat.use_nodes=True;o.data.materials.append(mat);n=mat.node_tree.nodes;l=mat.node_tree.links;n.clear()
 output=n.new('ShaderNodeOutputMaterial');volume=n.new('ShaderNodeVolumePrincipled');l.new(volume.outputs['Volume'],output.inputs['Volume']);volume.inputs['Color'].default_value=(.038,.030,.025,1);volume.inputs['Anisotropy'].default_value=.14
 coord=n.new('ShaderNodeTexCoord');noise=n.new('ShaderNodeTexNoise');noise.noise_dimensions='4D';noise.inputs['Scale'].default_value=8.5+i*.19;noise.inputs['Detail'].default_value=5;noise.inputs['Roughness'].default_value=.72;l.new(coord.outputs['Generated'],noise.inputs['Vector'])
 center=n.new('ShaderNodeVectorMath');center.operation='SUBTRACT';center.inputs[1].default_value=(.5,.5,.5);l.new(coord.outputs['Generated'],center.inputs[0])
 length=n.new('ShaderNodeVectorMath');length.operation='LENGTH';l.new(center.outputs[0],length.inputs[0])
 radius=n.new('ShaderNodeMath');radius.operation='MULTIPLY';radius.inputs[1].default_value=2.5;l.new(length.outputs['Value'],radius.inputs[0])
 edge=n.new('ShaderNodeMath');edge.operation='SUBTRACT';edge.inputs[0].default_value=1;l.new(radius.outputs[0],edge.inputs[1]);edge.use_clamp=True
 warp=n.new('ShaderNodeMath');warp.operation='MULTIPLY_ADD';l.new(noise.outputs['Fac'],warp.inputs[0]);warp.inputs[1].default_value=.85;warp.inputs[2].default_value=.52;l.new(warp.outputs[0],edge.inputs[0])
 density=n.new('ShaderNodeMath');density.operation='MULTIPLY';l.new(edge.outputs[0],density.inputs[0]);l.new(noise.outputs['Fac'],density.inputs[1])
 weight=n.new('ShaderNodeMath');weight.operation='MULTIPLY';weight.inputs[1].default_value=11;l.new(density.outputs[0],weight.inputs[0]);l.new(weight.outputs[0],volume.inputs['Density'])
 ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements.remove(ramp.color_ramp.elements[1]);ramp.color_ramp.elements[0].position=.22;ramp.color_ramp.elements[0].color=(.018,.001,.0001,1)
 for p,c in [(.40,(.5,.014,.0004,1)),(.52,(1,.14,.004,1)),(.60,(1,.62,.10,1)),(.68,(1,.96,.65,1))]:ramp.color_ramp.elements.new(p).color=c
 l.new(noise.outputs['Fac'],ramp.inputs['Fac']);l.new(ramp.outputs['Color'],volume.inputs['Emission Color'])
 emission=n.new('ShaderNodeMath');emission.operation='MULTIPLY';hot=n.new('ShaderNodeMath');hot.operation='POWER';hot.inputs[1].default_value=5;l.new(noise.outputs['Fac'],hot.inputs[0])
 fuel=n.new('ShaderNodeMath');fuel.operation='MULTIPLY';l.new(hot.outputs[0],fuel.inputs[0]);l.new(edge.outputs[0],fuel.inputs[1]);l.new(fuel.outputs[0],emission.inputs[0]);l.new(emission.outputs[0],volume.inputs['Emission Strength'])
 lobes.append((o,direction,rng.uniform(.75,1.10),noise,weight,emission))
for frame in range(start,start+count):
 t=frame/23;expansion=1-math.exp(-t*6.5)
 for i,(o,direction,scale,noise,weight,emission) in enumerate(lobes):
  delay=0 if i==0 else .02*(i%4)
  age=max(0,t-delay);grow=1-math.exp(-age*6)
  radius=(.08+grow*(.82 if i else 1.0))*scale
  o.location=direction*(grow*(1.36 if i else 0));o.location.z+=age*.22
  o.scale=(radius,radius*.83,radius*(1+age*.22));o.rotation_euler=(age*.6+i,age*.35,i*.82)
  if i>=8:
   # Three asymmetric jets burst early then thin into vapor.
   o.location=direction*(grow*1.65)
   o.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
   o.scale=(radius*.28,radius*.28,radius*1.3)
  noise.inputs['W'].default_value=i*.7+age*2.3
  noise.inputs['Scale'].default_value=7.2+i*.27
  weight.inputs[1].default_value=(18 if i<8 else 10)*max(.08,1-age*.95)
  emission.inputs[1].default_value=(640 if i==0 else 440)*max(0,1-age*1.32)**3.1*(.72+.28*math.sin(i*1.7+age*2))
  o.hide_render=t<delay
 s.render.filepath=os.path.join(out,'%02d.png'%(frame+1))
 if frame==6:bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('docs/astra-v3-models/detonation-master.blend'))
 bpy.ops.render.render(write_still=True);print('ASTRA_DETONATION_RENDERED',frame+1,flush=True)
