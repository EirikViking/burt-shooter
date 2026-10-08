import {COSMIC_FAUNA_PACING as PACING} from '../config/CosmicFaunaCatalog.js';

function hash(text) {
 let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
 return h>>>0;
}
export const smoothFauna=value=>{const x=Math.max(0,Math.min(1,value));return x*x*(3-2*x);};

// Visual time is independent of encounter RNG and wall time. No profile history.
export class CosmicFaunaClock {
 constructor(seed,catalog) {
  this.catalog=catalog;this.seed=String(seed);this.ordinal=0;this.quiet=0;this.active=null;this.event=null;
  this.order=catalog.map((_,i)=>i).sort((a,b)=>hash(`${this.seed}:fauna:${a}`)-hash(`${this.seed}:fauna:${b}`));
  this.wait=PACING.first;
 }
 get nextIndex(){return this.order[this.ordinal%this.order.length];}
 step(seconds,{advancing,ordinary,ready}) {
  this.event=null;
  if(!advancing||!Number.isFinite(seconds)||seconds<=0)return;
  const dt=Math.min(PACING.maxStep,seconds);
  if(this.active){
   this.active.age+=dt;
   if(this.active.age>=this.active.duration){this.active=null;this.quiet=0;this.event='end';}
   return;
  }
  if(!ordinary)return;
  this.quiet=Math.min(this.wait,this.quiet+dt);
  if(this.quiet+1e-8<this.wait||!ready||!this.order.length)return;
  const index=this.nextIndex,definition=this.catalog[index];
  const variant=hash(`${this.seed}:passage:${this.ordinal}`);
  this.active={index,age:0,duration:definition.duration,direction:variant%2?1:-1,lane:definition.lane+(variant%5-2)*.028};
  this.ordinal++;this.quiet=0;this.event='start';
  this.wait=PACING.recoveryMin+(variant%1001)/1000*PACING.recoveryRange;
 }
 cancel(){this.active=null;this.quiet=0;this.event=null;}
}

const MAJOR_KINDS=new Set(['boss','space_snake','mystery','mystery_part']);
export function faunaBlocked(scene) {
 const manager=scene.enemyManager;
 if(scene.bossWarningActive||scene.bossIntroActive||scene.activeBossIntroCard?.parent
  ||manager?.state==='BOSS_GATE'||manager?.state==='BOSS_ACTIVE'
  ||(manager?.mayhemReinforcementState?.warningFired&&!manager.mayhemReinforcementState.spawned)
  ||scene.activeMayhemReinforcementWarning?.overlay?.parent||scene.activeMayhemRoutineWarning?.overlay?.parent
  ||scene.activeCabinetWonder||scene.cabinetWonderOpportunity||manager?.boss?.active
  ||manager?.mysteryDirector?.busy||manager?.hijacker?.active||manager?.discoveryEncounter?.plan
  ||manager?.environment?.active||manager?.waves?.[manager.currentWaveIndex]?.isChallenge
  ||manager?.challengeFlightState?.active||scene.firstLightDirector?.model?.encounter
  ||scene.firstLightDirector?.model?.escorts?.length
  ||scene.firstLightDirector?.event||scene.firstLightDirector?.model?.payback?.status==='active'
  ||(scene.combatBackdropClarity?.hostileProjectiles||0)>48)return true;
 for(const enemy of manager?.enemies||[])if(enemy.active&&MAJOR_KINDS.has(enemy.kind))return true;
 return false;
}

// Normalized mesh space, preallocated arrays. Rooted anatomical masks keep the
// head and rib cage stable while distal fins, arms and veils carry the stroke.
export function deformFauna(base,out,definition,seconds,reduced=false) {
 const phase=(reduced?0:seconds)*Math.PI*2/definition.period,amp=reduced?0:definition.amplitude;
 for(let i=0;i<base.length;i+=2){
  const u=base[i],v=base[i+1],dy=v-.5,edge=Math.abs(dy)*2,tail=smoothFauna((u-.35)/.6);
  let x=u,y=v;
  if(definition.anatomy==='medusa'){
   const bell=1-smoothFauna((u-.25)/.22),pulse=Math.sin(phase);
   x+=bell*(u-.24)*pulse*.045;y+=bell*dy*pulse*.09;
   y+=tail*amp*Math.sin(phase-u*6.5+dy*2.5);x+=tail*amp*.22*Math.cos(phase-u*5+dy*4);
  }else if(definition.anatomy==='mantis'){
   const limbs=smoothFauna((v-.46)*4)*(1-smoothFauna((u-.40)*5));
   x+=limbs*amp*.55*Math.sin(phase*1.5-u*6);y+=limbs*amp*Math.cos(phase*1.5-u*6);
   y+=tail*dy*amp*2.8*Math.sin(phase-u*6);x+=tail*edge*amp*.20*Math.cos(phase-u*5);
  }else if(definition.anatomy==='leviathan'){
   // Heavy head; a delayed tail stroke and small lower-jaw breath.
   const jaw=(1-smoothFauna((u-.25)/.18))*smoothFauna((v-.38)/.28);
   y+=tail*tail*amp*Math.sin(phase-u*4.3)+jaw*amp*.16*Math.sin(phase*.5);
   x+=tail*edge*amp*.18*Math.cos(phase-u*4.3);
  }else if(definition.anatomy==='cuttle'){
   const arms=1-smoothFauna((u-.12)/.3),fin=smoothFauna((u-.30)/.22)*edge*edge;
   y+=arms*amp*.65*Math.sin(phase-u*5+v*4)+fin*amp*.65*Math.sin(phase*1.6-u*12);
   x+=arms*amp*.28*Math.cos(phase-u*6+v*3);
   y+=smoothFauna((u-.38)/.25)*dy*amp*.25*Math.sin(phase);
  }else if(definition.anatomy==='nautilus'){
   // The shell is rigid. Only the exposed left-side tentacle fan swims.
   const arms=1-smoothFauna((u-.16)/.39);
   x+=arms*amp*.6*Math.sin(phase+v*5);y+=arms*amp*Math.sin(phase-u*6+v*3);
  }else if(definition.anatomy==='swan'){
   const sails=smoothFauna((u-.30)/.18)*(1-smoothFauna((u-.72)/.17))*smoothFauna((.65-v)/.4);
   x+=sails*amp*.6*Math.sin(phase-u*3);y+=sails*amp*.36*Math.cos(phase-u*4);
   const neck=1-smoothFauna((u-.12)/.27);
   y+=neck*amp*.30*Math.sin(phase*.5)+tail*amp*.35*Math.sin(phase-u*6);
  }else if(definition.anatomy==='ribbon'){
   const travel=smoothFauna((u-.09)/.65),wave=Math.sin(phase-u*8.5);
   y+=travel*amp*wave+edge*travel*amp*.22*Math.sin(phase*1.4-u*13);
   x+=travel*amp*.16*Math.cos(phase-u*8.5);
  }else if(definition.anatomy==='kraken'){
   const arms=1-smoothFauna((u-.08)/.56),mantle=smoothFauna((u-.68)/.25);
   y+=arms*amp*.75*Math.sin(phase-u*5.5+v*4.4);x+=arms*amp*.45*Math.cos(phase-u*4+v*4);
   y+=mantle*dy*amp*.35*Math.sin(phase);x+=mantle*(u-.7)*amp*.30*Math.sin(phase);
  }else if(definition.anatomy==='seahorse'){
   const coil=smoothFauna((u-.58)/.30),angle=coil*amp*1.2*Math.sin(phase*.8),dx=u-.78,cy=v-.68;
   x+=dx*(Math.cos(angle)-1)-cy*Math.sin(angle);y+=dx*Math.sin(angle)+cy*(Math.cos(angle)-1);
   const gills=smoothFauna((u-.25)/.2)*(1-smoothFauna((u-.75)/.15))*smoothFauna((.48-v)/.32);
   x+=gills*amp*.42*Math.sin(phase*1.8-u*10);y+=gills*amp*.34*Math.cos(phase*1.8-u*10);
  }else if(definition.anatomy==='angel'){
   const arms=smoothFauna((u-.18)/.6),web=Math.min(1,edge+.25);
   y+=arms*web*amp*.8*Math.sin(phase-u*5.5+v*3.1);x+=arms*amp*.30*Math.cos(phase-u*4.2+v*2);
  }else if(definition.anatomy==='turtle'){
   // Elliptical shell exclusion keeps the carapace solid; four distal paddles
   // alternate their power stroke around the shell without bending its plates.
   const dx=(u-.57)/.34,dyShell=(v-.43)/.26;
   const paddle=smoothFauna((dx*dx+dyShell*dyShell-1)/.85);
   const stroke=phase+(u>.65?1.5:0)+(v<.43?Math.PI:0);
   x+=paddle*amp*.52*Math.cos(stroke);y+=paddle*amp*.70*Math.sin(stroke);
  }else if(definition.anatomy==='eel'){
   const body=smoothFauna((u-.12)/.6);
   y+=body*amp*Math.sin(phase-u*8);x+=body*amp*.18*Math.cos(phase-u*8);
   y+=(1-body)*edge*amp*.2*Math.sin(phase*1.3-v*5);
  }else if(definition.anatomy==='centipede'){
   const paddles=smoothFauna((v-.48)/.33),stroke=phase*1.5-u*26;
   x+=paddles*amp*.48*Math.cos(stroke);y+=paddles*amp*.70*Math.sin(stroke);
   y+=smoothFauna((u-.88)/.12)*amp*.28*Math.sin(phase-u*6);
  }else if(definition.anatomy==='salamander'){
   const gills=smoothFauna((u-.12)/.16)*(1-smoothFauna((u-.46)/.16))*smoothFauna((Math.abs(dy)-.08)/.24);
   x+=gills*amp*.35*Math.cos(phase*1.7-v*6);y+=gills*amp*.6*Math.sin(phase*1.7-v*6);
   y+=smoothFauna((u-.52)/.44)*amp*.85*Math.sin(phase-u*5.8);
  }else if(definition.anatomy==='moth'){
   const wingY=v-.64,wing=smoothFauna(Math.abs(wingY)/.43)*smoothFauna((u-.19)/.28);
   const beat=phase+(u>.62?.8:0)+(v>.64?.5:0);
   y+=wingY*wing*amp*1.7*Math.sin(beat);x+=wing*amp*.35*Math.cos(beat);
  }else if(definition.anatomy==='urchin'){
   const dx=(u-.3)/.23,cy=(v-.5)/.3,spines=smoothFauna((dx*dx+cy*cy-1)/.9);
   x+=spines*amp*.25*(u-.3)*Math.sin(phase+v*3);
   y+=spines*amp*.36*dy*Math.cos(phase+u*4)+smoothFauna((u-.55)/.42)*amp*.75*Math.sin(phase-u*8+v*3);
  }else if(definition.anatomy==='anemone'){
   const curtain=smoothFauna((u-.25)/.6),crown=1-smoothFauna((u-.20)/.25);
   y+=curtain*amp*.8*Math.sin(phase-u*7.5+v*4.5)+crown*dy*amp*.3*Math.sin(phase);
   x+=curtain*amp*.3*Math.cos(phase-u*8+v*3);
  }else if(definition.anatomy==='shark'){
   const fluke=smoothFauna((u-.45)/.5),fin=smoothFauna((u-.30)/.16)*(1-smoothFauna((u-.65)/.13))*smoothFauna((v-.57)/.3);
   y+=fluke*amp*Math.sin(phase-u*4.6)+fin*amp*.45*Math.sin(phase+.8);
   x+=fin*amp*.24*Math.cos(phase+.8);
  }else if(definition.anatomy==='koi'){
   const veil=smoothFauna((u-.38)/.58),fins=edge*edge*smoothFauna((u-.21)/.28);
   y+=veil*amp*.75*Math.sin(phase-u*6)+fins*amp*.42*Math.sin(phase-u*9+v*2);
   x+=fins*amp*.24*Math.cos(phase-u*7);
  }else if(definition.anatomy==='ironjelly'){
   const arms=smoothFauna((u-.36)/.52),joint=phase-u*5.5+v*4;
   y+=arms*amp*.75*Math.sin(joint);x+=arms*amp*.40*Math.cos(joint*.9);
  }else if(definition.anatomy==='seadragon'){
   const distance=Math.abs(v-(.29+.53*u)),leaves=smoothFauna(distance/.25)*smoothFauna((u-.18)/.22);
   x+=leaves*amp*.45*Math.sin(phase*1.4-u*11);y+=leaves*amp*.65*Math.cos(phase*1.4-u*11);
   y+=smoothFauna((u-.70)/.29)*amp*.25*Math.sin(phase-u*5);
  }else if(definition.anatomy==='bat'){
   const wings=smoothFauna(Math.abs(v-(.5+.15*u))/.34),beat=phase+smoothFauna((u-.43)/.3)*1.1;
   y+=wings*amp*.85*Math.sin(beat);x+=wings*amp*.32*Math.cos(beat);
   y+=smoothFauna((u-.74)/.25)*amp*.25*Math.sin(phase-u*6);
  }else if(definition.anatomy==='drake'){
   const paddles=smoothFauna((v-.63)/.3),stroke=phase-u*4.5;
   x+=paddles*amp*.5*Math.cos(stroke);y+=paddles*amp*.7*Math.sin(stroke);
   const dorsal=smoothFauna((u-.3)/.15)*(1-smoothFauna((u-.69)/.14))*smoothFauna((.37-v)/.25);
   x+=dorsal*amp*.28*Math.sin(phase-u*5);
   y+=smoothFauna((u-.64)/.34)*amp*.65*Math.sin(phase-u*4.2);
  }else if(definition.anatomy==='scallop'){
   // The mineral valves remain rigid; exposed mantle and trailing cilia breathe.
   const mantle=smoothFauna((v-.36)/.12)*(1-smoothFauna((v-.67)/.1));
   y+=mantle*amp*.28*Math.sin(phase-u*3);
   const cilia=smoothFauna((u-.73)/.24)*smoothFauna((v-.48)/.2);
   x+=cilia*amp*.35*Math.cos(phase*1.6-v*8);y+=cilia*amp*.65*Math.sin(phase*1.6-v*8);
  }else if(definition.anatomy==='hydra'){
   const necks=1-smoothFauna((u-.16)/.37),breath=phase+v*5.5;
   x+=necks*amp*.25*Math.cos(breath);y+=necks*amp*.48*Math.sin(breath);
   const fins=smoothFauna((u-.42)/.2)*smoothFauna((Math.abs(dy)-.1)/.32);
   y+=fins*amp*.48*Math.sin(phase-u*5+v*2);
   y+=smoothFauna((u-.73)/.26)*amp*.35*Math.sin(phase-u*5.5);
  }else if(definition.anatomy==='worm'){
   const body=smoothFauna((u-.14)/.55),paddles=smoothFauna((v-(.36+.28*u))/.28);
   y+=body*amp*.5*Math.sin(phase-u*7.2);
   x+=paddles*amp*.22*Math.cos(phase*1.6-u*24);y+=paddles*amp*.32*Math.sin(phase*1.6-u*24);
  }else if(definition.anatomy==='stag'){
   const fins=smoothFauna((v-.53)/.34)*smoothFauna((u-.14)/.23),stroke=phase-u*5;
   x+=fins*amp*.42*Math.cos(stroke);y+=fins*amp*.85*Math.sin(stroke);
   y+=smoothFauna((u-.69)/.3)*amp*.65*Math.sin(phase-u*4.7);
  }else if(definition.anatomy==='isopod'){
   const paddles=smoothFauna((v-.50)/.34),stroke=phase*1.2-u*21;
   x+=paddles*amp*.37*Math.cos(stroke);y+=paddles*amp*.55*Math.sin(stroke);
   const feelers=1-smoothFauna((u-.05)/.11);
   y+=feelers*amp*.32*Math.sin(phase*.7+v*4);
   y+=smoothFauna((u-.82)/.17)*amp*.25*Math.sin(phase-u*4);
  }else if(definition.anatomy==='butterfly'){
   const bodyLine=.34+.65*u,distance=v-bodyLine,wing=smoothFauna(Math.abs(distance)/.36);
   const beat=phase-u*1.4;
   y+=distance*wing*amp*1.4*Math.sin(beat);x+=wing*amp*.38*Math.cos(beat);
  }else if(definition.anatomy==='angler'){
   const lure=(1-smoothFauna((u-.17)/.19))*smoothFauna((.32-v)/.24);
   x+=lure*amp*.45*Math.sin(phase*.8);y+=lure*amp*.28*Math.cos(phase*.8);
   const jaw=(1-smoothFauna((u-.27)/.18))*smoothFauna((v-.60)/.27);
   y+=jaw*amp*.25*Math.sin(phase);
   y+=smoothFauna((u-.54)/.43)*amp*.75*Math.sin(phase-u*4.5);
  }else if(definition.anatomy==='octopus'){
   const arms=smoothFauna((u-.34)/.57),stroke=phase-u*6.7+v*5.2;
   x+=arms*amp*.32*Math.cos(stroke);y+=arms*amp*.78*Math.sin(stroke);
   const mantle=1-smoothFauna((u-.14)/.26),pulse=Math.sin(phase);
   x+=mantle*(u-.25)*amp*.26*pulse;y+=mantle*(v-.38)*amp*.38*pulse;
  }else if(definition.anatomy==='cobra'){
   const body=smoothFauna((u-.32)/.65),hood=1-smoothFauna((u-.22)/.2);
   y+=body*amp*.85*Math.sin(phase-u*9);
   x+=hood*(u-.2)*amp*.24*Math.sin(phase*.6);y+=hood*(v-.4)*amp*.28*Math.sin(phase*.6);
  }else if(definition.anatomy==='shrimp'){
   const claws=(1-smoothFauna((u-.34)/.2))*smoothFauna((v-.43)/.32),stroke=phase+v*2;
   x+=claws*amp*.44*Math.cos(stroke);y+=claws*amp*.6*Math.sin(stroke);
   const paddles=smoothFauna((u-.46)/.2)*smoothFauna((v-.53)/.3);
   x+=paddles*amp*.22*Math.cos(phase*1.3-u*22);y+=paddles*amp*.32*Math.sin(phase*1.3-u*22);
   y+=smoothFauna((u-.77)/.22)*amp*.42*Math.sin(phase-u*5);
  }else if(definition.anatomy==='wraith'){
   const veils=smoothFauna((v-.28)/.4)*smoothFauna((u-.17)/.4),stroke=phase-u*7+v*3.2;
   y+=veils*amp*.80*Math.sin(stroke);x+=veils*amp*.26*Math.cos(stroke);
   y+=smoothFauna((u-.68)/.31)*amp*.3*Math.sin(phase-u*5);
  }else if(definition.anatomy==='coral'){
   // Rigid coral ridges ride the massive trunk; only flippers and fluke stroke.
   const flippers=smoothFauna((v-.58)/.34)*(1-smoothFauna((u-.65)/.2));
   x+=flippers*amp*.48*Math.cos(phase-u*3);y+=flippers*amp*.7*Math.sin(phase-u*3);
   y+=smoothFauna((u-.72)/.27)*amp*.62*Math.sin(phase-u*4);
  }else if(definition.anatomy==='cicada'){
   const center=.37+.23*u,distance=v-center,wings=smoothFauna((Math.abs(distance)-.06)/.29)*smoothFauna((u-.28)/.3);
   const beat=phase*1.8-u*3.1;
   y+=wings*distance*amp*1.25*Math.sin(beat);x+=wings*amp*.25*Math.cos(beat);
  }else if(definition.anatomy==='hammerhead'){
   const fins=smoothFauna((u-.34)/.18)*(1-smoothFauna((u-.66)/.12))*smoothFauna((v-.56)/.32);
   x+=fins*amp*.32*Math.cos(phase+.7);y+=fins*amp*.62*Math.sin(phase+.7);
   y+=smoothFauna((u-.53)/.46)*amp*.82*Math.sin(phase-u*4.1);
  }else if(definition.anatomy==='siphonophore'){
   const colony=smoothFauna((u-.22)/.5),stem=.25+.28*u,below=smoothFauna((v-stem)/.35),pulse=Math.sin(phase-u*13);
   y+=colony*amp*.25*pulse+below*colony*amp*.58*Math.sin(phase-u*9+v*4);
   x+=below*colony*amp*.2*Math.cos(phase-u*11);
   const lead=1-smoothFauna((u-.14)/.15);y+=lead*(v-.25)*amp*.28*Math.sin(phase);
  }else if(definition.anatomy==='skate'){
   const distance=v-.44,fins=smoothFauna(Math.abs(distance)/.35)*(1-smoothFauna((u-.58)/.2));
   y+=distance*fins*amp*1.8*Math.sin(phase-u*4);x+=fins*amp*.18*Math.cos(phase-u*4);
   const tails=smoothFauna((u-.53)/.43);y+=tails*amp*.64*Math.sin(phase-u*8+v*5);
  }else if(definition.anatomy==='hydroid'){
   const rings=1-smoothFauna((u-.37)/.17),angle=amp*.24*rings*Math.sin(phase),rx=u-.25,ry=v-.46;
   x+=rx*(Math.cos(angle)-1)-ry*Math.sin(angle);y+=rx*Math.sin(angle)+ry*(Math.cos(angle)-1);
   const arms=smoothFauna((u-.43)/.53),stroke=phase-u*6+v*5.8;
   x+=arms*amp*.28*Math.cos(stroke);y+=arms*amp*.74*Math.sin(stroke);
  }else if(definition.anatomy==='sailfish'){
   const sail=smoothFauna((u-.28)/.13)*(1-smoothFauna((u-.68)/.13))*smoothFauna((.54-v)/.4);
   x+=sail*amp*.55*Math.sin(phase-u*5);y+=sail*amp*.18*Math.cos(phase-u*5);
   const lower=smoothFauna((u-.33)/.2)*(1-smoothFauna((u-.68)/.15))*smoothFauna((v-.67)/.28);
   y+=lower*amp*.32*Math.sin(phase+.7);
   y+=smoothFauna((u-.67)/.32)*amp*.8*Math.sin(phase-u*5.5);
  }else if(definition.anatomy==='ray'){
   const fin=edge*edge*(1-tail*.6),stroke=Math.sin(phase-u*4.5);
   y+=dy*fin*amp*3*stroke+tail*amp*.62*Math.sin(phase-u*7);
   x+=fin*amp*.34*Math.cos(phase-u*4);y+=tail*dy*amp*Math.sin(phase-u*9);
  }else{
   throw new Error(`Unimplemented fauna anatomy: ${definition.anatomy}`);
  }
  out[i]=x;out[i+1]=y;
 }
 return out;
}
