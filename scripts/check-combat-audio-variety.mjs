import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { SFX_CATALOG, SFX_MIX } from '../src/audio/SoundCatalog.js';

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

console.log('[check-combat-audio-variety] PASS');
