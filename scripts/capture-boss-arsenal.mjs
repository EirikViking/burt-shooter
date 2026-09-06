import {chromium,_electron as electron} from 'playwright';
import {mkdirSync,writeFileSync,createWriteStream,openSync,closeSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
const out=path.resolve(process.env.CHECK_OUTPUT_DIR||'test-results/boss-arsenal');mkdirSync(out,{recursive:true});
const native=Boolean(process.env.ASTRA_EXE);
const log=native?createWriteStream(path.join(out,'process.log')):null;
const app=native?await electron.launch({executablePath:process.env.ASTRA_EXE,args:[...(process.env.CLASSIC?['--nova-boss-classic']:[]),...(process.env.PREVIOUS?['--nova-boss-previous']:[]),'--nova-fresh-profile','--windowed','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'],env:{...process.env,NOVA_SWARM_USER_DATA_DIR:path.join(out,'profile'),NOVA_SWARM_FRESH_PROFILE:'1',NOVA_SWARM_WINDOWED:'1'},timeout:120000}):null;
if(app){app.process().stdout?.pipe(log,{end:false});app.process().stderr?.pipe(log,{end:false});}
const browser=native?null:await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=native?app.context():await browser.newContext({viewport:{width:1280,height:720},recordVideo:process.env.RECORD?{dir:out,size:{width:1280,height:720}}:undefined});
await context.route('**/*',r=>/^(nova-swarm:|https?:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url())?r.continue():r.abort());
const page=native?await app.firstWindow():await context.newPage(),report={errors:[],captures:[]};page.on('pageerror',e=>report.errors.push(e.message));
try{
 if(native){await page.waitForFunction(()=>window.__game?.scenes.menu,null,{timeout:120000});await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setFullScreen(false);w.unmaximize();w.setContentSize(1280,720);w.webContents.setBackgroundThrottling(false);});}
 const url=new URL(native?page.url():(process.env.CHECK_URL||'http://127.0.0.1:4399'));
 if(process.env.CLASSIC)url.searchParams.set('bossArsenal','classic');
 if(process.env.PREVIOUS)url.searchParams.set('bossEncounter','previous');
 for(const[k,v]of Object.entries({autostart:1,offlineLeaderboard:1,controlSmoke:1,debugBossToken:'NOVA_DEBUG_2026','nova-devtools-hash':'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c',startAtBoss:1,startLevel:2}))url.searchParams.set(k,v);
 if(native){
  await page.waitForFunction(()=>window.__game?.scenes.menu?.astraMenuShip?.ready,null,{timeout:120000});
  await page.evaluate(()=>window.__novaDisplay.applySettings({mode:'windowed',windowSize:{width:1280,height:720},uiScale:1}));
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setContentSize(1280,720);});
  await page.waitForFunction(()=>innerWidth===1280&&innerHeight===720);
  await page.evaluate(()=>window.__game.scenes.menu.quickStartRun('ranked_tactical'));
  await page.waitForFunction(()=>window.__game?.scenes.play?.player?.active,null,{timeout:120000});
  await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.markUnrankedRun('arsenal_qa');p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);p.player.invulnerable=true;p.player.invulnerableTime=1e9;});
  await page.waitForFunction(()=>window.__game.scenes.play.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
  await page.evaluate(()=>{const p=window.__game.scenes.play;p.clearPendingEnemyStart();p.enemyManager.forceBossStart(2);});
 }else await page.goto(url.href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.boss?.animationRig,null,{timeout:120000});
 report.runtime=await page.evaluate(()=>{const s=JSON.parse(window.render_game_to_text());return {gitSha:s.gitSha,buildId:s.buildId,url:location.href,viewport:[innerWidth,innerHeight]};});
 await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.app.ticker.stop();p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);p.clearToastState();p.player.invulnerable=true;p.player.invulnerableTime=1e9;});
 const levels=process.env.LEVELS?process.env.LEVELS.split(',').map(Number):Array.from({length:10},(_,i)=>i+1);
 for(const level of levels){
  const details=await page.evaluate(async level=>{
   const g=window.__game,p=g.scenes.play,Boss=p.enemyManager.boss.constructor;
   const old=p.enemyManager.boss;p.enemyManager.enemies=p.enemyManager.enemies.filter(e=>e!==old);old?.destroy();old?.sprite?.destroy({children:true});
   const w=p.gameplayGame.getWidth(),h=p.gameplayGame.getHeight();
   g.level=level;p.enemyManager.level=level;const b=new Boss(w*.5,h*.23,level,p.gameplayGame);await b.createSprite();p.enemyManager.boss=b;p.enemyManager.enemies.push(b);p.gameContainer.addChild(b.sprite);
   b.entryStartMs=Date.now()-b.entryDurationMs-1000;b.x=w*.5;b.y=h*.28;b.sprite.position.set(b.x,b.y);b.baseX=b.x;b.targetY=b.y;b.phase=2;b.health=b.maxHealth*.6;b.updateHealthBar();
   p.player.x=w*.5;p.player.y=h*.85;p.player.sprite.position.set(p.player.x,p.player.y);
   p.bulletManager.enemyBullets.forEach(b=>{b.active=false;b.sprite.visible=false;});p.clearBossHazards('arsenal_qa');
   b.startSignatureTelegraph(b.profile.signature,p.player.x,p.player.y);b.setAttackWarningVisibleElapsedForDebug(b.attackWarningToken.duration*.80);
   b.moveTimer=170;b.updateBossAnimation(0,p.player.x,p.player.y);b.updateTelegraphVisual(.80,p.player.x,p.player.y);p.clearToastState();if(p.hud){p.hud.notificationFocus=null;p.hud.updateMissionStatus?.();}
   g.app.renderer.render(g.app.stage);
   return {level,archetype:b.profile.archetype,name:b.name,signature:b.profile.signature,width:w,height:h,rig:b.colossusRig?.debug||b.animationRig.arsenalRig?.debug||null};
  },level);
  await page.screenshot({path:path.join(out,`${level}-${details.archetype}-charge.png`)});
  await page.evaluate(()=>{
   const g=window.__game,p=g.scenes.play,b=p.enemyManager.boss,token=b.attackWarningToken;
   b.setAttackWarningVisibleElapsedForDebug(token.duration);b.executeSignatureMove(token.type,p.player.x,p.player.y,token);b.finishAttackWarning(token,'released','arsenal_qa');b.clearTelegraphVisual();
   const bullets=p.bulletManager.enemyBullets.filter(b=>b.active);for(const bullet of bullets){for(let i=0;i<40;i++)bullet.update(1);}
   b.fireRecoilUntil=Date.now()+220;b.updateBossAnimation(0,p.player.x,p.player.y);
   for(const h of p.bossHazards){h.elapsedMs=(h.armingMs||0)+(h.colossus?370:60);}p.updateBossHazards(0,1);
   g.app.renderer.render(g.app.stage);
  });
  await page.screenshot({path:path.join(out,`${level}-${details.archetype}-fire.png`)});
  report.captures.push(details);
 }
 if(process.env.RECORD){
  let recorder,frames=[],listener;
  if(native){
    const dir=path.join(out,'motion-frames');mkdirSync(dir,{recursive:true});recorder=await app.context().newCDPSession(page);
    listener=e=>{const file=path.join(dir,`${String(frames.length).padStart(5,'0')}.jpg`);writeFileSync(file,Buffer.from(e.data,'base64'));frames.push({file,time:e.metadata.timestamp});recorder.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});};
    recorder.on('Page.screencastFrame',listener);await recorder.send('Page.startScreencast',{format:'jpeg',quality:86,maxWidth:1280,maxHeight:720,everyNthFrame:1});
  }
  await page.evaluate(()=>{const g=window.__game,p=g.scenes.play,b=p.enemyManager.boss;b.cancelAttackWarning('qa');p.clearBossHazards('qa');b.shootCooldown=0;b.regularAttackReadyAt=0;b.signatureCooldown=0;g.app.ticker.start();});
  for(let i=0;i<12;i++){const key=i%2?'ArrowLeft':'ArrowRight';await page.keyboard.down(key);if(!process.env.DODGE_ONLY)await page.keyboard.down('Space');await page.waitForTimeout(1200);await page.keyboard.up(key);}await page.keyboard.up('Space');
  if(recorder){
    await recorder.send('Page.stopScreencast');recorder.off('Page.screencastFrame',listener);await recorder.detach();
    if(frames.length<100)throw Error('Insufficient native gameplay recording frames');
    const lines=[];for(let i=0;i<frames.length-1;i++)lines.push(`file '${frames[i].file.replaceAll('\\','/')}'`,`duration ${Math.max(.001,frames[i+1].time-frames[i].time).toFixed(6)}`);lines.push(`file '${frames.at(-1).file.replaceAll('\\','/')}'`);
    const list=path.join(out,'motion-frames.txt');writeFileSync(list,lines.join('\n'));
    const fd=openSync(path.join(out,'ffmpeg.log'),'w'),video=path.join(out,'boss-attacks-normal-speed.mp4');
    const encoder=spawn('ffmpeg',['-y','-f','concat','-safe','0','-i',list,'-vf','fps=30,format=yuv420p','-c:v','libx264','-preset','fast','-crf','20','-movflags','+faststart',video],{windowsHide:true,stdio:['ignore',fd,fd]});
    const code=await new Promise((resolve,reject)=>{encoder.once('error',reject);encoder.once('exit',resolve);});closeSync(fd);if(code!==0)throw Error('Video encoding failed');
    report.recording={video,frames:frames.length,seconds:frames.at(-1).time-frames[0].time,audio:false,stagedPhase:2,qaInvulnerability:true,scriptedInput:process.env.DODGE_ONLY?'alternating dodges':'alternating movement and firing'};
  }
 }
 if(await page.locator('body').innerText().then(t=>t.includes('GAME LOOP CRASH')))report.errors.push('Game loop crash overlay detected');
 report.ok=!report.errors.length;
 if(!report.ok)throw new Error(report.errors.join('\n'));
}finally{writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));if(app){await app.close();log.end();}else{await context.close();await browser.close();}}
console.log(JSON.stringify(report));
