import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {COLOSSUS_FAMILIES} from '../src/config/BossReinvention.js';
import {configureColossusAssault,assaultWindows,isInsideColossusFront} from '../src/config/ColossusAssault.js';
const results=[];
const random=Math.random;Math.random=()=>{throw Error('Gameplay RNG consumed');};
try{
 for(const family of Object.keys(COLOSSUS_FAMILIES))for(const phase of [1,2,3]){
  const h={kind:'beam',sourceX:0,sourceY:0,angle:Math.PI/2,length:900,radius:13,spread:0,armingMs:240,durationMs:500};
  configureColossusAssault(h,{profile:{archetype:family},phase});
  h.elapsedMs=239;assert.equal(isInsideColossusFront(h,0,450),false);
  let maxError=0;
  for(let slot=0;slot<12;slot++)for(const x of [.01,.1,.25,.5,.75,.9,.99]){
   let exposure=0;const step=.5;
   for(let t=step/2;t<h.colossus.travelMs;t+=step){h.elapsedMs=h.armingMs+t;
    const windows=assaultWindows(h,1,slot);
    for(const [a,b]of windows){assert.ok(Number.isFinite(a)&&a>=0&&b<=1&&b>a);}
    if(windows.some(([a,b])=>x>=a&&x<=b))exposure+=step;
   }
   const error=Math.abs(exposure-h.colossus.legacyActiveMs);maxError=Math.max(maxError,error);
   assert.ok(error<=2,`${family} phase ${phase} slot ${slot} x ${x}: exposure ${exposure}`);
  }
  for(let t=0;t<980;t+=7){h.elapsedMs=t;assert.equal(isInsideColossusFront(h,100,450),false);}
  const ring={...h,kind:'ring',innerRadius:100,outerRadius:220,safeAngle:Math.PI/2,safeWedge:.55};
  for(let t=0;t<980;t+=7){ring.elapsedMs=t;assert.equal(isInsideColossusFront(ring,0,160),false);assert.equal(isInsideColossusFront(ring,300,0),false);}
  results.push({family,phase,maxExposureErrorMs:maxError,oldExposureMs:260});
 }
}finally{Math.random=random;}
mkdirSync('test-results/colossus-assault',{recursive:true});
writeFileSync('test-results/colossus-assault/report.json',JSON.stringify({ok:true,cases:results.length,results},null,2));
console.log(`PASS ${results.length} family/phase cases: original point exposure, safe corridor, no prearming damage, bounded geometry, no RNG`);
