import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.CHECK_OUTPUT_DIR||'E:/Codex/builds/nova-swarm/encounter-pacing/codex';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>/^https?:\/\/127\.0\.0\.1/.test(r.request().url())?r.continue():r.abort());
 await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=> 'mystery:all'};});
 await page.goto((process.env.CHECK_URL||'http://127.0.0.1:5218')+'/?skipIntro=1&offlineLeaderboard=1',{waitUntil:'domcontentloaded',timeout:120000});
 await launchEncounterTestFromHangar(page);
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.waves?.length===57,null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play,m=p.enemyManager;g.app.ticker.stop();m.clearEnemies();m.state='CODEX_QA';
  const {getThreatCodexCatalog,THREAT_CODEX_CATEGORIES}=await import('/src/config/ThreatCodexCatalog.js');
  const {readThreatDiscoveryState}=await import('/src/progression/ThreatDiscoveryState.js');
  const {ThreatCodexScene}=await import('/src/scenes/ThreatCodexScene.js');
  const {createMysteryEncounter}=await import('/src/entities/mysteries/createMysteryEncounter.js');
  const {mysteryAssetDiagnostics}=await import('/src/entities/mysteries/MysteryAssets.js');
  const {AudioManager}=await import('/src/audio/AudioManager.js');AudioManager.enabled=false;AudioManager.stopAllVoices();
  const check=(ok,msg)=>{if(!ok)throw Error(msg);};
  const locales=['en','de','es','pt-BR','ru','zh-CN','ko','ja'];
  for(const locale of locales){const rows=getThreatCodexCatalog(locale).mysteries;check(rows.length===56,'Roster');check(rows.every(r=>r.description&&r.tip),'Copy');}
  const before=JSON.stringify(readThreatDiscoveryState().items.mysteries);
  const c=window.__codexQA=new ThreatCodexScene(g);c.categoryIndex=THREAT_CODEX_CATEGORIES.findIndex(c=>c.id==='mysteries');c.init();
  check(JSON.stringify(readThreatDiscoveryState().items.mysteries)===before,'Browsing reveals no entries');
  check(!mysteryAssetDiagnostics().some(r=>r.refs>0),'Locked entries load no secret atlas');
  // All writes remain inside this disposable browser profile; network is blocked.
  p.areRunRewardsSuppressed=()=>false;g.isRankedRun=()=>true;g.isDailySignalRun=()=>false;
  g.level=m.level=20;const score=g.score,e=await createMysteryEncounter(m,'glass_widow');
  check(readThreatDiscoveryState().items.mysteries.glass_widow.timesSeen===1,'Actual arrival discovery');
  check(g.score===score,'Discovery adds no unintended score');
  e.takeDamage(e.maxHealth*2);p.onEnemyKilled(e);p.onEnemyKilled(e);p.processDeferredThreatDefeats(100);
  check(readThreatDiscoveryState().items.mysteries.glass_widow.timesDefeated===1,'One root defeat; no duplicate/part kill');
  m.clearEnemies();c.entryIndex=0;c.init();
  g.app.stage.removeChildren();g.app.stage.addChild(c.container);g.app.renderer.render(g.app.stage);
  return {locales,entries:56,discovery:readThreatDiscoveryState().items.mysteries.glass_widow};
 });
 for(const locale of result.locales){
  await page.evaluate(async locale=>{const {setLanguagePreference}=await import('/src/i18n/index.js');await setLanguagePreference(locale);const g=window.__game,c=window.__codexQA;c.init();g.app.renderer.render(g.app.stage);},locale);
  await page.waitForTimeout(800);await page.evaluate(()=>window.__game.app.renderer.render(window.__game.app.stage));
  await page.screenshot({path:`${out}/${locale}.png`});
 }
 const refs=await page.evaluate(async()=>{window.__codexQA.cleanup();await new Promise(r=>setTimeout(r,100));const {mysteryAssetDiagnostics}=await import('/src/entities/mysteries/MysteryAssets.js');return mysteryAssetDiagnostics().reduce((n,r)=>n+r.refs,0);});
 assert.equal(refs,0);assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify({result,refs,errors},null,2));console.log('PASS',JSON.stringify(result));
}finally{await browser.close();}
