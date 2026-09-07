import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {ShipData} from '../src/config/ShipData.js';
const out='test-results/core-serpent-input';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={note:'Staged level-six encounter; actual keyboard combat, no invulnerability or forced damage. Not natural progression or human enjoyment evidence.',errors:[]};
try{
 const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/api/highscores')return r.fulfill({status:200,contentType:'application/json',body:'[]'});return ['127.0.0.1','localhost'].includes(u.hostname)||['data:','blob:'].includes(u.protocol)?r.continue():r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto((process.env.CHECK_URL||'http://127.0.0.1:4399')+'/?offlineLeaderboard=1');
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await page.evaluate(key=>window.__game.startGame(key,{runMode:'ranked_tactical'}),ShipData.find(s=>s.id==='nova_ship_01').spriteKey);
 await page.waitForFunction(()=>window.__game.scenes.play.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
 await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play,m=p.enemyManager;g.markUnrankedRun('core_serpent_input_qa');p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);
  // Keep the ordinary wave alive during collection; clearing it here would
  // schedule an unrelated wave-end cleanup against the following staged snake.
  const {BonusDrone}=await import('/src/entities/BonusDrone.js');
  const core=new BonusDrone(p.player.x,p.player.y-100,p.gameplayGame,'POWERUP','bonus_core_treasure');core.vx=core.vy=0;
  p.ambientBonusDrones.push(core);p.gameContainer.addChild(core.sprite);window.__inputCore=core;window.__inputBeforeScore=g.score;
 });
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(450);await page.keyboard.up('ArrowUp');
 report.collection=await page.evaluate(()=>({active:window.__inputCore.active,reward:window.__inputCore.lastReward,scoreGain:window.__game.score-window.__inputBeforeScore}));
 assert.equal(report.collection.active,false);assert.ok(report.collection.reward?.score>0,'Real player collision grants reward');
 await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play,m=p.enemyManager;g.level=6;m.level=6;m.state='WAVE_ACTIVE';m.waveEnding=false;
  m.clearPendingWaveSpawns();m.enemies.forEach(e=>e.destroy());m.enemies=[];
  p.bulletManager.enemyBullets.forEach(b=>b.active=false);
  p.player.x=p.gameplayGame.getWidth()*.5;p.player.y=p.gameplayGame.getHeight()*.85;
  p.player.invulnerable=false;p.player.invulnerableTimer=0;
  const {SPACE_SNAKES}=await import('/src/config/SpaceSnakes.js');window.__inputSnake=m.spawnSpaceSnake(SPACE_SNAKES[0]);
 });
 const start=Date.now();let moving=null,captured=false;await page.keyboard.down('Space');
 while(Date.now()-start<60000){
  const state=await page.evaluate(()=>{
   const g=window.__game,p=g.scenes.play,live=window.__inputSnake.sections.filter(e=>e.active),target=live.filter(e=>e.y>0).sort((a,b)=>Math.abs(a.x-p.player.x)-Math.abs(b.x-p.player.x))[0];
   return {live:live.length,x:p.player.x,targetX:target?.x,lives:g.lives,playing:g.currentScene===p,defeat:p.lastSpaceSnakeDefeat};
  });
  report.combat={...state,elapsedMs:Date.now()-start};
  if(!state.live||!state.playing)break;
  if(!captured&&Date.now()-start>6000){await page.screenshot({path:out+'/snake-keyboard-combat.png'});captured=true;}
  const dx=Number.isFinite(state.targetX)?state.targetX-state.x:0,next=Math.abs(dx)<22?null:dx>0?'ArrowRight':'ArrowLeft';
  if(next!==moving){if(moving)await page.keyboard.up(moving);if(next)await page.keyboard.down(next);moving=next;}
  await page.waitForTimeout(150);
 }
 await page.keyboard.up('Space');if(moving)await page.keyboard.up(moving);
 await page.screenshot({path:out+'/snake-keyboard-result.png'});
 assert.equal(report.combat.live,0,'Snake can be defeated through real keyboard firing');assert.ok(report.combat.defeat?.bounty>0);
 report.trait=await page.evaluate(()=>{const p=window.__game.scenes.play;p.hud.updateTraitMeter();return{time:p.gameTime,visible:p.hud.traitGroup.visible,context:p.hud.traitGroup._debugContext};});
 assert.ok(report.trait.time>=8);assert.equal(report.trait.visible,false,'Passive trait card retires after introduction');
 await page.evaluate(()=>window.__game.scenes.play.setPaused(true));await page.waitForTimeout(300);
 await page.screenshot({path:out+'/pause-trait.png'});
 const pauseTrait=await page.evaluate(()=>window.__game.scenes.play.pauseOverlay.children.find(c=>c.label==='ui_pauseTraitExplanation')?.text);
 assert.ok(pauseTrait?.length>15);report.pauseTrait=pauseTrait;
 await page.evaluate(()=>window.__game.scenes.play.setPaused(false));
 for(const [width,height,sector]of[[1280,720,6],[1920,1080,20],[960,600,410]]){
  await page.setViewportSize({width,height});await page.evaluate(sector=>{const g=window.__game;g.level=sector;g.scenes.play.hud.update();},sector);await page.waitForTimeout(250);
  await page.screenshot({path:out+'/sector-'+sector+'-'+width+'.png'});
 }
 assert.deepEqual(report.errors,[]);console.log('PASS real core collision, keyboard snake kill, contextual trait HUD and pause explanation');await context.close();
}finally{writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await browser.close();}
