import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='test-results/direction-pace';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],captures=[];
try{
 const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4413/?offlineLeaderboard=1');
 await page.waitForFunction(()=>document.body.dataset.menuReady==='1',null,{timeout:120000});
 await page.evaluate(()=>window.__game.scenes.menu.quickStartRun('ranked_tactical'));
 await page.waitForFunction(()=>window.__game.scenes.play.player?.active,null,{timeout:120000});await page.waitForTimeout(2500);
 await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.markUnrankedRun('direction_pace_qa');p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);p.player.invulnerable=true;p.player.invulnerableTime=1e9;p.clearPendingEnemyStart();p.clearToastState();p.enemyManager.forceClearAllEnemies();p.enemyManager.level=2;p.enemyManager.currentWaveIndex=1;p.enemyManager.state='WAVE_ACTIVE';p.enemyManager.phase='NORMAL';const type=p.enemyManager.generateWaves(2).find(w=>!w.isChallenge&&w.type!=='BOSS').type;p.enemyManager.update=(delta,x,y)=>{for(const e of p.enemyManager.enemies)e.update(delta,x,y);};p.enemyManager.spawnWave({type,count:8,formation:'ARC',entry:'split',sourceLevel:2});});
 for(const [label,wait]of [['entry-early',700],['entry-middle',1000],['entry-late',1000]]){await page.waitForTimeout(wait);await page.screenshot({path:`${out}/${label}.png`});captures.push({label,state:await page.evaluate(()=>window.__game.scenes.play.enemyManager.enemies.filter(e=>e.entryCurve).map(e=>({state:e.state,duration:e.entryCurve.duration,elapsed:Date.now()-e.entryCurve.startTime})))});}
 assert.ok(captures[0].state.length);assert.ok(captures.flatMap(c=>c.state).every(e=>e.duration>=2400));assert.ok(captures[1].state.some(e=>e.state==='ENTRY'));
 await page.keyboard.down('Space');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(750);await page.keyboard.up('ArrowLeft');await page.keyboard.up('Space');
 for(const family of ['forge','mirror']){
  await page.evaluate(async family=>{const g=window.__game,p=g.scenes.play;g.app.ticker.stop();p.enemyManager.forceClearAllEnemies();p.clearToastState();p.introActive=false;const {Boss}=await import('/src/entities/Boss.js');const {BOSS_ROSTER}=await import('/src/config/BossRoster.js');const {configureColossusAssault}=await import('/src/config/ColossusAssault.js');const {preloadColossusVfx}=await import('/src/effects/ColossusAssaultVfx.js');await preloadColossusVfx();const w=p.gameplayGame.getWidth(),h=p.gameplayGame.getHeight();const profile=BOSS_ROSTER.find(b=>b.archetype===family);const b=new Boss(w*.6,h*.26,2,p.gameplayGame,profile);await b.createSprite();b.phase=2;b.x=w*.6;b.y=h*.26;b.sprite.position.set(b.x,b.y);b.updateBossAnimation(0,w*.4,h*.85);p.enemyManager.boss=b;p.enemyManager.enemies.push(b);p.gameContainer.addChild(b.sprite);const hazard={kind:'beam',sourceX:b.x,sourceY:b.y+18,angle:1.82,length:h*.72,radius:20,spread:.1,armingMs:240,durationMs:500,color:b.color};configureColossusAssault(hazard,b);window.__directionHazard=hazard;},family);
  for(const [label,age]of [['near',90],['middle',350],['far',630]]){
   await page.evaluate(age=>{const g=window.__game,p=g.scenes.play,h=window.__directionHazard;h.elapsedMs=h.armingMs+age;p.bossHazardLayer.clear();p.drawBossHazard(h,h.elapsedMs/h.durationMs);g.app.renderer.render(g.app.stage);},age);await page.screenshot({path:`${out}/${family}-${label}.png`});
  }
  // Actual wall-clock animation using the game's renderer, with a staged attack.
  await page.evaluate(async()=>{const g=window.__game,p=g.scenes.play,h=window.__directionHazard;const start=performance.now();await new Promise(resolve=>{function frame(now){const elapsed=now-start;h.elapsedMs=elapsed%h.durationMs;p.bossHazardLayer.clear();p.drawBossHazard(h,h.elapsedMs/h.durationMs);g.app.renderer.render(g.app.stage);if(elapsed<4000)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});});
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/visual.json`,JSON.stringify({ok:true,errors,captures,note:'Actual source game, staged wave and attack, isolated QA input; video uses wall-clock animation.'},null,2));await context.close();
}finally{await browser.close();}
console.log('PASS visible varied slow entrances and outward Sam/Tyrian hazard captures');
