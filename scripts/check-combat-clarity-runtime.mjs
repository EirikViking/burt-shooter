import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.addInitScript(()=>localStorage.setItem('burt_first_run_completed','true'));
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await page.goto(`${process.env.CHECK_URL}/?encounterEvolution=orbit-breaker&autostart=1&offlineLeaderboard=1`);
 try{await page.waitForFunction(()=>window.__game?.scenes.play?.encounterExpansionTestReady,null,{timeout:90000});}
 catch(error){const state=await page.evaluate(()=>({scene:window.__game?.currentSceneName,ready:window.__game?.scenes.play?.isReady,intro:window.__game?.scenes.play?.introComplete,test:window.__game?.encounterEvolutionTest,body:document.body.innerText.slice(0,600)}));writeFileSync(`${out}/startup-failure.json`,JSON.stringify({state,errors},null,2));await page.screenshot({path:`${out}/startup-failure.png`});throw error;}
 const hud=await page.evaluate(()=>{
  const g=window.__game,s=g.scenes.play,h=s.hud;g.app.ticker.stop();s.enemyManager.clearEnemies();s.bulletManager.clearAll('clarity-test');h.update();
  const groups=[h.livesGroup,h.activePowerupGroup,h.traitGroup].filter(x=>x?.visible),before=groups.map(x=>x.alpha);
  s.gameContainer.updateLocalTransform();const t=s.gameContainer.worldTransform;
  s.bulletManager.enemyBullets=groups.map(x=>{const b=x.getBounds(),point=t.applyInverse({x:b.x+b.width/2,y:b.y+b.height/2});return{active:true,x:point.x,y:point.y,radius:5};});
  h.update();const overlaps=groups.map((x,i)=>({name:x===h.livesGroup?'lives':x===h.activePowerupGroup?'powerup':'trait',ratio:x.alpha/before[i]}));
  const frame=h.missionFrameGeometry.debug.surfaceAlpha;
  s.isPaused=true;h.update();const restored=groups.every((x,i)=>Math.abs(x.alpha-before[i])<1e-6);s.isPaused=false;s.bulletManager.enemyBullets=[];h.update();g.app.render();
  return{prototype:g.runPolicy.prototype,overlaps,frame,restored};
 });
 writeFileSync(`${out}/hud-result.json`,JSON.stringify(hud,null,2));await page.screenshot({path:`${out}/hud.png`});
 assert(hud.prototype);assert(hud.overlaps.some(x=>x.name==='lives'));assert(hud.overlaps.some(x=>x.name==='powerup'));
 assert(hud.overlaps.every(x=>x.ratio>=.6),'Life/powerup/trait status becomes unreadable beneath passing threats');
 assert(hud.frame>=.48,'Persistent mission surface loses contrast over bright scenery');assert(hud.restored);
 await page.goto(`${process.env.CHECK_URL}/?encounterEvolution=molt&autostart=1&offlineLeaderboard=1`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.localTestChain?.molt,null,{timeout:90000});
 const plate=await page.evaluate(()=>{
  const g=window.__game,s=g.scenes.play,c=s.firstLightDirector.localTestChain;g.app.ticker.stop();
  c.age=4;for(const e of c.sections)e.health=e.maxHealth*.5;c.molt.update(1);for(let i=0;i<45;i++)c.molt.update(1);
  const m=c.molt,p=m.model.plates[0],v=m.views[0];if(!p?.active)throw Error('Expected existing exposed plate');
  const health=p.health,score=g.score;m.model.hitPlate(p,health*.7,{});m.update(1);
  const wear=v.root.__coverWear,damageReadable=wear>=.65&&wear<=.75;
  p.age=5.95;m.update(1);const lastVisibleAlpha=v.root.alpha,active=p.active;
  const healthUnchanged=Math.abs(p.health-health*.3)<1e-6,scoreUnchanged=g.score===score;
  g.app.render();return{damageReadable,wear,lastVisibleAlpha,active,healthUnchanged,scoreUnchanged};
 });
 await page.screenshot({path:`${out}/worn-cover.png`});
 const lifecycle=await page.evaluate(async()=>{const m=window.__game.scenes.play.firstLightDirector.localTestChain.molt;
  const {setReducedMotionEnabled,setFlashIntensityScale}=await import('/src/config/AccessibilitySettings.js');
  setReducedMotionEnabled(true);setFlashIntensityScale(0);m.update(1);
  const accessible=m.views[0].root.visible&&m.views[0].root.alpha>=.65&&m.views[0].root.rotation===0;
  for(let i=0;i<5;i++)m.update(1);const expired=!m.model.plates[0].active&&!m.views[0].root.visible;
  setReducedMotionEnabled(false);setFlashIntensityScale(1);return{accessible,expired};});Object.assign(plate,lifecycle);
 writeFileSync(`${out}/plate-result.json`,JSON.stringify(plate,null,2));assert(plate.damageReadable);assert(plate.active&&plate.lastVisibleAlpha>=.65);assert(plate.healthUnchanged&&plate.scoreUnchanged&&plate.expired);assert.deepEqual(errors,[]);
 await page.evaluate(()=>{const g=window.__game;g.score=18160;g.level=4;g.runMode='scout';g.runElapsedSeconds=279;g.gameOver();});
 await page.waitForFunction(()=>window.__game?.currentSceneName==='gameOver',null,{timeout:30000});
 const results=[];
 for(const size of [{width:1280,height:720},{width:1366,height:768},{width:1920,height:1080}]){
  await page.setViewportSize(size);await page.waitForTimeout(150);
  for(const stage of ['result_hold','runback']){
   const result=await page.evaluate(stage=>{const g=window.__game,s=g.scenes.gameOver;s.state=stage;s.layoutScreen();g.app.render();
    return{stage,screen:{width:g.app.screen.width,height:g.app.screen.height},buttons:['retryButton','runReportButton','leaderboardButton','hangarButton','mainMenuButton'].flatMap(name=>{const n=s[name];if(!n?.visible)return[];const b=n.getBounds();return[{name,x:b.x,y:b.y,width:b.width,height:b.height}];})};},stage);
   await page.screenshot({path:`${out}/result-${size.width}-${stage}.png`});results.push(result);
  }
 }
 writeFileSync(`${out}/result-bounds.json`,JSON.stringify(results,null,2));
 for(const r of results)for(const b of r.buttons)assert(b.x>=0&&b.y>=0&&b.x+b.width<=r.screen.width+1&&b.y+b.height<=r.screen.height-8,`Clipped ${r.stage} ${b.name} at ${r.screen.width}x${r.screen.height}`);
 assert.deepEqual(errors,[]);writeFileSync(`${out}/report.json`,JSON.stringify({status:'passed',hud,plate,results,errors},null,2));console.log('[combat-clarity] PASS critical HUD, plate wear/expiry/accessibility/no reward, compact result navigation');
}finally{await browser.close();}
