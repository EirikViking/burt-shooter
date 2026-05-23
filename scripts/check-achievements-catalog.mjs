import { ACHIEVEMENTS } from '../src/achievements/AchievementCatalog.js';

const errors = [];

function fail(message) {
  errors.push(message);
}

const ids = ACHIEVEMENTS.map((achievement) => achievement.id);
const names = ACHIEVEMENTS.map((achievement) => achievement.name);
const idPattern = /^ACH_[A-Z0-9]+(?:_[A-Z0-9]+)*$/;

if (ACHIEVEMENTS.length > 100) {
  fail(`Catalog has ${ACHIEVEMENTS.length} achievements; Steam limit is 100.`);
}

for (const achievement of ACHIEVEMENTS) {
  if (!achievement?.id || !idPattern.test(achievement.id)) {
    fail(`Invalid achievement id: ${achievement?.id || '<blank>'}`);
  }
  if (!achievement?.name || typeof achievement.name !== 'string') {
    fail(`Achievement ${achievement?.id || '<unknown>'} is missing a name.`);
  }
  if (!achievement?.description || typeof achievement.description !== 'string') {
    fail(`Achievement ${achievement?.id || '<unknown>'} is missing a description.`);
  }
}

for (const id of ids) {
  if (ids.indexOf(id) !== ids.lastIndexOf(id)) {
    fail(`Duplicate achievement id: ${id}`);
  }
}

for (const name of names) {
  if (names.indexOf(name) !== names.lastIndexOf(name)) {
    fail(`Duplicate achievement name: ${name}`);
  }
}

if (!ids.includes('ACH_GLOBAL_LEADERBOARD')) {
  fail('Missing ACH_GLOBAL_LEADERBOARD.');
}

if (!ids.includes('ACH_GLOBAL_NUMBER_ONE')) {
  fail('Missing ACH_GLOBAL_NUMBER_ONE.');
}

const rankNumbers = ids
  .map((id) => /^ACH_RANK_(\d{2})$/.exec(id))
  .filter(Boolean)
  .map((match) => Number(match[1]))
  .sort((a, b) => a - b);

rankNumbers.forEach((rankNumber, index) => {
  const expected = index + 1;
  if (rankNumber !== expected) {
    fail(`Rank achievement ids must be sequential. Expected ACH_RANK_${String(expected).padStart(2, '0')}, saw ACH_RANK_${String(rankNumber).padStart(2, '0')}.`);
  }
});

if (errors.length > 0) {
  console.error('[check-achievements-catalog] FAIL');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`[check-achievements-catalog] PASS ${ACHIEVEMENTS.length} achievements (${rankNumbers.length} rank, ${ACHIEVEMENTS.length - rankNumbers.length} leaderboard).`);
}
