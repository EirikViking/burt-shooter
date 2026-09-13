import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {SPACE_SNAKES} from '../src/config/SpaceSnakes.js';
import {planSnakeBrood,SNAKE_BROOD_FAMILIES} from '../src/config/SnakeBroods.js';
const out=process.env.CHECK_OUTPUT_DIR||'E:/Codex/builds/nova-swarm/snake-broods/qa';fs.mkdirSync(out,{recursive:true});
const plans=Array.from({length:20000},(_,i)=>planSnakeBrood({seed:`sample-${i}`,profile:SPACE_SNAKES[i%14]}));
const rate=plans.filter(p=>p.enabled).length/plans.length;assert.ok(rate>.24&&rate<.26);assert.equal(new Set(plans.map(p=>p.count)).size,16);
assert.equal(new Set(SNAKE_BROOD_FAMILIES.map(f=>f.weapon)).size,14);
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],rows=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message);});
await page.route('**/*',r=>/^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(r.request().url())?r.continue():r.abort());
try{
 await page.goto((process.env.CHECK_URL||'http://127.0.0.1:5219')+'/?skipIntro=1&offlineLeaderboard=1',{waitUntil:'commit',timeout:20000});
 await page.waitForFunction(()=>document.body.dataset.menuReady==='1',null,{timeout:90000});
 await page.evaluate(()=>window.__game.startGame(undefined,{runMode:'unranked',countShipUsage:false}));
 await page.waitForFunction(()=>window.__game.scenes.play.player?.sprite&&window.__game.scenes.play.enemyManager?.waves?.length,null,{timeout:60000});
 await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play;g.app.ticker.stop();p.setPaused(false);p.introActive=false;p.introComplete=true;if(p.introOverlay)p.introOverlay.visible=false;
  const {AudioManager}=await import('/src/audio/AudioManager.js');AudioManager.enabled=false;AudioManager.stopAllVoices();
  p.inputManager.isFiring=()=>false;p.isDebugInvincibleActive=()=>true;p.player.sprite.visible=true;p.player.shipSprite.visible=true;
 });
 for(const [index,profile] of SPACE_SNAKES.entries()){
  const count=index%2?5:20;
  await page.evaluate(async({id,count})=>{
   const g=window.__game,p=g.scenes.play,m=p.enemyManager;m.clearEnemies();p.clearEnemyBullets();p.clearBossHazards();m.state='BROOD_QA';m.boss=null;m.discoveryEncounter=null;g.level=m.level=30;
   const {getSpaceSnakeProfile}=await import('/src/config/SpaceSnakes.js');
   m.spawnSpaceSnake(getSpaceSnakeProfile(id),{force:true,count});window.__brood=[...m.snakeBroods][0];await window.__brood.promise;
   window.__broodMotion=[];window.__peak=0;
  },{id:profile.id,count});
  const run=frames=>page.evaluate(frames=>{
   const g=window.__game,p=g.scenes.play,m=p.enemyManager,b=window.__brood;
   for(let n=0;n<frames;n++){
    p.player.x=g.getWidth()*(.5+Math.sin(b.age*.65)*.28);p.player.y=g.getHeight()*.84;p.player.sprite.position.set(p.player.x,p.player.y);
    m.updateEnemies(1);p.bulletManager.update(1);p.particleManager.update(1);
    if(n%20===0&&b.babies[0])window.__broodMotion.push([b.babies[0].x,b.babies[0].y]);
    window.__peak=Math.max(window.__peak,p.bulletManager.enemyBullets.filter(b=>b.active).length);
   }g.app.renderer.render({container:g.app.stage});
  },frames);
  await run(960);
  await page.screenshot({path:`${out}/${profile.id}-combat.png`});
  const row=await page.evaluate(()=>{
   const g=window.__game,p=g.scenes.play,m=p.enemyManager,b=window.__brood;
   const allFinite=b.babies.every(a=>Number.isFinite(a.x+a.y+a.health))&&p.bulletManager.enemyBullets.every(a=>Number.isFinite(a.x+a.y));
   const health=b.chain.sections.reduce((n,a)=>n+a.health,0);b.chain.sections.forEach(a=>a.health=a.maxHealth*.5);
   if(b.family.heals){for(let i=0;i<100;i++)b.heal(b.babies[0],b.initialHealth*.05);}
   const first=b.babies[0],score=g.score;
   const killed=p.applyCombatDamage(first,9999,'player_projectile');if(killed){g.addScore(p.getNormalWaveScoreAward(p.getComboScore(first.scoreValue),first));p.onEnemyKilled(first);}
   const double=p.applyCombatDamage(first,9999,'player_projectile');
   return {family:b.family.id,count:b.born,shots:b.shots,peakBullets:window.__peak,health,killed,double,scoreGain:g.score-score,allFinite,
    healing:b.healed,healBudget:b.healBudget,heals:b.family.heals,fx:b.fx.length,
    xRange:Math.max(...window.__broodMotion.map(p=>p[0]))-Math.min(...window.__broodMotion.map(p=>p[0])),
    yRange:Math.max(...window.__broodMotion.map(p=>p[1]))-Math.min(...window.__broodMotion.map(p=>p[1]))};
  });
  assert.equal(row.count,count);assert.ok(row.shots>0);assert.ok(row.allFinite);assert.ok(row.killed&&!row.double);assert.ok(row.scoreGain>0);assert.ok(row.xRange>100&&row.yRange>70);
  assert.ok(row.healing<=row.healBudget+.0001);if(row.heals)assert.ok(row.healing>0);
  await page.evaluate(()=>window.__brood.chain.sections.forEach(s=>{s.active=false;}));await run(130);
  const cleanup=await page.evaluate(async()=>{
   const b=window.__brood,m=b.manager;m.clearEnemies();
   const {SnakeBroodAudio}=await import('/src/audio/SnakeBroodAudio.js');
   return {disposed:b.disposed,live:m.enemies.filter(e=>e.active).length,broods:m.snakeBroods.size,voices:SnakeBroodAudio.diagnostics.voices};
  });assert.deepEqual(cleanup,{disposed:true,live:0,broods:0,voices:0});
  rows.push({...row,cleanup});console.log(JSON.stringify(row));fs.writeFileSync(`${out}/runtime.json`,JSON.stringify({mode:'Actual runtime actors, isolated browser, stepped time and invulnerable QA player. Not human balance evidence.',rate,rows,errors},null,2));
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
