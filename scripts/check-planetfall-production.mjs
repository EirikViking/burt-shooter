import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR,url=process.env.CHECK_URL;
assert(out?.startsWith('E:')&&url,'Use an explicit compiled URL and owned E: output');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=>'boss-snake'};});
 await page.goto(`${url}/?offlineLeaderboard=1&encounterEvolution=planetfall`);
 await page.waitForFunction(()=>window.__game?.currentSceneName==='shipSelect'&&document.body.dataset.menuReady==='1',null,{timeout:90000});
 const route=await page.evaluate(()=>window.__game.encounterEvolutionTest||null);assert.equal(route,null,'compiled URL must reject Planetfall prototype');
 await page.evaluate(()=>window.__game.startGame(undefined,{countShipUsage:false}));
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.boss?.active&&window.__game.scenes.play.introComplete&&!window.__game.scenes.play.enemyManager.spawning,null,{timeout:90000});
 const factory=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Fixture must be progression-free');
  const originalBossPlanetfall=!!m.boss?.isPlanetfall;
  m.clearEnemies();m.clearPendingWaveSpawns();g.level=m.level=10;m.state='BOSS_ACTIVE';m.phase='BOSS';
  // Even forged runtime flags cannot bypass the compiled DEV condition.
  g.encounterEvolutionTest={id:'planetfall'};const b=await m.spawnBoss(10);
  const result={originalBossPlanetfall,spawned:!!b,isPlanetfall:!!b?.isPlanetfall,policy:g.runPolicy};
  m.clearEnemies();m.clearPendingWaveSpawns();s.firstLightDirector?.cancel('compiled-admission-fixture');
  if(m.environment?.active)m.environment.destroy();m.mysteryDirector?.clear?.();
  if(m.mysteryDirector)m.mysteryDirector.plan=null;
  g.encounterEvolutionTest=null;g.lastDreadnoughtSector=null;g.encounterPacing=null;
  g.level=m.level=18;m.state='BOSS_ACTIVE';m.phase='BOSS';
  const natural=await m.spawnBoss(18);
  result.natural={spawned:!!natural,isPlanetfall:!!natural?.isPlanetfall,id:natural?.profile?.id,admitted:g.encounterPacing?.planetfallSector};
  m.clearEnemies();return result;
 });
 assert(factory.spawned&&!factory.originalBossPlanetfall&&!factory.isPlanetfall);assert.deepEqual(errors,[]);
 assert.deepEqual(factory.natural,{spawned:true,isPlanetfall:true,id:'planetfall',admitted:18});
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'pass',route,factory,errors,
  scope:'Actual compiled URL rejection, forged prototype containment, and normal factory admission at a controlled eligible sector18; disposable isolated profile, not unforced survival evidence'},null,2));
 console.log('[planetfall-production] PASS compiled prototype containment and natural factory admission');
}finally{await browser.close();}
