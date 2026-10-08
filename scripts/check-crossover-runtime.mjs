import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4896'}/?encounterEvolution=natural&autostart=1&offlineLeaderboard=1`);
 await page.waitForFunction(()=>window.__game?.scenes?.play?.introComplete,null,{timeout:90000});
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.state==='WAVE_ACTIVE'&&!window.__game.scenes.play.enemyManager.spawning,null,{timeout:60000});
 const setup=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();m.clearEnemies();g.level=m.level=23;m.spawning=true;
  const {SPACE_SNAKES}=await import('/src/config/SpaceSnakes.js');
  const {createMysteryEncounter}=await import('/src/entities/mysteries/createMysteryEncounter.js');
  const chain=m.spawnSpaceSnake(SPACE_SNAKES[0],{molt:true,curatedReassembly:true,healthScalar:.65});
  chain.age=4;for(const e of chain.sections){e.health=e.maxHealth*.55;e.update(1);}
  for(let i=0;i<45;i++)chain.molt.update(1);
  const a=await createMysteryEncounter(m,'carrion_weaver');a.crossoverMolt=chain.molt;a.age=3;a.recoveryUntil=0;a.state='FORMATION';
  a.tick(.1);const p=a.reassembly.model.record;const response=p.active&&p.owner===a;
  // Advance the real plate clock as well as extraction, without player shots.
  for(let i=0;i<140;i++){chain.molt.update(1);a.update(1);}
  window.__cross={a,chain,p};g.app.render();
  return {response,actual:p===chain.molt.model.plates[0],removed:!p.active,active:a.reassembly.model.state==='active',core:Boolean(a.reassembly.core)};
 });
 await page.screenshot({path:path.join(out,'serpent-platform.png')});
 const result=await page.evaluate(()=>{
  const g=window.__game,m=g.scenes.play.enemyManager,{a,chain}=window.__cross,r=a.reassembly;
  const before=r.platform.health;r.platform.takeDamage(1);const shell=before-r.platform.health;
  const after=r.platform.health;r.core.takeDamage(1);const core=after-r.platform.health;
  const score=g.score;for(const e of chain.sections)e.active=false;chain.molt.dispose('owner-death');a.tick(.1);
  const shut=r.model.state==='done'&&!r.platform.active&&!r.core.active;
  a.destroy();a.destroy();m.clearEnemies();return {shell,core,shut,noCredit:score===g.score,cleanup:m.combatWrecks.records.length===0};
 });
 for(const k of ['response','actual','removed','active','core'])assert(setup[k],k);
 assert(result.core>result.shell);assert(result.shut&&result.noCredit&&result.cleanup);assert.deepEqual(errors,[]);
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',setup,result,errors},null,2));console.log(JSON.stringify({setup,result}));
}finally{await browser.close();}
