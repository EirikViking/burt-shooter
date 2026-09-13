import {chooseEncounterTestShip,launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
const exe=process.env.NOVA_SWARM_PACKAGED_EXE;
const out=process.env.CHECK_OUTPUT_DIR || (exe?'test-results/mystery-tour/packaged':'test-results/mystery-tour'); fs.mkdirSync(out,{recursive:true});
let child,browser,page;
if(exe){
 child=spawn(exe,['--windowed','--remote-debugging-port=5239','--nova-mystery-test=all'],{windowsHide:true,env:{...process.env,NOVA_SWARM_DISABLE_STEAMWORKS:'1'},stdio:'ignore'});
 for(let i=0;i<90;i++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:5239');break;}catch{}await new Promise(r=>setTimeout(r,500));}
 if(!browser){child.kill();throw Error('Packaged endpoint unavailable');}
 page=browser.contexts()[0].pages()[0];await page.setViewportSize({width:1920,height:1080});await page.bringToFront();
}else{
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1920,height:1080}});
}
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
if(!exe){
 await page.route('**/*',r=>/^https?:\/\/127\.0\.0\.1/.test(r.request().url())?r.continue():r.abort());
 await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=> 'mystery:all'};});
}
try {
 if(!exe)await page.goto((process.env.CHECK_URL||'http://127.0.0.1:5215')+'/?skipIntro=1&offlineLeaderboard=1',{waitUntil:'domcontentloaded',timeout:120000});
 const chosen = await chooseEncounterTestShip(page,process.env.CHECK_SHIP || 'Eirik the Viking');
 assert.equal(chosen.rosterSize,30);assert.match(chosen.readyText,/30\/30/);
 assert.equal(await page.evaluate(()=>!!window.__game.scenes.play?.player),false,'Combat waits for ship choice');
 await page.screenshot({path:out+'/ship-choice.png'});
 await page.evaluate(()=>{
  window.__voiceObservation=[];const playing=new Set(),play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(...args){
   const url=this.currentSrc||this.src;
   if(/\/voice\//.test(url)){
    const row={url,at:performance.now(),volume:this.volume,muted:this.muted,
      others:[...playing].filter(a=>a!==this&&!a.paused&&!a.ended).map(a=>a.currentSrc||a.src)};
    playing.add(this);window.__voiceObservation.push(row);
    this.addEventListener('playing',()=>{row.played=true;row.volume=this.volume;},{once:true});
    this.addEventListener('ended',()=>{row.ended=performance.now();},{once:true});
   }
   return play.apply(this,args);
  };
 });
 await launchEncounterTestFromHangar(page);
 for(let i=0;i<240;i++){
  const boot=await page.evaluate(()=>({ready:window.__game?.scenes.play?.enemyManager?.mysteryDirector?.plan?.ids?.length===56,paused:window.__game?.scenes.play?.isPaused}));
  if(boot.ready)break;
  if(boot.paused){await page.bringToFront();await page.keyboard.press('Escape');}
  await page.waitForTimeout(500);
 }
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.mysteryDirector?.plan?.ids?.length===56,null,{timeout:1000});
 const initial=await page.evaluate(()=>{const g=window.__game,m=g.scenes.play.enemyManager;return {waves:m.waves.length,ids:m.waves.slice(1).map(w=>w.mysteryId),counts:m.waves.map(w=>w.count),sector:g.level,managerSector:m.level,ship:g.selectedShipSpriteKey,player:g.scenes.play.player.config.id,mode:g.runMode};});
 assert.equal(initial.sector,30);assert.equal(initial.managerSector,30);assert.equal(initial.ship,chosen.spriteKey);
 assert.equal(initial.waves,57);assert.equal(new Set(initial.ids).size,56);assert.ok(initial.counts.every(n=>n>0));assert.equal(initial.mode,'unranked');
 if(exe){
  const isolation=await page.evaluate(async()=>({runtime:await window.__novaSteamBridge.getRuntimeInfo(),profile:await window.__novaSteamCloud.getProfileContext(),policy:window.__game.runPolicy}));
  assert.equal(isolation.runtime.appIsPackaged,true);assert.equal(isolation.runtime.steamIntegrationIsolated,true);
  assert.equal(isolation.profile.type,'local');assert.equal(isolation.profile.steamId,null);
  for(const [key,value]of Object.entries(isolation.policy))if(key.startsWith('allow'))assert.equal(value,false,key);
  fs.writeFileSync(out+'/isolation.json',JSON.stringify(isolation,null,2));
 }
 // Real input: no changes to lives, collision, attacks, timing or damage.
 await page.keyboard.down('Space'); const samples=[];let lastScreen=0;
 for(let i=0;i<750;i++) {
  const s=await page.evaluate(()=>{const g=window.__game,p=g.scenes.play,m=p.enemyManager,d=m.mysteryDirector;
   const targets=m.enemies.filter(e=>e.active&&e.kind!=='mystery_part');const target=d.active||targets.find(e=>e.y>0);
   const player=p.player,shots=(p.bulletManager?.enemyBullets||[]).filter(b=>b.active);
   let best=player.x,bestScore=Infinity;
   for(let x=100;x<=1820;x+=40){
    let risk=Math.abs(x-player.x)*.08+Math.abs(x-(target?.x||960))*.72;
    for(const b of shots)for(const t of [0,8,16,24,32]){
     const distance=Math.hypot(x-(b.x+b.vx*t),player.y-(b.y+b.vy*t));
     risk+=Math.max(0,110-distance)*7;
    }
    if(risk<bestScore){bestScore=risk;best=x;}
   }
   return {wave:m.currentWaveIndex,state:m.state,id:d.active?.type,attacks:d.active?.stats.attacks||0,
    ordinary:targets.filter(e=>e.kind!=='mystery').length,lives:g.lives,scene:g.currentScene?.constructor?.name,
    x:best,y:850,completed:d.plan.completed?.length||0,playerX:player.x,
    paused:p.isPaused,imminent:shots.some(b=>Math.hypot(player.x-b.x,player.y-b.y)<90)};});
  samples.push(s);
  if(s.paused){await page.bringToFront();await page.keyboard.press('Escape');await page.keyboard.down('Space');}
  const dx=s.x-s.playerX;
  if(dx>35){await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowRight');}
  else if(dx < -35){await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowLeft');}
  else {await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowRight');}
  if(s.imminent)await page.keyboard.press('Shift');
  if(s.id&&s.attacks>0&&!lastScreen){await page.screenshot({path:out+'/mixed-combat.png'});lastScreen=1;}
  if(s.id&&s.attacks>=2&&s.ordinary>0)break;
  if(s.completed>=2||s.lives<=0)break;await page.waitForTimeout(200);
 }
 const voices=await page.evaluate(()=>window.__voiceObservation);
 const announcement=voices.find(v=>v.url.includes('/mysteries-v2/'));
 assert.ok(announcement?.played&&announcement.ended&&announcement.volume>0&&!announcement.muted,'Audible female announcement completes');
 assert.deepEqual(announcement.others,[],'Announcement waits for other dialogue');
 assert.ok(voices.every(v=>!v.others.some(url=>url.includes('/mysteries-v2/'))),'Other speech does not overlap announcement');
 fs.writeFileSync(out+'/input-results.json',JSON.stringify({chosen:chosen.name,initial,samples,voices,errors},null,2));
 await page.screenshot({path:out+'/last.png'});assert.deepEqual(errors,[]);
 assert.ok(samples.some(s=>s.id&&s.ordinary>0),'A Mystery must join live ordinary combat');
 assert.ok(samples.some(s=>s.attacks>0),'The Mystery must attack with normal timing');
 console.log(JSON.stringify({initial,last:samples.at(-1),mixed:samples.some(s=>s.id&&s.ordinary>0),attacked:samples.some(s=>s.attacks>0)}));
}finally{await browser.close();child?.kill();}
