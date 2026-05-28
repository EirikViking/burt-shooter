import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  CLOUD_ACHIEVEMENT_KEY,
  CLOUD_HANGAR_PROGRESS_KEY,
  CLOUD_LANGUAGE_KEY,
  CLOUD_LOCAL_LEADERBOARD_KEY,
  CLOUD_UNLOCK_PROGRESS_KEY,
  CLOUD_THREAT_DISCOVERY_KEY,
  collectSteamCloudPersistenceState,
  restoreSteamCloudPersistenceToStorage
} from '../src/steamCloudPersistence.js';

const require = createRequire(import.meta.url);
const { createSteamCloudSave, getPaths } = require('../electron/steamCloudSave.cjs');

const userData = mkdtempSync(path.join(tmpdir(), 'nova-steam-cloud-'));
const paths = getPaths(userData);

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

try {
  writeFileSync(paths.legacyHighscorePath, JSON.stringify([
    { name: 'ACE', score: 1200, level: 4, rankIndex: 2, timestamp: '2026-01-01T00:00:00.000Z' }
  ], null, 2));

  const saveSystem = createSteamCloudSave(userData, { warn() {} });
  const initialized = saveSystem.ensureInitialized();
  assert.equal(initialized.version, 3);
  assert.equal(initialized.localHighscores.length, 1);
  assert.equal(initialized.localHighscores[0].name, 'ACE');
  assert.equal(initialized.language.preference, 'system');
  assert.equal(initialized.achievements.unlocked.length, 0);

  saveSystem.mirrorLocalHighscores([
    { name: 'ZEN', score: 2400, level: 6, rankIndex: 4, timestamp: '2026-01-02T00:00:00.000Z' }
  ]);
  const mirrored = JSON.parse(readFileSync(paths.cloudSavePath, 'utf8'));
  assert.equal(mirrored.localHighscores[0].name, 'ZEN');
  assert.equal(mirrored.localHighscores[0].score, 2400);

  const merged = saveSystem.mergeRendererState({
    language: { preference: 'de', current: 'de' },
    localHighscores: [
      { name: 'LOCALACE', score: 3333, level: 7, rankIndex: 5, timestamp: '2026-01-05T00:00:00.000Z' }
    ],
    achievements: {
      version: 1,
      unlocked: ['first_launch', 'score_10000'],
      updatedAt: '2026-01-06T00:00:00.000Z'
    },
    selectedShipKey: 'nova-player-ship-04.png',
    progression: { bestScore: 9000, bestRank: 7, bestLevel: 12 },
    hangarProgress: {
      pilotXp: 12345,
      pilotRank: 6,
      bestScore: 9000,
      bestSector: 12,
      discoveredThreatIds: ['drone_basic', 'elite_splitter']
    },
    threatDiscovery: {
      items: {
        enemies: {
          drone_basic: { seen: true, defeated: true },
          elite_splitter: { seen: true }
        }
      },
      unreadIds: ['elite_splitter']
    },
    settings: {
      screenShake: 0.35,
      playerFocus: 0.8,
      colorAssist: true,
      audio: {
        masterVolume: 0.5,
        musicVolume: 0.25,
        sfxVolume: 0.75,
        voiceVolume: 0.6,
        musicEnabled: false,
        voiceEnabled: true,
        ctaVoiceEnabled: false,
        musicPack: 'generated'
      }
    },
    debugFlags: { shouldNotPersist: true },
    absolutePath: 'C:/Users/example/AppData/Roaming/Nova Swarm'
  });
  assert.deepEqual(merged.language, { preference: 'de', current: 'de' });
  assert.equal(merged.localHighscores[0].name, 'LOCALACE');
  assert.deepEqual(merged.achievements.unlocked, ['first_launch', 'score_10000']);
  assert.equal(merged.selectedShipKey, 'nova-player-ship-04.png');
  assert.deepEqual(merged.progression, { bestScore: 9000, bestRank: 7, bestLevel: 12 });
  assert.equal(merged.hangarProgress.pilotXp, 12345);
  assert.equal(merged.hangarProgress.discoveredThreatIds.length, 2);
  assert.equal(Object.keys(merged.threatDiscovery.items.enemies).length, 2);
  assert.equal(merged.settings.screenShake, 0.35);
  assert.equal(merged.settings.playerFocus, 0.8);
  assert.equal(merged.settings.colorAssist, true);
  assert.equal(merged.settings.audio.musicPack, 'generated');
  assert.equal(Object.hasOwn(merged, 'debugFlags'), false);
  assert.equal(Object.hasOwn(merged, 'absolutePath'), false);

  const storage = new MemoryStorage([
    [CLOUD_LANGUAGE_KEY, 'pt-BR'],
    [CLOUD_LOCAL_LEADERBOARD_KEY, JSON.stringify([
      { name: 'PLAYER', score: 4444, level: 8, rankIndex: 6, timestamp: '2026-01-07T00:00:00.000Z' }
    ])],
    [CLOUD_ACHIEVEMENT_KEY, JSON.stringify({
      version: 1,
      unlocked: ['first_launch'],
      updatedAt: '2026-01-07T00:00:00.000Z'
    })],
    [CLOUD_HANGAR_PROGRESS_KEY, JSON.stringify({
      pilotXp: 222,
      pilotRank: 3,
      bestScore: 4444,
      bestSector: 8,
      discoveredThreatIds: ['drone_basic']
    })],
    [CLOUD_THREAT_DISCOVERY_KEY, JSON.stringify({
      items: { enemies: { drone_basic: { seen: true } } },
      unreadIds: ['drone_basic']
    })]
  ]);
  const collected = collectSteamCloudPersistenceState({
    storage,
    getLanguagePreferenceMode: () => 'pt-BR',
    getCurrentLanguage: () => 'pt-BR',
    getShipUnlockProgress: () => ({
      bestScore: 4444,
      bestRank: 6,
      bestLevel: 8,
      pilotXp: 222,
      pilotRank: 3,
      bestSector: 8,
      discoveredThreatIds: ['drone_basic']
    }),
    getAccessibilitySettings: () => ({ screenShake: 0.4, playerFocus: 0.9, colorAssist: true })
  });
  const collectedSave = saveSystem.mergeRendererState(collected);
  assert.equal(collectedSave.language.preference, 'pt-BR');
  assert.equal(collectedSave.localHighscores[0].score, 4444);
  assert.deepEqual(collectedSave.achievements.unlocked, ['first_launch']);
  assert.equal(collectedSave.hangarProgress.pilotXp, 222);
  assert.equal(Object.keys(collectedSave.threatDiscovery.items.enemies).length, 1);

  const splitProgressStorage = new MemoryStorage([
    [CLOUD_UNLOCK_PROGRESS_KEY, JSON.stringify({ bestScore: 7, bestRank: 1, bestLevel: 2 })],
    [CLOUD_HANGAR_PROGRESS_KEY, JSON.stringify({ pilotXp: 111, pilotRank: 1, bestScore: 7 })]
  ]);
  const splitProgressCollected = collectSteamCloudPersistenceState({
    storage: splitProgressStorage,
    getShipUnlockProgress: () => ({ bestScore: 9001, bestRank: 5, bestLevel: 8 }),
    getHangarProgressState: () => ({
      pilotXp: 4321,
      pilotRank: 4,
      highestPilotRank: 4,
      bestScore: 9001,
      bestSector: 8,
      bestLevel: 8,
      totalRuns: 12,
      discoveredThreatIds: ['drone_basic', 'raider']
    })
  });
  assert.deepEqual(splitProgressCollected.progression, { bestScore: 9001, bestRank: 5, bestLevel: 8 });
  assert.equal(splitProgressCollected.hangarProgress.pilotXp, 4321);
  assert.equal(splitProgressCollected.hangarProgress.totalRuns, 12);

  const restartStorage = new MemoryStorage([
    [CLOUD_LANGUAGE_KEY, 'de'],
    [CLOUD_LOCAL_LEADERBOARD_KEY, JSON.stringify([
      { name: 'OLDLOCAL', score: 111, level: 2, rankIndex: 1, timestamp: '2026-01-01T00:00:00.000Z' }
    ])],
    [CLOUD_ACHIEVEMENT_KEY, JSON.stringify({ version: 1, unlocked: ['existing_local'] })]
  ]);
  const restoreSummary = restoreSteamCloudPersistenceToStorage({
    language: { preference: 'ja', current: 'ja' },
    localHighscores: [
      { name: 'CLOUDACE', score: 5555, level: 9, rankIndex: 7, timestamp: '2026-01-08T00:00:00.000Z' }
    ],
    achievements: { version: 1, unlocked: ['cloud_unlock'], updatedAt: '2026-01-08T00:00:00.000Z' },
    selectedShipKey: 'nova-player-ship-02.png',
    progression: { bestScore: 5555, bestRank: 7, bestLevel: 9 },
    hangarProgress: {
      pilotXp: 999,
      pilotRank: 7,
      bestScore: 5555,
      bestSector: 9,
      discoveredThreatIds: ['cloud_enemy']
    },
    threatDiscovery: {
      items: { enemies: { cloud_enemy: { seen: true, defeated: false } } },
      unreadIds: ['cloud_enemy']
    },
    settings: {
      screenShake: 0.2,
      playerFocus: 0.75,
      colorAssist: true,
      audio: { musicEnabled: false, musicPack: 'classic' }
    }
  }, { storage: restartStorage });
  assert.equal(restoreSummary.language, 'ja');
  assert.equal(restartStorage.getItem(CLOUD_LANGUAGE_KEY), 'ja');
  assert.equal(JSON.parse(restartStorage.getItem(CLOUD_LOCAL_LEADERBOARD_KEY))[0].name, 'CLOUDACE');
  assert.deepEqual(JSON.parse(restartStorage.getItem(CLOUD_ACHIEVEMENT_KEY)).unlocked.sort(), ['cloud_unlock', 'existing_local']);
  assert.equal(JSON.parse(restartStorage.getItem(CLOUD_HANGAR_PROGRESS_KEY)).pilotXp, 999);
  assert.equal(JSON.parse(restartStorage.getItem(CLOUD_THREAT_DISCOVERY_KEY)).items.enemies.cloud_enemy.seen, true);

  const systemStorage = new MemoryStorage([[CLOUD_LANGUAGE_KEY, 'de']]);
  restoreSteamCloudPersistenceToStorage({ language: { preference: 'system' } }, { storage: systemStorage });
  assert.equal(systemStorage.getItem(CLOUD_LANGUAGE_KEY), null);

  writeFileSync(paths.cloudSavePath, JSON.stringify({
    version: 1,
    updatedAt: '2026-01-04T00:00:00.000Z',
    localHighscores: [],
    selectedShipKey: 'nova-player-ship-01.png',
    progression: { bestScore: 10, bestRank: 1, bestLevel: 2 },
    settings: { screenShake: 1, playerFocus: 0.72, colorAssist: false }
  }));
  const oldSchema = saveSystem.readSave();
  assert.equal(oldSchema.version, 3);
  assert.equal(oldSchema.language.preference, 'system');
  assert.deepEqual(oldSchema.achievements.unlocked, []);

  writeFileSync(paths.cloudSavePath, '{ broken json');
  const recovered = saveSystem.readSave();
  assert.equal(recovered.version, 3);
  assert.equal(Array.isArray(recovered.localHighscores), true);

  const diagnostics = saveSystem.getDiagnostics();
  assert.equal(diagnostics.steamworksAutoCloud.byteQuota, 1048576);
  assert.equal(diagnostics.steamworksAutoCloud.fileCount, 20);
  assert.equal(diagnostics.steamworksAutoCloud.root, 'WinAppDataRoaming');
  assert.equal(diagnostics.steamworksAutoCloud.pattern, 'nova-swarm-save.json');
  assert.equal(diagnostics.steamworksAutoCloud.recursive, false);
  assert.equal(diagnostics.steamworksAutoCloud.dynamicCloudSync, false);
  assert.equal(diagnostics.persistenceSummary.cloudSavePath, paths.cloudSavePath);
  assert.equal(typeof diagnostics.persistenceSummary.hangarPilotXp, 'number');
  assert.equal(typeof diagnostics.persistenceSummary.threatDiscoveryCategories, 'number');

  if (process.env.APPDATA) {
    const realPaths = getPaths(path.join(process.env.APPDATA, 'nova-swarm'));
    assert.equal(
      realPaths.cloudSavePath,
      path.join(process.env.APPDATA, 'nova-swarm', 'steam-cloud', 'nova-swarm-save.json')
    );
  }

  const oldUserData = mkdtempSync(path.join(tmpdir(), 'nova-steam-cloud-old-'));
  const oldPaths = getPaths(oldUserData);
  writeFileSync(oldPaths.oldHighscorePath, JSON.stringify([
    { name: 'OLDACE', score: 777, level: 3, rankIndex: 1, timestamp: '2026-01-03T00:00:00.000Z' }
  ]));
  const oldSaveSystem = createSteamCloudSave(oldUserData, { warn() {} });
  const oldInitialized = oldSaveSystem.ensureInitialized();
  assert.equal(oldInitialized.localHighscores[0].name, 'OLDACE');
  rmSync(oldUserData, { recursive: true, force: true });

  console.log(`[check-steam-cloud-save] PASS ${paths.cloudSavePath}`);
} finally {
  rmSync(userData, { recursive: true, force: true });
}
