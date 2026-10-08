import assert from 'node:assert/strict';import{mkdirSync,writeFileSync}from'node:fs';import path from'node:path';import{chromium}from'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
try{const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4896'}/?encounterEvolution=natural&autostart=1&offlineLeaderboard=1`);
await page.waitForFunction(()=>window.__game?.scenes?.play?.introComplete&&window.__game?.scenes?.play?.enemyManager?.state==='WAVE_ACTIVE'&&!window.__game.scenes.play.enemyManager.spawning,null,{timeout:90000});
const results=[];for(const id of ['graveyard','siege','migration']){
const setup=await page.evaluate(async id=>{const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();m.clearEnemies();g.level=m.level=16;m.state='WAVE_ACTIVE';m.spawning=true;
const {AuthoredEnvironment}=await import('/src/managers/AuthoredEnvironment.js');const {ENVIRONMENTS}=await import('/src/game/EncounterEnvironments.js');
await AuthoredEnvironment.prewarm();
const env=m.environment=new AuthoredEnvironment(m,ENVIRONMENTS.find(e=>e.id===id),{count:6});if(env.chain?.brood)await env.chain.brood.promise;
for(let i=0;i<260;i++)m.updateEnemies(1);
if(id==='graveyard'){const e=env.guns[2];e.health=0;s.onEnemyKilled(e);env.update(1);m.combatWreckVisual.update();}
g.app.render();return {active:env.active,guns:env.guns.length,cover:env.covers.length,babies:env.chain?.brood?.babies.length||0,prototype:g.runPolicy.prototype};},id);
await page.screenshot({path:path.join(out,`${id}.png`)});
const result=await page.evaluate(async id=>{const g=window.__game,s=g.scenes.play,m=s.enemyManager,e=m.environment;const score=g.score;let mechanic=false;
if(id==='graveyard'){const{Bullet}=await import('/src/entities/Bullet.js');const r=e.covers[0],b=new Bullet(r.x,r.y,0,-5,1,0x66ccff,true);b.piercing=true;s.bulletManager.addPlayerBullet(b);e.intercept();const hp=r.health;e.intercept();mechanic=!b.active&&hp===r.health&&g.score===score;}
if(id==='siege'){const gun=e.guns[0],relay=e.relays[0];const before=gun.health;gun.takeDamage(.1);const armor=before-gun.health;relay.takeDamage(1000);const after=gun.health;gun.takeDamage(.1);mechanic=!relay.active&&!gun.canShoot()&&after-gun.health>armor&&g.score===score;}
if(id==='migration'){const brood=e.chain.brood;for(const section of e.chain.sections)section.active=false;brood.update(1);mechanic=brood.orphanAt!==null&&brood.babies.every(b=>b.isDeparting());}
for(let i=0;i<1100;i++)m.updateEnemies(1);const expired=!e.active;m.clearEnemies();return{mechanic,expired,clean:!m.environment&&!m.combatWrecks.records.length,objectives:m.getObjectiveEnemyCount()};},id);
console.log(JSON.stringify({id,setup,result}));assert(setup.active&&setup.prototype);assert(result.mechanic&&result.expired&&result.clean);assert.equal(result.objectives,0);results.push({id,setup,result});}
assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',results,errors},null,2));}finally{await browser.close();}
