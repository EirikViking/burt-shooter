import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='test-results/celebration-polish';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}});
const report={errors:[],checks:[]};page.on('pageerror',e=>report.errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:5192/?offlineLeaderboard=1',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__game?.scenes.menu?.astraMenuShip?.ready,null,{timeout:180000});
 await page.waitForTimeout(3000);await page.screenshot({path:`${out}/menu-tip.png`});
 report.tip=await page.evaluate(()=>({count:localStorage.getItem('nova_audio_tip_launches_v1'),present:!!window.__game.scenes.menu.launchAudioTip}));assert.equal(report.tip.count,'1');assert.ok(report.tip.present);
 await page.evaluate(()=>{window.__game.scenes.menu.launchHome.openModes();window.__game.scenes.menu.openShipSelect();});
 await page.waitForFunction(()=>window.__game.currentSceneName==='shipSelect',null,{timeout:120000});
 await page.evaluate(()=>window.__game.scenes.shipSelect.returnToMenu('qa'));
 await page.waitForFunction(()=>window.__game.currentSceneName==='menu');
 assert.equal(await page.evaluate(()=>window.__game.scenes.menu.launchHome.surface),'home');
 assert.equal(await page.evaluate(()=>localStorage.getItem('nova_audio_tip_launches_v1')),'1');report.checks.push('Hangar Back -> home; no extra launch count');
 await page.evaluate(async()=>{const {recordThreatSeen}=await import('/src/progression/ThreatDiscoveryState.js');const {BOSS_SUPPORT_SHIPS}=await import('/src/config/BossSupportShips.js');for(const e of BOSS_SUPPORT_SHIPS)recordThreatSeen(e.id,'enemies');window.__game.showThreatCodex();});
 for(const category of ['enemies','bonusDrones','bonusCores','augments','spaceSnakes']) {
   report[category]=await page.evaluate(async category=>{const s=window.__game.scenes.threatCodex;const {THREAT_CODEX_CATEGORIES}=await import('/src/config/ThreatCodexCatalog.js');const {recordThreatSeen}=await import('/src/progression/ThreatDiscoveryState.js');s.categoryIndex=THREAT_CODEX_CATEGORIES.findIndex(c=>c.id===category);let entries=s.getEntriesForCategory();const entry=category==='enemies'?entries.find(e=>e.id.startsWith('boss_support_ship_')):entries[0];recordThreatSeen(entry.id,category);entries=s.getEntriesForCategory();s.entryIndex=entries.findIndex(e=>e.id===entry.id);s.refresh();return {id:entry.id,source:entry.art};},category);
   await page.waitForTimeout(5000);await page.screenshot({path:`${out}/codex-${category}.png`});
 }
 await page.evaluate(()=>window.__game.showMenu());await page.waitForFunction(()=>window.__game.currentSceneName==='menu');
 await page.evaluate(()=>{window.__game.scenes.menu.launchHome.buttons.launchTactical.activate();});await page.waitForFunction(()=>window.__game.scenes.play?.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:180000});
 await page.evaluate(()=>window.__game.markUnrankedRun?.('debug_celebration_polish'));
 report.heal=await page.evaluate(async()=>{const {Boss}=await import('/src/entities/Boss.js');const results=[];for(const [health,amount,source]of[[200,200,'boss_fuel_ship'],[550,200,'boss_fuel_ship'],[600,200,'boss_fuel_ship'],[800,200,'boss_fuel_ship'],[800,200,'unknown']]){const b={active:true,health,maxHealth:1000,updateHealthBar(){},applyRecoveryPause(){}};const healed=Boss.prototype.heal.call(b,amount,{source});results.push({health:b.health,healed});}return results;});
 assert.deepEqual(report.heal.map(r=>r.health),[400,600,600,800,1000]);
 await page.screenshot({path:`${out}/lives.png`});
 await page.evaluate(()=>window.__game.scenes.play.triggerOverrunClearCelebration({nextSector:11,milestoneSector:10,clearBonus:10000,livesBonus:5000}));await page.waitForTimeout(3500);await page.screenshot({path:`${out}/overrun.png`});
 await page.evaluate(()=>window.__game.scenes.play.confirmOverrunInterlude?.('qa'));await page.waitForTimeout(3000);
 report.checks.push('Support heals respect 60% cap without reducing HP');
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;throw e;}finally{fs.writeFileSync(`${out}/focused.json`,JSON.stringify(report,null,2));await browser.close();}

