import assert from 'node:assert/strict';
import { getSelectableShips, isShipUnlocked } from '../src/config/ShipMetadata.js';
import { getRankFromLevel, getRankTitle, getThresholds, MAX_RANK_INDEX } from '../src/shared/RankPolicy.js';

const ships = getSelectableShips();
const thresholds = ships.map(ship => Number(ship.unlock?.level) || 1);
const rankThresholds = getThresholds();

function unlockedAt(level) {
  return ships.filter(ship => isShipUnlocked(ship.spriteKey, {
    bestScore: 0,
    bestRank: getRankFromLevel(level),
    bestLevel: level
  }));
}

assert.equal(ships.length, 25, 'ship roster should stay at 25 ships');
assert.deepEqual(thresholds, [
  1, 2, 3, 4, 5, 7, 9, 11, 14, 17,
  20, 23, 26, 29, 32, 35, 38, 41, 44, 47,
  50, 53, 56, 58, 60
]);
assert.deepEqual(rankThresholds, [
  1, 2, 3, 5, 7, 9, 11, 14, 17, 20,
  24, 28, 32, 36, 40, 44, 48, 52, 56, 60
]);

assert.equal(unlockedAt(1).length, 1, 'level 1 should only have the starter ship');
assert.equal(getRankFromLevel(1), 0, 'level 1 should be starter rank');
assert.equal(getRankTitle(getRankFromLevel(1)), 'Cadet');

assert.equal(unlockedAt(11).length, 8, 'level 11 should not complete the hangar');
assert.equal(getRankFromLevel(11), 6, 'level 11 should be mid-early rank');
assert.equal(getRankTitle(getRankFromLevel(11)), 'Combo Courier');

assert.equal(unlockedAt(60).length, 25, 'level 60 should complete the hangar');
assert.equal(getRankFromLevel(60), MAX_RANK_INDEX, 'level 60 should award max rank');
assert.equal(getRankTitle(getRankFromLevel(60)), 'Arcade Legend');

console.log(`[unlock-rank-pacing] PASS level1=${unlockedAt(1).length}/${getRankTitle(getRankFromLevel(1))} level11=${unlockedAt(11).length}/${getRankTitle(getRankFromLevel(11))} level60=${unlockedAt(60).length}/${getRankTitle(getRankFromLevel(60))}`);
