import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR||'E:/Codex/builds/nova-swarm/snake-broods/qa';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log(e.message);});
await page.route('**/*',r=>/^https?:\/\/127\.0\.0\.1/.test(r.request().url())?r.continue():r.abort());
try{
 await page.goto((process.env.CHECK_URL||'http://127.0.0.1:5219')+'/?skipIntro=1&offlineLeaderboard=1',{waitUntil:'commit',timeout:20000});
 await page.waitForFunction(()=>document.body.dataset.menuReady==='1',null,{timeout:90000});
 await page.evaluate(()=>window.__game.startGame(undefined,{runMode:'unranked',countShipUsage:false}));
 await page.waitForFunction(()=>window.__game.scenes.play?.enemyManager?.waves?.length,null,{timeout:60000});
 const result=await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play,m=p.enemyManager;g.app.ticker.stop();p.setPaused(false);p.isDebugInvincibleActive=()=>true;
  m.clearEnemies();p.clearEnemyBullets();m.state='BROOD_QA';g.level=m.level=30;
  const {getSpaceSnakeProfile}=await import('/src/config/SpaceSnakes.js'),{Bullet}=await import('/src/entities/Bullet.js');
  const {SnakeBroodAudio}=await import('/src/audio/SnakeBroodAudio.js'),{AudioManager:a}=await import('/src/audio/AudioManager.js');
  const check=(ok,msg)=>{if(!ok)throw Error(msg);};a.enabled=false;a.stopAllVoices();
  const chain=m.spawnSpaceSnake(getSpaceSnakeProfile('space_snake_grave'),{force:true,count:20}),b=chain.brood;await b.promise;
  const run=n=>{for(let i=0;i<n;i++){m.updateEnemies(1);p.bulletManager.update(1);}};run(700);
  const baby=b.babies[0];check(baby?.active,'Hatched');p.clearEnemyBullets();
  baby.x=g.getWidth()*.5;baby.y=g.getHeight()*.80;baby.sprite.position.set(baby.x,baby.y);p.player.x=g.getWidth()*.1;
  const score=g.score;p.bulletManager.addPlayerBullet(new Bullet(baby.x,baby.y,0,-4,99,0xffffff,true));p.checkCollisions();
  check(!baby.active,'Normal player projectile collision kills juvenile');check(g.score>score,'Normal collision awards score');
  const collisionScore=g.score-score;
  let allowed=false,claims=0;chain.sections.forEach(s=>{s.discoveryGuest=true;s.discoveryCoordinator={claimAttack(source,category){if(source!==b)return false;check(category==='regular','Shared boss warning admission');claims++;return allowed;}};});
  b.babies.forEach(a=>a.action=null);const shots=b.shots;run(240);check(b.shots===shots&&claims>0,'Boss pressure postpones the warning, not an already announced attack');
  allowed=true;run(240);check(b.shots>shots,'Boss pressure release resumes brood attacks');
  a.enabled=true;a.inMenu=false;a.masterVolume=.3;a.sfxVolume=.5;a.pauseDuckFactor=1;await a.context.resume();
  const decoded=[];
  const {SNAKE_BROOD_FAMILIES}=await import('/src/config/SnakeBroods.js');
  for(const f of SNAKE_BROOD_FAMILIES){const buffer=await SnakeBroodAudio.prepare(f);check(buffer?.duration>10,'Decode '+f.id);decoded.push({family:f.id,duration:buffer.duration});}
  await SnakeBroodAudio.prepare(b.family);SnakeBroodAudio.play(b,'chorus');await new Promise(r=>setTimeout(r,100));
  check(SnakeBroodAudio.voices.size===1,'Actual WebAudio source started');const voice=[...SnakeBroodAudio.voices][0],normal=voice.gain.gain.value;
  a.pauseDuckFactor=.2;await new Promise(r=>setTimeout(r,80));check(Math.abs(voice.gain.gain.value-normal*.2)<.00001,'Paused game still updates sound mix');
  a.sfxVolume=0;await new Promise(r=>setTimeout(r,80));check(voice.gain.gain.value===0,'Live SFX mute');
  const music=a.musicVolume;check(music===a.musicVolume,'No music bus alteration');
  m.clearEnemies();check(!SnakeBroodAudio.voices.size,'Exit stops family voices');check(SnakeBroodAudio.cache.size<=3,'Bounded decoded family cache');
  return {collisionScore,claims,decoded,audio:SnakeBroodAudio.diagnostics,normalGain:normal};
 });
 const leaderboard=await page.evaluate(async()=>{
  const g=window.__game,a=g.getLeaderboardAdapter();window.__steamOnline=false;
  a.steamProvider.isAvailable=async()=>window.__steamOnline;
  a.steamProvider.hasFriendLeaderboardEntries=()=>new Promise(()=>{});
  a.cloudProvider.isAvailable=async()=>true;a.retryPendingSteamSubmissions=async()=>({attempted:0});a.retryPendingCareerRankMetadata=async()=>({attempted:0});
  a.steamProvider.getTopScores=async()=>({status:'ready',source:'steam',entries:[]});a.steamProvider.getSectorScores=async()=>({status:'ready',source:'steam',entries:[]});
  g.leaderboardView='local';g.app.ticker.start();g.showHighscores();
  return true;
 });
 await page.waitForFunction(()=>window.__game.currentScene?.tabButtons?.local,null,{timeout:30000});
 await page.evaluate(()=>{window.__beforeSteamTabs=window.__game.currentScene.leaderboardTabs.map(t=>t.id);window.__steamOnline=true;window.__game.currentScene.nextSteamRecoveryAt=0;});
 await page.waitForFunction(()=>window.__game.currentScene.tabButtons.tactical.visible,null,{timeout:15000});
 result.recovery=await page.evaluate(()=>({before:window.__beforeSteamTabs,after:window.__game.currentScene.leaderboardTabs.map(t=>t.id),view:window.__game.currentScene.activeLeaderboard}));
 assert.equal(result.recovery.view,'local');assert.ok(result.recovery.after.includes('tactical'));
 await page.screenshot({path:out+'/steam-recovered.png'});assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/flow.json',JSON.stringify({result,errors,limitations:'Isolated browser mock platform recovery. Live Steam read verification is separate.'},null,2));console.log('PASS',JSON.stringify(result));
}finally{await browser.close();}
