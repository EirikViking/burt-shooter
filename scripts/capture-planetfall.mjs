import assert from 'node:assert/strict';
import {appendFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.startsWith('E:'));mkdirSync(out,{recursive:true});
const control=process.env.CHECK_CONTROL==='gamepad'?'gamepad':'keyboard';
const file=path.join(out,'planetfall-with-game-audio.webm');assert(!existsSync(file),'Do not overwrite an unreviewed capture');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required'],ignoreDefaultArgs:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
async function pad(axes=[0,0],buttons=[]){await page.evaluate(({axes,buttons})=>{window.__burtGamepadOverride={id:'planetfall-capture-pad',index:0,connected:true,axes,
 buttons:Array.from({length:17},(_,i)=>({pressed:buttons.includes(i),value:buttons.includes(i)?1:0}))};},{axes,buttons});}
page.on('pageerror',e=>errors.push(e.message));await page.exposeFunction('savePlanetfallChunk',b=>appendFileSync(file,Buffer.from(b,'base64')));
try{
 await page.addInitScript(()=>{
  const mix=new AudioContext(),destination=mix.createMediaStreamDestination(),connect=AudioNode.prototype.connect,disconnect=AudioNode.prototype.disconnect;
  const createElement=AudioContext.prototype.createMediaElementSource,play=HTMLMediaElement.prototype.play,elements=new WeakSet(),taps=new WeakMap(),edges=new WeakMap();
  const capture=window.__planetfallAudio={mix,destination,plays:[],errors:[]};
  AudioContext.prototype.createMediaElementSource=function(element){const source=createElement.call(this,element);elements.add(element);return source;};
  AudioNode.prototype.connect=function(target,...args){const result=connect.call(this,target,...args);
   if(target===this.context.destination&&this.context!==mix){let tap=taps.get(this.context);
    if(!tap){tap=this.context.createMediaStreamDestination();taps.set(this.context,tap);connect.call(mix.createMediaStreamSource(tap.stream),destination);}
    connect.call(this,tap,...args);edges.set(this,tap);}return result;};
  AudioNode.prototype.disconnect=function(target,...args){if(target===this.context.destination&&edges.has(this)){disconnect.call(this,edges.get(this),...args);edges.delete(this);}
   return arguments.length?disconnect.call(this,target,...args):disconnect.call(this);};
  HTMLMediaElement.prototype.play=function(...args){if(!elements.has(this))try{const source=mix.createMediaElementSource(this);source.connect(mix.destination);source.connect(destination);}catch(e){capture.errors.push(e.message);}
   capture.plays.push({at:performance.now(),src:this.currentSrc||this.src,volume:this.volume});return play.apply(this,args);};
 });
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5010'}/?autostart=1&offlineLeaderboard=1&encounterEvolution=planetfall`);
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.boss?.isPlanetfall,null,{timeout:90000});
 await page.evaluate(async sector=>{
  const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe capture');
  if(sector!==m.level){m.clearEnemies();m.clearPendingWaveSpawns();g.level=m.level=sector;m.state='BOSS_ACTIVE';m.phase='BOSS';await m.spawnBoss(sector);}
  const b=m.boss;
  s.bossIntroActive=false;s.activeBossIntroCard?.destroy({children:true});s.activeBossIntroCard=null;s.clearToastState();
  const a=window.__planetfallAudio;await a.mix.resume();const stream=new MediaStream([...g.app.canvas.captureStream(30).getVideoTracks(),...a.destination.stream.getAudioTracks()]);
  const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:5000000,audioBitsPerSecond:160000});
  const f=window.__planetfallFilm={recorder,stream,pending:[],boss:b,initialLives:g.lives};
  recorder.ondataavailable=e=>{if(e.data.size)f.pending.push(e.data.arrayBuffer().then(b=>{const bytes=new Uint8Array(b);let text='';
   for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return window.savePlanetfallChunk(btoa(text));}));};
  recorder.start(1000);g.app.ticker.start();
 },Number(process.env.CHECK_SECTOR)||10);
 await page.waitForTimeout(4200);
 const chapters=[];
 for(const id of ['anchor_0','anchor_3','anchor_1','anchor_2','core']){
  const alignmentEnd=Date.now()+5000;
  while(Date.now()<alignmentEnd){
   const delta=await page.evaluate(id=>{const s=window.__game.scenes.play,b=window.__planetfallFilm.boss,c=b.components.find(c=>c.type===id);return c?.active?c.x-s.player.x:null;},id);
   if(delta===null||Math.abs(delta)<10)break;
   const key=delta>0?'ArrowRight':'ArrowLeft';if(control==='gamepad')await pad([Math.sign(delta),0]);else await page.keyboard.down(key);
   await page.waitForTimeout(Math.min(100,Math.max(16,Math.abs(delta)*1.2)));if(control==='gamepad')await pad();else await page.keyboard.up(key);
  }
  if(control==='gamepad')await pad([0,0],[0]);else await page.keyboard.down('Space');
  try{await page.waitForFunction(id=>{const b=window.__planetfallFilm.boss;return !b.active||b.planetfall.parts.find(p=>p.id===id).health===0;},id,{timeout:14000});}
  finally{if(control==='gamepad')await pad();else await page.keyboard.up('Space');}
  chapters.push(await page.evaluate(id=>({target:id,age:window.__planetfallFilm.boss.planetfall.age,lives:window.__game.lives,parts:window.__planetfallFilm.boss.planetfall.parts}),id));
  if(id==='core')for(let i=0;i<46;i++){
   if(await page.evaluate(()=>window.__game.scenes.play.tacticalDraft?.active))await page.keyboard.press('Enter');
   await page.waitForTimeout(100);
  }else await page.waitForTimeout(900);
 }
 const result=await page.evaluate(()=>new Promise(resolve=>{
  const f=window.__planetfallFilm,a=window.__planetfallAudio;window.__game.app.ticker.stop();
  f.recorder.onstop=async()=>{await Promise.all(f.pending);f.stream.getTracks().forEach(t=>t.stop());resolve({plays:a.plays,errors:a.errors,
   initialLives:f.initialLives,finalLives:window.__game.lives,won:f.boss.planetfall.defeated,policy:window.__game.runPolicy});};f.recorder.stop();
 }));
 writeFileSync(path.join(out,'capture.json'),JSON.stringify({file,control,scope:'DEV isolated encounter; production input mapping (keyboard or emulated gamepad), ordinary damage and finite lives; existing art and actual game mix',chapters,result,errors},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(result.errors,[]);assert(result.won);console.log(JSON.stringify({file,won:result.won,lives:[result.initialLives,result.finalLives],audioPlays:result.plays.length}));
}finally{await browser.close();}
