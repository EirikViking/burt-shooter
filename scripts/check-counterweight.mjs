import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
assert(existsSync(new URL('../src/game/Counterweight.js',import.meta.url)),
  'Counterweight requires its bounded mechanics model; a design does not count as playable content');
const {COUNTERWEIGHT,makeCounterweight,counterweightPoses,updateCounterweight,
  hitCounterweight,consumeCounterweightVolley}=await import('../src/game/Counterweight.js');
const make=(scale=1)=>({kind:'convoy',age:0,sector:3,suspended:false,...makeCounterweight(scale)});
const tick=(e,seconds,options={})=>{
  for(let remaining=seconds;remaining>1e-8;){
    const dt=Math.min(1/60,remaining);remaining-=dt;
    if(!options.paused&&options.safe!==false&&!e.suspended)e.age+=dt;
    updateCounterweight(e,dt,options);
  }
};
const hit=(e,part,damage=100,owner='player',projectile={})=>hitCounterweight(e,part,damage,projectile,owner);
const ready=e=>{for(let n=0;n<1200&&e.counterweight.phase!=='ready';n++)tick(e,1/60);
  assert.equal(e.counterweight.phase,'ready');};
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const checks=[];
function test(name,fn){fn();checks.push(name);}

test('bounded stationary lead-in, two real shot poses, exactly once and finite low-damage exit',()=>{
  const e=make();
  assert.equal(Object.values(e.hp).reduce((a,b)=>a+b,0),6,'preserve existing contact health budget');
  tick(e,COUNTERWEIGHT.approach-.1);assert.deepEqual(consumeCounterweightVolley(e),[]);
  ready(e);
  const poses=counterweightPoses(e).filter(p=>p.role==='counterweightGun');
  const shots=consumeCounterweightVolley(e);
  assert.equal(shots.length,2);
  for(const s of shots){const p=poses.find(p=>p.part===s.part);near(s.x,p.x);near(s.y,p.y);near(s.angle,p.angle);}
  assert.deepEqual(consumeCounterweightVolley(e),[]);
  let bullets=shots.length;
  for(let n=0;n<1800;n++){tick(e,1/60);bullets+=consumeCounterweightVolley(e).length;}
  assert.equal(bullets,6);assert.equal(e.counterweight.phase,'spent');
  assert.equal(counterweightPoses(e).length,0);assert(e.duration<=COUNTERWEIGHT.duration);
});

test('either gun changes surviving aim continuously and requires a complete new warning',()=>{
  for(const broken of ['portGun','starboardGun']){
    const e=make();ready(e);
    const survivor=broken==='portGun'?'starboardGun':'portGun';
    const before=counterweightPoses(e).find(p=>p.part===survivor);
    const result=hit(e,broken);
    assert.equal(result.type,'counterweight-tilt');assert.equal(result.credit,false);
    assert.deepEqual(result.rescues,[]);
    const after=counterweightPoses(e).find(p=>p.part===survivor);
    near(after.x,before.x);near(after.y,before.y);near(after.angle,before.angle);
    assert.deepEqual(consumeCounterweightVolley(e),[],'old fully charged warning is invalidated');
    tick(e,COUNTERWEIGHT.settle-.05);assert.deepEqual(consumeCounterweightVolley(e),[]);
    tick(e,.1);const settled=counterweightPoses(e).find(p=>p.part===survivor);
    assert(Math.abs(settled.angle-before.angle)>.25);
    tick(e,COUNTERWEIGHT.warning-.15);assert.deepEqual(consumeCounterweightVolley(e),[]);
    ready(e);const shots=consumeCounterweightVolley(e);assert.equal(shots.length,1);
    near(shots[0].angle,settled.angle);near(shots[0].x,settled.x);near(shots[0].y,settled.y);
    assert.equal(e.counterweight.volleys,1,'reorientation cannot add a volley budget');
  }
});

test('pivot and simultaneous component destruction cancel ready attacks without rescue or victory',()=>{
  for(const order of [['pivot'],['portGun','starboardGun'],['starboardGun','portGun'],
    ['portGun','pivot'],['pivot','starboardGun'],['starboardGun','pivot']]){
    const e=make();ready(e);
    for(const part of order){const r=hit(e,part);if(r){assert.equal(r.credit,false);assert.deepEqual(r.rescues,[]);
      assert(!['rescue','victory','weapon'].includes(r.type));}}
    assert.equal(e.counterweight.phase,'disabled');assert.equal(counterweightPoses(e).length,0);
    tick(e,20);assert.deepEqual(consumeCounterweightVolley(e),[]);
    assert.equal(e.counterweight.volleys,0);assert(e.duration<8);
  }
  const burst=make();hit(burst,'pivot');assert.equal(burst.counterweight.phase,'disabled','no forced invulnerability');
});

test('an early gun break cannot accelerate the first attack through arrival',()=>{
  const e=make();hit(e,'portGun');
  tick(e,COUNTERWEIGHT.settle+COUNTERWEIGHT.warning+.1);
  assert.deepEqual(consumeCounterweightVolley(e),[],'damaging an arriving gun must not skip approach');
  tick(e,Math.max(0,COUNTERWEIGHT.approach-e.age)+COUNTERWEIGHT.warning-.1);
  assert.deepEqual(consumeCounterweightVolley(e),[],'full warning still follows arrival');
  ready(e);assert.equal(consumeCounterweightVolley(e).length,1);
});

test('pause, preemption and suspended presentation cannot bank a warning or hit',()=>{
  for(const options of [{paused:true},{safe:false}]){
    const e=make();ready(e);const age=e.age;
    tick(e,30,options);assert.equal(e.age,age);assert.deepEqual(consumeCounterweightVolley(e),[]);
    assert.equal(hit(e,'pivot'),null);
    tick(e,COUNTERWEIGHT.warning-.1);assert.deepEqual(consumeCounterweightVolley(e),[]);
    ready(e);assert.equal(consumeCounterweightVolley(e).length,2);
  }
  const e=make();ready(e);e.suspended=true;
  assert.deepEqual(consumeCounterweightVolley(e),[]);assert.equal(hit(e,'pivot'),null);
  tick(e,10);e.suspended=false;tick(e,.1);assert.deepEqual(consumeCounterweightVolley(e),[]);
});

test('owner, finite damage, valid part and projectile identity prevent duplicate credit',()=>{
  for(const owner of ['ally','hostile','unknown','payback'])assert.equal(hit(make(),'pivot',1,owner),null);
  for(const n of [0,-1,NaN,Infinity])assert.equal(hit(make(),'pivot',n),null);
  for(const part of ['left','right','core','toString'])assert.equal(hit(make(),part),null);
  const e=make(),b={};assert.equal(hit(e,'portGun',1,'player',b).credit,false);
  assert.equal(hit(e,'starboardGun',1,'player',b),null,'piercing/broad projectile cannot hit two components');
  assert.equal(e.hp.starboardGun,e.maxHp.starboardGun);
  assert.equal(hit(e,'pivot',1,'player',null),null);
  e.age=e.duration;assert.equal(hit(e,'pivot'),null);assert.deepEqual(consumeCounterweightVolley(e),[]);
  assert.equal(counterweightPoses(e).length,0);
});

test('late break, pause during tilt, invalid time and independent run state stay finite',()=>{
  const e=make();ready(e);hit(e,'portGun');tick(e,.35);
  const angle=e.counterweight.angle;tick(e,60,{paused:true});near(e.counterweight.angle,angle);
  tick(e,COUNTERWEIGHT.settle);assert.equal(e.counterweight.phase,'warning');
  const phaseRemaining=e.counterweight.remaining;
  for(const dt of [0,-1,NaN,Infinity])updateCounterweight(e,dt);
  near(e.counterweight.remaining,phaseRemaining);
  const other=make();assert.equal(other.hp.portGun,1.5);assert.equal(other.counterweight.volleys,0);
  e.age=e.duration-.2;updateCounterweight(e,.1);assert.deepEqual(consumeCounterweightVolley(e),[]);
  assert(e.duration<=COUNTERWEIGHT.duration);
});

test('same inputs and timing reproduce without consuming gameplay or cosmetic RNG',()=>{
  const random=Math.random;Math.random=()=>{throw new Error('Counterweight must not consume RNG');};
  try{
    const replay=()=>{const e=make(3),out=[];
      for(let i=0;i<1200;i++){if(i===301)hit(e,'starboardGun',6);tick(e,1/60);
        for(const shot of consumeCounterweightVolley(e))out.push([i,shot.part,shot.x,shot.y,shot.angle]);}
      return {out,hp:e.hp,duration:e.duration,state:e.counterweight};};
    assert.deepEqual(replay(),replay());
    for(const scale of [1,3,5]){const e=make(scale);assert.equal(e.hp.pivot,3*scale);hit(e,'pivot',3*scale);
      assert.equal(e.counterweight.phase,'disabled');}
  }finally{Math.random=random;}
});

const {CONVOY_SURPRISES}=await import('../src/config/ConvoySurpriseCatalog.js');
assert(CONVOY_SURPRISES.some(row=>row.id===COUNTERWEIGHT.id),'normal rotation must use this bounded model');
console.log(JSON.stringify({status:'pass',scope:'Counterweight model assertions only',checks,
  groups:checks.length,normalAdmission:true,runtimeVisualsVerified:false}));
