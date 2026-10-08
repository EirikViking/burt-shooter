import assert from 'node:assert/strict';
import {appendFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'));
const url=new URL(process.env.CHECK_URL||'http://127.0.0.1:4983');assert(['127.0.0.1','localhost'].includes(url.hostname));
mkdirSync(out,{recursive:true});const file=path.join(out,'reactor-tow-with-game-audio.webm');assert(!existsSync(file));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required'],ignoreDefaultArgs:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],chapters=[];
await page.route('**/*',route=>{const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)||['blob:','data:'].includes(u.protocol)?route.continue():route.abort();});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.exposeFunction('saveReactorChunk',b=>appendFileSync(file,Buffer.from(b,'base64')));
try{
 await page.addInitScript(()=>{
  const mix=new AudioContext(),destination=mix.createMediaStreamDestination();
  const connect=AudioNode.prototype.connect,disconnect=AudioNode.prototype.disconnect,createElement=AudioContext.prototype.createMediaElementSource,play=HTMLMediaElement.prototype.play;
  const elements=new WeakSet(),taps=new WeakMap(),edges=new WeakMap();
  const capture=window.__reactorAudio={mix,destination,plays:[],errors:[]};
  AudioContext.prototype.createMediaElementSource=function(element){const source=createElement.call(this,element);elements.add(element);return source;};
  AudioNode.prototype.connect=function(target,...args){
   const result=connect.call(this,target,...args);
   if(target===this.context.destination&&this.context!==mix){
    let tap=taps.get(this.context);if(!tap){tap=this.context.createMediaStreamDestination();taps.set(this.context,tap);connect.call(mix.createMediaStreamSource(tap.stream),destination);}
    connect.call(this,tap,...args);edges.set(this,tap);
   }return result;
  };
  AudioNode.prototype.disconnect=function(target,...args){if(target===this.context.destination&&edges.has(this)){disconnect.call(this,edges.get(this),...args);edges.delete(this);}return arguments.length?disconnect.call(this,target,...args):disconnect.call(this);};
  HTMLMediaElement.prototype.play=function(...args){
   if(!elements.has(this))try{const source=mix.createMediaElementSource(this);source.connect(mix.destination);source.connect(destination);}catch(e){capture.errors.push(e.message);}
   capture.plays.push({at:performance.now(),src:this.currentSrc||this.src,volume:this.volume});return play.apply(this,args);
  };
 });
 await page.goto(`${url.origin}/?autostart=1&offlineLeaderboard=1&encounterEvolution=reactor-tow`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.model.encounter?.reactor,null,{timeout:120000});
 const setup=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,m=s.enemyManager;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe preview');
  const {makeReactorTow}=await import('/src/game/ReactorTow.js'),{FirstLightModel}=await import('/src/game/ArcadeFirstLight.js');
  const c=document.createElement('canvas');c.width=1280;c.height=792;const pen=c.getContext('2d'),a=window.__reactorAudio;await a.mix.resume();
  const f=window.__reactorFilm={g,s,d,m,makeReactorTow,FirstLightModel,c,pen,title:'',pending:[],running:true,frames:0};
  s.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;s.setPaused(false);
  // Isolated presentation only: unrelated ambient pickups must not obscure the decision.
  s.ambientBonusDroneTimer=Number.MAX_SAFE_INTEGER;
  for(const bonus of s.ambientBonusDrones||[])bonus.destroy();
  s.ambientBonusDrones=[];
  s.updateAmbientBonusDrones=()=>{};
  f.stream=new MediaStream([...c.captureStream(30).getVideoTracks(),...a.destination.stream.getAudioTracks()]);
  f.recorder=new MediaRecorder(f.stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:4000000,audioBitsPerSecond:128000});
  f.recorder.ondataavailable=e=>{if(e.data.size)f.pending.push(e.data.arrayBuffer().then(b=>{const bytes=new Uint8Array(b);let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return window.saveReactorChunk(btoa(text));}));};
  f.draw=()=>{if(!f.running)return;g.app.render();pen.fillStyle='#050b14';pen.fillRect(0,0,1280,792);pen.drawImage(g.app.canvas,0,0,1280,720);
   pen.fillStyle='#8de5da';pen.font='bold 21px Arial';pen.fillText(f.title,24,750);
   pen.fillStyle='#bacbd9';pen.font='16px Arial';pen.fillText('LOKAL MEKANIKKPRØVE · styrt spillopptak · eksisterende grafikk og lyd · ingen progresjon',24,779);
   f.frames++;f.raf=requestAnimationFrame(f.draw);};f.raf=requestAnimationFrame(f.draw);
  return {policy:g.runPolicy,sourcePreview:true,normalCatalogEnabled:true,fixture:'Isolated contact, normal damage/projectiles, scripted pilot placement and keyboard fire; existing art/audio'};
 });
 for(const [choice,label] of [['none','1 / La reaktoren være: varslet utslipp i den opprinnelige banen'],['coupler','2 / Kutt koblingen: flytt utslippet ut mot kanten'],['vent','3 / Ødelegg ventilen: stans utslippet helt']]){
  await page.evaluate(({choice,label})=>{
   const f=window.__reactorFilm,{g,s,d,m}=f;g.app.ticker.stop();d.cancel('preview-cut');s.bulletManager.clearAll('preview-cut');s.clearToastState();s.clearBossHazards('preview-cut');
   m.clearEnemies();m.clearPendingWaveSpawns();m.boss=null;m.hijacker=null;m.environment=null;m.discoveryEncounter=null;m.mysteryDirector=null;m.challengeFlightState=null;m.mayhemReinforcementState=null;
   s.activeMayhemReinforcementWarning=null;s.activeMayhemRoutineWarning=null;s.activeBossIntroCard=null;
   m.waves=[{type:'grunt',count:0,isChallenge:false}];m.currentWaveIndex=0;m.spawning=true;m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;
   g.level=m.level=3;s.introComplete=true;s.introActive=false;s.isPaused=false;d.localTestStarted=true;
   d.model=new f.FirstLightModel('preview');d.model.seen.add(3);d.model.encounter={kind:'convoy',sector:3,age:0,suspended:false,...f.makeReactorTow(1)};
   f.encounter=d.model.encounter;f.title=label;
   s.player.x=s.gameplayGame.getWidth()*.2;s.player.y=s.gameplayGame.getHeight()*.84;s.player.sprite.position.set(s.player.x,s.player.y);
   d.update(0);if(f.recorder.state==='inactive')f.recorder.start(1000);g.app.ticker.start();
  },{choice,label});
  await page.waitForTimeout(1800);
  if(choice!=='none'){
   await page.evaluate(choice=>{const f=window.__reactorFilm,t=f.d.view.targets.find(t=>t.part===choice);if(!t)throw Error('Missing preview target');f.s.player.x=t.x;f.s.player.sprite.x=t.x;},choice);
   await page.keyboard.down('Space');
   await page.waitForFunction(choice=>window.__reactorFilm.encounter.hp[choice]<=0,choice,{timeout:4000});
   await page.keyboard.up('Space');
   // Move the pilot away after the chosen part breaks; avoid auto-fire cancelling the other branch.
   await page.evaluate(()=>{const f=window.__reactorFilm;f.s.player.x=f.s.gameplayGame.getWidth()*.2;f.s.player.sprite.x=f.s.player.x;});
  }
  await page.waitForTimeout(choice==='none'?4100:1900);
  await page.screenshot({path:path.join(out,`${choice}.png`)});
  await page.waitForTimeout(4000);
  const outcome=await page.evaluate(()=>{const f=window.__reactorFilm;return {hp:{...f.encounter.hp},reactor:{...f.encounter.reactor},age:f.encounter.age,score:f.g.score,lives:f.g.lives,frames:f.frames};});
  if(choice==='vent')assert(outcome.reactor.harmless&&!outcome.reactor.spent);else assert(outcome.reactor.spent&&!outcome.reactor.harmless);
  if(choice==='coupler')assert.notEqual(outcome.reactor.releaseAt,null);
  chapters.push({choice,outcome});
 }
 const capture=await page.evaluate(()=>new Promise(resolve=>{const f=window.__reactorFilm,a=window.__reactorAudio;f.g.app.ticker.stop();f.recorder.onstop=async()=>{await Promise.all(f.pending);f.running=false;cancelAnimationFrame(f.raf);f.stream.getTracks().forEach(t=>t.stop());resolve({errors:a.errors,plays:a.plays,frames:f.frames});};f.recorder.stop();}));
 writeFileSync(path.join(out,'capture.json'),JSON.stringify({setup,chapters,capture,errors,file},null,2));assert.deepEqual(errors,[]);assert.deepEqual(capture.errors,[]);assert(capture.plays.length>0);
 console.log(JSON.stringify({file,chapters,frames:capture.frames,audioPlays:capture.plays.length}));
}finally{await browser.close();}
