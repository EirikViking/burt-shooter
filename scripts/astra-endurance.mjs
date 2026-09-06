import {_electron as electron} from 'playwright';
import {mkdirSync,readFileSync,writeFileSync,createWriteStream} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const label=process.argv[2]||'candidate',seconds=Number(process.argv[3]||1200);
const executable=process.argv[4]||JSON.parse(readFileSync('test-results/astra-build-location.json')).executable;
const out=path.resolve(`test-results/astra-endurance-${label}`);mkdirSync(out,{recursive:true});
const report={executable,seconds,qaInvulnerability:true,normalSpeed:true,isolatedProfile:true,samples:[],errors:[],note:'Stability soak with ordinary keyboard firing; invulnerability solely keeps the QA pilot alive. Not marketing footage or proof of player enjoyment.'};
const flush=()=>writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));
const app=await electron.launch({executablePath:executable,args:['--nova-fresh-profile','--windowed','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-features=CalculateNativeWinOcclusion'],env:{...process.env,NOVA_SWARM_USER_DATA_DIR:`${out}/profile`,NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},timeout:120000});
const log=createWriteStream(`${out}/process.log`);app.process().stdout?.pipe(log,{end:false});app.process().stderr?.pipe(log,{end:false});
try{
 const page=await app.firstWindow();page.on('pageerror',e=>{report.errors.push(e.stack);flush();});page.on('crash',()=>{report.errors.push('Renderer crashed');flush();});
 await app.context().route('**/*',r=>/^(nova-swarm:|data:|blob:|https?:\/\/(127\.0\.0\.1|localhost)(:|\/))/.test(r.request().url())?r.continue():r.abort());
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.setContentSize(1280,720);w.webContents.setBackgroundThrottling(false);w.showInactive();});
 await page.evaluate(()=>window.__game.scenes.menu.quickStartRun());
 await page.waitForFunction(()=>window.__game.scenes.play?.player?.shipSprite?.texture,null,{timeout:120000});
 await page.evaluate(()=>{
  const g=window.__game,p=g.scenes.play,mode=g.runMode;
  // Retain Pure's mechanics. The generic unranked mode enables Tactical drafts;
  // retain only its debug policy (no submissions/rewards), then restore Pure.
  g.markUnrankedRun('astra_endurance');g.runMode=mode;
  p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;if(p.isPaused)p.setPaused(false);
  p.player.invulnerable=true;p.player.invulnerableTime=1e9;
  window.__endurance={frames:0,last:performance.now(),gaps:[]};
  function tick(now){const q=window.__endurance;q.frames++;q.gaps.push(now-q.last);q.last=now;if(q.gaps.length>7200)q.gaps.shift();requestAnimationFrame(tick);}requestAnimationFrame(tick);
 });
 const started=Date.now();let held=null,nextSample=0,lastFrames=-1;
 await page.keyboard.down('Space');
 while(Date.now()-started<seconds*1000){
  const state=await page.evaluate(()=>{const g=window.__game,p=g.scenes.play,b=p.enemyManager.boss;return {x:p.player.x,width:g.getWidth(),target:b?.active?b.x:null,dead:g.lives<=0,paused:p.isPaused,mode:g.runMode,submission:g.isScoreSubmissionAllowed()};});
  assert.equal(state.mode,'ranked');assert.equal(state.submission,false);
  assert.ok(!state.dead&&!state.paused,'Pure run must keep advancing');
  const elapsed=(Date.now()-started)/1000,target=state.target??(state.width*(.5+.31*Math.sin(elapsed*.28))),key=Math.abs(target-state.x)<24?null:target<state.x?'ArrowLeft':'ArrowRight';
  if(key!==held){if(held)await page.keyboard.up(held);if(key)await page.keyboard.down(key);held=key;}
  if(elapsed>=nextSample){
   const sample=await page.evaluate(()=>{const g=window.__game,p=g.scenes.play,q=window.__endurance,t=q.gaps.slice().sort((a,b)=>a-b);return {frames:q.frames,lastFrameAge:performance.now()-q.last,level:g.level,score:g.score,state:p.enemyManager.state,enemies:p.enemyManager.enemies.filter(e=>e.active).length,bullets:p.bulletManager.enemyBullets.length,heapMiB:performance.memory?.usedJSHeapSize/1048576,p95Ms:t[Math.floor(t.length*.95)],maxMs:t.at(-1)};});
   assert.ok(sample.frames>lastFrames&&sample.lastFrameAge<2000,'Renderer frame loop stalled');lastFrames=sample.frames;report.samples.push({elapsed,...sample});flush();console.log(JSON.stringify(report.samples.at(-1)));
   await page.screenshot({path:`${out}/${String(Math.round(elapsed)).padStart(4,'0')}.png`});nextSample+=60;
  }
  await page.waitForTimeout(250);
 }
 assert.deepEqual(report.errors,[]);report.status='passed';flush();
}catch(e){report.status='failed';report.failure=e.stack;flush();throw e;}finally{await app.close();log.end();}
