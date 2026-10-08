import {chromium} from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 await page.goto('http://127.0.0.1:5201/?skipIntro=1&offlineLeaderboard=1',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await page.evaluate(()=>window.__game.startGame('nova-player-ship-01.png',{runMode:'ranked_tactical'}));
 await page.waitForFunction(()=>window.__game.scenes.play.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play,e=p.enemyManager;g.markUnrankedRun('tractor_perf');
  g.app.ticker.stop();const rows=[];
  const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*p)];
  for(const id of [null,'shepherd','helix','prism']){
   if(e.hijacker){e.hijacker.destroy();e.hijacker=null;}
   if(id){e.spawnHijacker({tractorVariant:id,spawnX:1000,spawnY:250});
    await new Promise(r=>setTimeout(r,300));e.hijacker.beamTarget={x:1000,y:800};}
   const frame=[],cpu=[],start=performance.now();let last=start;
   await new Promise(resolve=>{
    function tick(now){
     if(now-start>700){frame.push(now-last);const begin=performance.now();
      e.hijacker?.updateBeamVisual(((now-start)%2400)/2400,true);g.app.renderer.render(g.app.stage);cpu.push(performance.now()-begin);}
     last=now;if(now-start<5500)requestAnimationFrame(tick);else resolve();
    }requestAnimationFrame(tick);
   });
   rows.push({variant:id||'baseline',frames:frame.length,medianFrameMs:percentile(frame,.5),p95FrameMs:percentile(frame,.95),medianUpdateAndSubmitMs:percentile(cpu,.5),p95UpdateAndSubmitMs:percentile(cpu,.95)});
  }
  const gl=g.app.renderer.gl,ext=gl?.getExtension('WEBGL_debug_renderer_info');
  e.hijacker?.destroy();return{viewport:[1920,1080],renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable',scenario:'Controlled real combat scene, world simulation frozen; animated tractor fields rendered every frame. CPU submission timing is not GPU execution time.',rows};
 });
 fs.writeFileSync('test-results/tractor-runtime/performance.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
