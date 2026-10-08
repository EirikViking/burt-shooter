import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 let rejectLaunch;const failure=new Promise((_,reject)=>rejectLaunch=reject);
 page.on('console',e=>{if(e.type()==='error'){errors.push(e.text());rejectLaunch(Error(e.text()));}});
 page.on('pageerror',e=>{errors.push(e.message);rejectLaunch(e);});
 await page.route('**/art/encounter-premium/*.png',async route=>{await new Promise(resolve=>setTimeout(resolve,1500));await route.continue();});
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4899'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=orbit-breaker`);
 await Promise.race([failure,page.waitForFunction(()=>window.__game?.scenes.play?.encounterExpansionTestReady,null,{timeout:90000})]);
 const result=await page.evaluate(()=>{const s=window.__game.scenes.play;window.__game.app.ticker.stop();return{ready:s.isReady,prototype:s.game.runPolicy.prototype,hammer:!!s.player.orbitBreaker};});
 assert(result.ready&&result.prototype&&result.hammer);assert.deepEqual(errors,[]);
 console.log('[premium-prewarm-runtime] PASS delayed art admission, fresh renderer launch, progression-free hammer');
}finally{await browser.close();}
