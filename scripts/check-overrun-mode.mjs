import assert from 'node:assert/strict';

import {
  OVERRUN_START_SECTOR,
  OVERRUN_TACTICAL_BASELINE_AUGMENT_IDS,
  OVERRUN_UNLOCK_SECTOR,
  OVERRUN_WEB_PREVIEW_PARAM,
  RUN_MODES,
  canRunModeSubmitGlobalLeaderboard,
  canRunModeUnlockAchievements,
  canRunModeUpdateCareerProgress,
  canRunModeUpdateCompetitiveCareerBests,
  getOverrunStartState,
  getRunModeProfile,
  isOverrunWebPreviewAccessEnabled,
  isOverrunRunMode
} from '../src/game/RunMode.js';
import {
  HANGAR_PROGRESS_KEY,
  applyRunProgression,
  calculatePilotXpForRun,
  createDefaultHangarProgress,
  writeHangarProgressState
} from '../src/progression/HangarProgressState.js';
import {
  OVERRUN_RUN_RECORDS_KEY,
  getOverrunRunBest,
  mergeOverrunRunRecords,
  recordOverrunRun
} from '../src/progression/OverrunRunRecords.js';

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

globalThis.localStorage = new MemoryStorage();
globalThis.Audio = class {
  addEventListener() {}
  removeEventListener() {}
  pause() {}
  play() { return Promise.resolve(); }
  load() {}
};
const { PowerupManager } = await import('../src/managers/PowerupManager.js');

assert.deepEqual(getOverrunStartState({ bestSector: OVERRUN_UNLOCK_SECTOR - 1 }), {
  available: false,
  progressionUnlocked: false,
  previewAccess: false,
  highestReachedSector: OVERRUN_UNLOCK_SECTOR - 1,
  requiredSector: OVERRUN_UNLOCK_SECTOR,
  startSector: OVERRUN_START_SECTOR
});
assert.equal(getOverrunStartState({ bestSector: OVERRUN_UNLOCK_SECTOR }).available, true);
assert.deepEqual(getOverrunStartState({ bestSector: 1 }, { previewAccess: true }), {
  available: true,
  progressionUnlocked: false,
  previewAccess: true,
  highestReachedSector: 1,
  requiredSector: OVERRUN_UNLOCK_SECTOR,
  startSector: OVERRUN_START_SECTOR
});
assert.equal(isOverrunWebPreviewAccessEnabled({
  location: { search: `?${OVERRUN_WEB_PREVIEW_PARAM}=1` },
  desktop: false
}), true);
assert.equal(isOverrunWebPreviewAccessEnabled({
  location: { search: `?${OVERRUN_WEB_PREVIEW_PARAM}=1&desktop=1` },
  desktop: false
}), false, 'desktop builds must retain the normal progression unlock');

for (const mode of [RUN_MODES.OVERRUN_PURE, RUN_MODES.OVERRUN_TACTICAL]) {
  assert.equal(isOverrunRunMode(mode), true);
  assert.equal(canRunModeSubmitGlobalLeaderboard(mode), false);
  assert.equal(canRunModeUnlockAchievements(mode), false);
  assert.equal(canRunModeUpdateCareerProgress(mode), true);
  assert.equal(canRunModeUpdateCompetitiveCareerBests(mode), false);
  assert.equal(getRunModeProfile(mode).unlocksRankedCheckpoints, false);
  assert.equal(getRunModeProfile(mode).careerXpMultiplier, 0.85);
}

assert.equal(getRunModeProfile(RUN_MODES.OVERRUN_PURE).tacticalDraftEnabled, false);
assert.equal(getRunModeProfile(RUN_MODES.OVERRUN_TACTICAL).tacticalDraftEnabled, true);
assert.deepEqual(
  getRunModeProfile(RUN_MODES.OVERRUN_TACTICAL).tacticalBaselineAugmentIds,
  OVERRUN_TACTICAL_BASELINE_AUGMENT_IDS
);

writeHangarProgressState({
  ...createDefaultHangarProgress(),
  bestSector: OVERRUN_UNLOCK_SECTOR - 1,
  bestLevel: OVERRUN_UNLOCK_SECTOR - 1
});
const unlockTransition = applyRunProgression({
  runMode: RUN_MODES.RANKED,
  score: 30000,
  sectorReached: OVERRUN_UNLOCK_SECTOR,
  levelReached: OVERRUN_UNLOCK_SECTOR,
  runElapsedSeconds: 300
});
assert.equal(unlockTransition.previous.overrunUnlockCelebrationPending, false);
assert.equal(unlockTransition.next.overrunUnlockCelebrationPending, true, 'crossing Sector 30 should queue the one-time celebration');
assert.equal(unlockTransition.next.overrunUnlockCelebrationSeen, false);

assert.equal(
  calculatePilotXpForRun({
    runMode: RUN_MODES.OVERRUN_PURE,
    startSector: OVERRUN_START_SECTOR,
    sectorReached: OVERRUN_START_SECTOR
  }),
  0,
  'starting at sector 51 must not grant 50 sectors of career XP'
);

const representativeActivity = {
  startSector: OVERRUN_START_SECTOR,
  sectorReached: 55,
  score: 180000,
  wavesCleared: 18,
  bossesKilled: 1,
  codexDiscoveries: 2,
  noHitWaves: 3,
  noHitSectors: 1
};
const normalCareerXp = calculatePilotXpForRun({
  ...representativeActivity,
  runMode: RUN_MODES.SECTOR_START
});
const overrunCareerXp = calculatePilotXpForRun({
  ...representativeActivity,
  runMode: RUN_MODES.OVERRUN_TACTICAL
});
const overrunCareerRatio = overrunCareerXp / normalCareerXp;
assert(
  overrunCareerRatio >= 0.84 && overrunCareerRatio <= 0.85,
  `representative Overrun activity should pay approximately 85% of normal Career XP, got ${overrunCareerRatio}`
);

const base = writeHangarProgressState({
  ...createDefaultHangarProgress(),
  pilotXp: 1200,
  pilotRank: 2,
  highestPilotRank: 2,
  totalRuns: 8,
  bestScore: 123456,
  bestSector: 35,
  bestLevel: 35,
  bestRunTimeSeconds: 420,
  runClears: 2,
  clearWithLivesRemaining: 2,
  highestScoreMultiplier: 7,
  totalBossesDefeated: 12,
  totalWavesCleared: 100,
  shipSpecificMilestones: {
    nova_ship_01: {
      runs: 4,
      bestScore: 123456,
      bestSector: 35,
      bossesKilled: 12,
      runClears: 2
    }
  }
});

const result = applyRunProgression({
  runMode: RUN_MODES.OVERRUN_TACTICAL,
  shipId: 'nova_ship_01',
  startSector: OVERRUN_START_SECTOR,
  sectorReached: 53,
  levelReached: 53,
  score: 999999,
  runElapsedSeconds: 90,
  bossesKilled: 2,
  wavesCleared: 3,
  noHitWaves: 1,
  noHitSectors: 1,
  runCleared: true,
  clearLivesRemaining: 3,
  highestScoreMultiplier: 50
}, { updateCompetitiveBests: false });

assert.ok(result.xpGained > 0, 'Overrun should grant reduced career XP');
assert.equal(result.next.totalRuns, base.totalRuns + 1);
assert.equal(result.next.totalBossesDefeated, base.totalBossesDefeated + 2);
assert.equal(result.next.totalWavesCleared, base.totalWavesCleared + 3);
assert.equal(result.next.bestScore, base.bestScore, 'Overrun must not overwrite competitive best score');
assert.equal(result.next.bestSector, base.bestSector, 'Overrun must not overwrite competitive best sector');
assert.equal(result.next.bestLevel, base.bestLevel, 'Overrun must not overwrite competitive best level');
assert.equal(result.next.bestRunTimeSeconds, base.bestRunTimeSeconds, 'Overrun must not overwrite competitive best time');
assert.equal(result.next.runClears, base.runClears, 'Overrun must not create a competitive clear');
assert.equal(result.next.clearWithLivesRemaining, base.clearWithLivesRemaining);
assert.equal(result.next.highestScoreMultiplier, base.highestScoreMultiplier);
assert.deepEqual(result.next.shipSpecificMilestones, base.shipSpecificMilestones, 'Overrun must not alter competitive ship mastery');
assert.ok(localStorage.getItem(HANGAR_PROGRESS_KEY), 'Overrun career result should persist');

const firstPure = recordOverrunRun({
  runMode: RUN_MODES.OVERRUN_PURE,
  score: 12000,
  sectorReached: 56,
  levelReached: 56,
  runElapsedSeconds: 180
});
assert.equal(firstPure.isNewBest, true);
assert.equal(firstPure.stored, true);
assert.equal(getOverrunRunBest(RUN_MODES.OVERRUN_PURE).score, 12000);

const lowerPure = recordOverrunRun({
  runMode: RUN_MODES.OVERRUN_PURE,
  score: 11000,
  sectorReached: 60,
  levelReached: 60
});
assert.equal(lowerPure.isNewBest, false, 'score remains the primary personal-best metric');
assert.equal(getOverrunRunBest(RUN_MODES.OVERRUN_PURE).score, 12000);

const tactical = recordOverrunRun({
  runMode: RUN_MODES.OVERRUN_TACTICAL,
  score: 9000,
  sectorReached: 54,
  levelReached: 54
});
assert.equal(tactical.isNewBest, true);
assert.equal(getOverrunRunBest(RUN_MODES.OVERRUN_TACTICAL).score, 9000);
assert.ok(localStorage.getItem(OVERRUN_RUN_RECORDS_KEY));

const merged = mergeOverrunRunRecords(
  JSON.parse(localStorage.getItem(OVERRUN_RUN_RECORDS_KEY)),
  {
    byMode: {
      [RUN_MODES.OVERRUN_PURE]: {
        runMode: RUN_MODES.OVERRUN_PURE,
        score: 15000,
        sectorReached: 57
      },
      [RUN_MODES.OVERRUN_TACTICAL]: {
        runMode: RUN_MODES.OVERRUN_TACTICAL,
        score: 8000,
        sectorReached: 70
      }
    }
  }
);
assert.equal(merged.byMode[RUN_MODES.OVERRUN_PURE].score, 15000, 'Steam Cloud merge keeps the stronger Pure record');
assert.equal(merged.byMode[RUN_MODES.OVERRUN_TACTICAL].score, 9000, 'Steam Cloud merge cannot downgrade Tactical');

const overrunPowerups = new PowerupManager({ addChild() {}, removeChild() {} }, {
  level: OVERRUN_START_SECTOR,
  scenes: {},
  getWidth: () => 1280
});
let forcedExtraLives = 0;
overrunPowerups.forceExtraLifeSpawn = () => {
  forcedExtraLives += 1;
};
overrunPowerups.checkLevelReset(OVERRUN_START_SECTOR);
overrunPowerups.checkLevelReset(OVERRUN_START_SECTOR + 1);
assert.equal(forcedExtraLives, 0, 'Overrun must not inherit a 50-sector extra-life gap at launch');
assert.equal(overrunPowerups.lastExtraLifeLevel, OVERRUN_START_SECTOR - 1);

console.log(`[overrun-mode] PASS unlock, fixed start, Pure/Tactical records, ${(overrunCareerRatio * 100).toFixed(1)}% representative Career XP, reward isolation, competitive-state protection`);
