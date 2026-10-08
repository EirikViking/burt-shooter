import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=planetfall`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.boss?.visual?.foundry?.ready,null,{timeout:90000});
 const partial=await page.evaluate(async()=>{
  const g=window.__game;g.app.ticker.stop();const C=g.scenes.play.enemyManager.boss.visual.foundry.constructor;
  const original=HTMLCanvasElement.prototype.getContext,contexts=[];let n=0,caught=false;
  HTMLCanvasElement.prototype.getContext=function(type,...args){
   if(type==='2d'&&++n===2)throw Error('controlled surface failure');
   const context=original.call(this,type,...args);if(type==='webgl2'&&context&&!contexts.includes(context))contexts.push(context);return context;
  };
  try{new C();}catch(error){caught=error.message==='controlled surface failure';}finally{HTMLCanvasElement.prototype.getContext=original;}
  await new Promise(resolve=>setTimeout(resolve,100));
  return {caught,created:contexts.length,released:contexts.every(c=>c.isContextLost())};
 });
 assert(partial.caught&&partial.created===1&&partial.released,'Partial renderer initialization must release its context');
 const texture=await page.evaluate(async()=>{
  const g=window.__game,b=g.scenes.play.enemyManager.boss,proto=Object.getPrototypeOf(b.sprite),original=proto.addChildAt;let rejected;
  proto.addChildAt=function(child,index){if(child.texture?.source?.resource instanceof HTMLCanvasElement){rejected=child;throw Error('controlled Pixi attachment failure');}return original.call(this,child,index);};
  const candidate=new b.constructor(0,0,10,b.game,b.profile);
  try{await candidate.createSprite();}finally{proto.addChildAt=original;}
  const result={rejected:!!rejected,textureReleased:!!rejected?.destroyed,fallback:!candidate.visual.foundry&&candidate.visual.root.visible&&candidate.components.every(c=>c.body.visible)};
  candidate.destroy();return result;
 });
 assert.deepEqual(texture,{rejected:true,textureReleased:true,fallback:true});
 const combat=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,b=s.enemyManager.boss;
  s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;
  const context=b.visual.foundry.renderer.getContext();context.getExtension('WEBGL_lose_context').loseContext();
  await new Promise(resolve=>setTimeout(resolve,100));b.visual.update(1);g.app.render();
  return {lost:context.isContextLost(),fallback:b.visual.root.visible&&!b.visual.foundrySprite.visible&&b.components.every(c=>c.body.visible),mainAlive:!g.app.canvas.getContext('webgl2').isContextLost()};
 });
 assert.deepEqual(combat,{lost:true,fallback:true,mainAlive:true});
 const collapse=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,m=s.enemyManager;m.clearEnemies();m.clearPendingWaveSpawns();const b=await m.spawnBoss(10);
  s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;
  for(let i=0;i<205;i++)b.update(1);b.hitComponent(b.components[4],b.maxHealth);const effect=b.collapse,view=effect.foundry;
  const context=view.renderer.getContext();context.getExtension('WEBGL_lose_context').loseContext();
  await new Promise(resolve=>setTimeout(resolve,100));effect.update(1);g.app.render();
  const fallback=!effect.foundrySprite.visible&&effect.fragments.every(p=>p.sprite.visible);
  for(let i=0;i<240&&!effect.done;i++)effect.update(1);
  return {fallback,disposed:view.disposed,done:effect.done,mainAlive:!g.app.canvas.getContext('webgl2').isContextLost()};
 });
 assert.deepEqual(collapse,{fallback:true,disposed:true,done:true,mainAlive:true});assert.deepEqual(errors,[]);
 writeFileSync(path.join(out,'report.json'),JSON.stringify({status:'pass',partial,texture,combat,collapse,errors},null,2));
 console.log('[planetfall-foundry-failure] PASS partial init, attachment failure, actual context loss and visible fallback');
}finally{await browser.close();}
