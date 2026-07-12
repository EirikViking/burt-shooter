import assert from 'node:assert/strict';
import {
  TACTICAL_DIRECTIVE_CATALOG,
  TACTICAL_DIRECTIVE_OBJECTIVES,
  TACTICAL_DIRECTIVE_REWARDS,
  TACTICAL_DIRECTIVE_VARIANT_COUNT,
  applyTacticalDirectiveEvent,
  createTacticalDirectiveSession,
  getTacticalDirectiveState,
  pickTacticalDirective
} from '../src/config/TacticalDirectives.js';

assert.equal(TACTICAL_DIRECTIVE_OBJECTIVES.length, 10, 'directive grid must expose ten objective families');
assert.equal(TACTICAL_DIRECTIVE_REWARDS.length, 10, 'directive grid must expose ten reward programs');
assert.equal(TACTICAL_DIRECTIVE_VARIANT_COUNT, 1000, 'directive grid must contain exactly 1000 variants');
assert.equal(new Set(TACTICAL_DIRECTIVE_CATALOG.map((entry) => entry.id)).size, 1000, 'all directive IDs must be unique');

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

console.log(`[tactical-directives] PASS variants=${TACTICAL_DIRECTIVE_VARIANT_COUNT} exhaustiveCompletions=${completedVariants}`);
