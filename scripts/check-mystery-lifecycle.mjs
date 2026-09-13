import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { MYSTERIES } from '../src/config/Mysteries.js';
const out=process.env.CHECK_OUTPUT_DIR || 'test-results/mysteries/lifecycle';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],rows=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,180));});
await page.route('**/*',r=>/^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(r.request().url())?r.continue():r.abort());
await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=> 'mystery:witness'};});
try {
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5213'}/?skipIntro=1&offlineLeaderboard=1`,{waitUntil:'domcontentloaded',timeout:120000});
 await launchEncounterTestFromHangar(page);
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.mysteryDirector?.active || document.body.innerText.includes('GAME FREEZE DETECTED'),null,{timeout:120000});
 if((await page.locator('body').innerText()).includes('GAME FREEZE DETECTED')){
   console.log('Cold source watchdog fired; retrying warmed resources.');await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.mysteryDirector?.active,null,{timeout:120000});
 }
 const launch=await page.evaluate(()=>{const g=window.__game,p=g.scenes.play,m=p.enemyManager;g.app.ticker.stop();p.inputManager.isFiring=()=>false;p.isDebugInvincibleActive=()=>true;return{id:m.mysteryDirector.active.type,ranked:g.isRankedRun(),test:g.encounterTest,state:m.state,boss:m.boss?.active,waves:m.waves.length};});
 assert.equal(launch.id,'witness');assert.equal(launch.ranked,false);assert.equal(launch.waves,1);assert.ok(!launch.boss);
 for(const profile of MYSTERIES){
   const row=await page.evaluate(async profile=>{
     const g=window.__game,p=g.scenes.play,m=p.enemyManager;
     m.clearEnemies();p.clearEnemyBullets();p.clearBossHazards();
     g.encounterTest={...g.encounterTest,mysteryId:profile.id};g.level=m.level=Math.max(31,profile.unlockSector);
     m.waves=[{type:'grunt',count:6}];m.currentWaveIndex=0;m.phase='WAVES';m.state='WAVE_ACTIVE';m.waveEnding=false;
     m.pendingMayhemReinforcement=null;m.mysteryDirector.startLevel();m.spawnWave(m.waves[0]);
     const pending=m.mysteryDirector.pending;
     for(let i=0;i<300 && !pending.ready && !pending.error;i++)await new Promise(r=>setTimeout(r,20));
     if(!pending.ready)throw Error(`${profile.id} failed to load: ${pending.error?.message}`);
     p.setPaused(true);const pendingAge=pending.age;p.update(6);const paused=pending.age===pendingAge;p.setPaused(false);
     for(let i=0;i<50&&!m.mysteryDirector.active;i++)m.update(1);
     const root=m.mysteryDirector.active;if(!root)throw Error(`${profile.id} not attached`);
     const before=g.score;let maxBullets=0,maxZones=0;
     for(let i=0;i<Math.ceil((root.definition.escapeSeconds||48)*60)+120 && root.active;i++){
       p.player.x=g.getWidth()*(.5+Math.sin(i*.025)*.38);p.player.y=g.getHeight()*.82;
       m.update(1);p.bulletManager.update(1);
       maxBullets=Math.max(maxBullets,p.bulletManager.enemyBullets.filter(b=>b.active).length);maxZones=Math.max(maxZones,root.zones.length);
       if(i===600){const age=root.age;p.setPaused(true);p.update(1);if(root.age!==age)throw Error('Pause advances encounter');p.setPaused(false);}
     }
     m.update(1);const terminal=m.state,remaining=m.enemies.filter(e=>e.active).length,escapedScore=g.score-before;
     const {mysteryAssetDiagnostics}=await import('/src/entities/mysteries/MysteryAssets.js');
     const {MysteryAudio}=await import('/src/audio/MysteryAudio.js');MysteryAudio.stopAll();
     const row={id:profile.id,paused,outcome:root.stats.outcome,attacks:root.stats.attacks,warnings:root.stats.warnings,terminal,remaining,escapedScore,maxBullets,maxZones,refs:mysteryAssetDiagnostics().reduce((n,r)=>n+r.refs,0),audio:MysteryAudio.diagnostics()};
     m.clearEnemies();return row;
   },profile);
   rows.push(row);writeFileSync(`${out}/results.json`,JSON.stringify({launch,rows,errors},null,2));
   assert.equal(row.outcome,'escaped');assert.equal(row.terminal,'MYSTERY_TEST_COMPLETE');assert.equal(row.remaining,0);assert.equal(row.escapedScore,0);assert.equal(row.refs,0);
   assert.ok(row.paused&&row.attacks>0&&row.warnings>0);assert.ok(row.maxBullets<=80&&row.maxZones<=18);assert.equal(row.audio.voices,0);assert.deepEqual(errors,[]);
   console.log(JSON.stringify(row));
 }
}finally{await browser.close();}
