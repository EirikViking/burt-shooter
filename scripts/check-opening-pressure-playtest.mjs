import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {ShipData} from '../src/config/ShipData.js';
const label=process.argv[2]||'candidate';
const out=`test-results/opening-pressure-${label}`;mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={label,description:'Normal-speed scripted input; isolated profiles; no invulnerability, forced kills or accelerated clock. Separate content rolls, not a deterministic replay.',runs:[]};
try {
 for(const ship of (process.env.TEST_SHIPS||'nova_ship_01,nova_ship_03,nova_ship_07').split(',')) {
  const context=await browser.newContext({viewport:{width:1280,height:720}});
  await context.route('**/*',r=>/^(data:|blob:|https?:\/\/(127\.0\.0\.1|localhost)(:|\/))/.test(r.request().url())?r.continue():r.abort());
  const page=await context.newPage();const row={ship,events:[],errors:[]};report.runs.push(row);
  page.on('pageerror',e=>row.errors.push(e.message));
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4399'}/?offlineLeaderboard=1&seed=1290904`);
  await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
  const spriteKey=ShipData.find(s=>s.id===ship)?.spriteKey;assert.ok(spriteKey,`Ship key for ${ship}`);
  await page.evaluate(key=>window.__game.startGame(key,{runMode:'ranked_tactical'}),spriteKey);
  await page.waitForFunction(()=>window.__game.scenes.play?.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
  await page.evaluate(()=>{
   const g=window.__game,p=g.scenes.play;p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);g.markUnrankedRun('opening_pressure_qa');
   window.__openingQA={shots:0,kills:0,entryKills:0,waveHealth:[],times:[],last:performance.now()};
   const b=p.bulletManager,add=b.addEnemyBullet.bind(b);b.addEnemyBullet=(...a)=>{window.__openingQA.shots++;return add(...a);};
   const m=p.enemyManager,old=m.updateEnemies.bind(m);m.updateEnemies=(...a)=>{const now=performance.now();window.__openingQA.times.push(now-window.__openingQA.last);window.__openingQA.last=now;return old(...a);};
  });
  const start=Date.now();let moving=null,prior='',sampled=false;
  await page.keyboard.down('Space');
  while(Date.now()-start<105000){
   const state=await page.evaluate(()=>{const g=window.__game,p=g.scenes.play,m=p.enemyManager,targets=m.enemies.filter(e=>e.active&&!e.waitingForEntry);const target=targets.filter(e=>e.kind!=='boss').sort((a,b)=>Math.abs(a.x-p.player.x)-Math.abs(b.x-p.player.x))[0]||targets[0];return {state:m.state,wave:m.currentWaveIndex,sector:g.level,boss:!!m.boss?.active,draft:!!p.tacticalDraft?.active,scene:g.currentScene===p,paused:p.isPaused,x:p.player.x,target:target?.x,health:targets.map(e=>({hp:e.health,max:e.maxHealth,state:e.state,x:Math.round(e.x),y:Math.round(e.y)})),lives:g.lives,score:g.score,shots:window.__openingQA.shots};});
   const key=`${state.sector}/${state.wave}/${state.state}`;
   if(key!==prior){row.events.push({ms:Date.now()-start,...state});prior=key;writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));}
   if(!sampled&&Date.now()-start>3000){await page.screenshot({path:`${out}/${ship}-combat.png`});sampled=true;}
   if(state.boss||state.draft||!state.scene){row.firstBossMs=state.boss?Date.now()-start:null;break;}
   // Deliberately modest input: acquire the nearest target, correct every 180ms.
   const dx=Number.isFinite(state.target)?state.target-state.x:0,next=Math.abs(dx)<24?null:dx>0?'ArrowRight':'ArrowLeft';
   if(next!==moving){if(moving)await page.keyboard.up(moving);if(next)await page.keyboard.down(next);moving=next;}
   await page.waitForTimeout(180);
  }
  await page.keyboard.up('Space');if(moving)await page.keyboard.up(moving);
  row.final=await page.evaluate(()=>{const g=window.__game,p=g.scenes.play,t=window.__openingQA.times.slice(1).sort((a,b)=>a-b);return {lives:g.lives,score:g.score,shots:window.__openingQA.shots,p95:t[Math.floor(t.length*.95)],p99:t[Math.floor(t.length*.99)],heapMiB:performance.memory?.usedJSHeapSize/1048576,ship:p.player.config?.id,stats:p.player.stats};});
  await page.screenshot({path:`${out}/${ship}-end.png`});assert.deepEqual(row.errors,[]);assert.equal(row.final.ship,ship,'The requested starter really flew');
  writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({ship,bossMs:row.firstBossMs,...row.final}));await context.close();
 }
}finally{await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));}
