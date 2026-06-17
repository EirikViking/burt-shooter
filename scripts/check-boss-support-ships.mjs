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
  signatures.add(profile.behaviorSignature);
}

if (signatures.size !== BOSS_SUPPORT_SHIP_TOTAL) {
  fail(`expected ${BOSS_SUPPORT_SHIP_TOTAL} unique support behavior signatures, found ${signatures.size}`);
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
for (const token of ['pickBossSupportShipProfile', 'getBossSupportShipEventSeed', 'bossSupportShipProfile', 'recordThreatDiscovery?.(supportProfile.id', 'guaranteedFirstSupport']) {
  if (!managerSource.includes(token)) fail(`EnemyManager missing support ship runtime token ${token}`);
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
spawnProbe.spawnBossFuelShip = () => {
  spawned += 1;
  return true;
};
const originalDateNow = Date.now;
const originalRandom = Math.random;
try {
  Date.now = () => 10000;
  Math.random = () => 0.99;
  spawnProbe.maybeSpawnBossFuelShip();
  if (spawned !== 1 || spawnProbe.bossFuelShipsSpawnedThisBoss !== 1) {
    fail('first eligible hurt boss should spawn a support ship even when random chance is unfavorable');
  }
  spawnProbe.bossFuelShipCooldownUntilMs = 0;
  spawnProbe.bossFuelShipNextCheckAtMs = 0;
  spawnProbe.boss.health = 72;
  spawnProbe.maybeSpawnBossFuelShip();
  if (spawned !== 1) {
    fail('later boss support events should remain chance-gated after the guaranteed first helper');
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

const firstSupport = pickBossSupportShipProfile(5, getBossSupportShipEventSeed(5, 0));
if (!firstSupport?.id || !Number.isFinite(firstSupport.spriteIndex)) {
  fail('deterministic first support profile should resolve to a generated sprite');
}

if (errors.length) {
  console.error(`[boss-support-ships] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[boss-support-ships] PASS profiles=${BOSS_SUPPORT_SHIPS.length} picked=${picked.size} codex=${BOSS_SUPPORT_SHIPS.length}`);
