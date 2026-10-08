import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TRACTOR_FLEET} from '../src/config/TractorFleet.js';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
fs.mkdirSync('test-results/tractor-runtime',{recursive:true});
try {
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5201'}/?offlineLeaderboard=1&skipIntro=1`,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await page.mouse.click(900,950);
 await page.evaluate(()=>window.__game.startGame('nova-player-ship-01.png',{runMode:'ranked_tactical'}));
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
 await page.evaluate(()=>{
  const g=window.__game,p=g.scenes.play;g.markUnrankedRun('tractor_fleet_qa');
  p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);g.level=3;
  p.player.invulnerable=false;p.player.invulnerableTime=0;p.player.isDodging=false;p.player.updateFocusRing(1/60);
  window.__playerBracketsHidden=p.player.focusRing.visible===false;
 });
 assert.equal(await page.evaluate(()=>window.__playerBracketsHidden),true,'Sector 3 player brackets absent');
 await page.screenshot({path:'test-results/tractor-runtime/player-no-brackets.png'});
 // Freeze wave scheduling, keeping the real scene, sprite renderer and field implementation.
 await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.app.ticker.stop();p.player.invulnerable=true;});
 const rows=[];
 for(const profile of TRACTOR_FLEET){
  await page.evaluate(id=>{
   const g=window.__game,p=g.scenes.play,e=p.enemyManager;
   if(e.hijacker){e.hijacker.destroy();e.hijacker=null;}
   e.spawnHijacker({tractorVariant:id,spawnX:g.getWidth()*.52,spawnY:g.getHeight()*.28});
   p.player.x=g.getWidth()*.55;p.player.y=g.getHeight()*.80;
  },profile.id);
  await page.waitForFunction(()=>!!window.__game.scenes.play.enemyManager.hijacker.ufoSprite,null,{timeout:30000});
  const row=await page.evaluate(async()=>{
   const g=window.__game,p=g.scenes.play,h=p.enemyManager.hijacker;
   const {tractorLanes}=await import('/src/config/TractorFields.js');
   h.startBeamTelegraph(p.player.x,p.player.y);h.updateBeamVisual(.75,false);g.app.renderer.render(g.app.stage);
   h.activateBeam(p.player.x,p.player.y);
   const phases=[.12,.38,.72,.90],samples=[];
   for(const progress of phases){
    h.beamStartedAt=Date.now()-h.beamActiveMs*progress;
    const f=h.getBeamField(),lane=tractorLanes(h.tractorProfile,{...f,depth:.78}).find(l=>l.strength>.1);
    if(lane){p.player.x=f.originX+lane.center;p.player.y=f.originY+f.length*.78;
     const before={x:p.player.x,y:p.player.y};h.applyTractorPull(1);
     samples.push({progress,dx:p.player.x-before.x,dy:p.player.y-before.y});}
    h.updateBeamVisual(progress,true);g.app.renderer.render(g.app.stage);
   }
   h.beamStartedAt=Date.now()-h.beamActiveMs*.28;h.updateBeamVisual(.28,true);
   p.player.x=g.getWidth()*.55;p.player.y=g.getHeight()*.80;p.player.sprite.position.set(p.player.x,p.player.y);
   g.app.renderer.render(g.app.stage);
   return {id:h.tractorProfile.id,texture:h.ufoSprite.texture.width,lanes:h.lastBeamVisual.lanes,samples,
    vertices:h.beamArtwork.meshes.filter(m=>m.visible).reduce((n,m)=>n+m.geometry.positions.length/2,0),
    finite:h.beamArtwork.meshes.every(m=>[...m.geometry.positions].every(Number.isFinite))};
  });
  assert.ok(row.finite);assert.ok(row.samples.length);assert.ok(row.vertices<=582);assert.ok(row.texture>=512);
  await page.screenshot({path:`test-results/tractor-runtime/${profile.id}.png`});rows.push(row);
  await page.evaluate(()=>{const h=window.__game.scenes.play.enemyManager.hijacker;h.interruptBeam();window.__beamCleared=!h.beamArtwork.visible;});
  assert.equal(await page.evaluate(()=>window.__beamCleared),true);
 }
 await page.evaluate(()=>{const g=window.__game;g.scenes.play.enemyManager.hijacker.destroy();g.app.ticker.start();g.showMenu();});
 await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});
 await page.evaluate(()=>window.__game.showThreatCodex());
 await page.waitForFunction(()=>window.__game.currentSceneName==='threatCodex');
 for(const id of ['harpoon','well','pendulum']){
  const codex=await page.evaluate(id=>{const c=window.__game.scenes.threatCodex;c.categoryIndex=0;
   c.moveEntryTo(c.getEntriesForCategory('enemies').findIndex(e=>e.id===`tractor_${id}`));
   return {id:c.getSelectedEntry().id,discovered:c.isDiscovered(c.getSelectedEntry()),description:c.getSelectedEntry().description};
  },id);
  assert.equal(codex.id,`tractor_${id}`);assert.ok(codex.discovered);assert.ok(codex.description.length>60);
  await page.waitForTimeout(350);await page.screenshot({path:`test-results/tractor-runtime/codex-${id}.png`});
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync('test-results/tractor-runtime/results.json',JSON.stringify({rows,errors,playerBracketsHidden:true},null,2));
 console.log('PASS 15 real runtime hulls/fields, bounded geometry, force samples, interruption, player brackets and return to menu',rows);
}finally{await browser.close();}
