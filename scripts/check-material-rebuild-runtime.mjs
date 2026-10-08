import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;if(!out?.startsWith('E:'))throw Error('E: output required');mkdirSync(out,{recursive:true});
const baseline=process.env.MATERIAL_BASELINE==='1';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4942'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete&&window.__game.scenes.play.gameplayBackdrop,null,{timeout:120000});
 await page.waitForTimeout(1000);
 const result=await page.evaluate(async baseline=>{
  const g=window.__game,s=g.scenes.play,p=s.player;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe test policy');
  const{AssetManifest}=await import('/src/assets/assetManifest.js');
  const{getAstraHullTexture,astraMaterialStats}=await import('/src/effects/AstraHullMaterial.js');
  const{createAstraEnginePlume}=await import('/src/effects/AstraEnginePlume.js');
  const{GameAssets}=await import('/src/utils/GameAssets.js');
  const{setReducedMotionEnabled,setFlashIntensityScale}=await import('/src/config/AccessibilitySettings.js');
  const score=g.score,radius=p.radius,texture=p.shipSprite.texture;
  if(!baseline&&(!String(texture.source.label).includes('scout')&&!String(texture.source.resource?.src).includes('scout')))throw Error('New Scout texture not used');
  if(!baseline&&s.sectorWorldActiveSource!==AssetManifest.generated.sectorWorlds[0])throw Error('Wrong first world');
  const rng=Math.random;Math.random=()=>{throw Error('Presentation consumed RNG');};
  let shared;
  try{
   if(getAstraHullTexture(texture)!==getAstraHullTexture(texture))throw Error('Material cache unstable');
   const a=createAstraEnginePlume(),b=createAstraEnginePlume();shared=a.texture===b.texture;a.destroy();b.destroy();
  }finally{Math.random=rng;}
  if(!shared||astraMaterialStats.failures)throw Error('Material/plume cache failure');
  if(!baseline){await GameAssets.ensureRankShipTexture(1);const other=GameAssets.getRankShipTexture(1);if(!other||other.width!==512||other.height!==512||GameAssets.getRankShipTexture(1)!==other)throw Error('Other hull lost registration or cache identity');}
  s.gameplayBackdropElapsedMs=0;s.layoutGameplayBackdrops?.();s.updateGameplayBackdrop?.(0);
  p.x=g.getWidth()*.5;p.y=g.getHeight()*.8;p.sprite.position.set(p.x,p.y);p.sprite.alpha=1;
  s.hud.update();g.app.render();
  window.__materialFixture={score,radius,texture,sources:AssetManifest.generated.sectorWorlds};
  return{score,radius,source:s.sectorWorldActiveSource,material:{...astraMaterialStats},plumeShared:shared,policy:g.runPolicy};
 },baseline);
 await page.screenshot({path:path.join(out,'gameplay.png')});
 if(!baseline){
  for(const [index,name]of [[1,'volcanic'],[2,'ice']]){
   await page.evaluate(async index=>{const s=window.__game.scenes.play;s.updateSectorWorld(index*5+1);await s.sectorWorldLoadQueue;s.updateGameplayBackdrop(0);window.__game.app.render();},index);
   await page.screenshot({path:path.join(out,`${name}-gameplay.png`)});
  }
  const accessibility=await page.evaluate(async()=>{
   const g=window.__game,s=g.scenes.play,f=window.__materialFixture;
   const{setReducedMotionEnabled,setFlashIntensityScale}=await import('/src/config/AccessibilitySettings.js');
   s.updateSectorWorld(1);await s.sectorWorldLoadQueue;setReducedMotionEnabled(true);setFlashIntensityScale(0);s.updateGameplayBackdrop(0);const clock=s.gameplayBackdropElapsedMs;
   s.isPaused=true;s.update(1);if(s.gameplayBackdropElapsedMs!==clock)throw Error('Pause moved backdrop');s.isPaused=false;
   s.updateGameplayBackdrop(0);g.app.render();
   if(g.score!==f.score||s.player.radius!==f.radius)throw Error('Presentation changed combat');
   setReducedMotionEnabled(false);setFlashIntensityScale(1);return{pauseFrozen:true,scoreNeutral:true,radiusUnchanged:true};
  });result.accessibility=accessibility;
  await page.screenshot({path:path.join(out,'reduced-motion.png')});
 }
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',baseline,result,errors},null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
