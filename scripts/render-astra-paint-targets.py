# SPDX-License-Identifier: GPL-3.0-or-later
import importlib.util,os,sys
spec=importlib.util.spec_from_file_location('showroom',os.path.join(os.getcwd(),'scripts/render-astra-showroom.py'));d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
m=d.m;s=m.s;bpy=m.bpy
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['paint','1','0']
count=int(args[1]);start=int(args[2]) if len(args)>2 else 0
out=os.path.abspath('docs/astra-v3-models/renders/paint-target');os.makedirs(out,exist_ok=True)
for i in range(start,start+count):
 d.build_showroom(i)
 m.cam.location=(0,0,14);m.cam.rotation_euler=(0,0,0);m.cam.data.ortho_scale=5.4
 s.render.resolution_x=s.render.resolution_y=1536;s.cycles.samples=48;s.view_settings.exposure=-.25
 s.render.filepath=os.path.join(out,'%02d.png'%(i+1));bpy.ops.render.render(write_still=True)
