import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.replaceAll('\\','/').startsWith('E:/'));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 if(process.env.FAUNA_COMPILED==='1')await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=>'boss-snake'};});
 await page.goto(process.env.CHECK_URL+'/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural');
 if(process.env.FAUNA_COMPILED==='1'){
  await page.waitForFunction(()=>window.__game?.currentSceneName==='shipSelect'&&document.body.dataset.menuReady==='1',null,{timeout:120000});
  await page.evaluate(()=>window.__game.startGame(undefined,{countShipUsage:false}));
  await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.boss?.active,null,{timeout:120000});
 }
 await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete&&window.__game.scenes.play.gameplayBackdrop&&!window.__game.scenes.play.levelStartWarmupPending,null,{timeout:120000});
 await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe soak policy');
  m.clearEnemies();m.clearPendingWaveSpawns();s.firstLightDirector.cancel('isolated-fauna-soak');
  m.boss=null;m.mysteryDirector=null;m.hijacker=null;m.discoveryEncounter=null;m.environment=null;m.challengeFlightState=null;m.mayhemReinforcementState=null;
  m.state='INTERWAVE';m.waveEnding=false;m.waves=[{isChallenge:false}];m.currentWaveIndex=0;
  s.activeBossIntroCard?.parent?.removeChild(s.activeBossIntroCard);s.activeBossIntroCard=null;s.activeCabinetWonder=null;s.cabinetWonderOpportunity=null;
  s.activeMayhemReinforcementWarning=null;s.activeMayhemRoutineWarning=null;s.introActive=false;s.isGameplayClockAdvancing=()=>true;s.player.active=true;s.player.sprite.alpha=1;
  s.combatBackdropClarity.hostileProjectiles=0;
  if(s.particleManager.detonations.pool.some(display=>display.visible))throw Error('Idle explosion pool is visible before fauna admission');
  const Type=s.cosmicFauna.constructor;s.cosmicFauna.destroy();s.cosmicFauna=new Type(s);s.gameContainer.addChild(s.cosmicFauna);
  window.__faunaSoak={score:g.score,lives:g.lives,seen:[],frames:[]};
 });
 const layouts=[[1280,720],[1280,800],[1024,768],[2560,1080],[390,844]];
 for(let index=0;index<43;index++){
  const layout=layouts[index%layouts.length];await page.setViewportSize({width:layout[0],height:layout[1]});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const row=await page.evaluate(async index=>{
   const g=window.__game,s=g.scenes.play,f=s.cosmicFauna,state=window.__faunaSoak;
   g.app.ticker.stop();s.enemyManager.state='INTERWAVE';const loadStart=performance.now();f.tick(0);await f.pending;
   // An asynchronous wave transition can change the isolated fixture while
   // decoding. Re-establish its interwave state before testing safe preparation.
   g.app.ticker.stop();s.enemyManager.clearEnemies();s.enemyManager.clearPendingWaveSpawns();s.enemyManager.state='INTERWAVE';s.enemyManager.waveEnding=false;
   if(f.error)throw Error(f.error);f.tick(0);await f.preparation;
   if(!f.next?.prepared||f.current||f.children.length)throw Error('Unbounded or missing next entry '+JSON.stringify({index,next:f.next?.definition.id,prepared:f.next?.prepared,current:f.current?.definition.id,children:f.children.length,error:f.error,trace:f.trace,bossWarning:s.bossWarningActive,bossIntro:s.bossIntroActive,firstLight:s.firstLightDirector.snapshot(),enemies:s.enemyManager.enemies.filter(e=>e.active).map(e=>e.kind),state:s.enemyManager.state}));
   const preparedMs=performance.now()-loadStart;s.enemyManager.state='WAVE_ACTIVE';f.clock.quiet=f.clock.wait;
   const start=performance.now();f.tick(1);g.app.render();const admissionCpuMs=performance.now()-start;
   const entry=f.current;if(!entry||f.next||f.children.length!==1)throw Error('Exactly one current entry required');
   state.seen.push(entry.definition.id);f.clock.active.age=f.clock.active.duration*.5;
   const frameMs=[];await new Promise(resolve=>{
    let n=0;const step=()=>{const t=performance.now();f.tick(1);g.app.render();frameMs.push(performance.now()-t);if(++n===12)resolve();else requestAnimationFrame(step);};requestAnimationFrame(step);
   });state.frames.push(...frameMs);
   const bounds=entry.rig.getBounds(),screen=g.app.screen;
   if(bounds.y<0||bounds.y+bounds.height>screen.height)throw Error('Vertical crop at '+entry.definition.id+' '+JSON.stringify({bounds,screen}));
   if(g.score!==state.score||g.lives!==state.lives)throw Error('Visual changed score/lives');
   return{index,id:entry.definition.id,preparedMs,admissionCpuMs,frameMs,vertical:{top:bounds.y,bottom:bounds.y+bounds.height,height:screen.height},ownedDisplays:f.children.length};
  },index);rows.push({...row,layout});
  if(index<layouts.length)await page.screenshot({path:path.join(out,'layout-'+layout.join('x')+'.png')});
  await page.evaluate(()=>{
   const f=window.__game.scenes.play.cosmicFauna,entry=f.current;
   f.clock.active.age=f.clock.active.duration;f.tick(1);
   if(f.current||f.clock.active||f.children.length||!entry.released||!entry.rig.destroyed||!entry.texture.destroyed||entry.bitmap.width!==0||!entry.audio.paused||entry.audio.getAttribute('src'))throw Error('Expired entry leaked resources');
  });
 }
 assert.equal(new Set(rows.slice(0,42).map(r=>r.id)).size,42,'Visit each animal before repeating');
 assert.equal(rows[42].id,rows[0].id,'Second bag cycle is reproducible');
 const finish=await page.evaluate(()=>{const s=window.__game.scenes.play,f=s.cosmicFauna;f.destroy();return{destroyed:f.destroyed,traceCapped:!f.trace||f.trace.length<=64,current:f.current,next:f.next};});
 assert(finish.destroyed&&finish.traceCapped&&!finish.current&&!finish.next);assert.deepEqual(errors,[]);
 const stats=values=>{const a=values.toSorted((a,b)=>a-b);return{n:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1),over50:a.filter(x=>x>50).length};};
 const result={passed:true,controlled:true,progression:false,conditions:'Sequential actual 42-animal bag plus first repeat; five rotating viewports; manual test-only time compression; decode/upload measured in quiet gap; isolated render timings are not whole-game performance.',passages:rows.length,unique:42,admission:stats(rows.map(r=>r.admissionCpuMs)),render:stats(rows.flatMap(r=>r.frameMs)),rows,finish,errors};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,passages:result.passages,unique:42,admission:result.admission,render:result.render,errors}));
}finally{await browser.close();}
