import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='test-results/discovery-celebrations';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(r.request().url())||/^(blob:|data:)/.test(r.request().url())?r.continue():r.abort());
try{
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5201'}/?autostart=1&skipIntro=1&offlineLeaderboard=1`,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__game?.scenes.play?.isReady,null,{timeout:120000});
  await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.app.ticker.stop();p.introActive=false;p.introComplete=true;p.enemyManager.clearEnemies();p.showBossCelebration=()=>window.__celebrations++;window.__celebrations=0;});
  async function prepare(roll){
    await page.evaluate(async roll=>{
      const {BossDiscoveryEncounter}=await import('/src/managers/BossDiscoveryEncounter.js');
      const g=window.__game,p=g.scenes.play,m=p.enemyManager;
      m.clearEnemies();g.level=m.level=31;m.state='BOSS_ACTIVE';m.phase='BOSS';m.bossDefeatCelebrated=false;m.bossDefeatedThisLevel=false;
      const boss=await m.spawnBoss(31,{marketingDebug:true});boss.marketingDebug=false;boss.spawnedAtMs=Date.now()-10000;m.bossSpawnedAtMs=boss.spawnedAtMs;
      boss.health=boss.maxHealth*.29;boss.invulnerableUntilMs=0;
      m.discoveryEncounter=new BossDiscoveryEncounter(m,boss,{roll});
      m.discoveryEncounter.update(1);
      for(let i=0;i<19;i++)m.discoveryEncounter.update(6);
    },roll);
    await page.waitForFunction(()=>['active','failed'].includes(window.__game.scenes.play.enemyManager.discoveryEncounter?.stage),null,{timeout:60000});
  }
  async function inspectEncounter(name){
    const state=await page.evaluate(async()=>{
      const g=window.__game,p=g.scenes.play,m=p.enemyManager;
      p.player.sprite.visible=true;p.player.shipSprite.visible=true;if(p.introOverlay)p.introOverlay.visible=false;
      for(const boss of [m.discoveryEncounter.primary,m.discoveryEncounter.guest])if(boss){boss.entryStartMs=Date.now()-10000;boss.updateHealthBar();}
      for(let frame=0;frame<240;frame++){
        await new Promise(requestAnimationFrame);m.update(1);p.bulletManager.update(1);p.hud.update();g.app.render();
      }
      return m.enemies.filter(e=>e.active&&e.kind==='boss').map(e=>({x:e.x,y:e.y,lane:e.discoveryLane,health:e.health,max:e.maxHealth}));
    });
    checks.push({inspection:name,bosses:state});await page.screenshot({path:`${out}/${name}.png`});
    if(state.length===2)assert.ok(Math.abs(state[0].x-state[1].x)>1920*.17,'Bosses occupy separate lanes');
  }
  await prepare(.14);await inspectEncounter('boss-relay-runtime');
  await prepare(.04);await inspectEncounter('boss-snake-runtime');
  await prepare(.04);
  const snake=await page.evaluate(()=>{
    const m=window.__game.scenes.play.enemyManager,d=m.discoveryEncounter;
    d.update(1);const hp=d.snake.sections.reduce((sum,s)=>sum+s.maxHealth,0);
    const state={kind:d.plan.kind,ratio:hp/d.baseHealth,hold:d.primary.discoveryHoldUntil>Date.now(),sections:d.snake.sections.length};
    window.__game.scenes.play.bossHazards.push({id:'expired-snake-handoff-probe'});
    for(let i=0;i<130;i++)d.update(6);
    state.stillFightingAfter13Seconds=Boolean(d.snake?.sections.some(s=>s.active));
    d.primary.active=false;d.primary.health=0;
    state.waitsForSnake=d.update(1);
    for(let i=0;i<450;i++)d.update(6);
    return {...state,departed:d.snake===null,primaryRestored:d.primary.discoveryHoldUntil===0,
      hazardsRetained:window.__game.scenes.play.bossHazards.length===1};
  });
  assert.equal(snake.kind,'snake');assert.ok(Math.abs(snake.ratio-1.2)<.0001&&!snake.hold&&snake.stillFightingAfter13Seconds&&snake.waitsForSnake&&snake.departed&&snake.primaryRestored&&snake.hazardsRetained);checks.push(snake);
  await prepare(.14);
  const handoff=await page.evaluate(()=>{
    const p=window.__game.scenes.play,d=p.enemyManager.discoveryEncounter;
    d.update(1);
    d.primary.cancelAttackWarning('probe');d.guest.cancelAttackWarning('probe');
    d.nextWarningAt=0;
    const first=d.claimAttack(d.primary,'regular');
    const sameFrameBlocked=!d.claimAttack(d.guest,'regular');
    p.bossHazards.push({id:'pair-handoff-probe'});
    for(let i=0;i<61;i++)d.update(6);
    const second=d.claimAttack(d.guest,'regular');
    const oldLives=d.manager.game.lives;
    d.manager.game.lives--;d.update(1);
    const recovery=d.nextWarningAt>d.age&&d.primary.regularAttackReadyAt>Date.now()&&d.guest.regularAttackReadyAt>Date.now();
    d.manager.game.lives=oldLives;
    return {first,sameFrameBlocked,second,recovery,retained:p.bossHazards.length===1};
  });
  assert.ok(handoff.first&&handoff.sameFrameBlocked&&handoff.second&&handoff.recovery&&handoff.retained);checks.push({handoff});
  for(const order of ['primary-first','guest-first']){
    await prepare(.14);
    const state=await page.evaluate(order=>{
      const g=window.__game,p=g.scenes.play,m=p.enemyManager,d=m.discoveryEncounter;
      d.update(1);
      const result={kind:d.plan.kind,ratio:d.guest.maxHealth/d.baseHealth,availableAttackers:[d.primary,d.guest].filter(b=>b.discoveryHoldUntil<=Date.now()).length};
      if(order==='primary-first'){d.primary.health=0;d.primary.active=false;m.update(1);result.promoted=m.boss===d.guest;d.guest.health=0;d.guest.active=false;}
      else {d.guest.health=0;d.guest.active=false;m.update(1);result.primaryRetained=m.boss===d.primary;d.primary.health=0;d.primary.active=false;}
      const before=window.__celebrations;m.update(1);result.completions=window.__celebrations-before;result.complete=m.state==='LEVEL_COMPLETE';m.update(1);result.noDuplicate=window.__celebrations-before===1;
      return result;
    },order);
    assert.ok(state.complete&&state.noDuplicate);assert.equal(state.availableAttackers,2);assert.equal(state.completions,1);assert.ok(state.promoted||state.primaryRetained);assert.equal(state.ratio,2);checks.push({order,...state});
  }
  await prepare(.22);
  const chain=await page.evaluate(()=>{
    const g=window.__game,p=g.scenes.play,m=p.enemyManager,d=m.discoveryEncounter;
    d.primary.health=0;d.primary.active=false;d.update(1);
    d.guest.health=d.guest.maxHealth*.19;d.update(1);
    for(let i=0;i<19;i++)d.update(6);
    const result={kind:d.plan.kind,snake:Boolean(d.snake?.sections.length),hold:d.guest.discoveryHoldUntil>Date.now()};
    for(const enemy of m.enemies)if(enemy.active)enemy.update(1,p.player.x,p.player.y,1);
    g.app.render();return result;
  });
  assert.ok(chain.snake&&!chain.hold);checks.push(chain);
  await page.screenshot({path:`${out}/boss-serpent-runtime.png`});
  await prepare(.22);
  const pendingSnake=await page.evaluate(()=>{
    const m=window.__game.scenes.play.enemyManager,d=m.discoveryEncounter;
    d.primary.active=false;d.primary.health=0;
    d.guest.health=d.guest.maxHealth*.19;d.update(1);
    d.guest.health=0;d.guest.active=false;
    const waiting=d.update(1);
    for(let i=0;i<19;i++)d.update(6);
    const arrived=Boolean(d.snake?.sections.some(s=>s.active));
    const pending=d.update(1);
    const before=window.__celebrations;
    for(const s of d.snake.sections){s.active=false;s.health=0;}
    m.update(1);m.update(1);
    return {waiting,arrived,pending,completions:window.__celebrations-before};
  });
  assert.deepEqual(pendingSnake,{waiting:true,arrived:true,pending:true,completions:1});checks.push({pendingSnake});
  // No identity from the +7 difficulty offset may leak into a sector19 wave.
  const gates=await page.evaluate(async()=>{
    const {GENERATED_ENEMY_PROFILES}=await import('/src/config/GeneratedEnemyProfiles.js');
    const {ELITE_MIDDLE_SHIPS}=await import('/src/config/EliteMiddleShips.js');
    const g=window.__game,m=g.scenes.play.enemyManager;m.clearEnemies();g.level=m.level=19;m.state='WAVE_ACTIVE';
    const future=GENERATED_ENEMY_PROFILES.find(p=>p.unlockLevel===60),elite=ELITE_MIDDLE_SHIPS.find(p=>p.minLevel===60);
    m.spawnWave({type:future.type,count:8,formation:'LINE',eliteMiddleShipId:elite.id,allowConcurrentSpawn:true});
    await new Promise(r=>setTimeout(r,1500));
    return m.enemies.map(e=>({id:e.type,unlock:e.generatedProfile?.unlockLevel||e.middleShipProfile?.minLevel||0}));
  });
  assert.ok(gates.some(p=>p.unlock>0));assert.ok(gates.every(p=>p.unlock<=19));checks.push({gates});
  const cancelled=await page.evaluate(async()=>{
    const {BossDiscoveryEncounter}=await import('/src/managers/BossDiscoveryEncounter.js');
    const g=window.__game,m=g.scenes.play.enemyManager;m.clearEnemies();m.level=31;
    const boss=await m.spawnBoss(31,{marketingDebug:true});
    const d=m.discoveryEncounter=new BossDiscoveryEncounter(m,boss,{roll:.15});
    const pending=d.loadGuest();m.clearEnemies();await pending;return {enemies:m.enemies.length,pending:d.pendingBoss?.active||false};
  });
  assert.equal(cancelled.enemies,0);checks.push({cancelled});
  const stalled=await page.evaluate(async()=>{
    const {BossDiscoveryEncounter}=await import('/src/managers/BossDiscoveryEncounter.js');
    const m=window.__game.scenes.play.enemyManager;
    const primary={maxHealth:100,health:0,active:false};
    const d=new BossDiscoveryEncounter(m,primary,{roll:.15});d.stage='loading';d.releaseAt=0;
    let pending=true;for(let i=0;i<90;i++)pending=d.update(6);return {pending,stage:d.stage};
  });
  assert.deepEqual(stalled,{pending:false,stage:'failed'});checks.push({stalled});
  assert.deepEqual(errors,[]);writeFileSync(`${out}/boss-runtime.json`,JSON.stringify({checks,errors},null,2));console.log('PASS boss guest thresholds, staggered crossfire, surviving snake, both death orders, cleanup, actual-sector spawn gates');
}catch(error){await page.screenshot({path:`${out}/boss-failure.png`});writeFileSync(`${out}/boss-runtime.json`,JSON.stringify({checks,errors,error:error.stack},null,2));throw error;}finally{await browser.close();}
