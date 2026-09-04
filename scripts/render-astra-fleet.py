# SPDX-License-Identifier: GPL-3.0-or-later
# Original modular spacecraft, authored for Nova Swarm. Blender 4.5, no add-ons.
# blender --background --python scripts/render-astra-fleet.py -- player 30
import bpy, math, os, sys
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['player','1']
family=args[0]; count=int(args[1]) if len(args)>1 else 1
source=os.path.abspath('docs/astra-models'); root=os.path.join(source,'renders')
os.makedirs(os.path.join(root,family),exist_ok=True);os.makedirs(source,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.world.color=(.23,.27,.34)
def material(name,color,metal=.65,rough=.3,emit=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
    if emit:bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=emit
    return m
steel=material('Brushed titanium',(.21,.29,.36),.8,.3)
dark=material('Recessed graphite',(.012,.025,.04),.7,.4)
ivory=material('Ceramic armor',(.56,.66,.7),.55,.28)
gold=material('Warm anodized edge',(.5,.25,.065),.8,.26)
glass=material('Obsidian cockpit',(.006,.08,.13),.9,.15)
light=material('Ion light',(.11,.78,1),.3,.25,3)
hot=material('Engine throat',(.66,.93,1),.1,.3,4)
def mesh(name,poly,z,thick,mat,bevel=.04):
    n=len(poly); verts=[(x,y,z) for x,y in poly]+[(x,y,z+thick) for x,y in poly]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat)
    if bevel:
        mod=ob.modifiers.new('Machined chamfer','BEVEL');mod.width=bevel;mod.segments=2
        ob.modifiers.new('Weighted highlights','WEIGHTED_NORMAL')
    return ob
def box(name,loc,scale,mat,bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.name=name;ob.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.data.materials.append(mat)
    if bevel:
        b=ob.modifiers.new('Edge bevel','BEVEL');b.width=bevel;b.segments=2;ob.modifiers.new('Normals','WEIGHTED_NORMAL')
    return ob
def cylinder(name,loc,radius,depth,mat,rotation=(0,0,0),vertices=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc,rotation=rotation);ob=bpy.context.object;ob.name=name;ob.data.materials.append(mat)
    mod=ob.modifiers.new('Rim','BEVEL');mod.width=.022;mod.segments=2;ob.modifiers.new('Normals','WEIGHTED_NORMAL');return ob
def area(name,loc,power,color,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,0))-ob.location).to_track_quat('-Z','Y').to_euler()
area('Large softbox',(-3,4,7),800,(.79,.9,1),5)
area('Copper rim',(4,-1,4),950,(1,.69,.4),3)
area('Cool bounce',(-4,-3,3),650,(.35,.69,1),4)
bpy.ops.object.camera_add(location=(0,0,12));cam=bpy.context.object;cam.rotation_euler=(0,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=4.55;scene.camera=cam
def clear_meshes():
    for ob in list(bpy.data.objects):
        if ob.type=='MESH':bpy.data.objects.remove(ob,do_unlink=True)
def craft(index,enemy=False):
    clear_meshes(); variant=index%6; tier=index//6
    palette=[(.025,.38,.51),(.06,.22,.52),(.35,.1,.37),(.1,.42,.31),(.48,.14,.08),(.54,.35,.10)]
    trim=material('Hull markings %02d'%index,palette[index%6],.55,.29)
    glow=material('Navigation %02d'%index,[(.03,.7,1),(.4,.6,1),(.8,.16,.52),(.18,.9,.58),(1,.24,.07),(1,.6,.12)][index%6],.15,.2,2)
    if enemy:
        hull=[(0,1.8),(.43,.8),(.38,-.7),(.19,-1.3),(-.19,-1.3),(-.38,-.7),(-.43,.8)]
    else:
        hull=[(0,1.96),(.25,1.32),(.4,.58),(.4,-.8),(.24,-1.46),(-.24,-1.46),(-.4,-.8),(-.4,.58),(-.25,1.32)]
    mesh('Central pressure hull',hull,.04,.28,steel,.075)
    mesh('Upper ceramic spine',[(x*.78,y*.95) for x,y in hull],.3,.13,ivory if not enemy else trim,.055)
    mesh('Nose cap',[(0,1.79),(.13,1.23),(.19,.58),(-.19,.58),(-.13,1.23)],.45,.07,trim,.018)
    mesh('Canopy seat',[(-.22,.48),(.22,.48),(.23,-.37),(0,-.59),(-.23,-.37)],.45,.13,dark,.04)
    mesh('Canopy glass',[(-.16,.4),(.16,.4),(.17,-.3),(0,-.48),(-.17,-.3)],.59,.08,glass if not enemy else glow,.045)
    box('Canopy rib',(0,-.14,.705),(.021,.65,.026),gold,.006)
    for side in [-1,1]:
        span=[1.63,1.42,1.05,1.85,1.52,1.74][variant] * (1 - min(tier,8)*.014)
        lead=[-.07,.38,.9,-.44,.55,-.22][variant]+tier*.045
        wing=[(.31,.55),(span,lead),(span*.96,-.79),(1.04,-1.24),(.34,-.98)]
        if enemy:
            hooks=[1.28,.54,1.6,-.1,.95,1.42]
            wing=[(.29,.51),(span,-.45+tier*.025),(span*.88,hooks[variant]),(span*.67,hooks[variant]-.38),(.63,-.98),(.28,-.94)]
        mesh('Swept wing',[(side*x,y) for x,y in wing],.04,.12,steel,.045)
        cx=sum(p[0] for p in wing)/len(wing);cy=sum(p[1] for p in wing)/len(wing)
        inset=[(side*(cx+(x-cx)*.8),cy+(y-cy)*.8) for x,y in wing]
        mesh('Wing armor inset',inset,.18,.055,ivory if not enemy else trim,.022)
        mesh('Wing livery',[(side*.63,-.01),(side*(span-.1),lead-.06),(side*(span-.13),lead-.2),(side*.63,-.23)],.249,.012,trim,.008)
        # Recessed service panels and tier bars read as machined assemblies.
        for j in range(2):
            box('Wing access recess',(side*(.89+j*.23),-.63,.257),(.14,.23,.018),dark,.016)
            box('Access panel',(side*(.89+j*.23),-.64,.271),(.11,.16,.016),steel,.01)
        for j in range(min(tier+1,8)):
            box('Fleet identification bar',(side*(.43+j*.075),-.98,.255),(.035,.12,.018),gold,.004)
        podx=side*(.66 if variant!=2 else .48)
        box('Engine pod',(podx,-.7,.22),(.35,.91,.37),steel,.075)
        box('Engine cover',(podx,-.61,.43),(.26,.47,.1),trim,.03)
        for j in range(4):box('Radiator fin',(podx,-.42-j*.11,.503),(.21,.031,.016),dark,.004)
        cylinder('Exhaust collar',(podx,-1.22,.22),.18,.16,gold,(math.pi/2,0,0))
        cylinder('Exhaust luminous throat',(podx,-1.31,.22),.125,.015,hot,(math.pi/2,0,0))
        mesh('Ion exhaust',[(podx-.10,-1.29),(podx+.10,-1.29),(podx+.065,-1.64),(podx,-1.94),(podx-.065,-1.64)],.2,.02,light,.018)
        gunx=side*(1.11 if variant!=2 else .91)
        box('Gun fairing',(gunx,-.22,.29),(.15,.51,.18),dark,.035)
        cylinder('Cannon barrel',(gunx,.24,.33),.045,.57,steel,(math.pi/2,0,0),12)
        cylinder('Cannon muzzle',(gunx,.535,.33),.043,.026,gold,(math.pi/2,0,0),12)
        box('Running light',(side*(span-.13),lead-.23,.25),(.06,.18,.04),glow,.008)
        for j in range(3):box('Service fastener',(side*.31,.61-j*.28,.461),(.027,.04,.025),gold,.005)
        if tier>=1:box('Auxiliary shoulder',(side*.48,.72,.3),(.14,.38+tier*.04,.16),trim,.025)
        if tier>=2:mesh('Dorsal fin',[(side*.4,-.6),(side*.51,-.5),(side*.52,-1.0),(side*.4,-1.1)],.42,.13+tier*.03,trim,.02)
        if tier>=3:box('Dorsal radiator',(side*.26,-.69,.54),(.08,.27,.04),gold,.012)
    box('Reactor frame',(0,-.93,.46),(.3,.39,.16),dark,.035)
    box('Reactor lens',(0,-.92,.554),(.13,.25,.04),glow,.025)
    # Both atlases point up; Enemy.installBodySprite applies the existing PI turn.
def scenery(index):
    import random
    r=random.Random(129);clear_meshes()
    cam.location=(0,0,30);cam.rotation_euler=(0,0,0);cam.data.ortho_scale=26
    scene.render.resolution_x=1536;scene.render.resolution_y=864;scene.cycles.samples=16
    plane=material('Deep space %d'%index,(.004,.008,.018),0,1,.2)
    box('Space field',(0,0,-22),(40,30,.1),plane,0)
    planet=material('Ocean world %d'%index,(.04,.1,.15),.05,.85)
    nodes=planet.node_tree.nodes;links=planet.node_tree.links;bs=nodes.get('Principled BSDF')
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=4.8;noise.inputs['Detail'].default_value=6;noise.inputs['Roughness'].default_value=.72
    ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.36;ramp.color_ramp.elements[0].color=(.006,.028,.05,1)
    ramp.color_ramp.elements[1].position=.68;ramp.color_ramp.elements[1].color=[(.32,.48,.5,1),(.3,.25,.39,1),(.38,.25,.16,1)][index%3]
    el=ramp.color_ramp.elements.new(.5);el.color=(.035,.11,.14,1)
    links.new(noise.outputs['Fac'],ramp.inputs['Fac']);links.new(ramp.outputs['Color'],bs.inputs['Base Color'])
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.35;bump.inputs['Distance'].default_value=.17;links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96,ring_count=64,radius=7.8,location=(-11,5,-8));planet_ob=bpy.context.object;planet_ob.name='Astra cloud ocean';planet_ob.data.materials.append(planet);bpy.ops.object.shade_smooth()
    atmo=bpy.data.materials.new('Atmospheric scattering');atmo.use_nodes=True;n=atmo.node_tree.nodes;l=atmo.node_tree.links;n.clear()
    out=n.new('ShaderNodeOutputMaterial');mix=n.new('ShaderNodeMixShader');trans=n.new('ShaderNodeBsdfTransparent');em=n.new('ShaderNodeEmission');em.inputs[0].default_value=(.08,.42,.64,1);em.inputs[1].default_value=.7
    weight=n.new('ShaderNodeLayerWeight');weight.inputs['Blend'].default_value=.07;l.new(weight.outputs['Fresnel'],mix.inputs[0]);l.new(trans.outputs[0],mix.inputs[1]);l.new(em.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],out.inputs[0])
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96,ring_count=64,radius=7.87,location=(-11,5,-8));bpy.context.object.data.materials.append(atmo);bpy.ops.object.shade_smooth()
    for i in range(110):
        x=r.uniform(-15,15);y=r.uniform(-9,9);s=r.uniform(.004,.013)
        box('Distant star',(x,y,-18),(s,s,.001),light,0)
    for side in [-1,1]:
        for i in range(16):
            x=side*r.uniform(10.8,14.2);y=r.uniform(-9,9);s=r.uniform(.07,.5)
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=s,location=(x,y,-2-r.random()*5));ob=bpy.context.object;ob.name='Silicate debris';ob.rotation_euler=(r.random(),r.random(),r.random());ob.data.materials.append(steel)
    for i in range(12):
        y=7-i*1.4
        ob=box('Orbital dock spine',(12.3,y,-2),(.8,1.18,.35),steel,.09);ob.rotation_euler.z=.16
        box('Dock inset',(12.2,y,-1.76),(.49,.91,.08),dark,.025)
        box('Dock running light',(11.9,y-.34,-1.66),(.07,.44,.045),light,.015)
        if i%3==0:
            ob=box('Structural spar',(12.8,y,-1.9),(2.7,.19,.4),steel,.035);ob.rotation_euler.z=-.4
    area('Planet broad sunlight',(-13,13,12),3200,(.64,.85,1),9)
    area('Foundry reflected light',(12,6,12),1800,(1,.59,.3),7)
for i in range(count):
    if family=='scenery':scenery(i)
    else:craft(i,family=='enemy')
    if family=='hero':
        # Close camera warrants recessed seams, asymmetric service markings and
        # a brushed material that would become noise on a 40-pixel flight sprite.
        ivory.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.18,.25,.31,1)
        ivory.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.24
        for ob in bpy.data.objects:
            if ob.name.startswith('Ion exhaust'):ob.hide_render=True
        for side in [-1,1]:
            for j in range(5):
                box('Ceramic wing seam',(side*(.87+j*.115),-.35,.258),(.018,.38,.014),dark,.002)
                box('Wing copper fastener',(side*(.87+j*.115),-.57,.276),(.022,.03,.016),gold,.003)
            for j in range(7):
                box('Nose service groove',(side*.12,.76+j*.078,.541),(.16,.011,.012),dark,.002)
            box('Rear thrust brace',(side*.66,-1.12,.46),(.28,.1,.09),gold,.018)
            cylinder('Engine interior',(side*.66,-1.33,.22),.10,.012,light,(math.pi/2,0,0),24)
        for mat in [ivory,steel]:
            n=mat.node_tree.nodes;l=mat.node_tree.links;bs=n.get('Principled BSDF')
            noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=95;noise.inputs['Detail'].default_value=2
            bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.13;bump.inputs['Distance'].default_value=.007
            l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],bs.inputs['Normal'])
        cam.location=(4,-5,10);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=4.9
        scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.cycles.samples=64
    scene.render.filepath=os.path.join(root,family,'%02d.png'%(i+1))
    if i==0:bpy.ops.wm.save_as_mainfile(filepath=os.path.join(source,family+'-master.blend'))
    bpy.ops.render.render(write_still=True)
    print('ASTRA_RENDERED',family,i+1,flush=True)
