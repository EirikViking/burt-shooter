import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;
assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?encounterEvolution=planetfall&autostart=1&offlineLeaderboard=1`);
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.boss?.isPlanetfall,null,{timeout:90000});
 const setup=await page.evaluate(()=>{
  const g=window.__game,s=g.scenes.play,b=s.enemyManager.boss;g.app.ticker.stop();window.__planetfall=b;
  s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;
  for(let i=0;i<205;i++)b.update(1);g.app.render();
  return {prototype:g.runPolicy.prototype,policy:g.runPolicy,parts:b.components.length,iris:b.planetfall.irisOpen,
   rootRadius:s.getCollisionRadius(b),health:b.health,budget:b.maxHealth,segments:b.visual.segments.length};
 });
 assert(setup.prototype);assert.equal(setup.parts,5);assert(setup.iris);assert.equal(setup.rootRadius,0);assert.equal(setup.health,setup.budget);assert(setup.segments>=24);
 for(const [key,value]of Object.entries(setup.policy))if(key.startsWith('allow'))assert.equal(value,false,key);
 await page.screenshot({path:path.join(out,'arrival.png')});
 const managerGuard=await page.evaluate(()=>{
  const m=window.__game.scenes.play.enemyManager,methods=['updateBossMayhemReinforcement','maybeScheduleBossMayhemReinforcement','maybeTriggerBossChaos','maybeSpawnBossFuelShip'];
  const originals=methods.map(key=>m[key]),calls=[];
  try{for(const key of methods)m[key]=()=>calls.push(key);m.update(1);}
  finally{methods.forEach((key,i)=>{m[key]=originals[i];});}
  return {state:m.state,calls,authoredSupport:!!m.authoredBossSupportState};
 });assert.equal(managerGuard.state,'BOSS_ACTIVE');assert.deepEqual(managerGuard.calls,[]);assert.equal(managerGuard.authoredSupport,false);
 const interruption=await page.evaluate(()=>{
  const s=window.__game.scenes.play,b=window.__planetfall,m=b.planetfall;
  b.interrupt();for(let i=0;i<17;i++)b.update(1);const started=!!m.warning;
  for(let i=0;i<70;i++)b.update(1);const oldAge=m.age;s.isPaused=true;s.update(1);
  const reset=!m.warning&&m.age===oldAge&&b.shots.length===0;s.isPaused=false;
  for(let i=0;i<90;i++)b.update(1);const noEarly=b.shots.length===0;
  for(let i=0;i<15;i++)b.update(1);return {started,reset,noEarly,shots:b.shots.length};
 });
 assert(interruption.started);assert(interruption.reset);assert(interruption.noEarly);assert(interruption.shots>0&&interruption.shots<=6);
 const focus=await page.evaluate(()=>{
  const s=window.__game.scenes.play,b=window.__planetfall;window.dispatchEvent(new Event('blur'));s.isPaused=false;
  const age=b.planetfall.age;for(let i=0;i<180;i++)b.update(1);
  const held=b.planetfall.age===age&&!b.planetfall.warning&&b.shots.length===0;
  window.dispatchEvent(new Event('focus'));window.__game.app.ticker.stop();s.isPaused=false;for(let i=0;i<90;i++)b.update(1);
  return {held,noEarly:b.shots.length===0};
 });assert(focus.held&&focus.noEarly,'sustained focus loss must block warning recharge');
 const route=await page.evaluate(async()=>{
  const {PlanetfallCollapse}=await import('/src/effects/PlanetfallVisual.js');
  const g=window.__game,s=g.scenes.play,m=s.enemyManager,b=window.__planetfall,kills=s.totalKills,score=g.score;
  g.app.ticker.stop();
  while(!b.planetfall.irisOpen)b.update(1);
  const core=b.components[4];s.applyCombatDamage(core,core.maxHealth*.51,'primary');const rupture=b.planetfall.stage==='rupture';
  m.bossSpawnedAtMs=Date.now();
  s.applyCombatDamage(core,core.maxHealth*2,'primary');const livingAnchors=b.planetfall.parts.slice(0,4).every(p=>p.health>0);
  const credited=s.totalKills-kills,awarded=g.score-score;s.applyCombatDamage(core,10000,'primary');
  const once=credited===s.totalKills-kills&&awarded===g.score-score;
  const coreOnly=new PlanetfallCollapse(m,{segments:[],irisLeaves:b.visual.irisLeaves,cradle:b.visual.cradle});
  const coreAftermath=coreOnly.fragments.length;coreOnly.destroy();
  const collapse=!!m.breachCollapses?.size;const effect=[...m.breachCollapses][0];let audioStopped=false;
  const suspend=effect.audio.suspend.bind(effect.audio);effect.audio.suspend=()=>{audioStopped=true;suspend();};
  s.isPaused=true;s.update(1);const pausedAudioStopped=audioStopped;s.isPaused=false;
  for(let i=0;i<240;i++)for(const effect of [...m.breachCollapses||[]])effect.update(1);
  const finite=!m.breachCollapses?.size;m.update(1);
  const progression={state:m.state,defeated:m.bossDefeatedThisLevel,health:b.health};
  return {rupture,livingAnchors,credited,awarded,once,collapse,finite,coreAftermath,audioStopped:pausedAudioStopped,active:b.active,shots:b.shots.length,progression};
 });
 for(const key of ['rupture','livingAnchors','once','collapse','finite','audioStopped'])assert(route[key],key);
 assert.equal(route.credited,1);assert(route.awarded>0);assert.equal(route.active,false);assert.equal(route.shots,0);
 assert(route.coreAftermath>=7,'core breakup must remain visible after all outer ring segments are gone');
 assert.deepEqual(route.progression,{state:'LEVEL_COMPLETE',defeated:true,health:0},'normal manager progression must not revive a legitimate fast kill');
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'pass',scope:'DEV policy, manager progression, runtime lifecycle and direct damage routing; not real weapon/fun proof',setup,managerGuard,interruption,route,errors},null,2));
 console.log(JSON.stringify({status:'pass',setup,managerGuard,interruption,route}));
}finally{await browser.close();}
