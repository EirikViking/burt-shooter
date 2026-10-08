import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete&&window.__game.scenes.play.gameplayBackdrop,null,{timeout:120000});
 const checks=[];
 for(const [sector,label] of [[1,'ocean'],[6,'volcanic'],[11,'ice'],[51,'sector51']]) {
  const r=await page.evaluate(async sector=>{
   const g=window.__game,s=g.scenes.play;g.app.ticker.stop();
   if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe test policy');
   const score=g.score,lives=g.lives;s.updateSectorWorld(sector);await s.sectorWorldLoadQueue;
   for(let i=0;i<420;i++)s.updateGameplayBackdrop(1);
   const descendants=r=>[r,...(r.children||[]).flatMap(descendants)];
   const props=descendants(s.gameContainer).filter(n=>n.label==='planetVignettes').length;
   g.app.render();return{sector,source:s.sectorWorldActiveSource,props,hasPlanet:!!s.gameplayBackdrop,
    scoreUnchanged:g.score===score,livesUnchanged:g.lives===lives,ambient:!!s.planetVignettes};
  },sector);
  assert.equal(r.props,0);assert.equal(r.ambient,false);assert(r.hasPlanet&&r.scoreUnchanged&&r.livesUnchanged);checks.push(r);
  if(sector<11)await page.screenshot({path:path.join(out,`${label}.png`)});
 }
 const lifecycle=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play;
  s.setPaused(true);const time=s.gameplayBackdropElapsedMs;for(let i=0;i<60;i++)s.update(1);
  const pauseFrozen=s.gameplayBackdropElapsedMs===time;s.setPaused(false);
  s.externalPauseSuppressedUntil=0;s.pauseForExternalInterruption('backdrop-cleanup-focus');
  for(let i=0;i<60;i++)s.update(1);const focusFrozen=s.isPaused&&s.gameplayBackdropElapsedMs===time;s.setPaused(false);
  const draftUpdate=s.updateTacticalDraft;s.updateTacticalDraft=()=>{};s.tacticalDraft={active:true};
  for(let i=0;i<60;i++)s.update(1);const draftFrozen=s.gameplayBackdropElapsedMs===time;s.tacticalDraft=null;s.updateTacticalDraft=draftUpdate;
  const originalAssets=g.scenes.play.player.shipSprite.texture;
  await g.startGame(g.selectedSpriteKey);return{pauseFrozen,focusFrozen,draftFrozen,
   retryNoProps:!s.planetVignettes,sharedHullAlive:!originalAssets.destroyed,isolated:g.runPolicy.prototype};
 });
 assert(Object.values(lifecycle).every(Boolean));await page.waitForFunction(()=>window.__game.scenes.play.introComplete&&window.__game.scenes.play.gameplayBackdrop,null,{timeout:120000});
 await page.screenshot({path:path.join(out,'retry.png')});assert.deepEqual(errors,[]);
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',checks,lifecycle,errors},null,2));console.log(JSON.stringify({checks,lifecycle,errors}));
}finally{await browser.close();}
