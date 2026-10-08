import assert from 'node:assert/strict';
import { PlanetfallModel, PLANETFALL } from '../src/game/Planetfall.js';

const advance=(model,seconds)=>{for(let left=seconds;left>1e-8;left-=.01)model.update(Math.min(.01,left));};
const aim=(part,x=100)=>({part,x,y:150,angle:Math.PI/2});
const ready=()=>{const m=new PlanetfallModel(1000);advance(m,3.21);return m;};
let groups=0;
assert.throws(()=>new PlanetfallModel(NaN));assert.throws(()=>new PlanetfallModel(-1));
assert.equal(new PlanetfallModel(54).health,54);
{
 const m=new PlanetfallModel(1000);assert.equal(m.parts.length,5);assert.equal(m.health,1000);
 assert.deepEqual(m.parts.map(p=>p.health),[80,80,80,80,680]);assert.equal(m.irisOpen,false);
 assert.equal(m.hit('core',100),0);assert.equal(m.beginWarning([aim('anchor_0')]),false);
 advance(m,3.19);assert.equal(m.irisOpen,false);advance(m,.02);assert.equal(m.irisOpen,true);groups++;
}
{
 const m=ready();assert.equal(m.hit('core',340),340);assert.equal(m.stage,'rupture');
 assert.equal(m.hit('core',1000),340);assert.equal(m.defeated,true);assert.equal(m.stage,'collapse');
 assert(m.parts.slice(0,4).every(p=>p.health===80));assert.equal(m.health,0);
 assert.equal(m.hit('core',1000),0);assert.equal(m.hit('anchor_0',1000),0);assert.deepEqual(m.consumeVolley(),[]);groups++;
}
{
 const m=ready();advance(m,3.3);assert.equal(m.irisOpen,false);assert.equal(m.hit('core',1000),0);
 for(let i=0;i<4;i++)assert.equal(m.hit('anchor_'+i,1000),80);
 assert.equal(m.irisOpen,true);advance(m,8);assert.equal(m.irisOpen,true);assert.equal(m.hit('core',1),1);groups++;
}
{
 const m=ready(),aims=[0,1,2,3].map(i=>aim('anchor_'+i,100+i*80));aims.push(aim('core',400));
 assert.equal(m.beginWarning(aims),true);aims[0].angle=0;
 assert.equal(m.beginWarning(aims),false);advance(m,1.39);assert.deepEqual(m.consumeVolley(),[]);
 advance(m,.011);const volley=m.consumeVolley();assert.equal(volley.reduce((n,x)=>n+x.count,0),6);
 assert.equal(volley[0].angle,Math.PI/2);assert.deepEqual(m.consumeVolley(),[]);assert.equal(m.beginWarning(aims),false);groups++;
}
{
 const m=ready();assert(m.beginWarning([aim('anchor_0'),aim('core')]));advance(m,.8);m.hit('anchor_0',1000);advance(m,.7);
 const volley=m.consumeVolley();assert.deepEqual(volley.map(v=>v.part),['core']);assert.equal(volley[0].count,2);groups++;
}
{
 const m=ready();m.beginWarning([aim('core')]);advance(m,1.39);const age=m.age;
 m.update(.1,{paused:true});assert.equal(m.age,age);assert.equal(m.warning,null);assert.deepEqual(m.consumeVolley(),[]);
 advance(m,.26);assert(m.beginWarning([aim('core')]));advance(m,1.39);assert.deepEqual(m.consumeVolley(),[]);
 advance(m,.02);assert.equal(m.consumeVolley().length,1);groups++;
}
{
 const m=ready(),before=m.health;for(const damage of [NaN,Infinity,-1,0])assert.equal(m.hit('anchor_0',damage),0);
 assert.equal(m.hit('missing',10),0);assert.equal(m.health,before);const age=m.age;
 m.update(NaN);m.update(-1);assert.equal(m.age,age);m.update(1000);assert(m.age-age<=.10000001);
 assert.equal(m.beginWarning([{...aim('core'),x:Infinity}]),false);
 assert(m.beginWarning([aim('core'),aim('core')]));advance(m,1.5);assert.equal(m.consumeVolley().length,1);groups++;
}
{
 const random=Math.random;Math.random=()=>{throw Error('Gameplay RNG used');};
 try{const a=ready(),b=ready();for(let i=0;i<2500;i++){a.update(1/60);b.update(1/60);}
  assert.equal(a.age,b.age);assert.equal(a.irisOpen,b.irisOpen);assert.deepEqual(a.parts,b.parts);
 }finally{Math.random=random;}assert.equal(PLANETFALL.warningSeconds,1.4);groups++;
}
console.log(`[planetfall] PASS ${groups} model groups: budget, optional anchors, iris, rupture, warnings, interruption, finite input and deterministic replay`);
