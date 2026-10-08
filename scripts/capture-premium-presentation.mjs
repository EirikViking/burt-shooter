import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
try{
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4899'}/?encounterEvolution=breach&autostart=1&offlineLeaderboard=1`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.encounterExpansionTestReady,null,{timeout:90000});
 await page.evaluate(()=>{const g=window.__game,s=g.scenes.play;g.app.ticker.stop();s.firstLightDirector.cancel('presentation-fixture');s.firstLightDirector.syncVisibility();s.player.invulnerable=true;s.player.invulnerableTime=999999;
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe fixture');});
 async function beat(name,frames){for(let i=0;i<frames;i++){
  await page.evaluate(()=>{const g=window.__game,s=g.scenes.play;for(let i=0;i<3;i++){g.runElapsedSeconds+=1/60;s.gameTime+=1/60;s.enemyManager.updateEnemies(1);s.bulletManager.update(1);s.particleManager.update(1);}s.hud.update();g.app.render();});
  await page.waitForTimeout(50);
 }await page.screenshot({path:path.join(out,`${name}.png`)});}
 await beat('dreadnought-batteries',80);
 await page.evaluate(()=>{const s=window.__game.scenes.play,b=s.enemyManager.boss;for(const id of ['relay_0','relay_1'])s.applyCombatDamage(b.components.find(c=>c.type===id),b.maxHealth*10,'primary');});
 await beat('dreadnought-hull-opening',30);
 await page.evaluate(()=>{const s=window.__game.scenes.play,b=s.enemyManager.boss;s.applyCombatDamage(b.components.find(c=>c.type==='hull'),b.maxHealth*10,'primary');});
 await beat('dreadnought-reactor',30);
 await page.evaluate(()=>{const s=window.__game.scenes.play,b=s.enemyManager.boss;s.applyCombatDamage(b.components.find(c=>c.type==='reactor'),b.maxHealth*10,'primary');s.enemyManager.update(1);});
 await beat('dreadnought-collapse',6);await beat('dreadnought-clear',36);
 assert.deepEqual(errors,[]);const state=await page.evaluate(()=>{const g=window.__game,s=g.scenes.play;return{prototype:g.runPolicy.prototype,kills:s.totalKills,score:g.score,collapseCount:s.enemyManager.breachCollapses.size};});
 assert.equal(state.kills,1);assert.equal(state.collapseCount,0);
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',conditions:'Real renderer and normal component damage; scripted phase showcase with invulnerable player, no progression. Not a natural run or difficulty/fun measurement.',state,errors},null,2));
 console.log(JSON.stringify(state));
}finally{await context.close();await browser.close();}
