import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:/Codex/'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),rows=[],errors=[];
try{for(const label of ['baseline','candidate','candidate','baseline']){
  const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=>'boss-snake'};});
  await page.goto((label==='baseline'?process.env.BASELINE_URL:process.env.CHECK_URL)+'/?offlineLeaderboard=1');
  await page.waitForFunction(()=>window.__game?.currentSceneName==='shipSelect'&&document.body.dataset.menuReady==='1',null,{timeout:120000});
  await page.evaluate(()=>window.__game.startGame(undefined,{countShipUsage:false}));
  await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.boss?.active&&window.__game.scenes.play.introComplete&&!window.__game.scenes.play.levelStartWarmupPending&&!window.__game.scenes.play.enemyManager.spawning,null,{timeout:120000});
  await page.evaluate(()=>{const g=window.__game,s=g.scenes.play;g.app.ticker.stop();s.firstLightDirector.enabled=true;s.firstLightDirector.loadArt();});
  await page.waitForFunction(()=>window.__game.scenes.play.firstLightDirector.view,null,{timeout:90000});
  const row=await page.evaluate(async label=>{
    const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,m=s.enemyManager;
    if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe performance policy');
    m.clearEnemies();m.clearPendingWaveSpawns();g.encounterTest=null;g.level=m.level=12;g.runMode='ranked_tactical';
    s.shipIntroToken++;s.debugStartLevel=null;g.contentDirector.seed='encounter-expansion-performance-v1';
    s.clearBossHazards('drive-comparison');s.clearToastState();s.activeBossIntroCard=null;
    m.phase='BOSS';m.state='BOSS_ACTIVE';m.spawning=false;const b=await m.spawnBoss(12);
    if(!b?.isDreadnought)throw Error('Missing matched capital boss');
    b.age=4;b.warning=null;b.rig.update(0);
    const model={encounter:null,escorts:[-1,1].map(side=>({side,age:3,joinAge:3,rank:0,callsign:'TEST'}))};
    d.view.update(model,0,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player);d.view.root.visible=true;
    s.bulletManager.clearAll('drive-comparison');const Bullet=s.player.shoot()[0].constructor;
    for(let i=0;i<160;i++)s.bulletManager.addEnemyBullet(new Bullet(70+i%20*88,145+Math.floor(i/20)*58,0,.2,1,0xff795a,false,{cosmeticPhase:i}));
    const state=()=>JSON.stringify({score:g.score,lives:g.lives,hp:b.breach.health,parts:b.breach.parts.map(p=>p.health)}),before=state();
    const stats=v=>{const a=[...v].sort((a,b)=>a-b);return {n:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1),over50:a.filter(x=>x>50).length};};
    const step=()=>{const start=performance.now();b.rig.update(0);d.view.update(model,0,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player);s.updateStarfield(1);g.app.render();return performance.now()-start;};
    const cpu=[],raf=[];for(let i=0;i<600;i++){const t=step();if(i>=120)cpu.push(t);}let last,warm=60;
    await new Promise(resolve=>{const frame=t=>{if(last!==undefined&&warm--<=0)raf.push(t-last);last=t;step();if(raf.length===180)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});
    return {label,cpu:stats(cpu),raf:stats(raf),unchanged:before===state(),bullets:s.bulletManager.enemyBullets.filter(b=>b.active).length,drives:{capital:b.rig.drives?.length||0,wing:d.view.drives?.length||0},layout:b.breach.layout.id};
  },label);
  rows.push(row);console.log(JSON.stringify(row));await page.screenshot({path:path.join(out,`${label}-${rows.length}.png`)});await page.close();
}
writeFileSync(path.join(out,'report.json'),JSON.stringify({conditions:'Compiled A/B/B/A, same Chrome and frozen capital/wing poses, fixed 160 hostile projectiles. Presentation only, no combat advancement; not a natural run or whole-game performance claim.',rows,errors},null,2));
assert(rows.every(r=>r.unchanged&&r.bullets===160&&r.layout===rows[0].layout));
assert(rows.filter(r=>r.label==='candidate').every(r=>r.drives.capital===6&&r.drives.wing===4));assert.deepEqual(errors,[]);
}finally{await browser.close();}
