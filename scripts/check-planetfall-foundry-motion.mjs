import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],rows=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=planetfall`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.boss?.visual?.foundry?.ready,null,{timeout:90000});
 await page.evaluate(()=>window.__game.app.ticker.stop());
 for(const [index,width,height,reduced,flash] of [[0,1280,720,false,1],[1,390,844,true,0],[2,1920,1080,false,0]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(150);
  const state=await page.evaluate(async({index,reduced,flash})=>{
   const g=window.__game,s=g.scenes.play,m=s.enemyManager,settings=await import('/src/config/AccessibilitySettings.js');
   settings.setReducedMotionEnabled(reduced);settings.setFlashIntensityScale(flash);settings.setScreenShakeScale(0);
   // This fixed-step harness must run the viewport work normally owned by PlayScene's ticker.
   s.screenShake.update(60);s.screenShake.update(60);s.applyGameplayViewportTransform();
   if(index){m.clearEnemies();m.clearPendingWaveSpawns();await m.spawnBoss(10);}
   const b=m.boss,v=b.visual.foundry;s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;
   for(let i=0;i<240;i++)b.update(1);
   const alignment=[];
   for(const recoil of [false,true]){
    if(recoil)b.visual.recoilAt=b.planetfall.age-.12;b.visual.update(1);g.app.render();
    for(const [i,c]of b.components.entries()){
     const object=i===4?v.plasma:v.anchors[i].inner.children[0];
     object.geometry.computeBoundingBox();const point=object.geometry.boundingBox.getCenter(v.station.position.clone());
     object.localToWorld(point);point.project(v.camera);
     const rendered=b.visual.foundrySprite.toGlobal({x:(point.x+1)*v.canvas.width/2,y:(1-point.y)*v.canvas.height/2});
     const collision=c.sprite.toGlobal({x:0,y:0});alignment.push(Math.hypot(rendered.x-collision.x,rendered.y-collision.y));
    }
   }
   const gl=g.app.canvas.getContext('webgl2'),pixel=new Uint8Array(4),markers=[];
   for(const anchor of v.anchors)anchor.group.traverse(object=>{
    if(!object.material)return;const original=object.material,marker=original.clone();
    marker.color.setHex(0xff00ff);marker.emissive.setHex(0xff00ff);marker.emissiveIntensity=1;marker.toneMapped=false;
    markers.push([object,original,marker]);object.material=marker;
   });
   v.render();b.visual.foundrySprite.texture.source.update();g.app.render();const composedTargets=[];
   for(const c of b.components.slice(0,4)){
    const point=c.sprite.toGlobal({x:0,y:0}),resolution=g.app.renderer.resolution;
    gl.readPixels(Math.round(point.x*resolution),g.app.canvas.height-1-Math.round(point.y*resolution),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    composedTargets.push([...pixel]);
   }
   for(const [object,original,marker]of markers){object.material=original;marker.dispose();}v.render();
   if(!v.frameSections||v.frameSections.length!==8)throw Error('Missing eight independent containment frame sections');
   const context=v.renderer.getContext(),sprite=b.visual.foundrySprite,canvas=v.canvas,mainContext=g.app.canvas.getContext('webgl2');
   b.hitComponent(b.components[4],b.maxHealth);const effect=b.collapse;
   if(effect.foundry!==v||effect.foundrySprite!==sprite||effect.foundry.canvas!==canvas||b.visual.foundry)throw Error('Ownership transfer changed resources');
   const pose=()=>v.frameSections.map(p=>[...p.group.position.toArray(),...p.group.rotation.toArray().slice(0,3)]);
   const initial=JSON.stringify(pose()),frames=[],images=[];let changed=false,flashed=false,fadeAlpha=null;
   for(let i=0;i<220;i++){
    effect.update(1);changed||=JSON.stringify(pose())!==initial;
    flashed||=flash===0&&(v.coreLight.intensity!==0||v.plasma.visible||effect.burst.alpha!==0||effect.charges.some(c=>c.sprite.alpha!==0));
    if(i===20){
     s.isPaused=true;const age=effect.age,before=JSON.stringify(pose()),pixels=v.canvas.toDataURL();effect.update(60);
     if(effect.age!==age||before!==JSON.stringify(pose())||pixels!==v.canvas.toDataURL())throw Error('Paused collapse advanced');s.isPaused=false;
    }
    if([0,72,144,216].includes(i)){
     if(index===0&&i===144){
      const target=v.frameSections[6].group.children[0],visibility=[];
      v.scene.traverse(object=>{if(object.isMesh){visibility.push([object,object.visible]);object.visible=object===target;}});
      v.render();const pixels=v.context.getImageData(0,0,v.canvas.width,v.canvas.height).data;
      fadeAlpha=0;for(let j=3;j<pixels.length;j+=4)fadeAlpha=Math.max(fadeAlpha,pixels[j]);
      for(const [object,visible]of visibility)object.visible=visible;v.render();
     }
     g.app.render();images.push(g.app.canvas.toDataURL());
     frames.push({age:effect.age,visible:v.frameSections.filter(p=>p.group.visible).length,opacity:v.frameSections.map(p=>p.materials[0].opacity)});
    }
   }
   const detached=v.frameSections.every(p=>p.materials[0].opacity<.01);
   for(let i=0;i<20&&!effect.done;i++)effect.update(1);effect.destroy();effect.destroy();b.destroy();
   await new Promise(resolve=>setTimeout(resolve,100));g.app.render();
   return {index,reduced,flash,alignment,composedTargets,changed,flashed,detached,frames,images,fadeAlpha,done:effect.done,disposed:v.disposed,
    released:context.isContextLost(),mainAlive:mainContext===g.app.canvas.getContext('webgl2')&&!mainContext.isContextLost(),effects:m.breachCollapses.size};
  },{index,reduced,flash});
  assert(Math.max(...state.alignment)<2,JSON.stringify(state.alignment));assert.equal(state.changed,!reduced);
  assert(state.composedTargets.every(([r,g,b])=>r>200&&g<80&&b>200),`Missing composed target pixels: ${JSON.stringify(state.composedTargets)}`);
  if(index===0)assert(state.fadeAlpha>0&&state.fadeAlpha<220,`Rendered section must fade: alpha=${state.fadeAlpha}`);
  assert(!state.flashed&&state.detached&&state.done&&state.disposed&&state.released&&state.mainAlive);assert.equal(state.effects,0);rows.push(state);
  state.images.forEach((data,i)=>writeFileSync(path.join(out,`collapse-${width}-${i}.png`),Buffer.from(data.split(',')[1],'base64')));delete state.images;
 }
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'pass',rows,errors},null,2));
 console.log('[planetfall-foundry-motion] PASS projected targets, articulated breakup, reduced motion, pause and three ownership cycles');
}finally{await browser.close();}
