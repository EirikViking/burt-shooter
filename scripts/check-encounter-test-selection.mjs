import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {initializeBossEncounterTest} from '../src/config/BossEncounterTest.js';
import ids from '../electron/mysteryTestIds.json' with {type:'json'};
import {chooseEncounterTestShip,launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
for(const id of ['mystery:all',...ids.map(id=>'mystery:'+id),'dual-boss','boss-snake']){
 globalThis.window={__novaEncounterTest:{getPreset:async()=>id}};
 const p=await initializeBossEncounterTest();assert.equal(p.sector,30);assert.equal(p.baselineAugmentIds.length,5);
 if(id==='mystery:all')assert.equal(p.mysteryIds.length,56);
}
for(const id of [undefined,'mystery:invalid','invalid']){
 globalThis.window={__novaEncounterTest:{getPreset:async()=>id}};assert.equal(await initializeBossEncounterTest(),null);
}
const out=process.env.CHECK_OUTPUT_DIR||'E:/Codex/builds/nova-swarm/veilborn-test-30/selection';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{
 for(const preset of [null,'mystery:choir_unbound']){
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>/^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(r.request().url())?r.continue():r.abort());
  if(preset)await page.addInitScript(preset=>{window.__novaEncounterTest={getPreset:async()=>preset};},preset);
  await page.goto((process.env.CHECK_URL||'http://127.0.0.1:5218')+'/?skipIntro=1&offlineLeaderboard=1&nova-mystery-test=all',{waitUntil:'domcontentloaded',timeout:120000});
  if(!preset){
   await page.waitForFunction(()=>window.__game?.currentSceneName==='menu',null,{timeout:120000});
   await page.evaluate(()=>window.__game.showShipSelect());
  }
  const ship=await chooseEncounterTestShip(page,preset?'Pixel Needle':'Eirik the Viking');
  const before=await page.evaluate(async()=>{
   const {isShipUnlocked,getSelectableShips}=await import('/src/config/ShipMetadata.js');
   return getSelectableShips().filter(s=>isShipUnlocked(s.spriteKey)).map(s=>s.spriteKey);
  });
  assert.ok(before.length<30,'Normal progression remains locked even inside test session');
  if(preset){
   assert.match(ship.readyText,/30\/30/);await launchEncounterTestFromHangar(page);
   await page.waitForFunction(()=>window.__game.scenes.play?.enemyManager?.waves?.length===2,null,{timeout:120000});
   const state=await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;return {ship:g.selectedShipSpriteKey,sector:g.level,managerSector:p.enemyManager.level,mode:g.runMode,policy:g.runPolicy,id:p.enemyManager.mysteryDirector.plan.id};});
   assert.equal(state.ship,ship.spriteKey);assert.equal(state.sector,30);assert.equal(state.managerSector,30);assert.equal(state.mode,'unranked');assert.equal(state.id,'choir_unbound');
   for(const [key,value]of Object.entries(state.policy))if(key.startsWith('allow'))assert.equal(value,false,key);
   const after=await page.evaluate(async()=>{const m=await import('/src/config/ShipMetadata.js');return m.getSelectableShips().filter(s=>m.isShipUnlocked(s.spriteKey)).map(s=>s.spriteKey);});
   assert.deepEqual(after,before);results.push({preset,name:ship.name,state});
  }else{
   assert.ok(!before.includes(ship.spriteKey));await page.keyboard.press('Enter');
   assert.equal(await page.evaluate(()=>window.__game.currentSceneName),'shipSelect','Normal locked ship cannot launch');
   assert.equal(await page.evaluate(async()=>{const {getBossEncounterTest}=await import('/src/config/BossEncounterTest.js');return getBossEncounterTest();}),null,'URL cannot activate trusted test');
   results.push({preset,name:ship.name,normalUnlocks:before.length});
  }
  await page.screenshot({path:out+'/'+(preset?'selected-combat':'normal-locked')+'.png'});assert.deepEqual(errors,[]);await page.close();
 }
 fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));console.log('PASS 59 level-30 presets; real ship choice; normal locks; unranked isolation',JSON.stringify(results));
}finally{await browser.close();}
