// Slow network regression: no flat selected ship may reach a rendered frame.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const expectFlash=process.argv.includes('--expect-flash');
const root=`test-results/showcase-loading-${expectFlash?'before':'after'}`,b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];
await fs.mkdir(root+'/evidence',{recursive:true});
p.on('pageerror',e=>errors.push(e.message));await p.route('**/art/fleet-showcase/*.glb',async route=>{await new Promise(r=>setTimeout(r,1800));await route.continue();});
try{
 await p.goto('http://127.0.0.1:5201/?skipIntro=1&offlineLeaderboard=1&nova-devtools-hash=f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c');
 await p.waitForFunction(()=>window.__game?.scenes.menu.astraMenuShip&&!window.__game.scenes.menu.astraMenuShip.ready);
 await p.evaluate(()=>{window.__loadCheck={frames:0,flatFrames:[],loadingFrames:0,readyFrames:0,departing3dFrames:0};const app=window.__app||window.__PIXI_APP;app.ticker.add(()=>{const g=window.__game,scene=g.currentSceneName,h=g.scenes.shipSelect,c=scene==='shipSelect'?h.shipCards[h.selectedIndex]:null,t=scene==='menu'?g.scenes.menu.astraMenuShip:c?.turntable;const r=window.__loadCheck;r.frames++;r[t?.ready?'readyFrames':'loadingFrames']++;if(t?.views.some(v=>v.visible&&v.alpha>0&&v.texture===t.fallback))r.flatFrames.push({scene,index:t.index,reason:'viewer fallback'});if(scene==='shipSelect')for(const item of h.shipCards){if(!item.visible||item.alpha<=.01)continue;if(item.sprite?.visible&&(item===c||item.scale.x>h.sideScale+.05))r.flatFrames.push({scene,index:item.shipIndex,reason:'large carousel thumbnail',scale:item.scale.x});if(item!==c&&item.turntable?.ready&&h.animating)r.departing3dFrames++;}},null,-1000);});
 await p.screenshot({path:root+'/evidence/loading-menu.png'});
 await p.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip.ready);await p.waitForTimeout(150);
 await p.evaluate(()=>window.__game.showShipSelect());
 await p.waitForFunction(()=>window.__game.scenes.shipSelect.rotatingCard?.turntable?.ready);
 await p.screenshot({path:root+'/evidence/loading-hangar.png'});
 await p.waitForFunction(()=>window.__game.scenes.shipSelect.rotatingCard?.turntable?.ready);
 const ready=()=>p.waitForFunction(()=>{const h=window.__game.scenes.shipSelect;return h.pendingIndex==null&&!h.animating&&h.shipCards[h.selectedIndex]?.turntable?.ready;},null,{timeout:120000});
 await p.evaluate(()=>window.__game.scenes.shipSelect.navigateTo(28));await ready();
 await p.keyboard.press('ArrowRight');await p.waitForTimeout(80);
 await p.screenshot({path:root+'/evidence/outgoing-transition.png'});await ready();
 await p.keyboard.press('ArrowRight');await ready();
 await p.keyboard.press('ArrowLeft');await ready();
 await p.evaluate(()=>window.__game.scenes.shipSelect.navigateTo(26));await ready();
 await p.screenshot({path:root+'/evidence/ready-hangar.png'});
 await p.waitForTimeout(150);
 const r=await p.evaluate(()=>({...window.__loadCheck,liveFrame:window.__game.scenes.shipSelect.rotatingCard.turntable.views[0].visible,resident:window.__game.scenes.shipSelect.rotatingCard.turntable.solid.constructor.diagnostics.resident}));
 if(expectFlash)assert.ok(r.flatFrames.length>0,'Reproduce the outgoing-thumbnail flash');
 else {assert.deepEqual(r.flatFrames,[]);assert.ok(r.departing3dFrames>0,'Keep outgoing 3D until it reaches the thumbnail slot');}
 assert.ok(r.loadingFrames>60);assert.ok(r.readyFrames>0);assert.equal(r.liveFrame,true);assert.equal(r.resident,1);assert.deepEqual(errors,[]);
 await fs.writeFile(root+'/loading-transition.json',JSON.stringify({...r,errors,artificialGlbDelayMs:1800},null,2));console.log(expectFlash?'FLASH_REPRODUCED':'NO_FLAT_LOADING_FRAMES_PASS',{...r,flatFrames:r.flatFrames.length});
}finally{await b.close();}
