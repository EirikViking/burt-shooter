import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';
import {mkdirSync,readFileSync,writeFileSync,createWriteStream} from 'node:fs';
import path from 'node:path';
const out=path.resolve('test-results/astra-packaged-menus');mkdirSync(out,{recursive:true});
const executable=JSON.parse(readFileSync('test-results/astra-build-location.json')).executable;
const app=await electron.launch({executablePath:executable,args:['--nova-fresh-profile','--windowed'],cwd:process.cwd(),env:{...process.env,NOVA_SWARM_USER_DATA_DIR:path.join(out,'profile'),NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},timeout:120000});
const log=createWriteStream(path.join(out,'process.log'));app.process().stdout?.pipe(log,{end:false});app.process().stderr?.pipe(log,{end:false});
const report={executable,errors:[],captures:[]};
try{
 const page=await app.firstWindow();page.on('pageerror',e=>report.errors.push(e.message));
 await app.context().route('**/*',r=>/^(nova-swarm:|data:|blob:|https?:\/\/(127\.0\.0\.1|localhost)(:|\/))/.test(r.request().url())?r.continue():r.abort());
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuLights?.target,null,{timeout:120000});
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.setContentSize(1280,720);w.webContents.setBackgroundThrottling(false);w.showInactive();});
 await page.waitForFunction(()=>innerWidth===1280&&innerHeight===720);
 async function shot(name){await page.waitForTimeout(1400);await page.screenshot({path:path.join(out,`${name}.png`)});report.captures.push(name);console.log(name);}
 await shot('01-menu');
 await page.evaluate(()=>window.__game.scenes.menu.openSettingsOverlay());await shot('02-settings');
 await page.evaluate(()=>window.__game.scenes.menu.closeSettingsOverlay());
 await page.evaluate(()=>window.__game.scenes.menu.openHowToPlayOverlay());await shot('03-help');
 await page.evaluate(()=>window.__game.scenes.menu.closeHowToPlayOverlay());
 await page.evaluate(()=>window.__game.showShipSelect());
 await page.waitForFunction(()=>window.__game.scenes.shipSelect?.shipCards?.length===30,null,{timeout:120000});await shot('04-hangar');
 await page.evaluate(()=>window.__game.switchScene('achievements'));await shot('05-achievements');
 await page.evaluate(()=>window.__game.switchScene('highscore'));await shot('06-leaderboard');
 await page.evaluate(()=>{
  const g=window.__game;g.showThreatCodex();const c=g.scenes.threatCodex,items={};
  for(const [category,entries]of Object.entries(c.catalog)){if(!Array.isArray(entries))continue;items[category]={};for(const e of entries)items[category][e.id]={timesSeen:5,timesDefeated:2,discoveredAt:Date.now(),lastSeenAt:Date.now(),unread:false};}
  localStorage.setItem('nova.threatDiscovery.v1',JSON.stringify({version:1,items}));
  const s=g.scenes.shipSelect;localStorage.setItem('nova.hangarProgress.v1',JSON.stringify({...s.unlockProgress,unlockedShipIds:s.ships.map(x=>x.baseId||x.id),lastNewlyUnlockedShipIds:[]}));
 });
 await page.reload();await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuLights?.target,null,{timeout:120000});
 await page.evaluate(()=>{const g=window.__game;g.showThreatCodex();const c=g.scenes.threatCodex;c.categoryIndex=7;c.entryIndex=0;c.init();});await shot('07-codex-boss');
 await page.evaluate(()=>{const c=window.__game.scenes.threatCodex;c.categoryIndex=0;c.entryIndex=0;c.init();});await shot('08-codex-enemy');
 await page.evaluate(()=>window.__game.showShipSelect());await page.waitForFunction(()=>window.__game.scenes.shipSelect?.shipCards?.length===30,null,{timeout:120000});
 await page.evaluate(()=>window.__game.scenes.shipSelect.navigateTo(28));await shot('09-hangar-railbreaker');
 report.runtime=await app.evaluate(({app})=>({packaged:app.isPackaged,userData:app.getPath('userData')}));assert.ok(report.runtime.packaged);assert.equal(report.runtime.userData,path.join(out,'profile'));assert.deepEqual(report.errors,[]);report.status='passed';
}finally{writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await app.close().catch(()=>{});log.end();}
