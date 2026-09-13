import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
import {SPACE_SNAKES} from '../src/config/SpaceSnakes.js';
const out='E:/Codex/builds/nova-swarm/snake-broods/native';fs.mkdirSync(out,{recursive:true});
const exe='E:/Codex/builds/nova-swarm/snake-broods/package/win-unpacked/Nova Swarm.exe';
const port=await new Promise(r=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const child=spawn(exe,['--windowed','--nova-fresh-profile',`--remote-debugging-port=${port}`],{windowsHide:true,env:{...process.env,NOVA_SWARM_DISABLE_STEAMWORKS:'1',NOVA_SWARM_USER_DATA_DIR:out+'/profile'},stdio:['ignore','pipe','pipe']});
let logs='',browser;const log=d=>{logs+=d;fs.writeFileSync(out+'/desktop.log',logs);};child.stdout.on('data',log);child.stderr.on('data',log);
try{
 let endpoint;for(let i=0;i<80;i++){try{endpoint=await(await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1000)})).json();break;}catch{}await new Promise(r=>setTimeout(r,500));}
 assert.ok(endpoint,'Native desktop debug endpoint');browser=await chromium.connectOverCDP(endpoint.webSocketDebuggerUrl);const page=browser.contexts()[0].pages()[0],errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1920,height:1080});
 const observeStartup=()=>{
  window.__bootFrames={gaps:[],missing:0,started:performance.now()};let previous=null;
  const sample=t=>{const q=window.__bootFrames,g=window.__game;if(document.body?.dataset.menuReady==='1'&&g?.currentSceneName==='menu'&&q.gaps.length<180){q.revealed??=performance.now();if(!g.scenes.menu.astraMenuShip?.ready)q.missing++;if(previous!==null)q.gaps.push(t-previous);previous=t;}requestAnimationFrame(sample);};requestAnimationFrame(sample);
 };
 await page.addInitScript(observeStartup);
 const alreadyVisible=await page.evaluate(()=>document.body?.dataset.menuReady==='1');
 if(alreadyVisible)await page.reload({waitUntil:'domcontentloaded',timeout:120000});
 else await page.evaluate(observeStartup);
 await page.waitForFunction(()=>window.__bootFrames.gaps.length>=180,null,{timeout:90000});
 const result=await page.evaluate(()=>{const gl=window.__app.renderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');return {startup:window.__bootFrames,renderer:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable',ship:window.__game.scenes.menu.astraMenuShip.solid.constructor.diagnostics};});
 assert.equal(result.startup.missing,0);await page.screenshot({path:out+'/menu.png'});
 await page.evaluate(()=>window.__game.startGame(undefined,{runMode:'unranked',countShipUsage:false}));
 await page.waitForFunction(()=>window.__game.scenes.play.player?.sprite&&window.__game.scenes.play.enemyManager?.waves?.length,null,{timeout:60000});
 const family=SPACE_SNAKES.find(f=>f.id==='space_snake_grave');
 await page.evaluate(async profile=>{
  const g=window.__game,p=g.scenes.play,m=p.enemyManager;g.app.ticker.stop();p.setPaused(false);p.introActive=false;p.introComplete=true;if(p.introOverlay)p.introOverlay.visible=false;
  p.isDebugInvincibleActive=()=>true;p.player.sprite.visible=true;p.player.shipSprite.visible=true;m.clearEnemies();p.clearEnemyBullets();m.state='BROOD_QA';g.level=m.level=30;
  const c=m.spawnSpaceSnake(profile,{force:true,count:20});window.__brood=c.brood;await c.brood.promise;
  for(let n=0;n<660;n++){m.updateEnemies(1);p.bulletManager.update(1);p.particleManager.update(1);}g.app.renderer.render({container:g.app.stage});
  window.__combatFrames=[];let old=null;const sample=t=>{if(old!==null)window.__combatFrames.push(t-old);old=t;if(window.__combatFrames.length<300)requestAnimationFrame(sample);};requestAnimationFrame(sample);g.app.ticker.start();
 },family);
 await page.bringToFront();await page.keyboard.down('Space');await page.waitForTimeout(5500);await page.keyboard.up('Space');
 result.combat=await page.evaluate(()=>({frames:window.__combatFrames,born:window.__brood.born,shots:window.__brood.shots,killed:window.__brood.kills,health:window.__brood.babies.filter(b=>b.active).map(b=>b.health),bodies:window.__brood.babies.filter(b=>b.active&&b.sprite.visible).length}));
 assert.equal(result.combat.born,20);assert.ok(result.combat.shots>0);await page.screenshot({path:out+'/brood-combat.png'});
 await page.evaluate(()=>window.__game.showMenu());await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:30000});
 result.cleanup=await page.evaluate(()=>({disposed:window.__brood.disposed,alive:window.__brood.babies.filter(b=>b.active).length,resident:window.__game.scenes.menu.astraMenuShip.solid.constructor.resident}));
 assert.equal(result.cleanup.disposed,true);assert.equal(result.cleanup.alive,0);assert.equal(result.cleanup.resident,1);assert.deepEqual(errors,[]);
 const stats=frames=>{const a=frames.slice().sort((a,b)=>a-b);return {frames:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)};};
 result.summary={startup:stats(result.startup.gaps),combat:stats(result.combat.frames)};result.errors=errors;result.reloadRequired=alreadyVisible;
 fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));console.log('PASS',JSON.stringify({renderer:result.renderer,...result.summary,cleanup:result.cleanup}));
}finally{await browser?.close().catch(()=>{});child.kill();}
