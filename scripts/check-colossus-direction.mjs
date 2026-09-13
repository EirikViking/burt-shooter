import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {BOSS_ROSTER} from '../src/config/BossRoster.js';
import * as current from '../src/config/ColossusAssault.js';
const oldSource=execFileSync('git',['show','6ce292f:src/config/ColossusAssault.js'],{encoding:'utf8'}).replace("'./BossReinvention.js'",JSON.stringify(pathToFileURL(path.resolve('src/config/BossReinvention.js')).href));
const previous=await import('data:text/javascript;base64,'+Buffer.from(oldSource).toString('base64'));
function audit(api){
 const failures=[],cases=[];
 for(const profile of BOSS_ROSTER)for(const phase of [1,2,3])for(let slot=0;slot<12;slot++){
  const h={armingMs:240,durationMs:500};api.configureColossusAssault(h,{profile,phase});
  const probes=[.01,.1,.25,.5,.75,.9,.99],arrival=probes.map(()=>null);
  for(let ms=0;ms<h.colossus.travelMs;ms++){
   h.elapsedMs=h.armingMs+ms;
   const windows=api.assaultWindows(h,1,slot);
   probes.forEach((x,i)=>{if(arrival[i]===null&&windows.some(([a,b])=>a<=x&&x<=b))arrival[i]=ms;});
  }
  const outward=arrival.every((t,i)=>t!==null&&(i===0||t>=arrival[i-1]));
  const row={boss:profile.name,family:profile.archetype,phase,slot,arrivalMs:arrival};
  if(!outward)failures.push(row);cases.push(row);
 }
 return {cases:cases.length,failures};
}
const random=Math.random;Math.random=()=>{throw Error('Direction checks consumed gameplay RNG');};
let before,after;try{before=audit(previous);after=audit(current);}finally{Math.random=random;}
assert.ok(before.failures.length>0,'Regression fixture must reproduce inward attacks');
assert.equal(after.failures.length,0,JSON.stringify(after.failures.slice(0,3)));
assert.equal(after.cases,BOSS_ROSTER.length*3*12);
const report={ok:true,bosses:BOSS_ROSTER.length,cases:after.cases,previousInwardCases:before.failures.length,currentInwardCases:0,affectedFamilies:[...new Set(before.failures.map(x=>x.family))],zeroRng:true};
mkdirSync('test-results/direction-pace',{recursive:true});writeFileSync('test-results/direction-pace/direction.json',JSON.stringify(report,null,2));console.log(report);
