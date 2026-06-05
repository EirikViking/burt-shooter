import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SFX_CATALOG, SFX_MIX } from '../src/audio/SoundCatalog.js';

const playScene = readFileSync('src/scenes/PlayScene.js', 'utf8');
const enemyManager = readFileSync('src/managers/EnemyManager.js', 'utf8');
const powerupManager = readFileSync('src/managers/PowerupManager.js', 'utf8');

const requiredEvents = [
  'combo_tick',
  'combo_breakout',
  'nova_wave_clear_sweep',
  'levelComplete',
  'powerup',
  'powerup_pickup',
  'boss_explode',
  'boss_phase_surge'
];

for (const event of requiredEvents) {
  assert.ok(SFX_CATALOG[event]?.length > 0, `missing SFX catalog event: ${event}`);
  assert.ok(SFX_MIX[event], `missing SFX mix entry: ${event}`);
}

assert.ok(
  playScene.includes("AudioManager.playSfx('combo_tick', { force: false, volume: 0.16, minIntervalMs: 900 })"),
  'every-10 combo bonus should keep scoring but use a softened, non-forced tick'
);
assert.ok(
  playScene.includes("AudioManager.playSfx(options.sfxKey || 'nova_wave_clear_sweep'"),
  'wave clear effect should default to the distinct wave-clear sweep'
);
assert.ok(
  enemyManager.includes("sfxKey: hasUpcomingWave ? 'nova_wave_clear_sweep' : 'levelComplete'"),
  'wave clear and sector clear should route to distinct SFX events'
);
assert.ok(
  powerupManager.includes("'powerup_pickup'") && powerupManager.includes('AudioManager.playSfx(sfxKey'),
  'powerup pickup should route through the dedicated powerup_pickup SFX event'
);
assert.ok(
  playScene.includes("AudioManager.playSfx('powerup_pickup'"),
  'powerup collision path should not fall back to the generic pickup event'
);

function assertNoSharedAssets(left, right) {
  const leftAssets = new Set(SFX_CATALOG[left] || []);
  const shared = (SFX_CATALOG[right] || []).filter((asset) => leftAssets.has(asset));
  assert.equal(shared.length, 0, `${left} and ${right} must not share assets: ${shared.join(', ')}`);
}

assertNoSharedAssets('combo_tick', 'nova_wave_clear_sweep');
assertNoSharedAssets('combo_tick', 'powerup_pickup');
assertNoSharedAssets('nova_wave_clear_sweep', 'levelComplete');
assertNoSharedAssets('nova_wave_clear_sweep', 'powerup_pickup');
assertNoSharedAssets('levelComplete', 'powerup_pickup');
assertNoSharedAssets('boss_explode', 'powerup_pickup');
assertNoSharedAssets('boss_phase_surge', 'levelComplete');

console.log('[release-hardening-audio] PASS combo, wave clear, sector clear, powerup pickup, and boss SFX pools are distinct');
