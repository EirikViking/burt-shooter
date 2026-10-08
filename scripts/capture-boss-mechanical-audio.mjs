import assert from 'node:assert/strict';
import {appendFileSync, existsSync, mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {BOSS_ROSTER} from '../src/config/BossRoster.js';

// Inspection media only: isolated test policy, forced bosses, immortal test pilot.
// Audio is tapped from the actual game mix; no replacement soundtrack or foley.
const out=process.env.CHECK_OUTPUT_DIR;
assert(out?.replaceAll('\\','/').startsWith('E:/'));
const url=new URL(process.env.CHECK_URL);
assert(['127.0.0.1','localhost'].includes(url.hostname));
const families=(process.env.BOSS_CAPTURE_FAMILIES||'conductor,forge,clock').split(',');
const profiles=families.map(f=>BOSS_ROSTER.find(p=>p.archetype===f));
assert(profiles.length<=10&&profiles.every(Boolean));
const seconds=Number(process.env.BOSS_CLIP_SECONDS||18);
assert(seconds>=8&&seconds<=24);
mkdirSync(out,{recursive:true});
const file=path.join(out,'boss-motion-with-game-audio.webm');
assert(!existsSync(file),'Preserve earlier footage');
const browser=await chromium.launch({channel:'chrome',headless:true,
  args:['--autoplay-policy=no-user-gesture-required'],ignoreDefaultArgs:['--mute-audio']});
const context=await browser.newContext({viewport:{width:1280,height:720}});
await context.route('**/*',route=>{
  const u=new URL(route.request().url());
  return ['127.0.0.1','localhost'].includes(u.hostname)||['blob:','data:'].includes(u.protocol)
    ?route.continue():route.abort();
});
const page=await context.newPage(),errors=[],chapters=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.exposeFunction('saveBossFilmChunk',base64=>appendFileSync(file,Buffer.from(base64,'base64')));
try {
  await page.addInitScript(()=>{
    window.__novaEncounterTest={getPreset:async()=>'boss-snake'};
    const mix=new AudioContext(),destination=mix.createMediaStreamDestination();
    const connect=AudioNode.prototype.connect,disconnect=AudioNode.prototype.disconnect;
    const createElement=AudioContext.prototype.createMediaElementSource;
    const play=HTMLMediaElement.prototype.play;
    const elements=new WeakSet(),taps=new WeakMap(),edges=new WeakMap();
    const capture=window.__bossAudioCapture={mix,destination,plays:[],webAudioConnections:0,errors:[]};
    AudioContext.prototype.createMediaElementSource=function(element){
      const source=createElement.call(this,element);elements.add(element);return source;
    };
    AudioNode.prototype.connect=function(target,...args){
      const result=connect.call(this,target,...args);
      if(target===this.context.destination&&this.context!==mix){
        let tap=taps.get(this.context);
        if(!tap){tap=this.context.createMediaStreamDestination();taps.set(this.context,tap);
          connect.call(mix.createMediaStreamSource(tap.stream),destination);}
        connect.call(this,tap,...args);edges.set(this,tap);capture.webAudioConnections++;
      }
      return result;
    };
    AudioNode.prototype.disconnect=function(target,...args){
      if(target===this.context.destination&&edges.has(this)){
        disconnect.call(this,edges.get(this),...args);edges.delete(this);
      }
      return arguments.length?disconnect.call(this,target,...args):disconnect.call(this);
    };
    HTMLMediaElement.prototype.play=function(...args){
      if(!elements.has(this)){
        try{const source=mix.createMediaElementSource(this);source.connect(mix.destination);source.connect(destination);}
        catch(e){capture.errors.push(e.message);}
      }
      capture.plays.push({at:performance.now(),src:this.currentSrc||this.src,volume:this.volume});
      return play.apply(this,args);
    };
  });
  await page.goto(`${url.origin}/?offlineLeaderboard=1`);
  await page.waitForFunction(()=>window.__game?.currentSceneName==='shipSelect'&&document.body.dataset.menuReady==='1',null,{timeout:120000});
  await page.evaluate(()=>window.__game.startGame(undefined,{countShipUsage:false}));
  await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.boss?.active&&window.__game.scenes.play.introComplete&&!window.__game.scenes.play.levelStartWarmupPending,null,{timeout:120000});
  const setup=await page.evaluate(async()=>{
    const g=window.__game,s=g.scenes.play,m=s.enemyManager;g.app.ticker.stop();
    if(!g.runPolicy.prototype||Object.entries(g.runPolicy).some(([k,v])=>k.startsWith('allow')&&v))throw Error('Unsafe preview policy');
    const c=document.createElement('canvas');c.width=1280;c.height=792;
    const pen=c.getContext('2d'),audio=window.__bossAudioCapture;await audio.mix.resume();
    const f=window.__bossFilm={g,s,m,Boss:m.boss.constructor,c,pen,title:'',pending:[],running:true,frames:0};
    s.firstLightDirector.cancel('boss-audio-preview');s.firstLightDirector.enabled=false;
    m.clearEnemies();m.clearPendingWaveSpawns();s.clearToastState();s.clearBossHazards('boss-audio-preview');
    s.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;s.setPaused(false);
    s.player.invulnerable=true;s.player.invulnerableTime=1e9;s.player.active=true;
    s.introActive=false;s.activeBossIntroCard?.destroy?.();s.activeBossIntroCard=null;
    f.stream=new MediaStream([...c.captureStream(30).getVideoTracks(),...audio.destination.stream.getAudioTracks()]);
    f.recorder=new MediaRecorder(f.stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:4000000,audioBitsPerSecond:128000});
    f.recorder.ondataavailable=e=>{if(e.data.size)f.pending.push(e.data.arrayBuffer().then(b=>{
      const bytes=new Uint8Array(b);let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));
      return window.saveBossFilmChunk(btoa(text));
    }));};
    f.draw=()=>{
      if(!f.running)return;g.app.render();pen.fillStyle='#050b14';pen.fillRect(0,0,1280,792);
      pen.drawImage(g.app.canvas,0,0,1280,720);pen.fillStyle='#85e8dc';pen.font='bold 21px Arial';pen.fillText(f.title,24,750);
      pen.fillStyle='#bdcbd9';pen.font='16px Arial';pen.fillText('LOKAL FORHÅNDSVISNING · ny mekanisk bevegelse · eksisterende spilllyd · udødelig testpilot',24,779);
      f.frames++;f.raf=requestAnimationFrame(f.draw);
    };
    f.raf=requestAnimationFrame(f.draw);
    return {version:JSON.parse(window.render_game_to_text()).buildId,policy:g.runPolicy,
      fixture:'Selected real boss constructors; normal attacks and player controls, immortal test pilot. No production progression. No new audio assets.'};
  });
  for(const profile of profiles){
    const before=await page.evaluate(async profile=>{
      const f=window.__bossFilm,{g,s,m}=f;g.app.ticker.stop();
      m.boss?.cancelAttackWarning('preview-cut');m.clearEnemies();m.clearPendingWaveSpawns();
      s.clearBossHazards('preview-cut');s.clearToastState();
      for(const b of [...s.bulletManager.enemyBullets,...s.bulletManager.playerBullets])if(b.active)s.bulletManager.deactivateBullet(b,'preview-cut');
      const w=s.gameplayGame.getWidth(),h=s.gameplayGame.getHeight();
      const b=new f.Boss(w*.5,h*.26,3,s.gameplayGame,profile);await b.createSprite();
      if(!b.colossusRig?.mechanicalPose)throw Error('Preview must show the new motion candidate');
      m.enemies.push(b);m.boss=b;s.gameContainer.addChild(b.sprite);m.phase='BOSS';m.state='BOSS_ACTIVE';
      m.waveEnding=false;m.bossDefeatedThisLevel=false;m.bossSpawnedThisLevel=true;
      s.player.x=w*.5;s.player.y=h*.84;s.player.sprite.position.set(s.player.x,s.player.y);
      s.player.invulnerable=true;s.player.invulnerableTime=1e9;
      f.title=`${profile.title.toUpperCase()} / ${profile.archetype.toUpperCase()}`;
      const a=window.__bossAudioCapture;
      const start={at:performance.now(),plays:a.plays.length,webAudioConnections:a.webAudioConnections,health:b.health};
      if(f.recorder.state==='inactive')f.recorder.start(1000);g.app.ticker.start();return start;
    },profile);
    for(let i=0;i<6;i++){
      const direction=i%2?'ArrowLeft':'ArrowRight';await page.keyboard.down(direction);
      if(i===2)await page.keyboard.down('Space');if(i===3)await page.keyboard.up('Space');
      await page.waitForTimeout(seconds*1000/6);await page.keyboard.up(direction);
      if(i===2)await page.screenshot({path:path.join(out,`${profile.archetype}.png`)});
    }
    const after=await page.evaluate(()=>{
      const f=window.__bossFilm,a=window.__bossAudioCapture,b=f.m.boss;
      return {at:performance.now(),plays:a.plays.length,webAudioConnections:a.webAudioConnections,
        bossActive:Boolean(b?.active),health:b?.health,lives:f.g.lives,frames:f.frames};
    });
    assert(after.bossActive,`${profile.archetype} preview ended early`);
    assert(after.plays>before.plays,`${profile.archetype} must include actual game audio`);
    chapters.push({family:profile.archetype,before,after});
  }
  const capture=await page.evaluate(()=>new Promise(resolve=>{
    const f=window.__bossFilm,a=window.__bossAudioCapture;f.g.app.ticker.stop();
    f.recorder.onstop=async()=>{await Promise.all(f.pending);f.running=false;cancelAnimationFrame(f.raf);
      f.stream.getTracks().forEach(t=>t.stop());resolve({errors:a.errors,plays:a.plays,webAudioConnections:a.webAudioConnections,frames:f.frames});};
    f.recorder.stop();
  }));
  writeFileSync(path.join(out,'capture.json'),JSON.stringify({setup,chapters,capture,errors,file},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(capture.errors,[]);assert(capture.webAudioConnections>0);
  console.log(JSON.stringify({ok:true,file,chapters:chapters.length,frames:capture.frames,webAudioConnections:capture.webAudioConnections}));
}finally{await context.close();await browser.close();}
