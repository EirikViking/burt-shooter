import { readFileSync } from 'node:fs';

import { AssetManifest } from '../src/assets/assetManifest.js';
import {
  BOSS_SUPPORT_SHIP_TOTAL,
  BOSS_SUPPORT_SHIPS,
  pickBossSupportShipProfile
} from '../src/config/BossSupportShips.js';
import { getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';

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
for (const token of ['pickBossSupportShipProfile', 'bossSupportShipProfile', 'recordThreatDiscovery?.(supportProfile.id']) {
  if (!managerSource.includes(token)) fail(`EnemyManager missing support ship runtime token ${token}`);
}

if (errors.length) {
  console.error(`[boss-support-ships] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[boss-support-ships] PASS profiles=${BOSS_SUPPORT_SHIPS.length} picked=${picked.size} codex=${BOSS_SUPPORT_SHIPS.length}`);
