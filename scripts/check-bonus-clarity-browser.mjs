import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';
fs.mkdirSync('test-results/bonus-clarity',{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1920,height:1080}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
await p.goto('http://127.0.0.1:5192/?offlineLeaderboard=1',{waitUntil:'domcontentloaded',timeout:120000});await p.waitForFunction(()=>window.__game?.currentSceneName==='menu',null,{timeout:120000});
const scores=await p.evaluate(async()=>{
 const {Game}=await import('/src/game/Game.js');const {BONUS_CORES}=await import('/src/config/BonusCoreCatalog.js');const {getCoreReward,grantCoreReward}=await import('/src/progression/BonusCoreRewards.js');
 const g=Object.create(Game.prototype);Object.assign(g,{score:0,scoreMultiplier:3,scenes:{play:{player:{scoreMultiplier:4}}},scoreBreakdown:{bonusScore:0,baseScore:0,dangerMultiplierBonus:0,finalScore:0},diag:{asEv:0},rankIndex:0,level:6,getWidth:()=>1920,updateNoRepairReceiptsQualification(){},updateLiveRunRank(){},updateGlobalLeaderboardVoiceCues(){},updateHighscoreChaseCues(){}});
 const rows=[];for(const prize of [500,650,1000,1500,2050]){const before=g.score;rows.push({prize,applied:g.addBonusScore(prize),delta:g.score-before});}
 const scene={game:g,player:{x:100,y:100},enemyManager:{enemies:[],currentWaveIndex:1},wavesCleared:5};
 for(const profile of BONUS_CORES){const core={coreProfile:profile,ageSeconds:3,fragment:1,x:100,y:100,game:g};const expected=getCoreReward(core,scene);const before=g.score;const got=grantCoreReward(core,scene,scene.player);rows.push({core:profile.id,prize:expected,applied:got.score,delta:g.score-before});}
 const expectedNormal=g.getScoreAward(1000),normal=g.addScore(1000);g.finalScoreLocked=true;const locked=g.addBonusScore(1000);return{rows,expectedNormal,normal,locked,breakdown:g.scoreBreakdown};
});for(const r of scores.rows){assert.equal(r.applied,r.prize);assert.equal(r.delta,r.prize);}assert.equal(scores.normal,scores.expectedNormal);assert.equal(scores.locked,0);
await p.evaluate(async()=>{window.a=(await import('/src/audio/AudioManager.js')).AudioManager;a.init();await a.context.resume();a.setMusicEnabled(true);a.setSceneContext('menu');});assert.equal(await p.evaluate(()=>a.menuAudioMode),'ambient');
await p.waitForFunction(()=>a.hangarAmbience?.layers.length===4,null,{timeout:120000});
await p.evaluate(()=>a.setMenuAudioMode('music'));await p.waitForFunction(()=>!a.musicAudio.paused&&a.musicTransitionFactor>.95&&!a.hangarAmbience.active,null,{timeout:120000});
const track=await p.evaluate(()=>a.musicAudio.src);await p.evaluate(()=>window.__game.scenes.menu.openShipSelect());await p.waitForFunction(()=>window.__game.currentSceneName==='shipSelect');await p.evaluate(()=>window.__game.showMenu());await p.waitForFunction(()=>window.__game.currentSceneName==='menu');assert.equal(await p.evaluate(()=>a.musicAudio.src),track);assert.equal(await p.evaluate(()=>a.musicAudio.paused),false);
await p.evaluate(()=>{a.setMenuAudioMode('ambient');a.setMenuAudioMode('music');});await p.waitForTimeout(2000);assert.equal(await p.evaluate(()=>a.musicAudio.paused),false);
await p.evaluate(()=>a.setMenuAudioMode('ambient'));await p.waitForFunction(()=>a.hangarAmbience.active&&a.musicAudio.paused&&a.hangarAmbience.output.gain.value>.001,null,{timeout:60000});
await p.setViewportSize({width:1280,height:720});const layouts=[];
for(const language of ['en','de','zh-CN','ru','es','pt-BR','ko','ja']){
 await p.evaluate(language=>window.__novaI18n.setLanguagePreference(language),language);await p.evaluate(()=>{window.__game.scenes.menu.openSettingsOverlay();window.__game.scenes.menu.settingsOverlay.setActiveSettingsPage('audio');});await p.waitForTimeout(300);
 const state=await p.evaluate(()=>window.__game.scenes.menu.settingsOverlay.getDebugState());assert.ok(state.visibleControls.find(c=>c.id==='menu_audio_mode'));layouts.push({language,state});await p.screenshot({path:`test-results/bonus-clarity/audio-${language}.png`});await p.evaluate(()=>window.__game.scenes.menu.closeSettingsOverlay());
}
await p.evaluate(()=>window.__novaI18n.setLanguagePreference('en'));await p.setViewportSize({width:1920,height:1080});
await p.evaluate(()=>window.__game.showThreatCodex());await p.waitForFunction(()=>window.__game.currentSceneName==='threatCodex');
for(const index of [3,13]){
 await p.evaluate(async index=>{const s=window.__game.scenes.threatCodex;const {THREAT_CODEX_CATEGORIES}=await import('/src/config/ThreatCodexCatalog.js');s.categoryIndex=THREAT_CODEX_CATEGORIES.findIndex(c=>c.id==='bonusDrones');s.entryIndex=index;const {recordThreatSeen}=await import('/src/progression/ThreatDiscoveryState.js');for(const e of s.catalog.bonusDrones)recordThreatSeen(e.id,'bonusDrones');s.refresh();},index);
 await p.waitForTimeout(1500);await p.screenshot({path:`test-results/bonus-clarity/codex-${index}.png`});
}
fs.writeFileSync('test-results/bonus-clarity/qa.json',JSON.stringify({scores,layouts,track,errors},null,2));assert.deepEqual(errors,[]);console.log('PASS exact drone and all core rewards, normal score unchanged, audio switching/navigation, eight locale controls, Codex captures');
}finally{await b.close();}
