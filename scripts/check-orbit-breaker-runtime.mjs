import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[],checks=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4899'}/?encounterEvolution=orbit-breaker&autostart=1&offlineLeaderboard=1`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.encounterExpansionTestReady,null,{timeout:90000});
 const result=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,p=s.player,m=s.enemyManager;g.app.ticker.stop();m.clearEnemies();s.bulletManager.clearAll('orbit-fixture');
  const {Enemy}=await import('/src/entities/Enemy.js'),{Bullet}=await import('/src/entities/Bullet.js');
  p.resetPowerups();p.applyPowerup('orbit_breaker');p.x=600;p.y=500;p.bulletDamage=1;const hammer=p.orbitBreaker;
  const target=new Enemy(600,414,'grunt',6,s.gameplayGame);target.health=1;target.waitingForEntry=false;target.state='FORMATION';m.enemies.push(target);m.container.addChild(target.sprite);
  const near=new Bullet(600,414,0,0,1,0xff795a,false),far=new Bullet(1000,500,0,0,1,0xff795a,false);
  s.bulletManager.addEnemyBullet(near);s.bulletManager.addEnemyBullet(far);const before={kills:s.totalKills,score:g.score};
  hammer.update(0);const zeroDelta=target.health===1&&near.active;
  hammer.update(1/60);const killed=!target.active,localClear=!near.active&&far.active,killCredit=s.totalKills-before.kills,score=g.score-before.score;
  for(let i=0;i<90;i++)hammer.update(1/60);const noDuplicate=s.totalKills-before.kills===killCredit&&g.score-before.score===score;
  const angle=hammer.model.angle;p.applyPowerup('orbit_breaker');const refresh=p.orbitBreaker===hammer&&hammer.model.angle===angle&&s.gameContainer.children.filter(c=>c.label==='orbit_breaker').length===1;
  const pool=s.particleManager.premiumImpacts;pool.clear();for(let i=0;i<100;i++)pool.emit(200,200,900,'impact');
  const initialBound=pool.slots.filter(x=>x.active).length===24&&pool.slots.every(x=>x.sprite.width<=36);
  for(let i=0;i<60;i++)pool.update(1);const finite=pool.slots.every(x=>!x.active);
  // Earned hammer contact uses existing component lock and root reward rules.
  m.clearEnemies();const {DreadnoughtBoss}=await import('/src/entities/DreadnoughtBoss.js'),{getBossProfile}=await import('/src/config/BossRoster.js');
  const b=new DreadnoughtBoss(600,120,10,s.gameplayGame,getBossProfile(10),0);await b.createSprite();m.boss=b;m.enemies.push(b,...b.components);m.container.addChild(b.sprite);
  const core=b.components.find(c=>c.type==='reactor'),beforeCore=core.health;core.x=hammer.model.position.x;core.y=hammer.model.position.y;
  hammer.update(1/60);const locked=core.health===beforeCore;
  const gun=b.components.find(c=>c.type==='gun_0');gun.x=hammer.model.position.x;gun.y=hammer.model.position.y;const gunHealth=gun.health;
  hammer.update(1/60);const ordinaryPart=gun.health<gunHealth&&!b.breach.defeated;
  // The player update must expire the pickup before dealing the next swing.
  p.activePowerup.remainingMs=0;p.activePowerup.expiresAt=0;p.activePowerup.durationMs=0;p.update(1);
  const expired=!p.orbitBreaker&&hammer.destroyed;
  p.applyPowerup('orbit_breaker');const next=p.orbitBreaker;p.resetPowerups();const reset=next.destroyed&&!p.orbitBreaker;
  return{prototype:g.runPolicy.prototype,permissions:Object.entries(g.runPolicy).filter(([k,v])=>k.startsWith('allow')&&v),zeroDelta,killed,localClear,killCredit,score,noDuplicate,refresh,initialBound,finite,locked,ordinaryPart,expired,reset};
 });
 console.log(JSON.stringify(result));for(const key of ['prototype','zeroDelta','killed','localClear','noDuplicate','refresh','initialBound','finite','locked','ordinaryPart','expired','reset'])assert(result[key],key);
 assert.equal(result.killCredit,1);assert(result.score>0);assert.equal(result.permissions.length,0);checks.push(result);
 await page.evaluate(()=>{const g=window.__game,s=g.scenes.play;s.enemyManager.clearEnemies();s.player.resetPowerups();s.player.applyPowerup('orbit_breaker');s.player.x=640;s.player.y=480;
  for(let i=0;i<8;i++)s.player.orbitBreaker.update(1/60);s.hud.update();g.app.render();});
 await page.screenshot({path:path.join(out,'orbit-breaker.png')});
 const builds=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,m=s.enemyManager,original=s.player;const {Player}=await import('/src/entities/Player.js'),{ShipData}=await import('/src/config/ShipData.js'),{Enemy}=await import('/src/entities/Enemy.js');
  const rows=[];g.runMode='ranked_tactical';original.resetPowerups();
  for(const [name,gear]of [['Nova Sparrow','low'],['Quasar Fan','broad'],['Iron Orbit','slow'],['Glacier Scope','precision'],['Nova Sparrow','ghost'],['Nova Sparrow','drone'],['Nova Sparrow','chain'],['Nova Sparrow','piercing']]){
   m.clearEnemies();const hull=ShipData.find(h=>h.name.toLowerCase()===name.toLowerCase());if(!hull)throw Error('Missing hull '+name);
   const p=new Player(600,500,s.inputManager,s.gameplayGame,hull.spriteKey);s.player=p;
   if(gear==='drone')p.applyRunAugment('drones');if(gear==='ghost')p.applyPowerup('ghost');if(gear==='chain')p.applyPowerup('chain_lightning');if(gear==='piercing')p.applyPowerup('pierce');p.applyPowerup('orbit_breaker');
   const e=new Enemy(600,414,'grunt',6,s.gameplayGame);e.health=e.maxHealth=100;e.waitingForEntry=false;e.state='FORMATION';m.enemies.push(e);m.container.addChild(e.sprite);
   p.orbitBreaker.update(1/60);const damage=100-e.health;rows.push({name,gear,damage,oneHammer:s.gameContainer.children.filter(c=>c.label==='orbit_breaker').length===1,ghostPreserved:gear!=='ghost'||p.isGhostActive(),dronesPreserved:gear!=='drone'||p.drones.length>0});
   p.resetPowerups();p.clearDrones();p.sprite.destroy({children:true});
  }
  s.player=original;m.clearEnemies();original.applyPowerup('orbit_breaker');return rows;
 });
 for(const row of builds){assert(row.damage>0&&row.damage<=8,JSON.stringify(row));assert(row.oneHammer&&row.ghostPreserved&&row.dronesPreserved,JSON.stringify(row));}checks.push({builds});
 const frozen=await page.evaluate(()=>{const s=window.__game.scenes.play,h=s.player.orbitBreaker,age=h.age;
  s.isPaused=true;for(let i=0;i<60;i++)s.update(1);const pause=h.age===age;s.isPaused=false;
  const prior=s.updateTacticalDraft;s.updateTacticalDraft=()=>{};s.tacticalDraft={active:true};for(let i=0;i<60;i++)s.update(1);const draft=h.age===age;s.tacticalDraft=null;s.updateTacticalDraft=prior;
  s.externalPauseSuppressedUntil=0;s.pauseForExternalInterruption('orbit-test-focus');for(let i=0;i<60;i++)s.update(1);const focus=s.isPaused&&h.age===age;s.setPaused(false);
  return{pause,draft,focus};});assert(frozen.pause&&frozen.draft&&frozen.focus);checks.push(frozen);
 const departure=await page.evaluate(()=>{const s=window.__game.scenes.play;window.__oldHammer=s.player.orbitBreaker;s.destroy();return{destroyed:window.__oldHammer.destroyed,poolCleared:s.particleManager.premiumImpacts.slots.every(x=>!x.active)};});assert(departure.destroyed&&departure.poolCleared);checks.push(departure);
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',checks,errors},null,2));console.log('[orbit-breaker-runtime] PASS pickup/contact/credit/locks/refresh/expiry/pause/cleanup');
}finally{await browser.close();}
