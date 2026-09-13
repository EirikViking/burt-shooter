# SPDX-License-Identifier: GPL-3.0-or-later
# Original Nova Swarm machinery and worlds. No downloaded meshes or textures.
# Blender 4.5: --background --python scripts/render-astra-v2.py -- player 1
import bpy, math, os, sys, random
bpy.context.preferences.filepaths.save_version=0
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['player','1']
family=args[0];count=int(args[1]) if len(args)>1 else 1;start=int(args[2]) if len(args)>2 else 0
root=os.path.abspath('docs/astra-v2-models');out=os.path.join(root,'renders',family);os.makedirs(out,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=64;s.cycles.use_denoising=True
try:
    pref=bpy.context.preferences.addons['cycles'].preferences;pref.compute_device_type='OPTIX';pref.get_devices()
    for d in pref.devices:d.use=d.type!='CPU'
    if any(d.use for d in pref.devices):s.cycles.device='GPU'
except Exception as e:print('GPU fallback:',e)
s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
s.render.resolution_x=768;s.render.resolution_y=768;s.render.resolution_percentage=100
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast';s.view_settings.exposure=-.2
s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.22,.32,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.14
def mat(name,c,metal=.8,rough=.3,emit=0,micro=False):
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;b=n['Principled BSDF']
    b.inputs['Base Color'].default_value=(*c,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough
    if emit:b.inputs['Emission Color'].default_value=(*c,1);b.inputs['Emission Strength'].default_value=emit
    if micro:
        noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=170;noise.inputs['Detail'].default_value=3
        bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.008
        l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],b.inputs['Normal'])
    return m
steel=mat('Titanium structural alloy',(.20,.28,.36),.85,.26, micro=True)
armor=mat('Pearl titanium armor',(.31,.39,.44),.72,.34,micro=True)
black=mat('Graphite machinery recess',(.018,.025,.034),.73,.34)
copper=mat('Heat discolored copper',(.48,.21,.075),.83,.27,micro=True)
silver=mat('Polished machined edges',(.6,.7,.76),.9,.2)
glass=mat('Deep teal canopy',(.009,.115,.16),.68,.13)
ice=mat('Ion emitter',(.12,.72,1),.25,.22,3)
warm=mat('Reactor plasma',(1,.31,.055),.15,.26,3)
white=mat('Service stencils',(.7,.78,.77),.1,.5)
def finish(ob,m,bevel=0):
    ob.data.materials.append(m)
    if bevel:
        b=ob.modifiers.new('Machined bevel','BEVEL');b.width=bevel;b.segments=3
        ob.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return ob
def box(name,pos,size,m,bevel=.02):
    x,y,z=[a*.5 for a in size];v=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    me=bpy.data.meshes.new(name);me.from_pydata(v,[],[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.location=pos;return finish(o,m,bevel)
def poly(name,xy,z,h,m,bevel=.025):
    n=len(xy);v=[(x,y,z) for x,y in xy]+[(x,y,z+h) for x,y in xy];f=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
    me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return finish(o,m,bevel)
def cyl(name,pos,r,d,m,axis='Z',vertices=24):
    rot=(math.pi/2,0,0) if axis=='Y' else (0,math.pi/2,0) if axis=='X' else (0,0,0)
    v=[(math.cos(k*math.tau/vertices)*r,math.sin(k*math.tau/vertices)*r,z) for z in [-d*.5,d*.5] for k in range(vertices)]
    f=[tuple(range(vertices-1,-1,-1)),tuple(range(vertices,vertices*2))]+[(k,(k+1)%vertices,(k+1)%vertices+vertices,k+vertices) for k in range(vertices)]
    me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=rot;return finish(o,m,.012)
def sphere(name,pos,scale,m,segments=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=segments//2,radius=1,location=pos);o=bpy.context.object;o.name=name;o.scale=scale;finish(o,m)
    for p in o.data.polygons:p.use_smooth=True
    return o
def tube(name,points,r,m):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2;p=c.splines.new('POLY');p.points.add(len(points)-1)
    for v,co in zip(p.points,points):v.co=(*co,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
def loft(name,rings,m):
    n=16;v=[]
    for y,w,z,h in rings:
        for j in range(n):a=2*math.pi*j/n;v.append((math.cos(a)*w,y,z+math.sin(a)*h))
    f=[tuple(range(n-1,-1,-1)),tuple(range((len(rings)-1)*n,len(rings)*n))]
    for i in range(len(rings)-1):
        for j in range(n):f.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);finish(o,m,.018);return o
def area(name,pos,power,color,size,target=(0,0,0)):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-5,13));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=5.65;cam.rotation_euler=(Vector((0,0,.15))-cam.location).to_track_quat('-Z','Y').to_euler();s.camera=cam
area('Cold key',(-3,4,6),700,(.72,.87,1),3)
area('Warm grazing rim',(4,-1,3),1000,(1,.63,.32),2)
area('Canopy sky strip',(-1,-4,5),280,(.35,.7,1),2)
def clear():
    for ob in list(bpy.data.objects):
        if ob.type in ['MESH','CURVE','FONT']:bpy.data.objects.remove(ob,do_unlink=True)
    for collection in [bpy.data.meshes,bpy.data.curves]:
        for data in list(collection):
            if data.users==0:collection.remove(data)
def ship(index,enemy=False):
    clear();r=random.Random(701+index);v=index%6;t=index//6
    colors=[(.05,.16,.23),(.13,.23,.33),(.37,.10,.04),(.27,.20,.075),(.13,.08,.24),(.03,.21,.15)]
    paint=mat('Fleet enamel %d'%index,colors[v],.56,.26,micro=True)
    shell=paint if enemy else armor
    span=[1.7,1.4,1.75,1.2,1.8,1.55][v];lead=[.05,.6,-.2,1.05,.4,-.4][v]
    loft('Sculpted pressure hull',[(-1.65,.22,.2,.17),(-1.1,.43,.27,.25),(-.3,.47,.28,.37),(.5,.35,.25,.31),(1.3,.23,.15,.19),(2.04,.018,.06,.025)],steel)
    # Separate armor shells leave dark gaps and highlight curved shoulders.
    for j in range(7):
        y=-1.35+j*.42;width=.38 if j<4 else .30-(j-4)*.08;z=.42 if j<4 else .40-(j-4)*.09
        poly('Segmented dorsal armor',[(-width,y-.17),(width,y-.17),(width*.87,y+.18),(-width*.87,y+.18)],z,.09,shell,.035)
        for side in [-1,1]:cyl('Flush captive bolt',(side*width*.72,y-.105,z+.104),.023,.012,copper)
    loft('Canopy armored socket',[(-.57,.21,.6,.10),(-.3,.27,.61,.19),(.3,.22,.56,.20),(.7,.08,.45,.07)],black)
    loft('Curved crystalline cockpit',[(-.49,.16,.66,.09),(-.2,.205,.68,.16),(.26,.165,.60,.18),(.61,.045,.51,.04)],glass)
    tube('Canopy center frame',[(0,-.48,.75),(0,-.2,.845),(0,.26,.785),(0,.6,.57)],.017,silver)
    for side in [-1,1]:
        tube('Canopy rim',[(side*.15,-.47,.68),(side*.21,-.2,.70),(side*.17,.26,.65),(side*.035,.62,.51)],.019,silver)
        tube('Pressure conduit',[(side*.37,-1.3,.32),(side*.49,-.6,.43),(side*.39,.37,.4),(side*.2,1.1,.3)],.028,copper)
        # Wing shapes are cast structures with thick edges, inset livery and
        # separate service islands; no broad, unbroken flat white polygons.
        wing=[(.29,.8),(span,lead),(span*.92,-.86),(.91,-1.45),(.32,-1.08)]
        if enemy:wing=[(.30,.5),(span*.7,1.5),(span,1.22),(span*.92,-1.05),(.4,-1.38)]
        poly('Cast wing structure',[(side*x,y) for x,y in wing],.05,.16,black,.06)
        cx=sum(x for x,y in wing)/len(wing);cy=sum(y for x,y in wing)/len(wing)
        inset=[(side*(cx+(x-cx)*.94),cy+(y-cy)*.94) for x,y in wing]
        poly('Wing edge rail',inset,.17,.05,silver,.025)
        inset=[(side*(cx+(x-cx)*.86),cy+(y-cy)*.86) for x,y in wing]
        poly('Wing enamel skin',inset,.22,.07,paint,.024)
        poly('Leading armor blade',[(side*.37,.68),(side*(span-.13),lead-.03),(side*(span-.24),lead-.15),(side*.46,.48)],.28,.09,shell,.026)
        # Deep interrupted equipment trench with ribbing visible at game size.
        poly('Leading equipment trench',[(side*.47,.37),(side*(span-.28),lead-.22),(side*(span-.31),lead-.39),(side*.50,.14)],.295,.014,black,.008)
        for k in range(7):
            f=k/7;x=side*(.50+(span-.85)*f);y=.29+(lead-.58)*f
            rib=box('Oblique trench crossmember',(x,y,.333),(.045,.15,.047),copper if k%3==0 else silver,.005);rib.rotation_euler.z=side*.28
        for k in range(4):
            x=side*(.69+k*.19);y=-.12-k*.04
            box('Wing circuit recess',(x,y,.308),(.155,.16,.021),black,.008)
            for a in range(3):box('Exposed avionics fin',(x-.045+a*.045,y,.342),(.017,.105,.045),steel,.004)
            cyl('Copper heat sink',(x,y-.03,.377),.034,.025,copper,vertices=16)
        tube('Wing transfer conduit',[(side*.45,-.92,.34),(side*1.07,-1.13,.35),(side*(span-.23),-.70,.32)],.025,silver)
        # Panel assembly: black gasket, beveled hatch, circular fasteners,
        # white stencils, exposed vent blades and gold safety markings.
        for j in range(3):
            x=side*(.65+j*.255);y=-.58-j*.06
            box('Service island gasket',(x,y,.315),(.225,.40,.035),black,.015)
            box('Machined hatch',(x,y-.06,.351),(.185,.21,.045),steel,.016)
            for k in range(4):box('Heat exchange vane',(x,y+.06+k*.035,.37),(.174,.014,.025),silver,.002)
            for a in [-1,1]:cyl('Hatch screw',(x+a*.074,y-.12,.38),.015,.012,copper,vertices=12)
            for k in range(3):box('Stencil tick',(x-.05+k*.04,y-.054,.378),(.019,.035,.004),white,0)
        px=side*(.64 if v!=3 else .49)
        # Concentric engines with black recessed bores, ridged collars,
        # articulated radiators, pipes and exposed compression hardware.
        cyl('Turbine housing',(px,-.91,.29),.265,1.0,steel,'Y',32)
        for k in range(7):cyl('Cooling collar',(px,-.57-k*.113,.29),.27,.026,black if k%2 else silver,'Y',32)
        box('Engine upper shell',(px,-.65,.57),(.38,.56,.14),paint,.045)
        for k in range(6):box('Intake radiator',(px,-.48-k*.063,.653),(.29,.027,.027),silver,.004)
        cyl('Exhaust armor lip',(px,-1.49,.29),.28,.12,copper,'Y',32)
        cyl('Exhaust bore',(px,-1.56,.29),.235,.03,black,'Y',32)
        cyl('Recessed ion lens',(px,-1.579,.29),.161,.011,ice,'Y',32)
        for k in range(12):
            a=k*math.tau/12;cyl('Exhaust rim bolts',(px+math.cos(a)*.226,-1.583,.29+math.sin(a)*.226),.02,.016,silver,'Y',12)
        # Runtime exhaust supplies motion; the sprite contains a recessed throat.
        for j in range(2):tube('Engine hydraulic feed',[(px+side*.18,-1.3,.42),(px+side*.3,-1.05,.44+j*.055),(px+side*.26,-.7,.42+j*.055)],.019,copper)
        gx=side*(span-.17)
        box('Weapon armored mount',(gx,-.34,.3),(.19,.47,.21),steel,.04)
        for k in range(2):
            x=gx+side*(k-.5)*.08;cyl('Twin weapon barrel',(x,.16,.38),.036,.65,silver,'Y',16)
            cyl('Muzzle sleeve',(x,.48,.38),.051,.10,black,'Y',16);cyl('Muzzle rim',(x,.535,.38),.04,.012,copper,'Y',16)
        poly('Tail stabilizer',[(px-.10,-.7),(px+.10,-.75),(px+.10,-1.29),(px-.10,-1.42)],.59,.20+v*.018,paint,.022)
        for k in range(3+t):
            ob=box('Hazard chevron',(side*(.35+k*.07),-.94,.56),(.025,.11,.009),copper,.002);ob.rotation_euler.z=side*.4
        box('Navigation light',(side*(span-.13),lead-.30,.355),(.06,.14,.05),ice,.01)
        if t>1:
            cyl('Auxiliary magnetic coil',(side*.4,.81,.28),.105,.24,copper,'Y');box('Auxiliary armor',(side*.4,.81,.38),(.19,.28,.12),paint,.02)
        if t>2:tube('Tier secondary rail',[(side*.35,1.15,.27),(side*.53,.7,.49),(side*.5,.2,.54)],.035,silver)
    cyl('Reactor armored crown',(0,-1.18,.59),.19,.08,black)
    cyl('Reactor containment',(0,-1.18,.64),.145,.04,copper)
    cyl('Reactor lens',(0,-1.18,.67),.095,.018,warm)
    for j in range(8):
        a=j*math.tau/8;box('Reactor rim clips',(math.cos(a)*.14,-1.18+math.sin(a)*.14,.678),(.045,.04,.035),silver,.005)
    # Broad raised shoulders vary by tier; original in-game identities stay put.
    if not enemy and index>=25:
        special=index-25
        for side in [-1,1]:
            if special in [0,1]:
                points=[(side*.9,-.9),(side*2.0,-.45),(side*1.88,1.7),(side*1.40,.55),(side*1.10,-.65)]
                poly('Ascendant swept horn',points,.32,.16,paint,.04)
                tube('Ascendant luminous spine',[(side*1.11,-.64,.51),(side*1.67,.2,.51),(side*1.85,1.4,.51)],.026,ice if special==0 else copper)
            elif special==2:
                poly('Aegis armored shield wing',[(side*.75,.66),(side*1.80,.42),(side*1.92,-.5),(side*1.16,-1.16)],.34,.18,armor,.045)
                for k in range(5):box('Aegis deflector vent',(side*(1.16+k*.11),-.27,.54),(.041,.61,.033),copper,.005)
            elif special==3:
                for k in range(2):
                    x=side*(.63+k*.22);box('Railbreaker accelerator',(x,.57,.32),(.12,2.8,.15),black,.02);box('Railbreaker live rail',(x,.70,.42),(.034,2.5,.028),ice,.004)
            else:
                for k in range(3):
                    x=side*(.75+k*.33);y=-.55+k*.24;box('Sovereign drone bay',(x,y,.39),(.29,.59,.19),steel,.03);box('Sovereign drone deck',(x,y,.50),(.16,.4,.06),paint,.012);box('Drone bay lamp',(x,y+.2,.54),(.07,.045,.023),ice,.004)
    if v in [2,4]:
        for side in [-1,1]:poly('Forward canard',[(side*.2,.95),(side*.65,1.22),(side*.58,.70),(side*.23,.54)],.19,.1,paint,.024)
    for side in [-1,1]:
        for j in range(8):
            y=.77+j*.125;w=max(.034,.21-j*.022);z=.41-j*.043
            seam=box('Nose armor seam',(side*w*.52,y,z),(.8*w,.018,.016),black,.002);seam.rotation_euler.y=side*.34
        for j in range(11):
            x=side*(.43+j*.108);y=-1.00 if j<4 else -.94+(j-4)*.045
            cyl('Wing perimeter rivet',(x,y,.303),.012,.018,silver,vertices=12)
if __name__=='__main__':
    for i in range(start,start+count):
        ship(i,family=='enemy')
        if family=='hero':
            cam.location=(5,-7,10);cam.rotation_euler=(Vector((0,0,.2))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=5.5
            s.render.resolution_x=1536;s.render.resolution_y=1536;s.cycles.samples=96
        s.render.filepath=os.path.join(out,'%02d.png'%(i+1))
        if i==start:bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,family+'-master.blend'))
        bpy.ops.render.render(write_still=True);print('ASTRA_V2_RENDERED',family,i+1,flush=True)
