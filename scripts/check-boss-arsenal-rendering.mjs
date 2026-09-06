import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
const out='test-results/boss-arsenal-rendering';mkdirSync(out,{recursive:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4399/?offlineLeaderboard=1');
 const report=await page.evaluate(async()=>{
  const {BossArsenalRig}=await import('/src/effects/BossArsenalRig.js');
  const {drawArsenalField}=await import('/src/effects/BossArsenalFields.js');
  const {BOSS_ARSENALS}=await import('/src/config/BossArsenal.js');
  const {setReducedMotionEnabled}=await import('/src/config/AccessibilitySettings.js');
  const rigs=Object.keys(BOSS_ARSENALS).map(a=>new BossArsenalRig(100,a,0xffb34f));
  // Initialize all shared textures before observing the render-only RNG contract.
  rigs.forEach(r=>r.update({charge:.8}));
  const random=Math.random;let rngCalls=0;Math.random=()=>{rngCalls++;return .5;};
  const states=[],bounds=[];
  try{
   for(const reduced of [false,true]){
    setReducedMotionEnabled(reduced);
    for(const rig of rigs){
     const samples=[];for(const time of [1,1.4]){rig.update({charge:.8,recoil:0,time,phase:3,signature:true,sequence:2});samples.push(rig.modules.map(m=>[m.x,m.y,m.rotation]));}
     states.push({archetype:rig.archetype,reduced,same:JSON.stringify(samples[0])===JSON.stringify(samples[1]),finite:samples.flat(2).every(Number.isFinite)});
    }
   }
   setReducedMotionEnabled(false);
   for(const archetype of Object.keys(BOSS_ARSENALS))for(const kind of ['ring','beam','cone','wall']){
    const points=[];let commands=0;const g=new Proxy({}, {get:(_,key)=>(...args)=>{commands++;if(key==='poly')points.push(args[0]);return g;}});
    const h={kind,arsenalArchetype:archetype,elapsedMs:350,armingMs:240,sourceX:0,sourceY:0,color:0xffaa55,innerRadius:100,outerRadius:220,safeAngle:1.3,safeWedge:.6,angle:1.1,length:800,radius:13,spread:.12,columns:[-60,-30,30,60],startY:20,endY:700,width:24};
    drawArsenalField(g,h,.65);
    let outside=0;
    for(const p of points)for(let j=0;j<p.length;j+=2){
     const x=p[j],y=p[j+1];if(!Number.isFinite(x+y)){outside++;continue;}
     if(kind==='ring'){
      const distance=Math.hypot(x,y),angle=Math.atan2(y,x),diff=Math.atan2(Math.sin(angle-h.safeAngle),Math.cos(angle-h.safeAngle));
      if(distance<h.innerRadius-.01||distance>h.outerRadius+.01||Math.abs(diff)<h.safeWedge-.0001)outside++;
     }else if(kind==='wall'){
      if(y<h.startY-.01||y>h.endY+.01||!h.columns.some(c=>Math.abs(x-c)<=h.width*.5+.01))outside++;
     }else{
      const along=x*Math.cos(h.angle)+y*Math.sin(h.angle),cross=-x*Math.sin(h.angle)+y*Math.cos(h.angle);
      const angular=Math.abs(Math.atan2(cross,along))<=h.spread*.41+.0001;
      if(along<-.01||along>h.length+.01||(!angular&&Math.abs(cross)>h.radius+.01))outside++;
     }
    }
    bounds.push({archetype,kind,commands,outside});
   }
  }finally{Math.random=random;setReducedMotionEnabled(false);rigs.forEach(r=>r.destroy({children:true}));}
  return {states,bounds,rngCalls};
 });
 assert.equal(report.rngCalls,0);for(const s of report.states){assert.equal(s.finite,true);if(s.reduced)assert.equal(s.same,true);}
 for(const b of report.bounds){assert.equal(b.outside,0,`${b.archetype}/${b.kind} energy stays in danger region`);assert.ok(b.commands<300,'bounded draw command count');}
 writeFileSync(`${out}/report.json`,JSON.stringify({ok:true,...report},null,2));console.log('PASS 10 rigs, finite transforms, Reduced Motion, 40 field bounds, zero visual RNG, bounded draw commands');
}finally{await browser.close();}
