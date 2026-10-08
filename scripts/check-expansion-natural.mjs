import assert from 'node:assert/strict';import{mkdirSync,writeFileSync}from'node:fs';import path from'node:path';import{chromium}from'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'running',startedAt:new Date().toISOString()},null,2));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});const page=await context.newPage(),video=page.video(),errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));let direction=null,passed=false,capturedBreach=false;
page.on('console',message=>{if(message.type()==='error'&&/crash|fatal|game.?loop|TypeError/i.test(message.text()))errors.push(message.text());});
try{
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4896'}/?encounterEvolution=natural&autostart=1&offlineLeaderboard=1`);
 await page.waitForFunction(()=>window.__game?.scenes?.play?.introComplete,null,{timeout:90000});
 const setup=await page.evaluate(()=>{const g=window.__game,s=g.scenes.play;if(!g.runPolicy.prototype)throw Error('Unsafe natural route');
  g.runMode='ranked_tactical';s.player.invulnerable=true;s.player.invulnerableTime=999999;s.player.stats={...s.player.stats,damage:12};
  for(const id of ['drones','salvage_clock','phase_reactor','phase_wake','blink_drive'])s.player.applyRunAugment(id);
  s.player.bulletDamage=12;
  return{seed:g.contentDirector?.seed,hull:g.selectedShipSpriteKey,mode:g.runMode,damage:s.player.bulletDamage,viewport:{width:g.getWidth(),height:g.getHeight()}};
 });
 await page.keyboard.down('Space');
 for(let i=0;i<6000;i++){
  assert.deepEqual(errors,[],'caught game-loop crashes invalidate the capture');
  const state=await page.evaluate(()=>{const g=window.__game,s=g.scenes.play,m=s.enemyManager,w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight();
   const t=s.firstLightDirector.view?.targets?.find(t=>t.part!=='core')||m.enemies.filter(e=>e.active&&!e.untargetable&&e.x>20&&e.x<w-20&&e.y>20&&e.y<h*.8)
    .sort((a,b)=>Math.abs(a.x-s.player.x)-Math.abs(b.x-s.player.x))[0];const dx=(t?.x??w*.5)-s.player.x;
   return{direction:Math.abs(dx)<16?null:dx<0?'ArrowLeft':'ArrowRight',sector:g.level,at:g.runElapsedSeconds,score:g.score,state:m.state,
    environment:m.environment?.active?m.environment.id:null,breach:m.boss?.isDreadnought&&m.boss.active,breachAge:m.boss?.isDreadnought?m.boss.age:0,visitors:g.mysteriesSeen,
    events:g.encounterExpansionEvents,prototype:g.runPolicy.prototype,draft:s.tacticalDraft?.active,paused:s.isPaused};});
  if(state.paused){await page.keyboard.press('p');await page.waitForTimeout(300);}
  if(state.direction!==direction){if(direction)await page.keyboard.up(direction);if(state.direction)await page.keyboard.down(state.direction);direction=state.direction;}
  if(state.draft){
   await page.keyboard.up('Space');if(direction)await page.keyboard.up(direction);direction=null;
   await page.waitForTimeout(450);await page.keyboard.press('Enter');await page.waitForTimeout(450);
   await page.keyboard.down('Space');
  }
  if(i%50===0){assert(state.prototype);samples.push(state);console.log(JSON.stringify(state));}
  if(state.breach&&state.breachAge>=1.25&&!capturedBreach){await page.screenshot({path:path.join(out,'natural-breach.png')});capturedBreach=true;}
  if(state.events.some(e=>e.id==='breach')&&capturedBreach)break;
  await page.waitForTimeout(100);
 }
 if(direction)await page.keyboard.up(direction);await page.keyboard.up('Space');assert.deepEqual(errors,[]);
 assert(samples.some(s=>s.score>0));assert(samples.some(s=>s.breach),'natural Breach introduction must be reached');
 const outcome=await page.evaluate(()=>{const g=window.__game,m=g.scenes.play.enemyManager;return{sector:g.level,at:g.runElapsedSeconds,score:g.score,events:g.encounterExpansionEvents,state:m.state,bossActive:Boolean(m.boss?.active),prototype:g.runPolicy.prototype};});
 assert(outcome.events.some(e=>e.id==='breach'));assert(!outcome.bossActive);
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',conditions:'Real time keyboard/autofire steering, invulnerable test hull with stronger damage and five test augments; normal selection and sector transitions, no forced spawns/kills/sector skips; progression-free DEV policy. Demonstrates availability, not human pace or fun.',setup,samples,outcome,errors},null,2));passed=true;
}finally{await context.close();if(passed)await video.saveAs(path.join(out,'natural-expansion.webm'));await video.delete();await browser.close();}
