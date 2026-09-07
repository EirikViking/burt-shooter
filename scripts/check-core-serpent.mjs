import assert from 'node:assert/strict';
import { BONUS_CORES, pickBonusCore } from '../src/config/BonusCoreCatalog.js';
import { SPACE_SNAKES, isSpaceSnakeEligible, isSpaceSnakeWave, sampleSpaceSnake } from '../src/config/SpaceSnakes.js';
import { getEarlyBossFuelMultiplier } from '../src/config/BossSupportShips.js';
import { getPowerupMeta } from '../src/config/PowerupCatalog.js';
import { getCoreReward } from '../src/progression/BonusCoreRewards.js';
import { rollCoreSectorGap, makeCoreCadence, spendCoreCadence } from '../src/config/BonusCoreCadence.js';
import { getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';
import { getSpaceSnakeText } from '../src/i18n/coreSerpentText.js';
assert.equal(BONUS_CORES.length,10);
assert.equal(new Set(BONUS_CORES.map(c=>c.reward)).size,10);
assert.equal(new Set(BONUS_CORES.map(c=>c.art)).size,10);
for(const core of BONUS_CORES){assert.equal(core.effect,undefined);assert.equal(pickBonusCore((core.index+.5)/10),core);}
const scene = {game:{level:6,getWidth:()=>1280},player:{x:500,y:500},enemyManager:{currentWaveIndex:1,enemies:[]},wavesCleared:4};
const core = reward => ({coreProfile:BONUS_CORES.find(c=>c.reward===reward),ageSeconds:0,fragment:2});
assert.equal(getCoreReward(core('treasure'),scene),600);
assert.equal(getCoreReward(core('pursuit'),scene),1000);
assert.equal(getCoreReward({...core('pursuit'),ageSeconds:12},scene),200);
assert.equal(getCoreReward(core('daredevil'),scene),250);
scene.enemyManager.enemies=[1,2,3,4].map(()=>({active:true,x:510,y:510}));
assert.equal(getCoreReward(core('daredevil'),scene),1000);
assert.equal(getCoreReward(core('survivor'),scene),650);
scene.bonusCoreRun.lastHitWave=4;assert.equal(getCoreReward(core('survivor'),scene),250);
scene.bonusCoreRun.waveKey='6:1';scene.bonusCoreRun.waveKills=100;assert.equal(getCoreReward(core('hunter'),scene),950);
scene.enemyManager.currentWaveIndex=2;assert.equal(getCoreReward(core('hunter'),scene),200);
scene.bonusCoreRun.chain=3;assert.equal(getCoreReward(core('collector'),scene),500);
scene.bonusCoreRun.fragments=[0,1];assert.equal(getCoreReward(core('constellation'),scene),1800);
assert.equal(getCoreReward({...core('constellation'),fragment:1},scene),200);
assert.equal(getCoreReward({...core('jackpot'),ageSeconds:2.1},scene),1400);
assert.equal(getCoreReward({...core('jackpot'),ageSeconds:4},scene),200);
assert.equal(getCoreReward(core('archive'),scene),400);assert.equal(getCoreReward(core('relic'),scene),400);
let gapSum=0;for(let i=0;i<3000;i++)gapSum+=rollCoreSectorGap((i+.5)/3000);
assert.equal(gapSum/3000,3);
for(const roll of[0,.2,.5,.8,.999]){const cadence=makeCoreCadence(1,()=>roll);assert.ok(cadence.nextLevel>=2&&cadence.nextLevel<=4);spendCoreCadence(cadence,10,()=>roll);assert.ok(cadence.nextLevel>=12&&cadence.nextLevel<=14);}
for(let level=1;level<=5;level++)assert.equal(isSpaceSnakeEligible({},level,{}),false,'No snakes before sector six');
assert.ok(isSpaceSnakeEligible({},6,{}));
for(const flag of ['isChallenge','isMayhemReinforcement','isBossMayhemReinforcement','allowConcurrentSpawn','highSectorAuthoredEncounter'])assert.equal(isSpaceSnakeEligible({[flag]:true},60,{}),false);
assert.equal(isSpaceSnakeEligible({},6,{runMode:'daily_signal'}),false);
assert.equal(isSpaceSnakeEligible({},6,{lateGameExperiment:{active:true}}),false);
assert.ok(isSpaceSnakeWave(0));assert.ok(isSpaceSnakeWave(.199999));assert.equal(isSpaceSnakeWave(.2),false);assert.equal(isSpaceSnakeWave(NaN),false);
let state=9182,spawns=0,previous=-1;const gaps=new Set();
for(let i=0;i<10000;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;if(isSpaceSnakeWave(state/2**32)){spawns++;if(previous>=0)gaps.add(i-previous);previous=i;}}
assert.ok(spawns>1800&&spawns<2200);assert.ok(gaps.size>15,'Random intervals rather than every fifth wave');
for(const p of SPACE_SNAKES)for(const [w,h]of[[800,600],[1280,720],[1920,1080]])for(let t=0;t<90;t+=.1){
 const pos=sampleSpaceSnake(p,t,w,h);assert.ok(Number.isFinite(pos.x)&&Number.isFinite(pos.y));
 assert.ok(pos.x>=w*.1&&pos.x<=w*.9);assert.ok(pos.y>=-140&&pos.y<h*.76);
}
for(let level=1;level<=20;level++)assert.equal(getEarlyBossFuelMultiplier(level),1.5);
for(const level of[21,50,90,410])assert.equal(getEarlyBossFuelMultiplier(level),1);
for(const locale of['en','de','es','ru','zh-CN','pt-BR','ko','ja']){
 const catalog=getThreatCodexCatalog({locale});assert.equal(catalog.spaceSnakes.length,4);
 for(const core of BONUS_CORES){const entry=catalog.bonusCores.find(e=>e.id===core.id);assert.ok(entry?.description&&entry?.tip,`Complete core Codex ${core.id} ${locale}`);assert.ok(!catalog.powerups.some(e=>e.id===core.id));}
 for(const p of SPACE_SNAKES){const text=getSpaceSnakeText(p.index,locale);assert.ok(text.description.length>70&&text.tip.length>20);if(locale!=='en')assert.notEqual(text.description,getSpaceSnakeText(p.index).description);}
}
console.log(`PASS ten fixed cores, four snakes, eight locales, bounds, fuel levels 1–410; randomized sample ${spawns}/10000 with ${gaps.size} gap lengths`);
