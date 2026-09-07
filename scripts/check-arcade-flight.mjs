import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {waveFlightPlan,sampleWaveFlight,sampleBossFlight,arcadeEntryDuration,arcadeBriefingDuration,ENTRY_ROUTES,BOSS_FLIGHTS} from '../src/config/ArcadeFlight.js';
const original=Math.random;let rng=0;Math.random=()=>{rng++;return .5;};
let entries=0,bossSamples=0;const distinct=new Set();
try {
 for(const width of [800,1280,1920])for(const route of ENTRY_ROUTES)for(const side of [-1,1]) {
   const height=width*9/16,curve={p0:{x:width*.2,y:-100},p1:{x:width*.5,y:300},p2:{x:width*.62,y:height*.25},flight:{route,side,wing:side,width,height,strength:1}};
   assert.deepEqual(sampleWaveFlight(curve,0),curve.p0);assert.deepEqual(sampleWaveFlight(curve,1),curve.p2);
   const points=[];
   for(let i=1;i<200;i++){const p=sampleWaveFlight(curve,i/200);assert.ok(p.x>=24&&p.x<=width-24);assert.ok(p.y<=height*.46+.001);assert.ok(Number.isFinite(p.x+p.y));points.push(p);}
   distinct.add(JSON.stringify(points));entries++;
 }
 assert.equal(distinct.size,entries);
 for(const config of [{isChallenge:true},{isMayhemReinforcement:true},{isBossMayhemReinforcement:true},{highSectorAuthoredEncounter:true}])assert.equal(waveFlightPlan(config,10,2,1,1280,720),null);
 const tempos=new Set();
 for(let level=1;level<=100;level++)for(let wave=0;wave<6;wave++){
   const p=waveFlightPlan({},level,wave,0,1280,720),duration=arcadeEntryDuration(1000,p);tempos.add(duration);
   assert.ok(duration>=2000&&duration<=2550);
   assert.equal(arcadeEntryDuration(4000,p),4000);
   assert.equal(waveFlightPlan({},level,wave,11,1920,1080).durationMs,duration,'Formation and resolution share tempo');
   assert.deepEqual(waveFlightPlan({},level,wave,0,1280,720),p,'Repeatable selection');
 }
 assert.ok(tempos.size>=6,'Several distinct entrance speeds');
 assert.equal(waveFlightPlan({},1,0,0,1280,720).durationMs,2200);
 assert.equal(arcadeEntryDuration(1000,null),1000);
 assert.equal(arcadeBriefingDuration(740,260,{},1),380);
 assert.equal(arcadeBriefingDuration(740,260,{},0),740);
 for(const config of [{isChallenge:true},{isMayhemReinforcement:true},{highSectorAuthoredEncounter:true}])assert.equal(arcadeBriefingDuration(740,260,config,1),740);
 const shapes=new Set();
 for(const family of BOSS_FLIGHTS)for(const phase of [1,2,3]) {
   const path=[];let surprises=0;
   for(let i=0;i<3600;i++){
     const p=sampleBossFlight({family,time:i/60,phase,level:8,width:1280,height:720,anchorX:640,laneY:200});
     assert.ok(p.x>=1280*.12&&p.x<=1280*.88);assert.ok(p.y>=720*.16&&p.y<=720*.40);
     if(p.surprise)surprises++;path.push([p.x,p.y]);bossSamples++;
   }
   assert.equal(surprises>0,phase>1);shapes.add(JSON.stringify(path));
 }
 assert.ok(shapes.size>=20);assert.equal(rng,0);
} finally {Math.random=original;}
const report={ok:true,entries,bossSamples,zeroGameplayRng:rng===0,protectedSpecialEntries:true,ordinaryEntryRangeMs:[2000,2550],ordinaryFollowupBriefingMs:380};
mkdirSync('test-results/flight-revision',{recursive:true});writeFileSync('test-results/flight-revision/numeric.json',JSON.stringify(report,null,2));console.log(report);
