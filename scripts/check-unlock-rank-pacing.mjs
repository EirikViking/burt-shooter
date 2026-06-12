import assert from 'node:assert/strict';
import { getSelectableShips, isShipUnlocked } from '../src/config/ShipMetadata.js';
import {
  SUPPORTED_SHIP_UNLOCK_REQUIREMENT_KEYS,
  ShipUnlockConfig
} from '../src/config/ShipUnlockConfig.js';
import {
  HANGAR_PROGRESS_KEY,
  createDefaultHangarProgress,
  readHangarProgressState,
  recalculateUnlockedShipIds
} from '../src/progression/HangarProgressState.js';
import {
  MAX_RANK_INDEX,
  getPilotXpThresholds,
  getRankFromPilotXp,
  getRankTitle
} from '../src/shared/RankPolicy.js';

const ships = getSelectableShips();
const supportedKeys = new Set(SUPPORTED_SHIP_UNLOCK_REQUIREMENT_KEYS);
const pilotXpThresholds = getPilotXpThresholds();

function unlockedFor(progress) {
  const normalized = {
    ...createDefaultHangarProgress(),
    ...progress,
    unlockedShipIds: progress.unlockedShipIds || ['nova_ship_01']
  };
  normalized.unlockedShipIds = recalculateUnlockedShipIds(normalized);
  return normalized.unlockedShipIds;
}

function assertRequirementsUseSupportedKeys(entry) {
  const groups = [
    entry.requirements || {},
    ...(Array.isArray(entry.requirementsAny) ? entry.requirementsAny : [])
  ];
  for (const group of groups) {
    for (const key of Object.keys(group)) {
      assert(supportedKeys.has(key), `${entry.shipId} uses unsupported requirement key ${key}`);
    }
  }
}

assert.equal(ships.length, 25, 'ship roster should stay at 25 ships');
assert.equal(ShipUnlockConfig.length, 25, 'ship unlock config should cover all 25 ships');
ShipUnlockConfig.forEach(assertRequirementsUseSupportedKeys);

const legacyLevels = ShipUnlockConfig.map((entry) => Number(entry.legacyLevel));
assert.deepEqual(legacyLevels, [
  1, 2, 3, 4, 5, 7, 9, 11, 14, 17,
  20, 23, 26, 29, 32, 35, 38, 41, 44, 47,
  50, 53, 56, 58, 60
], 'legacy level mapping should remain stable for save migration');

const fresh = createDefaultHangarProgress();
assert.deepEqual(unlockedFor(fresh), ['nova_ship_01'], 'fresh hangar should start with only the starter ship');
assert.equal(ships.filter((ship) => isShipUnlocked(ship.spriteKey, fresh)).length, 1, 'fresh selectable ships should only include the starter');

const firstSession = unlockedFor({
  totalRuns: 1,
  bestSector: 3,
  bestScore: 25000,
  totalBossesDefeated: 1,
  totalWavesCleared: 10,
  totalCodexDiscoveries: 28,
  pilotRank: 6
});
assert(firstSession.length >= 2 && firstSession.length <= 3, `short first-session milestones should reveal only a small hangar set, got ${firstSession.length}`);
['nova_ship_02', 'nova_ship_03'].forEach((shipId) => {
  assert(firstSession.includes(shipId), `first-session profile should unlock ${shipId}`);
});
['nova_ship_04', 'nova_ship_05', 'nova_ship_07', 'nova_ship_11'].forEach((shipId) => {
  assert(!firstSession.includes(shipId), `sector-3 first-session profile should not unlock ${shipId}`);
});

const fakeStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => fakeStorage.get(key) ?? null,
  setItem: (key, value) => fakeStorage.set(key, String(value)),
  removeItem: (key) => fakeStorage.delete(key)
};
fakeStorage.set(HANGAR_PROGRESS_KEY, JSON.stringify({
  version: 1,
  unlockTuningVersion: 1,
  pilotXp: 5940,
  pilotRank: 6,
  totalRuns: 1,
  bestSector: 3,
  bestScore: 12621,
  totalBossesDefeated: 1,
  totalWavesCleared: 10,
  totalCodexDiscoveries: 28,
  unlockedShipIds: ['nova_ship_01', 'nova_ship_02', 'nova_ship_03', 'nova_ship_04', 'nova_ship_07', 'nova_ship_11']
}));
const migratedFastProfile = readHangarProgressState();
assert(migratedFastProfile.pilotRank <= 1, `old over-fast pilot XP should be softened during migration, got rank ${migratedFastProfile.pilotRank}`);
assert(migratedFastProfile.unlockedShipIds.length <= 3, `old over-fast profile should be pruned to a small early hangar, got ${migratedFastProfile.unlockedShipIds.length}`);

const midCareer = unlockedFor({
  totalRuns: 10,
  bestSector: 12,
  bestScore: 175000,
  pilotRank: 9,
  totalBossesDefeated: 18,
  totalWavesCleared: 45,
  totalCodexDiscoveries: 75,
  survivedSeconds: 900,
  noHitWaves: 1,
  runClears: 1
});
assert(midCareer.length >= 10 && midCareer.length <= 12, `rank-9 sector-12 profile should unlock roughly 10-12 ships, got ${midCareer.length}`);
['nova_ship_08', 'nova_ship_09', 'nova_ship_11', 'nova_ship_17'].forEach((shipId) => {
  assert(midCareer.includes(shipId), `rank-9 sector-12 profile should unlock ${shipId}`);
});
['nova_ship_12', 'nova_ship_14', 'nova_ship_16', 'nova_ship_21', 'nova_ship_23'].forEach((shipId) => {
  assert(!midCareer.includes(shipId), `rank-9 sector-12 profile should not already unlock ${shipId}`);
});

const eirikRetuneProfile = unlockedFor({
  totalRuns: 10,
  bestSector: 12,
  bestScore: 58273,
  pilotRank: 10,
  totalBossesDefeated: 18,
  totalWavesCleared: 60,
  totalCodexDiscoveries: 118,
  survivedSeconds: 900,
  noHitWaves: 3,
  runClears: 1,
  runThemesSurvived: ['swarm_lattice', 'hunter_wing', 'minefield_protocol', 'orbit_collapse']
});
assert(eirikRetuneProfile.length >= 10 && eirikRetuneProfile.length <= 12, `rank-10 codex-118 profile should unlock about 10-12 ships, got ${eirikRetuneProfile.length}`);
['nova_ship_14', 'nova_ship_16', 'nova_ship_19', 'nova_ship_22', 'nova_ship_23'].forEach((shipId) => {
  assert(!eirikRetuneProfile.includes(shipId), `rank-10 codex-118 profile should not already unlock ${shipId}`);
});

const lateCareer = unlockedFor({
  totalRuns: 28,
  bestSector: 16,
  bestScore: 300000,
  pilotRank: 14,
  totalBossesDefeated: 35,
  totalWavesCleared: 120,
  totalCodexDiscoveries: 160,
  survivedSeconds: 1500,
  noHitWaves: 8,
  runClears: 3,
  runThemesSurvived: ['swarm_lattice', 'hunter_wing', 'minefield_protocol', 'orbit_collapse', 'crossfire_doctrine']
});
assert(lateCareer.length >= 20 && lateCareer.length < 25, `late-career profile should feel rich but not complete, got ${lateCareer.length}`);
['nova_ship_12', 'nova_ship_14', 'nova_ship_16', 'nova_ship_21', 'nova_ship_23'].forEach((shipId) => {
  assert(lateCareer.includes(shipId), `late-career profile should unlock ${shipId}`);
});

const mastery = unlockedFor({
  totalRuns: 50,
  bestSector: 15,
  bestScore: 550000,
  pilotRank: MAX_RANK_INDEX,
  totalBossesDefeated: 40,
  totalWavesCleared: 160,
  totalCodexDiscoveries: 180,
  runClears: 3,
  noHitWaves: 8,
  noHitSectors: 1,
  survivedSeconds: 1800,
  runThemesSurvived: ['swarm_lattice', 'hunter_wing', 'minefield_protocol', 'orbit_collapse', 'crossfire_doctrine', 'glitch_parade'],
  clearWithLivesRemaining: 2,
  highestScoreMultiplier: 2
});
assert.equal(mastery.length, 25, `mastery profile should complete the hangar, got ${mastery.length}`);

assert.equal(getRankFromPilotXp(0), 0, '0 pilot XP should be Cadet');
assert.equal(getRankTitle(getRankFromPilotXp(0)), 'Cadet');
assert.equal(getRankFromPilotXp(pilotXpThresholds[6]), 6, 'rank 6 should be reachable from pilot XP thresholds');
assert.equal(getRankTitle(getRankFromPilotXp(pilotXpThresholds[6])), 'Combo Courier');
assert.equal(getRankFromPilotXp(pilotXpThresholds.at(-1)), MAX_RANK_INDEX, 'top pilot XP threshold should award max rank');
assert.equal(getRankTitle(19), 'Arcade Legend');
assert.equal(getRankTitle(MAX_RANK_INDEX), 'Heat-Death Champion');
for (let index = 1; index < pilotXpThresholds.length; index += 1) {
  assert(pilotXpThresholds[index] > pilotXpThresholds[index - 1], `pilot XP threshold ${index} should increase`);
}

console.log(`[unlock-rank-pacing] PASS fresh=1 firstSession=${firstSession.length} rank9=${midCareer.length} rank10Codex118=${eirikRetuneProfile.length} lateCareer=${lateCareer.length} mastery=${mastery.length} topRank=${getRankTitle(MAX_RANK_INDEX)}`);
