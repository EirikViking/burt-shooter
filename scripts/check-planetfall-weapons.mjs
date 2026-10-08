import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=planetfall`);
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.boss?.isPlanetfall,null,{timeout:90000});
 const rows=await page.evaluate(async()=>{
  const {PlanetfallBoss}=await import('/src/entities/PlanetfallBoss.js'),{Player}=await import('/src/entities/Player.js');
  const {ShipData}=await import('/src/config/ShipData.js'),{getBossProfile}=await import('/src/config/BossRoster.js');
  const {AudioManager}=await import('/src/audio/AudioManager.js');AudioManager.enabled=false;
  const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();const original=s.player,results=[];
  const cases=[['Nova Sparrow','low'],['Circuit Tap','weak-rapid'],['Quasar Fan','broad'],['Iron Orbit','slow'],['Glacier Scope','precision'],
   ['Nova Sparrow','ghost'],['Nova Sparrow','drone'],['Nova Sparrow','chain'],['Nova Sparrow','piercing'],['Nova Sparrow','plasma_lance'],['Nova Sparrow','bomb']];
  for(const route of ['core','anchors'])for(const [name,gear]of cases){
   m.clearEnemies();m.clearPendingWaveSpawns();s.bulletManager.clearAll('planetfall-weapon-fixture');s.clearToastState();
   s.firstLightDirector.cancel('planetfall-weapon-fixture');s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;s.bossIntroActive=false;
   s.tacticalDraft=null;s.overrunMilestoneInterlude=null;s.gameOverInterlude=null;s.gameOverSequenceStarted=false;s.introActive=false;s.introComplete=true;s.isPaused=false;
   const hull=ShipData.find(h=>h.name.toLowerCase()===name.toLowerCase()),p=new Player(640,600,s.inputManager,s.gameplayGame,hull.spriteKey);s.player=p;
   if(gear==='drone')p.applyRunAugment('drones');else if(['ghost','chain','piercing','plasma_lance','bomb'].includes(gear))p.applyPowerup(({chain:'chain_lightning',piercing:'pierce'})[gear]||gear);
   if(gear==='bomb')p.bombArmedAt=p.getGameplayClockMs();
   const b=new PlanetfallBoss(640,100,10,s.gameplayGame,getBossProfile(10));await b.createSprite();m.boss=b;m.bossSpawnedThisLevel=true;
   m.enemies.push(b,...b.components);m.container.addChild(b.sprite);m.phase='BOSS';m.state='BOSS_ACTIVE';m.spawning=false;
   const kills=s.totalKills;let frames=0,shots=0,bombs=0,closedDamage=0;
   for(;frames<7200&&b.active;frames++){
    b.update(1);const target=route==='anchors'?b.components.find(c=>c.active&&c.part.role==='anchor')||b.components[4]:b.components[4];
    p.x+=Math.max(-p.speed,Math.min(p.speed,target.x-p.x));p.y=Math.min(s.gameplayGame.getHeight()*.84,target.y+190);
    p.shootCooldown=Math.max(0,p.shootCooldown-1000/60);p.updateDrones(1/60);
    if(p.canShoot()){if(gear==='bomb')p.queueBombTriggerIntent();const volley=p.shoot();shots+=volley.length;bombs+=volley.filter(b=>b.isBomb).length;for(const bullet of volley)s.bulletManager.addPlayerBullet(bullet);}
    // Damage-routing fixture, not a survival test: hostile volleys are tested separately.
    b.clearOwnedShots();s.bulletManager.update(1);const closed=!b.planetfall.irisOpen,before=b.planetfall.parts[4].health;s.checkCollisions();
    if(closed)closedDamage+=before-b.planetfall.parts[4].health;
   }
   results.push({route,name,gear,shots,bombs,seconds:frames/60,won:!b.active,credited:s.totalKills-kills,closedDamage,
    anchorsRemaining:b.planetfall.parts.slice(0,4).filter(p=>p.health>0).length,core:b.planetfall.parts[4].health});
   m.clearEnemies();s.bulletManager.clearAll('planetfall-weapon-end');p.destroy();s.player=original;
  }
  return results;
 });
 writeFileSync(path.join(out,'report.json'),JSON.stringify({rows,errors,scope:'22 real Player volley / production collision cases with bounded steering, including bomb splash; hostile shots removed; not survival or fun evidence'},null,2));
 assert.deepEqual(errors,[]);for(const row of rows){assert(row.won&&row.shots>0&&row.credited===1,JSON.stringify(row));assert.equal(row.closedDamage,0);if(row.route==='anchors')assert.equal(row.anchorsRemaining,0);if(row.gear==='bomb')assert(row.bombs>0,'bomb fixture must fire real bombs');}
 console.log('[planetfall-weapons] PASS',rows.length,'real volley routes, closed-core immunity and one victory each');
}finally{await browser.close();}
