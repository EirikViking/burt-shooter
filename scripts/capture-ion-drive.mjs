import assert from 'node:assert/strict';
import {appendFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.replaceAll('\\','/').startsWith('E:/Codex/'));
const url=new URL(process.env.CHECK_URL||'http://127.0.0.1:4983');assert(['127.0.0.1','localhost'].includes(url.hostname));
mkdirSync(out,{recursive:true});const file=path.join(out,'ion-drive-with-game-audio.webm');assert(!existsSync(file));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required'],ignoreDefaultArgs:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],chapters=[];
await page.route('**/*',route=>{const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)||['blob:','data:'].includes(u.protocol)?route.continue():route.abort();});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.exposeFunction('saveDriveChunk',b=>appendFileSync(file,Buffer.from(b,'base64')));
try{
 await page.addInitScript(()=>{
  const mix=new AudioContext(),destination=mix.createMediaStreamDestination();
  const connect=AudioNode.prototype.connect,disconnect=AudioNode.prototype.disconnect,createElement=AudioContext.prototype.createMediaElementSource,play=HTMLMediaElement.prototype.play;
  const elements=new WeakSet(),taps=new WeakMap(),edges=new WeakMap();
  const capture=window.__driveAudio={mix,destination,plays:[],errors:[]};
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
 await page.goto(`${url.origin}/?autostart=1&offlineLeaderboard=1&encounterEvolution=payback`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.firstLightDirector?.model.encounter?.kind==='convoy'&&window.__game.scenes.play.firstLightDirector.view&&window.__game.scenes.play.enemyManager.state==='WAVE_ACTIVE',null,{timeout:120000});
 const setup=await page.evaluate(async()=>{
  const g=window.__game,s=g.scenes.play,d=s.firstLightDirector,m=s.enemyManager;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe preview');
  const {FirstLightModel}=await import('/src/game/ArcadeFirstLight.js');
  const c=document.createElement('canvas');c.width=1280;c.height=792;const pen=c.getContext('2d'),a=window.__driveAudio;await a.mix.resume();
  const f=window.__driveFilm={g,s,d,m,FirstLightModel,c,pen,title:'',pending:[],running:true,frames:0};
  s.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;s.setPaused(false);
  s.player.invulnerable=true;s.player.invulnerableTime=1e9;
  s.ambientBonusDroneTimer=Number.MAX_SAFE_INTEGER;s.updateAmbientBonusDrones=()=>{};
  for(const bonus of s.ambientBonusDrones||[])bonus.destroy();s.ambientBonusDrones=[];
  f.stream=new MediaStream([...c.captureStream(30).getVideoTracks(),...a.destination.stream.getAudioTracks()]);
  f.recorder=new MediaRecorder(f.stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:4000000,audioBitsPerSecond:128000});
  f.recorder.ondataavailable=e=>{if(e.data.size)f.pending.push(e.data.arrayBuffer().then(b=>{const bytes=new Uint8Array(b);let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return window.saveDriveChunk(btoa(text));}));};
  f.draw=()=>{if(!f.running)return;g.app.render();pen.fillStyle='#050b14';pen.fillRect(0,0,1280,792);pen.drawImage(g.app.canvas,0,0,1280,720);
   pen.fillStyle='#8de5da';pen.font='bold 21px Arial';pen.fillText(f.title,24,750);
   pen.fillStyle='#bacbd9';pen.font='16px Arial';pen.fillText('LOKAL FORHÅNDSVISNING · ekte spilllyd · styrte situasjoner og udødelig testpilot · ingen progresjon',24,779);
   f.frames++;f.raf=requestAnimationFrame(f.draw);};f.raf=requestAnimationFrame(f.draw);
  d.cancel('drive-preview');m.clearEnemies();m.clearPendingWaveSpawns();m.boss=null;m.hijacker=null;m.environment=null;m.discoveryEncounter=null;m.mysteryDirector=null;m.challengeFlightState=null;m.mayhemReinforcementState=null;
  s.clearToastState();s.clearBossHazards('drive-preview');s.activeMayhemReinforcementWarning=null;s.activeMayhemRoutineWarning=null;s.activeBossIntroCard=null;
  m.waves=[{type:'grunt',count:0,isChallenge:false}];m.currentWaveIndex=0;m.spawning=true;m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;
  g.level=m.level=1;s.introComplete=true;s.introActive=false;s.isPaused=false;d.localTestStarted=true;
  d.model=new FirstLightModel('ion-drive-preview');for(let i=0;i<70;i++)d.model.update(.1,{sector:1,safe:true});
  d.update(0);f.title='REDNING / to motorer følger hver pilots bevegelser';
  if(d.view.drives?.length!==4)throw Error('Missing candidate drives');
  s.player.x=s.gameplayGame.getWidth()*.5;s.player.y=s.gameplayGame.getHeight()*.84;s.player.sprite.position.set(s.player.x,s.player.y);
  f.recorder.start(1000);g.app.ticker.start();
  return {policy:g.runPolicy,sourcePreview:true,newAudio:false,fixture:'Isolated authored contacts, actual keyboard shots; immortal pilot and explicit chapter cut. Not a natural run or difficulty measurement.'};
 });
 await page.waitForTimeout(1700);
 for(const part of ['left','right']){
  await page.evaluate(part=>{const f=window.__driveFilm,t=f.d.view.targets.find(t=>t.part===part);if(!t)throw Error(JSON.stringify({missing:part,encounter:f.d.model.snapshot(),safe:f.d.safe(),state:f.m.state,phase:f.m.phase,intro:f.s.introActive,paused:f.s.isPaused,targets:f.d.view.targets}));f.s.player.x=t.x;f.s.player.sprite.x=t.x;},part);
  await page.keyboard.down('Space');await page.waitForFunction(part=>window.__driveFilm.d.model.encounter?.hp[part]<=0,part,{timeout:6000});await page.keyboard.up('Space');
 }
 await page.waitForTimeout(1300);await page.keyboard.down('ArrowLeft');await page.waitForTimeout(450);await page.keyboard.up('ArrowLeft');
 await page.screenshot({path:path.join(out,'rescued-wing.png')});
 await page.waitForTimeout(6800);
 await page.evaluate(()=>window.__driveFilm.title='REDNING / motorene øker skyvet når pilotene reiser');
 await page.waitForTimeout(2100);
 chapters.push(await page.evaluate(()=>({kind:'rescue',rescued:window.__driveFilm.d.model.rescued,score:window.__driveFilm.g.score})));
 await page.evaluate(async()=>{
  const f=window.__driveFilm,{g,s,d,m}=f;g.app.ticker.stop();d.cancel('drive-chapter');d.enabled=false;s.clearToastState();s.bulletManager.clearAll('drive-chapter');
  const {setupEncounterExpansionTest}=await import('/src/config/EncounterExpansionTest.js');
  await setupEncounterExpansionTest(s,'breach');f.boss=m.boss;
  if(f.boss?.rig?.drives?.length!==6)throw Error('Missing capital drive candidate');
  s.player.x=s.gameplayGame.getWidth()*.5;s.player.sprite.x=s.player.x;s.player.invulnerable=true;s.player.invulnerableTime=1e9;
  f.title='DREADNOUGHT / seks stabilisatorer festet til skroget';g.app.ticker.start();
 });
 await page.waitForTimeout(5200);await page.screenshot({path:path.join(out,'capital-drives.png')});
 await page.evaluate(()=>{const f=window.__driveFilm;for(const id of ['relay_0','relay_1'])f.s.applyCombatDamage(f.boss.components.find(c=>c.type===id),f.boss.maxHealth*10,'primary');f.title='DREADNOUGHT / motorene følger panseret når det åpner seg';});
 await page.waitForTimeout(2600);await page.screenshot({path:path.join(out,'capital-opening.png')});
 await page.evaluate(()=>{const f=window.__driveFilm;f.s.applyCombatDamage(f.boss.components.find(c=>c.type==='hull'),f.boss.maxHealth*10,'primary');});
 await page.waitForTimeout(5000);
 chapters.push(await page.evaluate(()=>({kind:'breach',stage:window.__driveFilm.boss.breach.stage,health:window.__driveFilm.boss.health,score:window.__driveFilm.g.score})));
 const capture=await page.evaluate(()=>new Promise(resolve=>{const f=window.__driveFilm,a=window.__driveAudio;f.g.app.ticker.stop();f.recorder.onstop=async()=>{await Promise.all(f.pending);f.running=false;cancelAnimationFrame(f.raf);f.stream.getTracks().forEach(t=>t.stop());resolve({errors:a.errors,plays:a.plays,frames:f.frames});};f.recorder.stop();}));
 writeFileSync(path.join(out,'capture.json'),JSON.stringify({setup,chapters,capture,errors,file},null,2));assert.deepEqual(errors,[]);assert.deepEqual(capture.errors,[]);assert(capture.plays.length>0);assert.equal(chapters[0].rescued,2);
 console.log(JSON.stringify({file,chapters,frames:capture.frames,audioPlays:capture.plays.length}));
}finally{await browser.close();}
