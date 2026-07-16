import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AchievementManager, ACHIEVEMENT_STORAGE_KEY } from '../src/achievements/AchievementManager.js';
import {
  GLOBAL_NUMBER_ONE_ACHIEVEMENT_ID,
  SWARM_ELITE_ACHIEVEMENT_ID,
  SWARM_ELITE_SCORE_GATE,
  getAchievementById
} from '../src/achievements/AchievementCatalog.js';
import {
  evaluateSwarmEliteEligibility,
  isAcceptedLeaderboardSubmission
} from '../src/achievements/SwarmEliteAchievement.js';
import { RUN_MODES } from '../src/game/RunMode.js';

class MemoryStorage {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

function evaluate(overrides = {}) {
  return evaluateSwarmEliteEligibility({
    score: SWARM_ELITE_SCORE_GATE,
    runMode: RUN_MODES.RANKED,
    submissionAccepted: true,
    ...overrides
  });
}

assert.equal(SWARM_ELITE_ACHIEVEMENT_ID, 'ACH_GLOBAL_NUMBER_ONE', 'stable Steam/internal ID must be retained');
assert.equal(GLOBAL_NUMBER_ONE_ACHIEVEMENT_ID, SWARM_ELITE_ACHIEVEMENT_ID, 'legacy source constant must remain a compatibility alias');
assert.equal(SWARM_ELITE_SCORE_GATE, 750000);

const catalogEntry = getAchievementById(SWARM_ELITE_ACHIEVEMENT_ID);
assert.equal(catalogEntry?.name, 'Swarm Elite');
assert.equal(catalogEntry?.description, 'Submit a 750,000-point ranked run.');
assert.equal(catalogEntry?.target, 750000);

assert.equal(evaluate({ score: 749999 }).eligible, false, '749,999 must not unlock');
assert.equal(evaluate({ score: 750000 }).eligible, true, '750,000 must unlock after acceptance');
assert.equal(evaluate({ score: 1250000 }).eligible, true, 'scores above the gate must unlock after acceptance');
assert.equal(evaluate({ runMode: RUN_MODES.MAYHEM_TACTICAL }).eligible, true, 'Mayhem Tactical is an eligible ranked mode');
assert.equal(evaluate({ runMode: 'mayhem-pure' }).eligible, true, 'known legacy Pure aliases should remain compatible');
assert.equal(evaluate({ submissionAccepted: false, rejected: true }).eligible, false, 'rejected submissions must not unlock');
assert.equal(evaluate({ submissionAccepted: false, queued: true }).eligible, false, 'offline queued submissions must wait for acceptance');
assert.equal(evaluate({ runMode: RUN_MODES.UNRANKED }).eligible, false, 'unranked runs must not unlock');
assert.equal(evaluate({ runMode: RUN_MODES.SCOUT }).eligible, false, 'Scout runs must not unlock');
assert.equal(evaluate({ runMode: RUN_MODES.DAILY_SIGNAL }).eligible, false, 'Daily runs must not unlock');
assert.equal(evaluate({ runMode: RUN_MODES.SECTOR_START }).eligible, false, 'Sector runs must not unlock');
assert.equal(evaluate({ isDebugRun: true }).eligible, false, 'debug/modded-ineligible runs must not unlock');
assert.equal(evaluate({ eligibleRun: false }).eligible, false, 'explicitly ineligible runs must not unlock');
assert.equal(evaluate({ allowAchievements: false }).eligible, false, 'achievement-disabled runs must not unlock');
assert.equal(evaluate({ runMode: 'mystery_mode' }).eligible, false, 'unknown modes must not silently become ranked');

const historical = evaluate({
  score: 0,
  submissionAccepted: false,
  historicalAccepted: true,
  historicalAcceptedScore: 900000
});
assert.equal(historical.eligible, true, 'a reliable accepted historical Steam score should backfill');
assert.equal(historical.scoreSource, 'historical_accepted_score');

assert.equal(isAcceptedLeaderboardSubmission({
  globalProvider: 'steam',
  steamStatus: 'submitted',
  globalStatus: 'steam_best_unchanged'
}), true, 'Steam keep-best acceptance is still an accepted submission');
assert.equal(isAcceptedLeaderboardSubmission({
  globalProvider: 'steam',
  steamStatus: 'failed',
  steamPendingQueued: true
}), false, 'queued Steam work is not accepted yet');
assert.equal(isAcceptedLeaderboardSubmission({
  globalProvider: 'cloud',
  globalStatus: 'submitted'
}), true);
assert.equal(isAcceptedLeaderboardSubmission({
  globalProvider: 'cloud',
  globalStatus: 'failed',
  globalError: 'rejected'
}), false);

const legacyStorage = new MemoryStorage({
  [ACHIEVEMENT_STORAGE_KEY]: JSON.stringify({
    version: 1,
    unlocked: ['ACH_GLOBAL_NUMBER_ONE']
  })
});
const legacyManager = new AchievementManager({
  storage: legacyStorage,
  steamSync: false,
  getRunState: () => ({ runMode: RUN_MODES.RANKED, isDebugRun: false })
});
assert.equal(legacyManager.isUnlocked(SWARM_ELITE_ACHIEVEMENT_ID), true, 'existing number-one unlock must migrate through the stable ID');
assert.equal(legacyManager.getUnlocked().filter((id) => id === SWARM_ELITE_ACHIEVEMENT_ID).length, 1, 'stable-ID migration must not duplicate the achievement');
assert.equal(legacyManager.unlock(SWARM_ELITE_ACHIEVEMENT_ID, {
  runMode: RUN_MODES.RANKED,
  allowAchievements: true,
  score: 900000
}), null, 'an existing legacy unlock must not unlock twice');

const gameOverSource = readFileSync(new URL('../src/scenes/GameOverScene.js', import.meta.url), 'utf8');
assert.match(gameOverSource, /unlockSwarmEliteForAcceptedSubmission\(result, provider\)/);
assert.doesNotMatch(
  gameOverSource,
  /unlockAchievement\?\.\(GLOBAL_NUMBER_ONE_ACHIEVEMENT_ID/,
  'the obsolete number-one placement unlock path must be removed'
);

const gameSource = readFileSync(new URL('../src/game/Game.js', import.meta.url), 'utf8');
assert.match(gameSource, /handleAcceptedPendingSteamSubmission/);
assert.match(gameSource, /backfillSwarmEliteAchievement/);

console.log('[swarm-elite-achievement] PASS stable-ID migration, accepted-submit gate, queued/rejected guards, historical backfill');
