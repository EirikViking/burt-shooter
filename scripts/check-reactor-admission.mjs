import assert from 'node:assert/strict';
import {CONVOY_SURPRISES,convoySurpriseOrder} from '../src/config/ConvoySurpriseCatalog.js';
import {FirstLightModel,firstLightEligible} from '../src/game/ArcadeFirstLight.js';
import {encounterFamilyReady,recordEncounterFamily} from '../src/config/EncounterPacing.js';
const advance=(m,sector,seconds,extra={})=>{for(let i=0;i<Math.ceil(seconds*60);i++)m.update(1/60,{sector,safe:true,combat:true,present:true,ordinary:true,...extra});};
assert(CONVOY_SURPRISES.some(r=>r.id==='reactor-tow'),'Reactor Tow must use the existing contact rotation');
const histogram=[0,0,0];
for(let seed=0;seed<1000;seed++){
 const order=convoySurpriseOrder('admission-'+seed),index=order.indexOf('reactor-tow');
 assert.equal(order.length,10);assert.equal(new Set(order).size,10);assert(index>=0&&index<3,'new mechanic gets an early eligible opportunity');
 histogram[index]++;assert.deepEqual(order,convoySurpriseOrder('admission-'+seed));
}
for(const seed of ['admission-1','admission-13','admission-72']){
 const m=new FirstLightModel(seed);m.surpriseOrder=['reactor-tow',...m.surpriseOrder.filter(x=>x!=='reactor-tow')];
 advance(m,3,8,{ordinary:false});assert.equal(m.encounter,null);
 advance(m,3,8,{paused:true});assert.equal(m.encounter,null);
 advance(m,3,8,{allowSurprise:false});assert.equal(m.encounter,null);
 advance(m,3,5.2);assert(m.encounter?.reactor);const first=m.encounter;
 advance(m,3,100,{safe:false,combat:false,present:false});assert.equal(first.age<.3,true);assert.equal(first.reactor.warning,0);
 advance(m,3,18);assert.equal(m.encounter,null);assert.equal(m.rewardCount,0);assert.equal(m.rescued,0);assert.equal(m.payback,null);
 advance(m,6,5);assert.equal(m.encounter,null);advance(m,6,17);assert(m.encounter&&!m.encounter.reactor,'next card is different');
 m.cancel('retry');const reset=new FirstLightModel(seed);assert.equal(reset.encounter,null);assert.equal(reset.surpriseOrdinal,0);
}
for(const family of ['rescue_contact','reactor_freight']){
 const g={level:3,runElapsedSeconds:100};recordEncounterFamily(g,family);
 for(const alias of ['rescue_contact','reactor_freight']){
  assert.equal(encounterFamilyReady(g,alias,4),false,'different names cannot bypass shared family recovery');
  g.runElapsedSeconds=114;assert.equal(encounterFamilyReady(g,alias,5),false);g.runElapsedSeconds=115;assert.equal(encounterFamilyReady(g,alias,5),true);
 }
}
for(const mode of ['ranked','ranked_tactical','overrun_pure','overrun_tactical','scout','sector_start'])assert(firstLightEligible({runMode:mode}));
for(const mode of ['daily_signal','boss_rush','pure_unknown'])assert.equal(firstLightEligible({runMode:mode}),false);
for(const sector of [1,2,51]){const m=new FirstLightModel('boundary');advance(m,sector,6);assert.equal(m.encounter.kind,sector===2?'rival':'convoy');assert(!m.encounter.reactor);}
const deep=new FirstLightModel('deep');deep.surpriseOrder=['reactor-tow'];advance(deep,399,6);assert(deep.encounter.reactor);assert.equal(deep.encounter.maxHp.vent,20);
console.log('[reactor-admission] PASS 1000 seeded rotations',JSON.stringify(histogram),'existing opportunity, shared family recovery, reset/modes/51/deep');
