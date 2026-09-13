import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { getSectorStartCheckpoints } from '../src/game/RunMode.js';

const require = createRequire(import.meta.url);
const { createSteamCloudSave, getPaths } = require('../electron/steamCloudSave.cjs');

class MemoryStorage {
  constructor(entries = []) {
    this.map = new Map(entries.map(([key, value]) => [String(key), String(value)]));
  }

  getItem(key) {
    return this.map.has(String(key)) ? this.map.get(String(key)) : null;
  }

  setItem(key, value) {
    this.map.set(String(key), String(value));
  }

  removeItem(key) {
    this.map.delete(String(key));
  }

  clear() {
    this.map.clear();
  }

  rawGet(key) {
    return this.map.has(String(key)) ? this.map.get(String(key)) : null;
  }

  rawSet(key, value) {
    this.map.set(String(key), String(value));
  }
}

globalThis.Storage = MemoryStorage;
globalThis.window = { localStorage: new MemoryStorage() };
globalThis.localStorage = globalThis.window.localStorage;

const {
  getProfileScopedStorageKey,
  installProfileStorageNamespace
} = await import('../src/profile/ProfileStorageNamespace.js');
const {
  HANGAR_PROGRESS_KEY,
  LEGACY_UNLOCK_PROGRESS_KEY,
  readHangarProgressState
} = await import('../src/progression/HangarProgressState.js');

const THREAT_DISCOVERY_KEY = 'nova.threatDiscovery.v1';
const ACHIEVEMENTS_KEY = 'nova_swarm_achievements_v1';
const SECTOR_RECORDS_KEY = 'novaSwarm.sectorStartChallengeRecords.v1';
const DAILY_SIGNAL_RECORDS_KEY = 'novaSwarm.dailySignalRecords.v1';

function setStorage(storage) {
  globalThis.window.localStorage = storage;
  globalThis.localStorage = storage;
  return storage;
}

function legacyHangarProgress(overrides = {}) {
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp: 126083,
    pilotRank: 17,
    highestPilotRank: 17,
    totalRuns: 30,
    bestScore: 450000,
    bestSector: 31,
    bestLevel: 31,
    bestRank: 17,
    totalBossesDefeated: 44,
    totalWavesCleared: 180,
    totalCodexDiscoveries: 783,
    unlockedShipIds: ['nova_ship_01', 'nova_ship_02', 'nova_ship_08'],
    discoveredThreatIds: ['enemy_001', 'sector_031'],
    defeatedBossIds: ['boss_001'],
    runThemesSurvived: ['theme_001'],
    updatedAt: '2026-06-18T12:30:18.998Z',
    ...overrides
  };
}

function seedUnscopedLegacy(storage) {
  storage.rawSet(HANGAR_PROGRESS_KEY, JSON.stringify(legacyHangarProgress()));
  storage.rawSet(LEGACY_UNLOCK_PROGRESS_KEY, JSON.stringify({
    bestScore: 450000,
    bestRank: 17,
    bestLevel: 31
  }));
  storage.rawSet(THREAT_DISCOVERY_KEY, JSON.stringify({
    items: {
      powerups: {
        prism_splitter: { id: 'prism_splitter', category: 'powerups', name: 'Prism Splitter', timesSeen: 3 }
      },
      sectors: {
        sector_031: { id: 'sector_031', category: 'sectors', name: 'Sector 31', timesSeen: 1 }
      }
    },
    unreadIds: ['powerups:prism_splitter']
  }));
  storage.rawSet(ACHIEVEMENTS_KEY, JSON.stringify({
    version: 1,
    unlocked: ['ACH_EARLY_PILOT', 'ACH_RANK_06'],
    updatedAt: '2026-06-18T12:30:18.998Z'
  }));
  storage.rawSet(SECTOR_RECORDS_KEY, JSON.stringify({
    version: 1,
    byCheckpoint: {
      5: { startSector: 5, scoreEarned: 5000, highestSectorReached: 7 },
      10: { startSector: 10, scoreEarned: 12000, highestSectorReached: 14 },
      20: { startSector: 20, scoreEarned: 24000, highestSectorReached: 23 },
      30: { startSector: 30, scoreEarned: 31000, highestSectorReached: 32 }
    }
  }));
  storage.rawSet(DAILY_SIGNAL_RECORDS_KEY, JSON.stringify({
    version: 2,
    bestAttempts: {
      '2026-07-15:DCS1-TEST': { dailyKey: '2026-07-15', rulesHash: 'DCS1-TEST', score: 7200, sectorReached: 7, runCleared: false }
    },
    bestClears: {},
    attemptCounts: {
      '2026-07-15:DCS1-TEST': { count: 2 }
    }
  }));
}

function assertScopedCopy(storage, profile, rawKey, label) {
  const scopedKey = getProfileScopedStorageKey(rawKey, profile);
  assert.equal(storage.rawGet(scopedKey) !== null, true, `${label}: missing scoped ${rawKey}`);
  assert.equal(storage.rawGet(rawKey) !== null, true, `${label}: unscoped legacy key should remain recoverable`);
  return JSON.parse(storage.rawGet(scopedKey));
}

function runUnscopedMigrationClaimTest() {
  const storage = setStorage(new MemoryStorage());
  seedUnscopedLegacy(storage);
  const mainProfile = { steamId: '76561198692310517', personaName: 'tfoundgames' };
  const installed = installProfileStorageNamespace(mainProfile);
  assert.equal(installed.storageId, 'steam-76561198692310517');
  assert.equal(installed.legacyMigration.copiedKeys.includes(HANGAR_PROGRESS_KEY), true, 'hangar progress should migrate');
  assert.equal(installed.legacyMigration.copiedKeys.includes(THREAT_DISCOVERY_KEY), true, 'Codex progress should migrate');
  assert.equal(installed.legacyMigration.copiedKeys.includes(SECTOR_RECORDS_KEY), true, 'Sector Run records should migrate');
  assert.equal(installed.legacyMigration.copiedKeys.includes(DAILY_SIGNAL_RECORDS_KEY), true, 'Daily Signal records should migrate');
  assert.equal(installed.legacyMigration.copiedKeys.includes(ACHIEVEMENTS_KEY), true, 'local achievement mirror should migrate');

  const scopedHangar = assertScopedCopy(storage, mainProfile, HANGAR_PROGRESS_KEY, 'main profile');
  assert.equal(scopedHangar.bestSector, 31);
  assert.equal(scopedHangar.totalCodexDiscoveries, 783);
  assert.deepEqual(getSectorStartCheckpoints(scopedHangar), [5, 10, 15, 20, 25, 30]);
  assert.equal(readHangarProgressState().bestSector, 31, 'patched localStorage reads should see the active scoped profile');

  const scopedThreats = assertScopedCopy(storage, mainProfile, THREAT_DISCOVERY_KEY, 'main profile');
  assert.equal(scopedThreats.items.powerups.prism_splitter.name, 'Prism Splitter');
  const scopedRecords = assertScopedCopy(storage, mainProfile, SECTOR_RECORDS_KEY, 'main profile');
  assert.equal(scopedRecords.byCheckpoint['30'].highestSectorReached, 32);
  const scopedDailyRecords = assertScopedCopy(storage, mainProfile, DAILY_SIGNAL_RECORDS_KEY, 'main profile');
  assert.equal(scopedDailyRecords.bestAttempts['2026-07-15:DCS1-TEST'].sectorReached, 7);
  assert.equal(scopedDailyRecords.attemptCounts['2026-07-15:DCS1-TEST'].count, 2);
  const scopedAchievements = assertScopedCopy(storage, mainProfile, ACHIEVEMENTS_KEY, 'main profile');
  assert.equal(scopedAchievements.unlocked.includes('ACH_EARLY_PILOT'), true, 'First Ranked Run mirror should survive migration');

  const secondProfile = { steamId: '76561198953993508', personaName: 'Tiny Foundry' };
  const secondInstalled = installProfileStorageNamespace(secondProfile);
  assert.equal(secondInstalled.legacyMigration.skipped, true, 'legacy unscoped import should be claimed once');
  assert.equal(secondInstalled.legacyMigration.reason, 'legacy_unscoped_already_claimed');
  assert.equal(storage.rawGet(getProfileScopedStorageKey(HANGAR_PROGRESS_KEY, secondProfile)), null, 'second Steam profile must not inherit claimed legacy progress');
  assert.equal(storage.rawGet(getProfileScopedStorageKey(DAILY_SIGNAL_RECORDS_KEY, secondProfile)), null, 'second Steam profile must not inherit claimed Daily records');
  assert.equal(readHangarProgressState().bestSector, 1, 'second Steam profile should read safe fresh defaults');
}

function runExistingScopedProfileProtectionTest() {
  const storage = setStorage(new MemoryStorage());
  const profile = { steamId: '76561198000000003' };
  seedUnscopedLegacy(storage);
  storage.rawSet(getProfileScopedStorageKey(HANGAR_PROGRESS_KEY, profile), JSON.stringify(legacyHangarProgress({
    pilotXp: 1078,
    pilotRank: 1,
    highestPilotRank: 1,
    totalRuns: 1,
    bestSector: 2,
    bestLevel: 2,
    totalCodexDiscoveries: 40,
    unlockedShipIds: ['nova_ship_01', 'nova_ship_02']
  })));
  const installed = installProfileStorageNamespace(profile);
  assert.equal(installed.legacyMigration.copiedKeys.includes(HANGAR_PROGRESS_KEY), false, 'existing scoped hangar progress must not be overwritten');
  const active = readHangarProgressState();
  assert.equal(active.bestSector, 2);
  assert.equal(active.totalCodexDiscoveries, 40);
}

function runSteamCloudLegacyAndProfileTests() {
  const userData = mkdtempSync(path.join(tmpdir(), 'nova-save-profile-migration-'));
  try {
    const profileA = { steamId: '76561198692310517', personaName: 'tfoundgames' };
    const profileB = { steamId: '76561198953993508', personaName: 'Tiny Foundry' };
    const pathsA = getPaths(userData, profileA);
    mkdirSync(path.dirname(pathsA.legacyCloudSavePath), { recursive: true });
    writeFileSync(pathsA.legacyCloudSavePath, JSON.stringify({
      version: 2,
      updatedAt: '2026-06-18T12:30:18.998Z',
      localHighscores: [{ name: 'ACE', score: 450000, level: 31, rankIndex: 17 }],
      achievements: { version: 1, unlocked: ['ACH_EARLY_PILOT'] },
      progression: { bestScore: 450000, bestRank: 17, bestLevel: 31 },
      hangarProgress: legacyHangarProgress(),
      threatDiscovery: { items: { sectors: { sector_031: { id: 'sector_031', category: 'sectors', name: 'Sector 31' } } } },
      sectorStartChallengeRecords: {
        byCheckpoint: {
          5: { startSector: 5, scoreEarned: 5000, highestSectorReached: 7 },
          30: { startSector: 30, scoreEarned: 31000, highestSectorReached: 32 }
        }
      }
    }, null, 2));

    const importedA = createSteamCloudSave(userData, { warn() {} }, { profile: profileA }).ensureInitialized();
    assert.equal(importedA.profile.steamId, profileA.steamId);
    assert.equal(importedA.hangarProgress.bestSector, 31, 'unprofiled shared legacy save should import into first Steam profile');
    assert.equal(importedA.achievements.unlocked.includes('ACH_EARLY_PILOT'), true, 'First Ranked Run mirror should survive Steam Cloud import');
    assert.deepEqual(getSectorStartCheckpoints(importedA.hangarProgress), [5, 10, 15, 20, 25, 30]);

    const freshB = createSteamCloudSave(userData, { warn() {} }, { profile: profileB }).ensureInitialized();
    assert.equal(freshB.profile.steamId, profileB.steamId);
    assert.equal(freshB.hangarProgress.bestSector, 1, 'different explicit Steam profile should remain isolated');
    assert.equal(freshB.achievements.unlocked.length, 0, 'different Steam profile should not inherit achievements');

    const reloadedA = createSteamCloudSave(userData, { warn() {} }, { profile: profileA }).readSave();
    assert.equal(reloadedA.hangarProgress.bestSector, 31, 'original Steam profile remains recoverable after another profile initializes');
  } finally {
    rmSync(userData, { recursive: true, force: true });
  }
}

runUnscopedMigrationClaimTest();
runExistingScopedProfileProtectionTest();
runSteamCloudLegacyAndProfileTests();

console.log('[save-profile-migration] PASS legacy unscoped progress migrates once, profile isolation holds, First Ranked Run survives');
process.exit(0);
