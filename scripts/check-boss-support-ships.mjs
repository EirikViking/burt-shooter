import { readFileSync } from 'node:fs';

import { AssetManifest } from '../src/assets/assetManifest.js';
import {
  BOSS_SUPPORT_SHIP_TOTAL,
  BOSS_SUPPORT_SHIPS,
  getBossSupportShipEventSeed,
  pickBossSupportShipProfile
} from '../src/config/BossSupportShips.js';
import { getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';

if (typeof globalThis.Audio === 'undefined') {
  globalThis.Audio = class AudioStub {
    play() {}
    pause() {}
    load() {}
    addEventListener() {}
    removeEventListener() {}
    cloneNode() {
      return new AudioStub();
    }
  };
}

const { EnemyManager } = await import('../src/managers/EnemyManager.js');

const errors = [];
const fail = (message) => errors.push(message);

const assets = AssetManifest.generated?.enemies || [];
const ids = new Set();
const names = new Set();
const signatures = new Set();
const glyphs = new Set();
const beamStyles = new Set();
const deliveryFx = new Set();

if (BOSS_SUPPORT_SHIPS.length !== BOSS_SUPPORT_SHIP_TOTAL) {
  fail(`expected ${BOSS_SUPPORT_SHIP_TOTAL} boss support ship profiles, found ${BOSS_SUPPORT_SHIPS.length}`);
}

for (const profile of BOSS_SUPPORT_SHIPS) {
  if (!profile.id) fail('support profile missing id');
  if (ids.has(profile.id)) fail(`duplicate support profile id ${profile.id}`);
  ids.add(profile.id);
  if (!profile.displayName || names.has(profile.displayName)) {
    fail(`duplicate/missing support displayName ${profile.displayName || 'none'}`);
  }
  names.add(profile.displayName);
  if (profile.unarmed !== true) fail(`${profile.id} should be unarmed`);
  if (!Number.isFinite(profile.healPercent) || profile.healPercent < 0.04 || profile.healPercent > 0.08) {
    fail(`${profile.id} has unfair healPercent ${profile.healPercent}`);
  }
  if (!Number.isFinite(profile.speed) || profile.speed < 1.2 || profile.speed > 1.9) {
    fail(`${profile.id} has unreadable speed ${profile.speed}`);
  }
  if (!Number.isInteger(profile.health) || profile.health < 2 || profile.health > 4) {
    fail(`${profile.id} has frustrating health ${profile.health}`);
  }
  if (!Number.isInteger(profile.spriteIndex) || profile.spriteIndex < 0 || profile.spriteIndex >= assets.length) {
    fail(`${profile.id} references invalid spriteIndex ${profile.spriteIndex}`);
  }
  if (!assets[profile.spriteIndex]) fail(`${profile.id} missing generated enemy art`);
  if (!profile.glyph) fail(`${profile.id} missing support glyph`);
  if (!profile.beamStyle) fail(`${profile.id} missing support beamStyle`);
  if (!profile.deliveryFx) fail(`${profile.id} missing support deliveryFx`);
  glyphs.add(profile.glyph);
  beamStyles.add(profile.beamStyle);
  deliveryFx.add(profile.deliveryFx);
  signatures.add(profile.behaviorSignature);
}

if (signatures.size !== BOSS_SUPPORT_SHIP_TOTAL) {
  fail(`expected ${BOSS_SUPPORT_SHIP_TOTAL} unique support behavior signatures, found ${signatures.size}`);
}
if (glyphs.size < 8 || beamStyles.size < 8 || deliveryFx.size < 8) {
  fail(`support roles should have distinct live VFX metadata, glyphs=${glyphs.size} beams=${beamStyles.size} delivery=${deliveryFx.size}`);
}

const picked = new Set();
for (let level = 1; level <= 40; level += 1) {
  for (let index = 0; index < 16; index += 1) {
    picked.add(pickBossSupportShipProfile(level, `qa-${level}-${index}`)?.id);
  }
}
if (picked.size < 80) fail(`support picker should cover most variants across seeds, reached ${picked.size}`);

const catalog = getThreatCodexCatalog();
const codexIds = new Set((catalog.enemies || []).map((entry) => entry.id));
for (const profile of BOSS_SUPPORT_SHIPS) {
  if (!codexIds.has(profile.id)) fail(`${profile.id} missing from Threat Codex enemies`);
}

const managerSource = readFileSync('src/managers/EnemyManager.js', 'utf8');
for (const token of [
  'pickBossSupportShipProfile',
  'getBossSupportShipEventSeed',
  'bossSupportShipProfile',
  'recordThreatDiscovery?.(supportProfile.id',
  'guaranteedFirstSupport',
  'getBossFuelShipSupportCount',
  'spawnBossFuelShipSquad',
  'BOSS_FUEL_SINGLE_SUPPORT_HEAL_MULT',
  'BOSS_FUEL_ARMOR_BLEED_DELAY_MS',
  'BOSS_FUEL_ARMOR_BLEED_SPEED_BONUS',
  'isFinishPacingActive',
  'singleSupportHealMultiplier',
  'attachBossFuelTether',
  'updateBossFuelTether',
  'createBossFuelDeliveryBurst',
  'bossFuelShipHealTether'
]) {
  if (!managerSource.includes(token)) fail(`EnemyManager missing support ship runtime token ${token}`);
}

const countProbe = Object.assign(Object.create(EnemyManager.prototype), {
  bossFuelShipsSpawnedThisBoss: 0
});
if (countProbe.getBossFuelShipSupportCount(12, () => 0.05) !== 3) {
  fail('late boss support roll below 10% should request 3 helpers');
}
if (countProbe.getBossFuelShipSupportCount(12, () => 0.2) !== 2) {
  fail('late boss support roll between 10% and 30% should request 2 helpers');
}
if (countProbe.getBossFuelShipSupportCount(12, () => 0.8) !== 1) {
  fail('late boss support roll above 30% should request 1 helper');
}
if (countProbe.getBossFuelShipSupportCount(1, () => 0.05) !== 3) {
  fail('early boss support event should still be able to roll 3 helpers');
}
countProbe.bossFuelShipsSpawnedThisBoss = 2;
if (countProbe.getBossFuelShipSupportCount(12, () => 0.02) !== 1) {
  fail('support squad count should clamp to the absolute three-helper cap');
}
countProbe.bossFuelShipsSpawnedThisBoss = 0;
let rolledOne = 0;
let rolledTwo = 0;
let rolledThree = 0;
for (let i = 0; i < 100; i += 1) {
  const roll = (i + 0.5) / 100;
  const count = countProbe.getBossFuelShipSupportCount(12, () => roll);
  if (count === 1) rolledOne += 1;
  if (count === 2) rolledTwo += 1;
  if (count === 3) rolledThree += 1;
}
if (rolledTwo !== 20 || rolledThree !== 10 || rolledOne !== 70) {
  fail(`support squad distribution should be 70/20/10 over percentile rolls, got ${rolledOne}/${rolledTwo}/${rolledThree}`);
}

const spawnProbe = Object.assign(Object.create(EnemyManager.prototype), {
  state: 'BOSS_ACTIVE',
  level: 5,
  bossDefeatedThisLevel: false,
  bossSpawnedAtMs: 1000,
  bossFuelShipsSpawnedThisBoss: 0,
  bossFuelShipCooldownUntilMs: 0,
  bossFuelShipNextCheckAtMs: 0,
  enemies: [],
  boss: { active: true, health: 80, maxHealth: 100, x: 360, spawnedAtMs: 1000 },
  game: {
    scenes: {
      play: {
        bulletManager: { enemyBullets: [] }
      }
    }
  }
});
let spawned = 0;
spawnProbe.spawnBossFuelShipSquad = (count) => {
  spawned += count;
  return count;
};
const originalDateNow = Date.now;
const originalRandom = Math.random;
try {
  Date.now = () => 10000;
  Math.random = () => 0.99;
  spawnProbe.maybeSpawnBossFuelShip();
  if (spawned !== 1 || spawnProbe.bossFuelShipsSpawnedThisBoss !== 1) {
    fail('first eligible hurt boss should spawn boss support even when random chance is unfavorable');
  }
  spawnProbe.bossFuelShipCooldownUntilMs = 0;
  spawnProbe.bossFuelShipNextCheckAtMs = 0;
  spawnProbe.boss.health = 72;
  spawnProbe.maybeSpawnBossFuelShip();
  if (spawned !== 1) {
    fail('later boss support events should remain chance-gated after the guaranteed first helper');
  }

  const armorBleedSpawnProbe = Object.assign(Object.create(EnemyManager.prototype), {
    state: 'BOSS_ACTIVE',
    level: 5,
    bossDefeatedThisLevel: false,
    bossSpawnedAtMs: 1000,
    bossFuelShipsSpawnedThisBoss: 0,
    bossFuelShipCooldownUntilMs: 0,
    bossFuelShipNextCheckAtMs: 0,
    enemies: [],
    boss: { active: true, health: 17, maxHealth: 100, x: 360, spawnedAtMs: 1000, isFinishPacingActive: () => true },
    game: {
      scenes: {
        play: {
          bulletManager: { enemyBullets: [] }
        }
      }
    }
  });
  let armorBleedSpawned = 0;
  armorBleedSpawnProbe.spawnBossFuelShipSquad = (count) => {
    armorBleedSpawned += count;
    return count;
  };
  Date.now = () => 5000;
  Math.random = () => 0.99;
  armorBleedSpawnProbe.maybeSpawnBossFuelShip();
  if (armorBleedSpawned !== 1 || armorBleedSpawnProbe.bossFuelShipsSpawnedThisBoss !== 1) {
    fail('armor-bleed boss should get early unarmed support before the old default delay');
  }
} finally {
  Date.now = originalDateNow;
  Math.random = originalRandom;
}

let deliveredHeal = 0;
let deliveredSource = null;
let deactivated = false;
const deliveryProbe = Object.assign(Object.create(EnemyManager.prototype), {
  boss: {
    active: true,
    x: 100,
    y: 120,
    maxHealth: 100,
    radius: 70,
    heal(amount, meta = {}) {
      deliveredHeal += amount;
      deliveredSource = meta.source;
      return amount;
    }
  },
  game: {
    getWidth: () => 1366,
    scenes: {
      play: {
        particleManager: {
          createHitSpark() {},
          createBossChargeSparks() {}
        },
        showToast() {}
      }
    }
  }
});
deliveryProbe.updateBossFuelShip({
  active: true,
  x: 96,
  y: 120,
  radius: 18,
  bossFuelProfile: { speed: 0, healPercent: 0.08 },
  sprite: { rotation: 0, x: 96, y: 120 },
  deactivateVisuals() {
    deactivated = true;
  }
}, 1);
if (deliveredHeal !== 8 || deliveredSource !== 'boss_fuel_ship' || !deactivated) {
  fail(`support delivery should heal and deactivate, heal=${deliveredHeal} source=${deliveredSource || 'none'} deactivated=${deactivated}`);
}

let tetherClears = 0;
let tetherStrokes = 0;
let tetherFills = 0;
const fakeTether = {
  visible: false,
  renderable: false,
  alpha: 0,
  clear() {
    tetherClears += 1;
  },
  moveTo() {},
  lineTo() {},
  stroke() {
    tetherStrokes += 1;
  },
  circle() {},
  fill() {
    tetherFills += 1;
  }
};
const tetherProbe = Object.assign(Object.create(EnemyManager.prototype), {});
const tetherEnemy = {
  active: true,
  x: 80,
  y: 110,
  radius: 18,
  bossSupportShipProfile: { tint: 0x8cfbff, accent: 0xff55d9, beamStyle: 'braid' },
  bossFuelProfile: { groupSize: 3, groupSlot: 1 },
  bossFuelTether: fakeTether
};
tetherProbe.updateBossFuelTether(tetherEnemy, {
  active: true,
  x: 220,
  y: 132,
  radius: 74,
  getVisualRadius() {
    return 92;
  }
}, 142);
const tetherDebug = fakeTether._debugBossFuelTether || {};
if (!fakeTether.visible || !fakeTether.renderable || tetherStrokes < 13 || tetherFills < 10) {
  fail(`support tether should draw an active heal beam, visible=${fakeTether.visible} renderable=${fakeTether.renderable} strokes=${tetherStrokes} fills=${tetherFills}`);
}
if (tetherDebug.directionChevronCount < 5 || tetherDebug.intakeBracketCount < 4) {
  fail(`support tether should show heal direction and boss intake cues, chevrons=${tetherDebug.directionChevronCount || 0} intake=${tetherDebug.intakeBracketCount || 0}`);
}
if ((tetherDebug.offscreenEdgeMarkerCount || 0) !== 0) {
  fail(`onscreen support tether should not draw edge markers, found ${tetherDebug.offscreenEdgeMarkerCount}`);
}
tetherProbe.clearBossFuelTether(tetherEnemy);
if (fakeTether.visible || fakeTether.renderable || tetherClears < 2) {
  fail('support tether should clear and hide when the support ship is inactive');
}
if (fakeTether._debugBossFuelTether?.visible !== false) {
  fail('support tether debug state should mark the tether hidden after clear');
}

let offscreenTetherStrokes = 0;
let offscreenTetherFills = 0;
const offscreenTether = {
  visible: false,
  renderable: false,
  alpha: 0,
  clear() {},
  moveTo() {},
  lineTo() {},
  stroke() {
    offscreenTetherStrokes += 1;
  },
  circle() {},
  fill() {
    offscreenTetherFills += 1;
  }
};
const offscreenProbe = Object.assign(Object.create(EnemyManager.prototype), {
  game: {
    getWidth() {
      return 1280;
    },
    getHeight() {
      return 720;
    }
  }
});
const offscreenEnemy = {
  active: true,
  x: 1345,
  y: 300,
  radius: 18,
  bossSupportShipProfile: { tint: 0x8cfbff, accent: 0xff55d9, beamStyle: 'braid' },
  bossFuelProfile: { groupSize: 2, groupSlot: 1 },
  bossFuelTether: offscreenTether
};
offscreenProbe.updateBossFuelTether(offscreenEnemy, {
  active: true,
  x: 820,
  y: 310,
  radius: 74,
  getVisualRadius() {
    return 92;
  }
}, 560);
const offscreenTetherDebug = offscreenTether._debugBossFuelTether || {};
if (!offscreenTether.visible || !offscreenTether.renderable || offscreenTetherDebug.offscreenEdgeMarkerCount < 1 || offscreenTetherStrokes < 16 || offscreenTetherFills < 11) {
  fail(`offscreen support tether should draw an edge marker, visible=${offscreenTether.visible} marker=${offscreenTetherDebug.offscreenEdgeMarkerCount || 0} strokes=${offscreenTetherStrokes} fills=${offscreenTetherFills}`);
}

const firstSupport = pickBossSupportShipProfile(5, getBossSupportShipEventSeed(5, 0));
if (!firstSupport?.id || !Number.isFinite(firstSupport.spriteIndex)) {
  fail('deterministic first support profile should resolve to a generated sprite');
}

if (errors.length) {
  console.error(`[boss-support-ships] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[boss-support-ships] PASS profiles=${BOSS_SUPPORT_SHIPS.length} picked=${picked.size} codex=${BOSS_SUPPORT_SHIPS.length} glyphs=${glyphs.size} beams=${beamStyles.size}`);
