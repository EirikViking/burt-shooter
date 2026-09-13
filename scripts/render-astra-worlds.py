# SPDX-License-Identifier: GPL-3.0-or-later
# Original procedural planetary environments. No satellite imagery or textures.
import importlib.util, os, sys, math, random
spec=importlib.util.spec_from_file_location('astra_mesh',os.path.join(os.getcwd(),'scripts/render-astra-v2.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
from mathutils import Vector
bpy=m.bpy;args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['world','1'];count=int(args[1]) if len(args)>1 else 1;start=int(args[2]) if len(args)>2 else 0
out=os.path.abspath('docs/astra-v2-models/renders/world');os.makedirs(out,exist_ok=True)
s=m.s;s.render.resolution_x=2048;s.render.resolution_y=1152;s.cycles.samples=48;s.render.film_transparent=False
m.cam.location=(0,0,35);m.cam.rotation_euler=(0,0,0);m.cam.data.ortho_scale=26
def ramp(n,points):
    c=n.new('ShaderNodeValToRGB');c.color_ramp.elements.remove(c.color_ramp.elements[1]);c.color_ramp.elements[0].position=points[0][0];c.color_ramp.elements[0].color=(*points[0][1],1)
    for p,color in points[1:]:e=c.color_ramp.elements.new(p);e.color=(*color,1)
    return c
def noise(n,scale,detail=5):
    q=n.new('ShaderNodeTexNoise');q.inputs['Scale'].default_value=scale;q.inputs['Detail'].default_value=detail;q.inputs['Roughness'].default_value=.72;return q
def planet_material(i):
    ocean=[(.008,.037,.075),(.035,.008,.004),(.11,.17,.22),(.035,.023,.07),(.014,.10,.12),(.18,.07,.022),(.025,.07,.03),(.045,.032,.09),(.06,.09,.14),(.028,.006,.008),(.12,.055,.026),(.007,.035,.095)][i%12]
    land=[(.13,.22,.065),(.24,.075,.018),(.64,.76,.8),(.20,.12,.33),(.32,.44,.22),(.61,.37,.11),(.19,.32,.08),(.44,.20,.38),(.42,.52,.65),(.36,.055,.015),(.48,.26,.08),(.10,.26,.15)][i%12]
    p=m.mat('Planet %02d crust'%i,ocean,.07,.73);n=p.node_tree.nodes;l=p.node_tree.links;b=n['Principled BSDF'];coord=n.new('ShaderNodeTexCoord')
    warp=noise(n,7,5);l.new(coord.outputs['Generated'],warp.inputs['Vector'])
    distort=n.new('ShaderNodeVectorMath');distort.operation='SCALE';distort.inputs[3].default_value=.22;l.new(warp.outputs['Color'],distort.inputs[0])
    add=n.new('ShaderNodeVectorMath');add.operation='ADD';l.new(coord.outputs['Generated'],add.inputs[0]);l.new(distort.outputs[0],add.inputs[1])
    continent=noise(n,3.1+(i%12)*.21,8);l.new(add.outputs[0],continent.inputs['Vector'])
    colors=ramp(n,[(.32,tuple(c*.35 for c in ocean)),(.48,ocean),(.512,tuple(c*1.8 for c in ocean)),(.529,land),(.63,tuple(c*.46 for c in land)),(.73,tuple(min(.9,c*1.45) for c in land))]);l.new(continent.outputs['Fac'],colors.inputs[0]);l.new(colors.outputs[0],b.inputs['Base Color'])
    fine=noise(n,90,6);l.new(coord.outputs['Generated'],fine.inputs['Vector']);bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.34;bump.inputs['Distance'].default_value=.055;l.new(fine.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],b.inputs['Normal'])
    if i%4==0:
        cities=noise(n,240,3);l.new(coord.outputs['Generated'],cities.inputs['Vector'])
        islands=n.new('ShaderNodeMath');islands.operation='GREATER_THAN';islands.inputs[1].default_value=.73;l.new(cities.outputs['Fac'],islands.inputs[0])
        landmask=n.new('ShaderNodeMath');landmask.operation='GREATER_THAN';landmask.inputs[1].default_value=.53;l.new(continent.outputs['Fac'],landmask.inputs[0])
        geo=n.new('ShaderNodeNewGeometry');dot=n.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT';dot.inputs[1].default_value=(-.5,.6,.7);l.new(geo.outputs['Normal'],dot.inputs[0])
        night=n.new('ShaderNodeMath');night.operation='LESS_THAN';night.inputs[1].default_value=.12;l.new(dot.outputs['Value'],night.inputs[0])
        lit=n.new('ShaderNodeMath');lit.operation='MULTIPLY';l.new(islands.outputs[0],lit.inputs[0]);l.new(landmask.outputs[0],lit.inputs[1])
        mask=n.new('ShaderNodeMath');mask.operation='MULTIPLY';l.new(lit.outputs[0],mask.inputs[0]);l.new(night.outputs[0],mask.inputs[1]);l.new(mask.outputs[0],b.inputs['Emission Strength']);b.inputs['Emission Color'].default_value=(1,.50,.13,1)
    # Gas worlds use turbulent latitude bands and irregular storm cells.
    if i%4==3:
        separate=n.new('ShaderNodeSeparateXYZ');l.new(add.outputs[0],separate.inputs[0]);mul=n.new('ShaderNodeMath');mul.operation='MULTIPLY';mul.inputs[1].default_value=65;l.new(separate.outputs['Y'],mul.inputs[0]);wave=n.new('ShaderNodeMath');wave.operation='SINE';l.new(mul.outputs[0],wave.inputs[0]);normalize=n.new('ShaderNodeMath');normalize.operation='MULTIPLY_ADD';normalize.inputs[1].default_value=.5;normalize.inputs[2].default_value=.5;l.new(wave.outputs[0],normalize.inputs[0]);band=ramp(n,[(.08,tuple(c*.28 for c in land)),(.5,ocean),(.85,land)]);l.new(normalize.outputs[0],band.inputs[0]);l.new(band.outputs[0],b.inputs['Base Color']);bump.inputs['Strength'].default_value=.12
    return p
def clouds(i):
    c=m.mat('Cloud layer',(.66,.74,.79),0,1);n=c.node_tree.nodes;l=c.node_tree.links;b=n['Principled BSDF'];out=n['Material Output'];coord=n.new('ShaderNodeTexCoord');q=noise(n,8.3+i*.31,8);l.new(coord.outputs['Generated'],q.inputs['Vector'])
    cover=ramp(n,[(.50,(0,0,0)),(.59,(.8,.8,.8)),(.67,(1,1,1))]);l.new(q.outputs['Fac'],cover.inputs[0]);trans=n.new('ShaderNodeBsdfTransparent');mix=n.new('ShaderNodeMixShader');l.new(cover.outputs[0],mix.inputs[0]);l.new(trans.outputs[0],mix.inputs[1]);l.new(b.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],out.inputs[0]);return c
def atmosphere(color):
    c=bpy.data.materials.new('Atmospheric limb');c.use_nodes=True;n=c.node_tree.nodes;l=c.node_tree.links;n.clear();o=n.new('ShaderNodeOutputMaterial');e=n.new('ShaderNodeEmission');e.inputs[0].default_value=(*color,1);e.inputs[1].default_value=1.4;t=n.new('ShaderNodeBsdfTransparent');mix=n.new('ShaderNodeMixShader');weight=n.new('ShaderNodeLayerWeight');weight.inputs['Blend'].default_value=.10;l.new(weight.outputs['Fresnel'],mix.inputs[0]);l.new(t.outputs[0],mix.inputs[1]);l.new(e.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],o.inputs[0]);return c
def make(i):
    m.clear();r=random.Random(8200+i)
    for o in list(bpy.data.objects):
        if o.type=='LIGHT':bpy.data.objects.remove(o,do_unlink=True)
    # Multiscale nebula is a low-luminance distant layer; brighter wisps stay high.
    neb=m.mat('Distant nebula',(.004,.007,.019),0,1);n=neb.node_tree.nodes;l=neb.node_tree.links;b=n['Principled BSDF'];q=noise(n,2.8+i*.17,7)
    nebcolor=[(.055,.10,.18),(.12,.055,.025),(.065,.08,.15),(.12,.04,.14)][i%4]
    color=ramp(n,[(.24,(.001,.002,.007)),(.49,(.003,.008,.018)),(.68,nebcolor),(.79,tuple(c*1.9 for c in nebcolor))]);l.new(q.outputs['Fac'],color.inputs[0]);l.new(color.outputs[0],b.inputs['Emission Color']);b.inputs['Emission Strength'].default_value=.5
    m.box('Nebular depth',(0,0,-24),(42,28,.02),neb,0)
    loc=(-9.8,3.7,-7);radius=7.45
    world=m.sphere('Detailed world',loc,(radius,radius,radius),planet_material(i),128);world.rotation_euler=(.3+i*.13,.2+i*.27,-.18)
    if i%4!=3:
        cloud=m.sphere('Volumetric-looking cloud deck',loc,(radius+.045,)*3,clouds(i),128);cloud.rotation_euler=world.rotation_euler
    at=m.sphere('Atmospheric rim',loc,(radius+.10,)*3,atmosphere([(.035,.34,.70),(.62,.15,.05),(.18,.48,.68),(.45,.15,.65)][i%4]),128)
    # Ring systems are tilted meshes with radial gaps and dust density variation.
    if i%3==1 or i%4==3:
        rings=m.mat('Icy ring particles',(.37,.28,.20),.15,.85);n=rings.node_tree.nodes;l=rings.node_tree.links;b=n['Principled BSDF'];tex=noise(n,140,3);rr=ramp(n,[(.28,(.03,.025,.02)),(.48,(.19,.15,.11)),(.68,(.58,.44,.30))]);l.new(tex.outputs['Fac'],rr.inputs[0]);l.new(rr.outputs[0],b.inputs['Base Color'])
        for j in range(14):
            a0=radius*(1.17+j*.042);a1=a0+radius*(.019 if j%3==0 else .027);v=[];f=[]
            for k in range(129):a=k*math.tau/128;v.extend([(math.cos(a)*a0,math.sin(a)*a0,0),(math.cos(a)*a1,math.sin(a)*a1,0)])
            for k in range(128):f.append((k*2,k*2+1,k*2+3,k*2+2))
            me=bpy.data.meshes.new('Ring annulus');me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new('Separated dust ring',me);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(.82,.18,-.46);m.finish(o,rings)
    # A secondary moon gives scale, plus sparse star clusters and foreground rock.
    moon=m.sphere('Distant companion',(8,4.5,-10),(1.04,)*3,planet_material((i+2)%12),64)
    for j in range(430):
        x=r.uniform(-16,16);y=r.uniform(-10,10);size=r.uniform(.003,.016)
        star=m.box('Distant stellar point',(x,y,-18),(size,size,.001),m.ice if j%3 else m.warm,0)
    for j in range(16):
        x=r.uniform(10,15);y=r.uniform(-9,8);scale=r.uniform(.06,.32)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=scale,location=(x,y,-3));o=bpy.context.object;o.rotation_euler=(r.random()*3,r.random()*3,r.random()*3);m.finish(o,m.steel)
    m.area('Solar key',(-14,12,15),5200,(.80,.90,1),5,target=loc)
    m.area('Planet bounce',(-2,-8,6),300,(.18,.32,.55),8,target=loc)
for i in range(start,start+count):
    make(i);s.render.filepath=os.path.join(out,'%02d.png'%(i+1))
    if i<4:bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('docs/astra-v2-models/world-%02d.blend'%(i+1)))
    bpy.ops.render.render(write_still=True);print('ASTRA_WORLD_RENDERED',i+1,flush=True)
