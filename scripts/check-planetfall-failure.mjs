import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/art/encounter-premium/**',route=>route.abort());
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 await page.waitForFunction(()=>window.__game?.scenes?.play?.introComplete,null,{timeout:90000});
 const result=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();m.clearEnemies();m.clearPendingWaveSpawns();s.firstLightDirector.cancel('asset-failure');
  const {PlanetfallBoss}=await import('/src/entities/PlanetfallBoss.js'),{getBossProfile}=await import('/src/config/BossRoster.js');
  const b=new PlanetfallBoss(640,100,10,s.gameplayGame,getBossProfile(10));await b.createSprite();m.boss=b;m.container.addChild(b.sprite);m.enemies.push(b,...b.components);
  for(let i=0;i<205;i++)b.update(1);g.app.render();window.__fallbackBoss=b;
  return {parts:b.components.length,ready:b.planetfall.irisOpen,finite:b.components.every(c=>[c.x,c.y,c.radius,c.body.width,c.body.height].every(Number.isFinite)),
   graphics:b.components.every(c=>c.ring.context.instructions.length>0),ownedTextures:b.visual.ownedTextures.length};
 });
 assert(result.ready&&result.finite&&result.graphics);assert.equal(result.ownedTextures,0);
 await page.screenshot({path:path.join(out,'missing-art-fallback.png')});
 const cleanup=await page.evaluate(()=>{
  const b=window.__fallbackBoss,s=window.__game.scenes.play;b.destroy();b.destroy();window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));
  s.enemyManager.clearEnemies();return {destroyed:b.sprite.destroyed,shots:b.shots.length,partsInactive:b.components.every(c=>!c.active),audioDestroyed:b.audio.destroyed};
 });
 assert(cleanup.destroyed&&cleanup.partsInactive&&cleanup.audioDestroyed);assert.equal(cleanup.shots,0);assert.deepEqual(errors,[]);
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'pass',scope:'failed premium atlas fallback and idempotent teardown',result,cleanup,errors},null,2));
 console.log('[planetfall-failure] PASS missing-art readability, finite geometry and repeated cleanup');
}finally{await browser.close();}
