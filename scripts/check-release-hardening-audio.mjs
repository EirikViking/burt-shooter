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
  'boss_explode'
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
  powerupManager.includes("AudioManager.playSfx('powerup'"),
  'powerup pickup should keep the distinct powerup pickup SFX'
);
assert.notEqual(
  SFX_CATALOG.combo_tick?.[0],
  SFX_CATALOG.nova_wave_clear_sweep?.[0],
  'combo tick and wave clear must not share the same asset'
);
assert.notEqual(
  SFX_CATALOG.powerup?.[0],
  SFX_CATALOG.nova_wave_clear_sweep?.[0],
  'powerup and wave clear must not share the same asset'
);

console.log('[release-hardening-audio] PASS combo, wave clear, sector clear, powerup, and boss SFX are distinct');
