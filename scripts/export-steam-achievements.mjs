import { ACHIEVEMENTS } from '../src/achievements/AchievementCatalog.js';
import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('release/steamworks/achievement-icons/manifest.json');
const iconManifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : { icons: [] };
const iconsById = new Map((iconManifest.icons || []).map((entry) => [entry.apiName, entry]));

const rows = ACHIEVEMENTS.map((achievement) => ({
  apiName: achievement.id,
  displayName: achievement.name,
  description: achievement.description,
  hidden: Boolean(achievement.hidden),
  achievedIcon: iconsById.get(achievement.id)?.achievedIcon || '',
  lockedIcon: iconsById.get(achievement.id)?.lockedIcon || ''
}));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log(`Nova Swarm Steam achievements (${rows.length})`);
  for (const row of rows) {
    console.log(`${row.apiName}\t${row.displayName}\t${row.description}\thidden=${row.hidden}`);
  }
}
