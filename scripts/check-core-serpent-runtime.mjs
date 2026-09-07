import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {ShipData} from '../src/config/ShipData.js';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.env.CORE_QA_OUT||'test-results/core-serpent-runtime';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={errors:[],cores:[],snakes:[],note:'Staged isolated QA. Not natural progression or evidence of human enjoyment.'};
try{
 const context=await browser.newContext({viewport:{width:1280,height:720}});
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.pathname==='/api/highscores')return r.fulfill({status:200,contentType:'application/json',body:'[]'});return ['localhost','127.0.0.1'].includes(u.hostname)||['data:','blob:'].includes(u.protocol)?r.continue():r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto((process.env.CHECK_URL||'http://127.0.0.1:4399')+'/?offlineLeaderboard=1');
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await page.evaluate(key=>window.__game.startGame(key,{runMode:'ranked_tactical'}),ShipData.find(s=>s.id==='nova_ship_01').spriteKey);
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
 await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play;g.markUnrankedRun('core_serpent_qa');p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);
  p.player.invulnerable=true;p.player.invulnerableTimer=1e9;
  window.__coreQA={Core:(await import('/src/entities/BonusDrone.js')).BonusDrone,cores:(await import('/src/config/BonusCoreCatalog.js')).BONUS_CORES,snakes:(await import('/src/config/SpaceSnakes.js')).SPACE_SNAKES};
  await (await import('/src/utils/GameAssets.js')).GameAssets.ensureBonusCoreTexture();
 });
 // Input smoke on an ordinary wave before staging the new content.
 await page.keyboard.down('Space');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(800);await page.keyboard.up('ArrowLeft');await page.keyboard.up('Space');
 for(let i=0;i<10;i++){
  const row=await page.evaluate(i=>{
   const g=window.__game,p=g.scenes.play,q=window.__coreQA,c=q.cores[i];
   const core=new q.Core(640,420,g,'POWERUP',c.id);p.gameContainer.addChild(core.sprite);
   const before=core.x;core.update(60);const movement=Math.abs(core.x-before);
   const indestructible=core.takeDamage(999999)===false&&core.active;
   const beforeScore=g.score;
   const beforePowers=JSON.stringify([p.player.activePowerup,p.player.damage,p.player.speed,p.player.shieldActive,p.player.scoreMultiplier]);
   core.collect(p.player,p);
   const granted=g.score-beforeScore;
   const afterPowers=JSON.stringify([p.player.activePowerup,p.player.damage,p.player.speed,p.player.shieldActive,p.player.scoreMultiplier]);
   core.collect(p.player,p);const duplicateScore=g.score-beforeScore-granted;
   core.destroy();return{id:c.id,reward:c.reward,granted,duplicateScore,beforePowers,afterPowers,movement,indestructible};
  },i);assert.ok(row.indestructible&&row.movement>25);assert.ok(row.granted>0);assert.equal(row.duplicateScore,0);assert.equal(row.beforePowers,row.afterPowers);report.cores.push(row);
 }
 await page.evaluate(()=>{
  const g=window.__game,p=g.scenes.play,m=p.enemyManager;
  m.clearPendingWaveSpawns();for(const e of m.enemies)e.destroy();m.enemies=[];
  p.ambientBonusDrones.forEach(c=>c.destroy());p.ambientBonusDrones=[];
  for(let i=0;i<10;i++){const c=new window.__coreQA.Core(p.gameplayGame.getWidth()*(.1+(i%5)*.20),p.gameplayGame.getHeight()*(.38+Math.floor(i/5)*.32),p.gameplayGame,'POWERUP',window.__coreQA.cores[i].id);c.vx=c.vy=0;c.update(1);p.gameContainer.addChild(c.sprite);p.ambientBonusDrones.push(c);}
  g.app.ticker.stop();g.app.renderer.render(g.app.stage);
 });
 await page.screenshot({path:`${out}/cores.png`});
 for(let index=0;index<4;index++){
  console.log('Checking snake',index+1);
  await page.evaluate(index=>{
   const g=window.__game,p=g.scenes.play,m=p.enemyManager;p.setPaused(false);g.app.ticker.start();g.level=6;
   p.ambientBonusDrones.forEach(c=>c.destroy());p.ambientBonusDrones=[];p.hasActiveBonusCore=false;p.bonusCoreCadence={nextLevel:6,waveRoll:0,entryDelay:1,age:0,waveKey:''};m.clearPendingWaveSpawns();m.enemies.forEach(e=>e.destroy());m.enemies=[];m.level=6;m.state='WAVE_ACTIVE';m.waveEnding=false;
   window.__snake=m.spawnSpaceSnake(window.__coreQA.snakes[index]);
  },index);
  await page.waitForTimeout(5500);
  const row=await page.evaluate(()=>{
   const chain=window.__snake;return {id:chain.sections[0].type,age:chain.age,gap:43*chain.sections[0].snakeScale,sections:chain.sections.map(e=>({x:e.x,y:e.y,hp:e.health,texture:e.body.texture.width})),joints:chain.sections.slice(1).map((e,i)=>Math.hypot(e.x-chain.sections[i].x,e.y-chain.sections[i].y))};
  });assert.ok(row.age>2);assert.ok(row.sections.every(e=>Number.isFinite(e.x)&&e.texture>2));assert.ok(row.joints.every(d=>Math.abs(d-row.gap)<.1));
  await page.screenshot({path:`${out}/snake-${index+1}.png`});
  const damage=await page.evaluate(()=>{const c=window.__snake,e=c.sections[3];const before=e.health;e.takeDamage(1);const after=e.health;e.takeDamage(10000);return{before,after,active:e.active};});
  assert.equal(damage.after,damage.before-1);assert.equal(damage.active,false);row.damage=damage;report.snakes.push(row);
  const finale=await page.evaluate(()=>{
   const p=window.__game.scenes.play;
   for(const e of window.__snake.sections)if(e.active){e.takeDamage(10000);p.onEnemyKilled(e);}
   const rewards=p.ambientBonusDrones.filter(c=>c.fromSpaceSnake&&c.active);
   const cleanup=p.getWaveCleanupTargets();
   return{defeat:p.lastSpaceSnakeDefeat,rewards:rewards.length,survivesCleanup:rewards.every(c=>!cleanup.includes(c))};
  });assert.equal(finale.rewards,1);assert.ok(finale.defeat.bounty>0);assert.ok(finale.survivesCleanup);row.finale=finale;
  await page.waitForTimeout(180);await page.screenshot({path:`${out}/snake-${index+1}-death.png`});
  await page.waitForTimeout(1500);
 }
 await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play,m=p.enemyManager;m.clearPendingWaveSpawns();m.enemies.forEach(e=>e.destroy());m.enemies=[];
  const {EnemyOrbitRig,preloadEnemyOrbitMaterial}=await import('/src/effects/EnemyOrbitRig.js');await preloadEnemyOrbitMaterial();const seen=new Set();window.__rigs=[];
  for(let n=0;seen.size<6&&n<100;n++){
   const e={type:'nova_orbit_'+n,radius:30,visualVariant:{accent:[0x59dfff,0xff994b,0xb59aff,0xc2ff63,0xff86c8,0xffd86a][seen.size]}};
   const rig=new EnemyOrbitRig(e);if(seen.has(rig.family)){rig.destroy({children:true});continue;}seen.add(rig.family);
   rig.position.set(240+(seen.size-1)%3*480,350+Math.floor((seen.size-1)/3)*300);rig.scale.set(1.7);rig.update(80);p.gameContainer.addChild(rig);window.__rigs.push(rig);
  }
  await Promise.resolve();g.app.ticker.stop();g.app.renderer.render(g.app.stage);
 });await page.screenshot({path:`${out}/orbit-rigs.png`});
 // Prove cosmetic progress and collision pickup without granting combat powers.
 const cosmetic=await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play,q=window.__coreQA;
  for(let i=0;i<3;i++){const c=new q.Core(p.player.x,p.player.y,p.gameplayGame,'POWERUP','bonus_core_relic');p.gameContainer.addChild(c.sprite);c.collect(p.player,p);c.destroy();}
  const {updateRelicHullDetail}=await import('/src/effects/RelicHullDetail.js');updateRelicHullDetail(p.player);
  const {getRelicCollectionCount}=await import('/src/progression/BonusCoreRewards.js');
  return {count:getRelicCollectionCount(),visible:p.player.relicDetail?.visible};
 });assert.ok(cosmetic.count>=3&&cosmetic.visible);report.cosmetic=cosmetic;
 report.codex=[];
 for(const locale of ['en','de','es','ru','zh-CN','pt-BR','ko','ja'])for(const category of ['bonusCores','spaceSnakes']){
  console.log('Checking Codex',locale,category);
  const state=await page.evaluate(async({locale,category})=>{
   const g=window.__game;
   await window.__novaI18n.setLanguagePreference(locale);if(window.__novaI18n.getCurrentLanguage()!==locale)throw Error('Locale did not change');
   const {recordThreatSeen}=await import('/src/progression/ThreatDiscoveryState.js');
   const {THREAT_CODEX_CATEGORIES,getThreatCodexCatalog}=await import('/src/config/ThreatCodexCatalog.js');
   for(const e of getThreatCodexCatalog()[category])recordThreatSeen(e.id,category,{name:e.name});
   g.app.ticker.start();g.switchScene('threatCodex');const c=g.scenes.threatCodex;c.categoryIndex=THREAT_CODEX_CATEGORIES.findIndex(e=>e.id===category);c.entryIndex=0;c.init();
   return {locale,actualLocale:window.__novaI18n.getCurrentLanguage(),category,count:c.getEntriesForCategory().length,firstName:c.getEntriesForCategory()[0].name};
  },{locale,category});
  await page.waitForTimeout(750);await page.screenshot({path:out+'/codex-'+locale+'-'+category+'.png'});report.codex.push(state);
  assert.equal(state.count,category==='bonusCores'?10:4);
 }
 assert.deepEqual(report.errors,[]);console.log('PASS cores, connected snakes, section damage, death reward/cleanup and six orbit families');
}finally{writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
