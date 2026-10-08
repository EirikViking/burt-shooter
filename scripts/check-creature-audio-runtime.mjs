import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {BOSS_ROSTER} from '../src/config/BossRoster.js';
import {SPACE_SNAKES} from '../src/config/SpaceSnakes.js';
const baseline=process.argv.includes('--baseline');
const representative=process.argv.includes('--representative');
const out=`test-results/creature-audio-${baseline?'before':representative?'representative':'after'}`;fs.mkdirSync(out,{recursive:true});
const report={mode:baseline?'baseline':'candidate',errors:[],requests:[],encounters:[]};
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1920,height:1080}});
const changed=['src/entities/Boss.js','src/entities/SpaceSnake.js','src/entities/Enemy.js','src/managers/EnemyManager.js','src/effects/SpaceSnakeDeath.js','src/scenes/PlayScene.js'];
const old=new Map(baseline?changed.map(p=>[p,execFileSync('git',['show',`db53532:${p}`],{encoding:'utf8',maxBuffer:4e6})]):[]);
await context.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.pathname==='/api/highscores')return route.fulfill({status:200,contentType:'application/json',body:'[]'});
 if(!['localhost','127.0.0.1'].includes(u.hostname)&&!['data:','blob:'].includes(u.protocol))return route.abort();
 // Vite must transform original imports; replacement occurs before its transform by routing source text imports through its normal URL rewriting.
 if(old.has(u.pathname.slice(1))){const response=await route.fetch();const current=await response.text();const imports=[...current.matchAll(/from\s*["']([^"']+)["']/g)].map(m=>m[1]);let body=old.get(u.pathname.slice(1));
  body=body.replace(/from\s*(['"])([^'"]+)\1/g,(match,quote,src)=>{if(!src.startsWith('.')){const transformed=imports.find(p=>p.includes(`/deps/${src.replaceAll('/','_').replaceAll('.','__')}.js`));return transformed?`from '${transformed}'`:match;}return `from '${new URL(src,u).pathname}'`;});
  return route.fulfill({response,body});}
 return route.continue();
});
const page=await context.newPage();page.on('pageerror',e=>{report.errors.push(e.message);console.error(e.message);});
page.on('response',r=>{if(r.url().includes('/creatures-v2/'))report.requests.push({url:r.url(),status:r.status()});});
try{
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5201'}/?offlineLeaderboard=1`);
 console.log('Page loaded');
 await page.waitForFunction(()=>window.__game?.scenes?.menu?.astraMenuShip?.ready,null,{timeout:120000});
 await page.mouse.click(900,950);
 await page.evaluate(()=>window.__game.startGame('nova-player-ship-01.png',{runMode:'ranked_tactical'}));
 await page.waitForFunction(()=>window.__game?.scenes?.play?.enemyManager?.state==='WAVE_ACTIVE',null,{timeout:120000});
 await page.evaluate(async baseline=>{
  const g=window.__game,p=g.scenes.play;g.markUnrankedRun('creature_audio_qa');p.externalPauseSuppressedUntil=Number.MAX_SAFE_INTEGER;p.setPaused(false);p.player.invulnerable=true;p.player.invulnerableTimer=1e9;p.player.takeDamage=()=>false;
  const a=(await import('/src/audio/AudioManager.js')).AudioManager;window.__audio=a;await a.unlockAudio();a.enabled=true;a.musicEnabled=true;
  window.__creature=baseline?null:(await import('/src/audio/CreatureAudio.js')).CreatureAudio;
  window.__creatureEvents=[];if(window.__creature){let last=window.__creature.lastEvent;Object.defineProperty(window.__creature,'lastEvent',{get:()=>last,set:value=>{last=value;window.__creatureEvents.push(value);}});}
  // Capture the actual mix, including HTML media weapons/music and the Web Audio creature bus.
  const ctx=a.context,dest=ctx.createMediaStreamDestination();window.__mixDest=dest;
  const connect=AudioNode.prototype.connect;AudioNode.prototype.connect=function(target,...args){const result=connect.call(this,target,...args);if(target===ctx.destination)connect.call(this,dest);return result;};
  const routed=new WeakSet();function routeElement(el){if(routed.has(el))return;try{const node=ctx.createMediaElementSource(el);node.connect(ctx.destination);routed.add(el);}catch{}}
  routeElement(a.musicAudio);
  const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(...args){routeElement(this);return play.apply(this,args);};
  window.__chunks=[];window.__rec=new MediaRecorder(dest.stream,{mimeType:'audio/webm;codecs=opus',audioBitsPerSecond:160000});window.__rec.ondataavailable=e=>window.__chunks.push(e.data);window.__mixStart=performance.now();window.__rec.start(500);
 },baseline);
 const selected=(baseline||representative)?[BOSS_ROSTER[0],BOSS_ROSTER[6],BOSS_ROSTER[17],BOSS_ROSTER[49],SPACE_SNAKES[0],SPACE_SNAKES[5],SPACE_SNAKES[12],SPACE_SNAKES[13]]:[...BOSS_ROSTER,...SPACE_SNAKES];
 if(representative)selected.push(BOSS_ROSTER[22],BOSS_ROSTER[47],SPACE_SNAKES[6]);
 for(const profile of selected){
  console.log('Encounter',profile.id);
  const row=await page.evaluate(async profile=>{
   const g=window.__game,p=g.scenes.play,m=p.enemyManager;p.setPaused(false);g.app.ticker.start();m.clearPendingWaveSpawns();m.enemies.forEach(e=>e.destroy());m.enemies=[];m.waveEnding=false;m.level=profile.index||6;m.state='WAVE_ACTIVE';m.waveActiveTimer=0;g.level=m.level;
   window.__creature?.stopAll();
   window.__creatureEvents=[];
   p.player.x=g.getWidth()*.5;p.player.y=g.getHeight()*.88;
   if(profile.id.startsWith('space_snake')){g.level=m.level=12;window.__encounter=m.spawnSpaceSnake(profile);window.__audio.playMusicContext('gameplay',{force:true});}
   else{window.__encounter=await m.spawnBoss(profile.index,{marketingDebug:true});window.__encounter.health=window.__encounter.maxHealth=1000000;window.__encounter.entryImpactTriggered=true;window.__audio.playMusicContext('boss',{force:true});}
   return {id:profile.id,start:performance.now(),audioTime:(performance.now()-window.__mixStart)/1000};
  },profile);
  await page.keyboard.down('Space');await page.waitForTimeout(baseline?4300:representative?4300:2300);await page.keyboard.up('Space');
  if(!baseline){
   // All authored states through actual entity hooks; staged phase/damage only in this isolated test context.
   await page.evaluate(profile=>{
    const e=window.__encounter,p=window.__game.scenes.play;
    if(e.sections){const head=e.sections.find(s=>s.active);if(head){head.shoot(p.player.x,p.player.y);head.chain.age=20;head.chain.nextCryAt=0;head.update(1);}}
    else{e.phase=2;e.monsterVoiceClock=3;e.updateMonsterVoice(1);}
   },profile);
   await page.waitForTimeout(representative?3000:400);
   if(profile.index===1||profile.id==='space_snake_carrion')await page.screenshot({path:`${out}/${profile.id}.png`});
   row.audio=await page.evaluate(()=>window.__creature.diagnostics());
   assert.ok(row.audio.cached<=4&&row.audio.bytes<=36*1024*1024);
   if(representative){
    await page.evaluate(()=>{const e=window.__encounter;if(e.sections){for(const s of e.sections.slice(1,Math.ceil(e.sections.length*.65)))if(s.active)s.takeDamage(10000000);e.nextCryAt=0;const head=e.sections.find(s=>s.active);if(head)head.update(1);}else{e.phase=3;e.health=e.maxHealth*.2;e.monsterVoiceClock=3;e.updateMonsterVoice(1);}});
    await page.waitForTimeout(3500);
   }
   await page.evaluate(()=>{const e=window.__encounter,p=window.__game.scenes.play;if(e.sections){for(const s of e.sections)if(s.active){s.takeDamage(10000000);p.onEnemyKilled(s);}}else{p.triggerBossDeathImpact({boss:e,color:e.color,type:e.profile.id});e.active=false;}});
   await page.waitForTimeout(representative?4400:300);
   row.events=await page.evaluate(()=>window.__creatureEvents);
   assert.ok(row.events.some(e=>e.id===profile.id&&e.event==='arrival'),`No actual arrival playback ${profile.id}: ${JSON.stringify(row)}`);
   assert.ok(row.events.some(e=>e.id===profile.id&&e.event==='death'),`No actual death playback ${profile.id}`);
   assert.ok(row.events.every(e=>e.rate===1),'Do not substitute transposition for identities');
  }
  report.encounters.push(row);
 }
 const recording=await page.evaluate(async()=>{await new Promise(resolve=>{window.__rec.onstop=resolve;window.__rec.stop();});const data=new Uint8Array(await new Blob(window.__chunks).arrayBuffer());let s='';for(let i=0;i<data.length;i+=8192)s+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(s);});
 fs.writeFileSync(`${out}/combat-mix.webm`,Buffer.from(recording,'base64'));
 if(!baseline){await page.evaluate(()=>window.__game.scenes.play.setPaused(true));assert.equal(await page.evaluate(()=>window.__creature.active.size),0);await page.evaluate(()=>window.__game.switchScene('menu'));assert.deepEqual(await page.evaluate(()=>{const d=window.__creature.diagnostics();return[d.active,d.cached,d.bytes];}),[0,0,0]);}
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=e.stack;throw e;}finally{fs.writeFileSync(`${out}/result.json`,JSON.stringify(report,null,2));await browser.close();}
