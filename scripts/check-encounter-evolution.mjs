import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { FirstLightModel } from '../src/game/ArcadeFirstLight.js';
import {getEncounterEvolutionTest} from '../src/config/EncounterEvolutionTest.js';
import {createRunPolicy,isPrototypeRunPolicy} from '../src/game/RunPolicy.js';
import {bossCombinationAdmission,mysteryAdmission} from '../src/config/EncounterPacing.js';
import {isSpaceSnakeEligible} from '../src/config/SpaceSnakes.js';

const advance = (m, sector, seconds, options = {}) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) m.update(1 / 60, { sector, safe: true, ...options });
};
const rescue = () => {
  const m = new FirstLightModel('evolution-test'); advance(m, 1, 5.2);
  m.hit('left', 100, {}); m.hit('right', 100, {}); return m;
};
const m = rescue();
assert(m.payback, 'a complete rescue remembers its wing for a later rival');
assert.equal(m.payback.status, 'serving');
const identities = m.escorts.map(e => ({ rank: e.rank, callsign: e.callsign, side: e.side }));
advance(m, 1, 11);
assert.equal(m.escorts.length, 0); assert.equal(m.payback.status, 'ready');
advance(m, 2, 7);
assert.equal(m.payback.status, 'active');
assert.deepEqual(m.payback.escorts.map(e => ({ rank: e.rank, callsign: e.callsign, side: e.side })), identities);
const rival = m.encounter, part = m.payback.part, hp = rival.hp[part];
assert.equal(m.hitPayback('core', 100, {}), null, 'callback cannot damage a core');
const projectile = {};
assert(m.hitPayback(part, 1000, projectile));
assert.equal(m.hitPayback(part, 1000, projectile), null);
assert(rival.hp[part] >= hp * .3 - 1e-8, 'callback spends at most 70% of one side weapon');
assert.equal(rival.won, false); assert.equal(m.rewardCount, 0);
advance(m, 2, 10); assert.equal(m.payback.status, 'spent');
m.cancel('player-death'); assert.equal(m.payback, null, 'death clears callback identity');
const partial = new FirstLightModel('partial'); advance(partial, 1, 5.2); partial.hit('left', 100, {});
assert.equal(partial.payback, null, 'one rescued fighter does not qualify');
const suspended = rescue(); advance(suspended, 1, 12, {safe: false, combat: false});
assert.equal(suspended.payback.status, 'serving');
const age = suspended.payback.eligibleSeconds;
advance(suspended, 1, 12, {paused: true}); assert.equal(suspended.payback.eligibleSeconds, age);
advance(suspended, 1, 11); advance(suspended, 3, 90);
assert.equal(suspended.payback.status, 'expired', 'stalling cannot retain a callback indefinitely');
const boundary = rescue(); advance(boundary, 1, 11); advance(boundary, 13, .1);
assert.equal(boundary.payback.status, 'expired', 'missed next rival window expires');
const reset = rescue(); reset.cancel('scene-destroy'); assert.equal(reset.payback, null);
assert(existsSync(new URL('../src/game/SerpentMolt.js', import.meta.url)), 'snake molt model exists');
const { SerpentMoltModel, SERPENT_MOLT, serpentMoltEligible,serpentMoltDue } = await import('../src/game/SerpentMolt.js');
assert.equal(serpentMoltDue(23,0,true),false);assert.equal(serpentMoltDue(24,0,true),true);
assert.equal(serpentMoltDue(24,0,false),false);assert.equal(serpentMoltDue(0,undefined,true),false);
for(const mode of ['ranked','ranked_tactical','overrun_pure','overrun_tactical','scout','sector_start'])
  assert(serpentMoltEligible({profileId:'space_snake_cinder',sector:51,runMode:mode,standalone:true}));
for(const sector of [6,51,143,410])assert(isSpaceSnakeEligible({type:'grunt'},sector,{runMode:'overrun_tactical'}));
for(const config of [{isChallenge:true},{type:'BOSS'},{allowConcurrentSpawn:true},{highSectorAuthoredEncounter:true}])
  assert(!isSpaceSnakeEligible(config,51,{runMode:'overrun_pure'}));
for(const [development,hostname,expected] of [[true,'127.0.0.1',true],[false,'127.0.0.1',false],[true,'example.com',false]]){
  const preset=getEncounterEvolutionTest({development,location:{hostname,search:'?encounterEvolution=molt'}});
  assert.equal(Boolean(preset),expected);
}
assert(isPrototypeRunPolicy(createRunPolicy({runMode:'ranked',prototype:true,isDebugRun:true})));
const manager={game:{gameId:'combination',scenes:{play:{}}},enemies:[],serpentMolts:new Set([{}])};
assert.equal(bossCombinationAdmission(manager),'serpent-molt-present');
assert.equal(mysteryAdmission(manager,{id:'known'}),'new-encounter-present');
manager.serpentMolts.clear();assert.equal(bossCombinationAdmission(manager),null,'ordinary designed combinations remain eligible');
assert(serpentMoltEligible({profileId:'space_snake_cinder',sector:6,runMode:'ranked',standalone:true}));
for (const context of [{profileId:'space_snake_thorn'}, {sector:5}, {runMode:'daily_signal'}, {standalone:false}]) {
  assert(!serpentMoltEligible({profileId:'space_snake_cinder',sector:6,runMode:'ranked',standalone:true,...context}));
}
const molt = new SerpentMoltModel(160);
molt.update(.1, {age:4,health:110,living:8}); assert.equal(molt.phase, 'armoured');
molt.update(.1, {age:4,health:90,living:5}); assert.equal(molt.phase, 'fracturing');
molt.update(1, {age:5,health:80,living:5}); assert.equal(molt.phase, 'exposed');
assert.equal(molt.plates.length, SERPENT_MOLT.maxPlates);
assert(molt.plates.every(p=>p.health>0));
const plate = molt.plates[0], original = plate.health;
assert(molt.hitPlate(plate, 1, projectile)); assert.equal(molt.hitPlate(plate, 1, projectile), false);
assert.equal(plate.health, original-1);
molt.update(.1, {age:5,health:80,living:5,paused:true}); assert.equal(plate.age, 0);
for(let i=0;i<600;i++)molt.update(1/60,{age:6,health:80,living:5});
assert.equal(molt.plates.filter(p=>p.active).length,0,'cover has a hard lifetime');
const burst = new SerpentMoltModel(160); burst.update(.1,{age:4,health:0,living:0});
assert.equal(burst.phase,'ended'); assert.equal(burst.plates.length,0,'burst kill never creates a second fight');
const dying = new SerpentMoltModel(160); dying.update(.1,{age:4,health:90,living:5});
dying.update(.1,{age:4,health:0,living:0}); assert.equal(dying.plates.length,0);
console.log('[encounter-evolution] PASS rescue identity, bounded part damage, expiry/reset, eligibility, fracture, burst kill, plate deduplication and lifetime');
