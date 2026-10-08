import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.replaceAll('\\','/').startsWith('E:/'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{
 const targets=[['baseline',process.env.BASELINE_URL],['candidate',process.env.CANDIDATE_URL]];
 if(process.env.REVERSE_ORDER==='1')targets.reverse();
 for(const[label,url]of targets){
  if(process.env.CANDIDATE_ONLY==='1'&&label==='baseline')continue;
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=>'boss-snake'};localStorage.setItem('burt_voice_enabled','false');});
  await page.goto(`${url}/?autostart=1&offlineLeaderboard=1`);
  await page.waitForFunction(()=>window.__game?.currentSceneName==='shipSelect'&&document.body.dataset.menuReady==='1',null,{timeout:120000});
  await page.evaluate(()=>window.__game.startGame(undefined,{countShipUsage:false}));
  await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete&&window.__game.scenes.play.enemyManager?.boss?.active&&!window.__game.scenes.play.levelStartWarmupPending,null,{timeout:120000});
  const result=await page.evaluate(async label=>{
   const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();
   if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe performance fixture');
   m.clearEnemies();m.clearPendingWaveSpawns();s.firstLightDirector.cancel('performance-fixture');
   m.boss=null;m.mysteryDirector=null;m.hijacker=null;m.discoveryEncounter=null;m.environment=null;m.challengeFlightState=null;m.mayhemReinforcementState=null;
   m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;m.spawning=false;m.waves=[{isChallenge:false}];m.currentWaveIndex=0;
   s.activeBossIntroCard?.parent?.removeChild(s.activeBossIntroCard);s.activeBossIntroCard=null;s.activeCabinetWonder=null;s.cabinetWonderOpportunity=null;
   s.activeMayhemReinforcementWarning=null;s.activeMayhemRoutineWarning=null;s.introActive=false;s.isGameplayClockAdvancing=()=>true;s.player.active=true;
   g.level=m.level=1;s.updateSectorWorld(1);await s.sectorWorldLoadQueue;s.setGameplayBackdropMode('base',{immediate:true});
   s.combatBackdropClarity.hostileProjectiles=0;s.combatBackdropClarity.level=0;s.combatBackdropClarity.target=0;
   let f=s.cosmicFauna;
   if(f){const Type=f.constructor,catalog=[f.catalog.find(d=>d.id==='lantern_medusa')];f.destroy();f=s.cosmicFauna=new Type(s,{catalog});s.gameContainer.addChild(f);}
   let preparationMs=0;
   if(f){await f.pending;const start=performance.now();f.prepareNext();await f.preparation;preparationMs=performance.now()-start;
    m.state='WAVE_ACTIVE';f.clock.quiet=f.clock.wait;f.tick(1);if(!f.current)throw Error('Candidate fauna absent: '+JSON.stringify({error:f.error,ready:f.next?.prepared,quiet:f.clock.quiet,lives:g.lives,overrun:s.overrunMilestoneInterlude?.active,gameover:s.gameOverSequenceStarted,interlude:s.gameOverInterlude?.active,bossWarning:s.bossWarningActive,bossIntro:s.bossIntroActive,firstLight:s.firstLightDirector.snapshot(),enemies:m.enemies?.filter(e=>e.active).map(e=>e.kind),waveEnding:m.waveEnding,flags:{boss:!!m.boss,mystery:!!m.mysteryDirector,hijacker:!!m.hijacker,discovery:!!m.discoveryEncounter,environment:!!m.environment,challenge:!!m.challengeFlightState,warning:!!m.mayhemReinforcementState}}));f.clock.active.age=10;}
   if(label==='candidate'&&!f?.current)throw Error('Candidate code not loaded');
   s.bulletManager.clearAll('benchmark');const Bullet=s.player.shoot()[0].constructor;
   for(let i=0;i<160;i++)s.bulletManager.addEnemyBullet(new Bullet(80+i%20*85,150+Math.floor(i/20)*55,0,.2,1,0xff795a,false));
   const random=Math.random;let seed=123456789;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   const samples=[],gaps=[];let frame=0;
   function step(){
    const start=performance.now();
    if(frame%24===0)for(let i=0;i<6;i++)s.particleManager.detonations.emit(160+i*280,500,1);
    if(frame%4===0)for(let i=0;i<12;i++)s.particleManager.createHitSpark(200+i*115,350,0xffb45d);
    s.updateStarfield(1);if(f){s.combatBackdropClarity.hostileProjectiles=0;f.clock.active.age=10+(frame%600)/60;f.tick(1);}
    s.bulletManager.update(1);s.particleManager.update(1);g.app.render();frame++;return performance.now()-start;
   }
   try{
    for(let i=0;i<600;i++){const elapsed=step();if(i>=120)samples.push(elapsed);}
    let last,warm=60;
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('RAF timeout')),20000);function tick(time){try{step();if(warm)warm--;else gaps.push(time-last);last=time;if(gaps.length===180){clearTimeout(timer);resolve();}else requestAnimationFrame(tick);}catch(e){clearTimeout(timer);reject(e);}}requestAnimationFrame(tick);});
   }finally{Math.random=random;}
   const stats=values=>{const a=[...values].sort((a,b)=>a-b);return{n:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1),over50:a.filter(v=>v>50).length};};
   if(f&&f.current.rig.alpha<.5)throw Error('Full-visibility stress was unexpectedly suppressed');
   return{label,fauna:f?.current?.definition.id||null,alpha:f?.current?.rig.alpha||0,preparationMs,cpu:stats(samples),raf:stats(gaps),prototype:g.runPolicy.prototype};
  },label);
  assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,`${label}.png`)});results.push(result);console.log(JSON.stringify(result));await page.close();
 }
 writeFileSync(path.join(out,'report.json'),JSON.stringify({conditions:'Sequential compiled builds, same 1280x720 viewport and 1920x1080 logical arena/ocean/160 initial shots/local deterministic cosmetic RNG/6 blasts per 24 frames and 12 sparks per 4 frames. 120 warmup plus 480 CPU samples, 60 RAF warmup plus 180 rendered gaps. Candidate keeps one creature at full ordinary visibility, stress ignores automatic threat dimming. Headless local comparison, not hardware guarantee or natural pacing.',results},null,2));
}finally{await browser.close();}
