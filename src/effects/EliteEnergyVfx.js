import {drawEnergySurface as surface,drawEnergyLink as link,energyClock} from './AstraEnergyMaterial.js';
import {drawAstraWarningLane} from './AstraWarningField.js';

export const ELITE_ENERGY_FAMILIES = ['tractor','gravity','rail','shield','support','pulse','phase','carrier','expansion','ordnance'];

// Role-specific silhouettes and motion, driven solely by the existing charge /
// active state. Art never schedules attacks or consumes gameplay randomness.
export function drawEliteEnergy(enemy, g, context) {
  const {ability,profile,progress,active,playerX,playerY,color,radius,now}=context;
  const t=energyClock(now),r=radius,body=enemy.radius;
  const dx=playerX-enemy.x,dy=playerY-enemy.y;
  const a=active?.68:.15+progress*.38,variant=Math.max(0,Math.min(2,Number(profile?.abilityVariant)||0));
  const draw=(kind,x,y,w,h,opacity=a,angle=0,tint=color)=>surface(g,{kind,x,y,width:w,height:h,alpha:opacity,angle,color:tint});
  const beam=(x,y,tx,ty,w=22,opacity=a,tint=color)=>link(g,{x,y,toX:tx,toY:ty,width:w,alpha:opacity,color:tint});
  const lens=(x,y,w,h,opacity=a,angle=0)=>draw('membrane',x,y,w,h,opacity,angle);
  const flare=(x,y,size,opacity=a)=>draw('corona',x,y,size,size*.72,opacity);
  const warning=(tx,ty,halfWidth=7)=>drawAstraWarningLane(g,{x:0,y:body*.2,angle:Math.atan2(ty-body*.2,tx),length:Math.hypot(tx,ty-body*.2),halfWidth,color,progress,active,alpha:a,markers:false});

  if(ability==='tractor_pull') {
    const contract=enemy.highSectorTractorContract;
    const endY=Math.max(150,dy),endX=contract?Number(contract.lockedTargetX)-enemy.x:0;
    const width=contract?Math.max(28,Number(contract.beamHalfWidthPx)||42):Math.max(44,22+endY*.18);
    const tx=Number.isFinite(endX)?endX:0;
    // Separate vapor columns converge on the emitter; no wire cross-sections.
    for(let i=-1;i<=1;i++)beam(i*body*.2,body,tx+i*width*.54,endY,width*(i===0?.75:.44),a*(i===0?.72:.48));
    for(let i=0;i<3;i++){
      const u=1-((t*.32+i/3)%1);const y=body+(endY-body)*u;
      draw('rift',tx*u,y,(18+width*u*.28),Math.min(80,endY*.24),a*Math.sin(u*Math.PI));
    }
    flare(0,body,body*1.15);
    enemy.drawHighSectorTractorEscapeLane(g,{progress,active,color});
    return;
  }
  if(ability==='vortex_gravity') {
    draw('pressure',0,0,r*2.65,r*1.40,a*.67,t*.17);
    lens(0,0,r*1.7,r*.90,a*.25,-t*.12);
    for(let i=0;i<3;i++){const ang=t*.55+i*Math.PI*2/3;flare(Math.cos(ang)*r*.70,Math.sin(ang)*r*.36,r*.48,a*.60);}
    return;
  }
  if(['sniper_rail','elite_hunter'].includes(ability)) {
    warning(dx,dy);flare(0,body*.28,body*(.65+progress*.65));
    lens(dx,dy,32,26,a*.6);return;
  }
  if(['shield_projector','barrier_projector'].includes(ability)) {
    if(ability==='barrier_projector'){
      for(const side of [-1,1])lens(side*r*.94,0,r*.54,r*1.82,a,side*.15);
    }else lens(0,0,r*2.24,r*1.70,a*.68);
    flare(0,body*.10,body*.72,a*.65);return;
  }
  if(['repair_healer','escort_commander','resonance_command'].includes(ability)) {
    const command=ability!=='repair_healer';let count=0;
    for(const ally of enemy.game?.scenes?.play?.enemyManager?.enemies||[]){
      if(!ally?.active||ally===enemy||ally.kind==='boss'||count>=4)continue;
      const x=ally.x-enemy.x,y=ally.y-enemy.y;if(Math.hypot(x,y)>(command?190:165))continue;
      beam(0,0,x,y,command?12:18,a*.72);flare(x,y,command?23:30,a*.60);count++;
    }
    lens(0,0,r*1.62,r*.86,a*.42);
    draw('pressure',0,0,r*(1.3+(t*.22)%1),r*(.7+((t*.22)%1)*.5),a*.28);return;
  }
  if(['jammer_disruptor','pulse_emp','stasis_lattice'].includes(ability)) {
    const u=(t*(ability==='pulse_emp'?.38:.22))%1;
    draw('pressure',0,0,r*(1.05+u*1.7),r*(.7+u*1.02),a*(1-u)*.75);
    lens(0,0,r*1.3,r*.94,a*.26);flare(0,0,body*.85,a*.8);return;
  }
  if(['phase_raider','mirror_decoy','splitter_clone','warp_ambush'].includes(ability)) {
    const count=ability==='phase_raider'?2:ability==='warp_ambush'?2+variant:3;
    for(let i=0;i<count;i++){
      const side=i%2?1:-1,tier=1+Math.floor(i/2),x=side*r*(.66+tier*.16);
      // Tall torn distortion wakes replace upright wire ovals. They breathe
      // within fixed positions, so decorative motion cannot imply a safe lane.
      draw('rift',x,Math.sin(t*.9+i)*r*.06,r*(.42+.035*Math.sin(t*1.2+i)),r*1.7,a*(i>1?.38:.68),side*.10);
    }
    flare(0,body*.08,body*.9,a*.38);return;
  }
  if(ability==='drone_carrier') {
    for(const side of [-1,1]){draw('rift',side*body*.68,body*.5,body*.42,body*1.55,a);flare(side*body*.68,body*.9,body*.63);}
    return;
  }
  if(ability==='prism_barrage') {
    const count=3+variant*2,targetY=Math.max(160,dy),spread=54+variant*22;
    for(let i=0;i<count;i++){const lane=i/(count-1)-.5;warning(dx+lane*spread*2,targetY,5);draw('rift',lane*r*1.36,r*.85,14,34,a,Math.atan2(-lane,1));}return;
  }
  if(ability==='meteor_bloom') {
    const count=3+variant*2;
    for(let i=0;i<count;i++){const x=(i-(count-1)/2)*(24-variant*2),y=r*.86+28+i%2*18;flare(x,y,30+variant*4,a);beam(x,body*.22,x,y,10,a*.35);}return;
  }
  if(ability==='hunter_dash') {warning(dx,dy,12+variant*4);draw('rift',0,-body*.45,body*.75,body*2.1,a);return;}
  if(ability==='satellite_ring') {
    const count=6+variant*2;
    for(let i=0;i<count;i++){const ang=t*(.8+variant*.15)+i*Math.PI*2/count;flare(Math.cos(ang)*r*(1.08+variant*.08),Math.sin(ang)*r*.67,18,a*.8);}return;
  }
  if(ability==='siphon_tether') {beam(0,body*.42,dx,Math.max(150,dy),26+variant*8,a);flare(dx,Math.max(150,dy),40,a*.65);return;}
  if(ability==='ion_shear') {
    const length=Math.max(190,Math.hypot(dx,dy)),ang=Math.atan2(dy,dx),shear=.48-variant*.05;
    for(const d of [-shear,shear])warning(Math.cos(ang+d)*length,Math.sin(ang+d)*length,7);
    if(variant>=1)warning(dx,dy,5);flare(0,body*.28,body*.9);return;
  }
  if(ability==='siege_beacon') {
    for(let i=0;i<2+variant;i++){const x=dx+(i-(1+variant)/2)*44,y=Math.max(170,dy);lens(x,y,44,44,a*.72);beam(0,body*.5,x,y-22,9,a*.3);}return;
  }
  // Mines, missiles, anchors and webs keep distinct emitter arrangements.
  const missile=ability.includes('missile')||ability.includes('rocket'),mine=ability.includes('mine'),web=ability.includes('web');
  const count=missile?3:mine?4:web?5:2;
  for(let i=0;i<count;i++){
    const lane=i-(count-1)/2,x=lane*body*.5,y=body*(.45+(i%2)*.25);
    if(missile)draw('rift',x,y,body*.30,body*1.14,a);
    else if(mine)lens(x,y+body*.55,body*.65,body*.50,a);
    else flare(x,y,body*.62,a*.80);
  }
}
