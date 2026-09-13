import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GAMEPLAY_BACKDROP_PROFILES,
  getGameplayBackdropCoverScale,
  resolveGameplayBackdropMode,
  sampleGameplayBackdropMotion
} from '../src/config/GameplayBackdropMotion.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playSource = fs.readFileSync(path.join(root, 'src', 'scenes', 'PlayScene.js'), 'utf8');

assert.equal(resolveGameplayBackdropMode(1), 'base');
assert.equal(resolveGameplayBackdropMode(3), 'storm');
assert.equal(resolveGameplayBackdropMode(5), 'boss');
assert.equal(resolveGameplayBackdropMode(4, { enemyState: 'BOSS_GATE' }), 'boss');
assert.equal(resolveGameplayBackdropMode(4, { enemyState: 'BOSS_ACTIVE' }), 'boss');
assert.equal(resolveGameplayBackdropMode(4, { bossActive: true }), 'boss');

for (const [mode, profile] of Object.entries(GAMEPLAY_BACKDROP_PROFILES)) {
  const scale = getGameplayBackdropCoverScale({
    textureWidth: 1920,
    textureHeight: 1080,
    width: 1920,
    height: 1080,
    mode
  });
  assert.ok(scale > 1, `${mode} should overscan the source texture`);
  assert.ok(profile.maxOffsetY >= 124, `${mode} should provide visible vertical camera travel`);
  assert.ok(profile.periodYMs <= 35000, `${mode} travel should remain visibly active during short waves`);

  const samples = [];
  for (let sample = 0; sample <= 120; sample += 1) {
    const elapsedMs = sample * 500;
    const motion = sampleGameplayBackdropMotion(mode, elapsedMs);
    samples.push(motion);
    assert.ok(Math.abs(motion.x) <= profile.maxOffsetX + 1e-9, `${mode} x drift exceeded profile`);
    assert.ok(Math.abs(motion.y) <= profile.maxOffsetY + 1e-9, `${mode} y drift exceeded profile`);
    assert.ok(scale * 1920 >= 1920 + Math.abs(motion.x) * 2, `${mode} exposed a horizontal edge`);
    assert.ok(scale * 1080 >= 1080 + Math.abs(motion.y) * 2, `${mode} exposed a vertical edge`);
  }

  const verticalSpan = Math.max(...samples.map(({ y }) => y)) - Math.min(...samples.map(({ y }) => y));
  const strongestFiveSecondTravel = Math.max(
    ...samples.slice(0, -10).map((motion, index) => Math.hypot(
      samples[index + 10].x - motion.x,
      samples[index + 10].y - motion.y
    ))
  );
  assert.ok(verticalSpan >= profile.maxOffsetY * 1.9, `${mode} should traverse nearly the full vertical camera rail`);
  assert.ok(strongestFiveSecondTravel >= 30, `${mode} camera travel should be perceptible during ordinary play`);

  assert.deepEqual(
    sampleGameplayBackdropMotion(mode, 12345, { reducedMotion: true }),
    { x: 0, y: 0 },
    `${mode} should stop under reduced motion`
  );
}

assert.deepEqual(GAMEPLAY_BACKDROP_PROFILES.base.alphas, { base: 0.46, storm: 0, boss: 0, shade: 0.42 });
assert.deepEqual(GAMEPLAY_BACKDROP_PROFILES.storm.alphas, { base: 0.25, storm: 0.42, boss: 0, shade: 0.45 });
assert.deepEqual(GAMEPLAY_BACKDROP_PROFILES.boss.alphas, { base: 0.16, storm: 0.18, boss: 0.48, shade: 0.48 });

assert.match(playSource, /generation !== this\.gameplayBackdropLoadGeneration/, 'late backdrop loads must be rejected');
assert.match(playSource, /prepareTextureForRender\(texture, 'generated_gameplay_backdrop'\)/, 'base texture should be prepared before use');
assert.match(playSource, /this\.updateGameplayBackdrop\(delta\)/, 'backdrop motion should update with the starfield');
assert.match(playSource, /\[this\.gameplayBackdrop, 0\.55\]/, 'backdrop layers should retain depth-separated parallax');
assert.match(playSource, /getAccessibilitySettings\(\)\.prefersReducedMotion/, 'backdrop motion should respect reduced motion');
assert.match(playSource, /this\.cosmicTravelLayers\.push\(warpStreaks\)/, 'foreground travel streaks should reinforce speed');
assert.match(playSource, /this\.cosmicAuroraBands\.push\(band\)/, 'animated aurora bands should add large-scale depth');

console.log('[gameplay-backdrop-motion] PASS modes, visible camera travel, coverage, reduced motion, lifecycle guards');
