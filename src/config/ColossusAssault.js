// Shared by simulation, telegraph and renderer. Spatial choreography is explicit:
// every damaging front stays inside the old warning envelope. A slower traversal
// trades occupied space for duration, rather than adding an attack on top.
import { hasColossus, COLOSSUS_FAMILIES } from './BossReinvention.js';
const clamp = (x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function configureColossusAssault(hazard, boss) {
  if (!hasColossus(boss.profile?.archetype)) return hazard;
  const active=Math.max(1,hazard.durationMs-hazard.armingMs);
  hazard.colossus={ family:boss.profile.archetype, phase:boss.phase, motion:COLOSSUS_FAMILIES[boss.profile.archetype].pulse,
    legacyActiveMs:active, legacyDurationMs:hazard.durationMs, travelMs:Math.max(active,740), sequence:boss.attackWarningToken?.id||0 };
  hazard.durationMs=hazard.armingMs+hazard.colossus.travelMs;
  return hazard;
}
export function assaultTravel(h) {
  return clamp(((h.elapsedMs||0)-(h.armingMs||0))/h.colossus.travelMs);
}
export function assaultWindows(h, span=1, slot=0) {
  const c=h.colossus;
  // Stagger banks without adding exposure: each bank still traverses completely
  // and retains the original point dwell, including its first and last pixel.
  const stagger=['spiral','ratchet','barrage','chords','feint'].includes(c.motion);
  const delay=stagger?(slot%4)*Math.min(45,(c.travelMs-c.legacyActiveMs)*.12):0;
  const elapsed=clamp(((h.elapsedMs||0)-h.armingMs-delay)/(c.travelMs-delay));
  const duty=clamp(c.legacyActiveMs/(c.travelMs-delay),.001,.999);
  const cycles=(c.phase>=3&&['spear','chords','ratchet'].includes(c.motion))?2:1;
  const t=elapsed>=1?1:(elapsed*cycles)%1;
  // Integral of the moving, clipped interval equals the old full-field exposure.
  const tail=duty/(1-duty),head=t*(1+tail);
  // Every weapon front travels away from its emitter. Reversing an interval
  // made flames spawn near the player and fly back into the boss; the mirror
  // family's split interval also introduced a second front from the far end.
  // Keep bank delays, repeat cycles and point exposure, but never reverse space.
  return [[Math.max(0,head-tail)*span,Math.min(1,head)*span]].filter(([a,b])=>b>a);
}
export function assaultSectors(h) {
  const n=h.colossus.motion==='ratchet'?8:h.colossus.motion==='chords'?6:12;
  const start=h.safeAngle+h.safeWedge,span=Math.PI*2-h.safeWedge*2;
  return Array.from({length:n},(_,i)=>({start:start+span*i/n,end:start+span*(i+1)/n,slot:i}));
}
export function isInsideColossusFront(h, x, y, margin=0) {
  if ((h.elapsedMs||0)<h.armingMs) return false;
  const dx=x-h.sourceX,dy=y-h.sourceY;
  if(h.kind==='wall') return (h.columns||[]).some((cx,i)=>Math.abs(x-cx)<=h.width*.5+margin &&
    assaultWindows(h,h.endY-h.startY,i).some(([a,b])=>y>=h.startY+a-margin&&y<=h.startY+b+margin));
  const distance=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
  if(h.kind==='ring'){
    const diff=Math.abs(Math.atan2(Math.sin(angle-h.safeAngle),Math.cos(angle-h.safeAngle)));
    if(diff<=h.safeWedge)return false;
    const sectors=assaultSectors(h),relative=((angle-(h.safeAngle+h.safeWedge))%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
    const slot=Math.min(sectors.length-1,Math.floor(relative/(Math.PI*2-h.safeWedge*2)*sectors.length));
    return assaultWindows(h,h.outerRadius-h.innerRadius,slot).some(([a,b])=>distance>=h.innerRadius+a-margin&&distance<=h.innerRadius+b+margin);
  }
  const along=dx*Math.cos(h.angle)+dy*Math.sin(h.angle),cross=-dx*Math.sin(h.angle)+dy*Math.cos(h.angle);
  if(along<0||along>h.length)return false;
  const half=Math.max(h.radius||24,along*Math.tan((h.spread||0)*.41));
  if(Math.abs(cross)>half+margin)return false;
  return assaultWindows(h,h.length).some(([a,b])=>along>=a-margin&&along<=b+margin);
}
