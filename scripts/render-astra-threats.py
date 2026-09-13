# SPDX-License-Identifier: GPL-3.0-or-later
# Original modular fleet: maintenance tenders and heavy specialist interceptors.
import importlib.util,os,sys,math,json,random
from mathutils import Vector
spec=importlib.util.spec_from_file_location('mesh',os.path.join(os.getcwd(),'scripts/render-astra-v2.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
bpy=m.bpy;s=m.s
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['elites','1','0']
family=args[0];count=int(args[1]);start=int(args[2]) if len(args)>2 else 0
receipt=json.load(open('docs/astra-v3-models/threat-sources.json'))[family]
out=os.path.abspath('docs/astra-v3-models/renders/'+family);os.makedirs(out,exist_ok=True)
s.render.resolution_x=s.render.resolution_y=640;s.cycles.samples=40;s.render.use_persistent_data=True
s.view_settings.exposure=-.3

def rgb(n):return tuple(((int(n)>>shift)&255)/255 for shift in [16,8,0])
def wing(side,x,y,length,paint):
 m.poly('Cast armored outrigger',[(side*.28,y+.3),(side*x,y+length),(side*(x+.27),y+length-.24),(side*(x+.22),y-.9),(side*.35,y-.58)],.06,.18,m.black,.025)
 m.poly('Layered outrigger armor',[(side*.40,y+.22),(side*x,y+length-.07),(side*(x+.20),y+length-.28),(side*(x+.14),y-.78),(side*.43,y-.49)],.245,.09,paint,.023)
 for j in range(6):
  m.box('Recessed radiator',(side*(x-.04),y-.55+j*.105,.35),(.19,.047,.03),m.black,.006)
  m.box('Radiator edge',(side*(x-.08),y-.55+j*.105,.382),(.05,.042,.02),m.copper,.004)

for p in receipt[start:start+count]:
 i=p['index'];m.clear();rng=random.Random(997+i*37)
 color=rgb(p.get('tint') or 0x487d9d);accent=rgb(p.get('accent') or p.get('tint') or 0x4fe7d0)
 paint=m.mat('Fleet ceramic enamel',tuple(c*.30+.02 for c in color),.63,.31, micro=True)
 light=m.mat('Contained reactor energy',accent,.2,.2,3)
 support=family=='supports';role=p.get('role','');v=i%12
 if support:v=['fuel_runner','armor_mender','shield_tug','spark_barge','mercy_skiff','reactor_nurse','panic_patch','warranty_tow'].index(role)
 span=(1.18 if support else 1.48)+(i%4)*.09
 # Pressure vessel with interrupted ceramic skin and recessed hot core.
 m.loft('Armored central fuselage',[(-1.40,.25,.18,.16),(-.9,.46,.25,.28),(0,.52,.22,.32),(.8,.31,.18,.24),(1.4,.065,.10,.06)],m.steel)
 for j in range(5):
  y=-1.04+j*.39;w=.38 if j<3 else .29-(j-3)*.08
  m.poly('Overlapping pressure plates',[(-w,y-.16),(w,y-.16),(w*.86,y+.16),(-w*.86,y+.16)],.43 if j<3 else .34,.06,paint,.018)
  for side in [-1,1]:m.cyl('Recessed lock stud',(side*w*.73,y-.09,.503 if j<3 else .413),.023,.012,m.silver,vertices=12)
 m.cyl('Reactor socket',(0,-.25,.53),.28,.05,m.black)
 m.cyl('Copper containment collar',(0,-.25,.566),.22,.034,m.copper)
 m.cyl('Reactor lightwell',(0,-.25,.59),.16,.025,light)
 for j in range(10):
  a=j*math.tau/10;m.box('Containment claw',(math.cos(a)*.20,-.25+math.sin(a)*.20,.61),(.03,.055,.035),m.steel,.008)
 for side in [-1,1]:
  lead=[.2,1.1,-.3,.6,1.25,.3,-.5,.8,-.1,.5,1.1,-.4][v]
  wing(side,span,-.1,lead,paint)
  x=side*.75
  m.cyl('Drive housing',(x,-.89,.22),.22,.72,m.steel,'Y')
  for k in range(4):m.cyl('Drive radiator collar',(x,-.75-k*.15,.22),.235,.035,m.black,'Y')
  m.cyl('Exhaust recess',(x,-1.28,.22),.20,.04,m.black,'Y')
  m.cyl('Exhaust throat',(x,-1.31,.22),.13,.012,light,'Y')
  m.tube('Armored transfer line',[(side*.34,-.7,.34),(side*.72,-.60,.43),(side*span,-.4,.37)],.026,m.copper)
  for k in range(6):
   xx=side*(.50+k*.14);yy=.22-k*.04
   m.box('Equipment trench',(xx,yy,.37),(.105,.19,.035),m.black,.007)
   m.box('Equipment connector',(xx,yy,.40),(.072,.085,.044),m.silver,.006)
  if support:
   # Clearly unarmed: pressure tanks, shield vanes, tow forks and medical bays.
   if v in [0,3,5]:
    tx=side*(span-.12);m.cyl('External service tank',(tx,-.20,.50),.19,1.05,paint,'Y',32)
    for k in range(3):m.cyl('Tank retention band',(tx,-.53+k*.34,.50),.2,.035,m.silver,'Y',24)
    m.box('Tank status window',(tx,-.15,.70),(.055,.40,.019),light,.006)
   elif v in [2,7]:
    m.poly('Industrial tow jaw',[(side*.6,.55),(side*1.2,1.40),(side*1.37,1.31),(side*.88,.32)],.33,.18,paint,.03)
    for k in range(4):m.box('Tow jaw tooth',(side*(.92+k*.08),.91+k*.12,.53),(.12,.075,.06),m.silver,.005)
   else:
    m.box('Modular relief cargo bay',(side*(span-.22),-.12,.50),(.40,.86,.28),paint,.05)
    for k in range(3):m.box('Cargo bay seam',(side*(span-.22),-.40+k*.26,.655),(.35,.022,.02),m.black,.004)
    m.box('Medical cross stem',(side*(span-.22),-.1,.674),(.047,.27,.005),m.white,0)
    m.box('Medical cross arm',(side*(span-.22),-.1,.674),(.20,.047,.005),m.white,0)
  else:
   tx=side*(span-.16)
   m.box('Heavy weapon mount',(tx,.04,.44),(.34,.62,.28),paint,.04)
   for k in range(2+(v%2)):
    xx=tx+(k-(1+(v%2))*.5)*.085
    m.cyl('Accelerator barrel',(xx,.61,.5),.047,.82,m.steel,'Y',20)
    m.cyl('Barrel recessed muzzle',(xx,1.04,.5),.054,.045,m.black,'Y',20)
    m.cyl('Hot muzzle lens',(xx,1.066,.5),.031,.006,light,'Y',16)
   if v in [1,4,7,10]:
    m.poly('Scythe leading blade',[(side*.48,.77),(side*1.50,1.8),(side*1.66,1.57),(side*.95,.61)],.23,.15,paint,.023)
    m.tube('Scythe live rail',[(side*.66,.87,.40),(side*1.51,1.62,.4)],.018,light)
   if v in [2,5,8,11]:
    for k in range(3):m.box('Missile cassette',(side*(.51+k*.22),-.76,.59),(.16,.48,.16),paint,.025)
   if v in [0,3,6,9]:
    for k in range(5):m.box('Deflector fin',(side*(span+.09),-.55+k*.16,.38),(.38,.04,.16),m.silver,.012)
  for k in range(9):
   m.cyl('Perimeter fastener',(side*(.48+k*.10),-.9+k*.047,.29),.014,.012,m.copper,vertices=12)
 m.cam.location=(0,-4,13);m.cam.rotation_euler=(Vector((0,0,.2))-m.cam.location).to_track_quat('-Z','Y').to_euler();m.cam.data.ortho_scale=4.9
 s.render.filepath=os.path.join(out,'%03d.png'%(i+1))
 if i==start:bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('docs/astra-v3-models/'+family+'-master.blend'))
 bpy.ops.render.render(write_still=True);print('ASTRA_THREAT',family,i+1,flush=True)
