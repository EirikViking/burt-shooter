import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deformFauna} from '../src/effects/CosmicFaunaMotion.js';
import {COSMIC_FAUNA} from '../src/config/CosmicFaunaCatalog.js';
const authored=fs.readdirSync('docs').filter(name=>/^cosmic-fauna-production-batch\d+\.json$/.test(name)).flatMap(name=>JSON.parse(fs.readFileSync('docs/'+name)).definitions);
const definitions=[...new Map([...COSMIC_FAUNA,...authored].map(row=>[row.id,row])).values()];
const cols=28,rows=18,base=new Float32Array((cols+1)*(rows+1)*2),out=base.slice();
for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const i=(y*(cols+1)+x)*2;base[i]=x/cols;base[i+1]=y/rows;}
const area=(a,b,c)=>(out[b]-out[a])*(out[c+1]-out[a+1])-(out[b+1]-out[a+1])*(out[c]-out[a]);
const signatures=new Set();let smallestTriangle=Infinity,largestDisplacement=0;
for(const definition of definitions){
 const signature=[];
 for(let frame=0;frame<48;frame++){
  const time=frame/48*definition.period;deformFauna(base,out,definition,time);
  for(let i=0;i<base.length;i++){
   assert(Number.isFinite(out[i]),definition.id+' finite pose');
   const displacement=Math.abs(out[i]-base[i]);largestDisplacement=Math.max(largestDisplacement,displacement);
   assert(displacement<.16,definition.id+' bounded anatomical displacement');
  }
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const a=(y*(cols+1)+x)*2,b=a+2,c=a+(cols+1)*2,d=c+2;
   const local=Math.min(area(a,b,c),area(b,d,c));smallestTriangle=Math.min(smallestTriangle,local);
   assert(local>0,definition.id+' must not fold or invert its skin');
  }
  if(frame%12===0)signature.push(...out);
 }
 signatures.add(JSON.stringify(signature));
 deformFauna(base,out,definition,1e6,true);assert.deepEqual(out,base,definition.id+' Reduced Motion is undeformed');
}
assert.equal(signatures.size,definitions.length,'Each authored animal has a distinct full motion trace');
for(const [id,points]of [
 ['crown_nautilus',[.70,.50,.80,.65,.90,.25]],
 ['cinderback_turtle',[.48,.40,.65,.45,.60,.55]],
 ['cathedral_centipede',[.3,.42,.5,.42,.7,.42]],
 ['moon_urchin',[.28,.45,.34,.52]],
 ['iron_jelly',[.15,.22,.2,.35,.3,.30]],
 ['fossil_seadrake',[.2,.3,.5,.5,.55,.55]],
 ['opal_scallop',[.4,.2,.5,.85,.65,.28]],
 ['halo_stag',[.2,.2,.3,.3,.15,.4]],
 ['cryolith_isopod',[.4,.3,.6,.4,.7,.35]],
 ['crown_shrimp',[.3,.2,.32,.3,.55,.43]],
 ['coral_giant',[.5,.25,.4,.45,.6,.3]],
 ['onyx_hammerhead',[.18,.2,.22,.5,.3,.75]],
 ['dream_sailfish',[.1,.57,.2,.57]]
]){
 const definition=definitions.find(row=>row.id===id),fixed=new Float32Array(points),result=fixed.slice();
 for(let frame=0;frame<48;frame++){
  deformFauna(fixed,result,definition,frame/48*definition.period);
  assert.deepEqual(result,fixed,id+' rigid shell interior must not ripple');
 }
}
assert.throws(()=>deformFauna(base,out,{anatomy:'unimplemented',period:5,amplitude:.04},1),/anatomy/i,'Unimplemented motion must not silently use a ray');
console.log(JSON.stringify({passed:true,anatomies:definitions.length,smallestTriangle,largestDisplacement}));
