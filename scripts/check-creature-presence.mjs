import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try {
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 await page.goto('http://127.0.0.1:5201/?offlineLeaderboard=1&skipIntro=1',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await page.mouse.click(900,950);
 await page.evaluate(()=>window.__game.startGame('nova-player-ship-01.png',{runMode:'ranked_tactical'}));
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
 const result=await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play;
  g.markUnrankedRun('audio_presence_qa');p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);
  const {AudioManager:a}=await import('/src/audio/AudioManager.js');
  const {CreatureAudio:c}=await import('/src/audio/CreatureAudio.js');
  const {BOSS_ROSTER}=await import('/src/config/BossRoster.js');
  const {SPACE_SNAKES}=await import('/src/config/SpaceSnakes.js');
  await a.unlockAudio();a.enabled=true;a.voiceEnabled=true;a.voiceVolume=.7;a.masterVolume=.8;a.sfxVolume=.4;
  g.app.ticker.stop();a.silenceVoicePlayback('qa_baseline');
  clearInterval(a.musicTransitionTimer);clearTimeout(a.duckTimer);
  a.musicTransitionFactor=1;a.pauseDuckFactor=1;a.musicDuckFactor=1;a.applyMusicVolume();
  a.playDiegeticVoice('mission_control_powerup',{force:true,bypassGlobalCooldown:true,bypassEventCooldown:true,voicePriority:1,duckFactor:1});
  const baselineMusic=a.musicAudio.volume;
  const spoken=[...a.activeVoices.values()][0];
  const baselineVoice=spoken?.audio.volume;
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const rows=[];
  for(const profile of [BOSS_ROSTER[0],SPACE_SNAKES[0]]) {
   c.stopAll();await c.prepare(profile);c.play({},profile,'arrival',{force:true});await wait(150);
   a.playSfx('shoot_small',{force:true,preserveGameplayRng:true});
   const shot=Object.entries(a.sfxPools).filter(([key])=>key.includes('shoot_small')).flatMap(([,pool])=>pool).find(e=>!e.paused);
   rows.push({id:profile.id,presence:c.active.size>0,shot:shot?.volume,expected:.8*.4*.78,processing:[...c.active][0]?.processing.length,music:a.musicAudio.volume,voice:spoken?.audio.volume,baselineMusic,baselineVoice});
  }
  c.stopAll();const restored=a.musicAudio.volume===baselineMusic;
  a.silenceVoicePlayback('qa_death');
  p.triggerBossDeathImpact({boss:{profile:BOSS_ROSTER[0],x:500,y:200,color:0xffffff},color:0xffffff});
  await wait(300);
  const death=[...a.activeVoices.values()].find(e=>e.eventName==='boss_death_agony');
  const blocked=a.playDiegeticVoice('mission_control_powerup',{force:true,bypassGlobalCooldown:true,bypassEventCooldown:true,voicePriority:7});
  // Simulate the reservation expiring while the real media is still playing.
  a.voicePriorityLock.until=Date.now()-1;
  const extended=a.getActiveVoiceLock()?.eventName==='boss_death_agony';
  const result={rows,restored,death:!!death,blocked:blocked===false,extended,suppression:a.lastVoiceSuppression?.reason};
  c.stopAll({unload:true});a.silenceVoicePlayback('qa_exit');
  return {...result,clean:c.diagnostics().active===0&&a.activeVoices.size===0};
 });
 for(const row of result.rows){assert.ok(row.presence);assert.equal(row.processing,2);assert.ok(Math.abs(row.shot-row.expected)<.0001,JSON.stringify(row));assert.equal(row.music,row.baselineMusic);assert.ok(row.baselineVoice>0);assert.equal(row.voice,row.baselineVoice);}
 for(const key of ['restored','death','blocked','extended','clean'])assert.ok(result[key],key);
 assert.equal(result.suppression,'voice_lock');
 console.log('PASS runtime creature presence, normal weapon level, processing, restored mix, real boss death voice, draft-priority exclusion, duration extension and cleanup',JSON.stringify(result));
} finally {await browser.close();}
