import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const out=process.env.CHECK_OUTPUT_DIR;
assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'));
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const compiled=process.env.ION_DRIVE_COMPILED==='1';
try {
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  if(compiled)await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=>'boss-snake'};});
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:4983'}/${compiled?'?offlineLeaderboard=1':'?autostart=1&offlineLeaderboard=1&encounterEvolution=molt'}`);
  if(compiled){
    await page.waitForFunction(()=>window.__game?.currentSceneName==='shipSelect'&&document.body.dataset.menuReady==='1',null,{timeout:120000});
    await page.evaluate(()=>window.__game.startGame(undefined,{countShipUsage:false}));
    await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.boss?.active&&window.__game.scenes.play.introComplete&&!window.__game.scenes.play.levelStartWarmupPending,null,{timeout:120000});
    await page.evaluate(()=>{const g=window.__game,s=g.scenes.play;g.app.ticker.stop();s.firstLightDirector.enabled=true;s.firstLightDirector.loadArt();});
  }
  await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.view,null,{timeout:120000});
  const result=await page.evaluate(async compiled=>{
    const g=window.__game,s=g.scenes.play;g.app.ticker.stop();
    if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe test policy');
    const FirstLightVisual=compiled?s.firstLightDirector.view.constructor:(await import('/src/effects/ArcadeFirstLightVisual.js')).FirstLightVisual;
    const view=new FirstLightVisual(s,s.firstLightDirector.view.art);
    const model={encounter:null,escorts:[-1,1].map(side=>({side,age:3,joinAge:1,rank:0,callsign:'TEST'}))};
    const tick=()=>view.update(model,1/60,s.gameplayGame.getWidth(),s.gameplayGame.getHeight(),s.player);
    tick();
    const jets=view.drives||view.plumes;
    const axes=jets.map(j=>{const root=j.root||j;const a=root.toGlobal({x:0,y:0}),b=root.toGlobal({x:1,y:0});return {dx:b.x-a.x,dy:b.y-a.y};});
    const count=jets.length,children=view.wing.children.length;
    for(let i=0;i<500;i++)tick();
    const bounded=view.wing.children.length===children;
    model.escorts=[];tick();const hidden=jets.every(j=>(j.root||j).visible===false);
    view.destroy();
    return {axes,count,bounded,hidden,policy:g.runPolicy};
  },compiled);
  writeFileSync(path.join(out,'report.json'),JSON.stringify({result,errors},null,2));
  for(const axis of result.axes)assert(axis.dy>0&&Math.abs(axis.dx)<.001,'Exhaust must point aft, not sideways');
  assert.equal(result.count,4,'Each rescued fighter has two visibly separate aft engines');
  assert(result.bounded&&result.hidden,'Pooled drives must be bounded and disappear when escorts leave');
  assert.deepEqual(errors,[]);
  console.log('[ion-drive-runtime] PASS aft orientation, twin mounts, finite nodes and escort cleanup');
}finally{await browser.close();}
