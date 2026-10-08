import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],rows=[];
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 page.on('console',message=>{if(message.type()==='error'&&/THREE|WebGL|shader|INVALID_/i.test(message.text()))errors.push(message.text());});
 for(const [width,height,reduced] of [[1280,720,false],[390,844,true]]){
  await page.setViewportSize({width,height});
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=planetfall`);
  await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.boss?.isPlanetfall,null,{timeout:90000});
  const state=await page.evaluate(async reduced=>{
   const g=window.__game,s=g.scenes.play,b=s.enemyManager.boss;g.app.ticker.stop();
   s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;
   const settings=await import('/src/config/AccessibilitySettings.js');settings.setReducedMotionEnabled(reduced);settings.setFlashIntensityScale(reduced?0:1);
   if(!b.visual.foundry?.ready)throw Error('Missing solid foundry render adapter');
   const v=b.visual.foundry,positions=b.components.map(c=>[c.x,c.y]);
   for(let i=0;i<60;i++)b.update(1);const assembly=v.sectors.map(p=>[...p.group.position.toArray(),...p.group.rotation.toArray().slice(0,3)]);
   for(let i=0;i<150;i++)b.update(1);g.app.render();
   const pixels=v.context.getImageData(0,0,v.canvas.width,v.canvas.height).data;let visible=0;const colors=new Set();
   for(let i=0;i<pixels.length;i+=64)if(pixels[i+3]>32){visible++;colors.add(`${pixels[i]>>3}:${pixels[i+1]>>3}:${pixels[i+2]>>3}`);}
   const warning=JSON.stringify(b.planetfall.warning);b.visual.update(1);
   window.__foundryCheck={v,b,positions};
   return {ready:v.ready,visible,colors:colors.size,calls:v.renderer.info.render.calls,triangles:v.renderer.info.render.triangles,
    sectors:v.sectors.length,bridges:v.bridges.length,assemblyMoved:JSON.stringify(assembly)!==JSON.stringify(v.sectors.map(p=>[...p.group.position.toArray(),...p.group.rotation.toArray().slice(0,3)])),
    targetStable:b.components.every((c,i)=>c.x===positions[i][0]&&c.y===positions[i][1]),warningStable:warning===JSON.stringify(b.planetfall.warning),canvas:[v.canvas.width,v.canvas.height]};
  },reduced);
  assert(state.ready&&state.visible>300&&state.colors>50,JSON.stringify(state));assert.equal(state.sectors,32);assert.equal(state.bridges,4);
  assert(state.targetStable&&state.warningStable);if(!reduced)assert(state.assemblyMoved);
  assert(state.calls<450&&state.triangles<200000,'Bound the composed render workload');
  await page.screenshot({path:path.join(out,`foundry-${width}.png`)});
  const ending=await page.evaluate(()=>{
   const {b,v}=window.__foundryCheck,g=window.__game,m=g.scenes.play.enemyManager;
   b.hitComponent(b.components[0],b.maxHealth);for(let i=0;i<45;i++)b.update(1);g.app.render();
   const articulated=v.sectors.filter(p=>p.quadrant===0).some(p=>Math.abs(p.group.rotation.y)>.2);
   for(let i=0;i<130;i++)b.update(1);const expired=v.sectors.filter(p=>p.quadrant===0).every(p=>!p.group.visible);
   for(let i=0;i<450&&!b.planetfall.irisOpen;i++)b.update(1);
   b.hitComponent(b.components[4],b.maxHealth);const collapse=b.collapse;
   const transferred=collapse.foundry===v&&!b.visual.foundry;
   for(let i=0;i<240&&!collapse.done;i++)collapse.update(1);
   return {articulated,expired,transferred,disposed:v.disposed,done:collapse.done,effects:m.breachCollapses.size};
  });
  if(!reduced)assert(ending.articulated);assert(ending.expired&&ending.transferred&&ending.disposed&&ending.done);assert.equal(ending.effects,0);
  rows.push({width,height,reduced,state,ending});
 }
 assert.deepEqual(errors,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'pass',rows,errors,scope:'Actual composed Three/Pixi runtime pixels, motion, stationary targets, finite transfer and teardown. Visual quality still requires inspection.'},null,2));
 console.log('[planetfall-foundry] PASS solid runtime, articulation, pixel checks and ownership');
}finally{await browser.close();}
