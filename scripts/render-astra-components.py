# SPDX-License-Identifier: GPL-3.0-or-later
# Original articulated machinery for the existing render-only boss rig.
import importlib.util,os
spec=importlib.util.spec_from_file_location('boss_mesh',os.path.join(os.getcwd(),'scripts/render-astra-bosses.py'));b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
m=b.m;s=m.s;bpy=m.bpy
s.render.resolution_x=512;s.render.resolution_y=512;s.cycles.samples=64;m.cam.location=(0,-.4,12);m.cam.rotation_euler=(0,0,0);m.cam.data.ortho_scale=2.5
out=os.path.abspath('docs/astra-v2-models/renders/component');os.makedirs(out,exist_ok=True)
for i in range(3):
    m.clear()
    if i==0:
        m.poly('Articulated titanium armor',[(-.95,-.25),(.74,-.21),(1.04,0),(.64,.27),(-.95,.24)],.05,.17,m.steel,.035)
        m.poly('Machined upper edge',[(-.89,.18),(.70,.18),(.85,.13),(-.89,.12)],.23,.04,m.silver,.012)
        for k in range(9):
            x=-.67+k*.16;m.box('Recessed radiator',(x,0,.245),(.1,.27,.019),m.black,.012)
            m.box('Radiator blade',(x,.01,.271),(.04,.20,.035),m.copper,.009)
        b.reactor(-.74,0,.28,.16,m.ice)
    elif i==1:
        m.box('Hydraulic shutter',(0,0,.12),(.42,1.55,.23),m.steel,.07)
        m.box('Shutter inset',(0,.07,.25),(.27,1.21,.014),m.black,.015)
        for k in range(9):m.box('Shutter thermal blade',(0,-.46+k*.12,.29),(.23,.058,.039),m.silver,.008)
        m.box('Shutter status strip',(.155,0,.30),(.02,1.19,.01),m.ice,.003)
    else:
        b.turret(0,-.12,.12,2.1,m.ice)
        m.box('Artillery heat shield',(0,-.2,.42),(.40,.51,.22),m.steel,.055)
        for k in range(5):m.box('Artillery radiator',(0,-.34+k*.084,.55),(.28,.033,.024),m.copper,.006)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('docs/astra-v2-models/component-%02d.blend'%(i+1)))
    s.render.filepath=os.path.join(out,'%02d.png'%(i+1));bpy.ops.render.render(write_still=True)
