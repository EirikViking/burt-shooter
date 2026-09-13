import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.env.COMPACT_CODEX_OUT || 'test-results/core-serpent-compact-codex-final';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={errors:[],screens:[]};
try{
 const context=await browser.newContext({viewport:{width:960,height:540}});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/api/highscores')return r.fulfill({status:200,contentType:'application/json',body:'[]'});return ['localhost','127.0.0.1'].includes(u.hostname)||['data:','blob:'].includes(u.protocol)?r.continue():r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:4399/?offlineLeaderboard=1',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await page.evaluate(async()=>{const {recordThreatSeen}=await import('/src/progression/ThreatDiscoveryState.js');const {getThreatCodexCatalog}=await import('/src/config/ThreatCodexCatalog.js');for(const cat of ['bonusCores','spaceSnakes'])for(const e of getThreatCodexCatalog()[cat])recordThreatSeen(e.id,cat,{name:e.name});});
 for(const locale of ['en','de','zh-CN','ru','es','pt-BR','ko','ja'])for(const category of ['bonusCores','spaceSnakes']){
  await page.evaluate(async({locale,category})=>{await window.__novaI18n.setLanguagePreference(locale);const g=window.__game;g.switchScene('threatCodex');const c=g.scenes.threatCodex;for(let i=0;i<14;i++){c.categoryIndex=i;if(c.getCategory().id===category)break;}c.entryIndex=0;c.detailScrollOffset=0;c.init();},{locale,category});await page.waitForTimeout(450);
  const d=await page.evaluate(()=>{const c=window.__game.scenes.threatCodex;return{body:c.lastDetailBodyDebug,panel:c.lastDetailPanelDebug,scale:c.layoutScale};});
  assert.ok(d.body.y+d.body.height < d.panel.y+d.panel.height-92,'Story must end above the tip');
  assert.ok((d.panel.y+d.panel.height)*d.scale<=540);
  await page.screenshot({path:`${out}/${locale}-${category}-960.png`});report.screens.push({locale,category,...d});
 }
 const b=await page.evaluate(()=>{const c=window.__game.scenes.threatCodex;return{...c.lastDetailBodyDebug,scale:c.layoutScale};});assert.ok(b.scrollable);
 await page.mouse.move((b.x+b.width/2)*b.scale,(b.y+b.height/2)*b.scale);await page.mouse.wheel(0,500);await page.waitForTimeout(150);
 assert.ok(await page.evaluate(()=>window.__game.scenes.threatCodex.detailScrollOffset>0),'Wheel must track scaled story');
 const rail=await page.evaluate(()=>{const c=window.__game.scenes.threatCodex;return{...c.lastDetailScrollbarDebug,scale:c.layoutScale};});
 await page.mouse.move((rail.x+rail.width/2)*rail.scale,(rail.y+5)*rail.scale);await page.mouse.down();await page.mouse.move((rail.x+rail.width/2)*rail.scale,(rail.y+rail.height-2)*rail.scale,{steps:8});await page.mouse.up();
 assert.ok(await page.evaluate(()=>{const c=window.__game.scenes.threatCodex;return c.detailScrollOffset>=c.lastDetailBodyDebug.maxOffset*.85;}),'Scaled scrollbar drag must reach the story end');
 await page.setViewportSize({width:960,height:600});await page.evaluate(()=>window.__game.scenes.threatCodex.init());await page.waitForTimeout(300);await page.screenshot({path:`${out}/ja-snakes-960x600.png`});
 assert.deepEqual(report.errors,[]);report.status='passed';console.log('PASS 16 compact Codex screens, story bounds, mouse wheel and scrollbar drag');
}catch(e){report.status='failed';report.failure=e.stack;throw e;}finally{writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
