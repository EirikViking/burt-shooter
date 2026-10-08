import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;
assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],runs=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 for(let i=0;i<5;i++){
  await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete&&window.__game.currentSceneName==='play',null,{timeout:120000});
  const result=await page.evaluate(async()=>{
   const g=window.__game,s=g.scenes.play;g.app.ticker.stop();await s.combatMaterialWarmup;
   if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe soak policy');
   const pm=s.particleManager,root=pm.premiumImpacts.root,mesh=pm.hullBreakup.bossPieces[0].mesh;
   for(let j=0;j<30;j++)pm.createExplosion(80+j*30,220,0xff6600,1);
   const displays=[...pm.detonations.pool,...pm.detonations.active.map(e=>e.display)];
   const childCount=s.gameContainer.children.length,texture=s.player.shipSprite.texture;
   g.switchScene('menu');
   const destroyed=root.destroyed&&mesh.destroyed&&displays.every(d=>d.destroyed)&&pm.pool.length===0&&pm.particles.length===0;
   const sharedAlive=!texture.destroyed;
   if(!destroyed||!sharedAlive)throw Error('Effects survived repeated teardown or lost shared assets');
   return{destroyed,sharedAlive,childCount,detonationDisplays:displays.length};
  });
  runs.push(result);
  if(i<4)await page.evaluate(async()=>{const g=window.__game;g.app.ticker.start();await g.startGame(g.selectedSpriteKey,{countShipUsage:false});});
 }
 assert.deepEqual(errors,[]);
 assert(runs.every(r=>r.detonationDisplays===18));
 assert(Math.max(...runs.map(r=>r.childCount))-Math.min(...runs.map(r=>r.childCount))<25,'Display children grow across fresh runs');
 writeFileSync(`${out}/report.json`,JSON.stringify({runs,errors,scope:'Five real launch/teardown cycles with capped active effects; display/resource lifecycle test, not a hardware memory measurement'},null,2));
 console.log('[optimization] PASS five real retry cycles, finite pools, shared textures, no display accumulation');
}finally{await browser.close();}
