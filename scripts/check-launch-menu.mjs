import assert from 'node:assert/strict';
import { chromium, _electron as electron } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
let base=process.env.CHECK_URL||'http://127.0.0.1:4403';
const out=path.resolve(process.env.CHECK_OUTPUT_DIR||'test-results/launch-menu');mkdirSync(out,{recursive:true});
const native=process.env.ASTRA_EXE;
const browser=native?await electron.launch({executablePath:native,args:['--nova-fresh-profile','--windowed'],env:{...process.env,NOVA_SWARM_USER_DATA_DIR:path.join(out,'profile'),NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},timeout:120000}):await chromium.launch({channel:'chrome',headless:true});
const context=native?browser.context():await browser.newContext({viewport:{width:1280,height:720}});
await context.route('**/*',r=>/^(nova-swarm:|data:|blob:|https?:\/\/(127\.0\.0\.1|localhost)(:|\/))/.test(r.request().url())?r.continue():r.abort());
const page=native?await browser.firstWindow():await context.newPage(), report={executable:native||null,errors:[],checks:[],locales:[],runs:[]};
if(native){
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.launchHome,null,{timeout:120000});
 report.profile=await browser.evaluate(({app})=>({packaged:app.isPackaged,path:app.getPath('userData')}));
 assert.equal(report.profile.packaged,true);assert.equal(report.profile.path,path.join(out,'profile'));
 report.runtime=await page.evaluate(()=>JSON.parse(window.render_game_to_text()).gitSha);
 assert.equal(report.runtime,process.env.ASTRA_EXPECTED_SHA);
 await browser.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.setContentSize(1280,720);});
 base=page.url().split('?')[0].replace(/\/$/,'');
}
page.on('pageerror',e=>report.errors.push(e.message));
const flush=()=>writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
async function ready(){await page.goto(`${base}${native?'':'/'}?offlineLeaderboard=1`,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready&&window.__game.scenes.menu.launchHome,null,{timeout:120000});await page.waitForTimeout(400);}
async function clickHome(id){const b=await page.evaluate(id=>window.__game.scenes.menu.launchHome.debug().buttons[id],id);assert.ok(b.visible,id);await page.mouse.click(b.x+b.width/2,b.y+b.height/2);}
async function clickMode(key){const b=await page.evaluate(key=>{const o=window.__game.scenes.menu[key],b=o.getBounds();return{x:b.x+b.width/2,y:b.y+b.height/2,visible:o.visible&&o.parent.visible};},key);assert.ok(b.visible,key);await page.mouse.click(b.x,b.y);}
async function assertRun(expected){await page.waitForFunction(()=>window.__game?.currentScene===window.__game.scenes.play&&window.__game.scenes.play.player,null,{timeout:120000});const state=await page.evaluate(()=>({mode:window.__game.runMode,level:window.__game.level,briefing:!!window.__game.scenes.menu.modeBriefingOverlay}));assert.equal(state.mode,expected);assert.equal(state.briefing,false);report.runs.push(state);flush();}
try {
 await ready();
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.getSelectedMenuOptionId()),'launchTactical');
 await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.launchHome.surface),'modes');
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.launchHome.surface),'home');
 await page.keyboard.press('Enter');await assertRun('ranked_tactical');report.checks.push('Fresh-pilot keyboard opens Other Modes, returns, and launches Tactical directly');
 await ready();
 const before=await page.evaluate(()=>{const s=window.__game.scenes.menu.astraMenuShip;return{x:s.x,y:s.y,angle:s.targetAngle};});
 await page.mouse.move(before.x,before.y);await page.mouse.down();await page.mouse.move(before.x+100,before.y,{steps:12});await page.mouse.up();
 assert.ok(Math.abs(await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.targetAngle)-before.angle)>.3);report.checks.push('Actual mouse drag rotates selected ship');
 await clickHome('settings');await page.waitForTimeout(300);
 const modalAngle=await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.targetAngle);
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.eventMode),'none');
 await page.keyboard.press('Escape');await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>!!window.__game.scenes.menu.settingsOverlay),false);
 report.checks.push('Settings gates ship drag and closes with Escape');
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.launchHome.alpha),1);
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.caption.visible),false);
 await page.evaluate(()=>{localStorage.setItem('nova_accessibility_reduced_motion','1');localStorage.setItem('nova.hangarProgress.v1',JSON.stringify({bestLevel:6,bestSector:6,totalRuns:2}));localStorage.setItem('burt.selectedShip.v1','nova-player-ship-02.png');});
 await ready();
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.launchHome.debug().selectedShip),'nova-player-ship-02.png');
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.index),1);
 const motionState=()=>page.evaluate(()=>{const m=window.__game.scenes.menu;return {x:m.backdrop.x,y:m.backdrop.y,alpha:m.backdrop.alpha,shipY:m.astraMenuShip.y,angle:m.astraMenuShip.viewAngle};});
 const still=await motionState();await page.waitForTimeout(1100);assert.deepEqual(await motionState(),still);
 const reducedShip=await page.evaluate(()=>{const s=window.__game.scenes.menu.astraMenuShip;return{x:s.x,y:s.y,angle:s.targetAngle};});
 await page.mouse.move(reducedShip.x,reducedShip.y);await page.mouse.down();await page.mouse.move(reducedShip.x+90,reducedShip.y,{steps:10});await page.mouse.up();
 assert.ok(Math.abs(await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.targetAngle)-reducedShip.angle)>.3);
 await clickHome('launchTactical');await assertRun('ranked_tactical');
 assert.equal(await page.evaluate(()=>window.__game.selectedShipSpriteKey),'nova-player-ship-02.png');
 report.checks.push('Saved Comet Courier is displayed and launched; reduced motion is still while manual rotation works');
 await page.evaluate(()=>localStorage.setItem('nova_accessibility_reduced_motion','0'));await ready();
 for(const language of ['en','de','es','ru','zh-CN','pt-BR','ko','ja']) {
  await page.evaluate(async language=>{await window.__novaI18n.setLanguagePreference(language);window.__game.scenes.menu.refreshMenuText({forceGpuRefresh:true});},language);
  await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>window.__game.scenes.menu.launchHome.alpha),1);
  assert.equal(await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.caption.visible),false);
  await page.screenshot({path:path.join(out,`${language}-home.png`)});
  await clickHome('otherModes');await page.waitForTimeout(200);await page.screenshot({path:path.join(out,`${language}-modes.png`)});
  await clickHome('backHome');report.locales.push(language);
 }
 await page.evaluate(async()=>{await window.__novaI18n.setLanguagePreference('en');localStorage.setItem('nova.hangarProgress.v1',JSON.stringify({bestLevel:60,bestSector:60,totalRuns:12,overrunUnlockCelebrationSeen:true}));});
 for(const [key,expected] of [['tacticalStartBtn','ranked'],['dailySignalBtn','daily_signal'],['scoutRunBtn','scout'],['sectorStartBtn','sector_start'],['overrunStartBtn','overrun_tactical'],['overrunStartBtn','overrun_pure']]) {
  await ready();await clickHome('otherModes');
  if(expected.startsWith('overrun'))await page.evaluate(mode=>{const m=window.__game.scenes.menu;m.overrunRunMode=mode;m.refreshButtonCopy(m.overrunStartBtn,{forceGpuRefresh:true});m.layoutMenu();},expected);
  await clickMode(key);await assertRun(expected);
 }
 await ready();await clickHome('otherModes');
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.getSelectedMenuOptionId()),'overrun');
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.overrunRunMode),'overrun_pure');
 await clickHome('backHome');await clickHome('launchTactical');await assertRun('ranked_tactical');
 report.checks.push('All six alternative launches work; remembered Overrun Pure never changes home Play');
 assert.deepEqual(report.errors,[]);report.status='passed';console.log('PASS launch menu, all alternative modes, rotation and eight locales');
}catch(error){report.status='failed';report.failure=error.stack;throw error;}finally{flush();await browser.close();}
