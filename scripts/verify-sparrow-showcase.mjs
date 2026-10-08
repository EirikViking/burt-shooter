import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ShipData} from '../src/config/ShipData.js';
const videoMode=process.argv.includes('--video'),root='docs/sparrow-showcase',out=`${root}/evidence/rotation`;
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1920,height:1080},...(videoMode?{recordVideo:{dir:`${root}/video-temp`,size:{width:1920,height:1080}}}:{})});
const page=await context.newPage(),errors=[],warnings=[],requests=[],rows=[],cycles=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))warnings.push(m.text());});page.on('request',r=>{if(r.url().endsWith('.glb'))requests.push(r.url());});
const wait=()=>page.waitForFunction(()=>{const g=window.__game;return(g?.currentSceneName==='shipSelect'?g.scenes.shipSelect.rotatingCard?.turntable:g?.scenes.menu.astraMenuShip)?.ready;},null,{timeout:90000});
try{
 const start=Date.now();
 await page.goto('http://127.0.0.1:5201/?skipIntro=1&offlineLeaderboard=1&nova-devtools-hash=f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c',{waitUntil:'domcontentloaded',timeout:90000});
 await wait();const coldReadyMs=Date.now()-start;
 await page.evaluate(()=>{window.__qaSolidClass=window.__game.scenes.menu.astraMenuShip.solid.constructor;window.__qaTurntable=()=>{const g=window.__game;return g.currentSceneName==='shipSelect'?g.scenes.shipSelect.rotatingCard.turntable:g.scenes.menu.astraMenuShip;};});
 for(const scene of ['menu','hangar']){
  if(scene==='hangar'){await page.evaluate(()=>window.__game.showShipSelect());await wait();}
  // Let the normal scene input guard and carousel entrance finish before input.
  await page.waitForTimeout(1500);
  const point=await page.evaluate(()=>{const p=window.__qaTurntable().getGlobalPosition();return{x:p.x,y:p.y};});
  await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+100,point.y+35,{steps:12});await page.mouse.up();await page.waitForTimeout(1500);
  const result=await page.evaluate(async()=>{
   const t=window.__qaTurntable(),frames=[],costs=[],drag={yaw:t.targetAngle,pitch:t.targetPitch};
   const original=t.solid.render.bind(t.solid);t.solid.render=(...a)=>{const n=performance.now(),v=original(...a);costs.push(performance.now()-n);return v;};
   const start=performance.now();let previous=start;
   await new Promise(resolve=>{function frame(now){frames.push(now-previous);previous=now;const k=(now-start)/15000;t.targetAngle=k*Math.PI*2;t.targetPitch=0;t.manualUntil=1e8;if(k<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
   t.solid.render=original;
   function stats(a){a=a.slice(30).sort((a,b)=>a-b);return{samples:a.length,mean:a.reduce((s,x)=>s+x,0)/a.length,p95:a[Math.floor(a.length*.95)],max:a.at(-1)};}
   return{drag,canvasPixels:t.solid.size,frameMs:stats(frames),renderAndCopyMs:stats(costs),resources:window.__qaSolidClass.diagnostics};
  });
  assert.ok(Math.abs(result.drag.yaw)>.1,'Actual pointer drag');assert.equal(result.resources.resident,1);rows.push({scene,...result});
  if(videoMode)for(const[pose,yaw,pitch]of[['front',0,0],['side',1.05,.708],['rear',Math.PI,0],['underside',0,1.4]]){
   await page.evaluate(({yaw,pitch})=>{const t=window.__qaTurntable();t.targetAngle=yaw;t.targetPitch=pitch;},{yaw,pitch});await page.waitForTimeout(1300);await page.screenshot({path:`${out}/${scene}-${pose}.png`});
  }
 }
 await page.evaluate(async ids=>{const m=await import('/src/progression/HangarProgressState.js');m.updateHangarProgress({unlockedShipIds:ids});},ShipData.filter(s=>s.textureIndex<2).map(s=>s.id));
 for(let i=0;i<6;i++)for(const key of ['nova-player-ship-02.png','nova-player-ship-01.png']){
  const start=Date.now();await page.evaluate(async key=>{localStorage.setItem('burt.selectedShip.v1',key);await window.__game.showShipSelect();window.__game.showMenu();},key);
  await page.waitForFunction(index=>window.__game.scenes.menu.astraMenuShip?.ready&&window.__game.scenes.menu.astraMenuShip.index===index,key.includes('02')?1:0,{timeout:90000});await page.waitForTimeout(400);
  const resources=await page.evaluate(()=>window.__qaSolidClass.diagnostics);assert.equal(resources.resident,1);
  if(key.includes('01')){assert.equal(resources.geometries,rows[0].resources.geometries);assert.equal(resources.textures,rows[0].resources.textures);}
  cycles.push({key,readyMs:Date.now()-start,resources});
  if(videoMode&&i===0&&key.includes('02'))await page.screenshot({path:`${out}/unchanged-ship-02.png`});
 }
 await page.evaluate(()=>window.__game.startGame('nova-player-ship-01.png'));
 await page.waitForFunction(()=>window.__game.currentSceneName==='play'&&window.__game.scenes.play.enemyManager?.enemies?.filter(e=>!e.dead).length>=3,null,{timeout:60000});
 const combat=await page.evaluate(()=>{const p=window.__game.scenes.play.player;return{key:p.selectedShipSpriteKey,resources:window.__qaSolidClass.diagnostics};});assert.equal(combat.key,'nova-player-ship-01.png');assert.equal(combat.resources.resident,0);
 if(videoMode){
  await page.waitForFunction(()=>{const p=window.__game.scenes.play.player;return !p.invulnerable&&p.sprite.alpha>.95;},null,{timeout:30000});
  await page.keyboard.down('Space');await page.waitForTimeout(650);await page.keyboard.up('Space');
  await page.screenshot({path:`${out}/unchanged-gameplay.png`});
 }
 await page.evaluate(()=>window.__game.showMenu());await wait();
 const gpu=await page.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info'),r=e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);gl.getExtension('WEBGL_lose_context')?.loseContext();return r;});
 const imports=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.endsWith('.glb')).map(e=>({url:e.name,durationMs:e.duration,bytes:e.encodedBodySize})));
 const report={videoMode,measurementNote:videoMode?'Capture run; timing not used for performance claims':'Isolated 1080p Chrome, no video recording, Blender or build running; CPU render/copy wall time is not GPU time',gpu,coldReadyMs,rows,cycles,combat,imports,requests,errors,warnings};
 await fs.writeFile(`${root}/${videoMode?'rotation-verification':'performance'}.json`,JSON.stringify(report,null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);assert.ok(requests.every(u=>u.endsWith('/model.glb')||u.endsWith('/02.glb')),'No fleet preload');
 if(videoMode){const video=page.video();await context.close();await video.saveAs(`${root}/runtime-rotation.webm`);}
 console.log(JSON.stringify({videoMode,gpu,coldReadyMs,rows,cycles:cycles.length,errors,warnings},null,2));
}finally{await browser.close();}
