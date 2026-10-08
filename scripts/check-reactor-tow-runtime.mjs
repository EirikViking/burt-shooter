import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {ShipData} from '../src/config/ShipData.js';
const out=process.env.CHECK_OUTPUT_DIR;
assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'));
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
const compiled=process.env.REACTOR_TOW_COMPILED==='1';
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 if(compiled)await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=>'boss-snake'};});
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4983'}/${compiled?'?offlineLeaderboard=1':'?autostart=1&offlineLeaderboard=1&encounterEvolution=reactor-tow'}`);
 if(compiled){
  await page.waitForFunction(()=>window.__game?.currentSceneName==='shipSelect'&&document.body.dataset.menuReady==='1',null,{timeout:120000});
  await page.evaluate(()=>window.__game.startGame(undefined,{countShipUsage:false}));
  await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.boss?.active&&window.__game.scenes.play.introComplete&&!window.__game.scenes.play.levelStartWarmupPending,null,{timeout:120000});
  await page.evaluate(()=>{const g=window.__game,s=g.scenes.play;g.app.ticker.stop();s.enemyManager.clearEnemies();s.enemyManager.boss=null;s.clearBossHazards('reactor-compiled-fixture');s.firstLightDirector.enabled=true;s.firstLightDirector.loadArt();});
  await page.waitForFunction(()=>window.__game.scenes.play.firstLightDirector.view,null,{timeout:90000});
 }else await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.model.encounter?.reactor,null,{timeout:120000});
 const result=await page.evaluate(async({ships,compiled})=>{
  const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,m=s.enemyManager;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe preview policy');
  const FirstLightModel=compiled?d.model.constructor:(await import('/src/game/ArcadeFirstLight.js')).FirstLightModel;
  const makeReactorTow=compiled?null:(await import('/src/game/ReactorTow.js')).makeReactorTow;
  const Bullet=compiled?s.player.shoot()[0].constructor:(await import('/src/entities/Bullet.js')).Bullet;
  const Player=compiled?s.player.constructor:(await import('/src/entities/Player.js')).Player;
  if(!compiled){const {AudioManager}=await import('/src/audio/AudioManager.js');AudioManager.enabled=false;}
  const initial={score:g.score,lives:g.lives,health:s.player.health},originalPlayer=s.player;
  const w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight();
  let credit=0,reward=0,emitted=0;
  const record=s.recordCombatProjectileHit,spawn=s.spawnAmbientBonusDrone,add=s.bulletManager.addEnemyBullet.bind(s.bulletManager);
  s.recordCombatProjectileHit=()=>credit++;s.spawnAmbientBonusDrone=()=>{reward++;return null;};
  s.bulletManager.addEnemyBullet=b=>{if(b.firstLightPart==='vent')emitted++;return add(b);};
  const setup=(sector=3)=>{
   d.cancel('reactor-fixture');s.bulletManager.clearAll('reactor-fixture');s.clearToastState();
   s.activeMayhemReinforcementWarning=null;s.activeMayhemRoutineWarning=null;s.activeBossIntroCard=null;
   s.tacticalDraft=null;s.overrunMilestoneInterlude=null;s.gameOverInterlude=null;s.gameOverSequenceStarted=false;
   m.clearEnemies();m.clearPendingWaveSpawns();m.boss=null;m.hijacker=null;m.environment=null;m.discoveryEncounter=null;m.mysteryDirector=null;m.challengeFlightState=null;m.mayhemReinforcementState=null;
   m.waves=[{type:'grunt',count:0,isChallenge:false}];m.currentWaveIndex=0;m.spawning=true;m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;
   g.level=m.level=sector;s.introComplete=true;s.introActive=false;s.isPaused=false;s.player.active=true;d.localTestStarted=true;
   d.model=new FirstLightModel('reactor-fixture');d.model.seen.add(sector);
   const scale=1+Math.min(4,(sector-1)/25);
   if(compiled){
    // Exercise the compiled factory through its already isolated local harness.
    d.localTestStarted=false;m.spawning=false;g.encounterEvolutionTest={id:'reactor-tow'};d.setupLocalTest();
    const e=d.model.encounter;if(!e?.reactor)throw Error('Compiled Reactor Tow missing');
    for(const part of Object.keys(e.hp)){e.hp[part]*=scale;e.maxHp[part]*=scale;}
    e.sector=sector;g.level=m.level=sector;d.model.seen.add(sector);
   }else d.model.encounter={kind:'convoy',sector,age:0,suspended:false,...makeReactorTow(scale)};
   d.update(0);emitted=0;return d.model.encounter;
  };
  const step=n=>{for(let i=0;i<n;i++){s.bulletManager.update(1);d.update(1);}};
  const shoot=(part,damage=1000,extra={})=>{
   const t=d.view.targets.find(x=>x.part===part);if(!t)throw Error(`Missing target ${part}`);
   const b=new Bullet(t.x,t.y,0,-10,damage,0xffffff,true,{cosmeticPhase:0});Object.assign(b,extra);
   s.bulletManager.addPlayerBullet(b);d.interceptShots();d.update(0);return b;
  };
  const rows=[];
  for(const sector of [3,51,401]){
   const e=setup(sector);step(330);const before=d.view.targets.find(t=>t.part==='vent').x;
   shoot('coupler');const immediate=d.view.targets.find(t=>t.part==='vent').x;step(65);
   const early=emitted;step(75);const shifted=d.view.targets.find(t=>t.part==='vent').x;
   step(35);const shots=emitted;step(240);
   rows.push({case:'disconnect',sector,before,immediate,shifted,early,shots,expired:!d.model.encounter,
    bullets:s.bulletManager.enemyBullets.filter(b=>b.active&&b.firstLightOwner===d).length});
   setup(sector);step(330);shoot('vent');step(300);
   rows.push({case:'vent',sector,shots:emitted,expired:!d.model.encounter,escorts:d.model.escorts.length,rewards:d.model.rewardCount});
  }
  setup();step(345);const age=d.model.encounter.age;s.isPaused=true;step(180);const pause=d.model.encounter.age===age;
  s.isPaused=false;s.tacticalDraft={active:true};step(60);const draft=d.model.encounter.age===age&&!d.view.root.visible;
  s.tacticalDraft=null;step(45);const resumedShots=emitted;step(60);const resumedTotal=emitted;
  d.cancel('focus-retry');const cleared=s.bulletManager.enemyBullets.every(b=>!b.active||b.firstLightOwner!==d)&&!d.model.encounter&&!d.model.payback;
  setup();step(345);m.mayhemReinforcementState={warningFired:true,spawned:false,warningTier:'major'};step(120);
  const warningHeld=emitted===0&&d.model.encounter.reactor.warning===0;
  m.mayhemReinforcementState=null;step(45);const warningResume=emitted===0;step(60);const warningTotal=emitted;
  setup();step(180);d.hitBombBlast(d.view.pose.x,d.view.pose.y,1000,1000,{});step(600);
  const bombSafe=emitted===0&&!d.model.encounter;
  setup();step(330);s.player.active=false;d.update(1);const deathCleared=!d.model.encounter&&s.bulletManager.enemyBullets.every(b=>!b.active||b.firstLightOwner!==d);s.player.active=true;
  const matrix=[];
  for(const [name,gear] of [['Nova Sparrow','low'],['Circuit Tap','weak-rapid'],['Quasar Fan','broad'],['Iron Orbit','slow'],['Glacier Scope','precision'],['Nova Sparrow','ghost'],['Nova Sparrow','drone'],['Nova Sparrow','chain'],['Nova Sparrow','piercing']]){
   setup();const hull=ships.find(x=>x.name.toLowerCase()===name.toLowerCase());if(!hull)throw Error(`Unknown fixture ship ${name}`);
   const player=new Player(w*.5,h*.83,s.inputManager,s.gameplayGame,hull.spriteKey);s.player=player;
   if(gear==='ghost')player.applyPowerup('ghost');if(gear==='drone')player.applyRunAugment('drones');
   if(gear==='chain')player.applyPowerup('chain_lightning');if(gear==='piercing')player.applyPowerup('pierce');
   const e=d.model.encounter;let shots=0,droneShots=0;
   for(let i=0;i<900;i++){
    const target=d.view.targets.find(t=>t.part==='vent');if(target)player.x+=Math.max(-player.speed,Math.min(player.speed,target.x-player.x));
    player.shootCooldown=Math.max(0,player.shootCooldown-1000/60);player.updateDrones(1/60);
    if(player.canShoot()){const volley=player.shoot();shots+=volley.length;droneShots+=volley.filter(b=>b.isTacticalDroneShot).length;for(const b of volley)s.bulletManager.addPlayerBullet(b);}
    step(1);
   }
   matrix.push({gear,shots,droneShots,emitted,harmless:e.reactor.harmless,expired:!d.model.encounter,hp:{...e.hp}});
   d.cancel('matrix-end');s.bulletManager.clearAll('matrix-end');player.destroy();s.player=originalPlayer;
  }
  setup();step(322);g.app.render();
  const unchanged=initial.score===g.score&&initial.lives===g.lives&&initial.health===s.player.health;
  s.recordCombatProjectileHit=record;s.spawnAmbientBonusDrone=spawn;s.bulletManager.addEnemyBullet=add;
  return {rows,pause,draft,resumedShots,resumedTotal,cleared,warningHeld,warningResume,warningTotal,bombSafe,deathCleared,matrix,credit,reward,unchanged,policy:g.runPolicy};
 },{compiled,ships:ShipData.map(({name,spriteKey})=>({name,spriteKey}))});
 await page.screenshot({path:path.join(out,'linked-warning.png')});
 writeFileSync(path.join(out,'report.json'),JSON.stringify({compiled,result,errors},null,2));
 for(const row of result.rows){assert(row.expired,JSON.stringify(row));if(row.case==='disconnect'){
   assert.equal(row.before,row.immediate);assert(row.shifted-row.before>100);assert.equal(row.early,0);assert.equal(row.shots,5);assert.equal(row.bullets,0);
  }else{assert.equal(row.shots,0);assert.equal(row.escorts,0);assert.equal(row.rewards,0);}}
 for(const key of ['pause','draft','cleared','warningHeld','warningResume','bombSafe','deathCleared','unchanged'])assert(result[key],key);
 assert.equal(result.resumedShots,0);assert.equal(result.resumedTotal,5);assert.equal(result.warningTotal,5);
 assert.equal(result.credit,0);assert.equal(result.reward,0);assert(result.matrix.every(r=>r.expired&&r.emitted<=5));
 assert(result.matrix.find(r=>r.gear==='drone').droneShots>0);assert.deepEqual(errors,[]);
 console.log('[reactor-tow-runtime] PASS',compiled?'compiled isolated prototype':'source-only prototype',': cut/vent, 3/51/401, 9 real volley builds, warnings/pause/draft/death/expiry/no rewards');
}finally{await browser.close();}
