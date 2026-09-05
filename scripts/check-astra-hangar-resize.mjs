import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='test-results/astra-hangar-resize';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1280,height:720}}),report={errors:[],layouts:[]};
page.on('pageerror',e=>report.errors.push(e.message));await page.route('**/*',r=>/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.request().url())||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
try{
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4399'}/?offlineLeaderboard=1`);
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});await page.evaluate(()=>window.__game.showShipSelect());
 await page.waitForFunction(()=>window.__game.scenes.shipSelect?.shipCards?.length===30,null,{timeout:120000});await page.evaluate(()=>window.__game.scenes.shipSelect.navigateTo(2));
 await page.waitForFunction(()=>window.__game.scenes.shipSelect.shipCards[2]?.turntable?.ready,null,{timeout:120000});
 await page.evaluate(()=>window.astraResizeViewer=window.__game.scenes.shipSelect.shipCards[2].turntable);
 for(const size of [{width:1920,height:1080},{width:800,height:600},{width:1280,height:720}]){
  await page.setViewportSize(size);await page.waitForTimeout(900);
  const state=await page.evaluate(()=>{const s=window.__game.scenes.shipSelect,c=s.shipCards[s.selectedIndex],rect=b=>({left:b.minX,right:b.maxX,top:b.minY,bottom:b.maxY});return {width:innerWidth,height:innerHeight,id:c.shipData.baseId||c.shipData.id,sameViewer:c.turntable===window.astraResizeViewer,button:rect(s.startButton.getBounds()),footer:rect(s.footerInstructions.getBounds()),preview:rect(c.weaponPreview.getBounds()),roster:rect(s.rosterStrip.getBounds()),buttonCenter:s.startButton.toGlobal({x:60,y:20})};});
  assert.equal(state.id,'nova_ship_07');assert.ok(state.sameViewer,'Resize must retain the selected atlas and rotation state');
  for(const [name,b]of Object.entries({button:state.button,footer:state.footer,preview:state.preview,roster:state.roster})){assert.ok(b.left>=0&&b.right<=size.width+1&&b.top>=0&&b.bottom<=size.height+1,`${name} must stay inside the actual viewport`);}
  assert.ok(state.preview.bottom<state.roster.top);report.layouts.push(state);await page.screenshot({path:`${out}/${size.width}.png`});
  await page.mouse.click(state.buttonCenter.x,state.buttonCenter.y);await page.waitForFunction(()=>!!window.__game.scenes.shipSelect.launchModeOverlay);
  await page.screenshot({path:`${out}/${size.width}-launch.png`});await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.__game.scenes.shipSelect.launchModeOverlay);
 }
 assert.deepEqual(report.errors,[]);report.status='passed';console.log('PASS: live hangar resizing retains all controls, firing preview, selected atlas and working mouse launch at 1920/800/1280');
}catch(e){report.status='failed';report.failure=e.stack;throw e;}finally{writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
