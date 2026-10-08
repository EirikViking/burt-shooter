const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = process.env.CHECK_OUTPUT_DIR;if(!root)throw Error('CHECK_OUTPUT_DIR required');fs.mkdirSync(root,{recursive:true});
(async()=>{
 const progress=(s)=>{console.log(s);fs.appendFileSync(path.join(root,'progress.log'),s+'\n');};progress('launch');
 const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader'],downloadsPath:path.join(root,'downloads')});progress('launched');
 const context = await browser.newContext({viewport:{width:1280,height:900}});
 const page = await context.newPage();
 const errors=[],warnings=[],failedRequests=[];page.on('pageerror',e=>{errors.push(String(e));progress('PAGEERROR '+String(e))});page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')warnings.push(m.text())});page.on('response',r=>{if(r.status()>=400)failedRequests.push({url:r.url(),status:r.status()})});
 try {
  await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:4877'}/?autostart=1&offlineLeaderboard=1`,{waitUntil:'domcontentloaded'});progress('loaded');
  await page.waitForFunction(()=>{const g=window.game||window.__game;return g?.currentScene===g?.scenes?.play&&g?.scenes?.play?.player?.active},null,{timeout:60000});progress('game ready');
  const result=await page.evaluate(async()=>{
   const game=window.game||window.__game;game.app?.ticker?.stop();game.paused=true;game.scenes.play.isPaused=true;
   const {Enemy}=await import('/src/entities/Enemy.js');
   const {SpaceSnake}=await import('/src/entities/SpaceSnake.js');
   const {SnakeBrood}=await import('/src/managers/SnakeBrood.js');
   const {SpaceSnakeBaby}=await import('/src/entities/SpaceSnakeBaby.js');
   const {Bullet}=await import('/src/entities/Bullet.js');
   const {SPACE_SNAKES,getSpaceSnakeSectionHealth}=await import('/src/config/SpaceSnakes.js');
   const {CHALLENGE_FLIGHT_PATTERNS}=await import('/src/config/ChallengeFlights.js');
   const play=game.scenes.play, manager=play.enemyManager, player=play.player;
   manager.forceClearAllEnemies();manager.state='MARKETING';manager.spawning=false;
   const results={challenges:[],snakes:[],life:[],orphan:{},errors:[],sources:{gainLife:game.gainLife.toString(),repair:play.applyLifeRepair.toString(),patch:player.repairFromPowerup.toString(),draftApply:player.applyRunAugment.toString(),update:Enemy.prototype.update.toString(),objectives:manager.getObjectiveEnemyCount.toString()}};
   for(const pattern of CHALLENGE_FLIGHT_PATTERNS){try{
     const e=new Enemy(game.getWidth()/2,game.getHeight()*.3,'bonus_challenge',51,game);
     e.state='FORMATION';e.challengeFlightTarget=true;e.challengeFlightPatternId=pattern.id;e.challengeFlightSlot=1;e.waveSlot=1;e.entryCompletedAt=Date.now();
     const trace=[];for(let i=0;i<300;i++){e.update(1,player.x,player.y);if(i%30===0)trace.push({x:e.x,y:e.y,sx:e.sprite.x,sy:e.sprite.y,state:e.state});}
     const xs=trace.map(p=>p.x),ys=trace.map(p=>p.y);
     results.challenges.push({id:pattern.id,trace,rangeX:Math.max(...xs)-Math.min(...xs),rangeY:Math.max(...ys)-Math.min(...ys),finite:trace.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),synced:trace.every(p=>p.x===p.sx&&p.y===p.sy),bounded:trace.every(p=>p.x>=0&&p.x<=game.getWidth()&&p.y>=0&&p.y<=game.getHeight()*.6),staysFormation:trace.every(p=>p.state==='FORMATION')});
     manager.removeEnemySprite(e,'independent_review');
   }catch(e){results.errors.push({case:'challenge '+pattern.id,error:String(e),stack:e.stack})}}
   for(const mode of ['overrun_pure','overrun_tactical'])for(const level of [51,101,143]){try{
     game.runMode=mode;game.level=level;
     const s=new SpaceSnake(600,250,SPACE_SNAKES[0].id,level,game);s.chain={sections:[s],age:8,motionAge:8,routeSeed:1};s.state='FORMATION';
     const hp=s.health;s.takeDamage(10);const normal=hp-s.health;s.health=hp;
     const shots=s.shoot(player.x,player.y);const exposedUntil=s.chain.exposureUntilAge;s.takeDamage(10);const exposed=hp-s.health;s.health=hp;s.chain.age=exposedUntil+.001;s.takeDamage(10);const expired=hp-s.health;
     results.snakes.push({mode,level,hp,expectedHp:getSpaceSnakeSectionHealth(level),normal,exposed,expired,exposedUntil,projectiles:shots.length});
     for(const b of shots)b.destroy?.();manager.removeEnemySprite(s,'independent_review');
   }catch(e){results.errors.push({case:'snake '+mode+' '+level,error:String(e),stack:e.stack})}}
   for(const mode of ['overrun_pure','overrun_tactical'])for(const level of [100,101,143]){try{
     game.runMode=mode;game.level=level;game.lives=1;const pickup=game.gainLife({source:'life',count:1});const afterPickup=game.lives;
     game.lives=1;const repair=play.applyLifeRepair(3,0);const afterRepair=game.lives;
     game.lives=1;const patch=player.repairFromPowerup({repairLives:1,repairInvulnMs:0},'nano_patch');const afterPatch=game.lives;
     results.life.push({mode,level,pickup,afterPickup,repair,afterRepair,patch,afterPatch});
   }catch(e){results.errors.push({case:'life '+mode+' '+level,error:String(e),stack:e.stack})}}
   try{game.runMode='overrun_tactical';game.level=143;game.lives=1;const applied=player.applyRunAugment('nano_patch');results.tacticalRepair={applied,lives:game.lives};}catch(e){results.errors.push({case:'tactical exception',error:String(e),stack:e.stack})}
   try{
     game.runMode='overrun_pure';game.level=143;manager.level=143;game.lives=3;
     const mother=new SpaceSnake(600,250,SPACE_SNAKES[0].id,143,game);mother.chain={sections:[mother],age:10,motionAge:10,routeSeed:13};
     const brood=new SnakeBrood(manager,mother.chain,SPACE_SNAKES[0]);await brood.promise;(manager.snakeBroods ||= new Set()).add(brood);
     results.orphanSetup={art:!!brood.art,failed:brood.failed,disposed:brood.disposed,scene:game.currentSceneName,ticker:game.app.ticker.started};
     const baby=new SpaceSnakeBaby(brood,0,player.x,player.y);baby.age=2;baby.state='FORMATION';baby.action={phase:'warning',at:0,aim:{x:player.x,y:player.y}};brood.babies.push(baby);brood.born=1;manager.enemies=[baby];manager.container.addChild(baby.sprite);
     const initialObjective=manager.getObjectiveEnemyCount();mother.active=false;
     const orphanObjective=manager.getObjectiveEnemyCount(),score=game.score,babyHp=baby.health;
     const damageResult=baby.takeDamage(100000);const immune=baby.health===babyHp&&baby.active;
     play.bulletManager.clearAll('independent_review');
     const shot=new Bullet(baby.x,baby.y,0,0,100000,0xffffff,true);play.bulletManager.addPlayerBullet(shot);
     const oldTakeDamage=player.takeDamage;let contactDamageCalls=0;player.takeDamage=function(...args){contactDamageCalls++;return oldTakeDamage.apply(this,args)};
     play.checkCollisions();player.takeDamage=oldTakeDamage;
     const afterCollision={babyActive:baby.active,babyHp:baby.health,scoreDelta:game.score-score,contactDamageCalls,lives:game.lives};
     brood.update(1,player);const safeState=baby.state;let frames=0;while(!brood.disposed&&frames<180){baby.update(1);brood.update(1,player);frames++;}
     results.orphan={initialObjective,orphanObjective,damageResult,immune,afterCollision,safeState,frames,disposed:brood.disposed,babyDestroyed:baby.destroyed,stillRegistered:manager.snakeBroods.has(brood),broodKills:brood.kills,scoreDelta:game.score-score};
     manager.removeEnemySprite(mother,'independent_review');play.bulletManager.clearAll('independent_review');
   }catch(e){results.errors.push({case:'orphan',error:String(e),stack:e.stack})}
   try{
     manager.currentWaveIndex=0;manager.waves=[{isChallenge:true,type:'bonus_challenge',count:24},{type:'grunt',count:24},{type:'grunt',count:24}];manager.normalWavesTotal=3;manager.state='WAVE_ACTIVE';manager.phase='WAVES';manager.waveEnding=false;manager.spawning=false;manager.pendingWaveConfig=null;manager.boss=null;manager.bossSpawnedThisLevel=false;manager.waveActiveTimer=12000;manager.challengeFlightState={active:true};manager.mayhemReinforcementState=null;player.invulnerable=false;
     const reports=[];for(const mode of ['ranked','overrun_pure']){game.runMode=mode;const r=manager.getMayhemReinforcementEligibility(3);reports.push({mode,eligible:r.eligible,reasons:r.reasons,hardReasons:r.hardReasons});}
     manager.mayhemReinforcementState={spawned:false,spawnAt:Date.now()-10};const pendingResult=manager.updateMayhemReinforcement();
     results.reinforcement={reports,pendingResult,pendingCleared:manager.mayhemReinforcementState===null};
   }catch(e){results.errors.push({case:'reinforcement',error:String(e),stack:e.stack})}
   try{
     game.runMode='ranked';game.level=52;manager.level=52;
     const snake=new SpaceSnake(player.x,player.y,SPACE_SNAKES[0].id,52,game);
     snake.chain={sections:[snake],age:5,motionAge:5,routeSeed:1};
     snake.state='FORMATION';snake.waitingForEntry=false;snake.contactSafeDuringEntry=false;
     manager.enemies=[snake];manager.container.addChild(snake.sprite);
     play.bulletManager.clearAll('ghost_snake_fixture');
     player.applyPowerup('ghost');
     const before={health:snake.health,lives:game.lives,score:game.score};
     const touching=play.checkCollision(snake,player),ghostActive=player.isGhostActive();
     play.checkCollisions();
     results.ghostSnake={touching,ghostActive,before,after:{health:snake.health,lives:game.lives,score:game.score,active:snake.active}};
     manager.removeEnemySprite(snake,'ghost_snake_fixture');
   }catch(e){results.errors.push({case:'ghost snake contact',error:String(e),stack:e.stack})}
   return results;
  });
  fs.writeFileSync(path.join(root,'results.json'),JSON.stringify({result,errors,warnings,failedRequests},null,2));
  if(!result.ghostSnake?.touching||!result.ghostSnake?.ghostActive||
    result.ghostSnake.after.health!==result.ghostSnake.before.health||
    result.ghostSnake.after.lives!==result.ghostSnake.before.lives||
    result.ghostSnake.after.score!==result.ghostSnake.before.score||
    !result.ghostSnake.after.active)throw Error('Ghost contact damaged or destroyed a snake in the isolated runtime');
  console.log(JSON.stringify({ok:true,errors,warnings,failedRequests,result:{...result,sources:undefined,challenges:result.challenges.map(({trace,...rest})=>rest)},file:path.join(root,'results.json')}));
 } catch(e){fs.writeFileSync(path.join(root,'startup-error.json'),JSON.stringify({error:String(e),errors},null,2));throw e} finally {progress('closing');await context.close();await browser.close();progress('closed');}
})().catch(e=>{console.error(e);process.exitCode=1});
