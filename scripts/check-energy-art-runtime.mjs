import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.CHECK_URL||'http://127.0.0.1:5201',out=process.env.CHECK_OUTPUT_DIR||'test-results/energy-art';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${base}/?skipIntro=1&offlineLeaderboard=1`,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready&&window.__game.scenes.menu.launchHome?.wordmark,null,{timeout:120000});
 await page.screenshot({path:`${out}/menu.png`});
 await page.mouse.click(900,950);
 await page.evaluate(()=>window.__game.startGame('nova-player-ship-01.png',{runMode:'ranked_tactical'}));
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
 await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play;g.markUnrankedRun('energy_art_qa');
  await p.combatMaterialWarmup;
  p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);g.app.ticker.stop();
  p.enemyManager.clearEnemies();g.level=40;
  p.player.invulnerable=false;p.player.invulnerableTime=0;p.player.isDodging=false;
  p.player.focusRing.clear();p.player.hitboxReticle.clear();p.player.sprite.alpha=1;p.player.sprite.position.set(g.getWidth()*.5,g.getHeight()*.82);
  const {ELITE_MIDDLE_SHIPS}=await import('/src/config/EliteMiddleShips.js');window.__eliteProfiles=ELITE_MIDDLE_SHIPS;
  const {Enemy}=await import('/src/entities/Enemy.js');window.__EnergyTestEnemy=Enemy;
  const {energyTexture}=await import('/src/effects/AstraEnergyMaterial.js');
  window.__energyTextures=['membrane','rift','pressure','corona'].map(k=>({kind:k,width:energyTexture(k).width,height:energyTexture(k).height}));
 });
 const textures=await page.evaluate(()=>window.__energyTextures);assert.ok(textures.every(t=>t.width===512&&t.height===512));
 const profiles=await page.evaluate(()=>window.__eliteProfiles.map(p=>({id:p.id,ability:p.specialAbility})));
 const results=[];
 for(let first=0;first<profiles.length;first+=5){
  const ids=profiles.slice(first,first+5).map(p=>p.id);
  const rows=await page.evaluate(ids=>{
   const g=window.__game,p=g.scenes.play,m=p.enemyManager;m.clearEnemies();
   const rows=[];
   for(let i=0;i<ids.length;i++){
    const e=new window.__EnergyTestEnemy(0,0,ids[i],40,m.game);m.enemies.push(e);m.container.addChild(e.sprite);
    e.active=true;e.waitingForEntry=false;e.x=g.getWidth()*(i+1)/6;e.y=g.getHeight()*.38;e.sprite.position.set(e.x,e.y);e.sprite.visible=true;
    const before={health:e.health,radius:e.radius,cooldown:JSON.stringify(e.eliteAbility)};
    for(const progress of [0,.25,.75,1])for(const active of [false,true])e.drawEliteAbilityVfx(progress,active,e.x+22,g.getHeight()*.76);
    e.drawEliteAbilityVfx(.62,true,e.x+22,g.getHeight()*.76);
    const instructions=e.eliteVfxLayer.context.instructions.length;
    const bounds=e.eliteVfxLayer.getLocalBounds();
    rows.push({id:ids[i],ability:e.middleShipProfile.specialAbility,instructions,finite:[bounds.x,bounds.y,bounds.width,bounds.height].every(Number.isFinite),sameHealth:before.health===e.health,sameRadius:before.radius===e.radius,sameCooldown:before.cooldown===JSON.stringify(e.eliteAbility)});
    e._qaSavedInstructions=instructions;
   }
   g.app.renderer.render(g.app.stage);return rows;
  },ids);results.push(...rows);
  assert.ok(rows.every(r=>r.instructions>0&&r.finite&&r.sameHealth&&r.sameRadius&&r.sameCooldown));
  await page.screenshot({path:`${out}/elites-${String(first+1).padStart(2,'0')}.png`});
  await page.evaluate(()=>{const g=window.__game;for(const e of g.scenes.play.enemyManager.enemies)e.eliteVfxLayer?.clear();g.app.renderer.render(g.app.stage);});
  assert.equal(await page.evaluate(()=>window.__game.scenes.play.enemyManager.enemies.some(e=>e.eliteVfxLayer?.context.instructions.length)),false);
 }
 await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;p.enemyManager.clearEnemies();p.player.isDodging=true;p.player.dodgeDuration=150;p.player.dodgeDurationMax=300;p.player.updateDodgeVisual(0);g.app.renderer.render(g.app.stage);});
 await page.screenshot({path:`${out}/player-phase.png`});
 assert.equal(await page.evaluate(()=>window.__game.scenes.play.player.dodgeRing.__debugPhaseActive.phaseGateBracketCount),0);
 await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;p.player.isDodging=false;p.player.dodgeRing.clear();p.player.activateShield?.();g.app.ticker.start();});
 await page.waitForTimeout(350);await page.screenshot({path:`${out}/player-shield.png`});
 const accessibility=await page.evaluate(async()=>{
  const Graphics=window.__game.scenes.play.player.focusRing.constructor;
  const {drawEnergySurface,energyClock}=await import('/src/effects/AstraEnergyMaterial.js');
  const {setReducedMotionEnabled,setFlashIntensityScale}=await import('/src/config/AccessibilitySettings.js');
  setReducedMotionEnabled(true);setFlashIntensityScale(0);
  const layer=new Graphics();drawEnergySurface(layer,{kind:'rift',alpha:.5});
  const burstAlpha=layer.context.instructions[0].data.style.alpha;
  layer.clear();drawEnergySurface(layer,{kind:'membrane',alpha:.5});
  const membraneAlpha=layer.context.instructions[0].data.style.alpha;
  const clock=energyClock(123456);layer.destroy();setReducedMotionEnabled(false);setFlashIntensityScale(1);
  return {burstAlpha,membraneAlpha,clock};
 });
 assert.equal(accessibility.clock,0);assert.equal(accessibility.burstAlpha,0);assert.equal(accessibility.membraneAlpha,.125);
 await page.evaluate(()=>window.__game.app.ticker.stop());
 const bosses=[];
 for(const level of [1,4,7,10]){
  const boss=await page.evaluate(async level=>{
   const g=window.__game,p=g.scenes.play,m=p.enemyManager;m.clearEnemies();
   const b=await m.spawnBoss(level,{marketingDebug:true,x:g.getWidth()*.5,y:g.getHeight()*.34});
   b.entryImpactTriggered=true;b.phase=3;b.applyPhasePlan(3);
   const before={health:b.health,radius:b.radius};
   b.beginAttackWarning('signature',{type:b.getSignatureForPhase(3),durationMs:20000,lockedAngle:Math.PI/2,aimDistance:700});
   b.setAttackWarningVisibleElapsedForDebug(14000);b.updateTelegraphVisual(0,p.player.x,p.player.y);b.updateBossAnimation(1,p.player.x,p.player.y);
   g.app.renderer.render(g.app.stage);
   return {level,rig:b.getAnimationDebugState().polishVersion,sameHealth:b.health===before.health,sameRadius:b.radius===before.radius};
  },level);
  assert.equal(boss.rig,'colossus-20260906');assert.ok(boss.sameHealth&&boss.sameRadius);bosses.push(boss);
  await page.screenshot({path:`${out}/boss-${level}.png`});
  await page.evaluate(()=>{const m=window.__game.scenes.play.enemyManager;m.boss.cancelAttackWarning('qa_complete');m.boss.destroy();m.boss=null;});
 }
 await page.evaluate(()=>window.__game.app.ticker.start());
 await page.evaluate(()=>window.__game.showMenu());
 await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({textures,profiles:results,accessibility,bosses,errors},null,2));
 console.log('PASS 50 elite material signatures, 400 charge/active states, no health/radius/cooldown mutation, clear/scene cleanup, player phase and shield',results.length);
}finally{await browser.close();}
