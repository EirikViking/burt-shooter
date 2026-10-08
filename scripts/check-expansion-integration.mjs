import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[],results=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 for(const id of ['reassembly','crossover','breach','breach-diagonal','graveyard','siege','migration','fusions']){
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4896'}/?encounterEvolution=${id}&autostart=1&offlineLeaderboard=1`);
  await page.waitForFunction(()=>window.__game?.scenes?.play?.encounterExpansionTestReady||window.__game?.scenes?.play?.encounterExpansionTestError,null,{timeout:90000});
  const setup=await page.evaluate(id=>{
   const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();
   const a=m.enemies.find(e=>e.kind==='mystery'),b=m.boss;
   return{id,error:s.encounterExpansionTestError?.message,prototype:g.runPolicy.prototype,
    permissions:Object.entries(g.runPolicy).filter(([k,v])=>k.startsWith('allow')&&v),
    present:id==='reassembly'||id==='crossover'?Boolean(a):id.startsWith('breach')?Boolean(b?.isDreadnought):id==='fusions'?s.player.runAugmentModifiers?.salvageCrown&&s.player.runAugmentModifiers?.riftCrossfire:m.environment?.id===id};
  },id);
  assert(!setup.error,setup.error);assert(setup.prototype&&setup.permissions.length===0&&setup.present,JSON.stringify(setup));
  const frozen=await page.evaluate(()=>{
   const g=window.__game,s=g.scenes.play,m=s.enemyManager;
   const age=()=>({environment:m.environment?.age,breach:m.boss?.age,fusion:m.behavioralFusions.age,capture:m.behavioralFusions.capture?.age,
    queue:m.behavioralFusions.queue.map(q=>q.at),wrecks:m.combatWrecks.records.map(r=>r.age),echoes:m.behavioralFusions.echoes.map(e=>e.until)});
   const before=JSON.stringify(age());s.setPaused(true);for(let i=0;i<90;i++)s.update(1);const paused=JSON.stringify(age())===before;
   s.setPaused(false);s.externalPauseSuppressedUntil=0;s.pauseForExternalInterruption('integration-focus-loss');
   const focus=s.isPaused;for(let i=0;i<90;i++)s.update(1);const focused=JSON.stringify(age())===before;s.setPaused(false);
   const original=s.updateTacticalDraft;s.updateTacticalDraft=()=>{};s.tacticalDraft={active:true};for(let i=0;i<90;i++)s.update(1);
   const draft=JSON.stringify(age())===before;s.tacticalDraft=null;s.updateTacticalDraft=original;
   return{paused,focus,focused,draft};
  });
  for(const value of Object.values(frozen))assert(value,JSON.stringify({id,frozen}));
  // Real combat ticks and ordinary targets; screenshot/film evidence is a
  // fixture, not a claim about human pacing or balance.
  await page.evaluate(()=>{const g=window.__game,s=g.scenes.play,m=s.enemyManager;s.player.invulnerableTime=999999;s.player.invulnerable=true;m.spawning=true;
   for(let i=0;i<175;i++){s.bulletManager.update(1);m.updateEnemies(1);m.combatWreckVisual.update();}g.app.render();});
  await page.screenshot({path:path.join(out,`${id}.png`)});
  const cleanup=await page.evaluate(()=>{const m=window.__game.scenes.play.enemyManager;m.forceClearAllEnemies();m.clearEnemies();
   return!m.environment&&!m.combatWrecks.records.length&&!m.behavioralFusions.capture&&!m.behavioralFusions.echoes.length&&!(m.serpentMolts?.size);});assert(cleanup);
  results.push({setup,frozen,cleanup});console.log(`PASS route ${id}: progression isolation, pause/draft/focus, forced cleanup`);
 }
 // A real retry recreates the manager and clears run-local story state.
 const reset=await page.evaluate(async()=>{
  const g=window.__game;g.lastDreadnoughtSector=200;g.lastReassemblyCrossoverSector=190;g.encounterExpansionEvents=[{id:'breach'}];
  g.encounterPacing.mechanicFamilies={wreck_claim:{sector:190,at:0}};
  await g.startGame(g.selectedSpriteKey);return{breach:g.lastDreadnoughtSector,crossover:g.lastReassemblyCrossoverSector,events:g.encounterExpansionEvents.length,families:Object.keys(g.encounterPacing?.mechanicFamilies||{}).length,prototype:g.runPolicy.prototype};
 });assert.equal(reset.breach,null);assert.equal(reset.crossover,null);assert.equal(reset.events,0);assert.equal(reset.families,0);assert(reset.prototype);
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',results,reset,errors},null,2));
}finally{await browser.close();}
