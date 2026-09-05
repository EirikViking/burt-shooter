import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out='test-results/astra-detonation-integrity';mkdirSync(out,{recursive:true});
const transformed=await (await fetch('http://127.0.0.1:4399/src/effects/ParticleManager.js')).text();
const pixiUrl=transformed.match(/from\s+["']([^"']*pixi__js[^"']*)/)[1];
const old=execFileSync('git',['show','682264e:src/effects/ParticleManager.js'],{encoding:'utf8'}).replaceAll("'../","'/src/").replaceAll("'./","'/src/effects/").replace("'pixi.js'",JSON.stringify(pixiUrl));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const errors=[],warnings=[];
try{
 const page=await browser.newPage();await page.route('**/*',r=>r.request().url().endsWith('/astra-old-particles.js')?r.fulfill({contentType:'text/javascript',body:old}):/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.request().url())||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))warnings.push(m.text());});
 await page.goto('http://127.0.0.1:4399/?offlineLeaderboard=1');
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.backdrop?.texture,null,{timeout:120000});
 const results=await page.evaluate(async()=>{
  const {ParticleManager:Old}=await import('/astra-old-particles.js'),{ParticleManager:New}=await import('/src/effects/ParticleManager.js');
  const {AstraDetonation,loadDetonationFrames}=await import('/src/effects/AstraDetonation.js');
  const {setReducedMotionEnabled,setFlashIntensityScale}=await import('/src/config/AccessibilitySettings.js');
  await loadDetonationFrames();const g=window.__game;g.app.ticker.stop();const Container=g.scenes.menu.container.constructor;
  const snapshot=m=>({particles:m.particles.map(p=>({x:p.x,y:p.y,vx:p.vx,vy:p.vy,age:p.age,lifetime:p.lifetime,size:p.size,color:p.color,rotationSpeed:p.rotationSpeed,active:p.active})),pressure:m.pressureSpawnCounter,blooms:m.energyBlooms.map(b=>({age:b.age,lifetime:b.lifetime,baseScale:b.baseScale})),pool:m.pool.length,variants:m.energyBloomVariantCounts});
  const rng=Math.random;
  function run(Type){let seed=123456,calls=0;Math.random=()=>{calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};try{const m=new Type(new Container());for(let i=0;i<30;i++){m.createExplosion(200+i,250,0xffaa00,.4+i*.1);if(i%7===0)m.createLayeredBossExplosion(400,250,0xffaa00,0xffffff,1.05);m.update(1);}const state=snapshot(m);m.update(120);return {calls,seed,state,retired:m.particles.length};}finally{Math.random=rng;}}
  const before=run(Old),after=run(New);
  const d=new AstraDetonation(new Container());let calls=0;Math.random=()=>{calls++;throw Error('Detonation consumed gameplay RNG');};
  let peak=0,duplicate=0,reduced=false,cleared=false;
  try{d.emit(200,200,1,true);d.emit(201,201,1,true);duplicate=d.active.length;for(let i=0;i<100;i++){d.emit(400,400,1);d.update(.1);peak=Math.max(peak,d.active.length+d.pool.length);}setReducedMotionEnabled(true);d.clear();d.emit(300,300,1,true);reduced=d.active[0].reduced&&d.active[0].display.front.context.instructions.length===0;d.update(100);cleared=d.active.length===0;d.clear();}finally{Math.random=rng;setReducedMotionEnabled(false);}
  return {before,after,calls,peak,duplicate,reduced,cleared};
 });
 writeFileSync(`${out}/report.json`,JSON.stringify({results,errors,warnings},null,2));
 assert.deepEqual(results.after,results.before,'Original RNG stream, particle state, pressure allocator and retirement must match the previous committed version');
 assert.equal(results.calls,0);assert.equal(results.duplicate,1);assert.ok(results.peak<=18);assert.ok(results.reduced&&results.cleared);assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);
 writeFileSync(`${out}/report.json`,JSON.stringify({ok:true,results,errors,warnings},null,2));console.log('PASS: exact legacy RNG and allocator parity, 18-effect bound, boss dedupe, reduced motion and retirement');
}finally{await browser.close();}
