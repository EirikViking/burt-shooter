import assert from 'node:assert/strict';
import { getSpaceSnakeDamageMultiplier, ONSLAUGHT_SNAKE_EXPOSED_SECONDS } from '../src/config/SpaceSnakes.js';

assert.equal(ONSLAUGHT_SNAKE_EXPOSED_SECONDS, .72);
for (const mode of ['overrun_tactical', 'overrun_pure']) {
  assert.equal(getSpaceSnakeDamageMultiplier(mode, 2.9, 3.72), 1, 'entry remains protected from bonus damage');
  assert.equal(getSpaceSnakeDamageMultiplier(mode, 3.1, 3.72), 1.55, 'post-volley opening rewards aggression');
  assert.equal(getSpaceSnakeDamageMultiplier(mode, 3.73, 3.72), 1, 'opening closes after the telegraph');
}
for (const mode of ['ranked', 'ranked_tactical', 'scout', 'sector_start', 'daily_signal']) {
  assert.equal(getSpaceSnakeDamageMultiplier(mode, 3.1, 3.72), 1, `${mode} tuning is unchanged`);
}
console.log('[onslaught-snake-window] PASS two Onslaught variants, entry/window/closed timing, Arcade and other modes unchanged');
