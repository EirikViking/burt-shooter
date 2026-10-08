import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 await page.waitForFunction(()=>window.__game?.scenes?.play?.introComplete&&window.__game.scenes.play.player?.active,null,{timeout:90000});
 const spawned=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe fixture');
  m.clearEnemies();m.clearPendingWaveSpawns();s.firstLightDirector.cancel('admission-fixture');
  if(m.environment?.active)m.environment.destroy();m.mysteryDirector?.clear?.();
  if(m.mysteryDirector)m.mysteryDirector.plan=null;g.encounterPacing=null;g.runElapsedSeconds=300;g.lastDreadnoughtSector=18;
  g.level=m.level=18;m.phase='BOSS';m.state='BOSS_ACTIVE';
  const ordinary=await m.spawnBoss(18),budget=ordinary.maxHealth,scoreValue=ordinary.scoreValue;
  m.clearEnemies();m.clearPendingWaveSpawns();g.lastDreadnoughtSector=null;g.encounterPacing=null;
  const discoveries=[],record=s.recordThreatDiscovery.bind(s);s.recordThreatDiscovery=(id,category,...args)=>{discoveries.push({id,category});return record(id,category,...args);};
  const b=await m.spawnBoss(18);window.__naturalPlanetfall={b,budget,scoreValue,discoveries};
  s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;
  return {planetfall:!!b?.isPlanetfall,id:b?.profile?.id,sector:g.encounterPacing?.planetfallSector,budget,actualBudget:b?.maxHealth,scoreValue,actualScoreValue:b?.scoreValue,discoveries};
 });
 assert.equal(spawned.planetfall,true,'normal eligible boss slot must choose Planetfall without the forced preview route');
 assert.equal(spawned.id,'planetfall');assert.equal(spawned.sector,18);
 assert.equal(spawned.actualBudget,spawned.budget);assert.equal(spawned.actualScoreValue,spawned.scoreValue);
 assert(spawned.discoveries.some(e=>e.id==='planetfall'&&e.category==='bosses'));
 const integration=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,m=s.enemyManager,b=window.__naturalPlanetfall.b;
  const {getThreatCodexCatalog}=await import('/src/config/ThreatCodexCatalog.js');
  const locales=['en','de','es','pt-BR','ru','zh-CN','ko','ja'].map(locale=>({locale,entries:getThreatCodexCatalog({locale}).bosses.filter(e=>e.id==='planetfall')}));
  for(let i=0;i<205;i++)b.update(1);
  const before={score:g.score,kills:s.totalKills};b.hitComponent(b.components[4],b.maxHealth);
  m.bossSpawnedAtMs=Date.now();m.update(1);
  const victory={defeated:s.defeatedBossIds.includes('planetfall'),kills:s.totalKills-before.kills,score:g.score-before.score,state:m.state};
  m.clearEnemies();m.clearPendingWaveSpawns();g.level=m.level=19;const next=await m.spawnBoss(19);
  const noRepeat=!next.isPlanetfall;m.clearEnemies();m.clearPendingWaveSpawns();return {locales,victory,noRepeat};
 });
 assert(integration.victory.defeated&&integration.noRepeat);assert.equal(integration.victory.kills,1);assert(integration.victory.score>0);assert.equal(integration.victory.state,'LEVEL_COMPLETE');
 for(const row of integration.locales){assert.equal(row.entries.length,1);assert(row.entries[0].description&&row.entries[0].tip);}
 const concurrency=await page.evaluate(async()=>{
  const PlanetfallBoss=window.__naturalPlanetfall.b.constructor;
  const g=window.__game,m=g.scenes.play.enemyManager;g.app.ticker.stop();g.level=m.level=18;
  g.lastDreadnoughtSector=null;g.encounterPacing=null;
  const create=PlanetfallBoss.prototype.createSprite;let release;
  PlanetfallBoss.prototype.createSprite=async function(){await new Promise(resolve=>{release=resolve;});return create.call(this);};
  try{
   const pending=m.spawnBoss(18);await Promise.resolve();
   if(typeof release!=='function')throw Error('Actual factory did not enter the controlled asset load');
   const duplicate=await m.spawnBoss(18);
   m.clearPendingWaveSpawns();release();const stale=await pending;
   const afterCancel={duplicate:duplicate===null,stale:stale===null,unconsumed:g.encounterPacing?.planetfallSector==null,pending:!!m.planetfallSpawnPending};
   PlanetfallBoss.prototype.createSprite=create;
   const retry=await m.spawnBoss(18);const admitted=retry?.isPlanetfall&&g.encounterPacing?.planetfallSector===18;
   m.clearEnemies();return {afterCancel,admitted};
  }finally{PlanetfallBoss.prototype.createSprite=create;}
 });
 assert.deepEqual(concurrency.afterCancel,{duplicate:true,stale:true,unconsumed:true,pending:false});assert(concurrency.admitted);
 const ownership=await page.evaluate(async()=>{
  const g=window.__game,m=g.scenes.play.enemyManager,C=window.__naturalPlanetfall.b.constructor,create=C.prototype.createSprite;
  g.app.ticker.stop();m.clearEnemies();m.clearPendingWaveSpawns();g.level=m.level=18;g.encounterPacing=null;g.lastDreadnoughtSector=null;
  const releases=[];C.prototype.createSprite=async function(){await new Promise(resolve=>releases.push(resolve));return create.call(this);};
  try{
   const old=m.spawnBoss(18);await Promise.resolve();g.encounterPacing=null;
   const fresh=m.spawnBoss(18);await Promise.resolve();const owner=m.planetfallSpawnPending;
   releases[0]();const stale=await old;
   const preserved=stale===null&&m.planetfallSpawnPending===owner&&g.encounterPacing.planetfallSector==null;
   releases[1]();const next=await fresh;const admitted=next?.isPlanetfall&&g.encounterPacing.planetfallSector===18;
   m.clearEnemies();m.clearPendingWaveSpawns();g.encounterPacing=null;
   C.prototype.createSprite=async()=>{throw Error('controlled asset failure');};
   let failed=false;try{await m.spawnBoss(18);}catch(error){failed=error.message==='controlled asset failure';}
   return {preserved,admitted,failed,unconsumed:g.encounterPacing.planetfallSector==null,pending:!!m.planetfallSpawnPending};
  }finally{C.prototype.createSprite=create;}
 });
 assert.deepEqual(ownership,{preserved:true,admitted:true,failed:true,unconsumed:true,pending:false});
 await page.evaluate(()=>window.__game.startGame(undefined,{countShipUsage:false}));
 await page.waitForFunction(()=>window.__game?.scenes?.play?.introComplete&&window.__game.scenes.play.player?.active,null,{timeout:90000});
 const reset=await page.evaluate(()=>window.__game.encounterPacing?.planetfallSector??null);assert.equal(reset,null);
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'pass',scope:'Actual normal factory at controlled sector18, original budget, Codex identity, defeat/continuation, async cancellation, run-identity replacement, load failure and new-run reset. Not an unforced survival run.',spawned,integration,concurrency,ownership,reset,errors},null,2));
 console.log('[planetfall-natural-runtime] PASS actual admission, identity, budget, victory, concurrency, cancellation and reset');
}finally{await browser.close();}
