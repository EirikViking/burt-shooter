import { chromium, _electron as electron } from 'playwright';
import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import path from 'node:path';
const out=path.resolve(process.env.CHECK_OUTPUT_DIR||'test-results/boss-drama');
mkdirSync(out,{recursive:true});
const native=Boolean(process.env.ASTRA_EXE),log=native?createWriteStream(path.join(out,'process.log')):null;
const app=native?await electron.launch({executablePath:process.env.ASTRA_EXE,args:['--nova-fresh-profile','--windowed','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-features=CalculateNativeWinOcclusion'],env:{...process.env,NOVA_SWARM_USER_DATA_DIR:path.join(out,'profile'),NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},timeout:120000}):null;
if(app){app.process().stdout?.pipe(log,{end:false});app.process().stderr?.pipe(log,{end:false});}
const browser=native?null:await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--autoplay-policy=no-user-gesture-required']});
const context=native?app.context():await browser.newContext({viewport:{width:1280,height:720},recordVideo:process.env.RECORD?{dir:out,size:{width:1280,height:720}}:undefined});
await context.route('**/*',r=>/^(nova-swarm:|https?:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url())?r.continue():r.abort());
const page=native?await app.firstWindow():await context.newPage();const report={errors:[],captures:[],viewport:[1280,720],executable:process.env.ASTRA_EXE||null};
page.on('pageerror',e=>report.errors.push(e.message));
try{
 const url=new URL(process.env.CHECK_URL||'http://127.0.0.1:4399');
 for(const[k,v]of Object.entries({autostart:'1',controlSmoke:'1',debugBossToken:'NOVA_DEBUG_2026','nova-devtools-hash':'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c',startAtBoss:'1',startLevel:'1'}))url.searchParams.set(k,v);
 if(native){
  await page.waitForFunction(()=>window.__game?.scenes.menu?.astraMenuShip?.ready,null,{timeout:120000});
  await page.evaluate(()=>window.__novaDisplay.applySettings({mode:'windowed',windowSize:{width:1280,height:720},uiScale:1}));
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.unmaximize();w.setContentSize(1280,720);w.webContents.setBackgroundThrottling(false);});
  await page.waitForFunction(()=>innerWidth===1280&&innerHeight===720);
  report.runtime=await page.evaluate(()=>JSON.parse(window.render_game_to_text()).gitSha);
  await page.evaluate(()=>window.__game.scenes.menu.quickStartRun('ranked_tactical'));
  await page.waitForFunction(()=>window.__game?.scenes.play?.player?.active,null,{timeout:120000});
  await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.markUnrankedRun('boss_drama_qa');p.introActive=false;p.introComplete=true;p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);p.clearPendingEnemyStart();p.enemyManager.forceBossStart(1);});
 }else await page.goto(url.href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.boss,null,{timeout:120000});
 await page.waitForTimeout(2000);
 await page.evaluate(()=>{
  const g=window.__game,p=g.scenes.play,b=p.enemyManager.boss;g.app.ticker.stop();p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);
  b.cancelAttackWarning('qa');b.entryStartMs=Date.now()-b.entryDurationMs-1;b.x=640;b.y=165;b.sprite.position.set(b.x,b.y);b.shootCooldown=999999;b.regularAttackReadyAt=Date.now()+999999;b.signatureCooldown=999999;
  p.player.x=640;p.player.y=610;p.player.sprite.position.set(640,610);p.player.invulnerable=true;p.player.invulnerableTime=1e9;p.clearToastState();
  for(const bullet of [...p.bulletManager.enemyBullets,...p.bulletManager.playerBullets])bullet.sprite.visible=false;
 });
 if(process.env.CIRCLES_ONLY){
  await page.evaluate(()=>{
   const g=window.__game,p=g.scenes.play; p.enemyManager.boss.sprite.visible=false;
   const callbacks=[],originalAdd=g.app.ticker.add;
   g.app.ticker.add=function(fn,...args){callbacks.push(fn);return originalAdd.call(this,fn,...args);};
   p.showMayhemReinforcementEntryBurst({groupIndex:1,groupCount:3});
   p.createEnemyDeathClarityBurst({x:380,y:440,visualRadius:90,baseColor:0xffdd66,accent:0xffffff,highTier:true,markerCount:8});
   g.app.ticker.add=originalAdd;
   window.__dramaRender=()=>g.app.renderer.render(g.app.stage);
   for(const fn of callbacks)fn({deltaTime:9,deltaMS:150});
   g.app.renderer.render(g.app.stage);
  });
  await page.screenshot({path:path.join(out,'arrival-and-death.png')});
 }
 for(const type of process.env.CIRCLES_ONLY?[]:['aim','fan','split','wall','radial','lance','mirror','ring','adds']){
  const info=await page.evaluate(type=>{
   const g=window.__game,p=g.scenes.play,b=p.enemyManager.boss;b.cancelAttackWarning('qa');b.clearRegularAttackTelegraphVisual();b.clearTelegraphVisual();
   const regular=['aim','fan','split','wall','radial'].includes(type);
   if(regular){b.profile={...b.profile,attack:({aim:'sniper',fan:'fan',split:'split',wall:'wall',radial:'spiral'})[type]};b.startRegularAttackTelegraph(p.player.x,p.player.y);}
   else b.startSignatureTelegraph(type,p.player.x,p.player.y);
   const token=b.attackWarningToken;b.setAttackWarningVisibleElapsedForDebug(token.duration*.72);b.updateBossAnimation(0,p.player.x,p.player.y);
   window.__dramaRender=()=>{if(regular)b.updateRegularAttackTelegraphVisual(.72,p.player.x,p.player.y);else b.updateTelegraphVisual(.72,p.player.x,p.player.y);g.app.renderer.render(g.app.stage);};
   window.__dramaRender();return {type,category:token.category,angle:token.lockedAngle,duration:token.duration};
  },type);
  await page.screenshot({path:path.join(out,`${type}.png`)});report.captures.push(info);
 }
 // Fixed warning progress with live presentation clock; same scene before/after.
 report.performance=await page.evaluate(async()=>{
  const frames=[];let last=performance.now();const start=last;
  await new Promise(resolve=>{const frame=now=>{frames.push(now-last);last=now;window.__dramaRender();if(now-start<12000)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});
  frames.shift();frames.sort((a,b)=>a-b);return {frames:frames.length,p95:frames[Math.floor(frames.length*.95)],p99:frames[Math.floor(frames.length*.99)],max:frames.at(-1)};
 });
 const session=await context.newCDPSession(page);await session.send('Performance.enable');await session.send('HeapProfiler.collectGarbage');const metrics=await session.send('Performance.getMetrics');report.retainedHeapMiB=metrics.metrics.find(m=>m.name==='JSHeapUsedSize').value/1048576;await session.detach();
 if(process.env.RECORD){
  await page.evaluate(()=>{const g=window.__game,p=g.scenes.play,b=p.enemyManager.boss;b.cancelAttackWarning('qa');b.shootCooldown=0;b.regularAttackReadyAt=0;b.signatureCooldown=0;g.app.ticker.start();});
  for(let i=0;i<4;i++){await page.keyboard.down(i%2?'ArrowLeft':'ArrowRight');await page.keyboard.down('Space');await page.waitForTimeout(1800);await page.keyboard.up(i%2?'ArrowLeft':'ArrowRight');}await page.keyboard.up('Space');
 }
 report.ok=report.errors.length===0;
}finally{writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));if(app){await app.close();log.end();}else{await context.close();await browser.close();}}
console.log(JSON.stringify(report));
