import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4983'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=reactor-tow`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.model.encounter?.reactor,null,{timeout:120000});
 const rows=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,m=s.enemyManager;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe performance fixture');
  const {FirstLightModel}=await import('/src/game/ArcadeFirstLight.js'),{makeReactorTow}=await import('/src/game/ReactorTow.js'),{Bullet}=await import('/src/entities/Bullet.js'),{AudioManager}=await import('/src/audio/AudioManager.js');
  AudioManager.enabled=false;s.introComplete=true;s.introActive=false;s.isPaused=false;
  m.clearEnemies();m.clearPendingWaveSpawns();m.boss=null;m.hijacker=null;m.environment=null;m.discoveryEncounter=null;m.mysteryDirector=null;m.challengeFlightState=null;m.mayhemReinforcementState=null;
  m.waves=[];m.spawning=true;m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;
  s.activeMayhemReinforcementWarning=null;s.activeMayhemRoutineWarning=null;s.activeBossIntroCard=null;
  const stats=v=>{const a=[...v].sort((a,b)=>a-b);return {n:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1),over50:a.filter(x=>x>50).length};};
  const rows=[];
  for(const kind of ['rival','reactor','reactor','rival']){
   d.cancel('paired-render');s.bulletManager.clearAll('paired-render');s.clearToastState();d.model=new FirstLightModel('paired-render');
   if(kind==='reactor'){g.level=3;d.model.encounter={kind:'convoy',sector:3,age:5.3,suspended:false,...makeReactorTow(1)};}
   else{g.level=2;for(let i=0;i<41;i++)d.model.update(.1,{sector:2,safe:true});}
   d.localTestStarted=true;d.update(0);
   for(let i=0;i<160;i++)s.bulletManager.addEnemyBullet(new Bullet(70+i%20*88,145+Math.floor(i/20)*58,0,.2,1,0xff795a,false,{cosmeticPhase:i}));
   const before=JSON.stringify({score:g.score,lives:g.lives,hp:d.event.hp});
   const step=()=>{d.event.age=kind==='reactor'?5.3:3;if(d.event.reactor)d.event.reactor.warning=.8;d.attackTimers.left=100;d.attackTimers.right=100;
    const start=performance.now();d.update(1);s.processToastQueue();s.updateStarfield(1);g.app.render();return performance.now()-start;};
   const cpu=[],raf=[];for(let i=0;i<600;i++){const elapsed=step();if(i>=120)cpu.push(elapsed);}
   let last,warm=60;await new Promise(resolve=>{const frame=t=>{if(last!==undefined&&warm--<=0)raf.push(t-last);last=t;step();if(raf.length>=180)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});
   rows.push({kind,cpu:stats(cpu),raf:stats(raf),unchanged:before===JSON.stringify({score:g.score,lives:g.lives,hp:d.event.hp}),bullets:s.bulletManager.enemyBullets.filter(b=>b.active).length});
  }return rows;
 });
 writeFileSync(path.join(out,'report.json'),JSON.stringify({comparison:'Same source build/Chrome/context/160 stationary projectiles. Existing rival baseline vs new reactor at peak warning; A/B/B/A. Not a whole-run FPS claim.',rows,errors},null,2));
 assert(rows.every(r=>r.unchanged&&r.bullets===160));assert.deepEqual(errors,[]);console.log(JSON.stringify(rows));
}finally{await browser.close();}
