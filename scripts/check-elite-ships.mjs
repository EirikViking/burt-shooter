import fs from 'node:fs';
import path from 'node:path';

import { SFX_CATALOG } from '../src/audio/SoundCatalog.js';
import { AssetManifest } from '../src/assets/assetManifest.js';
import { BalanceConfig } from '../src/config/BalanceConfig.js';
import {
  ELITE_MIDDLE_SHIP_ASSET_COUNT,
  ELITE_MIDDLE_SHIPS,
  getEliteMiddleShipMaxActive,
  getEliteMiddleShipsForLevel,
  planEliteMiddleShipSpawns
} from '../src/config/EliteMiddleShips.js';
import { ENEMY_ATTACK_STYLE_IDS } from '../src/config/EnemyAttackStyles.js';
import { ENEMY_MOVEMENT_STYLE_IDS } from '../src/config/EnemyMovementStyles.js';

const root = process.cwd();
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function existsPublic(publicPath) {
  return fs.existsSync(path.join(root, 'public', String(publicPath || '').replace(/^\//, '')));
}

function deterministicRandom(values) {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

const manifestAssets = AssetManifest.generated?.eliteMiddleShips || [];
if (ELITE_MIDDLE_SHIPS.length !== 20) fail(`expected 20 elite profiles, found ${ELITE_MIDDLE_SHIPS.length}`);
if (ELITE_MIDDLE_SHIPS.length !== ELITE_MIDDLE_SHIP_ASSET_COUNT) {
  fail(`asset count constant should be ${ELITE_MIDDLE_SHIPS.length}, got ${ELITE_MIDDLE_SHIP_ASSET_COUNT}`);
}
if (manifestAssets.length !== 20) fail(`AssetManifest.generated.eliteMiddleShips expected 20, found ${manifestAssets.length}`);

const ids = new Set();
const roles = new Set();
const activeSfxKeys = new Set();
const validMovement = new Set(ENEMY_MOVEMENT_STYLE_IDS);
const validAttack = new Set(ENEMY_ATTACK_STYLE_IDS);
const validSfx = new Set(Object.keys(SFX_CATALOG));

for (const profile of ELITE_MIDDLE_SHIPS) {
  if (!profile.id || !profile.type) fail(`profile missing id/type: ${JSON.stringify(profile)}`);
  if (ids.has(profile.id)) fail(`duplicate elite id ${profile.id}`);
  ids.add(profile.id);
  if (!profile.displayName) fail(`${profile.id} missing displayName`);
  if (!profile.role) fail(`${profile.id} missing role`);
  roles.add(profile.role);
  if (!Number.isFinite(profile.minLevel) || profile.minLevel < 3 || profile.minLevel > 40) {
    fail(`${profile.id} invalid minLevel ${profile.minLevel}`);
  }
  if (!Number.isFinite(profile.health) || profile.health < 8 || profile.health > 30) {
    fail(`${profile.id} health should stay between normal enemies and bosses, got ${profile.health}`);
  }
  if (!validMovement.has(profile.movementStyle)) fail(`${profile.id} invalid movementStyle ${profile.movementStyle}`);
  if (!validAttack.has(profile.fireStyle)) fail(`${profile.id} invalid fireStyle ${profile.fireStyle}`);
  if (!profile.specialAbility) fail(`${profile.id} missing specialAbility`);
  if (!Array.isArray(profile.vfx) || profile.vfx.length === 0) fail(`${profile.id} missing VFX hooks`);
  if (!Number.isFinite(profile.spawnWeight) || profile.spawnWeight <= 0) fail(`${profile.id} invalid spawnWeight`);
  if (!profile.asset || !manifestAssets.includes(profile.asset)) fail(`${profile.id} asset not listed in manifest: ${profile.asset}`);
  if (!existsPublic(profile.asset)) fail(`${profile.id} missing asset file ${profile.asset}`);
  if (!profile.sfx?.active) {
    fail(`${profile.id} missing unique active SFX key`);
  } else {
    if (activeSfxKeys.has(profile.sfx.active)) fail(`${profile.id} reuses active SFX key ${profile.sfx.active}`);
    activeSfxKeys.add(profile.sfx.active);
    if (!/^elite_[a-z0-9_]+_active$/.test(profile.sfx.active)) {
      fail(`${profile.id} active SFX should use a generated elite role key, got ${profile.sfx.active}`);
    }
  }
  for (const [event, key] of Object.entries(profile.sfx || {})) {
    if (!validSfx.has(key)) fail(`${profile.id} sfx.${event} references missing SFX key ${key}`);
  }
}

if (roles.size !== 20) fail(`expected 20 distinct roles, found ${roles.size}`);
if (activeSfxKeys.size !== 20) fail(`expected 20 unique elite active SFX keys, found ${activeSfxKeys.size}`);
const level11 = getEliteMiddleShipsForLevel(11);
const level40 = getEliteMiddleShipsForLevel(40);
if (level11.length >= 20) fail('level 11 must not expose all 20 elite middle ships');
if (level11.length < 3 || level11.length > 5) warn(`level 11 exposes ${level11.length} elites; expected a small early pool`);
if (level40.length !== 20) fail(`level 40 should expose all 20 elites, found ${level40.length}`);
if (getEliteMiddleShipMaxActive(10) !== 1) fail('early/mid game should cap active elites at 1');
if (getEliteMiddleShipMaxActive(40) > 2) fail('late game active elite cap should stay careful, max 2');

for (const level of [1, 2, 3, 5, 11, 20, 30, 40]) {
  const plan = planEliteMiddleShipSpawns(level, 6, deterministicRandom([0, 0.15, 0.3, 0.55, 0.75]));
  for (const item of plan) {
    if (item.waveIndex <= 0 || item.waveIndex >= 5) fail(`level ${level} elite planned too close to boss/first wave: waveIndex ${item.waveIndex}`);
    const profile = ELITE_MIDDLE_SHIPS.find((entry) => entry.id === item.eliteMiddleShipId);
    if (!profile) fail(`level ${level} plan references unknown elite ${item.eliteMiddleShipId}`);
    if (profile && profile.minLevel > level) fail(`level ${level} plans ${profile.id} before minLevel ${profile.minLevel}`);
  }
}

if (BalanceConfig.difficulty.MIN_WAVES_BETWEEN_BOSSES !== 6) fail('MIN_WAVES_BETWEEN_BOSSES must remain 6');
if (BalanceConfig.difficulty.wavesPerBossBase !== 6) fail('wavesPerBossBase must remain 6');
if (BalanceConfig.difficulty.wavesPerBossMax !== 8) fail('wavesPerBossMax must remain 8');

const managerSource = fs.readFileSync(path.resolve(root, 'src/managers/EnemyManager.js'), 'utf8');
if (/Math\.random\(\)\s*<\s*eliteChance[\s\S]{0,80}\.applyElite\?\.\(\)/.test(managerSource)) {
  fail('old random applyElite bullet-sponge path should not be used for middle ships');
}
if (!/spawnEliteMiddleShip\(config\.eliteMiddleShipId/.test(managerSource)) {
  fail('EnemyManager must spawn planned elite middle ships from wave configs');
}

for (const warning of warnings) console.warn(`[elite-ships] warning: ${warning}`);
if (errors.length) {
  console.error(`[elite-ships] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[elite-ships] PASS profiles=${ELITE_MIDDLE_SHIPS.length} level11=${level11.length} level40=${level40.length} assets=${manifestAssets.length}`);
