import assert from 'node:assert/strict';
import { MILESTONE_ACHIEVEMENTS } from '../src/achievements/AchievementCatalog.js';
import { getMilestoneAchievementUnlocks } from '../src/achievements/MilestoneAchievements.js';

function idsFor(summary = {}, progress = {}) {
  return getMilestoneAchievementUnlocks({ summary, progress }).map((entry) => entry.achievement.id);
}

assert.equal(MILESTONE_ACHIEVEMENTS.length, 9, 'Nova Swarm should ship with 9 milestone achievements.');
assert.deepEqual(idsFor({}, {}), [], 'Fresh profiles should not unlock milestone achievements.');

assert.ok(idsFor({ sectorReached: 5 }, {}).includes('ACH_SECTOR_FIVE'));
assert.ok(idsFor({}, { bestSector: 10 }).includes('ACH_FINAL_CLIMAX'));
assert.ok(idsFor({ runCleared: true }, { runClears: 1 }).includes('ACH_ARCADE_CLEAR'));
assert.ok(idsFor({ runCleared: true, livesRemaining: 2 }, {}).includes('ACH_TWO_LIVES_CLEAR'));
assert.ok(idsFor({ score: 250000 }, {}).includes('ACH_SCORE_250K'));
assert.ok(idsFor({ noHitSectors: 1 }, {}).includes('ACH_NO_HIT_SECTOR'));
assert.ok(idsFor({}, { totalBossesDefeated: 25 }).includes('ACH_BOSS_HUNTER_25'));
assert.ok(idsFor({}, { totalCodexDiscoveries: 75 }).includes('ACH_SIGNAL_CARTOGRAPHER'));
assert.ok(idsFor({}, { unlockedShipIds: Array.from({ length: 12 }, (_, index) => `ship_${index}`) }).includes('ACH_HANGAR_TWELVE'));

for (const achievement of MILESTONE_ACHIEVEMENTS) {
  assert.equal(typeof achievement.id, 'string');
  assert.equal(typeof achievement.name, 'string');
  assert.equal(typeof achievement.description, 'string');
  assert.equal(achievement.type, 'milestone');
  assert.ok(Number.isFinite(Number(achievement.target)));
  assert.ok(Number(achievement.target) > 0);
}

console.log('[milestone-achievements] PASS 9 milestone achievements evaluate from run and career progress');
