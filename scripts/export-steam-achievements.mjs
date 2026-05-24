import { ACHIEVEMENTS } from '../src/achievements/AchievementCatalog.js';

const rows = ACHIEVEMENTS.map((achievement) => ({
  apiName: achievement.id,
  displayName: achievement.name,
  description: achievement.description,
  hidden: Boolean(achievement.hidden)
}));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log(`Nova Swarm Steam achievements (${rows.length})`);
  for (const row of rows) {
    console.log(`${row.apiName}\t${row.displayName}\t${row.description}\thidden=${row.hidden}`);
  }
}
