import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],checks=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4970'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=rescue-twin-jailers`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.model.encounter?.surprise==='twin-jailers',null,{timeout:90000});
 await page.evaluate(()=>window.__game.app.ticker.stop());
 const ids=await page.evaluate(async()=>{const {CONVOY_SURPRISES}=await import('/src/config/ConvoySurpriseCatalog.js');return CONVOY_SURPRISES.filter(x=>x.parts.left&&x.parts.right).map(x=>x.id);});
 for(const id of ids){
  const result=await page.evaluate(async id=>{
   const {FirstLightModel}=await import('/src/game/ArcadeFirstLight.js'),{makeConvoySurprise}=await import('/src/game/ConvoySurprises.js'),{Bullet}=await import('/src/entities/Bullet.js');
   const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,m=s.enemyManager;
   d.cancel('fixture');d.model=new FirstLightModel('runtime');d.model.encounter={kind:'convoy',sector:3,age:3,suspended:false,...makeConvoySurprise(id,1)};
   m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;m.spawning=true;m.waves=[{type:'grunt',count:0}];m.currentWaveIndex=0;m.enemies=[];m.boss=null;m.hijacker=null;m.environment=null;m.discoveryEncounter=null;m.mysteryDirector=null;m.challengeFlightState=null;m.mayhemReinforcementState=null;
   g.level=3;s.introComplete=true;s.introActive=false;s.isPaused=false;
   d.update(1);g.app.render();const e=d.model.encounter,initialScore=g.score,initialLives=g.lives;
   const positions=d.view.targets.map(t=>({...t}));let credit=0,bonus=0;
   const record=s.recordCombatProjectileHit,spawn=s.spawnAmbientBonusDrone;s.recordCombatProjectileHit=()=>credit++;s.spawnAmbientBonusDrone=()=>{bonus++;return null;};
   const builds=['low','burst','broad','precision','drone','chain','piercing','beam'];const matrix=[];
   const shoot=(t,damage=1000,extra={})=>{const b=new Bullet(t.x,t.y,0,-10,damage,0x70eeee,true);Object.assign(b,extra);if(!s.bulletManager.addPlayerBullet(b))throw Error('Fixture bullet admission failed');d.interceptShots();if(b.active)s.bulletManager.deactivateBullet(b,'fixture');s.bulletManager.compactBulletList(s.bulletManager.playerBullets,{kind:'player',reason:'fixture-normal-compaction'});return b;};
   for(const build of builds){
    d.clearOwnedBullets();d.clearSupportBullets();d.model=new FirstLightModel('matrix');d.model.encounter={kind:'convoy',sector:3,age:3,suspended:false,...makeConvoySurprise(id,1)};d.update(1);
    const state=d.model.encounter,health=Object.values(state.hp).reduce((a,b)=>a+b,0),extras={piercing:build==='piercing',isPlasmaLance:build==='beam',isTacticalDroneShot:build==='drone',chainLightning:build==='chain',radius:build==='broad'?12:7};
    for(let pass=0;pass<25&&d.model.rescued<2;pass++){
     const snapshot=d.view.targets.filter(t=>!t.cover);
     for(const t of snapshot)shoot(t,build==='low'?.4:1000,extras);
     d.update(1);
    }
    matrix.push({build,health,rescued:d.model.rescued,escorts:d.model.escorts.length,rewards:d.model.rewardCount,won:state.won});
   }
   d.model=new FirstLightModel('bomb');d.model.encounter={kind:'convoy',sector:3,age:3,suspended:false,...makeConvoySurprise(id,1)};d.update(1);
   const bomb={isBomb:true};d.hitBombBlast(d.view.pose.x,d.view.pose.y,1000,1000,bomb);const bombRescues=d.model.rescued;d.update(1);d.hitBombBlast(d.view.pose.x,d.view.pose.y,1000,1000,bomb);const bombFinal=d.model.rescued;
   d.model=new FirstLightModel('pause');d.model.encounter={kind:'convoy',sector:3,age:3,suspended:false,...makeConvoySurprise(id,1)};d.update(1);
   const pausedAge=d.model.encounter.age;s.isPaused=true;for(let i=0;i<60;i++)d.update(1);s.isPaused=false;const held=d.model.encounter.age===pausedAge;
   s.tacticalDraft={active:true};for(let i=0;i<30;i++)d.update(1);const draftHeld=d.model.encounter.age===pausedAge;d.syncVisibility();const draftHidden=!d.view.root.visible;s.tacticalDraft=null;
   d.update(1);const childCount=d.view.surpriseView.root.children.length;
   for(let i=0;i<1300;i++)d.update(1);const expired=d.model.encounter===null;
   d.cancel('retry');const cleared=d.model.encounter===null&&d.model.escorts.length===0&&d.model.payback===null;
   const unchanged=g.score===initialScore&&g.lives===initialLives;
   s.recordCombatProjectileHit=record;s.spawnAmbientBonusDrone=spawn;
   d.model=new FirstLightModel('picture');d.model.encounter={kind:'convoy',sector:3,age:3,suspended:false,...makeConvoySurprise(id,1)};d.update(1);g.app.render();
   return {id,positions,matrix,bombRescues,bombFinal,held,draftHeld,draftHidden,childCount,expired,cleared,unchanged,credit,bonus,policy:g.runPolicy};
  },id);
  await page.screenshot({path:path.join(out,`${id}.png`)});checks.push(result);
  assert(result.matrix.every(x=>x.health===6&&x.rescued===2&&x.escorts===2&&x.rewards===0&&!x.won),JSON.stringify(result));
  assert(result.held&&result.draftHeld&&result.draftHidden&&result.expired&&result.cleared&&result.unchanged,JSON.stringify(result));
  assert(result.childCount<=11);assert.equal(result.bonus,0);assert.equal(result.bombFinal,2);
  if(['shielded-evacuation','stolen-callsign'].includes(id))assert.equal(result.bombRescues,0,'one blast cannot hit newly exposed locks');
  assert(result.policy.prototype&&!result.policy.allowLeaderboardSubmission&&!result.policy.allowGlobalLeaderboardSubmission&&!result.policy.allowAchievements&&!result.policy.allowCareerProgress&&!result.policy.allowCloudProgressSync);
  console.log('PASS',id,result.matrix.length,'builds, bomb snapshots, pause/draft/expiry/reset, unchanged score/lives');
 }
}finally{await browser.close();writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,errors},null,2));}
assert.deepEqual(errors,[]);
