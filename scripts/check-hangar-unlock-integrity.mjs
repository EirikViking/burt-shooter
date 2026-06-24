import assert from 'node:assert/strict';
import {
  CLOUD_HANGAR_PROGRESS_KEY,
  restoreSteamCloudPersistenceToStorage
} from '../src/steamCloudPersistence.js';
import {
  SHIP_UNLOCK_HISTORY_REASON_KEYS,
  createDefaultHangarProgress
} from '../src/progression/HangarProgressState.js';
import { ShipUnlockConfig } from '../src/config/ShipUnlockConfig.js';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }
}

function makeThreatDiscovery({ sectors = 60, ranks = 20, other = 0 } = {}) {
  const sectorItems = Object.fromEntries(Array.from({ length: sectors }, (_entry, index) => {
    const id = `sector_${String(index + 1).padStart(3, '0')}`;
    return [id, { id, category: 'sectors', name: `Sector ${index + 1}`, timesSeen: 1 }];
  }));
  const rankItems = Object.fromEntries(Array.from({ length: ranks + 1 }, (_entry, index) => {
    const id = `pilot_rank_${String(index).padStart(2, '0')}`;
    return [id, { id, category: 'pilotRanks', name: `Pilot Rank ${index}`, timesSeen: 1 }];
  }));
  const enemyItems = Object.fromEntries(Array.from({ length: other }, (_entry, index) => {
    const id = `enemy_${String(index + 1).padStart(3, '0')}`;
    return [id, { id, category: 'enemies', name: `Enemy ${index + 1}`, timesSeen: 1 }];
  }));
  return {
    items: {
      sectors: sectorItems,
      pilotRanks: rankItems,
      enemies: enemyItems
    }
  };
}

function legacyHistoryFor(shipIds) {
  return Object.fromEntries(shipIds.map((shipId) => [shipId, {
    unlockedAt: '2026-06-23T13:09:25.000Z',
    reasonKey: shipId === 'nova_ship_01'
      ? SHIP_UNLOCK_HISTORY_REASON_KEYS.available
      : SHIP_UNLOCK_HISTORY_REASON_KEYS.legacy,
    reasonParams: {},
    source: shipId === 'nova_ship_01' ? 'starter' : 'migration',
    buildVersion: 'v2026-06-23_13-09-25'
  }]));
}

function requirementHistoryFor(shipIds) {
  return Object.fromEntries(shipIds.map((shipId) => [shipId, {
    unlockedAt: '2026-06-24T00:00:00.000Z',
    reasonKey: shipId === 'nova_ship_01'
      ? SHIP_UNLOCK_HISTORY_REASON_KEYS.available
      : SHIP_UNLOCK_HISTORY_REASON_KEYS.requirements,
    reasonParams: {},
    source: 'mayhem',
    sector: 60,
    score: 550000,
    runMode: 'mayhem',
    buildVersion: 'test'
  }]));
}

function restoreHangar(save) {
  const storage = new MemoryStorage();
  restoreSteamCloudPersistenceToStorage(save, { storage });
  return JSON.parse(storage.getItem(CLOUD_HANGAR_PROGRESS_KEY));
}

const legacyUnlocks = Array.from({ length: 23 }, (_entry, index) => `nova_ship_${String(index + 1).padStart(2, '0')}`);
const inflatedSave = {
  version: 2,
  localHighscores: [
    { score: 168666, level: 20, bossKills: 19, wavesCleared: 123, runTimeSeconds: 1519, source: 'local' },
    { score: 90321, level: 31, bossKills: 20, wavesCleared: 127, runTimeSeconds: 1300, source: 'local' }
  ],
  progression: { bestScore: 168666, bestRank: 20, bestLevel: 60 },
  hangarProgress: {
    ...createDefaultHangarProgress(),
    unlockTuningVersion: 3,
    pilotXp: 283210,
    pilotRank: 20,
    highestPilotRank: 20,
    bestRank: 20,
    bestScore: 168666,
    bestSector: 60,
    bestLevel: 60,
    totalRuns: 71,
    totalBossesDefeated: 312,
    totalWavesCleared: 2012,
    totalCodexDiscoveries: 1380,
    runClears: 16,
    noHitWaves: 1873,
    noHitSectors: 224,
    clearWithLivesRemaining: 5,
    runThemesSurvived: Array.from({ length: 18 }, (_entry, index) => `theme_${index}`),
    unlockedShipIds: legacyUnlocks,
    shipUnlockHistory: legacyHistoryFor(legacyUnlocks)
  },
  threatDiscovery: makeThreatDiscovery({ sectors: 60, ranks: 20, other: 1200 })
};

const repaired = restoreHangar(inflatedSave);
assert.equal(repaired.integrityRepairReason, 'legacy_codex_rescue_inflation');
assert.equal(repaired.bestSector, 31, 'Codex sector 60 must not over-promote hangar sector progress');
assert.equal(repaired.bestLevel, 31);
assert.equal(repaired.pilotRank, 6, 'legacy rescue profile rank should be capped by real run evidence');
assert.equal(repaired.unlockedShipIds.includes('nova_ship_30'), false, 'legacy rescue profile must not unlock Eirik');
assert.equal(repaired.unlockedShipIds.includes('nova_ship_29'), false, 'legacy rescue profile must not unlock late Ascendant ships');
assert(repaired.unlockedShipIds.length <= 12, `legacy rescue clamp should leave a mid hangar, got ${repaired.unlockedShipIds.length}`);
assert(repaired.totalCodexDiscoveries <= 124, 'Codex count used for unlocks should be capped by run evidence');
assert.equal(repaired.runClears, 0, 'missing explicit run-clear evidence must not preserve inflated clears');
assert.equal(repaired.noHitWaves, 0, 'missing no-hit evidence must not preserve inflated no-hit waves');

const freshCodexRescueSave = {
  version: 2,
  localHighscores: [
    { score: 58273, level: 12, bossKills: 8, wavesCleared: 42, runTimeSeconds: 900, source: 'local' }
  ],
  progression: { bestScore: 58273, bestRank: 4, bestLevel: 12 },
  hangarProgress: {
    ...createDefaultHangarProgress(),
    unlockTuningVersion: 3,
    pilotXp: 800,
    pilotRank: 1,
    highestPilotRank: 1,
    bestRank: 1,
    bestScore: 12000,
    bestSector: 2,
    bestLevel: 2,
    totalRuns: 2,
    totalBossesDefeated: 1,
    totalWavesCleared: 10,
    totalCodexDiscoveries: 3,
    unlockedShipIds: ['nova_ship_01']
  },
  threatDiscovery: makeThreatDiscovery({ sectors: 60, ranks: 20, other: 1200 }),
  selectedShipKey: 'nova_ship_24'
};

const rescued = restoreHangar(freshCodexRescueSave);
assert.equal(rescued.integrityRepairReason, undefined, 'fresh Codex rescue should not need the legacy clamp');
assert.equal(rescued.bestSector, 12, 'Codex sector 60 must not become hangar sector 60');
assert.equal(rescued.pilotRank, 1, 'Codex pilot rank 20 must not become career pilot rank 20');
assert.equal(rescued.secretShipUnlockIds?.includes('nova_ship_24'), false, 'selected ship evidence must not become a secret unlock');
assert.equal(rescued.unlockedShipIds.includes('nova_ship_30'), false, 'Codex rescue must not unlock Eirik');
assert(rescued.unlockedShipIds.length <= 5, `Codex rescue should stay early/mid, got ${rescued.unlockedShipIds.length}`);

const masteryIds = ShipUnlockConfig.map((entry) => entry.shipId);
const masterySave = {
  version: 2,
  localHighscores: [
    { score: 550000, level: 60, bossKills: 40, wavesCleared: 180, runTimeSeconds: 1800, runCleared: true, source: 'local' }
  ],
  progression: { bestScore: 550000, bestRank: 20, bestLevel: 60 },
  hangarProgress: {
    ...createDefaultHangarProgress(),
    unlockTuningVersion: 3,
    pilotXp: 300000,
    pilotRank: 20,
    highestPilotRank: 20,
    bestRank: 20,
    bestScore: 550000,
    bestSector: 60,
    bestLevel: 60,
    totalRuns: 80,
    totalBossesDefeated: 40,
    totalWavesCleared: 180,
    totalCodexDiscoveries: 180,
    runClears: 3,
    noHitWaves: 8,
    noHitSectors: 1,
    clearWithLivesRemaining: 2,
    runThemesSurvived: ['a', 'b', 'c', 'd', 'e'],
    unlockedShipIds: masteryIds,
    shipUnlockHistory: requirementHistoryFor(masteryIds)
  },
  threatDiscovery: makeThreatDiscovery({ sectors: 60, ranks: 20, other: 200 })
};

const mastery = restoreHangar(masterySave);
assert.equal(mastery.integrityRepairReason, undefined, 'specific requirement history must not be clamped');
assert.equal(mastery.bestSector, 60);
assert.equal(mastery.unlockedShipIds.includes('nova_ship_30'), true, 'valid mastery profile should keep Eirik');
assert.equal(mastery.unlockedShipIds.length, ShipUnlockConfig.length);

console.log(`[hangar-unlock-integrity] PASS repaired=${repaired.unlockedShipIds.length} rescued=${rescued.unlockedShipIds.length} mastery=${mastery.unlockedShipIds.length}`);
