import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
assert(existsSync(new URL('../src/game/ReactorTow.js',import.meta.url)), 'Reactor Tow needs a bounded playable model before it counts as content');
const {makeReactorTow,reactorTowPoses,updateReactorTow,hitReactorTow,consumeReactorDischarge}=await import('../src/game/ReactorTow.js');
const make=()=>({kind:'convoy',age:0,sector:3,suspended:false,...makeReactorTow(1)});
const tick=(e,seconds,safe=true)=>{for(let i=0;i<Math.ceil(seconds*60);i++){if(safe)e.age+=1/60;updateReactorTow(e,1/60,{safe});}};
const hit=(e,part,damage=100,owner='player',projectile={})=>hitReactorTow(e,part,damage,projectile,owner);
{
 const e=make();assert.equal(Object.values(e.hp).reduce((a,b)=>a+b,0),6);
 tick(e,4);assert.equal(consumeReactorDischarge(e),false,'no surprise attack during approach');
 tick(e,1);assert(e.reactor.warning>0&&e.reactor.warning<1.4);assert.equal(consumeReactorDischarge(e),false);
 tick(e,2);assert.equal(consumeReactorDischarge(e),true);assert.equal(consumeReactorDischarge(e),false,'single discharge');
 assert.equal(reactorTowPoses(e).length,0,'spent reactor cannot farm hit credit');assert(e.duration<=e.age+2.8);
}
{
 const e=make();tick(e,5.6);const before=reactorTowPoses(e).find(p=>p.part==='vent');
 assert.equal(hit(e,'coupler').type,'disconnect');assert.equal(e.reactor.warning,0,'moving warning must restart');
 assert.equal(reactorTowPoses(e).find(p=>p.part==='vent').x,before.x,'cut is continuous');
 tick(e,1.1);assert.equal(consumeReactorDischarge(e),false,'no discharge while shifting');
 tick(e,1.1);assert.equal(consumeReactorDischarge(e),false,'fresh warning after drift');
 const after=reactorTowPoses(e).find(p=>p.part==='vent');assert(after.x-before.x>.5);
 tick(e,1);assert.equal(consumeReactorDischarge(e),true);
}
{
 const e=make();tick(e,6);assert.equal(hit(e,'vent').type,'vent');assert(e.reactor.harmless);
 tick(e,20);assert.equal(consumeReactorDischarge(e),false);assert.equal(reactorTowPoses(e).length,0);
 assert(e.duration<9,'safe reactor departs promptly');
}
{
 const e=make();tick(e,5.7);const age=e.age;tick(e,30,false);assert.equal(e.age,age);assert.equal(e.reactor.warning,0);
 tick(e,.8);assert.equal(consumeReactorDischarge(e),false,'warning preemption gives a fresh lead-in');
 tick(e,1);assert.equal(consumeReactorDischarge(e),true);
}
{
 for(const owner of ['ally','hostile','unknown'])assert.equal(hit(make(),'vent',1,owner),null);
 for(const amount of [0,-1,NaN,Infinity])assert.equal(hit(make(),'vent',amount),null);
 const e=make(),b={};assert.equal(hit(e,'vent',1,'player',b).credit,false);assert.equal(hit(e,'coupler',1,'player',b),null);
 e.suspended=true;assert.equal(hit(e,'vent'),null);e.suspended=false;
 assert.equal(hit(e,'core'),null);assert.equal(hit(e,'left'),null);
 const simultaneous=make();hit(simultaneous,'coupler');hit(simultaneous,'vent');tick(simultaneous,20);
 assert.equal(consumeReactorDischarge(simultaneous),false,'simultaneous parts never fire or reward');
}
const {CONVOY_SURPRISES}=await import('../src/config/ConvoySurpriseCatalog.js');
assert.equal(CONVOY_SURPRISES.length,10);
assert(CONVOY_SURPRISES.some(row=>row.id==='reactor-tow'),'normal admission uses the same bounded model');
const {getEncounterEvolutionTest}=await import('../src/config/EncounterEvolutionTest.js');
const location={hostname:'127.0.0.1',search:'?encounterEvolution=reactor-tow'};
assert.equal(getEncounterEvolutionTest({development:true,location})?.id,'reactor-tow');
assert.equal(getEncounterEvolutionTest({development:false,location}),null);
assert.equal(getEncounterEvolutionTest({development:true,location:{...location,hostname:'example.com'}}),null);
console.log('[reactor-tow] PASS bounded two-part decision, full lead-ins, ownership/no credit, isolated forced-test gate and normal rotation');
