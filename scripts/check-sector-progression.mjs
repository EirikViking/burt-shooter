import fs from 'node:fs';
import { formatSectorLabel, getSectorInfo, validateSectorCatalog } from '../src/config/SectorCatalog.js';

function fail(message) {
  console.error(`[sector-progression] FAIL ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const sampleCount = 300;
const validation = validateSectorCatalog(sampleCount);
assert(validation.uniqueNames === sampleCount, `expected ${sampleCount} unique sector names, got ${validation.uniqueNames}`);

const level19 = getSectorInfo(19);
assert(level19.number === 19, `level 19 should map to sector 19, got ${level19.number}`);
assert(formatSectorLabel(19).startsWith('SECTOR 19:'), `level 19 label should be sector 19, got ${formatSectorLabel(19)}`);

const hud = fs.readFileSync('src/ui/HUD.js', 'utf8');
const playScene = fs.readFileSync('src/scenes/PlayScene.js', 'utf8');
assert(hud.includes('formatSectorLabel(this.game.level || 1'), 'HUD must render current level sector label');
assert(!hud.includes('extendLocations('), 'HUD must not randomly rotate sector/location labels');
assert(playScene.includes('formatSectorLabel(this.game.level'), 'level intro must use deterministic sector label');
assert(!playScene.includes('Sector 4: Bonus Stage Panic'), 'old repeating curated sector list should be removed');

console.log(`[sector-progression] PASS unique=${validation.uniqueNames}/${sampleCount} level19=${formatSectorLabel(19)}`);
