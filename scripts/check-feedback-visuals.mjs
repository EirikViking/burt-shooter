import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;
if(!out||!process.env.CHECK_URL)throw Error('Explicit task URL/output required');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.CHECK_URL+'/?autostart=1&offlineLeaderboard=1');
 await page.waitForFunction(()=>window.__game?.scenes?.play?.player,null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play;g.app.ticker.stop();p.isPaused=true;
  const {Bullet}=await import('/src/entities/Bullet.js');
  const Container=g.app.stage.constructor,Graphics=p.player.focusRing.constructor;
  const layer=new Container();layer.addChild(new Graphics().rect(0,0,1280,720).fill(0x091321));g.app.stage.addChild(layer);
  window.__feedbackVisualLayer=layer;
  const plain=new Bullet(220,150,0,-10,2,0xaa66dd,true),pierce=new Bullet(440,150,0,-10,2,0xaa66dd,true),shard=new Bullet(660,150,0,-10,2,0xaa66dd,true,{fusionShard:true});
  pierce.piercing=true;pierce.refreshPlayerProjectileIntentMarkers();
  const alphas=[],scales=[];for(let i=0;i<180;i++){pierce.update(.25);alphas.push(pierce.playerIntentLayer.alpha);scales.push(pierce.playerIntentLayer.scale.x);}pierce.sprite.position.set(440,150);
  for(const b of [plain,pierce,shard]){b.sprite.scale.set(3);layer.addChild(b.sprite);}
  const rows=[];
  for(let i=0;i<32;i++){
   const b=new Bullet(140+(i%16)*62,370+Math.floor(i/16)*58,0,-10,2,i%2?0xaa66dd:0x66eeee,true);b.piercing=true;b.refreshPlayerProjectileIntentMarkers();layer.addChild(b.sprite);rows.push(b);
   if(i%3===0){const hostile=new Bullet(b.x+22,b.y+12,0,3,1,0xff8866,false);layer.addChild(hostile.sprite);}
  }
  g.app.renderer.render(g.app.stage);
  return {plainCore:plain.core.width/3,pierceMarkers:pierce.playerIntentLayer.getLocalBounds().width,shardScale:shard.baseScale,plainScale:plain.baseScale,shardTrail:shard.trail.width,plainTrail:plain.trail.width,steadyAlpha:new Set(alphas).size,steadyScale:new Set(scales).size,markerBlend:pierce.playerIntentLayer.blendMode,primary:pierce.playerIntentLayer._debugIntentMarkers.primary};
 });
 assert.equal(result.steadyAlpha,1);assert.equal(result.steadyScale,1);assert.equal(result.markerBlend,'normal');assert.equal(result.primary,0xaa66dd);
 assert.ok(result.shardScale>result.plainScale&&result.shardScale<result.plainScale*1.5);assert.equal(result.shardTrail,34);assert.ok(result.plainTrail<=18);assert.ok(result.pierceMarkers<24);
 await page.screenshot({path:out+'/friendly-projectiles.png'});assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/visuals.json',JSON.stringify(result,null,2));console.log('[feedback-visuals] PASS',JSON.stringify(result));
}finally{await browser.close();}
