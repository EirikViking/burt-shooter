import assert from 'node:assert/strict';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
assert(existsSync(new URL('../src/effects/CounterweightVisual.js',import.meta.url)),'Counterweight needs its real articulated view');
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'));
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto((process.env.CHECK_URL||'http://127.0.0.1:4991')+'/?autostart=1&offlineLeaderboard=1&encounterEvolution=counterweight');
 await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.model.encounter?.counterweight,null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,m=s.enemyManager;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe preview policy');
  const {makeCounterweight,counterweightWorldPoses}=await import('/src/game/Counterweight.js');
  const {Bullet}=await import('/src/entities/Bullet.js');
  const {AudioManager}=await import('/src/audio/AudioManager.js');AudioManager.enabled=false;
  let audioStops=0;const stopGroup=AudioManager.stopSfxGroup;
  AudioManager.stopSfxGroup=(...args)=>{audioStops++;return stopGroup.apply(AudioManager,args);};
  let chargePlays=0;const playSfx=AudioManager.playSfx;
  // This muted lifecycle fixture models an accepted warning. Rejected-cue
  // retries are covered separately by check-contact-warning-resume.
  AudioManager.playSfx=(id,...args)=>{if(id==='first_light_rival_charge_mechanical'){chargePlays++;return true;}return playSfx.call(AudioManager,id,...args);};
  let credit=0,rewards=0,shots=[];const record=s.recordCombatProjectileHit,spawn=s.spawnAmbientBonusDrone;
  const add=s.bulletManager.addEnemyBullet.bind(s.bulletManager);
  s.recordCombatProjectileHit=()=>credit++;s.spawnAmbientBonusDrone=()=>{rewards++;return null;};
  s.bulletManager.addEnemyBullet=b=>{if(b.firstLightOwner===d)shots.push({part:b.firstLightPart,x:b.x,y:b.y,vx:b.vx,vy:b.vy,age:d.model.encounter?.age});return add(b);};
  const setup=(sector=3)=>{
   d.cancel('counterweight-fixture');s.bulletManager.clearAll('counterweight-fixture');s.clearToastState();
   m.clearEnemies();m.clearPendingWaveSpawns();m.boss=null;m.hijacker=null;m.environment=null;m.discoveryEncounter=null;m.mysteryDirector=null;m.challengeFlightState=null;m.mayhemReinforcementState=null;
   s.activeMayhemReinforcementWarning=null;s.activeMayhemRoutineWarning=null;s.activeBossIntroCard=null;
   s.tacticalDraft=null;s.overrunMilestoneInterlude=null;s.gameOverInterlude=null;s.gameOverSequenceStarted=false;
   m.waves=[{type:'grunt',count:0,isChallenge:false}];m.currentWaveIndex=0;m.spawning=true;m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;
   g.level=m.level=sector;s.introComplete=true;s.introActive=false;s.isPaused=false;s.player.active=true;d.localTestStarted=true;
   d.model.seen.add(sector);d.model.encounter={kind:'convoy',sector,age:0,suspended:false,...makeCounterweight(1+Math.min(4,(sector-1)/25))};
   d.update(0);shots=[];return d.model.encounter;
  };
  const step=n=>{for(let i=0;i<n;i++){s.bulletManager.update(1);d.update(1);}};
  const hit=part=>{const t=d.view.targets.find(p=>p.part===part);if(!t)throw Error('Missing target '+part);
   const b=new Bullet(t.x,t.y,0,-8,1000,0xffffff,true,{cosmeticPhase:0});s.bulletManager.addPlayerBullet(b);d.interceptShots();d.update(0);};
  const entering=setup();entering.age=.2;d.update(0);const earlyX=d.view.pose.x;
  entering.age=1.4;d.update(0);const arrivalDoesNotSweep=Math.abs(d.view.pose.x-earlyX)<.01;
  const rows=[];
  for(const sector of [3,51,401])for(const part of ['portGun','starboardGun','pivot']){
   const e=setup(sector);step(270);hit(part);const immediate=shots.length;step(119);const early=shots.length;
   step(16);const after=shots.length,geometry=shots.map(shot=>{
    const p=counterweightWorldPoses(e,d.view.pose).find(p=>p.part===shot.part);
    return Boolean(p)&&Math.abs(Math.atan2(shot.vy,shot.vx)-p.angle)<1e-9
      &&Math.abs(shot.x-p.muzzleX)<.01&&Math.abs(shot.y-p.muzzleY)<.01;
   });step(1200);
   rows.push({sector,part,immediate,early,after,geometry,expired:!d.model.encounter,total:shots.length,
    owned:s.bulletManager.enemyBullets.filter(b=>b.active&&b.firstLightOwner===d).length});
  }
  let e=setup();step(270);const age=e.age,chargesBeforePause=chargePlays;s.isPaused=true;d.syncVisibility();step(120);s.isPaused=false;
  const paused=e.age===age;step(60);const resumeEarly=shots.length;step(20);const resumeShots=shots.length;
  const warningReplayed=chargePlays>chargesBeforePause;
  e=setup();step(270);s.tacticalDraft={active:true};step(120);const draftHidden=!d.view.root.visible;
  s.tacticalDraft=null;step(60);const draftEarly=shots.length;step(30);const draftShots=shots.length;
  e=setup();step(270);const stopsBeforeWarning=audioStops;m.mayhemReinforcementState={warningFired:true,spawned:false,warningTier:'major'};step(100);
  const warningAudioCleared=audioStops>stopsBeforeWarning;
  const warningHeld=shots.length===0;m.mayhemReinforcementState=null;step(60);const warningEarly=shots.length;step(30);const warningShots=shots.length;
  e=setup();step(240);d.hitBombBlast(d.view.pose.x,d.view.pose.y,1000,1000,{});step(300);
  const bombSafe=!d.model.encounter&&shots.length===0;
  e=setup();step(300);s.player.active=false;d.update(1);const deathClean=!d.model.encounter&&s.bulletManager.enemyBullets.every(b=>!b.active||b.firstLightOwner!==d);s.player.active=true;
  e=setup();step(265);const rig=d.view.surpriseView.counterweightView,source=rig.pivot.texture.source,texture=rig.pivot.texture;
  const nodes=rig.root.children.length,hp=JSON.stringify(e.hp),p=d.view.pose;
  for(let i=0;i<300;i++)rig.update(e,p,{reduced:true,flash:0});
  const bounded=nodes===rig.root.children.length&&hp===JSON.stringify(e.hp);
  const a=rig.update(e,p,{reduced:true,flash:0}),b=rig.update(e,{...p,height:p.height*2},{reduced:true,flash:0});
  const uniform=JSON.stringify(a)===JSON.stringify(b);
  d.view.update(d.model,0,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player);g.app.render();
  s.recordCombatProjectileHit=record;s.spawnAmbientBonusDrone=spawn;s.bulletManager.addEnemyBullet=add;AudioManager.stopSfxGroup=stopGroup;AudioManager.playSfx=playSfx;
  return {rows,paused,resumeEarly,resumeShots,draftHidden,draftEarly,draftShots,warningHeld,warningEarly,warningShots,
   bombSafe,deathClean,bounded,uniform,credit,rewards,warningAudioCleared,warningReplayed,arrivalDoesNotSweep,policy:g.runPolicy,nodes,
   score:g.score,sourceAlive:!source.destroyed,textureAlive:!texture.destroyed};
 });
 await page.screenshot({path:path.join(out,'balanced-warning.png')});
 await page.evaluate(()=>{const g=window.__game,d=g.scenes.play.firstLightDirector,e=d.model.encounter;
  d.model.hit('portGun',1000,{});for(let i=0;i<90;i++)d.update(1);g.app.render();});
 await page.screenshot({path:path.join(out,'tilted-warning.png')});
 const disposal=await page.evaluate(()=>{const d=window.__game.scenes.play.firstLightDirector,r=d.view.surpriseView.counterweightView;
  const source=r.pivot.texture.source,texture=r.pivot.texture,owned=r.pistonTexture;r.destroy();return {sourceAlive:!source.destroyed,textureAlive:!texture.destroyed,ownedDisposed:owned.destroyed,rootDestroyed:r.root.destroyed};});
 writeFileSync(path.join(out,'report.json'),JSON.stringify({result,disposal,errors},null,2));
 for(const r of result.rows){assert.equal(r.immediate,0);assert.equal(r.early,0);assert.equal(r.after,r.part==='pivot'?0:1);assert(r.expired&&r.owned===0);assert(r.total<=3);assert(r.geometry.every(Boolean));}
 for(const k of ['paused','draftHidden','warningHeld','warningAudioCleared','warningReplayed','arrivalDoesNotSweep','bombSafe','deathClean','bounded','uniform','sourceAlive','textureAlive'])assert(result[k],k);
 for(const k of ['resumeEarly','draftEarly','warningEarly','credit','rewards'])assert.equal(result[k],0,k);
 for(const k of ['resumeShots','draftShots','warningShots'])assert.equal(result[k],2,k);
 assert(Object.values(disposal).every(Boolean));assert.deepEqual(errors,[]);
 console.log('[counterweight-runtime] PASS source-only preview, 3/51/401 branches, normal Bullet ownership/no rewards, pause/draft/warnings/death/bomb/expiry, bounded rig/shared textures');
}finally{await browser.close();}
