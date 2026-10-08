import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const results=[];
try{
 for(const [label,url]of [['baseline',process.env.BASELINE_URL||'http://127.0.0.1:4900'],['candidate',process.env.CANDIDATE_URL||'http://127.0.0.1:4901'],['hammer',process.env.CANDIDATE_URL||'http://127.0.0.1:4901']]){
  if(process.env.CANDIDATE_ONLY==='1'&&label==='baseline')continue;
  console.log(`${label}: opening compiled build`);
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log(`${label} page error: ${e.message}`);});
  page.on('console',message=>{if(message.type()==='error'){errors.push(message.text());console.log(`${label}: ${message.text()}`);}});
  page.on('console',message=>{if(message.text().startsWith('benchmark '))console.log(message.text());});
  await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=> 'boss-snake'};localStorage.setItem('burt_voice_enabled','false');});
  await page.goto(`${url}/?autostart=1&offlineLeaderboard=1`);
  await page.waitForFunction(()=>window.__game,null,{timeout:90000});
  await page.waitForFunction(()=>document.body.dataset.menuReady==='1'&&window.__game.currentSceneName==='shipSelect',null,{timeout:90000});
  console.log(`${label}: booted`);
  // Trusted encounter launches deliberately retain Hangar selection. The
  // benchmark chooses the default hull explicitly before waiting for Play.
  await page.evaluate(()=>{if(!window.__game.scenes.play?.player)void window.__game.startGame(undefined,{countShipUsage:false});});
  try{await page.waitForFunction(()=>window.__game?.scenes?.play?.isReady&&window.__game.scenes.play.introComplete&&window.__game.scenes.play.player?.active,null,{timeout:90000});}
  catch(error){console.log(JSON.stringify({label,errors,state:await page.evaluate(()=>({game:!!window.__game,text:document.body.innerText.slice(0,400)}))}));throw error;}
  await page.waitForFunction(()=>{const s=window.__game.scenes.play,m=s.enemyManager;return !s.levelStartWarmupPending&&m.boss?.active&&!m.spawning;},null,{timeout:90000});
  if(process.env.BOOTSTRAP_ONLY==='1'){assert.deepEqual(errors,[]);console.log(`PASS ${label} compiled bootstrap`);await page.close();continue;}
  console.log(`${label}: intro complete; measuring`);
  const result=await page.evaluate(async label=>{
   window.__benchmarkStage='fixture start';
   const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();
   if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe benchmark policy');
   m.clearEnemies();m.clearPendingWaveSpawns();g.encounterTest=null;g.level=m.level=12;g.runMode='ranked_tactical';
   s.shipIntroToken++;s.debugStartLevel=null;g.contentDirector.seed='encounter-expansion-performance-v1';
   m.phase='BOSS';m.state='BOSS_ACTIVE';m.spawning=false;const boss=await m.spawnBoss(12);
   if(!boss?.isDreadnought)throw Error('Candidate did not select its Breach replacement');
   window.__benchmarkStage='boss ready';
   // Equal seeded shot count, inputs, clocks and arena; each build uses its
   // own replacement boss. No forced kills, progression or submitted score.
   if(label==='hammer')s.player.applyPowerup('orbit_breaker');
   s.player.invulnerable=true;s.player.invulnerableTime=999999;s.player.x=g.getWidth()*.5;s.player.y=g.getHeight()*.84;
   const bullets=s.player.shoot();const Bullet=bullets[0].constructor;
   for(let i=0;i<320;i++)s.bulletManager.addEnemyBullet(new Bullet(70+(i%32)*40,140+Math.floor(i/32)*45,0,.75,1,0xff795a,false));
   let visualFrame=0;const stress=()=>{if(visualFrame++%4===0)for(let j=0;j<24;j++)s.particleManager.createHitSpark(120+(j%8)*140,250+Math.floor(j/8)*100,0xffb45d);};
   const realNow=Date.now;let simulatedNow=realNow();Date.now=()=>simulatedNow;
   const cpu=[];for(let i=0;i<900;i++){
    if(i%30===0)window.__benchmarkStage=`CPU ${i}`;
    simulatedNow+=1000/60;g.runElapsedSeconds+=1/60;s.gameTime+=1/60;
    const start=performance.now();stress();s.bulletManager.update(1);m.updateEnemies(1);s.particleManager.update(1);if(label==='hammer')s.player.orbitBreaker.update(1/60);s.checkCollisions();if(i%2===0)g.app.render();
    if(i>=120)cpu.push(performance.now()-start);
   }
   Date.now=realNow;
   window.__benchmarkStage='CPU samples complete';
   const gaps=[];let previous,warmup=120;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('RAF benchmark exceeded 30 seconds')),30000);function sample(t){
    try{
    window.__benchmarkStage=`RAF ${warmup}/${gaps.length}`;
    stress();s.bulletManager.update(1);m.updateEnemies(1);s.particleManager.update(1);if(label==='hammer')s.player.orbitBreaker.update(1/60);g.runElapsedSeconds+=1/60;s.gameTime+=1/60;g.app.render();
    if(warmup>0){warmup--;previous=t;}else{gaps.push(t-previous);previous=t;}
    if(gaps.length>=180){clearTimeout(timer);resolve();}else requestAnimationFrame(sample);
    }catch(error){clearTimeout(timer);reject(error);}}requestAnimationFrame(sample);});
   function stats(a){const sorted=[...a].sort((a,b)=>a-b),q=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))];return{n:a.length,p50:q(.5),p95:q(.95),p99:q(.99),max:sorted.at(-1),over50:a.filter(x=>x>50).length};}
   if(m.boss!==boss||!boss.active||g.currentScene!==s||s.enemyManager!==m||g.level!==12)throw Error('Benchmark fixture was replaced during capture');
   s.hud.update();g.app.render();
   return{label,boss:boss.isDreadnought?'dreadnought_breach':boss.profile?.id,layout:boss.breach.layout.id,cpu:stats(cpu),raf:stats(gaps),prototype:g.runPolicy.prototype};
  },label);
  assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,`${label}.png`)});results.push(result);console.log(JSON.stringify(result));await page.close();
 }
 assert(results.every(r=>r.layout===results[0].layout),'Comparable fights require the same layout');
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',conditions:'Sequential headless Chrome, 1280x720, matched seed/320 initial hostile shots plus 24 requested local hit sparks every four frames, fixed tick inputs and simulated wall/combat clocks for 120 warmup/780 CPU samples incl alternate-frame render. Then 120 RAF warmup/180 live combat+render gaps. Waits for intro completion before fixtures. Same Breach selection/layout in retained baseline and candidate; ParticleManager updated in both. Third fixture holds Orbit Breaker active beyond its normal 12 seconds to measure sustained contact/visual work; this is a stress fixture, not natural expiry or player pacing. Hardware/human GPU tails still need final QA.',results},null,2));
}finally{await browser.close();}
