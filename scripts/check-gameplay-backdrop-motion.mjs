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

  for (let sample = 0; sample <= 120; sample += 1) {
    const elapsedMs = sample * 500;
    const motion = sampleGameplayBackdropMotion(mode, elapsedMs);
    assert.ok(Math.abs(motion.x) <= profile.maxOffsetX + 1e-9, `${mode} x drift exceeded profile`);
    assert.ok(Math.abs(motion.y) <= profile.maxOffsetY + 1e-9, `${mode} y drift exceeded profile`);
    assert.ok(scale * 1920 >= 1920 + Math.abs(motion.x) * 2, `${mode} exposed a horizontal edge`);
    assert.ok(scale * 1080 >= 1080 + Math.abs(motion.y) * 2, `${mode} exposed a vertical edge`);
  }

  assert.deepEqual(
    sampleGameplayBackdropMotion(mode, 12345, { reducedMotion: true }),
    { x: 0, y: 0 },
    `${mode} should stop under reduced motion`
  );
}

assert.deepEqual(GAMEPLAY_BACKDROP_PROFILES.base.alphas, { base: 0.42, storm: 0, boss: 0, shade: 0.46 });
assert.deepEqual(GAMEPLAY_BACKDROP_PROFILES.storm.alphas, { base: 0.26, storm: 0.34, boss: 0, shade: 0.5 });
assert.deepEqual(GAMEPLAY_BACKDROP_PROFILES.boss.alphas, { base: 0.18, storm: 0.16, boss: 0.4, shade: 0.54 });

assert.match(playSource, /generation !== this\.gameplayBackdropLoadGeneration/, 'late backdrop loads must be rejected');
assert.match(playSource, /prepareTextureForRender\(texture, 'generated_gameplay_backdrop'\)/, 'base texture should be prepared before use');
assert.match(playSource, /this\.updateGameplayBackdrop\(delta\)/, 'backdrop motion should update with the starfield');
assert.match(playSource, /getAccessibilitySettings\(\)\.prefersReducedMotion/, 'backdrop motion should respect reduced motion');

console.log('[gameplay-backdrop-motion] PASS modes, coverage, drift bounds, reduced motion, lifecycle guards');
