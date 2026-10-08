import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:/Codex/'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),rows=[],errors=[];
try{const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
await page.goto((process.env.CHECK_URL||'http://127.0.0.1:4983')+'/?autostart=1&offlineLeaderboard=1&encounterEvolution=reactor-tow');
await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.model.encounter?.reactor,null,{timeout:120000});await page.evaluate(()=>window.__game.app.ticker.stop());
for(const [width,height] of [[1280,720],[800,600],[720,1280],[2560,1080]]){
 await page.setViewportSize({width,height});await page.waitForTimeout(300);
 const row=await page.evaluate(()=>{const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,e=d.model.encounter;e.age=8;e.reactor.releaseAt=5;d.update(0);g.app.render();const v=d.view.surpriseView.reactor;return {w:s.gameplayGame.getWidth(),h:s.gameplayGame.getHeight(),pose:d.view.pose,targets:d.view.targets,body:v?{x:v.closed.x,y:v.closed.y,width:v.closed.width}:null};});
 rows.push({width,height,...row});await page.screenshot({path:path.join(out,width+'x'+height+'.png')});
}
writeFileSync(path.join(out,'report.json'),JSON.stringify({rows,errors},null,2));assert.deepEqual(errors,[]);
for(const r of rows)for(const t of r.targets)assert(t.x-t.radius>=0&&t.x+t.radius<=r.w,JSON.stringify(r));
console.log('[reactor-bounds] PASS detached targets remain inside fixed combat field at four layouts');
}finally{await browser.close();}
