import assert from'node:assert/strict';import{mkdirSync,writeFileSync}from'node:fs';import path from'node:path';import{chromium}from'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
try{const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4896'}/?encounterEvolution=natural&autostart=1&offlineLeaderboard=1`);
await page.waitForFunction(()=>window.__game?.scenes?.play?.introComplete&&window.__game?.scenes?.play?.enemyManager?.state==='WAVE_ACTIVE'&&!window.__game.scenes.play.enemyManager.spawning,null,{timeout:90000});
const result=await page.evaluate(async()=>{const g=window.__game,s=g.scenes.play,m=s.enemyManager,p=s.player;g.app.ticker.stop();m.clearEnemies();g.runMode='ranked_tactical';g.level=m.level=16;m.state='WAVE_ACTIVE';m.spawning=true;
const {Enemy}=await import('/src/entities/Enemy.js');const {Bullet}=await import('/src/entities/Bullet.js');
const {getActiveTacticalFusionProtocols}=await import('/src/config/TacticalDraft.js');
for(const id of ['drones','salvage_clock','phase_reactor','phase_wake','blink_drive'])p.applyRunAugment(id);
const ids=getActiveTacticalFusionProtocols(['drones','salvage_clock','phase_reactor','phase_wake','blink_drive']).map(f=>f.id);
const target=new Enemy(640,200,'grunt',16,s.gameplayGame);target.health=target.maxHealth=100;m.enemies.push(target);m.container.addChild(target.sprite);
const captures=[];for(const type of ['grunt','striker','turret']){m.behavioralFusions.clear();s.bulletManager.clearAll('fixture');m.combatWrecks.clear();const e=new Enemy(400,280,type,16,s.gameplayGame);e.health=0;m.combatWrecks.record(e);e.destroy();
m.behavioralFusions.update(1);const capture=m.behavioralFusions.capture,wing=p.drones.at(-1);const worldMount=capture.x===p.x+(wing?.x??62)&&capture.y===p.y+(wing?.y??0)-35;
for(let i=0;i<370;i++)m.behavioralFusions.update(1);const shots=s.bulletManager.playerBullets.filter(b=>b.tacticalFusionId==='salvage_crown');s.bulletManager.update(1);captures.push({type,n:shots.length,worldMount,inBounds:shots.every(b=>b.active&&b.y>0),friendly:shots.every(b=>b.isPlayer&&b.isBehavioralFusionShot),bounded:shots.every(b=>b.damage<=8),speeds:[...new Set(shots.map(b=>Math.round(b.speed)))]});}
const lifetimeShot=s.bulletManager.playerBullets.find(b=>b.tacticalFusionId==='salvage_crown');lifetimeShot.vx=lifetimeShot.vy=0;lifetimeShot.update(201);const beforeExpiry=lifetimeShot.active;lifetimeShot.update(9);const expiry=beforeExpiry&&!lifetimeShot.active;
m.behavioralFusions.clear();s.bulletManager.clearAll('fixture');p.x=400;p.y=580;p.startDodge();p.x=750;p.y=520;
// Real Phase-only cleared shots earn allocation through the shipped exit pulse.
for(let i=0;i<8;i++){const b=new Bullet(p.x+i*2,p.y-8,0,1,1,0xff6633,false);s.bulletManager.addEnemyBullet(b);}
const phaseMethod='resolveDodgeExitPulse';
if(!phaseMethod)throw Error('Missing actual dodge exit pulse');p[phaseMethod]();
const queued=m.behavioralFusions.queue.filter(q=>q.id==='rift_crossfire').length;
for(let i=0;i<65;i++)m.behavioralFusions.update(1);const echoes=s.bulletManager.playerBullets.filter(b=>b.tacticalFusionId==='rift_crossfire');
const sources=[...new Set(echoes.map(b=>`${b.x},${b.y}`))];const noImmediate=s.bulletManager.playerBullets.every(b=>b.tacticalFusionId!=='rift_reprisal');
const before=echoes.length;m.behavioralFusions.queueRift({start:{x:10,y:10},end:{x:10,y:10},count:0,damage:1,token:55});for(let i=0;i<70;i++)m.behavioralFusions.update(1);
const noFree=s.bulletManager.playerBullets.filter(b=>b.tacticalFusionId==='rift_crossfire').length===before;
g.runMode='overrun_pure';m.behavioralFusions.update(1);const pure=m.behavioralFusions.queue.length===0&&!m.behavioralFusions.capture;m.clearEnemies();
return {ids,captures,expiry,queued,shots:echoes.length,sources,noImmediate,noFree,pure,cleanup:!m.behavioralFusions.queue.length,phaseMethod};});
console.log(JSON.stringify(result));assert(result.ids.includes('salvage_crown')&&result.ids.includes('rift_crossfire'));
assert(result.captures.every(c=>c.n===9&&c.friendly&&c.bounded&&c.worldMount&&c.inBounds));assert(result.expiry);assert(result.queued>0&&result.queued<=5);assert.equal(result.shots,result.queued);assert.equal(result.sources.length,2);assert(result.noImmediate&&result.noFree&&result.pure&&result.cleanup);assert.deepEqual(errors,[]);
writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',result,errors},null,2));}finally{await browser.close();}
