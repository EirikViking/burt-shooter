import assert from 'node:assert/strict';
import {
  TACTICAL_DIRECTIVE_CATALOG,
  TACTICAL_DIRECTIVE_MAX_COMPLETIONS_PER_SECTOR,
  TACTICAL_DIRECTIVE_MINIMUM_FINAL_SECTOR,
  TACTICAL_DIRECTIVE_OBJECTIVES,
  TACTICAL_DIRECTIVE_REWARDS,
  TACTICAL_DIRECTIVE_RUN_COMPLETION_CAP,
  TACTICAL_DIRECTIVE_VARIANT_COUNT,
  applyTacticalDirectiveEvent,
  createTacticalDirectiveSession,
  getNextTacticalDirectiveEligibleSector,
  getTacticalDirectiveState,
  getTacticalDirectiveTierCeiling,
  pickTacticalDirective
} from '../src/config/TacticalDirectives.js';

assert.equal(TACTICAL_DIRECTIVE_OBJECTIVES.length, 10, 'directive grid must expose ten objective families');
assert.equal(TACTICAL_DIRECTIVE_REWARDS.length, 10, 'directive grid must expose ten reward programs');
assert.equal(TACTICAL_DIRECTIVE_VARIANT_COUNT, 1000, 'directive grid must contain exactly 1000 variants');
assert.equal(new Set(TACTICAL_DIRECTIVE_CATALOG.map((entry) => entry.id)).size, 1000, 'all directive IDs must be unique');
assert.equal(TACTICAL_DIRECTIVE_RUN_COMPLETION_CAP, 50, 'a run must expose a fifty-stage directive chain');
assert.equal(TACTICAL_DIRECTIVE_MAX_COMPLETIONS_PER_SECTOR, 1, 'only one directive may clear per sector');
assert.equal(TACTICAL_DIRECTIVE_MINIMUM_FINAL_SECTOR, 50, 'the directive campaign must not finish before level 50');
assert.equal(getTacticalDirectiveTierCeiling(1, 0), 1, 'levels 1-5 must stay in tier one');
assert.equal(getTacticalDirectiveTierCeiling(5, 4), 1, 'the first campaign chapter must stay approachable');
assert.equal(getTacticalDirectiveTierCeiling(6, 5), 2, 'level six must open tier two');
assert.equal(getTacticalDirectiveTierCeiling(50, 49), 10, 'level fifty must open the full catalog');
assert.equal(getNextTacticalDirectiveEligibleSector([], 1), 1, 'the first directive must be active immediately');
assert.equal(getNextTacticalDirectiveEligibleSector([{ sector: 1 }], 1), 2, 'a same-sector completion must queue the next directive');
assert.equal(getNextTacticalDirectiveEligibleSector([{ sector: 1 }], 2), 2, 'a new sector must unlock its directive slot');

for (const objective of TACTICAL_DIRECTIVE_OBJECTIVES) {
  assert.equal(objective.targets.length, 10, `${objective.id} must expose ten intensity tiers`);
  assert.equal(new Set(objective.targets).size, 10, `${objective.id} must expose ten mechanically distinct targets`);
  const variants = TACTICAL_DIRECTIVE_CATALOG.filter((entry) => entry.objectiveId === objective.id);
  assert.equal(variants.length, 100, `${objective.id} must contribute 100 variants`);
  assert.equal(new Set(variants.map((entry) => entry.rewardId)).size, 10, `${objective.id} must pair with every reward`);
  assert.equal(new Set(variants.map((entry) => entry.tier)).size, 10, `${objective.id} must expose every tier`);
}

const firstPick = pickTacticalDirective('test-seed', 7);
assert.deepEqual(pickTacticalDirective('test-seed', 7), firstPick, 'directive selection must be deterministic');
assert.notEqual(
  pickTacticalDirective('test-seed', 7, { excludeId: firstPick.id }).id,
  firstPick.id,
  'directive selection must support immediate-repeat exclusion'
);
assert.ok(
  Array.from({ length: 100 }, (_, index) => pickTacticalDirective('bounded-seed', index, { maxTier: 3 }))
    .every((directive) => directive.tier <= 3),
  'early-run directive selection must honor the configured tier ceiling'
);

const campaignHistory = [];
for (let index = 0; index < TACTICAL_DIRECTIVE_RUN_COMPLETION_CAP; index += 1) {
  const sector = index + 1;
  const recent = campaignHistory.slice(-3);
  const directive = pickTacticalDirective('fifty-stage-campaign', index, {
    maxTier: getTacticalDirectiveTierCeiling(sector, campaignHistory.length),
    excludeIds: campaignHistory.map((entry) => entry.directiveId),
    excludeObjectiveIds: recent.map((entry) => entry.objectiveId),
    excludeRewardIds: recent.slice(-2).map((entry) => entry.rewardId)
  });
  assert.ok(directive, `campaign directive ${index + 1} must exist`);
  assert.ok(!campaignHistory.some((entry) => entry.directiveId === directive.id), `campaign directive ${directive.id} must not repeat`);
  assert.ok(!recent.some((entry) => entry.objectiveId === directive.objectiveId), `objective ${directive.objectiveId} repeated inside the three-directive freshness window`);
  assert.ok(!recent.slice(-2).some((entry) => entry.rewardId === directive.rewardId), `reward ${directive.rewardId} repeated inside the two-directive freshness window`);
  campaignHistory.push({
    directiveId: directive.id,
    objectiveId: directive.objectiveId,
    rewardId: directive.rewardId,
    sector
  });
}
assert.equal(new Set(campaignHistory.map((entry) => entry.directiveId)).size, 50, 'the full campaign must contain fifty unique directives');

const gatedDirective = TACTICAL_DIRECTIVE_CATALOG.find((directive) => directive.mode === 'count');
const gatedSession = {
  ...createTacticalDirectiveSession(gatedDirective),
  eligibleFromSector: 2
};
const earlyGateResult = applyTacticalDirectiveEvent(gatedSession, {
  type: gatedDirective.event,
  count: gatedDirective.target,
  sector: 1
});
assert.equal(earlyGateResult.changed, false, 'a queued directive must ignore progress before its eligible sector');
const unlockedGateResult = applyTacticalDirectiveEvent(gatedSession, {
  type: gatedDirective.event,
  count: gatedDirective.target,
  sector: 2
});
assert.equal(unlockedGateResult.completed, true, 'a queued directive must unlock in its eligible sector');

let completedVariants = 0;
for (const directive of TACTICAL_DIRECTIVE_CATALOG) {
  let session = createTacticalDirectiveSession(directive);
  assert.equal(getTacticalDirectiveState(session).ratio, 0, `${directive.id} must start empty`);
  const objective = TACTICAL_DIRECTIVE_OBJECTIVES.find((entry) => entry.id === directive.objectiveId);
  assert.ok(objective, `objective metadata missing for ${directive.id}`);

  if (directive.mode === 'unique') {
    for (let index = 0; index < directive.target; index += 1) {
      session = applyTacticalDirectiveEvent(session, { type: directive.event, enemyType: `enemy-${index}` }).session;
    }
  } else if (directive.mode === 'peak') {
    session = applyTacticalDirectiveEvent(session, {
      type: directive.event,
      [directive.valueKey]: directive.target
    }).session;
  } else {
    session = applyTacticalDirectiveEvent(session, {
      type: directive.event,
      count: directive.target
    }).session;
  }

  const state = getTacticalDirectiveState(session);
  assert.equal(state.completed, true, `${directive.id} must complete at its target`);
  assert.equal(state.ratio, 1, `${directive.id} must clamp progress ratio to one`);
  assert.equal(state.rewardId, directive.rewardId, `${directive.id} must preserve its reward identity`);
  completedVariants += 1;
}

console.log(`[tactical-directives] PASS variants=${TACTICAL_DIRECTIVE_VARIANT_COUNT} campaign=${campaignHistory.length} minimumFinalSector=${TACTICAL_DIRECTIVE_MINIMUM_FINAL_SECTOR} exhaustiveCompletions=${completedVariants}`);
