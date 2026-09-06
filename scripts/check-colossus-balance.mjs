import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='test-results/colossus-balance';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const reports=[];
try{
 for(const classic of [true,false]){
  const page=await browser.newPage();
  await page.route('**/*',r=>/^(https?:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url())?r.continue():r.abort());
  const url=new URL(process.env.CHECK_URL||'http://127.0.0.1:4399');url.searchParams.set('offlineLeaderboard','1');if(classic)url.searchParams.set('bossEncounter','previous');
  await page.goto(url.href,{waitUntil:'domcontentloaded'});
  // Both branches must have the same fully loaded texture bank. Racing the asset
  // loader selects different Bullet constructor paths and invalidates RNG parity.
  await page.waitForFunction(()=>document.body.dataset.menuReady==='1',null,{timeout:120000});
  const report=await page.evaluate(async()=>{
   const {Boss}=await import('/src/entities/Boss.js');
   const {BOSS_REINVENTION_ENABLED:BOSS_ARSENAL_ENABLED}=await import('/src/config/BossReinvention.js');
   const {AudioManager}=await import('/src/audio/AudioManager.js');
   const {PlayScene}=await import('/src/scenes/PlayScene.js');
   AudioManager.playSfx=()=>{};AudioManager.stopSfxGroup=()=>{};
   const originalRandom=Math.random,originalNow=Date.now;let seed=1,calls=0;
   Math.random=()=>{calls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};Date.now=()=>100000;
   const results=[];
   try{
    for(const level of Array.from({length:50},(_,i)=>i+1))for(const phase of [1,2,3])for(const category of ['regular','signature']){
     seed=137;calls=0;const projectiles=[],adds=[];
     const game={level,getWidth:()=>1920,getHeight:()=>1080,scenes:{},getRunModeConfig:()=>({}),threatResponse:{}};
     const play={game,gameplayGame:game,player:{x:1060,y:900,radius:12,active:true},bossHazards:[],
      enemyManager:{spawnBossAdds:n=>adds.push(n)},bulletManager:{addEnemyBullet:b=>projectiles.push(b)},
      enqueueToast:()=>{},cancelNotificationById:()=>0,
      registerBossHazardFromBoss:PlayScene.prototype.registerBossHazardFromBoss,
      capBossHazardForHighSector:h=>h,playBossHazardFireSfx:()=>{}};
     game.scenes.play=play;
     const b=new Boss(960,250,level,game);b.phase=phase;b.moveTimer=180;b.entryStartMs=0;b.regularAttackReadyAt=0;b.shootCooldown=0;
     b.updateRegularAttackTelegraphVisual=()=>{};b.updateTelegraphVisual=()=>{};b.triggerFirePresentation=()=>{};
     b.clearTelegraphVisual=()=>{};b.clearRegularAttackTelegraphVisual=()=>{};
     if(category==='regular')b.startRegularAttackTelegraph(play.player.x,play.player.y);else b.startSignatureTelegraph(b.getSignatureForPhase(phase),play.player.x,play.player.y);
     const token=b.attackWarningToken;
     const warning={duration:token.durationMs,angle:token.lockedAngle,safe:structuredClone(b.safeLanes),attack:token.attackProfile};
     b.setAttackWarningVisibleElapsedForDebug(token.durationMs);
     if(category==='regular')projectiles.push(...b.shoot(play.player.x,play.player.y));else b.releaseSignatureAttackWarning(play.player.x,play.player.y);
     const emitted=projectiles.map(q=>({x:q.x,y:q.y,vx:q.vx,vy:q.vy,radius:q.radius,damage:q.damage,behavior:q.behavior,accel:q.accel,phase:q.behaviorPhase,style:q.sourceFireStyle}));
     const delays=projectiles.map(q=>q.colossusLaunchDelayMs||0);
     for(const q of projectiles)if(q.colossusLaunchRemainingMs>0)q.update(q.colossusLaunchRemainingMs/16.67);
     const paths=[];for(let frame=0;frame<120;frame++){for(const bullet of projectiles)bullet.update(1);if(frame%15===0)paths.push(projectiles.map(q=>({x:q.x,y:q.y,vx:q.vx,vy:q.vy,active:q.active})));}
     const hazards=play.bossHazards.map(({arsenalArchetype,...h})=>h);
     results.push({level,phase,category,warning,emitted,paths,hazards,delays,adds,rngCalls:calls,health:b.maxHealth});
     for(const bullet of projectiles)bullet.sprite.destroy({children:true});
    }
   }finally{Math.random=originalRandom;Date.now=originalNow;}
   return {enabled:BOSS_ARSENAL_ENABLED,results};
  });
  reports.push(report);await page.close();
 }
 assert.equal(reports[0].enabled,false);assert.equal(reports[1].enabled,true);
 assert.equal(reports[1].results.length,reports[0].results.length);
 let delayed=0,fronts=0;
 for(let i=0;i<reports[0].results.length;i++){
  const {hazards:beforeHazards,delays:beforeDelays,...before}=reports[0].results[i];
  const {hazards:afterHazards,delays:afterDelays,...after}=reports[1].results[i];
  assert.deepEqual(after,before,`case ${i}: ammunition, damage, warnings, health, summons, RNG and flight-age trajectories`);
  assert.equal(afterHazards.length,beforeHazards.length);
  for(let j=0;j<afterHazards.length;j++){
   const {colossus,durationMs,angle,...geometry}=afterHazards[j];
   const {durationMs:oldDuration,angle:oldAngle,...oldGeometry}=beforeHazards[j];
   assert.deepEqual(geometry,oldGeometry,`case ${i}: spatial limits and arming unchanged`);
   assert.ok(colossus);assert.equal(colossus.legacyDurationMs,oldDuration);
   assert.equal(colossus.legacyActiveMs,oldDuration-oldGeometry.armingMs);
   assert.equal(durationMs,oldGeometry.armingMs+colossus.travelMs);
   if(angle!==undefined)assert.equal(angle,after.warning.angle??oldAngle);
   fronts++;
  }
  assert.equal(afterDelays.length,beforeDelays.length);
  for(const d of afterDelays){assert.ok(d>=0&&d<=270);if(d)delayed++;}
 }
 assert.ok(delayed>100);assert.ok(fronts>100);

 writeFileSync(`${out}/report.json`,JSON.stringify({ok:true,cases:reports[0].results.length,framesPerCase:120,delayed,fronts,previous:reports[0],colossus:reports[1]},null,2));
 console.log(`PASS ${reports[0].results.length} reinvented attack cases: same budgets and flight-age trajectories, changed launch timing and moving fields`);
}finally{await browser.close();}
