import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.replaceAll('\\','/').startsWith('E:/'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.CHECK_URL+'/?offlineLeaderboard=1');
 await page.waitForFunction(()=>window.__game?.scenes.menu?.backdrop?.texture&&document.body.dataset.menuReady==='1',null,{timeout:120000});
 const before=await page.evaluate(async()=>{
  const {AstraDetonation,loadDetonationFrames}=await import('/src/effects/AstraDetonation.js');
  const g=window.__game;g.app.ticker.stop();g.currentScene.container.visible=false;
  const root=new g.currentScene.container.constructor();g.app.stage.addChild(root);
  const d=new AstraDetonation(root);await loadDetonationFrames();
  const constructorVisible=d.pool.filter(c=>c.visible).length;await d.prepare(g.app.renderer);
  window.__poolVisibility={root,d};g.app.render();
  return{constructorVisible,preparedVisible:d.pool.filter(c=>c.visible).length,pool:d.pool.length,active:d.active.length};
 });
 await page.screenshot({path:path.join(out,'prepared-idle.png')});
 const active=await page.evaluate(()=>{
  const g=window.__game,d=window.__poolVisibility.d;d.emit(640,360,1,true);d.update(9);g.app.render();
  return{active:d.active.length,visible:d.active[0].display.visible,pooledVisible:d.pool.filter(c=>c.visible).length};
 });
 await page.screenshot({path:path.join(out,'active-boss.png')});
 const retired=await page.evaluate(()=>{
  const g=window.__game,{d,root}=window.__poolVisibility;d.update(240);
  const expiryInvisible=d.active.length===0&&d.pool.every(c=>!c.visible);
  d.clear();const random=Math.random;let draws=0,peak=0,bounded=true;
  try{Math.random=()=>{draws++;throw Error('Visibility lifecycle consumed gameplay RNG');};
   for(let i=0;i<40;i++){d.emit(600+i,320,1);peak=Math.max(peak,d.active.length);bounded&&=d.active.length+d.pool.length===18;}
  }finally{Math.random=random;}
  const ordinaryVisible=d.active.every(e=>e.display.visible);d.clear();g.app.render();
  return{expiryInvisible,ordinaryVisible,clearedInvisible:d.active.length===0&&d.pool.every(c=>!c.visible),pool:d.pool.length,draws,peak,bounded};
 });
 await page.screenshot({path:path.join(out,'retired-idle.png')});
 await page.evaluate(()=>{window.__poolVisibility.d.destroy();window.__poolVisibility.root.destroy({children:true});});
 writeFileSync(path.join(out,'report.json'),JSON.stringify({before,active,retired,errors},null,2));
 assert.equal(before.constructorVisible,0,'Untriggered constructor pool must be invisible');
 assert.equal(before.preparedVisible,0,'GPU preparation must not expose idle effects');assert.equal(before.pool,18);assert.equal(before.active,0);
 assert.equal(active.active,1);assert(active.visible);assert.equal(active.pooledVisible,0);
 assert(retired.expiryInvisible&&retired.ordinaryVisible&&retired.clearedInvisible&&retired.bounded);assert.equal(retired.pool,18);assert.equal(retired.draws,0);assert.equal(retired.peak,18);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,before,active,retired,errors}));
}finally{await browser.close();}
