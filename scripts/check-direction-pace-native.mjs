import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {_electron as electron} from 'playwright';
const exe=JSON.parse(readFileSync('test-results/astra-build-location.json')).executable;
const out=path.resolve('test-results/direction-pace/native');mkdirSync(out,{recursive:true});
const profile=path.join(out,'profile'),errors=[];
const app=await electron.launch({executablePath:exe,args:['--nova-fresh-profile','--windowed'],env:{...process.env,NOVA_SWARM_USER_DATA_DIR:profile,NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},timeout:120000});
try{
 const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
 await page.waitForFunction(()=>document.body.dataset.menuReady==='1',null,{timeout:120000});
 const runtime=await app.evaluate(({app})=>({packaged:app.isPackaged,profile:app.getPath('userData')}));assert.ok(runtime.packaged);assert.equal(runtime.profile,profile);
 assert.ok(page.url().includes('offlineLeaderboard=1'));
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.setContentSize(1280,720);});
 await page.evaluate(()=>window.__game.scenes.menu.quickStartRun('ranked_tactical'));
 await page.waitForFunction(()=>window.__game.scenes.play.player?.active,null,{timeout:120000});
 await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.markUnrankedRun('direction_pace_qa');p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);p.player.invulnerable=true;p.player.invulnerableTime=1e9;});
 await page.waitForFunction(()=>window.__game.scenes.play.enemyManager.state==='WAVE_ACTIVE'&&window.__game.scenes.play.enemyManager.enemies.some(e=>e.entryCurve),null,{timeout:120000});
 const wave=await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;return {sha:JSON.parse(window.render_game_to_text()).gitSha,durations:p.enemyManager.enemies.filter(e=>e.entryCurve?.flight).map(e=>e.entryCurve.duration)};});
 assert.equal(wave.sha,process.env.ASTRA_EXPECTED_SHA || 'd9b077c');assert.ok(wave.durations.length);assert.ok(wave.durations.every(t=>t>=2000));
 await page.screenshot({path:path.join(out,'entry.png')});
 const bosses=[];
 for(const [level,family]of [[2,'forge'],[3,'mirror']]){
  const result=await page.evaluate(async({level,family})=>{const g=window.__game,p=g.scenes.play,m=p.enemyManager;g.app.ticker.stop();p.clearPendingEnemyStart();p.clearToastState();m.boss?.destroy();m.forceClearAllEnemies();m.level=level;g.level=level;m.bossSpawnedThisLevel=false;m.bossDefeatedThisLevel=false;m.bossSpawning=false;await m.spawnBoss(level);m.state='BOSS_ACTIVE';const b=m.boss;b.phase=2;b.x=p.gameplayGame.getWidth()*.6;b.y=p.gameplayGame.getHeight()*.25;b.sprite.position.set(b.x,b.y);b.updateBossAnimation(0,640,650);p.bossHazards=[];const h=p.registerBossHazardFromBoss(b,'regular',{type:'lance',angle:1.8});window.__nativeDirectionHazard=h;
   const sample=(fraction,distance)=>{h.elapsedMs=h.armingMs+h.colossus.travelMs*fraction;p.player.x=h.sourceX+Math.cos(h.angle)*h.length*distance;p.player.y=h.sourceY+Math.sin(h.angle)*h.length*distance;return p.isPlayerInsideBossHazard(h);};
   const checks={nearEarly:sample(.12,.1),farEarly:sample(.12,.9),nearLate:sample(.88,.1),farLate:sample(.88,.9)};return {name:b.name,family:b.profile.archetype,expected:family,...checks};
  },{level,family});
  assert.equal(result.family,family);assert.equal(result.nearEarly,true);assert.equal(result.farEarly,false);assert.equal(result.nearLate,false);assert.equal(result.farLate,true);bosses.push(result);
  for(const [label,fraction]of [['near',.12],['far',.88]]){await page.evaluate(fraction=>{const g=window.__game,p=g.scenes.play,h=window.__nativeDirectionHazard;h.length=p.gameplayGame.getHeight()*.65;h.elapsedMs=h.armingMs+h.colossus.travelMs*fraction;p.bossHazardLayer.clear();p.drawBossHazard(h,h.elapsedMs/h.durationMs);g.app.renderer.render(g.app.stage);},fraction);await page.screenshot({path:path.join(out,`${family}-${label}.png`)});}
 }
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({ok:true,exe,runtime,wave,bosses,errors},null,2));console.log('PASS native varied slow wave entries and outward visual/collision agreement for Sam and Tyrian');
}finally{await app.close();}
