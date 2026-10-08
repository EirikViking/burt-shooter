import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});
const page=await context.newPage(),errors=[],samples=[],video=page.video();let verified=false;
page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4895'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
  await page.waitForFunction(()=>window.__game?.scenes?.play?.firstLightDirector?.view,null,{timeout:90000});
  await page.evaluate(()=>{const s=window.__game.scenes.play;s.player.invulnerable=true;s.player.invulnerableTime=999999;});
  await page.keyboard.down('Space');
  let direction=null;
  for(let tick=0;tick<1800;tick++){
    await page.keyboard.down('Space');
    const desired=await page.evaluate(()=>{
      const s=window.__game.scenes.play,d=s.firstLightDirector;
      const w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight();
      const t=d.view.targets.find(t=>t.part!=='core')||(s.enemyManager.enemies||[])
        .filter(e=>e.active&&e.y>20&&e.y<h*.85&&e.x>30&&e.x<w-30)
        .sort((a,b)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0]
        ||(s.enemyManager.boss?.active?s.enemyManager.boss:null);
      const dx=(t?.x??s.gameplayGame.getWidth()/2)-s.player.x;
      return Math.abs(dx)<18?null:dx<0?'ArrowLeft':'ArrowRight';
    });
    if(desired!==direction){if(direction)await page.keyboard.up(direction);if(desired)await page.keyboard.down(desired);direction=desired;}
    await page.waitForTimeout(100);
    if(tick%50!==49)continue;const i=Math.floor(tick/50);
    const row=await page.evaluate(()=>{const g=window.__game,s=g.scenes.play;return {sector:g.level,elapsed:g.runElapsedSeconds,
      score:g.score,state:s.enemyManager.state,prototype:g.runPolicy.prototype,encounter:s.firstLightDirector.snapshot(),
      input:{autofire:s.inputManager?.isFiring?.()},events:g.encounterEvolutionLog};});
    assert(row.prototype);samples.push(row);console.log(JSON.stringify({sample:i,sector:row.sector,elapsed:row.elapsed,kind:row.encounter.encounter?.kind,rescued:row.encounter.rescued}));
    if(i===3)await page.screenshot({path:path.join(out,'natural-opening.png')});
    if(row.encounter.payback?.status==='spent'){await page.screenshot({path:path.join(out,'natural-return-complete.png')});break;}
  }
  if(direction)await page.keyboard.up(direction);await page.keyboard.up('Space');
  assert.equal(errors.length,0,errors.join('\n'));
  assert(samples.some(r=>r.encounter.encounter?.kind==='convoy'),'natural convoy window must be reached');
  assert(samples.some(r=>r.score>0),'real held fire and steering must produce combat');
  const events=samples.at(-1).events;
  assert.equal(events.filter(e=>e.event==='active').length,1,'one natural earned callback');
  assert(events.some(e=>e.event==='spent'),'callback must finish in the natural run');
  writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',conditions:'Up to 1800 real-time 100ms input steps, ends after callback; held fire with normal key repeat and keyboard target steering; invulnerable test player, no forced encounters or sector skips; isolated prototype policy; not human balance QA',samples,errors},null,2));
  verified=true;
}finally{
  await context.close();
  if(verified)await video.saveAs(path.join(out,'natural-run.webm'));
  await video.delete();await browser.close();
}
