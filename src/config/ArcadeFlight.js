// Authored flight, selected without additional gameplay random draws.
export const ARCADE_FLIGHT_ENABLED = (() => {
  try { return new URLSearchParams(globalThis.location?.search || '').get('flight') !== 'previous'; }
  catch { return true; }
})();
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const tau = Math.PI*2;
export const ENTRY_ROUTES = ['braid','hook','ribbon','crown','scissor','coil'];
export function usesArcadeFlight(config) {
  return ARCADE_FLIGHT_ENABLED && !!config && !config.isChallenge && !config.isMayhemReinforcement && !config.isBossMayhemReinforcement && !config.highSectorAuthoredEncounter;
}
export function arcadeEntryDuration(durationMs, flight) {
  return flight ? Math.max(2800, durationMs) : durationMs;
}
export function arcadeBriefingDuration(durationMs, announceMs, config, waveIndex) {
  // Reclaim idle briefing time, not cleanup/pickup time or encounter warnings.
  return waveIndex > 0 && usesArcadeFlight(config)
    ? Math.min(durationMs, Math.max(380, announceMs + 120)) : durationMs;
}
export function waveFlightPlan(config, level, waveIndex, slot, width, height) {
  if (!usesArcadeFlight(config)) return null;
  const route = level <= 1 ? 'crown' : ENTRY_ROUTES[Math.abs((level*3+waveIndex*5)%ENTRY_ROUTES.length)];
  return {route,side:slot%2?1:-1,wing:Math.floor(slot/2)%2?1:-1,width,height,
    strength:level<=2?.45:level<=4?.72:1};
}
export function sampleWaveFlight(curve,t) {
  const q=clamp(t,0,1),u=1-q,f=curve.flight;
  let x=u*u*curve.p0.x+2*u*q*curve.p1.x+q*q*curve.p2.x;
  let y=u*u*curve.p0.y+2*u*q*curve.p1.y+q*q*curve.p2.y;
  if(!f || q===0 || q===1)return {x,y};
  const envelope=Math.sin(Math.PI*q)**2,a=f.width*.105*f.strength,s=f.side;
  switch(f.route){
    case 'braid': x+=s*a*Math.sin(q*tau)*envelope; y+=f.height*.055*envelope; break;
    case 'hook': x+=s*a*1.45*Math.sin(q*Math.PI*1.5)*envelope; y+=f.height*.075*Math.sin(q*Math.PI)*envelope; break;
    case 'ribbon': x+=f.wing*a*Math.sin(q*tau*1.5)*envelope; y-=f.height*.035*Math.sin(q*tau)*envelope; break;
    case 'crown': x+=s*a*.75*envelope; y-=f.height*.06*envelope; break;
    case 'scissor': x-=s*a*1.6*Math.sin(q*Math.PI)*envelope; y+=f.wing*f.height*.035*envelope; break;
    case 'coil': x+=s*a*Math.sin(q*tau)*envelope; y+=f.height*.075*(1-Math.cos(q*tau))*envelope; break;
  }
  // Entrances never surprise the player from below, or cross the lower playfield.
  return {x:clamp(x,24,f.width-24),y:Math.min(y,Math.max(curve.p2.y,f.height*.46))};
}

export const BOSS_FLIGHTS = ['conductor','forge','mirror','needle','vortex','jester','carrier','monolith','choir','clock'];
export function sampleBossFlight({family,time,phase=1,level=1,width,height,anchorX,laneY}) {
  const index=Math.max(0,BOSS_FLIGHTS.indexOf(family));
  const period=8.5+index*.31,cycle=Math.floor(time/period),q=(time%period)/period;
  const a=q*tau,side=(cycle+level)%2?1:-1,amp=width*(level===1?.12:.19);
  const surprise=phase>1 && cycle%3===2;
  let dx=0,dy=0;
  switch(family){
    case 'conductor': dx=Math.sin(a)*amp;dy=Math.sin(a*2)*height*.035;break;
    case 'forge': dx=Math.sin(a)*amp*.5;dy=Math.sin(a)**6*height*.075;break;
    case 'mirror': dx=Math.tanh(Math.sin(a)*2)*amp;dy=Math.cos(a)*height*.045;break;
    case 'needle': dx=Math.sin(a)*amp*.8;dy=-Math.cos(a)*height*.055;break;
    case 'vortex': dx=Math.sin(a)*amp;dy=Math.sin(a*2)*height*.065;break;
    case 'jester': dx=(Math.sin(a)+Math.sin(a*3)*.24)*amp;dy=Math.cos(a*2)*height*.04;break;
    case 'carrier': dx=Math.sin(a)*amp*.8;dy=Math.sin(a*2)*height*.025;break;
    case 'monolith': dx=Math.tanh(Math.sin(a)*2)*amp*.55;dy=Math.max(0,Math.cos(a))**4*height*.085;break;
    case 'choir': dx=Math.sin(a)*amp;dy=Math.cos(a*2)*height*.05;break;
    case 'clock': dx=Math.sin(a)*amp;dy=Math.sin(a*4)*height*.035;break;
  }
  // Every third later-phase patrol makes one smooth feint/traverse; no teleport.
  const feint=surprise?Math.sin(Math.PI*q)**4:0;
  dx+=side*width*.09*feint;dy-=height*.04*feint;
  return {x:clamp(anchorX+dx,width*.12,width*.88),y:clamp(laneY+dy,height*.16,height*.40),
    family,cycle,surprise,stage:feint>.15?'feint':'patrol'};
}
