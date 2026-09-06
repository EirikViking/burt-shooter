import {chromium,_electron} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,createWriteStream} from 'node:fs';
import path from 'node:path';
const out=path.resolve(process.env.CHECK_OUTPUT_DIR||'test-results/astra-menu-clarity');mkdirSync(out,{recursive:true});
const baseline=process.env.ASTRA_BASELINE==='1',exe=process.env.ASTRA_EXE;
const app=exe?await _electron.launch({executablePath:exe,args:['--nova-fresh-profile','--windowed'],env:{...process.env,NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1',NOVA_SWARM_USER_DATA_DIR:path.join(out,'profile')},timeout:120000}):null;
const log=app?createWriteStream(path.join(out,'process.log')):null;
if(app){app.process().stdout?.pipe(log,{end:false});app.process().stderr?.pipe(log,{end:false});}
const browser=app?null:await chromium.launch({channel:'chrome',headless:true});
const page=app?await app.firstWindow():await browser.newPage({viewport:{width:1920,height:1080}});
const report={executable:exe||null,baseline,checks:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
try{
 await page.route('**/*',r=>/^(nova-swarm:|data:|blob:|https?:\/\/(127\.0\.0\.1|localhost)(:|\/))/.test(r.request().url())?r.continue():r.abort());
 if(!app)await page.goto(process.env.CHECK_URL||'http://127.0.0.1:4406');
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await page.evaluate(()=>{window.__clarityTurntableClass=window.__game.scenes.menu.astraMenuShip.constructor;});
 if(app){
  await page.evaluate(()=>window.__novaDisplay.applySettings({mode:'windowed',windowSize:{width:1920,height:1080},uiScale:1}));
  await page.waitForTimeout(400);
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.setContentSize(1920,1080);w.webContents.setBackgroundThrottling(false);});
 }
 await page.waitForFunction(()=>innerWidth===1920&&innerHeight===1080&&window.__game.app.screen.width===1920);
 await page.evaluate(()=>window.__game.showShipSelect());
 await page.waitForFunction(()=>window.__game.scenes.shipSelect?.ships?.length===30);
 const ships=await page.evaluate(()=>{
  const s=window.__game.scenes.shipSelect;
  localStorage.setItem('nova.hangarProgress.v1',JSON.stringify({...s.unlockProgress,unlockedShipIds:s.ships.map(x=>x.baseId||x.id),lastNewlyUnlockedShipIds:[]}));
  return s.ships.map(x=>({key:x.spriteKey,index:x.textureIndex}));
 });
 const indices=process.env.ASTRA_SHIP_INDICES?process.env.ASTRA_SHIP_INDICES.split(',').map(Number):process.env.ASTRA_ALL_SHIPS==='1'?Array.from({length:30},(_,i)=>i):[2,0,6,29];
 for(const index of indices){
  const ship=ships.find(s=>s.index===index);assert.ok(ship?.key,`Ship ${index} exists`);
  await page.evaluate(key=>{localStorage.setItem('burt.selectedShip.v1',key);window.__game.showMenu();},ship.key);
  await page.waitForFunction(i=>window.__game.scenes.menu.astraMenuShip?.ready&&window.__game.scenes.menu.astraMenuShip.index===i,index,{timeout:120000});
  if(!baseline)await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip.detailFrame===0,null,{timeout:30000});
  await page.waitForTimeout(600);
  for(const frame of [0,18,45]){
   await page.evaluate(f=>{const s=window.__game.scenes.menu.astraMenuShip;s.targetAngle=s.viewAngle=f/72*Math.PI*2;s.update(0);},frame);
   if(!baseline)await page.waitForFunction(f=>window.__game.scenes.menu.astraMenuShip.detailFrame===f,frame,{timeout:30000});
   await page.waitForTimeout(250);
   const state=await page.evaluate(()=>{const s=window.__game.scenes.menu.astraMenuShip;return {index:s.index,frame:s.lastFrame??null,width:s.views[0].texture.width,residents:s.constructor.getDetailResidentCount?.()??0,source:s.views[0].texture.source.resource?.src??null};});
   if(!baseline){assert.equal(state.width,1024);assert.ok(state.residents<=2);}
   report.checks.push(state);
   if([2,6,29].includes(index))await page.screenshot({path:path.join(out,`ship-${index+1}-frame-${frame}.png`)});
  }
  // Real pointer input must still turn the selected model.
  const initial=await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.targetAngle);
  await page.mouse.move(930,440);await page.mouse.down();await page.mouse.move(1040,440,{steps:20});await page.mouse.up();
  await page.waitForFunction(a=>window.__game.scenes.menu.astraMenuShip.targetAngle!==a,initial);
  await page.waitForTimeout(1000);
  if(!baseline)await page.waitForFunction(()=>{const s=window.__game.scenes.menu.astraMenuShip;return s.detailFrame===s.lastFrame&&s.views[0].texture.width===1024;});
  if(process.env.ASTRA_MEASURE==='1'){
   const cdp=await page.context().newCDPSession(page);await cdp.send('HeapProfiler.collectGarbage');
   const heap=await cdp.send('Runtime.getHeapUsage');
   const timing=await page.evaluate(async()=>{
    const times=[];let last;const start=performance.now();
    await new Promise(resolve=>{function tick(t){if(last!==undefined)times.push(t-last);last=t;if(t-start<10000)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
    times.sort((a,b)=>a-b);return {frames:times.length,p95Ms:times[Math.floor(times.length*.95)],p99Ms:times[Math.floor(times.length*.99)],maxMs:times.at(-1)};
   });
   report.performance={...timing,retainedJsMiB:heap.usedSize/1048576,detailBytes:baseline?0:1024*1024*4};await cdp.detach();
  }
  await page.evaluate(()=>window.__game.showShipSelect());
  if(!baseline)await page.waitForFunction(()=>window.__clarityTurntableClass.getDetailResidentCount()===0);
 }
 if(!baseline){
  // Navigate away while a view is still loading, then immediately revisit it.
  await page.route('**/art/astra/menu-hd/**',async route=>{await new Promise(r=>setTimeout(r,250));await route.continue().catch(()=>{});});
  await page.evaluate(()=>window.__game.showMenu());
  await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.detailPending);
  await page.evaluate(()=>window.__game.showShipSelect());
  await page.waitForFunction(()=>window.__clarityTurntableClass.getDetailResidentCount()===0);
  await page.evaluate(()=>window.__game.showMenu());
  await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.detailFrame===0);
  assert.equal(await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.views[0].texture.width),1024);
  report.checks.push('Late view load releases safely; immediate revisit restores full detail');
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}finally{writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));if(app)await app.close().catch(()=>{});if(browser)await browser.close();log?.end();}
