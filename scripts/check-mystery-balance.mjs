import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import { chromium } from 'playwright';
import { mkdirSync,writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.CHECK_OUTPUT_DIR||'test-results/mysteries/balance';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const rows=[];
try{
 for(const id of (process.env.MYSTERY_IDS||'glass_widow,siege_orchid,choir_unbound,witness').split(',')){
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>/^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(r.request().url())?r.continue():r.abort());
  await page.addInitScript(id=>{window.__novaEncounterTest={getPreset:async()=>`mystery:${id}`};},id);
  await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5213'}/?skipIntro=1&offlineLeaderboard=1`,{waitUntil:'domcontentloaded',timeout:120000});
 await launchEncounterTestFromHangar(page);
  await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.mysteryDirector?.active,null,{timeout:120000});
  await page.evaluate(()=>{
    const g=window.__game,p=g.scenes.play,m=p.enemyManager,e=m.mysteryDirector.active;
    const start=performance.now(),probe=window.__mysteryProbe={start,id:e.type,hp:e.health,sector:g.level,frames:[],damage:0,hits:0,attacks:0,lives:g.lives};
    const take=e.takeDamage.bind(e);e.takeDamage=n=>{const old=e.health,result=take(n);probe.damage+=old-e.health;if(result)probe.killedAt=(performance.now()-start)/1000;return result;};
    // Upper bound on offense: real player shots and movement, incoming damage ignored explicitly.
    p.isDebugInvincibleActive=()=>true;p.inputManager.isFiring=()=>true;
    p.inputManager.getMouseSteeringIntent=(x,y)=>({active:true,moveX:Math.max(-1,Math.min(1,(e.x-x)/70)),moveY:Math.max(-1,Math.min(1,(g.getHeight()*.82-y)/30))});
    const tick=()=>{const now=performance.now();if(probe.last)probe.frames.push(now-probe.last);probe.last=now;
      probe.attacks=e.stats.attacks;probe.outcome=e.stats.outcome;
      if(e.active)requestAnimationFrame(tick);else probe.done=true;};requestAnimationFrame(tick);
  });
  await page.waitForFunction(()=>window.__mysteryProbe.done,null,{timeout:85000});
  const row=await page.evaluate(()=>{const p=window.__mysteryProbe,frames=p.frames.slice(180).sort((a,b)=>a-b);return{...p,frames:undefined,last:undefined,start:undefined,frameCount:frames.length,mean:frames.reduce((a,b)=>a+b,0)/frames.length,p95:frames[Math.floor(frames.length*.95)],max:Math.max(...frames)};});
  await page.screenshot({path:`${out}/${id}-end.png`});assert.deepEqual(errors,[]);rows.push(row);writeFileSync(`${out}/results.json`,JSON.stringify(rows,null,2));console.log(JSON.stringify(row));await page.close();
 }
}finally{await browser.close();}
