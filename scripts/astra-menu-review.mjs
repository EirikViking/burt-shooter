import { chromium } from 'playwright';
import { mkdirSync,writeFileSync } from 'node:fs';
const label=process.argv[2]||'before',out=`test-results/astra-menu-${label}`;mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const report={label,errors:[],captures:[]};
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.route('**/*',r=>/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.request().url())||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4399'}/?offlineLeaderboard=1`);
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.backdrop?.texture,null,{timeout:120000});
 async function shot(name){await page.waitForTimeout(1200);await page.screenshot({path:`${out}/${name}.png`});report.captures.push(name);writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(name);}
 await shot('01-main');
 await page.evaluate(()=>window.__game.scenes.menu.openSettingsOverlay());await shot('02-settings');
 await page.evaluate(()=>window.__game.scenes.menu.closeSettingsOverlay());
 await page.evaluate(()=>window.__game.scenes.menu.openHowToPlayOverlay());await shot('03-help');
 await page.evaluate(()=>window.__game.scenes.menu.closeHowToPlayOverlay());
 await page.evaluate(()=>window.__game.showShipSelect());await shot('04-hangar');
 await page.evaluate(()=>window.__game.switchScene('achievements'));await shot('05-achievements');
 await page.evaluate(()=>window.__game.switchScene('highscore'));await shot('06-leaderboard');
 await page.evaluate(async()=>{
  const {THREAT_DISCOVERY_KEY,invalidateThreatDiscoveryStateCache,normalizeThreatDiscoveryState,writeThreatDiscoveryState}=await import('/src/progression/ThreatDiscoveryState.js');
  const {getThreatCodexCatalog}=await import('/src/config/ThreatCodexCatalog.js');
  const catalog=getThreatCodexCatalog();const items={};
  for(const [category,entries]of Object.entries(catalog)){if(!Array.isArray(entries))continue;items[category]={};for(const e of entries)items[category][e.id]={timesSeen:5,timesDefeated:2,discoveredAt:Date.now(),lastSeenAt:Date.now(),unread:false};}
  localStorage.setItem(THREAT_DISCOVERY_KEY,JSON.stringify({version:1,items}));invalidateThreatDiscoveryStateCache();
 });
 await page.reload();await page.waitForFunction(()=>window.__game?.scenes?.menu?.backdrop?.texture,null,{timeout:120000});
 await page.evaluate(async()=>{
  window.__game.showThreatCodex();const c=window.__game.scenes.threatCodex;
  const {THREAT_CODEX_CATEGORIES}=await import('/src/config/ThreatCodexCatalog.js');c.categoryIndex=THREAT_CODEX_CATEGORIES.findIndex(x=>x.id==='bosses');c.entryIndex=0;c.init();
 });await shot('07-codex-boss');
 await page.evaluate(()=>{const c=window.__game.scenes.threatCodex;c.categoryIndex=0;c.entryIndex=0;c.init();});await shot('08-codex-enemy');
 await page.evaluate(()=>window.__game.switchScene('menu'));
 await page.evaluate(()=>window.__game.startGame(window.__game.selectedShipSpriteKey));
 await page.waitForFunction(()=>window.__game.scenes.play?.player?.shipSprite?.texture,null,{timeout:120000});await page.waitForTimeout(2500);
 await page.keyboard.press('p');await shot('09-pause');
 if(report.errors.length)throw new Error(report.errors.join('\n'));
}finally{await browser.close();}
