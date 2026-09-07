import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out='test-results/flight-revision';mkdirSync(out,{recursive:true});
const source=execFileSync('git',['show','384cec2:src/scenes/PlayScene.js'],{encoding:'utf8',maxBuffer:4e6});
const start=source.indexOf('  updateBossPriorityEdge(delta = 1) {'),end=source.indexOf('\n  clearStragglerBeacon(',start);
const legacy='function '+source.slice(start,end).trim();
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 await page.goto((process.env.CHECK_URL||'http://127.0.0.1:4411')+'/?offlineLeaderboard=1');
 await page.waitForFunction(()=>document.body.dataset.menuReady==='1',null,{timeout:120000});
 await page.evaluate(()=>window.__game.scenes.menu.quickStartRun('ranked_tactical'));
 await page.waitForFunction(()=>window.__game?.scenes.play?.player?.active,null,{timeout:120000});
 await page.evaluate(async legacy=>{
  const g=window.__game,p=g.scenes.play;g.app.ticker.stop();p.clearPendingEnemyStart();p.enemyManager.forceClearAllEnemies();p.clearToastState();p.isPaused=false;
  const {Boss}=await import('/src/entities/Boss.js');const w=p.gameplayGame.getWidth(),h=p.gameplayGame.getHeight();
  const b=new Boss(w*.66,h*.28,3,p.gameplayGame);await b.createSprite();b.phase=2;b.x=w*.66;b.y=h*.28;b.sprite.position.set(b.x,b.y);b.updateBossAnimation(0,w*.55,h*.85);p.enemyManager.boss=b;p.enemyManager.enemies.push(b);p.gameContainer.addChild(b.sprite);
  const previous=new Function('const getAccessibilitySettings=()=>({prefersReducedMotion:false});return '+legacy)();previous.call(p,1);g.app.renderer.render(g.app.stage);
 },legacy);
 await page.screenshot({path:`${out}/boss-frame-before.png`});
 const result=await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;const original=Math.random;let draws=0;Math.random=()=>{draws++;return .5;};let state;try{state=p.updateBossPriorityEdge();}finally{Math.random=original;}g.app.renderer.render(g.app.stage);return {state,draws,layerVisible:p.bossPriorityEdgeLayer.visible,bossActive:p.enemyManager.boss.active,healthVisible:p.enemyManager.boss.healthBar.visible};});
 await page.screenshot({path:`${out}/boss-frame-after.png`});
 assert.equal(result.layerVisible,false);assert.equal(result.state.segmentCount,0);assert.equal(result.draws,0);assert.ok(result.bossActive&&result.healthVisible);
 writeFileSync(`${out}/frame-removal.json`,JSON.stringify({ok:true,...result},null,2));console.log('PASS rejected frame removed; boss, health bar and simulation unchanged');
} finally {await browser.close();}
