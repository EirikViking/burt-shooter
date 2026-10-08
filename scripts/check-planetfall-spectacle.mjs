import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';

const out=process.env.CHECK_OUTPUT_DIR;
assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],rows=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',error=>errors.push(error.message));
 for(const reduced of [false,true]){
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=planetfall`);
  await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.boss?.isPlanetfall,null,{timeout:90000});
  const intact=await page.evaluate(async reduced=>{
   const g=window.__game,s=g.scenes.play,b=s.enemyManager.boss;
   g.app.ticker.stop();s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;
   const settings=await import('/src/config/AccessibilitySettings.js');
   settings.setReducedMotionEnabled(reduced);settings.setFlashIntensityScale(reduced?0:1);
   for(let i=0;i<205;i++)b.update(1);
   window.__spectacle={b,positions:b.components.map(c=>({x:c.x,y:c.y})),budget:b.maxHealth,children:b.visual.root.children.length};
   g.app.render();
   return {keels:b.visual.keelSegments?.length||0,plates:b.visual.segments.length,
    behind:b.visual.keelSegments?.every(k=>b.visual.root.getChildIndex(k.sprite)<b.visual.root.getChildIndex(b.visual.segments[0].sprite)),
    depth:b.visual.keelSegments?.every((k,i)=>k.sprite.y>b.visual.segments[i].sprite.y),children:b.visual.root.children.length};
  },reduced);
  assert.equal(intact.keels,32,'the ring needs a complete textured structural underside');
  assert(intact.behind&&intact.depth,'underside stays behind the target-facing hull');
  await page.screenshot({path:path.join(out,`intact-${reduced?'reduced':'normal'}.png`)});
  const fracture=await page.evaluate(()=>{
   const {b,positions,budget,children}=window.__spectacle,g=window.__game;
   const warning=JSON.stringify(b.planetfall.warning),shots=b.shots.length;
   b.visual.update(1);const pure=warning===JSON.stringify(b.planetfall.warning)&&shots===b.shots.length;
   b.hitComponent(b.components[0],budget);for(let i=0;i<9;i++)b.update(1);g.app.render();
   return {pure,positionsUnchanged:b.components.every((c,i)=>c.x===positions[i].x&&c.y===positions[i].y),budget:b.maxHealth,
    started:b.visual.segments.filter(p=>p.quadrant===0&&p.fractureProgress>0).map(p=>p.index),
    liveJets:b.visual.fractureJets.filter(s=>s.visible&&s.alpha>0).length,
    sparks:b.visual.sparkCount,childrenStable:children===b.visual.root.children.length};
  });
  assert(fracture.pure&&fracture.positionsUnchanged&&fracture.childrenStable);
  assert(fracture.started.includes(3)&&fracture.started.includes(4));
  assert(!fracture.started.includes(0)&&!fracture.started.includes(7),'failure travels outward from the anchor');
  assert(fracture.liveJets<=32&&fracture.sparks<=64);
  if(reduced)assert.equal(fracture.liveJets+fracture.sparks,0,'Flash 0 suppresses local bursts and sparks');
  else assert(fracture.liveJets>0,'damage wave has a local rupture cue');
  await page.screenshot({path:path.join(out,`fracture-${reduced?'reduced':'normal'}.png`)});
  const ending=await page.evaluate(()=>{
   const g=window.__game,s=g.scenes.play,m=s.enemyManager,b=window.__spectacle.b;
   for(let i=0;i<126;i++)b.update(1);
   const quadrantGone=b.visual.segments.filter(p=>p.quadrant===0).every(p=>!p.sprite.visible)
    &&b.visual.keelSegments.filter(p=>p.quadrant===0).every(p=>!p.sprite.visible);
   for(const c of b.components.slice(0,4))if(c.active)b.hitComponent(c,b.maxHealth);
   for(let i=0;i<140;i++)b.update(1);
   b.hitComponent(b.components[4],b.maxHealth);
   const effect=[...m.breachCollapses][0];for(let i=0;i<18;i++)effect.update(1);g.app.render();
   const state={quadrantGone,corePieces:effect.fragments.filter(p=>p.index>=32&&p.index<39).length,
    charges:effect.charges?.length||0,brightCharges:effect.charges?.filter(c=>c.sprite.alpha>0).length||0,
    activeParts:b.components.filter(c=>c.active).length,liveSpriteVisible:b.sprite.visible};
   window.__spectacle.effect=effect;return state;
  });
  assert(ending.quadrantGone,'a stagger must not extend the existing 2.2 second quadrant deadline');
  assert(ending.corePieces>=7&&ending.charges>=1);assert.equal(ending.activeParts,0);
  assert.equal(ending.liveSpriteVisible,false,'the finite aftermath replaces the live hull and phase label');
  if(reduced)assert.equal(ending.brightCharges,0);else assert(ending.brightCharges>0);
  await page.screenshot({path:path.join(out,`collapse-${reduced?'reduced':'normal'}.png`)});
  const cleanup=await page.evaluate(()=>{
   const {b,effect}=window.__spectacle,m=window.__game.scenes.play.enemyManager,source=b.visual.cradle.texture.source;
   m.clearEnemies();for(let i=0;i<240&&!effect.done;i++)effect.update(1);
   return {done:effect.done,rootDestroyed:effect.root.destroyed,sourceAlive:!source.destroyed,effects:m.breachCollapses?.size||0};
  });
  assert(cleanup.done&&cleanup.rootDestroyed&&cleanup.sourceAlive);assert.equal(cleanup.effects,0);
  rows.push({reduced,intact,fracture,ending,cleanup});
 }
 assert.deepEqual(errors,[]);
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'pass',scope:'Actual source runtime structure, fracture timing, unchanged targets/warnings, accessibility and finite ownership; not human quality judgment',rows,errors},null,2));
 console.log('[planetfall-spectacle] PASS layered hull, traveling fracture, core aftermath, accessibility and teardown');
}finally{await browser.close();}
