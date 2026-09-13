import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  countThreatDiscovery,
  runProfileRescue,
  summarizeSave
} from './rescue-profile-progress.mjs';

const require = createRequire(import.meta.url);
const { createSteamCloudSave, getPaths } = require('../electron/steamCloudSave.cjs');

const HIGH_PROFILE = { steamId: '76561198692310517', personaName: 'tfoundgames' };
const LOW_PROFILE = { steamId: '76561198953993508', personaName: 'Tiny Foundry' };
const OTHER_PROFILE = { steamId: '76561198000000003', personaName: 'Other Pilot' };
const HIGH_KEY = `steam-${HIGH_PROFILE.steamId}`;
const LOW_KEY = `steam-${LOW_PROFILE.steamId}`;

function makeThreatDiscovery(count, prefix, overrides = {}) {
  const categories = ['enemies', 'bosses', 'powerups', 'hazards', 'sectors'];
  const items = Object.fromEntries(categories.map((category) => [category, {}]));
  for (let index = 1; index <= count; index += 1) {
    const category = categories[(index - 1) % categories.length];
    const id = `${prefix}_${String(index).padStart(3, '0')}`;
    items[category][id] = {
      id,
      category,
      name: `Signal ${index}`,
      firstSeenAt: '2026-06-07T00:00:00.000Z',
      lastSeenAt: '2026-06-18T00:00:00.000Z',
      timesSeen: index,
      timesDefeated: Math.max(0, index - 1),
      timesSurvived: 0,
      timesKilledPlayer: 0,
      bestClearTimeAgainst: null,
      highestScoreDuringEncounter: index * 10,
      metadata: { sector: Math.max(1, Math.ceil(index / 12)) }
    };
  }
  return {
    version: 1,
    items: { ...items, ...(overrides.items || {}) },
    discoveriesThisRun: [],
    recentRunThemes: ['ion-drift'],
    unreadIds: Object.entries(items)
      .flatMap(([category, bucket]) => Object.keys(bucket).map((id) => `${category}:${id}`))
      .slice(0, 8),
    updatedAt: '2026-06-18T12:30:18.998Z'
  };
}

function makeSave(profile, progress = {}) {
  const key = profile.steamId ? `steam-${profile.steamId}` : profile.id;
  const ships = progress.ships || ['nova_ship_01'];
  const threatDiscovery = progress.threatDiscovery || makeThreatDiscovery(progress.codex || 1, key.replace(/[^a-z0-9]/gi, '_'));
  const checkpoints = progress.checkpoints || [];
  const byCheckpoint = Object.fromEntries(checkpoints.map((checkpoint) => [
    String(checkpoint),
    {
      startSector: checkpoint,
      scoreEarned: checkpoint * 1000,
      highestSectorReached: checkpoint + 1,
      finalSector: checkpoint + 1,
      completedAt: '2026-06-18T12:30:18.998Z',
      source: 'sector_start_challenge'
    }
  ]));
  return {
    version: 2,
    profile: {
      type: profile.steamId ? 'steam' : 'local',
      id: profile.steamId || profile.id,
      steamId: profile.steamId || null,
      storageId: key,
      personaName: profile.personaName || null
    },
    updatedAt: progress.updatedAt || '2026-06-18T12:30:18.998Z',
    language: { preference: 'system', current: null },
    localHighscores: [
      {
        name: 'ACE',
        score: progress.bestScore || 1000,
        level: progress.bestSector || 1,
        rankIndex: progress.rank || 0,
        timestamp: '2026-06-18T12:30:18.998Z'
      }
    ],
    achievements: { version: 1, unlocked: progress.achievements || [], updatedAt: '2026-06-18T12:30:18.998Z' },
    selectedShipKey: progress.selectedShipKey || ships[0],
    progression: {
      bestScore: progress.bestScore || 1000,
      bestRank: progress.rank || 0,
      bestLevel: progress.bestSector || 1
    },
    hangarProgress: {
      version: 1,
      unlockTuningVersion: 3,
      pilotXp: progress.xp || 0,
      pilotRank: progress.rank || 0,
      highestPilotRank: progress.rank || 0,
      totalRuns: progress.totalRuns || 1,
      bestScore: progress.bestScore || 1000,
      bestSector: progress.bestSector || 1,
      bestLevel: progress.bestSector || 1,
      bestRank: progress.rank || 0,
      bestRunTimeSeconds: progress.bestRunTimeSeconds || 0,
      survivedSeconds: progress.survivedSeconds || 0,
      totalBossesDefeated: progress.bosses || 0,
      totalWavesCleared: progress.waves || 0,
      totalCodexDiscoveries: progress.codex || countThreatDiscovery(threatDiscovery),
      runClears: progress.runClears || 0,
      noHitWaves: progress.noHitWaves || 0,
      noHitSectors: progress.noHitSectors || 0,
      clearWithLivesRemaining: progress.clearWithLivesRemaining || 0,
      highestScoreMultiplier: progress.highestScoreMultiplier || 1,
      shipSpecificMilestones: Object.fromEntries(ships.map((shipId) => [shipId, { runs: 1, bestSector: progress.bestSector || 1 }])),
      discoveredThreatIds: Object.values(threatDiscovery.items).flatMap((bucket) => Object.keys(bucket)),
      defeatedBossIds: progress.defeatedBossIds || [],
      runThemesSurvived: progress.runThemesSurvived || [],
      secretShipUnlockIds: progress.secretShipUnlockIds || [],
      creditsEasterEggFound: Boolean(progress.creditsEasterEggFound),
      unlockedShipIds: ships,
      lastNewlyUnlockedShipIds: progress.lastNewlyUnlockedShipIds || [],
      newRanksThisRun: [],
      rankAchievementsUnlocked: progress.rankAchievementsUnlocked || [],
      rankProgress: { nextRankXp: 999999 },
      updatedAt: progress.updatedAt || '2026-06-18T12:30:18.998Z'
    },
    threatDiscovery,
    sectorStartChallengeRecords: {
      version: 1,
      updatedAt: '2026-06-18T12:30:18.998Z',
      byCheckpoint
    },
    shipUsage: Object.fromEntries(ships.map((shipId, index) => [shipId, index + 1])),
    shipUsageTotal: ships.length,
    settings: progress.settings || {
      screenShake: 0.25,
      playerFocus: 0.5,
      colorAssist: true,
      audio: { masterVolume: 0.12 },
      display: { mode: 'windowed', windowSize: { width: 1366, height: 768 } }
    }
  };
}

function writeSaveForProfile(userData, profile, save) {
  const paths = getPaths(userData, profile);
  mkdirSync(path.dirname(paths.cloudSavePath), { recursive: true });
  writeFileSync(paths.cloudSavePath, JSON.stringify(save, null, 2));
  return paths.cloudSavePath;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function seedFixture(userData) {
  const highShips = Array.from({ length: 23 }, (_, index) => `nova_ship_${String(index + 1).padStart(2, '0')}`);
  const lowShips = ['nova_ship_01', 'nova_ship_02', 'nova_ship_03'];
  const highSave = makeSave(HIGH_PROFILE, {
    xp: 126083,
    rank: 17,
    bestSector: 31,
    bestScore: 168666,
    ships: highShips,
    codex: 783,
    checkpoints: [5, 10, 15, 20, 30],
    achievements: ['ACH_EARLY_PILOT', 'ACH_RANK_17'],
    defeatedBossIds: ['boss_001'],
    runThemesSurvived: ['ion-drift', 'gold-surge']
  });
  const lowSave = makeSave(LOW_PROFILE, {
    xp: 1078,
    rank: 1,
    bestSector: 2,
    bestScore: 5842,
    ships: lowShips,
    codex: 40,
    checkpoints: [20, 25, 45],
    achievements: ['ACH_EARLY_PILOT'],
    settings: {
      screenShake: 0.11,
      playerFocus: 0.77,
      colorAssist: false,
      audio: { masterVolume: 0.44 },
      display: { mode: 'borderless', windowSize: { width: 1280, height: 800 } }
    }
  });
  const legacySave = makeSave({ id: 'legacy-shared' }, {
    xp: 16201,
    rank: 7,
    bestSector: 21,
    bestScore: 71526,
    ships: Array.from({ length: 11 }, (_, index) => `nova_ship_${String(index + 1).padStart(2, '0')}`),
    codex: 120
  });
  const otherSave = makeSave(OTHER_PROFILE, {
    xp: 999,
    rank: 1,
    bestSector: 4,
    bestScore: 9000,
    ships: ['nova_ship_01'],
    codex: 5
  });

  const highPath = writeSaveForProfile(userData, HIGH_PROFILE, highSave);
  const lowPath = writeSaveForProfile(userData, LOW_PROFILE, lowSave);
  const otherPath = writeSaveForProfile(userData, OTHER_PROFILE, otherSave);
  const legacyPath = path.join(userData, 'steam-cloud', 'profiles', 'legacy-shared', 'nova-swarm-save.json');
  mkdirSync(path.dirname(legacyPath), { recursive: true });
  writeFileSync(legacyPath, JSON.stringify(legacySave, null, 2));

  const sharedPath = path.join(userData, 'steam-cloud', 'nova-swarm-save.json');
  writeFileSync(sharedPath, JSON.stringify(lowSave, null, 2));
  writeFileSync(path.join(userData, 'steam-cloud', 'profile-index.json'), JSON.stringify({
    version: 1,
    profiles: {
      [HIGH_KEY]: { steamId: HIGH_PROFILE.steamId, storageId: HIGH_KEY, savePath: highPath },
      [LOW_KEY]: { steamId: LOW_PROFILE.steamId, storageId: LOW_KEY, savePath: lowPath }
    }
  }, null, 2));
  return { highSave, lowSave, legacySave, otherSave, highPath, lowPath, sharedPath, otherPath };
}

function runTests() {
  const tempRoot = mkdtempSync(path.join(tmpdir(), 'nova-profile-rescue-'));
  const userData = path.join(tempRoot, 'nova-swarm');
  const auditRoot = path.join(tempRoot, 'test-results');
  try {
    const fixture = seedFixture(userData);
    const otherBefore = readFileSync(fixture.otherPath, 'utf8');

    const dryRun = runProfileRescue({
      userData,
      auditRoot,
      source: HIGH_KEY,
      target: LOW_KEY,
      apply: false
    });
    assert.equal(dryRun.applied, false);
    assert.equal(dryRun.source.profileKey, HIGH_KEY);
    assert.equal(dryRun.target.profileKey, LOW_KEY);
    assert.equal(dryRun.target.before.pilotRank, 1);
    assert.equal(dryRun.target.after.pilotRank, 17);
    assert.equal(readJson(fixture.lowPath).hangarProgress.pilotRank, 1, 'dry-run must not write target profile');
    assert.equal(existsSync(path.join(dryRun.auditDir, 'rescue-audit.json')), true, 'dry-run should write ignored audit evidence');

    const applied = runProfileRescue({
      userData,
      auditRoot,
      source: HIGH_KEY,
      target: LOW_KEY,
      apply: true
    });
    assert.equal(applied.applied, true);
    assert.equal(applied.backedUp.length >= 2, true, 'apply must back up target files before writing');

    const mergedTarget = readJson(fixture.lowPath);
    const mergedShared = readJson(fixture.sharedPath);
    assert.equal(mergedTarget.profile.steamId, LOW_PROFILE.steamId, 'target keeps active Steam profile identity');
    assert.equal(mergedShared.profile.steamId, LOW_PROFILE.steamId, 'active shared mirror keeps active Steam profile identity');
    assert.equal(mergedTarget.hangarProgress.pilotRank, 17, 'pilot rank uses max');
    assert.equal(mergedTarget.hangarProgress.pilotXp, 126083, 'pilot XP uses max');
    assert.equal(mergedTarget.progression.bestScore, 168666, 'best score uses max');
    assert.equal(mergedTarget.hangarProgress.unlockedShipIds.length, 23, 'Hangar ships are unioned');
    assert.equal(countThreatDiscovery(mergedTarget.threatDiscovery), 823, 'Codex discoveries increase without losing active discoveries');
    assert.deepEqual(
      Object.keys(mergedTarget.sectorStartChallengeRecords.byCheckpoint).map(Number).sort((a, b) => a - b),
      [5, 10, 15, 20, 25, 30, 45],
      'checkpoint records are unioned'
    );
    assert.equal(mergedTarget.settings.audio.masterVolume, 0.44, 'active settings are preserved');
    assert.equal(mergedTarget.achievements.unlocked.includes('ACH_EARLY_PILOT'), true, 'First Ranked Run status survives');
    assert.equal(readFileSync(fixture.otherPath, 'utf8'), otherBefore, 'unrelated Steam profile must not be modified');

    const idempotent = runProfileRescue({
      userData,
      auditRoot,
      source: HIGH_KEY,
      target: LOW_KEY,
      apply: true
    });
    assert.equal(idempotent.idempotent, true, 'second run should be safe/idempotent');
    assert.equal(idempotent.writesPlanned.length, 0, 'idempotent run should not rewrite saves');
    assert.equal(readJson(fixture.lowPath).hangarProgress.unlockedShipIds.length, 23, 'second run must not decrease ships');

    const wrongWayRoot = path.join(tempRoot, 'wrong-way');
    const wrongWayUserData = path.join(wrongWayRoot, 'nova-swarm');
    const wrongWayAuditRoot = path.join(wrongWayRoot, 'test-results');
    seedFixture(wrongWayUserData);
    assert.throws(() => runProfileRescue({
      userData: wrongWayUserData,
      auditRoot: wrongWayAuditRoot,
      source: LOW_KEY,
      target: HIGH_KEY,
      apply: false
    }), /Refusing rescue/, 'wrong direction merge should be refused');

    const loaded = createSteamCloudSave(userData, { warn() {} }, { profile: LOW_PROFILE }).readSave();
    const loadedSummary = summarizeSave(loaded);
    assert.equal(loaded.profile.steamId, LOW_PROFILE.steamId, 'normal profile loading keeps active SteamID');
    assert.equal(loadedSummary.pilotRank, 17, 'normal profile loading sees rescued rank');
    assert.equal(loadedSummary.shipsUnlocked, 23, 'normal profile loading sees rescued hangar');
    assert.equal(countThreatDiscovery(loaded.threatDiscovery), 823, 'normal profile loading sees rescued Codex');
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

runTests();
console.log('[profile-rescue-import] PASS explicit Steam profile rescue is dry-run first, monotonic, idempotent, and isolated');
