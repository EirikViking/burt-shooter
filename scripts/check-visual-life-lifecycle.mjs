import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const baseline=readFileSync('E:/Codex/builds/nova-swarm/visual-life/source-before/src/audio/AudioManager.js','utf8')
 .replace(/from (['"])([^'"]+)\1/g,(_,q,s)=>`from ${q}${new URL(s,'http://127.0.0.1/src/audio/AudioManager.js').pathname}${q}`);
await page.route('**/__visual-audio-baseline.js',route=>route.fulfill({contentType:'application/javascript',body:baseline}));
try{
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4932'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete&&window.__game.scenes.play.particleManager,null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe practice policy');
  const {AudioManager:a}=await import('/src/audio/AudioManager.js'),{AudioManager:old}=await import('/__visual-audio-baseline.js');
  const {setReducedMotionEnabled,setFlashIntensityScale}=await import('/src/config/AccessibilitySettings.js');
  const {loadDetonationFrames}=await import('/src/effects/AstraDetonation.js');await loadDetonationFrames();
  const rng=Math.random;
  function measure(controller){
   controller.enabled=true;controller.inMenu=false;controller.sfxCooldowns={};controller.sfxVariantBags={};controller.lastSfxVariantByEvent={};controller.activeSfxGroups={};controller.visualDestructionOrdinals={};
   const sources=[];let draws=0;
   controller.getSfxAudio=(event,src)=>{sources.push(src);return{src,play:()=>Promise.resolve(),pause(){},addEventListener(){}};};
   controller.getActiveSfxPriority=()=>null;
   Math.random=()=>{draws++;return .37;};
   for(let i=0;i<20;i++)controller.playSfx('enemy_explode',{force:true});
   for(let i=0;i<6;i++)controller.playSfx('boss_death_cascade',{force:true});
   controller.playSfx('boss_warning',{force:true});
   Math.random=rng;
   return {draws,sources};
  }
  const baseline=measure(old),candidate=measure(a);
  if(baseline.draws!==candidate.draws)throw Error('Audio perturbed gameplay RNG draws');
  if(new Set(candidate.sources.slice(0,20)).size!==12||new Set(candidate.sources.slice(20,26)).size!==3)throw Error('Audio family rotation failed');
  if(candidate.sources[26]!==baseline.sources[26])throw Error('Warning identity changed');
  if(s.planetVignettes)throw Error('Rejected planet props returned');
  Math.random=()=>{throw Error('Contact audio perturbed RNG');};
  a.playSfx('rescue_arrive',{force:true,preserveGameplayRng:true,sfxGroup:'convoy-surprise'});Math.random=rng;
  const w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight();
  const d=s.particleManager.detonations;d.clear();d.emit(w*.4,h*.4,1,true);d.update(10);
  setReducedMotionEnabled(true);setFlashIntensityScale(0);d.update(1);
  if(d.active[0].display.embers.some(e=>e.alpha!==0)||d.active[0].display.reactor.visible)throw Error('Mid-effect accessibility ignored');
  setReducedMotionEnabled(false);setFlashIntensityScale(1);
  const pose=()=>JSON.stringify({blast:d.active.map(e=>e.age)});
  const before=pose();s.setPaused(true);for(let i=0;i<60;i++)s.update(1);
  const paused=before===pose(),audioStopped=!a.activeSfxGroups['convoy-surprise'];
  s.setPaused(false);s.externalPauseSuppressedUntil=0;s.pauseForExternalInterruption('visual-life-focus-loss');
  for(let i=0;i<60;i++)s.update(1);const focus=s.isPaused&&before===pose();s.setPaused(false);
  const draftUpdater=s.updateTacticalDraft;s.updateTacticalDraft=()=>{};s.tacticalDraft={active:true};
  for(let i=0;i<60;i++)s.update(1);const draft=before===pose();s.tacticalDraft=null;s.updateTacticalDraft=draftUpdater;
  if(!paused||!audioStopped||!focus||!draft)throw Error('Paused/draft/focus effect leak '+JSON.stringify({paused,audioStopped,focus,draft}));
  const oldRoot=s.particleManager;await g.startGame(g.selectedSpriteKey);
  if(!oldRoot.destroyed||!d.destroyed)throw Error('Retry retained old explosion pools');
  if(!g.runPolicy.prototype)throw Error('Retry lost practice isolation');
  return {rngDraws:baseline.draws,rotation:{ordinary:12,boss:3},warningUnchanged:true,noPlanetProps:true,midEffectAccessibility:true,paused,audioStopped,focus,draft,retryRootDestroyed:oldRoot.destroyed};
 });
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',result,errors},null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
