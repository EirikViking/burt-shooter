import {chromium,_electron as electron} from 'playwright';
import {mkdirSync,writeFileSync,readFileSync,createWriteStream,appendFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const label=process.argv[2]||'trial',seconds=Number(process.argv[3]||60),url=process.argv[4]||'http://127.0.0.1:4399/?offlineLeaderboard=1';
const out=`test-results/astra-media-${label}`;mkdirSync(out,{recursive:true});
const packaged=url==='packaged';
const overrun=process.env.ASTRA_CAPTURE_MODE==='overrun';
const report={url,seconds,resolution:[1920,1080],normalRules:true,invulnerabilityCheats:false,syntheticDamage:false,pilot:'Automated keyboard pilot with 180 ms decisions; not a human player',errors:[],inputs:[],samples:[]};
const executable=packaged?JSON.parse(readFileSync('test-results/astra-build-location.json')).executable:null;
const browser=packaged?await electron.launch({executablePath:executable,args:['--nova-fresh-profile','--windowed','--autoplay-policy=no-user-gesture-required','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-features=CalculateNativeWinOcclusion'],env:{...process.env,NOVA_SWARM_USER_DATA_DIR:path.resolve(out,'profile'),NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},timeout:120000}):await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
const processLog=packaged?createWriteStream(`${out}/process.log`):null;
if(packaged){browser.process().stdout?.pipe(processLog,{end:false});browser.process().stderr?.pipe(processLog,{end:false});report.executable=executable;}
const page=packaged?await browser.firstWindow():await browser.newPage({viewport:{width:1920,height:1080}});
await page.route('**/*',r=>/^(nova-swarm:|data:|blob:|https?:\/\/(127\.0\.0\.1|localhost)(:|\/))/.test(r.request().url())?r.continue():r.abort());
page.on('pageerror',e=>report.errors.push(e.stack));
await page.addInitScript(()=>{
 localStorage.setItem('burt_music_enabled','true');localStorage.setItem('burt_voice_enabled','true');
 // Test-only recording taps. Existing audio still reaches the same speakers;
 // a separate stream combines WebAudio effects and HTML music/voice elements.
 const Native=window.AudioContext,connect=AudioNode.prototype.connect,play=HTMLMediaElement.prototype.play;
 const mix=new Native(),output=mix.createMediaStreamDestination(),targets=new WeakMap(),elements=new WeakMap();
 function tap(context){let dest=targets.get(context);if(!dest){dest=context.createMediaStreamDestination();targets.set(context,dest);const source=mix.createMediaStreamSource(dest.stream);connect.call(source,output);}return dest;}
 AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(this.context!==mix&&destination===this.context.destination)connect.call(this,tap(this.context));return result;};
 HTMLMediaElement.prototype.play=function(...args){
  if(!elements.has(this)){try{const source=mix.createMediaElementSource(this);connect.call(source,mix.destination);connect.call(source,output);elements.set(this,source);}catch{}}
  mix.resume();return play.apply(this,args);
 };
 window.__captureAudio={mix,output};
});
try{
 if(packaged){await page.reload();await browser.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.setContentSize(1920,1080);w.webContents.setBackgroundThrottling(false);w.showInactive();});}else await page.goto(url);
 await page.waitForFunction(()=>window.__game?.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});
 assert.deepEqual(await page.evaluate(()=>[innerWidth,innerHeight]),[1920,1080]);
 if(overrun){
  // Isolated capture career unlocks the shipped advanced start. Combat rules,
  // life stock and the standard Overrun loadout are never modified.
  await page.evaluate(()=>{const key='nova.hangarProgress.v1',p=JSON.parse(localStorage.getItem(key)||'{}');localStorage.setItem(key,JSON.stringify({...p,bestSector:Math.max(30,p.bestSector||0),bestLevel:Math.max(30,p.bestLevel||0),overrunUnlockCelebrationPending:false,overrunUnlockCelebrationSeen:true}));});
  await page.reload();await page.waitForFunction(()=>window.__game?.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});
  assert.equal(await page.evaluate(()=>window.__game.scenes.menu.startOverrunRun()),true);
  report.captureProfile='Fresh offline career with Sector 30 unlock; normal Overrun Tactical Sector 51 start';
 }else{
  const launch=await page.evaluate(()=>{const b=window.__game.scenes.menu.runModeLaunchButton.getBounds();return{x:b.x+b.width/2,y:b.y+b.height/2};});
  await page.mouse.click(launch.x,launch.y);
 }
 await page.waitForFunction(()=>window.__game.scenes.play?.player?.shipSprite?.texture,null,{timeout:120000});
 await page.evaluate(()=>{const p=window.__game.scenes.play;p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;if(p.isPaused)p.setPaused(false);});
 await page.waitForTimeout(1500);
 await page.evaluate(async()=>{
  const {mix,output}=window.__captureAudio;await mix.resume();
  const video=document.querySelector('canvas').captureStream(30),stream=new MediaStream([...video.getVideoTracks(),...output.stream.getAudioTracks()]);
  const mime='video/webm;codecs=vp8,opus';if(!MediaRecorder.isTypeSupported(mime))throw Error('Required recording codec unavailable');
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:12000000,audioBitsPerSecond:192000});
  window.__capture={recorder,chunks:[],started:performance.now(),stream};recorder.ondataavailable=e=>{if(e.data.size)window.__capture.chunks.push(e.data);};recorder.start(1000);
 });
 const started=Date.now(),held=new Set();let nextShot=0,lastDraftAt=0,lastPhase=-5;
 async function keys(next){for(const key of held)if(!next.has(key)){await page.keyboard.up(key);held.delete(key);}for(const key of next)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}}
 while(Date.now()-started<seconds*1000){
  const elapsed=(Date.now()-started)/1000;
  const s=await page.evaluate(()=>{
   const g=window.__game,p=g.scenes.play,u=p.player,b=p.enemyManager.boss;
   const targets=p.enemyManager.enemies.filter(e=>e.active&&e.y>20&&e.y<g.getHeight()*.72).sort((a,b)=>Math.abs(a.x-u.x)-Math.abs(b.x-u.x));
   const warning=b?.telegraph||b?.regularTelegraph;
   return {scene:g.currentSceneName,level:g.level,score:g.score,lives:g.lives,x:u.x,y:u.y,speed:u.speed,radius:u.radius||11,cooldown:u.dodgeCooldown,dodging:u.isDodging,warningMs:warning?warning.durationMs-warning.visibleElapsedMs:null,draft:p.tacticalDraft?.active,width:g.getWidth(),height:g.getHeight(),target:b?.active?b.x:targets[0]?.x,bullets:p.bulletManager.enemyBullets.filter(b=>b.active!==false).map(b=>({x:b.x,y:b.y,vx:b.vx,vy:b.vy,r:b.radius||4}))};
  });
  if(s.scene!=='play'||s.lives<=0)break;
  if(s.draft){await keys(new Set());if(Date.now()-lastDraftAt>2000){await page.keyboard.press('Enter');lastDraftAt=Date.now();}await page.waitForTimeout(250);continue;}
  const goalX=s.target??s.width*(.5+.3*Math.sin(elapsed*.2)),goalY=s.height*(.74+Math.sin(elapsed*.17)*.07),candidates=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const len=Math.hypot(dx,dy)||1,vx=dx/len*s.speed*60,vy=dy/len*s.speed*60;
   let risk=0,clearance=Infinity;
   for(const t of [.12,.28,.46]){
    const x=s.x+vx*t,y=s.y+vy*t;
    if(x<35||x>s.width-35||y<s.height*.43||y>s.height-35)risk+=10000;
    for(const b of s.bullets){const d=Math.hypot(b.x+b.vx*60*t-x,b.y+b.vy*60*t-y)-s.radius-b.r;clearance=Math.min(clearance,d);risk+=Math.max(0,65-d)**2*.06;}
   }
   const endX=s.x+vx*.46,endY=s.y+vy*.46;
   candidates.push({dx,dy,clearance,cost:risk+Math.abs(endX-goalX)*.18+Math.abs(endY-goalY)*.35});
  }
  candidates.sort((a,b)=>a.cost-b.cost);const best=candidates[0],next=new Set(['Space']);
  if(best.dx)next.add(best.dx<0?'ArrowLeft':'ArrowRight');if(best.dy)next.add(best.dy<0?'ArrowUp':'ArrowDown');
  const grazePass=elapsed-lastPhase>4&&s.bullets.some(b=>Math.hypot(b.x-s.x,b.y-s.y)<150);
  if((grazePass||best.clearance<38||(s.warningMs!=null&&s.warningMs<280))&&s.cooldown<=0&&!s.dodging){next.add('Shift');lastPhase=elapsed;}
  if(s.bullets.length>25&&best.clearance<80&&!next.has('Shift'))next.add('Control');
  await keys(next);report.inputs.push({t:elapsed,keys:[...next],clearance:Number.isFinite(best.clearance)?best.clearance:null});
  if(elapsed>=nextShot){report.samples.push({t:elapsed,level:s.level,score:s.score,lives:s.lives,bullets:s.bullets.length});writeFileSync(`${out}/capture.json`,JSON.stringify(report,null,2));nextShot+=10;}
  await page.waitForTimeout(180);
 }
 await keys(new Set());
 const info=await page.evaluate(async()=>{
  const q=window.__capture;await new Promise(resolve=>{q.recorder.onstop=resolve;q.recorder.stop();});q.stream.getTracks().forEach(t=>t.stop());
  const blob=new Blob(q.chunks,{type:q.recorder.mimeType});window.__captureBlob=blob;
  return {duration:(performance.now()-q.started)/1000,bytes:blob.size,mime:blob.type,audioTracks:q.stream.getAudioTracks().length};
 });
 writeFileSync(`${out}/gameplay.webm`,Buffer.alloc(0));
 for(let offset=0;offset<info.bytes;offset+=4*1024*1024){
  const data=await page.evaluate(async offset=>{const data=new Uint8Array(await window.__captureBlob.slice(offset,offset+4*1024*1024).arrayBuffer());let binary='';for(let i=0;i<data.length;i+=32768)binary+=String.fromCharCode(...data.subarray(i,i+32768));return btoa(binary);},offset);
  appendFileSync(`${out}/gameplay.webm`,Buffer.from(data,'base64'));
 }
 report.recording=info;
 // Extract review stills after capture; screenshot readback during play can
 // interrupt frame pacing and must not become part of the gameplay recording.
 execFileSync('ffmpeg',['-y','-v','error','-i',`${out}/gameplay.webm`,'-vf','fps=1/10',`${out}/review-%03d.png`],{windowsHide:true,timeout:120000});
 assert.deepEqual(report.errors,[]);assert.equal(info.audioTracks,1);report.status='captured';
 console.log(JSON.stringify({...info,samples:report.samples}));
}catch(e){report.status='failed';report.failure=e.stack;throw e;}finally{writeFileSync(`${out}/capture.json`,JSON.stringify(report,null,2));await browser.close();processLog?.end();}
