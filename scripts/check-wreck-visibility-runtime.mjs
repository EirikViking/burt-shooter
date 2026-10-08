import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4970'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete,null,{timeout:90000});
 const result=await page.evaluate(async()=>{const g=window.__game,s=g.scenes.play;g.app.ticker.stop();if(!g.runPolicy.prototype)throw Error('Unsafe fixture');
  const {CombatWreckVisual}=await import('/src/effects/CombatWreckVisual.js');
  const texture=s.player.shipSprite.texture,record={active:true,age:0,x:500,y:250,texture},manager={container:s.gameContainer,combatWrecks:{records:[record]}};
  const view=new CombatWreckVisual(manager);view.update();const unclaimed=view.views.size;
  record.owner={};view.update();const claimed=view.views.size;
  record.owner=null;view.update();const released=view.views.size;
  record.cover=true;view.update();const cover=view.views.size;
  record.active=false;view.update();const cleared=view.views.size;view.destroy();
  return{unclaimed,claimed,released,cover,cleared,sharedTextureAlive:!texture.destroyed};});
 writeFileSync(path.join(out,'report.json'),JSON.stringify({result,errors},null,2));
 assert.deepEqual(result,{unclaimed:0,claimed:1,released:0,cover:1,cleared:0,sharedTextureAlive:true});assert.deepEqual(errors,[]);
 console.log('[wreck-visibility] PASS no idle remains; active claim/cover visible; shared texture and cleanup preserved');
}finally{await browser.close();}
