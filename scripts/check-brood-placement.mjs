import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert.ok(out);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4377'}/?autostart=1&offlineLeaderboard=1`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.player?.active&&window.__game.scenes.play.enemyManager.waves.length,null,{timeout:90000});
 await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play;g.app.ticker.stop();p.introActive=false;p.isPaused=false;
  if(p.introOverlay)p.introOverlay.visible=false;
  const {AudioManager}=await import('/src/audio/AudioManager.js');AudioManager.enabled=false;AudioManager.stopAllVoices();
 });
 const rows=[];
 for(let sample=0;sample<28;sample++){
  const row=await page.evaluate(async sample=>{
   const g=window.__game,p=g.scenes.play,m=p.enemyManager;m.clearEnemies();p.clearEnemyBullets();g.level=m.level=100;m.state='BROOD_PLACEMENT_QA';m.currentWaveIndex=sample;
   const {SPACE_SNAKES}=await import('/src/config/SpaceSnakes.js');
   const count=sample<14?20:5,profile=SPACE_SNAKES[sample%14];
   const chain=m.spawnSpaceSnake(profile,{force:true,count,seed:`placement-${sample}`}),b=chain.brood;await b.promise;
   const births=[];let previous=0,firstEgg=null;
   for(let frame=0;frame<960;frame++){
    m.updateEnemies(1);p.bulletManager.update(1);
    if(firstEgg===null&&b.eggs.length)firstEgg=b.age;
    for(const a of b.babies.slice(previous))births.push({x:a.x/g.getWidth(),y:a.y/g.getHeight(),at:b.age,entry:a.state==='ENTRY'&&a.contactSafeDuringEntry});
    previous=b.babies.length;
    if(frame%60===0)p.clearEnemyBullets();
   }
   return {family:profile.id,sample,count,firstEgg,births};
  },sample);
  rows.push(row);
 }
 const recovery=await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play,m=p.enemyManager;m.clearEnemies();p.clearEnemyBullets();
  const {SPACE_SNAKES}=await import('/src/config/SpaceSnakes.js');
  const chain=m.spawnSpaceSnake(SPACE_SNAKES[0],{force:true,count:20,seed:'host-recovery'}),b=chain.brood;await b.promise;
  b.plan.hatchAt=0;chain.age=4;
  const run=n=>{for(let i=0;i<n;i++)b.update(1,p.player);};
  run(60);const deferred=!b.hatchStarted;
  chain.sections.forEach((s,i)=>{s.x=g.getWidth()*(.15+i*.1);s.y=g.getHeight()*.3;});run(1);
  const hosts=new Set(b.eggs.map(e=>e.host)).size;
  const egg=b.eggs[0];egg.at=b.age+.01;const oldHost=egg.host;oldHost.active=false;run(1);
  const reassigned=egg.host!==oldHost;run(40);const warned=!egg.done;
  // Hide all hosts, then bring the SAME host back after its deadline. It must
  // regain the visible warning rather than hatching immediately on re-entry.
  chain.sections.forEach(s=>s.y=-100);run(90);const hidden=!egg.sprite.visible&&!egg.done;
  chain.sections.forEach(s=>s.y=g.getHeight()*.3);run(1);const returned=!egg.done&&egg.sprite.visible;
  run(44);const stillWarned=!egg.done;run(3);const hatched=egg.done;
  m.clearEnemies();return {deferred,hosts,expectedHosts:chain.sections.length,reassigned,warned,hidden,returned,stillWarned,hatched};
 });
 const births=rows.flatMap(r=>r.births),bins=Array(9).fill(0);
 for(const p of births)bins[Math.min(2,Math.max(0,Math.floor(p.y*3)))*3+Math.min(2,Math.max(0,Math.floor(p.x*3)))]++;
 const summary={firstBirth:Math.min(...births.map(p=>p.at)),lastBirth:Math.max(...births.map(p=>p.at)),x:[Math.min(...births.map(p=>p.x)),Math.max(...births.map(p=>p.x))],y:[Math.min(...births.map(p=>p.y)),Math.max(...births.map(p=>p.y))],bins};
 fs.writeFileSync(out+'/placement.json',JSON.stringify({summary,rows,recovery,errors},null,2));console.log(JSON.stringify({summary,recovery}));
 assert.deepEqual(errors,[]);
 for(const r of rows){assert.equal(r.births.length,r.count,r.family);assert.ok(r.births.every(p=>p.entry),r.family+' entry protection');}
 if(!process.env.MEASURE_ONLY){
  assert.ok(summary.firstBirth<5,'Some broods hatch earlier than the old 5.75-second minimum');
  assert.ok(rows.some(r=>r.firstEgg>7.5),'Timing also varies beyond the old narrow window');
  assert.ok(births.every(p=>p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1),'Births stay on screen');
  assert.ok(bins.slice(0,6).every(n=>n>0),'Upper/middle hatches cover left, center and right across seeded encounters');
  assert.ok(rows.every(r=>r.births[0].at-r.firstEgg>=.74),'At least 0.75 seconds of egg warning');
  assert.equal(recovery.hosts,recovery.expectedHosts,'All visible sections can carry eggs');
  for(const key of ['deferred','reassigned','warned','hidden','returned','stillWarned','hatched'])assert.ok(recovery[key],key);
 }
 console.log('PASS actual runtime brood placement, counts and entry protection');
}finally{await browser.close();}
