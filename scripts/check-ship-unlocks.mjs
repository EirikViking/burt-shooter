import { ShipData } from '../src/config/ShipData.js';
import { ShipUnlockConfig, SUPPORTED_SHIP_UNLOCK_REQUIREMENT_KEYS } from '../src/config/ShipUnlockConfig.js';
import {
  HANGAR_PROGRESS_KEY,
  LEGACY_UNLOCK_PROGRESS_KEY,
  SHIP_UNLOCK_HISTORY_REASON_KEYS,
  formatShipUnlockHistoryReason,
  getShipUnlockProgressDetails,
  getShipUnlockHistoryLine,
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
if (fresh.shipUnlockHistory?.nova_ship_01?.reasonKey !== SHIP_UNLOCK_HISTORY_REASON_KEYS.available) {
  fail('starter ship should have starting-hull unlock history');
}

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
for (const shipId of ['nova_ship_02', 'nova_ship_03']) {
  if (!shipUnlockMet(shipId, early)) fail(`${shipId} should unlock from early milestones`);
}
if (early.shipUnlockHistory?.nova_ship_02?.reasonKey !== SHIP_UNLOCK_HISTORY_REASON_KEYS.requirements) {
  fail('new ship unlock should store requirement provenance');
}
if (!/Finished 1 runs|Reached Sector 2/.test(formatShipUnlockHistoryReason(early.shipUnlockHistory?.nova_ship_02, 'nova_ship_02'))) {
  fail(`nova_ship_02 unlock reason was not derived from its exact requirement: ${getShipUnlockHistoryLine('nova_ship_02', early)}`);
}
if (!/Defeated 1 bosses/.test(formatShipUnlockHistoryReason(early.shipUnlockHistory?.nova_ship_03, 'nova_ship_03'))) {
  fail(`nova_ship_03 unlock reason should mention defeated boss requirement: ${getShipUnlockHistoryLine('nova_ship_03', early)}`);
}
for (const shipId of ['nova_ship_04', 'nova_ship_05', 'nova_ship_07', 'nova_ship_11']) {
  if (shipUnlockMet(shipId, early)) fail(`${shipId} should stay locked after a short sector-3 profile`);
}

const details = getShipUnlockProgressDetails('nova_ship_22', early);
if (!details.label || !Array.isArray(details.requirements)) fail('locked ship progress details must be readable');

fakeStorage.set(LEGACY_UNLOCK_PROGRESS_KEY, JSON.stringify({ bestScore: 999, bestRank: 2, bestLevel: 20 }));
fakeStorage.delete(HANGAR_PROGRESS_KEY);
const migrated = readHangarProgressState();
if (migrated.bestSector !== 4) fail(`old bestLevel progress should map to arcade sectors conservatively, got sector ${migrated.bestSector}`);
if (migrated.unlockedShipIds.length > 4) fail(`old bestLevel progress should not over-unlock ships after retuning, got ${migrated.unlockedShipIds.length}`);
if (migrated.unlockedShipIds.some((shipId) => !migrated.shipUnlockHistory?.[shipId])) {
  fail('migration should add safe unlock history for every already-unlocked ship');
}

fakeStorage.set(HANGAR_PROGRESS_KEY, JSON.stringify({
  ...fresh,
  bestSector: 1,
  totalRuns: 0,
  unlockedShipIds: ['nova_ship_01', 'nova_ship_10'],
  shipUnlockHistory: {
    nova_ship_10: {
      unlockedAt: '2026-01-01T00:00:00.000Z',
      reasonKey: SHIP_UNLOCK_HISTORY_REASON_KEYS.requirements,
      reasonParams: { requirements: [['bestScore', 140000]] },
      source: 'mayhem',
      score: 140000,
      runMode: 'mayhem',
      buildVersion: 'known'
    }
  }
}));
const preserved = readHangarProgressState();
if (!preserved.unlockedShipIds.includes('nova_ship_10')) fail('normalization must not relock a saved unlocked ship');
if (preserved.shipUnlockHistory?.nova_ship_10?.buildVersion !== 'known') fail('known unlock history should not be overwritten by migration');

if (errors.length) {
  console.error(`[ship-unlocks] FAIL ${errors.length} issue(s)`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`[ship-unlocks] PASS ships=${ShipData.length} earlyUnlocked=${early.unlockedShipIds.length} migrated=${migrated.unlockedShipIds.length}`);
