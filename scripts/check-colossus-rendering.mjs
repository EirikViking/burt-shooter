import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.goto(process.env.CHECK_URL||'http://127.0.0.1:4407/?offlineLeaderboard=1');
 await page.waitForFunction(()=>document.body.dataset.menuReady==='1',null,{timeout:120000});
 const report=await page.evaluate(async()=>{
  const {ColossusRig,loadColossus}=await import('/src/effects/ColossusRig.js');
  const {COLOSSUS_FAMILIES}=await import('/src/config/BossReinvention.js');
  const {drawColossusAssault,preloadColossusVfx}=await import('/src/effects/ColossusAssaultVfx.js');
  await preloadColossusVfx();
  const {configureColossusAssault}=await import('/src/config/ColossusAssault.js');
  const {setReducedMotionEnabled}=await import('/src/config/AccessibilitySettings.js');
  const {Bullet}=await import('/src/entities/Bullet.js');
  const {PlayScene}=await import('/src/scenes/PlayScene.js');
  const rigs=[];
  for(const family of Object.keys(COLOSSUS_FAMILIES))rigs.push(new ColossusRig(await loadColossus(family),100,family,60));
  const states=[],bounds=[];const original=Math.random;let rngCalls=0;Math.random=()=>{rngCalls++;return .5;};
  try{
   for(const reduced of [false,true]){
    setReducedMotionEnabled(reduced);
    for(const rig of rigs){const samples=[];
     for(const time of [1,1.4]){rig.update({charge:.8,recoil:.2,phase:3,time,signature:true});samples.push([rig.rotation,...rig.halves.flatMap(m=>[m.x,m.y,m.rotation])]);}
     states.push({family:rig.archetype,reduced,finite:samples.flat().every(Number.isFinite),stable:JSON.stringify(samples[0])===JSON.stringify(samples[1])});
    }
   }
   setReducedMotionEnabled(false);
   for(const family of Object.keys(COLOSSUS_FAMILIES))for(const kind of ['ring','beam','cone','wall']){
    const points=[];let commands=0;const g=new Proxy({},{get:(_,key)=>(...args)=>{commands++;if(key==='poly')points.push(args[0]);return g;}});
    const h={kind,sourceX:0,sourceY:0,durationMs:500,armingMs:240,elapsedMs:610,color:0xffaa55,innerRadius:100,outerRadius:220,safeAngle:1.3,safeWedge:.6,angle:1.1,length:800,radius:13,spread:.12,columns:[-60,-30,30,60],startY:20,endY:700,width:24};
    configureColossusAssault(h,{profile:{archetype:family},phase:2});drawColossusAssault(g,h);
    let outside=0;
    for(const p of points)for(let j=0;j<p.length;j+=2){const x=p[j],y=p[j+1];if(!Number.isFinite(x+y)){outside++;continue;}
     if(kind==='ring'){const d=Math.hypot(x,y),a=Math.atan2(y,x),diff=Math.atan2(Math.sin(a-h.safeAngle),Math.cos(a-h.safeAngle));if(d<h.innerRadius-.01||d>h.outerRadius+.01||Math.abs(diff)<h.safeWedge-.0001)outside++;}
     else if(kind==='wall'){if(y<h.startY-.01||y>h.endY+.01||!h.columns.some(c=>Math.abs(x-c)<=h.width*.5+.01))outside++;}
     else {const along=x*Math.cos(h.angle)+y*Math.sin(h.angle),cross=-x*Math.sin(h.angle)+y*Math.cos(h.angle);if(along<-.01||along>h.length+.01||Math.abs(cross)>Math.max(h.radius,along*Math.tan(h.spread*.41))+.01)outside++;}
    }
    bounds.push({family,kind,commands,outside});
   }
  }finally{Math.random=original;setReducedMotionEnabled(false);rigs.forEach(r=>r.destroy({children:true}));}
  const projectile=new Bullet(200,200,0,1,1,0xffcc88,false);projectile.colossusLaunchRemainingMs=190;projectile.sprite.visible=false;
  const scene={getCollisionRadius:e=>e.radius},target={x:200,y:200,radius:10};
  const pendingCollision=PlayScene.prototype.checkCollision.call(scene,projectile,target);
  projectile.update(0);const paused={x:projectile.x,y:projectile.y,delay:projectile.colossusLaunchRemainingMs,visible:projectile.sprite.visible};
  projectile.update(5);const pending={x:projectile.x,y:projectile.y,visible:projectile.sprite.visible};
  projectile.update(10);const released={moved:projectile.y>200,visible:projectile.sprite.visible,delay:projectile.colossusLaunchRemainingMs};
  projectile.sprite.destroy({children:true});
  return {states,bounds,rngCalls,pendingCollision,paused,pending,released};
 });
 assert.equal(report.rngCalls,0);assert.equal(report.pendingCollision,false);
 assert.deepEqual(report.paused,{x:200,y:200,delay:190,visible:false});assert.deepEqual(report.pending,{x:200,y:200,visible:false});
 assert.deepEqual(report.released,{moved:true,visible:true,delay:0});
 for(const s of report.states){assert.equal(s.finite,true);if(s.reduced)assert.equal(s.stable,true);}
 for(const b of report.bounds){assert.equal(b.outside,0,`${b.family}/${b.kind}: geometry confined`);assert.ok(b.commands<350,`${b.family}/${b.kind}: bounded drawing`);}
 mkdirSync('test-results/colossus-rendering',{recursive:true});writeFileSync('test-results/colossus-rendering/report.json',JSON.stringify({ok:true,...report},null,2));
 console.log('PASS ten textured hulls, Reduced Motion, 40 bounded fields, zero visual RNG, pending projectile collision and pause/release');
}finally{await browser.close();}
