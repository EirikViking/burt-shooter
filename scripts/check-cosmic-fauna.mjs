import assert from 'node:assert/strict';
import {CosmicFaunaClock, deformFauna, faunaBlocked} from '../src/effects/CosmicFaunaMotion.js';
import {COSMIC_FAUNA} from '../src/config/CosmicFaunaCatalog.js';

const random=Math.random;Math.random=()=>{throw Error('Cosmetic work touched gameplay RNG');};
try {
 const clock=new CosmicFaunaClock('same-run',COSMIC_FAUNA);
 const twin=new CosmicFaunaClock('same-run',COSMIC_FAUNA);
 const frames=(n,options={})=>{for(let i=0;i<n;i++)clock.step(1/60,{advancing:true,ordinary:true,ready:true,...options});};
 frames(10000,{advancing:false});assert.equal(clock.quiet,0,'pause must not earn a passage');
 frames(10000,{ordinary:false});assert.equal(clock.active,null,'major encounter admission');
 frames(1200);assert.equal(clock.active,null,'first passage should allow an opening beat');
 frames(600);assert(clock.active,'ready ordinary introduction by 30 combat seconds');
 const age=clock.active.age;frames(120,{advancing:false});assert.equal(clock.active.age,age);
 frames(2400,{ordinary:false});assert.equal(clock.active,null,'warnings cannot hold old creatures forever');
 assert.equal(clock.quiet,0,'busy combat must not earn quiet recovery');
 const order=[...clock.order];assert.equal(new Set(order).size,COSMIC_FAUNA.length);assert.deepEqual(twin.order,order);
 const seen=[];for(let i=0;i<50000;i++){clock.step(.05,{advancing:true,ordinary:true,ready:true});if(clock.event==='start')seen.push(clock.active.index);}
 assert(seen.length>6);for(let i=1;i<seen.length;i++)assert.notEqual(seen[i],seen[i-1],'immediate repeat');
 assert(clock.quiet<=110,'bounded recovery');clock.cancel();assert.equal(clock.active,null);
 const base=new Float32Array([.1,.25,.25,.5,.5,.8,.9,.25,.9,.7]),a=new Float32Array(base.length),b=new Float32Array(base.length);
 for(const definition of COSMIC_FAUNA){
  deformFauna(base,a,definition,0,false);deformFauna(base,b,definition,2,false);
  assert.notDeepEqual([...a],[...b],definition.id+' must swim');
  assert([...a,...b].every(Number.isFinite));
  deformFauna(base,a,definition,0,true);deformFauna(base,b,definition,99,true);assert.deepEqual(a,b,'reduced motion freezes anatomy');
 }
 const s={enemyManager:{state:'WAVE_ACTIVE',enemies:[]}};assert.equal(faunaBlocked(s),false);
 s.enemyManager.state='BOSS_GATE';assert(faunaBlocked(s),'boss lead-in must dim before the boss exists');s.enemyManager.state='WAVE_ACTIVE';
 for(const kind of ['boss','space_snake','mystery','mystery_part']){s.enemyManager.enemies=[{kind,active:true}];assert(faunaBlocked(s),kind);}
 s.enemyManager.enemies=[];s.activeCabinetWonder={};assert(faunaBlocked(s),'preserve wonder spotlight');
 console.log('[cosmic-fauna] PASS clock, finite lifetime, recovery, no-repeat, reproducibility, RNG, anatomy, warning exclusions');
}finally{Math.random=random;}
