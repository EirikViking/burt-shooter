import assert from 'node:assert/strict';
import { BalanceConfig, GLOBAL_CHALLENGE_TUNING } from '../src/config/BalanceConfig.js';
import { getSpaceSnakeSectionHealth, isSpaceSnakeWave } from '../src/config/SpaceSnakes.js';
import { FirstLightModel } from '../src/game/ArcadeFirstLight.js';
import { BulletManager } from '../src/managers/BulletManager.js';

// A 10% difficulty target is a distributed combat-pressure budget, not a
// promise that every player or encounter will take exactly 10% more damage.
const tuning = GLOBAL_CHALLENGE_TUNING;
for (const [family, components] of Object.entries({
  normal: [tuning.normalMovement, tuning.normalFireChance, tuning.hostileProjectileSpeed],
  boss: [tuning.bossHealth, tuning.bossCadence, tuning.hostileProjectileSpeed],
  snake: [tuning.snakeHealth, tuning.snakeCadence, tuning.hostileProjectileSpeed],
  rival: [tuning.rivalHealth, tuning.rivalCadence, tuning.hostileProjectileSpeed]
})) {
  assert.ok(components.every(value => value > 1 && value < 1.06), `${family} must use several small changes`);
  const budget = components.reduce((product, value) => product * value, 1);
  assert.ok(budget >= 1.09 && budget <= 1.11, `${family} pressure budget ${budget}`);
}

const sector52Health = getSpaceSnakeSectionHealth(52);
assert.ok(sector52Health > 72 && sector52Health < 96, 'snake health recovers some, but not all, of the recent reduction');
for (const [sector, expected] of [[6, 19.5], [7, 22.1], [8, 24.7], [9, 27.3], [10, 29.9]]) {
  assert.ok(Math.abs(getSpaceSnakeSectionHealth(sector) - expected) < 1e-10,
    `Space Snake sections gain exactly 30% health in sector ${sector}`);
}
assert.equal(getSpaceSnakeSectionHealth(5), 15, 'sectors before 6 retain their baseline health');
assert.equal(getSpaceSnakeSectionHealth(11), 24, 'sector 11 and later retain their baseline health');
assert.equal(Array.from({ length: 10000 }, (_, index) => isSpaceSnakeWave(index / 10000)).filter(Boolean).length,
  1200, 'snake admission stays unchanged');

const model = new FirstLightModel('global-challenge-fixture');
for (let frame = 0; frame < 45; frame += 1) model.update(0.1, { sector: 52, safe: true });
assert.equal(model.encounter?.kind, 'rival');
assert.ok(model.encounter.hp.left > 18.8, 'late rival weapon durability increases');

const bullets = new BulletManager({ addChild() {}, sortableChildren: false });
const hostile = { active: true, vx: 3, vy: 4 };
const friendly = { active: true, vx: 3, vy: -4 };
assert.equal(bullets.addEnemyBullet(hostile), true);
assert.equal(bullets.addPlayerBullet(friendly), true);
assert.equal(Math.hypot(hostile.vx, hostile.vy), 5 * tuning.hostileProjectileSpeed);
assert.equal(Math.hypot(friendly.vx, friendly.vy), 5, 'player bullet speed is unchanged');
assert.equal(BalanceConfig.difficulty.bossFairness.regularTelegraphEarlyMs, 1120,
  'the visible early warning duration is preserved');

console.log('PASS distributed normal/boss/snake/rival pressure, snake frequency, projectile ownership and warnings');
