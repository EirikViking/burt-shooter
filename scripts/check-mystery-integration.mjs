import {launchEncounterTestFromHangar} from './encounter-test-hangar.mjs';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const out='test-results/mysteries/integration';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
await page.route('**/*',r=>/^(https?:\/\/(localhost|127\.0\.0\.1)(:|\/)|blob:|data:)/.test(r.request().url())?r.continue():r.abort());
await page.addInitScript(()=>{window.__novaEncounterTest={getPreset:async()=> 'mystery:glass_widow'};});
try{
 await page.goto(`${process.env.CHECK_URL||'http://127.0.0.1:5213'}/?skipIntro=1&offlineLeaderboard=1`,{waitUntil:'domcontentloaded',timeout:120000});
 await launchEncounterTestFromHangar(page);
 await page.waitForFunction(()=>window.__game?.scenes.play?.enemyManager?.mysteryDirector?.active,null,{timeout:120000});
 const checks=await page.evaluate(async()=>{
  const g=window.__game,p=g.scenes.play,m=p.enemyManager;g.app.ticker.stop();m.clearEnemies();p.clearEnemyBullets();
  p.isDebugInvincibleActive=()=>true;p.inputManager.isFiring=()=>false;
  const {planMysteryLevel}=await import('/src/config/Mysteries.js');
  const {mysteryAssetDiagnostics,acquireMysteryAtlas}=await import('/src/entities/mysteries/MysteryAssets.js');
  const {MysteryAudio}=await import('/src/audio/MysteryAudio.js');
  const {AudioManager}=await import('/src/audio/AudioManager.js');
  const checks={};
  g.encounterTest=null;g.isDebugRun=false;g.runMode='mayhem_tactical';g.level=m.level=20;g.mysteriesSeen=[];g.mysteriesRecent=[];
  const original=[{type:'grunt',count:5},{type:'BOSS'},{type:'scout',count:4}];
  let seed=1;while(!planMysteryLevel({sector:20,seed,waves:original,game:g}).selected)seed++;
  g.contentDirector.seed=seed;m.waves=original.map(w=>({...w}));m.currentWaveIndex=0;m.state='WAVE_ACTIVE';m.phase='WAVES';m.waveEnding=false;
  m.mysteryDirector.startLevel();const d=m.mysteryDirector;
  m.currentWaveIndex=d.plan.waveIndex;const selected=m.waves[m.currentWaveIndex];
  checks.plan={...d.plan};checks.protected=d.protectsUpcomingWaves();m.spawnWave(selected);
  checks.replacesWave=m.enemies.length===0&&Boolean(d.pending)&&m.spawning;
  for(let i=0;i<400&&!d.pending?.ready;i++)await new Promise(r=>setTimeout(r,10));
  for(let i=0;i<300&&!d.active;i++)m.update(1);
  const root=d.active;if(!root)throw Error('Natural selected wave did not spawn');
  checks.rootOnly=m.enemies.filter(e=>e.active&&e.kind!=='mystery_part').length===1;
  checks.noBonusDrone=!m.allowBonusDroneSpawns();checks.noRareVisitor=!m.spawnRareChaosVisitor(1);
  const score=g.score;p.applyCombatDamage(root,1e6,'bomb');p.onEnemyKilled(root);
  const after=g.score;p.onEnemyKilled(root);checks.noDuplicateKill=g.score===after&&root.mysteryKillRecorded;
  checks.bonus=root.stats.bonus;checks.scoreDelta=after-score;m.update(1);checks.normalWaveEnds=m.waveEnding&&m.state==='WAVE_ACTIVE';
  // Cancellation wins even if the same atlas finishes loading immediately afterwards.
  m.clearEnemies();m.waveEnding=false;m.currentWaveIndex=0;g.encounterTest={mysteryId:'glass_widow'};
  d.startLevel();m.spawnWave(m.waves[0]);d.cancel();await new Promise(r=>setTimeout(r,400));m.updateEnemies(1);
  checks.cancelRefs=mysteryAssetDiagnostics().reduce((n,r)=>n+r.refs,0);checks.cancelActive=m.enemies.filter(e=>e.active).length;
  // A failed natural arrival restores its original wave exactly once without rerolling.
  let fallback=0;const spawn=m.spawnWave;m.spawnWave=config=>{if(config.skipMystery)fallback++;};
  d.plan={selected:true,sector:20,id:'glass_widow',consumed:true};d.pending={id:'glass_widow',config:selected,error:new Error('QA missing asset'),age:0};
  d.update(1);d.update(1);m.spawnWave=spawn;checks.fallback=fallback;
  // Reacquisition during LRU eviction must not return a destroyed source.
  for(let pass=0;pass<4;pass++)for(const id of ['glass_widow','doorwraith','bloom_queen','rail_cathedral']){
    const lease=await acquireMysteryAtlas(id);if(lease.frames.topLeft.destroyed||lease.frames.topLeft.source.destroyed)throw Error('Destroyed atlas lease');lease.release();
  }
  await new Promise(r=>setTimeout(r,100));checks.cache=mysteryAssetDiagnostics();
  const fake={};await MysteryAudio.prepare({id:'glass_widow'});AudioManager.inMenu=false;AudioManager.enabled=true;await AudioManager.context.resume();
  const incidental={audio:{volume:0},voicePriority:30,volumeBus:'voice',volumeMultiplier:1};AudioManager.activeVoices.set('qa',incidental);
  MysteryAudio.play(fake,{id:'glass_widow'},'warning');await new Promise(r=>setTimeout(r,80));
  checks.voiceDucked=incidental.audio.volume<=AudioManager.masterVolume*AudioManager.voiceVolume*.4;
  MysteryAudio.stopAll();checks.voiceRestored=Math.abs(incidental.audio.volume-AudioManager.masterVolume*AudioManager.voiceVolume)<.001;AudioManager.activeVoices.delete('qa');
  return checks;
 });
 for(const key of ['protected','replacesWave','rootOnly','noBonusDrone','noRareVisitor','noDuplicateKill','normalWaveEnds','voiceDucked','voiceRestored'])assert.equal(checks[key],true,key);
 assert.equal(checks.bonus,3400);assert.equal(checks.cancelRefs,0);assert.equal(checks.cancelActive,0);assert.equal(checks.fallback,1);assert.ok(checks.cache.length<=2);
 // Codex reveals information in stages and never loads the unknown atlas.
 const codex=[];
 for(const locale of ['en','de','es','pt-BR','zh-CN','ru','ko','ja']){
  const result=await page.evaluate(async locale=>{
   const g=window.__game;g.scenes.play.enemyManager.clearEnemies();
   const i18n=await import('/src/i18n/index.js');await i18n.setLanguagePreference(locale);
   const state=await import('/src/progression/ThreatDiscoveryState.js');state.resetDiscoveryStateForTests();
   const {ThreatCodexScene}=await import('/src/scenes/ThreatCodexScene.js');
   const {THREAT_CODEX_CATEGORIES}=await import('/src/config/ThreatCodexCatalog.js');
   const scene=new ThreatCodexScene(g);scene.categoryIndex=THREAT_CODEX_CATEGORIES.findIndex(r=>r.id==='mysteries');
   g.app.stage.removeChildren();g.app.stage.addChild(scene.container);scene.init();
   const entry=scene.catalog.mysteries[0],unknownArt=scene.getEntryArt(entry,'mysteries');
   state.recordThreatSeen(entry.id,'mysteries',{name:entry.name,sector:11});scene.init();
   const seen=scene.isDiscovered(entry,'mysteries');await new Promise(r=>setTimeout(r,160));
   const collect=node=>[...(node.text?[String(node.text)]:[]),...(node.children||[]).flatMap(collect)];
   const seenText=collect(scene.container).join('\n');
   state.recordThreatDefeated(entry.id,'mysteries',{name:entry.name,sector:11});scene.init();await new Promise(r=>setTimeout(r,160));
   g.app.renderer.render(g.app.stage);window.__mysteryCodex=scene;
   const defeatedText=collect(scene.container).join('\n');
   return{locale,unknownArt,seen,seenLocked:seenText.includes(i18n.translateText('Defeat this Mystery to unlock counterplay.')),tip:entry.tip,tipVisible:defeatedText.includes(entry.tip),categoryLocalized:locale==='en'||!defeatedText.includes('MYSTERIES'),text:defeatedText};
  },locale);
  assert.equal(result.unknownArt,null);assert.ok(result.seen&&result.seenLocked&&result.tipVisible&&result.categoryLocalized);
  await page.screenshot({path:`${out}/codex-${locale}.png`});codex.push(result);
  await page.evaluate(()=>window.__mysteryCodex.destroy());
 }
 assert.deepEqual(errors,[]);writeFileSync(`${out}/results.json`,JSON.stringify({checks,codex,errors},null,2));console.log('PASS natural replacement, isolation, cleanup, audio duck, eight-locale staged Codex');
}finally{await browser.close();}
