import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out='test-results/astra-presentation-runtime';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const errors=[],warnings=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.route('**/*',r=>/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.request().url())||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))warnings.push(m.text());});
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4399'}/?offlineLeaderboard=1`);
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuLights?.target,null,{timeout:120000});
 const before=await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.y);await page.waitForTimeout(1100);
 const after=await page.evaluate(()=>window.__game.scenes.menu.astraMenuShip.y);assert.notEqual(before,after,'Showroom must visibly animate');
 const lighting=await page.evaluate(async()=>{
  const {setReducedMotionEnabled}=await import('/src/config/AccessibilitySettings.js');
  const g=window.__game,m=g.scenes.menu;g.app.ticker.stop();
  const rng=Math.random;let calls=0;Math.random=()=>{calls++;throw new Error('Showroom consumed gameplay RNG');};
  try{m.astraMenuLights.update(m.astraMenuShip,m.astraMenuEmitters,4);m.astraMenuLights.update(m.astraMenuShip,m.astraMenuEmitters,8);}finally{Math.random=rng;}
  setReducedMotionEnabled(true);m.update(1);const reducedY=m.astraMenuShip.y;m.update(120);
  const reduced={stable:reducedY===m.astraMenuShip.y,rotation:m.astraMenuShip.rotation,materialTime:m.astraMenuLights.material.resources.showroomUniforms.uniforms.uTime};
  setReducedMotionEnabled(false);g.app.ticker.start();return {rngCalls:calls,reduced};
 });
 assert.equal(lighting.rngCalls,0);assert.equal(lighting.reduced.stable,true);assert.equal(lighting.reduced.rotation,0);assert.equal(lighting.reduced.materialTime,2);
 await page.evaluate(()=>window.__game.showShipSelect());
 await page.waitForFunction(()=>window.__game.scenes.shipSelect?.shipCards?.length===30&&window.__game.scenes.shipSelect?.showroomLights?.target,null,{timeout:120000});
 await page.screenshot({path:`${out}/hangar.png`});
 await page.evaluate(()=>window.__game.switchScene('menu'));
 await page.evaluate(()=>window.__game.startGame(window.__game.selectedShipSpriteKey));
 await page.waitForFunction(()=>window.__game.scenes.play?.player?.shipSprite?.texture?.source?.resource&&window.__game.scenes.play?.gameplayBackdrop&&window.__game.scenes.play?.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
 const worlds=await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play;p.setPaused(true);g.app.ticker.stop();
  const level=g.level,score=g.score,player={x:p.player.x,y:p.player.y};
  const initial=p.sectorWorldActiveSource;
  p.updateSectorWorld(6);await p.sectorWorldLoadQueue;const six=p.sectorWorldActiveSource,sixTexture=p.gameplayBackdrop.texture;
  p.updateSectorWorld(11);await p.sectorWorldLoadQueue;const eleven=p.sectorWorldActiveSource,retiredSix=sixTexture.destroyed;
  p.updateSectorWorld(16);p.updateSectorWorld(21);await p.sectorWorldLoadQueue;const latest=p.sectorWorldActiveSource,lastTexture=p.gameplayBackdrop.texture;
  p.resetGameplayBackdropState();await p.sectorWorldLoadQueue;const cleaned=lastTexture.destroyed;
  return {initial,six,eleven,latest,retiredSix,cleaned,simulationUnchanged:g.level===level&&g.score===score&&p.player.x===player.x&&p.player.y===player.y};
 });
 writeFileSync(`${out}/report.json`,JSON.stringify({lighting,worlds,errors,warnings},null,2));
 assert.ok(worlds.initial.endsWith('/01.webp'));assert.ok(worlds.six.endsWith('/02.webp'));assert.ok(worlds.eleven.endsWith('/03.webp'));assert.ok(worlds.latest.endsWith('/05.webp'));
 assert.ok(worlds.retiredSix&&worlds.cleaned&&worlds.simulationUnchanged);
 assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);
 writeFileSync(`${out}/report.json`,JSON.stringify({ok:true,lighting,worlds,errors,warnings},null,2));
 console.log('[astra-presentation-runtime] PASS animation, reduced motion, RNG isolation, 30 showroom hulls, bounded world swaps and unchanged simulation');
}finally{await browser.close();}
