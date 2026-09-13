import {chromium,_electron} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const packaged=process.env.NOVA_SWARM_PACKAGED_EXE;
const verifyEnergyArt=process.env.NOVA_SWARM_ENERGY_ART_CHECK==='1';
const app=packaged?await _electron.launch({executablePath:packaged,args:['--windowed','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],env:{...process.env,NOVA_SWARM_DISABLE_STEAMWORKS:'1',NOVA_SWARM_USER_DATA_DIR:process.cwd()+'/test-results/handoff-packaged-profile'},timeout:120000}):null;
const browser=app?null:await chromium.launch({channel:'chrome',headless:true});
const page=app?await app.firstWindow():await browser.newPage({viewport:{width:1920,height:1080}});
if(app)await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setContentSize(1920,1080);w.webContents.setBackgroundThrottling(false);w.hide();});
let fail=false;
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/art/fleet-showcase/*.glb',async route=>{
 await new Promise(r=>setTimeout(r,1000));
 if(fail)return route.fulfill({status:503,body:''});
 await route.continue();
});
try {
 if(!app)await page.goto('http://127.0.0.1:5201/?skipIntro=1&offlineLeaderboard=1');
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await page.evaluate(()=>window.__game.showShipSelect());
 await page.waitForFunction(()=>window.__game.scenes.shipSelect.rotatingCard?.turntable?.ready,null,{timeout:120000});
 await page.evaluate(()=>{
  const g=window.__game,h=g.scenes.shipSelect;window.__handoff={frames:0,blank:0,flat:0,decorations:0,peakResident:0};
  g.app.ticker.add(()=>{
   if(g.currentSceneName!=='shipSelect')return;
   const c=h.shipCards[h.selectedIndex],r=window.__handoff;r.frames++;
   if(!c.turntable?.ready||!c.turntable.visible)r.blank++;
   if(c.sprite.visible)r.flat++;
   if(c.hangarSignature?.visible||c.lightRays?.visible||c.glowLayers?.visible)r.decorations++;
   r.peakResident=Math.max(r.peakResident,c.turntable?.solid.constructor.resident||0);
  },null,-1000);
 });
 const ready=index=>page.waitForFunction(i=>{const h=window.__game.scenes.shipSelect;return h.selectedIndex===i&&!h.animating&&h.pendingIndex==null&&h.rotatingCard?.turntable?.ready;},index,{timeout:120000});
 for(const index of [29,0,1,2]){
  await page.evaluate(i=>{void window.__game.scenes.shipSelect.navigateTo(i);},index);
  await ready(index);
  console.log('Ready packaged ship index',index);
 }
 // A second request supersedes the pending model without removing the current ship.
 await page.evaluate(()=>{const h=window.__game.scenes.shipSelect;void h.navigateTo(3);void h.navigateTo(4);});await ready(4);
 if(!app){fail=true;await page.evaluate(()=>window.__game.scenes.shipSelect.navigateTo(5));
 assert.equal(await page.evaluate(()=>window.__game.scenes.shipSelect.selectedIndex),4,'failed load keeps current ship');fail=false;}
 if(app){
  // Windows can stall compositor capture for a hidden native game window.
  // Show without taking focus only for the real capture, then hide it again.
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].showInactive());
  await page.waitForTimeout(300);
  await page.screenshot({path:'test-results/hangar-handoff-packaged.png',timeout:15000});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].hide());
 }else await page.screenshot({path:'test-results/hangar-handoff.png'});
 const result=await page.evaluate(()=>({...window.__handoff,resident:window.__game.scenes.shipSelect.rotatingCard.turntable.solid.constructor.resident}));
 assert.equal(result.blank,0,'No empty selected ship while browsing');assert.equal(result.flat,0);assert.equal(result.decorations,0);
 assert.ok(result.peakResident<=2);assert.equal(result.resident,1);
 // Scene exit during a pending load must release both views and reject the late result.
 await page.evaluate(()=>{const g=window.__game;void g.scenes.shipSelect.navigateTo(6);g.showMenu();});
 await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});
 await page.waitForTimeout(1500);
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.solid.constructor.resident),1);
 if(app&&verifyEnergyArt){
  await page.waitForFunction(()=>window.__game.scenes.menu.launchHome?.wordmark,null,{timeout:30000});
  result.menuArtwork=await page.evaluate(()=>{const h=window.__game.scenes.menu.launchHome;return {wordmark:h.wordmark.texture.width,control:h.buttons.launchTactical._plate.texture.width};});
  assert.equal(result.menuArtwork.wordmark,1536);assert.equal(result.menuArtwork.control,1480);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].showInactive());await page.waitForTimeout(300);
  await page.screenshot({path:'test-results/menu-energy-packaged-menu.png',timeout:15000});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].hide());
  await page.evaluate(()=>window.__game.startGame('nova-player-ship-01.png',{runMode:'ranked_tactical'}));
  await page.waitForFunction(()=>window.__game.scenes.play?.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
  result.phaseArtwork=await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.markUnrankedRun('packaged_energy_qa');g.app.ticker.stop();
   p.player.sprite.alpha=1;p.player.isDodging=true;p.player.dodgeDuration=150;p.player.dodgeDurationMax=300;p.player.updateDodgeVisual(0);
   g.app.renderer.render(g.app.stage);return {brackets:p.player.dodgeRing.__debugPhaseActive.phaseGateBracketCount,materials:p.player.dodgeRing.context.instructions.filter(i=>i.data?.style?.texture?.width===512).length};});
  assert.equal(result.phaseArtwork.brackets,0);assert.ok(result.phaseArtwork.materials>=2);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].showInactive());await page.waitForTimeout(300);
  await page.screenshot({path:'test-results/menu-energy-packaged-phase.png',timeout:15000});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].hide());
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`test-results/hangar-handoff${app?'-packaged':''}.json`,JSON.stringify(result,null,2));
 console.log('PASS model-to-model browsing, no blank/flat/decorative frames, latest request, load failure, exit cleanup',result);
} finally {if(app)await app.close();else await browser.close();}
