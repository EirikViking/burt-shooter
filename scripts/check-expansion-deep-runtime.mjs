import assert from'node:assert/strict';import{mkdirSync,writeFileSync}from'node:fs';import path from'node:path';import{chromium}from'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
try{const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4896'}/?encounterEvolution=breach&autostart=1&offlineLeaderboard=1`);
await page.waitForFunction(()=>window.__game?.scenes?.play?.encounterExpansionTestReady,null,{timeout:90000});
const result=await page.evaluate(async()=>{const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();m.clearEnemies();g.level=m.level=200;m.state='BOSS_ACTIVE';m.phase='BOSS';m.highSectorEscalationState={active:true,caps:{maxBossHealth:40}};
const b=await m.spawnBoss(200);const cap=b.breach.maxHealth===40&&Math.abs(b.breach.health-40)<1e-6;
const locked=b.components.find(c=>c.type==='reactor'),hp=locked.health;s.applyCombatDamage(locked,999,'bomb');const noLocked=locked.health===hp;
const first=b.components.find(c=>c.type==='gun_0');b.age=4;b.update(1);const lives=g.lives;g.lives--;b.update(1);const recovery=b.warning===null&&b.nextAttack>b.age&&b.shots.every(p=>!p.active);g.lives=lives;
const count=s.totalKills,score=g.score;for(const id of ['relay_0','relay_1','hull','reactor','reactor'])s.applyCombatDamage(b.components.find(c=>c.type===id),999,'primary');
const once=s.totalKills-count===1&&g.score>score;m.clearEnemies();return{cap,noLocked,recovery,once,prototype:g.runPolicy.prototype,permissions:Object.entries(g.runPolicy).filter(([k,v])=>k.startsWith('allow')&&v)};});
for(const k of ['cap','noLocked','recovery','once','prototype'])assert(result[k],k);assert.equal(result.permissions.length,0);assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',result,errors},null,2));console.log(JSON.stringify(result));}finally{await browser.close();}
