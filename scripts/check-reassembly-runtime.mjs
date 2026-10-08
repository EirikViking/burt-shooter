import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4896'}/?encounterEvolution=natural&autostart=1&offlineLeaderboard=1`);
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager&&window.__game.scenes.play.introComplete,null,{timeout:90000});
 await page.waitForFunction(()=>window.__game.scenes.play.enemyManager.state==='WAVE_ACTIVE'&&!window.__game.scenes.play.enemyManager.spawning,null,{timeout:60000});
 const result=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();m.clearEnemies();
  const {createMysteryEncounter}=await import('/src/entities/mysteries/createMysteryEncounter.js');
  const {Enemy}=await import('/src/entities/Enemy.js');
  const {Bullet}=await import('/src/entities/Bullet.js');
  g.level=m.level=23;m.state='WAVE_ACTIVE';m.spawning=true;
  const a=await createMysteryEncounter(m,'carrion_weaver');a.age=3;a.state='FORMATION';a.recoveryUntil=0;
  const e=new Enemy(400,320,'grunt',23,s.gameplayGame);e.createSprite();e.health=0;m.combatWrecks.record(e);e.sprite.destroy({children:true});
  for(let i=0;i<85;i++)m.updateEnemies(1);
  const assembling=a.reassembly.model.state==='warning';
  for(let i=0;i<100;i++)m.updateEnemies(1);
  const p=a.reassembly.platform;const active=a.reassembly.model.state==='active';
  const shots=a.bullets.filter(b=>b.active&&b.weaponProfileId==='wreckweaver_platform').length;
  const before=g.score;const hp=a.health;
  p.takeDamage(1);p.takeDamage(p.health);a.reassembly.update(1/60);
  const interrupted=a.reassembly.model.state==='done';const noReward=g.score===before&&a.health===hp;
  const noShots=a.bullets.every(b=>!b.active||b.weaponProfileId!=='wreckweaver_platform');
  a.destroy();m.clearEnemies();
  const empty=await createMysteryEncounter(m,'carrion_weaver');empty.age=3;empty.state='FORMATION';empty.recoveryUntil=0;
  for(let i=0;i<500;i++)m.updateEnemies(1);
  const fallback=empty.reassembly.model.state==='done'&&!empty.reassembly.model.attempted&&empty.stats.attacks>0;
  m.clearEnemies();
  return {assembling,active,shots,interrupted,noReward,noShots,fallback,cleanup:m.combatWrecks.records.length===0,
    prototype:g.runPolicy.prototype,permissions:Object.keys(g.runPolicy).filter(k=>k.startsWith('allow')&&g.runPolicy[k])};
 });
 assert(result.prototype);assert.equal(result.permissions.length,0);
 for(const key of ['assembling','active','interrupted','noReward','noShots','fallback','cleanup'])assert(result[key],key);
 assert(result.shots>0);assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(out,'reassembly-cleanup.png')});
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',result,errors},null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
