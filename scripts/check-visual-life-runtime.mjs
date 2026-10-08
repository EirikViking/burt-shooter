import assert from 'node:assert/strict';import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';import path from 'node:path';import{chromium}from'playwright';
const out=process.env.CHECK_OUTPUT_DIR;if(!out?.startsWith('E:'))throw Error('E: output required');mkdirSync(out,{recursive:true});
const url=process.env.CHECK_URL||'http://127.0.0.1:4932';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(`${url}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete&&window.__game.scenes.play.planetVignettes,null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play;g.app.ticker.stop();if(!g.runPolicy.prototype)throw Error('Unsafe test route');
  const {AstraDetonation,loadDetonationFrames}=await import('/src/effects/AstraDetonation.js');
  const{EXPLOSION_ANIMATIONS}=await import('/src/effects/ExplosionChoreography.js');
  const{PLANET_VIGNETTES}=await import('/src/config/PlanetVignettes.js');
  const{setReducedMotionEnabled,setFlashIntensityScale}=await import('/src/config/AccessibilitySettings.js');
  await loadDetonationFrames();const Container=s.uiOverlay.constructor,d=new AstraDetonation(new Container());await d.prepare(g.app.renderer);
  const rng=Math.random;Math.random=()=>{throw Error('Cosmetic consumed gameplay RNG');};let ids=[],peak=0,poolStable=true;
  try{
   for(let i=0;i<120;i++){d.clear();d.emit(100,100,1);ids.push(d.active[0].choreography.id);d.update(12);d.update(120);if(d.active.length)throw Error('Endless explosion');}
   d.clear();d.emit(100,100,1,true);d.emit(101,100,1,true);if(d.active.length!==1)throw Error('Duplicate boss');
   d.clear();for(let i=0;i<240;i++){d.emit(800,800,1);d.update(.01);peak=Math.max(peak,d.active.length);poolStable&&=d.active.length+d.pool.length===18;}
   d.update(200);if(d.active.length)throw Error('Burst cleanup failed');
   setReducedMotionEnabled(true);setFlashIntensityScale(0);d.emit(100,100,1,true);d.update(12);
   if(d.active[0].display.embers.some(e=>e.alpha!==0)||d.active[0].display.reactor.visible)throw Error('Accessibility accents still active');d.clear();
   setReducedMotionEnabled(false);setFlashIntensityScale(1);
   const v=s.planetVignettes,w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight(),snapshots=[];
   for(let i=0;i<48;i++){v.setLevel(i*5+1);v.age=10;v.update(0,w,h);snapshots.push(v.getDebugState());if(v.actors.filter(a=>a.visible).length!==PLANET_VIGNETTES[i].actors.length)throw Error('Planet actors mismatch');}
   v.setLevel(1);v.age=10;v.update(0,w,h);const positions=v.actors.map(a=>[a.x,a.y,a.rotation]);v.update(0,w,h);if(JSON.stringify(positions)!==JSON.stringify(v.actors.map(a=>[a.x,a.y,a.rotation])))throw Error('Zero delta moves background');
   const normal=v.alpha;v.update(0,w,h,{warning:true,pressure:1});if(v.alpha>=normal*.33)throw Error('Busy combat did not suppress vignette');
   v.update(0,w,h,{reduced:true});const calm=v.actors.map(a=>[a.x,a.y,a.rotation]);v.update(1,w,h,{reduced:true});if(JSON.stringify(calm)!==JSON.stringify(v.actors.map(a=>[a.x,a.y,a.rotation])))throw Error('Reduced Motion tableau moves');
   const score=g.score,seen=g.mysteriesSeen?.length||0;v.setLevel(51);v.age=10;v.update(1,w,h);if(g.score!==score||(g.mysteriesSeen?.length||0)!==seen)throw Error('Background changed gameplay');
   window.__visualLife={AstraDetonation,EXPLOSION_ANIMATIONS,PLANET_VIGNETTES};
   return{animations:new Set(ids).size,peak,poolStable,planets:snapshots.length,scoreNeutral:true,prototype:g.runPolicy.prototype};
  }finally{Math.random=rng;setReducedMotionEnabled(false);setFlashIntensityScale(1);d.clear();}
 });
 assert.equal(result.animations,120);assert.equal(result.peak,18);assert(result.poolStable);assert.equal(result.planets,48);
 // Actual Pixi renderer gallery: twelve shapes, staged in an isolated run.
 await page.evaluate(()=>{const g=window.__game,s=g.scenes.play;s.gameContainer.visible=false;s.uiOverlay.visible=false;const root=new s.container.constructor();g.app.stage.addChild(root);window.__visualLife.root=root;window.__visualLife.gallery=[];
  for(let i=0;i<12;i++){const d=new window.__visualLife.AstraDetonation(root);d.sequence=(i*10*13)%120;d.emit(110+(i%4)*350,90+Math.floor(i/4)*230,3);const e=d.active[0];e.choreography=window.__visualLife.EXPLOSION_ANIMATIONS[i*10];e.pixels=260;e.age=e.lifetime*.3;d.draw(e);window.__visualLife.gallery.push(d);}g.app.renderer.render(g.app.stage);});
 await page.screenshot({path:path.join(out,'explosion-shapes.png')});
 await page.evaluate(()=>{const q=window.__visualLife;for(const d of q.gallery)d.clear();q.root.removeChildren();const d=new q.AstraDetonation(q.root);d.emit(640,330,1,true);d.update(22);q.boss=d;window.__game.app.renderer.render(window.__game.app.stage);});
 await page.screenshot({path:path.join(out,'boss-collapse.png')});
 await page.evaluate(()=>{const q=window.__visualLife;q.boss.clear();q.root.destroy({children:true});const g=window.__game,s=g.scenes.play;s.gameContainer.visible=true;s.uiOverlay.visible=true;s.planetVignettes.setLevel(1);s.planetVignettes.age=11;s.planetVignettes.update(0,s.gameplayGame.getWidth(),s.gameplayGame.getHeight());g.app.renderer.render(g.app.stage);});
 await page.screenshot({path:path.join(out,'planet-whale-gameplay.png')});
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'passed',result,errors},null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
