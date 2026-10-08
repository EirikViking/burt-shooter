import assert from 'node:assert/strict';import{mkdirSync,writeFileSync}from'node:fs';import path from'node:path';import{chromium}from'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const results=[],errors=[];
try{
 for(const language of ['en','de','es','ru','zh-CN','pt-BR','ko','ja']){
  const page=await browser.newPage({viewport:{width:language==='de'?800:1280,height:language==='de'?600:720}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(language=>localStorage.setItem('novaSwarm.languagePreference.v1',language),language);
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4896'}/?encounterEvolution=fusions&autostart=1&offlineLeaderboard=1`);
  await page.waitForFunction(()=>window.__game?.scenes?.play?.encounterExpansionTestReady,null,{timeout:90000});
  for(const id of ['salvage_crown','rift_crossfire']){
   const result=await page.evaluate(id=>{const g=window.__game,s=g.scenes.play;g.app.ticker.stop();s.setPaused(true);s.openTacticalLoadoutOverlay();const o=s.tacticalLoadoutOverlay;
    o.openDetail(o.items.find(item=>item.id===id));g.app.render();const texts=[];function walk(n){if(n.text)texts.push({text:n.text,bounds:n.getBounds()});for(const c of n.children||[])walk(c);}walk(o.detailContainer);
    return{language:window.__novaI18n?.getLanguage?.(),id,panel:o.getDebugState().detail.panel,texts:texts.map(({text,bounds})=>({text,x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height})),w:g.getWidth(),h:g.getHeight()};
   },id);
   assert(result.panel.x>=0&&result.panel.y>=0&&result.panel.x+result.panel.width<=result.w+2&&result.panel.y+result.panel.height<=result.h+2,JSON.stringify(result));
   assert(result.texts.every(t=>!/[\uFFFD\u25A1]/.test(t.text)));assert(result.texts.some(t=>t.text.length>60));
   await page.screenshot({path:path.join(out,`${language}-${id}.png`)});results.push(result);
  }await page.close();console.log(`PASS new Fusion detail ${language}`);
 }
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',conditions:'All eight locales, real selected Fusion details; German 800x600, others 1280x720. Bounds/replacement-symbol checks plus captured screenshots; human linguistic and glyph review remains.',results,errors},null,2));
}finally{await browser.close();}
