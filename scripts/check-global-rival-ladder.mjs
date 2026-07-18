import assert from 'node:assert/strict';
import { analyzeGlobalRivalProjection } from '../src/shared/GlobalLeaderboardPlacement.js';

function entry(rank, score, name = `PILOT ${rank}`, extras = {}) {
  return { rank, score, name, ...extras };
}

assert.equal(analyzeGlobalRivalProjection(100, []), null, 'empty boards must stay silent');

const unsorted = [
  entry(1, 2000, 'CROWN'),
  entry(4, 900, 'LOW'),
  entry(3, 1200, 'NEAR'),
  entry(2, 1700, 'HIGH')
];
const nearest = analyzeGlobalRivalProjection(1100, unsorted);
assert.equal(nearest.targetKind, 'next_rival');
assert.equal(nearest.targetName, 'NEAR');
assert.equal(nearest.targetRank, 3);
assert.equal(nearest.targetScore, 1201);
assert.equal(nearest.scoreToPass, 101);

const tie = analyzeGlobalRivalProjection(1200, unsorted);
assert.equal(tie.targetName, 'NEAR', 'a tied rival must remain the target until beaten');
assert.equal(tie.targetScore, 1201);
assert.equal(tie.scoreToPass, 1, 'ties require exactly one more point');

const withSelf = [
  entry(1, 2200, 'CROWN'),
  entry(2, 1700, 'NEXT'),
  entry(3, 1600, 'CURRENT', { isCurrentPlayer: true }),
  entry(4, 1200, 'BELOW')
];
const selfExcluded = analyzeGlobalRivalProjection(1500, withSelf);
assert.equal(selfExcluded.targetName, 'NEXT', 'the current player must never become their own rival');
assert.equal(selfExcluded.targetRank, 2);

const fullBoard = Array.from({ length: 40 }, (_, index) => (
  entry(index + 1, 10000 - index * 100, `ACE ${index + 1}`)
));
const gate = analyzeGlobalRivalProjection(6000, fullBoard);
assert.equal(gate.targetKind, 'board_gate', 'outside a full top 40 must be labeled as a board gate');
assert.equal(gate.targetRank, 40);
assert.equal(gate.targetName, 'ACE 40');
assert.equal(gate.targetScore, 6101);
assert.equal(gate.scoreToPass, 101);
assert.equal(gate.projectedPlacement, null, 'the downloaded top 40 cannot claim an exact outside rank');

const inside = analyzeGlobalRivalProjection(6200, fullBoard);
assert.equal(inside.targetKind, 'next_rival');
assert.equal(inside.targetRank, 39);
assert.equal(inside.targetName, 'ACE 39');
assert.equal(inside.targetScore, 6201);
assert.equal(inside.scoreToPass, 1);

const numberOne = analyzeGlobalRivalProjection(10001, fullBoard);
assert.equal(numberOne.targetKind, 'number_one');
assert.equal(numberOne.target, null);
assert.equal(numberOne.targetScore, 0);
assert.equal(numberOne.scoreToPass, 0);
assert.equal(numberOne.projectedPlacement, 1);
assert.equal(numberOne.projectedNumberOne, true);

const selfAtTop = analyzeGlobalRivalProjection(10001, [
  entry(1, 10000, 'CURRENT', { isCurrentPlayer: true }),
  entry(2, 9000, 'RUNNER UP')
]);
assert.equal(selfAtTop.targetKind, 'number_one');
assert.equal(selfAtTop.projectedPlacement, 1);

console.log('[global-rival-ladder] PASS empty, ordering, ties, self-exclusion, top-40 gate, next rival, projected #1');
