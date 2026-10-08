import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;
assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'),'E output required');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const errors=[],checks=[];
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4895'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=molt`);
  await page.waitForFunction(()=>window.__game?.scenes?.play?.firstLightDirector?.localTestChain,null,{timeout:90000});
  const initial=await page.evaluate(()=>{const g=window.__game;g.app.ticker.stop();return {prototype:g.runPolicy.prototype,
    permissions:Object.entries(g.runPolicy).filter(([k,v])=>k.startsWith('allow')&&v),mode:g.runMode,
    sector:g.level,score:g.score};});
  assert(initial.prototype);assert.equal(initial.permissions.length,0);assert.equal(initial.sector,6);checks.push({name:'test route isolated before progression',...initial});
  const moltSetup=await page.evaluate(()=>{
    const g=window.__game,s=g.scenes.play,c=s.firstLightDirector.localTestChain;
    c.age=4;c.motionAge=4;for(const e of c.sections){e.health=e.maxHealth*.55;e.update(1);}
    for(let i=0;i<135;i++)s.enemyManager.updateEnemies(1);
    s.player.x=s.gameplayGame.getWidth()*.5;s.player.y=s.gameplayGame.getHeight()*.86;
    g.app.render();return {age:c.age,sections:c.sections.map(e=>({active:e.active,health:e.health,max:e.maxHealth})),phase:c.molt.model.phase,plates:c.molt.model.plates.length};
  });
  console.log('molt setup',JSON.stringify(moltSetup));
  await page.screenshot({path:path.join(out,'01-molt-exposed.png')});
  const cover=await page.evaluate(async()=>{
    const g=window.__game,s=g.scenes.play,c=s.firstLightDirector.localTestChain,m=c.molt;
    const {Bullet}=await import('/src/entities/Bullet.js');
    const before={score:g.score,kills:s.combatTelemetry?.kills,objectives:s.enemyManager.getObjectiveEnemyCount()},tests=[];
    for(const style of ['low','burst','broad','precision','drone','chain','piercing','beam']){
      const p=m.model.plates[0];p.active=true;p.health=100;
      s.bulletManager.clearAll('evolution-fixture');
      const b=new Bullet(p.x,p.y+30,0,-12,style==='burst'?60:1,0x66ccff,true);
      b.previousX=p.x;b.previousY=p.y+50;b.x=p.x;b.y=p.y;
      b.piercing=style==='piercing';b.isPlasmaLance=style==='beam';b.isTacticalDroneShot=style==='drone';b.isChainLightning=style==='chain';
      s.bulletManager.addPlayerBullet(b);m.intercept();const hp=p.health;m.intercept();
      tests.push({style,absorbed:!b.active,exactOnce:hp===p.health,hp});
    }
    const p=m.model.plates[0];p.active=true;p.health=100;
    s.bulletManager.clearAll('evolution-fixture');
    const hostile=new Bullet(p.x,p.y,0,3,1,0xff6633,false);s.bulletManager.addEnemyBullet(hostile);m.intercept();
    const scoreDelta=g.score-before.score,objectives=s.enemyManager.getObjectiveEnemyCount();
    s.bulletManager.clearAll('evolution-fixture');
    const prior=p.health;s.player.x=p.x;s.player.y=p.y;s.player.invulnerable=false;
    const positions=c.sections.map(e=>({e,x:e.x,y:e.y}));
    for(const {e} of positions){e.x=-500;e.y=-500;}
    const lives=g.lives;s.checkCollisions();
    const noContact=g.lives===lives;
    for(const {e,x,y} of positions){e.x=x;e.y=y;}
    s.player.x=50;s.player.y=s.gameplayGame.getHeight()*.94;
    for(let i=0;i<420;i++)m.update(1);
    const expired=m.model.plates.every(p=>!p.active);
    return {tests,hostileAbsorbed:!hostile.active,noContact,scoreDelta,objectivesUnchanged:objectives===before.objectives,
      phase:m.model.phase,expired,prior};
  });
  assert(cover.tests.every(t=>t.absorbed&&t.exactOnce));assert(cover.hostileAbsorbed);assert(cover.noContact);
  assert.equal(cover.scoreDelta,0);assert(cover.objectivesUnchanged);assert(cover.expired);checks.push({name:'real bullet cover interactions',...cover});
  const builds=await page.evaluate(async()=>{
    const g=window.__game,s=g.scenes.play,m=s.firstLightDirector.localTestChain.molt;
    const {Player}=await import('/src/entities/Player.js');
    const {ShipData}=await import('/src/config/ShipData.js');
    const rows=[];
    for(const [name,gear]of [['Nova Sparrow','low'],['Circuit Tap','weak rapid'],['Quasar Fan','broad'],['Iron Orbit','slow'],
      ['Glacier Scope','precision'],['Nova Sparrow','ghost'],['Nova Sparrow','drone'],['Nova Sparrow','chain'],['Nova Sparrow','piercing']]){
      const hull=ShipData.find(h=>h.name.toLowerCase()===name.toLowerCase());if(!hull)throw Error('Missing hull '+name);
      const p=m.model.plates[0];p.active=true;p.health=m.model.initialHealth*.09;p.age=1;p.x=400;p.y=350;
      const player=new Player(p.x,p.y+110,s.inputManager,s.gameplayGame,hull.spriteKey);
      if(gear==='ghost')player.applyPowerup('ghost');
      if(gear==='drone'&&!player.applyRunAugment('drones').applied)throw Error('Drone augment failed');
      if(gear==='chain')player.applyPowerup('chain_lightning');
      if(gear==='piercing')player.applyPowerup('pierce');
      if(gear==='drone'&&(!player.dronesActive||!player.drones.length))throw Error('Drones missing');
      if(gear==='piercing'&&!player.bulletPierce)throw Error('Pierce missing');
      if(gear==='chain'&&!player.chainLightningActive)throw Error('Chain missing');
      if(gear==='ghost'&&!player.isGhostActive())throw Error('Ghost missing');
      const initial=p.health;let absorbed=0,volleyShots=0,droneShots=0;
      s.bulletManager.clearAll('build-cover-fixture');
      for(let frame=0;frame<240;frame++){
        player.shootCooldown=Math.max(0,player.shootCooldown-1000/60);player.updateDrones(1/60);
        if(player.canShoot()){
          const shots=player.shoot();volleyShots+=shots.length;droneShots+=shots.filter(b=>b.isTacticalDroneShot).length;
          for(const b of shots)s.bulletManager.addPlayerBullet(b);
        }
        s.bulletManager.update(1);const before=s.bulletManager.playerBullets.filter(b=>b.active).length;
        m.intercept();absorbed+=before-s.bulletManager.playerBullets.filter(b=>b.active).length;
        if(!p.active)break;
      }
      if(gear==='drone'&&!droneShots)throw Error('No real drone shots');
      rows.push({name,gear,volleyShots,droneShots,absorbed,damage:initial-p.health,destroyed:!p.active,
        healthFraction:(p.health/initial)});player.destroy();
    }
    s.bulletManager.clearAll('build-cover-fixture');return rows;
  });
  assert(builds.every(b=>b.volleyShots>0&&b.absorbed>0&&b.damage>0),JSON.stringify(builds));checks.push({name:'actual hull volleys against cover',builds});
  const cleanup=await page.evaluate(async()=>{
    const g=window.__game,s=g.scenes.play,m=s.enemyManager;
    m.forceClearAllEnemies();
    const {SPACE_SNAKES}=await import('/src/config/SpaceSnakes.js');
    const c=m.spawnSpaceSnake(SPACE_SNAKES[0],{molt:true,force:true,count:2});
    await c.brood?.promise;
    const original=c.sections.map(e=>e.scoreValue),before=g.score;
    c.age=4;for(const e of c.sections){e.health=0;e.active=false;}
    for(let i=0;i<150;i++)m.updateEnemies(1);
    return {molts:m.serpentMolts.size,moltDisposed:c.molt.disposed,broodDisposed:c.brood?.disposed??true,
      objectives:m.getObjectiveEnemyCount(),scoreDelta:g.score-before,sectionValues:original};
  });
  assert(cleanup.moltDisposed&&cleanup.broodDisposed);assert.equal(cleanup.molts,0);assert.equal(cleanup.objectives,0);assert.equal(cleanup.scoreDelta,0);
  checks.push({name:'simultaneous mother destruction and brood cleanup',...cleanup});
  const payback=await page.evaluate(async()=>{
    const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,m=s.enemyManager;
    m.forceClearAllEnemies();s.bulletManager.clearAll('payback-fixture');
    d.cancel('fixture');d.model.seen.clear();d.model.paybackOffered=false;
    g.level=m.level=1;m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;m.spawning=true;
    s.introComplete=true;s.introActive=false;s.isPaused=false;s.player.active=true;
    s.player.x=640;s.player.y=600;
    for(let i=0;i<320;i++)d.update(1);
    const e=d.model.encounter;
    d.model.hit('left',100,{});d.model.hit('right',100,{});
    const identity=d.model.escorts.map(a=>({rank:a.rank,callsign:a.callsign,side:a.side}));
    for(let i=0;i<670;i++)d.update(1);
    const serviceFinished=d.model.escorts.length===0&&d.model.payback.status==='ready';
    g.level=m.level=2;
    for(let i=0;i<420;i++)d.update(1);
    const p=d.model.payback,returned=p.escorts.map(a=>({rank:a.rank,callsign:a.callsign,side:a.side}));
    const before={score:g.score,rewards:d.model.rewardCount,hp:d.model.encounter.hp[p.part],max:d.model.encounter.maxHp.side};
    const pauseAge=p.age;s.isPaused=true;d.update(60);const pauseFrozen=p.age===pauseAge;s.isPaused=false;
    const target=d.view.targets.find(t=>t.part===p.part),bullets=s.bulletManager.playerBullets.filter(b=>b.active&&b.firstLightPayback);
    const {Bullet}=await import('/src/entities/Bullet.js');
    const b=new Bullet(target.x,target.y,0,0,10000,0x66ffee,true);
    b.firstLightSupport=true;b.firstLightPayback=true;b.firstLightOwner=d;b.firstLightPart=p.part;s.bulletManager.addPlayerBullet(b);
    d.interceptShots();d.interceptShots();
    const result={serviceFinished,identity,returned,pauseFrozen,part:p.part,spent:p.spentDamage,max:before.max,
      scoreDelta:g.score-before.score,rewardDelta:d.model.rewardCount-before.rewards,won:d.model.encounter.won,
      shots:bullets.length,remainingHp:d.model.encounter.hp[p.part],model:d.snapshot()};
    // Keep the marked gun and return readable in the screenshot.
    d.view.update(d.model,0,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player,d.charges);g.app.render();
    return result;
  });
  assert(payback.serviceFinished&&payback.pauseFrozen);assert.deepEqual(payback.returned,payback.identity);
  assert(payback.spent>0&&payback.spent<=payback.max*.7+1e-8);assert.equal(payback.scoreDelta,0);assert.equal(payback.rewardDelta,0);assert(!payback.won);
  await page.screenshot({path:path.join(out,'02-payback-return.png')});checks.push({name:'return identity and real rival weapon hit',...payback});
  const lifecycle=await page.evaluate(()=>{
    const g=window.__game,s=g.scenes.play,d=s.firstLightDirector;
    const p=d.model.payback,age=p.age;s.tacticalDraft={active:true};const before=d.snapshot();
    d.syncVisibility();const draftHidden=!d.view.root.visible;s.tacticalDraft=null;
    d.cancel('player-death');const deathCleared=d.model.payback===null&&!s.bulletManager.playerBullets.some(b=>b.active&&b.firstLightPayback);
    return {draftHidden,deathCleared,age,before};
  });assert(lifecycle.draftHidden&&lifecycle.deathCleared);checks.push({name:'draft visibility and death cleanup',...lifecycle});
  const a11y=await page.evaluate(async()=>{
    const {setReducedMotionEnabled,setFlashIntensityScale}=await import('/src/config/AccessibilitySettings.js');
    setReducedMotionEnabled(true);setFlashIntensityScale(0);
    const s=window.__game.scenes.play,d=s.firstLightDirector;d.syncVisibility();
    return {ready:!!d.view};
  });assert(a11y.ready);
  const transitions=await page.evaluate(async()=>{
    const g=window.__game,s=g.scenes.play,m=s.enemyManager;
    const {SPACE_SNAKES}=await import('/src/config/SpaceSnakes.js');
    m.forceClearAllEnemies();s.firstLightDirector.cancel('transition-fixture');g.level=m.level=6;
    const c=m.spawnSpaceSnake(SPACE_SNAKES[0],{molt:true,force:false});
    c.age=4;for(const e of c.sections)e.health=e.maxHealth*.55;m.updateEnemies(1);
    const age=c.molt.model.age;
    s.setPaused(true);s.update(1);const pause=c.molt.model.age===age;s.setPaused(false);
    const draftUpdate=s.updateTacticalDraft;s.updateTacticalDraft=()=>{};s.tacticalDraft={active:true};
    s.update(1);const draft=c.molt.model.age===age;s.tacticalDraft=null;s.updateTacticalDraft=draftUpdate;
    s.inputManager.keys.Space=true;window.dispatchEvent(new Event('blur'));
    const focusReleased=!s.inputManager.isFiring();
    s.setPaused(true);s.update(1);const focusPause=c.molt.model.age===age;s.setPaused(false);
    g.lives=0;s.firstLightDirector.syncVisibility();const death=c.molt.disposed&&s.firstLightDirector.model.payback===null;
    g.lives=3;window.__previousEvolutionDirector=s.firstLightDirector;
    return {pause,draft,focusReleased,focusPause,death};
  });assert(Object.values(transitions).every(Boolean),JSON.stringify(transitions));checks.push({name:'scene pause/draft/focus/death paths',...transitions});
  await page.evaluate(()=>window.__game.startGame(undefined,{runMode:'ranked',countShipUsage:false}));
  await page.waitForFunction(()=>window.__game.scenes.play?.firstLightDirector&&window.__game.scenes.play.firstLightDirector!==window.__previousEvolutionDirector,null,{timeout:60000});
  const retry=await page.evaluate(()=>{const g=window.__game,s=g.scenes.play;g.app.ticker.stop();return {
    oldDestroyed:window.__previousEvolutionDirector.destroyed,payback:s.firstLightDirector.model.payback,
    lastMolt:s.enemyManager.lastMoltEligibleWave??null,sector:g.level,score:g.score,augments:s.player.runAugmentIds,
    prototype:g.runPolicy.prototype,seed:g.contentDirector.seed};});
  assert(retry.oldDestroyed&&retry.prototype);assert.equal(retry.payback,null);assert.equal(retry.lastMolt,null);
  assert.equal(retry.score,0);assert.equal(retry.sector,1);assert.equal(retry.augments.length,0);
  checks.push({name:'actual Pure retry clears run state',...retry});
  await page.evaluate(()=>window.__game.startGame(undefined,{runMode:'overrun_tactical',countShipUsage:false,
    reuseOnslaughtLoadout:true,onslaughtAugmentIds:['damage_up','blink_drive','shield']}));
  await page.waitForFunction(()=>window.__game.level===51&&window.__game.scenes.play?.player?.runAugmentIds?.length===3,null,{timeout:60000});
  const onslaught=await page.evaluate(()=>{const g=window.__game;g.app.ticker.stop();return {sector:g.level,score:g.score,
    augments:g.scenes.play.player.runAugmentIds,payback:g.scenes.play.firstLightDirector.model.payback,
    prototype:g.runPolicy.prototype};});
  assert.equal(onslaught.score,0);assert.equal(onslaught.payback,null);assert(onslaught.prototype);
  assert.deepEqual(onslaught.augments,['damage_up','blink_drive','shield']);checks.push({name:'actual Sector 51 entry',...onslaught});
  assert.equal(errors.length,0,errors.join('\n'));
  writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',checks,errors},null,2));
  console.log(`[encounter-evolution-runtime] PASS ${checks.length} groups; ${out}`);
}finally{await browser.close();}
