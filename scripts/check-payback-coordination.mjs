import assert from 'node:assert/strict';
import * as firstLight from '../src/game/ArcadeFirstLight.js';

const advance=(m,sector,seconds,options={})=>{
  for(let i=0;i<Math.ceil(seconds*60);i++)m.update(1/60,{sector,safe:true,...options});
};
const ready=(sector=1)=>{
  const m=new firstLight.FirstLightModel('payback-coordination');
  advance(m,sector,5.2);m.hit('left',10000,{});m.hit('right',10000,{});advance(m,sector,11);
  while(!m.encounter)m.update(1/60,{sector:sector+1,safe:true});
  assert.equal(m.payback.status,'ready');return m;
};
const m=ready();
advance(m,2,.75,{paybackPart:'right'});
assert.equal(m.payback.status,'ready','do not launch at the first offscreen frame');
advance(m,2,.15,{paybackPart:'right'});
assert.equal(m.payback.status,'active','wing should launch during the visible rival approach');
assert.equal(m.payback.part,'right','wing commits to the gun outside the player firing lane');
assert.equal(m.hitPayback('right',100,{}),null,'arrival remains a real flight before damage');
const selection=firstLight.convoyPaybackTarget;
const e=m.encounter,targets=[{part:'left',x:200},{part:'core',x:400},{part:'right',x:600}];
const random=Math.random;Math.random=()=>{throw Error('Target selection must not consume gameplay RNG');};
try{
  assert.equal(selection(e,targets,220),'right');
  assert.equal(selection(e,targets,580),'left');
  assert.equal(selection(e,targets,400),'left','equal distances have a stable tie');
  assert.equal(selection(e,targets,NaN),'left','invalid geometry uses the living-gun fallback');
  assert.equal(selection(e,[],220),'left');
  e.hp.right=0;assert.equal(selection(e,targets,220),'left','ignore a destroyed gun');
  e.hp.left=0;assert.equal(selection(e,targets,220),null,'never select the core');
  assert.equal(selection({...e,kind:'convoy'},targets,220),null);
}finally{Math.random=random;}

const bound=ready();advance(bound,2,1.8,{paybackPart:'right'});
assert.equal(bound.payback.part,'right');
const untouched=bound.encounter.hp.left,core=bound.encounter.hp.core,shot={};
assert(bound.hitPayback('right',1000,shot));
assert.equal(bound.hitPayback('right',1000,shot),null,'no duplicate credit');
assert.equal(bound.hitPayback('left',1000,{}),null,'no budget migration to a second gun');
assert.equal(bound.hitPayback('core',1000,{}),null);
assert(Math.abs(bound.payback.spentDamage-bound.encounter.maxHp.side*.7)<1e-8);
advance(bound,2,.1,{paybackPart:'left'});
assert.equal(bound.payback.part,'right','later player movement cannot retarget the committed wing');
assert.equal(bound.encounter.hp.left,untouched);assert.equal(bound.encounter.hp.core,core);
assert.equal(bound.rewardCount,0);

const fallback=ready();fallback.hit('right',100,{});advance(fallback,2,.9,{paybackPart:'right'});
assert.equal(fallback.payback.part,'left','a stale preference cannot select a broken part');
const fast=ready();fast.hit('left',100,{});fast.hit('right',100,{});fast.hit('core',100,{});
advance(fast,2,5,{paybackPart:'right'});
assert.equal(fast.payback.spentDamage,0,'burst kill is never withheld to force a callback');
assert.equal(fast.rewardCount,1);
const departure=ready();advance(departure,2,.9,{paybackPart:'right'});
departure.hit('right',100,{});advance(departure,2,1.1,{paybackPart:'left'});
assert.equal(departure.payback.status,'spent');assert.equal(departure.payback.spentDamage,0);
assert.equal(departure.payback.escorts.length,0,'early weapon kill clears the wing without a forced attack');
for(const sector of [1,51,401]){
  const entry=ready(sector);advance(entry,sector+1,.75,{paybackPart:'right'});
  advance(entry,sector+1,30,{safe:false,combat:false,paybackPart:'right'});
  assert.equal(entry.payback.status,'ready','warning/transition cannot advance admission');
  advance(entry,sector+1,.15,{paybackPart:'right'});
  assert.equal(entry.payback.part,'right');
  assert.equal(entry.payback.budget,entry.encounter.maxHp.side*.7,'early and deep pressure share the same fraction');
}
console.log('[payback-coordination] PASS readable admission, complementary targeting, fixed one-gun budget, no retarget/RNG/forced payout');
