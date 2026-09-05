import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';
import {mkdirSync,writeFileSync,readFileSync,createWriteStream,openSync,closeSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
const label=process.argv[2]||'candidate';
const baseline=label==='baseline'||label.startsWith('baseline-');
const executable=baseline?path.resolve('node_modules/electron/dist/electron.exe'):JSON.parse(readFileSync('test-results/astra-build-location.json')).executable;
const out=path.resolve('test-results',`astra-desktop-${label}`);mkdirSync(out,{recursive:true});
const report={label,executable,viewport:[1280,720],errors:[],warnings:[],checks:[],performance:[]};
const log=createWriteStream(path.join(out,'process.log'));
const startupAt=Date.now();
const app=await electron.launch({executablePath:executable,args:[...(baseline?[path.resolve('electron/main.cjs')]:[]),'--nova-fresh-profile','--windowed','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-features=CalculateNativeWinOcclusion'],cwd:process.cwd(),env:{...process.env,NOVA_SWARM_USER_DATA_DIR:path.join(out,'profile'),NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},timeout:120000});
app.process().stdout?.pipe(log,{end:false});app.process().stderr?.pipe(log,{end:false});
const page=await app.firstWindow();
await page.addInitScript(()=>{localStorage.setItem('nova_display_mode_v1','windowed');localStorage.setItem('nova_display_window_size_v1',JSON.stringify({width:1280,height:720}));localStorage.setItem('nova_ui_scale_v1','1');});
page.on('pageerror',error=>report.errors.push(error.message));
page.on('console',m=>{if(['warning','error'].includes(m.type()))report.warnings.push(m.text().slice(0,500));});
await app.context().route('**/*',route=> /^(nova-swarm:|data:|blob:|https?:\/\/(127\.0\.0\.1|localhost)(:|\/))/.test(route.request().url())?route.continue():route.abort());
const cdp=await app.context().newCDPSession(page);
const flush=()=>writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
async function state(){return page.evaluate(()=>JSON.parse(window.render_game_to_text()));}
async function shot(name){assert.deepEqual(await page.evaluate(()=>[innerWidth,innerHeight]),[1280,720],'Actual capture viewport');await page.screenshot({path:path.join(out,`${name}.png`)});report.checks.push({name,state:await state()});flush();console.log(label,name);}
async function ready(){
  await page.waitForFunction(()=>window.__game?.scenes?.play?.player?.shipSprite?.texture?.source?.resource,null,{timeout:120000});
  // A staged native navigation may lose window focus before the first wave.
  // Apply the existing QA focus suppression before waiting for that wave.
  await page.evaluate(()=>{const p=window.__game.scenes.play;p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;if(p.isPaused)p.setPaused(false);p.player.invulnerable=true;p.player.invulnerableTime=1e9;});
  await page.waitForFunction(()=>['WAVE_ACTIVE','BOSS_ACTIVE'].includes(window.__game.scenes.play.enemyManager?.state),null,{timeout:120000});
}
async function measure(name,duration=20000){
  await cdp.send('HeapProfiler.collectGarbage');
  const data=await page.evaluate(async duration=>{
    const times=[],counts=[];let last=performance.now();const start=last;
    await new Promise(resolve=>{function frame(now){times.push(now-last);last=now;const p=window.__game.scenes.play;counts.push({enemies:p.enemyManager.enemies.filter(e=>e.active).length,bullets:p.bulletManager.playerBullets.length+p.bulletManager.enemyBullets.length});if(now-start<duration)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
    times.shift();times.sort((a,b)=>a-b);
    return {durationMs:performance.now()-start,frames:times.length,medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],p99Ms:times[Math.floor(times.length*.99)],maxMs:times.at(-1),maxEnemies:Math.max(...counts.map(x=>x.enemies)),maxBullets:Math.max(...counts.map(x=>x.bullets)),heapMiB:performance.memory?.usedJSHeapSize/1048576,backdrop:window.__game.scenes.play.gameplayBackdrop?.texture?.source?.label};
  },duration);
  await cdp.send('HeapProfiler.collectGarbage');const metrics=await cdp.send('Performance.getMetrics');
  data.retainedHeapMiB=(metrics.metrics.find(m=>m.name==='JSHeapUsedSize')?.value||0)/1048576;
  data.processMemory=await app.evaluate(({app})=>app.getAppMetrics().map(p=>({type:p.type,memory:p.memory})));
  report.performance.push({name,...data});flush();
}
async function record({qaInvulnerability=true,bossDeath=false}={}){
  const dir=path.join(out,bossDeath?'boss-recording-frames':'recording-frames');mkdirSync(dir,{recursive:true});const frames=[];
  const listener=event=>{const file=path.join(dir,`${String(frames.length).padStart(5,'0')}.jpg`);writeFileSync(file,Buffer.from(event.data,'base64'));frames.push({file,time:event.metadata.timestamp});cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});};
  cdp.on('Page.screencastFrame',listener);
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:86,maxWidth:1280,maxHeight:720,everyNthFrame:1});
  if(bossDeath){
    await page.waitForTimeout(6000);
    const killed=await page.evaluate(()=>{const b=window.__game.scenes.play.enemyManager.boss;b.invulnerableUntilMs=0;b.firstDamageAtMs=Date.now()-120000;b.finishGateUntilMs=0;return b.takeDamage(b.maxHealth+9999);});assert.equal(killed,true);
    await page.waitForTimeout(180);await shot('08-destruction');await page.waitForTimeout(3200);
  }else{
  await page.keyboard.down('Space');
  for(let i=0;i<10;i++){const key=i%2?'ArrowLeft':'ArrowRight';await page.keyboard.down(key);await page.waitForTimeout(650);await page.keyboard.up(key);await page.waitForTimeout(1850);}
  await page.keyboard.up('Space');}
  await cdp.send('Page.stopScreencast');cdp.off('Page.screencastFrame',listener);
  assert.ok(frames.length>100,'Recording must contain running gameplay');
  const lines=[];for(let i=0;i<frames.length-1;i++){lines.push(`file '${frames[i].file.replaceAll('\\','/')}'`,`duration ${Math.max(.001,frames[i+1].time-frames[i].time).toFixed(6)}`);}lines.push(`file '${frames.at(-1).file.replaceAll('\\','/')}'`);
  const list=path.join(out,bossDeath?'boss-recording-frames.txt':'recording-frames.txt');writeFileSync(list,lines.join('\n'));
  const fd=openSync(path.join(out,bossDeath?'boss-ffmpeg.log':'ffmpeg.log'),'w');const video=path.join(out,bossDeath?'boss-destruction-normal-speed.mp4':'gameplay-normal-speed.mp4');
  const child=spawn('ffmpeg',['-y','-f','concat','-safe','0','-i',list,'-vf','fps=30,format=yuv420p','-c:v','libx264','-preset','fast','-crf','20','-movflags','+faststart',video],{windowsHide:true,stdio:['ignore',fd,fd]});
  const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});closeSync(fd);assert.equal(code,0);
  report[bossDeath?'bossRecording':'recording']={video,frames:frames.length,elapsedSeconds:frames.at(-1).time-frames[0].time,audio:false,qaInvulnerability,description:`Actual packaged game; normal wall-clock speed, ${bossDeath?'staged boss kill through damage API':'scripted keyboard input'}, isolated practice run${qaInvulnerability?' with QA invulnerability':'; normal vulnerability and lives'}.`};flush();
}
try {
  await cdp.send('Performance.enable');
  await page.waitForFunction(()=>window.__game?.scenes?.menu?.backdrop?.texture,null,{timeout:120000});
  if(!baseline)await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});
  report.menuArtReadyMs=Date.now()-startupAt;
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.webContents.setBackgroundThrottling(false);});await page.waitForTimeout(400);
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setContentSize(1280,720);w.center();w.showInactive();});await page.waitForTimeout(600);
  report.runtime=await app.evaluate(({app})=>({packaged:app.isPackaged,userData:app.getPath('userData'),electron:process.versions.electron}));
  assert.equal(report.runtime.packaged,!baseline);assert.equal(report.runtime.userData,path.join(out,'profile'));
  const initial=new URL(page.url());const base=`${initial.protocol}//${initial.host}/`;
  async function open(params={}){const u=new URL(base);for(const[k,v]of Object.entries({offlineLeaderboard:'1',...params}))u.searchParams.set(k,v);const at=Date.now();await page.goto(u.href,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__game&&window.render_game_to_text&&document.body.dataset.menuReady==='1',null,{timeout:120000});await page.waitForTimeout(250);await page.evaluate(()=>window.__novaDisplay.applySettings({mode:'windowed',windowSize:{width:1280,height:720},uiScale:1}));await page.waitForTimeout(400);await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1280,720));await page.waitForFunction(()=>innerWidth===1280&&innerHeight===720);return at;}
  await open();await page.waitForFunction(()=>window.__game.scenes.menu?.backdrop?.texture,null,{timeout:120000});
  if(!baseline)await page.waitForFunction(()=>window.__game.scenes.menu.astraMenuShip?.ready,null,{timeout:120000});
  await page.waitForTimeout(1200);await shot('01-menu');
  const bounds=await page.evaluate(()=>{const b=window.__game.scenes.menu.runModeLaunchButton.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};});
  const launchAt=Date.now();await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await ready();report.performance.push({name:'menu-to-controllable',loadMs:Date.now()-launchAt});
  await shot('02-opening');
  if(process.argv.includes('--record-opening')){
    await page.evaluate(()=>{const g=window.__game,p=g.scenes.play.player;g.markUnrankedRun('astra_capture');p.invulnerable=false;p.invulnerableTime=0;});
    await record({qaInvulnerability:false});await shot('03-recording-end');assert.equal(report.errors.length,0);report.status='passed';flush();
  }else{
  const beforeX=await page.evaluate(()=>window.__game.scenes.play.player.x);await page.keyboard.down('ArrowRight');await page.keyboard.down('Space');await page.waitForTimeout(500);await page.keyboard.up('ArrowRight');
  const afterX=await page.evaluate(()=>window.__game.scenes.play.player.x);assert.ok(afterX>beforeX+30,'Keyboard movement');await page.waitForTimeout(1200);await page.keyboard.up('Space');
  assert.ok((await state()).combatTelemetry.volleysFired>0,'Keyboard shooting');
  await page.keyboard.press('p');await page.waitForFunction(()=>window.__game.scenes.play.isPaused);await shot('03-pause');await page.keyboard.press('p');await page.waitForFunction(()=>!window.__game.scenes.play.isPaused);
  await shot('04-combat');
  await open();await page.waitForFunction(()=>window.__game.scenes.menu?.dailySignalContract,null,{timeout:120000});
  report.dailyContract=await page.evaluate(()=>window.__game.scenes.menu.dailySignalContract);
  await page.evaluate(()=>window.__game.scenes.menu.startDailySignalRun());await ready();await page.keyboard.down('Space');await measure('daily-seeded',20000);await page.keyboard.up('Space');await shot('05-daily');
  // Native protocol deliberately does not accept browser debug URLs. Stage
  // encounters through the same methods used by the existing telegraph test.
  const denseAt=await open({autostart:'1'});await ready();
  await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.markUnrankedRun('astra_capture');p.clearPendingEnemyStart();g.level=90;p.startLevel('astra_capture');});
  await page.waitForFunction(()=>{const p=window.__game.scenes.play;return p.game.level===90&&p.enemyManager.level===90&&p.enemyManager.state==='WAVE_ACTIVE';},null,{timeout:30000});
  report.performance.push({name:'dense-load',loadMs:Date.now()-denseAt});await page.waitForTimeout(7000);await measure('sector-90-dense',20000);await shot('06-dense');
  if(!baseline)await record();
  await open({autostart:'1'});await ready();await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.markUnrankedRun('astra_capture');p.clearPendingEnemyStart();p.enemyManager.forceBossStart(1);});
  await page.waitForFunction(()=>{const m=window.__game.scenes.play.enemyManager;return m.state==='BOSS_ACTIVE'&&m.boss?.active;},null,{timeout:45000});
  await page.waitForTimeout(1800);await measure('boss',12000);await shot('07-boss');
  if(!baseline)await record({bossDeath:true});
  else {await page.evaluate(()=>{const b=window.__game.scenes.play.enemyManager.boss;b.invulnerableUntilMs=0;b.minimumFightMs=0;b.finishGateUntilMs=0;b.takeDamage(b.maxHealth+9999);});await page.waitForTimeout(180);await shot('08-destruction');}
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).tacticalDraft?.active,null,{timeout:30000});await page.waitForTimeout(600);await shot('09-rewards');await page.keyboard.press('Enter');await page.waitForTimeout(500);
  await open({autostart:'1'});await ready();await page.evaluate(()=>window.__game.gameOver());await page.waitForFunction(()=>window.__game.currentSceneName==='gameOver');await page.waitForTimeout(1800);await shot('10-death');
  const restart=await page.evaluate(()=>{const s=window.__game.scenes.gameOver;return Object.keys(s).filter(k=>/retry|runback|restart/i.test(k));});report.restartFields=restart;
  await page.keyboard.press('Enter');await page.waitForTimeout(1200);report.restartAfterEnter=(await state()).scene;
  assert.equal(report.restartAfterEnter,'play','Enter must restart directly from the result screen');await ready();await shot('11-restarted');
  // Record a second launch as well as the input-driven result-screen transition.
  await open();await page.waitForFunction(()=>window.__game.scenes.menu?.runModeLaunchButton);const b=await page.evaluate(()=>{const b=window.__game.scenes.menu.runModeLaunchButton.getBounds();return{x:b.x+b.width/2,y:b.y+b.height/2};});await page.mouse.click(b.x,b.y);await ready();await shot('12-relaunched');
  assert.equal(report.errors.length,0,report.errors.join('\n'));report.status='passed';flush();
  }
} catch(error){report.status='failed';report.failure=error.stack;flush();await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error;}
finally{await app.close();log.end();}
