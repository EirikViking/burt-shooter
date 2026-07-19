import assert from 'node:assert/strict';
import {
  LEGEND_COMPOUND_SCORE_GATE,
  LEGEND_ACHIEVEMENTS,
  LEGEND_SCORE_GATE,
  MILESTONE_ACHIEVEMENTS
} from '../src/achievements/AchievementCatalog.js';
import {
  captureNoRepairReceiptsLifeLosses,
  getMilestoneAchievementUnlocks
} from '../src/achievements/MilestoneAchievements.js';
import { ShipUnlockConfig } from '../src/config/ShipUnlockConfig.js';

function idsFor(summary = {}, progress = {}) {
  return getMilestoneAchievementUnlocks({ summary, progress }).map((entry) => entry.achievement.id);
}

assert.equal(MILESTONE_ACHIEVEMENTS.length, 10, 'Nova Swarm should keep the 9 launch milestones plus First Ranked Run.');
assert.equal(LEGEND_ACHIEVEMENTS.length, 30, 'Nova Swarm should include 30 legend score-gated achievements.');
assert.deepEqual(idsFor({}, {}), [], 'Fresh profiles should not unlock milestone achievements.');

const firstRankedRun = MILESTONE_ACHIEVEMENTS.find((achievement) => achievement.id === 'ACH_EARLY_PILOT');
assert.equal(firstRankedRun?.name, 'First Ranked Run');
assert.equal(firstRankedRun?.description, 'Finish any ranked run. Practice and Sector Start runs do not count.');

assert.ok(idsFor({}, { totalRuns: 1 }).includes('ACH_EARLY_PILOT'));
assert.ok(idsFor({ sectorReached: 5 }, {}).includes('ACH_SECTOR_FIVE'));
assert.ok(idsFor({}, { bestSector: 10 }).includes('ACH_FINAL_CLIMAX'));
assert.ok(idsFor({ runCleared: true }, { runClears: 1 }).includes('ACH_ARCADE_CLEAR'));
assert.ok(idsFor({ runCleared: true, livesRemaining: 2 }, {}).includes('ACH_TWO_LIVES_CLEAR'));
assert.ok(idsFor({ score: 250000 }, {}).includes('ACH_SCORE_250K'));
assert.ok(idsFor({ noHitSectors: 1 }, {}).includes('ACH_NO_HIT_SECTOR'));
assert.ok(idsFor({}, { totalBossesDefeated: 25 }).includes('ACH_BOSS_HUNTER_25'));
assert.ok(idsFor({}, { totalCodexDiscoveries: 75 }).includes('ACH_SIGNAL_CARTOGRAPHER'));
assert.ok(idsFor({}, { unlockedShipIds: Array.from({ length: 12 }, (_, index) => `ship_${index}`) }).includes('ACH_HANGAR_TWELVE'));

const legendIds = new Set(LEGEND_ACHIEVEMENTS.map((achievement) => achievement.id));
const overqualifiedLowScoreSummary = {
  score: LEGEND_SCORE_GATE - 1,
  finalScore: LEGEND_SCORE_GATE - 1,
  sectorReached: 99,
  levelReached: 99,
  runCleared: true,
  clearLivesRemaining: 9,
  bossesKilled: 99,
  wavesCleared: 99,
  totalKills: 9999,
  noHitWaves: 99,
  noHitSectors: 99,
  bestComboCount: 999,
  bestDangerDodgeStreak: 99,
  grazeBreaks: 99,
  lifeLosses: 0,
  codexDiscoveries: 99,
  totalCodexDiscoveries: 999,
  defeatedBossIds: Array.from({ length: 20 }, (_, index) => `boss_${index}`),
  runTheme: 'swarm_lattice'
};
const overqualifiedProgress = {
  bestScore: 9999999,
  bestSector: 99,
  totalCodexDiscoveries: 999,
  defeatedBossIds: Array.from({ length: 20 }, (_, index) => `boss_${index}`),
  runThemesSurvived: Array.from({ length: 20 }, (_, index) => `theme_${index}`),
  unlockedShipIds: Array.from({ length: 20 }, (_, index) => `ship_${index}`)
};

const lowScoreDevProfileSummary = {
  score: 147641,
  finalScore: 147641,
  sectorReached: 17,
  levelReached: 17,
  runCleared: true,
  clearLivesRemaining: 3,
  bossesKilled: 73,
  noHitWaves: 99,
  noHitSectors: 99,
  bestComboCount: 999,
  bestDangerDodgeStreak: 99,
  grazeBreaks: 99,
  lifeLosses: 0,
  codexDiscoveries: 99,
  defeatedBossIds: Array.from({ length: 20 }, (_, index) => `boss_${index}`),
  runTheme: 'swarm_lattice'
};
assert.deepEqual(
  idsFor(lowScoreDevProfileSummary, overqualifiedProgress)
    .filter((id) => legendIds.has(id))
    .filter((id) => !['ACH_SIX_FIGURE_SIGNAL'].includes(id)),
  [],
  'A 147k dev-profile run must not batch-unlock compound legendary achievements from old profile progress.'
);
assert.deepEqual(
  idsFor(overqualifiedLowScoreSummary, overqualifiedProgress).filter((id) => legendIds.has(id)),
  [],
  'Legend achievements must not unlock below the 100,000 score gate.'
);

const noRepairNonClear = idsFor({
  score: LEGEND_COMPOUND_SCORE_GATE,
  finalScore: LEGEND_COMPOUND_SCORE_GATE,
  runCleared: false,
  lifeLosses: 0
}, {});
assert.ok(
  !noRepairNonClear.includes('ACH_NO_REPAIR_RECEIPTS'),
  'No Repair Receipts should require a cleared ranked run.'
);
const noRepairClear = idsFor({
  score: LEGEND_COMPOUND_SCORE_GATE,
  finalScore: LEGEND_COMPOUND_SCORE_GATE,
  runCleared: true,
  lifeLosses: 0
}, {});
assert.ok(
  noRepairClear.includes('ACH_NO_REPAIR_RECEIPTS'),
  'No Repair Receipts should unlock on a cleared 250k no-life-loss ranked run.'
);
const noRepairCleanClearWithOverrunLoss = idsFor({
  score: LEGEND_COMPOUND_SCORE_GATE,
  finalScore: LEGEND_COMPOUND_SCORE_GATE,
  runCleared: true,
  clearLifeLosses: 0,
  noRepairReceiptsLifeLosses: 0,
  lifeLosses: 1
}, {});
assert.ok(
  noRepairCleanClearWithOverrunLoss.includes('ACH_NO_REPAIR_RECEIPTS'),
  'No Repair Receipts should preserve qualification after the run was both clear and worth 250k.'
);
const noRepairLossAfterClearBefore250k = idsFor({
  score: LEGEND_COMPOUND_SCORE_GATE,
  finalScore: LEGEND_COMPOUND_SCORE_GATE,
  runCleared: true,
  clearLifeLosses: 0,
  noRepairReceiptsLifeLosses: 2,
  lifeLosses: 2
}, {});
assert.ok(
  !noRepairLossAfterClearBefore250k.includes('ACH_NO_REPAIR_RECEIPTS'),
  'No Repair Receipts must reject lives lost after Sector 10 but before the run reaches 250k.'
);
const noRepairDirtyClear = idsFor({
  score: LEGEND_COMPOUND_SCORE_GATE,
  finalScore: LEGEND_COMPOUND_SCORE_GATE,
  runCleared: true,
  clearLifeLosses: 1,
  noRepairReceiptsLifeLosses: 1,
  lifeLosses: 1
}, {});
assert.ok(
  !noRepairDirtyClear.includes('ACH_NO_REPAIR_RECEIPTS'),
  'No Repair Receipts should reject a life lost before the Sector 10 clear.'
);

assert.equal(
  captureNoRepairReceiptsLifeLosses({
    runCleared: true,
    score: LEGEND_COMPOUND_SCORE_GATE - 1,
    lifeLosses: 0
  }),
  null,
  'A clean clear below 250k must not freeze qualification early.'
);
assert.equal(
  captureNoRepairReceiptsLifeLosses({
    runCleared: true,
    score: LEGEND_COMPOUND_SCORE_GATE,
    lifeLosses: 2
  }),
  2,
  'Reaching 250k after the clear must capture intervening life losses.'
);
assert.equal(
  captureNoRepairReceiptsLifeLosses({
    runCleared: false,
    score: LEGEND_COMPOUND_SCORE_GATE,
    lifeLosses: 0
  }),
  null,
  'Reaching 250k before the clear must wait for the clear.'
);
assert.equal(
  captureNoRepairReceiptsLifeLosses({
    runCleared: true,
    score: LEGEND_COMPOUND_SCORE_GATE,
    lifeLosses: 1
  }),
  1,
  'Clearing after 250k must capture life losses at the clear.'
);
assert.equal(
  captureNoRepairReceiptsLifeLosses({
    capturedLifeLosses: 0,
    runCleared: true,
    score: LEGEND_COMPOUND_SCORE_GATE + 50000,
    lifeLosses: 1
  }),
  0,
  'Later Overrun losses must not revoke an already qualified clean 250k clear.'
);

const fullHangarOmega = LEGEND_ACHIEVEMENTS.find((achievement) => achievement.id === 'ACH_FULL_HANGAR_OMEGA');
assert.equal(
  fullHangarOmega?.target,
  ShipUnlockConfig.length,
  'Full Hangar Omega must require every currently playable ship.'
);
assert.equal(
  fullHangarOmega?.requirements?.find((requirement) => requirement.metric === 'unlockedShipCount')?.target,
  ShipUnlockConfig.length,
  'Full Hangar Omega authored requirement must match the playable ship catalog.'
);

const fullLegendUnlockIds = idsFor({
  ...overqualifiedLowScoreSummary,
  score: 2000000,
  finalScore: 2000000
}, {
  ...overqualifiedProgress,
  unlockedShipIds: Array.from({ length: ShipUnlockConfig.length }, (_, index) => `ship_${index}`)
});
assert.deepEqual(
  [...legendIds].filter((id) => !fullLegendUnlockIds.includes(id)),
  [],
  'Every legend achievement should unlock when its high-score gate and all authored requirements are met.'
);

for (const achievement of LEGEND_ACHIEVEMENTS) {
  assert.equal(achievement.difficulty, 'legendary');
  assert.ok(Number(achievement.minimumScore) >= LEGEND_SCORE_GATE, `${achievement.id} needs the score gate.`);
  if (!['ACH_SIX_FIGURE_SIGNAL', 'ACH_NEON_TAX_BRACKET', 'ACH_CABINET_JACKPOT', 'ACH_MILLION_POINT_MUTINY', 'ACH_TWO_MILLION_REACTOR'].includes(achievement.id)) {
    assert.ok(Number(achievement.minimumScore) >= LEGEND_COMPOUND_SCORE_GATE, `${achievement.id} needs the compound score gate.`);
  }
}

for (const achievement of MILESTONE_ACHIEVEMENTS) {
  assert.equal(typeof achievement.id, 'string');
  assert.equal(typeof achievement.name, 'string');
  assert.equal(typeof achievement.description, 'string');
  assert.equal(achievement.type, 'milestone');
  assert.ok(Number.isFinite(Number(achievement.target)));
  assert.ok(Number(achievement.target) > 0);
}

for (const achievement of LEGEND_ACHIEVEMENTS) {
  assert.equal(typeof achievement.id, 'string');
  assert.equal(typeof achievement.name, 'string');
  assert.equal(typeof achievement.description, 'string');
  assert.equal(achievement.type, 'milestone');
  assert.ok(Number.isFinite(Number(achievement.target)));
  assert.ok(Number(achievement.target) >= 0);
}

console.log('[milestone-achievements] PASS 10 launch milestones plus 30 legend score-gated milestones evaluate from run and career progress');
