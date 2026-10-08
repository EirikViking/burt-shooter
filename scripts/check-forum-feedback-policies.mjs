import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { getRankRecoveryIds } from '../src/achievements/RankAchievementRecovery.js';
import { predictIntercept } from '../src/combat/PredictiveAim.js';
import { assaultGuideStart, assaultWindows, configureColossusAssault } from '../src/config/ColossusAssault.js';
import { getSpaceSnakeMotionRate } from '../src/config/SpaceSnakes.js';
import { grantCoreReward } from '../src/progression/BonusCoreRewards.js';
import { BONUS_CORES } from '../src/config/BonusCoreCatalog.js';
const {SteamAchievementsBridge}=createRequire(import.meta.url)('../electron/steamAchievementsBridge.cjs');
const progress={pilotRank:27};
assert.deepEqual(getRankRecoveryIds(progress),[],'XP without eligible evidence cannot create achievements');
assert.equal(getRankRecoveryIds(progress,['ACH_RANK_26']).length,26);
assert.equal(getRankRecoveryIds({...progress,rankAchievementsUnlocked:['ACH_RANK_27']}).length,27);
const best={source:'steam_player_best',score:500,entry:{careerRankExact:'28'}};
assert.equal(getRankRecoveryIds(progress,[],best).at(-1),'ACH_RANK_27');
for(const source of ['local','cloud','steam_downloaded_player_best'])assert.deepEqual(getRankRecoveryIds(progress,[],{...best,source}),[]);
assert.deepEqual(getRankRecoveryIds(progress,[],{...best,entry:{...best.entry,seed:true}}),[]);
assert.equal(getRankRecoveryIds({...progress,pilotRank:10},[],best).length,10);

for(const id of ['76561198231493012','76561198000000000'])for(const appId of [4765070,480]){
 const unlocked=new Set(),writes=[];
 const manager={getAllAchievements:async()=>[...unlocked].map(apiName=>({apiName,unlocked:true})),
  isAchievementUnlocked:async id=>unlocked.has(id),unlockAchievement:async id=>{writes.push(id);unlocked.add(id);return true;}};
 const bridge=new SteamAchievementsBridge({steamClientBridge:{initialize:async()=>true,getStatus:()=>({appId,available:true}),getCurrentSteamId:()=>id,steam:{achievements:manager,user:{isLoggedOn:()=>true}}}});
 await Promise.all([bridge.getAllAchievements(),bridge.getAllAchievements()]);await bridge.getAllAchievements();
 assert.deepEqual(writes,id==='76561198231493012'&&appId===4765070?['ACH_RANK_27']:[],'Support receipt is account/app scoped and idempotent');
}

const origin={x:0,y:0}, target={x:0,y:300,aimVelocityX:4,aimVelocityY:0};
const aim=predictIntercept(origin,target,10);
assert.ok(Math.abs(Math.hypot(aim.x,aim.y)/10-aim.time)<.0001);
assert.ok(aim.x>100,'Crossing target is led');
assert.deepEqual(predictIntercept(origin,{x:0,y:300},10),{x:0,y:300,time:30});
assert.ok(predictIntercept(origin,{x:0,y:300,aimVelocityY:20},10).time<=60);
assert.equal(getSpaceSnakeMotionRate(1,0),1);
assert.ok(getSpaceSnakeMotionRate(5,5)<.35);
assert.equal(getSpaceSnakeMotionRate(5,100),1);

const hazard={kind:'beam',armingMs:240,durationMs:500,elapsedMs:0};
configureColossusAssault(hazard,{profile:{archetype:'ram'},phase:1});
// Use a known family from the shipped configuration.
if(!hazard.colossus)hazard.colossus={travelMs:740,legacyActiveMs:260,motion:'spear',phase:1};
assert.equal(assaultGuideStart(hazard,900),0);
hazard.elapsedMs=850;
assert.equal(assaultGuideStart(hazard,900),assaultWindows(hazard,900)[0][0]);
hazard.elapsedMs=980;assert.ok(Math.abs(assaultGuideStart(hazard,900)-900)<.001);

const play=fs.readFileSync(new URL('../src/scenes/PlayScene.js',import.meta.url),'utf8');
const method=play.slice(play.indexOf('  triggerChainLightning('),play.indexOf('  drawLightningArc(')).trim();
const chain=Function('AudioManager','claimExperimentalChainLightningOrigin','recordExperimentalChainLightningOrigin',`return ({${method}}).triggerChainLightning;`)({playSfx(){}},()=>true,()=>{});
function chainProbe(multipart){const root={},source={x:0,y:0,kind:'enemy'};const enemies=[1,2,3].map(i=>({x:i*20,y:0,active:true,kind:multipart?'mystery_part':'enemy',root}));return chain.call({game:{},player:{chainLightningActive:true},enemyManager:{enemies},drawLightningArc(){},applyCombatDamage(){return false;}},source,10).hitCount;}
assert.equal(chainProbe(true),1);assert.equal(chainProbe(false),3);

for(const [count,timer,expected]of [[10,200,1500],[0,0,0],[10,0,0]]){
 const scene={game:{level:10,addBonusScore:n=>n},enemyManager:{enemies:[]},comboCount:count,comboTimerMs:timer,comboWindowMs:1500,comboMultiplier:2};
 grantCoreReward({coreProfile:BONUS_CORES[0],x:0,y:0},scene,{});
 assert.equal(scene.comboTimerMs,expected);assert.equal(scene.comboCount,count);assert.equal(scene.comboMultiplier,2);
}
console.log('PASS earned-rank evidence, exact-account repair, intercept aim, committed snake motion, lane cleanup, component budget and live-combo refresh');
