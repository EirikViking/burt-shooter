import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],rows=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=planetfall`);
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.boss?.isPlanetfall,null,{timeout:90000});
 await page.evaluate(()=>{
  const g=window.__game,s=g.scenes.play,b=s.enemyManager.boss;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe performance policy');
  s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;s.clearToastState();
  for(let i=0;i<205;i++)b.update(1);b.clearOwnedShots();s.bulletManager.clearAll('planetfall-perf');
  const Bullet=s.player.shoot()[0].constructor;
  for(let i=0;i<160;i++)s.bulletManager.addEnemyBullet(new Bullet(70+i%20*88,145+Math.floor(i/20)*58,0,.2,1,0xff795a,false,{cosmeticPhase:i}));
 });
 for(const label of ['components-only','complete-ring','complete-ring','components-only']){
  const row=await page.evaluate(async label=>{
   const g=window.__game,s=g.scenes.play,b=s.enemyManager.boss,visible=label==='complete-ring';
   for(const layer of [b.visual.root,b.visual.signals,b.visual.label,b.visual.foundrySprite].filter(Boolean))layer.visible=visible;
   for(const c of b.components)c.body.visible=!visible||!b.visual.foundry;
   b.planetfall.age=4;
   const state=()=>JSON.stringify([g.score,g.lives,b.health,...b.planetfall.parts.map(p=>p.health)]),before=state();
   const stats=values=>{const a=[...values].sort((a,b)=>a-b);return {n:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1),over50:a.filter(v=>v>50).length};};
   const step=()=>{const start=performance.now();b.planetfall.age+=1/60;b.syncParts();if(visible)b.visual.update(1);s.updateStarfield(1);g.app.render();return performance.now()-start;};
   const cpu=[],raf=[];for(let i=0;i<600;i++){const duration=step();if(i>=120)cpu.push(duration);}
   let last,warm=60;await new Promise(resolve=>{const frame=t=>{if(last!==undefined&&warm--<=0)raf.push(t-last);last=t;step();
    if(raf.length===180)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});
   return {label,cpu:stats(cpu),raf:stats(raf),unchanged:before===state(),bullets:s.bulletManager.enemyBullets.filter(b=>b.active).length,
    segments:b.visual.segments.length,components:b.components.length};
  },label);
  rows.push(row);console.log(JSON.stringify(row));await page.screenshot({path:path.join(out,`${label}-${rows.length}.png`)});
 }
 const scope='Same source build, Chrome/context/scene, A/B/B/A with160fixed hostile projectiles: component rendering versus full moving ring. Presentation cost only; not a compiled baseline comparison or whole-game combat benchmark.';
 writeFileSync(path.join(out,'report.json'),JSON.stringify({scope,rows,errors},null,2));
 assert.deepEqual(errors,[]);assert(rows.every(r=>r.unchanged&&r.bullets===160&&r.components===5&&r.segments===32));
 assert(rows.filter(r=>r.label==='complete-ring').every(r=>r.cpu.p99<16.7&&r.raf.p99<34),'investigate frame tail before release');
}finally{await browser.close();}
