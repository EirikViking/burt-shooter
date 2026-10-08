import assert from 'node:assert/strict';
import { AchievementManager } from '../src/achievements/AchievementManager.js';
import { ACHIEVEMENTS, getAchievementById } from '../src/achievements/AchievementCatalog.js';
import { evidenceFromOnslaughtRun, getOnslaughtAchievementProgress, mergeOnslaughtEvidence } from '../src/achievements/OnslaughtAchievementProgress.js';
import { ONSLAUGHT_BOARD_V2, ONSLAUGHT_LOADOUT_V2, ONSLAUGHT_RULESET_V2 } from '../electron/onslaughtContract.cjs';
import { getSelectableShips } from '../src/config/ShipMetadata.js';

const data = new Map();
const storage = { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
const ship = getSelectableShips()[0];
const base = {
  runMode: 'overrun_tactical', shipId: ship.id, selectedShipSpriteKey: ship.spriteKey,
  startSector: 51, score: 1500, rulesetVersion: ONSLAUGHT_RULESET_V2,
  leaderboardName: ONSLAUGHT_BOARD_V2, leaderboardKind: 'overrun_tactical',
  sectorsCleared: 0, bossesKilled: 0, noHitWaves: 0, lifeLosses: 2,
  completedAt: '2026-09-22T01:00:00.000Z'
};
function run(number, patch = {}) {
  const runId = `genuine-shape-${number}`;
  return {
    ...base, runId,
    competitionStart: { runId, shipId: base.shipId, startSector: 51, startScore: 0,
      rulesetVersion: ONSLAUGHT_RULESET_V2, loadoutVersion: ONSLAUGHT_LOADOUT_V2,
      augmentIds: ['damage_up', 'blink_drive', 'shield'], checkpoint: null, prototype: false },
    ...patch
  };
}
const manager = new AchievementManager({ storage, steamSync: false, getRunState: () => ({ runMode: 'overrun_tactical', isDebugRun: false }) });
assert.equal(ACHIEVEMENTS.length, 100);
assert.equal(ACHIEVEMENTS.filter(entry => entry.type === 'onslaught').length, 19);
assert.equal(ACHIEVEMENTS.filter(entry => entry.steamPublished === false).length, 0);
assert.equal(manager.recordOnslaughtRun(run(1)).recorded, true);
assert.equal(manager.getUnlocked().filter(id => id.startsWith('ACH_OS_')).length, 0, 'ordinary short run grants no new Steam achievement');
assert.equal(manager.recordOnslaughtRun(run(1)).reason, 'duplicate_run');
assert.equal(manager.onslaughtRuns.length, 1);
assert.equal(evidenceFromOnslaughtRun(run(2, { isDebugRun: true })), null);
assert.equal(evidenceFromOnslaughtRun(run(2, { startSector: 1 })), null);
assert.equal(evidenceFromOnslaughtRun(run(2, { rulesetVersion: 'overrun_tactical_score_v1' })), null);
assert.equal(evidenceFromOnslaughtRun(run(2, { competitionStart: { ...run(2).competitionStart, augmentIds: ['damage_up', 'damage_up', 'shield'] } })), null);
assert.equal(manager.recordOnslaughtRun(run(2, { sectorsCleared: 5, bossesKilled: 3, noHitWaves: 5, lifeLosses: 0,
  defeatedSnakeIds: ['snake_cinder'], snakeDefeats: [{ type: 'snake_cinder', lifeLosses: 0, sector: 53 }], tacticalDraftPicks: [{ id: 'pierce', source: 'boss_draft', newFusionIds: ['rift_reprisal'] }] })).recorded, true);
for (const id of ['ACH_OS_THREE_BOSSES', 'ACH_OS_CLEAN_FIVE', 'ACH_OS_SNAKE_DUEL', 'ACH_OS_SPARROW_FIVE', 'ACH_OS_FIELD_FUSION']) {
  assert.equal(manager.isUnlocked(id), true, id);
}
assert.equal(manager.getOnslaughtProgress('ACH_OS_BOSS_LEDGER').value, 3);
assert.equal(manager.getOnslaughtProgress('ACH_OS_DRAFT_VARIETY').value, 1);
assert.equal(manager.getOnslaughtProgress('ACH_OS_FUSION_VARIETY').value, 1);
const fusionCases = [
  [0, [], 3, false],
  [1, ['rift_reprisal'], 2, false],
  [1, ['rift_reprisal'], 3, true]
];
for (const [lifeLosses, newFusionIds, sectorsCleared, expected] of fusionCases) {
  const evidence = evidenceFromOnslaughtRun(run(80 + sectorsCleared + lifeLosses + newFusionIds.length, {
    lifeLosses, sectorsCleared,
    tacticalDraftPicks: [{ id: 'phase_wake', source: 'pointer', newFusionIds }]
  }));
  assert.equal(getOnslaughtAchievementProgress(getAchievementById('ACH_OS_FIELD_FUSION'), [evidence]).complete,
    expected, 'Built Under Fire requires an earned boss Draft fusion and three sectors');
}
const fusionDefinition = getAchievementById('ACH_OS_FUSION_VARIETY');
const fusionEvidence = ['rift_reprisal', 'drone_constellation', 'aegis_reactor'].map((fusion, index) =>
  evidenceFromOnslaughtRun(run(90 + index, {
    tacticalDraftPicks: [{ id: 'phase_wake', source: 'pointer', newFusionIds: [fusion] }]
  })));
assert.equal(getOnslaughtAchievementProgress(fusionDefinition, fusionEvidence.slice(0, 2)).complete, false);
assert.equal(getOnslaughtAchievementProgress(fusionDefinition, fusionEvidence).complete, true);
for (const lifeLosses of [0, 1, 2]) {
  const evidence = evidenceFromOnslaughtRun(run(100 + lifeLosses, {
    lifeLosses, defeatedSnakeIds: ['snake_cinder'], snakeDefeats: [{ type: 'snake_cinder', lifeLosses, sector: 53 }]
  }));
  assert.equal(getOnslaughtAchievementProgress(getAchievementById('ACH_OS_SNAKE_DUEL'), [evidence]).complete,
    lifeLosses <= 1, `Serpent Duel boundary at ${lifeLosses} lost lives`);
}
assert.equal(getOnslaughtAchievementProgress(getAchievementById('ACH_OS_SNAKE_DUEL'), [
  evidenceFromOnslaughtRun(run(110, { lifeLosses: 0, defeatedSnakeIds: [] }))
]).complete, false, 'a snake encounter without complete defeat cannot award Serpent Duel');
assert.equal(getOnslaughtAchievementProgress(getAchievementById('ACH_OS_SNAKE_DUEL'), [
  evidenceFromOnslaughtRun(run(111, { lifeLosses: 3, defeatedSnakeIds: ['snake_cinder'] }))
]).complete, false, 'legacy final loss totals without defeat events cannot establish a new unlock');
assert.equal(manager.getOnslaughtProgress('ACH_OS_FIVE_BUILDS').value, 1);
const swapped = run(3, { sectorsCleared: 2, competitionStart: { ...run(3).competitionStart, augmentIds: ['shield', 'damage_up', 'blink_drive'] } });
manager.recordOnslaughtRun(swapped);
assert.equal(manager.getOnslaughtProgress('ACH_OS_FIVE_BUILDS').value, 1, 'unordered triples canonicalize');
const starterDefinition = getAchievementById('ACH_OS_STARTER_WINGS');
for (const hullId of ['nova_ship_01', 'nova_ship_02', 'nova_ship_03', 'nova_ship_04', 'nova_ship_05', 'nova_ship_07']) {
  const hull = getSelectableShips().find(item => item.id === hullId);
  assert(hull, hullId);
  const starterRun = run(`starter-${hullId}`, { shipId: hull.id, selectedShipSpriteKey: hull.spriteKey, sectorsCleared: 3 });
  starterRun.competitionStart.shipId = hull.id;
  const evidence = evidenceFromOnslaughtRun(starterRun);
  assert.equal(getOnslaughtAchievementProgress(starterDefinition, [evidence]).value, hullId === 'nova_ship_07' ? 0 : 1,
    `${hull.name} starter eligibility is determined by mechanical hull identity`);
}
const overlappingTriples = [
  ['damage_up', 'blink_drive', 'shield'],
  ['damage_up', 'blink_drive', 'pierce'],
  ['damage_up', 'blink_drive', 'drones']
].map((augmentIds, index) => {
  const custom = run(`custom-${index}`, { sectorsCleared: 2 });
  custom.competitionStart.augmentIds = augmentIds;
  return evidenceFromOnslaughtRun(custom);
});
assert.equal(getOnslaughtAchievementProgress(getAchievementById('ACH_OS_ONE_HULL_THREE_BUILDS'), overlappingTriples).complete,
  true, 'custom triples may overlap and need not match a suggested loadout');
assert.equal(mergeOnslaughtEvidence(manager.onslaughtRuns, manager.onslaughtRuns).length, 3, 'Cloud merge deduplicates by runId');
const reloaded = new AchievementManager({ storage, steamSync: false });
assert.equal(reloaded.onslaughtRuns.length, 3);
assert.equal(reloaded.isUnlocked('ACH_OS_THREE_BOSSES'), true);
assert.equal(getAchievementById('ACH_SECTOR_FIVE').allowedModes.includes('overrun_tactical'), false);
assert.equal(getAchievementById('ACH_GLOBAL_NUMBER_ONE').requiresSubmission, true);
const meta = getAchievementById('ACH_OS_COMPLETE_SET');
assert.equal(meta.otherIds.length, 18);
assert.equal(getOnslaughtAchievementProgress(meta, reloaded.onslaughtRuns, meta.otherIds.slice(0, 17)).complete, false);
assert.equal(getOnslaughtAchievementProgress(meta, reloaded.onslaughtRuns, meta.otherIds).complete, true);
console.log('[onslaught-achievements] PASS 100 IDs, provenance, real events, mode policy, single/multi/meta, restart and Cloud dedupe');
