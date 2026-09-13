import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MYSTERIES, planMysteryLevel } from '../src/config/Mysteries.js';
import { encounterPacing, enterPacingLevel, recordMysteryArrival, recoveringFromCombination,
  updateEncounterPacing, recordOrdinaryWaveClear, mysteryAdmission, bossCombinationAdmission,
  majorContacts, claimMajorTelegraph } from '../src/config/EncounterPacing.js';
const waves=[{type:'grunt',count:6},{type:'scout',count:8},{type:'BOSS'}];
const totals={20:[],30:[],40:[],50:[]}, gaps=[], first=[];
function run(seed, start=1, recovery=false, seconds=65) {
 const g={contentDirector:{seed},runStartSector:start,runElapsedSeconds:0,mysteriesSeen:[],mysteriesRecent:[]};
 const m={game:g,enemies:[],level:start,state:'WAVE_ACTIVE'};g.scenes={play:{enemyManager:m}};
 for(let sector=start;sector<=60;sector++){
  m.level=sector;
  const p=planMysteryLevel({sector,seed,waves,game:g,seen:g.mysteriesSeen,recent:g.mysteriesRecent});
  assert.deepEqual(p,planMysteryLevel({sector,seed,waves,game:g,seen:g.mysteriesSeen,recent:g.mysteriesRecent}));
  g.runElapsedSeconds+=seconds;
  if(p.selected){
   assert.ok(MYSTERIES.find(r=>r.id===p.id).unlockSector<=sector);
   if(!g.mysteriesSeen.includes(p.id))assert.equal(p.bossWave,false);
   recordMysteryArrival(g,sector,p.id);g.mysteriesSeen.push(p.id);g.mysteriesRecent.push(p.id);
  }
  if(recovery&&sector%9===0){
   m.enemies=[{kind:'boss',active:true},{kind:'space_snake',active:true}];updateEncounterPacing(m,1);
   m.enemies=[];updateEncounterPacing(m,1);
  }
  m.enemies=[{kind:'grunt',active:true}];for(let i=0;i<151;i++)updateEncounterPacing(m,6);
  m.enemies=[];recordOrdinaryWaveClear(m,waves[0]);
  if(!recovery&&start===1&&totals[sector])totals[sector].push(encounterPacing(g).arrivals.length);
 }
 return encounterPacing(g);
}
for(let seed=0;seed<2000;seed++){
 const s=run(seed);assert.ok(s.arrivals[0].sector>=11&&s.arrivals[0].sector<=14);
 first.push(s.arrivals[0].sector);
 for(let i=1;i<s.arrivals.length;i++){
  const gap=s.arrivals[i].eligibleLevel-s.arrivals[i-1].eligibleLevel;
  assert.ok(gap>=3&&gap<=6);gaps.push(gap);
 }
 assert.deepEqual(s,run(seed),'full run seeded determinism');
 if(seed<100){for(const start of [11,31,51]){const c=run(seed,start);assert.ok(c.arrivals[0].sector>=start&&c.arrivals[0].sector<=start+2);}}
}
const g={contentDirector:{seed:'deferrals'},mysteriesSeen:['glass_widow'],runElapsedSeconds:50},m={game:g,enemies:[],level:31,state:'WAVE_ACTIVE'};
g.scenes={play:{enemyManager:m}};enterPacingLevel(g,31,true);const s=encounterPacing(g);s.nextMystery=1;
const due=planMysteryLevel({sector:31,waves,game:g});assert.equal(due.selected,true);
enterPacingLevel(g,32,false);assert.equal(s.eligibleLevels,1);assert.equal(s.nextMystery,1,'exclusion never spends arrival');
enterPacingLevel(g,33,true);assert.equal(s.eligibleLevels,2);
const chain={};m.enemies=[{kind:'boss',active:true},{kind:'space_snake',chain,active:true},{kind:'space_snake',chain,active:true}];
assert.equal(majorContacts(m).total,2,'snake sections are one opponent');
assert.equal(mysteryAdmission(m,{id:'glass_widow'}),'multiple-major-enemies');
assert.equal(mysteryAdmission(m,{id:'glass_widow',direct:true}),null,'trusted tour bypass');
updateEncounterPacing(m,1);m.enemies=[];updateEncounterPacing(m,1);assert.ok(recoveringFromCombination(g));
enterPacingLevel(g,34,true);assert.ok(recoveringFromCombination(g),'next eligible level recovery');
enterPacingLevel(g,35,true);assert.ok(recoveringFromCombination(g),'level jump alone cannot clear recovery');
m.enemies=[{kind:'grunt',active:true}];for(let i=0;i<151;i++)updateEncounterPacing(m,6);
m.enemies=[];recordOrdinaryWaveClear(m,waves[0]);assert.equal(recoveringFromCombination(g),false);
m.enemies=[{kind:'boss',active:true}];assert.equal(mysteryAdmission(m,{id:'glass_widow'}),null);
assert.equal(mysteryAdmission(m,{id:'rail_cathedral'}),'first-contact-needs-ordinary-wave');
m.discoveryEncounter={plan:{},stage:'waiting'};assert.equal(mysteryAdmission(m,{id:'glass_widow'}),'boss-combination-reserved');
m.mysteryDirector={busy:true};assert.equal(bossCombinationAdmission(m),'mystery-present');assert.equal(bossCombinationAdmission(m,true),null);
const a={active:true},b={active:true};m.enemies=[];
assert.ok(claimMajorTelegraph(g,a));assert.equal(claimMajorTelegraph(g,b),false);g.runElapsedSeconds+=1.5;assert.ok(claimMajorTelegraph(g,b));
assert.deepEqual(JSON.parse(JSON.stringify(s)),s,'run state is serializable');
const recovered=run('recovery',1,true),summary=Object.fromEntries(Object.entries(totals).map(([level,counts])=>[level,{min:Math.min(...counts),max:Math.max(...counts),mean:counts.reduce((a,b)=>a+b,0)/counts.length}]));
for(const [level,lo,hi]of [[20,2,3],[30,4,5],[40,6,7],[50,8,10]])assert.ok(summary[level].mean>=lo&&summary[level].mean<=hi);
const timeScenarios=[35,65,110].map(seconds=>({secondsPerEligibleLevel:seconds,arrivals:run('time',1,true,seconds).arrivals}));
const out=process.env.CHECK_OUTPUT_DIR||'E:/Codex/builds/nova-swarm/encounter-pacing/qa';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(out+'/pacing-policy.json',JSON.stringify({seeds:2000,firstLevels:[...new Set(first)].sort(),eligibleGaps:[...new Set(gaps)].sort(),counts:summary,recoverySample:recovered.arrivals,timeScenarios},null,2));
console.log('PASS seeded spacing, exclusions, recovery, combined admission, continuation, telegraphs',JSON.stringify(summary));
