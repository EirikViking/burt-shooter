// Contact row 21: shared existing opportunity and both contact/battery recovery.
// Values are hypotheses until real weapon/pressure and first/third-sighting QA.
export const COUNTERWEIGHT = Object.freeze({
  id:'counterweight', family:'linked_battery', hull:3,
  recoveryFamilies:Object.freeze(['rescue_contact','linked_battery']),
  duration:16, approach:3.6, warning:1.2, cooldown:2.2, settle:.9,
  tilt:.42, maxVolleys:3, departure:1.5,
  // Divide the existing six scaled HP; the pivot costs as much as both guns.
  parts:Object.freeze({portGun:1.5,starboardGun:1.5,pivot:3})
});
const terminal=new Set(['disabled','spent','expired']);
const live=e=>Boolean(e?.counterweight&&!terminal.has(e.counterweight.phase)
  &&Number.isFinite(e.age)&&e.age<e.duration);
const smooth=t=>{const n=Math.max(0,Math.min(1,t));return n*n*(3-2*n);};
function enter(c,phase,remaining){c.phase=phase;c.remaining=remaining;}
function finish(e,phase){
  enter(e.counterweight,phase,0);
  e.duration=Math.min(e.duration,e.age+2);
}

export function makeCounterweight(scale=1){
  if(!Number.isFinite(scale)||scale<=0)throw new RangeError('Invalid Counterweight scale');
  const hp=Object.fromEntries(Object.entries(COUNTERWEIGHT.parts).map(([part,n])=>[part,n*scale]));
  return {surprise:COUNTERWEIGHT.id,recipe:COUNTERWEIGHT,variant:3,hp,maxHp:{...hp},
    duration:COUNTERWEIGHT.duration,hitProjectiles:new WeakSet(),won:false,
    counterweight:{phase:'approach',remaining:COUNTERWEIGHT.approach,angle:0,
      fromAngle:0,toAngle:0,volleys:0,blocked:false}};
}

// Use these same normalized origins/angles for mounted art, warning and shots.
// A view must use one uniform world scale for both axes to preserve the angle.
// The assembly settles before warning; no warning tracks the player or rotates.
export function counterweightPoses(e){
  if(!live(e))return [];
  const a=e.counterweight.angle,cos=Math.cos(a),sin=Math.sin(a),out=[];
  for(const [part,x] of [['portGun',-.37],['starboardGun',.37]]){
    if(e.hp[part]>0)out.push({part,role:'counterweightGun',
      x:x*cos-.10*sin,y:.05+x*sin+.10*cos,angle:Math.PI/2+a});
  }
  if(e.hp.pivot>0)out.push({part:'pivot',role:'pivot',x:0,y:.05,angle:0});
  return out;
}

export function counterweightWorldPoses(e,pose){
  const unit=pose.width;
  return counterweightPoses(e).map(p=>{
    const size=Math.min(p.part==='pivot'?100:112,unit*(p.part==='pivot'?.24:.28));
    const x=pose.x+p.x*unit,y=pose.y+p.y*unit;
    return {...p,x,y,size,radius:size*.32,
      muzzleX:x+Math.cos(p.angle)*size*.47,muzzleY:y+Math.sin(p.angle)*size*.47};
  });
}

export function updateCounterweight(e,seconds,{safe=true,paused=false}={}){
  if(!live(e))return;
  const c=e.counterweight;
  c.blocked=paused||!safe||Boolean(e.suspended);
  if(c.blocked){
    // Preempt a charged tell; a later resume must show a complete lead-in.
    // Approach, cooling and physical settling simply freeze in simulation time.
    if(c.phase==='warning'||c.phase==='ready')enter(c,'warning',COUNTERWEIGHT.warning);
    return;
  }
  if(e.age>=e.duration-COUNTERWEIGHT.departure){finish(e,'expired');return;}
  const dt=Number.isFinite(seconds)?Math.max(0,Math.min(.1,seconds)):0;
  if(!dt||c.phase==='ready')return;
  c.remaining=Math.max(0,c.remaining-dt);
  if(c.phase==='settling'){
    c.angle=c.fromAngle+(c.toAngle-c.fromAngle)*smooth(1-c.remaining/COUNTERWEIGHT.settle);
  }
  if(c.remaining>1e-9)return;
  if(c.phase==='warning')enter(c,'ready',0);
  else if(c.phase==='settling'&&e.age<COUNTERWEIGHT.approach)
    enter(c,'approach',COUNTERWEIGHT.approach-e.age);
  else enter(c,'warning',COUNTERWEIGHT.warning);
}

export function hitCounterweight(e,part,amount,projectile,owner='player'){
  if(!live(e)||e.suspended||e.counterweight.blocked||owner!=='player'
    ||!Number.isFinite(amount)||amount<=0||!projectile||typeof projectile!=='object'
    ||e.hitProjectiles.has(projectile)||!counterweightPoses(e).some(p=>p.part===part))return null;
  e.hitProjectiles.add(projectile);
  e.hp[part]=Math.max(0,e.hp[part]-amount);
  // Machinery is not a new accuracy/damage/kill/reward source. These outcomes
  // deliberately avoid the existing rescue, weapon and rival-victory handlers.
  const result={type:'hit',part,credit:false,rescues:[]};
  if(e.hp[part]>0)return result;
  if(part==='pivot'||e.hp.portGun<=0&&e.hp.starboardGun<=0){
    finish(e,'disabled');result.type='counterweight-disable';
  }else{
    const c=e.counterweight;
    c.fromAngle=c.angle;c.toAngle=e.hp.portGun>0?-COUNTERWEIGHT.tilt:COUNTERWEIGHT.tilt;
    enter(c,'settling',COUNTERWEIGHT.settle);result.type='counterweight-tilt';
  }
  return result;
}

export function consumeCounterweightVolley(e){
  const c=e?.counterweight;
  if(!live(e)||e.suspended||c.blocked||c.phase!=='ready'
    ||e.age>=e.duration-COUNTERWEIGHT.departure||c.volleys>=COUNTERWEIGHT.maxVolleys)return [];
  const shots=counterweightPoses(e).filter(p=>p.role==='counterweightGun')
    .map(({part,x,y,angle})=>({part,x,y,angle}));
  if(!shots.length){finish(e,'disabled');return [];}
  c.volleys++;
  if(c.volleys>=COUNTERWEIGHT.maxVolleys)finish(e,'spent');
  else enter(c,'cooldown',COUNTERWEIGHT.cooldown);
  return shots;
}
