import { ShipData } from '../src/config/ShipData.js';
import { ShipUnlockConfig, SUPPORTED_SHIP_UNLOCK_REQUIREMENT_KEYS } from '../src/config/ShipUnlockConfig.js';
import {
  HANGAR_PROGRESS_KEY,
  LEGACY_UNLOCK_PROGRESS_KEY,
  getShipUnlockProgressDetails,
  readHangarProgressState,
  shipUnlockMet,
  updateHangarProgress
} from '../src/progression/HangarProgressState.js';

const errors = [];
const fail = (message) => errors.push(message);

const fakeStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => fakeStorage.get(key) ?? null,
  setItem: (key, value) => fakeStorage.set(key, String(value)),
  removeItem: (key) => fakeStorage.delete(key)
};
fakeStorage.delete(HANGAR_PROGRESS_KEY);

if (ShipData.length < 25) fail(`expected around 25 playable ships, found ${ShipData.length}`);
if (ShipUnlockConfig.length !== ShipData.length) fail(`unlock config should cover every ship ${ShipUnlockConfig.length}/${ShipData.length}`);
const fresh = readHangarProgressState();
if (!shipUnlockMet('nova_ship_01', fresh)) fail('first ship must be unlocked on fresh profile');
if (shipUnlockMet('nova_ship_25', fresh)) fail('late mastery ship must be locked on fresh profile');

for (const entry of ShipUnlockConfig) {
  const groups = [entry.requirements || {}, ...(Array.isArray(entry.requirementsAny) ? entry.requirementsAny : [])];
  for (const group of groups) {
    for (const key of Object.keys(group)) {
      if (!SUPPORTED_SHIP_UNLOCK_REQUIREMENT_KEYS.includes(key)) fail(`${entry.shipId} uses unsupported requirement ${key}`);
    }
  }
  if (!entry.label || entry.label.length < 4) fail(`${entry.shipId} has unreadable label`);
}

const early = updateHangarProgress({ totalRuns: 1, bestSector: 3, totalBossesDefeated: 1, bestScore: 25000 });
for (const shipId of ['nova_ship_02', 'nova_ship_03', 'nova_ship_04', 'nova_ship_05', 'nova_ship_07', 'nova_ship_11']) {
  if (shipUnlockMet(shipId, early)) fail(`${shipId} should stay locked after a short sector-3 profile`);
}
const firstUnlock = updateHangarProgress({ bestSector: 5, totalBossesDefeated: 1, bestScore: 30000 });
for (const shipId of ['nova_ship_02', 'nova_ship_03']) {
  if (!shipUnlockMet(shipId, firstUnlock)) fail(`${shipId} should unlock after reaching sector 5`);
}

const details = getShipUnlockProgressDetails('nova_ship_22', early);
if (!details.label || !Array.isArray(details.requirements)) fail('locked ship progress details must be readable');

fakeStorage.set(LEGACY_UNLOCK_PROGRESS_KEY, JSON.stringify({ bestScore: 999, bestRank: 2, bestLevel: 20 }));
fakeStorage.delete(HANGAR_PROGRESS_KEY);
const migrated = readHangarProgressState();
if (migrated.bestSector !== 4) fail(`old bestLevel progress should map to arcade sectors conservatively, got sector ${migrated.bestSector}`);
if (migrated.unlockedShipIds.length > 4) fail(`old bestLevel progress should not over-unlock ships after retuning, got ${migrated.unlockedShipIds.length}`);

if (errors.length) {
  console.error(`[ship-unlocks] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[ship-unlocks] PASS ships=${ShipData.length} earlyUnlocked=${early.unlockedShipIds.length} sector5Unlocked=${firstUnlock.unlockedShipIds.length} migrated=${migrated.unlockedShipIds.length}`);
