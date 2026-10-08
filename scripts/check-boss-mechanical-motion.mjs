import assert from 'node:assert/strict';
import {sampleBossMechanicalMotion} from '../src/effects/BossMechanicalMotion.js';
import {COLOSSUS_FAMILIES} from '../src/config/BossReinvention.js';

const traces=new Set(),out={x:0,y:0,rotation:0};
const original=Math.random;let draws=0,maxOffset=0,maxRotation=0,maxStep=0;
Math.random=()=>{draws++;return .5;};
try{
  for(const family of Object.keys(COLOSSUS_FAMILIES)){
    const trace=[];
    for(const phase of [1,2,3])for(const index of [0,1,5,7]){
      let previous;
      for(let frame=0;frame<=720;frame++){
        const time=frame/60;
        assert.equal(sampleBossMechanicalMotion(out,family,index,time,phase,0,false),out,'reuse caller storage');
        const values=[out.x,out.y,out.rotation];assert(values.every(Number.isFinite));
        maxOffset=Math.max(maxOffset,Math.abs(out.x),Math.abs(out.y));
        maxRotation=Math.max(maxRotation,Math.abs(out.rotation));
        if(previous)maxStep=Math.max(maxStep,...values.map((v,i)=>Math.abs(v-previous[i])));
        if(phase===1&&index===0&&frame%60===0)trace.push(...values);
        const snapshot={...out};sampleBossMechanicalMotion(out,family,index,time,phase,0,false);assert.deepEqual(out,snapshot);
        previous=values;
      }
    }
    assert(trace.some(v=>Math.abs(v)>.003),`${family} has visible motion`);
    traces.add(JSON.stringify(trace));
    for(const time of [0,.7,2,17,9000])for(const charge of [0,.2,.55,.8,1]){
      sampleBossMechanicalMotion(out,family,1,time,3,charge,true);
      assert.deepEqual(out,{x:0,y:0,rotation:0},`${family} Reduced Motion`);
      if(charge>=.55){sampleBossMechanicalMotion(out,family,1,time,3,charge,false);assert.deepEqual(out,{x:0,y:0,rotation:0},`${family} locked charge pose`);}
    }
  }
}finally{Math.random=original;}
assert.equal(traces.size,10);assert.equal(draws,0);assert(maxOffset<=.05);assert(maxRotation<=.05);
assert(maxStep<.004,'no mechanical teleport at cycle boundaries');
console.log(JSON.stringify({ok:true,families:traces.size,draws,maxOffset,maxRotation,maxStep}));
