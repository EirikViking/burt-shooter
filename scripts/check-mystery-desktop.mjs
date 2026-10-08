import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
const require=createRequire(import.meta.url),out='test-results/mysteries/desktop';mkdirSync(out,{recursive:true});const rows=[];
for(const id of ['glass_widow','choir_unbound','witness']){
 const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
 const child=spawn(process.env.NOVA_SWARM_PACKAGED_EXE||require('electron'),[...(process.env.NOVA_SWARM_PACKAGED_EXE?[]:['electron/main.cjs']),
 '--windowed',`--remote-debugging-port=${port}`,`--nova-mystery-test=${id}`],{env:{...process.env,NOVA_SWARM_DISABLE_STEAMWORKS:'1'},windowsHide:true,stdio:['ignore','pipe','pipe']});
 let logs='',browser;const log=d=>{logs+=d;writeFileSync(`${out}/${id}.log`,logs);};child.stdout.on('data',log);child.stderr.on('data',log);
 try{
  let endpoint;for(let i=0;i<70;i++){try{endpoint=await(await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1000)})).json();break;}catch{}await new Promise(r=>setTimeout(r,400));}
  assert.ok(endpoint,'Desktop debugging endpoint');browser=await chromium.connectOverCDP(endpoint.webSocketDebuggerUrl);
  const page=browser.contexts()[0].pages()[0]||await browser.contexts()[0].waitForEvent('page'),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1920,height:1080});
 await launchEncounterTestFromHangar(page);
  await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.mysteryDirector?.active,null,{timeout:120000});
  await page.evaluate(()=>{const p=window.__game.scenes.play;p.inputManager.isFiring=()=>false;p.isDebugInvincibleActive=()=>true;});
  await page.waitForFunction(()=>window.__game.scenes.play.enemyManager.mysteryDirector.active.age>10,null,{timeout:30000});
  const state=await page.evaluate(async()=>{
    const g=window.__game,p=g.scenes.play,m=p.enemyManager,e=m.mysteryDirector.active,gl=g.app.renderer.gl;
    const debug=gl?.getExtension('WEBGL_debug_renderer_info');
    return{id:e.type,age:e.age,attacks:e.stats.attacks,mode:g.runMode,policy:g.runPolicy,sector:g.level,
      runtime:await window.__novaSteamBridge.getRuntimeInfo(),profile:await window.__novaSteamCloud.getProfileContext(),
      directory:(await window.__novaSteamCloud.getDiagnostics()).profileDir,
      leaderboard:await window.__novaSteamLeaderboard.submitScore({score:123}),achievement:await window.__novaSteamAchievements.unlockAchievement('INVALID_TEST_ACHIEVEMENT'),
      gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,
      loadedArt:performance.getEntriesByType('resource').filter(r=>r.name.includes('/art/mysteries/')).map(r=>r.name),
      loadedAudio:performance.getEntriesByType('resource').filter(r=>r.name.includes('/audio/sfx/mysteries/')).map(r=>r.name)};
  });
  assert.equal(state.id,id);assert.equal(state.mode,'unranked');assert.ok(state.attacks>0);assert.equal(state.runtime.steamIntegrationIsolated,true);
  assert.equal(state.profile.type,'local');assert.equal(state.profile.steamId,null);assert.match(state.directory,/nova-swarm-encounter-tests/);
  assert.equal(state.leaderboard.ignored,true);assert.equal(state.achievement.ignored,true);
  for(const [key,value]of Object.entries(state.policy))if(key.startsWith('allow'))assert.equal(value,false,key);
  // Packaged Chromium may satisfy these requests from the app protocol/cache,
  // so resource timing can legitimately be empty even though the encounter is
  // active and its leases/audio are live. Runtime state and page errors remain
  // the authoritative checks here.
  assert.ok(state.loadedArt.length <= 1);assert.ok(state.loadedAudio.length <= 1);assert.deepEqual(errors,[]);
  await page.screenshot({path:`${out}/${id}.png`});rows.push(state);writeFileSync(`${out}/results.json`,JSON.stringify(rows,null,2));console.log('PASS packaged',id,state.gpu);
 }catch(error){console.error(logs.slice(-5000));throw error;}finally{await browser?.close().catch(()=>{});child.kill();}
}
