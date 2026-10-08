import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete,null,{timeout:90000});
 const result=await page.evaluate(async()=>{
  const g=window.__game,m=g.scenes.play.enemyManager;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe fixture');
  m.clearEnemies();m.clearPendingWaveSpawns();m.state='BOSS_GATE';m.bossSpawning=false;m.bossGateTimer=9000;
  const original=m.spawnBoss;
  try{
   m.spawnBoss=async()=>{throw Error('controlled boss load failure');};
   await m.beginBossSpawn();
   const failure={state:m.state,spawning:m.bossSpawning,timer:m.bossGateTimer,pending:!!m.bossSpawnRequest};
   m.spawnBoss=async()=>null;m.state='BOSS_ACTIVE';await m.beginBossSpawn();
   const rejected={state:m.state,spawning:m.bossSpawning,pending:!!m.bossSpawnRequest};
   const releases=[];m.spawnBoss=async()=>new Promise(resolve=>releases.push(resolve));
   const old=m.beginBossSpawn();await Promise.resolve();
   const duplicate=await m.beginBossSpawn();
   // The level reset invalidates the caller owner before a new run can load.
   m.bossSpawning=false;m.bossSpawnRequest=null;g.encounterPacing=null;
   const fresh=m.beginBossSpawn();await Promise.resolve();const owner=m.bossSpawnRequest;
   releases[0]({active:true});await old;
   const preserved=duplicate===null&&m.bossSpawnRequest===owner&&m.bossSpawning&&m.state==='BOSS_GATE';
   releases[1]({active:true});await fresh;
   const success={state:m.state,spawning:m.bossSpawning,pending:!!m.bossSpawnRequest};
   m.state='BOSS_GATE';const cancelled=m.beginBossSpawn();await Promise.resolve();m.waveSpawnSerial++;
   releases[2]({active:true});await cancelled;
   const stale={state:m.state,spawning:m.bossSpawning,pending:!!m.bossSpawnRequest};
   return {failure,rejected,preserved,success,stale};
  }finally{m.spawnBoss=original;}
 });
 assert.deepEqual(result.failure,{state:'BOSS_GATE',spawning:false,timer:0,pending:false});
 assert.deepEqual(result.rejected,{state:'BOSS_GATE',spawning:false,pending:false});
 assert(result.preserved);assert.deepEqual(result.success,{state:'BOSS_ACTIVE',spawning:false,pending:false});
 assert.deepEqual(result.stale,{state:'BOSS_GATE',spawning:false,pending:false});assert.deepEqual(errors,[]);
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'pass',scope:'Actual manager caller with controlled async loads, failure/rejection retry, duplicate suppression and old/new request ownership',result,errors},null,2));
 console.log('[boss-spawn-recovery] PASS failure, rejection, duplicate, ownership and stale completion');
}finally{await browser.close();}
