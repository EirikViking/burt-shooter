import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/weaver_assembly.wav',async route=>{await new Promise(resolve=>setTimeout(resolve,1600));await route.continue();});
 await page.addInitScript(()=>{
  const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener,registry=new WeakMap();
  window.__planetfallListeners=registry;
  const play=HTMLMediaElement.prototype.play;window.__planetfallAssembly=[];
  HTMLMediaElement.prototype.play=function(...args){if(this.src.includes('/weaver_assembly.wav')){const entry={audio:this,started:0};
   window.__planetfallAssembly.push(entry);this.addEventListener('playing',()=>entry.started++);}return play.apply(this,args);};
  EventTarget.prototype.addEventListener=function(type,fn,...args){let entries=registry.get(this);if(!entries)registry.set(this,entries=new Map());
   if(!entries.has(type))entries.set(type,new Set());entries.get(type).add(fn);return add.call(this,type,fn,...args);};
  EventTarget.prototype.removeEventListener=function(type,fn,...args){registry.get(this)?.get(type)?.delete(fn);return remove.call(this,type,fn,...args);};
 });
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=planetfall`);
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.boss?.isPlanetfall,null,{timeout:90000});
 const rows=await page.evaluate(async()=>{
  const {AudioManager}=await import('/src/audio/AudioManager.js'),{premiumTexture}=await import('/src/effects/PremiumArt.js');
  const g=window.__game,s=g.scenes.play,m=s.enemyManager,rows=[];g.app.ticker.stop();
  const has=(target,type,fn)=>window.__planetfallListeners.get(target)?.get(type)?.has(fn)||false;
  const listenerCount=b=>Number(has(window,'blur',b.onBlur))+Number(has(window,'focus',b.onFocus))+Number(has(document,'visibilitychange',b.onInterruption));
  for(const phase of ['warning','volley','collapse']){
   m.clearEnemies();m.clearPendingWaveSpawns();m.bossDefeatedThisLevel=false;s.bulletManager.clearAll('planetfall-lifecycle');
   const b=await m.spawnBoss(10);if(!b?.isPlanetfall)throw Error('Actual factory failed');
   s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;s.isPaused=false;
   m.state='BOSS_ACTIVE';m.phase='BOSS';for(let i=0;i<205;i++)b.update(1);
   if(phase==='volley')for(let i=0;i<90;i++)b.update(1);
   const stageReady=phase==='warning'?!!b.planetfall.warning:phase==='volley'?b.shots.length>0:b.planetfall.irisOpen;
   let afterVictorySafe=true;
   if(phase==='collapse'){
    s.applyCombatDamage(b.components[4],b.maxHealth,'primary');const state=JSON.stringify([g.score,s.totalKills,b.health,b.active]);
    for(let i=0;i<3;i++)for(const part of b.components)s.applyCombatDamage(part,b.maxHealth,'primary');
    afterVictorySafe=state===JSON.stringify([g.score,s.totalKills,b.health,b.active])&&b.components.every(c=>!c.active);
   }
   const group=(b.audio||b.collapse?.audio).group,registered=listenerCount(b),effect=b.collapse;
   m.clearEnemies();b.destroy();b.destroy();window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));g.app.ticker.stop();
   rows.push({phase,stageReady,registered,afterVictorySafe,listeners:listenerCount(b),spriteDestroyed:b.sprite.destroyed,
    livingShots:s.bulletManager.enemyBullets.filter(shot=>shot.active&&shot.bossOwner===b).length,
    activeAudio:AudioManager.activeSfxGroups[group]?.size||0,effects:m.breachCollapses?.size||0,
    effectDisposed:!effect||effect.done,sharedTextureAlive:!premiumTexture('relay').source.destroyed});
  }
  // Exercise scene-level gates rather than directly calling the boss interruption helper.
  s.isPaused=false;m.bossDefeatedThisLevel=false;const b=await m.spawnBoss(10);m.state='BOSS_ACTIVE';m.phase='BOSS';
  s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;
  for(let i=0;i<205;i++)b.update(1);
  const gates=[];
  for(const gate of ['draft','milestone','native-blur']){
   b.interrupt();for(let i=0;i<70;i++)b.update(1);const age=b.planetfall.age;
   if(gate==='draft')s.tacticalDraft={active:true,update(){}};
   if(gate==='milestone')s.overrunMilestoneInterlude={active:true,update(){}};
   if(gate==='native-blur')window.dispatchEvent(new Event('nova-app-window-blur'));
   s.update(1);const held=b.planetfall.age===age&&!b.planetfall.warning&&b.shots.length===0;
   if(gate==='draft')s.tacticalDraft=null;if(gate==='milestone')s.overrunMilestoneInterlude=null;
   if(gate==='native-blur')s.setPaused(false);
   for(let i=0;i<90;i++)b.update(1);gates.push({gate,held,noEarly:b.shots.length===0});
  }
  m.clearEnemies();s.bulletManager.clearAll('planetfall-lifecycle-end');return {rows,gates};
 });
 for(const row of rows.rows){assert(row.stageReady&&row.afterVictorySafe&&row.spriteDestroyed&&row.effectDisposed&&row.sharedTextureAlive,JSON.stringify(row));
  assert.equal(row.registered,3);assert.equal(row.listeners,0);assert.equal(row.livingShots,0);assert.equal(row.activeAudio,0);assert.equal(row.effects,0);}
 for(const gate of rows.gates)assert(gate.held&&gate.noEarly,JSON.stringify(gate));
 const loading=page.waitForRequest(request=>request.url().endsWith('/weaver_assembly.wav'),{timeout:15000});
 await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,m=s.enemyManager;s.isPaused=false;m.bossDefeatedThisLevel=false;
  const b=await m.spawnBoss(10);s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;
  m.state='BOSS_ACTIVE';for(let i=0;i<400;i++)b.update(1);window.__pendingPlanetfallGroup=b.audio.group;
 });
 await loading;await page.evaluate(()=>window.__game.scenes.play.enemyManager.clearEnemies());await page.waitForTimeout(1900);
 const pendingAudio=await page.evaluate(async()=>{
  const {AudioManager}=await import('/src/audio/AudioManager.js');return {count:window.__planetfallAssembly.length,
   silent:window.__planetfallAssembly.every(e=>e.audio.paused&&e.started===0),groupEmpty:!AudioManager.activeSfxGroups[window.__pendingPlanetfallGroup]};
 });assert(pendingAudio.count>0&&pendingAudio.silent&&pendingAudio.groupEmpty,JSON.stringify(pendingAudio));
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'pass',...rows,errors,
  pendingAudio,
  scope:'Actual manager spawn/clear across warning, volley, collapse and scene interruption gates; no natural-admission or human listening claim'},null,2));
 console.log('[planetfall-lifecycle] PASS',JSON.stringify(rows));
}finally{await browser.close();}
