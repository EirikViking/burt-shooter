import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='test-results/boss-drama-materials';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4399/?offlineLeaderboard=1');
 const result=await page.evaluate(async()=>{
  const {drawAstraWarningLane:lane,drawAstraWarningRing:ring,drawAstraWarningSector:sector}=await import('/src/effects/AstraWarningField.js');
  const {drawBossChargeCrown:crown,drawBossDischarge:release}=await import('/src/effects/AstraBossEnergy.js');
  const {drawAstraShatterBurst:shatter}=await import('/src/effects/AstraShatterBurst.js');
  const {setReducedMotionEnabled:reduced,setFlashIntensityScale:flash}=await import('/src/config/AccessibilitySettings.js');
  const {getReactorMaterials}=await import('/src/effects/AstraReactorRupture.js');getReactorMaterials();
  const record=()=>{const ops=[];const g=new Proxy({}, {get:(_,key)=>(...args)=>{ops.push([key,...args]);return g;}});return {g,ops};};
  const opts={x:100,y:80,angle:1.2,start:20,length:300,halfWidth:8,progress:.7};
  const initial=record();lane(initial.g,opts); // material preparation outside RNG observation
  const now=Date.now,random=Math.random;let randomCalls=0;Math.random=()=>{randomCalls++;return .5;};
  const tests=[];
  try{
   for(const reducedMotion of [false,true]){
    reduced(reducedMotion);flash(1);
    for(const shape of ['lane','sector','ring','crown','release','shatter']){
     const draw=(g)=>{
      if(shape==='lane')lane(g,opts);
      if(shape==='sector')sector(g,{x:0,y:0,angle:1.5,length:300,spread:.6,progress:.7});
      if(shape==='ring')ring(g,{inner:60,outer:130,safeAngle:1.5,safeWedge:.5,progress:.7});
      if(shape==='crown')crown(g,{radius:100,color:0xff6655,edge:0xffd166,progress:.7,family:'ring'});
      if(shape==='release')release(g,{radius:100,color:0xff6655,edge:0xffd166,progress:.7,angle:1.5});
      if(shape==='shatter')shatter(g,{radius:90,count:8,progress:.3});
     };
     Date.now=()=>1000;const a=record();draw(a.g);Date.now=()=>1250;const b=record();draw(b.g);
     const serialize=ops=>JSON.stringify(ops,(key,value)=>key==='texture'?'shared-material':value);
     tests.push({shape,reducedMotion,same:serialize(a.ops)===serialize(b.ops),ops:a.ops.length,circles:a.ops.filter(o=>o[0]==='circle').length});
    }
   }
   const bounds=[];
   for(const active of [false,true]){const r=record();lane(r.g,{...opts,active});bounds.push(r.ops.find(o=>o[0]==='poly')[1]);}
   reduced(false);flash(0);const zero=record();crown(zero.g,{radius:100,color:0xff6655,edge:0xffd166,progress:.7});
   return {tests,bounds,randomCalls,flashZeroTextures:zero.ops.filter(o=>o[0]==='fill'&&o[1].texture).every(o=>o[1].alpha===0)};
  }finally{Date.now=now;Math.random=random;reduced(false);flash(1);}
 });
 assert.equal(result.randomCalls,0);assert.deepEqual(result.bounds[0],result.bounds[1]);assert.equal(result.flashZeroTextures,true);
 for(const t of result.tests){if(t.reducedMotion)assert.ok(t.same,`${t.shape}: reduced motion stable`);else if(['lane','sector','ring','crown'].includes(t.shape))assert.equal(t.same,false,`${t.shape}: visible motion restored`);if(t.shape==='shatter')assert.equal(t.circles,0);assert.ok(t.ops<300,'bounded rendering work');}
 assert.deepEqual(errors,[]);writeFileSync(`${out}/report.json`,JSON.stringify({ok:true,...result},null,2));console.log('PASS animation, static Reduced Motion, exact lane boundaries, zero RNG, flash controls, no death circles, bounded drawing');
}finally{await browser.close();}
