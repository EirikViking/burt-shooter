import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try {
 const context=await browser.newContext({viewport:{width:1920,height:1080}});
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/api/highscores')return route.fulfill({status:200,contentType:'application/json',body:'[]'});
  return ['127.0.0.1','localhost'].includes(u.hostname)||['data:','blob:'].includes(u.protocol)?route.continue():route.abort();
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.CHECK_URL||'http://127.0.0.1:5201';
 await page.goto(`${base}/docs/creature-audio/review.html`);
 assert.equal(await page.locator('#creature option').count(),64);
 assert.equal(await page.locator('#cue option').count(),8);
 await page.locator('#cue').selectOption('death');
 await page.locator('#play').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('death'));
 await page.locator('#chapters button').first().click();
 await page.waitForFunction(()=>!document.querySelector('#mix').paused&&document.querySelector('#mix').currentTime>0);
 await page.locator('#stop').click();
 await page.goto(`${base}/?offlineLeaderboard=1`);
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await page.mouse.click(900,950);
 await page.evaluate(()=>window.__game.startGame('nova-player-ship-01.png',{runMode:'ranked_tactical'}));
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
 await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play,m=p.enemyManager;
  g.markUnrankedRun('creature_audio_qa');p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);
  p.player.invulnerable=true;p.player.invulnerableTimer=1e9;
  m.clearPendingWaveSpawns();m.enemies.forEach(e=>e.destroy());m.enemies=[];
  const {AudioManager}=await import('/src/audio/AudioManager.js');await AudioManager.unlockAudio();
  const {CreatureAudio}=await import('/src/audio/CreatureAudio.js');window.__creature=CreatureAudio;
  const {SPACE_SNAKES}=await import('/src/config/SpaceSnakes.js');
  await CreatureAudio.prepare(SPACE_SNAKES[0]);window.__snake=m.spawnSpaceSnake(SPACE_SNAKES[0]);
 });
 await page.waitForFunction(()=>window.__creature.lastEvent?.event==='arrival');
 await page.waitForTimeout(3800);
 await page.evaluate(()=>window.__snake.sections[2].takeDamage(10000000));
 await page.waitForFunction(()=>window.__creature.lastEvent?.event==='break');
 await page.evaluate(()=>window.__game.switchScene('menu'));
 assert.deepEqual(await page.evaluate(()=>{const d=window.__creature.diagnostics();return[d.active,d.cached,d.bytes];}),[0,0,0]);
 assert.deepEqual(errors,[]);
 console.log('PASS review player, 64 selectors, combat chapters, actual single-segment break playback and teardown');
} finally {await browser.close();}
