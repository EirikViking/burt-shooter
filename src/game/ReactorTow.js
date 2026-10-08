// Existing contact rotation. No new spawn clock, reward, RNG or persistence.
// Initial timing/health hypotheses need first/third-sighting playtests.
export const REACTOR_TOW = Object.freeze({id:'reactor-tow', family:'reactor_freight', hull:3,
  duration:16, parts:Object.freeze({coupler:2,vent:4}), warmup:4.5, warning:1.4, drift:1.2});
const smooth=t=>{const n=Math.max(0,Math.min(1,t));return n*n*(3-2*n);};
export function makeReactorTow(scale=1){
  const hp={coupler:2*scale,vent:4*scale};
  return {surprise:'reactor-tow',recipe:REACTOR_TOW,variant:3,hp,maxHp:{...hp},
    duration:REACTOR_TOW.duration,hitProjectiles:new WeakSet(),cover:[],anchors:{},won:false,
    reactor:{releaseAt:null,warning:0,spent:false,harmless:false}};
}
export function reactorTowPosition(e){
  const r=e.reactor,drift=r.releaseAt===null?0:smooth((e.age-r.releaseAt)/REACTOR_TOW.drift);
  return {x:.23+drift*.62,y:.12};
}
export function reactorTowPoses(e){
  if(!e?.reactor||e.reactor.spent||e.reactor.harmless)return [];
  const out=[];
  if(e.hp.coupler>0)out.push({part:'coupler',x:-.02,y:.12,role:'coupler'});
  if(e.hp.vent>0)out.push({part:'vent',...reactorTowPosition(e),role:'vent'});
  return out;
}
export function updateReactorTow(e,seconds,{safe=true}={}){
  const r=e?.reactor;if(!r||r.spent||r.harmless)return;
  if(!safe||e.suspended){r.warning=0;return;}
  if(e.age<REACTOR_TOW.warmup||r.releaseAt!==null&&e.age-r.releaseAt<REACTOR_TOW.drift)return;
  if(e.age>=e.duration-1.5){r.warning=0;return;}
  r.warning=Math.min(REACTOR_TOW.warning,r.warning+Math.max(0,Math.min(.1,Number(seconds)||0)));
}
export function hitReactorTow(e,part,amount,projectile,owner='player'){
  const r=e?.reactor;
  if(!r||r.spent||r.harmless||e.suspended||owner!=='player'||!Number.isFinite(amount)||amount<=0
    ||!projectile||typeof projectile!=='object'||e.hitProjectiles.has(projectile)
    ||!reactorTowPoses(e).some(p=>p.part===part))return null;
  e.hitProjectiles.add(projectile);e.hp[part]=Math.max(0,e.hp[part]-amount);
  // Added preview machinery never grants accuracy, damage-progress or kill credit.
  const result={type:'hit',part,credit:false,rescues:[]};
  if(e.hp[part]>0)return result;
  r.warning=0;
  if(part==='coupler'){r.releaseAt=e.age;result.type='disconnect';}
  else{r.harmless=true;e.duration=Math.min(e.duration,e.age+2);result.type='vent';}
  return result;
}
export function consumeReactorDischarge(e){
  const r=e?.reactor;
  if(!r||r.spent||r.harmless||e.suspended||r.warning<REACTOR_TOW.warning||e.age>=e.duration-1.5)return false;
  r.spent=true;r.warning=0;e.duration=Math.min(e.duration,e.age+2.8);return true;
}
