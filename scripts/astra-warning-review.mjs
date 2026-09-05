import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out=`test-results/astra-warning-${process.argv[2]||'review'}`;mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});
await context.route('**/*',r=>/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.request().url())||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
const page=await context.newPage(),report={errors:[],warnings:[],scenes:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))report.warnings.push(m.text());});
try {
 await page.goto('http://127.0.0.1:4399/?offlineLeaderboard=1&autostart=1&startAtBoss=1&startLevel=6&debugBossToken=NOVA_DEBUG_2026&nova-devtools-hash=f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c');
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.boss?.active,null,{timeout:120000});
 await page.waitForTimeout(2200);
 await page.evaluate(()=>{const g=window.__game,p=g.scenes.play,b=p.enemyManager.boss;g.markUnrankedRun('astra_warning_review');p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.player.invulnerable=true;p.player.invulnerableTime=1e9;p.setPaused(false);g.app.ticker.stop();p.clearToastState();b.entryStartMs=Date.now()-10000;b.x=p.gameplayGame.getWidth()*.5;b.y=p.gameplayGame.getHeight()*.22;b.sprite.position.set(b.x,b.y);p.player.x=b.x;p.player.y=p.gameplayGame.getHeight()*.88;p.player.sprite.position.set(p.player.x,p.player.y);window.astraReviewBoss=b;});
 for(const type of ['fan','wall','split','lance','ring','hazard-beam','hazard-wall','hazard-ring','elite-sniper']) {
  const state=await page.evaluate(async type=>{
   const g=window.__game,p=g.scenes.play,b=window.astraReviewBoss;
   b.cancelAttackWarning?.('review_next');b.telegraph=null;b.regularTelegraph=null;b.clearTelegraphVisual();b.clearRegularAttackTelegraphVisual();p.bossHazards=[];p.bossHazardLayer.clear();b.sprite.visible=true;
   if(window.astraReviewElite){window.astraReviewElite.sprite.visible=false;}
   if(type.startsWith('hazard-')){
    const kind=type.slice(7),h=p.registerBossHazardFromBoss(b,kind==='wall'?'regular':'signature',{type:kind==='beam'?'lance':kind,attack:kind,sourceX:b.x,sourceY:kind==='ring'?p.gameplayGame.getHeight()*.5:b.y+20,angle:Math.PI/2,playerX:p.player.x,playerY:p.player.y});
    h.elapsedMs=h.armingMs*.65;p.drawBossHazard(h,.3);window.astraReviewDraw=q=>{p.bossHazardLayer.clear();h.elapsedMs=h.armingMs*q;p.drawBossHazard(h,.3);};
   }else if(type==='elite-sniper'){
    const {ELITE_MIDDLE_SHIPS}=await import('/src/config/EliteMiddleShips.js');
    const profile=ELITE_MIDDLE_SHIPS.find(e=>e.specialAbility==='sniper_rail');
    const e=p.enemyManager.spawnEliteMiddleShip(profile.id,{entry:'single',ignoreLevelGate:true,ignoreCaps:true});window.astraReviewElite=e;b.sprite.visible=false;e.x=b.x;e.y=b.y;e.sprite.position.set(e.x,e.y);e.sprite.visible=true;e.drawEliteAbilityVfx(.65,false,p.player.x,p.player.y);
    window.astraReviewDraw=q=>e.drawEliteAbilityVfx(q,false,p.player.x,p.player.y);
   }else{
    const signature=['lance','ring'].includes(type),token=b.beginAttackWarning(signature?'signature':'regular',{type,attack:type,lockedAngle:Math.PI/2,durationMs:4000,movementLocked:true});
    if(signature)b.telegraph=token;else b.regularTelegraph=token;
    window.astraReviewDraw=q=>signature?b.updateTelegraphVisual(q,p.player.x,p.player.y):b.updateRegularAttackTelegraphVisual(q,p.player.x,p.player.y);
    window.astraReviewDraw(.65);
   }
   g.app.renderer.render(g.app.stage);
   return {type,safeLanes:JSON.parse(JSON.stringify(b.safeLanes)),radius:b.radius,visualRadius:b.getVisualRadius()};
  },type);
  await page.screenshot({path:`${out}/${type}.png`});report.scenes.push(state);
  // Actual renderer, normal wall-clock charge motion in an isolated staged scene.
  await page.evaluate(async()=>{const g=window.__game,t=performance.now();await new Promise(resolve=>{function frame(now){const q=Math.min(.99,(now-t)/2200);window.astraReviewDraw(q);g.app.renderer.render(g.app.stage);if(now-t<2000)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});});
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.warnings,[]);report.ok=true;
} finally {writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await context.close();await browser.close();}
