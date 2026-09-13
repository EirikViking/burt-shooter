import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { createSteamCloudSave, getPaths } = require('../electron/steamCloudSave.cjs');

class MemoryStorage {
  constructor(entries = []) {
    this.map = new Map(entries);
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
}

function makeThreatState(count, { prefix = 'known', category = 'enemies', updatedAt = '2026-06-20T00:00:00.000Z' } = {}) {
  const items = { [category]: {} };
  for (let index = 0; index < count; index += 1) {
    const id = `${prefix}_${String(index + 1).padStart(4, '0')}`;
    items[category][id] = {
      id,
      category,
      name: `Signal ${index + 1}`,
      firstSeenAt: updatedAt,
      lastSeenAt: updatedAt,
      timesSeen: 1,
      timesDefeated: 0,
      timesSurvived: 0,
      timesKilledPlayer: 0,
      bestClearTimeAgainst: null,
      highestScoreDuringEncounter: index,
      metadata: { fixture: prefix }
    };
  }
  return {
    version: 1,
    items,
    discoveriesThisRun: [],
    recentRunThemes: [],
    unreadIds: [],
    updatedAt
  };
}

function discoveryCount(state = {}) {
  return Object.values(state.items || {})
    .reduce((total, bucket) => total + (bucket && typeof bucket === 'object' ? Object.keys(bucket).length : 0), 0);
}

function makeHangarProgress(totalCodexDiscoveries = 763) {
  return {
    version: 1,
    unlockTuningVersion: 3,
    pilotXp: 203131,
    pilotRank: 19,
    highestPilotRank: 19,
    totalRuns: 44,
    bestScore: 168666,
    bestSector: 60,
    bestLevel: 60,
    bestRank: 19,
    bestRunTimeSeconds: 0,
    survivedSeconds: 0,
    totalBossesDefeated: 0,
    totalWavesCleared: 0,
    totalCodexDiscoveries,
    runClears: 0,
    noHitWaves: 0,
    noHitSectors: 0,
    clearWithLivesRemaining: 0,
    highestScoreMultiplier: 1,
    shipSpecificMilestones: {},
    discoveredThreatIds: [],
    defeatedBossIds: [],
    runThemesSurvived: [],
    secretShipUnlockIds: [],
    creditsEasterEggFound: false,
    unlockedShipIds: ['nova_ship_01'],
    lastNewlyUnlockedShipIds: [],
    newRanksThisRun: [],
    rankAchievementsUnlocked: [],
    updatedAt: '2026-06-20T00:00:00.000Z'
  };
}

function installStorage(storage) {
  globalThis.localStorage = storage;
  globalThis.window = {
    localStorage: storage,
    __novaSteamCloudDiagnostics: {
      sync: async () => ({ ok: true })
    }
  };
}

const storage = new MemoryStorage();
installStorage(storage);

const {
  CLOUD_ACHIEVEMENT_KEY,
  CLOUD_HANGAR_PROGRESS_KEY,
  CLOUD_LOCAL_LEADERBOARD_KEY,
  CLOUD_SCOUT_RUN_RECORDS_KEY,
  CLOUD_SHIP_USAGE_KEY,
  CLOUD_SHIP_USAGE_TOTAL_KEY,
  CLOUD_THREAT_DISCOVERY_KEY,
  collectSteamCloudPersistenceState,
  restoreSteamCloudPersistenceToStorage
} = await import('../src/steamCloudPersistence.js');
const {
  THREAT_DISCOVERY_KEY,
  getCodexDiscoverySignature,
  getDiscoveryStats,
  recordThreatSeen,
  startThreatDiscoveryRun
} = await import('../src/progression/ThreatDiscoveryState.js');
const {
  getScoutRunBest,
  recordScoutRun
} = await import('../src/progression/ScoutRunRecords.js');

const userData = mkdtempSync(path.join(tmpdir(), 'nova-scout-codex-'));
try {
  const baselineDiscovery = makeThreatState(763);
  baselineDiscovery.unreadIds = ['enemies:known_0763'];
  const baselineHangar = makeHangarProgress(763);
  storage.setItem(CLOUD_THREAT_DISCOVERY_KEY, JSON.stringify(baselineDiscovery));
  storage.setItem(CLOUD_HANGAR_PROGRESS_KEY, JSON.stringify(baselineHangar));
  storage.setItem(CLOUD_ACHIEVEMENT_KEY, JSON.stringify({ version: 1, unlocked: [] }));
  storage.setItem(CLOUD_LOCAL_LEADERBOARD_KEY, '[]');
  storage.setItem(CLOUD_SCOUT_RUN_RECORDS_KEY, JSON.stringify({
    version: 1,
    updatedAt: '2026-06-20T00:00:00.000Z',
    best: {
      score: 100000,
      sectorReached: 12,
      levelReached: 12,
      shipName: 'Previous Scout',
      completedAt: '2026-06-20T00:00:00.000Z'
    }
  }));
  storage.setItem(CLOUD_SHIP_USAGE_KEY, '{}');
  storage.setItem(CLOUD_SHIP_USAGE_TOTAL_KEY, '0');

  startThreatDiscoveryRun();
  const hydratedBaselineCount = getDiscoveryStats().totalDiscovered;
  assert.ok(hydratedBaselineCount >= 763, 'Existing 763-discovery profile should not shrink during hydration');
  for (let index = 0; index < 40; index += 1) {
    recordThreatSeen(`scout_added_${String(index + 1).padStart(3, '0')}`, 'enemies', {
      name: `Scout Signal ${index + 1}`,
      runMode: 'scout',
      fixture: true
    });
  }
  const expectedAfterScout = hydratedBaselineCount + 40;

  const afterScoutState = JSON.parse(storage.getItem(THREAT_DISCOVERY_KEY));
  assert.equal(discoveryCount(afterScoutState), expectedAfterScout, 'Scout discoveries should add to the shared Codex state');
  assert.equal(getDiscoveryStats().totalDiscovered, expectedAfterScout, 'Scout discovery stats should reflect new entries immediately');
  assert.equal(afterScoutState.discoveriesThisRun.length, 40, 'Scout should track this-run Codex discoveries');

  const scoutBestResult = recordScoutRun({
    runMode: 'scout',
    score: 185000,
    sectorReached: 18,
    levelReached: 18,
    runElapsedSeconds: 420,
    bossesKilled: 2,
    wavesCleared: 36
  }, {
    targetStorage: storage,
    shipName: 'Scout Persistence',
    selectedShipSpriteKey: 'nova-player-ship-01.png'
  });
  assert.equal(scoutBestResult.stored, true, 'Scout local best should store when the score is higher');
  assert.equal(getScoutRunBest({ targetStorage: storage }).score, 185000, 'Scout local best should survive immediate readback');

  const collected = collectSteamCloudPersistenceState({ storage });
  assert.equal(discoveryCount(collected.threatDiscovery), expectedAfterScout, 'Steam Cloud renderer collection should include Scout Codex discoveries');
  assert.equal(collected.hangarProgress.pilotXp, baselineHangar.pilotXp, 'Scout Codex discovery must not grant career XP');
  assert.equal(collected.hangarProgress.totalCodexDiscoveries, 763, 'Scout Codex discovery must not mutate ranked Hangar/Career Codex counters');
  assert.deepEqual(collected.localHighscores, [], 'Scout Codex discovery must not create leaderboard entries');
  assert.deepEqual(collected.achievements.unlocked, [], 'Scout Codex discovery must not unlock achievements');
  assert.equal(collected.scoutRunRecords.best.score, 185000, 'Steam Cloud renderer collection should include Scout local best');
  assert.deepEqual(collected.shipUsage, {}, 'Scout Codex discovery must not update ship usage');
  assert.equal(collected.shipUsageTotal, 0, 'Scout Codex discovery must not update total ship usage');

  const saveSystem = createSteamCloudSave(userData, { warn() {} }, {
    profile: { steamId: '76561198953993508', personaName: 'Target' }
  });
  saveSystem.ensureInitialized();
  const savedAfterScout = saveSystem.mergeRendererState(collected);
  assert.equal(discoveryCount(savedAfterScout.threatDiscovery), expectedAfterScout, 'Electron save should persist Scout Codex discoveries');
  assert.ok(savedAfterScout.threatDiscovery.unreadIds.includes('enemies:known_0763'), 'large Codex unread marker above 500 entries should survive Electron save');
  assert.ok(savedAfterScout.threatDiscovery.unreadIds.includes('enemies:scout_added_040'), 'new Scout unread marker should survive Electron save');
  assert.equal(savedAfterScout.scoutRunRecords.best.score, 185000, 'Electron save should persist Scout local best');

  const staleRenderer = collectSteamCloudPersistenceState({
    storage: new MemoryStorage([
      [CLOUD_THREAT_DISCOVERY_KEY, JSON.stringify(baselineDiscovery)],
      [CLOUD_HANGAR_PROGRESS_KEY, JSON.stringify(baselineHangar)],
      [CLOUD_SCOUT_RUN_RECORDS_KEY, JSON.stringify({
        version: 1,
        updatedAt: '2026-06-20T00:00:00.000Z',
        best: {
          score: 100000,
          sectorReached: 12,
          levelReached: 12,
          shipName: 'Stale Scout',
          completedAt: '2026-06-20T00:00:00.000Z'
        }
      })]
    ])
  });
  const savedAfterStaleSync = saveSystem.mergeRendererState(staleRenderer);
  assert.equal(discoveryCount(savedAfterStaleSync.threatDiscovery), expectedAfterScout, 'A stale 763 renderer sync must not reduce saved Codex discoveries');
  assert.equal(savedAfterStaleSync.scoutRunRecords.best.score, 185000, 'A stale lower Scout Best sync must not reduce saved Scout local best');

  const restartStorage = new MemoryStorage([
    [CLOUD_THREAT_DISCOVERY_KEY, JSON.stringify(baselineDiscovery)],
    [CLOUD_HANGAR_PROGRESS_KEY, JSON.stringify(baselineHangar)],
    [CLOUD_SCOUT_RUN_RECORDS_KEY, JSON.stringify({
      version: 1,
      updatedAt: '2026-06-20T00:00:00.000Z',
      best: {
        score: 100000,
        sectorReached: 12,
        levelReached: 12,
        shipName: 'Restart Old Scout',
        completedAt: '2026-06-20T00:00:00.000Z'
      }
    })]
  ]);
  const restoreSummary = restoreSteamCloudPersistenceToStorage(savedAfterStaleSync, { storage: restartStorage });
  const restoredDiscovery = JSON.parse(restartStorage.getItem(CLOUD_THREAT_DISCOVERY_KEY));
  const restoredScoutBest = JSON.parse(restartStorage.getItem(CLOUD_SCOUT_RUN_RECORDS_KEY));
  assert.equal(restoreSummary.threatDiscovery, true, 'Restart restore should report Threat Codex restoration');
  assert.equal(discoveryCount(restoredDiscovery), expectedAfterScout, 'Restart/profile reload should restore Scout Codex discoveries above 763');
  assert.equal(restoredDiscovery.items.enemies.scout_added_040.name, 'Scout Signal 40');
  assert.ok(restoredDiscovery.unreadIds.includes('enemies:known_0763'), 'Restart restore should preserve valid large-Codex unread markers');
  assert.ok(restoredDiscovery.unreadIds.includes('enemies:scout_added_040'), 'Restart restore should preserve new Scout unread markers');
  assert.equal(restoreSummary.scoutRunBest, 185000, 'Restart restore should report restored Scout local best');
  assert.equal(restoredScoutBest.best.score, 185000, 'Restart/profile reload should restore Scout local best above the stale value');

  const viewedSignature = getCodexDiscoverySignature(savedAfterScout.threatDiscovery.items);
  const viewedLargeCodexState = {
    ...savedAfterScout.threatDiscovery,
    unreadIds: [],
    lastViewedCodexDiscoverySignature: viewedSignature.signature,
    lastViewedCodexDiscoveryCount: viewedSignature.count,
    lastViewedCodexAt: '2026-06-22T12:30:00.000Z'
  };
  const viewedRestoreStorage = new MemoryStorage([
    [CLOUD_THREAT_DISCOVERY_KEY, JSON.stringify({
      ...baselineDiscovery,
      unreadIds: ['enemies:known_0763']
    })]
  ]);
  restoreSteamCloudPersistenceToStorage({ threatDiscovery: viewedLargeCodexState }, { storage: viewedRestoreStorage });
  const viewedRestoredDiscovery = JSON.parse(viewedRestoreStorage.getItem(CLOUD_THREAT_DISCOVERY_KEY));
  assert.equal(discoveryCount(viewedRestoredDiscovery), expectedAfterScout, 'Viewed large Codex restore should still keep all 500+ discoveries');
  assert.deepEqual(viewedRestoredDiscovery.unreadIds, [], 'Viewed large Codex restore should not relight stale unread markers');
  assert.equal(viewedRestoredDiscovery.lastViewedCodexDiscoverySignature, viewedSignature.signature, 'Viewed large Codex restore should persist the canonical read signature');

  const lowerCloudRestoreStorage = new MemoryStorage([
    [CLOUD_THREAT_DISCOVERY_KEY, JSON.stringify(afterScoutState)],
    [CLOUD_SCOUT_RUN_RECORDS_KEY, JSON.stringify({
      version: 1,
      updatedAt: '2026-06-20T00:00:00.000Z',
      best: {
        score: 185000,
        sectorReached: 18,
        levelReached: 18,
        shipName: 'Local Scout Best',
        completedAt: '2026-06-20T00:00:00.000Z'
      }
    })]
  ]);
  restoreSteamCloudPersistenceToStorage({
    threatDiscovery: baselineDiscovery,
    scoutRunRecords: {
      version: 1,
      best: {
        score: 100000,
        sectorReached: 12,
        levelReached: 12,
        shipName: 'Lower Cloud Scout',
        completedAt: '2026-06-20T00:00:00.000Z'
      }
    }
  }, { storage: lowerCloudRestoreStorage });
  assert.equal(
    discoveryCount(JSON.parse(lowerCloudRestoreStorage.getItem(CLOUD_THREAT_DISCOVERY_KEY))),
    expectedAfterScout,
    'Restoring an older/lower cloud save must not reduce local Scout Codex discoveries'
  );
  assert.equal(
    JSON.parse(lowerCloudRestoreStorage.getItem(CLOUD_SCOUT_RUN_RECORDS_KEY)).best.score,
    185000,
    'Restoring an older/lower cloud save must not reduce local Scout Best'
  );

  startThreatDiscoveryRun();
  recordThreatSeen('mayhem_added_001', 'enemies', { name: 'Mayhem Signal', runMode: 'ranked' });
  assert.equal(getDiscoveryStats().totalDiscovered, expectedAfterScout + 1, 'Mayhem Codex persistence path should still use the same durable store');

  const siblingSave = createSteamCloudSave(userData, { warn() {} }, {
    profile: { steamId: '76561198692310517', personaName: 'Sibling' }
  });
  siblingSave.ensureInitialized();
  siblingSave.mergeRendererState({ threatDiscovery: makeThreatState(5, { prefix: 'sibling' }) });
  assert.equal(discoveryCount(saveSystem.readSave().threatDiscovery), expectedAfterScout, 'Target Steam profile Codex save should stay isolated from sibling profile writes');
  assert.equal(discoveryCount(siblingSave.readSave().threatDiscovery), 5, 'Sibling Steam profile should keep its own Codex save');
  assert.notEqual(getPaths(userData, { steamId: '76561198953993508' }).cloudSavePath, getPaths(userData, { steamId: '76561198692310517' }).cloudSavePath);

  const gameSource = await import('node:fs').then((fs) => fs.readFileSync('src/game/Game.js', 'utf8'));
  assert.match(
    gameSource,
    /if \(\s*\(this\.isRankedRun\(\) \|\| requestedRunMode === RUN_MODES\.SCOUT \|\| requestedRunMode === RUN_MODES\.DAILY_SIGNAL\)\s*&& RunPacingConfig\.threatCodexEnabled\s*\) \{\s*startThreatDiscoveryRun\(\);/,
    'Mayhem, Scout, and Daily should start a fresh Codex discovery window'
  );

  console.log(`[scout-codex-persistence] PASS save=${getPaths(userData, { steamId: '76561198953993508' }).cloudSavePath}`);
} finally {
  rmSync(userData, { recursive: true, force: true });
}
