import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {_electron as electron} from 'playwright';
const exe=JSON.parse(readFileSync('test-results/astra-build-location.json')).executable;
const out=path.resolve('test-results/flight-native');mkdirSync(out,{recursive:true});
const results=[];
for(const previous of [false,true]){
 const profile=path.join(out,previous?'previous-profile':'current-profile');
 const app=await electron.launch({executablePath:exe,args:['--nova-fresh-profile','--windowed',...(previous?['--nova-flight-previous']:[])],env:{...process.env,NOVA_SWARM_USER_DATA_DIR:profile,NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},timeout:120000});
 try{
  const page=await app.firstWindow();
  await page.waitForFunction(()=>document.body.dataset.menuReady==='1'&&window.__game?.scenes.menu?.astraMenuShip?.ready,null,{timeout:120000});
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.setContentSize(1280,720);});
  const runtime=await app.evaluate(({app})=>({packaged:app.isPackaged,profile:app.getPath('userData')}));
  assert.ok(runtime.packaged);assert.equal(runtime.profile,profile);
  const url=await page.url();assert.ok(url.includes('offlineLeaderboard=1'));assert.equal(new URL(url).searchParams.get('flight')==='previous',previous);
  await page.evaluate(()=>window.__game.scenes.menu.quickStartRun('ranked_tactical'));
  await page.waitForFunction(()=>window.__game.scenes.play?.player?.active,null,{timeout:120000});
  await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.markUnrankedRun('flight_qa');p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);p.player.invulnerable=true;p.player.invulnerableTime=1e9;p.clearPendingEnemyStart();p.enemyManager.forceBossStart(3);});
  await page.waitForFunction(()=>window.__game.scenes.play.enemyManager.boss?.active,null,{timeout:45000});
  await page.waitForTimeout(7000);
  const state=await page.evaluate(()=>{const p=window.__game.scenes.play,b=p.enemyManager.boss;return {sha:JSON.parse(window.render_game_to_text()).gitSha,frame:p.updateBossPriorityEdge(),frameVisible:p.bossPriorityEdgeLayer.visible,flight:b.flightDebug||null,boss:b.profile.name,healthVisible:b.healthBar.visible};});
  assert.equal(state.sha,'2333f64');assert.equal(state.frameVisible,false);assert.equal(state.frame.segmentCount,0);assert.equal(!!state.flight,!previous);assert.ok(state.healthVisible);
  await page.screenshot({path:path.join(out,previous?'previous-flight.png':'current-flight.png')});results.push({previous,...runtime,...state});
 }finally{await app.close();}
}
writeFileSync(path.join(out,'report.json'),JSON.stringify({ok:true,results},null,2));console.log('PASS final package identity, isolated profiles, no boss frame, new patrol and previous-flight launch switch');
