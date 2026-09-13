import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getThreatCodexCatalog } from '../src/config/ThreatCodexCatalog.js';
import {
  HANGAR_PROGRESS_KEY,
  LEGACY_UNLOCK_PROGRESS_KEY,
  applyRunProgression,
  createDefaultHangarProgress,
  readHangarProgressState,
  recalculateUnlockedShipIds
} from '../src/progression/HangarProgressState.js';
import {
  THREAT_DISCOVERY_KEY,
  getCodexCompletionCounts,
  normalizeThreatDiscoveryState
} from '../src/progression/ThreatDiscoveryState.js';
import { getPilotRankProgress } from '../src/shared/RankPolicy.js';

const fakeStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => fakeStorage.get(key) ?? null,
  setItem: (key, value) => fakeStorage.set(key, String(value)),
  removeItem: (key) => fakeStorage.delete(key)
};

function resetStorage() {
  fakeStorage.clear();
}

function makeItems(category, count) {
  return Object.fromEntries(Array.from({ length: count }, (_entry, index) => {
    const id = category === 'sectors'
      ? `sector_${String(index + 1).padStart(3, '0')}`
      : `${category}_${String(index + 1).padStart(3, '0')}`;
    return [id, {
      id,
      category,
      name: id.toUpperCase(),
      timesSeen: 1
    }];
  }));
}

function firstRunSummary({
  sectorReached,
  score,
  wavesCleared,
  bossesKilled,
  codexDiscoveries,
  attackPatterns,
  powerups
}) {
  return {
    score,
    finalScore: score,
    sectorReached,
    levelReached: sectorReached,
    runElapsedSeconds: sectorReached * 95,
    bossesKilled,
    wavesCleared,
    livesRemaining: 1,
    runCleared: false,
    clearLivesRemaining: 0,
    codexDiscoveries,
    totalCodexDiscoveries: codexDiscoveries,
    runThemeDiscoveries: 1,
    discoveredThreatIds: Array.from({ length: codexDiscoveries }, (_entry, index) => `first_run_${index}`),
    defeatedBossIds: Array.from({ length: bossesKilled }, (_entry, index) => `boss_${index}`),
    runTheme: 'swarm_lattice',
    noHitWaves: 0,
    noHitSectors: 0,
    highestScoreMultiplier: 1,
    checkExpectations: {
      attackPatterns,
      powerups,
      sectors: sectorReached
    }
  };
}

function applyCleanFirstRun(summary) {
  resetStorage();
  const result = applyRunProgression(summary);
  const progress = readHangarProgressState();
  const unlockedShips = recalculateUnlockedShipIds(progress);
  return {
    summary,
    result,
    progress,
    unlockedShips,
    displayRank: (result.next?.pilotRank || 0) + 1,
    rankProgress: getPilotRankProgress(result.next?.pilotXp || 0)
  };
}

const catalog = getThreatCodexCatalog();
const emptyCompletion = getCodexCompletionCounts(catalog, normalizeThreatDiscoveryState());
assert.equal(emptyCompletion.powerups.discovered, 0, 'fresh Codex must not auto-discover powerups');
assert.equal(emptyCompletion.sectors.discovered, 0, 'fresh Codex must not auto-discover sectors');
assert.equal(emptyCompletion.attackPatterns.discovered, 0, 'fresh Codex must not auto-discover attack patterns');

const partialState = normalizeThreatDiscoveryState({
  items: {
    powerups: makeItems('powerups', 3),
    sectors: makeItems('sectors', 5),
    attackPatterns: makeItems('attackPatterns', 9)
  }
});
const partialCompletion = getCodexCompletionCounts(catalog, partialState);
assert.equal(partialCompletion.powerups.discovered, 3, 'powerup Codex completion should reflect pickups only');
assert.equal(partialCompletion.sectors.discovered, 5, 'sector Codex completion should reflect reached sectors only');
assert.equal(partialCompletion.attackPatterns.discovered, 9, 'attack pattern Codex completion should reflect encountered patterns only');
assert(partialCompletion.powerups.total >= 22, 'powerup catalog should remain complete');
assert(partialCompletion.sectors.total >= 12, 'sector catalog should remain long-term');

const level5 = applyCleanFirstRun(firstRunSummary({
  sectorReached: 5,
  score: 18000,
  wavesCleared: 24,
  bossesKilled: 4,
  codexDiscoveries: 22,
  attackPatterns: 7,
  powerups: 3
}));
assert(level5.displayRank >= 1 && level5.displayRank <= 2, `sector 5 first run rank too high: ${level5.displayRank}`);
assert(level5.unlockedShips.length >= 2 && level5.unlockedShips.length <= 4, `sector 5 hull count should be modest, got ${level5.unlockedShips.length}`);

const level10 = applyCleanFirstRun(firstRunSummary({
  sectorReached: 10,
  score: 52000,
  wavesCleared: 54,
  bossesKilled: 9,
  codexDiscoveries: 36,
  attackPatterns: 14,
  powerups: 6
}));
assert(level10.displayRank >= 2 && level10.displayRank <= 3, `sector 10 first run should land around display rank 2-3, got ${level10.displayRank}`);
assert(level10.progress.totalCodexDiscoveries >= 25 && level10.progress.totalCodexDiscoveries <= 45, `sector 10 Codex band should be 25-45, got ${level10.progress.totalCodexDiscoveries}`);
assert(level10.unlockedShips.length >= 2 && level10.unlockedShips.length <= 4, `sector 10 first run should leave most hulls locked, got ${level10.unlockedShips.length}`);
assert(level10.unlockedShips.length !== 8, 'sector 10 first run must not unlock 8 hulls');
assert(level10.summary.checkExpectations.powerups < 22, 'sector 10 first run must not complete all powerups');
assert(level10.summary.checkExpectations.sectors < 12, 'sector 10 first run must not complete all sectors');
assert(level10.summary.checkExpectations.attackPatterns < 20, 'sector 10 first run should stay below 20 attack patterns');
assert(level10.rankProgress.rankIndex <= 2, `sector 10 pilot rank index should be <= 2, got ${level10.rankProgress.rankIndex}`);

const level15 = applyCleanFirstRun(firstRunSummary({
  sectorReached: 15,
  score: 90000,
  wavesCleared: 84,
  bossesKilled: 14,
  codexDiscoveries: 55,
  attackPatterns: 18,
  powerups: 9
}));
assert(level15.displayRank <= 4, `sector 15 first run should not race deep into career ranks, got ${level15.displayRank}`);
assert(level15.unlockedShips.length < 8, `sector 15 first run should still have fewer than 8 hulls, got ${level15.unlockedShips.length}`);
assert(level15.summary.checkExpectations.powerups < 22, 'sector 15 first run must not complete all powerups');
assert(level15.summary.checkExpectations.sectors < 12 || level15.summary.sectorReached > 12, 'sector completion must follow reached sectors');

resetStorage();
fakeStorage.set(HANGAR_PROGRESS_KEY, JSON.stringify({
  version: 1,
  unlockTuningVersion: 3,
  pilotXp: 2500,
  pilotRank: 2,
  totalRuns: 2,
  bestSector: 4,
  totalCodexDiscoveries: 30,
  unlockedShipIds: ['nova_ship_01', 'nova_ship_02']
}));
const existing = readHangarProgressState();
assert(existing.pilotXp >= 2500, 'existing hangar saves should still load');
assert(existing.unlockedShipIds.includes('nova_ship_01'), 'existing save should keep starter ship');

resetStorage();
fakeStorage.set(LEGACY_UNLOCK_PROGRESS_KEY, JSON.stringify({ bestLevel: 20, bestRank: 6, bestScore: 100000 }));
const migratedLegacy = readHangarProgressState();
assert(migratedLegacy.bestRank >= 6, 'legacy best rank migration should still load');
assert(migratedLegacy.unlockedShipIds.length <= 5, 'legacy migration should not over-unlock hulls');

const gameSource = readFileSync('src/game/Game.js', 'utf8');
assert.match(gameSource, /if \(this\.runFinalized\) return this\.runProgressionResult;/, 'run progression must stay idempotent through runFinalized guard');
assert.equal(fakeStorage.has(THREAT_DISCOVERY_KEY), false, 'progression pacing check should not rely on ambient discovery state');

console.log(`[progression-pacing] PASS level5 rank=${level5.displayRank} hulls=${level5.unlockedShips.length}; level10 rank=${level10.displayRank} hulls=${level10.unlockedShips.length} codex=${level10.progress.totalCodexDiscoveries}; level15 rank=${level15.displayRank} hulls=${level15.unlockedShips.length}`);
