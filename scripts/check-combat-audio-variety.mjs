import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SFX_CATALOG, SFX_MIX } from '../src/audio/SoundCatalog.js';
import { GENERATED_ENEMY_DEATH_SFX } from '../src/config/GeneratedEnemyProfiles.js';

const audioManager = readFileSync('src/audio/AudioManager.js', 'utf8');
const enemyManager = readFileSync('src/managers/EnemyManager.js', 'utf8');
const playScene = readFileSync('src/scenes/PlayScene.js', 'utf8');

for (const key of ['enemy_shoot', 'enemy_explode', 'pickup', 'powerup', 'powerup_pickup']) {
  const variants = SFX_CATALOG[key] || [];
  assert.ok(variants.length >= 2, `${key} needs at least two authored variants`);
  assert.equal(new Set(variants).size, variants.length, `${key} variants must be distinct assets`);
}

assert.ok(SFX_MIX.enemy_shoot.priority < SFX_MIX.enemy_explode.priority,
  'enemy fire must sit below kill impacts in the SFX priority mix');
assert.ok(SFX_MIX.enemy_explode.priority < SFX_MIX.pickup.priority,
  'pickup moments must outrank routine kill impacts');
assert.ok(SFX_MIX.pickup.priority < SFX_MIX.powerup.priority,
  'power-up moments must outrank ordinary pickups');
assert.ok(SFX_MIX.enemy_shoot.priorityDuckFactor > 0.5,
  'important enemy fire must remain audible while a celebration is ducking the mix');
assert.ok(SFX_MIX.powerup.priorityHoldMs > SFX_MIX.pickup.priorityHoldMs,
  'power-up mix priority must hold longer than a normal pickup');

assert.match(audioManager, /sfxVariantBags/,
  'AudioManager must keep per-event SFX variant bags');
assert.match(audioManager, /pickSfxVariant\(eventName, variants\)/,
  'AudioManager must select SFX through the non-repeating variant picker');
assert.match(audioManager, /sfxPriorityLock/,
  'AudioManager must expose a bounded SFX priority lock');
assert.match(audioManager, /priorityDucked/,
  'AudioManager must duck only lower-priority combat SFX');
assert.match(audioManager, /const src = this\.pickSfxVariant\(eventName, variants\)/,
  'playSfx must use the variant bag rather than unconstrained random repetition');
assert.match(enemyManager, /AudioManager\.playSfx\('enemy_shoot'/,
  'signature enemy fire must have an audible threat cue');
assert.match(enemyManager, /isPriorityEnemy \|\| isDiveThreat \|\| isClose/,
  'enemy fire cue must remain gated to readable threat moments');
assert.doesNotMatch(playScene, /AudioManager\.playSfx\('powerup_pickup'/,
  'collision handling must not layer a duplicate generic pickup sting over the category-owned sound');
assert.match(playScene, /AudioManager\.playSpectacleAccent\?\.\('pickup'/,
  'ordinary pickups need a restrained positional accent');
assert.match(playScene, /cooldownKey:\s*'pickup_spatial'/,
  'ordinary positional pickup accents need one bounded cooldown lane');
assert.match(playScene, /pitchScale = 0\.94 \+ \(Math\.abs\(hashString\(type\)\) % 7\) \* 0\.02/,
  'ordinary pickup accents need deterministic per-type pitch variety');

assert.ok(!GENERATED_ENEMY_DEATH_SFX.includes('spawn_special'),
  'generated enemy deaths must not reuse the five-second spawn/engine event');
for (const eventName of GENERATED_ENEMY_DEATH_SFX) {
  for (const url of SFX_CATALOG[eventName] || []) {
    const filePath = path.resolve('public', String(url).replace(/^\//, ''));
    const probe = spawnSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ], { encoding: 'utf8' });
    assert.equal(probe.status, 0, `could not inspect generated death SFX ${url}`);
    const durationSeconds = Number(probe.stdout);
    assert.ok(Number.isFinite(durationSeconds) && durationSeconds <= 2.1,
      `generated death SFX ${url} is ${durationSeconds}s; sustained beds cannot be kill one-shots`);
  }
}

console.log('[check-combat-audio-variety] PASS');
