import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out='test-results/astra-v3-turntable-runtime';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={errors:[],warnings:[],residency:[]};
try {
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 await page.route('**/*',r=>/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.request().url())||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))report.warnings.push(m.text());});
 await page.goto('http://127.0.0.1:4399/?offlineLeaderboard=1');
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await page.evaluate(()=>{window.astraViewerClass=window.__game.scenes.menu.astraMenuShip.constructor;});
 await page.screenshot({path:`${out}/main-1080.png`});
 await page.mouse.move(930,510);await page.mouse.down();await page.mouse.move(1170,510,{steps:30});await page.mouse.up();await page.waitForTimeout(600);
 assert.ok(await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.viewAngle>2),'Main hull must rotate with a real drag');
 await page.screenshot({path:`${out}/main-rotated-1080.png`});
 await page.evaluate(()=>window.__game.showShipSelect());
 await page.waitForFunction(()=>window.__game.scenes.shipSelect?.shipCards?.[0]?.turntable?.ready,null,{timeout:120000});
 await page.screenshot({path:`${out}/hangar-ready-1080.png`});
 const center=await page.evaluate(()=>{const g=window.__game,s=g.scenes.shipSelect.shipCards[0].turntable,p=s.toGlobal({x:0,y:0});let e=g.app.renderer.events.rootBoundary.hitTest(p.x,p.y),hit=[];while(e){hit.push({type:e.constructor.name,label:e.label});e=e.parent;}return {x:p.x,y:p.y,hit};});report.hangarPointer=center;
 await page.mouse.move(center.x,center.y);await page.mouse.down();await page.mouse.move(center.x+230,center.y,{steps:30});await page.mouse.up();await page.waitForTimeout(700);
 report.hangarState=await page.evaluate(()=>{const s=window.__game.scenes.shipSelect;return {selected:s.selectedIndex,angle:s.shipCards[0].turntable?.viewAngle,target:s.shipCards[0].turntable?.targetAngle};});
 assert.ok(await page.evaluate(()=>window.__game.scenes.shipSelect.shipCards[0].turntable.viewAngle>2),'Hangar hull must rotate with a real drag');
 await page.screenshot({path:`${out}/hangar-rotated-1080.png`});
 for(const index of [1,4,29,0,12,0]){
  await page.waitForFunction(()=>!window.__game.scenes.shipSelect.animating);
  await page.evaluate(index=>window.__game.scenes.shipSelect.navigateTo(index),index);
  await page.waitForFunction(index=>window.__game.scenes.shipSelect.shipCards[index]?.turntable?.ready,index,{timeout:90000});
  await page.waitForTimeout(500);
  const count=await page.evaluate(async()=>{return window.astraViewerClass.getResidentCount();});
  assert.ok(count<=2,`Retained turntables grew at ship ${index}: ${count}`);report.residency.push({index,count});
 }
 for(let i=0;i<5;i++){
  await page.evaluate(()=>window.__game.showMenu());await page.waitForTimeout(80);
  await page.evaluate(()=>window.__game.showShipSelect());await page.waitForTimeout(80);
 }
 await page.evaluate(()=>window.__game.showMenu());
 await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:90000});await page.waitForTimeout(1200);
 report.afterTransitions=await page.evaluate(async()=>{return {resident:window.astraViewerClass.getResidentCount(),valid:!window.__game.scenes.menu.astraMenuShip.views[0].texture.destroyed};});
 assert.equal(report.afterTransitions.resident,1);assert.ok(report.afterTransitions.valid);
 report.rng=await page.evaluate(()=>{const g=window.__game,s=g.scenes.menu.astraMenuShip;g.app.ticker.stop();const random=Math.random;let calls=0;Math.random=()=>{calls++;throw Error('Viewer used gameplay RNG');};try{for(let i=0;i<180;i++)s.update(1);}finally{Math.random=random;g.app.ticker.start();}return calls;});assert.equal(report.rng,0);
 await page.evaluate(()=>window.__game.startGame(window.__game.selectedShipSpriteKey));
 await page.waitForFunction(()=>window.__game.scenes.play?.player?.active,null,{timeout:90000});await page.waitForTimeout(1500);
 report.combatResident=await page.evaluate(async()=>{return window.astraViewerClass.getResidentCount();});assert.equal(report.combatResident,0);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.warnings,[]);report.ok=true;console.log('PASS real drag, locked/unlocked selections, rapid transitions, bounded residency, RNG isolation and zero combat atlases');
}finally{writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
