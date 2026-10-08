import {chromium} from 'playwright';
import {ShipData} from '../src/config/ShipData.js';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const arg=process.argv.find(a=>/^\d+(,\d+)*$/.test(a)),ids=arg?arg.split(',').map(Number):Array.from({length:30},(_,i)=>i+1);
const capture=process.argv.includes('--capture'),videoMode=process.argv.includes('--video'),out='docs/fleet-showcase/evidence';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1920,height:1080},...(videoMode?{recordVideo:{dir:'docs/fleet-showcase/video-temp',size:{width:1920,height:1080}}}:{})});
const page=await context.newPage(),errors=[],warnings=[],requests=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))warnings.push(m.text());});page.on('request',r=>{if(r.url().endsWith('.glb'))requests.push(r.url());});
try{
 await page.goto('http://127.0.0.1:5201/?skipIntro=1&offlineLeaderboard=1&nova-devtools-hash=f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.__game?.scenes.menu.astraMenuShip?.ready,null,{timeout:90000});
 await page.evaluate(async ids=>{const m=await import('/src/progression/HangarProgressState.js');m.updateHangarProgress({unlockedShipIds:ids});window.__qaClass=window.__game.scenes.menu.astraMenuShip.solid.constructor;window.__qaTurntable=()=>{const g=window.__game;return g.currentSceneName==='shipSelect'?g.scenes.shipSelect.rotatingCard.turntable:g.scenes.menu.astraMenuShip;};},ShipData.map(s=>s.id));
 for(const n of ids){
  const ship=ShipData.find(s=>s.textureIndex===n-1),id=String(n).padStart(2,'0'),start=Date.now();
  await page.evaluate(async key=>{localStorage.setItem('burt.selectedShip.v1',key);await window.__game.showShipSelect();window.__game.showMenu();},ship.spriteKey);
  await page.waitForFunction(i=>window.__game.scenes.menu.astraMenuShip?.ready&&window.__game.scenes.menu.astraMenuShip.index===i,n-1,{timeout:90000});
  const readyMs=Date.now()-start;
  for(const scene of ['menu','hangar']){
   if(scene==='hangar'){
    await page.evaluate(async key=>{window.__game.shipSelectReturnSpriteKey=key;await window.__game.showShipSelect();const s=window.__game.scenes.shipSelect;s.dismissHangarUnlockPresentation?.('qa');s.navigateTo(s.ships.findIndex(ship=>ship.spriteKey===key));},ship.spriteKey);
    await page.waitForFunction(i=>{const t=window.__game.scenes.shipSelect.rotatingCard?.turntable;return t?.ready&&t.index===i;},n-1,{timeout:60000});
   }
   await page.waitForTimeout(700);
   const point=await page.evaluate(()=>{const t=window.__qaTurntable();t.targetAngle=0;t.targetPitch=0;t.manualUntil=1e8;const p=t.getGlobalPosition();return{x:p.x,y:p.y};});
   await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+100,point.y+25,{steps:8});await page.mouse.up();await page.waitForTimeout(400);
   const result=await page.evaluate(async({capture,videoMode})=>{
    const t=window.__qaTurntable(),drag={yaw:t.targetAngle,pitch:t.targetPitch},frames=[],costs=[];
    const render=t.solid.render.bind(t.solid);t.solid.render=(...args)=>{const start=performance.now(),v=render(...args);costs.push(performance.now()-start);return v;};
    const start=performance.now(),duration=videoMode?5500:capture?800:4000;let prev=start;
    await new Promise(resolve=>{function frame(now){frames.push(now-prev);prev=now;const f=(now-start)/duration;t.targetAngle=f*Math.PI*2;t.targetPitch=0;if(f<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
    t.solid.render=render;
    function stats(a){a=a.slice(5).sort((a,b)=>a-b);return{samples:a.length,mean:a.reduce((s,x)=>s+x,0)/a.length,p95:a[Math.floor(a.length*.95)],max:a.at(-1)};}
    return{actualIndex:t.index,drag,canvasPixels:t.solid.size,resources:window.__qaClass.diagnostics,frameMs:stats(frames),renderCopyMs:stats(costs)};
   },{capture,videoMode});
   assert.equal(result.actualIndex,n-1,`${id} ${scene} exact model identity`);assert.ok(Math.abs(result.drag.yaw)>.2,`${id} ${scene} pointer rotation`);assert.equal(result.resources.resident,1);
   if(capture){
    const poses=scene==='menu'?[['hero',0,0],['side',1.05,.708],['rear',Math.PI,0],['underside',0,1.4]]:[['hero',0,0]];
    for(const[pose,yaw,pitch]of poses){
     await page.evaluate(({yaw,pitch})=>{const t=window.__qaTurntable();t.targetAngle=yaw;t.targetPitch=pitch;},{yaw,pitch});await page.waitForTimeout(videoMode?900:500);
     await page.screenshot({path:`${out}/${id}-${scene}-${pose}.png`});
     if(scene==='menu'&&pose==='hero'){
      const data=await page.evaluate(()=>window.__qaTurntable().solid.canvas.toDataURL('image/png'));await fs.writeFile(`${out}/${id}-runtime-buffer.png`,Buffer.from(data.split(',')[1],'base64'));
     }
    }
   }
   rows.push({id,name:ship.name,scene,readyMs,...result});
  }
  console.log('FLEET_RUNTIME_VERIFIED',id,ship.name);
 }
 // Repeated selection after the traversal; compare like-for-like residency.
 const repeats=[];
 for(let i=0;i<4;i++){
  const ship=ShipData.find(s=>s.textureIndex===(i%2?ids[0]-1:ids.at(-1)-1));
  await page.evaluate(async key=>{localStorage.setItem('burt.selectedShip.v1',key);await window.__game.showShipSelect();window.__game.showMenu();},ship.spriteKey);
  await page.waitForFunction(i=>window.__game.scenes.menu.astraMenuShip?.ready&&window.__game.scenes.menu.astraMenuShip.index===i,ship.textureIndex,{timeout:60000});await page.waitForTimeout(500);
  const resources=await page.evaluate(()=>window.__qaClass.diagnostics),original=rows.find(r=>Number(r.id)===ship.textureIndex+1&&r.scene==='menu').resources;
  assert.equal(resources.resident,1);assert.equal(resources.geometries,original.geometries);assert.equal(resources.textures,original.textures);repeats.push(resources);
 }
 await page.evaluate(()=>window.__game.startGame('nova-player-ship-01.png'));
 await page.waitForFunction(()=>window.__game.currentSceneName==='play'&&window.__game.scenes.play.enemyManager?.enemies?.some(e=>!e.dead),null,{timeout:60000});
 const combat=await page.evaluate(()=>({sprite:window.__game.scenes.play.player.selectedShipSpriteKey,resources:window.__qaClass.diagnostics}));assert.equal(combat.sprite,'nova-player-ship-01.png');assert.equal(combat.resources.resident,0);
 if(capture){await page.waitForFunction(()=>!window.__game.scenes.play.player.invulnerable,null,{timeout:30000});await page.screenshot({path:`${out}/unchanged-combat.png`});}
 await page.evaluate(()=>window.__game.showMenu());await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:60000});
 const gpu=await page.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info'),name=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);gl.getExtension('WEBGL_lose_context')?.loseContext();return name;});
 const report={capture,videoMode,gpu,measurementNote:capture?'Visual capture timings are not performance evidence':'Isolated 1080p browser; 4 seconds rotating per ship per scene, no recording/build/Blender running; CPU render-copy timing is not GPU timing',rows,repeats,combat,requests,errors,warnings};
 await fs.writeFile(`docs/fleet-showcase/${videoMode?'representative-rotation':capture?'runtime-captures':'performance'}${arg?'-'+ids.join('-'):''}.json`,JSON.stringify(report,null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);assert.ok(requests.every(u=>u.includes('/art/fleet-showcase/')));
 if(videoMode){const video=page.video();await context.close();await video.saveAs('docs/fleet-showcase/runtime-rotation.webm');}
}finally{await browser.close();}
