import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
assert(existsSync(new URL('../src/game/ConvoySurprises.js',import.meta.url)), 'rescue interactions must exist before catalog entries count as implemented');
const {CONVOY_SURPRISES,convoySurpriseOrder}=await import('../src/config/ConvoySurpriseCatalog.js');
const {makeConvoySurprise,convoyPartPoses,hitConvoySurprise,updateConvoySurprise}=await import('../src/game/ConvoySurprises.js');
const {FirstLightModel}=await import('../src/game/ArcadeFirstLight.js');
const advance=(m,sector,seconds,extra={})=>{for(let i=0;i<Math.ceil(seconds*60);i++)m.update(1/60,{sector,safe:true,ordinary:true,...extra});};
const make=id=>({kind:'convoy',age:3,duration:16,suspended:false,...makeConvoySurprise(id,1)});
const hit=(e,p,n=100,owner='player')=>hitConvoySurprise(e,p,n,{},owner);
assert.equal(CONVOY_SURPRISES.length,10);
assert.equal(new Set(CONVOY_SURPRISES.map(x=>x.mechanic)).size,10,'ten different state transitions');
assert.deepEqual(convoySurpriseOrder('same'),convoySurpriseOrder('same'));
assert.equal(new Set(convoySurpriseOrder('same')).size,10);
for(const entry of CONVOY_SURPRISES){
  const e=make(entry.id);
  assert.equal(Object.values(e.hp).reduce((a,b)=>a+b,0),6,'original rescue health budget');
  assert(Object.keys(e.hp).length<=6);
  assert.equal(hit(e,'core'),null,'no rival kill/reward path');
  const p=Object.keys(e.hp)[0],projectile={};
  const before=e.hp[p];assert(hitConvoySurprise(e,p,.2,projectile));
  assert.equal(hitConvoySurprise(e,p,.2,projectile),null,'same projectile cannot double dip');
  assert(e.hp[p]<=before);
  assert.equal(hit(e,'left',1,'ally'),null,'scripted support cannot rescue');
  assert.equal(hit(e,'right',1,'hostile'),null,'hostiles cannot damage captives');
  e.suspended=true;assert.equal(hit(e,p),null);e.suspended=false;
  const age=e.age;updateConvoySurprise(e,.1,{paused:true});assert.equal(e.age,age);
  const poses=convoyPartPoses(e);assert(poses.every(x=>Number.isFinite(x.x)&&Number.isFinite(x.y)));
}
{
 const e=make('twin-jailers');const r=hit(e,'left');assert.deepEqual(r.rescues,['left']);
 assert.equal(e.supportPart,'rightGun');const before=e.hp.rightGun;
 assert(hitConvoySurprise(e,'rightGun',100,{},'ally'));
 assert(e.hp.rightGun>=before*.3-1e-8,'rescued fighter pressures one gun within a bounded budget');
 assert.equal(hitConvoySurprise(e,'rightGun',100,{},'ally'),null);
 assert.equal(hit(e,'left'),null,'once-only rescue');
}
{
 const e=make('crossed-chains');const before=convoyPartPoses(e).find(x=>x.part==='left');
 hit(e,'leftTether');e.age+=2;const after=convoyPartPoses(e).find(x=>x.part==='left');
 assert.equal(after.x,before.x);assert.equal(after.y,before.y,'tether cut freezes the actual crossing position');
 assert.notEqual(convoyPartPoses(e).find(x=>x.part==='right').x,before.x);
}
{
 const e=make('prisoner-exchange');hit(e,'gun');assert.equal(e.duration,18,'gun-first adds a bounded extraction window');
 const before=convoyPartPoses(e).find(x=>x.part==='left');hit(e,'relay');e.age+=3;
 const after=convoyPartPoses(e).find(x=>x.part==='left');assert.equal(after.x,before.x,'transfer interruption stays continuous');
 const relayFirst=make('prisoner-exchange');hit(relayFirst,'relay');hit(relayFirst,'gun');assert.equal(relayFirst.duration,16);
}
{
 const e=make('last-shuttle');const before=convoyPartPoses(e).find(x=>x.part==='gun');hit(e,'drive');e.age+=2;
 const after=convoyPartPoses(e).find(x=>x.part==='gun');assert.equal(after.x,before.x);assert.equal(e.fixedGun,true);
}
{
 const e=make('convoy-split');e.age=1;const before=convoyPartPoses(e);e.age=5;const after=convoyPartPoses(e);
 assert(after.find(x=>x.part==='gun').x-before.find(x=>x.part==='gun').x>.1);
 assert(after.find(x=>x.part==='left').x<before.find(x=>x.part==='left').x,'hostage half separates from covering gun');
}
{
 const e=make('shielded-evacuation');assert.equal(hit(e,'left').type,'blocked');assert(e.hp.left>0);
 hit(e,'leftShield');assert.equal(convoyPartPoses(e).find(x=>x.part==='left').blocked,false);
 assert.equal(e.cover.length,0);hit(e,'rightShield');assert.equal(e.cover.length,2);
 const result=hit(e,'cover0');assert.equal(result.credit,false);assert.equal(result.type,'cover');
 e.age+=4;updateConvoySurprise(e,.1);assert.equal(e.cover.filter(x=>x.active).length,0,'cover cannot hold completion');
}
{
 const e=make('stolen-callsign');assert.equal(hit(e,'left').type,'blocked');hit(e,'emitter');
 assert.deepEqual(hit(e,'left').rescues,['left']);assert.equal(hit(e,'emitter'),null);
}
{
 const e=make('rescue-tow');assert.equal(convoyPartPoses(e).find(x=>x.part==='left').role,'tow');
 hit(e,'gun');assert.deepEqual(hit(e,'left').rescues,['left']);
}
// Existing introduction, earned wing and reward budgets are still authoritative.
const original=new FirstLightModel('unchanged');advance(original,1,5.2);
assert.equal(original.encounter.surprise,undefined);original.hit('left',100,{});original.hit('right',100,{});
assert.equal(original.rescued,2);assert.equal(original.rewardCount,0);assert(original.payback);
// Machinery-only contacts have no captives; dedicated tests cover their branches.
const rescues=CONVOY_SURPRISES.filter(x=>x.parts.left&&x.parts.right);
assert.equal(rescues.length,8,'preserve all eight rescue interactions');
for(const id of rescues.map(x=>x.id)){
 const m=new FirstLightModel('batch');m.encounter=make(id);
 // Bomb-like snapshot only: newly exposed locks wait for another attack.
 const snapshot=convoyPartPoses(m.encounter).filter(p=>!p.blocked&&!p.cover);
 for(const p of snapshot)m.hit(p.part,100,{});
 for(const p of convoyPartPoses(m.encounter).filter(p=>!p.blocked&&!p.cover))m.hit(p.part,100,{});
 assert.equal(m.rescued,2,id);assert.equal(m.escorts.length,2);assert.equal(m.rewardCount,0);assert.equal(m.victories,0);
 assert(m.payback);assert.equal(new Set(m.escorts.map(x=>x.callsign)).size,2);
 for(let i=0;i<1200;i++)m.update(.1,{sector:3,safe:true,ordinary:false});
 assert.equal(m.encounter,null,'all hulls depart without being wave-completion enemies');assert.equal(m.escorts.length,0);
 m.cancel('retry');assert.equal(m.payback,null);
}
const boundary=new FirstLightModel('selection');advance(boundary,2,4.2);assert.equal(boundary.encounter.kind,'rival');
const schedule=new FirstLightModel('schedule');advance(schedule,3,20,{ordinary:false});assert.equal(schedule.encounter,null,'stalling an empty wave earns no new contact');
advance(schedule,3,20,{paused:true});assert.equal(schedule.encounter,null);
advance(schedule,3,5.2,{allowSurprise:false});assert.equal(schedule.encounter,null,'shared family admission respected');
advance(schedule,3,5.2);assert(schedule.encounter.surprise,'earliest new rescue uses sector3');
const before=JSON.stringify(schedule.snapshot());advance(schedule,3,20,{paused:true});assert.equal(JSON.stringify(schedule.snapshot()),before);
const first=schedule.encounter.surprise;schedule.cancel('finished',false);advance(schedule,6,5.2);assert.equal(schedule.encounter,null,'recovery leaves ordinary fighting');
advance(schedule,6,15);assert.notEqual(schedule.encounter.surprise,first,'seeded selection avoids repeat');
for(const sector of [51,143,410]){const m=new FirstLightModel('deep');advance(m,sector,20);assert(!m.encounter||m.encounter.sector===sector);}
console.log('[convoy-surprises] PASS ten contacts/eight rescue interactions, six-unit budget, ownership, once-only rescues, neutral cover, scheduling/pause/recovery/expiry/reset');
