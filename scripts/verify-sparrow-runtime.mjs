import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='output/playwright/ship-art-v2/runtime';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:out,size:{width:1920,height:1080}}});
const page=await context.newPage();const errors=[],requests=[];
await page.addInitScript(()=>performance.setResourceTimingBufferSize(10000));
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('.glb'))requests.push(r.url());});
await page.goto('http://127.0.0.1:5199/?skipIntro=1&offlineLeaderboard=1&nova-devtools-hash=f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c');
await page.waitForFunction(()=>window.__game?.scenes.menu.astraMenuShip?.ready,{},{timeout:90000});
await page.waitForTimeout(2000);
await page.evaluate(()=>{window.__qaSolidClass=window.__game.scenes.menu.astraMenuShip.solid.constructor;});
const stats=()=>page.evaluate(()=>window.__qaSolidClass.diagnostics);
const initial=await stats();
assert.equal(initial.resident,1,'diagnostics must observe the live renderer instance');
const imports=await page.evaluate(()=>performance.getEntriesByType('resource').filter(x=>x.name.endsWith('.glb')).map(x=>({url:x.name,durationMs:x.duration,transferBytes:x.transferSize,decodedBytes:x.decodedBodySize})));
const gpu=await page.evaluate(()=>{const c=document.createElement('canvas'),g=c.getContext('webgl2');const e=g.getExtension('WEBGL_debug_renderer_info');const result={renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),vendor:e?g.getParameter(e.UNMASKED_VENDOR_WEBGL):g.getParameter(g.VENDOR)};g.getExtension('WEBGL_lose_context')?.loseContext();return result;});
// Exercise the player's actual drag input before scripted full-angle inspection.
await page.mouse.move(1400,470);await page.mouse.down();await page.mouse.move(1560,535,{steps:24});await page.mouse.up();await page.waitForTimeout(800);
const drag=await page.evaluate(()=>{const t=window.__game.scenes.menu.astraMenuShip;return {yaw:t.viewAngle,pitch:t.pitch};});assert.ok(Math.abs(drag.yaw)>.1,'drag must rotate real model');
const rotation=await page.evaluate(async()=>{
 const t=window.__game.scenes.menu.astraMenuShip;const frames=[];let previous=performance.now(),start=previous;
 const renderTimes=[];const old=t.solid.render.bind(t.solid);t.solid.render=(...args)=>{const a=performance.now();const v=old(...args);renderTimes.push(performance.now()-a);return v;};
 await new Promise(resolve=>{function step(now){frames.push(now-previous);previous=now;const elapsed=(now-start)/1000;t.targetAngle=elapsed/12*Math.PI*2;t.targetPitch=0;if(elapsed<12)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});
 t.solid.render=old;
 const summary=a=>{a=a.slice(5).sort((x,y)=>x-y);return {samples:a.length,meanMs:a.reduce((s,x)=>s+x,0)/a.length,p50Ms:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],maxMs:a.at(-1)};};
 return {frame:summary(frames),renderAndCanvasCopy:summary(renderTimes)};
});
for(const [name,yaw,pitch] of [['three-quarter',0,0],['side',1.05,.708],['rear',Math.PI,0],['underside',0,1.4],['opposite-underside',Math.PI,1.4]]){
 await page.evaluate(({yaw,pitch})=>{const t=window.__game.scenes.menu.astraMenuShip;t.targetAngle=yaw;t.targetPitch=pitch;},{yaw,pitch});await page.waitForTimeout(1200);await page.screenshot({path:`${out}/${name}.png`});
}
const counts=[];
for(let i=0;i<3;i++){
 await page.evaluate(()=>window.__game.showShipSelect());await page.waitForFunction(()=>window.__game.scenes.shipSelect.rotatingCard?.turntable?.ready,{},{timeout:60000});await page.waitForTimeout(600);
 counts.push({stage:'hangar-sparrow',...await stats()});
 await page.keyboard.press('ArrowRight');await page.waitForTimeout(1700);
 await page.waitForFunction(()=>window.__game.scenes.shipSelect.rotatingCard?.turntable?.ready,{},{timeout:30000});
 counts.push({stage:'hangar-neighbor',...await stats()});
 if(i===0)await page.screenshot({path:`${out}/unchanged-neighbor.png`});
 await page.keyboard.press('ArrowLeft');await page.waitForTimeout(1500);
 await page.waitForFunction(()=>window.__game.scenes.shipSelect.rotatingCard?.turntable?.ready,{},{timeout:30000});
 counts.push({stage:'hangar-sparrow-return',...await stats()});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__game.currentSceneName==='menu'&&window.__game.scenes.menu.astraMenuShip?.ready,{},{timeout:30000});await page.waitForTimeout(600);counts.push({stage:'menu',...await stats()});
}
await page.evaluate(()=>window.__game.startGame(window.__game.selectedShipSpriteKey));await page.waitForFunction(()=>window.__game.currentSceneName==='play',{},{timeout:60000});
await page.keyboard.down('Space');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(400);await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowRight');await page.waitForTimeout(400);await page.keyboard.up('ArrowRight');await page.waitForTimeout(9000);
await page.screenshot({path:`${out}/combat.png`});
const combat=await page.evaluate(()=>{const p=window.__game.scenes.play.player;return {state:JSON.parse(window.render_game_to_text()),sprite:{width:p.shipSprite.width,height:p.shipSprite.height,scale:p.shipSprite.scale.x,anchor:{x:p.shipSprite.anchor.x,y:p.shipSprite.anchor.y},position:{x:p.shipSprite.position.x,y:p.shipSprite.position.y},bounds:p.shipSprite.getBounds()},radius:p.radius};});
counts.push({stage:'gameplay',...await stats()});
await page.keyboard.up('Space');
const report={gpu,initial,imports,drag,rotation,counts,requests,errors,combat};
await fs.writeFile(`${out}/measurements.json`,JSON.stringify(report,null,2));
assert.deepEqual(errors,[]);assert.ok(counts.every(x=>x.resident<=1),'only selected model stays resident');
const returns=counts.filter(x=>x.stage==='menu');assert.ok(returns.at(-1).textures<=returns[0].textures,'textures must not accumulate across selection cycles');
const video=page.video();await context.close();await video.saveAs(`${out}/runtime-rotation-and-transitions.webm`);await browser.close();
console.log(JSON.stringify({gpu,initial,drag,rotation,counts,errors},null,2));
