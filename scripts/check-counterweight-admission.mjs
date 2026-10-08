import assert from 'node:assert/strict';
import * as catalog from '../src/config/ConvoySurpriseCatalog.js';
import {FirstLightModel,firstLightEligible} from '../src/game/ArcadeFirstLight.js';
import {recordEncounterFamily,encounterFamilyReady,dreadnoughtEligible} from '../src/config/EncounterPacing.js';
const {CONVOY_SURPRISES,convoySurpriseOrder,convoySurpriseReady,recordConvoySurprise}=catalog;
assert.equal(CONVOY_SURPRISES.length,10,'Counterweight should use one existing contact opportunity');
assert(CONVOY_SURPRISES.some(r=>r.id==='counterweight'));
assert.equal(typeof convoySurpriseReady,'function');assert.equal(typeof recordConvoySurprise,'function');
const histogram=[0,0,0,0];
for(let seed=0;seed<1000;seed++){
 const order=convoySurpriseOrder('admission-'+seed),cw=order.indexOf('counterweight'),reactor=order.indexOf('reactor-tow');
 assert.equal(order.length,10);assert.equal(new Set(order).size,10);
 assert(reactor>=0&&reactor<3);assert(cw>reactor&&cw<=3,'Second machinery decision follows the simpler reactor within four eligible opportunities');histogram[cw]++;
 assert.deepEqual(order,convoySurpriseOrder('admission-'+seed));
}
const oldOrders={
 'admission-1':['twin-jailers','reactor-tow','stolen-callsign','convoy-split','last-shuttle','shielded-evacuation','rescue-tow','crossed-chains','prisoner-exchange'],
 'admission-13':['reactor-tow','twin-jailers','stolen-callsign','crossed-chains','rescue-tow','prisoner-exchange','shielded-evacuation','last-shuttle','convoy-split'],
 'admission-72':['reactor-tow','convoy-split','last-shuttle','prisoner-exchange','twin-jailers','crossed-chains','rescue-tow','stolen-callsign','shielded-evacuation']};
for(const [seed,expected]of Object.entries(oldOrders))assert.deepEqual(convoySurpriseOrder(seed).filter(id=>id!=='counterweight'),expected,'Preserve prior relative order and Reactor introduction');
const advance=(m,g,seconds,extra={})=>{for(let i=0;i<Math.ceil(seconds*60);i++)m.update(1/60,{sector:g.level,safe:true,combat:true,present:true,ordinary:true,allowSurprise:convoySurpriseReady(g,m.nextSurpriseId()),...extra});};
for(const family of ['rescue_contact','linked_battery']){
 const g={level:6,runElapsedSeconds:100},m=new FirstLightModel('blocked');m.surpriseOrder=['counterweight','twin-jailers'];
 recordEncounterFamily(g,family,5);const order=m.surpriseOrder.slice();
 advance(m,g,20);assert.equal(m.encounter,null);assert.equal(m.surpriseOrdinal,0);assert.equal(m.seen.has(6),false);assert.deepEqual(m.surpriseOrder,order);
 g.level=9;g.runElapsedSeconds=114;advance(m,g,20);assert.equal(m.encounter,null);g.runElapsedSeconds=115;
 for(const extra of [{ordinary:false},{paused:true},{combat:false},{safe:false}])advance(m,g,10,extra);
 assert.equal(m.encounter,null);assert.equal(m.surpriseOrdinal,0);
 advance(m,g,5.2);assert(m.encounter?.counterweight);assert.equal(m.surpriseOrdinal,1);
 recordConvoySurprise(g,m.encounter.surprise);
 assert.equal(encounterFamilyReady(g,'rescue_contact',10),false);assert.equal(encounterFamilyReady(g,'linked_battery',10),false);
 assert.equal(dreadnoughtEligible({game:g,level:10,enemies:[]}),false,'battery recovery also protects later Breach');
 advance(m,g,18);assert.equal(m.encounter,null);assert.equal(m.rescued,0);assert.equal(m.rewardCount,0);assert.equal(m.payback,null);
 const reset=new FirstLightModel('blocked');assert.equal(reset.surpriseOrdinal,0);assert.equal(reset.encounter,null);
}
const rescueOnly={level:6,runElapsedSeconds:100};recordEncounterFamily(rescueOnly,'linked_battery',6);
assert(convoySurpriseReady(rescueOnly,'twin-jailers'),'Unrelated rescue is not over-blocked by a battery');
assert(!convoySurpriseReady(rescueOnly,'counterweight'));
for(const mode of ['ranked','ranked_tactical','overrun_pure','overrun_tactical','scout','sector_start'])assert(firstLightEligible({runMode:mode}));
for(const mode of ['daily_signal','boss_rush','unknown'])assert.equal(firstLightEligible({runMode:mode}),false);
for(const level of [1,2,51]){const m=new FirstLightModel('boundaries'),g={level,runElapsedSeconds:30};advance(m,g,6);assert(m.encounter&&!m.encounter.counterweight,'Original first-light entry unchanged');}
const deep=new FirstLightModel('deep'),game={level:399,runElapsedSeconds:100};deep.surpriseOrder=['counterweight'];advance(deep,game,6);assert(deep.encounter.counterweight);assert.equal(deep.encounter.maxHp.pivot,15);
console.log('[counterweight-admission] PASS',JSON.stringify(histogram),'1000 rotations, dual-family blocking without consuming cards, prior order, modes/51/deep/reset and no rewards');