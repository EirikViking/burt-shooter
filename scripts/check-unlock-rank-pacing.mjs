import assert from 'node:assert/strict';
import { getSelectableShips, isShipUnlocked } from '../src/config/ShipMetadata.js';
import {
  SUPPORTED_SHIP_UNLOCK_REQUIREMENT_KEYS,
  ShipUnlockConfig
} from '../src/config/ShipUnlockConfig.js';
import {
  createDefaultHangarProgress,
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
  totalBossesDefeated: 1
});
assert(firstSession.length >= 5 && firstSession.length <= 7, `first-session milestones should unlock an early hangar set, got ${firstSession.length}`);
['nova_ship_02', 'nova_ship_03', 'nova_ship_04', 'nova_ship_05'].forEach((shipId) => {
  assert(firstSession.includes(shipId), `first-session profile should unlock ${shipId}`);
});

const midCareer = unlockedFor({
  totalRuns: 6,
  bestSector: 8,
  bestScore: 150000,
  pilotRank: 6,
  totalBossesDefeated: 10,
  totalWavesCleared: 30,
  totalCodexDiscoveries: 15,
  survivedSeconds: 900,
  noHitWaves: 1
});
assert(midCareer.length >= 16 && midCareer.length < 23, `mid-career profile should unlock a broad but incomplete hangar, got ${midCareer.length}`);
['nova_ship_11', 'nova_ship_12', 'nova_ship_14', 'nova_ship_16', 'nova_ship_17'].forEach((shipId) => {
  assert(midCareer.includes(shipId), `mid-career profile should unlock ${shipId}`);
});

const mastery = unlockedFor({
  totalRuns: 30,
  bestSector: 10,
  bestScore: 500000,
  pilotRank: MAX_RANK_INDEX,
  totalBossesDefeated: 30,
  totalWavesCleared: 120,
  totalCodexDiscoveries: 50,
  runClears: 1,
  noHitWaves: 5,
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
assert.equal(getRankTitle(MAX_RANK_INDEX), 'Arcade Legend');
for (let index = 1; index < pilotXpThresholds.length; index += 1) {
  assert(pilotXpThresholds[index] > pilotXpThresholds[index - 1], `pilot XP threshold ${index} should increase`);
}

console.log(`[unlock-rank-pacing] PASS fresh=1 firstSession=${firstSession.length} midCareer=${midCareer.length} mastery=${mastery.length} topRank=${getRankTitle(MAX_RANK_INDEX)}`);
