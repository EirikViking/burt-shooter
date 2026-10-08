import assert from 'node:assert/strict';import {mkdirSync,writeFileSync}from'node:fs';import path from'node:path';import{chromium}from'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
try{const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4896'}/?encounterEvolution=natural&autostart=1&offlineLeaderboard=1`);
await page.waitForFunction(()=>window.__game?.scenes?.play?.introComplete,null,{timeout:90000});
await page.waitForFunction(()=>window.__game.scenes.play.enemyManager.state==='WAVE_ACTIVE'&&!window.__game.scenes.play.enemyManager.spawning,null,{timeout:60000});
const results=[];for(let layout=0;layout<2;layout++){
const setup=await page.evaluate(async layout=>{const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();m.clearEnemies();g.level=m.level=10;m.phase='BOSS';m.state='BOSS_ACTIVE';m.spawning=false;
const {DreadnoughtBoss}=await import('/src/entities/DreadnoughtBoss.js');const {getBossProfile}=await import('/src/config/BossRoster.js');
const b=new DreadnoughtBoss(600,100,10,s.gameplayGame,getBossProfile(10),layout);await b.createSprite();m.boss=b;m.bossSpawnedThisLevel=true;
m.enemies.push(b,...b.components);m.container.addChild(b.sprite);window.__breach=b;for(let i=0;i<170;i++)m.updateEnemies(1);g.app.render();
return{components:b.components.length,budget:b.breach.maxHealth,health:b.health,name:b.name,phase:b.phase,untargetable:b.untargetable,backgroundRadius:s.getCollisionRadius(b),shots:b.shots.length};},layout);
await page.screenshot({path:path.join(out,`layout-${layout}.png`)});
const result=await page.evaluate(layout=>{const g=window.__game,s=g.scenes.play,m=s.enemyManager,b=window.__breach;
const kills=s.totalKills,score=g.score;const damage=id=>s.applyCombatDamage(b.components.find(c=>c.type===id),b.maxHealth*10,'primary');
for(const id of (layout?['gun_0','gun_1']:['relay_0','relay_1'])){damage(id);for(let i=0;i<5;i++)m.updateEnemies(1);}
const hull=b.breach.stage==='hull'&&b.phase===2;damage('hull');for(let i=0;i<5;i++)m.updateEnemies(1);const reactor=b.breach.stage==='reactor'&&b.phase===3;damage('reactor');
const scored=g.score-score,exact=s.totalKills-kills;damage('reactor');damage('gun_0');const noDuplicate=g.score-score===scored&&s.totalKills-kills===exact;
const clear=b.health===0&&!b.active,shotsCleared=b.shots.every(p=>!p.active);m.update(1);const complete=m.bossDefeatedThisLevel&&m.state==='LEVEL_COMPLETE';
const collapse=Boolean(m.breachCollapses?.size);for(let i=0;i<100;i++)m.updateEnemies(1);const finite=!m.breachCollapses?.size;
m.clearEnemies();return{hull,reactor,clear,exact,scored,noDuplicate,shotsCleared,complete,collapse,finite};},layout);
console.log(JSON.stringify({layout,setup,result}));for(const k of ['hull','reactor','clear','noDuplicate','shotsCleared','complete','collapse','finite'])assert(result[k],k);assert.equal(result.exact,1);assert(result.scored>0);assert.equal(setup.backgroundRadius,0);
assert.equal(setup.name,'Dreadnought Breach');assert.equal(setup.phase,1);results.push({layout,setup,result});}
assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',results,errors},null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
