import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  CLOUD_ACHIEVEMENT_KEY,
  CLOUD_HANGAR_PROGRESS_KEY,
  CLOUD_LOCAL_LEADERBOARD_KEY,
  CLOUD_SELECTED_SHIP_KEY,
  CLOUD_SHIP_USAGE_KEY,
  CLOUD_SHIP_USAGE_TOTAL_KEY,
  CLOUD_THREAT_DISCOVERY_KEY,
  restoreSteamCloudPersistenceToStorage
} from '../src/steamCloudPersistence.js';
import { normalizeHangarProgress } from '../src/progression/HangarProgressState.js';
import { getCodexDiscoverySignature } from '../src/progression/ThreatDiscoveryState.js';
import {
  PROFILE_SCOPED_STORAGE_KEYS,
  getProfileScopedStorageKey,
  normalizeProfileStorageContext
} from '../src/profile/ProfileStorageNamespace.js';

const require = createRequire(import.meta.url);
const { createSteamCloudSave, getPaths } = require('../electron/steamCloudSave.cjs');
const { getMaintainerDevtoolsState } = require('../electron/maintainerDevtoolsGate.cjs');

class MemoryStorage {
  constructor(entries = []) {
    this.map = new Map(entries);
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

function makeItems(category, count) {
  return Object.fromEntries(Array.from({ length: count }, (_entry, index) => {
    const id = `${category}_${String(index + 1).padStart(3, '0')}`;
    return [id, {
      id,
      category,
      name: id.toUpperCase(),
      timesSeen: 1
    }];
  }));
}

function highProgressRendererState() {
  const threatItems = {
    enemies: makeItems('enemy', 45),
    attackPatterns: makeItems('attack', 20),
    powerups: makeItems('powerup', 22),
    sectors: makeItems('sector', 12),
    bosses: makeItems('boss', 8),
    runThemes: makeItems('theme', 2)
  };
  return {
    localHighscores: [
      { name: 'MAINACE', score: 300000, level: 15, rankIndex: 10, timestamp: '2026-06-07T00:00:00.000Z' }
    ],
    achievements: {
      version: 1,
      unlocked: ['ACH_RANK_06', 'ACH_SIGNAL_CARTOGRAPHER'],
      updatedAt: '2026-06-07T00:00:00.000Z'
    },
    selectedShipKey: 'nova_ship_08',
    progression: { bestScore: 300000, bestRank: 10, bestLevel: 15 },
    hangarProgress: {
      pilotXp: 7600,
      pilotRank: 5,
      highestPilotRank: 5,
      totalRuns: 18,
      bestScore: 300000,
      bestSector: 15,
      bestLevel: 15,
      totalBossesDefeated: 25,
      totalWavesCleared: 110,
      totalCodexDiscoveries: 107,
      unlockedShipIds: ['nova_ship_01', 'nova_ship_02', 'nova_ship_03', 'nova_ship_04', 'nova_ship_05', 'nova_ship_06', 'nova_ship_07', 'nova_ship_08']
    },
    threatDiscovery: {
      items: threatItems,
      unreadIds: ['powerups:powerup_001']
    },
    shipUsage: {
      nova_ship_01: 11,
      nova_ship_08: 4
    },
    shipUsageTotal: 15
  };
}

function assertFreshSave(save, label) {
  assert.equal(save.profile?.type === 'steam' || save.profile?.type === 'local', true, `${label} should have an explicit profile`);
  assert.equal(save.hangarProgress.pilotXp, 0, `${label} inherited pilot XP`);
  assert.equal(save.hangarProgress.pilotRank, 0, `${label} inherited rank`);
  assert.equal(save.hangarProgress.totalRuns, 0, `${label} inherited run count`);
  assert.equal(save.hangarProgress.totalCodexDiscoveries, 0, `${label} inherited Codex count`);
  const rawUnlocks = Array.isArray(save.hangarProgress.unlockedShipIds) ? save.hangarProgress.unlockedShipIds : [];
  assert(rawUnlocks.length <= 1 && rawUnlocks.every((shipId) => shipId === 'nova_ship_01'), `${label} inherited hull unlocks`);
  assert.equal(save.achievements.unlocked.length, 0, `${label} inherited achievements`);
  assert.equal(Object.keys(save.shipUsage || {}).length, 0, `${label} inherited ship usage`);
  for (const category of ['attackPatterns', 'powerups', 'sectors', 'bosses', 'enemies']) {
    assert.equal(Object.keys(save.threatDiscovery.items?.[category] || {}).length, 0, `${label} inherited ${category}`);
  }
}

function restoreToMemory(save) {
  const storage = new MemoryStorage();
  restoreSteamCloudPersistenceToStorage(save, { storage });
  return storage;
}

const userData = mkdtempSync(path.join(tmpdir(), 'nova-profile-isolation-'));

try {
  const mainProfile = { steamId: '76561198000000001', personaName: 'Main Ace' };
  const freshProfile = { steamId: '76561198000000002', personaName: 'Fresh Ace' };

  const mainSaveSystem = createSteamCloudSave(userData, { warn() {} }, { profile: mainProfile });
  mainSaveSystem.ensureInitialized();
  const mainSaved = mainSaveSystem.mergeRendererState(highProgressRendererState());
  assert.equal(mainSaved.profile.steamId, mainProfile.steamId);
  assert.equal(mainSaved.hangarProgress.pilotRank, 5);
  assert.equal(mainSaved.hangarProgress.totalCodexDiscoveries, 107);
  assert.equal(Object.keys(mainSaved.threatDiscovery.items.powerups || {}).length, 22);
  assert.equal(Object.keys(mainSaved.threatDiscovery.items.sectors || {}).length, 12);
  assert.deepEqual(mainSaved.threatDiscovery.unreadIds, ['powerups:powerup_001'], 'main profile should retain its own unread Codex marker');
  const mainCodexMarker = getCodexDiscoverySignature(mainSaved.threatDiscovery.items);
  const mainCleared = mainSaveSystem.mergeRendererState({
    threatDiscovery: {
      ...mainSaved.threatDiscovery,
      unreadIds: [],
      lastViewedCodexDiscoverySignature: mainCodexMarker.signature,
      lastViewedCodexDiscoveryCount: mainCodexMarker.count,
      lastViewedCodexAt: '2026-06-22T12:00:00.000Z'
    }
  });
  assert.deepEqual(mainCleared.threatDiscovery.unreadIds, [], 'main profile Codex read marker should clear only the main profile glow');
  assert.equal(mainCleared.threatDiscovery.lastViewedCodexDiscoverySignature, mainCodexMarker.signature);

  const freshSaveSystem = createSteamCloudSave(userData, { warn() {} }, { profile: freshProfile });
  const freshInitialized = freshSaveSystem.ensureInitialized();
  assert.equal(freshInitialized.profile.steamId, freshProfile.steamId);
  assertFreshSave(freshInitialized, 'fresh Steam profile');
  const freshStorage = restoreToMemory(freshInitialized);
  const freshHangar = JSON.parse(freshStorage.getItem(CLOUD_HANGAR_PROGRESS_KEY));
  assert.equal(freshHangar.pilotXp, 0);
  assert.deepEqual(normalizeHangarProgress(freshHangar).unlockedShipIds, ['nova_ship_01'], 'fresh Steam profile should normalize to starter hull only');
  assert.equal(JSON.parse(freshStorage.getItem(CLOUD_THREAT_DISCOVERY_KEY)).items.powerups
    ? Object.keys(JSON.parse(freshStorage.getItem(CLOUD_THREAT_DISCOVERY_KEY)).items.powerups).length
    : 0, 0);
  assert.deepEqual(JSON.parse(freshStorage.getItem(CLOUD_THREAT_DISCOVERY_KEY)).unreadIds || [], [], 'fresh Steam profile should not inherit unread Codex markers');
  assert.equal(freshStorage.getItem(CLOUD_SELECTED_SHIP_KEY), null);

  const mainReloaded = createSteamCloudSave(userData, { warn() {} }, { profile: mainProfile }).ensureInitialized();
  assert.equal(mainReloaded.hangarProgress.pilotRank, 5, 'switching back to main profile should restore main rank');
  assert.equal(mainReloaded.hangarProgress.totalCodexDiscoveries, 107, 'switching back should restore main Codex progress');
  assert.equal(Object.keys(mainReloaded.threatDiscovery.items.powerups || {}).length, 22, 'main profile powerups should remain intact');
  assert.deepEqual(mainReloaded.threatDiscovery.unreadIds, [], 'switching back should restore the main profile cleared Codex marker only');
  assert.equal(mainReloaded.threatDiscovery.lastViewedCodexDiscoverySignature, mainCodexMarker.signature, 'switching back should preserve the main profile Codex read signature');

  const localFallback = createSteamCloudSave(userData, { warn() {} }, { profile: { id: 'local-offline', reason: 'steam_missing' } });
  const localInitialized = localFallback.ensureInitialized();
  assertFreshSave(localInitialized, 'offline fallback profile');
  localFallback.mergeRendererState({
    hangarProgress: {
      pilotXp: 2500,
      pilotRank: 2,
      totalRuns: 3,
      bestSector: 4,
      unlockedShipIds: ['nova_ship_01', 'nova_ship_02']
    },
    threatDiscovery: {
      items: { powerups: makeItems('fallback_powerup', 2) }
    }
  });
  const freshAfterFallback = createSteamCloudSave(userData, { warn() {} }, { profile: freshProfile }).readSave();
  assertFreshSave(freshAfterFallback, 'fresh Steam profile after offline fallback writes');
  const mainAfterFallback = createSteamCloudSave(userData, { warn() {} }, { profile: mainProfile }).readSave();
  assert.equal(mainAfterFallback.hangarProgress.totalRuns, 18, 'offline fallback must not overwrite main Steam profile');

  const delayedSteam = createSteamCloudSave(userData, { warn() {} }, { profile: { steamId: '76561198000000003', personaName: 'Delayed Ace' } });
  assertFreshSave(delayedSteam.ensureInitialized(), 'delayed Steam identity profile');

  const mainPaths = getPaths(userData, mainProfile);
  const freshPaths = getPaths(userData, freshProfile);
  assert.notEqual(mainPaths.cloudSavePath, freshPaths.cloudSavePath, 'Steam profiles must use different active save files');
  assert.equal(mainPaths.legacyCloudSavePath, freshPaths.legacyCloudSavePath, 'legacy mirror remains the Steam Auto-Cloud file');
  assert.equal(mainPaths.profile.storageId, `steam-${mainProfile.steamId}`);

  const mainStorageContext = normalizeProfileStorageContext(mainProfile);
  const freshStorageContext = normalizeProfileStorageContext(freshProfile);
  for (const key of PROFILE_SCOPED_STORAGE_KEYS) {
    assert.notEqual(
      getProfileScopedStorageKey(key, mainStorageContext),
      getProfileScopedStorageKey(key, freshStorageContext),
      `${key} must be profile-scoped`
    );
  }
  assert.equal(getProfileScopedStorageKey('burt_music_enabled', mainStorageContext), 'burt_music_enabled');

  assert.equal(getMaintainerDevtoolsState([]).enabled, false, 'devtools must be disabled by default');
  assert.equal(Boolean(getMaintainerDevtoolsState(['--wrong-key']).enabled), false, 'wrong devtools args must stay disabled');

  console.log(`[profile-isolation] PASS userData=${userData} main=${mainProfile.steamId} fresh=${freshProfile.steamId}`);
} finally {
  rmSync(userData, { recursive: true, force: true });
}
