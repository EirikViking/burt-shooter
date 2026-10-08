import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],rows=[];
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 const cases=[...['en','de','es','pt-BR','ru','zh-CN','ko','ja'].map(locale=>({locale,width:1280,height:720})),
  {locale:'en',width:1920,height:1080},{locale:'en',width:2560,height:1080},{locale:'ja',width:390,height:844},
  {locale:'de',width:1280,height:720,reduced:true}];
 for(const c of cases){
  await page.setViewportSize({width:c.width,height:c.height});
  await page.addInitScript(({locale,reduced})=>{localStorage.setItem('novaSwarm.languagePreference.v1',locale);
   localStorage.setItem('nova_accessibility_reduced_motion',reduced?'1':'0');localStorage.setItem('nova_accessibility_flash_intensity',reduced?'0':'1');},c);
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=planetfall`);
  await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.boss?.isPlanetfall,null,{timeout:90000});
  const state=await page.evaluate(async c=>{
   const g=window.__game,s=g.scenes.play,b=s.enemyManager.boss;g.app.ticker.stop();s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;
   const {setLanguagePreference}=await import('/src/i18n/index.js');await setLanguagePreference(c.locale);
   const {setReducedMotionEnabled,setFlashIntensityScale}=await import('/src/config/AccessibilitySettings.js');setReducedMotionEnabled(!!c.reduced);setFlashIntensityScale(c.reduced?0:1);
   for(let i=0;i<205;i++)b.update(1);s.hud.update();g.app.render();
   const label=b.visual.label.getBounds(),w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight();
   return {locale:c.locale,width:c.width,height:c.height,reduced:!!c.reduced,gameWidth:w,gameHeight:h,label:b.visual.label.text,
    labelBounds:{x:label.x,y:label.y,width:label.width,height:label.height},targets:b.components.map(p=>({x:p.x,y:p.y,radius:p.radius})),
    targetsInside:b.components.every(p=>p.x-p.radius>=0&&p.x+p.radius<=w&&p.y-p.radius>=0&&p.y+p.radius<h*.65),
    health:b.health,visible:b.sprite.visible&&b.visual.segments.every(s=>s.sprite.visible),
    poweredRoutes:b.visual.powerRoutes?.filter(r=>r.active).length,warningPixels:b.visual.warningLineWidth*Math.abs(s.gameContainer.scale.x),
    plateHeights:b.visual.segments.map(({sprite})=>Math.abs(sprite.height))};
  },c);
  assert(state.targetsInside&&state.visible,JSON.stringify(state));assert(state.labelBounds.height>=14,`Phase label unreadably small: ${JSON.stringify(state.labelBounds)}`);rows.push(state);
  assert.equal(state.poweredRoutes,4,'each living anchor must power one visible conduit');
  assert(state.warningPixels>=1.1,'danger lines must not shrink below a readable screen-space width');
  assert(Math.max(...state.plateHeights)>Math.min(...state.plateHeights)*1.25,'near/far arcs must have visible mechanical depth');
  await page.screenshot({path:path.join(out,`${c.locale}-${c.width}x${c.height}${c.reduced?'-reduced':''}.png`)});
  if(c.locale==='en'&&c.width===1920){
   const broken=await page.evaluate(()=>{const g=window.__game,b=g.scenes.play.enemyManager.boss;b.hitComponent(b.components[0],b.maxHealth);for(let i=0;i<50;i++)b.update(1);g.app.render();
    return {powered:b.visual.powerRoutes.filter(r=>r.active).length,brokenPowered:b.visual.powerRoutes[0].active};});
   assert.deepEqual(broken,{powered:3,brokenPowered:false});
   await page.screenshot({path:path.join(out,'broken-quadrant.png')});
  }
 }
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({scope:'DEV layout and screenshot evidence; review images for art/glyph quality',rows,errors},null,2));
 console.log('[planetfall-visual] PASS',rows.length,'viewport/language/accessibility cases');
}finally{await browser.close();}
