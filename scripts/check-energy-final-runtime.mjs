import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.CHECK_URL||'http://127.0.0.1:5214',out=process.env.CHECK_OUTPUT_DIR||'test-results/energy-final';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${base}/?skipIntro=1&offlineLeaderboard=1`,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready&&window.__game.scenes.menu.launchHome.wordmark,null,{timeout:120000});
 await page.evaluate(()=>window.__game.startGame('nova-player-ship-01.png',{runMode:'ranked_tactical'}));
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
 await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play;g.markUnrankedRun('energy_final_qa');await p.combatMaterialWarmup;
  p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);g.app.ticker.stop();p.enemyManager.clearEnemies();
  p.player.invulnerable=false;p.player.invulnerableTime=0;p.player.isDodging=false;p.player.sprite.alpha=1;p.player.updateFocusRing(0);
  p.player.x=g.getWidth()*.5;p.player.y=g.getHeight()*.83;p.player.sprite.position.set(p.player.x,p.player.y);
 });
 const renderer=await page.evaluate(()=>{const gl=window.__game.app.renderer.gl,ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
 const rows=[];
 for(const [level,type]of [[1,'ring'],[4,'wall'],[7,'lance']]){
  const result=await page.evaluate(async({level,type})=>{
   const g=window.__game,p=g.scenes.play,b=await p.enemyManager.spawnBoss(level,{marketingDebug:true,x:g.getWidth()*.5,y:g.getHeight()*.34});
   b.entryImpactTriggered=true;b.phase=3;b.applyPhasePlan(3);const health=b.health,radius=b.radius;
   b.beginAttackWarning('signature',{type,durationMs:20000,lockedAngle:Math.PI/2,aimDistance:700});b.setAttackWarningVisibleElapsedForDebug(14000);
   b.updateTelegraphVisual(0,p.player.x,p.player.y);b.updateBossAnimation(1,p.player.x,p.player.y);
   g.app.renderer.render(g.app.stage);
   return {level,type,rig:b.getAnimationDebugState().polishVersion,unchanged:health===b.health&&radius===b.radius,instructions:b.signatureWarningLayer.context.instructions.length};
  },{level,type});
  assert.equal(result.rig,'colossus-20260906');assert.ok(result.unchanged&&result.instructions>0);rows.push(result);
  await page.screenshot({path:`${out}/boss-${type}.png`});
  await page.evaluate(()=>{const m=window.__game.scenes.play.enemyManager;m.boss.cancelAttackWarning('qa_complete');m.boss.destroy();m.boss=null;});
 }
 const performance=[];
 for(const variant of ['baseline','helix','prism']){
  if(variant!=='baseline'){
   await page.evaluate(id=>{const g=window.__game,p=g.scenes.play,m=p.enemyManager;if(m.hijacker){m.hijacker.destroy();m.hijacker=null;}
    m.spawnHijacker({tractorVariant:id,spawnX:g.getWidth()*.52,spawnY:g.getHeight()*.25});},variant);
   await page.waitForFunction(()=>window.__game.scenes.play.enemyManager.hijacker.ufoSprite,null,{timeout:30000});
   await page.evaluate(()=>{const p=window.__game.scenes.play,h=p.enemyManager.hijacker;h.startBeamTelegraph(p.player.x,p.player.y);h.activateBeam(p.player.x,p.player.y);});
  }
  const sample=await page.evaluate(()=>new Promise(resolve=>{
   const g=window.__game,m=g.scenes.play.enemyManager,times=[],costs=[];let previous=0,count=0;
   const tick=now=>{const start=performance.now();if(m.hijacker)m.hijacker.updateBeamVisual((count%180)/180,true);g.app.renderer.render(g.app.stage);
    if(count>30){times.push(now-previous);costs.push(performance.now()-start);}previous=now;
    if(++count<271)requestAnimationFrame(tick);else{times.sort((a,b)=>a-b);costs.sort((a,b)=>a-b);resolve({frames:times.length,medianFrameMs:times[Math.floor(times.length*.5)],p95FrameMs:times[Math.floor(times.length*.95)],medianUpdateSubmitMs:costs[Math.floor(costs.length*.5)],p95UpdateSubmitMs:costs[Math.floor(costs.length*.95)]});}};
   requestAnimationFrame(tick);
  }));performance.push({variant,...sample});
  if(variant==='prism')await page.screenshot({path:`${out}/tractor-prism.png`});
 }
 await page.evaluate(()=>{const g=window.__game,m=g.scenes.play.enemyManager;m.hijacker?.destroy();m.hijacker=null;g.app.ticker.start();g.showMenu();});
 await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});
 assert.deepEqual(errors,[]);
 const report={renderer,viewport:[1920,1080],rows,performance,errors,scope:'Controlled real combat scene; world scheduling frozen, animated tractor fields. CPU submission is not GPU execution time; not worst-case combat.'};
 fs.writeFileSync(`${out}/results.json`,JSON.stringify(report,null,2));console.log('PASS current boss warnings, tractor visuals and scene cleanup',report);
}finally{await browser.close();}
