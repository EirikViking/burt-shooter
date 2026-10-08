import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const url=process.env.CHECK_URL||'http://127.0.0.1:5201';
const out='test-results/discovery-celebrations';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(r.request().url())||/^(blob:|data:)/.test(r.request().url())?r.continue():r.abort());
try{
  await page.goto(`${url}/?skipIntro=1&offlineLeaderboard=1&autostart=1`,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__game?.scenes.play?.isReady&&window.__game.scenes.play.player?.shipSprite?.texture?.width>1,null,{timeout:120000});
  await page.evaluate(()=>{const p=window.__game.scenes.play;p.introActive=false;p.introComplete=true;p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;if(p.isPaused)p.setPaused(false);p.enemyManager.clearEnemies();});
  const trigger=async sector=>{
    await page.evaluate(sector=>{const g=window.__game,p=g.scenes.play;g.level=sector;g.score=148908;g.lives=3;p.triggerOverrunClearCelebration({milestoneSector:sector,nextSector:sector+1,eventKind:sector===10?'run_clear':'overrun_milestone',clearBonus:10000,livesBonus:7500});},sector);
    await page.waitForFunction(()=>window.__game.scenes.play.overrunMilestoneInterlude?.effect.interludeCard._coronation.ready,null,{timeout:120000});
  };
  for(const sector of [10,30,50]){
    await trigger(sector);
    if(sector===10){
      const frames=await page.evaluate(()=>new Promise(resolve=>{let last=performance.now(),samples=[];function frame(now){samples.push(now-last);last=now;if(samples.length<180)requestAnimationFrame(frame);else resolve(samples.slice(10));}requestAnimationFrame(frame);}));
      const sorted=[...frames].sort((a,b)=>a-b);checks.push({animation1080:{meanMs:frames.reduce((a,b)=>a+b,0)/frames.length,p95Ms:sorted[Math.floor(sorted.length*.95)],frames:frames.length}});
    }
    await page.waitForTimeout(1500);
    const state=await page.evaluate(()=>{const p=window.__game.scenes.play,c=p.overrunMilestoneInterlude.effect.interludeCard;return {language:c._debugOverrunVisual.visualLanguage,model:c._coronation.solid.ready,flat:c._coronation.hull.texture.width<=1,text:JSON.parse(window.render_game_to_text()).overrunInterlude};});
    assert.ok(state.model&&!state.flat);checks.push({sector,...state});
    await page.screenshot({path:`${out}/victory-${sector}.png`});
    if(sector===30){const b=state.text.buttonBounds;await page.mouse.click(b.x+b.width/2,b.y+b.height/2);}
    else if(sector===50)await page.evaluate(()=>{window.__burtGamepadOverride={connected:true,id:'Victory QA',axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===0,value:i===0?1:0}))};});
    else await page.keyboard.press('Enter');
    await page.waitForTimeout(1700);await page.evaluate(()=>{window.__burtGamepadOverride=null;});
    assert.ok(!await page.evaluate(()=>window.__game.scenes.play.overrunMilestoneInterlude?.active));
  }
  for(const [width,height,language,reduced] of [[1280,720,'en',false],[800,600,'de',false],[600,800,'ja',true]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(300);
    await page.evaluate(async({language,reduced})=>{window.__novaI18n.setLanguagePreference(language);const a=await import('/src/config/AccessibilitySettings.js');a.setReducedMotionEnabled(reduced);},{language,reduced});
    await trigger(40);await page.waitForTimeout(3600);
    const state=await page.evaluate(()=>JSON.parse(window.render_game_to_text()).overrunInterlude);
    for(const node of state.textNodes||[]){const b=node.bounds;if(node.visible&&b)assert.ok(b.x>=-2&&b.y>=-2&&b.x+b.width<=width+2&&b.y+b.height<=height+2,`${language} ${node.id} fits`);}
    checks.push({width,height,language,reduced});await page.screenshot({path:`${out}/victory-${width}-${language}.png`});
    await page.keyboard.press('Enter');await page.waitForTimeout(1700);
  }
  await page.setViewportSize({width:1920,height:1080});
  // Pending loads, immediate dismissal and repeated celebrations own no leaks.
  const resources=await page.evaluate(async()=>{
    const {SolidShipView}=await import('/src/ui/SolidShipView.js');
    const g=window.__game,p=g.scenes.play;
    const before=SolidShipView.resident;
    for(let i=0;i<5;i++)p.triggerOverrunClearCelebration({milestoneSector:20,nextSector:21,eventKind:'overrun_milestone'});
    for(const e of p.overrunClearEffects)e.container.destroy({children:true});p.overrunClearEffects=[];p.overrunMilestoneInterlude=null;p.clearOverrunConfirmationHandlers();
    await new Promise(r=>setTimeout(r,4000));return {before,after:SolidShipView.resident};
  });
  assert.equal(resources.after,resources.before);checks.push({resources});
  assert.deepEqual(errors,[]);
  writeFileSync(`${out}/runtime.json`,JSON.stringify({checks,errors},null,2));console.log('PASS victory runtime, controls, responsive layout, resource cleanup');
}catch(error){await page.screenshot({path:`${out}/failure.png`});writeFileSync(`${out}/runtime.json`,JSON.stringify({checks,errors,error:error.stack},null,2));throw error;}
finally{await browser.close();}
