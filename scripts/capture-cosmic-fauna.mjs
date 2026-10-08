import assert from 'node:assert/strict';
import {mkdirSync,appendFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {COSMIC_FAUNA} from '../src/config/CosmicFaunaCatalog.js';
const ids=process.env.FAUNA_CAPTURE_IDS?.split(',')||COSMIC_FAUNA.map(row=>row.id);
assert(ids.length&&ids.every(id=>COSMIC_FAUNA.some(row=>row.id===id)));
const seconds=Number(process.env.FAUNA_CLIP_SECONDS||10);assert(seconds>=8&&seconds<=26);
const out=process.env.CHECK_OUTPUT_DIR;assert(out?.replaceAll('\\','/').startsWith('E:/'));mkdirSync(out,{recursive:true});
const file=path.join(out,`cosmic-fauna-${ids.length}.webm`);assert(!existsSync(file),'Preserve existing capture');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required'],ignoreDefaultArgs:['--mute-audio']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],chapters=[];page.on('pageerror',e=>errors.push(e.message));
await page.exposeFunction('saveFaunaChunk',base64=>appendFileSync(file,Buffer.from(base64,'base64')));
try{
 await page.goto(`${process.env.CHECK_URL}/?autostart=1&offlineLeaderboard=1&encounterEvolution=natural`);
 await page.waitForFunction(()=>window.__game?.scenes.play?.introComplete&&window.__game.scenes.play.gameplayBackdrop,null,{timeout:120000});
 await page.evaluate(async ({count,preview})=>{
  const g=window.__game,s=g.scenes.play;g.app.ticker.stop();
  if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe capture');
  const {AudioManager:A}=await import('/src/audio/AudioManager.js');A.init();if(!A.context)throw Error('Audio initialization unavailable');await A.context.resume();A.masterVolume=.75;A.sfxVolume=.8;A.musicVolume=.12;A.applyMusicVolume();
  const ctx=A.context,dest=ctx.createMediaStreamDestination();
  const c=document.createElement('canvas');c.width=1280;c.height=792;const pen=c.getContext('2d');
  const f=window.__faunaFilm={g,s,A,c,pen,dest,age:0,title:'',running:true,pending:[],active:null};
  f.stream=new MediaStream([...c.captureStream(30).getVideoTracks(),...dest.stream.getAudioTracks()]);
  f.recorder=new MediaRecorder(f.stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:5000000,audioBitsPerSecond:128000});
  f.recorder.ondataavailable=e=>{if(e.data.size)f.pending.push(e.data.arrayBuffer().then(b=>{let text='';const bytes=new Uint8Array(b);for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return window.saveFaunaChunk(btoa(text));}));};
  s.firstLightDirector.cancel('isolated-creature-showcase');s.enemyManager.forceClearAllEnemies();s.enemyManager.clearPendingWaveSpawns();
  s.enemyManager.state='WAVE_ACTIVE';s.enemyManager.boss=null;s.enemyManager.waveEnding=false;s.activeBossIntroCard=null;
  s.introActive=false;s.isGameplayClockAdvancing=()=>true;s.player.active=true;s.player.sprite.alpha=1;
  const {CosmicFauna}=await import('/src/effects/CosmicFauna.js'),{COSMIC_FAUNA}=await import('/src/config/CosmicFaunaCatalog.js');
  f.set=async id=>{f.active=null;s.cosmicFauna.destroy();const catalog=COSMIC_FAUNA.filter(d=>d.id===id).map(d=>preview?{...d,soundSeconds:20,sound:`/audio/sfx/cosmic-fauna-passages/${d.id}.wav`}:d);const fauna=s.cosmicFauna=new CosmicFauna(s,{catalog});s.gameContainer.addChild(fauna);await fauna.pending;fauna.prepareNext();await fauna.preparation;if(fauna.error)throw Error(fauna.error);
   s.enemyManager.state='WAVE_ACTIVE';s.enemyManager.waveEnding=false;fauna.clock.quiet=fauna.clock.wait;fauna.tick(1);
   if(!fauna.current)throw Error('No creature '+JSON.stringify({state:s.enemyManager.state,ready:fauna.next?.prepared,player:s.player.active,trace:fauna.trace,model:s.firstLightDirector.snapshot()}));
   const voice=fauna.current.passageAudio;
   if(voice?.source)(voice.panner||voice.source).connect(dest);
   else {const source=ctx.createMediaElementSource(fauna.current.audio);source.connect(dest);source.connect(ctx.destination);}
   fauna.clock.active.age=0;f.active=fauna;f.title=id.replaceAll('_',' ').toUpperCase();};
  let last=performance.now();const animate=now=>{
   if(!f.running)return;const dt=Math.min(.05,(now-last)/1000);last=now;f.age+=dt;
   f.active?.tick(dt*60);s.updateStarfield(dt*60);s.player.sprite.alpha=1;g.app.render();
   pen.fillStyle='#050b14';pen.fillRect(0,0,1280,792);pen.drawImage(g.app.canvas,0,0,1280,720);
   pen.fillStyle='#85e8dc';pen.font='bold 21px Arial';pen.fillText(f.title,25,750);pen.fillStyle='#bdcbd9';pen.font='16px Arial';pen.fillText(`${count} av 42 · faktisk spillbevegelse og bearbeidet ElevenLabs-lyd · kontrollert lokal visning`,25,779);
   f.frame=requestAnimationFrame(animate);
  };f.frame=requestAnimationFrame(animate);f.recorder.start(1000);
 },{count:ids.length,preview:process.env.FAUNA_PREVIEW==='1'});
 for(const id of ids){
  await page.evaluate(id=>window.__faunaFilm.set(id),id);const start=await page.evaluate(()=>window.__faunaFilm.age);await page.waitForTimeout(seconds*1000);
  const result=await page.evaluate(()=>{const f=window.__faunaFilm;return{age:f.age,trace:f.active.trace,vertices:[...f.active.current.rig.geometry.positions].slice(0,12)};});chapters.push({id,start,...result});
  await page.screenshot({path:path.join(out,`${id}-moving.png`)});
 }
 await page.evaluate(()=>new Promise(resolve=>{const f=window.__faunaFilm;f.recorder.onstop=async()=>{await Promise.all(f.pending);f.running=false;cancelAnimationFrame(f.frame);resolve();};f.recorder.stop();}));
 assert.deepEqual(errors,[]);assert(chapters.every(c=>c.trace.some(e=>e.event==='sound')),'Every selected real cue must play');
 writeFileSync(path.join(out,'capture.json'),JSON.stringify({controlled:true,progression:false,audio:'Actual owned game creature cue routed to MediaRecorder',chapters,errors},null,2));console.log(JSON.stringify({chapters:chapters.length,errors,file}));
}finally{await browser.close();}
