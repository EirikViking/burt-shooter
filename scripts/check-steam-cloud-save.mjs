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
  CLOUD_OVERRUN_RUN_RECORDS_KEY,
  CLOUD_SCOUT_RUN_RECORDS_KEY,
  CLOUD_SECTOR_START_CHALLENGE_RECORDS_KEY,
  CLOUD_SHIP_USAGE_KEY,
  CLOUD_SHIP_USAGE_TOTAL_KEY,
  CLOUD_THREAT_DISCOVERY_KEY,
  CONFIRM_EXIT_KEY,
  CONTROL_SETTINGS_KEY,
  DISPLAY_MODE_KEY,
  DISPLAY_WINDOW_SIZE_KEY,
  SHOW_PILOT_ORDERS_KEY,
  collectSteamCloudPersistenceState,
  restoreSteamCloudPersistenceToStorage
} from '../src/steamCloudPersistence.js';
import { getCodexDiscoverySignature } from '../src/progression/ThreatDiscoveryState.js';
import { RUN_CONTRACTS_VERSION } from '../src/progression/RunContracts.js';

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

function makeRichCodexDiscovery() {
  const sectors = {};
  for (let sector = 1; sector <= 60; sector += 1) {
    const id = `sector_${String(sector).padStart(3, '0')}`;
    sectors[id] = { id, category: 'sectors', name: `SECTOR ${sector}`, timesSeen: 1 };
  }
  const pilotRanks = {};
  for (let rank = 0; rank <= 19; rank += 1) {
    const id = `pilot_rank_${String(rank).padStart(2, '0')}`;
    pilotRanks[id] = { id, category: 'pilotRanks', name: `Rank ${rank}`, timesSeen: 1 };
  }
  const enemies = {};
  for (let index = 0; index < 560; index += 1) {
    const id = `nova_enemy_${index}`;
    enemies[id] = { id, category: 'enemies', name: `Enemy ${index}`, timesSeen: 1 };
  }
  const bosses = {};
  for (let index = 1; index <= 26; index += 1) {
    const id = `nova_boss_${String(index).padStart(2, '0')}`;
    bosses[id] = { id, category: 'bosses', name: `Boss ${index}`, timesSeen: 1 };
  }
  return {
    version: 1,
    items: { enemies, sectors, pilotRanks, bosses },
    unreadIds: [],
    recentRunThemes: [],
    updatedAt: '2026-06-21T00:00:00.000Z'
  };
}

function makePilotOrdersState({
  activeIds = ['boss_breaker', 'near_miss_streak', 'enemy_sweep_1000'],
  completedId = 'boss_breaker',
  progressId = 'enemy_sweep_1000',
  progress = 250
} = {}) {
  return {
    version: RUN_CONTRACTS_VERSION,
    activeIds,
    completedIds: completedId ? [completedId] : [],
    completed: completedId ? {
      [completedId]: {
        id: completedId,
        count: 1,
        completedAt: '2026-07-05T10:00:00.000Z',
        lastRunMode: 'ranked',
        lastSector: 2,
        buildVersion: 'check-steam-cloud-save'
      }
    } : {},
    progress: progressId ? {
      [progressId]: {
        id: progressId,
        progress,
        target: progressId === 'enemy_variety_50' ? 50 : 1000,
        uniqueIds: progressId === 'enemy_variety_50' ? ['scout', 'diver'] : undefined,
        updatedAt: '2026-07-05T10:01:00.000Z',
        lastRunMode: 'ranked',
        lastSector: 2
      }
    } : {},
    completionNoticeSeen: false,
    updatedAt: '2026-07-05T10:01:00.000Z'
  };
}

try {
  writeFileSync(paths.legacyHighscorePath, JSON.stringify([
    { name: 'ACE', score: 1200, level: 4, rankIndex: 2, timestamp: '2026-01-01T00:00:00.000Z' }
  ], null, 2));

  const saveSystem = createSteamCloudSave(userData, { warn() {} });
  const initialized = saveSystem.ensureInitialized();
  assert.equal(initialized.version, 2);
  assert.equal(initialized.localHighscores.length, 1);
  assert.equal(initialized.localHighscores[0].name, 'ACE');
  assert.equal(initialized.language.preference, 'system');
  assert.equal(initialized.achievements.unlocked.length, 0);

  saveSystem.mirrorLocalHighscores([
    { name: 'ZEN', score: 2400, level: 6, rankIndex: 4, careerRankExact: '123456789012345678901', timestamp: '2026-01-02T00:00:00.000Z' }
  ]);
  const mirrored = JSON.parse(readFileSync(paths.cloudSavePath, 'utf8'));
  assert.equal(mirrored.localHighscores[0].name, 'ZEN');
  assert.equal(mirrored.localHighscores[0].score, 2400);
  assert.equal(mirrored.localHighscores[0].careerRankExact, '123456789012345678901');

  const merged = saveSystem.mergeRendererState({
    language: { preference: 'de', current: 'de' },
    localHighscores: [
      { name: 'LOCALACE', score: 3333, level: 7, rankIndex: 5, careerRankExact: '999999999999999999999', timestamp: '2026-01-05T00:00:00.000Z' }
    ],
    achievements: {
      version: 1,
      unlocked: ['first_launch', 'score_10000'],
      updatedAt: '2026-01-06T00:00:00.000Z'
    },
    selectedShipKey: 'nova-player-ship-04.png',
    progression: { bestScore: 9000, bestRank: 7, bestLevel: 12 },
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
        bossVoiceEnabled: false,
        ctaVoiceEnabled: false,
        musicPack: 'generated'
      },
      display: {
        mode: 'windowed',
        windowSize: { width: 1600, height: 900 }
      },
      menu: { confirmExit: false, showPilotOrders: false },
      controls: { fireInput: 'toggle', mouseSteering: true }
    },
    hangarProgress: {
      pilotXp: 54321,
      pilotRank: 6,
      highestPilotRank: 6,
      bestScore: 9000,
      bestSector: 12,
      bestLevel: 12,
      totalCodexDiscoveries: 3,
      unlockedShipIds: ['nova_ship_01', 'nova_ship_09'],
      lastNewlyUnlockedShipIds: ['nova_ship_09'],
      discoveredThreatIds: ['nova_boss_01'],
      shipSpecificMilestones: {
        nova_ship_01: { runs: 4, clears: 1, bestSector: 10, overrunClears: 7 },
        nova_ship_09: { runs: 1, clears: 0, bestSector: 3, overrunClears: 2 }
      },
      runContracts: makePilotOrdersState()
    },
    threatDiscovery: {
      items: {
        bosses: {
          nova_boss_01: {
            id: 'nova_boss_01',
            category: 'bosses',
            name: 'Sonia',
            timesSeen: 1,
            timesDefeated: 1
          }
        }
      },
      unreadIds: ['bosses:nova_boss_01'],
      recentRunThemes: ['storm']
    },
    shipUsage: {
      nova_ship_01: 4,
      'nova-player-ship-04.png': 2
    },
    shipUsageTotal: 6,
    sectorStartChallengeRecords: {
      version: 1,
      updatedAt: '2026-01-06T00:00:00.000Z',
      byCheckpoint: {
        5: {
          startSector: 5,
          scoreEarned: 1200,
          highestSectorReached: 7,
          finalSector: 7,
          shipName: 'Nova Sparrow',
          completedAt: '2026-01-06T00:00:00.000Z'
        }
      }
    },
    scoutRunRecords: {
      version: 1,
      updatedAt: '2026-01-06T00:00:00.000Z',
      best: {
        score: 120000,
        sectorReached: 8,
        levelReached: 8,
        shipName: 'Nova Sparrow',
        completedAt: '2026-01-06T00:00:00.000Z'
      }
    },
    overrunRunRecords: {
      version: 1,
      updatedAt: '2026-01-06T00:00:00.000Z',
      byMode: {
        overrun_pure: {
          runMode: 'overrun_pure',
          score: 150000,
          sectorReached: 58,
          completedAt: '2026-01-06T00:00:00.000Z'
        },
        overrun_tactical: {
          runMode: 'overrun_tactical',
          score: 180000,
          sectorReached: 60,
          completedAt: '2026-01-06T00:00:00.000Z'
        }
      }
    },
    debugFlags: { shouldNotPersist: true },
    absolutePath: 'C:/Users/example/AppData/Roaming/Nova Swarm'
  });
  assert.deepEqual(merged.language, { preference: 'de', current: 'de' });
  assert.equal(merged.localHighscores[0].name, 'LOCALACE');
  assert.equal(merged.localHighscores[0].careerRankExact, '999999999999999999999');
  assert.deepEqual(merged.achievements.unlocked, ['first_launch', 'score_10000']);
  assert.equal(merged.selectedShipKey, 'nova-player-ship-04.png');
  assert.deepEqual(merged.progression, { bestScore: 9000, bestRank: 7, bestLevel: 12 });
  assert.equal(merged.hangarProgress.pilotXp, 54321);
  assert.equal(merged.hangarProgress.unlockedShipIds.includes('nova_ship_09'), true);
  assert.equal(merged.hangarProgress.runContracts.completed.boss_breaker.count, 1);
  assert.equal(merged.hangarProgress.runContracts.progress.enemy_sweep_1000.progress, 250);
  assert.equal(merged.hangarProgress.shipSpecificMilestones.nova_ship_01.overrunClears, 7);
  assert.equal(merged.hangarProgress.shipSpecificMilestones.nova_ship_09.overrunClears, 2);
  assert.equal(merged.threatDiscovery.items.bosses.nova_boss_01.name, 'Sonia');
  assert.deepEqual(merged.threatDiscovery.unreadIds, ['bosses:nova_boss_01']);
  assert.equal(merged.shipUsage.nova_ship_01, 4);
  assert.equal(merged.shipUsage['nova-player-ship-04.png'], 2);
  assert.equal(merged.shipUsageTotal, 6);
  assert.equal(merged.sectorStartChallengeRecords.byCheckpoint['5'].scoreEarned, 1200);
  assert.equal(merged.sectorStartChallengeRecords.byCheckpoint['5'].highestSectorReached, 7);
  assert.equal(merged.scoutRunRecords.best.score, 120000);
  assert.equal(merged.overrunRunRecords.byMode.overrun_pure.score, 150000);
  assert.equal(merged.overrunRunRecords.byMode.overrun_tactical.score, 180000);
  assert.equal(merged.settings.screenShake, 0.35);
  assert.equal(merged.settings.playerFocus, 0.8);
  assert.equal(merged.settings.colorAssist, true);
  assert.equal(merged.settings.audio.musicPack, 'generated');
  assert.equal(merged.settings.audio.bossVoiceEnabled, false);
  assert.equal(merged.settings.display.mode, 'windowed');
  assert.deepEqual(merged.settings.display.windowSize, { width: 1600, height: 900 });
  assert.equal(merged.settings.menu.confirmExit, false);
  assert.equal(merged.settings.menu.showPilotOrders, false);
  assert.deepEqual(merged.settings.controls, { fireInput: 'toggle', mouseSteering: true });
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
      pilotXp: 7777,
      pilotRank: 4,
      bestScore: 4444,
      bestRank: 6,
      bestLevel: 8,
      unlockedShipIds: ['nova_ship_01', 'nova_ship_04'],
      runContracts: makePilotOrdersState({
        activeIds: ['support_hunter', 'enemy_variety_50', 'enemy_sweep_1000'],
        completedId: 'support_hunter',
        progressId: 'enemy_variety_50',
        progress: 2
      })
    })],
    [CLOUD_THREAT_DISCOVERY_KEY, JSON.stringify({
      items: { enemies: { scout: { id: 'scout', category: 'enemies', name: 'Scout', timesSeen: 2 } } },
      unreadIds: ['enemies:scout']
    })],
    [CLOUD_SHIP_USAGE_KEY, JSON.stringify({
      nova_ship_04: 3,
      'nova-player-ship-04.png': 2
    })],
    [CLOUD_SHIP_USAGE_TOTAL_KEY, '5'],
    [CLOUD_SECTOR_START_CHALLENGE_RECORDS_KEY, JSON.stringify({
      version: 1,
      updatedAt: '2026-01-07T00:00:00.000Z',
      byCheckpoint: {
        10: {
          startSector: 10,
          scoreEarned: 4444,
          highestSectorReached: 12,
          finalSector: 12,
          shipName: 'Comet Needle',
          completedAt: '2026-01-07T00:00:00.000Z'
        }
      }
    })],
    [CLOUD_SCOUT_RUN_RECORDS_KEY, JSON.stringify({
      version: 1,
      updatedAt: '2026-01-07T00:00:00.000Z',
      best: {
        score: 130000,
        sectorReached: 9,
        levelReached: 9,
        shipName: 'Local Scout',
        completedAt: '2026-01-07T00:00:00.000Z'
      }
    })],
    [CLOUD_OVERRUN_RUN_RECORDS_KEY, JSON.stringify({
      version: 1,
      updatedAt: '2026-01-07T00:00:00.000Z',
      byMode: {
        overrun_pure: {
          runMode: 'overrun_pure',
          score: 160000,
          sectorReached: 59,
          completedAt: '2026-01-07T00:00:00.000Z'
        }
      }
    })],
    [CONFIRM_EXIT_KEY, '0'],
    [SHOW_PILOT_ORDERS_KEY, '0'],
    [CONTROL_SETTINGS_KEY, JSON.stringify({ fireInput: 'toggle', mouseSteering: true })]
  ]);
  const collected = collectSteamCloudPersistenceState({
    storage,
    getLanguagePreferenceMode: () => 'pt-BR',
    getCurrentLanguage: () => 'pt-BR',
    getShipUnlockProgress: () => ({
      pilotXp: 7777,
      pilotRank: 4,
      bestScore: 4444,
      bestRank: 6,
      bestLevel: 8,
      unlockedShipIds: ['nova_ship_01', 'nova_ship_04'],
      shipSpecificMilestones: {
        nova_ship_01: { runs: 6, clears: 1, bestSector: 10, overrunClears: 3 },
        nova_ship_04: { runs: 2, clears: 0, bestSector: 4, overrunClears: 5 }
      },
      runContracts: makePilotOrdersState({
        activeIds: ['support_hunter', 'enemy_variety_50', 'enemy_sweep_1000'],
        completedId: 'support_hunter',
        progressId: 'enemy_variety_50',
        progress: 2
      })
    }),
    getAccessibilitySettings: () => ({ screenShake: 0.4, playerFocus: 0.9, colorAssist: true })
  });
  const collectedSave = saveSystem.mergeRendererState(collected);
  assert.equal(collectedSave.language.preference, 'pt-BR');
  assert.equal(collectedSave.localHighscores[0].score, 4444);
  assert.deepEqual(collectedSave.achievements.unlocked, ['first_launch']);
  assert.equal(collectedSave.hangarProgress.pilotXp, 54321, 'Steam Cloud Hangar XP should keep the richer existing value');
  assert.equal(collectedSave.hangarProgress.unlockedShipIds.includes('nova_ship_04'), true);
  assert.equal(collectedSave.hangarProgress.runContracts.completed.boss_breaker.count, 1, 'Steam Cloud should preserve existing Pilot Order completions');
  assert.equal(collectedSave.hangarProgress.runContracts.completed.support_hunter.count, 1, 'Steam Cloud should merge renderer Pilot Order completions');
  assert.equal(collectedSave.hangarProgress.runContracts.progress.enemy_sweep_1000.progress, 250);
  assert.equal(collectedSave.hangarProgress.shipSpecificMilestones.nova_ship_01.overrunClears, 7, 'Steam Cloud must max-merge Overrun clears');
  assert.equal(collectedSave.hangarProgress.shipSpecificMilestones.nova_ship_04.overrunClears, 5, 'Steam Cloud must retain new per-ship Overrun clears');
  assert.deepEqual(collectedSave.hangarProgress.runContracts.progress.enemy_variety_50.uniqueIds.sort(), ['diver', 'scout']);
  assert.equal(collectedSave.threatDiscovery.items.enemies.scout.name, 'Scout');
  assert.deepEqual([...collectedSave.threatDiscovery.unreadIds].sort(), ['bosses:nova_boss_01', 'enemies:scout']);
  assert.equal(collectedSave.shipUsage.nova_ship_01, 4);
  assert.equal(collectedSave.shipUsage.nova_ship_04, 3);
  assert.equal(collectedSave.shipUsage['nova-player-ship-04.png'], 2);
  assert.equal(collectedSave.shipUsageTotal, 9);
  assert.equal(collectedSave.overrunRunRecords.byMode.overrun_pure.score, 160000);
  assert.equal(collectedSave.sectorStartChallengeRecords.byCheckpoint['10'].scoreEarned, 4444);
  assert.equal(collectedSave.sectorStartChallengeRecords.byCheckpoint['10'].highestSectorReached, 12);
  assert.equal(collectedSave.scoutRunRecords.best.score, 130000);
  assert.equal(collectedSave.settings.menu.confirmExit, false);
  assert.equal(collectedSave.settings.menu.showPilotOrders, false);
  assert.deepEqual(collectedSave.settings.controls, { fireInput: 'toggle', mouseSteering: true });

  const markerUserData = mkdtempSync(path.join(tmpdir(), 'nova-steam-cloud-codex-marker-'));
  try {
    const markerSystem = createSteamCloudSave(markerUserData, { warn() {} });
    const markerItems = {
      enemies: {
        scout: { id: 'scout', category: 'enemies', name: 'Scout', timesSeen: 1 }
      }
    };
    const marker = getCodexDiscoverySignature(markerItems);
    markerSystem.writeSave({
      threatDiscovery: {
        version: 1,
        items: markerItems,
        unreadIds: [],
        lastViewedCodexDiscoverySignature: marker.signature,
        lastViewedCodexDiscoveryCount: marker.count,
        lastViewedCodexAt: '2026-06-22T10:00:00.000Z'
      }
    });
    const staleUnreadMerge = markerSystem.mergeRendererState({
      threatDiscovery: {
        version: 1,
        items: markerItems,
        unreadIds: ['enemies:scout'],
        updatedAt: '2026-06-22T09:00:00.000Z'
      }
    });
    assert.deepEqual(staleUnreadMerge.threatDiscovery.unreadIds, [], 'current Codex viewed marker should suppress stale cloud unread IDs after restart merge');
    assert.equal(staleUnreadMerge.threatDiscovery.lastViewedCodexDiscoverySignature, marker.signature);
    assert.equal(staleUnreadMerge.threatDiscovery.lastViewedCodexDiscoveryCount, 1);
  } finally {
    rmSync(markerUserData, { recursive: true, force: true });
  }

  const richCodex = makeRichCodexDiscovery();
  const lowHangar = {
    pilotXp: 0,
    pilotRank: 0,
    highestPilotRank: 0,
    bestScore: 9689,
    bestSector: 3,
    bestLevel: 3,
    bestRank: 1,
    totalCodexDiscoveries: 0,
    unlockedShipIds: ['nova_ship_01', 'nova_ship_02'],
    discoveredThreatIds: []
  };
  const codexOnlyStorage = new MemoryStorage([
    [CLOUD_LOCAL_LEADERBOARD_KEY, JSON.stringify([
      { name: 'TFOUNDGAMES', score: 168666, level: 20, rankIndex: 16, timestamp: '2026-06-17T11:29:03.775Z' }
    ])],
    [CLOUD_HANGAR_PROGRESS_KEY, JSON.stringify(lowHangar)],
    [CLOUD_THREAT_DISCOVERY_KEY, JSON.stringify(richCodex)]
  ]);
  const codexRepairedCollect = collectSteamCloudPersistenceState({ storage: codexOnlyStorage });
  assert.equal(codexRepairedCollect.hangarProgress.pilotRank, 0, 'Codex pilot-rank entries must not over-promote Hangar rank before cloud write');
  assert.equal(codexRepairedCollect.hangarProgress.highestPilotRank, 0);
  assert.equal(codexRepairedCollect.hangarProgress.pilotXp, 0);
  assert.equal(codexRepairedCollect.hangarProgress.bestSector, 20, 'Hangar sector repair should come from real ranked run evidence');
  assert.equal(codexRepairedCollect.hangarProgress.bestLevel, 20);
  assert.equal(codexRepairedCollect.hangarProgress.bestScore, 168666);
  assert.equal(codexRepairedCollect.hangarProgress.totalCodexDiscoveries >= 646, true);
  assert.equal(codexRepairedCollect.hangarProgress.discoveredThreatIds.includes('nova_enemy_559'), true, 'Codex-derived Hangar IDs must not be truncated at 500');

  saveSystem.writeSave({
    localHighscores: [
      { name: 'TFOUNDGAMES', score: 168666, level: 20, rankIndex: 16, timestamp: '2026-06-17T11:29:03.775Z' }
    ],
    progression: { bestScore: 168666, bestRank: 19, bestLevel: 60 },
    hangarProgress: {
      pilotXp: 203131,
      pilotRank: 19,
      highestPilotRank: 19,
      bestScore: 168666,
      bestSector: 60,
      bestLevel: 60,
      bestRank: 19,
      totalCodexDiscoveries: 783,
      unlockedShipIds: ['nova_ship_01', 'nova_ship_24'],
      discoveredThreatIds: ['nova_enemy_559']
    },
    threatDiscovery: richCodex
  });
  const protectedCloud = saveSystem.mergeRendererState({
    localHighscores: [
      { name: 'LOW', score: 9689, level: 3, rankIndex: 1, timestamp: '2026-06-21T00:00:00.000Z' }
    ],
    progression: { bestScore: 9689, bestRank: 1, bestLevel: 3 },
    hangarProgress: lowHangar,
    threatDiscovery: richCodex
  });
  assert.equal(protectedCloud.hangarProgress.pilotXp, 203131, 'Steam Cloud Hangar XP must never be replaced by a lower renderer snapshot');
  assert.equal(protectedCloud.hangarProgress.pilotRank, 19);
  assert.equal(protectedCloud.hangarProgress.bestSector, 60);
  assert.equal(protectedCloud.hangarProgress.bestScore, 168666);
  assert.equal(protectedCloud.hangarProgress.totalCodexDiscoveries >= 783, true);
  assert.equal(protectedCloud.progression.bestScore, 168666);
  assert.equal(protectedCloud.hangarProgress.bestLevel, 60);

  const splitSectorStorage = new MemoryStorage();
  restoreSteamCloudPersistenceToStorage({
    hangarProgress: {
      pilotXp: 203131,
      pilotRank: 19,
      highestPilotRank: 19,
      bestSector: 31,
      bestLevel: 60,
      bestScore: 168666
    }
  }, { storage: splitSectorStorage });
  const splitSectorHangar = JSON.parse(splitSectorStorage.getItem(CLOUD_HANGAR_PROGRESS_KEY));
  assert.equal(splitSectorHangar.bestSector, 60, 'bestSector must not lag behind restored bestLevel');
  assert.equal(splitSectorHangar.bestLevel, 60);

  const restartStorage = new MemoryStorage([
    [CLOUD_LANGUAGE_KEY, 'de'],
    [CLOUD_LOCAL_LEADERBOARD_KEY, JSON.stringify([
      { name: 'OLDLOCAL', score: 111, level: 2, rankIndex: 1, timestamp: '2026-01-01T00:00:00.000Z' }
    ])],
    [CLOUD_ACHIEVEMENT_KEY, JSON.stringify({ version: 1, unlocked: ['existing_local'] })],
    [CLOUD_SHIP_USAGE_KEY, JSON.stringify({ nova_ship_01: 2 })],
    [CLOUD_SHIP_USAGE_TOTAL_KEY, '2'],
    [CLOUD_SECTOR_START_CHALLENGE_RECORDS_KEY, JSON.stringify({
      version: 1,
      updatedAt: '2026-01-08T00:00:00.000Z',
      byCheckpoint: {
        10: {
          startSector: 10,
          scoreEarned: 9000,
          highestSectorReached: 13,
          finalSector: 13,
          shipName: 'Local Best',
          completedAt: '2026-01-08T00:00:00.000Z'
        }
      }
    })],
    [CLOUD_SCOUT_RUN_RECORDS_KEY, JSON.stringify({
      version: 1,
      updatedAt: '2026-01-08T00:00:00.000Z',
      best: {
        score: 140000,
        sectorReached: 12,
        levelReached: 12,
        shipName: 'Local Scout Best',
        completedAt: '2026-01-08T00:00:00.000Z'
      }
    })]
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
      pilotXp: 8888,
      pilotRank: 5,
      bestScore: 5555,
      bestRank: 7,
      bestLevel: 9,
      unlockedShipIds: ['nova_ship_01', 'nova_ship_05'],
      runContracts: makePilotOrdersState({
        activeIds: ['boss_hunter_10', 'enemy_sweep_10000', 'pilot_rank_5'],
        completedId: 'boss_hunter_10',
        progressId: 'enemy_sweep_10000',
        progress: 900
      })
    },
    threatDiscovery: {
      items: { bosses: { nova_boss_03: { id: 'nova_boss_03', category: 'bosses', name: 'Tyrian the Great' } } },
      unreadIds: ['bosses:nova_boss_03']
    },
    shipUsage: {
      nova_ship_01: 5,
      'row2_ship_1.png': 3
    },
    shipUsageTotal: 8,
    sectorStartChallengeRecords: {
      version: 1,
      updatedAt: '2026-01-09T00:00:00.000Z',
      byCheckpoint: {
        10: {
          startSector: 10,
          scoreEarned: 7000,
          highestSectorReached: 14,
          finalSector: 14,
          shipName: 'Cloud Lower',
          completedAt: '2026-01-09T00:00:00.000Z'
        },
        20: {
          startSector: 20,
          scoreEarned: 12000,
          highestSectorReached: 22,
          finalSector: 22,
          shipName: 'Cloud New',
          completedAt: '2026-01-09T00:00:00.000Z'
        }
      }
    },
    scoutRunRecords: {
      version: 1,
      updatedAt: '2026-01-09T00:00:00.000Z',
      best: {
        score: 120000,
        sectorReached: 18,
        levelReached: 18,
        shipName: 'Cloud Lower Score',
        completedAt: '2026-01-09T00:00:00.000Z'
      }
    },
    settings: {
      screenShake: 0.2,
      playerFocus: 0.75,
      colorAssist: true,
      audio: { musicEnabled: false, bossVoiceEnabled: false, musicPack: 'classic' },
      display: { mode: 'borderless', windowSize: { width: 1920, height: 1080 } },
      menu: { confirmExit: false, showPilotOrders: false },
      controls: { fireInput: 'toggle', mouseSteering: true }
    }
  }, { storage: restartStorage });
  assert.equal(restoreSummary.language, 'ja');
  assert.equal(restartStorage.getItem(CLOUD_LANGUAGE_KEY), 'ja');
  assert.equal(JSON.parse(restartStorage.getItem(CLOUD_LOCAL_LEADERBOARD_KEY))[0].name, 'CLOUDACE');
  assert.deepEqual(JSON.parse(restartStorage.getItem(CLOUD_ACHIEVEMENT_KEY)).unlocked.sort(), ['cloud_unlock', 'existing_local']);
  const restoredHangarProgress = JSON.parse(restartStorage.getItem(CLOUD_HANGAR_PROGRESS_KEY));
  assert.equal(restoredHangarProgress.pilotXp, 8888);
  assert.equal(restoredHangarProgress.runContracts.completed.boss_hunter_10.count, 1, 'restored Steam Cloud storage should keep Pilot Order completions');
  assert.equal(restoredHangarProgress.runContracts.progress.enemy_sweep_10000.progress, 900, 'restored Steam Cloud storage should keep Pilot Order progress');
  assert.equal(JSON.parse(restartStorage.getItem(CLOUD_THREAT_DISCOVERY_KEY)).items.bosses.nova_boss_03.name, 'Tyrian the Great');
  assert.equal(JSON.parse(restartStorage.getItem(CLOUD_SHIP_USAGE_KEY)).nova_ship_01, 5);
  assert.equal(JSON.parse(restartStorage.getItem(CLOUD_SHIP_USAGE_KEY))['row2_ship_1.png'], 3);
  assert.equal(restartStorage.getItem(CLOUD_SHIP_USAGE_TOTAL_KEY), '8');
  assert.equal(restartStorage.getItem(DISPLAY_MODE_KEY), 'borderless');
  assert.deepEqual(JSON.parse(restartStorage.getItem(DISPLAY_WINDOW_SIZE_KEY)), { width: 1920, height: 1080 });
  assert.equal(restartStorage.getItem(CONFIRM_EXIT_KEY), '0');
  assert.equal(restartStorage.getItem(SHOW_PILOT_ORDERS_KEY), '0');
  assert.deepEqual(JSON.parse(restartStorage.getItem(CONTROL_SETTINGS_KEY)), { fireInput: 'toggle', mouseSteering: true });
  const restoredSectorRecords = JSON.parse(restartStorage.getItem(CLOUD_SECTOR_START_CHALLENGE_RECORDS_KEY));
  assert.equal(restoredSectorRecords.byCheckpoint['10'].scoreEarned, 9000);
  assert.equal(restoredSectorRecords.byCheckpoint['20'].scoreEarned, 12000);
  const restoredScoutRecords = JSON.parse(restartStorage.getItem(CLOUD_SCOUT_RUN_RECORDS_KEY));
  assert.equal(restoredScoutRecords.best.score, 140000);
  assert.equal(restoredScoutRecords.best.shipName, 'Local Scout Best');
  assert.equal(restartStorage.getItem('burt_boss_voice_enabled'), 'false');

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
  assert.equal(oldSchema.version, 2);
  assert.equal(oldSchema.language.preference, 'system');
  assert.deepEqual(oldSchema.achievements.unlocked, []);

  writeFileSync(paths.cloudSavePath, '{ broken json');
  const recovered = saveSystem.readSave();
  assert.equal(recovered.version, 2);
  assert.equal(Array.isArray(recovered.localHighscores), true);

  const diagnostics = saveSystem.getDiagnostics();
  assert.equal(diagnostics.profile.storageId, 'local-offline');
  assert.equal(diagnostics.steamworksAutoCloud.byteQuota, 1048576);
  assert.equal(diagnostics.steamworksAutoCloud.fileCount, 20);
  assert.equal(diagnostics.steamworksAutoCloud.root, 'WinAppDataRoaming');
  assert.equal(diagnostics.steamworksAutoCloud.pattern, 'nova-swarm-save.json');
  assert.equal(diagnostics.steamworksAutoCloud.recursive, false);
  assert.equal(diagnostics.steamworksAutoCloud.dynamicCloudSync, false);
  assert.equal(diagnostics.persistenceSummary.cloudSavePath, paths.cloudSavePath);
  assert.equal(diagnostics.persistenceSummary.legacyCloudSavePath, paths.legacyCloudSavePath);
  assert.equal(diagnostics.persistenceSummary.hangarPilotXp >= 0, true);
  assert.equal(diagnostics.persistenceSummary.pilotOrdersCompleted >= 0, true);
  assert.equal(diagnostics.persistenceSummary.threatDiscoveryCategories >= 0, true);
  assert.equal(diagnostics.persistenceSummary.shipUsageTotal >= 0, true);

  if (process.env.APPDATA) {
    const realPaths = getPaths(path.join(process.env.APPDATA, 'nova-swarm'));
    assert.equal(
      realPaths.cloudSavePath,
      path.join(process.env.APPDATA, 'nova-swarm', 'steam-cloud', 'profiles', 'local-offline', 'nova-swarm-save.json')
    );
    assert.equal(
      realPaths.legacyCloudSavePath,
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
