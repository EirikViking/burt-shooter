import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=planetfall`);
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.boss?.isPlanetfall,null,{timeout:90000});
 const png=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,b=s.enemyManager.boss;g.app.ticker.stop();
  s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;
  for(let i=0;i<205;i++)b.update(1);
  b.visual.signals.visible=false;b.visual.label.visible=false;
  return g.app.renderer.extract.base64({target:b.sprite,format:'png'});
 });
 assert(png.startsWith('data:image/png;base64,'));
 writeFileSync(path.join(out,'planetfall.png'),Buffer.from(png.split(',')[1],'base64'));
 console.log('[planetfall-codex] Exported actual runtime machinery with transparent background; no UI, warning lines or invented artwork');
}finally{await browser.close();}
