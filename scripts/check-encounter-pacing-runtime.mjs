import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.CHECK_OUTPUT_DIR||'E:/Codex/builds/nova-swarm/encounter-pacing/qa';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>/^https?:\/\/127\.0\.0\.1/.test(r.request().url())?r.continue():r.abort());
 await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=> 'dual-boss'};});
 await page.goto((process.env.CHECK_URL||'http://127.0.0.1:5218')+'/?skipIntro=1&offlineLeaderboard=1',{waitUntil:'domcontentloaded',timeout:120000});
 await launchEncounterTestFromHangar(page);
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.discoveryEncounter?.plan,null,{timeout:120000});
 const results=await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play,m=p.enemyManager;g.app.ticker.stop();p.setPaused(false);
  const {Boss}=await import('/src/entities/Boss.js');
  const {BossDiscoveryEncounter}=await import('/src/managers/BossDiscoveryEncounter.js');
  const {MysteryEncounterDirector}=await import('/src/managers/MysteryEncounterDirector.js');
  const {createMysteryEncounter}=await import('/src/entities/mysteries/createMysteryEncounter.js');
  const {mysteryAssetDiagnostics}=await import('/src/entities/mysteries/MysteryAssets.js');
  const {AudioManager}=await import('/src/audio/AudioManager.js');AudioManager.enabled=false;AudioManager.voiceEnabled=false;
  const profile=m.boss.profile; const rows=[];
  const check=(ok,name)=>{if(!ok)throw Error(name);rows.push(name);};
  const wait=async test=>{for(let i=0;i<200&&!test();i++)await new Promise(r=>setTimeout(r,25));if(!test())throw Error('Fixture asset timeout');};
  async function fixture(roll=.15){
   m.clearEnemies();p.clearEnemyBullets();p.clearBossHazards();m.boss=null;m.discoveryEncounter=null;m.state='PACING_QA';
   const boss=new Boss(500,100,31,m.game,profile);await boss.createSprite();m.boss=boss;m.enemies.push(boss);m.container.addChild(boss.sprite);
   const d=m.discoveryEncounter=new BossDiscoveryEncounter(m,boss,{roll,forced:true});return d;
  }
  let d=await fixture();await wait(()=>d.readyGuest);
  check(!m.enemies.includes(d.readyGuest)&&!d.readyGuest.sprite.parent,'prepared guest is absent from scene/enemy list');
  const prepared=d.readyGuest;d.dispose();d.dispose();check(prepared.sprite.destroyed,'cancel prepared guest twice safely');
  d=await fixture();const pending=d.pendingBoss;d.dispose();await wait(()=>!d.pendingBoss);
  check(pending.sprite.destroyed,'cancel in-flight guest load safely');
  d=await fixture();await wait(()=>d.readyGuest);const hp=d.primary.maxHealth;
  d.primary.health=hp*.64;d.update(1);check(d.stage==='warning'&&!d.guest,'warning precedes guest');
  let wipes=0;const oldBullets=p.clearEnemyBullets,oldHazards=p.clearBossHazards;
  p.clearEnemyBullets=()=>wipes++;p.clearBossHazards=()=>wipes++;
  for(let i=0;i<19;i++)d.update(6);
  p.clearEnemyBullets=oldBullets;p.clearBossHazards=oldHazards;
  check(d.guest?.active&&wipes===0,'relay attaches without wiping current attacks');
  check(Date.now()-d.guest.entryStartMs<200&&d.guest.y===d.guest.entryFromY,'preload preserves real entrance animation');
  check(d.primary.health===hp*.64&&d.guest.invulnerableUntilMs===0,'no healing or reinforcement invulnerability');
  d.primary.health=0;d.primary.active=false;d.update(1);check(m.boss===d.guest,'surviving guest owns completion');
  d=await fixture(.22);await wait(()=>d.readyGuest);d.primary.health=d.primary.maxHealth*.64;d.update(1);for(let i=0;i<19;i++)d.update(6);
  d.guest.health=d.guest.maxHealth*.19;d.update(1);check(d.snakeReleaseAt&&!d.snake,'late relay snake has its own warning');
  for(let i=0;i<19;i++)d.update(6);check(d.snake?.sections.some(s=>s.active),'late relay snake arrives');
  const snake=d.snake;d.dispose();check(snake.sections.every(s=>!s.active),'relay snake cleanup');
  // A primary killed in one unusually strong volley still admits the warned
  // guest; it is not restored by EnemyManager's historic instant-kill guard.
  d=await fixture();await wait(()=>d.readyGuest);d.primary.health=0;d.primary.active=false;
  check(d.update(1)&&d.stage==='warning','instant primary kill cannot skip pending guest');
  for(let i=0;i<19;i++)d.update(6);check(d.guest?.active&&d.primary.health===0,'instant-kill path never heals');
  // A failed preload is bounded and cannot strand boss completion.
  const create=Boss.prototype.createSprite;d.dispose();
  Boss.prototype.createSprite=async function(){throw Error('deliberate QA load failure');};
  const failed=new BossDiscoveryEncounter(m,d.primary,{roll:.15,forced:true});m.discoveryEncounter=failed;
  await wait(()=>failed.stage==='failed');Boss.prototype.createSprite=create;
  check(failed.update(1)===false,'failed guest load releases completion');
  m.clearEnemies();m.boss=null;m.discoveryEncounter=null;g.encounterPacing=null;g.mysteriesSeen=[];g.mysteriesRecent=[];
  const md=m.mysteryDirector=new MysteryEncounterDirector(m);
  md.plan={selected:true,sector:m.level,id:'glass_widow',firstContact:true,delaySeconds:0};
  const companion={kind:'boss',active:true,health:100};m.enemies.push(companion);
  md.tryStart({type:'grunt',mysteryId:'glass_widow'});check(!md.busy&&md.plan.deferred,'unfamiliar visitor defers without holding waves');
  m.enemies=[];md.tryStart({type:'grunt',count:6});await wait(()=>md.pending?.ready);md.update(0);
  check(md.active?.type==='glass_widow','deferred visitor retries ordinary wave');
  md.cancel();m.enemies=[];
  for(const id of ['vault_crawler','courier_zero','rail_cathedral']){
   const a=await createMysteryEncounter(m,id);a.state='FORMATION';a.age=2;
   for(const part of a.combat.structural.filter(part=>part.active))part.takeDamage(1e6);
   check(a.combat.coreBonusUntil===6&&a.additionalBonus()===1500,id+' optional exposed-core bonus');
   a.age=6.01;check(a.additionalBonus()===0,id+' bonus expires without damage/forced kill');a.destroy();
  }
  m.enemies=m.enemies.filter(e=>e.active);m.clearEnemies();
  check(mysteryAssetDiagnostics().every(row=>row.refs===0),'Mystery atlas leases released');
  return rows;
 });
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/pacing-runtime.json',JSON.stringify({mode:'Lifecycle fixtures; explicit health thresholds and simulated timer steps, not balance evidence.',results,errors},null,2));
 console.log('PASS',results);
}finally{await browser.close();}
