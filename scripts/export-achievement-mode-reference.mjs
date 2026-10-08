import { writeFileSync } from 'node:fs';
import { ACHIEVEMENTS, ACHIEVEMENT_MODE_NAMES } from '../src/achievements/AchievementCatalog.js';

const destination = 'release/steamworks/achievement-mode-reference.md';
const modes = list => (list || []).map(mode => ACHIEVEMENT_MODE_NAMES[mode] || mode).join(', ');
const escape = value => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const lines = [
  '# Nova Swarm achievement mode reference',
  '',
  `Generated from the runtime catalog: ${ACHIEVEMENTS.length} achievements, including ${ACHIEVEMENTS.filter(item => item.steamPublished === false).length} unpublished new IDs.`,
  '',
  '| API ID | Name | Requirement | Progress counts in | Complete in | Scope | Steam state |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...ACHIEVEMENTS.map(item => `| ${escape(item.id)} | ${escape(item.name)} | ${escape(item.description.replace(/\s*Modes:.*$/u, ''))} | ${escape(modes(item.progressModes))} | ${escape(modes(item.completeModes))} | ${escape(item.scope)} | ${item.steamPublished === false ? 'Unpublished' : 'Existing'} |`),
  ''
];
writeFileSync(destination, lines.join('\n'), 'utf8');
console.log(`Wrote ${destination}: ${ACHIEVEMENTS.length} catalog rows`);
