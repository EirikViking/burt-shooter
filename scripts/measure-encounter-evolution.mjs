import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR; assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'),'isolated E output required');
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try {
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4895'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
  await page.waitForFunction(()=>window.__game?.scenes?.play?.firstLightDirector?.view,null,{timeout:90000});
  await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.state==='WAVE_ACTIVE'&&!window.__game.scenes.play.enemyManager.spawning,null,{timeout:60000});
  await page.evaluate(async({candidate,payback})=>{
    const g=window.__game,s=g.scenes.play;
    const {createRunPolicy}=await import('/src/game/RunPolicy.js');
    g.runPolicy=createRunPolicy({runMode:g.runMode,isDebugRun:true,prototype:true});g.isDebugRun=true;
    g.app.ticker.stop();s.isPaused=false;g.paused=false;s.introComplete=true;s.introActive=false;
    const m=s.enemyManager;m.forceClearAllEnemies();m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;
    m.clearPendingWaveSpawns();
    g.level=m.level=payback?2:6;m.waves=[{type:'grunt',count:3}];m.currentWaveIndex=0;m.spawning=payback;
    if(payback){
      const d=s.firstLightDirector;
      const {FirstLightModel}=await import('/src/game/ArcadeFirstLight.js');
      d.cancel('performance-fixture');d.model=new FirstLightModel('performance-wing');
      const run=(sector,n)=>{for(let i=0;i<n;i++)d.model.update(1/60,{sector,safe:true,combat:true});};
      if(candidate){run(1,320);d.model.hit('left',100,{});d.model.hit('right',100,{});run(1,670);}
      run(2,420);d.view.update(d.model,0,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player,{});
      window.__measurePayback=true;window.__measureChain=null;
      s.player.x=30;s.player.y=s.gameplayGame.getHeight()+150;s.player.invulnerable=true;s.player.invulnerableTime=999999;
      return;
    }
    const {SPACE_SNAKES}=await import('/src/config/SpaceSnakes.js');
    const chain=m.spawnSpaceSnake(SPACE_SNAKES[0],{force:false,molt:candidate});
    if(chain.brood)chain.brood.dispose();
    chain.age=4;chain.motionAge=4;for(const e of chain.sections){e.health=e.maxHealth*.55;e.update(1);}
    s.player.x=30;s.player.y=s.gameplayGame.getHeight()+150;
    s.player.invulnerable=true;s.player.invulnerableTime=999999;
    window.__measureChain=chain;
  },{candidate:process.env.MEASURE_MOLT==='1',payback:process.env.MEASURE_PAYBACK==='1'});
  const result=await page.evaluate(async()=>{
    const g=window.__game,s=g.scenes.play,chain=window.__measureChain;
    const {Bullet}=await import('/src/entities/Bullet.js');
    const samples=[],frameSamples=[];
    for(let i=0;i<900;i++){
      if(i%12===0)for(let j=0;j<3;j++)s.bulletManager.addPlayerBullet(new Bullet(100+j*500,650,0,-8,.01,0x66ccff,true));
      const t=performance.now();s.bulletManager.update(1);s.enemyManager.updateEnemies(1);
      if(window.__measurePayback)s.firstLightDirector.update(1);
      s.checkCollisions();
      if(i%2===0)g.app.render();samples.push(performance.now()-t);
      if(i%30===0)await new Promise(r=>requestAnimationFrame(r));
    }
    for(let i=0;i<180;i++){const t=performance.now();await new Promise(r=>requestAnimationFrame(r));frameSamples.push(performance.now()-t);}
    const summary=a=>{a.sort((a,b)=>a-b);return {n:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)};};
    return {cpu:summary(samples.slice(120)),raf:summary(frameSamples),sections:chain?.sections.filter(e=>e.active).length??0,
      payback:s.firstLightDirector.model.payback?.status??null,score:g.score};
  });
  if(process.env.MEASURE_PAYBACK!=='1')assert(result.sections>0,'performance fixture must retain its snake');
  if(process.env.MEASURE_PAYBACK==='1'&&process.env.MEASURE_MOLT==='1')assert.equal(result.payback,'spent');
  assert.equal(errors.length,0,errors.join('\n'));
  writeFileSync(path.join(out,'performance.json'),JSON.stringify({status:'passed',conditions:`1280x720 Chrome headless; ${process.env.MEASURE_PAYBACK==='1'?'same Rival hull with/without earned Payback':'Cinder with/without Molt'}, three shot lanes, 900 fixed steps and 180 RAF intervals; isolated synthetic profile`,...result,errors},null,2));
  console.log(JSON.stringify(result));
} finally {await browser.close();}
