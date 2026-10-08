import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {COSMIC_FAUNA} from '../src/config/CosmicFaunaCatalog.js';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.replaceAll('\\','/').startsWith('E:/'));
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${process.env.CHECK_URL}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete&&window.__game.scenes.play.gameplayBackdrop,null,{timeout:120000});
 const initial=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe test policy');
  await s.cosmicFauna.pending;
  return{initial:!!s.cosmicFauna,error:s.cosmicFauna.error,next:s.cosmicFauna.next?.definition.id,seed:s.cosmicFauna.clock.seed};
 });assert(initial.initial&&!initial.error);
 const visuals=[];
 for(const {id} of COSMIC_FAUNA){
  const result=await page.evaluate(async ({id,preview})=>{
   const g=window.__game,s=g.scenes.play;
   const {CosmicFauna}=await import('/src/effects/CosmicFauna.js'),{COSMIC_FAUNA}=await import('/src/config/CosmicFaunaCatalog.js');
   const catalog=COSMIC_FAUNA.filter(d=>d.id===id).map(d=>preview?{...d,soundSeconds:20,sound:`/audio/sfx/cosmic-fauna-passages/${d.id}.wav`}:d);
   s.cosmicFauna.destroy();const f=s.cosmicFauna=new CosmicFauna(s,{catalog});s.gameContainer.addChild(f);
   await f.pending;if(f.error)throw Error(f.error);f.prepareNext();await f.preparation;
   const oldClock=s.isGameplayClockAdvancing,oldState=s.enemyManager.state;s.isGameplayClockAdvancing=()=>true;s.enemyManager.state='WAVE_ACTIVE';
   f.clock.quiet=f.clock.wait;f.tick(1);if(!f.current)throw Error('No active creature '+id);
   if(Boolean(f.current.passageAudio)!==preview)throw Error('Preview admission gate mismatch');
   f.clock.active.age=f.clock.active.duration*.06;f.tick(0);
   if(Boolean(f.current.sounded)!==preview)throw Error('Preview must approach early; original timing must be retained');
   const texture=f.current.texture;f.clock.active.age=f.clock.active.duration*.5;
   const beforeScore=g.score,originalRandom=Math.random;let draws=0;Math.random=()=>{draws++;return .5;};
   const timings=[];
   try{for(let i=0;i<180;i++){const start=performance.now();f.tick(1);timings.push(performance.now()-start);}}finally{Math.random=originalRandom;}
   if(draws||g.score!==beforeScore)throw Error('Visual affects simulation');
   const shape=[...f.current.rig.geometry.positions];f.tick(12);
   const moves=shape.some((v,i)=>v!==f.current.rig.geometry.positions[i]);
   f.clock.active.age=f.clock.active.duration*.5;f.tick(0);g.app.render();
   s.isGameplayClockAdvancing=oldClock;s.enemyManager.state=oldState;
   timings.sort((a,b)=>a-b);
   const bounds=f.current.rig.getBounds();
   return{id,moves,draws,scoreUnchanged:g.score===beforeScore,alpha:f.current.rig.alpha,
    verticalBounds:{top:bounds.y,bottom:bounds.y+bounds.height,screen:g.app.screen.height},
    vertices:f.current.rig.geometry.positions.length/2,texture:{width:texture.width,height:texture.height},p99:timings[Math.floor(timings.length*.99)],trace:f.trace};
  },{id,preview:process.env.FAUNA_PREVIEW==='1'});assert(result.moves&&result.scoreUnchanged&&result.draws===0);visuals.push(result);
  assert(result.verticalBounds.top>=0&&result.verticalBounds.bottom<=result.verticalBounds.screen,id+' must fit vertically at mid-passage: '+JSON.stringify(result.verticalBounds));
  await page.screenshot({path:path.join(out,`${id}.png`)});
 }
 const lifecycle=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,f=s.cosmicFauna,rig=f.current.rig,texture=f.current.texture;
  const {setReducedMotionEnabled,setFlashIntensityScale}=await import('/src/config/AccessibilitySettings.js');
  const before=JSON.stringify({age:f.clock.active.age,vertices:[...rig.geometry.positions]});
  s.setPaused(true);for(let i=0;i<60;i++)s.update(1);
  const paused=before===JSON.stringify({age:f.clock.active.age,vertices:[...rig.geometry.positions]})&&f.current.audio.paused;
  s.setPaused(false);s.externalPauseSuppressedUntil=0;s.pauseForExternalInterruption('fauna-test');for(let i=0;i<60;i++)s.update(1);
  const focus=s.isPaused&&before===JSON.stringify({age:f.clock.active.age,vertices:[...rig.geometry.positions]});s.setPaused(false);
  const draftUpdate=s.updateTacticalDraft;s.updateTacticalDraft=()=>{};s.tacticalDraft={active:true};for(let i=0;i<60;i++)s.update(1);
  const draft=!f.visible&&before===JSON.stringify({age:f.clock.active.age,vertices:[...rig.geometry.positions]});s.tacticalDraft=null;s.updateTacticalDraft=draftUpdate;
  const advance=s.isGameplayClockAdvancing;s.isGameplayClockAdvancing=()=>true;setReducedMotionEnabled(true);setFlashIntensityScale(0);f.tick(1);
  const reducedPose=JSON.stringify({vertices:[...rig.geometry.positions],x:rig.x,y:rig.y,rotation:rig.rotation});for(let i=0;i<60;i++)f.tick(1);
  const reduced=reducedPose===JSON.stringify({vertices:[...rig.geometry.positions],x:rig.x,y:rig.y,rotation:rig.rotation});
  setReducedMotionEnabled(false);setFlashIntensityScale(1);s.bossWarningActive=true;for(let i=0;i<90;i++)f.tick(1);
  const warningDim=rig.alpha<.08&&f.current.audio.paused;
  s.isGameplayClockAdvancing=advance;s.introActive=true;f.visibility=1;rig.alpha=.58;const warningAge=f.clock.active.age;
  for(let i=0;i<90;i++)f.tick(1);
  const frozenWarningDim=rig.alpha<.08&&f.clock.active.age===warningAge;
  s.introActive=false;s.bossWarningActive=false;
  const shared=s.player.shipSprite.texture;
  await g.startGame(g.selectedSpriteKey);
  const retry=f.destroyed&&rig.destroyed&&texture.destroyed&&!shared.destroyed&&s.cosmicFauna!==f;
  return{paused,focus,draft,reduced,warningDim,frozenWarningDim,retry,isolated:g.runPolicy.prototype};
 });assert(Object.values(lifecycle).every(Boolean),JSON.stringify(lifecycle));assert.deepEqual(errors,[]);
 writeFileSync(path.join(out,'report.json'),JSON.stringify({initial,visuals,lifecycle,errors},null,2));console.log(JSON.stringify({initial,visuals,lifecycle,errors}));
}finally{await browser.close();}
