import {chromium} from 'playwright';
import {ShipData} from '../src/config/ShipData.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='docs/fleet-art-v2/evidence/rotation';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:'output/playwright/fleet-art-v2',size:{width:1920,height:1080}}});
const page=await context.newPage(),errors=[],warnings=[],requests=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))warnings.push(m.text());});page.on('request',r=>{if(r.url().endsWith('.glb'))requests.push(r.url());});
try{
 await page.goto('http://127.0.0.1:5199/?skipIntro=1&offlineLeaderboard=1&nova-devtools-hash=f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c');
 await page.waitForFunction(()=>window.__game?.scenes.menu.astraMenuShip?.ready,null,{timeout:90000});
 await page.evaluate(async ids=>{const m=await import('/src/progression/HangarProgressState.js');m.updateHangarProgress({unlockedShipIds:ids});window.__qaSolidClass=window.__game.scenes.menu.astraMenuShip.solid.constructor;performance.setResourceTimingBufferSize(10000);},ShipData.map(s=>s.id));
 for(const ship of [...ShipData].sort((a,b)=>a.textureIndex-b.textureIndex)){
  const id=String(ship.textureIndex+1).padStart(2,'0');
  await page.evaluate(async key=>{localStorage.setItem('burt.selectedShip.v1',key);await window.__game.showShipSelect();window.__game.showMenu();},ship.spriteKey);
  await page.waitForFunction(i=>window.__game.scenes.menu.astraMenuShip?.ready&&window.__game.scenes.menu.astraMenuShip.index===i,ship.textureIndex,{timeout:60000});
  await page.mouse.move(1400,460);await page.mouse.down();await page.mouse.move(1500,495,{steps:12});await page.mouse.up();await page.waitForTimeout(250);
  const result=await page.evaluate(async()=>{
   const t=window.__game.scenes.menu.astraMenuShip,frames=[],costs=[];const drag={yaw:t.targetAngle,pitch:t.targetPitch};
   const original=t.solid.render.bind(t.solid);t.solid.render=(...a)=>{const now=performance.now(),v=original(...a);costs.push(performance.now()-now);return v;};
   const start=performance.now();let previous=start;
   await new Promise(resolve=>{function frame(now){frames.push(now-previous);previous=now;const k=(now-start)/6000;t.targetAngle=k*Math.PI*2;t.targetPitch=0;t.manualUntil=1e8;if(k<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
   t.solid.render=original;
   function summary(a){a=a.slice(5).sort((a,b)=>a-b);return{samples:a.length,mean:a.reduce((s,x)=>s+x,0)/a.length,p95:a[Math.floor(a.length*.95)],max:a.at(-1)};}
   return{drag,frameMs:summary(frames),renderAndCopyMs:summary(costs),resources:window.__qaSolidClass.diagnostics};
  });
  assert.ok(Math.abs(result.drag.yaw)>.1,`${id} real drag input`);assert.equal(result.resources.resident,1);
  for(const [pose,yaw,pitch] of [['front',0,0],['side',1.05,.708],['rear',Math.PI,0],['underside',0,1.4]]){
   await page.evaluate(({yaw,pitch})=>{const t=window.__game.scenes.menu.astraMenuShip;t.targetAngle=yaw;t.targetPitch=pitch;},{yaw,pitch});await page.waitForTimeout(500);await page.screenshot({path:`${out}/${id}-${pose}.png`});
  }
  rows.push({id,name:ship.name,...result});console.log('VERIFIED_ROTATION',id);
 }
 // Revisit the approved benchmark after the complete fleet traversal.
 await page.evaluate(async()=>{localStorage.setItem('burt.selectedShip.v1','nova-player-ship-01.png');await window.__game.showShipSelect();window.__game.showMenu();});
 await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready&&window.__game.scenes.menu.astraMenuShip.index===0,null,{timeout:60000});
 const finalResources=await page.evaluate(()=>window.__qaSolidClass.diagnostics);
 assert.equal(finalResources.resident,1);assert.equal(finalResources.textures,rows[0].resources.textures,'no fleet traversal texture leak');assert.equal(finalResources.geometries,rows[0].resources.geometries);
 const imports=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.endsWith('.glb')).map(e=>({url:e.name,durationMs:e.duration,transferBytes:e.transferSize})));
 const gpu=await page.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');const r=e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);gl.getExtension('WEBGL_lose_context')?.loseContext();return r;});
 await fs.writeFile('docs/fleet-art-v2/runtime-verification.json',JSON.stringify({gpu,rows,finalResources,imports,requests,errors,warnings},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);
 const video=page.video();await context.close();await video.saveAs('output/playwright/fleet-art-v2/fleet-rotation.webm');
}finally{await browser.close();}
