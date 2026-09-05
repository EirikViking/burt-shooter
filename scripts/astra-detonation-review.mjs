import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out=`test-results/astra-detonation-${process.argv[2]||'review'}`;mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});
await context.route('**/*',r=>/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(r.request().url())||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
const page=await context.newPage(),errors=[],warnings=[],shots=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))warnings.push(m.text());});
try{
 await page.goto('http://127.0.0.1:4399/?offlineLeaderboard=1&autostart=1&startAtBoss=1&startLevel=1&debugBossToken=NOVA_DEBUG_2026&nova-devtools-hash=f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c');
 await page.waitForFunction(()=>window.__game?.scenes?.play?.player?.shipSprite?.texture?.source?.resource,null,{timeout:120000});
 await page.evaluate(async()=>{await (await import('/src/effects/AstraDetonation.js')).loadDetonationFrames();const g=window.__game,p=g.scenes.play;g.markUnrankedRun('astra_explosion_review');p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);p.player.invulnerable=true;p.player.invulnerableTime=1e9;});
 await page.waitForFunction(()=>window.__game.scenes.play.enemyManager.boss?.active,null,{timeout:45000});await page.waitForTimeout(2300);
 await page.screenshot({path:`${out}/00-boss.png`});
 const killed=await page.evaluate(()=>{const b=window.__game.scenes.play.enemyManager.boss;b.invulnerableUntilMs=0;b.firstDamageAtMs=Date.now()-120000;b.finishGateUntilMs=0;return b.takeDamage(b.maxHealth+9999);});assert.equal(killed,true,'Staged boss must actually die');
 let last=0;
 for(const ms of [100,250,450,700,1050,1500,2100]){await page.waitForTimeout(ms-last);last=ms;await page.screenshot({path:`${out}/boss-${ms}.png`});shots.push(await page.evaluate(()=>({active:window.__game.scenes.play.particleManager.detonations.active.length,fragments:window.__game.scenes.play.particleManager.hullBreakup.active.length})));}
 await page.waitForTimeout(2000);
 await page.goto('http://127.0.0.1:4399/?offlineLeaderboard=1&autostart=1');
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.enemies?.some(e=>e.active&&e.y>80),null,{timeout:120000});
 await page.evaluate(()=>{const p=window.__game.scenes.play;p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.player.invulnerable=true;p.player.invulnerableTime=1e9;const e=p.enemyManager.enemies.find(e=>e.active&&e.y>80);e.x=500;e.y=300;p.applyCombatDamage(e,e.maxHealth+999,'other');p.onEnemyKilled(e);p.playEnemyDeathFeedback(e,{intensity:.8});});
 await page.waitForTimeout(180);await page.screenshot({path:`${out}/ordinary-180.png`});await page.waitForTimeout(1200);
 await page.evaluate(()=>{const g=window.__game,s=g.scenes.play,p=s.player;p.invulnerable=false;p.invulnerableTime=0;p.shieldActive=false;if(p.takeDamage()){g.loseLife({source:'astra_staged_hit'});s.triggerPlayerDeathFeedback();}});
 await page.waitForTimeout(160);await page.screenshot({path:`${out}/player-160.png`});await page.waitForTimeout(1600);
 assert.ok(shots.some(s=>s.active>0),'Actual death must spawn combustion');assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);
 writeFileSync(`${out}/report.json`,JSON.stringify({ok:true,shots,errors,warnings,description:'Actual browser game, normal wall-clock playback; boss killed through damage API in an isolated staged practice encounter.'},null,2));
}finally{await context.close();await browser.close();}
