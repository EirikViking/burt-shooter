import assert from 'node:assert/strict';
import * as pacing from '../src/config/EncounterPacing.js';

assert.equal(typeof pacing.planetfallEligible,'function','Planetfall must have a normal deterministic admission rule');
const fixture=(seed='planetfall-test',level=18)=>({level,enemies:[],game:{level,contentDirector:{seed},runMode:'ranked',runElapsedSeconds:300,scenes:{play:{}}}});
for(let seed=0;seed<1000;seed++){
 const manager=fixture(String(seed)),game=manager.game;
 const target=14+Math.floor(pacing.pacingRoll(String(seed),0,'planetfall-introduction')*5);
 for(let level=1;level<target;level++){manager.level=level;assert.equal(pacing.planetfallEligible(manager),false);}
 manager.level=target;assert(pacing.planetfallEligible(manager));
 assert(pacing.planetfallEligible(manager),'eligibility queries cannot consume a deferred slot');
 manager.environment={active:true};assert.equal(pacing.planetfallEligible(manager),false);manager.environment=null;
 manager.level=target+1;assert(pacing.planetfallEligible(manager));
 pacing.encounterPacing(game).planetfallSector=manager.level;manager.level=400;assert.equal(pacing.planetfallEligible(manager),false,'one per run');
}
const blockers=[
 m=>{m.level=51;},m=>{m.game.runMode='daily_signal';},m=>{m.game.runMode='boss_rush';},
 m=>{m.game.encounterTest={};},m=>{m.game.encounterEvolutionTest={id:'breach'};},m=>{m.game.lateGameExperiment={active:true};},
 m=>{m.highSectorEscalationState={bossSupportEvent:{}};},m=>{m.mysteryDirector={plan:{bossWave:true}};},
 m=>{m.mysteryDirector={busy:true};},m=>{m.environment={active:true};},m=>{m.serpentMolts=new Set([{}]);},
 m=>{m.game.scenes.play.firstLightDirector={model:{encounter:{}}};},m=>{m.boss={active:true,health:10};},
 m=>{m.enemies=[{kind:'space_snake',active:true}];}
];
for(const block of blockers){const m=fixture();block(m);assert.equal(pacing.planetfallEligible(m),false,block.toString());}
const m=fixture(),g=m.game;
g.encounterEvolutionTest={id:'natural'};assert(pacing.planetfallEligible(m),'progression-free natural fixture still uses real scheduling');g.encounterEvolutionTest=null;
g.lastDreadnoughtSector=13;assert.equal(pacing.planetfallEligible(m),false);m.level=19;assert(pacing.planetfallEligible(m));
pacing.encounterPacing(g).planetfallSector=19;g.lastDreadnoughtSector=null;m.level=24;assert.equal(pacing.dreadnoughtEligible(m),false);
m.level=25;assert(pacing.dreadnoughtEligible(m));g.lastDreadnoughtSector=20;m.level=33;assert.equal(pacing.dreadnoughtEligible(m),false);m.level=34;assert(pacing.dreadnoughtEligible(m));
pacing.encounterPacing(g).planetfallSector=null;g.lastDreadnoughtSector=null;m.level=20;
pacing.recordEncounterFamily(g,'linked_battery',19);g.runElapsedSeconds=320;assert.equal(pacing.planetfallEligible(m),false);
m.level=21;assert(pacing.planetfallEligible(m));g.runElapsedSeconds=305;assert.equal(pacing.planetfallEligible(m),false);
g.runElapsedSeconds=330;m.boss={active:true,health:10,isPlanetfall:true};pacing.updateEncounterPacing(m,1);
assert(pacing.encounterPacing(g).wasMajor);m.boss=null;pacing.updateEncounterPacing(m,1);
assert.equal(pacing.planetfallEligible(m),false,'major-combination recovery is shared');
const state=pacing.encounterPacing(g);state.eligibleLevels=state.recoveryThrough+1;state.ordinarySeconds=15;state.ordinaryWaves=1;
assert(pacing.planetfallEligible(m));
state.planetfallSector=21;assert.equal(pacing.planetfallEligible(m),false);g.encounterPacing=null;assert(pacing.planetfallEligible(m),'existing new-run pacing reset clears admission');
const saved=Math.random;try{Math.random=()=>{throw Error('admission must not consume RNG');};assert(pacing.planetfallEligible(m));}finally{Math.random=saved;}
console.log('[planetfall-admission] PASS 1000 seeded targets, deferred/once-only admission, exclusions, reciprocal Breach spacing and major recovery');
