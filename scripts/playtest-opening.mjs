import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;if(!out?.startsWith('E:'))throw Error('E: output required');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});const page=await context.newPage(),video=page.video(),errors=[],consoleErrors=[],samples=[],inputs=[];let held=new Set(),passed=false;
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
try{
 await page.goto(`${process.env.CHECK_URL}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete&&!window.__game.scenes.play.introActive,null,{timeout:120000});
 const setup=await page.evaluate(()=>{const g=window.__game,s=g.scenes.play,p=g.runPolicy;
  if(!p?.prototype||p.allowGlobalLeaderboardSubmission!==false||p.allowAchievements!==false
    ||p.allowPersistentRewards!==false||Object.entries(p).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe run policy');
  return {seed:g.contentDirector.seed,mode:g.runMode,damage:s.player.bulletDamage,lives:g.lives,policy:{...p},
   runtime:JSON.parse(window.render_game_to_text())};});
 const started=Date.now(),duration=Number(process.env.PLAYTEST_SECONDS)||180;
 let shot=0,paybackShot=0;const faunaShots=new Set();
 while(Date.now()-started<duration*1000){
  const state=await page.evaluate(()=>{
   const g=window.__game,s=g.scenes.play;if(g.currentSceneName!=='play'||!s?.player)return {ended:true,scene:g.currentSceneName,score:g.score,sector:g.level,lives:g.lives};
   const p=s.player,m=s.enemyManager,w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight();
   const locks=(s.firstLightDirector?.view?.targets||[]).filter(t=>!t.blocked&&!t.cover),part=locks.find(t=>t.part!=='core')||locks[0];
   const enemies=(m.enemies||[]).filter(e=>e.active&&!e.untargetable&&e.y>20&&e.y<h*.78&&e.x>30&&e.x<w-30);
   const pickup=(s.powerupManager.powerups||[]).filter(e=>e.active&&e.y>h*.5).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
   const enemy=enemies.sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
   let targetX=pickup?.x??part?.x??enemy?.x??m.boss?.x??w*.5;
   const close=(s.bulletManager.enemyBullets||[]).filter(b=>b.active&&b.y<p.y&&b.y>p.y-160&&Math.abs(b.x-p.x)<65);
   const danger=close.length>0;if(danger){const left=p.x>70&&close.every(b=>Math.abs(b.x-(p.x-110))>50);targetX=p.x+(left?-140:140);}
   targetX=Math.max(45,Math.min(w-45,targetX));
   return {ended:false,x:p.x,y:p.y,w,h,targetX,danger,paused:s.isPaused,draft:s.tacticalDraft?.active,
    phase:p.invulnerable,sector:g.level,elapsed:g.runElapsedSeconds,score:g.score,lives:g.lives,state:m.state,
    encounter:s.firstLightDirector?.snapshot(),powerup:p.activePowerup?.type,planet:s.planetVignettes?.getDebugState(),
    explosions:s.particleManager.detonations.active.map(e=>({id:e.choreography?.id,boss:e.boss})),events:g.encounterEvolutionLog,
    fauna:s.cosmicFauna?{id:s.cosmicFauna.current?.definition.id,active:s.cosmicFauna.clock.active,
     ordinal:s.cosmicFauna.clock.ordinal,quiet:s.cosmicFauna.clock.quiet,ready:s.cosmicFauna.next?.prepared,
     visible:s.cosmicFauna.current?.rig.alpha,error:s.cosmicFauna.error,trace:s.cosmicFauna.trace}:null};
  });
  if(state.ended){samples.push({...state,wallSeconds:(Date.now()-started)/1000});await page.screenshot({path:path.join(out,'ending.png')});break;}
  const next=new Set(['Space']);const dx=state.targetX-state.x;if(Math.abs(dx)>18)next.add(dx<0?'ArrowLeft':'ArrowRight');
  if(state.y<state.h*.79)next.add('ArrowDown');else if(state.y>state.h*.87)next.add('ArrowUp');
  if(state.danger)next.add('Shift');
  for(const key of held)if(!next.has(key))await page.keyboard.up(key);for(const key of next)if(!held.has(key))await page.keyboard.down(key);held=next;
  if(state.draft){for(const key of held)await page.keyboard.up(key);held.clear();await page.waitForTimeout(400);await page.keyboard.press('Enter');}
  if(state.paused)await page.keyboard.press('p');
  const wallSeconds=(Date.now()-started)/1000;inputs.push({at:wallSeconds,keys:[...held]});
  if(inputs.length%50===0){samples.push({...state,wallSeconds});console.log(JSON.stringify({wallSeconds,sector:state.sector,score:state.score,lives:state.lives,encounter:state.encounter?.encounter?.kind,powerup:state.powerup}));}
  if(wallSeconds>=6+shot*30){await page.screenshot({path:path.join(out,`opening-${String(shot++).padStart(2,'0')}.png`)});}
  if(process.env.PLAYTEST_PAYBACK_CAPTURE==='1'&&state.encounter?.payback?.status==='active'
    &&paybackShot<3&&state.encounter.payback.age>=.85+paybackShot*.8){
   samples.push({...state,wallSeconds});await page.screenshot({path:path.join(out,`payback-${paybackShot++}.png`)});
  }
  if(state.fauna?.active&&state.fauna.active.age>state.fauna.active.duration*.4&&!faunaShots.has(state.fauna.ordinal)){
   faunaShots.add(state.fauna.ordinal);await page.screenshot({path:path.join(out,`fauna-${state.fauna.ordinal}-${state.fauna.id}.png`)});
  }
  await page.waitForTimeout(100);
 }
 for(const key of held)await page.keyboard.up(key);
 const finalPolicy=await page.evaluate(()=>({...window.__game.runPolicy}));
 const safeFinal=finalPolicy.prototype&&finalPolicy.allowGlobalLeaderboardSubmission===false
  &&finalPolicy.allowPersistentRewards===false&&!Object.entries(finalPolicy).some(([k,v])=>k.startsWith('allow')&&v);
 const ok=errors.length===0&&consoleErrors.length===0&&safeFinal&&samples.some(s=>s.score>0);
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status:ok?'passed':'failed',conditions:`Up to ${duration} real wall-clock seconds; finite lives, normal starting hull/damage, keyboard firing/steering/earned Phase and ordinary draft input. No granted invulnerability, forced kills, spawns, skips or score. Isolated progression/submission policy checked before and after. Automated observation is not human fun or balance QA. Playwright video has no audio.`,setup,finalPolicy,samples,inputs,errors,consoleErrors},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert(safeFinal,'Progression policy must remain isolated');assert(samples.some(s=>s.score>0),'Normal inputs must produce combat');passed=true;
}finally{await context.close();if(passed)await video.saveAs(path.join(out,'opening-playthrough.webm'));await video.delete();await browser.close();}
