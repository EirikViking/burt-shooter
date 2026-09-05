# SPDX-License-Identifier: GPL-3.0-or-later
# Fifty original mechanical bosses; ten silhouettes with five escalating tiers.
import importlib.util, os, sys, math
spec=importlib.util.spec_from_file_location('astra_mesh',os.path.join(os.getcwd(),'scripts/render-astra-v2.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
from mathutils import Vector
bpy=m.bpy;args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['boss','1']
count=int(args[1]) if len(args)>1 else 1;start=int(args[2]) if len(args)>2 else 0
out=os.path.abspath('docs/astra-v2-models/renders/boss');os.makedirs(out,exist_ok=True)
s=m.s;s.render.resolution_x=1024;s.render.resolution_y=1024;s.cycles.samples=64
m.cam.location=(0,-3,16);m.cam.rotation_euler=(Vector((0,0,.25))-m.cam.location).to_track_quat('-Z','Y').to_euler();m.cam.data.ortho_scale=8.6
def ring(name,pos,r,minor,mat):
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=minor,major_segments=64,minor_segments=12,location=pos);o=bpy.context.object;o.name=name;m.finish(o,mat);return o
def reactor(x,y,z,r,glow,tier=0):
    m.cyl('Containment foundation',(x,y,z),r*1.2,.24,m.black,vertices=12)
    ring('Reactor armored lip',(x,y,z+.15),r,.095,m.copper)
    m.cyl('Ion well',(x,y,z+.12),r*.91,.08,m.black)
    m.sphere('Recessed plasma lens',(x,y,z+.21),(r*.39,r*.39,r*.15),glow)
    for k in range(16):
        a=k*math.tau/16;px=x+math.cos(a)*r*.60;py=y+math.sin(a)*r*.60
        o=m.box('Radial iris armor',(px,py,z+.23),(r*.13,r*.30,.055),m.steel,.012);o.rotation_euler.z=a-math.pi/2+.28
    ring('Magnetic field cage',(x,y,z+.29),r*.73,.025,m.silver)
    for k in range(12):
        a=k*math.tau/12;px=x+math.cos(a)*r*.94;py=y+math.sin(a)*r*.94
        o=m.box('Containment locking tooth',(px,py,z+.24),(.13,.24,.18),m.steel,.025);o.rotation_euler.z=a-math.pi/2
        m.cyl('Locking tooth bolt',(px,py,z+.34),.027,.02,m.copper,vertices=12)
def turret(x,y,z,scale,glow,angle=0):
    m.cyl('Weapon turret traverse',(x,y,z),.25*scale,.11*scale,m.black)
    m.cyl('Turret armored cap',(x,y,z+.11*scale),.22*scale,.21*scale,m.armor,vertices=8)
    for side in [-1,1]:
        dx=side*.09*scale
        o=m.cyl('Heavy cannon barrel',(x+dx,y+.26*scale,z+.25*scale),.055*scale,.66*scale,m.silver,'Y',16)
        m.cyl('Heavy bore',(x+dx,y+.60*scale,z+.25*scale),.07*scale,.06*scale,m.black,'Y',16)
        m.cyl('Weapon charge iris',(x+dx,y+.635*scale,z+.25*scale),.043*scale,.015*scale,glow,'Y',16)
def module(x,y,z,w,h,paint,glow,index):
    m.box('Load bearing spar',(x,y,z),(w,h,.3),m.black,.08)
    contour=[(-.5,-.28),(-.36,-.5),(.35,-.5),(.5,-.28),(.44,.25),(.17,.53),(-.24,.46),(-.46,.20)]
    m.poly('Armored cell perimeter',[(x+a*w,y+b*h) for a,b in contour],z+.15,.15,m.silver,.035)
    m.poly('Sculpted interlocking armor cell',[(x+a*w*.91,y+b*h*.91) for a,b in contour],z+.26,.20,paint,.045)
    m.box('Machinery access bay',(x-w*.10,y-h*.05,z+.465),(w*.40,h*.48,.018),m.black,.025)
    for k in range(7):m.box('Recessed radiator blade',(x-w*.10,y-h*.24+k*h*.06,z+.489),(w*.33,.021,.035),m.copper if k%3==0 else m.steel,.005)
    m.poly('Raised armor shoulder',[(x+w*.16,y-h*.28),(x+w*.38,y-h*.19),(x+w*.31,y+h*.29),(x+w*.14,y+h*.37)],z+.47,.07,m.armor,.012)
    m.tube('Cell hydraulic line',[(x-w*.36,y-h*.28,z+.48),(x-w*.38,y+h*.13,z+.49),(x-w*.20,y+h*.35,z+.49)],.016,m.copper)
    for a in [-1,1]:
        for b in [-1,1]:m.cyl('Hull assembly stud',(x+a*w*.36,y+b*h*.34,z+.39),.037,.024,m.copper,vertices=12)
        m.box('Hull status emitter',(x+a*w*.37,y,z+.40),(.026,h*.24,.014),glow,.004)
    if index%2==0:turret(x,y-h*.3,z+.42,.64,glow)
def make(index):
    m.clear();v=index%10;t=index//10
    colors=[(.22,.07,.19),(.28,.105,.025),(.14,.085,.27),(.11,.20,.26),(.055,.20,.14),(.22,.14,.055),(.055,.16,.22),(.25,.055,.075),(.07,.20,.19),(.24,.17,.07)]
    lights=[(.94,.14,.59),(1,.32,.045),(.5,.29,1),(.15,.8,1),(.2,1,.58),(1,.55,.12),(.16,.72,1),(1,.09,.17),(.15,.9,.76),(.8,.55,.1)]
    paint=m.mat('Boss %02d armor'%index,colors[v],.72,.3,micro=True);glow=m.mat('Boss %02d reactor'%index,lights[v],.3,.24,1.6)
    # Center always occupies the original collision volume. Outer structure is
    # silhouette and weapon hardware, not an invented secondary hitbox.
    m.sphere('Armored command core',(0,0,.15),(1.1,.98,.49),m.steel)
    reactor(0,0,.52,.48+t*.025,glow,t)
    if v==0: # Sonia: crown and four hooked articulated wings.
        for side in [-1,1]:
            for end in [-1,1]:
                points=[(.60,.38*end),(1.45,1.08*end),(2.9,2.23*end),(2.40,.45*end),(1.1,-.35*end)]
                m.poly('Sonia hooked crown wing',[(side*x,y) for x,y in points],.1,.33,paint,.065)
                for j in range(5):
                    x=side*(.95+j*.33);y=end*(.24+j*.26)
                    module(x,y,.36,.37,.42,paint,glow,j)
                    m.poly('Radiating crown blade',[(x,y),(x+side*.31,y+end*.67),(x+side*.14,y-.14*end)],.46,.12,m.armor,.02)
                turret(side*1.28,end*.82,.61,.92,glow)
        for j in range(7):
            a=math.pi*j/6;m.cyl('Crown reactor satellite',(math.cos(a)*1.12,math.sin(a)*1.12,.43),.14,.22,m.copper);reactor(math.cos(a)*1.12,math.sin(a)*1.12,.61,.075,glow)
    elif v==1: # Forge: thick hammerhead fortress and furnace rows.
        for side in [-1,1]:
            for j in range(3):module(side*(1.0+j*.73),.48-j*.08,.18, .81,1.68,paint,glow,j)
            module(side*.71,-1.35,.23,.85,1.40,paint,glow,1)
            reactor(side*1.15,.57,.72,.31,glow)
            turret(side*2.38,.82,.65,1.2,glow)
    elif v==2: # Mirror: three armored connected discs.
        for side in [-1,1]:
            m.box('Mirror bridge',(side*.96,0,.12),(1.5,.3,.23),m.silver,.03)
            ring('Mirror orbit frame',(side*1.82,.25,.23),.91,.14,paint)
            reactor(side*1.82,.25,.38,.58,glow)
            for j in range(8):a=j*math.tau/8;module(side*1.82+math.cos(a)*.92,.25+math.sin(a)*.92,.27,.34,.43,paint,glow,j)
        for y in [-1.5,1.5]:module(0,y,.24,.86,.78,paint,glow,0)
    elif v==3: # Needle: long spear hull, split forward rails.
        m.loft('Needle armored lance',[(-2.4,.34,.15,.20),(-1.0,.75,.24,.36),(1.0,.47,.24,.36),(3.0,.01,.14,.02)],paint)
        for side in [-1,1]:
            for j in range(5):module(side*(.81-j*.05),-.9+j*.65,.35,.32,.47,paint,glow,j)
            m.tube('Long-range accelerator rail',[(side*.64,-1.4,.38),(side*.95,.25,.62),(side*.52,2.50,.42)],.11,m.silver)
            turret(side*1.32,-.65,.38,1.2,glow)
    elif v==4: # Vortex: floating rotor with a continuous dark collision core.
        for radius in [1.15,1.9,2.62]:ring('Vortex rotor',(0,0,.16),radius,.13 if radius<2 else .10,paint)
        for j in range(9):
            a=j*math.tau/9
            blade=[(.94,-.08),(1.65,-.44),(2.80,-.14),(2.34,.30),(1.60,.12)]
            m.poly('Swept turbine blade',[(math.cos(a)*x-math.sin(a)*y,math.sin(a)*x+math.cos(a)*y) for x,y in blade],.2,.19,paint,.036)
            m.tube('Rotor radial spar',[(math.cos(a)*.7,math.sin(a)*.7,.15),(math.cos(a)*2.60,math.sin(a)*2.60,.15)],.11,m.silver)
            module(math.cos(a)*2.11,math.sin(a)*2.11,.27,.50,.68,paint,glow,j)
    elif v==5: # Jester: asymmetric masks carried by an angular chassis.
        for j,(x,y,r) in enumerate([(-1.52,.65,.7),(1.28,-.65,.9),(1.15,1.4,.38)]):
            m.tube('Offset truss',[(0,0,.12),(x,y,.2)],.21,m.steel);reactor(x,y,.40,r,glow)
            for k in range(6):a=k*math.tau/6;module(x+math.cos(a)*r*1.3,y+math.sin(a)*r*1.3,.3,.31,.41,paint,glow,k)
        m.poly('Jester lower keel',[(-1.0,-.6),(0,-2.65),(.45,-1.4)],.12,.23,paint,.055)
    elif v==6: # Carrier: cathedral hull with lit hangars and three spires.
        for side in [-1,1]:
            for j in range(4):module(side*1.34,-1.55+j*.90,.15,1.04,.85,paint,glow,1)
            for j in range(5):
                y=-1.50+j*.70;m.box('Open hangar void',(side*.77,y,.5),(.28,.44,.08),m.black,.015);m.box('Hangar running lamp',(side*.79,y,.555),(.035,.36,.02),glow,.005)
            m.poly('Cathedral bow spire',[(side*.83,1.4),(side*1.33,3.0),(side*1.86,1.4)],.24,.25,m.armor,.045)
        m.poly('Command spire',[(-.45,.45),(0,2.8),(.45,.45)],.60,.24,paint,.03)
        turret(0,-1.56,.48,1.4,glow)
    elif v==7: # Monolith: stacked battleship armor, heavy turrets.
        for side in [-1,1]:
            for j in range(4):module(side*.91,-1.8+j*1.04,.20,1.65,.95,paint,glow,j)
            for y in [-1.5,1.55]:turret(side*1.67,y,.44,1.35,glow)
        for j in range(4):m.box('Monolith keel armor',(0,-1.6+j*1.08,.7),(.58,.78,.33),m.armor,.09)
    elif v==8: # Choir: five organ-like laser towers on a crescent.
        for j in range(5):
            x=(j-2)*1.04;y=.30-abs(j-2)*.22
            m.box('Choir transverse beam',(x,y-.8,.2),(1.06,.3,.3),m.silver,.035)
            module(x,y,.30,.75,1.35,paint,glow,1)
            m.poly('Choir resonator blade',[(x-.30,y+.1),(x,y+2.13-abs(j-2)*.26),(x+.30,y+.1)],.48,.3,m.armor,.03)
            reactor(x,y-.37,.67,.20,glow);turret(x,y+.71,.76,.7,glow)
    else: # Clock: clockwork escapement, gears, radial artillery.
        ring('Clock main case',(0,0,.23),2.42,.23,paint);ring('Clock brass race',(0,0,.4),2.12,.09,m.copper)
        for j in range(24):
            a=j*math.tau/24;x=math.cos(a)*2.43;y=math.sin(a)*2.43;o=m.box('Escapement tooth',(x,y,.36),(.20,.28,.18),m.silver,.017);o.rotation_euler.z=a
        for j in range(8):
            a=j*math.tau/8;x=math.cos(a)*1.75;y=math.sin(a)*1.75
            m.tube('Clock inner spoke',[(0,0,.15),(x,y,.26)],.14,m.steel);reactor(x,y,.32,.29,glow);turret(x,y,.70,.65,glow)
    # Escalation adds machinery, satellite chambers and a changing crown.
    for j in range(t+2):
        a=(j+.5)*math.tau/(t+2);x=math.cos(a)*.84;y=math.sin(a)*.84
        m.cyl('Escalation chamber',(x,y,.60),.13,.3,m.copper)
        m.cyl('Escalation lamp',(x,y,.76),.086,.015,glow)
    for j in range(20):
        a=j*math.tau/20;m.cyl('Core armor rivet',(math.cos(a)*.99,math.sin(a)*.88,.50),.027,.025,m.silver,vertices=12)
    # Large directional armor and fine markings break up the main structures.
    # These nested scales survive both boss-size play and the enlarged codex.
    for side in [-1,1]:
        for j in range(6):
            a=.20+j*.205;x=side*math.cos(a)*.87;y=math.sin(a)*.80
            m.poly('Command carapace segment',[(x-side*.14,y-.08),(x+side*.12,y-.13),(x+side*.14,y+.09),(x-side*.08,y+.14)],.48,.065,paint,.016)
        if v in [3,6,8]:
            for j in range(6):
                y=.8+j*.25;xx=side*(.18 if v==3 else .08)
                m.box('Spear armor transverse seam',(xx,y,.89 if v==6 else .58),(.21,.025,.015),m.black,.003)
        if t>0:
            for j in range(t):
                x=side*(.62+j*.25);y=-.85-j*.14
                module(x,y,.20,.38,.64,paint,glow,j+1)
if __name__=='__main__':
    for i in range(start,start+count):
        make(i);s.render.filepath=os.path.join(out,'%02d.png'%(i+1))
        if i<10:bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('docs/astra-v2-models/boss-%02d.blend'%(i+1)))
        bpy.ops.render.render(write_still=True);print('ASTRA_BOSS_RENDERED',i+1,flush=True)
