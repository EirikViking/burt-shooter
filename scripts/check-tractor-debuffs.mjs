import fs from 'node:fs';
import path from 'node:path';

import { SFX_CATALOG } from '../src/audio/SoundCatalog.js';
import { TRACTOR_DEBUFF_IMMUNITY_MS, TRACTOR_DEBUFFS } from '../src/config/TractorDebuffs.js';

const root = process.cwd();
const errors = [];

function fail(message) {
  errors.push(message);
}

if (TRACTOR_DEBUFFS.length !== 10) fail(`expected 10 tractor debuffs, found ${TRACTOR_DEBUFFS.length}`);
if (TRACTOR_DEBUFF_IMMUNITY_MS < 4000 || TRACTOR_DEBUFF_IMMUNITY_MS > 8000) {
  fail(`tractor immunity should be 4-8s, got ${TRACTOR_DEBUFF_IMMUNITY_MS}ms`);
}

const ids = new Set();
for (const effect of TRACTOR_DEBUFFS) {
  if (!effect.id) fail('debuff missing id');
  if (ids.has(effect.id)) fail(`duplicate debuff id ${effect.id}`);
  ids.add(effect.id);
  if (!effect.label) fail(`${effect.id} missing label`);
  if (!effect.category) fail(`${effect.id} missing category`);
  if (!Number.isFinite(effect.durationMs) || effect.durationMs <= 0) fail(`${effect.id} invalid duration ${effect.durationMs}`);
  if (effect.id === 'weapon_jam' && effect.durationMs > 1250) fail('weapon_jam must stay very short');
  if (effect.severity === 'strong' && effect.id !== 'weapon_jam' && effect.durationMs > 2600) {
    fail(`${effect.id} strong debuff lasts too long (${effect.durationMs}ms)`);
  }
  if (!Number.isFinite(effect.color)) fail(`${effect.id} missing numeric color`);
  if (!effect.iconType) fail(`${effect.id} missing iconType`);
}

const required = [
  'engine_drag',
  'weapon_jam',
  'fire_rate_drain',
  'powerup_nullification',
  'control_drift',
  'shield_flicker',
  'target_scramble',
  'cooldown_spike',
  'energy_leak',
  'sensor_glitch'
];
for (const id of required) {
  if (!ids.has(id)) fail(`missing required debuff ${id}`);
}

for (const key of ['tractor_capture_sting', 'tractor_debuff_apply', 'tractor_debuff_expire']) {
  if (!SFX_CATALOG[key]) fail(`missing tractor SFX catalog key ${key}`);
}

const playerSource = fs.readFileSync(path.resolve(root, 'src/entities/Player.js'), 'utf8');
const hijackerSource = fs.readFileSync(path.resolve(root, 'src/entities/Hijacker.js'), 'utf8');
const playSceneSource = fs.readFileSync(path.resolve(root, 'src/scenes/PlayScene.js'), 'utf8');

for (const method of [
  'applyTractorDebuff',
  'updateStatusEffects',
  'clearStatusEffects',
  'getActiveStatusEffects',
  'getTractorDebuffState'
]) {
  if (!new RegExp(`${method}\\s*\\(`).test(playerSource)) fail(`Player missing ${method}`);
}

if (!/tractorDebuffImmunityUntil/.test(playerSource)) fail('Player missing tractor debuff immunity state');
if (!/TRACTOR_DEBUFF_IMMUNITY_MS/.test(playerSource)) fail('Player does not use tractor immunity constant');
if (!/statusEffects\.set/.test(playerSource)) fail('Player does not store applied status effects');
if (!/statusEffects\.delete/.test(playerSource)) fail('Player does not expire status effects');
if (!/hasStatusEffect\('weapon_jam'\)/.test(playerSource)) fail('weapon_jam must block shooting through canShoot');
if (!/isPowerupSuppressed\(\)/.test(playerSource)) fail('powerup nullification helper missing');
if (!/isDefenseSuppressed\(\)/.test(playerSource)) fail('shield flicker/defense suppression helper missing');
if (!/clearStatusEffects\('respawn'\)/.test(playerSource)) fail('forceRespawn must clear tractor debuffs');
if (!/clearStatusEffects(?:\?\.)?\('life_lost'\)/.test(playSceneSource)) fail('PlayScene.onLifeLost must clear tractor debuffs');
if (!/applyTractorDebuff\?\.\(\{[\s\S]*source: 'hijacker_tractor'/.test(hijackerSource)) {
  fail('Hijacker tractor beam must call player.applyTractorDebuff with source');
}
if (!/source: this\.type/.test(fs.readFileSync(path.resolve(root, 'src/entities/Enemy.js'), 'utf8'))) {
  fail('elite tractor puller must apply tractor debuffs through the same player API');
}
if (!/debuff_\$\{effect\.id\}/.test(playerSource)) fail('HUD state export must include debuff timers');

if (errors.length) {
  console.error(`[tractor-debuffs] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[tractor-debuffs] PASS debuffs=${TRACTOR_DEBUFFS.length} immunityMs=${TRACTOR_DEBUFF_IMMUNITY_MS}`);
