import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.CHECK_OUTPUT_DIR||'E:/Codex/builds/nova-swarm/encounter-pacing/qa';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>/^https?:\/\/127\.0\.0\.1/.test(r.request().url())?r.continue():r.abort());
 await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=> 'mystery:all'};});
 await page.goto((process.env.CHECK_URL||'http://127.0.0.1:5218')+'/?skipIntro=1&offlineLeaderboard=1',{waitUntil:'domcontentloaded',timeout:120000});
 await launchEncounterTestFromHangar(page);
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.waves?.length===57,null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play,m=p.enemyManager;g.app.ticker.stop();m.clearEnemies();m.state='SCORE_QA';
  const {EncounterScorePacing}=await import('/src/managers/EncounterScorePacing.js');
  const {createMysteryEncounter}=await import('/src/entities/mysteries/createMysteryEncounter.js');
  const {AudioManager}=await import('/src/audio/AudioManager.js');AudioManager.enabled=false;AudioManager.stopAllVoices();
  const check=(ok,msg)=>{if(!ok)throw Error(msg);};
  g.level=m.level=20;g.runElapsedSeconds=0;g.score=0;g.encounterScoreLog=[];
  const pace=m.encounterScorePacing=new EncounterScorePacing(m);
  for(let i=0;i<200;i++){g.runElapsedSeconds+=.1;g.addBonusScore(60);pace.update();}
  check(Math.abs(pace.referenceRate()-600)<1,'Real game ordinary reference');
  const e=await createMysteryEncounter(m,'needle_saint');pace.update();const start=g.score;
  for(let i=0;i<200;i++){g.runElapsedSeconds+=.1;pace.update();}check(g.score===start,'No idle reward');
  for(let i=0;i<200;i++){
   g.runElapsedSeconds+=.1;const killed=p.applyCombatDamage(e,e.maxHealth/199.99,'primary');
   if(killed)p.onEnemyKilled(e);pace.update();
  }
  const earned=g.score-start,receipt=g.encounterScoreLog.at(-1);check(e.health<=0,'Actual root defeated');
  check(earned>=11900,'Score pace protected through actual damage and award paths');
  check(receipt?.compensation>0,'Compensation recorded once');
  const final=g.score;for(let i=0;i<200;i++){g.runElapsedSeconds+=.1;pace.update();}check(g.score===final,'No repeated completion reward');
  m.clearEnemies();check(!pace.group,'Cleanup');return {earned,receipt,bonusScore:g.bonusScore};
 });
 assert.deepEqual(errors,[]);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/score-runtime.json',JSON.stringify({result,errors},null,2));console.log('PASS',JSON.stringify(result));
}finally{await browser.close();}
