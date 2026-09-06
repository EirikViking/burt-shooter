import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const out=path.resolve(process.env.CHECK_OUTPUT_DIR||'test-results/boss-arsenal');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:process.env.RECORD?{dir:out,size:{width:1280,height:720}}:undefined});
await context.route('**/*',r=>/^(https?:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(r.request().url())?r.continue():r.abort());
const page=await context.newPage(),report={errors:[],captures:[]};page.on('pageerror',e=>report.errors.push(e.message));
try{
 const url=new URL(process.env.CHECK_URL||'http://127.0.0.1:4399');
 for(const[k,v]of Object.entries({autostart:1,offlineLeaderboard:1,controlSmoke:1,debugBossToken:'NOVA_DEBUG_2026','nova-devtools-hash':'f07e7cbbaa835bfa3ecf9bb181e93e59a8f86021ddcda00ec835edcad56a559c',startAtBoss:1,startLevel:2}))url.searchParams.set(k,v);
 await page.goto(url.href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.boss?.animationRig,null,{timeout:120000});
 await page.evaluate(()=>{const g=window.__game,p=g.scenes.play;g.app.ticker.stop();p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);p.clearToastState();p.player.invulnerable=true;p.player.invulnerableTime=1e9;});
 const levels=process.env.LEVELS?process.env.LEVELS.split(',').map(Number):Array.from({length:10},(_,i)=>i+1);
 for(const level of levels){
  const details=await page.evaluate(async level=>{
   const g=window.__game,p=g.scenes.play,{Boss}=await import('/src/entities/Boss.js');
   const old=p.enemyManager.boss;old?.destroy();old?.sprite?.destroy({children:true});
   const w=p.gameplayGame.getWidth(),h=p.gameplayGame.getHeight();
   const b=new Boss(w*.5,h*.23,level,p.gameplayGame);await b.createSprite();p.enemyManager.boss=b;p.gameContainer.addChild(b.sprite);
   b.entryStartMs=Date.now()-b.entryDurationMs-1000;b.x=w*.5;b.y=h*.28;b.sprite.position.set(b.x,b.y);b.baseX=b.x;b.targetY=b.y;b.phase=2;b.health=b.maxHealth*.6;b.updateHealthBar();
   p.player.x=w*.5;p.player.y=h*.85;p.player.sprite.position.set(p.player.x,p.player.y);
   p.bulletManager.enemyBullets.forEach(b=>{b.active=false;b.sprite.visible=false;});p.clearBossHazards('arsenal_qa');
   b.startSignatureTelegraph(b.profile.signature,p.player.x,p.player.y);b.setAttackWarningVisibleElapsedForDebug(b.attackWarningToken.duration*.80);
   b.moveTimer=170;b.updateBossAnimation(0,p.player.x,p.player.y);b.updateTelegraphVisual(.80,p.player.x,p.player.y);p.clearToastState();
   g.app.renderer.render(g.app.stage);
   return {level,archetype:b.profile.archetype,name:b.name,signature:b.profile.signature,width:w,height:h,rig:b.animationRig.arsenalRig?.debug||null};
  },level);
  await page.screenshot({path:path.join(out,`${level}-${details.archetype}-charge.png`)});
  await page.evaluate(()=>{
   const g=window.__game,p=g.scenes.play,b=p.enemyManager.boss,token=b.attackWarningToken;
   b.setAttackWarningVisibleElapsedForDebug(token.duration);b.executeSignatureMove(token.type,p.player.x,p.player.y,token);b.finishAttackWarning(token,'released','arsenal_qa');b.clearTelegraphVisual();
   const bullets=p.bulletManager.enemyBullets.filter(b=>b.active);for(const bullet of bullets){for(let i=0;i<40;i++)bullet.update(1);}
   b.fireRecoilUntil=Date.now()+220;b.updateBossAnimation(0,p.player.x,p.player.y);
   for(const h of p.bossHazards){h.elapsedMs=(h.armingMs||0)+60;}p.updateBossHazards(0,1);
   g.app.renderer.render(g.app.stage);
  });
  await page.screenshot({path:path.join(out,`${level}-${details.archetype}-fire.png`)});
  report.captures.push(details);
 }
 if(process.env.RECORD){
  await page.evaluate(()=>{const g=window.__game,p=g.scenes.play,b=p.enemyManager.boss;b.cancelAttackWarning('qa');p.clearBossHazards('qa');b.shootCooldown=0;b.regularAttackReadyAt=0;b.signatureCooldown=0;g.app.ticker.start();});
  for(let i=0;i<8;i++){const key=i%2?'ArrowLeft':'ArrowRight';await page.keyboard.down(key);await page.keyboard.down('Space');await page.waitForTimeout(1200);await page.keyboard.up(key);}await page.keyboard.up('Space');
 }
 report.ok=!report.errors.length;
}finally{writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await context.close();await browser.close();}
console.log(JSON.stringify(report));
