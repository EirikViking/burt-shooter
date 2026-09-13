import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {MYSTERIES} from '../src/config/Mysteries.js';
const root=process.env.CHECK_OUTPUT_DIR||'E:/Codex/builds/nova-swarm/mystery-v2/qa';fs.mkdirSync(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],rows=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message);});
await page.route('**/*',r=>/^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(r.request().url())?r.continue():r.abort());
await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=> 'mystery:all'};});
try{
 await page.goto((process.env.CHECK_URL||'http://127.0.0.1:5217')+'/?skipIntro=1&offlineLeaderboard=1',{waitUntil:'domcontentloaded',timeout:120000});
 await launchEncounterTestFromHangar(page);
 await page.waitForFunction(()=>window.__game?.scenes.play?.player?.sprite&&window.__game.scenes.play.enemyManager?.waves?.length,null,{timeout:120000});
 await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play;g.app.ticker.stop();p.setPaused(false);p.introActive=false;p.introComplete=true;if(p.introOverlay)p.introOverlay.visible=false;
  const {AudioManager}=await import('/src/audio/AudioManager.js');AudioManager.enabled=false;AudioManager.stopAllVoices();
  p.isDebugInvincibleActive=()=>true;p.inputManager.isFiring=()=>false;p.player.sprite.visible=true;p.player.shipSprite.visible=true;
 });
 const ids=process.env.MYSTERY_V2_IDS?.split(',')||MYSTERIES.map(p=>p.id);
 for(const id of ids){
  await page.evaluate(async id=>{
   const g=window.__game,p=g.scenes.play,m=p.enemyManager;m.clearEnemies();p.clearEnemyBullets();p.clearBossHazards();m.state='MYSTERY_QA';m.boss=null;m.discoveryEncounter=null;
   const {createMysteryEncounter}=await import('/src/entities/mysteries/createMysteryEncounter.js');g.level=m.level=40;
   window.__qaMystery=await createMysteryEncounter(m,id);window.__qaMotion=[];window.__qaPeak=0;
  },id);
  const run=async frames=>page.evaluate(frames=>{
   const g=window.__game,p=g.scenes.play,m=p.enemyManager,a=window.__qaMystery;
   for(let n=0;n<frames;n++){
    p.player.x=g.getWidth()*(.5+Math.sin(a.age*1.3)*.32);p.player.y=g.getHeight()*.83;p.player.sprite.position.set(p.player.x,p.player.y);
    m.updateEnemies(1);p.bulletManager.update(1);p.particleManager.update(1);
    if(n%20===0)window.__qaMotion.push([a.x,a.y]);window.__qaPeak=Math.max(window.__qaPeak,p.bulletManager.enemyBullets.filter(b=>b.active).length);
   }
   g.app.renderer.render(g.app.stage);
  },frames);
  await run(360);await page.screenshot({path:`${root}/${id}-combat.png`});
  await run(240);
  const row=await page.evaluate(()=>{
   const g=window.__game,p=g.scenes.play,m=p.enemyManager,a=window.__qaMystery;
   const before=g.score,part=a.parts.find(p=>p.structural&&p.active),oldHealth=a.health;
   if(part)p.applyCombatDamage(part,part.maxHealth+1,'player_projectile');
   for(let i=0;i<8;i++){m.updateEnemies(1);p.bulletManager.update(1);p.particleManager.update(1);}
   g.app.renderer.render(g.app.stage);
   return {id:a.type,attacks:a.stats.attacks,warnings:a.stats.warnings,breaks:a.stats.breaks,partScore:g.score-before,partDamagesHull:part?a.health<oldHealth:null,
    xRange:Math.max(...window.__qaMotion.map(p=>p[0]))-Math.min(...window.__qaMotion.map(p=>p[0])),yRange:Math.max(...window.__qaMotion.map(p=>p[1]))-Math.min(...window.__qaMotion.map(p=>p[1])),
    peakBullets:window.__qaPeak,zones:a.zones.length,sprites:a.fx.pool.length,positionsValid:a.parts.every(p=>Number.isFinite(p.x+p.y)),health:a.health,
    weapons:a.combat.p.weapons,motion:a.combat.p.motion};
  });
  await page.screenshot({path:`${root}/${id}-damage.png`});
  const counterplay=await page.evaluate(()=>{
    const g=window.__game,p=g.scenes.play,a=window.__qaMystery,before=g.score;
    for(const part of a.combat.structural.filter(p=>p.active))p.applyCombatDamage(part,1e6,'player_projectile');
    a.update(1);a.combat.charge=null;a.combat.next=a.age;a.combat.step=1;a.update(1);
    return {score:g.score-before,ports:a.combat.ports().length,alive:a.active,health:a.health,
      ownedZones:a.zones.filter(z=>z.owner?.active===false).length,
      invisibleTargets:a.parts.filter(p=>!p.sprite.visible&&p.active&&p.radius>0).length,
      cadence:a.combat.next-a.age,exposed:a.combat.structural.length>0};
  });
  assert.equal(counterplay.score,0);assert.equal(counterplay.ports,0);assert.ok(counterplay.alive&&counterplay.health>0);
  assert.equal(counterplay.ownedZones,0);assert.equal(counterplay.invisibleTargets,0);
  const kill=await page.evaluate(()=>{
    const g=window.__game,p=g.scenes.play,a=window.__qaMystery,before=g.score;
    const first=p.applyCombatDamage(a,1e6,'player_projectile'),again=p.applyCombatDamage(a,1e6,'player_projectile');a.destroy();a.destroy();for(let i=0;i<90;i++)p.enemyManager.mysteryAftermath?.update(1);
    return {first,again,bonus:g.score-before,zones:a.zones.length,queued:a.combat.queue.length,pool:a.fx.pool.length};
  });
  const escape=await page.evaluate(async id=>{
    const g=window.__game,p=g.scenes.play,m=p.enemyManager;m.clearEnemies();p.clearEnemyBullets();
    const {createMysteryEncounter}=await import('/src/entities/mysteries/createMysteryEncounter.js');
    const a=await createMysteryEncounter(m,id),before=g.score;
    a.age=2;a.state='FORMATION';a.combat.shot('lance',0);a.combat.shot('bomb',0);
    a.age=a.definition.escapeSeconds+.1;a.update(1);const r={outcome:a.stats.outcome,score:g.score-before,queued:a.combat.queue.length,zones:a.zones.length,bullets:a.bullets.filter(b=>b.active).length};
    a.destroy();a.destroy();return r;
  },id);
  assert.equal(escape.outcome,'escaped');for(const key of ['score','queued','zones','bullets'])assert.equal(escape[key],0);
  rows.push({...row,counterplay,kill,escape});fs.writeFileSync(`${root}/all-runtime.json`,JSON.stringify({mode:'Isolated runtime fixtures; real actors with stepped clock and QA invulnerability. Not human balance evidence.',rows,errors},null,2));
  assert.ok(row.attacks>=4,`${id} attacks promptly and repeatedly`);assert.ok(row.xRange>180&&row.yRange>75,`${id} active movement`);
  assert.ok(row.peakBullets<=180&&row.sprites<=180&&row.positionsValid);assert.equal(row.partScore,0);assert.ok(row.partDamagesHull!==false);
  assert.ok(kill.first&&!kill.again);assert.equal(kill.queued,0);assert.equal(kill.pool,0);assert.deepEqual(errors,[]);
  console.log(JSON.stringify(row));
 }
 const end=await page.evaluate(async()=>{
   const {mysteryAssetDiagnostics}=await import('/src/entities/mysteries/MysteryAssets.js');
   const {getThreatCodexCatalog,THREAT_CODEX_CATEGORIES}=await import('/src/config/ThreatCodexCatalog.js');
   if(!THREAT_CODEX_CATEGORIES.some(c=>c.id==='mysteries'&&c.label==='Veilborn')||getThreatCodexCatalog().mysteries?.length!==56)throw Error('Veilborn Codex roster incomplete');
   return {refs:mysteryAssetDiagnostics().reduce((n,r)=>n+r.refs,0)};
 });assert.equal(end.refs,0);
}finally{await browser.close();}
