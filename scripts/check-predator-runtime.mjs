import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {ShipData} from '../src/config/ShipData.js';
import {BONUS_CORES} from '../src/config/BonusCoreCatalog.js';
import {SPACE_SNAKES} from '../src/config/SpaceSnakes.js';
const out=path.resolve('test-results/predator-runtime');mkdirSync(out,{recursive:true});
const report={runtime:'predator-working-tree',surface:'Paused source browser, direct entity updates; no live platform services or FPS claim',errors:[],cores:[],snakes:[],note:'Staged isolated QA; no live platform services or real saves.'};
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720}});
const page=await context.newPage();
try{
 page.on('pageerror',e=>report.errors.push(e.message));
 await context.route('**/*',r=> /^(nova-swarm:|data:|blob:|https?:\/\/(127\.0\.0\.1|localhost)(:|\/))/.test(r.request().url())?r.continue():r.abort());
 await page.goto(`${process.env.CHECK_URL || 'http://127.0.0.1:4418'}/?offlineLeaderboard=1`);
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 const u=new URL(page.url());u.searchParams.set('offlineLeaderboard','1');await page.goto(u.href);
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await page.evaluate(async()=>{const m=await import('/src/config/ShipMetadata.js');m.updateShipUnlockProgress({level:60,rank:40,score:1000000});});
 await page.evaluate(key=>window.__game.startGame(key,{runMode:'ranked_tactical'}),ShipData.find(s=>s.traitSlug==='railbreaker').spriteKey);
 await page.waitForFunction(()=>window.__game?.scenes?.play?.player?.shipSprite?.texture?.source?.resource,null,{timeout:120000});
 await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);p.player.invulnerable=true;p.player.invulnerableTime=1e9;});
 await page.waitForFunction(()=>window.__game.scenes.play.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
 report.ship=await page.evaluate(()=>({name:window.__game.scenes.play.player.config?.name,texture:window.__game.scenes.play.player.shipSprite.texture.source.label})); assert.equal(report.ship.name,'RAILBREAKER');assert.ok(report.ship.texture.includes('predator-20260908/railbreaker.png')); const cadence=await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;p.bonusCoreCadence={nextLevel:g.level,waveRoll:0,entryDelay:1,age:0,waveKey:''};p.hasActiveBonusCore=false;const c=p.spawnAmbientBonusDrone('POWERUP',{x:p.player.x,y:p.player.y-100});window.__Core=c.constructor;window.__collisionCore=c;c.vx=c.vy=0;return{next:p.bonusCoreCadence.nextLevel,level:g.level,duplicateBlocked:p.spawnAmbientBonusDrone('POWERUP')===null};});
 assert.ok(cadence.duplicateBlocked&&cadence.next>=cadence.level+2&&cadence.next<=cadence.level+4);report.cadence=cadence;
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(500);await page.keyboard.up('ArrowUp');
 report.collision=await page.evaluate(()=>({active:window.__collisionCore.active,reward:window.__collisionCore.lastReward}));assert.equal(report.collision.active,false);assert.ok(report.collision.reward?.score>0);
 for(const c of BONUS_CORES){const row=await page.evaluate(id=>{const g=window.__game,p=g.scenes.play,c=new window.__Core(p.player.x+200,p.player.y-200,p.gameplayGame,'POWERUP',id);p.gameContainer.addChild(c.sprite);const before=g.score,powers=JSON.stringify([p.player.damage,p.player.speed,p.player.activePowerup,p.player.shieldActive,p.player.scoreMultiplier]);c.collect(p.player,p);const granted=g.score-before;c.collect(p.player,p);const duplicate=g.score-before-granted;const after=JSON.stringify([p.player.damage,p.player.speed,p.player.activePowerup,p.player.shieldActive,p.player.scoreMultiplier]);c.destroy();return{id,granted,duplicate,powers,after};},c.id);assert.ok(row.granted>0);assert.equal(row.duplicate,0);assert.equal(row.powers,row.after);report.cores.push(row);}
 await page.evaluate(()=>{const p=window.__game.scenes.play,m=p.enemyManager;m.update=()=>{};p.setPaused(true);p.player.takeDamage=()=>false;window.__game.lives=99;});
 for(const profile of SPACE_SNAKES){
  await page.evaluate(profile=>{const g=window.__game,p=g.scenes.play,m=p.enemyManager;g.level=6;m.level=6;m.state='WAVE_ACTIVE';m.waveEnding=false;m.clearPendingWaveSpawns();m.enemies.forEach(e=>e.destroy());m.enemies=[];p.ambientBonusDrones.forEach(c=>c.destroy());p.ambientBonusDrones=[];p.hasActiveBonusCore=false;p.bonusCoreCadence={nextLevel:999,waveRoll:0,entryDelay:1,age:0,waveKey:''};m.waveActiveTimer=0;m.waveStragglerPressureCount=0;m.waveStragglerPressureLastAt=0;m.waveStragglerRetreatTriggered=false;m.waveObjectiveFailsafeTriggered=false;p.player.x=g.getWidth()*.5;p.player.y=g.getHeight()*.88;p.player.shoot=()=>[];window.__snake=m.spawnSpaceSnake(profile);window.__snake.sections.forEach(e=>e.__qaOriginalHealth=e.health);},profile);
  await page.evaluate(()=>{for(let frame=0;frame<300;frame++)for(const e of window.__snake.sections)e.update(1);});
  const timing={method:'300 deterministic section-update frames while scene paused; no FPS claim'};
  const row=await page.evaluate(()=>{const c=window.__snake;return{id:c.sections[0].type,age:c.age,gap:43*c.sections[0].snakeScale*c.sections[0].snakeProfile.bodyScale,joints:c.sections.filter(e=>e.active).slice(1).map((e,i)=>{const ahead=c.sections.filter(e=>e.active)[i];return Math.hypot(e.x-ahead.x,e.y-ahead.y);}),textures:c.sections.map(e=>e.body.texture.width)};});assert.ok(row.age>2&&row.textures.every(w=>w>2));assert.ok(row.joints.every(d=>Math.abs(d-row.gap)<.1));
  row.timing=timing;await page.screenshot({path:path.join(out,profile.id+'.png')});
  row.finale=await page.evaluate(()=>{const p=window.__game.scenes.play;p.bonusCoreCadence.nextLevel=6;p.hasActiveBonusCore=false;for(const e of window.__snake.sections)if(e.active){e.takeDamage(10000);p.onEnemyKilled(e);}const rewards=p.ambientBonusDrones.filter(c=>c.active&&c.fromSpaceSnake);return{defeat:p.lastSpaceSnakeDefeat,rewards:rewards.length,survivesCleanup:rewards.every(c=>!p.getWaveCleanupTargets().includes(c))};});assert.equal(row.finale.rewards,1,JSON.stringify(row));assert.ok(row.finale.defeat.bounty>0&&row.finale.survivesCleanup);report.snakes.push(row);
  await page.waitForTimeout(200);await page.screenshot({path:path.join(out,profile.id+'-death.png')});await page.waitForTimeout(20);
 }
 report.trait=await page.evaluate(()=>{const p=window.__game.scenes.play;p.gameTime=10;p.hud.updateTraitMeter();return{time:p.gameTime,visible:p.hud.traitGroup.visible};});assert.equal(report.trait.visible,false);
 await page.evaluate(()=>window.__game.scenes.play.setPaused(true));await page.waitForTimeout(200);report.pauseTrait=await page.evaluate(()=>window.__game.scenes.play.pauseOverlay.children.find(c=>c.label==='ui_pauseTraitExplanation')?.text);assert.ok(report.pauseTrait?.length>15);await page.screenshot({path:path.join(out,'pause-trait.png')});
 
 for(const [width,height,sector]of[[1280,720,6],[1920,1080,20],[960,600,410]]){await page.setViewportSize({width,height});await page.waitForTimeout(400);await page.evaluate(sector=>{const g=window.__game;g.level=sector;g.scenes.play.hud.update();},sector);await page.screenshot({path:path.join(out,`sector-${sector}-${width}.png`)});}
 report.codex=[];
 for(const category of ['bonusCores','spaceSnakes']){const row=await page.evaluate(category=>{const g=window.__game;g.switchScene('threatCodex');const c=g.scenes.threatCodex;for(let i=0;i<14;i++){c.categoryIndex=i;if(c.getCategory().id===category)break;}c.entryIndex=0;c.init();return{category:c.getCategory().id,count:c.getEntriesForCategory().length,discoveries:c.discoveryState.items[category]};},category);assert.equal(row.category,category);assert.equal(row.count,category==='bonusCores'?10:14);for(const item of Object.values(row.discoveries)){assert.ok(category==='spaceSnakes'?item.timesDefeated>0:item.metadata.collected>0,JSON.stringify(item));}report.codex.push(row);await page.waitForTimeout(500);await page.screenshot({path:path.join(out,category+'-codex.png')});}
 assert.deepEqual(report.errors,[]);report.status='passed';console.log('PASS staged source entities, cores, cadence, collision, Codex and contextual HUD');
}catch(error){report.status='failed';report.failure=error.stack;throw error;}finally{writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
