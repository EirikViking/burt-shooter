import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const exe=process.env.NOVA_SWARM_PACKAGED_EXE;
assert.ok(exe,'Set NOVA_SWARM_PACKAGED_EXE to the verified package');
const out=process.env.CHECK_OUTPUT_DIR||'E:/Codex/builds/nova-swarm/mystery-v2/native-fixtures';fs.mkdirSync(out,{recursive:true});
const child=spawn(exe,['--windowed','--remote-debugging-port=5241','--nova-mystery-test=all'],{windowsHide:true,env:{...process.env,NOVA_SWARM_DISABLE_STEAMWORKS:'1'},stdio:'ignore'});
let browser;const rows=[],errors=[];
try{
 for(let i=0;i<120;i++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:5241');break;}catch{}await new Promise(r=>setTimeout(r,500));}
 assert.ok(browser,'Native debug endpoint');const page=browser.contexts()[0].pages()[0];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1920,height:1080});await page.bringToFront();
 await launchEncounterTestFromHangar(page);
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.waves?.length===57,null,{timeout:120000});
 const environment=await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play,gl=g.app.renderer.gl,ext=gl?.getExtension('WEBGL_debug_renderer_info');
  p.setPaused(false);p.isDebugInvincibleActive=()=>true;p.inputManager.isFiring=()=>false;
  window.__voiceObservation=[];const media=new Set(),play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(...args){
   const url=this.currentSrc||this.src;
   if(/\/voice\//.test(url)){
    const others=[...media].filter(e=>e!==this&&!e.paused&&!e.ended).map(e=>e.currentSrc||e.src);
    const observation={url,others,volume:this.volume,muted:this.muted,at:performance.now(),played:false};window.__voiceObservation.push(observation);media.add(this);
    this.addEventListener('playing',()=>{observation.played=true;},{once:true});
    this.addEventListener('ended',()=>{observation.ended=performance.now();},{once:true});
   }
   return play.apply(this,args);
  };
  return {gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,width:g.getWidth(),height:g.getHeight(),
   runtime:await window.__novaSteamBridge.getRuntimeInfo(),profile:await window.__novaSteamCloud.getProfileContext(),mode:g.runMode};
 });
 assert.equal(environment.runtime.appIsPackaged,true);assert.equal(environment.runtime.steamIntegrationIsolated,true);assert.equal(environment.mode,'unranked');
 for(const id of ['glass_widow','rail_cathedral','choir_unbound']){
  await page.evaluate(id=>{
   const g=window.__game,p=g.scenes.play,m=p.enemyManager;m.clearEnemies();p.clearEnemyBullets();p.clearBossHazards();
   p.setPaused(false);m.boss=null;m.currentWaveIndex=1;m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;
   const d=m.mysteryDirector;d.plan={selected:true,sector:m.level,id,ids:[id],completed:[],direct:true,delaySeconds:.1,leadInRequired:true};
   const wave={...m.waves[1],mysteryId:id};m.spawnWave(wave);
  },id);
  await page.waitForFunction(id=>window.__game.scenes.play.enemyManager.mysteryDirector.active?.type===id,id,{timeout:60000});
  const arrival=await page.evaluate(()=>({voice:window.__voiceObservation.filter(v=>v.url.includes('/mysteries-v2/')).at(-1),at:performance.now(),age:window.__game.scenes.play.enemyManager.mysteryDirector.active.age}));
  assert.ok(arrival.voice?.played&&arrival.voice.ended<=arrival.at,'Female line actually plays and ends before arrival');
  await page.waitForTimeout(2500);
  const metric=await page.evaluate(()=>new Promise(resolve=>{
   const g=window.__game,p=g.scenes.play,a=p.enemyManager.mysteryDirector.active,frames=[],start=performance.now();let last=start;
   const tick=t=>{frames.push(t-last);last=t;if(t-start<10000){requestAnimationFrame(tick);return;}
    const sorted=frames.slice(1).sort((a,b)=>a-b);resolve({id:a.type,attacks:a.stats.attacks,age:a.age,frames:sorted.length,meanMs:sorted.reduce((a,b)=>a+b,0)/sorted.length,p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:Math.max(...sorted),above33Ms:sorted.filter(n=>n>33.34).length,
     ordinary:p.enemyManager.enemies.filter(e=>e.active&&e.kind!=='mystery'&&e.kind!=='mystery_part').length,bullets:p.bulletManager.enemyBullets.filter(b=>b.active).length,audio:a.audio.diagnostics()});
   };requestAnimationFrame(tick);
  }));
  await page.screenshot({path:`${out}/${id}.png`});
  assert.ok(metric.attacks>0);rows.push({...metric,arrival});
  fs.writeFileSync(out+'/results.json',JSON.stringify({environment,mode:'Native 1080p performance fixtures: QA invulnerability, no outgoing fire, ordinary companion waves. Ten-second RAF samples after 2.5 seconds warmup; no build or parallel capture.',rows,errors},null,2));
  console.log(JSON.stringify(metric));
 }
 const voices=await page.evaluate(()=>window.__voiceObservation);
 fs.writeFileSync(out+'/voice-observation.json',JSON.stringify(voices,null,2));
 const arrivals=voices.filter(v=>v.url.includes('/mysteries-v2/'));assert.equal(arrivals.length,3);
 assert.ok(arrivals.every(v=>v.others.length===0),'Mystery announcements must wait for other speech');
 assert.ok(voices.every(v=>!v.others.some(url=>url.includes('/mysteries-v2/'))),'Other voice must not overlap Mystery speech');
 assert.deepEqual(errors,[]);
}finally{await browser?.close();child.kill();}
