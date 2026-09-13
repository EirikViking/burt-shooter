import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  HANGAR_PROGRESS_KEY,
  SHIP_UNLOCK_HISTORY_REASON_KEYS,
  applyRunProgression,
  formatShipUnlockHistoryReason,
  getShipUnlockHistoryLine,
  getShipUnlockRequirementLine,
  readHangarProgressState,
  shipUnlockMet,
  updateHangarProgress
} from '../src/progression/HangarProgressState.js';
import {
  CLOUD_HANGAR_PROGRESS_KEY,
  restoreSteamCloudPersistenceToStorage
} from '../src/steamCloudPersistence.js';

const require = createRequire(import.meta.url);
const { createSteamCloudSave } = require('../electron/steamCloudSave.cjs');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

const outputDir = path.resolve(process.env.CHECK_OUTPUT_DIR || `test-results/ship-unlock-provenance-${timestamp()}`);
mkdirSync(outputDir, { recursive: true });

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

  clear() {
    this.map.clear();
  }
}

const storage = new MemoryStorage();
globalThis.localStorage = storage;

function readRawHangar() {
  return JSON.parse(storage.getItem(HANGAR_PROGRESS_KEY) || '{}');
}

const report = {
  outputDir,
  checks: []
};

function checkpoint(name, details = {}) {
  report.checks.push({ name, ...details });
}

try {
  storage.clear();
  const fresh = readHangarProgressState();
  assert.deepEqual(fresh.unlockedShipIds, ['nova_ship_01']);
  assert.equal(fresh.shipUnlockHistory.nova_ship_01.reasonKey, SHIP_UNLOCK_HISTORY_REASON_KEYS.available);
  checkpoint('fresh profile starter history', {
    unlockedShipIds: fresh.unlockedShipIds,
    starterText: getShipUnlockHistoryLine('nova_ship_01', fresh)
  });

  const firstUnlock = updateHangarProgress({ totalRuns: 1, bestSector: 3, totalBossesDefeated: 1 }, {
    preserveLastUnlocks: false,
    unlockContext: { source: 'mayhem', runMode: 'mayhem', sector: 3, score: 23136, bossCount: 1 }
  });
  assert(firstUnlock.lastNewlyUnlockedShipIds.includes('nova_ship_02'));
  assert(firstUnlock.lastNewlyUnlockedShipIds.includes('nova_ship_03'));
  assert.equal(firstUnlock.shipUnlockHistory.nova_ship_02.source, 'mayhem');
  assert.equal(firstUnlock.shipUnlockHistory.nova_ship_03.reasonKey, SHIP_UNLOCK_HISTORY_REASON_KEYS.requirements);
  assert.match(formatShipUnlockHistoryReason(firstUnlock.shipUnlockHistory.nova_ship_03, 'nova_ship_03'), /Defeated 1 bosses/);
  checkpoint('new unlock records exact reason', {
    newlyUnlockedShipIds: firstUnlock.lastNewlyUnlockedShipIds,
    novaShip02: firstUnlock.shipUnlockHistory.nova_ship_02,
    novaShip03Text: getShipUnlockHistoryLine('nova_ship_03', firstUnlock)
  });

  const liveScoreProgress = updateHangarProgress({ bestScore: 26000 });
  assert(liveScoreProgress.lastNewlyUnlockedShipIds.includes('nova_ship_02'));
  assert(liveScoreProgress.lastNewlyUnlockedShipIds.includes('nova_ship_03'));
  checkpoint('live progress writes preserve pending hangar reveal', {
    pendingAfterScoreWrite: liveScoreProgress.lastNewlyUnlockedShipIds
  });

  const reloaded = readHangarProgressState();
  assert.deepEqual(reloaded.shipUnlockHistory.nova_ship_03, firstUnlock.shipUnlockHistory.nova_ship_03);
  checkpoint('unlock reason persists after reload', {
    rawStorageHasHistory: Boolean(readRawHangar().shipUnlockHistory?.nova_ship_03)
  });

  const known = {
    unlockedAt: '2026-01-01T00:00:00.000Z',
    reasonKey: SHIP_UNLOCK_HISTORY_REASON_KEYS.requirements,
    reasonParams: { requirements: [['bestScore', 140000]] },
    source: 'mayhem',
    score: 140000,
    runMode: 'mayhem',
    buildVersion: 'known-build'
  };
  storage.setItem(HANGAR_PROGRESS_KEY, JSON.stringify({
    bestScore: 140000,
    unlockedShipIds: ['nova_ship_01', 'nova_ship_10'],
    shipUnlockHistory: { nova_ship_10: known }
  }));
  const preserved = readHangarProgressState();
  assert(preserved.unlockedShipIds.includes('nova_ship_10'));
  assert.equal(preserved.shipUnlockHistory.nova_ship_10.buildVersion, 'known-build');
  checkpoint('known history is not overwritten', {
    novaShip10Text: getShipUnlockHistoryLine('nova_ship_10', preserved)
  });

  storage.setItem(HANGAR_PROGRESS_KEY, JSON.stringify({
    unlockTuningVersion: 3,
    unlockedShipIds: ['nova_ship_01', 'nova_ship_12'],
    shipUnlockHistory: {}
  }));
  const migrated = readHangarProgressState();
  assert(migrated.unlockedShipIds.includes('nova_ship_12'));
  assert.equal(shipUnlockMet('nova_ship_12', migrated), true);
  assert.equal(migrated.shipUnlockHistory.nova_ship_12.reasonKey, SHIP_UNLOCK_HISTORY_REASON_KEYS.legacy);
  checkpoint('legacy fallback for already unlocked ship', {
    novaShip12Text: getShipUnlockHistoryLine('nova_ship_12', migrated)
  });

  storage.clear();
  const profileA = updateHangarProgress({ totalRuns: 1 }, { preserveLastUnlocks: false });
  const profileAHistory = profileA.shipUnlockHistory.nova_ship_02;
  storage.clear();
  const profileB = readHangarProgressState();
  assert.equal(profileB.shipUnlockHistory.nova_ship_02, undefined);
  checkpoint('profile isolation via scoped storage', {
    profileARecorded: Boolean(profileAHistory),
    profileBHasProfileAHistory: Boolean(profileB.shipUnlockHistory.nova_ship_02)
  });

  storage.clear();
  const runResult = applyRunProgression({
    runMode: 'mayhem',
    score: 150000,
    sectorReached: 9,
    levelReached: 9,
    runElapsedSeconds: 500,
    bossesKilled: 10,
    wavesCleared: 45,
    totalCodexDiscoveries: 45,
    noHitWaves: 0,
    noHitSectors: 0,
    highestScoreMultiplier: 2
  });
  assert(runResult.next.unlockedShipIds.includes('nova_ship_10'));
  assert.equal(runResult.next.shipUnlockHistory.nova_ship_10.reasonKey, SHIP_UNLOCK_HISTORY_REASON_KEYS.requirements);
  assert.match(formatShipUnlockHistoryReason(runResult.next.shipUnlockHistory.nova_ship_10, 'nova_ship_10'), /140,000/);
  checkpoint('applyRunProgression captures run unlock source', {
    newlyUnlockedShipIds: runResult.newlyUnlockedShipIds,
    novaShip10: runResult.next.shipUnlockHistory.nova_ship_10
  });

  const lockedRequirement = getShipUnlockRequirementLine('nova_ship_25');
  assert.match(lockedRequirement, /^Unlock: /);
  checkpoint('locked ship requirement line', { lockedRequirement });

  const restoreStorage = new MemoryStorage();
  restoreSteamCloudPersistenceToStorage({
    hangarProgress: {
      unlockedShipIds: ['nova_ship_01', 'nova_ship_10'],
      shipUnlockHistory: {
        nova_ship_10: {
          unlockedAt: '2026-06-23T00:00:00.000Z',
          reasonKey: SHIP_UNLOCK_HISTORY_REASON_KEYS.requirements,
          reasonParams: { requirements: [['bestScore', 140000]] },
          source: 'mayhem',
          score: 140000,
          runMode: 'mayhem',
          buildVersion: 'renderer-cloud'
        }
      }
    }
  }, { storage: restoreStorage });
  const restoredCloudHangar = JSON.parse(restoreStorage.getItem(CLOUD_HANGAR_PROGRESS_KEY));
  assert.equal(restoredCloudHangar.shipUnlockHistory.nova_ship_10.buildVersion, 'renderer-cloud');
  checkpoint('renderer cloud restore keeps unlock history', {
    restoredHistory: restoredCloudHangar.shipUnlockHistory.nova_ship_10
  });

  const cloudUserData = mkdtempSync(path.join(tmpdir(), 'nova-ship-unlock-history-cloud-'));
  try {
    const cloud = createSteamCloudSave(cloudUserData, { warn() {} });
    const localSpecific = {
      unlockedAt: '2026-01-01T00:00:00.000Z',
      reasonKey: SHIP_UNLOCK_HISTORY_REASON_KEYS.requirements,
      reasonParams: { requirements: [['bestScore', 140000]] },
      source: 'mayhem',
      score: 140000,
      runMode: 'mayhem',
      buildVersion: 'specific'
    };
    cloud.writeSave({
      hangarProgress: {
        unlockedShipIds: ['nova_ship_01', 'nova_ship_10'],
        shipUnlockHistory: { nova_ship_10: localSpecific }
      }
    });
    const merged = cloud.mergeRendererState({
      hangarProgress: {
        unlockedShipIds: ['nova_ship_01', 'nova_ship_10', 'nova_ship_11'],
        shipUnlockHistory: {
          nova_ship_10: {
            unlockedAt: '2026-06-23T00:00:00.000Z',
            reasonKey: SHIP_UNLOCK_HISTORY_REASON_KEYS.legacy,
            reasonParams: {},
            source: 'migration',
            buildVersion: 'legacy'
          },
          nova_ship_11: {
            unlockedAt: '2026-06-23T00:00:00.000Z',
            reasonKey: SHIP_UNLOCK_HISTORY_REASON_KEYS.requirements,
            reasonParams: { requirements: [['pilotRank', 9]] },
            source: 'mayhem',
            buildVersion: 'renderer'
          }
        }
      }
    });
    assert.equal(merged.hangarProgress.shipUnlockHistory.nova_ship_10.buildVersion, 'specific');
    assert.equal(merged.hangarProgress.shipUnlockHistory.nova_ship_11.buildVersion, 'renderer');
    checkpoint('steam cloud keeps specific unlock history', {
      cloudSavePath: path.join(cloudUserData, 'steam-cloud', 'profiles', 'local-offline', 'nova-swarm-save.json'),
      mergedHistory: merged.hangarProgress.shipUnlockHistory
    });
  } finally {
    rmSync(cloudUserData, { recursive: true, force: true });
  }

  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[ship-unlock-provenance] PASS report=${path.join(outputDir, 'report.json')}`);
} catch (error) {
  report.error = {
    message: error?.message || String(error),
    stack: error?.stack || null
  };
  writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.error(`[ship-unlock-provenance] FAIL report=${path.join(outputDir, 'report.json')}`);
  throw error;
}
