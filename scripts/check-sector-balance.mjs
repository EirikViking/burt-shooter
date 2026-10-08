import assert from 'node:assert/strict';
import * as balance from '../src/config/BalanceConfig.js';
import {SPACE_SNAKES,getSpaceSnakeMotionRate} from '../src/config/SpaceSnakes.js';
import {planSnakeBrood} from '../src/config/SnakeBroods.js';
import {mysteryDurability} from '../src/config/MysteryDurability.js';
import {MYSTERY_COMBAT} from '../src/config/MysteryCombatProfiles.js';
globalThis.Audio=class {addEventListener(){} removeEventListener(){} load(){} pause(){} play(){return Promise.resolve();}};
const {SpaceSnake}=await import('../src/entities/SpaceSnake.js');
const {Boss}=await import('../src/entities/Boss.js');
const {MysteryCombat}=await import('../src/entities/mysteries/MysteryCombat.js');
const {EnemyManager}=await import('../src/managers/EnemyManager.js');

assert.equal(typeof balance.getSectorAttackPressure,'function');
for(const [sector,expected] of [[1,1],[19,1],[20,1.1],[49,1.1],[50,1.16],[69,1.16],[70,1.24],[200,1.24]]){
  assert.ok(Math.abs(balance.getSectorAttackPressure(sector)-expected)<1e-10,`Sector ${sector}`);
}
assert.equal(balance.getSectorAttackPressure(undefined),1);
assert.equal(getSpaceSnakeMotionRate(5,60,5),1.1);
assert.equal(getSpaceSnakeMotionRate(5,60,1),.55);
assert.equal(getSpaceSnakeMotionRate(1,60,5),1.1);
// Deterministic boundary samples exercise the real probability gate across all families.
for(const profile of SPACE_SNAKES){
  let added=0;
  for(let seed=0;seed<500;seed++){
    const plan=planSnakeBrood({seed,profile});
    assert.equal(plan.enabled,plan.roll<.456,`${profile.id}/${seed}`);
    assert.ok(plan.count>=5&&plan.count<=20);
    if(plan.roll>=.38&&plan.enabled)added++;
  }
  assert.ok(added>0,`${profile.id} gains eligible broods`);
}
assert.equal(mysteryDurability('needle_saint',11,200).hull,50);
assert.equal(mysteryDurability('blind_leviathan',11,200).hull,82);
// Exercise each cadence consumer with a fixed enemy level and changing displayed
// sector: normal-wave offsets must not bring the threshold forward.
for(const [sector,pressure] of [[19,1],[20,1.1],[49,1.1],[50,1.16],[69,1.16],[70,1.24]]){
  const snake={type:'space_snake_grave',level:30,game:{level:sector,getWidth:()=>1280}};
  SpaceSnake.prototype.setupByType.call(snake);
  assert.ok(Math.abs(snake.shootDelay*pressure-104.16024653312787)<1e-8,'Live snake cadence at displayed sector');
  const boss={level:30,game:{level:sector},phase:1,getCombinedBossDifficultyScalar:()=>1,getRunModeBossAttackDangerMultiplier:()=>1,getBossProfileReliefNumber:(_key,fallback)=>fallback};
  assert.ok(Math.abs(Boss.prototype.getPhaseShootDelay.call(boss,1)*pressure-balance.BalanceConfig.difficulty.bossShootDelayBase)<1e-8);
  assert.ok(Math.abs(Boss.prototype.getRegularAttackIntervalMs.call(boss)-Math.round(2628/pressure))<1);
  assert.equal(Boss.prototype.getRegularTelegraphDurationMs.call(boss),900,'Boss warning duration stays intact');
  const actor={type:'needle_saint',level:sector,age:10,manager:{enemies:[]},canAttack:()=>true};
  const combat=new MysteryCombat(actor);combat.fly=()=>{};combat.animate=()=>{};combat.attack=()=>true;combat.structural=[];
  combat.update(1/60);
  assert.ok(Math.abs((combat.next-10)*pressure-MYSTERY_COMBAT.needle_saint.cadence/1.05)<1e-8,'Veilborn cadence scales once');
}
const originalRandom=Math.random;
try {
  for(const [sector,roll,expected] of [[19,.0075,0],[20,.0075,1],[49,.0082,0],[50,.0082,1],[69,.0087,0],[70,.0087,1]]){
    let shots=0,warningDelta;
    const enemy={kind:'enemy',active:true,x:0,y:0,update(){},canShoot:()=>true,shoot:()=>[]};
    const boss={kind:'boss',active:true,x:0,y:0,update(_delta,_x,_y,warning){warningDelta=warning;},canShoot:()=>false};
    const manager={level:sector,state:'WAVE_ACTIVE',phase:'WAVES',enemies:[enemy,boss],
      game:{runPressureDirector:{scaleEnemyFireChance:()=>.01},scenes:{play:{player:{x:100,y:100},bulletManager:{addEnemyBullet(){}}}}},
      getNormalWaveDifficultyLevel:()=>30,getOpeningFireScalar:()=>1,getOpeningMomentumTuning:()=>({enemySpeedMult:1}),
      shouldSweepInactiveEnemy:()=>false,ensureCombatReadabilityIdentity(){},expireChallengeFlightTarget:()=>false,
      recordCombatReadabilityFirstAttack(){shots++;},playEnemyShotFeedback(){}};
    Math.random=()=>roll;
    EnemyManager.prototype.updateEnemies.call(manager,1);
    assert.equal(shots,expected,`Ordinary firing gate uses displayed sector ${sector}`);
    assert.equal(warningDelta,1,'Boss warning clock receives original frame time');
  }
} finally {Math.random=originalRandom;}
console.log('PASS sector boundaries, retained lone-head slowdown, all 14 brood probability gates and Veilborn hulls');
