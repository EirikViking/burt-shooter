import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='test-results/flight-revision';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={errors:[],modes:[]};
try {
 for(const previous of [true,false]) {
  const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4407'}/?offlineLeaderboard=1${previous?'&flight=previous':''}`);
  await page.waitForFunction(()=>document.body.dataset.menuReady==='1',null,{timeout:120000});
  await page.evaluate(()=>window.__game.scenes.menu.quickStartRun('ranked_tactical'));
  await page.waitForFunction(()=>window.__game?.scenes.play?.player?.active,null,{timeout:120000});
  await page.waitForTimeout(2400);
  await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.markUnrankedRun('flight_qa');p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);p.player.invulnerable=true;p.player.invulnerableTime=1e9;p.clearPendingEnemyStart();p.enemyManager.forceClearAllEnemies();p.enemyManager.level=8;p.enemyManager.currentWaveIndex=1;p.enemyManager.state='WAVE_ACTIVE';p.enemyManager.phase='NORMAL';p.clearToastState();const generated=p.enemyManager.generateWaves(8).find(w=>!w.isChallenge&&w.type!=='BOSS');p.enemyManager.update=(delta,x,y)=>{for(const enemy of p.enemyManager.enemies)enemy.update(delta,x,y);};p.enemyManager.spawnWave({type:generated.type,formation:'ARC',count:12,entry:'split',sourceLevel:8});});
  await page.waitForTimeout(900);
  await page.screenshot({path:`${out}/wave-${previous?'before':'after'}.png`});
  const wave=await page.evaluate(()=>window.__game.scenes.play.enemyManager.enemies.filter(e=>e.entryCurve).map(e=>({route:e.entryCurve.flight?.route||'legacy',duration:e.entryCurve.duration,x:e.x,y:e.y})));
  if(!wave.length)writeFileSync(`${out}/empty-wave.json`,JSON.stringify(await page.evaluate(()=>{const p=window.__game.scenes.play,m=p.enemyManager;return {scene:window.__game.currentScene?.constructor.name,state:m.state,phase:m.phase,spawning:m.spawning,pending:m.waveSpawnPendingCount,enemies:m.enemies.map(e=>({type:e.type,state:e.state,active:e.active,curve:!!e.entryCurve})),text:document.body.innerText,playLast:p._lastStartedLevel};}),null,2));
  assert.ok(wave.length>0);assert.ok(wave.every(e=>previous?e.route==='legacy':e.route!=='legacy'));
  for(const key of ['ArrowLeft','ArrowRight','ArrowLeft']){await page.keyboard.down(key);await page.keyboard.down('Space');await page.waitForTimeout(700);await page.keyboard.up(key);}await page.keyboard.up('Space');
  await page.evaluate(previous=>{const p=window.__game.scenes.play;p.enemyManager.forceClearAllEnemies();p.clearToastState();p.showWaveBonusEffect(1500,'WAVE CLEARED!',{compact:true,squadronCount:previous?0:12,subtitle:'NEXT WAVE 2/3'});},previous);
  await page.waitForTimeout(480);await page.screenshot({path:`${out}/reward-${previous?'before':'after'}.png`});
  const movement=await page.evaluate(async()=>{
    const p=window.__game.scenes.play,g=window.__game;g.app.ticker.stop();p.enemyManager.forceClearAllEnemies();
    const {Boss}=await import('/src/entities/Boss.js');const w=p.gameplayGame.getWidth(),h=p.gameplayGame.getHeight();
    const results=[];const original=Math.random;let rng=0;
    for(let level=1;level<=10;level++){
      const b=new Boss(w/2,h*.27,level,p.gameplayGame);await b.createSprite();b.phase=2;b.x=w/2;b.y=h*.27;b.entryStartMs=0;
      let maxStep=0,distinct=new Set();Math.random=()=>{rng++;return .5;};
      for(let i=0;i<2400;i++){const x=b.x,y=b.y;b.moveTimer++;b.applyBossMovement(1,w*.5,h*.85);maxStep=Math.max(maxStep,Math.hypot(b.x-x,b.y-y));distinct.add(`${Math.round(b.x)},${Math.round(b.y)}`);}
      const locked=[b.x,b.y];b.attackWarningToken={movementLocked:true};b.applyBossMovement(120,w*.2,h*.85);
      Math.random=original;results.push({family:b.profile.archetype,maxStep,distinct:distinct.size,locked:JSON.stringify(locked)===JSON.stringify([b.x,b.y]),newFlight:!!b.flightDebug,width:w});b.destroy();
    }
    Math.random=original;return {results,rng};
  });
  assert.equal(movement.rng,0);for(const b of movement.results){assert.ok(b.locked);assert.ok(b.distinct>100);if(!previous)assert.ok(b.maxStep<=b.width*.15/60+.001);}
  report.modes.push({previous,wave,movement});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.ok=true;
} finally {await browser.close();writeFileSync(`${out}/runtime.json`,JSON.stringify(report,null,2));}
console.log('PASS paired runtime wave routes, ten boss patrols, movement locks, speed limits and RNG isolation');
